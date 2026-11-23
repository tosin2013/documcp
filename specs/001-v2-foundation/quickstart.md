# Quickstart: checking 001

## US1 — Node 24, clean test run

```sh
nvm use                     # reads .nvmrc: 24
npm ci && npm run build && npm run lint
npm test                    # passes; no "worker process has failed to exit gracefully"
npm run test:ci             # no --forceExit in the script any more
```

## US2 — the flagship skill

```sh
npx jest tests/skills       # the skill's tool names and parameters match the server
npm pack --dry-run | grep skills/documentation-analysis/SKILL.md
```

Item acceptance: give a fresh agent the skill and the DocuMCP server, point it at a sample
repository, and review its result and gap log.

## US3 — the verdict

Open `docs/research/standalone-cli-verdict.md`: one recommendation first, then the evidence
sections, with links to #126 and ADR-0017.
