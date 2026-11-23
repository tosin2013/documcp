# Quickstart / Validation: 003-roadmap-debrief

The debrief is judgment (read-only), validated by dogfooding, not unit tests.

## Prerequisites
- A spec-kit project with a roadmap and at least one implemented spec.
- The roadmap extension installed (deployed `speckit-roadmap-debrief` skill).

## 1. Debrief a matching implementation (happy path)
Run `speckit-roadmap-debrief` with an active feature whose spec is implemented and matches
its ledger entry.
**Expected**: a report at `FEATURE_DIR/roadmap-reviews/debrief-{timestamp}.md` with a clean
drift check and a proposed `verified` transition. No file other than the report is modified.
(SC-001, SC-002, SC-004)

## 2. Debrief with drift
Run where the implementation diverges from the entry.
**Expected**: findings classified as outcome-miss / scope-creep / constraint-violation /
roadmap-stale, with severities; a `governed-by` violation appears as must-address. (SC-001, SC-003)

## 3. Roadmap-stale case (SC-005)
Run where the implementation is correct but the entry is outdated.
**Expected**: classified as roadmap-stale; proposes amending the roadmap via
`/speckit.roadmap.write`; does NOT flag the implementation as defective.

## 4. Read-only proof (SC-002)
Compare roadmap mtime before/after; confirm unchanged.

## 5. Degraded cases (SC-006)
No roadmap / no matching entry / no decision-record directory → clear report + next action,
no error.

## Acceptance mapping
- US1 (drift check + verified) → steps 1–2, 4. US2 (stale vs defect) → step 3. Degradation → step 5.

> Already dogfooded: the debrief ran on specs 001 and 002, correctly proposing verified +
> surfacing roadmap-stale drift, with the roadmap left unmodified.
