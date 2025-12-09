---
id: 011-ce-mcp-compatibility
title: "ADR-011: Code Execution with MCP (CE-MCP) Compatibility"
sidebar_label: "ADR-011: CE-MCP Compatibility"
sidebar_position: 11
documcp:
  last_updated: "2025-12-09T18:50:00.000Z"
  last_validated: "2025-12-09T19:18:14.163Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# ADR-011: Code Execution with MCP (CE-MCP) Compatibility

## Status

Accepted

## Context

The Model Context Protocol (MCP) ecosystem has evolved to support a new paradigm called **Code Execution with MCP (CE-MCP)** or **Code Mode**. This paradigm addresses the scalability crisis of traditional direct tool-calling by enabling LLMs to generate orchestration code that executes in secure sandboxes, achieving:

- **98.7% token reduction** for complex workflows
- **75x cost reduction** in API expenses
- **60% faster execution** through parallel operations
- **19.2% fewer API calls** via direct orchestration

### The Scalability Crisis of Direct Tool-Calling

Traditional MCP implementations suffer from:

1. **Tool Definition Overload**: Loading all tool definitions into context upfront (20,000+ tokens)
2. **Intermediate Result Bloat**: Full tool outputs fed back into context (50,000+ tokens for large files)
3. **Sequential Latency**: High-latency roundtrips for each tool call
4. **Cost Explosion**: ~27.5% cost increase to achieve 100% reliability

### The CE-MCP Solution

Code Mode transforms the LLM's role from sequential planner to code generator:

1. **Dynamic Tool Discovery**: Tools discovered on-demand via filesystem navigation
2. **Code Generation**: LLM writes complete orchestration scripts (TypeScript/Python)
3. **Sandboxed Execution**: Code runs in isolated environment (Docker, isolates)
4. **Summary Return**: Only final results return to context (not intermediate data)

**Critical Insight**: This is **client-side functionality**. MCP servers provide tools; clients handle code generation, sandboxing, and execution.

## Decision

**documcp is already CE-MCP compatible** without requiring architectural changes. Our existing stateless, tool-based architecture aligns perfectly with Code Mode requirements.

### Compatibility Validation

| CE-MCP Requirement            | documcp Implementation              | Status        |
| ----------------------------- | ----------------------------------- | ------------- |
| Standard MCP protocol         | TypeScript SDK, JSON-RPC            | ✅ Compatible |
| Tool definitions with schemas | Zod-validated, comprehensive docs   | ✅ Compatible |
| Stateless operation           | No session state (ADR-001)          | ✅ Compatible |
| Composable tools              | 25+ independent tools (ADR-006)     | ✅ Compatible |
| Resource system               | MCP resources for results (ADR-007) | ✅ Compatible |

### What documcp Provides (Server-Side)

```typescript
// documcp exposes tools via standard MCP protocol
const tools = [
  {
    name: "analyze_repository",
    description: "Comprehensive repository analysis...",
    inputSchema: {
      /* Zod-validated schema */
    },
  },
  {
    name: "recommend_ssg",
    description: "Intelligent SSG recommendation...",
    inputSchema: {
      /* Zod-validated schema */
    },
  },
  // ... 23+ more tools
];
```

### What Code Mode Clients Handle (Client-Side)

- **Tool Discovery**: Client converts tool definitions → filesystem structure
- **Code Generation**: LLM writes orchestration code using tool APIs
- **Sandboxing**: Client executes code in secure isolates/containers
- **Security**: AgentBound-style frameworks enforce least-privilege
- **Summary Filtering**: Client returns only final results to LLM

## Alternatives Considered

### Alternative 1: Implement Server-Side Code Generation

- **Pros**: Full control over code generation and execution
- **Cons**: Duplicates client functionality, security complexity, not standard
- **Decision**: Rejected - CE-MCP is a client-side pattern

### Alternative 2: Custom Tool Organization System

- **Pros**: Could optimize for specific client implementations
- **Cons**: Breaks MCP compatibility, client-specific customizations
- **Decision**: Rejected - standard MCP protocol works universally

### Alternative 3: Embedded Sandbox in Server

- **Pros**: Control over execution environment
- **Cons**: Massive security risk, deployment complexity, violates separation of concerns
- **Decision**: Rejected - sandboxing belongs in the client

## Consequences

### Positive

- **Zero Migration Cost**: No architectural changes required
- **Universal Compatibility**: Works with all CE-MCP clients (Claude Code, pctx, Cloudflare)
- **Future-Proof**: Architecture naturally supports Code Mode evolution
- **Validated Design**: ADR-001, ADR-006, ADR-007 decisions proven correct
- **Performance Gains**: Users automatically benefit from client-side optimizations

### Negative

- **Optimization Opportunities**: Could enhance UX with optional improvements
- **Client Dependency**: Performance relies on client implementation quality
- **Documentation Gap**: Need to document Code Mode best practices

### Risks and Mitigations

| Risk                         | Mitigation                                            |
| ---------------------------- | ----------------------------------------------------- |
| Poor client implementations  | Document best practices, provide examples             |
| Tool description bloat       | Optimize descriptions for token efficiency (optional) |
| Resource management overhead | Implement efficient caching and cleanup               |

## Implementation Details

### SDK Upgrade

PR #69 upgraded MCP SDK from v0.6.0 → v1.24.0, bringing:

- **Tasks API (SEP-1686)**: Long-running agent operations
- **Better SSE handling**: Improved streaming
- **OAuth enhancements**: Client credentials flow
- **Type safety**: Zod V4 compatibility

### Testing Validation

```bash
npm run ci
# ✅ All tests pass: 91.67% coverage
# ✅ TypeScript compilation successful
# ✅ No breaking changes detected
```

### Tool Definition Best Practices for Code Mode

```typescript
// ✅ GOOD: Concise, focused tool descriptions
const goodTool = {
  name: "analyze_repository",
  description: "Analyze project structure, languages, and documentation",
  inputSchema: analyzeRepositorySchema,
};

// ❌ AVOID: Overly verbose descriptions that bloat tokens
const verboseTool = {
  name: "analyze_repository",
  description:
    "This tool performs a comprehensive multi-layered analysis of your repository including but not limited to project structure evaluation, language ecosystem detection, existing documentation assessment, complexity scoring, and detailed metadata extraction for the purpose of providing intelligent recommendations...",
  // ... excessive verbosity
};
```

### Resource Usage for Summary-Only Results

```typescript
// Leverage MCP resources to prevent context pollution
async function handleAnalyzeRepository(params) {
  const analysis = await analyzeRepo(params.path);

  // Store full result as MCP resource
  const resourceId = await storeResource(analysis);

  // Return only summary to LLM context
  return {
    summary: `Analysis complete: ${analysis.fileCount} files, ${analysis.primaryLanguage}`,
    resourceUri: `documcp://analysis/${resourceId}`,
    // Full analysis accessible via resource, not in context
  };
}
```

## Optional Optimizations

While not required, these enhancements improve Code Mode UX:

### 1. Tool Categorization Metadata

```typescript
interface ToolMetadata {
  category: "analysis" | "generation" | "deployment" | "validation";
  complexity: "simple" | "moderate" | "complex";
  estimatedTokens: number;
  suggestedUse: string;
}
```

### 2. Concise Descriptions

Audit and optimize tool descriptions for token efficiency while maintaining clarity.

### 3. Result Summarization

Implement smart summarization for large outputs:

```typescript
function summarizeResult(result: LargeResult): Summary {
  if (result.size > 10_000) {
    return {
      summary: extractKeyMetrics(result),
      details: "Full result available via resource URI",
      resourceUri: storeAsResource(result),
    };
  }
  return result; // Small results returned directly
}
```

### 4. MCP Tasks Integration

For long-running operations (e.g., full repository analysis):

```typescript
// Use new Tasks API from MCP SDK 1.24.0
server.setRequestHandler(CreateTaskRequestSchema, async (request) => {
  const taskId = generateTaskId();

  // Start long-running analysis
  executeInBackground(async () => {
    const result = await deepAnalysis(request.params);
    await completeTask(taskId, result);
  });

  return { taskId };
});
```

## Integration with Existing ADRs

### ADR-001 (MCP Server Architecture)

**Validation**: Stateless design is perfect for Code Mode workflows.

**Update**: Add note about CE-MCP compatibility validation.

### ADR-006 (MCP Tools API Design)

**Validation**: Modular, composable tools align with code orchestration needs.

**Update**: Add recommendations for tool description optimization.

### ADR-007 (MCP Prompts and Resources)

**Validation**: Resources are ideal for summary-only result filtering.

**Update**: Emphasize resource usage for Code Mode efficiency.

## Testing Strategy

### Compatibility Testing

```typescript
describe("CE-MCP Compatibility", () => {
  it("should provide standard MCP tool definitions", () => {
    const tools = server.listTools();
    expect(tools).toMatchSnapshot();
  });

  it("should support resource-based result access", async () => {
    const result = await server.callTool("analyze_repository", params);
    expect(result).toHaveProperty("resourceUri");
  });

  it("should return concise summaries for large results", async () => {
    const result = await server.callTool("detect_gaps", params);
    expect(result.summary.length).toBeLessThan(1000);
  });
});
```

### Client Integration Testing

Test with actual Code Mode clients:

- **Claude Code**: Anthropic's CLI with built-in Code Mode
- **pctx**: Open-source self-hostable Code Mode framework
- **Cloudflare Workers AI**: Production Code Mode implementation

## Documentation Requirements

### For Users

- **CE-MCP Usage Guide**: How to use documcp with Code Mode clients
- **Example Workflows**: TypeScript/Python code examples
- **Performance Benchmarks**: Token savings and cost comparisons

### For Developers

- **Tool Design Guidelines**: Best practices for Code Mode compatibility
- **Resource Management**: Efficient resource lifecycle patterns
- **Testing Patterns**: Validating Code Mode compatibility

## Future Considerations

### Monitoring and Observability

- Track token usage patterns in Code Mode vs direct tool-calling
- Measure performance improvements in real-world workflows
- Identify optimization opportunities based on usage data

### Community Feedback

- Gather feedback from Code Mode client developers
- Iterate on tool descriptions based on real-world usage
- Contribute improvements back to MCP ecosystem

### Advanced Features

- **Streaming Results**: For real-time progress updates
- **Parallel Tool Execution**: Coordinate multi-tool workflows
- **Result Caching**: Intelligent caching strategies for repeated operations

## References

- [Anthropic: Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Cloudflare: Code Mode - The Better Way to Use MCP](https://blog.cloudflare.com/code-mode/)
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP SDK 1.24.0 Release Notes](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/1.24.0)
- [CE-MCP Research Findings](../CE-MCP-FINDINGS.md)

## Conclusion

documcp's architecture is inherently compatible with Code Execution with MCP (CE-MCP). The stateless, tool-based design aligns perfectly with Code Mode requirements, requiring no architectural changes. Our focus should shift to:

1. **Testing** with Code Mode clients to validate real-world usage
2. **Documentation** to guide users in Code Mode workflows
3. **Optional optimizations** to enhance user experience

The CE-MCP paradigm validates our architectural decisions and positions documcp as a best-in-class MCP server for documentation automation workflows.
