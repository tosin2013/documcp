# Quickstart / Validation: 004-roadmap-sync

The sync is judgment (read-only), validated by dogfooding, not unit tests.

## Prerequisites
- A spec-kit project with a roadmap and some spec directories.
- The roadmap extension installed (deployed `speckit-roadmap-sync` skill).

## 1. Reconcile (happy path)
Run `speckit-roadmap-sync` on a project with a roadmap + specs on disk.
**Expected**: a roadmap-level report (`.specify/memory/roadmap-sync-{timestamp}.md`) listing
divergences by type (orphan-spec / phantom-entry / status-lagging / dependency-contradiction /
superseded-ADR), or a clean verdict if ledger and disk agree. No file other than the report is
modified. (SC-001, SC-002, SC-005)

## 2. Status-gating correctness (SC-003)
Confirm: a `planned` entry with no spec dir is NOT flagged; an `in-progress`/`verified` entry
with no/empty dir IS flagged phantom; a `planned` entry that has a dir is flagged status-lagging.

## 3. Orphan detection (SC-004)
Confirm a `specs/NNN-*/` dir with no ledger entry is flagged orphan-spec.

## 4. Read-only proof (SC-002)
Compare roadmap mtime before/after; confirm unchanged.

## 5. Degraded cases (SC-006)
No roadmap / empty or absent `specs/` / no decision-record dir → clear report, no error.

## Acceptance mapping
- US1 (whole-ledger reconcile) → steps 1, 4. US2 (status-gated phantom/orphan) → steps 2–3.
  Degradation → step 5.

> Real dogfood opportunity: run sync against THIS repo (4 specs on disk + the ledger) — it
> should surface the known numbering drift (entry N ≠ spec-dir N) as status/orphan signals and
> confirm the verified entries match their dirs.
