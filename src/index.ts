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
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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
import { formatMCPResponse } from "./types/api.js";
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
    },
  },
);

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

// Native MCP Prompts for technical writing assistance
const PROMPTS = [
  {
    name: "tutorial-writer",
    description:
      "Generate learning-oriented tutorial content following Diataxis principles",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "target_audience",
        description: "Target audience for the tutorial",
        required: false,
      },
      {
        name: "learning_goal",
        description: "What users should learn",
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
        description: "Path to the project directory",
        required: true,
      },
      { name: "problem", description: "Problem to solve", required: false },
      {
        name: "user_experience",
        description: "User experience level",
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
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "reference_type",
        description: "Type of reference (API, CLI, etc.)",
        required: false,
      },
      {
        name: "completeness",
        description: "Level of completeness required",
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
        description: "Path to the project directory",
        required: true,
      },
      { name: "concept", description: "Concept to explain", required: false },
      { name: "depth", description: "Depth of explanation", required: false },
    ],
  },
  {
    name: "diataxis-organizer",
    description:
      "Organize existing documentation using Diataxis framework principles",
    arguments: [
      {
        name: "project_path",
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "current_docs",
        description: "Description of current documentation",
        required: false,
      },
      {
        name: "priority",
        description: "Organization priority",
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
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "optimization_focus",
        description: "Focus area for optimization",
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
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "analysis_depth",
        description: "Analysis depth: quick, standard, deep",
        required: false,
      },
      {
        name: "preferences",
        description: "SSG preferences (ecosystem, priority)",
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
        description: "Path to the project directory",
        required: true,
      },
      {
        name: "ssg_type",
        description: "Static site generator type",
        required: false,
      },
      {
        name: "include_examples",
        description: "Include example content",
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
        description: "Repository path or URL",
        required: true,
      },
      {
        name: "deployment_url",
        description: "Expected deployment URL",
        required: false,
      },
      {
        name: "issue_description",
        description: "Description of the issue",
        required: false,
      },
    ],
  },
];

// In-memory storage for resources
const resourceStore = new Map<string, { content: string; mimeType: string }>();

// Helper function to store tool results as resources
function storeResourceFromToolResult(
  toolName: string,
  args: any,
  result: any,
  id?: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resourceId =
    id || `${timestamp}-${Math.random().toString(36).substring(2, 11)}`;
  let uri: string;
  let mimeType = "application/json";
  let content: string;

  // Determine URI and content based on tool type
  switch (toolName) {
    case "analyze_repository":
      uri = `documcp://analysis/${resourceId}`;
      content = JSON.stringify(result, null, 2);
      break;
    case "recommend_ssg":
      uri = `documcp://recommendations/${resourceId}`;
      content = JSON.stringify(result, null, 2);
      break;
    case "generate_config":
      uri = `documcp://config/${args.ssg}/${resourceId}`;
      mimeType = "text/plain";
      content =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      break;
    case "setup_structure":
      uri = `documcp://structure/${resourceId}`;
      content = JSON.stringify(result, null, 2);
      break;
    case "deploy_pages":
      uri = `documcp://deployment/${resourceId}`;
      mimeType = "text/yaml";
      content =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      break;
    case "verify_deployment":
      uri = `documcp://verification/${resourceId}`;
      content = JSON.stringify(result, null, 2);
      break;
    default:
      uri = `documcp://results/${toolName}/${resourceId}`;
      content = JSON.stringify(result, null, 2);
  }

  // Store the resource
  resourceStore.set(uri, { content, mimeType });

  return uri;
}

// Resource definitions following ADR-007
const RESOURCES = [
  {
    uri: "documcp://analysis/",
    name: "Repository Analysis Results",
    description: "Results from repository analysis operations",
    mimeType: "application/json",
  },
  {
    uri: "documcp://recommendations/",
    name: "SSG Recommendations",
    description:
      "Static Site Generator recommendations based on project analysis",
    mimeType: "application/json",
  },
  {
    uri: "documcp://config/",
    name: "Generated Configuration Files",
    description: "Generated SSG configuration files",
    mimeType: "text/plain",
  },
  {
    uri: "documcp://structure/",
    name: "Documentation Structure Templates",
    description: "Diataxis-compliant documentation structures",
    mimeType: "application/json",
  },
  {
    uri: "documcp://deployment/",
    name: "GitHub Actions Workflows",
    description: "Generated deployment workflows",
    mimeType: "text/yaml",
  },
  {
    uri: "documcp://verification/",
    name: "Deployment Verification Results",
    description: "Results from deployment verification checks",
    mimeType: "application/json",
  },
  {
    uri: "documcp://templates/",
    name: "Reusable Templates",
    description: "Template files for documentation setup",
    mimeType: "text/plain",
  },
  {
    uri: "documcp://workflows/",
    name: "Documentation Workflows",
    description: "Guided workflows for different documentation scenarios",
    mimeType: "application/json",
  },
  {
    uri: "documcp://results/",
    name: "Tool Results",
    description: "Results from various DocuMCP tools",
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

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

// Get specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Check if resource exists in store
  const resource = resourceStore.get(uri);
  if (resource) {
    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: resource.content,
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

  throw new Error(`Resource not found: ${uri}`);
});

// Helper function to store resources
function storeResource(uri: string, content: string, mimeType: string): void {
  resourceStore.set(uri, { content, mimeType });
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "analyze_repository": {
        const result = await analyzeRepository(args);

        // Store analysis result as resource
        const resourceUri = storeResourceFromToolResult(
          "analyze_repository",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;

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

        return result;
      }

      case "recommend_ssg": {
        const result = await recommendSSG(args);

        // Store recommendation as resource
        const resourceUri = storeResourceFromToolResult(
          "recommend_ssg",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;

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
        return result;
      }

      case "generate_config": {
        const result = await generateConfig(args);

        // Store generated config as resource
        const resourceUri = storeResourceFromToolResult(
          "generate_config",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;

        return result;
      }

      case "setup_structure": {
        const result = await setupStructure(args);

        // Store structure as resource
        const resourceUri = storeResourceFromToolResult(
          "setup_structure",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;
        return result;
      }

      case "setup_playwright_tests": {
        const result = await setupPlaywrightTests(args);
        return result;
      }

      case "deploy_pages": {
        const result = await deployPages(args);

        // Store deployment workflow as resource
        const resourceUri = storeResourceFromToolResult(
          "deploy_pages",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;

        return result;
      }

      case "verify_deployment": {
        const result = await verifyDeployment(args);

        // Store verification result as resource
        const resourceUri = storeResourceFromToolResult(
          "verify_deployment",
          args,
          result,
        );
        (result as any).resourceUri = resourceUri;

        return result;
      }

      case "populate_diataxis_content": {
        const result = await handlePopulateDiataxisContent(args);
        // Store populated content info as resource
        const populationId = `population-${Date.now()}`;
        storeResource(
          `documcp://structure/${populationId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
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
        // Store update analysis as resource
        const updateId = `update-${Date.now()}`;
        storeResource(
          `documcp://analysis/${updateId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
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
        const result = await handleValidateDiataxisContent(args);
        // Store validation results as resource
        const validationId = `validation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${validationId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );

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
          resourceId: validationId,
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
        // Store validation results as resource
        const validationId = `content-validation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${validationId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );

        // Return structured validation results as JSON
        const contentSummary = {
          status: result.success ? "PASSED" : "ISSUES FOUND",
          summary: result.summary,
          linksChecked: result.linksChecked || 0,
          codeBlocksValidated: result.codeBlocksValidated || 0,
          brokenLinks: result.brokenLinks || [],
          codeErrors: (result.codeErrors || []).slice(0, 10), // Limit to first 10 errors
          recommendations: result.recommendations || [],
          resourceId: validationId,
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
        // Store gap analysis as resource
        const gapAnalysisId = `gaps-${Date.now()}`;
        storeResource(
          `documcp://analysis/${gapAnalysisId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return result;
      }

      case "test_local_deployment": {
        const result = await testLocalDeployment(args);
        // Store test results as resource
        const testId = `test-${args?.ssg || "unknown"}-${Date.now()}`;
        storeResource(
          `documcp://deployment/${testId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return result;
      }

      case "evaluate_readme_health": {
        const result = await evaluateReadmeHealth(args as any);
        // Store health evaluation as resource
        const healthId = `readme-health-${Date.now()}`;
        storeResource(
          `documcp://analysis/${healthId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return result;
      }

      case "readme_best_practices": {
        const result = await readmeBestPractices(args as any);
        // Store best practices analysis as resource
        const analysisId = `readme-best-practices-${Date.now()}`;
        storeResource(
          `documcp://analysis/${analysisId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return formatMCPResponse(result);
      }

      case "check_documentation_links": {
        const result = await checkDocumentationLinks(args as any);
        // Store link check results as resource
        const linkCheckId = `link-check-${Date.now()}`;
        storeResource(
          `documcp://analysis/${linkCheckId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return formatMCPResponse(result);
      }

      case "generate_readme_template": {
        const result = await generateReadmeTemplate(args as any);
        // Store generated template as resource
        const templateId = `readme-template-${Date.now()}`;
        storeResource(
          `documcp://template/${templateId}`,
          result.content,
          "text/markdown",
        );
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
        // Store validation report as resource
        const validationId = `readme-validation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${validationId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
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
        // Store analysis results as resource
        const analysisId = `readme-analysis-${Date.now()}`;
        storeResource(
          `documcp://analysis/${analysisId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
        return formatMCPResponse(result);
      }

      case "manage_preferences": {
        const result = await managePreferences(args);
        return result;
      }

      case "analyze_deployments": {
        const result = await analyzeDeployments(args);
        return result;
      }

      case "optimize_readme": {
        const result = await optimizeReadme(args as any);
        // Store optimization results as resource
        const optimizationId = `readme-optimization-${Date.now()}`;
        storeResource(
          `documcp://analysis/${optimizationId}`,
          JSON.stringify(result, null, 2),
          "application/json",
        );
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
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
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
