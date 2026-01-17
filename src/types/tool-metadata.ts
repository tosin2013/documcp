/**
 * Tool Metadata for CE-MCP Compatibility (ADR-011)
 *
 * Provides categorization, complexity scoring, and token estimates
 * for optimal Code Mode orchestration and tool discovery.
 *
 * Reference: docs/adrs/adr-0011-ce-mcp-compatibility.md
 */

export type ToolCategory =
  | "analysis"
  | "generation"
  | "deployment"
  | "validation"
  | "optimization"
  | "memory"
  | "utility";

export type ToolComplexity = "simple" | "moderate" | "complex";

export interface ToolMetadata {
  /** Tool category for logical grouping */
  category: ToolCategory;

  /** Complexity level for orchestration planning */
  complexity: ToolComplexity;

  /** Estimated token usage for tool definition */
  estimatedTokens: number;

  /** Suggested use case for Code Mode prompts */
  suggestedUse: string;

  /** Typical execution time in milliseconds */
  typicalExecutionMs: number;

  /** Whether tool returns large results (should use resources) */
  returnsLargeResults: boolean;

  /** Dependencies on other tools */
  dependencies?: string[];

  /** Tools that commonly follow this one */
  commonFollowUps?: string[];

  /** Whether tool can be parallelized with others */
  parallelizable: boolean;
}

/**
 * Complete tool metadata registry for all documcp tools
 * Optimized for CE-MCP Code Mode workflows
 */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  // Analysis Tools
  analyze_repository: {
    category: "analysis",
    complexity: "moderate",
    estimatedTokens: 450,
    suggestedUse:
      "Initial project analysis for SSG recommendation and structure planning",
    typicalExecutionMs: 2000,
    returnsLargeResults: true,
    commonFollowUps: ["recommend_ssg", "detect_documentation_gaps"],
    parallelizable: true,
  },

  detect_documentation_gaps: {
    category: "analysis",
    complexity: "moderate",
    estimatedTokens: 380,
    suggestedUse: "Identify missing documentation after initial analysis",
    typicalExecutionMs: 1500,
    returnsLargeResults: true,
    dependencies: ["analyze_repository"],
    commonFollowUps: ["populate_diataxis_content"],
    parallelizable: true,
  },

  analyze_readme: {
    category: "analysis",
    complexity: "simple",
    estimatedTokens: 320,
    suggestedUse:
      "Comprehensive README analysis with optimization opportunities",
    typicalExecutionMs: 800,
    returnsLargeResults: false,
    commonFollowUps: ["optimize_readme", "generate_readme_template"],
    parallelizable: true,
  },

  evaluate_readme_health: {
    category: "analysis",
    complexity: "simple",
    estimatedTokens: 280,
    suggestedUse:
      "Community health and accessibility evaluation for README files",
    typicalExecutionMs: 600,
    returnsLargeResults: false,
    commonFollowUps: ["readme_best_practices"],
    parallelizable: true,
  },

  analyze_deployments: {
    category: "analysis",
    complexity: "moderate",
    estimatedTokens: 350,
    suggestedUse: "Historical deployment pattern analysis and insights",
    typicalExecutionMs: 1200,
    returnsLargeResults: true,
    parallelizable: true,
  },

  // Generation Tools
  recommend_ssg: {
    category: "generation",
    complexity: "moderate",
    estimatedTokens: 420,
    suggestedUse: "Intelligent SSG recommendation based on project analysis",
    typicalExecutionMs: 1000,
    returnsLargeResults: false,
    dependencies: ["analyze_repository"],
    commonFollowUps: ["generate_config", "setup_structure"],
    parallelizable: false,
  },

  generate_config: {
    category: "generation",
    complexity: "simple",
    estimatedTokens: 300,
    suggestedUse: "Generate SSG configuration files",
    typicalExecutionMs: 500,
    returnsLargeResults: false,
    dependencies: ["recommend_ssg"],
    commonFollowUps: ["setup_structure"],
    parallelizable: true,
  },

  setup_structure: {
    category: "generation",
    complexity: "moderate",
    estimatedTokens: 350,
    suggestedUse: "Create Diataxis documentation structure",
    typicalExecutionMs: 1500,
    returnsLargeResults: false,
    dependencies: ["recommend_ssg"],
    commonFollowUps: ["populate_diataxis_content"],
    parallelizable: true,
  },

  populate_diataxis_content: {
    category: "generation",
    complexity: "complex",
    estimatedTokens: 480,
    suggestedUse: "Generate comprehensive Diataxis documentation content",
    typicalExecutionMs: 3000,
    returnsLargeResults: true,
    dependencies: ["setup_structure", "analyze_repository"],
    commonFollowUps: ["validate_diataxis_content"],
    parallelizable: false,
  },

  generate_readme_template: {
    category: "generation",
    complexity: "simple",
    estimatedTokens: 340,
    suggestedUse: "Generate standardized README templates",
    typicalExecutionMs: 700,
    returnsLargeResults: false,
    parallelizable: true,
  },

  generate_contextual_content: {
    category: "generation",
    complexity: "complex",
    estimatedTokens: 420,
    suggestedUse: "Generate context-aware documentation using AST analysis",
    typicalExecutionMs: 2500,
    returnsLargeResults: true,
    parallelizable: true,
  },

  // Deployment Tools
  deploy_pages: {
    category: "deployment",
    complexity: "moderate",
    estimatedTokens: 380,
    suggestedUse: "Deploy documentation to GitHub Pages",
    typicalExecutionMs: 5000,
    returnsLargeResults: false,
    dependencies: ["setup_structure", "populate_diataxis_content"],
    commonFollowUps: ["verify_deployment"],
    parallelizable: false,
  },

  verify_deployment: {
    category: "deployment",
    complexity: "simple",
    estimatedTokens: 250,
    suggestedUse: "Verify successful GitHub Pages deployment",
    typicalExecutionMs: 2000,
    returnsLargeResults: false,
    dependencies: ["deploy_pages"],
    parallelizable: false,
  },

  test_local_deployment: {
    category: "deployment",
    complexity: "moderate",
    estimatedTokens: 320,
    suggestedUse: "Test documentation build locally before deployment",
    typicalExecutionMs: 8000,
    returnsLargeResults: false,
    commonFollowUps: ["deploy_pages"],
    parallelizable: false,
  },

  setup_playwright_tests: {
    category: "deployment",
    complexity: "moderate",
    estimatedTokens: 360,
    suggestedUse: "Set up automated deployment testing with Playwright",
    typicalExecutionMs: 1500,
    returnsLargeResults: false,
    parallelizable: true,
  },

  // Validation Tools
  validate_diataxis_content: {
    category: "validation",
    complexity: "complex",
    estimatedTokens: 450,
    suggestedUse: "Validate Diataxis documentation accuracy and compliance",
    typicalExecutionMs: 2500,
    returnsLargeResults: true,
    dependencies: ["populate_diataxis_content"],
    parallelizable: true,
  },

  validate_content: {
    category: "validation",
    complexity: "moderate",
    estimatedTokens: 340,
    suggestedUse: "General content validation: links, code syntax, references",
    typicalExecutionMs: 2000,
    returnsLargeResults: true,
    parallelizable: true,
  },

  check_documentation_links: {
    category: "validation",
    complexity: "moderate",
    estimatedTokens: 400,
    suggestedUse: "Comprehensive link checking for deployment readiness",
    typicalExecutionMs: 5000,
    returnsLargeResults: true,
    parallelizable: true,
  },

  validate_readme_checklist: {
    category: "validation",
    complexity: "simple",
    estimatedTokens: 310,
    suggestedUse: "Validate README against best practices checklist",
    typicalExecutionMs: 800,
    returnsLargeResults: false,
    parallelizable: true,
  },

  readme_best_practices: {
    category: "validation",
    complexity: "moderate",
    estimatedTokens: 380,
    suggestedUse:
      "Analyze README against best practices with template generation",
    typicalExecutionMs: 1200,
    returnsLargeResults: false,
    commonFollowUps: ["generate_readme_template"],
    parallelizable: true,
  },

  validate_documentation_freshness: {
    category: "validation",
    complexity: "simple",
    estimatedTokens: 290,
    suggestedUse: "Validate documentation freshness against thresholds",
    typicalExecutionMs: 1000,
    returnsLargeResults: false,
    dependencies: ["track_documentation_freshness"],
    parallelizable: true,
  },

  simulate_execution: {
    category: "validation",
    complexity: "complex",
    estimatedTokens: 520,
    suggestedUse: "Simulate code execution to validate documentation examples",
    typicalExecutionMs: 3000,
    returnsLargeResults: true,
    parallelizable: true,
  },

  batch_simulate_execution: {
    category: "validation",
    complexity: "complex",
    estimatedTokens: 480,
    suggestedUse: "Batch simulation of multiple code examples",
    typicalExecutionMs: 5000,
    returnsLargeResults: true,
    parallelizable: false,
  },

  // Optimization Tools
  optimize_readme: {
    category: "optimization",
    complexity: "moderate",
    estimatedTokens: 390,
    suggestedUse: "Optimize README by restructuring and extracting content",
    typicalExecutionMs: 1500,
    returnsLargeResults: false,
    dependencies: ["analyze_readme"],
    parallelizable: false,
  },

  update_existing_documentation: {
    category: "optimization",
    complexity: "complex",
    estimatedTokens: 460,
    suggestedUse:
      "Intelligently update existing documentation with memory insights",
    typicalExecutionMs: 2500,
    returnsLargeResults: true,
    dependencies: ["analyze_repository"],
    parallelizable: false,
  },

  sync_code_to_docs: {
    category: "optimization",
    complexity: "complex",
    estimatedTokens: 440,
    suggestedUse:
      "Synchronize documentation with code changes using AST analysis",
    typicalExecutionMs: 3000,
    returnsLargeResults: true,
    parallelizable: false,
  },

  track_documentation_freshness: {
    category: "optimization",
    complexity: "moderate",
    estimatedTokens: 370,
    suggestedUse: "Track documentation staleness with configurable thresholds",
    typicalExecutionMs: 1500,
    returnsLargeResults: true,
    commonFollowUps: ["validate_documentation_freshness"],
    parallelizable: true,
  },

  cleanup_agent_artifacts: {
    category: "optimization",
    complexity: "simple",
    estimatedTokens: 220,
    suggestedUse: "Clean up temporary agent artifacts and cache",
    typicalExecutionMs: 500,
    returnsLargeResults: false,
    parallelizable: true,
  },

  // Memory Tools
  remember_analysis: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 240,
    suggestedUse: "Store repository analysis in contextual memory",
    typicalExecutionMs: 300,
    returnsLargeResults: false,
    parallelizable: true,
  },

  remember_recommendation: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 230,
    suggestedUse: "Store SSG recommendation in contextual memory",
    typicalExecutionMs: 300,
    returnsLargeResults: false,
    parallelizable: true,
  },

  get_project_insights: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 260,
    suggestedUse: "Retrieve project insights from contextual memory",
    typicalExecutionMs: 400,
    returnsLargeResults: false,
    parallelizable: true,
  },

  get_similar_projects: {
    category: "memory",
    complexity: "moderate",
    estimatedTokens: 310,
    suggestedUse: "Find similar projects using semantic similarity",
    typicalExecutionMs: 800,
    returnsLargeResults: true,
    parallelizable: true,
  },

  get_memory_statistics: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 200,
    suggestedUse: "Get memory system statistics and health",
    typicalExecutionMs: 200,
    returnsLargeResults: false,
    parallelizable: true,
  },

  export_memories: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 220,
    suggestedUse: "Export memories for backup or analysis",
    typicalExecutionMs: 500,
    returnsLargeResults: true,
    parallelizable: true,
  },

  cleanup_old_memories: {
    category: "memory",
    complexity: "simple",
    estimatedTokens: 210,
    suggestedUse: "Clean up old memories based on retention policy",
    typicalExecutionMs: 600,
    returnsLargeResults: false,
    parallelizable: true,
  },

  // Utility Tools
  manage_preferences: {
    category: "utility",
    complexity: "simple",
    estimatedTokens: 330,
    suggestedUse: "Manage user preferences for documentation generation",
    typicalExecutionMs: 300,
    returnsLargeResults: false,
    parallelizable: true,
  },

  read_directory: {
    category: "utility",
    complexity: "simple",
    estimatedTokens: 180,
    suggestedUse: "List files and directories within allowed roots",
    typicalExecutionMs: 200,
    returnsLargeResults: false,
    parallelizable: true,
  },

  change_watcher: {
    category: "utility",
    complexity: "moderate",
    estimatedTokens: 350,
    suggestedUse: "Watch for file changes and trigger documentation updates",
    typicalExecutionMs: 1000,
    returnsLargeResults: false,
    parallelizable: false,
  },

  manage_sitemap: {
    category: "utility",
    complexity: "simple",
    estimatedTokens: 270,
    suggestedUse: "Generate and manage documentation sitemaps",
    typicalExecutionMs: 800,
    returnsLargeResults: false,
    parallelizable: true,
  },

  generate_llm_context: {
    category: "utility",
    complexity: "moderate",
    estimatedTokens: 320,
    suggestedUse: "Generate LLM-optimized context for documentation workflows",
    typicalExecutionMs: 600,
    returnsLargeResults: false,
    parallelizable: true,
  },
};

/**
 * Get metadata for a specific tool
 */
export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return TOOL_METADATA[toolName];
}

/**
 * Get all tools in a specific category
 */
export function getToolsByCategory(category: ToolCategory): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([name]) => name);
}

/**
 * Get tools by complexity level
 */
export function getToolsByComplexity(complexity: ToolComplexity): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([_, metadata]) => metadata.complexity === complexity)
    .map(([name]) => name);
}

/**
 * Get parallelizable tools for Code Mode optimization
 */
export function getParallelizableTools(): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([_, metadata]) => metadata.parallelizable)
    .map(([name]) => name);
}

/**
 * Get suggested workflow for a tool
 */
export function getSuggestedWorkflow(toolName: string): string[] {
  const metadata = TOOL_METADATA[toolName];
  if (!metadata) return [];

  const workflow: string[] = [];

  // Add dependencies first
  if (metadata.dependencies) {
    workflow.push(...metadata.dependencies);
  }

  // Add the tool itself
  workflow.push(toolName);

  // Add common follow-ups
  if (metadata.commonFollowUps) {
    workflow.push(...metadata.commonFollowUps);
  }

  return workflow;
}

/**
 * Calculate total estimated tokens for a workflow
 */
export function estimateWorkflowTokens(tools: string[]): number {
  return tools.reduce((total, toolName) => {
    const metadata = TOOL_METADATA[toolName];
    return total + (metadata?.estimatedTokens || 0);
  }, 0);
}

/**
 * Get tools that return large results (should use MCP resources)
 */
export function getLargeResultTools(): string[] {
  return Object.entries(TOOL_METADATA)
    .filter(([_, metadata]) => metadata.returnsLargeResults)
    .map(([name]) => name);
}
