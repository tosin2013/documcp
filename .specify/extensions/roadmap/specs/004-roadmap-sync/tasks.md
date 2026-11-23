---
description: "Task list for 004-roadmap-sync — ledger↔reality reconciliation command"
---

# Tasks: Roadmap Sync — Ledger ↔ Reality Reconciliation

**Input**: Design documents from `/specs/004-roadmap-sync/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: NONE new. Judgment command (Principle II), validated by dogfood. Its only script
dependency (`load-config`) is covered by spec 001's 96 tests. No command-body unit tests.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 (whole-ledger reconcile), US2 (status-gated phantom/orphan)

---

## Phase 1: User Story 1 — Reconcile the whole roadmap (P1) 🎯 MVP

- [X] T001 [US1] Formalize `commands/speckit.roadmap.sync.md` to FR-001–003/007–010:
  read-only; reuse installed `load-config`; enumerate `specs/*/` directly; reconcile the
  WHOLE ledger against disk + decision records; write a roadmap-level report
  (`.specify/memory/roadmap-sync-{timestamp}.md`) using the shared `review-report-template.md`
  grouped by divergence type with a verdict; propose reconciling actions (instruction only);
  degrade gracefully (no roadmap / empty specs/ / no adr dir).

## Phase 2: User Story 2 — Status-gated phantom & orphan detection (P1)

- [X] T002 [US2] Implement the STATUS-as-pivot logic (FR-004–006): pre-commitment statuses
  expect no dir (dir present → status-lagging); lifecycle statuses expect a non-empty dir
  (no/empty dir → phantom-entry); off-ramp dir optional (present+active → abandoned-but-active);
  spec dir with no entry → orphan-spec; depends-on abandoned/missing → dependency-contradiction;
  governed-by superseded ADR → superseded-ADR (only if decision records present).

## Phase 3: Polish & dogfood

- [X] T003 Verify `extension.yml` sync entry (manual, no hook); confirm frontmatter references
  the installed `load-config` path. Remove any stale "built in implement phase" placeholder.
- [X] T004 Reinstall via staging and dogfood per quickstart, INCLUDING running sync against THIS
  repo (4 specs + the ledger): confirm status-gating correctness, orphan detection, read-only
  proof, and degraded cases. (SC-001–SC-006)

---

## Dependencies & Execution Order

- T001 → T002 (same command file, sequential). Polish (T003–T004) after the body is formalized.

## Implementation Strategy

Judgment-only: precise command-body prose reusing the shared report template. The `specs/`
enumeration is trivial in-model listing (no script). Validation is the dogfood (T004) — which
doubles as a real reconciliation of this repo's own roadmap.
