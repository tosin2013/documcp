---
description: "Task list for 001-roadmap-write — roadmap authoring command + load-config script + cross-platform test suite"
---

# Tasks: Roadmap Authoring Command + Config Script + Test Suite

**Input**: Design documents from `/specs/001-roadmap-write/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md,
contracts/load-config.schema.json, quickstart.md

**Tests**: MANDATORY for the deterministic `load-config` script (Constitution Principle V
— cross-platform parity proof). The `write` command BODY is judgment (Principle II) and
is NOT unit-tested; it is validated via the quickstart/dogfood/debrief. No "test the
command body" tasks exist by design.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1 (create), US2 (amend), US3 (config resolution — enabling infrastructure)
- All paths are repo-root-relative; source of truth lives at the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Verify the extension skeleton is present and well-formed at the repo root: `extension.yml`, `commands/speckit.roadmap.write.md`, `scripts/bash/load-config.sh`, `scripts/powershell/load-config.ps1`, `templates/roadmap-template.md`, `config-template.yml`. Note what already exists from bootstrap (all of the above) vs. what is missing (the `tests/` tree, CI).
- [X] T002 [P] Create the test directory structure: `tests/bash/`, `tests/bash/fixtures/`, `tests/powershell/`, `tests/parity/`.
- [X] T003 [P] Confirm `tests/` is excluded from the installed extension copy (it is not in the staged file set used for `specify extension add`); document the staging file list in `tests/README.md`.

**Checkpoint**: Layout verified; test scaffolding exists.

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ These block US3's tests and therefore the parity proof. US3 is enabling
infrastructure for the whole extension — do it before US1/US2 implementation closes.**

- [X] T004 [P] [US3] Author the four shared fixture configs under `tests/bash/fixtures/`: `valid.yml` (all keys set, includes a value with embedded quotes/special chars), `missing.yml` (empty / absent → defaults), `env.yml` (minimal, used with env overrides), `invalid.yml` (non-numeric `max_findings`).
- [X] T005 [US3] Pin the JSON contract: confirm `contracts/load-config.schema.json` matches the six fields (`roadmap_path`, `roadmap_exists`, `adr_dir`, `adr_present`, `prd_globs`, `max_findings`) and the normalized-JSON parity semantics; this is the single source of truth both implementations and the parity test assert against.

**Checkpoint**: Fixtures and contract are fixed — tests can be written against them.

## Phase 3: User Story 3 — Reliable cross-platform config resolution (Priority: P1, foundational) 🎯 MVP-enabling

**Goal**: `load-config` resolves config deterministically and identically on bash and
PowerShell, emitting the JSON contract. This is the shared dependency for every command.

**Independent Test**: Run both implementations over the four fixtures from any CWD;
assert each behavior and normalized-JSON parity.

### Harden the script (FR-016–021, bug fixes from the critique)

- [X] T006 [US3] Harden `scripts/bash/load-config.sh`: FIX the empty-`prd_globs` bug — when the repo root cannot be located (invoked outside any spec-kit repo), emit the built-in default globs (never a contract-violating empty array) or fail clearly; reimplement the `prd_globs` default WITHOUT a here-document (the heredoc failed under restricted `/tmp`).
- [X] T007 [US3] Ensure `scripts/bash/load-config.sh` resolves the repo root from ANY working directory (FR-016b) and emits PRD patterns only — no filesystem scan (FR-016a). Reuse core `common.sh` `json_escape` with the existing graceful fallback (no hard `jq`).
- [X] T008 [P] [US3] Bring `scripts/powershell/load-config.ps1` to parity with the hardened bash version: same precedence (env → `roadmap-config.yml` → `extension.yml` → built-in defaults), same null-sentinel handling, same default globs, same CWD-independent repo-root resolution, same validation + exit codes, emitting the same contract via `ConvertTo-Json -Compress`.
- [X] T009 [US3] Verify both implementations validate `max_findings` (`^[0-9]+$`): on invalid input, exit non-zero with a clear stderr message and emit NO JSON (FR-019).

### Tests (Bats — bash) (FR-022, FR-024a)

- [X] T010 [P] [US3] `tests/bash/load-config.bats`: defaults case (no config file → built-in defaults), asserting the full contract.
- [X] T011 [P] [US3] `tests/bash/load-config.bats`: file-override (`valid.yml` values win over defaults) and null-sentinel (`null`/`~` → unset → fall through).
- [X] T012 [P] [US3] `tests/bash/load-config.bats`: env-override (`SPECKIT_ROADMAP_*` wins over file and defaults), including comma-separated `SPECKIT_ROADMAP_PRD_GLOBS`.
- [X] T013 [P] [US3] `tests/bash/load-config.bats`: path/existence detection (`roadmap_exists`, `adr_present` true/false against fixture dirs/files).
- [X] T014 [P] [US3] `tests/bash/load-config.bats`: special-char/quote escaping in a config value produces valid, correctly-escaped JSON.
- [X] T015 [P] [US3] `tests/bash/load-config.bats`: invocation from a non-repo-root CWD yields the same contract (FR-016b regression test for the bug found in planning).
- [X] T016 [P] [US3] `tests/bash/load-config.bats`: invalid `max_findings` → non-zero exit, stderr message, no JSON.
- [X] T017 [P] [US3] `tests/bash/load-config.bats`: `json_escape` FALLBACK path — when core `common.sh` is not sourceable, output is still valid and correctly escaped (FR-024a).

### Tests (Pester — PowerShell)

- [X] T018 [US3] `tests/powershell/load-config.Tests.ps1`: mirror every behavior from T010–T017 against `load-config.ps1` (defaults, file-override, null-sentinel, env-override, existence detection, escaping, non-repo-root CWD, invalid-value exit, fallback).

### Parity (FR-023)

- [X] T019 [US3] `tests/parity/parity.bats`: for EACH of the four fixtures (valid / missing / env / invalid), run both implementations and assert normalized-JSON equality (parse → compare, order-independent, consistent typing). For the invalid fixture, assert both fail identically (same exit behavior, no JSON).

**Checkpoint**: `load-config` is hardened and fully proven on both platforms — the
foundation every command relies on is trustworthy.

## Phase 4: User Story 1 — Capture a roadmap after the constitution (Priority: P1) 🎯 MVP

**Goal**: `speckit.roadmap.write` creates a durable, versioned roadmap from harvested
context, with no fabrication.

**Independent Test**: Run the deployed `speckit-roadmap-write` skill in a project with a
constitution and no roadmap; confirm a v1.0.0 roadmap with all sections, populated from
harvest, gaps parked as Open Questions. (Validation = quickstart step 3; NOT a unit test.)

- [X] T020 [US1] Formalize the CREATE branch in `commands/speckit.roadmap.write.md` to FR-001–006: self-detect no roadmap → load `templates/roadmap-template.md`, harvest the five sources, pre-fill, confirm (interactive) or park gaps (non-interactive), write at v1.0.0 with a complete Sync Impact Report. Reference the INSTALLED script path (`.specify/extensions/roadmap/scripts/...`).
- [X] T021 [US1] Verify `templates/roadmap-template.md` carries every required section and the ledger entry skeleton (MUST/SHOULD/MAY fields, 9-status vocabulary, deferred-status field exemption) per data-model.md.
- [X] T022 [US1] Confirm the non-interactive fallback (FR-005, SC-007) is explicit in the command body: no interactive channel → fill from harvest, park gaps, never block or fabricate.

**Checkpoint**: Create flow is complete and matches the artifact structure.

## Phase 5: User Story 2 — Amend the roadmap safely as it evolves (Priority: P2)

**Goal**: Re-running `write` against an existing roadmap amends non-destructively with a
correct semver bump and a malformed-file guard.

**Independent Test**: Run against an existing roadmap; advance a status (PATCH), add a
spec (MINOR), reverse direction (MAJOR); confirm prior content preserved and Sync Impact
Report updated. (Validation = quickstart step 4.)

- [X] T023 [US2] Formalize the AMEND branch in `commands/speckit.roadmap.write.md` to FR-007–010: detect existing roadmap, delta-only elicitation, non-destructive edits (mark, don't delete superseded), inline model-computed semver bump (MAJOR/MINOR/PATCH rules), updated Sync Impact Report + Last Amended date.
- [X] T024 [US2] Add the malformed-roadmap guard (FR-011a): on amend, if the existing roadmap is unparseable or missing required structure (no version footer, corrupted Sync Impact Report), report the problem and PROPOSE a correction — never overwrite or further corrupt.
- [X] T025 [US2] Confirm idempotency (FR-011): re-running with no new input does not duplicate or corrupt content.

**Checkpoint**: Amend flow is safe, versioned, and idempotent.

## Phase 6: Polish & Cross-Cutting (Conformance, CI, dogfood)

- [X] T026 [P] Verify the `extension.yml` manifest entry: `speckit.roadmap.write` command, the `load-config.sh`/`.ps1` scripts, and the `config-template.yml` config are all declared correctly; `requires.speckit_version: ">=0.11.6"`.
- [X] T027 [P] Author `.github/workflows/test.yml`: Bats on Linux AND macOS (bash 3.2 compatibility is a tested guarantee), Pester on Windows; run on push + PR.
- [X] T028 Re-stage to `/tmp` and reinstall via `specify extension add /tmp/STAGE --dev --force` (NEVER `add .` from repo root); `specify extension enable roadmap`; confirm the deployed `speckit-roadmap-write` skill renders the installed script path correctly.
- [X] T029 Dogfood validation per quickstart steps 3–5: create (interactive), amend (status bump → PATCH), and a non-interactive delegated run (gaps parked, no block). Confirm against SC-001/002/003/006/007.
- [X] T030 Run the full quickstart steps 1–2 (config contract + suite) on this machine; confirm all tests pass and bash↔PowerShell parity MATCHES across all four fixtures.

---

## Dependencies & Execution Order

- **Setup (T001–T003)**: no dependencies.
- **Foundational (T004–T005)**: depends on Setup. Blocks all tests.
- **US3 (T006–T019)**: depends on Foundational. This is the shared foundation — its
  script hardening (T006–T009) blocks US1/US2 runtime, and its tests (T010–T019) are the
  parity proof. **Do US3 first.**
- **US1 (T020–T022)**: depends on US3 script (the command calls `load-config`) and the
  template.
- **US2 (T023–T025)**: depends on US1 (amend builds on the create/structure logic).
- **Polish (T026–T030)**: depends on US1+US2+US3 complete; T028–T030 are the final
  dogfood gate.

## Parallel Opportunities

- T002, T003 (Setup) in parallel.
- T010–T017 (Bats behavior tests) all `[P]` — different test cases, same suite file may
  require sequential commits but are independently authorable.
- T008 (PowerShell hardening) parallel with the bash Bats authoring once T006–T007 land.
- T026, T027 (manifest check, CI workflow) in parallel.

## Implementation Strategy

**MVP-enabling first**: US3 (config resolution + its full test suite) is the foundation —
nothing else is trustworthy without it, and it carries the cross-platform-parity proof
that is a hard constitutional requirement. Then US1 (create) is the user-facing MVP, then
US2 (amend). Polish closes with the dogfood gate (T028–T030).

**Determinism boundary (explicit)**: Tests exist ONLY for the deterministic `load-config`
script. The `write` command body (harvest, create/amend, semver decision, non-interactive
fallback) is judgment and is validated by the dogfood/quickstart, not unit tests — per
Constitution Principle II. Do not add command-body unit tests.
