import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { MCPToolResponse } from '../types/api.js';

// Input validation schema
const AnalyzeReadmeInputSchema = z.object({
  project_path: z.string().min(1, 'Project path is required'),
  target_audience: z
    .enum(['community_contributors', 'enterprise_users', 'developers', 'general'])
    .optional()
    .default('community_contributors'),
  optimization_level: z.enum(['light', 'moderate', 'aggressive']).optional().default('moderate'),
  max_length_target: z.number().min(50).max(1000).optional().default(300),
});

export type AnalyzeReadmeInput = z.infer<typeof AnalyzeReadmeInputSchema>;

interface ReadmeAnalysis {
  lengthAnalysis: {
    currentLines: number;
    currentWords: number;
    targetLines: number;
    exceedsTarget: boolean;
    reductionNeeded: number;
  };
  structureAnalysis: {
    scannabilityScore: number;
    headingHierarchy: HeadingInfo[];
    sectionLengths: SectionLength[];
    hasProperSpacing: boolean;
  };
  contentAnalysis: {
    hasTldr: boolean;
    hasQuickStart: boolean;
    hasPrerequisites: boolean;
    hasTroubleshooting: boolean;
    codeBlockCount: number;
    linkCount: number;
  };
  communityReadiness: {
    hasContributing: boolean;
    hasIssueTemplates: boolean;
    hasCodeOfConduct: boolean;
    hasSecurity: boolean;
    badgeCount: number;
  };
  optimizationOpportunities: OptimizationOpportunity[];
  overallScore: number;
  recommendations: string[];
}

interface HeadingInfo {
  level: number;
  text: string;
  line: number;
  sectionLength: number;
}

interface SectionLength {
  heading: string;
  lines: number;
  words: number;
  tooLong: boolean;
}

interface OptimizationOpportunity {
  type: 'length_reduction' | 'structure_improvement' | 'content_enhancement' | 'community_health';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export async function analyzeReadme(
  input: Partial<AnalyzeReadmeInput>,
): Promise<MCPToolResponse<{ analysis: ReadmeAnalysis; nextSteps: string[] }>> {
  const startTime = Date.now();

  try {
    // Validate input
    const validatedInput = AnalyzeReadmeInputSchema.parse(input);
    const { project_path, target_audience, optimization_level, max_length_target } = validatedInput;

    // Find README file
    const readmePath = await findReadmeFile(project_path);
    if (!readmePath) {
      return {
        success: false,
        error: {
          code: 'README_NOT_FOUND',
          message: 'No README file found in the project directory',
          details: 'Looked for README.md, README.txt, readme.md in project root',
          resolution: 'Create a README.md file in the project root directory',
        },
        metadata: {
          toolVersion: '1.0.0',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Read README content
    const readmeContent = await fs.readFile(readmePath, 'utf-8');

    // Get project context
    const projectContext = await analyzeProjectContext(project_path);

    // Perform comprehensive analysis
    const lengthAnalysis = analyzeLengthMetrics(readmeContent, max_length_target);
    const structureAnalysis = analyzeStructure(readmeContent);
    const contentAnalysis = analyzeContent(readmeContent);
    const communityReadiness = analyzeCommunityReadiness(readmeContent, projectContext);

    // Generate optimization opportunities
    const optimizationOpportunities = generateOptimizationOpportunities(
      lengthAnalysis,
      structureAnalysis,
      contentAnalysis,
      communityReadiness,
      optimization_level,
      target_audience,
    );

    // Calculate overall score
    const overallScore = calculateOverallScore(
      lengthAnalysis,
      structureAnalysis,
      contentAnalysis,
      communityReadiness,
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      optimizationOpportunities,
      target_audience,
      optimization_level,
    );

    const analysis: ReadmeAnalysis = {
      lengthAnalysis,
      structureAnalysis,
      contentAnalysis,
      communityReadiness,
      optimizationOpportunities,
      overallScore,
      recommendations,
    };

    const nextSteps = generateNextSteps(analysis, optimization_level);

    return {
      success: true,
      data: {
        analysis,
        nextSteps,
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        analysisId: `readme-analysis-${Date.now()}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: 'Failed to analyze README',
        details: error instanceof Error ? error.message : 'Unknown error',
        resolution: 'Check project path and README file accessibility',
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

async function findReadmeFile(projectPath: string): Promise<string | null> {
  const possibleNames = ['README.md', 'README.txt', 'readme.md', 'Readme.md', 'README'];

  for (const name of possibleNames) {
    const filePath = path.join(projectPath, name);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      continue;
    }
  }

  return null;
}

async function analyzeProjectContext(projectPath: string): Promise<any> {
  try {
    const files = await fs.readdir(projectPath);
    return {
      hasPackageJson: files.includes('package.json'),
      hasContributing: files.includes('CONTRIBUTING.md'),
      hasCodeOfConduct: files.includes('CODE_OF_CONDUCT.md'),
      hasSecurity: files.includes('SECURITY.md'),
      hasGithubDir: files.includes('.github'),
      hasDocsDir: files.includes('docs'),
      projectType: detectProjectType(files),
    };
  } catch {
    return {};
  }
}

function detectProjectType(files: string[]): string {
  if (files.includes('package.json')) return 'javascript';
  if (files.includes('requirements.txt') || files.includes('setup.py')) return 'python';
  if (files.includes('Cargo.toml')) return 'rust';
  if (files.includes('go.mod')) return 'go';
  if (files.includes('pom.xml') || files.includes('build.gradle')) return 'java';
  return 'unknown';
}

function analyzeLengthMetrics(content: string, targetLines: number) {
  const lines = content.split('\n');
  const words = content.split(/\s+/).length;
  const currentLines = lines.length;

  return {
    currentLines,
    currentWords: words,
    targetLines,
    exceedsTarget: currentLines > targetLines,
    reductionNeeded: Math.max(0, currentLines - targetLines),
  };
}

function analyzeStructure(content: string) {
  const lines = content.split('\n');
  const headings = extractHeadings(lines);
  const sectionLengths = calculateSectionLengths(lines, headings);

  // Calculate scannability score
  const hasGoodSpacing = /\n\s*\n/.test(content);
  const hasLists = /^\s*[-*+]\s+/m.test(content);
  const hasCodeBlocks = /```/.test(content);
  const properHeadingHierarchy = checkHeadingHierarchy(headings);

  const scannabilityScore = Math.round(
    (hasGoodSpacing ? 25 : 0) +
      (hasLists ? 25 : 0) +
      (hasCodeBlocks ? 25 : 0) +
      (properHeadingHierarchy ? 25 : 0),
  );

  return {
    scannabilityScore,
    headingHierarchy: headings,
    sectionLengths,
    hasProperSpacing: hasGoodSpacing,
  };
}

function extractHeadings(lines: string[]): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index + 1,
        sectionLength: 0, // Will be calculated later
      });
    }
  });

  return headings;
}

function calculateSectionLengths(lines: string[], headings: HeadingInfo[]): SectionLength[] {
  const sections: SectionLength[] = [];

  headings.forEach((heading, index) => {
    const startLine = heading.line - 1;
    const endLine = index < headings.length - 1 ? headings[index + 1].line - 1 : lines.length;

    const sectionLines = lines.slice(startLine, endLine);
    const sectionText = sectionLines.join('\n');
    const wordCount = sectionText.split(/\s+/).length;

    sections.push({
      heading: heading.text,
      lines: sectionLines.length,
      words: wordCount,
      tooLong: sectionLines.length > 50 || wordCount > 500,
    });
  });

  return sections;
}

function checkHeadingHierarchy(headings: HeadingInfo[]): boolean {
  if (headings.length === 0) return false;

  // Check if starts with H1
  if (headings[0].level !== 1) return false;

  // Check for logical hierarchy
  for (let i = 1; i < headings.length; i++) {
    const levelDiff = headings[i].level - headings[i - 1].level;
    if (levelDiff > 1) return false; // Skipping levels
  }

  return true;
}

function analyzeContent(content: string) {
  return {
    hasTldr: content.includes('## TL;DR') || content.includes('# TL;DR'),
    hasQuickStart: /quick start|getting started|installation/i.test(content),
    hasPrerequisites: /prerequisite|requirement|dependencies/i.test(content),
    hasTroubleshooting: /troubleshoot|faq|common issues|problems/i.test(content),
    codeBlockCount: (content.match(/```/g) || []).length / 2,
    linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length,
  };
}

function analyzeCommunityReadiness(content: string, projectContext: any) {
  return {
    hasContributing: /contributing|contribute/i.test(content) || projectContext.hasContributing,
    hasIssueTemplates: /issue template|bug report/i.test(content) || projectContext.hasGithubDir,
    hasCodeOfConduct: /code of conduct/i.test(content) || projectContext.hasCodeOfConduct,
    hasSecurity: /security/i.test(content) || projectContext.hasSecurity,
    badgeCount: (content.match(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g) || []).length,
  };
}

function generateOptimizationOpportunities(
  lengthAnalysis: any,
  structureAnalysis: any,
  contentAnalysis: any,
  communityReadiness: any,
  optimizationLevel: string,
  targetAudience: string,
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  // Length reduction opportunities
  if (lengthAnalysis.exceedsTarget) {
    opportunities.push({
      type: 'length_reduction',
      priority: 'high',
      description: `README is ${lengthAnalysis.reductionNeeded} lines over target (${lengthAnalysis.currentLines}/${lengthAnalysis.targetLines})`,
      impact: 'Improves scannability and reduces cognitive load for new users',
      effort: lengthAnalysis.reductionNeeded > 100 ? 'high' : 'medium',
    });
  }

  // Structure improvements
  if (structureAnalysis.scannabilityScore < 75) {
    opportunities.push({
      type: 'structure_improvement',
      priority: 'high',
      description: `Low scannability score (${structureAnalysis.scannabilityScore}/100)`,
      impact: 'Makes README easier to navigate and understand quickly',
      effort: 'medium',
    });
  }

  // Content enhancements
  if (!contentAnalysis.hasTldr) {
    opportunities.push({
      type: 'content_enhancement',
      priority: 'high',
      description: 'Missing TL;DR section for quick project overview',
      impact: 'Helps users quickly understand project value proposition',
      effort: 'low',
    });
  }

  if (!contentAnalysis.hasQuickStart) {
    opportunities.push({
      type: 'content_enhancement',
      priority: 'medium',
      description: 'Missing quick start section',
      impact: 'Reduces time to first success for new users',
      effort: 'medium',
    });
  }

  // Community health
  if (!communityReadiness.hasContributing && targetAudience === 'community_contributors') {
    opportunities.push({
      type: 'community_health',
      priority: 'medium',
      description: 'Missing contributing guidelines',
      impact: 'Encourages community participation and sets expectations',
      effort: 'medium',
    });
  }

  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function calculateOverallScore(
  lengthAnalysis: any,
  structureAnalysis: any,
  contentAnalysis: any,
  communityReadiness: any,
): number {
  let score = 0;

  // Length score (25 points)
  score += lengthAnalysis.exceedsTarget
    ? Math.max(0, 25 - lengthAnalysis.reductionNeeded / 10)
    : 25;

  // Structure score (25 points)
  score += (structureAnalysis.scannabilityScore / 100) * 25;

  // Content score (25 points)
  const contentScore =
    (contentAnalysis.hasTldr ? 8 : 0) +
    (contentAnalysis.hasQuickStart ? 8 : 0) +
    (contentAnalysis.hasPrerequisites ? 5 : 0) +
    (contentAnalysis.codeBlockCount > 0 ? 4 : 0);
  score += Math.min(25, contentScore);

  // Community score (25 points)
  const communityScore =
    (communityReadiness.hasContributing ? 8 : 0) +
    (communityReadiness.hasCodeOfConduct ? 5 : 0) +
    (communityReadiness.hasSecurity ? 5 : 0) +
    (communityReadiness.badgeCount > 0 ? 4 : 0) +
    (communityReadiness.hasIssueTemplates ? 3 : 0);
  score += Math.min(25, communityScore);

  return Math.round(score);
}

function generateRecommendations(
  opportunities: OptimizationOpportunity[],
  targetAudience: string,
  optimizationLevel: string,
): string[] {
  const recommendations: string[] = [];

  // High priority opportunities first
  const highPriority = opportunities.filter((op) => op.priority === 'high');
  highPriority.forEach((op) => {
    recommendations.push(`🚨 ${op.description} - ${op.impact}`);
  });

  // Audience-specific recommendations
  if (targetAudience === 'community_contributors') {
    recommendations.push(
      '👥 Focus on community onboarding: clear contributing guidelines and issue templates',
    );
  } else if (targetAudience === 'enterprise_users') {
    recommendations.push('🏢 Emphasize security, compliance, and support channels');
  }

  // Optimization level specific
  if (optimizationLevel === 'aggressive') {
    recommendations.push(
      '⚡ Consider moving detailed documentation to separate files (docs/ directory)',
    );
    recommendations.push('📝 Use progressive disclosure: expandable sections for advanced topics');
  }

  return recommendations.slice(0, 8); // Limit to top 8 recommendations
}

function generateNextSteps(analysis: ReadmeAnalysis, optimizationLevel: string): string[] {
  const steps: string[] = [];

  if (analysis.overallScore < 60) {
    steps.push('🎯 Priority: Address critical issues first (score < 60)');
  }

  // Add specific next steps based on opportunities
  const highPriorityOps = analysis.optimizationOpportunities
    .filter((op) => op.priority === 'high')
    .slice(0, 3);

  highPriorityOps.forEach((op) => {
    steps.push(`• ${op.description}`);
  });

  if (optimizationLevel !== 'light') {
    steps.push('📊 Run optimize_readme tool to get specific restructuring suggestions');
  }

  steps.push('🔄 Re-analyze after changes to track improvement');

  return steps;
}
