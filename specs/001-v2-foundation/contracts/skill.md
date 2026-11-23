# Contract: the flagship skill

Path: `skills/documentation-analysis/SKILL.md`.

```markdown
---
name: documentation-analysis
description: <when to use it: analysing a repository's documentation with DocuMCP's tools>
---

# <title>

## When to use
## Before you start      <- the DocuMCP server is connected; what input the agent needs
## Workflow              <- numbered steps; each is one tool call
## Checking each step    <- how the agent verifies each call's output
## Gap log               <- where to write it, and what goes in it
```

Rules:

- `name` equals the folder name; `description` is one or two sentences and says when to use it.
- Each workflow step names one DocuMCP tool, in backticks, with the parameters it passes, for
  example `analyze_repository` with `path` and `depth`. The steps cover, in order: analysing the
  repository, a site-generator recommendation, and gap and accuracy checks of the documentation.
- The skill never explains how an analysis is computed; it says which tool does it (constitution V).
- The gap log is a Markdown list the agent writes (default `documcp-gap-log.md` in the analysed
  repository's root): each entry is the step, what the tools didn't cover, and what the agent did
  instead.

Check (US2 test): every backticked name that is a DocuMCP tool must be in `TOOLS` in
`src/index.ts`, and every parameter named with it must be in that tool's input schema.
