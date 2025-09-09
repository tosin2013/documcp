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

async function analyzeStructure(
  repoPath: string,
  depth: string,
): Promise<RepositoryAnalysis['structure']> {
  const languages: Record<string, number> = {};
  let totalFiles = 0;
  let totalDirectories = 0;
  let hasTests = false;
  let hasCI = false;
  let hasDocs = false;

  async function walkDir(dir: string, level = 0): Promise<void> {
    // PERF-001 compliance: Adaptive depth based on repository size
    const maxDepth = getMaxDepthForRepo(totalFiles);
    if (depth === 'quick' && level > Math.min(2, maxDepth)) return;
    if (depth === 'standard' && level > Math.min(4, maxDepth)) return;
    if (depth === 'deep' && level > maxDepth) return;

    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      if (entry.name === 'node_modules' || entry.name === 'vendor') continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        totalDirectories++;
        
        if (entry.name === 'test' || entry.name === 'tests' || entry.name === '__tests__') {
          hasTests = true;
        }
        if (entry.name === '.github') {
          hasCI = await checkForCI(fullPath);
        }
        if (entry.name === 'docs' || entry.name === 'documentation') {
          hasDocs = true;
        }

        await walkDir(fullPath, level + 1);
      } else {
        totalFiles++;
        const ext = path.extname(entry.name);
        
        if (ext) {
          languages[ext] = (languages[ext] || 0) + 1;
        }
      }
    }
  }

  await walkDir(repoPath);

  return {
    totalFiles,
    totalDirectories,
    languages,
    hasTests,
    hasCI,
    hasDocs,
  };
}

async function analyzeDependencies(
  repoPath: string,
): Promise<RepositoryAnalysis['dependencies']> {
  let ecosystem: RepositoryAnalysis['dependencies']['ecosystem'] = 'unknown';
  const packages: string[] = [];
  const devPackages: string[] = [];

  // Check for package.json (JavaScript/TypeScript)
  try {
    const packageJsonPath = path.join(repoPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    ecosystem = 'javascript';
    
    if (packageJson.dependencies) {
      packages.push(...Object.keys(packageJson.dependencies));
    }
    if (packageJson.devDependencies) {
      devPackages.push(...Object.keys(packageJson.devDependencies));
    }
  } catch {
    // Not a JavaScript project
  }

  // Check for requirements.txt or pyproject.toml (Python)
  try {
    const requirementsPath = path.join(repoPath, 'requirements.txt');
    await fs.access(requirementsPath);
    ecosystem = 'python';
    const requirements = await fs.readFile(requirementsPath, 'utf-8');
    const lines = requirements.split('\n').filter(line => line && !line.startsWith('#'));
    packages.push(...lines.map(line => line.split('==')[0].split('>=')[0].trim()));
  } catch {
    // Not a Python project with requirements.txt
  }

  // Check for Gemfile (Ruby)
  try {
    const gemfilePath = path.join(repoPath, 'Gemfile');
    await fs.access(gemfilePath);
    ecosystem = 'ruby';
  } catch {
    // Not a Ruby project
  }

  // Check for go.mod (Go)
  try {
    const goModPath = path.join(repoPath, 'go.mod');
    await fs.access(goModPath);
    ecosystem = 'go';
  } catch {
    // Not a Go project
  }

  return { ecosystem, packages, devPackages };
}

async function analyzeDocumentation(
  repoPath: string,
): Promise<RepositoryAnalysis['documentation']> {
  const documentation: RepositoryAnalysis['documentation'] = {
    hasReadme: false,
    hasContributing: false,
    hasLicense: false,
    existingDocs: [],
    estimatedComplexity: 'simple',
  };

  // Check for common documentation files
  const files = await fs.readdir(repoPath);
  
  for (const file of files) {
    const lowerFile = file.toLowerCase();
    
    if (lowerFile === 'readme.md' || lowerFile === 'readme.rst' || lowerFile === 'readme.txt') {
      documentation.hasReadme = true;
    }
    if (lowerFile === 'contributing.md' || lowerFile === 'contribute.md') {
      documentation.hasContributing = true;
    }
    if (lowerFile === 'license' || lowerFile === 'license.md' || lowerFile === 'license.txt') {
      documentation.hasLicense = true;
    }
  }

  // Check for docs directory
  try {
    const docsPath = path.join(repoPath, 'docs');
    const docFiles = await fs.readdir(docsPath);
    documentation.existingDocs = docFiles.filter(f => f.endsWith('.md') || f.endsWith('.rst'));
    
    if (documentation.existingDocs.length > 10) {
      documentation.estimatedComplexity = 'complex';
    } else if (documentation.existingDocs.length > 3) {
      documentation.estimatedComplexity = 'moderate';
    }
  } catch {
    // No docs directory
  }

  return documentation;
}

async function generateRecommendations(
  repoPath: string,
): Promise<RepositoryAnalysis['recommendations']> {
  const structure = await analyzeStructure(repoPath, 'quick');
  const deps = await analyzeDependencies(repoPath);
  
  // Determine primary language
  let primaryLanguage = 'unknown';
  let maxCount = 0;
  
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rs': 'rust',
  };
  
  for (const [ext, count] of Object.entries(structure.languages)) {
    if (languageMap[ext] && count > maxCount) {
      primaryLanguage = languageMap[ext];
      maxCount = count;
    }
  }

  // Determine project type
  let projectType = 'library';
  
  if (deps.packages.some(p => p.includes('express') || p.includes('fastify') || p.includes('koa'))) {
    projectType = 'web-application';
  } else if (deps.packages.some(p => p.includes('react') || p.includes('vue') || p.includes('angular'))) {
    projectType = 'frontend-application';
  } else if (structure.hasTests && structure.totalFiles > 50) {
    projectType = 'framework';
  }

  // Estimate team size
  let teamSize: RepositoryAnalysis['recommendations']['teamSize'] = 'solo';
  
  if (structure.totalFiles > 500) {
    teamSize = 'large';
  } else if (structure.totalFiles > 100) {
    teamSize = 'medium';
  } else if (structure.totalFiles > 20) {
    teamSize = 'small';
  }

  return {
    primaryLanguage,
    projectType,
    teamSize,
  };
}

async function checkForCI(githubPath: string): Promise<boolean> {
  try {
    const workflowsPath = path.join(githubPath, 'workflows');
    const files = await fs.readdir(workflowsPath);
    return files.some(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch {
    return false;
  }
}

function generateAnalysisId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// PERF-001 performance optimization helpers
function getMaxDepthForRepo(estimatedFiles: number): number {
  // Adaptive depth limiting based on repository size to meet performance targets
  if (estimatedFiles < 100) return 10;   // Small repo: allow deeper analysis
  if (estimatedFiles < 1000) return 8;   // Medium repo: moderate depth
  return 6;                              // Large repo: shallow depth for speed
}