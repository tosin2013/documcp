---
description: "Task list for 002-roadmap-brief — pre-implementation review command"
---

# Tasks: Roadmap Brief — Pre-Implementation Review

**Input**: Design documents from `/specs/002-roadmap-brief/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: NONE new. This command is judgment (Constitution Principle II), validated by
dogfood (quickstart). Its only script dependency (`load-config`) is already covered by
spec 001's 96 tests. Do NOT add unit tests for the command body.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 (surface + drift), US2 (instruct, don't apply)

---

## Phase 1: Shared asset

- [X] T001 Create `templates/review-report-template.md` — the shared report skeleton used
  by brief, debrief, and sync: header (date, feature, verdict), findings table with the
  🎯 Must-Address / 💡 Recommendation / 🤔 Question severity vocabulary, a summary
  counts table, and a verdict legend. Base it on `.specify/extensions/critique/commands/critique-template.md`.

## Phase 2: User Story 1 — Brief the build (P1) 🎯 MVP

- [X] T002 [US1] Formalize `commands/speckit.roadmap.brief.md` to FR-001–007/009: read-only;
  reuse installed `load-config` + core `check-prerequisites`; match the active spec to its
  ledger entry (spec-dir → title → number, tolerating numbering drift); surface entry
  description/outcome/scope/dependencies+statuses/governed-by (resolve ADRs only if
  adr_present)/addresses/related open questions; detect + report pre-implementation drift;
  write the report to `FEATURE_DIR/roadmap-reviews/brief-{timestamp}.md` using the shared
  template; degrade gracefully (no roadmap / no entry / no adr dir).

## Phase 3: User Story 2 — Instruct, don't apply (P2)

- [X] T003 [US2] Confirm the command body recommends the in-progress transition as an
  instruction only (via `/speckit.roadmap.write`) and never writes status itself (FR-008).

## Phase 4: Polish & dogfood

- [X] T004 Verify `extension.yml` brief entry + `before_implement` hook are correct; confirm
  frontmatter references the installed `load-config` path (FR-010, FR-002).
- [X] T005 Reinstall via staging (`specify extension add /tmp/STAGE --dev --force`) and dogfood
  per quickstart: brief a spec on the roadmap (happy path + drift), verify read-only, verify
  the status instruction, and the three degraded cases. (SC-001–SC-005)

---

## Dependencies & Execution Order

- T001 (shared template) first — T002 references it.
- T002 → T003 (same command file, sequential).
- Polish (T004–T005) after the body is formalized.

## Implementation Strategy

Judgment-only feature: the "implementation" is precise command-body prose + the shared
report template. Validation is the dogfood (T005), not unit tests — per the determinism
split. The brief was already dogfooded on spec 001; this hardens it to the report standard.
