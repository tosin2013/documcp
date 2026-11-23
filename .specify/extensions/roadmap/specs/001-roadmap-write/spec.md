# Feature Specification: Roadmap Authoring Command + Config Script + Test Suite

**Feature Branch**: `001-roadmap-write`
**Created**: 2026-06-24
**Status**: Draft
**Input**: User description: "roadmap.write authoring command + load-config script + cross-platform test suite — the foundational spec of the speckit-roadmap extension."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a roadmap right after the constitution (Priority: P1)

A practitioner has just ratified their project constitution. Rich, spec-specific
discussion happened during that phase — technology choices, intended outcomes,
constraints, and the rough shape of specs that won't be written for weeks. They run
the roadmap authoring command. It harvests what's already settled (the constitution,
any detected decision records or product docs, the live discussion), asks them only
about genuine gaps, and writes a durable, versioned roadmap beside the constitution
that records all of it — so none of that intent is lost before the relevant spec is
started.

**Why this priority**: This is the core value of the extension and the foundation
every other command depends on. Without a roadmap artifact there is nothing to brief,
debrief, or sync against. It is independently valuable on its own.

**Independent Test**: Run the authoring command in a project that has a constitution
but no roadmap; confirm a structured, versioned roadmap file is created at the
configured location, populated from harvested context, with genuine gaps surfaced
(not fabricated).

**Acceptance Scenarios**:

1. **Given** a project with a ratified constitution and no existing roadmap, **When**
   the authoring command runs, **Then** a new roadmap is created at the configured
   path containing Vision & End States, Constraints & Decisions, a Planned Specs
   ledger, Open Questions, and a version footer at version 1.0.0 with a completed
   change-impact summary.
2. **Given** the constitution and any detected decision/product documents, **When**
   the roadmap is created, **Then** content the sources support is pre-filled, and
   anything not settled is recorded as an explicit Open Question or a pre-commitment
   ledger entry — never invented.
3. **Given** the command runs with no interactive channel (delegated or hook-driven),
   **When** it cannot ask the user, **Then** it still produces a roadmap, recording
   every unresolved point as an Open Question or pre-commitment entry rather than
   blocking or fabricating.

### User Story 2 - Amend the roadmap as the project evolves (Priority: P2)

As specs get written, started, and finished, the practitioner re-runs the authoring
command to keep the roadmap current — adding new planned specs, recording new
decisions, and advancing spec statuses — without losing any prior content or history.

**Why this priority**: A roadmap that cannot evolve safely becomes stale and is
abandoned. Non-destructive amendment with a version trail is what makes it a durable
governance artifact rather than a one-shot document.

**Independent Test**: Run the command against an existing roadmap, make a change
(e.g. add a spec, advance a status), and confirm the prior content is preserved, the
version bumps according to the change's significance, and the change-impact summary
records what changed.

**Acceptance Scenarios**:

1. **Given** an existing roadmap, **When** the command runs, **Then** it detects the
   existing file and amends it rather than overwriting, preserving all prior entries
   and prose.
2. **Given** a status-only change (e.g. a spec moves to in-progress), **When** the
   roadmap is amended, **Then** the version increments at the smallest level (patch).
3. **Given** a new planned spec or recorded decision is added, **When** the roadmap is
   amended, **Then** the version increments at the structural level (minor).
4. **Given** a change reverses project direction (e.g. removing an end state or a
   constraint that invalidates existing entries), **When** the roadmap is amended,
   **Then** the version increments at the major level and the rationale is stated.
5. **Given** any amendment, **When** it completes, **Then** superseded content is
   marked or struck through, never silently deleted, and the change-impact summary and
   "last amended" date are updated.

### User Story 3 - Reliable, cross-platform configuration resolution (Priority: P1)

Every command in the extension needs to know where the roadmap lives, whether it
already exists, where decision records are, and how to detect product documents. A
single configuration step resolves all of this deterministically and identically on
macOS, Linux, and Windows, so the commands behave the same everywhere.

**Why this priority**: The configuration step is shared infrastructure for all four
commands. If it is non-deterministic or diverges across platforms, every command is
unreliable. It must be correct and provably consistent before any command is trusted.

**Independent Test**: Run the configuration resolution on the same inputs through both
the Linux/bash and Windows/PowerShell implementations and confirm byte-equivalent
structured output; vary the inputs (defaults, file overrides, environment overrides,
invalid values) and confirm each is handled identically.

**Acceptance Scenarios**:

1. **Given** no configuration file, **When** configuration is resolved, **Then** the
   documented built-in defaults are returned.
2. **Given** a configuration file with values, **When** configuration is resolved,
   **Then** those values override the defaults.
3. **Given** an environment override is set, **When** configuration is resolved,
   **Then** the environment value wins over both the file and the defaults.
4. **Given** a configuration value is a null sentinel, **When** configuration is
   resolved, **Then** it is treated as unset and the next source in precedence applies.
5. **Given** an invalid configuration value (e.g. a non-numeric finding limit), **When**
   configuration is resolved, **Then** resolution fails with a non-zero exit status and
   a clear error message, rather than emitting malformed output.
6. **Given** identical inputs, **When** configuration is resolved on bash and on
   PowerShell, **Then** the structured output is identical.

### Edge Cases

- A configuration file exists but omits some keys → present keys override; absent keys
  fall back through the precedence chain.
- The configured roadmap path points at a non-existent file → resolution reports it
  does not yet exist (the create path), without error.
- The configured decision-record directory is absent → resolution reports it as not
  present; decision linkage is simply unused (graceful, no error).
- No product documents match the detection patterns → an empty set is returned, not an
  error.
- The roadmap exists but a pre-commitment entry legitimately lacks an outcome/scope →
  this is permitted for pre-commitment and off-ramp statuses, not flagged as invalid.
- Harvested sources conflict with each other → the command surfaces the conflict for
  resolution rather than silently picking one.
- The roadmap exists but is malformed or hand-edited (missing required structure,
  corrupted change-impact summary or version footer) → the command reports the problem
  and proposes a correction; it MUST NOT silently overwrite or further corrupt the file.
- Configuration resolution is invoked from a working directory other than the repo root
  → it still resolves the repo root and produces the same contract.
- A configuration value contains quotes or special characters → the emitted structured
  output escapes them correctly (no malformed output, no injection).

## Requirements *(mandatory)*

### Functional Requirements

**Authoring command — creation**

- **FR-001**: The system MUST provide a roadmap authoring command that detects whether
  a roadmap already exists at the configured path and chooses create-vs-amend
  accordingly, without the user having to specify which.
- **FR-002**: On creation, the system MUST produce a roadmap containing, in order: a
  change-impact summary, Vision & End States, Constraints & Decisions, a Planned Specs
  ledger, Open Questions, Cross-Cutting Notes, and a version footer.
- **FR-003**: On creation, the system MUST harvest context from available sources — the
  constitution, any detected decision records, any detected product documents, the live
  session discussion, and prior persisted project context — and pre-fill the roadmap
  from what those sources support.
- **FR-004**: The system MUST NOT fabricate goals, outcomes, decisions, or scope to fill
  gaps; unresolved items MUST be recorded as Open Questions or as pre-commitment ledger
  entries.
- **FR-005**: When running interactively, the system MUST ask the user targeted
  questions for genuine gaps and present harvested/proposed content for confirmation
  before writing. When running without an interactive channel, it MUST proceed
  non-interactively, recording gaps as Open Questions/pre-commitment entries instead of
  blocking.
- **FR-006**: On creation, the system MUST set the roadmap version to 1.0.0, stamp the
  ratification and last-amended dates, and complete the change-impact summary.

**Authoring command — amendment**

- **FR-007**: On amendment, the system MUST preserve all existing user-authored content;
  it MUST add or restatus entries rather than overwrite, and MUST mark (not delete)
  superseded content.
- **FR-008**: On amendment, the system MUST limit elicitation to the delta (new specs,
  status transitions, new decisions/constraints, scope changes, open-question changes)
  rather than re-running full creation elicitation.
- **FR-009**: On amendment, the system MUST increment the roadmap version using
  documented rules: major for direction/governance changes, minor for structural
  additions, patch for status transitions and wording; ambiguous cases MUST state the
  reasoning before finalizing.
- **FR-010**: On amendment, the system MUST update the change-impact summary and the
  last-amended date to reflect the change.
- **FR-011**: Both creation and amendment MUST be safe to re-run (idempotent in effect):
  re-running with no new input MUST NOT corrupt or duplicate content.
- **FR-011a**: On amendment, if the existing roadmap is malformed or missing required
  structure (e.g. no version footer, corrupted change-impact summary), the system MUST
  report the problem and propose a correction rather than overwriting or further
  corrupting the file (Non-Destructive principle).

**Roadmap artifact structure**

- **FR-012**: Each Planned Specs ledger entry MUST carry the required fields: a numbered
  heading/title, a status, a description, an outcome, and what is in scope. It SHOULD
  carry what is out of scope, dependencies, and notes; it MAY carry governing-decision
  pointers, product-intent pointers, and a spec-directory pointer.
- **FR-013**: The system MUST support a defined status vocabulary spanning
  pre-commitment, lifecycle, and off-ramp states, and MUST permit pre-commitment and
  off-ramp entries to omit outcome/scope while requiring them for all other states.
- **FR-014**: The roadmap MUST reference (link to) external decision records and product
  documents when present, and MUST NOT author or modify those external artifacts.
- **FR-015**: The system MUST support optional grouping of ledger entries under headings
  without requiring any extra mandatory field.

**Configuration resolution (shared, deterministic)**

- **FR-016**: The system MUST provide a configuration-resolution step that emits a stable
  structured contract identifying: the roadmap path, whether the roadmap exists, the
  decision-record directory, whether it is present, the product-document detection
  patterns, and the review finding limit.
- **FR-016a**: Configuration resolution MUST emit the product-document detection *patterns
  only*; it MUST NOT scan the filesystem for matching documents (matching, if any, is
  performed by the command body — keeping the resolution step deterministic and cheap).
- **FR-016b**: Configuration resolution MUST resolve the repository root correctly
  regardless of the working directory it is invoked from, producing the same contract.
- **FR-017**: Configuration resolution MUST apply a defined precedence: environment
  override, then configuration file, then manifest defaults, then built-in defaults.
- **FR-018**: Configuration resolution MUST treat null sentinels as unset and fall
  through to the next precedence source.
- **FR-019**: Configuration resolution MUST validate values and fail with a non-zero
  exit status and a clear message on invalid input, never emitting malformed output.
- **FR-020**: Configuration resolution MUST contain no judgment or decision logic — it
  MUST be purely deterministic so that it is fully and repeatably testable.
- **FR-021**: The system MUST ship the configuration-resolution step in two equivalent
  implementations (one for Linux/bash, one for Windows/PowerShell). For identical inputs,
  the two MUST produce **equal output under normalized-JSON comparison** — that is, when
  each output is parsed and compared as structured data (field-by-field, order-independent,
  with consistent boolean/integer/string typing), they MUST be equal. This is the precise
  meaning of "identical" wherever parity is required.

**Test suite**

- **FR-022**: The system MUST include an automated test suite that exercises every
  deterministic behavior of configuration resolution: default values, file-override,
  environment-override, null-sentinel handling, path/existence detection, product-document
  pattern emission, special-character escaping in emitted values, invocation from a
  non-repo-root working directory, and the invalid-value failure path.
- **FR-023**: The test suite MUST include a cross-platform parity check asserting
  normalized-JSON equality (per FR-021) between the Linux/bash and Windows/PowerShell
  implementations across ALL shared fixture inputs (valid, missing-defaults,
  env-override, invalid), not only the default case.
- **FR-024**: The test suite MUST run on both platforms (Linux for bash, Windows for
  PowerShell) and MUST be runnable in continuous integration.
- **FR-024a**: The test suite MUST cover the structured-output construction fallback path
  (when the optional core JSON helper is unavailable), confirming output remains valid and
  correctly escaped.

**Conformance**

- **FR-025**: The command, script, configuration template, and roadmap template MUST
  conform to the established spec-kit extension structure (manifest, command files named
  with the full command slug, paired bash/PowerShell scripts, templates directory,
  configuration template).
- **FR-026**: The authoring command MUST reference its configuration script and any core
  scripts by the paths at which they are installed, so it works correctly once deployed.

### Key Entities *(include if feature involves data)*

- **Roadmap artifact**: The durable, versioned governance document. Contains the
  change-impact summary, vision/end-states, constraints & decisions, the planned-specs
  ledger, open questions, cross-cutting notes, and a version footer.
- **Ledger entry**: One planned spec. Has a number/title, a status (from the defined
  vocabulary), a description, an outcome, scope (in/out), dependencies, notes, and
  optional pointers to governing decisions, product intent, and a spec directory.
- **Configuration contract**: The structured output of configuration resolution:
  roadmap path, roadmap-exists flag, decision-record directory, decision-records-present
  flag, product-document detection patterns, and the review finding limit.
- **Decision/constraint record**: A durable "why" entry, referenced by ledger entries;
  may be an inline constraint note or a pointer to an external decision record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Starting from a constitution and no roadmap, a practitioner produces a
  complete, structured, versioned roadmap in a single command invocation.
- **SC-002**: 100% of unresolved points are recorded as explicit Open Questions or
  pre-commitment entries; zero fabricated goals/outcomes/decisions appear in the output
  (verified by review against the source material).
- **SC-003**: Re-running the authoring command with no new input leaves the roadmap's
  content unchanged (no duplication, no corruption).
- **SC-004**: Configuration resolution produces identical output on Linux/bash and
  Windows/PowerShell for 100% of shared fixture inputs.
- **SC-005**: Every documented deterministic behavior of configuration resolution is
  covered by at least one automated test, and the suite passes on both platforms.
- **SC-006**: An amendment that only advances a spec's status increments the version at
  the patch level; adding a new planned spec increments at the minor level; reversing
  direction increments at the major level — verifiable from the version footer and
  change-impact summary.
- **SC-007**: When run without an interactive channel, the command still produces a
  valid roadmap and never blocks waiting for input.

## Assumptions

- The project is an initialized spec-kit project (a constitution and the standard
  `.specify/` structure are present).
- The roadmap is a project-level artifact stored beside the constitution by default
  (`.specify/memory/roadmap.md`), overridable via configuration.
- Decision records and product documents are owned by other tools/processes; this
  feature only detects and references them, and degrades gracefully when they are absent.
- A working configuration script and authoring command already exist from the bootstrap
  phase; this spec formalizes their required behavior and drives the (currently absent)
  test suite to completion.
- The deterministic/judgment split (configuration in scripts, reasoning in the command
  body) is mandated by the project constitution and is a hard boundary for this feature.
