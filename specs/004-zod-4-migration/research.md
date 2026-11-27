# Research: zod 4 migration (004)

Done in planning on 2026-11-27 in a scratch copy of `main` (`ae39876`), so the tasks name known
changes (no research is left for the build).

## R1: what breaks

With zod `^4.6.7` installed and `zod-to-json-schema` removed:

- `npx tsc`: 3 errors, as the roadmap's 2026-11-23 trial found:
  - `src/index.ts:1732` and `src/tools/change-watcher.ts:156`: `zodToJsonSchema(...)` takes zod 3
    types (`ZodTypeDef`); the package is gone anyway.
  - `src/tools/cleanup-agent-artifacts.ts:273`: `error.errors` doesn't exist on zod 4's
    `ZodError`; use `error.issues`.
- Test suite (after the three fixes): 1,722 pass, 4 fail, all on zod 3's message wording:
  - `tests/tools/check-documentation-links.test.ts`: "Number must be greater than or equal to
    1000", "Number must be less than or equal to 20" (zod 4: `too_small` / `too_big`, "Too small:
    expected number to be >=1000").
  - `tests/tools/generate-technical-writer-prompts.test.ts`: "Required" (zod 4: `invalid_type`,
    "Invalid input: expected string, received undefined").
  - `tests/tools/test-local-deployment.test.ts`: "Invalid enum value" (zod 4: `invalid_value`).
- No other zod 3 API in use: 32 files use plain `z.string/number/object/enum/array/literal/
  record/union`, all `z.record` calls already pass a key schema, and `z.string().url()` still
  works in zod 4.
- `@modelcontextprotocol/sdk` 1.32.2 declares zod `^3.25 || ^4.0`: `npm ls zod` shows one zod
  4.6.7, deduped.

## R2: publishing the same JSON Schema

Decision: one helper, `toolInputSchema` in `src/utils/tool-input-schema.ts`:

```ts
import { z } from "zod";

export function toolInputSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    io: "input",        // fields with a default are optional, as before
    target: "draft-7",  // "$schema": "http://json-schema.org/draft-07/schema#", as before
    override: (ctx) => {
      const s = ctx.jsonSchema as Record<string, unknown>;
      if (s.type === "object" && s.additionalProperties === undefined) {
        s.additionalProperties = false; // zod-to-json-schema's default for every object
      }
    },
  }) as Record<string, unknown>;
}
```

Evidence: the built server's `tools/list` (via `contracts/tools/list-tools.mjs`), zod 3 vs zod 4
with this helper, compared after sorting keys: **52 of 52 schemas identical**.

Alternatives rejected:
- `z.toJSONSchema` with `io: "input"` only: 79 objects lose `additionalProperties: false`
  (accepted by clients, but a published change; the outcome asks for none).
- `io: "output"`: keeps `additionalProperties: false` but lists defaulted fields as required,
  which would make clients send them.
- Keeping `zod-to-json-schema` (3.25 lists zod 4 as a peer): it renders zod 4 schemas through a
  compatibility layer and is the package the roadmap item removes.

## R3: tests

Change the four failing assertions to check the issue code and path (or only that the call was
rejected), not message text (FR-005). Add a unit test for `toolInputSchema` with a small schema
(a default, an enum, a nested optional object) asserting the exact JSON Schema above.
