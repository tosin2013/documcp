# Implementation Plan: Roadmap Authoring Command + Config Script + Test Suite

**Branch**: `001-roadmap-write` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-roadmap-write/spec.md`

## Summary

Formalize and harden the foundational pieces of the `speckit-roadmap` extension: the
`speckit.roadmap.write` authoring command (self-detecting create/amend of the roadmap
artifact), the deterministic `load-config` script (bash + PowerShell, emitting a stable
JSON contract), the roadmap and config templates, and a cross-platform automated test
suite (Bats + Pester) proving every deterministic behavior and bash↔PowerShell parity.
Working `load-config.sh`/`.ps1` and the `write` command body already exist from the
bootstrap phase; this feature hardens them against the spec's FRs and adds the test
suite (currently absent). The command body holds all judgment; the script holds none.

## Technical Context

**Language/Version**: Bash (POSIX-compatible, targeting bash 3.2+ for macOS default
shell) and PowerShell 7+. Command/template bodies are Markdown. No application runtime.

**Primary Dependencies**: spec-kit (`specify` CLI ≥0.11.6) as the host; core
`.specify/scripts/bash/common.sh` (`json_escape`, `get_repo_root`) reused by the bash
script. No hard `jq` dependency (graceful fallback). Test frameworks: Bats (bash),
Pester (PowerShell).

**Storage**: Plain files. The roadmap artifact is Markdown at `.specify/memory/roadmap.md`
(configurable). Config is YAML (`roadmap-config.yml` / `extension.yml` defaults).

**Testing**: Bats for `load-config.sh`; Pester for `load-config.ps1`; a parity test
comparing normalized JSON output of both against shared fixtures. CI runs Bats on Linux
and Pester on Windows.

**Target Platform**: macOS, Linux, Windows (cross-platform parity is a hard requirement).

**Project Type**: spec-kit extension (CLI/tooling). Source of truth at repo root;
installed copy under `.specify/extensions/roadmap/` (a build artifact, gitignored).

**Performance Goals**: `load-config` resolution completes well under 1s (it is small
file I/O + string processing); not a performance-sensitive feature.

**Constraints**: Determinism split is a hard boundary — the script contains zero
judgment and is fully unit-testable; all reasoning lives in the command body. Scripts
emit an identical JSON contract on both platforms. Non-destructive amendment.

**Scale/Scope**: One command body, one script (two implementations), two templates, one
config template, one manifest entry, and ~8 deterministic behaviors × 2 platforms + 1
parity test in the suite. Single maintainer.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | How this feature complies | Status |
|---|-----------|----------------------------|--------|
| I | Canonical Conformance | Manifest entry, `commands/speckit.roadmap.write.md` (full slug name), paired `scripts/bash`+`scripts/powershell`, `templates/`, `config-template.yml`; shape mirrors bundled `critique`/`verify`. | ✅ PASS |
| II | Determinism Split | `load-config` is pure deterministic (path/existence resolution, precedence, validation, JSON contract) and fully tested; the `write` command body holds ALL judgment (harvest, elicitation, synthesis, semver-bump decision, non-interactive fallback). | ✅ PASS |
| III | Non-Destructive & Idempotent | `write` amend preserves content, marks (not deletes) superseded entries, is re-run-safe; `load-config` is read-only. | ✅ PASS |
| IV | Roadmap as Durable Governance | Produces the versioned roadmap beside the constitution with Sync Impact Report + semver footer. | ✅ PASS |
| V | Cross-Platform Parity | bash + PowerShell `load-config` with identical JSON; a parity test is the proof; CI on both OSes. | ✅ PASS |
| VI | Elicitation Completeness (no fabrication) | `write` asks for gaps when interactive; parks gaps as Open Questions/needs-info when not; never invents. (Validated by the dogfood run.) | ✅ PASS |
| VII | Dogfood | Built through spec-kit's own workflow; `load-config` and `write` already dogfooded on this repo; brief/debrief hooks fire on this feature's own cycle. | ✅ PASS |

No violations. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-roadmap-write/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (the JSON config contract + roadmap entity)
├── quickstart.md        # Phase 1 output (how to run/validate end-to-end)
├── contracts/
│   └── load-config.schema.json   # JSON contract emitted by load-config
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
extension.yml                         # manifest (provides write command + load-config scripts + config)
config-template.yml                   # config template (roadmap path, adr_dir, prd globs, max_findings)

commands/
└── speckit.roadmap.write.md          # the authoring command body (judgment lives here)

scripts/
├── bash/
│   └── load-config.sh                # deterministic config resolver → JSON (reuses core common.sh)
└── powershell/
    └── load-config.ps1               # PowerShell parity implementation

templates/
└── roadmap-template.md               # the roadmap artifact skeleton the command fills

tests/
├── bash/
│   ├── load-config.bats              # Bats: every deterministic behavior of load-config.sh
│   └── fixtures/                     # shared fixture configs (valid/missing/env/invalid)
├── powershell/
│   └── load-config.Tests.ps1         # Pester: mirror of the bash behaviors
└── parity/
    └── parity.bats                   # asserts bash JSON == powershell JSON over shared fixtures

.github/workflows/
└── test.yml                          # CI: Bats on ubuntu, Pester on windows
```

### Decisions bound after critique (2026-06-24)

- **Parity contract = normalized-JSON equality** (not byte-identical). The parity test
  parses both outputs and compares them as structured data (order-independent keys,
  consistent typing). This is the precise meaning of "identical" in FR-021/023.
- **`load-config` emits PRD patterns only** — no filesystem scanning (keeps the script
  deterministic and cheap; matching, if any, is command-body work). [FR-016a]
- **CWD-robustness**: `load-config` resolves the repo root from any working directory;
  tests invoke it from a non-repo-root CWD. [FR-016b]
- **Command body is NOT unit-tested** (deliberate, per Determinism Split): harvest,
  create/amend, semver-bump decision, and non-interactive fallback are judgment and are
  validated by the dogfood/quickstart steps 3–5 and the debrief — not by Bats/Pester.
- **Malformed-roadmap guard**: amend must detect an unparseable/structurally-missing
  roadmap and report+propose rather than corrupt. [FR-011a]
- **CI matrix**: Bats on Linux + macOS (bash 3.2 compatibility is a tested guarantee, not
  just an intention), Pester on Windows.
- **Escaping + fallback tests**: a fixture with quotes/special chars proves value
  escaping; a test exercises the JSON-construction fallback when core `common.sh` is
  absent. [FR-024a]

**Known bugs to fix during implementation** (found by a CWD probe during planning):
- When invoked from outside any spec-kit repo, `load-config.sh` silently emits an EMPTY
  `prd_globs` (`[]`) instead of the built-in defaults, and the repo-root walk falls back
  to `$PWD`. Fix: when the repo root cannot be located, either fail clearly OR still emit
  built-in defaults — never a contract-violating empty array. (Covered by FR-016b test.)
- The `prd_globs` default is currently assembled via a here-document, which is fragile
  (failed under a restricted `/tmp`). Reimplement default-glob handling without a heredoc.
- From a deep *in-repo* subdirectory, resolution already works correctly (verified).

**Structure Decision**: Source of truth lives at the repo root (the canonical spec-kit
extension layout, matching `critique`/`verify`). **Open question Q1 (test directory
layout) is RESOLVED here**: tests live under a top-level `tests/` directory split by
platform (`tests/bash`, `tests/powershell`) plus a `tests/parity` cross-check, with
shared fixtures under `tests/bash/fixtures` referenced by both. Rationale: keeps test
code out of the shipped `scripts/` tree (tests are not part of the installed extension),
mirrors common Bats/Pester conventions, and gives the parity test a natural home. The
installed copy under `.specify/extensions/roadmap/` excludes `tests/` (build artifact).

## Complexity Tracking

> No constitutional violations; no entries required.
