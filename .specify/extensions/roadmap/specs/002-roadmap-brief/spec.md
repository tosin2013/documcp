# Feature Specification: Roadmap Brief — Pre-Implementation Review

**Feature Branch**: `002-roadmap-brief`
**Created**: 2026-06-24
**Status**: Draft
**Input**: User description: "harden the roadmap.brief pre-implementation review command"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Brief the build before implementing a spec (Priority: P1)

A practitioner is about to implement a spec. Before they start, the brief command
surfaces everything the roadmap recorded about that spec — its intended outcome, what
is in and out of scope, the decisions and constraints that govern it, the specs it
depends on (and whether those are done), and any open questions — so the implementation
is grounded in the original intent rather than re-derived from the spec text alone.

**Why this priority**: This is the command's entire purpose and the realization of the
`before_implement` hook. It is what prevents an implementer from quietly diverging from
decisions made weeks earlier. Independently valuable on its own.

**Independent Test**: With a roadmap and an active spec present, run the brief; confirm a
read-only briefing report is produced that surfaces the spec's roadmap entry and governing
context, and that no files are modified.

**Acceptance Scenarios**:

1. **Given** a roadmap and an active spec with a matching ledger entry, **When** the brief
   runs, **Then** it produces a briefing report containing the entry's description,
   outcome, scope (in/out), dependencies (with each dependency's status), governing
   decisions/ADRs, product-intent pointer, and related open questions / cross-cutting
   notes.
2. **Given** the spec as written has diverged from what the roadmap entry anticipated,
   **When** the brief runs, **Then** the divergence is reported as a pre-implementation
   drift finding with a severity and a constructive suggestion.
3. **Given** the brief completes, **When** the report is produced, **Then** no roadmap,
   spec, or other file has been modified (strictly read-only).

### User Story 2 - Be told to advance status, without it being done silently (Priority: P2)

When a spec is about to be implemented, its roadmap entry should advance to in-progress.
The brief recommends this transition but never performs it, so the practitioner stays in
control of the durable record.

**Why this priority**: Preserves the non-destructive principle and keeps the roadmap an
intentional artifact, while still moving the lifecycle forward.

**Independent Test**: Run the brief on a spec whose entry is not yet in-progress; confirm
the report instructs the user to make the transition (via the authoring command) and does
not itself change the status.

**Acceptance Scenarios**:

1. **Given** a spec entry not yet marked in-progress, **When** the brief runs, **Then** the
   report instructs the user to transition it to in-progress via the authoring command.
2. **Given** the brief runs, **When** it recommends the transition, **Then** it does not
   write the status change itself.

### Edge Cases

- No roadmap exists yet → the brief reports this and suggests creating one with the
  authoring command, rather than failing.
- The active spec has no matching ledger entry → the brief reports the spec is not on the
  roadmap and suggests adding it, rather than guessing an entry.
- Roadmap entry numbering does not match the spec directory number (known drift) → the
  brief still matches the entry by title or spec-directory pointer.
- The decision-record directory is absent → governing-decision pointers that reference
  external records are noted as unresolved links, without error.
- A dependency listed in the entry is itself abandoned or missing → the brief flags this
  as a finding.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command MUST be STRICTLY READ-ONLY — it MUST NOT modify the roadmap, the
  spec, or any other file; it only emits a briefing report.
- **FR-002**: The command MUST contain no new deterministic script logic of its own; it
  MUST reuse the existing configuration-resolution step and the core feature-resolution
  step. (It is judgment, validated by dogfood, not by unit tests.)
- **FR-003**: The command MUST locate the active spec's roadmap ledger entry, matching by
  spec-directory pointer, then title, then number, tolerating numbering drift between
  roadmap entries and spec directories. If the match is ambiguous (e.g. multiple entries
  with similar titles), the command MUST list the candidates and ask rather than guessing.
- **FR-004**: The briefing MUST surface, for the matched entry: description, outcome,
  scope (in/out), dependencies and each dependency's current status, governing
  decisions/constraints (resolving external decision-record pointers only when the
  decision-record directory is present), product-intent pointer, and related open
  questions / cross-cutting notes.
- **FR-005**: The command MUST detect and report pre-implementation drift — where the spec
  as written no longer matches what the roadmap entry anticipated.
- **FR-006**: The command MUST produce its report using the shared review-report structure
  with the severity vocabulary (Must-Address / Recommendation / Question) and a verdict,
  consistent with the project's other review outputs.
- **FR-007**: The report MUST be written to a per-feature review location and MUST NOT
  overwrite prior review reports (timestamped or otherwise distinct).
- **FR-008**: The command MUST recommend transitioning the entry to in-progress as an
  instruction only, and MUST NOT perform the transition itself.
- **FR-009**: The command MUST degrade gracefully: when no roadmap exists, when the spec
  has no matching entry, or when the decision-record directory is absent, it reports the
  situation and a suggested next action rather than erroring.
- **FR-010**: The command and its shared report template MUST conform to the established
  spec-kit extension structure and the conventions of the project's other review commands.

### Key Entities *(include if feature involves data)*

- **Briefing report**: The read-only output. Contains the surfaced entry context, drift
  findings (with severity), and a recommended next action.
- **Review-report template**: A shared skeleton (reused by the post-implementation and
  reconciliation reviews) defining the report's sections, severity vocabulary, findings
  table, and verdict.
- **Ledger entry (referenced)**: The roadmap entry being briefed; read, never written.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a spec on the roadmap, a single brief invocation surfaces 100% of the
  entry's recorded fields (description, outcome, scope, dependencies, governing decisions,
  product-intent, related questions) without the user opening the roadmap manually.
- **SC-002**: The command modifies zero files (verifiable: file modification times and
  content unchanged after a run).
- **SC-003**: When the spec has diverged from its roadmap entry, the divergence appears as
  a drift finding in the report.
- **SC-004**: When the entry is not yet in-progress, the report contains an explicit
  instruction to transition it, and the status remains unchanged after the run.
- **SC-005**: In each degraded case (no roadmap, no matching entry, no decision-record
  directory), the command produces a clear report with a suggested next action and a
  zero/handled exit rather than an error.

## Assumptions

- This is a per-command spec within the speckit-roadmap extension; the configuration and
  authoring pieces already exist and are verified (spec 001).
- The roadmap and its ledger structure are as defined by the authoring command (spec 001).
- Review reasoning is judgment and is validated by dogfooding the command on real specs,
  not by unit tests — consistent with the constitution's determinism split.
- A functional brief already exists from the bootstrap and was dogfooded on spec 001; this
  spec formalizes it to the full report-template + severity + verdict standard.
