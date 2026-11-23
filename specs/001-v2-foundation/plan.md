# Implementation Plan: v2.0 foundation: Node 24, skills layer, CLI verdict

**Branch**: `001-v2-foundation` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-v2-foundation/spec.md`

## Summary

Three slices, built and merged in order by Chalkeus forge runs:

- **US1:** declare Node 24 (`.nvmrc`, `engines`, docs), and make the test run finish without a
  force-exited worker, so `test:ci` can drop `--forceExit`.
- **US2:** add `skills/documentation-analysis/SKILL.md`, the flagship skill, plus a test that
  checks every tool and parameter it names against the server's tool list.
- **US3:** write the standalone-CLI verdict memo in `docs/research/`.

The code already installs, builds, lints and passes its tests on Node 24.22.3 (measured
2026-11-23), so US1 is declarations plus the leak fix, not a port.

## Technical Context

**Language/Version**: TypeScript 5 (ES modules), Node.js 24 LTS
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `zod`, tree-sitter parsers (unchanged)
**Storage**: N/A
**Testing**: Jest 29 with ts-jest (ESM preset); `npm test`
**Target Platform**: Node 24 on Linux, macOS and Windows (MCP hosts launch `dist/index.js`)
**Project Type**: single project (MCP server published on npm)
**Performance Goals**: full test run stays near today's ~45 s
**Constraints**: offline tests (constitution VII); no dependency changes in this item
(constitution VI): `@types/node` and CI's Node matrix move in the owner's planning PR
**Scale/Scope**: 3 slices; about 10 files changed in total

## Constitution Check

| Principle | Check | Result |
|---|---|---|
| I. Roadmap decides | Item 001 is on the roadmap, depends on nothing | Pass |
| II. Owner decides | Name, CLI build and publishing stay out of scope; the memo only recommends | Pass |
| III. PR with tests | One PR per slice; US1 and US2 add tests; US3 is a document (no code to test) | Pass |
| IV. Tool surface is a contract | FR-012: no tool, prompt or resource changes | Pass |
| V. Skills orchestrate | FR-007 forbids explaining analysis internals; US2's test checks names against the tool list | Pass |
| VI. Dependencies in planning | No dependency changes; `@types/node` moves in the planning PR | Pass |
| VII. Offline, deterministic tests | US1 removes the leak and `--forceExit` | Pass |
| VIII. Planning files and CI are the owner's | No allowed path reaches `.github/`, `.specify/` or `specs/` | Pass |

Re-checked after design: no change.

## Project Structure

### Documentation (this feature)

```text
specs/001-v2-foundation/
├── spec.md
├── plan.md              # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── skill.md         # the SKILL.md format and the tool-name check
│   └── verdict-memo.md  # the memo's required sections
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
.nvmrc                                   # US1: 24
package.json                             # US1: engines, test:ci; US2: nothing unless needed
README.md, CONTRIBUTING.md               # US1: Node 24; US2: skills section
src/…                                    # US1: only what the leak fix needs
tests/…                                  # US1: teardown fixes; US2: tests/skills/*.test.ts
skills/documentation-analysis/SKILL.md   # US2
docs/research/standalone-cli-verdict.md  # US3
```

**Structure Decision**: single project; the only new top-level folder is `skills/`.

## Complexity Tracking

None.
