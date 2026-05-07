---
id: adr-14-removal-of-server-side-llm-dependency
title: "ADR-014: Removal of Server-Side LLM Dependency in Favor of MCP Sampling"
sidebar_label: "ADR-014: Server-Side LLM Removal"
sidebar_position: 14
documcp:
  last_updated: "2026-04-30T00:00:00.000Z"
  last_validated: "2026-04-30T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: TBD
status: accepted
date: "2026-04-30"
---

# ADR-014: Removal of Server-Side LLM Dependency in Favor of MCP Sampling

## Status

Accepted (proposed 2026-04-30; supersedes Phase 2.5 of ADR-009)

## Date

2026-04-30

## Context

DocuMCP currently bundles a multi-provider LLM client (`src/utils/llm-client.ts`, ~369 LOC) that is called from `src/utils/semantic-analyzer.ts` and `src/tools/simulate-execution.ts` to enable hybrid semantic code analysis. This was introduced in v0.5.3 (Phase 2.5 of [ADR-009](./adr-0009-content-accuracy-validation-framework.md), commit `f7b6fcd`) to support DeepSeek, OpenAI, Anthropic, and Ollama as providers behind the same interface.

This is misaligned with current MCP best practice as documented in [docs/CE-MCP-FINDINGS.md](../CE-MCP-FINDINGS.md): MCP **clients** are the correct execution layer for LLM calls, not servers. Bundling an LLM client inside a server creates five concrete problems:

1. **Duplicated trust boundary.** The host already has an LLM relationship governed by the user's policies, quotas, and consent. A second, server-internal LLM bypasses that boundary.
2. **Unauthorized data egress.** User code is forwarded to third-party APIs (DeepSeek, OpenAI, Anthropic) that the host did not authorize. The server-side client makes this default, not opt-in.
3. **Parallel configuration surface.** `DOCUMCP_LLM_PROVIDER`, `DOCUMCP_LLM_API_KEY`, `DOCUMCP_LLM_MODEL`, and `DOCUMCP_LLM_BASE_URL` are env vars users must learn, set, and rotate independently of their host's API keys.
4. **Dual cost streams.** A single user session can incur LLM charges on both the host's account and on whatever provider is configured server-side, with no unified visibility.
5. **Non-deterministic test baseline.** Hybrid mode is the default analysis path, which makes deterministic AST tests harder to author and makes regressions harder to attribute.

Adoption signals from the documcp Knowledge Graph show zero deployments that opted into hybrid mode in production, suggesting the feature primarily adds risk without measurable benefit.

The issue set [#106](https://github.com/tosin2013/documcp/issues/106)–[#110](https://github.com/tosin2013/documcp/issues/110), filed 2026-04-30, is opened against this decision: #106 is the umbrella epic; #107 deletes the LLM client; #108 collapses `semantic-analyzer.ts` to AST-only; #109 removes the `simulate_execution` tool and `execution-simulator` utility; #110 updates the documentation surface.

## Decision

Remove the bundled LLM client and all server-side LLM execution paths from DocuMCP. Specifically:

1. **Delete** `src/utils/llm-client.ts`, `src/utils/execution-simulator.ts`, `src/tools/simulate-execution.ts`, `tests/utils/llm-client.test.ts`, and the `docs/how-to/llm-integration.md` how-to.
2. **Refactor** `src/utils/semantic-analyzer.ts` to AST-only mode: remove `useLLM`, `confidenceThreshold`, and `llmConfig` options from `createSemanticAnalyzer()`; `analysisMode` always returns `'ast'`; the `SemanticAnalyzer` public API stays compatible where reasonable.
3. **Drop** `DOCUMCP_LLM_PROVIDER`, `DOCUMCP_LLM_API_KEY`, `DOCUMCP_LLM_MODEL`, and `DOCUMCP_LLM_BASE_URL` parsing from `src/index.ts`. Emit a one-version deprecation warning before deleting the parsing logic to give downstream users a clear signal.
4. **Remove** the `simulate_execution` tool entry from the `TOOLS` array and `CallToolRequestSchema` switch in `src/index.ts`.
5. **Mark** Phase 2.5 of ADR-009 as **Superseded** by this ADR. The rest of ADR-009 (the broader content-accuracy framework) remains Accepted.
6. **Defer** any future LLM-driven semantic analysis to **MCP Sampling**. When DocuMCP genuinely needs an LLM completion (for example, context-aware example generation that AST cannot reach), it will issue a `sampling/createMessage` request through the host so the host's LLM, policy, and quotas apply uniformly.
7. **Ship** under semver as **v0.6.0** with a `BREAKING CHANGE:` footer in [CHANGELOG.md](https://github.com/tosin2013/documcp/blob/main/CHANGELOG.md) and a clear migration note for hybrid-mode users.

## Alternatives Considered

### Keep the LLM client but mark it deprecated and feature-flag-off by default

- **Pros**: Lowest immediate disruption; preserves a code path that can be revived if Sampling proves inadequate.
- **Cons**: The code path still exists, still requires maintenance whenever any provider's API drifts, and still creates a tempting non-Sampling shortcut for future contributors. The cost of keeping it dormant exceeds the cost of removing and re-implementing via Sampling later if needed.
- **Decision**: Rejected.

### Migrate the LLM client to use MCP Sampling immediately

- **Pros**: Preserves the user-visible feature; aligns with MCP best practice without a feature gap.
- **Cons**: Sampling support is uneven across MCP hosts in 2026 — Claude Desktop has it; several other clients do not. Shipping a feature that silently degrades on hosts without Sampling is worse than removing it cleanly.
- **Decision**: Rejected for v0.6.0; revisit when host coverage is broad.

### Restrict hybrid mode to Ollama only (local-only)

- **Pros**: Solves the privacy concern by keeping inference on the user's machine.
- **Cons**: Still maintains the multi-provider client codebase; still requires per-OS Ollama setup documentation; still leaves `DOCUMCP_LLM_BASE_URL` as an env-var surface. Marginal benefit, full cost.
- **Decision**: Rejected.

### Keep the client; document privacy implications loudly; let users opt in

- **Pros**: Avoids the breaking change; lets sophisticated users self-select.
- **Cons**: "Opt-in privacy" is widely understood to be an antipattern. Aligns poorly with the MCP best-practice direction documented in [CE-MCP-FINDINGS.md](../CE-MCP-FINDINGS.md).
- **Decision**: Rejected.

## Consequences

### Positive

- **Smaller surface.** ~1,378 LOC removed across four source files plus tests.
- **Simpler deployment.** No LLM env vars to set, rotate, or document.
- **Stronger privacy default.** No automatic data egress to third-party LLM providers.
- **Reduced maintenance burden.** One fewer multi-provider client to track for breaking API changes.
- **Cleaner test baseline.** Deterministic AST analysis only.
- **Architectural alignment.** Aligns DocuMCP with MCP best practice as documented in CE-MCP-FINDINGS and reinforced by [ADR-011](./adr-0011-ce-mcp-compatibility.md).

### Negative

- `simulate_execution` and hybrid semantic analysis are no longer available. Users who relied on them must implement their own host-side workflow or wait for the MCP Sampling integration.
- A subset of behavioral-change detection (semantic, beyond AST diffs) is lost in v0.6.0.

### Risks and Mitigations

- **Risk**: External orchestrators that import `documcp` programmatically and depend on `LLMClient` or `SemanticAnalyzer`'s hybrid mode will break.
  **Mitigation**: The v0.6.0 `BREAKING CHANGE:` tag, a one-minor-version deprecation-warning grace period, and a CHANGELOG migration section for hybrid-mode consumers.
- **Risk**: Loss of behavioral-change detection beyond AST-level diffs.
  **Mitigation**: Continued investment in AST analysis (see [ADR-015](./adr-0015-multi-language-ast-analysis-via-tree-sitter-parser-registry.md)) and an open path to MCP Sampling for cases that genuinely need LLM reasoning.
- **Risk**: The DocuMCP Orchestrator (external repo) must update to either drop hybrid mode or implement Sampling client-side.
  **Mitigation**: Flagged as an integration item; out of scope for this ADR but tracked separately.

## Implementation Tracking

This ADR is implemented by the following GitHub issues, all in milestone **v0.6.0 — LLM Removal**:

- [#106 Epic: Remove server-side LLM dependency from DocuMCP](https://github.com/tosin2013/documcp/issues/106)
- [#107 Delete LLM client and provider configuration](https://github.com/tosin2013/documcp/issues/107)
- [#108 Refactor semantic-analyzer to AST-only mode](https://github.com/tosin2013/documcp/issues/108)
- [#109 Remove simulate_execution tool and execution-simulator utility](https://github.com/tosin2013/documcp/issues/109)
- [#110 Update ADR-009 and remove LLM how-to documentation](https://github.com/tosin2013/documcp/issues/110)

## Evidence

- [docs/CE-MCP-FINDINGS.md](../CE-MCP-FINDINGS.md) (2025-12-09): documents that MCP clients, not servers, are the correct LLM execution layer.
- `src/utils/llm-client.ts`: 369 LOC of multi-provider client logic spanning DeepSeek, OpenAI, Anthropic, and Ollama; each provider's API surface drifts independently.
- `src/utils/semantic-analyzer.ts`: 456 LOC that branches on `llm`/`ast`/`hybrid` modes; the hybrid path is the default and complicates the test baseline.
- `src/tools/simulate-execution.ts`: 553 LOC of LLM-based code tracing that cannot be made deterministic without a server-side LLM.
- `docs/how-to/llm-integration.md`: documents the `DOCUMCP_LLM_*` env-var surface that this ADR removes.
- GitHub issues [#106](https://github.com/tosin2013/documcp/issues/106)–[#110](https://github.com/tosin2013/documcp/issues/110) (filed 2026-04-30): the concrete implementation tracking.
- [MCP specification 2025-06-18, `sampling/createMessage`](https://modelcontextprotocol.io/specification/2025-06-18): defines the host-side completion request flow that replaces server-side LLM calls when needed.

## Related Decisions

- [ADR-009: Content Accuracy and Validation Framework](./adr-0009-content-accuracy-validation-framework.md) (Phase 2.5 superseded by this ADR; rest remains Accepted)
- [ADR-011: CE-MCP Compatibility](./adr-0011-ce-mcp-compatibility.md)
- [ADR-015: Multi-Language AST Analysis Strategy](./adr-0015-multi-language-ast-analysis-via-tree-sitter-parser-registry.md) (compensates for the loss of LLM-driven semantic detection)
