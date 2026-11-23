# Contract: the standalone-CLI verdict memo

Path: `docs/research/standalone-cli-verdict.md`.

Sections, in this order:

1. `## Recommendation`: one of **build**, **don't build** or **defer**, in the first sentence,
   with a one-paragraph reason.
2. `## User demand`: who would use a CLI that the MCP server and the skills layer don't serve,
   with the evidence (issue #126 and its discussion, download numbers, comparable tools).
3. `## Maintenance cost`: what a third surface costs to keep working (commands, tests, docs,
   releases).
4. `## Overlap with the skills layer`: what the skills layer already covers of #126's commands.
5. `## ADR-0017`: whether the recommendation keeps, amends or supersedes ADR-0017, and why.
6. `## References`: links to issue #126 and `docs/adrs/adr-0017-standalone-cli-surface-for-non-mcp-workflows.md`.

The memo recommends; the owner decides (constitution II). Nothing is built by this item.
