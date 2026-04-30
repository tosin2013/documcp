---
id: adr-17-standalone-cli-surface
title: "ADR-017: Standalone CLI Surface for Non-MCP Workflows"
sidebar_label: "ADR-017: Standalone CLI"
sidebar_position: 17
documcp:
  last_updated: "2026-04-30T00:00:00.000Z"
  last_validated: "2026-04-30T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: TBD
status: accepted
date: "2026-04-30"
---

# ADR-017: Standalone CLI Surface for Non-MCP Workflows

## Status

Accepted (proposed 2026-04-30)

## Date

2026-04-30

## Context

Today the `documcp` package only runs as an MCP stdio server. Adoption is gated on having an MCP host (Claude Desktop, Cursor, VS Code with the right extension, etc.). This excludes several legitimate use cases:

- CI pipelines that want to fail a build on documentation drift.
- One-off evaluators who want to try documcp before committing to MCP host setup.
- Scripted workflows that integrate documcp into existing toolchains.
- Contributors who want to debug a single tool without running the full MCP server.

A direct CLI (`documcp-cli analyze ...`) would unlock all of these without forking core logic. Issue [#126](https://github.com/tosin2013/documcp/issues/126) tracks the implementation.

## Decision

Add `src/cli.ts` as a thin dispatcher that uses an internal `runTool(name, input)` adapter to call existing tool handlers directly, bypassing MCP request/response framing.

1. Expose this as a second `bin` entry in `package.json` (`documcp-cli`), keeping `documcp` as the MCP server entry point.
2. Subcommands mirror tool names:

   ```bash
   documcp-cli analyze <path>
   documcp-cli recommend <path>
   documcp-cli setup <path> --ssg <name>
   documcp-cli deploy <path>
   documcp-cli validate <path>
   ```

3. Each subcommand accepts the same parameters as its corresponding MCP tool, validated by the same Zod schemas.
4. Output defaults to human-readable text on stdout; `--json` toggles structured JSON for scripting.
5. Exit codes follow Unix conventions: `0` success, `1` user error, `2` system error.
6. The CLI does **not** duplicate any business logic. It is purely a different transport for the existing tool handlers, enforced by a single shared call site.

## Alternatives Considered

### Tell users to write their own MCP-host wrapper

- **Pros**: Zero work for documcp maintainers.
- **Cons**: Raises the bar for evaluation and CI use; the friction kills adoption that would otherwise happen.
- **Decision**: Rejected.

### A separate Node script per tool

- **Pros**: Each script is independently understandable.
- **Cons**: Duplicates argument parsing and schema validation per tool; drifts over time; triples maintenance.
- **Decision**: Rejected.

### Expose tools as an HTTP API instead of a CLI

- **Pros**: Unifies remote and local clients.
- **Cons**: Adds a server-process dependency and an authentication surface; CLI is closer to what CI users actually want.
- **Decision**: Rejected.

### Generate a CLI wrapper from the MCP tool registry at runtime via reflection

- **Pros**: Zero per-subcommand code.
- **Cons**: Makes `--help` slow, complicates static analysis, and loses the chance to write good prose for each subcommand.
- **Decision**: Rejected.

## Consequences

### Positive

- Wider audience and use cases (CI integration, scripting, one-off evaluation).
- Contributors can debug tools without running the full MCP server.
- CI smoke tests for the package itself become trivial (`documcp-cli analyze .` on the repo).
- documcp's own examples in documentation can be CLI commands instead of MCP-host configuration boilerplate.

### Negative

- Tool handlers must be callable outside an MCP request context, which requires a small refactor to extract them from the MCP routing in `src/index.ts`.
- Two entry points to maintain — but they share 100% of the logic via the shared `runTool()` adapter.
- CLI argument parsing and help text are now part of the API surface and need to evolve compatibly.

### Risks and Mitigations

- **Risk**: Tool handlers may rely on MCP-specific context (e.g., session `resourceStore`) that does not exist in CLI mode.
  **Mitigation**: Pass a CLI-specific context shim that provides equivalent functionality (file-backed resource cache).
- **Risk**: CLI argument parsing diverges from Zod schemas over time.
  **Mitigation**: Derive argument parsing from the schemas using `zod-to-json-schema` and a small `zod-to-cli-args` helper.
- **Risk**: Users may expect CLI features that do not exist in MCP (e.g., interactive prompts).
  **Mitigation**: Document the CLI as "feature-equivalent to the MCP server" and reject interactive-only features.

## Implementation Tracking

- [#126 Standalone CLI mode (documcp analyze ...) for non-MCP workflows](https://github.com/tosin2013/documcp/issues/126) — milestone `v1.0.0 — Ecosystem`.

## Evidence

- `package.json` `bin` field: currently exposes only `documcp`; the bin map naturally accommodates `documcp-cli` as a second entry.
- `src/index.ts`: tool handlers are inlined in a switch over `CallToolRequestSchema`; extracting them into a shared `runTool(name, input)` is a self-contained refactor.
- `src/types/api.ts`: defines `MCPToolResponse` which is independent of the MCP transport, so the CLI can consume the same response type and render it differently.
- Industry pattern: similar dual-surface tools include Prettier (CLI + API + plugin), ESLint (CLI + Node API), and TypeScript (`tsc` CLI + `ts` API + LSP). All maintain a single source of truth for logic with thin transport-specific wrappers.

## Related Decisions

- [ADR-001: MCP Server Architecture](./adr-0001-mcp-server-architecture.md) (the existing transport)
- [ADR-006: MCP Tools API Design](./adr-0006-mcp-tools-api-design.md) (the tool handler shape that the CLI delegates to)
