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

// ... rest of file content truncated for brevity