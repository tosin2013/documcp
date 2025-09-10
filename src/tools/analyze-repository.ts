import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { MCPToolResponse, formatMCPResponse } from '../types/api.js';
// import { extractRepositoryContent, ExtractedContent } from '../utils/content-extractor.js'; // For future use
type ExtractedContent = any;

// Analysis result schema based on ADR-002
export interface RepositoryAnalysis {
  id: string;
  timestamp: string;
  path: string;
  structure: {
    totalFiles: number;
    totalDirectories: number;
    languages: Record<string, number>;
    hasTests: boolean;
    hasCI: boolean;
    hasDocs: boolean;
  };
  dependencies: {
    ecosystem: 'javascript' | 'python' | 'ruby' | 'go' | 'unknown';
    packages: string[];
    devPackages: string[];
  };
  documentation: {
    hasReadme: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    existingDocs: string[];
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
    extractedContent?: ExtractedContent;
  };
  recommendations: {
    primaryLanguage: string;
    projectType: string;
    teamSize: 'solo' | 'small' | 'medium' | 'large';
  };
}

const inputSchema = z.object({
  path: z.string(),
  depth: z.enum(['quick', 'standard', 'deep']).optional().default('standard'),
});

export async function analyzeRepository(args: unknown): Promise<{ content: any[]; isError?: boolean }> {
  const startTime = Date.now();
  const { path: repoPath, depth } = inputSchema.parse(args);

  try {
    // Verify path exists
    await fs.access(repoPath);
    
    const analysis: RepositoryAnalysis = {
      id: generateAnalysisId(),
      timestamp: new Date().toISOString(),
      path: repoPath,
      structure: await analyzeStructure(repoPath, depth),
      dependencies: await analyzeDependencies(repoPath),
      documentation: await analyzeDocumentation(repoPath),
      recommendations: await generateRecommendations(repoPath),
    };

    const response: MCPToolResponse<RepositoryAnalysis> = {
      success: true,
      data: analysis,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        analysisId: analysis.id,
      },
      recommendations: [
        {
          type: 'info',
          title: 'Analysis Complete',
          description: `Successfully analyzed ${analysis.structure.totalFiles} files across ${analysis.structure.totalDirectories} directories`,
        },
      ],
      nextSteps: [
        {
          action: 'Get SSG Recommendation',
          toolRequired: 'recommend_ssg',
          description: `Use analysis ID: ${analysis.id}`,
          priority: 'high',
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: `Failed to analyze repository: ${error}`,
        resolution: 'Ensure the repository path exists and is accessible',
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

// Helper function to generate unique analysis ID
function generateAnalysisId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `analysis_${timestamp}_${random}`;
}

// Map file extensions to languages
function getLanguageFromExtension(ext: string): string | null {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.rs': 'rust',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.scala': 'scala',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.ps1': 'powershell',
    '.r': 'r',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.dart': 'dart',
    '.lua': 'lua',
    '.pl': 'perl',
    '.elm': 'elm',
    '.clj': 'clojure',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.erl': 'erlang',
    '.hrl': 'erlang',
    '.hs': 'haskell',
    '.ml': 'ocaml',
    '.fs': 'fsharp',
    '.nim': 'nim',
    '.cr': 'crystal',
    '.d': 'd',
    '.jl': 'julia',
    '.zig': 'zig',
  };
  
  return languageMap[ext] || null;
}

// Analyze repository structure
async function analyzeStructure(repoPath: string, depth: 'quick' | 'standard' | 'deep'): Promise<RepositoryAnalysis['structure']> {
  const stats = {
    totalFiles: 0,
    totalDirectories: 0,
    languages: {} as Record<string, number>,
    hasTests: false,
    hasCI: false,
    hasDocs: false,
  };

  const maxDepth = depth === 'quick' ? 2 : depth === 'standard' ? 5 : 10;
  
  async function walkDirectory(dirPath: string, currentDepth: number = 0): Promise<void> {
    if (currentDepth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          stats.totalDirectories++;
          
          // Check for special directories
          if (entry.name.includes('test') || entry.name.includes('spec') || entry.name === '__tests__') {
            stats.hasTests = true;
          }
          if (entry.name === '.github' || entry.name === '.gitlab-ci' || entry.name === '.circleci') {
            stats.hasCI = true;
          }
          if (entry.name === 'docs' || entry.name === 'documentation' || entry.name === 'doc') {
            stats.hasDocs = true;
          }
          
          // Skip node_modules and other common ignored directories
          if (!['node_modules', '.git', 'dist', 'build', '.next', '.nuxt'].includes(entry.name)) {
            await walkDirectory(fullPath, currentDepth + 1);
          }
        } else if (entry.isFile()) {
          stats.totalFiles++;
          
          // Track languages by file extension
          const ext = path.extname(entry.name).toLowerCase();
          if (ext && getLanguageFromExtension(ext)) {
            stats.languages[ext] = (stats.languages[ext] || 0) + 1;
          }
          
          // Check for CI files
          if (entry.name.match(/\.(yml|yaml)$/) && entry.name.includes('ci')) {
            stats.hasCI = true;
          }
          
          // Check for test files
          if (entry.name.includes('test') || entry.name.includes('spec')) {
            stats.hasTests = true;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await walkDirectory(repoPath);
  return stats;
}

// Analyze project dependencies
async function analyzeDependencies(repoPath: string): Promise<RepositoryAnalysis['dependencies']> {
  const result: RepositoryAnalysis['dependencies'] = {
    ecosystem: 'unknown',
    packages: [],
    devPackages: [],
  };

  try {
    // Check for package.json (JavaScript/TypeScript)
    const packageJsonPath = path.join(repoPath, 'package.json');
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      result.ecosystem = 'javascript';
      result.packages = Object.keys(packageJson.dependencies || {});
      result.devPackages = Object.keys(packageJson.devDependencies || {});
      return result;
    } catch {
      // Continue to check other ecosystems
    }

    // Check for requirements.txt or pyproject.toml (Python)
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    const pyprojectPath = path.join(repoPath, 'pyproject.toml');
    try {
      try {
        const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
        result.ecosystem = 'python';
        result.packages = requirementsContent
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim());
        return result;
      } catch {
        const pyprojectContent = await fs.readFile(pyprojectPath, 'utf-8');
        result.ecosystem = 'python';
        // Basic parsing for pyproject.toml dependencies
        const dependencyMatches = pyprojectContent.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
        if (dependencyMatches) {
          result.packages = dependencyMatches[1]
            .split(',')
            .map(dep => dep.trim().replace(/["']/g, '').split('==')[0].split('>=')[0].split('<=')[0])
            .filter(dep => dep.length > 0);
        }
        return result;
      }
    } catch {
      // Continue to check other ecosystems
    }

    // Check for Gemfile (Ruby)
    const gemfilePath = path.join(repoPath, 'Gemfile');
    try {
      const gemfileContent = await fs.readFile(gemfilePath, 'utf-8');
      result.ecosystem = 'ruby';
      const gemMatches = gemfileContent.match(/gem\s+['"]([^'"]+)['"]/g);
      if (gemMatches) {
        result.packages = gemMatches.map(match => match.match(/gem\s+['"]([^'"]+)['"]/)![1]);
      }
      return result;
    } catch {
      // Continue to check other ecosystems
    }

    // Check for go.mod (Go)
    const goModPath = path.join(repoPath, 'go.mod');
    try {
      const goModContent = await fs.readFile(goModPath, 'utf-8');
      result.ecosystem = 'go';
      const requireMatches = goModContent.match(/require\s+\(([\s\S]*?)\)/);
      if (requireMatches) {
        result.packages = requireMatches[1]
          .split('\n')
          .map(line => line.trim().split(' ')[0])
          .filter(pkg => pkg && !pkg.startsWith('//'));
      }
      return result;
    } catch {
      // No recognized dependency files found
    }

    return result;
  } catch (error) {
    return result;
  }
}

// Analyze documentation structure
async function analyzeDocumentation(repoPath: string): Promise<RepositoryAnalysis['documentation']> {
  const result: RepositoryAnalysis['documentation'] = {
    hasReadme: false,
    hasContributing: false,
    hasLicense: false,
    existingDocs: [],
    estimatedComplexity: 'simple',
  };

  try {
    const entries = await fs.readdir(repoPath);
    
    // Check for standard files
    for (const entry of entries) {
      const lowerEntry = entry.toLowerCase();
      if (lowerEntry.startsWith('readme')) {
        result.hasReadme = true;
      } else if (lowerEntry.startsWith('contributing')) {
        result.hasContributing = true;
      } else if (lowerEntry.startsWith('license')) {
        result.hasLicense = true;
      }
    }

    // Find documentation files
    const docExtensions = ['.md', '.rst', '.txt', '.adoc'];
    const commonDocDirs = ['docs', 'documentation', 'doc', 'wiki'];
    
    // Check root directory for docs
    for (const entry of entries) {
      const entryPath = path.join(repoPath, entry);
      const stat = await fs.stat(entryPath);
      
      if (stat.isFile() && docExtensions.some(ext => entry.toLowerCase().endsWith(ext))) {
        result.existingDocs.push(entry);
      } else if (stat.isDirectory() && commonDocDirs.includes(entry.toLowerCase())) {
        try {
          const docFiles = await fs.readdir(entryPath);
          for (const docFile of docFiles) {
            if (docExtensions.some(ext => docFile.toLowerCase().endsWith(ext))) {
              result.existingDocs.push(path.join(entry, docFile));
            }
          }
        } catch {
          // Skip if can't read directory
        }
      }
    }

    // Estimate complexity based on documentation found
    const docCount = result.existingDocs.length;
    if (docCount <= 3) {
      result.estimatedComplexity = 'simple';
    } else if (docCount <= 10) {
      result.estimatedComplexity = 'moderate';
    } else {
      result.estimatedComplexity = 'complex';
    }

    return result;
  } catch (error) {
    return result;
  }
}

// Helper function to count languages in a directory
async function countLanguagesInDirectory(dirPath: string, languages: Record<string, number>, depth: number = 0): Promise<void> {
  if (depth > 3) return; // Limit depth for performance
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext && getLanguageFromExtension(ext)) {
          languages[ext] = (languages[ext] || 0) + 1;
        }
      } else if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
        await countLanguagesInDirectory(path.join(dirPath, entry.name), languages, depth + 1);
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

// Generate recommendations based on analysis
async function generateRecommendations(repoPath: string): Promise<RepositoryAnalysis['recommendations']> {
  const result: RepositoryAnalysis['recommendations'] = {
    primaryLanguage: 'unknown',
    projectType: 'unknown',
    teamSize: 'solo',
  };

  try {
    // Determine primary language by counting files
    const languages: Record<string, number> = {};
    await countLanguagesInDirectory(repoPath, languages);
    
    // Find primary language
    let primaryExt = '';
    if (Object.keys(languages).length > 0) {
      primaryExt = Object.entries(languages)
        .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      const primaryLanguage = getLanguageFromExtension(primaryExt);
      result.primaryLanguage = primaryLanguage || 'unknown';
    }

    // Determine project type based on files and structure
    const entries = await fs.readdir(repoPath);
    const hasPackageJson = entries.includes('package.json');
    const hasDockerfile = entries.includes('Dockerfile');
    const hasK8sFiles = entries.some(entry => entry.endsWith('.yaml') || entry.endsWith('.yml'));
    const hasTests = entries.some(entry => entry.includes('test') || entry.includes('spec'));
    
    if (hasPackageJson && entries.includes('src') && hasTests) {
      result.projectType = 'library';
    } else if (hasDockerfile || hasK8sFiles) {
      result.projectType = 'application';
    } else if (entries.includes('docs') || entries.includes('documentation')) {
      result.projectType = 'documentation';
    } else if (hasTests && primaryExt && languages[primaryExt] > 10) {
      result.projectType = 'application';
    } else {
      result.projectType = 'script';
    }

    // Estimate team size based on complexity and structure
    const totalFiles = Object.values(languages).reduce((sum, count) => sum + count, 0);
    const hasCI = entries.some(entry => entry.includes('.github') || entry.includes('.gitlab'));
    const hasContributing = entries.some(entry => entry.toLowerCase().includes('contributing'));
    
    if (totalFiles > 100 || (hasCI && hasContributing)) {
      result.teamSize = 'large';
    } else if (totalFiles > 50 || hasCI) {
      result.teamSize = 'medium';
    } else if (totalFiles > 20 || hasTests) {
      result.teamSize = 'small';
    } else {
      result.teamSize = 'solo';
    }

    return result;
  } catch (error) {
    return result;
  }
}