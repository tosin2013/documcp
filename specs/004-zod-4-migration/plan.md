# Implementation plan: zod 4 migration (004)

**Spec**: [spec.md](spec.md) · **Research**: [research.md](research.md) · **Tasks**: [tasks.md](tasks.md)

## Summary

A dependency item. The approved change (commit `d63d0e1`, branch `deps/zod-4`) moves zod to 4 and
drops `zod-to-json-schema`; the build fixes the three compile errors it causes, publishes tool
schemas through one helper that reproduces the old JSON Schema exactly, and updates the four tests
that asserted zod 3's message wording.

## Technical context

TypeScript (ES modules), Node 24, zod 4.6, `@modelcontextprotocol/sdk` 1.32 (accepts zod 4),
Jest with ts-jest. 52 tools publish JSON Schema for their zod input schemas in `tools/list`.

## Constitution check

- **IV / C-05 (no tool surface change)**: the schema contract (52 of 52 identical) is the guard.
- **VI (dependencies approved in planning)**: the manifest change is a named, owner-approved
  commit; the agent may not change `package.json` or `package-lock.json`.
- **VII (deterministic, offline tests)**: the new and changed tests are pure unit tests.
- **VIII (planning files are the owner's)**: allowed paths cover only `src/` files, `tests/` and
  this item's `tasks.md`.

## Design

- `src/utils/tool-input-schema.ts`: `toolInputSchema(schema)` (research R2), the only
  zod → JSON Schema conversion; `src/index.ts` and `src/tools/change-watcher.ts` call it.
- `src/tools/cleanup-agent-artifacts.ts`: `details: error.issues`.
- Tests assert zod issue codes and paths, not wording.

## Verification

`npx tsc`, `npm run test:ci`, `npm audit --omit=dev --audit-level=high`, and the schema contract
check in tasks.md's checkpoint. The hidden acceptance tests guard the published schemas against
`contracts/tool-schemas.json`.
