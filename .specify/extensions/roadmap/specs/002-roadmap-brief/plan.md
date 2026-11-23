# Implementation Plan: Roadmap Brief — Pre-Implementation Review

**Branch**: `002-roadmap-brief` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-roadmap-brief/spec.md`

## Summary

Formalize the `speckit.roadmap.brief` command (fires on `before_implement`) to the full
report standard. It is a read-only, judgment-only review: it reuses the verified
`load-config` + core `check-prerequisites` (no new scripts, no new unit tests), reads the
roadmap and active spec, surfaces the matched ledger entry's context, flags
pre-implementation drift, and writes a timestamped briefing report — instructing (never
applying) the in-progress transition. A shared `review-report-template.md` is created
here and reused by debrief (003) and sync (004).

## Technical Context

**Language/Version**: Markdown command body (judgment) + reuse of bash/PowerShell
`load-config` from spec 001. No new executable code.
**Primary Dependencies**: spec-kit host; `load-config.sh`/`.ps1` (spec 001); core
`.specify/scripts/bash/check-prerequisites.sh`.
**Storage**: Reads `.specify/memory/roadmap.md` + the active `spec.md`; writes a report
under `FEATURE_DIR/roadmap-reviews/`.
**Testing**: None new — this is judgment (Constitution Principle II), validated by
dogfooding the command on a real spec. The deterministic dependency (`load-config`) is
already covered by spec 001's 96 tests.
**Target Platform**: macOS/Linux/Windows (the command body is platform-neutral; its only
script dependency is the already-parity-proven `load-config`).
**Project Type**: spec-kit extension command (judgment artifact).
**Performance/Constraints**: Read-only; must not modify any file; must degrade gracefully.
**Scale/Scope**: One command body + one shared report template.

## Constitution Check

| # | Principle | Compliance | Status |
|---|-----------|-----------|--------|
| I | Canonical Conformance | Command file named `speckit.roadmap.brief.md`; report mirrors `critique`'s template/severity/verdict conventions; shared template under `templates/`. | ✅ |
| II | Determinism Split | No new deterministic logic — reuses tested `load-config`; the command body is pure judgment and is NOT unit-tested (validated by dogfood). | ✅ |
| III | Non-Destructive | STRICTLY read-only; instructs status transition, never applies it; report writes are additive/timestamped. | ✅ |
| IV | Roadmap as Durable Governance | Consumes the roadmap as the source of pre-implementation intent. | ✅ |
| V | Cross-Platform Parity | No new scripts; the one script dependency is already parity-proven. | ✅ |
| VI | Elicitation Completeness | N/A (read-only review, no elicitation) — degrades gracefully instead of fabricating. | ✅ |
| VII | Dogfood | Already dogfooded on spec 001 (surfaced real drift); re-validated here. | ✅ |

No violations. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-roadmap-brief/
├── plan.md
├── research.md            # decisions (mostly inherited from the design grilling)
├── quickstart.md          # how to validate the brief (dogfood steps)
└── tasks.md               # /speckit-tasks output
```
(No data-model.md or contracts/ — no new data structures or machine contracts; the report
is human-facing prose governed by the shared template.)

### Source Code (repository root)

```text
commands/
└── speckit.roadmap.brief.md       # the command body (formalize to full report standard)

templates/
└── review-report-template.md      # NEW — shared report skeleton (severity, findings, verdict)
                                    #       reused by debrief (003) and sync (004)
```

**Structure Decision**: No new scripts, no tests directory additions. The only new shipped
asset is the shared `review-report-template.md`; the brief command body is rewritten to
reference it and the installed `load-config` path. Reports are written at runtime under the
active feature's `roadmap-reviews/` directory (not part of the shipped extension).

## Complexity Tracking

> No violations; no entries.
