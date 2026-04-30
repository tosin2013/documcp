# DocuMCP Release Plan

<!-- DOCUMCP_RELEASE_PLAN_BEGIN -->

> **Generated**: 2026-04-30 — derived from GitHub milestones and ADRs 014–018.
> Owners and dates are best estimates; adjust as work progresses. Issue links use the canonical `tosin2013/documcp` repo.

This document is the public-facing roadmap for the next four versions of DocuMCP, anchored to the architectural decisions in [docs/adrs/](docs/adrs/). Each milestone aligns 1:1 with a GitHub milestone and a semver release.

## Snapshot

| Version    | Theme                | Milestone                                                                         | Driving ADRs                                                                                                                                                                                                                                                                                                    | Issues (open) | Target  |
| ---------- | -------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------- |
| **v0.6.0** | LLM Removal          | [v0.6.0 — LLM Removal](https://github.com/tosin2013/documcp/milestone/1)          | [ADR-014](docs/adrs/adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md)                                                                                                                                                                                                                 | 5             | Q2 2026 |
| **v0.7.0** | Phase 3 Completion   | [v0.7.0 — Phase 3 Completion](https://github.com/tosin2013/documcp/milestone/2)   | [ADR-015](docs/adrs/adr-0015-multi-language-ast-analysis-via-tree-sitter-parser-registry.md), [ADR-012](docs/adrs/adr-0012-priority-scoring-system-for-documentation-drift.md)                                                                                                                                  | 4             | Q3 2026 |
| **v0.8.0** | Developer Experience | [v0.8.0 — Developer Experience](https://github.com/tosin2013/documcp/milestone/3) | [ADR-013](docs/adrs/adr-0013-release-pipeline-and-package-distribution.md)                                                                                                                                                                                                                                      | 6             | Q4 2026 |
| **v1.0.0** | Ecosystem            | [v1.0.0 — Ecosystem](https://github.com/tosin2013/documcp/milestone/4)            | [ADR-016](docs/adrs/adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md), [ADR-017](docs/adrs/adr-0017-standalone-cli-surface-for-non-mcp-workflows.md), [ADR-018](docs/adrs/adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md) | 9             | Q1 2027 |
| (Backlog)  | Backlog              | [Backlog](https://github.com/tosin2013/documcp/milestone/5)                       | (mixed)                                                                                                                                                                                                                                                                                                         | 1             | —       |

---

## v0.6.0 — LLM Removal

**Goal**: Align DocuMCP with MCP best practice by removing the bundled multi-provider LLM client. Future LLM-driven semantic features will use MCP Sampling instead.

**Driving ADR**: [ADR-014: Removal of Server-Side LLM Dependency in Favor of MCP Sampling](docs/adrs/adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md). Supersedes Phase 2.5 of [ADR-009](docs/adrs/adr-0009-content-accuracy-validation-framework.md).

**Breaking changes**: yes — `simulate_execution` tool removed; `DOCUMCP_LLM_*` env vars removed; `SemanticAnalyzer.useLLM`/`hybrid` modes removed.

**Tracked issues**:

- [#106 [Epic] Remove server-side LLM dependency from DocuMCP](https://github.com/tosin2013/documcp/issues/106)
- [#107 Delete LLM client and provider configuration](https://github.com/tosin2013/documcp/issues/107) (`priority/high`)
- [#108 Refactor semantic-analyzer to AST-only mode](https://github.com/tosin2013/documcp/issues/108)
- [#109 Remove simulate_execution tool and execution-simulator utility](https://github.com/tosin2013/documcp/issues/109)
- [#110 Update ADR-009 and remove LLM how-to documentation](https://github.com/tosin2013/documcp/issues/110)

**Definition of done**:

- All five issues closed.
- `src/utils/llm-client.ts`, `src/utils/execution-simulator.ts`, `src/tools/simulate-execution.ts`, and `docs/how-to/llm-integration.md` deleted.
- CHANGELOG entry tagged `BREAKING CHANGE:` with a hybrid-mode migration section.
- ADR-009 Phase 2.5 marked Superseded ([already applied](docs/adrs/adr-0009-content-accuracy-validation-framework.md)).

---

## v0.7.0 — Phase 3 Completion

**Goal**: Finish the documentation-drift Phase 3 work by hardening multi-language AST coverage and closing the priority-scoring feedback loop.

**Driving ADRs**: [ADR-015: Multi-Language AST Analysis Strategy](docs/adrs/adr-0015-multi-language-ast-analysis-via-tree-sitter-parser-registry.md), [ADR-012: Priority Scoring System for Documentation Drift](docs/adrs/adr-0012-priority-scoring-system-for-documentation-drift.md).

**Breaking changes**: none.

**Tracked issues**:

- [#111 Implement community insights aggregation](https://github.com/tosin2013/documcp/issues/111) (`priority/medium`)
- [#112 Harden tree-sitter parser support beyond TS/JS](https://github.com/tosin2013/documcp/issues/112) (`priority/medium`)
- [#113 Add change-watcher persistence and integration tests](https://github.com/tosin2013/documcp/issues/113)
- [#114 Drift priority scoring feedback ingestion loop](https://github.com/tosin2013/documcp/issues/114)

**Definition of done**:

- Tree-sitter parser registry exercises Python, Go, Rust, Java, Ruby, Bash, and YAML in CI.
- Change-watcher snapshots persist across runs and exercise the drift detector with integration tests.
- Priority-scoring feedback ingestion has a documented input format and a test fixture.

---

## v0.8.0 — Developer Experience

**Goal**: Make DocuMCP friendlier to evaluate, contribute to, and operate.

**Driving ADR**: [ADR-013: Release Pipeline and Package Distribution Architecture](docs/adrs/adr-0013-release-pipeline-and-package-distribution.md) (extended).

**Breaking changes**: none.

**Tracked issues**:

- [#115 Template-based enhanced release notes (no LLM)](https://github.com/tosin2013/documcp/issues/115) (`good first issue`)
- [#116 Release health dashboard](https://github.com/tosin2013/documcp/issues/116) (`help wanted`)
- [#117 Smart Dependabot auto-merge for safe dependency bumps](https://github.com/tosin2013/documcp/issues/117) (`help wanted`)
- [#118 Performance benchmark suite for repository analysis at scale](https://github.com/tosin2013/documcp/issues/118) (`help wanted`)
- [#119 Documentation quality audit per Diataxis category](https://github.com/tosin2013/documcp/issues/119) (`good first issue`)
- [#120 Refresh CONTRIBUTING.md with role-based contribution paths](https://github.com/tosin2013/documcp/issues/120) (`good first issue`)

**Definition of done**:

- Release notes generated deterministically from conventional commits + ADR links (no LLM).
- A simple release health dashboard ships in the docs site.
- Dependabot has an auto-merge allowlist for safe minor/patch bumps.
- Benchmark suite runs in CI on every PR with a 30 s budget on a 500-file polyglot repo.

---

## v1.0.0 — Ecosystem

**Goal**: Open DocuMCP up: contributor-friendly extension points (SSG and deploy-target adapters), a standalone CLI, and ecosystem integrations.

**Driving ADRs**: [ADR-016](docs/adrs/adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md), [ADR-017](docs/adrs/adr-0017-standalone-cli-surface-for-non-mcp-workflows.md), [ADR-018](docs/adrs/adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md).

**Breaking changes**: yes — `deploy_pages` is renamed to `deploy_site` (with a one-minor-version back-compat shim).

**Tracked issues**:

- [#121 Docker Compose demo mode (one-command try-it-out)](https://github.com/tosin2013/documcp/issues/121) (`good first issue`)
- [#122 Astro SSG adapter](https://github.com/tosin2013/documcp/issues/122) (`help wanted`)
- [#123 VitePress SSG adapter](https://github.com/tosin2013/documcp/issues/123) (`help wanted`)
- [#124 VS Code extension shim exposing DocuMCP tools as commands](https://github.com/tosin2013/documcp/issues/124) (`help wanted`)
- [#126 Standalone CLI mode (documcp analyze ...) for non-MCP workflows](https://github.com/tosin2013/documcp/issues/126) (`help wanted`)
- [#127 Define DeployTargetAdapter interface and ship Vercel adapter](https://github.com/tosin2013/documcp/issues/127) (`priority/high`, `help wanted`)
- [#128 Netlify deploy target adapter](https://github.com/tosin2013/documcp/issues/128) (`help wanted`)
- [#129 Cloudflare Pages deploy target adapter](https://github.com/tosin2013/documcp/issues/129) (`help wanted`)
- [#130 Generalize `deploy_pages` → `deploy_site` (with back-compat shim)](https://github.com/tosin2013/documcp/issues/130) (`breaking-change`, `refactor`)

**Definition of done**:

- `SSGAdapter` interface lands; existing five SSGs migrated; Astro and VitePress ship as the first net-new adapters through the contract.
- `DeployTargetAdapter` interface lands; `github-pages` and `vercel` ship; Netlify and Cloudflare Pages remain `help wanted`.
- `documcp-cli` binary is published with the same tools as the MCP server.
- VS Code extension shim is published (or scoped down to a documented `help wanted` follow-up).
- Docker Compose demo opens documcp + a sample repo for one-command evaluation.

---

## Backlog

Items that are valuable but not yet scoped to a specific release.

**Tracked issues**:

- [#125 GitHub App for repository-level continuous drift detection](https://github.com/tosin2013/documcp/issues/125) (`help wanted`)

---

## Cross-cutting concerns

- **Stability**: every release ships with the existing 80% coverage gate (60% for `recommend-ssg.ts`).
- **Documentation**: every release runs `npm run docs:check-links` and `npm run docs:validate` in CI.
- **Architecture coherence**: every release that lands a new ADR also updates [docs/adrs/README.md](docs/adrs/README.md) and links the ADR to its driving issues here.
- **Breaking changes**: explicitly tagged in CHANGELOG with `BREAKING CHANGE:` and a migration section. v0.6.0 (LLM removal) and v1.0.0 (`deploy_pages → deploy_site` rename) are the only breaking releases on this plan.

<!-- DOCUMCP_RELEASE_PLAN_END -->
