---
id: adr-16-ssg-adapter-plugin-pattern
title: "ADR-016: SSG Adapter Plugin Pattern for Recommendation, Configuration, and Deployment"
sidebar_label: "ADR-016: SSG Adapter Pattern"
sidebar_position: 16
documcp:
  last_updated: "2026-04-30T00:00:00.000Z"
  last_validated: "2026-04-30T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: TBD
status: accepted
date: "2026-04-30"
---

# ADR-016: SSG Adapter Plugin Pattern for Recommendation, Configuration, and Deployment

## Status

Accepted (proposed 2026-04-30; extends [ADR-003](./adr-0003-static-site-generator-recommendation-engine.md))

## Date

2026-04-30

## Context

[ADR-003](./adr-0003-static-site-generator-recommendation-engine.md) names five SSGs (Jekyll, Hugo, Docusaurus, MkDocs, Eleventy) by enum throughout the codebase. Adding Astro ([#122](https://github.com/tosin2013/documcp/issues/122)) and VitePress ([#123](https://github.com/tosin2013/documcp/issues/123)) currently means scattered branching in `src/tools/recommend-ssg.ts`, `src/tools/generate-config.ts`, and `src/tools/deploy-pages.ts`. The hard-coded enum makes contributor PRs touch three files per SSG and introduces inconsistency risk because the three branches can drift.

We need a consistent contract before merging any more adapters, especially with [ADR-018](./adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md) introducing a parallel adapter pattern for deploy targets that we want to keep symmetric.

## Decision

Define an `SSGAdapter` interface in `src/adapters/types.ts` with four members:

```ts
export interface SSGAdapter {
  metadata: AdapterMetadata;
  detect(analysis: RepositoryAnalysis): DetectionScore;
  generateConfig(opts: ConfigOptions): GeneratedFile[];
  generateWorkflow(opts: WorkflowOptions): string;
}
```

1. **`metadata: AdapterMetadata`** — human-readable name, slug, supported features, and signal weights for detection.
2. **`detect(analysis) -> DetectionScore`** — returns a 0-1 confidence that this SSG fits the repo, replacing the current scoring branches in `recommend-ssg`.
3. **`generateConfig(opts) -> GeneratedFile[]`** — emits one or more files (e.g., `docusaurus.config.ts`, `astro.config.mjs`) ready to write to disk.
4. **`generateWorkflow(opts) -> string`** — emits a GitHub Actions YAML workflow specific to the SSG.

Concrete adapters live in `src/adapters/<ssg>/index.ts` (e.g., `src/adapters/docusaurus/index.ts`). The three tools iterate the adapter registry instead of switching on a hard-coded enum. The five existing SSGs are migrated onto the interface in a single refactor PR; new SSGs (Astro, VitePress) ship as the first net-new additions through this contract.

## Alternatives Considered

### Keep the current enum + switch pattern

- **Pros**: No migration cost.
- **Cons**: Every new SSG is a three-file change; the codebase's growth in this dimension is bounded only by contributor patience, not architectural design.
- **Decision**: Rejected.

### Class-based plugin system with inheritance from a `BaseSSGAdapter`

- **Pros**: Centralizes shared behavior in a base class.
- **Cons**: TypeScript structural typing is idiomatic for this use case; inheritance adds testing friction without value.
- **Decision**: Rejected in favor of a structural interface.

### YAML/JSON-based declarative adapter format

- **Pros**: Adapters could be added without TypeScript knowledge.
- **Cons**: Non-trivial adapters need code (e.g., conditional config generation), and declarative formats become a poor man's templating language quickly.
- **Decision**: Rejected.

### Defer the adapter pattern; refactor reactively after C3/C4 land

- **Pros**: Avoids upfront design work.
- **Cons**: The symmetry with ADR-018 is much stronger if the two patterns are designed together; two new SSGs would otherwise ship as one-off branch-fests.
- **Decision**: Rejected.

## Consequences

### Positive

- Adding an SSG is a single-folder, single-PR contribution.
- The adapter contract is documented once and enforces consistency.
- Each adapter can be unit-tested in isolation.
- The three downstream tools shrink because logic is delegated to adapters.
- ADR-018 (Deploy Target Adapter) gets an architectural sibling that makes the codebase symmetric.

### Negative

- One-time refactor cost to migrate the existing five SSGs onto the interface.
- Slight indirection cost (one virtual call per detection) — immaterial in practice.
- Introduces a small amount of registry/glue code in `src/adapters/index.ts`.

### Risks and Mitigations

- **Risk**: The adapter interface might not capture features unique to one SSG (e.g., MkDocs-specific plugin conventions).
  **Mitigation**: Keep the interface narrow enough that adapters can extend internally without bloating the public type.
- **Risk**: Signal weights in metadata could drift between adapters and produce inconsistent detection.
  **Mitigation**: Documented scoring rubric and integration tests that pit fixtures against multiple adapters.
- **Risk**: Migration of the five existing SSGs could regress detection accuracy.
  **Mitigation**: Snapshot tests of `recommend_ssg` before and after the refactor.

## Implementation Tracking

- [#122 Astro SSG adapter](https://github.com/tosin2013/documcp/issues/122) — milestone `v1.0.0 — Ecosystem`.
- [#123 VitePress SSG adapter](https://github.com/tosin2013/documcp/issues/123) — milestone `v1.0.0 — Ecosystem`.

## Evidence

- [ADR-003](./adr-0003-static-site-generator-recommendation-engine.md) defines the five existing SSGs as a fixed set; explicitly notes "extensibility" as a future concern.
- `src/tools/recommend-ssg.ts`: contains the SSG-detection branching logic that this ADR replaces with adapter iteration.
- `src/tools/generate-config.ts`: contains per-SSG config generation that this ADR moves into adapter implementations.
- `src/tools/deploy-pages.ts`: contains per-SSG GitHub Actions workflow templating that this ADR moves into adapter implementations.
- GitHub issues [#122](https://github.com/tosin2013/documcp/issues/122) (Astro) and [#123](https://github.com/tosin2013/documcp/issues/123) (VitePress) — the first concrete additions through the adapter pattern.
- [ADR-018](./adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md): introduces a parallel Deploy Target Adapter Pattern; ADR-016 and ADR-018 together establish the project's contributor-friendly extension model.

## Related Decisions

- [ADR-003: Static Site Generator Recommendation Engine](./adr-0003-static-site-generator-recommendation-engine.md) (extended)
- [ADR-018: Deploy Target Adapter Pattern](./adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md) (sibling)
- [ADR-006: MCP Tools API Design](./adr-0006-mcp-tools-api-design.md)
