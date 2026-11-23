# Feature Specification: v2.0 foundation: Node 24, skills layer, CLI verdict

**Feature Branch**: `001-v2-foundation`
**Created**: 2026-11-23
**Status**: Draft
**Input**: Roadmap item 001 and the owner's v2.0 product requirements: move to Node 24 LTS with a
clean, green test run; add an embedded `skills/` layer whose flagship skill lets a cold agent run
a documentation analysis through DocuMCP's tools; record a verdict with evidence on the
standalone CLI (issue #126). The rename and the release are separate items (002, 003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Node 24 LTS with a clean test run (Priority: P1)

A contributor clones DocuMCP, uses the Node version the repository names, and runs the tests.
The project declares Node 24 LTS as its supported runtime, and the test run finishes on its own:
no open handles, no worker the test runner has to force-exit.

**Why this priority**: every later change builds on a green, supported baseline. Node 22 leaves
active support before Node 24, and a test run that leaks handles hides real failures and slows
every run.

**Independent Test**: on a fresh clone with Node 24, install and run the tests: they pass, the
runner reports no force-exited worker, and the repository's version file, the package's engine
range and the contributor docs all name Node 24.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** a contributor reads the Node version file, **Then** it names
   Node 24.
2. **Given** the package manifest, **When** a user installs DocuMCP on Node 22 or older, **Then**
   the declared engine range tells them Node 24 or newer is required.
3. **Given** Node 24, **When** the full test suite runs, **Then** every test passes and the
   runner does not report a worker that failed to exit gracefully.
4. **Given** a clean checkout, **When** the full test suite runs, **Then** `git status` shows no
   new or changed files afterwards.
5. **Given** the README and the contributing guide, **When** a new contributor reads the
   requirements, **Then** they name Node 24 LTS.

---

### User Story 2 - Flagship documentation-analysis skill (Priority: P2)

An agent with no prior knowledge of DocuMCP loads the flagship skill from the repository's
`skills/` folder and, using only DocuMCP's tools, produces a correct documentation analysis of a
repository: which tools to call, in what order, with what inputs, and how to check the result.
Where it had to improvise, it writes that down in a gap log.

**Why this priority**: this is the new distribution surface for agents that work from skills,
and the main user-facing addition in v2.0. It depends on a green baseline (US1).

**Independent Test**: read the skill file: it has valid Agent Skills frontmatter, every tool it
names is a tool the server actually lists, and it describes tool calls and checks rather than how
the analyses work internally. The cold-agent run is the item's acceptance check.

**Acceptance Scenarios**:

1. **Given** the repository, **When** an agent looks in `skills/`, **Then** it finds one folder
   per skill, and the flagship skill's folder holds a `SKILL.md` whose frontmatter has a `name`
   matching the folder and a non-empty `description` that says when to use it.
2. **Given** the flagship skill, **When** every DocuMCP tool it names is checked against the
   tools the server lists, **Then** each one exists, with the parameter names the skill uses.
3. **Given** the flagship skill, **When** it is read end to end, **Then** it covers analysing the
   repository, getting a recommendation, and checking the documentation for gaps and accuracy,
   in that order, and says how the agent verifies each step's output.
4. **Given** the flagship skill, **When** the agent meets something the tools can't do, **Then**
   the skill tells it to record the gap in a gap log rather than work around it.
5. **Given** the published npm package, **When** its contents are listed, **Then** the `skills/`
   folder is included.

---

### User Story 3 - Verdict on the standalone CLI (Priority: P3)

The owner reads one short memo and can decide whether DocuMCP should get a standalone CLI
(issue #126, ADR-0017): who would use it that the MCP server and the skills layer don't already
serve, what it would cost to maintain as a third surface, and whether the skills layer makes it
redundant.

**Why this priority**: it settles an open question with evidence before the rename fixes the
product's surfaces. It is a decision aid, not a build.

**Independent Test**: the memo exists, states one recommendation (build, don't build, or defer),
and supports it with the evidence sections below; it links issue #126 and ADR-0017.

**Acceptance Scenarios**:

1. **Given** the memo, **When** the owner opens it, **Then** it states one recommendation in its
   first section.
2. **Given** the memo, **When** it is read, **Then** it has sections on user demand, maintenance
   cost, overlap with the skills layer, and what happens to ADR-0017 under the recommendation.
3. **Given** the memo, **When** its references are followed, **Then** it links issue #126 and
   ADR-0017.

---

### Edge Cases

- A contributor runs Node 22: installation warns that the engine range requires Node 24 or newer;
  nothing else breaks silently.
- The flagship skill names a tool that is later renamed (item 002): the check in US2 fails, so the
  rename must update the skill too.
- The memo recommends building the CLI: nothing is built in this item; the build is a later item
  the owner approves (constitution II).
- The test suite needs network access somewhere: that is a defect against constitution VII, and
  US1 fixes it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (US1): The repository's Node version file MUST name Node 24.
- **FR-002** (US1): The package's declared engine range MUST require Node 24 or newer.
- **FR-003** (US1): The full test suite MUST pass on Node 24 and finish without the runner
  force-exiting a worker (no leaked timers, servers, watchers or child processes).
- **FR-003a** (US1): The test suite MUST leave the repository's working tree unchanged: tests
  write only to temporary directories (today a run creates
  `.github/workflows/deploy-github-pages.yml` in the repository).
- **FR-003b** (US1): No test MAY depend on timing or run order; a test that fails under load
  and passes alone is fixed (constitution VII).
- **FR-004** (US1): The README and the contributing guide MUST name Node 24 LTS as the
  requirement.
- **FR-005** (US2): The repository MUST have a top-level `skills/` folder with one folder per
  skill; the flagship skill's `SKILL.md` MUST have Agent Skills frontmatter with `name` (equal to
  its folder name) and `description`.
- **FR-006** (US2): Every DocuMCP tool the flagship skill names MUST be a tool the server lists,
  and every parameter it names for a tool MUST be in that tool's input schema.
- **FR-007** (US2): The flagship skill MUST describe a complete documentation-analysis workflow
  (repository analysis, recommendation, gap and accuracy checks) as tool calls in order, each
  with how to verify its output; it MUST NOT explain how an analysis is computed (constitution V).
- **FR-008** (US2): The flagship skill MUST tell the agent to keep a gap log of every point where
  it had to improvise, and say where to write it.
- **FR-009** (US2): The published npm package MUST include the `skills/` folder.
- **FR-010** (US2): The README MUST say what the skills layer is and how an agent loads it.
- **FR-011** (US3): A verdict memo MUST exist in `docs/research/` with one recommendation (build,
  don't build, or defer) and sections on user demand, maintenance cost, overlap with the skills
  layer, and ADR-0017's fate; it MUST link issue #126 and ADR-0017.
- **FR-012**: No MCP tool, prompt or resource is added, removed or renamed by this item
  (constitution IV, roadmap C-05).

### Key Entities

- **Skill**: a folder under `skills/` with a `SKILL.md` (frontmatter `name`, `description`;
  body: when to use it, the tool calls in order, how to verify each, the gap-log rule).
- **Gap log**: a list, written by the agent following a skill, of every point where the tools
  didn't cover what it needed.
- **Verdict memo**: one document recording a recommendation on the standalone CLI and its
  evidence.

## Allowed paths (US1)

- `.nvmrc`
- `package.json`
- `src/*`
- `tests/*`
- `README.md`
- `CONTRIBUTING.md`

## Allowed paths (US2)

- `skills/*`
- `tests/*`
- `package.json`
- `README.md`

## Allowed paths (US3)

- `docs/research/*`

## Item acceptance

- A cold agent (one that didn't write the skill and has no other DocuMCP context) follows the
  flagship skill against a sample repository and produces a correct analysis; the owner reviews
  its gap log.
- The owner reads the verdict memo and records a decision on issue #126.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On Node 24, the full test suite passes with 0 failures and no force-exited worker,
  three runs in a row.
- **SC-002**: 100% of the tool names and parameters in the flagship skill match the server's
  tool list.
- **SC-003**: A cold agent completes the flagship workflow on a sample repository with no step
  that needs knowledge outside the skill and the tools; every improvisation appears in its gap
  log.
- **SC-004**: The owner can decide issue #126 from the memo alone, in one reading.
- **SC-005**: The tool, prompt and resource counts are unchanged by this item.

## Assumptions

- The owner's planning pull request, not this item, moves `@types/node` and CI's Node version to
  24 (constitution VI and VIII); this item builds on it. Measured on 2026-11-23: the code already
  installs, typechecks, builds, lints and passes its tests on Node 24.22.3.
- "Node 24" means the 24.x LTS line; the engine range is `>=24`.
- The flagship skill targets the tools that exist today; it is not blocked on the rename.
- Issue and Dependabot triage is the owner's work outside this item.
