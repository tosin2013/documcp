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
