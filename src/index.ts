#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListRootsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path, { dirname, join } from "path";

import { analyzeRepository } from "./tools/analyze-repository.js";
import { recommendSSG } from "./tools/recommend-ssg.js";
import { generateConfig } from "./tools/generate-config.js";
import { setupStructure } from "./tools/setup-structure.js";
import { deployPages } from "./tools/deploy-pages.js";
import { verifyDeployment } from "./tools/verify-deployment.js";
import { setupPlaywrightTests } from "./tools/setup-playwright-tests.js";
import { handlePopulateDiataxisContent } from "./tools/populate-content.js";
import {
  handleValidateDiataxisContent,
  validateGeneralContent,
} from "./tools/validate-content.js";
import { handleUpdateExistingDocumentation } from "./tools/update-existing-documentation.js";
import { detectDocumentationGaps } from "./tools/detect-gaps.js";
import { testLocalDeployment } from "./tools/test-local-deployment.js";
import { evaluateReadmeHealth } from "./tools/evaluate-readme-health.js";
import { readmeBestPractices } from "./tools/readme-best-practices.js";
import { checkDocumentationLinks } from "./tools/check-documentation-links.js";
import { generateReadmeTemplate } from "./tools/generate-readme-template.js";
import { validateReadmeChecklist } from "./tools/validate-readme-checklist.js";
import { analyzeReadme } from "./tools/analyze-readme.js";
import { optimizeReadme } from "./tools/optimize-readme.js";
import { managePreferences } from "./tools/manage-preferences.js";
import { analyzeDeployments } from "./tools/analyze-deployments.js";
import { handleSyncCodeToDocs } from "./tools/sync-code-to-docs.js";
import { handleGenerateContextualContent } from "./tools/generate-contextual-content.js";
import { trackDocumentationFreshness } from "./tools/track-documentation-freshness.js";
import { validateDocumentationFreshness } from "./tools/validate-documentation-freshness.js";
import {
  changeWatcherTool,
  changeWatcherSchema,
  handleChangeWatcher,
} from "./tools/change-watcher.js";
import {
  manageSitemap,
  ManageSitemapInputSchema,
} from "./tools/manage-sitemap.js";
import {
  generateLLMContext,
  GenerateLLMContextInputSchema,
  setToolDefinitions,
} from "./tools/generate-llm-context.js";
import { cleanupAgentArtifacts } from "./tools/cleanup-agent-artifacts.js";
import { formatMCPResponse } from "./types/api.js";
import {
  isPathAllowed,
  getPermissionDeniedMessage,
} from "./utils/permission-checker.js";
import { promises as fs } from "fs";
import { generateTechnicalWriterPrompts } from "./prompts/technical-writer-prompts.js";
import {
  DOCUMENTATION_WORKFLOWS,
  WORKFLOW_EXECUTION_GUIDANCE,
  WORKFLOW_METADATA,
} from "./workflows/documentation-workflow.js";
import {
  initializeMemory,
  rememberAnalysis,
  rememberRecommendation,
  getProjectInsights,
  getSimilarProjects,
  getMemoryStatistics,
  exportMemories,
  cleanupOldMemories,
  memoryTools,
} from "./memory/index.js";

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

// Parse allowed roots from command line arguments
const allowedRoots: string[] = [];
process.argv.forEach((arg, index) => {
  if (arg === "--root" && process.argv[index + 1]) {
    const rootPath = process.argv[index + 1];
    // Resolve to absolute path and expand ~ for home directory
    const expandedPath = rootPath.startsWith("~")
      ? join(
          process.env.HOME || process.env.USERPROFILE || "",
          rootPath.slice(1),
        )
      : rootPath;
    allowedRoots.push(path.resolve(expandedPath));
  }
});

// If no roots specified, allow current working directory by default
if (allowedRoots.length === 0) {
  allowedRoots.push(process.cwd());
}

// Server initialization with Code Mode optimization (ADR-011)
// Optimized for Code Mode workflows with 25+ composable tools,
// MCP Resources for efficient context management, and Diataxis framework support.
// Achieves 98% token reduction through resource-based result filtering.
const server = new Server(
  {
    name: "documcp",
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
      prompts: {
        listChanged: true,
      },
      resources: {
        subscribe: true,
        listChanged: true,
      },
      roots: {
        listChanged: true,
      },
    },
  },
);

// Code Mode prompt generator for orchestration workflows (ADR-011)
function generateCodeModePrompt(
  name: string,
  projectPath: string,
  args: Record<string, any>,
) {
  const baseContext = `Project path: ${projectPath}`;

  switch (name) {
    case "code-mode-documentation-setup":
      return {
        description:
          "Complete documentation setup using efficient code-based orchestration",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${baseContext}

You are a documentation automation expert using the documcp MCP server in Code Mode. Write TypeScript code to orchestrate a complete documentation setup workflow.

**Requirements:**
- Use documcp tools via the MCP client API
- Leverage parallel execution where possible (e.g., Promise.all for independent operations)
- Store intermediate results as MCP resources (not in LLM context)
- Return only summary data, not full analysis results
- Handle errors gracefully with try-catch blocks

**Workflow Steps:**
1. Analyze repository using analyze_repository tool
2. Get SSG recommendation using recommend_ssg tool (with analysis results)
3. Generate configuration files using generate_config tool
4. Create Diataxis structure using setup_structure tool
5. ${
                args.include_deployment !== "false"
                  ? "Set up GitHub Pages deployment using deploy_pages tool"
                  : "Skip deployment setup"
              }
6. Return concise summary of completed setup

**Example Pattern:**
\`\`\`typescript
// Step 1: Analysis (returns resource URI, not full data)
const analysisResult = await callTool('analyze_repository', { path: '${projectPath}', depth: 'standard' });
const analysisUri = analysisResult.resourceUri; // Store reference, not full data

// Step 2: Recommendation (uses cached analysis)
const recommendation = await callTool('recommend_ssg', { analysisId: analysisResult.analysisId });
const selectedSSG = ${
                args.ssg_preference && args.ssg_preference !== "auto-detect"
                  ? `'${args.ssg_preference}'`
                  : "recommendation.primary"
              };

// Step 3-4: Parallel execution for speed
const [config, structure] = await Promise.all([
  callTool('generate_config', { ssg: selectedSSG, projectName: '${projectPath
    .split("/")
    .pop()}', outputPath: '${projectPath}' }),
  callTool('setup_structure', { path: '${projectPath}', ssg: selectedSSG })
]);

// Return summary only (not gigabytes of data!)
return { success: true, ssg: selectedSSG, configFiles: config.files.length, docsCreated: structure.filesCreated };
\`\`\`

Write the complete orchestration code now.`,
            },
          },
        ],
      };

    case "code-mode-parallel-workflow": {
      const operations = args.operations || "analysis,validation,freshness";
      return {
        description:
          "Execute multiple documcp operations in parallel for maximum efficiency",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${baseContext}

You are a documentation automation expert using the documcp MCP server in Code Mode. Write TypeScript code to execute multiple operations in parallel for maximum efficiency.

**Operations to run:** ${operations}

**Code Mode Best Practices:**
- Use Promise.all() for parallel execution of independent operations
- Store large results as MCP resources (resource URIs only in context)
- Return concise summaries, not full data
- Handle partial failures gracefully (Promise.allSettled)

**Example Pattern:**
\`\`\`typescript
const operations = await Promise.allSettled([
  ${
    operations.includes("analysis")
      ? "callTool('analyze_repository', { path: '" +
        projectPath +
        "', depth: 'quick' }),"
      : ""
  }
  ${
    operations.includes("validation")
      ? "callTool('validate_diataxis_content', { contentPath: '" +
        projectPath +
        "/docs' }),"
      : ""
  }
  ${
    operations.includes("freshness")
      ? "callTool('track_documentation_freshness', { docsPath: '" +
        projectPath +
        "/docs', preset: 'monthly' }),"
      : ""
  }
  ${
    operations.includes("gap-detection")
      ? "callTool('detect_documentation_gaps', { repositoryPath: '" +
        projectPath +
        "' }),"
      : ""
  }
  ${
    operations.includes("link-checking")
      ? "callTool('check_documentation_links', { documentation_path: '" +
        projectPath +
        "/docs' }),"
      : ""
  }
]);

// Extract summaries (not full data!)
const results = operations.map((op, i) => ({
  operation: ['${operations.replace(/,/g, "', '")}'][i],
  status: op.status,
  summary: op.status === 'fulfilled' ? extractSummary(op.value) : op.reason.message
}));

return { parallelOperations: ${
                operations.split(",").length
              }, completed: results.filter(r => r.status === 'fulfilled').length, results };
\`\`\`

Write the complete parallel orchestration code now.`,
            },
          },
        ],
      };
    }

    case "code-mode-efficient-analysis":
      return {
        description:
          "Comprehensive project analysis with resource-based result filtering",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${baseContext}

You are a documentation automation expert using the documcp MCP server in Code Mode. Write TypeScript code for efficient project analysis using resource-based result filtering.

**Goal:** Analyze project comprehensively but keep LLM context minimal (use resources for large data).

**Code Mode Efficiency Pattern:**
\`\`\`typescript
// Step 1: Deep analysis (returns resource URI for full data)
const analysis = await callTool('analyze_repository', {
  path: '${projectPath}',
  depth: 'deep' // Full analysis, but results stored as resource
});

// Access only summary in context (not 50,000 tokens of data!)
const summary = {
  fileCount: analysis.fileCount,
  primaryLanguage: analysis.primaryLanguage,
  complexity: analysis.complexityScore,
  resourceUri: analysis.resourceUri // Full data available via resource
};

${
  args.include_recommendations !== "false"
    ? `
// Step 2: Get recommendations (optional)
const recommendation = await callTool('recommend_ssg', {
  analysisId: analysis.analysisId,
  userId: 'default'
});

return { analysis: summary, recommendation: recommendation.primary, confidence: recommendation.confidence };
`
    : `
return { analysis: summary, message: 'Full analysis available via resource URI' };
`
}
\`\`\`

**Key Benefits:**
- Full analysis performed, but only summary in LLM context
- 98% token reduction (50,000 tokens → 500 tokens)
- 75x cost reduction for complex workflows
- Full data still accessible via resource URI when needed

Write the complete efficient analysis code now.`,
            },
          },
        ],
      };

    default:
      return {
        description: "Code Mode orchestration prompt",
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Unsupported Code Mode prompt: ${name}`,
            },
          },
        ],
      };
  }
}

// Tool definitions following ADR-006
const TOOLS = [
  {
    name: "analyze_repository",
    description:
      "Analyze repository structure, dependencies, and documentation needs",
    inputSchema: z.object({
      path: z.string().describe("Path to the repository to analyze"),
      depth: z
        .enum(["quick", "standard", "deep"])
        .optional()
        .default("standard"),
    }),
  },
  {
    name: "recommend_ssg",
    description:
      "Recommend the best static site generator based on project analysis and user preferences",
    inputSchema: z.object({
      analysisId: z.string().describe("ID from previous repository analysis"),
      userId: z
        .string()
        .optional()
        .default("default")
        .describe(
          "User ID for personalized recommendations based on usage history",
        ),
      preferences: z
        .object({
          priority: z
            .enum(["simplicity", "features", "performance"])
            .optional(),
          ecosystem: z
            .enum(["javascript", "python", "ruby", "go", "any"])
            .optional(),
        })
        .optional(),
    }),
  },
  {
    name: "generate_config",
    description:
      "Generate configuration files for the selected static site generator",
    inputSchema: z.object({
      ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
      projectName: z.string(),
      projectDescription: z.string().optional(),
      outputPath: z.string().describe("Where to generate config files"),
    }),
  },
  {
    name: "setup_structure",
    description: "Create Diataxis-compliant documentation structure",
    inputSchema: z.object({
      path: z.string().describe("Root path for documentation"),
      ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
      includeExamples: z.boolean().optional().default(true),
    }),
  },
  {
    name: "setup_playwright_tests",
    description:
      "Generate Playwright E2E test setup for documentation site (containers + CI/CD)",
    inputSchema: z.object({
      repositoryPath: z.string().describe("Path to documentation repository"),
      ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
      projectName: z.string().describe("Project name for tests"),
      mainBranch: z.string().optional().default("main"),
      includeAccessibilityTests: z.boolean().optional().default(true),
      includeDockerfile: z.boolean().optional().default(true),
      includeGitHubActions: z.boolean().optional().default(true),
    }),
  },
  {
    name: "deploy_pages",
    description:
      "Set up GitHub Pages deployment workflow with deployment tracking and preference learning",
    inputSchema: z.object({
      repository: z.string().describe("Repository path or URL"),
      ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
      branch: z.string().optional().default("gh-pages"),
      customDomain: z.string().optional(),
      projectPath: z
        .string()
        .optional()
        .describe("Local path to the project for tracking"),
      projectName: z.string().optional().describe("Project name for tracking"),
      analysisId: z
        .string()
        .optional()
        .describe("ID from repository analysis for linking"),
      userId: z
        .string()
        .optional()
        .default("default")
        .describe("User ID for preference tracking"),
    }),
  },
  {
    name: "verify_deployment",
    description: "Verify and troubleshoot GitHub Pages deployment",
    inputSchema: z.object({
      repository: z.string().describe("Repository path or URL"),
      url: z.string().optional().describe("Expected deployment URL"),
    }),
  },
  {
    name: "populate_diataxis_content",
    description:
      "Intelligently populate Diataxis documentation with project-specific content",
    inputSchema: z.object({
      analysisId: z
        .string()
        .describe("Repository analysis ID from analyze_repository tool"),
      docsPath: z.string().describe("Path to documentation directory"),
      populationLevel: z
        .enum(["basic", "comprehensive", "intelligent"])
        .optional()
        .default("comprehensive"),
      includeProjectSpecific: z.boolean().optional().default(true),
      preserveExisting: z.boolean().optional().default(true),
      technologyFocus: z
        .array(z.string())
        .optional()
        .describe("Specific technologies to emphasize"),
    }),
  },
  {
    name: "update_existing_documentation",
    description:
      "Intelligently analyze and update existing documentation using memory insights and code comparison",
    inputSchema: z.object({
      analysisId: z
        .string()
        .describe("Repository analysis ID from analyze_repository tool"),
      docsPath: z.string().describe("Path to existing documentation directory"),
      compareMode: z
        .enum(["comprehensive", "gap-detection", "accuracy-check"])
        .optional()
        .default("comprehensive")
        .describe("Mode of comparison between code and documentation"),
      updateStrategy: z
        .enum(["conservative", "moderate", "aggressive"])
        .optional()
        .default("moderate")
        .describe("How aggressively to suggest updates"),
      preserveStyle: z
        .boolean()
        .optional()
        .default(true)
        .describe("Preserve existing documentation style and formatting"),
      focusAreas: z
        .array(z.string())
        .optional()
        .describe(
          'Specific areas to focus updates on (e.g., "dependencies", "scripts", "api")',
        ),
    }),
  },
  {
    name: "validate_diataxis_content",
    description:
      "Validate the accuracy, completeness, and compliance of generated Diataxis documentation",
    inputSchema: z.object({
      contentPath: z
        .string()
        .describe("Path to the documentation directory to validate"),
      analysisId: z
        .string()
        .optional()
        .describe(
          "Optional repository analysis ID for context-aware validation",
        ),
      validationType: z
        .enum(["accuracy", "completeness", "compliance", "all"])
        .optional()
        .default("all")
        .describe(
          "Type of validation: accuracy, completeness, compliance, or all",
        ),
      includeCodeValidation: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to validate code examples"),
      confidence: z
        .enum(["strict", "moderate", "permissive"])
        .optional()
        .default("moderate")
        .describe(
          "Validation confidence level: strict, moderate, or permissive",
        ),
    }),
  },
  {
    name: "validate_content",
    description:
      "Validate general content quality: broken links, code syntax, references, and basic accuracy",
    inputSchema: z.object({
      contentPath: z
        .string()
        .describe("Path to the content directory to validate"),
      validationType: z
        .string()
        .optional()
        .default("all")
        .describe("Type of validation: links, code, references, or all"),
      includeCodeValidation: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to validate code blocks"),
      followExternalLinks: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to validate external URLs (slower)"),
    }),
  },
  {
    name: "detect_documentation_gaps",
    description:
      "Analyze repository and existing documentation to identify missing content and gaps",
    inputSchema: z.object({
      repositoryPath: z.string().describe("Path to the repository to analyze"),
      documentationPath: z
        .string()
        .optional()
        .describe("Path to existing documentation (if any)"),
      analysisId: z
        .string()
        .optional()
        .describe("Optional existing analysis ID to reuse"),
      depth: z
        .enum(["quick", "standard", "comprehensive"])
        .optional()
        .default("standard"),
    }),
  },
  {
    name: "test_local_deployment",
    description:
      "Test documentation build and local server before deploying to GitHub Pages",
    inputSchema: z.object({
      repositoryPath: z.string().describe("Path to the repository"),
      ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
      port: z
        .number()
        .optional()
        .default(3000)
        .describe("Port for local server"),
      timeout: z
        .number()
        .optional()
        .default(60)
        .describe("Timeout in seconds for build process"),
      skipBuild: z
        .boolean()
        .optional()
        .default(false)
        .describe("Skip build step and only start server"),
    }),
  },
  {
    name: "evaluate_readme_health",
    description:
      "Evaluate README files for community health, accessibility, and onboarding effectiveness",
    inputSchema: z.object({
      readme_path: z.string().describe("Path to the README file to evaluate"),
      project_type: z
        .enum([
          "community_library",
          "enterprise_tool",
          "personal_project",
          "documentation",
        ])
        .optional()
        .default("community_library")
        .describe("Type of project for tailored evaluation"),
      repository_path: z
        .string()
        .optional()
        .describe("Optional path to repository for additional context"),
    }),
  },
  {
    name: "readme_best_practices",
    description:
      "Analyze README files against best practices checklist and generate templates for improvement",
    inputSchema: z.object({
      readme_path: z.string().describe("Path to the README file to analyze"),
      project_type: z
        .enum(["library", "application", "tool", "documentation", "framework"])
        .optional()
        .default("library")
        .describe("Type of project for tailored analysis"),
      generate_template: z
        .boolean()
        .optional()
        .default(false)
        .describe("Generate README templates and community files"),
      output_directory: z
        .string()
        .optional()
        .describe("Directory to write generated templates and community files"),
      include_community_files: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Generate community health files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.)",
        ),
      target_audience: z
        .enum(["beginner", "intermediate", "advanced", "mixed"])
        .optional()
        .default("mixed")
        .describe("Target audience for recommendations"),
    }),
  },
  {
    name: "check_documentation_links",
    description:
      "Comprehensive link checking for documentation deployment with external, internal, and anchor link validation",
    inputSchema: z.object({
      documentation_path: z
        .string()
        .optional()
        .default("./docs")
        .describe("Path to the documentation directory to check"),
      check_external_links: z
        .boolean()
        .optional()
        .default(true)
        .describe("Validate external URLs (slower but comprehensive)"),
      check_internal_links: z
        .boolean()
        .optional()
        .default(true)
        .describe("Validate internal file references"),
      check_anchor_links: z
        .boolean()
        .optional()
        .default(true)
        .describe("Validate anchor links within documents"),
      timeout_ms: z
        .number()
        .min(1000)
        .max(30000)
        .optional()
        .default(5000)
        .describe("Timeout for external link requests in milliseconds"),
      max_concurrent_checks: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .default(5)
        .describe("Maximum concurrent link checks"),
      allowed_domains: z
        .array(z.string())
        .optional()
        .default([])
        .describe(
          "Whitelist of allowed external domains (empty = all allowed)",
        ),
      ignore_patterns: z
        .array(z.string())
        .optional()
        .default([])
        .describe("URL patterns to ignore during checking"),
      fail_on_broken_links: z
        .boolean()
        .optional()
        .default(false)
        .describe("Fail the check if broken links are found"),
      output_format: z
        .enum(["summary", "detailed", "json"])
        .optional()
        .default("detailed")
        .describe("Output format for results"),
    }),
  },
  {
    name: "generate_readme_template",
    description:
      "Generate standardized README templates for different project types with best practices",
    inputSchema: z.object({
      projectName: z.string().min(1).describe("Name of the project"),
      description: z
        .string()
        .min(1)
        .describe("Brief description of what the project does"),
      templateType: z
        .enum(["library", "application", "cli-tool", "api", "documentation"])
        .describe("Type of project template to generate"),
      author: z
        .string()
        .optional()
        .describe("Project author/organization name"),
      license: z.string().optional().default("MIT").describe("Project license"),
      includeScreenshots: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include screenshot placeholders for applications"),
      includeBadges: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include status badges"),
      includeContributing: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include contributing section"),
      outputPath: z
        .string()
        .optional()
        .describe("Path to write the generated README.md file"),
    }),
  },
  {
    name: "validate_readme_checklist",
    description:
      "Validate README files against community best practices checklist with detailed scoring",
    inputSchema: z.object({
      readmePath: z
        .string()
        .min(1)
        .describe("Path to the README file to validate"),
      projectPath: z
        .string()
        .optional()
        .describe("Path to project directory for additional context"),
      strict: z
        .boolean()
        .optional()
        .default(false)
        .describe("Use strict validation rules"),
      outputFormat: z
        .enum(["json", "markdown", "console"])
        .optional()
        .default("console")
        .describe("Output format for the validation report"),
    }),
  },
  {
    name: "analyze_readme",
    description:
      "Comprehensive README analysis with length assessment, structure evaluation, and optimization opportunities",
    inputSchema: z.object({
      project_path: z
        .string()
        .min(1)
        .describe("Path to the project directory containing README"),
      target_audience: z
        .enum([
          "community_contributors",
          "enterprise_users",
          "developers",
          "general",
        ])
        .optional()
        .default("community_contributors")
        .describe("Target audience for analysis"),
      optimization_level: z
        .enum(["light", "moderate", "aggressive"])
        .optional()
        .default("moderate")
        .describe("Level of optimization suggestions"),
      max_length_target: z
        .number()
        .min(50)
        .max(1000)
        .optional()
        .default(300)
        .describe("Target maximum length in lines"),
    }),
  },
  {
    name: "optimize_readme",
    description:
      "Optimize README content by restructuring, condensing, and extracting detailed sections to separate documentation",
    inputSchema: z.object({
      readme_path: z
        .string()
        .min(1)
        .describe("Path to the README file to optimize"),
      strategy: z
        .enum([
          "community_focused",
          "enterprise_focused",
          "developer_focused",
          "general",
        ])
        .optional()
        .default("community_focused")
        .describe("Optimization strategy"),
      max_length: z
        .number()
        .min(50)
        .max(1000)
        .optional()
        .default(300)
        .describe("Target maximum length in lines"),
      include_tldr: z
        .boolean()
        .optional()
        .default(true)
        .describe("Generate and include TL;DR section"),
      preserve_existing: z
        .boolean()
        .optional()
        .default(true)
        .describe("Preserve existing content structure where possible"),
      output_path: z
        .string()
        .optional()
        .describe(
          "Path to write optimized README (if not specified, returns content only)",
        ),
      create_docs_directory: z
        .boolean()
        .optional()
        .default(true)
        .describe("Create docs/ directory for extracted content"),
    }),
  },
  {
    name: "manage_preferences",
    description:
      "Manage user preferences for documentation generation and SSG recommendations",
    inputSchema: z.object({
      action: z
        .enum(["get", "update", "reset", "export", "import", "recommendations"])
        .describe("Action to perform on preferences"),
      userId: z
        .string()
        .optional()
        .default("default")
        .describe("User ID for multi-user setups"),
      preferences: z
        .object({
          preferredSSGs: z
            .array(z.string())
            .optional()
            .describe("List of preferred static site generators"),
          documentationStyle: z
            .enum(["minimal", "comprehensive", "tutorial-heavy"])
            .optional()
            .describe("Preferred documentation style"),
          expertiseLevel: z
            .enum(["beginner", "intermediate", "advanced"])
            .optional()
            .describe("User's technical expertise level"),
          preferredTechnologies: z
            .array(z.string())
            .optional()
            .describe("Preferred technologies and frameworks"),
          preferredDiataxisCategories: z
            .array(z.enum(["tutorials", "how-to", "reference", "explanation"]))
            .optional()
            .describe("Preferred Diataxis documentation categories"),
          autoApplyPreferences: z
            .boolean()
            .optional()
            .describe("Automatically apply preferences to recommendations"),
        })
        .optional()
        .describe("Preference updates (for update action)"),
      json: z.string().optional().describe("JSON string for import action"),
    }),
  },
  {
    name: "analyze_deployments",
    description:
      "Analyze deployment patterns and generate insights from historical deployment data",
    inputSchema: z.object({
      analysisType: z
        .enum(["full_report", "ssg_stats", "compare", "health", "trends"])
        .optional()
        .default("full_report")
        .describe(
          "Type of analysis: full_report (comprehensive), ssg_stats (per-SSG), compare (compare SSGs), health (deployment health score), trends (temporal analysis)",
        ),
      ssg: z.string().optional().describe("SSG name for ssg_stats analysis"),
      ssgs: z
        .array(z.string())
        .optional()
        .describe("Array of SSG names for comparison"),
      periodDays: z
        .number()
        .optional()
        .default(30)
        .describe("Period in days for trend analysis"),
    }),
  },
  {
    name: "read_directory",
    description:
      "List files and directories within allowed roots. Use this to discover files without requiring full absolute paths from the user.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Path to directory (relative to root or absolute within root)",
        ),
    }),
  },
  // Phase 3: Code-to-Documentation Synchronization
  {
    name: "sync_code_to_docs",
    description:
      "Automatically synchronize documentation with code changes using AST-based drift detection (Phase 3)",
    inputSchema: z.object({
      projectPath: z.string().describe("Path to the project root directory"),
      docsPath: z.string().describe("Path to the documentation directory"),
      mode: z
        .enum(["detect", "preview", "apply", "auto"])
        .default("detect")
        .describe(
          "Sync mode: detect=analyze only, preview=show changes, apply=apply safe changes, auto=apply all",
        ),
      autoApplyThreshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe(
          "Confidence threshold (0-1) for automatic application of changes",
        ),
      createSnapshot: z
        .boolean()
        .default(true)
        .describe("Create a snapshot before making changes (recommended)"),
    }),
  },
  {
    name: changeWatcherTool.name,
    description: changeWatcherTool.description,
    inputSchema: changeWatcherSchema,
  },
  {
    name: "generate_contextual_content",
    description:
      "Generate context-aware documentation using AST analysis and knowledge graph insights (Phase 3)",
    inputSchema: z.object({
      filePath: z.string().describe("Path to the source code file to document"),
      documentationType: z
        .enum(["tutorial", "how-to", "reference", "explanation", "all"])
        .default("reference")
        .describe("Type of Diataxis documentation to generate"),
      includeExamples: z
        .boolean()
        .default(true)
        .describe("Include code examples in generated documentation"),
      style: z
        .enum(["concise", "detailed", "verbose"])
        .default("detailed")
        .describe("Documentation detail level"),
      outputFormat: z
        .enum(["markdown", "mdx", "html"])
        .default("markdown")
        .describe("Output format for generated content"),
    }),
  },
  // Documentation Freshness Tracking
  {
    name: "track_documentation_freshness",
    description:
      "Scan documentation directory for staleness markers and identify files needing updates based on configurable time thresholds (minutes, hours, days)",
    inputSchema: z.object({
      docsPath: z.string().describe("Path to documentation directory"),
      projectPath: z
        .string()
        .optional()
        .describe("Path to project root (for knowledge graph tracking)"),
      warningThreshold: z
        .object({
          value: z.number().positive(),
          unit: z.enum(["minutes", "hours", "days"]),
        })
        .optional()
        .describe("Warning threshold (yellow flag)"),
      staleThreshold: z
        .object({
          value: z.number().positive(),
          unit: z.enum(["minutes", "hours", "days"]),
        })
        .optional()
        .describe("Stale threshold (orange flag)"),
      criticalThreshold: z
        .object({
          value: z.number().positive(),
          unit: z.enum(["minutes", "hours", "days"]),
        })
        .optional()
        .describe("Critical threshold (red flag)"),
      preset: z
        .enum([
          "realtime",
          "active",
          "recent",
          "weekly",
          "monthly",
          "quarterly",
        ])
        .optional()
        .describe("Use predefined threshold preset"),
      includeFileList: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include detailed file list in response"),
      sortBy: z
        .enum(["age", "path", "staleness"])
        .optional()
        .default("staleness")
        .describe("Sort order for file list"),
      storeInKG: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Store tracking event in knowledge graph for historical analysis",
        ),
    }),
  },
  {
    name: "validate_documentation_freshness",
    description:
      "Validate documentation freshness, initialize metadata for files without it, and update timestamps based on code changes",
    inputSchema: z.object({
      docsPath: z.string().describe("Path to documentation directory"),
      projectPath: z
        .string()
        .describe("Path to project root (for git integration)"),
      initializeMissing: z
        .boolean()
        .optional()
        .default(true)
        .describe("Initialize metadata for files without it"),
      updateExisting: z
        .boolean()
        .optional()
        .default(false)
        .describe("Update last_validated timestamp for all files"),
      updateFrequency: z
        .enum([
          "realtime",
          "active",
          "recent",
          "weekly",
          "monthly",
          "quarterly",
        ])
        .optional()
        .default("monthly")
        .describe("Default update frequency for new metadata"),
      validateAgainstGit: z
        .boolean()
        .optional()
        .default(true)
        .describe("Validate against current git commit"),
    }),
  },
  {
    name: "manage_sitemap",
    description:
      "Generate, validate, and manage sitemap.xml as the source of truth for documentation links. Sitemap.xml is used for SEO, search engine submission, and deployment tracking.",
    inputSchema: ManageSitemapInputSchema,
  },
  {
    name: "generate_llm_context",
    description:
      "Generate a comprehensive LLM context reference file documenting all tools, memory system, and workflows for easy @ reference",
    inputSchema: GenerateLLMContextInputSchema,
  },
  {
    name: "cleanup_agent_artifacts",
    description:
      "Detect, classify, and clean up artifacts generated by AI coding agents (e.g., TODO.md, PLAN.md, agent markers, temporary files). Supports scan, clean, and archive operations with configurable patterns.",
    inputSchema: z.object({
      path: z.string().describe("Path to the project directory to scan"),
      operation: z
        .enum(["scan", "clean", "archive"])
        .describe(
          "Operation: scan (detect only), clean (remove), or archive (move to .agent-archive/)",
        ),
      dryRun: z
        .boolean()
        .optional()
        .default(false)
        .describe("Show what would be changed without making changes"),
      interactive: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Prompt for confirmation (not supported in MCP, treated as dryRun)",
        ),
      autoDeleteThreshold: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0.9)
        .describe("Confidence threshold for automatic deletion (0-1)"),
      includeGitIgnored: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include artifacts that are already in .gitignore"),
      customPatterns: z
        .object({
          files: z.array(z.string()).optional(),
          directories: z.array(z.string()).optional(),
          inlineMarkers: z.array(z.string()).optional(),
        })
        .optional()
        .describe("Custom patterns to detect in addition to defaults"),
    }),
  },
  // Memory system tools
  ...memoryTools.map((tool) => ({
    ...tool,
    inputSchema: z.object(
      Object.entries(tool.inputSchema.properties || {}).reduce(
        (acc: any, [key, value]: [string, any]) => {
          if (value.type === "string") {
            acc[key] = value.enum ? z.enum(value.enum) : z.string();
          } else if (value.type === "number") {
            acc[key] = z.number();
          } else if (value.type === "boolean") {
            acc[key] = z.boolean();
          } else if (value.type === "object") {
            acc[key] = z.object({});
          }
          if (value.description) {
            acc[key] = acc[key].describe(value.description);
          }
          if (!tool.inputSchema.required?.includes(key)) {
            acc[key] = acc[key].optional();
          }
          if (value.default !== undefined) {
            acc[key] = acc[key].default(value.default);
          }
          return acc;
        },
        {},
      ),
    ),
  })),
];

// Export TOOLS for use in generate_llm_context tool
export { TOOLS };

// Set tool definitions for generate_llm_context tool
setToolDefinitions(TOOLS);

// Native MCP Prompts for technical writing assistance
const PROMPTS = [
  {
    name: "tutorial-writer",
    description:
      "Generate learning-oriented tutorial content following Diataxis principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze project context)",
        required: true,
      },
      {
        name: "target_audience",
        description:
          "Target audience for the tutorial (default: 'beginners'). Options: 'beginners', 'intermediate', 'advanced'",
        required: false,
      },
      {
        name: "learning_goal",
        description:
          "What users should learn (default: 'get started with the project'). Examples: 'deploy first app', 'understand core concepts'",
        required: false,
      },
    ],
  },
  {
    name: "howto-guide-writer",
    description:
      "Generate problem-oriented how-to guide content following Diataxis principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze project context)",
        required: true,
      },
      {
        name: "problem",
        description:
          "Problem to solve (default: 'common development task'). Example: 'deploy to production', 'add authentication'",
        required: false,
      },
      {
        name: "user_experience",
        description:
          "User experience level (default: 'intermediate'). Options: 'beginner', 'intermediate', 'advanced'",
        required: false,
      },
    ],
  },
  {
    name: "reference-writer",
    description:
      "Generate information-oriented reference documentation following Diataxis principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze project context)",
        required: true,
      },
      {
        name: "reference_type",
        description:
          "Type of reference (default: 'API'). Options: 'API', 'CLI', 'Configuration', 'Architecture'",
        required: false,
      },
      {
        name: "completeness",
        description:
          "Level of completeness required (default: 'comprehensive'). Options: 'basic', 'comprehensive', 'exhaustive'",
        required: false,
      },
    ],
  },
  {
    name: "explanation-writer",
    description:
      "Generate understanding-oriented explanation content following Diataxis principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze project context)",
        required: true,
      },
      {
        name: "concept",
        description:
          "Concept to explain (default: 'system architecture'). Examples: 'data flow', 'design patterns', 'security model'",
        required: false,
      },
      {
        name: "depth",
        description:
          "Depth of explanation (default: 'detailed'). Options: 'overview', 'detailed', 'deep-dive'",
        required: false,
      },
    ],
  },
  {
    name: "diataxis-organizer",
    description:
      "Organize existing documentation using Diataxis framework principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze project context)",
        required: true,
      },
      {
        name: "current_docs",
        description:
          "Description of current documentation (default: 'mixed documentation'). Example: 'single README with everything', 'scattered wiki pages'",
        required: false,
      },
      {
        name: "priority",
        description:
          "Organization priority (default: 'user needs'). Options: 'user needs', 'completeness', 'maintainability'",
        required: false,
      },
    ],
  },
  {
    name: "readme-optimizer",
    description: "Optimize README content using Diataxis-aware principles",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used to analyze README and project context)",
        required: true,
      },
      {
        name: "optimization_focus",
        description:
          "Focus area for optimization (default: 'general'). Options: 'length', 'clarity', 'structure', 'onboarding'",
        required: false,
      },
    ],
  },
  // Guided workflow prompts (ADR-007)
  {
    name: "analyze-and-recommend",
    description: "Complete repository analysis and SSG recommendation workflow",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory (used for analysis)",
        required: true,
      },
      {
        name: "analysis_depth",
        description:
          "Analysis depth (default: 'standard'). Options: 'quick' (basic scan), 'standard' (comprehensive), 'deep' (detailed with dependencies)",
        required: false,
      },
      {
        name: "preferences",
        description:
          "SSG preferences as text (default: 'balanced approach'). Examples: 'prefer JavaScript ecosystem', 'prioritize simplicity', 'need fast builds'",
        required: false,
      },
    ],
  },
  {
    name: "setup-documentation",
    description:
      "Create comprehensive documentation structure with best practices",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (where docs will be created)",
        required: true,
      },
      {
        name: "ssg_type",
        description:
          "Static site generator type (default: 'recommended based on analysis'). Options: 'jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'",
        required: false,
      },
      {
        name: "include_examples",
        description:
          "Include example content (default: 'true'). Set to 'false' for templates only, 'true' for populated examples",
        required: false,
      },
    ],
  },
  {
    name: "troubleshoot-deployment",
    description: "Diagnose and fix GitHub Pages deployment issues",
    arguments: [
      {
        name: "repository",
        description:
          "Repository path or URL (GitHub repository to troubleshoot)",
        required: true,
      },
      {
        name: "deployment_url",
        description:
          "Expected deployment URL (default: derived from repository). Example: 'https://username.github.io/repo'",
        required: false,
      },
      {
        name: "issue_description",
        description:
          "Description of the issue (default: 'deployment not working'). Examples: 'builds fail', '404 errors', 'outdated content'",
        required: false,
      },
    ],
  },
  {
    name: "maintain-documentation-freshness",
    description:
      "Track and maintain documentation freshness with automated staleness detection",
    arguments: [
      {
        name: "project_path",
        description:
          "Path to the project directory (used for knowledge graph tracking)",
        required: true,
      },
      {
        name: "docs_path",
        description:
          "Path to documentation directory (default: derived from project). Example: './docs', './documentation'",
        required: false,
      },
      {
        name: "freshness_preset",
        description:
          "Staleness threshold preset (default: 'monthly'). Options: 'realtime' (minutes), 'active' (hours), 'recent' (days), 'weekly' (7 days), 'monthly' (30 days), 'quarterly' (90 days)",
        required: false,
      },
      {
        name: "action",
        description:
          "Action to perform (default: 'track'). Options: 'validate' (initialize metadata), 'track' (scan staleness), 'insights' (view trends)",
        required: false,
      },
    ],
  },
  // Code Mode Orchestration Prompts (ADR-011: CE-MCP Compatibility)
  // These prompts guide LLMs to write efficient orchestration code
  {
    name: "code-mode-documentation-setup",
    description:
      "Complete documentation setup using code-based orchestration (Code Mode optimized)",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "ssg_preference",
        description:
          "SSG preference (default: 'auto-detect'). Options: 'auto-detect', 'jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'",
        required: false,
      },
      {
        name: "include_deployment",
        description: "Include GitHub Pages deployment setup (default: 'true')",
        required: false,
      },
    ],
  },
  {
    name: "code-mode-parallel-workflow",
    description:
      "Execute multiple documcp operations in parallel for maximum efficiency (Code Mode optimized)",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "operations",
        description:
          "Comma-separated operations to run in parallel (default: 'analysis,validation,freshness'). Options: 'analysis', 'validation', 'freshness', 'gap-detection', 'link-checking'",
        required: false,
      },
    ],
  },
  {
    name: "code-mode-efficient-analysis",
    description:
      "Comprehensive project analysis with resource-based result filtering (Code Mode optimized)",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "include_recommendations",
        description: "Include immediate SSG recommendations (default: 'true')",
        required: false,
      },
    ],
  },
];

// MCP resources should serve APPLICATION needs, not store tool results
// Resources are app-controlled and used for UI display, autocomplete, etc.

// Resource definitions following ADR-007 and MCP best practices
// Resources serve APPLICATIONS (UI needs) not tool result storage
const RESOURCES = [
  // Static Site Generators - for UI selection dropdowns
  {
    uri: "documcp://ssgs/available",
    name: "Available Static Site Generators",
    description: "List of supported SSGs with capabilities for UI selection",
    mimeType: "application/json",
  },
  // Templates - static templates for documentation setup
  {
    uri: "documcp://templates/jekyll-config",
    name: "Jekyll Configuration Template",
    description: "Template for Jekyll _config.yml",
    mimeType: "text/yaml",
  },
  {
    uri: "documcp://templates/hugo-config",
    name: "Hugo Configuration Template",
    description: "Template for Hugo config.yaml",
    mimeType: "text/yaml",
  },
  {
    uri: "documcp://templates/docusaurus-config",
    name: "Docusaurus Configuration Template",
    description: "Template for Docusaurus docusaurus.config.js",
    mimeType: "text/javascript",
  },
  {
    uri: "documcp://templates/mkdocs-config",
    name: "MkDocs Configuration Template",
    description: "Template for MkDocs mkdocs.yml",
    mimeType: "text/yaml",
  },
  {
    uri: "documcp://templates/eleventy-config",
    name: "Eleventy Configuration Template",
    description: "Template for Eleventy .eleventy.js",
    mimeType: "text/javascript",
  },
  {
    uri: "documcp://templates/diataxis-structure",
    name: "Diataxis Structure Template",
    description: "Diataxis documentation structure blueprint",
    mimeType: "application/json",
  },
  // Workflows - for UI to display available workflows
  {
    uri: "documcp://workflows/all",
    name: "All Documentation Workflows",
    description: "Complete list of available documentation workflows",
    mimeType: "application/json",
  },
  {
    uri: "documcp://workflows/quick-setup",
    name: "Quick Documentation Setup Workflow",
    description: "Fast-track workflow for basic documentation",
    mimeType: "application/json",
  },
  {
    uri: "documcp://workflows/full-setup",
    name: "Full Documentation Setup Workflow",
    description: "Comprehensive workflow for complete documentation",
    mimeType: "application/json",
  },
  {
    uri: "documcp://workflows/guidance",
    name: "Workflow Execution Guidance",
    description: "Guidelines for executing documentation workflows",
    mimeType: "application/json",
  },
  // Freshness tracking - for UI selection and configuration
  {
    uri: "documcp://freshness/presets",
    name: "Documentation Freshness Presets",
    description:
      "Available staleness threshold presets for UI selection (realtime, active, recent, weekly, monthly, quarterly)",
    mimeType: "application/json",
  },
  {
    uri: "documcp://freshness/metadata-schema",
    name: "Freshness Metadata Schema",
    description:
      "Schema for documentation frontmatter freshness metadata fields",
    mimeType: "application/json",
  },
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  })),
}));

// Helper function to detect documentation directories
async function detectDocsDirectories(
  projectRoot: string,
): Promise<Array<{ path: string; name: string }>> {
  const commonDocsDirs = [
    "docs",
    "documentation",
    "doc",
    "wiki",
    "website/docs", // Docusaurus pattern
    ".vitepress", // VitePress
    "book", // mdBook
  ];

  const detected: Array<{ path: string; name: string }> = [];

  for (const dirName of commonDocsDirs) {
    const fullPath = path.join(projectRoot, dirName);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        detected.push({
          path: fullPath,
          name: dirName,
        });
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return detected;
}

// List allowed roots (includes auto-detected docs directories)
server.setRequestHandler(ListRootsRequestSchema, async () => {
  const roots: Array<{
    uri: string;
    name: string;
    type?: string;
    description?: string;
    parent?: string;
  }> = [];

  // Add project roots
  for (const root of allowedRoots) {
    roots.push({
      uri: `file://${root}`,
      name: path.basename(root),
      type: "project",
      description: "Project root containing source code and documentation",
    });

    // Auto-detect and add docs directories within this root
    const docsDirectories = await detectDocsDirectories(root);
    for (const docsDir of docsDirectories) {
      roots.push({
        uri: `file://${docsDir.path}`,
        name: docsDir.name,
        type: "documentation",
        description: `Documentation directory within ${path.basename(root)}`,
        parent: `file://${root}`,
      });
    }
  }

  return { roots };
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

// Get specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Handle Code Mode orchestration prompts (ADR-011)
  if (name.startsWith("code-mode-")) {
    const projectPath = args?.project_path || process.cwd();
    return generateCodeModePrompt(name, projectPath, args || {});
  }

  // Generate dynamic prompt messages using our Diataxis-aligned prompt system
  const projectPath = args?.project_path || process.cwd();
  const messages = await generateTechnicalWriterPrompts(
    name,
    projectPath,
    args || {},
  );

  return {
    description: `Technical writing assistance for ${name}`,
    messages,
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

// Read specific resource
// Resources serve APPLICATION needs - static content for UI display
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Handle SSG list resource (for UI dropdowns/selection)
  if (uri === "documcp://ssgs/available") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              ssgs: [
                {
                  id: "jekyll",
                  name: "Jekyll",
                  description: "Ruby-based SSG, great for GitHub Pages",
                  language: "ruby",
                  complexity: "low",
                  buildSpeed: "medium",
                  ecosystem: "mature",
                  bestFor: ["blogs", "documentation", "simple-sites"],
                },
                {
                  id: "hugo",
                  name: "Hugo",
                  description: "Go-based SSG, extremely fast builds",
                  language: "go",
                  complexity: "medium",
                  buildSpeed: "very-fast",
                  ecosystem: "mature",
                  bestFor: ["documentation", "blogs", "large-sites"],
                },
                {
                  id: "docusaurus",
                  name: "Docusaurus",
                  description:
                    "React-based, optimized for technical documentation",
                  language: "javascript",
                  complexity: "medium",
                  buildSpeed: "medium",
                  ecosystem: "growing",
                  bestFor: [
                    "technical-documentation",
                    "api-docs",
                    "versioned-docs",
                  ],
                },
                {
                  id: "mkdocs",
                  name: "MkDocs",
                  description: "Python-based, simple and fast documentation",
                  language: "python",
                  complexity: "low",
                  buildSpeed: "fast",
                  ecosystem: "mature",
                  bestFor: ["documentation", "technical-docs", "simple-setup"],
                },
                {
                  id: "eleventy",
                  name: "Eleventy",
                  description: "JavaScript-based, simple and flexible",
                  language: "javascript",
                  complexity: "low",
                  buildSpeed: "fast",
                  ecosystem: "growing",
                  bestFor: ["blogs", "documentation", "flexible-sites"],
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // Handle template resources (static content)
  if (uri.startsWith("documcp://templates/")) {
    const templateType = uri.split("/").pop();

    switch (templateType) {
      case "jekyll-config":
        return {
          contents: [
            {
              uri,
              mimeType: "text/yaml",
              text: `# Jekyll Configuration Template
title: "Documentation Site"
description: "Project documentation"
baseurl: ""
url: ""

markdown: kramdown
highlighter: rouge
theme: minima

plugins:
  - jekyll-feed
  - jekyll-sitemap

exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
`,
            },
          ],
        };

      case "hugo-config":
        return {
          contents: [
            {
              uri,
              mimeType: "text/yaml",
              text: `# Hugo Configuration Template
baseURL: "https://username.github.io/repository"
languageCode: "en-us"
title: "Documentation Site"
theme: "docsy"

params:
  github_repo: "https://github.com/username/repository"
  github_branch: "main"

markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    style: github
    lineNos: true
`,
            },
          ],
        };

      case "docusaurus-config":
        return {
          contents: [
            {
              uri,
              mimeType: "text/javascript",
              text: `// Docusaurus Configuration Template
// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Documentation Site',
  tagline: 'Project documentation',
  url: 'https://username.github.io',
  baseUrl: '/repository/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'username',
  projectName: 'repository',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/username/repository/tree/main/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Documentation',
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Tutorial',
          },
          {
            href: 'https://github.com/username/repository',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: \`Copyright © \${new Date().getFullYear()} Project Name\`,
      },
    }),
};

module.exports = config;
`,
            },
          ],
        };

      case "mkdocs-config":
        return {
          contents: [
            {
              uri,
              mimeType: "text/yaml",
              text: `# MkDocs Configuration Template
site_name: Documentation Site
site_url: https://username.github.io/repository
repo_url: https://github.com/username/repository
repo_name: username/repository

theme:
  name: material
  palette:
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - toc.integrate
    - navigation.top
    - search.suggest
    - search.highlight
    - content.tabs.link

plugins:
  - search
  - awesome-pages

markdown_extensions:
  - pymdownx.highlight
  - pymdownx.superfences
  - pymdownx.tabbed
  - admonition
  - pymdownx.details

nav:
  - Home: index.md
  - Tutorials: tutorials/
  - How-To Guides: how-to/
  - Reference: reference/
  - Explanation: explanation/
`,
            },
          ],
        };

      case "eleventy-config":
        return {
          contents: [
            {
              uri,
              mimeType: "text/javascript",
              text: `// Eleventy Configuration Template
module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");

  // Add plugins
  // eleventyConfig.addPlugin(require("@11ty/eleventy-plugin-syntaxhighlight"));

  // Add filters
  eleventyConfig.addFilter("readableDate", dateObj => {
    return new Date(dateObj).toLocaleDateString();
  });

  // Add shortcodes
  eleventyConfig.addShortcode("year", () => \`\${new Date().getFullYear()}\`);

  // Markdown configuration
  let markdownIt = require("markdown-it");
  let markdownItAnchor = require("markdown-it-anchor");
  let options = {
    html: true,
    breaks: true,
    linkify: true
  };

  eleventyConfig.setLibrary("md", markdownIt(options)
    .use(markdownItAnchor)
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
`,
            },
          ],
        };

      case "diataxis-structure":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  structure: {
                    tutorials: {
                      description: "Learning-oriented guides",
                      files: ["getting-started.md", "your-first-project.md"],
                    },
                    "how-to-guides": {
                      description: "Problem-oriented step-by-step guides",
                      files: ["common-tasks.md", "troubleshooting.md"],
                    },
                    reference: {
                      description: "Information-oriented technical reference",
                      files: ["api-reference.md", "configuration.md"],
                    },
                    explanation: {
                      description: "Understanding-oriented background material",
                      files: ["architecture.md", "design-decisions.md"],
                    },
                  },
                },
                null,
                2,
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown template: ${templateType}`);
    }
  }

  // Handle workflow resources
  if (uri.startsWith("documcp://workflows/")) {
    const workflowType = uri.split("/").pop();

    switch (workflowType) {
      case "all":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  workflows: DOCUMENTATION_WORKFLOWS,
                  executionGuidance: WORKFLOW_EXECUTION_GUIDANCE,
                  metadata: WORKFLOW_METADATA,
                },
                null,
                2,
              ),
            },
          ],
        };

      case "quick-setup":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                DOCUMENTATION_WORKFLOWS["quick-documentation-setup"],
                null,
                2,
              ),
            },
          ],
        };

      case "full-setup":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                DOCUMENTATION_WORKFLOWS["full-documentation-setup"],
                null,
                2,
              ),
            },
          ],
        };

      case "guidance":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  executionGuidance: WORKFLOW_EXECUTION_GUIDANCE,
                  recommendationEngine:
                    "Use recommendWorkflow() function with project status and requirements",
                },
                null,
                2,
              ),
            },
          ],
        };

      default: {
        // Try to find specific workflow
        const workflow = DOCUMENTATION_WORKFLOWS[workflowType || ""];
        if (workflow) {
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(workflow, null, 2),
              },
            ],
          };
        }
        throw new Error(`Unknown workflow: ${workflowType}`);
      }
    }
  }

  // Handle freshness tracking resources
  if (uri.startsWith("documcp://freshness/")) {
    const freshnessType = uri.split("/").pop();

    switch (freshnessType) {
      case "presets":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  presets: [
                    {
                      id: "realtime",
                      name: "Realtime",
                      description:
                        "For frequently updated documentation (minutes)",
                      thresholds: {
                        warning: { value: 5, unit: "minutes" },
                        stale: { value: 15, unit: "minutes" },
                        critical: { value: 30, unit: "minutes" },
                      },
                      bestFor: ["api-docs", "status-pages", "live-updates"],
                    },
                    {
                      id: "active",
                      name: "Active",
                      description:
                        "For actively maintained documentation (hours)",
                      thresholds: {
                        warning: { value: 2, unit: "hours" },
                        stale: { value: 6, unit: "hours" },
                        critical: { value: 12, unit: "hours" },
                      },
                      bestFor: [
                        "development-docs",
                        "feature-guides",
                        "release-notes",
                      ],
                    },
                    {
                      id: "recent",
                      name: "Recent",
                      description: "For regularly updated documentation (days)",
                      thresholds: {
                        warning: { value: 1, unit: "days" },
                        stale: { value: 3, unit: "days" },
                        critical: { value: 7, unit: "days" },
                      },
                      bestFor: [
                        "tutorials",
                        "getting-started",
                        "project-updates",
                      ],
                    },
                    {
                      id: "weekly",
                      name: "Weekly",
                      description: "For weekly maintenance cycle (7 days)",
                      thresholds: {
                        warning: { value: 7, unit: "days" },
                        stale: { value: 14, unit: "days" },
                        critical: { value: 30, unit: "days" },
                      },
                      bestFor: ["how-to-guides", "examples", "best-practices"],
                    },
                    {
                      id: "monthly",
                      name: "Monthly",
                      description:
                        "For monthly maintenance cycle (30 days) - DEFAULT",
                      thresholds: {
                        warning: { value: 30, unit: "days" },
                        stale: { value: 60, unit: "days" },
                        critical: { value: 90, unit: "days" },
                      },
                      bestFor: [
                        "reference-docs",
                        "architecture",
                        "stable-features",
                      ],
                      default: true,
                    },
                    {
                      id: "quarterly",
                      name: "Quarterly",
                      description: "For quarterly maintenance cycle (90 days)",
                      thresholds: {
                        warning: { value: 90, unit: "days" },
                        stale: { value: 180, unit: "days" },
                        critical: { value: 365, unit: "days" },
                      },
                      bestFor: [
                        "explanations",
                        "background",
                        "rarely-changing-docs",
                      ],
                    },
                  ],
                },
                null,
                2,
              ),
            },
          ],
        };

      case "metadata-schema":
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  schema: {
                    documcp: {
                      description: "DocuMCP metadata block in YAML frontmatter",
                      type: "object",
                      properties: {
                        last_updated: {
                          type: "string",
                          format: "date-time",
                          description:
                            "ISO 8601 timestamp of last content update",
                          example: "2025-01-19T10:30:00Z",
                        },
                        last_validated: {
                          type: "string",
                          format: "date-time",
                          description:
                            "ISO 8601 timestamp of last validation check",
                          example: "2025-01-19T10:30:00Z",
                        },
                        update_frequency: {
                          type: "string",
                          enum: [
                            "realtime",
                            "active",
                            "recent",
                            "weekly",
                            "monthly",
                            "quarterly",
                          ],
                          description: "Expected update frequency preset",
                          default: "monthly",
                        },
                        validated_against_commit: {
                          type: "string",
                          description:
                            "Git commit hash the documentation was validated against",
                          example: "a1b2c3d",
                        },
                        auto_updated: {
                          type: "boolean",
                          description:
                            "Whether timestamps are automatically updated",
                          default: false,
                        },
                      },
                      required: ["last_updated"],
                    },
                  },
                  example: {
                    yaml: `---
title: "API Reference"
description: "Complete API documentation"
documcp:
  last_updated: "2025-01-19T10:30:00Z"
  last_validated: "2025-01-19T10:30:00Z"
  update_frequency: "monthly"
  validated_against_commit: "a1b2c3d"
  auto_updated: false
---`,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };

      default:
        throw new Error(`Unknown freshness resource: ${freshnessType}`);
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Helper to wrap tool results in standard MCP format
function wrapToolResult<T>(result: T, _toolName: string) {
  // If result is already in MCP format (has 'content' array), return as-is
  if (
    result &&
    typeof result === "object" &&
    "content" in result &&
    Array.isArray((result as any).content)
  ) {
    return result;
  }

  // Otherwise, wrap in formatMCPResponse
  return formatMCPResponse({
    success: true,
    data: result,
    metadata: {
      toolVersion: packageJson.version,
      executionTime: Date.now(),
      timestamp: new Date().toISOString(),
    },
  });
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_repository": {
        // Check if path is allowed
        const repoPath = (args as any)?.path;
        if (repoPath && !isPathAllowed(repoPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(repoPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument, or use a path within allowed roots.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await analyzeRepository(args, extra);

        // Remember in persistent memory
        if (args?.path && typeof args.path === "string") {
          const memoryId = await rememberAnalysis(args.path, result);
          (result as any).memoryId = memoryId;

          // Get insights from similar projects
          const similarProjects = await getSimilarProjects(result, 3);
          if (similarProjects.length > 0) {
            (result as any).insights = {
              similarProjects,
              message: `Found ${similarProjects.length} similar projects in memory`,
            };
          }
        }

        return wrapToolResult(result, "analyze_repository");
      }

      case "recommend_ssg": {
        const result = await recommendSSG(args, extra);

        // Remember recommendation
        if (args?.analysisId && typeof args.analysisId === "string") {
          const memoryId = await rememberRecommendation(
            args.analysisId,
            result,
          );
          (result as any).memoryId = memoryId;

          // Get project history if available
          const projectInsights = await getProjectInsights(args.analysisId);
          if (projectInsights.length > 0) {
            (result as any).projectHistory = projectInsights;
          }
        }
        return wrapToolResult(result, "recommend_ssg");
      }

      case "generate_config": {
        const result = await generateConfig(args);
        return wrapToolResult(result, "generate_config");
      }

      case "setup_structure": {
        // Check if basePath is allowed
        const basePath = (args as any)?.basePath;
        if (basePath && !isPathAllowed(basePath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(basePath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await setupStructure(args);
        return wrapToolResult(result, "setup_structure");
      }

      case "setup_playwright_tests": {
        const result = await setupPlaywrightTests(args);
        return wrapToolResult(result, "setup_playwright_tests");
      }

      case "deploy_pages": {
        const result = await deployPages(args, extra);
        return wrapToolResult(result, "deploy_pages");
      }

      case "verify_deployment": {
        const result = await verifyDeployment(args);
        return wrapToolResult(result, "verify_deployment");
      }

      case "populate_diataxis_content": {
        // Check if docsPath is allowed
        const docsPath = (args as any)?.docsPath;
        if (docsPath && !isPathAllowed(docsPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docsPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await handlePopulateDiataxisContent(args, extra);
        return {
          content: [
            {
              type: "text",
              text: `Content population completed successfully. Generated ${
                result.filesCreated
              } files with ${Math.round(
                result.populationMetrics.coverage,
              )}% coverage.`,
            },
            {
              type: "text",
              text: `Population metrics: Coverage: ${result.populationMetrics.coverage}%, Completeness: ${result.populationMetrics.completeness}%, Project Specificity: ${result.populationMetrics.projectSpecificity}%`,
            },
            {
              type: "text",
              text: `Next steps:\n${result.nextSteps
                .map((step) => `- ${step}`)
                .join("\n")}`,
            },
          ],
        };
      }

      case "update_existing_documentation": {
        const result = await handleUpdateExistingDocumentation(args);
        return {
          content: [
            {
              type: "text",
              text: `Documentation analysis completed. Found ${result.updateMetrics.gapsDetected} gaps and generated ${result.updateMetrics.recommendationsGenerated} recommendations.`,
            },
            {
              type: "text",
              text: `Update metrics: Confidence Score: ${result.updateMetrics.confidenceScore}, Estimated Effort: ${result.updateMetrics.estimatedEffort}`,
            },
            {
              type: "text",
              text: `Memory insights: ${result.memoryInsights.similarProjects.length} similar projects analyzed, ${result.memoryInsights.successfulUpdatePatterns.length} successful update patterns found`,
            },
            {
              type: "text",
              text: `Top recommendations:\n${result.recommendations
                .slice(0, 5)
                .map(
                  (rec, i) =>
                    `${i + 1}. ${rec.reasoning} (confidence: ${Math.round(
                      rec.confidence * 100,
                    )}%)`,
                )
                .join("\n")}`,
            },
            {
              type: "text",
              text: `Next steps:\n${result.nextSteps
                .map((step) => `- ${step}`)
                .join("\n")}`,
            },
          ],
        };
      }

      case "validate_diataxis_content": {
        // Check if contentPath is allowed
        const contentPath = (args as any)?.contentPath;
        if (contentPath && !isPathAllowed(contentPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(contentPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await handleValidateDiataxisContent(args, extra);

        // Return structured validation results as JSON
        const validationSummary = {
          status: result.success ? "PASSED" : "ISSUES FOUND",
          confidence: `${result.confidence.overall}%`,
          issuesFound: result.issues.length,
          breakdown: {
            errors: result.issues.filter((i) => i.type === "error").length,
            warnings: result.issues.filter((i) => i.type === "warning").length,
            info: result.issues.filter((i) => i.type === "info").length,
          },
          topIssues: result.issues.slice(0, 5).map((issue) => ({
            type: issue.type.toUpperCase(),
            category: issue.category,
            file: issue.location.file,
            description: issue.description,
          })),
          recommendations: result.recommendations,
          nextSteps: result.nextSteps,
          confidenceBreakdown: result.confidence.breakdown,
        };

        return {
          content: [
            {
              type: "text",
              text: `Content validation ${
                result.success ? "passed" : "found issues"
              }. Overall confidence: ${result.confidence.overall}%.`,
            },
            {
              type: "text",
              text: `Issues found: ${result.issues.length} (${
                result.issues.filter((i) => i.type === "error").length
              } errors, ${
                result.issues.filter((i) => i.type === "warning").length
              } warnings)`,
            },
            {
              type: "text",
              text: JSON.stringify(validationSummary, null, 2),
            },
          ],
        };
      }

      case "validate_content": {
        const result = await validateGeneralContent(args);

        // Return structured validation results as JSON
        const contentSummary = {
          status: result.success ? "PASSED" : "ISSUES FOUND",
          summary: result.summary,
          linksChecked: result.linksChecked || 0,
          codeBlocksValidated: result.codeBlocksValidated || 0,
          brokenLinks: result.brokenLinks || [],
          codeErrors: (result.codeErrors || []).slice(0, 10), // Limit to first 10 errors
          recommendations: result.recommendations || [],
        };

        return {
          content: [
            {
              type: "text",
              text: `Content validation completed. Status: ${
                result.success ? "PASSED" : "ISSUES FOUND"
              }`,
            },
            {
              type: "text",
              text: `Results: ${result.linksChecked || 0} links checked, ${
                result.codeBlocksValidated || 0
              } code blocks validated`,
            },
            {
              type: "text",
              text: JSON.stringify(contentSummary, null, 2),
            },
          ],
        };
      }

      case "detect_documentation_gaps": {
        const result = await detectDocumentationGaps(args);
        return wrapToolResult(result, "detect_documentation_gaps");
      }

      case "test_local_deployment": {
        const result = await testLocalDeployment(args);
        return wrapToolResult(result, "test_local_deployment");
      }

      case "evaluate_readme_health": {
        const result = await evaluateReadmeHealth(args as any);
        return wrapToolResult(result, "evaluate_readme_health");
      }

      case "readme_best_practices": {
        const result = await readmeBestPractices(args as any);
        return formatMCPResponse(result);
      }

      case "check_documentation_links": {
        // Check if documentation_path is allowed
        const docLinksPath = (args as any)?.documentation_path;
        if (docLinksPath && !isPathAllowed(docLinksPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docLinksPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await checkDocumentationLinks(args as any);
        return formatMCPResponse(result);
      }

      case "generate_readme_template": {
        const result = await generateReadmeTemplate(args as any);
        return formatMCPResponse({
          success: true,
          data: result,
          metadata: {
            toolVersion: packageJson.version,
            executionTime: Date.now(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      case "validate_readme_checklist": {
        const result = await validateReadmeChecklist(args as any);
        return formatMCPResponse({
          success: true,
          data: result,
          metadata: {
            toolVersion: packageJson.version,
            executionTime: Date.now(),
            timestamp: new Date().toISOString(),
          },
        });
      }

      case "analyze_readme": {
        const result = await analyzeReadme(args as any);
        return formatMCPResponse(result);
      }

      case "manage_preferences": {
        const result = await managePreferences(args);
        return wrapToolResult(result, "manage_preferences");
      }

      case "analyze_deployments": {
        const result = await analyzeDeployments(args);
        return wrapToolResult(result, "analyze_deployments");
      }

      // Phase 3: Code-to-Documentation Synchronization
      case "sync_code_to_docs": {
        const projectPath = (args as any)?.projectPath;
        const docsPath = (args as any)?.docsPath;

        // Check if paths are allowed
        if (projectPath && !isPathAllowed(projectPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(projectPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        if (docsPath && !isPathAllowed(docsPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docsPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await handleSyncCodeToDocs(args, extra);
        return wrapToolResult(result, "sync_code_to_docs");
      }

      case "change_watcher": {
        const projectPath = (args as any)?.projectPath;
        const docsPath = (args as any)?.docsPath;
        const watchPaths = (args as any)?.watchPaths as string[] | undefined;

        const checkPath = (p?: string) => {
          if (p && !isPathAllowed(p, allowedRoots)) {
            return getPermissionDeniedMessage(p, allowedRoots);
          }
          return null;
        };

        const projectError = checkPath(projectPath);
        if (projectError) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: projectError,
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const docsError = checkPath(docsPath);
        if (docsError) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: docsError,
              resolution:
                "Request access to this directory by starting the server with --root argument.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        if (watchPaths && watchPaths.length > 0) {
          for (const wp of watchPaths) {
            const candidate =
              projectPath && !path.isAbsolute(wp)
                ? path.join(projectPath, wp)
                : wp;
            if (!isPathAllowed(candidate, allowedRoots)) {
              return formatMCPResponse({
                success: false,
                error: {
                  code: "PERMISSION_DENIED",
                  message: getPermissionDeniedMessage(candidate, allowedRoots),
                  resolution:
                    "Request access to these paths by starting the server with --root argument.",
                },
                metadata: {
                  toolVersion: packageJson.version,
                  executionTime: 0,
                  timestamp: new Date().toISOString(),
                },
              });
            }
          }
        }

        const result = await handleChangeWatcher(args, extra);
        return wrapToolResult(result, "change_watcher");
      }

      case "generate_contextual_content": {
        const filePath = (args as any)?.filePath;

        // Check if file path is allowed
        if (filePath && !isPathAllowed(filePath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(filePath, allowedRoots),
              resolution:
                "Request access to this file by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await handleGenerateContextualContent(args, extra);
        return wrapToolResult(result, "generate_contextual_content");
      }

      // Documentation Freshness Tracking
      case "track_documentation_freshness": {
        const docsPath = (args as any)?.docsPath;

        // Check if docs path is allowed
        if (docsPath && !isPathAllowed(docsPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docsPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await trackDocumentationFreshness(args as any);
        return wrapToolResult(result, "track_documentation_freshness");
      }

      case "validate_documentation_freshness": {
        const docsPath = (args as any)?.docsPath;
        const projectPath = (args as any)?.projectPath;

        // Check if paths are allowed
        if (docsPath && !isPathAllowed(docsPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docsPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        if (projectPath && !isPathAllowed(projectPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(projectPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await validateDocumentationFreshness(args as any);
        return wrapToolResult(result, "validate_documentation_freshness");
      }

      case "manage_sitemap": {
        const docsPath = (args as any)?.docsPath;

        // Check if docs path is allowed
        if (docsPath && !isPathAllowed(docsPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(docsPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await manageSitemap(args as any);
        return wrapToolResult(result, "manage_sitemap");
      }

      case "generate_llm_context": {
        const projectPath = (args as any)?.projectPath;

        // Check if project path is allowed
        if (projectPath && !isPathAllowed(projectPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(projectPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await generateLLMContext(args as any);
        return wrapToolResult(result, "generate_llm_context");
      }

      case "cleanup_agent_artifacts": {
        const artifactPath = (args as any)?.path;

        // Check if path is allowed
        if (artifactPath && !isPathAllowed(artifactPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(artifactPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        const result = await cleanupAgentArtifacts(args);
        return wrapToolResult(result, "cleanup_agent_artifacts");
      }

      case "read_directory": {
        const { path: dirPath } = args as { path: string };

        // Check if path is allowed
        if (!isPathAllowed(dirPath, allowedRoots)) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "PERMISSION_DENIED",
              message: getPermissionDeniedMessage(dirPath, allowedRoots),
              resolution:
                "Request access to this directory by starting the server with --root argument, or use a path within allowed roots.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          const files = [];
          const directories = [];

          for (const entry of entries) {
            if (entry.isDirectory()) {
              directories.push(entry.name);
            } else if (entry.isFile()) {
              files.push(entry.name);
            }
          }

          return formatMCPResponse({
            success: true,
            data: {
              path: dirPath,
              files,
              directories,
              totalFiles: files.length,
              totalDirectories: directories.length,
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error: any) {
          return formatMCPResponse({
            success: false,
            error: {
              code: "READ_DIRECTORY_FAILED",
              message: `Failed to read directory: ${error.message}`,
              resolution: "Ensure the directory exists and is accessible.",
            },
            metadata: {
              toolVersion: packageJson.version,
              executionTime: 0,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      case "optimize_readme": {
        const result = await optimizeReadme(args as any);
        return formatMCPResponse(result);
      }

      // Memory system tools
      case "memory_recall": {
        await initializeMemory(); // Ensure memory is initialized
        const manager = (await import("./memory/index.js")).getMemoryManager();
        if (!manager) throw new Error("Memory system not initialized");

        let results;
        if (args?.type === "all") {
          results = await manager.search(args?.query || "", {
            sortBy: "timestamp",
          });
        } else {
          results = await manager.search(args?.type || "analysis", {
            sortBy: "timestamp",
          });
        }

        if (args?.limit && typeof args.limit === "number") {
          results = results.slice(0, args.limit);
        }

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} memories`,
            },
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "memory_insights": {
        const insights = await getMemoryStatistics();
        if (args?.projectId && typeof args.projectId === "string") {
          const projectInsights = await getProjectInsights(args.projectId);
          (insights as any).projectSpecific = projectInsights;
        }

        return {
          content: [
            {
              type: "text",
              text: "Memory system insights and patterns",
            },
            {
              type: "text",
              text: JSON.stringify(insights, null, 2),
            },
          ],
        };
      }

      case "memory_similar": {
        await initializeMemory();
        const manager = (await import("./memory/index.js")).getMemoryManager();
        if (!manager) throw new Error("Memory system not initialized");

        if (!args?.analysisId || typeof args.analysisId !== "string") {
          throw new Error("analysisId is required");
        }

        const analysis = await manager.recall(args.analysisId);
        if (!analysis) {
          throw new Error(`Analysis ${args.analysisId} not found in memory`);
        }

        const limitValue = typeof args?.limit === "number" ? args.limit : 5;
        const similar = await getSimilarProjects(analysis.data, limitValue);

        return {
          content: [
            {
              type: "text",
              text: `Found ${similar.length} similar projects`,
            },
            {
              type: "text",
              text: JSON.stringify(similar, null, 2),
            },
          ],
        };
      }

      case "memory_export": {
        const format =
          args?.format === "json" || args?.format === "csv"
            ? args.format
            : "json";
        const exported = await exportMemories(format);

        return {
          content: [
            {
              type: "text",
              text: `Exported memories in ${format} format`,
            },
            {
              type: "text",
              text: exported,
            },
          ],
        };
      }

      case "memory_cleanup": {
        const daysToKeep =
          typeof args?.daysToKeep === "number" ? args.daysToKeep : 30;

        if (args?.dryRun) {
          const stats = await getMemoryStatistics();
          const cutoff = new Date(
            Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
          );
          const oldCount = Object.entries(
            (stats as any).statistics?.byMonth || {},
          )
            .filter(([month]) => new Date(month + "-01") < cutoff)
            .reduce((sum, [_, count]) => sum + (count as number), 0);

          return {
            content: [
              {
                type: "text",
                text: `Dry run: Would delete approximately ${oldCount} memories older than ${daysToKeep} days`,
              },
            ],
          };
        } else {
          const deleted = await cleanupOldMemories(daysToKeep);
          return {
            content: [
              {
                type: "text",
                text: `Cleaned up ${deleted} old memories`,
              },
            ],
          };
        }
      }

      case "memory_intelligent_analysis": {
        const projectPath = args?.projectPath as string;
        const baseAnalysis = args?.baseAnalysis as any;

        // Get insights and similar projects
        const insights = await getProjectInsights(projectPath);
        const similar = await getSimilarProjects(baseAnalysis, 5);

        // Build intelligent analysis
        const intelligentAnalysis = {
          projectPath,
          contextualInsights: {
            insights: insights,
            similarProjects: similar.map((p: any) => ({
              name: p.projectPath,
              similarity: p.similarity,
              technologies: p.technologies,
              hasTests: p.hasTests,
              hasDocs: p.hasDocs,
            })),
            documentationHealth: {
              hasDocumentation: baseAnalysis?.documentation?.hasDocs || false,
              coverage: baseAnalysis?.documentation?.coverage || "unknown",
              recommendedImprovement: baseAnalysis?.documentation?.hasDocs
                ? "Add missing documentation categories"
                : "Create initial documentation structure",
            },
          },
          patterns: {
            technologyStack:
              baseAnalysis?.technologies?.primaryLanguage || "unknown",
            projectSize: baseAnalysis?.structure?.size || "unknown",
            testingMaturity: baseAnalysis?.structure?.hasTests
              ? "has tests"
              : "no tests",
            cicdMaturity: baseAnalysis?.structure?.hasCI
              ? "has CI/CD"
              : "no CI/CD",
          },
          predictions: {
            recommendedSSG:
              similar.length > 0
                ? `Based on ${similar.length} similar projects`
                : "Insufficient data",
            estimatedEffort:
              baseAnalysis?.structure?.size === "large"
                ? "high"
                : baseAnalysis?.structure?.size === "medium"
                  ? "medium"
                  : "low",
          },
          recommendations: [
            ...(baseAnalysis?.documentation?.hasDocs
              ? []
              : ["Create documentation structure using Diataxis framework"]),
            ...(baseAnalysis?.structure?.hasTests
              ? []
              : ["Add test coverage to improve reliability"]),
            ...(baseAnalysis?.structure?.hasCI
              ? []
              : ["Set up CI/CD pipeline for automated deployment"]),
          ],
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(intelligentAnalysis, null, 2),
            },
          ],
        };
      }

      case "memory_enhanced_recommendation": {
        const projectPath = args?.projectPath as string;
        const baseRecommendation = args?.baseRecommendation as any;
        const projectFeatures = args?.projectFeatures as any;

        // Get historical deployment data and similar projects
        await getProjectInsights(projectPath);
        const similar = await getSimilarProjects(projectFeatures, 10);

        // Calculate success rates from similar projects
        const successfulDeployments = similar.filter(
          (p: any) => p.deploymentSuccess === true,
        );
        const ssgUsage: Record<string, number> = {};
        similar.forEach((p: any) => {
          if (p.recommendedSSG) {
            ssgUsage[p.recommendedSSG] = (ssgUsage[p.recommendedSSG] || 0) + 1;
          }
        });

        const enhancedRecommendation = {
          baseRecommendation: baseRecommendation?.ssg || "unknown",
          confidence: baseRecommendation?.confidence || 0,
          historicalContext: {
            similarProjectsAnalyzed: similar.length,
            successfulDeployments: successfulDeployments.length,
            successRate:
              similar.length > 0
                ? (
                    (successfulDeployments.length / similar.length) *
                    100
                  ).toFixed(1) + "%"
                : "N/A",
          },
          popularChoices: Object.entries(ssgUsage)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([ssg, count]) => ({
              ssg,
              usage: count,
              percentage:
                similar.length > 0
                  ? (((count as number) / similar.length) * 100).toFixed(1) +
                    "%"
                  : "N/A",
            })),
          enhancedRecommendations: [
            {
              ssg: baseRecommendation?.ssg || "Jekyll",
              reason: "Base recommendation from analysis",
              confidence: baseRecommendation?.confidence || 0.7,
            },
            ...Object.entries(ssgUsage)
              .filter(([ssg]) => ssg !== baseRecommendation?.ssg)
              .slice(0, 2)
              .map(([ssg, count]) => ({
                ssg,
                reason: `Used by ${count} similar project(s)`,
                confidence: similar.length > 0 ? count / similar.length : 0.5,
              })),
          ],
          considerations: [
            ...(projectFeatures.hasTests
              ? ["Project has tests - consider SSG with good test integration"]
              : []),
            ...(projectFeatures.hasCI
              ? ["Project has CI/CD - ensure SSG supports automated builds"]
              : []),
            ...(projectFeatures.complexity === "complex"
              ? ["Complex project - consider robust SSG with plugin ecosystem"]
              : []),
            ...(projectFeatures.isOpenSource
              ? ["Open source project - community support is important"]
              : []),
          ],
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(enhancedRecommendation, null, 2),
            },
          ],
        };
      }

      case "memory_learning_stats": {
        const stats = await getMemoryStatistics();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "active",
                  learningStats: stats,
                  message: "Learning stats from current memory system",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_knowledge_graph": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Knowledge graph feature is being developed",
                  query: args?.query,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_contextual_search": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Contextual search feature is being developed",
                  query: args?.query,
                  context: args?.context,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_agent_network": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Agent network feature is being developed",
                  action: args?.action,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_pruning": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Memory pruning feature is being developed",
                  dryRun: args?.dryRun,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_temporal_analysis": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Temporal analysis feature is being developed",
                  query: args?.query,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_visualization": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Memory visualization feature is being developed",
                  visualizationType: args?.visualizationType,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_export_advanced": {
        await initializeMemory();
        const manager = (await import("./memory/index.js")).getMemoryManager();
        if (!manager) throw new Error("Memory system not initialized");

        const result = await manager.export("json");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "success",
                  exported: result.length,
                  data: result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_import_advanced": {
        await initializeMemory();
        const manager = (await import("./memory/index.js")).getMemoryManager();
        if (!manager) throw new Error("Memory system not initialized");

        if (!args?.inputPath || typeof args.inputPath !== "string") {
          throw new Error("inputPath is required");
        }

        const fs = await import("fs/promises");
        const data = await fs.readFile(args.inputPath, "utf-8");
        const result = await manager.import(data, "json");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "success",
                  imported: result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_migration": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "development",
                  message: "Migration functionality not yet implemented",
                  action: args?.action,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "memory_optimization_metrics": {
        const stats = await getMemoryStatistics();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "active",
                  optimizationMetrics: stats,
                  message: "Optimization metrics from current memory system",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return formatMCPResponse({
      success: false,
      error: {
        code: "TOOL_EXECUTION_ERROR",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
        resolution:
          "Check tool parameters and try again. If the issue persists, review server logs for details.",
      },
      metadata: {
        toolVersion: packageJson.version,
        executionTime: Date.now(),
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Show storage information at startup
  const storageDir =
    process.env.DOCUMCP_STORAGE_DIR || `${process.cwd()}/.documcp/memory`;
  console.error("DocuMCP server started successfully");
  console.error(`Storage location: ${storageDir}`);
}

main().catch((error) => {
  console.error("Failed to start DocuMCP server:", error);
  process.exit(1);
});
