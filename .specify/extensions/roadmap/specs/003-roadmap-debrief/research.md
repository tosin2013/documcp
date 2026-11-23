# Phase 0 Research: 003-roadmap-debrief

Decisions inherited from the design grilling and specs 001/002.

## D1 — Read-only, judgment-only (no new script/tests)
- **Decision**: Reuse `load-config` + core `check-prerequisites`; the body is judgment,
  validated by dogfood (Principle II). No Bats/Pester.
- **Rationale**: Drift classification and the verified/stale distinction are reasoning.

## D2 — Drift taxonomy
- **Decision**: Four classes — outcome-miss, scope-creep, constraint-violation,
  roadmap-stale. A `governed-by` violation is always must-address (constitution authority).
- **Rationale**: Matches the grilled design; mirrors how `verify`/`bugfix` classify findings.

## D3 — Distinguish roadmap-stale from implementation-defect
- **Decision**: When the implementation is correct but the entry is outdated, classify as
  roadmap-stale and propose a roadmap amendment — never an implementation-defect finding.
- **Rationale**: Prevents false "build is wrong" findings; keeps the review trustworthy.
  Already exercised: the spec 001 debrief correctly flagged roadmap-stale (parity drift).

## D4 — Propose verified, never apply
- **Decision**: On a clean match, propose the `verified` transition; the transition is
  applied only via `/speckit.roadmap.write`.
- **Rationale**: Non-Destructive principle.

## D5 — Shared report template + ambiguous-match tie-break
- **Decision**: Use `templates/review-report-template.md` (from spec 002). Entry matching
  by spec-dir → title → number, with the tie-break (list candidates + ask) added in spec 002.
- **Rationale**: Conformance + DRY across the three review commands.

## Out of scope
- brief / sync behavior (specs 002 / 004); any roadmap mutation (that is `write`, spec 001).
