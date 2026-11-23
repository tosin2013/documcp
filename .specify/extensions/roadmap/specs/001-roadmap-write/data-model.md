# Phase 1 Data Model: 001-roadmap-write

This feature has no database. The "data" is (a) the config contract emitted by
`load-config` and (b) the structure of the roadmap artifact the command writes.

## Entity: Config Contract (output of `load-config`)

A single JSON object on stdout. The stable contract both platform implementations MUST
emit identically. (Full JSON Schema in `contracts/load-config.schema.json`.)

| Field | Type | Meaning | Default |
|-------|------|---------|---------|
| `roadmap_path` | string | Repo-relative path to the roadmap artifact | `.specify/memory/roadmap.md` |
| `roadmap_exists` | boolean | Whether a file exists at `roadmap_path` | derived |
| `adr_dir` | string | Repo-relative dir where ADRs live (if any) | `docs/adr/` |
| `adr_present` | boolean | Whether `adr_dir` exists as a directory | derived |
| `prd_globs` | array<string> | Glob patterns used to detect PRD documents | see config-template |
| `max_findings` | integer (≥0) | Cap on findings in review reports (shared with other commands) | `50` |

**Resolution precedence** (per field): `SPECKIT_ROADMAP_*` env → `roadmap-config.yml` →
`extension.yml` defaults → built-in default. Null sentinels (`null`, `~`) ⇒ unset ⇒
fall through.

**Validation**: `max_findings` MUST match `^[0-9]+$`; otherwise exit non-zero with a
clear stderr message and emit no JSON. Other fields are strings/derived and always present.

**Determinism invariant**: given identical filesystem + env, output is byte-identical and
contains no judgment. This is what the test suite asserts.

## Entity: Roadmap Artifact (written by `write`)

Markdown document. Sections, in order:

1. **Sync Impact Report** — HTML comment: version change, bump rationale, changes this
   revision, specs affected, open-questions delta, notes.
2. **Title + preamble** — project name; "living, non-binding" framing; links to
   constitution and (if detected) PRD.
3. **Vision & End States** — project-level outcomes.
4. **Constraints & Decisions** — durable "why"; inline constraint notes with stable ids
   (`C-01`…); links out to ADRs when present (never authored here).
5. **Planned Specs** — the ledger (see Ledger Entry below); optional grouping headers.
6. **Open Questions** — unresolved items not yet attached to a spec.
7. **Cross-Cutting Notes** — notes spanning multiple specs.
8. **Version footer** — `**Version**: X.Y.Z | **Ratified**: DATE | **Last Amended**: DATE`.

## Entity: Ledger Entry (one planned spec)

| Field | Obligation | Notes |
|-------|-----------|-------|
| heading `NNN — title` | MUST | numbered, scannable |
| `status` | MUST | from the vocabulary below |
| `description` | MUST | what the spec IS (scannable) |
| `outcome` | MUST* | end state / done-looks-like; the debrief checks against this |
| `scope (in)` | MUST* | what's included |
| `scope (out)` | SHOULD | explicit non-goals |
| `depends on` | SHOULD | other entry numbers |
| `notes` | SHOULD | free-prose "why" / grilling residue / risks |
| `governed by` | MAY | `ADR-NNNN` / `C-NN` pointers |
| `addresses` | MAY | PRD-goal pointer |
| `spec dir` | MAY | `specs/NNN-.../` once it exists |

\* `outcome` and `scope (in)` MAY be `_to be defined_` for `undecided`, `needs-info`,
`deferred`, `abandoned` statuses; REQUIRED for all others.

### Status vocabulary (state model)

- **Pre-commitment**: `undecided`, `needs-info`
- **Lifecycle** (progression): `planned` → `specced` → `in-progress` → `implemented` →
  `verified`
- **Off-ramps**: `deferred`, `abandoned`

`verified` is set by a passing debrief. Transitions are advisory (the command instructs;
it does not enforce a strict state machine).

## Version semantics (roadmap semver)

- **MAJOR**: direction/governance change (remove/redefine a Vision/End-State; reverse a
  constraint that invalidates entries).
- **MINOR**: structural additions (new planned spec; new constraint/decision; new Open
  Question; material scope change).
- **PATCH**: status transitions + wording/clarifications.
