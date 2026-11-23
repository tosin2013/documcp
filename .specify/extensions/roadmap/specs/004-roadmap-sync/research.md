# Phase 0 Research: 004-roadmap-sync

Decisions inherited from the design grilling and specs 001–003.

## D1 — Read-only, judgment-only; model enumerates `specs/`
- **Decision**: Reuse `load-config`; the model lists `specs/*/` directly (no dedicated
  script). Body is judgment, validated by dogfood (Principle II). No Bats/Pester.
- **Rationale**: Directory enumeration is trivial and non-brittle; a script would add no
  value. The judgment (classifying divergence) cannot be scripted. Mirrors how
  `verify`/`verify-tasks` build inventories in-model.

## D2 — STATUS is the pivot for disk-existence expectations
- **Decision**: pre-commitment (`undecided`/`needs-info`/`planned`) → no dir expected;
  lifecycle (`specced`/`in-progress`/`implemented`/`verified`) → non-empty dir expected;
  off-ramp (`deferred`/`abandoned`) → dir optional.
- **Rationale**: Without status-gating, every `planned` entry looks like a phantom and every
  new spec like an orphan. This is the core correctness rule (from the grilling).

## D3 — Divergence taxonomy
- **Decision**: orphan-spec, phantom-entry (lifecycle status + no/empty dir), status-lagging
  (pre-commitment + dir exists), dependency-contradiction, superseded-ADR (only if decision
  records present).
- **Rationale**: Phantom-entry mirrors core `verify-tasks` phantom-completion logic applied
  to ledger entries.

## D4 — Whole-ledger scope, roadmap-level report
- **Decision**: sync reconciles ALL entries (not one spec) and writes a roadmap-level report
  (`.specify/memory/roadmap-sync-{timestamp}.md`), unlike brief/debrief's per-feature reports.
- **Rationale**: sync is a project-wide, on-demand check, not a per-spec hook.

## D5 — Shared report template + propose-not-apply
- **Decision**: Use `templates/review-report-template.md`; propose reconciling actions only.
- **Rationale**: Conformance + Non-Destructive.

## Out of scope
- brief / debrief (specs 002/003); any roadmap mutation (that is `write`, spec 001).
