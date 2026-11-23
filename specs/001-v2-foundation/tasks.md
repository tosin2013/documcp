# Tasks: v2.0 foundation: Node 24, skills layer, CLI verdict

**Input**: `specs/001-v2-foundation/` (spec, plan, research, contracts)
**Prerequisite (owner, not a task here):** the planning PR that moves `@types/node` and CI's Node
matrix to 24 is merged.

Each phase is one slice, built by one Chalkeus forge run and merged before the next starts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story the task belongs to

---

## Phase 1: User Story 1 - Node 24 LTS with a clean test run (Priority: P1) 🎯 MVP

**Goal**: the project declares Node 24, and the full test run finishes without a force-exited
worker.

**Independent Test**: `npm test` on Node 24 passes and doesn't print "worker process has failed
to exit gracefully"; `.nvmrc`, `engines` and the docs say Node 24.

- [ ] T001 [P] [US1] Set `.nvmrc` to `24`
- [ ] T002 [P] [US1] Set `engines.node` in `package.json` to `>=24`
- [ ] T003 [US1] Locate the suites that leave handles open (run `npx jest tests/<folder> --detectOpenHandles` per folder under `tests/`, research R3)
- [ ] T004 [US1] Close each leaked timer, server, watcher or child process in the suites' `afterEach`/`afterAll`, or `.unref()` it in `src/` where a timer outlives its work
- [ ] T004a [US1] Find the test that writes `.github/workflows/deploy-github-pages.yml` into the repository and make it (and any other) write only under a temporary directory, so a full run leaves `git status` clean
- [ ] T005 [US1] Remove `--forceExit` from the `test:ci` script in `package.json`
- [ ] T006 [P] [US1] Name Node 24 LTS as the requirement in `README.md` and `CONTRIBUTING.md`
- [ ] T007 [US1] Run the full suite on Node 24 three times: all pass, no force-exit message, `git status` clean afterwards

**Checkpoint**: US1 merged; the baseline for US2 and US3 is green and leak-free.

---

## Phase 2: User Story 2 - Flagship documentation-analysis skill (Priority: P2)

**Goal**: `skills/documentation-analysis/SKILL.md` lets a cold agent run a documentation analysis
through DocuMCP's tools, and a test keeps it in step with the tool list.

**Independent Test**: `npx jest tests/skills` passes; `npm pack --dry-run` lists the skill.

### Tests for User Story 2

- [ ] T008 [P] [US2] Add `tests/skills/skill-format.test.ts`: every `skills/*/SKILL.md` has frontmatter `name` equal to its folder and a non-empty `description` (contracts/skill.md)
- [ ] T009 [P] [US2] Add `tests/skills/skill-tools.test.ts`: every DocuMCP tool the skill names is in `TOOLS` in `src/index.ts`, with the parameter names the skill uses (research R5)
- [ ] T010 [P] [US2] Add `tests/skills/skill-packaging.test.ts`: `npm pack --dry-run --json` includes `skills/documentation-analysis/SKILL.md` (research R6)

### Implementation for User Story 2

- [ ] T011 [US2] Write `skills/documentation-analysis/SKILL.md` per contracts/skill.md: when to use it, before you start, the workflow (`analyze_repository`, then `recommend_ssg`, then `detect_documentation_gaps` and `validate_content`), how to check each step, and the gap log
- [ ] T012 [US2] Check the skill against constitution V: no step explains how an analysis is computed; each names the tool that does it
- [ ] T013 [US2] Add a "Skills" section to `README.md`: what `skills/` is and how an agent loads it

**Checkpoint**: US2 merged; the cold-agent run (item acceptance) can be done.

---

## Phase 3: User Story 3 - Verdict on the standalone CLI (Priority: P3)

**Goal**: one memo the owner can decide issue #126 from.

**Independent Test**: `docs/research/standalone-cli-verdict.md` has the six sections of
contracts/verdict-memo.md, one recommendation first, and links #126 and ADR-0017.

- [ ] T014 [US3] Gather the evidence: issue #126 and its discussion, ADR-0017, the tools a CLI would wrap, and what the US2 skill already covers
- [ ] T015 [US3] Write `docs/research/standalone-cli-verdict.md` per contracts/verdict-memo.md, with one recommendation (build, don't build or defer) and ADR-0017's fate

**Checkpoint**: the item is complete; the owner does the item acceptance checks, then the status
change.

---

## Dependencies & Execution Order

- US1 → US2 → US3, one slice at a time; each starts after the previous slice's PR is merged.
- Within US2: tests T008–T010 first (they fail until T011), then T011–T013.
- US3 has no code; it reads the merged US2 skill.

## Out of scope (owner)

- The planning PR: `@types/node` to `^24`, CI matrix to `24.x` (with `package-lock.json`).
- Dependabot and issue triage; the rename (item 002); the release (item 003).
