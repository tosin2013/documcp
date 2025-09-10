import { z } from 'zod';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, resolve, relative, dirname } from 'path';
import { MCPToolResponse } from '../types/api.js';

// Input validation schema
const LinkCheckInputSchema = z.object({
  documentation_path: z.string().default('./docs'),
  check_external_links: z.boolean().default(true),
  check_internal_links: z.boolean().default(true),
  check_anchor_links: z.boolean().default(true),
  timeout_ms: z.number().min(1000).max(30000).default(5000),
  max_concurrent_checks: z.number().min(1).max(20).default(5),
  allowed_domains: z.array(z.string()).default([]),
  ignore_patterns: z.array(z.string()).default([]),
  fail_on_broken_links: z.boolean().default(false),
  output_format: z.enum(['summary', 'detailed', 'json']).default('detailed')
});

type LinkCheckInput = z.infer<typeof LinkCheckInputSchema>;

interface LinkCheckResult {
  url: string;
  status: 'valid' | 'broken' | 'warning' | 'skipped';
  statusCode?: number;
  error?: string;
  responseTime?: number;
  sourceFile: string;
  lineNumber?: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}

interface LinkCheckReport {
  summary: {
    totalLinks: number;
    validLinks: number;
    brokenLinks: number;
    warningLinks: number;
    skippedLinks: number;
    executionTime: number;
    filesScanned: number;
  };
  results: LinkCheckResult[];
  recommendations: string[];
  configuration: {
    checkExternalLinks: boolean;
    checkInternalLinks: boolean;
    checkAnchorLinks: boolean;
    timeoutMs: number;
    maxConcurrentChecks: number;
  };
}

export async function checkDocumentationLinks(input: Partial<LinkCheckInput>): Promise<MCPToolResponse<LinkCheckReport>> {
  const startTime = Date.now();
  
  try {
    // Validate input with defaults
    const validatedInput = LinkCheckInputSchema.parse(input);
    const { 
      documentation_path, 
      check_external_links, 
      check_internal_links, 
      check_anchor_links,
      timeout_ms,
      max_concurrent_checks,
      allowed_domains,
      ignore_patterns,
      fail_on_broken_links
    } = validatedInput;

    // Scan documentation files
    const documentationFiles = await scanDocumentationFiles(documentation_path);
    
    if (documentationFiles.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_DOCUMENTATION_FILES',
          message: 'No documentation files found in the specified path',
          details: `Searched in: ${documentation_path}`,
          resolution: 'Verify the documentation_path parameter points to a directory containing markdown files'
        },
        metadata: {
          toolVersion: '1.0.0',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Extract all links from documentation files
    const allLinks = await extractLinksFromFiles(documentationFiles, documentation_path);
    
    // Filter links based on configuration
    const filteredLinks = filterLinks(allLinks, {
      checkExternalLinks: check_external_links,
      checkInternalLinks: check_internal_links,
      checkAnchorLinks: check_anchor_links,
      ignorePatterns: ignore_patterns
    });

    // Check links with concurrency control
    const linkResults = await checkLinksWithConcurrency(
      filteredLinks, 
      {
        timeoutMs: timeout_ms,
        maxConcurrent: max_concurrent_checks,
        allowedDomains: allowed_domains,
        documentationPath: documentation_path
      }
    );

    // Generate report
    const report = generateLinkCheckReport(linkResults, {
      checkExternalLinks: check_external_links,
      checkInternalLinks: check_internal_links,
      checkAnchorLinks: check_anchor_links,
      timeoutMs: timeout_ms,
      maxConcurrentChecks: max_concurrent_checks,
      filesScanned: documentationFiles.length,
      executionTime: Date.now() - startTime
    });

    // Check if we should fail on broken links
    if (fail_on_broken_links && report.summary.brokenLinks > 0) {
      return {
        success: false,
        error: {
          code: 'BROKEN_LINKS_FOUND',
          message: `Found ${report.summary.brokenLinks} broken links`,
          details: `${report.summary.brokenLinks} out of ${report.summary.totalLinks} links are broken`,
          resolution: 'Fix the broken links or set fail_on_broken_links to false'
        },
        data: report,
        metadata: {
          toolVersion: '1.0.0',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      data: report,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'LINK_CHECK_ERROR',
        message: 'Failed to check documentation links',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        resolution: 'Check the documentation path and ensure files are accessible'
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }
}

async function scanDocumentationFiles(basePath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scanDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            await scanDirectory(fullPath);
          }
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
          if (['.md', '.mdx', '.markdown'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await scanDirectory(basePath);
  return files;
}

async function extractLinksFromFiles(files: string[], basePath: string): Promise<Array<{
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}>> {
  const allLinks: Array<{
    url: string;
    sourceFile: string;
    lineNumber: number;
    linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
  }> = [];

  // Regex patterns for different link types
  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlLinkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const refLinkRegex = /\[([^\]]+)\]:\s*(.+)/g;

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const lines = content.split('\n');
      // Create proper relative file path
      const absoluteBasePath = resolve(basePath);
      const absoluteFilePath = resolve(file);
      const relativeFile = relative(absoluteBasePath, absoluteFilePath).replace(/\\/g, '/');

      // Extract markdown links
      lines.forEach((line, index) => {
        let match;
        
        // Markdown links [text](url)
        while ((match = markdownLinkRegex.exec(line)) !== null) {
          const url = match[2].trim();
          if (url && !url.startsWith('#')) { // Skip empty and anchor-only links
            allLinks.push({
              url,
              sourceFile: relativeFile,
              lineNumber: index + 1,
              linkType: determineLinkType(url)
            });
          }
        }

        // HTML links
        while ((match = htmlLinkRegex.exec(line)) !== null) {
          const url = match[1].trim();
          if (url && !url.startsWith('#')) {
            allLinks.push({
              url,
              sourceFile: relativeFile,
              lineNumber: index + 1,
              linkType: determineLinkType(url)
            });
          }
        }

        // Reference links
        while ((match = refLinkRegex.exec(line)) !== null) {
          const url = match[2].trim();
          if (url && !url.startsWith('#')) {
            allLinks.push({
              url,
              sourceFile: relativeFile,
              lineNumber: index + 1,
              linkType: determineLinkType(url)
            });
          }
        }
      });
    } catch (error) {
      // Skip files we can't read
    }
  }

  return allLinks;
}

function determineLinkType(url: string): 'internal' | 'external' | 'anchor' | 'mailto' | 'tel' {
  if (url.startsWith('mailto:')) return 'mailto';
  if (url.startsWith('tel:')) return 'tel';
  if (url.startsWith('#')) return 'anchor';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'external';
  return 'internal';
}

function filterLinks(links: Array<{
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}>, options: {
  checkExternalLinks: boolean;
  checkInternalLinks: boolean;
  checkAnchorLinks: boolean;
  ignorePatterns: string[];
}) {
  return links.filter(link => {
    // Check if link should be ignored based on patterns
    if (options.ignorePatterns.some(pattern => link.url.includes(pattern))) {
      return false;
    }

    // Filter by link type
    switch (link.linkType) {
      case 'external':
        return options.checkExternalLinks;
      case 'internal':
        return options.checkInternalLinks;
      case 'anchor':
        return options.checkAnchorLinks;
      case 'mailto':
      case 'tel':
        return false; // Skip these for now
      default:
        return true;
    }
  });
}

async function checkLinksWithConcurrency(
  links: Array<{
    url: string;
    sourceFile: string;
    lineNumber: number;
    linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
  }>,
  options: {
    timeoutMs: number;
    maxConcurrent: number;
    allowedDomains: string[];
    documentationPath: string;
  }
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  
  async function checkSingleLink(link: {
    url: string;
    sourceFile: string;
    lineNumber: number;
    linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
  }): Promise<LinkCheckResult> {
    const startTime = Date.now();
    
    try {
      if (link.linkType === 'internal') {
        return await checkInternalLink(link, options.documentationPath);
      } else if (link.linkType === 'external') {
        return await checkExternalLink(link, options.timeoutMs, options.allowedDomains);
      } else if (link.linkType === 'anchor') {
        return await checkAnchorLink(link, options.documentationPath);
      }
      
      return {
        url: link.url,
        status: 'skipped',
        sourceFile: link.sourceFile,
        lineNumber: link.lineNumber,
        linkType: link.linkType,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        url: link.url,
        status: 'broken',
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceFile: link.sourceFile,
        lineNumber: link.lineNumber,
        linkType: link.linkType,
        responseTime: Date.now() - startTime
      };
    }
  }

  // Process links with concurrency control
  const chunks = [];
  for (let i = 0; i < links.length; i += options.maxConcurrent) {
    chunks.push(links.slice(i, i + options.maxConcurrent));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(checkSingleLink));
    results.push(...chunkResults);
  }

  return results;
}

async function checkInternalLink(link: {
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}, documentationPath: string): Promise<LinkCheckResult> {
  const startTime = Date.now();
  
  try {
    let targetPath = link.url;
    
    // Remove anchor if present
    const [filePath] = targetPath.split('#');
    
    // Handle relative paths properly using Node.js path resolution
    const absoluteDocPath = resolve(documentationPath);
    const sourceFileAbsolutePath = resolve(absoluteDocPath, link.sourceFile);
    const sourceDir = dirname(sourceFileAbsolutePath);
    
    if (filePath.startsWith('./')) {
      // Current directory reference - resolve relative to source file directory
      targetPath = resolve(sourceDir, filePath.substring(2));
    } else if (filePath.startsWith('../')) {
      // Parent directory reference - resolve relative to source file directory
      targetPath = resolve(sourceDir, filePath);
    } else if (filePath.startsWith('/')) {
      // Absolute path from documentation root
      targetPath = resolve(absoluteDocPath, filePath.substring(1));
    } else {
      // Relative path - resolve relative to source file directory
      targetPath = resolve(sourceDir, filePath);
    }
    
    try {
      await stat(targetPath);
      return {
        url: link.url,
        status: 'valid',
        sourceFile: link.sourceFile,
        lineNumber: link.lineNumber,
        linkType: link.linkType,
        responseTime: Date.now() - startTime
      };
    } catch {
      return {
        url: link.url,
        status: 'broken',
        error: 'File not found',
        sourceFile: link.sourceFile,
        lineNumber: link.lineNumber,
        linkType: link.linkType,
        responseTime: Date.now() - startTime
      };
    }
  } catch (error) {
    return {
      url: link.url,
      status: 'broken',
      error: error instanceof Error ? error.message : 'Unknown error',
      sourceFile: link.sourceFile,
      lineNumber: link.lineNumber,
      linkType: link.linkType,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkExternalLink(link: {
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}, timeoutMs: number, allowedDomains: string[]): Promise<LinkCheckResult> {
  const startTime = Date.now();
  
  try {
    // Check if domain is in allowed list (if specified)
    if (allowedDomains.length > 0) {
      const url = new URL(link.url);
      const isAllowed = allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith('.' + domain)
      );
      
      if (!isAllowed) {
        return {
          url: link.url,
          status: 'skipped',
          error: 'Domain not in allowed list',
          sourceFile: link.sourceFile,
          lineNumber: link.lineNumber,
          linkType: link.linkType,
          responseTime: Date.now() - startTime
        };
      }
    }

    // Simple HEAD request to check if URL is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(link.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'DocuMCP Link Checker 1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return {
          url: link.url,
          status: 'valid',
          statusCode: response.status,
          sourceFile: link.sourceFile,
          lineNumber: link.lineNumber,
          linkType: link.linkType,
          responseTime: Date.now() - startTime
        };
      } else {
        return {
          url: link.url,
          status: 'broken',
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          sourceFile: link.sourceFile,
          lineNumber: link.lineNumber,
          linkType: link.linkType,
          responseTime: Date.now() - startTime
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return {
          url: link.url,
          status: 'warning',
          error: 'Request timeout',
          sourceFile: link.sourceFile,
          lineNumber: link.lineNumber,
          linkType: link.linkType,
          responseTime: Date.now() - startTime
        };
      }
      
      throw fetchError;
    }
  } catch (error) {
    return {
      url: link.url,
      status: 'broken',
      error: error instanceof Error ? error.message : 'Unknown error',
      sourceFile: link.sourceFile,
      lineNumber: link.lineNumber,
      linkType: link.linkType,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkAnchorLink(link: {
  url: string;
  sourceFile: string;
  lineNumber: number;
  linkType: 'internal' | 'external' | 'anchor' | 'mailto' | 'tel';
}, _documentationPath: string): Promise<LinkCheckResult> {
  const startTime = Date.now();
  
  // For now, just mark anchor links as valid
  // In a more sophisticated implementation, we would parse the target file
  // and check if the anchor exists
  return {
    url: link.url,
    status: 'valid',
    sourceFile: link.sourceFile,
    lineNumber: link.lineNumber,
    linkType: link.linkType,
    responseTime: Date.now() - startTime
  };
}

function generateLinkCheckReport(
  results: LinkCheckResult[],
  config: {
    checkExternalLinks: boolean;
    checkInternalLinks: boolean;
    checkAnchorLinks: boolean;
    timeoutMs: number;
    maxConcurrentChecks: number;
    filesScanned: number;
    executionTime: number;
  }
): LinkCheckReport {
  const summary = {
    totalLinks: results.length,
    validLinks: results.filter(r => r.status === 'valid').length,
    brokenLinks: results.filter(r => r.status === 'broken').length,
    warningLinks: results.filter(r => r.status === 'warning').length,
    skippedLinks: results.filter(r => r.status === 'skipped').length,
    executionTime: config.executionTime,
    filesScanned: config.filesScanned
  };

  const recommendations: string[] = [];
  
  if (summary.brokenLinks > 0) {
    recommendations.push(`🔴 Fix ${summary.brokenLinks} broken links to improve documentation quality`);
  }
  
  if (summary.warningLinks > 0) {
    recommendations.push(`🟡 Review ${summary.warningLinks} warning links that may need attention`);
  }
  
  if (summary.validLinks === summary.totalLinks) {
    recommendations.push('✅ All links are valid - excellent documentation quality!');
  }
  
  if (summary.totalLinks > 100) {
    recommendations.push('📊 Consider implementing automated link checking in CI/CD pipeline');
  }

  return {
    summary,
    results,
    recommendations,
    configuration: {
      checkExternalLinks: config.checkExternalLinks,
      checkInternalLinks: config.checkInternalLinks,
      checkAnchorLinks: config.checkAnchorLinks,
      timeoutMs: config.timeoutMs,
      maxConcurrentChecks: config.maxConcurrentChecks
    }
  };
}
