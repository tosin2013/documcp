---
id: adr-15-multi-language-ast-analysis
title: "ADR-015: Multi-Language AST Analysis via Tree-sitter Parser Registry"
sidebar_label: "ADR-015: Multi-Language AST"
sidebar_position: 15
documcp:
  last_updated: "2026-04-30T00:00:00.000Z"
  last_validated: "2026-04-30T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: TBD
status: accepted
date: "2026-04-30"
---

# ADR-015: Multi-Language AST Analysis via Tree-sitter Parser Registry

## Status

Accepted (proposed 2026-04-30; extends [ADR-002](./adr-0002-repository-analysis-engine.md))

## Date

2026-04-30

## Context

[ADR-002](./adr-0002-repository-analysis-engine.md) establishes a multi-layered repository analysis engine. In practice, `src/utils/ast-analyzer.ts` only fully exercises TypeScript and JavaScript via `@typescript-eslint/typescript-estree`, even though `package.json` declares `tree-sitter-python`, `tree-sitter-go`, `tree-sitter-rust`, `tree-sitter-java`, `tree-sitter-ruby`, `tree-sitter-bash`, and `tree-sitter-yaml` as runtime dependencies. CLAUDE.md explicitly flags this gap: _"Tree-sitter initialization currently simplified (focuses on TypeScript/JavaScript)"_.

Drift detection on polyglot repos is therefore unreliable, and a key promise of the project (cross-language documentation drift) is not actually delivered for non-TS/JS code. Compounding this, [ADR-014](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md) removes the LLM-based semantic analyzer that previously masked some of this gap, so the AST layer now needs to carry the full weight of language coverage. Issue [#112](https://github.com/tosin2013/documcp/issues/112) tracks the implementation work.

## Decision

Adopt a **lazy-loaded parser registry pattern**.

1. Define a `ParserRegistry` type in `src/utils/ast-analyzer.ts` mapping file extensions to factory functions returning a tree-sitter `Parser` instance:

   ```ts
   const registry: ParserRegistry = {
     ".py": () => loadParser("tree-sitter-python"),
     ".go": () => loadParser("tree-sitter-go"),
     ".rs": () => loadParser("tree-sitter-rust"),
     ".java": () => loadParser("tree-sitter-java"),
     ".rb": () => loadParser("tree-sitter-ruby"),
     ".sh": () => loadParser("tree-sitter-bash"),
     ".yaml": () => loadParser("tree-sitter-yaml"),
     ".yml": () => loadParser("tree-sitter-yaml"),
   };
   ```

2. Parsers are loaded on first use and cached for the process lifetime.
3. Each parser exposes a uniform `extractSignatures(source) -> SignatureSet` API, where `SignatureSet` has the same shape as today's TS/JS output (functions, classes, exports, imports, complexity).
4. Unknown extensions fall back to a structural-only path (file size, line count, no signature extraction).
5. The drift detector in `src/utils/drift-detector.ts` consumes `SignatureSet` uniformly, regardless of source language, so adding a language is a single-file PR with no downstream changes.
6. Test fixtures live in `tests/fixtures/multi-lang/{python,go,rust,...}` so each language has a representative example exercised by the suite.
7. A performance benchmark is added to ensure parsing a 500-file polyglot repo completes in under 30 seconds in CI.

## Alternatives Considered

### Eagerly load all parsers at startup

- **Pros**: Simpler initialization; no first-use latency.
- **Cons**: Adds non-trivial startup latency for users whose repos are single-language, which is the common case.
- **Decision**: Rejected.

### Use a single multi-language parser like Semgrep or Sourcegraph's Comby

- **Pros**: One dependency instead of seven.
- **Cons**: Each adds a heavy native dependency and mismatches the existing tree-sitter investment in `package.json`. Tree-sitter is also closer to language-native AST shape, which yields more accurate signatures.
- **Decision**: Rejected.

### Spawn an external parsing service per language

- **Pros**: Process isolation; language-native parsers can be reused.
- **Cons**: Complicates deployment, breaks the stateless server model, and adds IPC overhead disproportionate to the value.
- **Decision**: Rejected.

### Defer multi-language support indefinitely; document TS/JS-only as a feature gap

- **Pros**: Lowest immediate effort.
- **Cons**: Polyglot drift detection is core to the documcp value proposition, and ADR-014 has just removed the LLM fallback that was implicitly compensating.
- **Decision**: Rejected.

## Consequences

### Positive

- Drift detection works across all declared languages.
- Adding a language becomes a small, well-defined contribution (good first issue territory).
- Slight startup-time win because parsers are not loaded eagerly.
- Signature extraction becomes language-agnostic at the call site.
- AST coverage compensates for the removal of LLM-based semantic analysis (ADR-014).

### Negative

- Signature extraction quality varies across languages because tree-sitter grammars differ in maturity and completeness.
- Some idioms (e.g., decorators in Python, generics in Rust) need language-specific handling that complicates the uniform API.
- The `SignatureSet` type may need optional language-specific extensions over time.

### Risks and Mitigations

- **Risk**: tree-sitter native bindings may fail to install on uncommon platforms.
  **Mitigation**: Graceful fallback to structural-only mode and clear error messaging.
- **Risk**: Parser version drift across the seven `tree-sitter-*` packages.
  **Mitigation**: Pinned versions in `package.json` and a Dependabot allowlist (see issue [#117](https://github.com/tosin2013/documcp/issues/117)).
- **Risk**: Memory growth from caching seven parsers in long-running servers.
  **Mitigation**: Lazy loading (parsers only cached after first use) and a documented optional release/reset hook for hosts that care.

## Implementation Tracking

- [#112 Harden tree-sitter parser support beyond TS/JS](https://github.com/tosin2013/documcp/issues/112) — milestone `v0.7.0 — Phase 3 Completion`.

## Evidence

- `package.json` runtime dependencies declare `tree-sitter-bash`, `tree-sitter-go`, `tree-sitter-java`, `tree-sitter-javascript`, `tree-sitter-python`, `tree-sitter-ruby`, `tree-sitter-rust`, `tree-sitter-typescript`, `tree-sitter-yaml`, and `web-tree-sitter`; only TS/JS are exercised today.
- CLAUDE.md, Phase 3 limitations: _"Tree-sitter initialization currently simplified (focuses on TypeScript/JavaScript)"_.
- `src/utils/ast-analyzer.ts`: imports `@typescript-eslint/typescript-estree` and uses it as the primary path; tree-sitter integration is stubbed.
- `src/utils/drift-detector.ts`: consumes whatever `ast-analyzer` returns and would benefit directly from broader language coverage.
- [ADR-014](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md): removes the LLM hybrid path that previously compensated for missing language coverage.
- [tree-sitter project documentation](https://tree-sitter.github.io/): reference for grammar maturity (TS/JS/Python/Go are stable; Rust/Java/Ruby/Bash are usable; YAML is auxiliary).

## Related Decisions

- [ADR-002: Multi-Layered Repository Analysis Engine](./adr-0002-repository-analysis-engine.md) (extended)
- [ADR-014: Removal of Server-Side LLM Dependency](./adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md)
- [ADR-012: Priority Scoring System for Documentation Drift](./adr-0012-priority-scoring-system-for-documentation-drift.md)
