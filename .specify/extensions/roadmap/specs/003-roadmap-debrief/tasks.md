---
description: "Task list for 003-roadmap-debrief — post-implementation review command"
---

# Tasks: Roadmap Debrief — Post-Implementation Review

**Input**: Design documents from `/specs/003-roadmap-debrief/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: NONE new. Judgment command (Principle II), validated by dogfood. Its only script
dependency (`load-config`) is covered by spec 001's 96 tests. No command-body unit tests.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 (drift check + verified), US2 (stale vs defect)

---

## Phase 1: User Story 1 — Check the build against the roadmap (P1) 🎯 MVP

- [X] T001 [US1] Formalize `commands/speckit.roadmap.debrief.md` to FR-001–005/007–009:
  read-only; reuse installed `load-config` + core `check-prerequisites`; match the
  implemented spec to its ledger entry (spec-dir → title → number, ambiguous → list+ask);
  classify drift (outcome-miss / scope-creep / constraint-violation / roadmap-stale);
  `governed-by` violation = must-address; write the report to
  `FEATURE_DIR/roadmap-reviews/debrief-{timestamp}.md` using the shared
  `review-report-template.md`; propose the `verified` transition (instruction only);
  degrade gracefully (no roadmap / no entry / no adr dir).

## Phase 2: User Story 2 — Stale-vs-defect distinction (P2)

- [X] T002 [US2] Ensure the command classifies a correct-implementation/outdated-entry gap
  as roadmap-stale and proposes a roadmap amendment via `/speckit.roadmap.write`, and does
  NOT report the implementation as defective in that case (FR-006).

## Phase 3: Polish & dogfood

- [X] T003 Verify `extension.yml` debrief entry + `after_implement` hook; confirm frontmatter
  references the installed `load-config` path (FR-002, FR-010). Remove the stale
  "built in the implement phase" placeholder note from the command body if present.
- [X] T004 Reinstall via staging and dogfood per quickstart: debrief a matching impl (propose
  verified), a drifting impl, the roadmap-stale case, read-only proof, and degraded cases.
  (SC-001–SC-006)

---

## Dependencies & Execution Order

- T001 → T002 (same command file, sequential). Polish (T003–T004) after the body is formalized.

## Implementation Strategy

Judgment-only: the "implementation" is precise command-body prose reusing the shared report
template. Validation is the dogfood (T004), not unit tests — per the determinism split. The
debrief was already dogfooded on specs 001 and 002; this hardens it to the full standard and
the drift-classification taxonomy.
