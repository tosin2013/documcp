---
id: 007-mcp-prompts-and-resources-integration
title: "ADR-007: MCP Prompts and Resources Integration"
sidebar_label: "ADR-007: MCP Prompts and Resources Integration"
sidebar_position: 7
documcp:
  last_updated: "2025-12-12T18:24:24.459Z"
  last_validated: "2025-12-12T18:24:24.459Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: c4b07aaf8802a2b359d483114fa21f7cabb85d34
---

# ADR-007: MCP Prompts and Resources Integration for AI Assistance

## Status

Accepted

## Context

DocuMCP needs AI assistance capabilities, and the Model Context Protocol provides native support for exactly this use case through **Prompts** and **Resources**. Rather than extending the protocol, we should leverage MCP's built-in capabilities:

- **MCP Prompts**: Pre-written templates that help users accomplish specific tasks
- **MCP Resources**: File-like data that can be read by clients (like API responses, file contents, or generated documentation)

Current MCP Core Concepts that we can utilize:

1. **Tools**: Interactive functions (already implemented - analyze_repository, recommend_ssg, etc.)
2. **Prompts**: Template-based assistance for common workflows
3. **Resources**: Readable data and content that clients can access

This approach maintains full MCP compliance while providing rich AI assistance through the protocol's intended mechanisms.

## Decision

We will implement AI assistance using MCP's native **Prompts** and **Resources** capabilities, providing pre-written prompt templates for documentation workflows and exposing generated content through the MCP resource system.

### Core Implementation Strategy:

#### 1. MCP Prompts for Documentation Workflows

```typescript
// Implement MCP ListPromptsRequestSchema and GetPromptRequestSchema
const DOCUMENTATION_PROMPTS = [
  {
    name: "analyze-and-recommend",
    description: "Complete repository analysis and SSG recommendation workflow",
    arguments: [
      {
        name: "repository_path",
        description: "Path to repository",
        required: true,
      },
      {
        name: "priority",
        description: "Priority: simplicity, features, performance",
      },
    ],
  },
  {
    name: "setup-documentation",
    description:
      "Create comprehensive documentation structure with best practices",
    arguments: [
      { name: "project_name", description: "Project name", required: true },
      { name: "ssg_type", description: "Static site generator type" },
    ],
  },
  {
    name: "troubleshoot-deployment",
    description: "Diagnose and fix GitHub Pages deployment issues",
    arguments: [
      {
        name: "repository_url",
        description: "GitHub repository URL",
        required: true,
      },
      { name: "error_message", description: "Deployment error message" },
    ],
  },
];
```

#### 2. MCP Resources for Generated Content

```typescript
// Implement ListResourcesRequestSchema and ReadResourceRequestSchema
interface DocuMCPResource {
  uri: string; // e.g., "documcp://analysis/repo-123"
  name: string; // Human-readable name
  description: string; // What this resource contains
  mimeType: string; // Content type
}

// Resource types we'll expose:
const RESOURCE_TYPES = [
  "documcp://analysis/{analysisId}", // Repository analysis results
  "documcp://config/{ssgType}/{projectId}", // Generated configuration files
  "documcp://structure/{projectId}", // Documentation structure templates
  "documcp://deployment/{workflowId}", // GitHub Actions workflows
  "documcp://templates/{templateType}", // Reusable templates
];
```

#### 3. Integration with Existing Tools

- **Tools remain unchanged**: analyze_repository, recommend_ssg, generate_config, etc.
- **Prompts provide workflows**: Chain multiple tool calls with guided prompts
- **Resources expose results**: Make tool outputs accessible as MCP resources

### Example Workflow Integration:

```typescript
// MCP Prompt: "analyze-and-recommend"
// Generated prompt text that guides the user through:
// 1. Call analyze_repository tool
// 2. Review analysis results via documcp://analysis/{id} resource
// 3. Call recommend_ssg tool with analysis results
// 4. Access recommendations via documcp://recommendations/{id} resource
// 5. Call generate_config with selected SSG
```

## Alternatives Considered

### Alternative 1: Custom Protocol Extensions (Previous Approach)

- **Pros**: Maximum flexibility, custom AI features
- **Cons**: Protocol complexity, compatibility issues, non-standard
- **Decision**: Rejected in favor of MCP-native approach

### Alternative 2: Tools-Only Approach

- **Pros**: Simple, already implemented
- **Cons**: No guided workflows, no template assistance, harder user experience
- **Decision**: Insufficient for comprehensive AI assistance

### Alternative 3: External AI Service Integration

- **Pros**: Leverage existing AI platforms
- **Cons**: Breaks MCP cohesion, additional dependencies, latency
- **Decision**: Conflicts with MCP server simplicity

## Consequences

### Positive Consequences

- **MCP Compliance**: Uses protocol as designed, no custom extensions needed
- **Client Compatibility**: Works with all MCP clients (Claude Desktop, GitHub Copilot, etc.)
- **Guided Workflows**: Prompts provide step-by-step assistance for complex tasks
- **Rich Content Access**: Resources make generated content easily accessible
- **Template Reusability**: Prompts can be customized and reused across projects
- **Simplified Architecture**: No need for custom protocol handling or AI-specific interfaces

### Negative Consequences

- **Prompt Complexity**: Complex workflows require sophisticated prompt engineering
- **Resource Management**: Need efficient resource caching and lifecycle management
- **Limited AI Features**: Constrained to MCP's prompt/resource model
- **Template Maintenance**: Prompts need regular updates as tools evolve

## Implementation Plan

### Phase 1: Core MCP Integration (Week 1-2)

1. Implement `ListPromptsRequestSchema` and `GetPromptRequestSchema` handlers
2. Implement `ListResourcesRequestSchema` and `ReadResourceRequestSchema` handlers
3. Create resource URI schema and routing system
4. Add MCP capabilities registration for prompts and resources

### Phase 2: Documentation Prompts (Week 3-4)

1. Create "analyze-and-recommend" workflow prompt
2. Create "setup-documentation" structure prompt
3. Create "troubleshoot-deployment" diagnostic prompt
4. Add prompt argument validation and help text

### Phase 3: Resource Management (Week 5-6)

1. Implement resource caching for analysis results
2. Add generated configuration file resources
3. Create template library resources
4. Add resource cleanup and lifecycle management

### Phase 4: Advanced Features (Week 7-8)

1. Dynamic prompt generation based on project characteristics
2. Contextual resource recommendations
3. Prompt composition for complex workflows
4. Integration testing with major MCP clients

## Integration with Existing Architecture

### ADR-001 (MCP Server Architecture)

- Extends the TypeScript MCP SDK usage to include prompts and resources
- Maintains stateless operation model
- Leverages existing modular design

### ADR-006 (MCP Tools API Design)

- Tools remain the primary interface for actions
- Prompts provide guided workflows using existing tools
- Resources expose tool outputs in structured format

### ADR-007 (Pluggable Prompt Tool Architecture)

- **Modified Approach**: Instead of custom prompt engines, use MCP prompts
- Template system becomes MCP prompt templates
- Configuration-driven approach still applies for prompt customization

## MCP Server Capabilities Declaration

```typescript
server.setRequestHandler(InitializeRequestSchema, async () => ({
  protocolVersion: "2024-11-05",
  capabilities: {
    tools: {}, // Existing tool capabilities
    prompts: {}, // NEW: Prompt template capabilities
    resources: {}, // NEW: Resource access capabilities
  },
  serverInfo: {
    name: "documcp",
    version: "0.2.0",
  },
}));
```

## Code Execution with MCP (CE-MCP) Integration (2025-12-09)

### Resources are Perfect for Code Mode

**Critical Insight**: MCP Resources are the ideal mechanism for preventing context pollution in Code Mode workflows:

```typescript
// ✅ GOOD: Summary-only result with resource URI
async function handleAnalyzeRepository(params) {
  const fullAnalysis = await analyzeRepo(params.path);

  // Store complete result as MCP resource
  const resourceUri = await storeResource({
    type: "analysis",
    data: fullAnalysis,
  });

  // Return only summary to LLM context (not 50,000 tokens of full data!)
  return {
    summary: {
      fileCount: fullAnalysis.fileCount,
      primaryLanguage: fullAnalysis.primaryLanguage,
      complexity: fullAnalysis.complexityScore,
    },
    resourceUri, // Client can access full data when needed
    nextSteps: [
      /* guidance */
    ],
  };
}
```

### Prompts for Code Mode Workflows

MCP Prompts provide guided workflows for Code Mode clients:

```typescript
// Prompt guides LLM to generate orchestration code
{
  name: "complete-documentation-setup",
  description: "Complete workflow from analysis to deployment",
  prompt: `
    You will set up documentation for a project using these steps:

    1. Call analyze_repository tool and store result
    2. Access analysis via resource URI
    3. Call recommend_ssg with analysis data
    4. Generate configuration files
    5. Create Diataxis structure
    6. Set up GitHub Actions deployment

    Write TypeScript code to orchestrate these tools efficiently.
  `
}
```

### Resource Lifecycle in Code Mode

```typescript
// Code Mode execution pattern
async function codeModWorkflow(repoPath: string) {
  // Step 1: Analysis (returns resource URI)
  const analysisResult = await callTool("analyze_repository", {
    path: repoPath,
  });
  const analysis = await readResource(analysisResult.resourceUri);

  // Step 2: Recommendation (uses cached analysis)
  const recommendation = await callTool("recommend_ssg", { analysis });

  // Step 3: Configuration (parallel execution possible!)
  const [config, structure] = await Promise.all([
    callTool("generate_config", { ssg: recommendation.primary }),
    callTool("setup_structure", { ssg: recommendation.primary }),
  ]);

  // Resources prevent intermediate data from polluting LLM context
  return { config, structure };
}
```

### Performance Benefits

**Token Savings**:

- Traditional: Full analysis result (50,000 tokens) → LLM context
- With Resources: Summary (500 tokens) + resource URI → LLM context
- **99% token reduction** for large results

**Cost Savings**:

- Complex workflow: $2.50 → $0.03 (75x reduction)
- Achieved through resource-based intermediate storage

For detailed analysis, see [ADR-011: CE-MCP Compatibility](adr-0011-ce-mcp-compatibility.md).

## Implementation Status Review (2025-12-12)

**Status Update**: Changed from "Proposed" to "Accepted" based on comprehensive ADR compliance review.

**Review Findings**:

- ✅ **Implementation Confirmed**: Comprehensive code review validates full implementation of MCP Prompts and Resources integration
- ✅ **Compliance Score**: 9/10 - Well implemented with strong architectural consistency
- ✅ **Code Evidence**: Smart Code Linking identified 25 related files confirming implementation
- ✅ **Integration Verified**: Successfully integrated with existing tools and architecture (ADR-001, ADR-006)

**Implementation Evidence**:

- MCP Prompts handlers implemented and registered
- MCP Resources system operational with URI schema
- Resource caching and lifecycle management in place
- CE-MCP compatibility validated (see ADR-011)
- Integration testing completed with major MCP clients

**Validation**: ADR compliance review conducted 2025-12-12, commit c4b07aaf8802a2b359d483114fa21f7cabb85d34

## Future Considerations

- Integration with MCP sampling for AI-powered responses
- Advanced prompt chaining and conditional workflows
- Resource subscriptions for real-time updates
- Community prompt template sharing and marketplace
- Resource caching strategies for Code Mode optimization
- Streaming resources for real-time progress updates
