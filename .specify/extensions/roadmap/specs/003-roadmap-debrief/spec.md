# Feature Specification: Roadmap Debrief — Post-Implementation Review

**Feature Branch**: `003-roadmap-debrief`
**Created**: 2026-06-24
**Status**: Draft
**Input**: User description: "harden the roadmap.debrief post-implementation review command"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check the build against the roadmap after implementing (Priority: P1)

A practitioner has just implemented a spec. The debrief command compares what was actually
built against what the roadmap said the spec should deliver — its intended outcome and its
scope — and reports any divergence, so drift is caught at the moment it happens rather than
discovered much later.

**Why this priority**: This is the command's purpose and the realization of the
`after_implement` hook. It closes the loop opened by the brief: brief sets the expectation,
debrief checks the result. Independently valuable.

**Independent Test**: With a roadmap and an implemented spec present, run the debrief;
confirm a read-only report is produced classifying any drift between the implementation and
the spec's roadmap entry, and that no file is modified.

**Acceptance Scenarios**:

1. **Given** a roadmap entry and its now-implemented spec, **When** the debrief runs,
   **Then** it produces a report classifying drift as: outcome-miss, scope-creep,
   constraint-violation, or roadmap-stale (or reports no drift).
2. **Given** the implementation fully matches the entry's outcome and scope, **When** the
   debrief runs, **Then** it proposes transitioning the entry's status to verified.
3. **Given** the debrief completes, **When** the report is produced, **Then** no roadmap,
   spec, or implementation file has been modified (strictly read-only).

### User Story 2 - Distinguish "spec wrong" from "roadmap wrong" (Priority: P2)

Sometimes the implementation is correct and it is the roadmap entry that has gone stale.
The debrief must name this case (roadmap-stale) and propose updating the roadmap, rather
than flagging the implementation as wrong.

**Why this priority**: Without this distinction, a stale roadmap produces false "the build
is wrong" findings, eroding trust in the review. It is what makes the debrief honest.

**Independent Test**: Run the debrief where the implementation legitimately exceeds or
refines the entry; confirm it classifies the gap as roadmap-stale and proposes a roadmap
amendment, not an implementation fix.

**Acceptance Scenarios**:

1. **Given** the implementation is correct but the entry no longer reflects what was
   decided, **When** the debrief runs, **Then** it classifies the gap as roadmap-stale and
   proposes amending the roadmap via the authoring command.
2. **Given** a roadmap-stale finding, **When** it is reported, **Then** it does not assert
   the implementation is defective.

### Edge Cases

- No roadmap exists → report this and suggest creating one; do not error.
- The implemented spec has no matching ledger entry → report it is not on the roadmap and
  suggest adding it; do not invent an entry.
- A `governed-by` constraint/ADR is violated by the implementation → this is the highest
  severity (must-address), per constitution authority.
- The implementation only partially completes the spec → reported as outcome-miss with the
  unmet portion identified.
- The decision-record directory is absent → governing-decision pointers noted as unresolved
  links, without error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command MUST be STRICTLY READ-ONLY — it MUST NOT modify the roadmap, the
  spec, or any implementation file; it only emits a review report and PROPOSES changes.
- **FR-002**: The command MUST contain no new deterministic script logic; it MUST reuse the
  existing configuration-resolution and core feature-resolution steps. (Judgment, validated
  by dogfood, not unit tests.)
- **FR-003**: The command MUST locate the implemented spec's roadmap ledger entry, matching
  by spec-directory pointer, then title, then number, tolerating numbering drift; if the
  match is ambiguous it MUST list candidates and ask rather than guessing.
- **FR-004**: The command MUST compare the implementation against the entry's recorded
  outcome and scope and classify drift as one of: outcome-miss, scope-creep,
  constraint-violation, or roadmap-stale. A partial implementation (only part of the spec
  built) MUST be classified as outcome-miss with the unmet portion identified. To keep the
  review bounded and repeatable, the command SHOULD examine the files referenced by the
  spec's scope/tasks rather than the whole repository.
- **FR-005**: A `governed-by` constraint or ADR violation MUST be classified as the highest
  severity (must-address).
- **FR-006**: When the implementation is correct but the entry is outdated, the command MUST
  classify the gap as roadmap-stale and propose amending the roadmap — it MUST NOT report
  the implementation as defective in that case.
- **FR-007**: The command MUST propose transitioning the entry's status to verified ONLY
  when the entry's outcome is met AND there are no must-address findings; otherwise it MUST
  NOT propose verified (it may note a lesser status or none). The proposal is an instruction
  only — the command never performs the transition itself.
- **FR-008**: The command MUST produce its report using the shared review-report structure
  (severity vocabulary Must-Address / Recommendation / Question, findings table, verdict),
  written to a per-feature review location, without overwriting prior reports.
- **FR-009**: The command MUST degrade gracefully: no roadmap, no matching entry, or absent
  decision-record directory each yield a clear report and suggested next action, not an error.
- **FR-010**: The command and the shared report template MUST conform to the established
  spec-kit extension structure and the project's other review commands.

### Key Entities *(include if feature involves data)*

- **Debrief report**: The read-only output — drift findings (classified + severity), a
  verdict, and proposed actions (verified transition and/or roadmap amendment).
- **Drift classification**: outcome-miss · scope-creep · constraint-violation · roadmap-stale.
- **Ledger entry (referenced)**: the roadmap entry being checked; read, never written.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For an implemented spec on the roadmap, a single debrief invocation produces a
  classified drift report (or a clean "no drift" result) without the user comparing manually.
- **SC-002**: The command modifies zero files (verifiable by unchanged modification times).
- **SC-003**: A `governed-by` violation always appears as a must-address finding.
- **SC-004**: When the implementation matches the entry, the report proposes the verified
  transition and the status remains unchanged after the run.
- **SC-005**: A correct-implementation/stale-entry situation is classified as roadmap-stale
  and proposes a roadmap amendment, never an implementation-defect finding.
- **SC-006**: In each degraded case, the command produces a clear report with a next action
  rather than erroring.

## Assumptions

- Per-command spec within the speckit-roadmap extension; configuration, authoring, and the
  shared review template already exist and are verified (specs 001, 002).
- Review reasoning is judgment, validated by dogfooding on real implemented specs, not unit
  tests — consistent with the constitution's determinism split.
- A functional debrief already exists from the bootstrap and was dogfooded on spec 001; this
  spec formalizes it to the full report-template + severity + verdict standard and the
  drift-classification taxonomy.
