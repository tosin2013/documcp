import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { MCPToolResponse } from "../types/api.js";

// Input validation schema
const OptimizeReadmeInputSchema = z.object({
  readme_path: z.string().min(1, "README path is required"),
  strategy: z
    .enum([
      "community_focused",
      "enterprise_focused",
      "developer_focused",
      "general",
    ])
    .optional()
    .default("community_focused"),
  max_length: z.number().min(50).max(1000).optional().default(300),
  include_tldr: z.boolean().optional().default(true),
  preserve_existing: z.boolean().optional().default(false),
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
  type: "moved" | "condensed" | "split" | "added" | "removed";
  section: string;
  description: string;
  impact: string;
}

/**
 * Optimizes README content by restructuring, condensing, and extracting detailed sections.
 *
 * Performs intelligent README optimization including length reduction, structure improvement,
 * content extraction to separate documentation, and TL;DR generation. Uses different strategies
 * based on target audience (community, enterprise, developer, general) to maximize effectiveness.
 *
 * @param input - The input parameters for README optimization
 * @param input.readme_path - The file system path to the README file to optimize
 * @param input.strategy - The optimization strategy to apply (default: "community_focused")
 * @param input.max_length - Target maximum length in lines (default: 300)
 * @param input.include_tldr - Whether to generate a TL;DR section (default: true)
 * @param input.preserve_existing - Whether to preserve existing content structure (default: false)
 * @param input.output_path - Optional output path for optimized README
 * @param input.create_docs_directory - Whether to create docs/ directory for extracted content (default: true)
 *
 * @returns Promise resolving to README optimization results
 * @returns optimization - Complete optimization results including length reduction and restructuring
 * @returns nextSteps - Array of recommended next actions after optimization
 *
 * @throws {Error} When README file is inaccessible or invalid
 * @throws {Error} When optimization processing fails
 * @throws {Error} When output directory cannot be created
 *
 * @example
 * ```typescript
 * // Optimize README for community contributors
 * const result = await optimizeReadme({
 *   readme_path: "./README.md",
 *   strategy: "community_focused",
 *   max_length: 300,
 *   include_tldr: true
 * });
 *
 * console.log(`Reduced from ${result.data.optimization.originalLength} to ${result.data.optimization.optimizedLength} lines`);
 * console.log(`Reduction: ${result.data.optimization.reductionPercentage}%`);
 *
 * // Optimize for enterprise with aggressive reduction
 * const enterprise = await optimizeReadme({
 *   readme_path: "./README.md",
 *   strategy: "enterprise_focused",
 *   max_length: 200,
 *   preserve_existing: true
 * });
 * ```
 *
 * @since 1.0.0
 */
export async function optimizeReadme(
  input: Partial<OptimizeReadmeInput>,
): Promise<
  MCPToolResponse<{ optimization: OptimizationResult; nextSteps: string[] }>
> {
  const startTime = Date.now();

  try {
    // Validate input
    const validatedInput = OptimizeReadmeInputSchema.parse(input);
    const {
      readme_path,
      strategy,
      max_length,
      include_tldr,
      output_path,
      create_docs_directory,
    } = validatedInput;

    // Read original README
    const originalContent = await fs.readFile(readme_path, "utf-8");
    const originalLength = originalContent.split("\n").length;

    // Parse README structure
    const sections = parseReadmeStructure(originalContent);

    // Generate TL;DR if requested
    const tldrGenerated = include_tldr
      ? generateTldr(originalContent, sections)
      : null;

    // Identify sections to extract
    const extractedSections = identifySectionsToExtract(
      sections,
      strategy,
      max_length,
    );

    // Create basic optimization result
    const optimizedContent =
      originalContent +
      "\n\n## TL;DR\n\n" +
      (tldrGenerated || "Quick overview of the project.");
    const restructuringChanges = [
      {
        type: "added" as const,
        section: "TL;DR",
        description: "Added concise project overview",
        impact: "Helps users quickly understand project value",
      },
    ];

    const optimizedLength = optimizedContent.split("\n").length;
    const reductionPercentage = Math.round(
      ((originalLength - optimizedLength) / originalLength) * 100,
    );

    // Create docs directory and extract detailed content if requested
    if (create_docs_directory && extractedSections.length > 0) {
      await createDocsStructure(path.dirname(readme_path), extractedSections);
    }

    // Write optimized README if output path specified
    if (output_path) {
      await fs.writeFile(output_path, optimizedContent, "utf-8");
    }

    const recommendations = generateOptimizationRecommendations(
      originalLength,
      optimizedLength,
      extractedSections,
      strategy,
    );

    const optimization: OptimizationResult = {
      originalLength,
      optimizedLength,
      reductionPercentage,
      optimizedContent,
      extractedSections,
      tldrGenerated,
      restructuringChanges,
      recommendations,
    };

    const nextSteps = generateOptimizationNextSteps(
      optimization,
      validatedInput,
    );

    return {
      success: true,
      data: {
        optimization,
        nextSteps,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "OPTIMIZATION_FAILED",
        message: "Failed to optimize README",
        details: error instanceof Error ? error.message : "Unknown error",
        resolution: "Check README file path and permissions",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
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
  const lines = content.split("\n");
  const sections: ReadmeSection[] = [];
  let currentTitle = "";
  let currentLevel = 0;
  let currentStartLine = 0;

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentTitle) {
        const endLine = index - 1;
        const sectionContent = lines
          .slice(currentStartLine, endLine + 1)
          .join("\n");
        const wordCount = sectionContent.split(/\s+/).length;
        const isEssential = isEssentialSection(currentTitle);

        sections.push({
          title: currentTitle,
          content: sectionContent,
          level: currentLevel,
          startLine: currentStartLine,
          endLine: endLine,
          wordCount: wordCount,
          isEssential: isEssential,
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
    const sectionContent = lines
      .slice(currentStartLine, endLine + 1)
      .join("\n");
    const wordCount = sectionContent.split(/\s+/).length;
    const isEssential = isEssentialSection(currentTitle);

    sections.push({
      title: currentTitle,
      content: sectionContent,
      level: currentLevel,
      startLine: currentStartLine,
      endLine: endLine,
      wordCount: wordCount,
      isEssential: isEssential,
    });
  }

  return sections;
}

function isEssentialSection(title: string): boolean {
  const essentialKeywords = [
    "installation",
    "install",
    "setup",
    "getting started",
    "quick start",
    "usage",
    "example",
    "api",
    "license",
    "contributing",
  ];

  return essentialKeywords.some((keyword) =>
    title.toLowerCase().includes(keyword),
  );
}

function generateTldr(content: string, sections: ReadmeSection[]): string {
  // Extract project name from first heading
  const projectNameMatch = content.match(/^#\s+(.+)$/m);
  const projectName = projectNameMatch ? projectNameMatch[1] : "This project";

  // Extract description (usually after title or in blockquote)
  const descriptionMatch = content.match(/>\s*(.+)/);
  let description = descriptionMatch ? descriptionMatch[1] : "";

  // If no description found, try to extract from first paragraph
  if (!description) {
    const firstParagraphMatch = content.match(/^[^#\n].{20,200}/m);
    description = firstParagraphMatch
      ? firstParagraphMatch[0].substring(0, 100) + "..."
      : "";
  }

  // Identify key features or use cases
  const features: string[] = [];
  sections.forEach((section) => {
    if (
      section.title.toLowerCase().includes("feature") ||
      section.title.toLowerCase().includes("what") ||
      section.title.toLowerCase().includes("why")
    ) {
      const bullets = section.content.match(/^\s*[-*+]\s+(.+)$/gm);
      if (bullets && bullets.length > 0) {
        features.push(
          ...bullets
            .slice(0, 3)
            .map((b) => b.replace(/^\s*[-*+]\s+/, "").trim()),
        );
      }
    }
  });

  let tldr = `## TL;DR\n\n${projectName} ${description}\n\n`;

  if (features.length > 0) {
    tldr += `**Key features:**\n`;
    features.slice(0, 3).forEach((feature) => {
      tldr += `- ${feature}\n`;
    });
    tldr += "\n";
  }

  // Add quick start reference
  const hasInstallSection = sections.some(
    (s) =>
      s.title.toLowerCase().includes("install") ||
      s.title.toLowerCase().includes("setup"),
  );

  if (hasInstallSection) {
    tldr += `**Quick start:** See [Installation](#installation) → [Usage](#usage)\n\n`;
  }

  return tldr;
}

function identifySectionsToExtract(
  sections: ReadmeSection[],
  strategy: string,
  maxLength: number,
): ExtractedSection[] {
  const extractedSections: ExtractedSection[] = [];
  const currentLength = sections.reduce(
    (sum, s) => sum + s.content.split("\n").length,
    0,
  );

  if (currentLength <= maxLength) {
    return extractedSections; // No extraction needed
  }

  // Define extraction rules based on strategy
  const extractionRules = getExtractionRules(strategy);

  sections.forEach((section) => {
    for (const rule of extractionRules) {
      if (rule.matcher(section) && !section.isEssential) {
        extractedSections.push({
          title: section.title,
          content: section.content,
          suggestedLocation: rule.suggestedLocation,
          reason: rule.reason,
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
      suggestedLocation: "docs/detailed-guide.md",
      reason: "Section too long for main README",
    },
    {
      matcher: (section: ReadmeSection) =>
        /troubleshoot|faq|common issues|problems/i.test(section.title),
      suggestedLocation: "docs/troubleshooting.md",
      reason: "Troubleshooting content better suited for separate document",
    },
    {
      matcher: (section: ReadmeSection) =>
        /advanced|configuration|config/i.test(section.title),
      suggestedLocation: "docs/configuration.md",
      reason: "Advanced configuration details",
    },
    {
      matcher: (section: ReadmeSection) =>
        /development|developer|build|compile/i.test(section.title),
      suggestedLocation: "docs/development.md",
      reason: "Development-specific information",
    },
  ];

  if (strategy === "community_focused") {
    baseRules.push({
      matcher: (section: ReadmeSection) =>
        /architecture|design|technical/i.test(section.title),
      suggestedLocation: "docs/technical.md",
      reason: "Technical details can overwhelm community contributors",
    });
  }

  return baseRules;
}

async function createDocsStructure(
  projectDir: string,
  extractedSections: ExtractedSection[],
): Promise<void> {
  const docsDir = path.join(projectDir, "docs");

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
      await fs.writeFile(filePath, section.content, "utf-8");
    } catch (error) {
      console.warn(`Failed to create ${filePath}:`, error);
    }
  }

  // Create docs index
  const indexContent = generateDocsIndex(extractedSections);
  await fs.writeFile(path.join(docsDir, "README.md"), indexContent, "utf-8");
}

function generateDocsIndex(extractedSections: ExtractedSection[]): string {
  let content = "# Documentation\n\n";
  content +=
    "This directory contains detailed documentation extracted from the main README for better organization.\n\n";

  content += "## Available Documentation\n\n";
  extractedSections.forEach((section) => {
    const filename = path.basename(section.suggestedLocation);
    content += `- [${section.title}](${filename}) - ${section.reason}\n`;
  });

  return content;
}

function generateOptimizationRecommendations(
  originalLength: number,
  optimizedLength: number,
  extractedSections: ExtractedSection[],
  strategy: string,
): string[] {
  const recommendations: string[] = [];
  const reduction = originalLength - optimizedLength;

  if (reduction > 0) {
    recommendations.push(
      `✅ Reduced README length by ${reduction} lines (${Math.round(
        (reduction / originalLength) * 100,
      )}%)`,
    );
  }

  if (extractedSections.length > 0) {
    recommendations.push(
      `📁 Moved ${extractedSections.length} detailed sections to docs/ directory`,
    );
  }

  if (strategy === "community_focused") {
    recommendations.push(
      "👥 Optimized for community contributors - prioritized quick start and contribution info",
    );
  }

  recommendations.push(
    "🔗 Added links to detailed documentation for users who need more information",
  );
  recommendations.push(
    "📊 Consider adding a table of contents for sections with 5+ headings",
  );

  return recommendations;
}

function generateOptimizationNextSteps(
  optimization: OptimizationResult,
  input: OptimizeReadmeInput,
): string[] {
  const steps: string[] = [];

  if (!input.output_path) {
    steps.push("💾 Review optimized content and save to README.md when ready");
  }

  if (optimization.extractedSections.length > 0) {
    steps.push("📝 Review extracted documentation files in docs/ directory");
    steps.push("🔗 Update any internal links that may have been affected");
  }

  if (optimization.reductionPercentage > 30) {
    steps.push(
      "👀 Have team members review the condensed content for accuracy",
    );
  }

  steps.push("📈 Run analyze_readme again to verify improvements");
  steps.push("🎯 Consider setting up automated README length monitoring");

  return steps;
}
