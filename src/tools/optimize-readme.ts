import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { MCPToolResponse } from '../types/api.js';

// Input validation schema
const OptimizeReadmeInputSchema = z.object({
  readme_path: z.string().min(1, 'README path is required'),
  strategy: z.enum(['community_focused', 'enterprise_focused', 'developer_focused', 'general']).optional().default('community_focused'),
  max_length: z.number().min(50).max(1000).optional().default(300),
  include_tldr: z.boolean().optional().default(true),
  preserve_existing: z.boolean().optional().default(true),
  output_path: z.string().optional(),
  create_docs_directory: z.boolean().optional().default(true),
});

export type OptimizeReadmeInput = z.infer<typeof OptimizeReadmeInputSchema>;

interface OptimizationResult {
  originalLength: number;
  optimizedLength: number;
  reductionPercentage: number;
  optimizedContent: string;
  extractedSections: ExtractedSection[];
  tldrGenerated: string | null;
  restructuringChanges: RestructuringChange[];
  recommendations: string[];
}

interface ExtractedSection {
  title: string;
  content: string;
  suggestedLocation: string;
  reason: string;
}

interface RestructuringChange {
  type: 'moved' | 'condensed' | 'split' | 'added' | 'removed';
  section: string;
  description: string;
  impact: string;
}

export async function optimizeReadme(input: Partial<OptimizeReadmeInput>): Promise<MCPToolResponse<{ optimization: OptimizationResult; nextSteps: string[] }>> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validatedInput = OptimizeReadmeInputSchema.parse(input);
    const { readme_path, strategy, max_length, include_tldr, preserve_existing, output_path, create_docs_directory } = validatedInput;

    // Read original README
    const originalContent = await fs.readFile(readme_path, 'utf-8');
    const originalLength = originalContent.split('\n').length;

    // Parse README structure
    const sections = parseReadmeStructure(originalContent);
    
    // Generate TL;DR if requested
    const tldrGenerated = include_tldr ? generateTldr(originalContent, sections) : null;
    
    // Identify sections to extract
    const extractedSections = identifySectionsToExtract(sections, strategy, max_length);
    
    // Restructure content
    const { optimizedContent, restructuringChanges } = restructureContent(
      originalContent,
      sections,
      extractedSections,
      tldrGenerated,
      strategy,
      preserve_existing
    );

    const optimizedLength = optimizedContent.split('\n').length;
    const reductionPercentage = Math.round(((originalLength - optimizedLength) / originalLength) * 100);

    // Create docs directory and extract detailed content if requested
    if (create_docs_directory && extractedSections.length > 0) {
      await createDocsStructure(path.dirname(readme_path), extractedSections);
    }

    // Write optimized README if output path specified
    if (output_path) {
      await fs.writeFile(output_path, optimizedContent, 'utf-8');
    }

    const recommendations = generateOptimizationRecommendations(
      originalLength,
      optimizedLength,
      extractedSections,
      strategy
    );

    const optimization: OptimizationResult = {
      originalLength,
      optimizedLength,
      reductionPercentage,
      optimizedContent,
      extractedSections,
      tldrGenerated,
      restructuringChanges,
      recommendations
    };

    const nextSteps = generateOptimizationNextSteps(optimization, validatedInput);

    return {
      success: true,
      data: {
        optimization,
        nextSteps
      },
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
        code: 'OPTIMIZATION_FAILED',
        message: 'Failed to optimize README',
        details: error instanceof Error ? error.message : 'Unknown error',
        resolution: 'Check README file path and permissions'
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }
}

interface ReadmeSection {
  title: string;
  content: string;
  level: number;
  startLine: number;
  endLine: number;
  wordCount: number;
  isEssential: boolean;
}

function parseReadmeStructure(content: string): ReadmeSection[] {
  const lines = content.split('\n');
  const sections: ReadmeSection[] = [];
  let currentTitle = '';
  let currentLevel = 0;
  let currentStartLine = 0;

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section
      if (currentTitle) {
        const endLine = index - 1;
        const sectionContent = lines.slice(currentStartLine, endLine + 1).join('\n');
        const wordCount = sectionContent.split(/\s+/).length;
        const isEssential = isEssentialSection(currentTitle);
        
        sections.push({
          title: currentTitle,
          content: sectionContent,
          level: currentLevel,
          startLine: currentStartLine,
          endLine: endLine,
          wordCount: wordCount,
          isEssential: isEssential
        });
      }

      // Start new section
      currentTitle = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentStartLine = index;
    }
  });

  // Add final section
  if (currentTitle) {
    const endLine = lines.length - 1;
    const sectionContent = lines.slice(currentStartLine, endLine + 1).join('\n');
    const wordCount = sectionContent.split(/\s+/).length;
    const isEssential = isEssentialSection(currentTitle);
    
    sections.push({
      title: currentTitle,
      content: sectionContent,
      level: currentLevel,
      startLine: currentStartLine,
      endLine: endLine,
      wordCount: wordCount,
      isEssential: isEssential
    });
  }

  return sections;
}

function isEssentialSection(title: string): boolean {
  const essentialKeywords = [
    'installation', 'install', 'setup', 'getting started', 'quick start',
    'usage', 'example', 'api', 'license', 'contributing'
  ];
  
  return essentialKeywords.some(keyword => 
    title.toLowerCase().includes(keyword)
  );
}

function generateTldr(content: string, sections: ReadmeSection[]): string {
  // Extract project name from first heading
  const projectNameMatch = content.match(/^#\s+(.+)$/m);
  const projectName = projectNameMatch ? projectNameMatch[1] : 'This project';

  // Extract description (usually after title or in blockquote)
  const descriptionMatch = content.match(/>\s*(.+)/);
  let description = descriptionMatch ? descriptionMatch[1] : '';

  // If no description found, try to extract from first paragraph
  if (!description) {
    const firstParagraphMatch = content.match(/^[^#\n].{20,200}/m);
    description = firstParagraphMatch ? firstParagraphMatch[0].substring(0, 100) + '...' : '';
  }

  // Identify key features or use cases
  const features: string[] = [];
  sections.forEach(section => {
    if (section.title.toLowerCase().includes('feature') || 
        section.title.toLowerCase().includes('what') ||
        section.title.toLowerCase().includes('why')) {
      const bullets = section.content.match(/^\s*[-*+]\s+(.+)$/gm);
      if (bullets && bullets.length > 0) {
        features.push(...bullets.slice(0, 3).map(b => b.replace(/^\s*[-*+]\s+/, '').trim()));
      }
    }
  });

  let tldr = `## TL;DR\n\n${projectName} ${description}\n\n`;
  
  if (features.length > 0) {
    tldr += `**Key features:**\n`;
    features.slice(0, 3).forEach(feature => {
      tldr += `- ${feature}\n`;
    });
    tldr += '\n';
  }

  // Add quick start reference
  const hasInstallSection = sections.some(s => 
    s.title.toLowerCase().includes('install') || 
    s.title.toLowerCase().includes('setup')
  );
  
  if (hasInstallSection) {
    tldr += `**Quick start:** See [Installation](#installation) → [Usage](#usage)\n\n`;
  }

  return tldr;
}

function identifySectionsToExtract(
  sections: ReadmeSection[], 
  strategy: string, 
  maxLength: number
): ExtractedSection[] {
  const extractedSections: ExtractedSection[] = [];
  const currentLength = sections.reduce((sum, s) => sum + s.content.split('\n').length, 0);
  
  if (currentLength <= maxLength) {
    return extractedSections; // No extraction needed
  }

  // Define extraction rules based on strategy
  const extractionRules = getExtractionRules(strategy);

  sections.forEach(section => {
    for (const rule of extractionRules) {
      if (rule.matcher(section) && !section.isEssential) {
        extractedSections.push({
          title: section.title,
          content: section.content,
          suggestedLocation: rule.suggestedLocation,
          reason: rule.reason
        });
        break;
      }
    }
  });

  return extractedSections;
}

function getExtractionRules(strategy: string) {
  const baseRules = [
    {
      matcher: (section: ReadmeSection) => section.wordCount > 200,
      suggestedLocation: 'docs/detailed-guide.md',
      reason: 'Section too long for main README'
    },
    {
      matcher: (section: ReadmeSection) => 
        /troubleshoot|faq|common issues|problems/i.test(section.title),
      suggestedLocation: 'docs/troubleshooting.md',
      reason: 'Troubleshooting content better suited for separate document'
    },
    {
      matcher: (section: ReadmeSection) => 
        /advanced|configuration|config/i.test(section.title),
      suggestedLocation: 'docs/configuration.md',
      reason: 'Advanced configuration details'
    },
    {
      matcher: (section: ReadmeSection) => 
        /development|developer|build|compile/i.test(section.title),
      suggestedLocation: 'docs/development.md',
      reason: 'Development-specific information'
    }
  ];

  if (strategy === 'community_focused') {
    baseRules.push({
      matcher: (section: ReadmeSection) => 
        /architecture|design|technical/i.test(section.title),
      suggestedLocation: 'docs/architecture.md',
      reason: 'Technical details can overwhelm community contributors'
    });
  }

  return baseRules;
}

function restructureContent(
  originalContent: string,
  sections: ReadmeSection[],
  extractedSections: ExtractedSection[],
  tldrGenerated: string | null,
  strategy: string,
  preserveExisting: boolean
): { optimizedContent: string; restructuringChanges: RestructuringChange[] } {
  const changes: RestructuringChange[] = [];
  let optimizedContent = originalContent;

  // Remove extracted sections
  const extractedTitles = extractedSections.map(es => es.title);
  const remainingSections = sections.filter(section => 
    !extractedTitles.includes(section.title)
  );

  // Rebuild content with optimal structure
  const lines = originalContent.split('\n');
  let newContent = '';

  // Keep title and description
  const titleMatch = originalContent.match(/^#\s+.+$/m);
  if (titleMatch) {
    newContent += titleMatch[0] + '\n\n';
  }

  const descriptionMatch = originalContent.match(/>\s*.+/);
  if (descriptionMatch) {
    newContent += descriptionMatch[0] + '\n\n';
  }

  // Add badges if they exist
  const badgeSection = extractBadges(originalContent);
  if (badgeSection) {
    newContent += badgeSection + '\n\n';
  }

  // Add TL;DR if generated
  if (tldrGenerated) {
    newContent += tldrGenerated + '\n';
    changes.push({
      type: 'added',
      section: 'TL;DR',
      description: 'Added concise project overview',
      impact: 'Helps users quickly understand project value'
    });
  }

  // Add remaining sections in optimal order
  const optimalOrder = getOptimalSectionOrder(strategy);
  const orderedSections = reorderSections(remainingSections, optimalOrder);

  orderedSections.forEach(section => {
    // Condense long sections if needed
    let sectionContent = section.content;
    if (section.wordCount > 150 && !section.isEssential) {
      sectionContent = condenseSectionContent(section);
      changes.push({
        type: 'condensed',
        section: section.title,
        description: 'Condensed verbose content',
        impact: 'Improved readability and focus'
      });
    }

    newContent += sectionContent + '\n\n';
  });

  // Add links to extracted documentation
  if (extractedSections.length > 0) {
    newContent += '## Additional Documentation\n\n';
    extractedSections.forEach(extracted => {
      const filename = path.basename(extracted.suggestedLocation);
      newContent += `- [${extracted.title}](${extracted.suggestedLocation})\n`;
    });
    newContent += '\n';

    changes.push({
      type: 'moved',
      section: 'Detailed sections',
      description: `Moved ${extractedSections.length} sections to docs/`,
      impact: 'Reduced README length while preserving information'
    });
  }

  return {
    optimizedContent: newContent.trim(),
    restructuringChanges: changes
  };
}

function extractBadges(content: string): string | null {
  const badgeRegex = /\[!\[.*?\]\(.*?\)\]\(.*?\)/g;
  const badges = content.match(badgeRegex);
  return badges ? badges.join('\n') : null;
}

function getOptimalSectionOrder(strategy: string): string[] {
  const baseOrder = [
    'installation', 'install', 'setup', 'getting started',
    'quick start', 'usage', 'example', 'examples',
    'api', 'configuration', 'contributing', 'license'
  ];

  if (strategy === 'community_focused') {
    return [
      'quick start', 'installation', 'usage', 'examples',
      'contributing', 'license', 'api', 'configuration'
    ];
  }

  return baseOrder;
}

function reorderSections(sections: ReadmeSection[], optimalOrder: string[]): ReadmeSection[] {
  const ordered: ReadmeSection[] = [];
  const remaining = [...sections];

  // Add sections in optimal order
  optimalOrder.forEach(keyword => {
    const index = remaining.findIndex(section => 
      section.title.toLowerCase().includes(keyword)
    );
    if (index !== -1) {
      ordered.push(remaining.splice(index, 1)[0]);
    }
  });

  // Add remaining sections
  ordered.push(...remaining);

  return ordered;
}

function condenseSectionContent(section: ReadmeSection): string {
  const lines = section.content.split('\n');
  const condensed: string[] = [];

  // Keep heading
  condensed.push(lines[0]);

  // Extract key points (bullets, code blocks, important paragraphs)
  let inCodeBlock = false;
  lines.slice(1).forEach(line => {
    if (line.includes('```')) {
      inCodeBlock = !inCodeBlock;
      condensed.push(line);
    } else if (inCodeBlock) {
      condensed.push(line);
    } else if (line.match(/^\s*[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
      // Keep bullet points and numbered lists
      condensed.push(line);
    } else if (line.trim().length > 0 && line.length < 100) {
      // Keep short, meaningful lines
      condensed.push(line);
    } else if (line.trim().length === 0) {
      // Keep spacing
      condensed.push(line);
    }
  });

  return condensed.join('\n');
}

async function createDocsStructure(projectDir: string, extractedSections: ExtractedSection[]): Promise<void> {
  const docsDir = path.join(projectDir, 'docs');
  
  try {
    await fs.mkdir(docsDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  // Create extracted documentation files
  for (const section of extractedSections) {
    const filePath = path.join(projectDir, section.suggestedLocation);
    const fileDir = path.dirname(filePath);
    
    try {
      await fs.mkdir(fileDir, { recursive: true });
      await fs.writeFile(filePath, section.content, 'utf-8');
    } catch (error) {
      console.warn(`Failed to create ${filePath}:`, error);
    }
  }

  // Create docs index
  const indexContent = generateDocsIndex(extractedSections);
  await fs.writeFile(path.join(docsDir, 'README.md'), indexContent, 'utf-8');
}

function generateDocsIndex(extractedSections: ExtractedSection[]): string {
  let content = '# Documentation\n\n';
  content += 'This directory contains detailed documentation extracted from the main README for better organization.\n\n';
  
  content += '## Available Documentation\n\n';
  extractedSections.forEach(section => {
    const filename = path.basename(section.suggestedLocation);
    content += `- [${section.title}](${filename}) - ${section.reason}\n`;
  });

  return content;
}

function generateOptimizationRecommendations(
  originalLength: number,
  optimizedLength: number,
  extractedSections: ExtractedSection[],
  strategy: string
): string[] {
  const recommendations: string[] = [];
  const reduction = originalLength - optimizedLength;

  if (reduction > 0) {
    recommendations.push(`✅ Reduced README length by ${reduction} lines (${Math.round((reduction/originalLength)*100)}%)`);
  }

  if (extractedSections.length > 0) {
    recommendations.push(`📁 Moved ${extractedSections.length} detailed sections to docs/ directory`);
  }

  if (strategy === 'community_focused') {
    recommendations.push('👥 Optimized for community contributors - prioritized quick start and contribution info');
  }

  recommendations.push('🔗 Added links to detailed documentation for users who need more information');
  recommendations.push('📊 Consider adding a table of contents for sections with 5+ headings');

  return recommendations;
}

function generateOptimizationNextSteps(
  optimization: OptimizationResult,
  input: OptimizeReadmeInput
): string[] {
  const steps: string[] = [];

  if (!input.output_path) {
    steps.push('💾 Review optimized content and save to README.md when ready');
  }

  if (optimization.extractedSections.length > 0) {
    steps.push('📝 Review extracted documentation files in docs/ directory');
    steps.push('🔗 Update any internal links that may have been affected');
  }

  if (optimization.reductionPercentage > 30) {
    steps.push('👀 Have team members review the condensed content for accuracy');
  }

  steps.push('📈 Run analyze_readme again to verify improvements');
  steps.push('🎯 Consider setting up automated README length monitoring');

  return steps;
}
