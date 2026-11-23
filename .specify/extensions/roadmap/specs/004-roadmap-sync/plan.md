# Implementation Plan: Roadmap Sync — Ledger ↔ Reality Reconciliation

**Branch**: `004-roadmap-sync` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-roadmap-sync/spec.md`

## Summary

Formalize `speckit.roadmap.sync` (manual, no hook) to the full report standard. Read-only,
judgment-only: reuses `load-config` (no new scripts/tests), enumerates `specs/` directories
directly, reconciles the whole ledger against disk + decision records, classifies
divergences with STATUS as the pivot, and writes a roadmap-level report using the shared
`review-report-template.md`.

## Technical Context

**Language/Version**: Markdown command body (judgment) + reuse of spec 001's `load-config`.
No new executable code.
**Primary Dependencies**: spec-kit host; `load-config` (spec 001); shared
`review-report-template.md` (spec 002).
**Storage**: Reads `.specify/memory/roadmap.md`, enumerates `specs/*/`, reads decision records
if present; writes a report at roadmap level (`.specify/memory/roadmap-sync-{timestamp}.md`).
**Testing**: None new — judgment (Principle II), validated by dogfood. Script dependency
covered by spec 001's tests.
**Target Platform**: macOS/Linux/Windows (platform-neutral body; the model lists `specs/`).
**Project Type**: spec-kit extension command (manual, judgment artifact).
**Constraints**: Read-only; status is the pivot for disk-existence expectations; whole-ledger
scope (not one spec).
**Scale/Scope**: One command body (formalize existing) + reuse of the shared template.

## Constitution Check

| # | Principle | Compliance | Status |
|---|-----------|-----------|--------|
| I | Canonical Conformance | `speckit.roadmap.sync.md`; shared report template; mirrors critique/verify-tasks. | ✅ |
| II | Determinism Split | No new deterministic logic; reuses tested `load-config`; the `specs/` listing is trivial enumeration, not judgment-in-strings; body is judgment, not unit-tested. | ✅ |
| III | Non-Destructive | STRICTLY read-only; proposes reconciling actions, never applies. | ✅ |
| IV | Roadmap as Durable Governance | Keeps the whole ledger honest against reality over time. | ✅ |
| V | Cross-Platform Parity | No new scripts; the one script dependency is parity-proven. | ✅ |
| VI | Elicitation Completeness | N/A (read-only review) — degrades gracefully, never fabricates. | ✅ |
| VII | Dogfood | Will be dogfooded across all four specs at once (the real reconciliation). | ✅ |

No violations. Complexity Tracking empty.

## Project Structure

### Documentation (this feature)
```text
specs/004-roadmap-sync/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```
(No data-model.md/contracts/ — no new structures; the report uses the shared template.)

### Source Code (repository root)
```text
commands/
└── speckit.roadmap.sync.md     # formalize to full status-gated reconciliation + report standard
templates/
└── review-report-template.md   # REUSED, not modified
```

**Structure Decision**: No new scripts/tests. Only `commands/speckit.roadmap.sync.md` is
hardened (status-gated divergence taxonomy, whole-ledger scope, graceful degradation, shared
report). The `specs/` enumeration is done by the model (trivial listing); per the determinism
split this is acceptable because it involves no judgment AND no brittle parsing — it is a
plain directory listing, the same kind of inventory work `verify`/`verify-tasks` do in-model.

## Complexity Tracking

> No violations; no entries.
