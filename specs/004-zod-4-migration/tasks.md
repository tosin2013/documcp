# Tasks: zod 4 migration

**Input**: `specs/004-zod-4-migration/` (spec, research, contracts)
**Prerequisite (owner, not a task here):** the approved dependency change, commit `d63d0e1` on
branch `deps/zod-4` (zod 4, `zod-to-json-schema` removed). The run starts from it; don't edit
`package.json` or `package-lock.json`.

One slice: the item is a dependency item, built whole by one Chalkeus forge run.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies)
- **[Story]**: the user story the task belongs to

---

## Phase 1: User Story 1 - zod 4 with unchanged tool schemas (Priority: P1) 🎯 MVP

**Goal**: the project compiles and passes its tests on zod 4, and every tool publishes the same
input schema as before.

- [ ] T001 [US1] Create `src/utils/tool-input-schema.ts` exporting `toolInputSchema(schema)`,
  exactly as in research R2 (`z.toJSONSchema` with `io: "input"`, `target: "draft-7"`, and the
  `override` that sets `additionalProperties: false` on objects without it).
- [ ] T002 [US1] In `src/index.ts`, remove the `zod-to-json-schema` import, import
  `toolInputSchema` from `./utils/tool-input-schema.js`, and publish
  `inputSchema: toolInputSchema(tool.inputSchema)` in the `ListToolsRequestSchema` handler.
- [ ] T003 [P] [US1] In `src/tools/change-watcher.ts`, remove the `zod-to-json-schema` import and
  set `inputSchema: toolInputSchema(changeWatcherSchema) as any`, importing it from
  `../utils/tool-input-schema.js`.
- [ ] T004 [P] [US1] In `src/tools/cleanup-agent-artifacts.ts`, put `error.issues` in the
  invalid-input response's `details` (zod 4's `ZodError` has no `errors`).
- [ ] T005 [P] [US1] In `tests/tools/check-documentation-links.test.ts`, change the
  `timeout_ms` and `max_concurrent_checks` validation tests to assert the issue code
  (`too_small`, `too_big`) and path instead of zod 3's message text.
- [ ] T006 [P] [US1] In `tests/tools/generate-technical-writer-prompts.test.ts`, change the
  "should require project_path parameter" test to assert an `invalid_type` issue on
  `project_path` instead of the text "Required".
- [ ] T007 [P] [US1] In `tests/tools/test-local-deployment.test.ts`, change the "should handle
  unsupported SSG gracefully" test to assert rejection with an `invalid_value` issue on `ssg`
  instead of the text "Invalid enum value".
- [ ] T008 [US1] Add `tests/utils/tool-input-schema.test.ts`: for
  `z.object({ a: z.string(), d: z.enum(["x","y"]).default("x"), n: z.object({ b: z.number() }).optional() })`
  assert the exact output: draft-07 `$schema`, `required: ["a"]`, `d` with its default and enum,
  and `additionalProperties: false` on the outer object and on `n`.
- [ ] T009 [US1] Run `npx tsc` and `npm run test:ci`; both pass, coverage thresholds included.

**Checkpoint**: `tools/list` from the built server matches `contracts/tool-schemas.json` for all
52 tools (`node specs/004-zod-4-migration/contracts/tools/list-tools.mjs "$PWD" "$(mktemp -d)"`).
