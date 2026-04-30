#!/usr/bin/env bash
# create-roadmap-issues.sh
#
# Creates the 21 roadmap issues, 6 proposed labels, and 5 proposed milestones
# planned during the 2026-04-30 issue-generation working session for DocuMCP.
#
# Idempotent:
#   - Labels are created with `gh label create` and the `|| true` guard, so
#     re-running on a repo where they already exist is a no-op.
#   - Milestones are created with `gh api ... || true`.
#   - Issues are skipped if an open OR closed issue with the same title
#     already exists (matched via `gh issue list --search "in:title ..."`).
#
# Requirements:
#   - gh CLI authenticated (`gh auth status`)
#   - jq installed
#
# Usage:
#   ./scripts/create-roadmap-issues.sh                 # default repo
#   REPO=other/fork ./scripts/create-roadmap-issues.sh # override
#
# To inspect the plan that produced this script see:
#   .cursor/plans/documcp-issue-generation_*.plan.md

set -euo pipefail

REPO="${REPO:-tosin2013/documcp}"

# ----------------------------------------------------------------------------
# 0a. Proposed labels
# ----------------------------------------------------------------------------
echo "==> Creating labels in $REPO"
gh label create "area/llm-removal"  --repo "$REPO" --color "B60205" --description "Server-side LLM removal" 2>/dev/null || true
gh label create "area/phase-3"      --repo "$REPO" --color "0E8A16" --description "Phase 3 in-flight work"  2>/dev/null || true
gh label create "area/ssg-adapter"  --repo "$REPO" --color "1D76DB" --description "New SSG adapter work"   2>/dev/null || true
gh label create "area/dx"           --repo "$REPO" --color "C5DEF5" --description "Developer experience"   2>/dev/null || true
gh label create "area/cli"          --repo "$REPO" --color "5319E7" --description "Standalone CLI surface" 2>/dev/null || true
gh label create "breaking-change"   --repo "$REPO" --color "B60205" --description "Backwards-incompatible change" 2>/dev/null || true
gh label create "priority/medium"   --repo "$REPO" --color "FBCA04" --description "Medium priority" 2>/dev/null || true
gh label create "refactor"          --repo "$REPO" --color "C5DEF5" --description "Code refactoring without behavior change" 2>/dev/null || true

# ----------------------------------------------------------------------------
# 0b. Proposed milestones
# ----------------------------------------------------------------------------
echo "==> Creating milestones in $REPO"
for m in \
  "v0.6.0 — LLM Removal" \
  "v0.7.0 — Phase 3 Completion" \
  "v0.8.0 — Developer Experience" \
  "v1.0.0 — Ecosystem" \
  "Backlog"; do
  gh api -X POST "repos/$REPO/milestones" -f title="$m" >/dev/null 2>&1 || true
done

# ----------------------------------------------------------------------------
# Helper: create_issue <title> <labels> <milestone>  (body on stdin)
#   - Reads the issue body from STDIN (caller pipes a heredoc).
#   - Skips if an open OR closed issue with the exact title already exists.
#   - We deliberately avoid the `"$(cat <<'EOF' ... EOF)"` pattern as a
#     function argument because bash has long-standing parser quirks when
#     such heredocs contain certain backtick + parenthesis sequences
#     ("syntax error near unexpected token `)'"). Stdin sidesteps it.
# ----------------------------------------------------------------------------
_title_cache_file=""

_refresh_title_cache() {
  _title_cache_file=$(mktemp)
  gh issue list --repo "$REPO" --state all --limit 500 \
    --json title --jq '.[].title' > "$_title_cache_file" 2>/dev/null || true
}

create_issue() {
  local title="$1"
  local labels="$2"
  local milestone="$3"
  local body
  body=$(cat)

  if [[ -z "$_title_cache_file" || ! -s "$_title_cache_file" ]]; then
    _refresh_title_cache
  fi

  if grep -Fxq -- "$title" "$_title_cache_file"; then
    echo "SKIP    $title  (already exists)"
    return 0
  fi

  local url
  url=$(gh issue create --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --milestone "$milestone" \
    --body "$body")
  echo "CREATED $title -> $url"

  echo "$title" >> "$_title_cache_file"
}

M_LLM="v0.6.0 — LLM Removal"
M_P3="v0.7.0 — Phase 3 Completion"
M_DX="v0.8.0 — Developer Experience"
M_ECO="v1.0.0 — Ecosystem"
M_BACK="Backlog"

# ============================================================================
# CATEGORY A — Current Phase Issues
# ============================================================================

# --- A1: Epic ----------------------------------------------------------------
create_issue \
  "[Epic] Remove server-side LLM dependency from DocuMCP" \
  "epic,area/llm-removal,breaking-change,architecture,priority/high" \
  "$M_LLM" \
<<'EOF'
DocuMCP currently bundles a multi-provider LLM client (`src/utils/llm-client.ts`, ~369 LOC) used by `semantic-analyzer.ts` and `tools/simulate-execution.ts`. This is misaligned with MCP best practice — the host LLM should drive sampling, not the server. Remove the dependency entirely; fall back to AST-only semantic analysis. Tracks the four child issues A2–A5.

## Acceptance Criteria

- [ ] All child issues (A2–A5) closed and merged.
- [ ] `DOCUMCP_LLM_*` env vars no longer recognized; deprecation warning logged for one minor version, then removed.
- [ ] CHANGELOG documents the breaking change with a clear migration path for users who relied on `simulate_execution` or hybrid semantic analysis.
- [ ] `npm run ci` green; coverage stays >= 85%.
- [ ] Release published as `v0.6.0` with a `BREAKING CHANGE:` footer.

## Related

- ADR-009 (Content Accuracy and Validation Framework)
- `docs/CE-MCP-FINDINGS.md`
- `docs/how-to/llm-integration.md`
EOF

# --- A2 ---------------------------------------------------------------------
create_issue \
  "Delete LLM client and provider configuration" \
  "area/llm-removal,breaking-change,refactor,priority/high" \
  "$M_LLM" \
<<'EOF'
Remove `src/utils/llm-client.ts` and all provider-specific code (DeepSeek/OpenAI/Anthropic/Ollama). Drop `DOCUMCP_LLM_PROVIDER`, `DOCUMCP_LLM_API_KEY`, `DOCUMCP_LLM_MODEL`, `DOCUMCP_LLM_BASE_URL` parsing.

## Acceptance Criteria

- [ ] `src/utils/llm-client.ts` and `tests/utils/llm-client.test.ts` deleted.
- [ ] No remaining references to `LLMClient` in `src/`.
- [ ] No remaining references to `DOCUMCP_LLM_*` in `src/` or `docs/`.
- [ ] `npm run typecheck` and `npm run lint` pass.

## Related

- Parent epic: A1 (Remove server-side LLM dependency)
- ADR-009
EOF

# --- A3 ---------------------------------------------------------------------
create_issue \
  "Refactor semantic-analyzer to AST-only mode" \
  "area/llm-removal,breaking-change,refactor" \
  "$M_LLM" \
<<'EOF'
`src/utils/semantic-analyzer.ts` currently supports `llm`, `ast`, and `hybrid` modes. Collapse to AST-only. Public API of `SemanticAnalyzer` should remain compatible where reasonable, but `analysisMode` always returns `'ast'` and `llmAvailable` is removed.

## Acceptance Criteria

- [ ] `analyzeSemanticImpact()` runs on AST exclusively (uses `@typescript-eslint/typescript-estree` + tree-sitter).
- [ ] `useLLM`, `confidenceThreshold`, and `llmConfig` options removed from `createSemanticAnalyzer()`.
- [ ] All call sites in `src/` updated and compile cleanly.
- [ ] `tests/utils/semantic-analyzer.test.ts` rewritten to cover the new surface; >= 90% line coverage on the file.

## Related

- Parent epic: A1
- Depends on A2 (LLM client deletion)
EOF

# --- A4 ---------------------------------------------------------------------
create_issue \
  "Remove simulate_execution tool and execution-simulator utility" \
  "area/llm-removal,breaking-change,mcp-tools" \
  "$M_LLM" \
<<'EOF'
`src/tools/simulate-execution.ts` (~553 LOC) and `src/utils/execution-simulator.ts` rely on LLM-based code tracing. Without an LLM, they cannot be made deterministic. Remove the MCP tool, the utility, and all wiring in `src/index.ts`.

## Acceptance Criteria

- [ ] Tool entry deleted from the `TOOLS` array and `CallToolRequestSchema` switch in `src/index.ts`.
- [ ] `src/tools/simulate-execution.ts` and `src/utils/execution-simulator.ts` deleted.
- [ ] Any docs referencing the tool (e.g., `docs/reference/mcp-tools.md`) updated.
- [ ] CHANGELOG entry calls out tool removal explicitly.

## Related

- Parent epic: A1
- ADR-009
EOF

# --- A5 ---------------------------------------------------------------------
create_issue \
  "Update ADR-009 and remove LLM how-to documentation" \
  "documentation,area/llm-removal,architecture" \
  "$M_LLM" \
<<'EOF'
ADR-009 currently documents a "Phase 2.5: LLM-Enhanced Semantic Analysis" section as Implemented. Mark that section **Superseded** with a pointer to this removal epic, and delete `docs/how-to/llm-integration.md`. Add a short ADR-014 (or amend ADR-009) explaining the rationale: alignment with MCP Sampling guidance and CE-MCP findings.

## Acceptance Criteria

- [ ] ADR-009 frontmatter and "Phase 2.5" section updated; status preserved as `Implemented` for the original validation framework, but Phase 2.5 marked `Superseded`.
- [ ] `docs/how-to/llm-integration.md` deleted; `docs/sidebars.js` (or equivalent) updated.
- [ ] New ADR (or ADR-009 addendum) explains: server-side LLM deprecated, MCP Sampling is the intended future path, AST is the current default.
- [ ] `npm run docs:check-links` passes.

## Related

- Parent epic: A1
- ADR-009
- `docs/CE-MCP-FINDINGS.md`
EOF

# --- A6 ---------------------------------------------------------------------
create_issue \
  "Implement community insights aggregation" \
  "enhancement,area/phase-3,memory-knowledge-graph,priority/medium" \
  "$M_P3" \
<<'EOF'
CLAUDE.md flags "Community insights and best practices (in progress)" as the last unfinished Phase 3 item. Build a tool/utility that aggregates KG signals across projects (success rates, common stacks, frequent drift sources) and surfaces them through a new MCP resource (`documcp://insights/community`).

## Acceptance Criteria

- [ ] New utility in `src/memory/community-insights.ts` aggregates from `getKnowledgeGraph()`.
- [ ] Aggregation respects per-project anonymization (no raw paths leak across projects).
- [ ] Exposed as both an MCP resource and a `get_community_insights` tool.
- [ ] Integration test in `tests/integration/` covers a multi-project KG with >= 3 projects.

## Related

- ADR-002 (Repository Analysis Engine)
- CLAUDE.md "Phase 3 (Weeks 5-6) — COMPLETED"
EOF

# --- A7 ---------------------------------------------------------------------
create_issue \
  "Harden tree-sitter parser support beyond TS/JS" \
  "enhancement,area/phase-3,priority/medium" \
  "$M_P3" \
<<'EOF'
CLAUDE.md notes "Tree-sitter initialization currently simplified (focuses on TypeScript/JavaScript)" despite Python/Go/Rust/Java/Ruby/Bash parsers being declared as dependencies. Wire them up properly in `src/utils/ast-analyzer.ts` and the drift detector so multi-language repos get accurate signatures.

## Acceptance Criteria

- [ ] `ast-analyzer.ts` initializes tree-sitter parsers for Python, Go, Rust, Java, Ruby, and Bash on demand.
- [ ] Function/class signature extraction works for at least Python and Go (test fixtures included).
- [ ] Drift detector identifies breaking changes in Python and Go fixtures.
- [ ] Performance benchmark added: parsing a 500-file polyglot repo completes in < 30 s on CI.

## Related

- ADR-002
- `src/utils/ast-analyzer.ts`
EOF

# --- A8 ---------------------------------------------------------------------
create_issue \
  "Add change-watcher persistence and integration tests" \
  "enhancement,area/phase-3,testing" \
  "$M_P3" \
<<'EOF'
The change-watcher tool (added in v0.5.3 commit `362fbca`) currently lacks persistence between server restarts and integration coverage. Add a JSONL state file, restart resilience, and an integration test that simulates code edits during an active watch session.

## Acceptance Criteria

- [ ] Watcher state persists to `.documcp/watcher-state.jsonl` and rehydrates on startup.
- [ ] Integration test in `tests/integration/change-watcher.test.ts` simulates >= 3 file edits and asserts drift events are emitted.
- [ ] Watcher gracefully handles missing/corrupt state file (logs a warning, starts fresh).
- [ ] No regressions in existing 127+ tests.

## Related

- ADR-012 (Priority Scoring System)
- `docs/how-to/change-watcher.md`
EOF

# --- A9 ---------------------------------------------------------------------
create_issue \
  "Drift priority scoring feedback ingestion loop" \
  "enhancement,area/phase-3,memory-knowledge-graph" \
  "$M_P3" \
<<'EOF'
ADR-012 defines a multi-factor priority score for drift but lacks a feedback ingestion path. Add a `record_drift_outcome` tool that lets the host record whether a flagged drift was actionable, then re-weights the scoring model accordingly via the KG.

## Acceptance Criteria

- [ ] New MCP tool `record_drift_outcome` accepts `{ driftId, outcome: 'actionable'|'noise'|'deferred' }`.
- [ ] Outcomes stored as KG edges and surface in `getDeploymentRecommendations()` follow-up calls.
- [ ] `calculatePriorityScore()` adjusts weights based on historical outcomes (documented formula).
- [ ] Unit + integration tests cover the feedback loop end-to-end.

## Related

- ADR-012
- `src/utils/drift-detector.ts`
EOF

# ============================================================================
# CATEGORY B — Innovation Backlog & Contributor-Friendly Features
# ============================================================================

# --- B1 ---------------------------------------------------------------------
create_issue \
  "Template-based enhanced release notes (no LLM)" \
  "enhancement,area/dx,release,good first issue" \
  "$M_DX" \
<<'EOF'
ADR-013 lists "AI-enhanced release notes" as future work. Reframed: build a **deterministic** enhanced release-notes generator that groups commits by type/scope, links to ADRs touched, surfaces test-coverage delta, and embeds dependency-bump summaries — all from conventional-commit metadata. No LLM required.

## Acceptance Criteria

- [ ] New script `src/scripts/generate-release-notes.ts` reads commits between two tags.
- [ ] Output groups by `feat`/`fix`/`docs`/`perf`/`ci`/`chore`, links commits and PRs, lists ADR file changes.
- [ ] Coverage delta computed by reading `coverage/coverage-summary.json` from the previous release tag.
- [ ] Wired into `.github/workflows/release.yml`; preserves existing changelog generation.

## Related

- ADR-013 (Release Pipeline and Package Distribution)
- `.versionrc.json`
EOF

# --- B2 ---------------------------------------------------------------------
create_issue \
  "Release health dashboard" \
  "enhancement,area/dx,release,help wanted" \
  "$M_DX" \
<<'EOF'
ADR-013 future item #8. Build a static HTML dashboard rendered by Docusaurus that shows recent release metrics: install success rate, time-to-publish, coverage trend, CI flake rate. Pull data from `gh api` and the npm registry.

## Acceptance Criteria

- [ ] Page rendered at `/release-health` in the Docusaurus site.
- [ ] Data refreshed nightly via a scheduled GitHub Action committing JSON snapshots into `docs/data/`.
- [ ] Charts render without external runtime calls (pre-rendered SVG or static JSON + a small chart lib).
- [ ] Documented in `docs/development/`.

## Related

- ADR-013
EOF

# --- B3 ---------------------------------------------------------------------
create_issue \
  "Smart Dependabot auto-merge for safe dependency bumps" \
  "enhancement,area/dx,ci/cd,dependencies,help wanted" \
  "$M_DX" \
<<'EOF'
ADR-013 future item #6. Auto-merge Dependabot PRs that meet all of: patch-only bump, no API surface change, all tests pass, no `breaking-change` label. Block on minor/major bumps for human review.

## Acceptance Criteria

- [ ] New workflow `.github/workflows/dependabot-auto-merge.yml`.
- [ ] Uses `gh pr merge --auto --squash` only when checks pass and bump is patch.
- [ ] Documented allowlist of trusted scopes (e.g., `@modelcontextprotocol/*`, `tree-sitter-*`).
- [ ] Includes a manual override label `do-not-auto-merge`.

## Related

- ADR-013
EOF

# --- B4 ---------------------------------------------------------------------
create_issue \
  "Performance benchmark suite for repository analysis at scale" \
  "performance,testing,area/dx,help wanted" \
  "$M_DX" \
<<'EOF'
The existing `npm run test:performance` covers small fixtures. Extend it to large polyglot repos (1k+ files) and publish results in CI as artifacts and a Markdown summary in PR comments.

## Acceptance Criteria

- [ ] At least three benchmark fixtures: 100, 1k, 5k file repos (synthesized at test time).
- [ ] Records p50/p95/p99 for `analyze_repository`, `detect_drift`, and `setup_structure`.
- [ ] CI posts a summary comment on PRs with regression detection (>10% slower fails).
- [ ] Threshold config lives in `tests/benchmarks/thresholds.json`.

## Related

- `tests/benchmarks/`
- `src/scripts/benchmark.ts`
EOF

# --- B5 ---------------------------------------------------------------------
create_issue \
  "Documentation quality audit per Diataxis category" \
  "documentation,quality,good first issue" \
  "$M_DX" \
<<'EOF'
Run `validate_diataxis_content` and `validate_documentation_freshness` against `docs/`, then file follow-up issues for any category falling below the 85% quality bar. This issue is the audit pass; follow-ups will be filed from its findings.

## Acceptance Criteria

- [ ] Audit report committed to `docs/development/diataxis-audit-2026.md`.
- [ ] Each category (tutorials/how-to/reference/explanation) scored.
- [ ] Action items filed as separate issues with `documentation` and `good first issue` labels.
- [ ] `npm run docs:check-links:all` runs clean as part of the audit.

## Related

- ADR-004 (Diataxis Framework Integration)
EOF

# ============================================================================
# CATEGORY C — New Feature Requests (Ecosystem Growth)
# ============================================================================

# --- C1 ---------------------------------------------------------------------
create_issue \
  "Refresh CONTRIBUTING.md with role-based contribution paths" \
  "documentation,area/dx,community,good first issue" \
  "$M_DX" \
<<'EOF'
Current `CONTRIBUTING.md` is generic. Restructure into role-based paths: "I want to fix a bug", "I want to add an SSG adapter", "I want to write docs", "I want to add a new MCP tool". Each path links to a real example PR and a labeled issue list.

## Acceptance Criteria

- [ ] CONTRIBUTING.md reorganized with at least four role-based sections.
- [ ] Each path links to relevant labels via `https://github.com/tosin2013/documcp/labels/<label>`.
- [ ] A `docs/how-to/contributing-an-ssg-adapter.md` how-to is added (skeleton acceptable; flesh out under C3/C4).
- [ ] `npm run docs:validate` passes.

## Related

- existing `CONTRIBUTING.md`
EOF

# --- C2 ---------------------------------------------------------------------
create_issue \
  "Docker Compose demo mode (one-command try-it-out)" \
  "enhancement,area/dx,community,good first issue" \
  "$M_ECO" \
<<'EOF'
Add a `docker compose up demo` recipe that spins up DocuMCP with a sample repo mounted, runs `analyze_repository` and `recommend_ssg`, and serves the resulting Docusaurus site at `localhost:3000`. Lower the activation energy for evaluators who don't want to install Node.

## Acceptance Criteria

- [ ] `docker-compose.demo.yml` plus `Dockerfile.demo` committed.
- [ ] Sample repo lives under `examples/sample-project/`.
- [ ] `README.md` "Quick Start" gains a "Try it without installing" section.
- [ ] CI smoke-test: a workflow that runs `docker compose up --build --abort-on-container-exit` against the demo.

## Related

- `docker-compose.docs.yml`
- `Dockerfile.docs`
EOF

# --- C3 ---------------------------------------------------------------------
create_issue \
  "Astro SSG adapter" \
  "enhancement,area/ssg-adapter,help wanted" \
  "$M_ECO" \
<<'EOF'
Add Astro to the supported SSG list. Implement detection in `recommend-ssg`, config generation in `generate-config`, and deployment workflow templating in `deploy-pages`.

## Acceptance Criteria

- [ ] `recommend_ssg` emits `astro` as a recommendation when project signals match (e.g., React/Vue/Svelte islands, content-heavy with interactive sprinkles).
- [ ] `generate_config` emits a working `astro.config.mjs` with the GitHub Pages base path.
- [ ] `deploy_pages` generates an Astro-flavored GitHub Actions workflow.
- [ ] End-to-end test from a fixture project produces a deployable site.

## Related

- ADR-003 (SSG Recommendation Engine)
- `src/tools/recommend-ssg.ts`
EOF

# --- C4 ---------------------------------------------------------------------
create_issue \
  "VitePress SSG adapter" \
  "enhancement,area/ssg-adapter,help wanted" \
  "$M_ECO" \
<<'EOF'
Mirror C3 for VitePress — popular for Vue and TypeScript-heavy projects. Implement detection, config generation, and deployment workflow.

## Acceptance Criteria

- [ ] `recommend_ssg` emits `vitepress` for Vue/TS-leaning projects.
- [ ] `generate_config` emits `.vitepress/config.ts` with correct `base` for GitHub Pages.
- [ ] `deploy_pages` generates a VitePress workflow.
- [ ] Fixture-based end-to-end test passes.

## Related

- ADR-003
- Companion to C3 (Astro adapter)
EOF

# --- C5 ---------------------------------------------------------------------
create_issue \
  "VS Code extension shim exposing DocuMCP tools as commands" \
  "enhancement,area/dx,community,help wanted" \
  "$M_ECO" \
<<'EOF'
Create a thin VS Code extension (`apps/vscode-extension/` in the same repo or a sibling repo) that surfaces top DocuMCP tools (`analyze_repository`, `recommend_ssg`, `setup_structure`, `deploy_pages`) as commands and a sidebar tree view. Communicates with the local DocuMCP server via stdio.

## Acceptance Criteria

- [ ] Extension scaffolded with `yo code` or equivalent; activates on workspace folder.
- [ ] Four core tools exposed as commands and visible in the Command Palette.
- [ ] README in the extension folder shows installation from `.vsix`.
- [ ] CI builds the `.vsix` artifact on tag push.

## Related

- ADR-006 (MCP Tools API Design)
- `mcp-config-example.json`
EOF

# --- C6 ---------------------------------------------------------------------
create_issue \
  "GitHub App for repository-level continuous drift detection" \
  "enhancement,area/phase-3,community,help wanted" \
  "$M_BACK" \
<<'EOF'
Wrap DocuMCP's drift detector in a GitHub App that runs on `push`/`pull_request` events, comments on PRs with drift findings, and opens issues for severe drift on the default branch. Reuses the existing snapshot system in `.documcp/snapshots/`.

## Acceptance Criteria

- [ ] App scaffolded under `apps/github-app/` (or a separate repo, linked from this issue).
- [ ] Webhook handler delegates to `sync_code_to_docs` in `detect` mode.
- [ ] PR comments group findings by severity (breaking/major/minor/patch).
- [ ] Architecture documented in a new ADR.

## Related

- ADR-012
- `src/tools/sync-code-to-docs.ts`
EOF

# --- C7 ---------------------------------------------------------------------
create_issue \
  "Standalone CLI mode (documcp analyze ...) for non-MCP workflows" \
  "enhancement,area/cli,area/dx,help wanted" \
  "$M_ECO" \
<<'EOF'
Today the package only runs as an MCP server. Add a CLI entry point so users can run `documcp analyze ./my-repo`, `documcp recommend`, and `documcp deploy` without an MCP host. The CLI should reuse tool handlers — no logic duplication.

## Acceptance Criteria

- [ ] New `src/cli.ts` dispatches to existing tool handlers via a thin adapter.
- [ ] `package.json` `bin` adds `documcp-cli` (keeps `documcp` for the MCP server).
- [ ] Subcommands: `analyze`, `recommend`, `setup`, `deploy`, `validate`, with `--help` for each.
- [ ] Smoke test in CI that runs `documcp-cli analyze .` on the repo itself.

## Related

- `src/index.ts`
- ADR-006
EOF

echo "==> Done."
