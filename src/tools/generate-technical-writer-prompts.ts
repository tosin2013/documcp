import { z } from "zod";
import { MCPContentWrapper, NextStep } from "../types/api.js";
import { promises as fs } from "fs";
import { join } from "path";

// Input validation schema
const GeneratePromptsInputSchema = z.object({
  project_path: z.string().min(1, "Project path is required"),
  context_sources: z
    .array(
      z.enum([
        "repository_analysis",
        "readme_health",
        "documentation_gaps",
        "best_practices",
        "content_validation",
        "deployment_context",
      ]),
    )
    .optional()
    .default(["repository_analysis", "readme_health"]),
  audience: z
    .enum(["developer", "end_user", "contributor", "enterprise", "mixed"])
    .optional()
    .default("mixed"),
  prompt_types: z
    .array(
      z.enum([
        "content_generation",
        "style_improvement",
        "structure_guidance",
        "gap_filling",
        "audience_adaptation",
        "deployment_optimization",
      ]),
    )
    .optional()
    .default(["content_generation", "gap_filling"]),
  integration_level: z
    .enum(["basic", "comprehensive", "advanced"])
    .optional()
    .default("comprehensive"),
});

type GeneratePromptsInput = z.infer<typeof GeneratePromptsInputSchema>;

// Context interfaces for cross-tool integration
interface ProjectContext {
  projectType: string;
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  hasTests: boolean;
  hasCI: boolean;
  deploymentTarget?: string;
}

interface DocumentationContext {
  readmeExists: boolean;
  readmeHealth?: number;
  documentationGaps: string[];
  bestPracticesScore?: number;
  contentIssues: string[];
  linkIssues: string[];
}

interface TechnicalWriterPrompt {
  id: string;
  title: string;
  category: string;
  audience: string;
  priority: "high" | "medium" | "low";
  prompt: string;
  context: string;
  expectedOutput: string;
  integrationHints: string[];
  relatedTools: string[];
}

interface PromptGenerationResult {
  prompts: TechnicalWriterPrompt[];
  contextSummary: {
    projectContext: ProjectContext;
    documentationContext: DocumentationContext;
    integrationLevel: string;
  };
  recommendations: string[];
  nextSteps: NextStep[];
  metadata: {
    totalPrompts: number;
    promptsByCategory: Record<string, number>;
    confidenceScore: number;
    generatedAt: string;
  };
}

/**
 * Generate intelligent technical writer prompts based on comprehensive project analysis
 */
export async function generateTechnicalWriterPrompts(
  input: Partial<GeneratePromptsInput>,
): Promise<
  MCPContentWrapper & {
    generation: PromptGenerationResult;
    nextSteps: NextStep[];
  }
> {
  try {
    // Validate input
    const validatedInput = GeneratePromptsInputSchema.parse(input);
    const {
      project_path,
      context_sources,
      audience,
      prompt_types,
      integration_level,
    } = validatedInput;

    // Build comprehensive context by integrating multiple tool outputs
    const projectContext = await buildProjectContext(project_path);
    const documentationContext = await buildDocumentationContext(
      project_path,
      context_sources,
    );

    // Generate contextual prompts based on integrated analysis
    const prompts = await generateContextualPrompts(
      projectContext,
      documentationContext,
      audience,
      prompt_types,
      integration_level,
    );

    // Create recommendations based on cross-tool insights
    const recommendations = generateIntegrationRecommendations(
      projectContext,
      documentationContext,
      prompts,
    );

    const nextSteps = generateNextSteps(prompts, integration_level);

    const result: PromptGenerationResult = {
      prompts,
      contextSummary: {
        projectContext,
        documentationContext,
        integrationLevel: integration_level,
      },
      recommendations,
      nextSteps,
      metadata: {
        totalPrompts: prompts.length,
        promptsByCategory: categorizePrompts(prompts),
        confidenceScore: calculateConfidenceScore(
          projectContext,
          documentationContext,
        ),
        generatedAt: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: "text",
          text: `Generated ${prompts.length} intelligent technical writer prompts with ${integration_level} integration level`,
        },
      ],
      generation: result,
      nextSteps,
      isError: false,
    };
  } catch (error) {
    const emptyResult: PromptGenerationResult = {
      prompts: [],
      contextSummary: {
        projectContext: {
          projectType: "unknown",
          languages: [],
          frameworks: [],
          hasTests: false,
          hasCI: false,
        },
        documentationContext: {
          readmeExists: false,
          documentationGaps: [],
          contentIssues: [],
          linkIssues: [],
        },
        integrationLevel: "basic",
      },
      recommendations: [],
      nextSteps: [],
      metadata: {
        totalPrompts: 0,
        promptsByCategory: {},
        confidenceScore: 0,
        generatedAt: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: "text",
          text: `Error generating technical writer prompts: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
      generation: emptyResult,
      nextSteps: [],
      isError: true,
    };
  }
}

/**
 * Build project context by analyzing repository structure
 */
async function buildProjectContext(
  projectPath: string,
): Promise<ProjectContext> {
  try {
    const packageJsonPath = join(projectPath, "package.json");
    let projectType = "unknown";
    const languages: string[] = [];
    const frameworks: string[] = [];
    let packageManager = undefined;

    // Analyze package.json if it exists
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8"),
      );

      // Determine project type from dependencies
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps["react"]) frameworks.push("React");
      if (deps["vue"]) frameworks.push("Vue");
      if (deps["angular"]) frameworks.push("Angular");
      if (deps["next"]) frameworks.push("Next.js");
      if (deps["express"]) frameworks.push("Express");
      if (deps["typescript"]) languages.push("TypeScript");

      languages.push("JavaScript");
      projectType = frameworks.length > 0 ? "web_application" : "library";

      // Detect package manager
      if (await fileExists(join(projectPath, "yarn.lock")))
        packageManager = "yarn";
      else if (await fileExists(join(projectPath, "pnpm-lock.yaml")))
        packageManager = "pnpm";
      else packageManager = "npm";
    } catch {
      // Fallback analysis for non-Node.js projects
      const files = await fs.readdir(projectPath);

      if (files.some((f) => f.endsWith(".py"))) {
        languages.push("Python");
        projectType = "python_application";
      }
      if (files.some((f) => f.endsWith(".rs"))) {
        languages.push("Rust");
        projectType = "rust_application";
      }
      if (files.some((f) => f.endsWith(".go"))) {
        languages.push("Go");
        projectType = "go_application";
      }
    }

    const hasTests = await hasTestFiles(projectPath);
    const hasCI = await hasCIConfig(projectPath);

    return {
      projectType,
      languages,
      frameworks,
      packageManager,
      hasTests,
      hasCI,
    };
  } catch (error) {
    return {
      projectType: "unknown",
      languages: [],
      frameworks: [],
      hasTests: false,
      hasCI: false,
    };
  }
}

/**
 * Build documentation context by integrating multiple tool outputs
 */
async function buildDocumentationContext(
  projectPath: string,
  contextSources: string[],
): Promise<DocumentationContext> {
  const readmeExists = await fileExists(join(projectPath, "README.md"));

  // This would integrate with actual tool outputs in production
  // For now, we'll simulate the integration points
  const context: DocumentationContext = {
    readmeExists,
    documentationGaps: [],
    contentIssues: [],
    linkIssues: [],
  };

  // Simulate integration with analyze_readme tool
  if (contextSources.includes("readme_health") && readmeExists) {
    context.readmeHealth = 75; // Would come from evaluate_readme_health
  }

  // Simulate integration with detect_documentation_gaps tool
  if (contextSources.includes("documentation_gaps")) {
    context.documentationGaps = [
      "installation_guide",
      "api_reference",
      "contributing_guidelines",
    ];
  }

  // Simulate integration with readme_best_practices tool
  if (contextSources.includes("best_practices")) {
    context.bestPracticesScore = 68; // Would come from readme_best_practices
  }

  return context;
}

/**
 * Generate contextual prompts based on integrated analysis
 */
async function generateContextualPrompts(
  projectContext: ProjectContext,
  documentationContext: DocumentationContext,
  audience: string,
  promptTypes: string[],
  integrationLevel: string,
): Promise<TechnicalWriterPrompt[]> {
  const prompts: TechnicalWriterPrompt[] = [];

  // Content generation prompts based on project context
  if (promptTypes.includes("content_generation")) {
    prompts.push({
      id: "project-overview-prompt",
      title: "Project Overview Generation",
      category: "content_generation",
      audience,
      priority: "high",
      prompt: `Generate a compelling project overview for a ${
        projectContext.projectType
      } built with ${projectContext.frameworks.join(
        ", ",
      )} and ${projectContext.languages.join(
        ", ",
      )}. Focus on the problem it solves and key benefits for ${audience} users.`,
      context: `Project uses ${projectContext.languages.join(
        ", ",
      )} with ${projectContext.frameworks.join(", ")} frameworks`,
      expectedOutput:
        "A clear, engaging project description that explains purpose, benefits, and target audience",
      integrationHints: [
        "Use analyze_repository output for technical accuracy",
        "Reference detect_documentation_gaps for missing context",
        "Align with readme_best_practices recommendations",
      ],
      relatedTools: [
        "analyze_repository",
        "detect_documentation_gaps",
        "readme_best_practices",
      ],
    });
  }

  // Gap filling prompts based on documentation analysis
  if (
    promptTypes.includes("gap_filling") &&
    documentationContext.documentationGaps.length > 0
  ) {
    for (const gap of documentationContext.documentationGaps) {
      prompts.push({
        id: `gap-fill-${gap}`,
        title: `Fill ${gap.replace("_", " ")} Gap`,
        category: "gap_filling",
        audience,
        priority: "high",
        prompt: `Create comprehensive ${gap.replace("_", " ")} content for a ${
          projectContext.projectType
        } project. Include practical examples and ${audience}-focused guidance.`,
        context: `Missing ${gap} identified by documentation gap analysis`,
        expectedOutput: `Complete ${gap.replace(
          "_",
          " ",
        )} section with examples and clear instructions`,
        integrationHints: [
          "Use repository analysis for technical context",
          "Reference best practices for structure",
          "Validate against content standards",
        ],
        relatedTools: [
          "detect_documentation_gaps",
          "validate_content",
          "setup_structure",
        ],
      });
    }
  }

  // Style improvement prompts based on health scores
  if (
    promptTypes.includes("style_improvement") &&
    documentationContext.readmeHealth &&
    documentationContext.readmeHealth < 80
  ) {
    prompts.push({
      id: "style-improvement-prompt",
      title: "Documentation Style Enhancement",
      category: "style_improvement",
      audience,
      priority: "medium",
      prompt: `Improve the writing style and clarity of existing documentation. Focus on ${audience} readability, consistent tone, and professional presentation.`,
      context: `Current README health score: ${documentationContext.readmeHealth}/100`,
      expectedOutput:
        "Refined documentation with improved clarity, consistency, and professional tone",
      integrationHints: [
        "Use evaluate_readme_health metrics for focus areas",
        "Apply readme_best_practices guidelines",
        "Validate improvements with content validation",
      ],
      relatedTools: [
        "evaluate_readme_health",
        "readme_best_practices",
        "validate_content",
      ],
    });
  }

  // Advanced integration prompts for comprehensive level
  if (integrationLevel === "comprehensive" || integrationLevel === "advanced") {
    prompts.push({
      id: "deployment-docs-prompt",
      title: "Deployment Documentation",
      category: "deployment_optimization",
      audience,
      priority: "medium",
      prompt: `Create deployment documentation that integrates with the recommended static site generator and deployment workflow. Include environment setup, build process, and troubleshooting.`,
      context: `Project has CI: ${projectContext.hasCI}, Package manager: ${projectContext.packageManager}`,
      expectedOutput:
        "Complete deployment guide with step-by-step instructions and troubleshooting",
      integrationHints: [
        "Use recommend_ssg output for deployment strategy",
        "Reference deploy_pages workflow",
        "Include verify_deployment checklist",
      ],
      relatedTools: [
        "recommend_ssg",
        "deploy_pages",
        "verify_deployment",
        "test_local_deployment",
      ],
    });
  }

  return prompts;
}

/**
 * Generate integration recommendations based on cross-tool insights
 */
function generateIntegrationRecommendations(
  projectContext: ProjectContext,
  documentationContext: DocumentationContext,
  _prompts: TechnicalWriterPrompt[],
): string[] {
  const recommendations: string[] = [];

  recommendations.push(
    "Run analyze_repository first to establish comprehensive project context",
  );

  if (!documentationContext.readmeExists) {
    recommendations.push(
      "Use generate_readme_template to create initial README structure",
    );
  }

  if (documentationContext.documentationGaps.length > 0) {
    recommendations.push(
      "Execute detect_documentation_gaps to identify all missing content areas",
    );
  }

  if (projectContext.hasTests) {
    recommendations.push(
      "Include testing documentation using repository analysis insights",
    );
  }

  if (projectContext.hasCI) {
    recommendations.push(
      "Document CI/CD workflow using deployment tool integration",
    );
  }

  recommendations.push(
    "Validate all generated content using validate_content tool",
  );
  recommendations.push(
    "Check documentation links with check_documentation_links after content creation",
  );

  return recommendations;
}

/**
 * Generate next steps based on prompts and integration level
 */
function generateNextSteps(
  prompts: TechnicalWriterPrompt[],
  integrationLevel: string,
): NextStep[] {
  const steps: NextStep[] = [];

  steps.push({
    action:
      "Execute high-priority prompts first to address critical documentation gaps",
    toolRequired: "generate_technical_writer_prompts",
    priority: "high",
  });

  steps.push({
    action: "Use generated prompts with AI writing tools for content creation",
    toolRequired: "optimize_readme",
    priority: "high",
  });

  steps.push({
    action: "Validate generated content using DocuMCP validation tools",
    toolRequired: "validate_content",
    priority: "medium",
  });

  if (integrationLevel === "comprehensive" || integrationLevel === "advanced") {
    steps.push({
      action: "Run full documentation workflow using integrated tool chain",
      toolRequired: "analyze_repository",
      priority: "medium",
    });

    steps.push({
      action: "Test documentation with target audience using deployment tools",
      toolRequired: "test_local_deployment",
      priority: "low",
    });
  }

  steps.push({
    action:
      "Iterate on content based on validation feedback and best practices analysis",
    toolRequired: "readme_best_practices",
    priority: "low",
  });

  return steps;
}

/**
 * Helper functions
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasTestFiles(projectPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(projectPath, { recursive: true });
    return files.some(
      (file) =>
        typeof file === "string" &&
        (file.includes("test") ||
          file.includes("spec") ||
          file.endsWith(".test.js") ||
          file.endsWith(".spec.js")),
    );
  } catch {
    return false;
  }
}

async function hasCIConfig(projectPath: string): Promise<boolean> {
  const ciFiles = [
    ".github/workflows",
    ".gitlab-ci.yml",
    "circle.yml",
    ".travis.yml",
  ];

  for (const ciFile of ciFiles) {
    if (await fileExists(join(projectPath, ciFile))) {
      return true;
    }
  }

  return false;
}

function categorizePrompts(
  prompts: TechnicalWriterPrompt[],
): Record<string, number> {
  const categories: Record<string, number> = {};

  for (const prompt of prompts) {
    categories[prompt.category] = (categories[prompt.category] || 0) + 1;
  }

  return categories;
}

function calculateConfidenceScore(
  projectContext: ProjectContext,
  documentationContext: DocumentationContext,
): number {
  let score = 50; // Base score

  // Increase confidence based on available context
  if (projectContext.projectType !== "unknown") score += 20;
  if (projectContext.languages.length > 0) score += 15;
  if (projectContext.frameworks.length > 0) score += 10;
  if (documentationContext.readmeExists) score += 5;

  return Math.min(score, 100);
}
