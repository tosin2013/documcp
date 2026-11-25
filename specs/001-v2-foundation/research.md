# Research: v2.0 foundation

## R1 — How much does Node 24 change?

- **Decision:** treat US1 as declarations plus the leak fix.
- **Evidence (2026-11-23):** on Node 24.22.3 with npm 11.19.1, `npm ci`, `npm run typecheck`,
  `npm run build`, `npm run lint` and `npm test` all pass (90 suites; 1706 passed, 14 skipped),
  the same as on Node 22.23.5. npm 11 skips `tree-sitter-yaml`'s install script
  (`node-gyp rebuild`) and lists it for approval; the tests pass without it, because parsing
  uses `web-tree-sitter` (WASM).
- **Alternatives:** Node 26 (current LTS line, needs a new Chalkeus toolchain image), Node 25
  (end of life since 2026-06): rejected by the owner.

## R2 — Where the Node version is declared

- **Decision:** `.nvmrc` → `24`; `package.json` `engines.node` → `>=24`; README and
  CONTRIBUTING name Node 24 LTS. `@types/node` (`^20` today) and CI's matrix (`20.x`, `22.x`)
  move in the owner's planning PR, because they are a dependency and CI (constitution VI, VIII),
  and because a forge attempt can't add a dependency (its grader installs offline).

## R3 — The leaked handles

- **Observation:** every full run ends with "A worker process has failed to exit gracefully and
  has been force exited". `test:ci` hides it with `--forceExit`.
- **Decision:** find the suites that leave timers, servers, file watchers (`chokidar`) or child
  processes open, close them in `afterAll`/`afterEach` (or `.unref()` timers in the code where a
  timer outlives its work), and drop `--forceExit` from `test:ci`.
- **Note:** `jest --detectOpenHandles` runs in band and took over 10 minutes on the full suite;
  run it per folder (`npx jest tests/<folder> --detectOpenHandles`) to locate the leaks.
- **Findings (2026-11-25):** a per-folder scan of `main` on Node 24.22.3
  (`npx jest tests/<folder> --detectOpenHandles --runInBand`, and each top-level test file
  alone) found every leak and the only test that writes into the repository:
  - `tests/memory/kg-link-validator.test.ts` (lines 92, 104 and 146) sends real HEAD requests
    to `httpstat.us`, against constitution VII (offline tests). `validateSingleLink` in
    `src/memory/kg-link-validator.ts` (line 99) clears its abort timer only when `fetch`
    succeeds. The folder's 380 tests passed in 18 s, then the process never exited (stopped at
    900 s).
  - `tests/change-watcher-priority.integration.test.ts` starts a `ChangeWatcher` (line 190)
    and never stops it (`stop()` is at `src/utils/change-watcher.ts:228`); the test passes,
    then the process never exits (stopped at 300 s).
  - `tests/tools/deploy-pages.test.ts` is the only file that writes into the repository
    (`.github/workflows/deploy-github-pages.yml`); `all-tools`, `deploy-site` and
    `simple-coverage` leave it clean.
  - Every other folder and top-level test file: no open handles, nothing written.
    `tests/performance/` is excluded by the Jest config.
- **So:** US1's fixes are known changes (tasks T004–T004a); there is nothing left to search
  for in the build.
- **Findings, part 2 (2026-11-25, after forge run `20261125T200730Z`):** with attempt 2's
  changes the full suite passes (1,706 tests, 33 s, exit 0) and writes nothing into the
  repository, but Jest still force-exits a *worker process*. Running each file alone (in band)
  can't show such leaks; running each `tests/memory/` and `tests/tools/` file together with a
  small test at `--maxWorkers=2` found the two that do:
  - `tests/memory/temporal-analysis.test.ts`: `TemporalMemoryAnalysis` starts a 6-hour
    `setInterval` in its constructor (`src/memory/temporal-analysis.ts`,
    `setupPeriodicAnalysis`). `MemoryPruningSystem` (24 hours, `src/memory/pruning.ts`) and
    `MultiAgentMemorySharing` (5 minutes, `src/memory/multi-agent-sharing.ts`) do the same. The
    server never creates these classes: its `memory_pruning`, `memory_temporal_analysis` and
    `memory_agent_network` tools are stubs that answer "feature is being developed"
    (`src/index.ts`), so the timers only ever run in tests. `.unref()` alone was not enough.
  - `tests/tools/test-local-deployment.test.ts` ("should exercise server start paths with short
    timeout") runs the real tool, which spawns `sh -c "hugo server --port …"`
    (`src/tools/test-local-deployment.ts`): a unit test that starts real processes (against
    constitution VII). Its cleanup sends SIGTERM to the `sh` wrapper only (`.killed` is then
    true, so the SIGKILL fallback never runs), and the server timeout isn't cleared on every
    path.
- **Decision:** no timers in constructors (the periodic jobs start only from an explicit
  `start()`, which nothing calls today); the local-deployment test mocks `spawn`, and the tool
  clears its timer on every path and stops the whole process group. Whether to keep, remove or
  implement the three memory subsystems is roadmap item 005 (deferred).

## R4 — Skill format

- **Decision:** Agent Skills format: `skills/<name>/SKILL.md` with YAML frontmatter `name` and
  `description`, Markdown body. One flagship skill, `documentation-analysis`. See
  [contracts/skill.md](contracts/skill.md).
- **Rationale:** the format agents already load (Claude Code, OpenCode and others); the same
  pattern as Context7's embedded skills (roadmap C-03).

## R5 — Checking the skill against the tool list

- **Decision:** a Jest test (`tests/skills/skill-tools.test.ts`) reads each `SKILL.md`, collects
  the tool names it marks as calls (backticked names followed by `(`, or in a "Tools" list), and
  checks each against the server's tool definitions (`TOOLS` in `src/index.ts`), including the
  parameter names.
- **Rationale:** keeps the skill honest when tools change (the rename in 002 must update it).

## R6 — Is `skills/` published?

- **Finding:** `package.json` has no `files` field and there is no `.npmignore`, so npm publishes
  everything `.gitignore` doesn't exclude; `skills/` is included. US2 adds a test with
  `npm pack --dry-run --json` to keep it so.

## R7 — The CLI question

- **Finding:** issue #126 asks for `documcp-cli` with five subcommands; ADR-0017 ("Standalone CLI
  Surface for Non-MCP Workflows") is already `accepted`. The memo must say whether to keep,
  amend or supersede ADR-0017. See [contracts/verdict-memo.md](contracts/verdict-memo.md).
