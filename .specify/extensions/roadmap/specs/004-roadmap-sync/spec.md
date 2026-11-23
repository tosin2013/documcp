# Feature Specification: Roadmap Sync — Ledger ↔ Reality Reconciliation

**Feature Branch**: `004-roadmap-sync`
**Created**: 2026-06-24
**Status**: Draft
**Input**: User description: "harden the roadmap.sync drift-reconciliation command"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reconcile the whole roadmap against reality (Priority: P1)

A practitioner periodically checks whether the roadmap still reflects reality. The sync
command compares the entire planned-specs ledger against the spec directories on disk (and
the decision records, if present) and reports every divergence — so the roadmap stays an
honest, trustworthy record rather than quietly going stale across many features.

**Why this priority**: This is the command's purpose. Unlike brief/debrief (one spec, at a
hook), sync looks at the whole project at once and is run on demand. It is what keeps the
roadmap honest over time.

**Independent Test**: With a roadmap and some spec directories present, run sync; confirm a
read-only reconciliation report listing each divergence by type, and that no file is modified.

**Acceptance Scenarios**:

1. **Given** a roadmap ledger and the spec directories on disk, **When** sync runs, **Then**
   it produces a report listing divergences classified as: orphan-spec, phantom-entry,
   status-drift, dependency-contradiction, or superseded-ADR.
2. **Given** the ledger and disk fully agree, **When** sync runs, **Then** the report shows
   no divergences and a clean verdict.
3. **Given** sync completes, **When** the report is produced, **Then** no roadmap or spec
   file has been modified (strictly read-only).

### User Story 2 - Status-aware phantom & orphan detection (Priority: P1)

The disk-existence expectation for each ledger entry depends on its status. An entry in a
pre-commitment status legitimately has no spec directory; an entry claiming progress must
have one. Sync uses status as the pivot so it does not produce false "phantom" or "missing"
findings.

**Why this priority**: Naive disk checking would flag every `planned` entry as a phantom and
every just-created spec as an orphan, making the command useless. Status-gating is what makes
the detection correct.

**Independent Test**: Construct entries across statuses (planned with no dir; in-progress
with a dir; in-progress with NO dir; a dir with no entry) and confirm sync classifies each
correctly.

**Acceptance Scenarios**:

1. **Given** an entry whose status is pre-commitment (`undecided`/`needs-info`/`planned`),
   **When** there is no spec directory, **Then** that is NOT flagged (expected).
2. **Given** an entry whose status implies work has started/finished
   (`specced`/`in-progress`/`implemented`/`verified`), **When** no spec directory (or an
   empty one) exists, **Then** it is flagged as a phantom-entry.
3. **Given** a pre-commitment entry that DOES have a spec directory on disk, **When** sync
   runs, **Then** it is flagged as status-lagging (suggest advancing the status).
4. **Given** a spec directory on disk with no ledger entry, **When** sync runs, **Then** it
   is flagged as an orphan-spec (suggest adding it to the roadmap).

### Edge Cases

- No roadmap exists → report this and suggest creating one; do not error.
- A `deferred`/`abandoned` entry that still has a spec directory with recent activity →
  flag as "abandoned-but-active" for review.
- An entry `depends-on` a spec that is `abandoned` or missing → dependency-contradiction.
- An entry `governed-by` an ADR marked superseded → superseded-ADR (only when the
  decision-record directory is present).
- The `specs/` directory is empty or absent → report no specs on disk; entries in
  pre-commitment statuses are still fine.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The command MUST be STRICTLY READ-ONLY — it MUST NOT modify the roadmap, any
  spec, or any other file; it only emits a reconciliation report and PROPOSES changes.
- **FR-002**: The command MUST contain no new deterministic script logic; it MUST reuse the
  existing configuration-resolution step and enumerate spec directories by listing `specs/`
  directly. (Judgment, validated by dogfood, not unit tests.)
- **FR-003**: The command MUST reconcile the entire planned-specs ledger against the spec
  directories on disk, not a single spec.
- **FR-004**: The command MUST use each entry's STATUS as the pivot for disk-existence
  expectations: pre-commitment statuses (`undecided`/`needs-info`/`planned`) expect no
  directory; lifecycle statuses (`specced`/`in-progress`/`implemented`/`verified`) expect a
  non-empty directory; off-ramp statuses (`deferred`/`abandoned`) may or may not have one.
- **FR-005**: The command MUST classify divergences as: orphan-spec (directory, no entry),
  phantom-entry (lifecycle status but no/empty directory), status-lagging (pre-commitment
  status but a directory exists), dependency-contradiction (depends-on an abandoned/missing
  spec), and superseded-ADR (governed-by a superseded ADR, only when decision records present).
  Dependency-contradiction is resolved by looking up each `depends-on` reference against the
  ledger's own entries; a reference to a missing or `abandoned` entry is the contradiction.
- **FR-006**: The command MUST treat a lifecycle-status entry as a phantom-entry when its
  spec directory is absent OR effectively empty — defined as a cheap signal: `spec.md` is
  missing or still the unfilled template. This avoids false-flagging a freshly created spec
  directory (no deep content scan is required). **Exception**: an entry with NO `spec dir:`
  pointer is a *process/bootstrap entry* (work not delivered as a numbered spec) and MUST NOT
  be flagged as a phantom — it is reported as an informational "process entry" instead.
- **FR-007**: The command MUST produce its report using the shared review-report structure
  (severity vocabulary, findings table grouped by divergence type, verdict), written to a
  roadmap-level location, without overwriting prior reports.
- **FR-008**: The command MUST propose reconciling actions (e.g. "add orphan spec to the
  roadmap", "advance status", "investigate phantom") as instructions only — it MUST NOT apply
  any change.
- **FR-009**: The command MUST degrade gracefully: no roadmap, empty/absent `specs/`, or
  absent decision-record directory each yield a clear report rather than an error.
- **FR-010**: The command and the shared report template MUST conform to the established
  spec-kit extension structure and the project's other review commands.

### Key Entities *(include if feature involves data)*

- **Reconciliation report**: The read-only output — divergences grouped by type, each with a
  severity and a proposed action; a verdict; written at roadmap level.
- **Divergence classification**: orphan-spec · phantom-entry · status-lagging ·
  dependency-contradiction · superseded-ADR.
- **Ledger (referenced)** and **spec directories on disk (enumerated)**: the two sides being
  reconciled; both read, neither written.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single sync invocation classifies every ledger-vs-disk divergence across the
  whole project, without the user comparing manually.
- **SC-002**: The command modifies zero files (verifiable by unchanged modification times).
- **SC-003**: Status-gating is correct: a pre-commitment entry with no directory is never
  flagged; a lifecycle-status entry with no/empty directory is always flagged as phantom.
- **SC-004**: A spec directory with no ledger entry is always flagged as orphan-spec.
- **SC-005**: When ledger and disk agree, the report shows zero divergences and a clean verdict.
- **SC-006**: In each degraded case (no roadmap, empty `specs/`, no decision-record dir), the
  command produces a clear report rather than erroring.

## Assumptions

- Per-command spec within the speckit-roadmap extension; configuration, authoring, and the
  shared review template already exist and are verified (specs 001–003).
- Enumerating `specs/` directories and checking emptiness is simple, robust filesystem
  listing done by the command itself; it is not complex enough to warrant a dedicated script
  (consistent with the determinism split — no judgment, but also no brittle parsing).
- Review reasoning is judgment, validated by dogfooding, not unit tests.
- A functional sync already exists from the bootstrap; this spec formalizes it to the full
  report standard and the status-gated divergence taxonomy.
