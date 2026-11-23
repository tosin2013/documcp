# Quickstart / Validation: 002-roadmap-brief

The brief is judgment (read-only), so validation is by dogfooding, not unit tests.

## Prerequisites

- A spec-kit project with a roadmap (`.specify/memory/roadmap.md`) and at least one spec.
- The roadmap extension installed (deployed `speckit-roadmap-brief` skill).

## 1. Brief a spec that IS on the roadmap (happy path)

Run the `speckit-roadmap-brief` skill with an active feature whose ledger entry exists.

**Expected**: a report at `FEATURE_DIR/roadmap-reviews/brief-{timestamp}.md` surfacing the
entry's description, outcome, scope (in/out), dependencies + their statuses, governing
decisions/ADRs, product-intent pointer, and related open questions. A verdict + any
pre-implementation drift findings with severity. **No file other than the report is
modified.** (SC-001, SC-002, SC-003)

## 2. Verify read-only + status instruction

Note the roadmap's modification time before and after the run; confirm unchanged.
Confirm the report **instructs** transitioning the entry to in-progress (via
`/speckit.roadmap.write`) and that the status was NOT changed by the brief. (SC-002, SC-004)

## 3. Degraded cases (SC-005)

- Run with no roadmap present → report says so + suggests `/speckit.roadmap.write`.
- Run on a spec with no matching ledger entry → report says the spec isn't on the roadmap
  + suggests adding it.
- Run with no decision-record directory → governing-decision pointers noted as unresolved
  links, no error.

## Acceptance mapping

- US1 (surface entry + drift) → step 1. US2 (instruct, don't apply) → step 2.
- Graceful degradation → step 3.

> Already partially dogfooded: the brief ran for real on spec 001 and correctly surfaced
> the parity/numbering drift before implementation.
