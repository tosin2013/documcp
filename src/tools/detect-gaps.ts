import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { MCPToolResponse, formatMCPResponse } from '../types/api.js';
import { analyzeRepository } from './analyze-repository.js';
import { handleValidateDiataxisContent } from './validate-content.js';

const inputSchema = z.object({
  repositoryPath: z.string().describe('Path to the repository to analyze'),
  documentationPath: z.string().optional().describe('Path to existing documentation (if any)'),
  analysisId: z.string().optional().describe('Optional existing analysis ID to reuse'),
  depth: z.enum(['quick', 'standard', 'comprehensive']).optional().default('standard'),
});

interface DocumentationGap {
  category: 'tutorials' | 'how-to' | 'reference' | 'explanation' | 'general';
  gapType:
    | 'missing_section'
    | 'incomplete_content'
    | 'outdated_info'
    | 'missing_examples'
    | 'poor_structure';
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  suggestedContent?: string;
  relatedFiles?: string[];
  estimatedEffort: 'minimal' | 'moderate' | 'substantial';
}

interface GapAnalysisResult {
  repositoryPath: string;
  documentationPath?: string;
  analysisId: string;
  overallScore: number;
  gaps: DocumentationGap[];
  strengths: string[];
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  missingStructure: {
    directories: string[];
    files: string[];
  };
  contentCoverage: {
    tutorials: number;
    howTo: number;
    reference: number;
    explanation: number;
  };
}

export async function detectDocumentationGaps(args: unknown): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const {
    repositoryPath,
    documentationPath,
    analysisId: existingAnalysisId,
    depth,
  } = inputSchema.parse(args);

  try {
    // Step 1: Get or perform repository analysis
    let analysisId = existingAnalysisId;
    let repositoryAnalysis: any;

    if (!analysisId) {
      const analysisResult = await analyzeRepository({
        path: repositoryPath,
        depth,
      });

      if (analysisResult.content && analysisResult.content[0]) {
        // The analyze_repository tool returns the analysis data directly as JSON text
        repositoryAnalysis = JSON.parse(analysisResult.content[0].text);

        // Check if the analysis was successful
        if (repositoryAnalysis.success === false) {
          throw new Error('Repository analysis failed');
        }

        analysisId = repositoryAnalysis.id; // Use the 'id' field from the analysis
      } else {
        throw new Error('Repository analysis failed - no content returned');
      }
    } else {
      // Try to retrieve existing analysis (simplified for this implementation)
      // In a full implementation, this would retrieve from persistent storage
    }

    // Step 2: Analyze existing documentation structure
    const documentationAnalysis = await analyzeExistingDocumentation(
      documentationPath || path.join(repositoryPath, 'docs'),
    );

    // Step 3: Perform content validation if documentation exists
    let validationResult: any = null;
    if (documentationAnalysis.exists && documentationPath) {
      try {
        const validation = await handleValidateDiataxisContent({
          contentPath: documentationPath,
          analysisId: analysisId,
          validationType: 'all',
          includeCodeValidation: true,
          confidence: 'moderate',
        });

        if (validation && (validation as any).content && (validation as any).content[0]) {
          const validationData = JSON.parse((validation as any).content[0].text);
          if (validationData.success) {
            validationResult = validationData.data;
          }
        }
      } catch (error) {
        // Validation errors are non-fatal - continue without validation data
        console.warn('Content validation failed, continuing without validation data:', error);
      }
    }

    // Step 4: Identify gaps based on project analysis
    const gaps = identifyDocumentationGaps(
      repositoryAnalysis,
      documentationAnalysis,
      validationResult,
    );

    // Step 5: Generate recommendations
    const recommendations = generateRecommendations(gaps, repositoryAnalysis);

    // Step 6: Calculate coverage scores
    const contentCoverage = calculateContentCoverage(documentationAnalysis, gaps);

    const gapAnalysis: GapAnalysisResult = {
      repositoryPath,
      documentationPath,
      analysisId: analysisId || 'unknown',
      overallScore: calculateOverallScore(gaps, contentCoverage),
      gaps,
      strengths: identifyStrengths(documentationAnalysis, validationResult),
      recommendations,
      missingStructure: identifyMissingStructure(documentationAnalysis),
      contentCoverage,
    };

    const response: MCPToolResponse<typeof gapAnalysis> = {
      success: true,
      data: gapAnalysis,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type:
            gapAnalysis.overallScore < 60
              ? 'critical'
              : gapAnalysis.overallScore < 80
                ? 'warning'
                : 'info',
          title: 'Documentation Gap Analysis Complete',
          description: `Found ${gaps.length} gaps. Overall documentation score: ${gapAnalysis.overallScore}%`,
        },
      ],
      nextSteps: recommendations.immediate.map((rec) => ({
        action: rec,
        toolRequired: getRecommendedTool(rec),
        description: rec,
        priority: 'high' as const,
      })),
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: 'GAP_DETECTION_FAILED',
        message: `Failed to detect documentation gaps: ${error}`,
        resolution: 'Ensure repository and documentation paths are accessible',
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

async function analyzeExistingDocumentation(docsPath: string) {
  try {
    const stats = await fs.stat(docsPath);
    if (!stats.isDirectory()) {
      return { exists: false, structure: {}, files: [] };
    }

    const structure = {
      tutorials: { exists: false, files: [] as string[] },
      'how-to': { exists: false, files: [] as string[] },
      reference: { exists: false, files: [] as string[] },
      explanation: { exists: false, files: [] as string[] },
    };

    const allFiles: string[] = [];

    // Check for Diataxis structure
    for (const [category] of Object.entries(structure)) {
      const categoryPath = path.join(docsPath, category);
      try {
        const categoryStats = await fs.stat(categoryPath);
        if (categoryStats.isDirectory()) {
          structure[category as keyof typeof structure].exists = true;
          const files = await fs.readdir(categoryPath);
          const mdFiles = files.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
          structure[category as keyof typeof structure].files = mdFiles;
          allFiles.push(...mdFiles.map((f) => path.join(category, f)));
        }
      } catch {
        // Category doesn't exist
      }
    }

    // Also check root level files
    const rootFiles = await fs.readdir(docsPath);
    const rootMdFiles = rootFiles.filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    allFiles.push(...rootMdFiles);

    return {
      exists: true,
      structure,
      files: allFiles,
      hasRootIndex: rootFiles.includes('index.md') || rootFiles.includes('README.md'),
    };
  } catch {
    return { exists: false, structure: {}, files: [] };
  }
}

function identifyDocumentationGaps(
  repoAnalysis: any,
  docsAnalysis: any,
  validationResult: any,
): DocumentationGap[] {
  const gaps: DocumentationGap[] = [];

  // Check for missing Diataxis structure
  if (!docsAnalysis.exists) {
    gaps.push({
      category: 'general',
      gapType: 'missing_section',
      description: 'No documentation directory found',
      priority: 'critical',
      recommendation: 'Create documentation structure using setup_structure tool',
      estimatedEffort: 'moderate',
    });
    return gaps; // If no docs exist, return early
  }

  const diataxisCategories = ['tutorials', 'how-to', 'reference', 'explanation'];
  for (const category of diataxisCategories) {
    if (!docsAnalysis.structure[category]?.exists) {
      gaps.push({
        category: category as any,
        gapType: 'missing_section',
        description: `Missing ${category} documentation section`,
        priority: category === 'tutorials' || category === 'reference' ? 'high' : 'medium',
        recommendation: `Create ${category} directory and add relevant content`,
        estimatedEffort: 'moderate',
      });
    } else if (docsAnalysis.structure[category].files.length === 0) {
      gaps.push({
        category: category as any,
        gapType: 'incomplete_content',
        description: `${category} section exists but has no content`,
        priority: 'high',
        recommendation: `Add content to ${category} section using populate_diataxis_content tool`,
        estimatedEffort: 'substantial',
      });
    }
  }

  // Technology-specific gaps based on repository analysis
  if (repoAnalysis) {
    // Check for API documentation gaps
    if (repoAnalysis.hasApiEndpoints && !hasApiDocumentation(docsAnalysis)) {
      gaps.push({
        category: 'reference',
        gapType: 'missing_section',
        description: 'API endpoints detected but no API documentation found',
        priority: 'critical',
        recommendation: 'Create API reference documentation',
        estimatedEffort: 'substantial',
      });
    }

    // Check for setup/installation guides
    if (repoAnalysis.packageManager && !hasInstallationGuide(docsAnalysis)) {
      gaps.push({
        category: 'tutorials',
        gapType: 'missing_section',
        description: 'Package manager detected but no installation guide found',
        priority: 'high',
        recommendation: 'Create installation and setup tutorial',
        estimatedEffort: 'moderate',
      });
    }

    // Check for Docker documentation
    if (repoAnalysis.hasDocker && !hasDockerDocumentation(docsAnalysis)) {
      gaps.push({
        category: 'how-to',
        gapType: 'missing_section',
        description: 'Docker configuration found but no Docker documentation',
        priority: 'medium',
        recommendation: 'Add Docker deployment and development guides',
        estimatedEffort: 'moderate',
      });
    }

    // Check for CI/CD documentation
    if (repoAnalysis.hasCICD && !hasCICDDocumentation(docsAnalysis)) {
      gaps.push({
        category: 'explanation',
        gapType: 'missing_section',
        description: 'CI/CD configuration found but no related documentation',
        priority: 'medium',
        recommendation: 'Document CI/CD processes and deployment workflows',
        estimatedEffort: 'moderate',
      });
    }
  }

  // Add validation-based gaps
  if (validationResult?.validationResults) {
    for (const result of validationResult.validationResults) {
      if (result.status === 'fail') {
        gaps.push({
          category: 'general',
          gapType: 'poor_structure',
          description: result.message,
          priority: 'medium',
          recommendation: result.recommendation || 'Fix validation issue',
          estimatedEffort: 'minimal',
        });
      }
    }
  }

  return gaps;
}

function hasApiDocumentation(docsAnalysis: any): boolean {
  const allFiles = docsAnalysis.files || [];
  return allFiles.some(
    (file: string) =>
      file.toLowerCase().includes('api') ||
      file.toLowerCase().includes('endpoint') ||
      file.toLowerCase().includes('swagger') ||
      file.toLowerCase().includes('openapi'),
  );
}

function hasInstallationGuide(docsAnalysis: any): boolean {
  const allFiles = docsAnalysis.files || [];
  return allFiles.some(
    (file: string) =>
      file.toLowerCase().includes('install') ||
      file.toLowerCase().includes('setup') ||
      file.toLowerCase().includes('getting-started') ||
      file.toLowerCase().includes('quickstart'),
  );
}

function hasDockerDocumentation(docsAnalysis: any): boolean {
  const allFiles = docsAnalysis.files || [];
  return allFiles.some(
    (file: string) =>
      file.toLowerCase().includes('docker') ||
      file.toLowerCase().includes('container') ||
      file.toLowerCase().includes('compose'),
  );
}

function hasCICDDocumentation(docsAnalysis: any): boolean {
  const allFiles = docsAnalysis.files || [];
  return allFiles.some(
    (file: string) =>
      file.toLowerCase().includes('ci') ||
      file.toLowerCase().includes('cd') ||
      file.toLowerCase().includes('deploy') ||
      file.toLowerCase().includes('workflow') ||
      file.toLowerCase().includes('pipeline'),
  );
}

function generateRecommendations(gaps: DocumentationGap[], _repoAnalysis: any) {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];

  const criticalGaps = gaps.filter((g) => g.priority === 'critical');
  const highGaps = gaps.filter((g) => g.priority === 'high');
  const mediumGaps = gaps.filter((g) => g.priority === 'medium');

  // Immediate (Critical gaps)
  criticalGaps.forEach((gap) => {
    immediate.push(gap.recommendation);
  });

  // Short-term (High priority gaps)
  highGaps.forEach((gap) => {
    shortTerm.push(gap.recommendation);
  });

  // Long-term (Medium/Low priority gaps)
  mediumGaps.forEach((gap) => {
    longTerm.push(gap.recommendation);
  });

  // Add general recommendations
  if (immediate.length === 0 && shortTerm.length === 0) {
    immediate.push('Documentation structure looks good - consider content enhancement');
  }

  return { immediate, shortTerm, longTerm };
}

function calculateContentCoverage(docsAnalysis: any, gaps: DocumentationGap[]) {
  const categories = ['tutorials', 'howTo', 'reference', 'explanation'];
  const coverage: any = {};

  categories.forEach((category) => {
    const categoryKey = category === 'howTo' ? 'how-to' : category;
    const hasContent =
      docsAnalysis.structure?.[categoryKey]?.exists &&
      docsAnalysis.structure[categoryKey].files.length > 0;
    const hasGaps = gaps.some((g) => g.category === categoryKey);

    if (hasContent && !hasGaps) {
      coverage[category] = 100;
    } else if (hasContent && hasGaps) {
      coverage[category] = 60;
    } else {
      coverage[category] = 0;
    }
  });

  return coverage;
}

function calculateOverallScore(gaps: DocumentationGap[], contentCoverage: any): number {
  const coverageScore =
    Object.values(contentCoverage).reduce((acc: number, val: any) => acc + val, 0) / 4;
  const gapPenalty = gaps.length * 5; // Each gap reduces score by 5
  const criticalPenalty = gaps.filter((g) => g.priority === 'critical').length * 15; // Critical gaps have higher penalty

  return Math.max(0, Math.min(100, coverageScore - gapPenalty - criticalPenalty));
}

function identifyStrengths(docsAnalysis: any, validationResult: any): string[] {
  const strengths: string[] = [];

  if (docsAnalysis.hasRootIndex) {
    strengths.push('Has main documentation index file');
  }

  const existingSections = Object.entries(docsAnalysis.structure || {})
    .filter(([_, data]: [string, any]) => data.exists && data.files.length > 0)
    .map(([section]) => section);

  if (existingSections.length > 0) {
    strengths.push(`Well-organized sections: ${existingSections.join(', ')}`);
  }

  if (validationResult?.overallScore > 80) {
    strengths.push('High-quality existing content');
  }

  return strengths;
}

function identifyMissingStructure(docsAnalysis: any) {
  const missingDirectories: string[] = [];
  const missingFiles: string[] = [];

  const expectedDirectories = ['tutorials', 'how-to', 'reference', 'explanation'];
  expectedDirectories.forEach((dir) => {
    if (!docsAnalysis.structure?.[dir]?.exists) {
      missingDirectories.push(dir);
    }
  });

  if (!docsAnalysis.hasRootIndex) {
    missingFiles.push('index.md');
  }

  return { directories: missingDirectories, files: missingFiles };
}

function getRecommendedTool(recommendation: string): string {
  if (recommendation.includes('setup_structure')) return 'setup_structure';
  if (recommendation.includes('populate_diataxis_content')) return 'populate_diataxis_content';
  if (recommendation.includes('validate_diataxis_content')) return 'validate_diataxis_content';
  if (recommendation.includes('generate_config')) return 'generate_config';
  if (recommendation.includes('deploy_pages')) return 'deploy_pages';
  return 'manual';
}
