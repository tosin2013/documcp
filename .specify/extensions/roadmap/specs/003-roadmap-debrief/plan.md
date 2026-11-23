# Implementation Plan: Roadmap Debrief — Post-Implementation Review

**Branch**: `003-roadmap-debrief` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-roadmap-debrief/spec.md`

## Summary

Formalize `speckit.roadmap.debrief` (fires on `after_implement`) to the full report
standard. Read-only, judgment-only: reuses the verified `load-config` + core
`check-prerequisites` (no new scripts, no new unit tests), reads the roadmap + the
implemented spec, classifies drift (outcome-miss / scope-creep / constraint-violation /
roadmap-stale), proposes a `verified` transition or a roadmap amendment, and writes a
timestamped report using the shared `review-report-template.md` (created in spec 002).

## Technical Context

**Language/Version**: Markdown command body (judgment) + reuse of spec 001's `load-config`.
No new executable code.
**Primary Dependencies**: spec-kit host; `load-config` (spec 001); core
`check-prerequisites`; shared `review-report-template.md` (spec 002).
**Storage**: Reads `.specify/memory/roadmap.md`, the active `spec.md`, and implemented
artifacts; writes a report under `FEATURE_DIR/roadmap-reviews/`.
**Testing**: None new — judgment (Principle II), validated by dogfood. Its script
dependency is already covered by spec 001's 96 tests.
**Target Platform**: macOS/Linux/Windows (platform-neutral body; parity-proven script dep).
**Project Type**: spec-kit extension command (judgment artifact).
**Constraints**: Read-only; constraint/ADR violation = must-address; must distinguish
roadmap-stale from implementation-defect.
**Scale/Scope**: One command body (formalize existing) + reuse of the shared template.

## Constitution Check

| # | Principle | Compliance | Status |
|---|-----------|-----------|--------|
| I | Canonical Conformance | `speckit.roadmap.debrief.md`; shared report template; mirrors critique/verify. | ✅ |
| II | Determinism Split | No new deterministic logic; reuses tested `load-config`; body is judgment, not unit-tested. | ✅ |
| III | Non-Destructive | STRICTLY read-only; proposes verified transition + roadmap amendment, never applies. | ✅ |
| IV | Roadmap as Durable Governance | Checks the implemented spec against the roadmap's recorded outcome/scope. | ✅ |
| V | Cross-Platform Parity | No new scripts; the one script dependency is parity-proven. | ✅ |
| VI | Elicitation Completeness | N/A (read-only review) — degrades gracefully, never fabricates. | ✅ |
| VII | Dogfood | Already dogfooded on specs 001 and 002; re-validated here. | ✅ |

No violations. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)
```text
specs/003-roadmap-debrief/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```
(No data-model.md/contracts/ — no new data structures; the report is governed by the shared
template created in spec 002.)

### Source Code (repository root)
```text
commands/
└── speckit.roadmap.debrief.md     # formalize to full report + drift-classification standard
templates/
└── review-report-template.md      # REUSED (created in spec 002), not modified
```

**Structure Decision**: No new scripts/tests. Only `commands/speckit.roadmap.debrief.md` is
hardened (drift taxonomy, verdict, propose-verified, roadmap-stale handling, ambiguous-match
tie-break, graceful degradation). Reports written at runtime under `roadmap-reviews/`.

## Complexity Tracking

> No violations; no entries.
