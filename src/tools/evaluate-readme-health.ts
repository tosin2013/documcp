import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { formatMCPResponse } from '../types/api.js';

// Input validation schema
const EvaluateReadmeHealthSchema = z.object({
  readme_path: z.string().min(1, 'README path is required'),
  project_type: z.enum(['community_library', 'enterprise_tool', 'personal_project', 'documentation']).optional().default('community_library'),
  repository_path: z.string().optional(),
});

// Input type that matches what users actually pass (project_type is optional)
export interface EvaluateReadmeHealthInput {
  readme_path: string;
  project_type?: 'community_library' | 'enterprise_tool' | 'personal_project' | 'documentation';
  repository_path?: string;
}

// Health score interfaces
interface HealthScoreComponent {
  name: string;
  score: number;
  maxScore: number;
  details: HealthCheckDetail[];
}

interface HealthCheckDetail {
  check: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  recommendation?: string;
}

interface ReadmeHealthReport {
  overallScore: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: {
    communityHealth: HealthScoreComponent;
    accessibility: HealthScoreComponent;
    onboarding: HealthScoreComponent;
    contentQuality: HealthScoreComponent;
  };
  recommendations: string[];
  strengths: string[];
  criticalIssues: string[];
  estimatedImprovementTime: string;
}

export async function evaluateReadmeHealth(input: EvaluateReadmeHealthInput) {
  const startTime = Date.now();
  try {
    // Validate input
    const validatedInput = EvaluateReadmeHealthSchema.parse(input);
    
    // Read README file
    const readmePath = path.resolve(validatedInput.readme_path);
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    
    // Get repository context if available
    let repoContext: any = null;
    if (validatedInput.repository_path) {
      repoContext = await analyzeRepositoryContext(validatedInput.repository_path);
    }
    
    // Evaluate all health components
    const communityHealth = evaluateCommunityHealth(readmeContent, repoContext);
    const accessibility = evaluateAccessibility(readmeContent);
    const onboarding = evaluateOnboarding(readmeContent, validatedInput.project_type);
    const contentQuality = evaluateContentQuality(readmeContent);
    
    // Calculate overall score
    const totalScore = communityHealth.score + accessibility.score + onboarding.score + contentQuality.score;
    const maxTotalScore = communityHealth.maxScore + accessibility.maxScore + onboarding.maxScore + contentQuality.maxScore;
    const percentage = (totalScore / maxTotalScore) * 100;
    
    // Generate grade
    const grade = getGrade(percentage);
    
    // Generate recommendations and insights
    const recommendations = generateHealthRecommendations([communityHealth, accessibility, onboarding, contentQuality], 'general');
    const strengths = identifyStrengths([communityHealth, accessibility, onboarding, contentQuality]);
    const criticalIssues = identifyCriticalIssues([communityHealth, accessibility, onboarding, contentQuality]);
    
    const report: ReadmeHealthReport = {
      overallScore: Math.round(percentage),
      maxScore: 100,
      grade,
      components: {
        communityHealth,
        accessibility,
        onboarding,
        contentQuality,
      },
      recommendations,
      strengths,
      criticalIssues,
      estimatedImprovementTime: estimateImprovementTime(recommendations.length, criticalIssues.length),
    };

    const response = {
      readmePath: validatedInput.readme_path,
      projectType: validatedInput.project_type,
      healthReport: report,
      summary: generateSummary(report),
      nextSteps: generateNextSteps(report),
    };

    return formatMCPResponse({
      success: true,
      data: response,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    return formatMCPResponse({
      success: false,
      error: {
        code: 'README_HEALTH_EVALUATION_FAILED',
        message: `Failed to evaluate README health: ${error}`,
        resolution: 'Ensure README path is valid and file is readable',
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function evaluateCommunityHealth(content: string, _repoContext: any): HealthScoreComponent {
  const checks: HealthCheckDetail[] = [
    {
      check: 'Code of Conduct linked',
      passed: /code.of.conduct|conduct\.md|\.github\/code_of_conduct/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Add a link to your Code of Conduct to establish community standards',
    },
    {
      check: 'Contributing guidelines visible',
      passed: /contributing|contribute\.md|\.github\/contributing/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Include contributing guidelines to help new contributors get started',
    },
    {
      check: 'Issue/PR templates mentioned',
      passed: /issue.template|pull.request.template|\.github\/issue_template|\.github\/pull_request_template/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Reference issue and PR templates to streamline contributions',
    },
    {
      check: 'Security policy linked',
      passed: /security\.md|security.policy|\.github\/security/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Add a security policy to handle vulnerability reports responsibly',
    },
    {
      check: 'Support channels provided',
      passed: /support|help|discord|slack|discussions|forum|community/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Provide clear support channels for users seeking help',
    },
  ];

  // Award points for passed checks
  checks.forEach(check => {
    if (check.passed) {
      check.points = check.maxPoints;
    }
  });

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);

  return {
    name: 'Community Health',
    score: totalScore,
    maxScore,
    details: checks,
  };
}

function evaluateAccessibility(content: string): HealthScoreComponent {
  const lines = content.split('\n');
  const headings = lines.filter(line => line.trim().startsWith('#'));
  const images = content.match(/!\[.*?\]\(.*?\)/g) || [];
  
  const checks: HealthCheckDetail[] = [
    {
      check: 'Scannable structure with proper spacing',
      passed: content.includes('\n\n') && lines.length > 10,
      points: 0,
      maxPoints: 5,
      recommendation: 'Use proper spacing and breaks to make content scannable',
    },
    {
      check: 'Clear heading hierarchy',
      passed: headings.length >= 3 && headings.some(h => h.startsWith('##')),
      points: 0,
      maxPoints: 5,
      recommendation: 'Use proper heading hierarchy (H1, H2, H3) to structure content',
    },
    {
      check: 'Alt text for images',
      passed: images.length === 0 || images.every(img => !img.includes('![](')),
      points: 0,
      maxPoints: 5,
      recommendation: 'Add descriptive alt text for all images for screen readers',
    },
    {
      check: 'Inclusive language',
      passed: !/\b(guys|blacklist|whitelist|master|slave)\b/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Use inclusive language (e.g., "team" instead of "guys", "allowlist/blocklist")',
    },
  ];

  // Award points for passed checks
  checks.forEach(check => {
    if (check.passed) {
      check.points = check.maxPoints;
    }
  });

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);

  return {
    name: 'Accessibility',
    score: totalScore,
    maxScore,
    details: checks,
  };
}

function evaluateOnboarding(content: string, _projectType: string): HealthScoreComponent {
  const checks: HealthCheckDetail[] = [
    {
      check: 'Quick start section',
      passed: /quick.start|getting.started|installation|setup/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Add a quick start section to help users get up and running fast',
    },
    {
      check: 'Prerequisites clearly listed',
      passed: /prerequisites|requirements|dependencies|before.you.begin/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Clearly list all prerequisites and system requirements',
    },
    {
      check: 'First contribution guide',
      passed: /first.contribution|new.contributor|beginner|newcomer/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Include guidance specifically for first-time contributors',
    },
    {
      check: 'Good first issues mentioned',
      passed: /good.first.issue|beginner.friendly|easy.pick|help.wanted/i.test(content),
      points: 0,
      maxPoints: 5,
      recommendation: 'Mention good first issues or beginner-friendly tasks',
    },
  ];

  // Award points for passed checks
  checks.forEach(check => {
    if (check.passed) {
      check.points = check.maxPoints;
    }
  });

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);

  return {
    name: 'Onboarding',
    score: totalScore,
    maxScore,
    details: checks,
  };
}

function evaluateContentQuality(content: string): HealthScoreComponent {
  const wordCount = content.split(/\s+/).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const links = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  
  const checks: HealthCheckDetail[] = [
    {
      check: 'Adequate content length',
      passed: wordCount >= 50 && wordCount <= 2000,
      points: 0,
      maxPoints: 5,
      recommendation: 'Maintain optimal README length (50-2000 words) for readability',
    },
    {
      check: 'Code examples provided',
      passed: codeBlocks >= 2,
      points: 0,
      maxPoints: 5,
      recommendation: 'Include practical code examples to demonstrate usage',
    },
    {
      check: 'External links present',
      passed: links >= 3,
      points: 0,
      maxPoints: 5,
      recommendation: 'Add relevant external links (docs, demos, related projects)',
    },
    {
      check: 'Project description clarity',
      passed: /## |### /.test(content) && content.length > 500,
      points: 0,
      maxPoints: 5,
      recommendation: 'Provide clear, detailed project description with proper structure',
    },
  ];

  // Award points for passed checks
  checks.forEach(check => {
    if (check.passed) {
      check.points = check.maxPoints;
    }
  });

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);

  return {
    name: 'Content Quality',
    score: totalScore,
    maxScore,
    details: checks,
  };
}

async function analyzeRepositoryContext(repoPath: string): Promise<any> {
  try {
    const repoDir = path.resolve(repoPath);
    const files = await fs.readdir(repoDir);
    
    return {
      hasCodeOfConduct: files.includes('CODE_OF_CONDUCT.md'),
      hasContributing: files.includes('CONTRIBUTING.md'),
      hasSecurityPolicy: files.includes('SECURITY.md'),
      hasGithubDir: files.includes('.github'),
      packageJson: files.includes('package.json'),
    };
  } catch (error) {
    return null;
  }
}

function getGrade(percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

function generateHealthRecommendations(analysis: any[], _projectType: string): string[] {
  const recommendations: string[] = [];
  
  analysis.forEach((component: any) => {
    component.details.forEach((detail: any) => {
      if (detail.score < detail.maxScore) {
        recommendations.push(`${component.name}: ${detail.recommendation}`);
      }
    });
  });
  
  return recommendations.slice(0, 10); // Top 10 recommendations
}

function identifyStrengths(components: HealthScoreComponent[]): string[] {
  const strengths: string[] = [];
  
  components.forEach(component => {
    const passedChecks = component.details.filter(detail => detail.passed);
    if (passedChecks.length > component.details.length / 2) {
      strengths.push(`Strong ${component.name.toLowerCase()}: ${passedChecks.map(c => c.check.toLowerCase()).join(', ')}`);
    }
  });
  
  return strengths;
}

function identifyCriticalIssues(components: HealthScoreComponent[]): string[] {
  const critical: string[] = [];
  
  components.forEach(component => {
    if (component.score < component.maxScore * 0.3) { // Less than 30% score
      critical.push(`Critical: Poor ${component.name.toLowerCase()} (${component.score}/${component.maxScore} points)`);
    }
  });
  
  return critical;
}

function estimateImprovementTime(recommendationCount: number, criticalCount: number): string {
  const baseTime = recommendationCount * 15; // 15 minutes per recommendation
  const criticalTime = criticalCount * 30; // 30 minutes per critical issue
  const totalMinutes = baseTime + criticalTime;
  
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  if (totalMinutes < 480) return `${Math.round(totalMinutes / 60)} hours`;
  return `${Math.round(totalMinutes / 480)} days`;
}

function generateSummary(report: ReadmeHealthReport): string {
  const { overallScore, grade, components } = report;
  
  const componentScores = Object.values(components)
    .map(c => `${c.name}: ${c.score}/${c.maxScore}`)
    .join(', ');
  
  return `README Health Score: ${overallScore}/100 (Grade ${grade}). Component breakdown: ${componentScores}. ${report.criticalIssues.length} critical issues identified.`;
}

function generateNextSteps(report: ReadmeHealthReport): string[] {
  const steps: string[] = [];
  
  if (report.criticalIssues.length > 0) {
    steps.push('Address critical issues first to establish baseline community health');
  }
  
  if (report.recommendations.length > 0) {
    steps.push(`Implement top ${Math.min(3, report.recommendations.length)} recommendations for quick wins`);
  }
  
  if (report.overallScore < 85) {
    steps.push('Target 85+ health score for optimal community engagement');
  }
  
  steps.push('Re-evaluate after improvements to track progress');
  
  return steps;
}
