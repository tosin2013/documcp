# Feature Specification: zod 4 migration

**Feature Branch**: `004-zod-4-migration`
**Created**: 2026-11-27
**Status**: Draft
**Input**: roadmap item 004: move from zod 3 to zod 4, which fixes the high-severity advisory
GHSA-mrhx-c7xc-m3w5 that CI's Security Audit job reports, and replace `zod-to-json-schema` with
zod 4's own JSON Schema output, without changing any MCP tool's published input schema.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - zod 4 with unchanged tool schemas (Priority: P1) 🎯 MVP

The project runs on zod 4 only. Every MCP client that lists DocuMCP's tools sees exactly the
same input schemas as before, so no client or prompt that calls the tools has to change, and CI's
Security Audit job passes again.

**Why this priority**: the audit job is the only red check on `main`, and the v2.0 release (003)
depends on this item.

**Independent Test**: start the built server, list its tools, and compare each tool's
`inputSchema` with `contracts/tool-schemas.json`; run the test suite; run the production audit.

**Acceptance Scenarios**:

1. **Given** the approved dependency change (zod 4, no `zod-to-json-schema`; see Manifest change),
   **When** the project is built with `npx tsc`, **Then** it compiles without errors.
2. **Given** the built server, **When** an MCP client calls `tools/list`, **Then** it returns the
   same 52 tools, and each tool's `inputSchema` is identical to its entry in
   `contracts/tool-schemas.json` (draft-07 `$schema`, fields with a default not required,
   `additionalProperties: false` on every object, the same descriptions, defaults and enums).
3. **Given** a tool call with invalid arguments, **When** the tool validates them, **Then** it
   still rejects them, with the zod issue for each bad field (code and path); tests check the code
   and the path, not zod's message wording, which zod 4 changed.
4. **Given** `cleanup_agent_artifacts` called with invalid input, **When** it answers, **Then**
   the error's `details` holds the list of zod issues (zod 4 names it `issues`; `errors` is gone).
5. **Given** the repository, **When** `npm audit --omit=dev --audit-level=high` runs, **Then** it
   exits 0.

### Edge Cases

- A schema that zod 4 renders differently (for example a union, a record or a nested optional
  object) must still match the contract; if one cannot, the difference is listed for the owner
  instead of shipping silently.
- `change_watcher` builds its schema in its own module (`src/tools/change-watcher.ts`); it must
  use the same conversion as `src/index.ts`, so the two can't drift apart.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: zod 4 MUST be the only zod the project depends on, and `zod-to-json-schema` MUST no
  longer be a dependency (the Manifest change below does both; the agent never edits the
  manifests).
- **FR-002**: Every tool's published `inputSchema` MUST equal its entry in
  `contracts/tool-schemas.json`, captured from the zod 3 build on 2026-11-27.
- **FR-003**: One function, `toolInputSchema(schema)` in `src/utils/tool-input-schema.ts`, MUST
  convert a tool's zod schema to its published JSON Schema; `src/index.ts` and
  `src/tools/change-watcher.ts` MUST both use it.
- **FR-004**: Input validation MUST keep rejecting the same invalid inputs; error `details` that
  carried `ZodError.errors` MUST carry `ZodError.issues`.
- **FR-005**: Tests MUST NOT assert zod's message wording ("Required", "Invalid enum value",
  "Number must be …"); they assert the issue code and path, or that the call was rejected.
- **FR-006**: No MCP tool, prompt or resource is added, removed or renamed (C-05).

### Key Entities

- **Tool schema contract**: `contracts/tool-schemas.json`, the `tools/list` result of the zod 3
  build, sorted by key; `contracts/tools/list-tools.mjs` reproduces it from a build.

## Manifest change

The approved dependency change; the run starts from it and the agent may not change these files.

- Commit: `d63d0e182e1253f8a9883657514164ab0f58a586`
- Files: `package.json`, `package-lock.json`
- Branch `deps/zod-4`: zod `^3.22.4` → `^4.6.7`, `zod-to-json-schema` removed.

## Allowed paths

- `src/index.ts`
- `src/tools/change-watcher.ts`
- `src/tools/cleanup-agent-artifacts.ts`
- `src/utils/tool-input-schema.ts`
- `tests/*`
- `specs/004-zod-4-migration/tasks.md`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npx tsc` and the full test suite (`npm run test:ci`, with its coverage thresholds)
  pass on zod 4.
- **SC-002**: 52 of 52 tool schemas equal the contract.
- **SC-003**: CI's Security Audit job passes on `main` after the merge.

## Assumptions

- zod 4's `z.toJSONSchema` with `io: "input"`, `target: "draft-7"` and an `override` that adds
  `additionalProperties: false` to objects reproduces zod-to-json-schema's output for all 52
  tools (research R2: verified on 2026-11-27).
- `@modelcontextprotocol/sdk` 1.32 accepts zod `^3.25 || ^4.0`, so it shares the project's zod 4.
