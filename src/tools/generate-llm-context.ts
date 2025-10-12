import { formatMCPResponse } from "../types/api.js";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

// Dynamic import to avoid circular dependency
let cachedTools: any[] | null = null;

async function getToolDefinitions(): Promise<any[]> {
  if (cachedTools) return cachedTools;

  try {
    const indexModule = await import("../index.js");
    cachedTools = indexModule.TOOLS || [];
    return cachedTools;
  } catch (error) {
    console.warn("Could not load TOOLS from index.js:", error);
    return [];
  }
}

// Input schema for the tool
export const GenerateLLMContextInputSchema = z.object({
  projectPath: z
    .string()
    .describe(
      "Path to the project root directory where LLM_CONTEXT.md will be generated",
    ),
  includeExamples: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include usage examples for tools"),
  format: z
    .enum(["detailed", "concise"])
    .optional()
    .default("detailed")
    .describe("Level of detail in the generated context"),
});

export type GenerateLLMContextInput = z.infer<
  typeof GenerateLLMContextInputSchema
>;

/**
 * Set tool definitions for the context generator
 * This is called from src/index.ts when TOOLS array is initialized
 */
export function setToolDefinitions(tools: any[]) {
  cachedTools = tools;
}

export async function generateLLMContext(
  params: Partial<GenerateLLMContextInput>,
): Promise<any> {
  try {
    // Parse with defaults
    const validated = GenerateLLMContextInputSchema.parse(params);
    const { projectPath, includeExamples, format } = validated;

    // Always generate LLM_CONTEXT.md in the project root
    const outputPath = path.join(projectPath, "LLM_CONTEXT.md");

    // Get tool definitions dynamically
    const toolDefinitions = await getToolDefinitions();

    // Generate the context content
    const content = generateContextContent(
      includeExamples,
      format,
      toolDefinitions,
    );

    // Write the file
    await fs.writeFile(outputPath, content, "utf-8");

    const metadata = {
      toolVersion: "0.4.1",
      executionTime: 0,
      timestamp: new Date().toISOString(),
    };

    return formatMCPResponse({
      success: true,
      data: {
        message: `LLM context file generated successfully at ${outputPath}`,
        path: path.resolve(outputPath),
        stats: {
          totalTools: toolDefinitions.length,
          fileSize: Buffer.byteLength(content, "utf-8"),
          sections: [
            "Overview",
            "Core Tools",
            "README Tools",
            "Memory System",
            "Phase 3 Features",
            "Workflows",
            "Quick Reference",
          ],
        },
      },
      metadata,
      nextSteps: [
        {
          action:
            "Reference this file with @LLM_CONTEXT.md in your LLM conversations",
          priority: "high" as const,
        },
        {
          action: "Regenerate periodically when new tools are added",
          toolRequired: "generate_llm_context",
          priority: "low" as const,
        },
        {
          action: "Use this as a quick reference for DocuMCP capabilities",
          priority: "medium" as const,
        },
      ],
    });
  } catch (error: any) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "GENERATION_ERROR",
        message: `Failed to generate LLM context: ${error.message}`,
      },
      metadata: {
        toolVersion: "0.4.1",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function generateContextContent(
  includeExamples: boolean,
  format: "detailed" | "concise",
  toolDefinitions: any[],
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# DocuMCP LLM Context Reference
**Auto-generated**: ${new Date().toISOString()}

This file provides instant context about DocuMCP's tools and memory system for LLMs.
Reference this file with @ to get comprehensive context about available capabilities.

---
`);

  // Overview
  sections.push(`## Overview

DocuMCP is an intelligent MCP server for GitHub Pages documentation deployment with:
- **${toolDefinitions.length} Tools** for repository analysis, SSG recommendations, and deployment
- **Knowledge Graph** memory system tracking projects, technologies, and deployments
- **Phase 3 Features** including AST-based code analysis and drift detection
- **Diataxis Framework** compliance for documentation structure

---
`);

  // Categorize tools
  const coreTools = toolDefinitions.filter((t) =>
    [
      "analyze_repository",
      "recommend_ssg",
      "generate_config",
      "setup_structure",
      "deploy_pages",
      "verify_deployment",
      "populate_diataxis_content",
      "validate_diataxis_content",
      "update_existing_documentation",
    ].includes(t.name),
  );

  const readmeTools = toolDefinitions.filter((t) =>
    t.name.toLowerCase().includes("readme"),
  );

  const memoryTools = toolDefinitions.filter((t) =>
    ["manage_preferences", "analyze_deployments", "kg_health_check"].includes(
      t.name,
    ),
  );

  const phase3Tools = toolDefinitions.filter((t) =>
    ["sync_code_to_docs", "generate_contextual_content"].includes(t.name),
  );

  const otherTools = toolDefinitions.filter(
    (t) =>
      ![...coreTools, ...readmeTools, ...memoryTools, ...phase3Tools].some(
        (ct) => ct.name === t.name,
      ),
  );

  // Core Documentation Tools
  sections.push(`## Core Documentation Tools

These are the primary tools for analyzing repositories and deploying documentation:
`);

  for (const tool of coreTools) {
    sections.push(formatToolSection(tool, includeExamples, format));
  }

  // README Tools
  if (readmeTools.length > 0) {
    sections.push(`---

## README Analysis & Generation Tools

Specialized tools for README creation, analysis, and optimization:
`);

    for (const tool of readmeTools) {
      sections.push(formatToolSection(tool, includeExamples, format));
    }
  }

  // Phase 3 Tools
  if (phase3Tools.length > 0) {
    sections.push(`---

## Phase 3: Code-to-Docs Synchronization Tools

Advanced tools using AST analysis and drift detection:
`);

    for (const tool of phase3Tools) {
      sections.push(formatToolSection(tool, includeExamples, format));
    }
  }

  // Memory Tools
  if (memoryTools.length > 0) {
    sections.push(`---

## Memory & Analytics Tools

Tools for user preferences, deployment analytics, and knowledge graph management:
`);

    for (const tool of memoryTools) {
      sections.push(formatToolSection(tool, includeExamples, format));
    }
  }

  // Other Tools
  if (otherTools.length > 0) {
    sections.push(`---

## Additional Tools

${otherTools
  .map((t) => formatToolSection(t, includeExamples, format))
  .join("\n")}
`);
  }

  // Memory System
  sections.push(`---

## Memory Knowledge Graph System

DocuMCP includes a persistent memory system that learns from every analysis:

### Entity Types
- **Project**: Software projects with analysis history and metadata
- **User**: User preferences and SSG usage patterns
- **Configuration**: SSG deployment configurations with success rates
- **Documentation**: Documentation structures and patterns
- **CodeFile**: Source code files with metadata and change tracking
- **DocumentationSection**: Documentation sections linked to code
- **Technology**: Languages, frameworks, and tools used in projects

### Relationship Types
- \`project_uses_technology\`: Links projects to their tech stack
- \`user_prefers_ssg\`: Tracks user SSG preferences
- \`project_deployed_with\`: Records deployment configurations and outcomes
- \`similar_to\`: Identifies similar projects for better recommendations
- \`documents\`: Links code files to documentation sections
- \`outdated_for\`: Flags documentation that's out of sync with code
- \`depends_on\`: Tracks technology dependencies

### Storage Location
- Default: \`.documcp/memory/\`
- Files: \`knowledge-graph-entities.jsonl\`, \`knowledge-graph-relationships.jsonl\`
- Backups: \`.documcp/memory/backups/\`
- Snapshots: \`.documcp/snapshots/\` (for drift detection)

### Memory Benefits
1. **Context-Aware Recommendations**: Uses historical data to improve SSG suggestions
2. **Learning from Success**: Tracks which configurations work best
3. **Similar Project Insights**: Leverages patterns from similar projects
4. **Drift Detection**: Automatically identifies when docs are out of sync
5. **User Preferences**: Adapts to individual user patterns over time

---
`);

  // Phase 3 Features
  sections.push(`## Phase 3 Features (Code-to-Docs Sync)

### AST-Based Code Analysis
- Multi-language support: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, Bash
- Extracts functions, classes, interfaces, types, imports, exports
- Tracks complexity metrics and code signatures
- Detects semantic changes (not just text diffs)

### Drift Detection
- **Snapshot-based approach**: Stores code and documentation state over time
- **Impact analysis**: Categorizes changes (breaking, major, minor, patch)
- **Affected documentation tracking**: Links code changes to specific docs
- **Automatic suggestions**: Generates update recommendations

### Drift Types Detected
- **Outdated**: Documentation references old API signatures
- **Incorrect**: Documented features no longer exist in code
- **Missing**: New code features lack documentation
- **Breaking**: API changes that invalidate existing docs

### Sync Modes
- \`detect\`: Analyze drift without making changes
- \`preview\`: Show proposed changes
- \`apply\`: Apply high-confidence changes automatically (threshold: 0.8)
- \`auto\`: Apply all changes (use with caution)

---
`);

  // Workflows
  sections.push(`## Common Workflows

### 1. New Documentation Site Setup
\`\`\`
1. analyze_repository (path: "./")
2. recommend_ssg (analysisId: from step 1)
3. generate_config (ssg: from step 2, outputPath: "./")
4. setup_structure (path: "./docs", ssg: from step 2)
5. populate_diataxis_content (analysisId: from step 1, docsPath: "./docs")
6. deploy_pages (repository: repo-url, ssg: from step 2)
\`\`\`

### 2. Documentation Synchronization (Phase 3)
\`\`\`
1. sync_code_to_docs (projectPath: "./", docsPath: "./docs", mode: "detect")
2. Review drift report and affected sections
3. sync_code_to_docs (mode: "apply", autoApplyThreshold: 0.8)
4. Manual review of remaining changes
\`\`\`

### 3. Content Generation from Code
\`\`\`
1. generate_contextual_content (filePath: "./src/api.ts", documentationType: "reference")
2. generate_contextual_content (filePath: "./src/api.ts", documentationType: "tutorial")
3. Review and integrate generated content
\`\`\`

### 4. Existing Documentation Improvement
\`\`\`
1. analyze_repository (path: "./")
2. update_existing_documentation (analysisId: from step 1, docsPath: "./docs")
3. validate_diataxis_content (contentPath: "./docs", analysisId: from step 1)
4. check_documentation_links (documentation_path: "./docs")
\`\`\`

### 5. README Enhancement
\`\`\`
1. analyze_readme (project_path: "./")
2. evaluate_readme_health (readme_path: "./README.md")
3. readme_best_practices (readme_path: "./README.md", generate_template: true)
4. optimize_readme (readme_path: "./README.md")
\`\`\`

---
`);

  // Quick Reference
  sections.push(`## Quick Reference Table

| Tool | Primary Use | Key Parameters | Output |
|------|-------------|----------------|--------|
${coreTools
  .map(
    (t) =>
      `| \`${t.name}\` | ${t.description.slice(0, 50)}... | ${getKeyParams(
        t,
      )} | Analysis/Config |`,
  )
  .join("\n")}

---

## Tips for LLMs

1. **Always start with \`analyze_repository\`** to get project context
2. **Use the knowledge graph**: Tools automatically store and retrieve relevant history
3. **Phase 3 tools need setup**: Ensure project has code structure before running sync
4. **Memory persists**: The system learns from every interaction
5. **Workflows are composable**: Chain tools together for complex operations
6. **Permission-aware**: All tools respect MCP root permissions

---

## Storage Locations to Reference

- **Memory**: \`.documcp/memory/\`
- **Snapshots**: \`.documcp/snapshots/\`
- **Knowledge Graph Entities**: \`.documcp/memory/knowledge-graph-entities.jsonl\`
- **Knowledge Graph Relationships**: \`.documcp/memory/knowledge-graph-relationships.jsonl\`
- **User Preferences**: Stored in knowledge graph with \`user_prefers_ssg\` edges

---

*This file is auto-generated. To regenerate, use the \`generate_llm_context\` tool.*
`);

  return sections.join("\n");
}

function formatToolSection(
  tool: any,
  includeExamples: boolean,
  format: "detailed" | "concise",
): string {
  const sections: string[] = [];

  sections.push(`### \`${tool.name}\``);
  sections.push(`**Description**: ${tool.description}`);

  if (format === "detailed" && tool.inputSchema) {
    sections.push("\n**Parameters**:");
    const schema = tool.inputSchema._def?.schema || tool.inputSchema;

    if (schema.shape) {
      for (const [key, value] of Object.entries(schema.shape)) {
        const field = value as any;
        const optional = field.isOptional() ? " (optional)" : " (required)";
        const description = field.description || "";
        const defaultVal = field._def.defaultValue
          ? ` [default: ${JSON.stringify(field._def.defaultValue())}]`
          : "";

        sections.push(`- \`${key}\`${optional}: ${description}${defaultVal}`);
      }
    }
  }

  if (includeExamples && format === "detailed") {
    const example = getToolExample(tool.name);
    if (example) {
      sections.push(`\n**Example**:\n\`\`\`typescript\n${example}\n\`\`\``);
    }
  }

  sections.push(""); // blank line
  return sections.join("\n");
}

function getKeyParams(tool: any): string {
  const schema = tool.inputSchema._def?.schema || tool.inputSchema;
  if (!schema.shape) return "N/A";

  const required = Object.entries(schema.shape)
    .filter(([_, value]) => !(value as any).isOptional())
    .map(([key]) => key)
    .slice(0, 3);

  return required.join(", ") || "N/A";
}

function getToolExample(toolName: string): string | null {
  const examples: Record<string, string> = {
    analyze_repository: `analyze_repository({
  path: "./",
  depth: "standard"
})`,
    recommend_ssg: `recommend_ssg({
  analysisId: "repo_abc123",
  userId: "default",
  preferences: {
    priority: "simplicity",
    ecosystem: "javascript"
  }
})`,
    sync_code_to_docs: `sync_code_to_docs({
  projectPath: "./",
  docsPath: "./docs",
  mode: "detect",
  createSnapshot: true
})`,
    generate_contextual_content: `generate_contextual_content({
  filePath: "./src/api.ts",
  documentationType: "reference",
  includeExamples: true,
  style: "detailed"
})`,
    deploy_pages: `deploy_pages({
  repository: "user/repo",
  ssg: "docusaurus",
  branch: "gh-pages",
  userId: "default"
})`,
  };

  return examples[toolName] || null;
}
