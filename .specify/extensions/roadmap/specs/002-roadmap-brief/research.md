# Phase 0 Research: 002-roadmap-brief

Decisions inherited from the design grilling and spec 001; consolidated here.

## D1 — Read-only, judgment-only (no new script, no new tests)

- **Decision**: The brief ships no deterministic script. It reuses spec 001's
  `load-config` (paths/config) + core `check-prerequisites` (active feature). The body
  is judgment; per Constitution Principle II it is validated by dogfood, not unit tests.
- **Rationale**: Surfacing context, judging drift, and recommending a transition are
  reasoning, not deterministic computation. Adding a script here would invent judgment-
  in-strings.
- **Alternatives**: A script that parses the roadmap into JSON for the model — rejected
  (brittle markdown parsing; the model reads markdown directly, like `verify`/`critique`).

## D2 — Shared review-report template

- **Decision**: Create `templates/review-report-template.md` once; brief, debrief, and
  sync all use it. Severity vocabulary 🎯 Must-Address / 💡 Recommendation / 🤔 Question
  + a verdict, mirroring `critique-template.md`.
- **Rationale**: Canonical Conformance + DRY across the three review commands.

## D3 — Entry matching tolerant of numbering drift

- **Decision**: Match the active spec to its ledger entry by spec-dir pointer first, then
  title, then number. Do not assume roadmap entry number == spec dir number.
- **Rationale**: The dogfood already exposed this drift (roadmap entry 002 ↔ spec dir
  001). The match must survive it.

## D4 — Instruct, never apply, the status transition

- **Decision**: The brief recommends the in-progress transition in its report; the
  transition is applied only by `/speckit.roadmap.write`.
- **Rationale**: Non-Destructive principle; keeps the roadmap an intentional record.

## D5 — Report location

- **Decision**: `FEATURE_DIR/roadmap-reviews/brief-{timestamp}.md`, additive (never
  overwrites prior reports), mirroring `critique`'s `critiques/` convention.

## Out of scope

- debrief / sync behavior (their own specs, 003/004).
- Any roadmap mutation (that is `write`, spec 001).
