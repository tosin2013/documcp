---
id: llm-integration
title: LLM Integration (Removed in v0.6.0)
sidebar_label: LLM Integration (Removed)
sidebar_position: 10
---

:::danger Removed in v0.6.0

The server-side LLM client (`src/utils/llm-client.ts`) and the `simulate_execution` /
`batch_simulate_execution` MCP tools **have been removed** as of v0.6.0. This page
is kept for historical reference. See the [v0.6.0 migration guide](../development/v0.6.0-release-preview.md)
for the full migration path.

:::

# LLM Integration (Removed in v0.6.0)

Prior to v0.6.0, DocuMCP bundled a multi-provider LLM client that enabled
semantic analysis of code changes via DeepSeek, OpenAI, Anthropic, and
Ollama. This was misaligned with MCP best practice — the **host LLM** should
drive sampling, not the server.

## What Changed

| Area | v0.5.x | v0.6.0+ |
|------|--------|---------|
| `src/utils/llm-client.ts` | Present | **Deleted** |
| `src/utils/execution-simulator.ts` | Present | **Deleted** |
| `src/tools/simulate-execution.ts` | Present | **Deleted** |
| `simulate_execution` MCP tool | Available | **Removed** |
| `batch_simulate_execution` MCP tool | Available | **Removed** |
| `DOCUMCP_LLM_*` env vars | Recognized | **Deprecated** (ignored; removed in v0.7.0) |
| `SemanticAnalyzer.analysisMode` | `'llm'` / `'hybrid'` / `'ast'` | Always `'ast'` |

## Migration

### If you used `DOCUMCP_LLM_*` env vars

Simply remove them from your environment or MCP configuration. DocuMCP will
log a deprecation warning to stderr if it detects them.

### If you called `simulate_execution` or `batch_simulate_execution`

Remove the call from your host config. These tools no longer exist. For
LLM-driven code validation, implement the logic client-side using
[MCP Sampling](https://spec.modelcontextprotocol.io/specification/client/sampling/).

### If you imported `LLMClient` or `createLLMClient` directly

Vendor the file from the [`v0.5.x` tag](https://github.com/tosin2013/documcp/tree/v0.5.10/src/utils/llm-client.ts)
or migrate to MCP Sampling client-side.

### If you used `SemanticAnalyzer` with `useLLM: true`

The `useLLM`, `llmConfig`, and `includeASTFallback` constructor options are
now **deprecated and ignored**. Analysis is always AST-only. The
`analysisMode` field on `EnhancedSemanticAnalysis` is now always `'ast'` and
`llmAvailable` is always `false`.

## AST-Only Semantic Analysis

All semantic analysis now uses AST heuristics. The API remains identical
for the AST-only path:

```typescript
import { createSemanticAnalyzer } from "documcp/utils/semantic-analyzer.js";

const analyzer = createSemanticAnalyzer();
await analyzer.initialize();

const result = await analyzer.analyzeSemanticImpact(codeBefore, codeAfter, "myFunction");
// result.analysisMode === 'ast'
// result.llmAvailable === false
```

## Related

- [ADR-014: Removal of Server-Side LLM Dependency](../adrs/adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md)
- [v0.6.0 Release Preview & Migration Guide](../development/v0.6.0-release-preview.md)
