<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Principles added: I. The roadmap decides what gets built; II. The owner decides, in writing;
  III. Every change arrives by pull request, with tests; IV. The tool surface is a contract;
  V. Skills orchestrate, they never re-implement; VI. Dependencies and toolchain are approved in
  planning; VII. Tests are deterministic and offline; VIII. Planning files and CI belong to the
  owner
- Sections added: Technology, Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read this file at runtime; no template edits needed
- Deferred: none
-->

# DocuMCP Constitution

DocuMCP is a documentation-analysis MCP server published on npm. It is maintained item by item
from its roadmap, and it is a dogfood target for Chalkeus: every change is planned first,
approved by the owner, and traceable to a roadmap item. Agents may draft and build; the owner
decides.

## Core Principles

### I. The roadmap decides what gets built

`.specify/memory/roadmap.md` is the record of what DocuMCP will become and in what order. Work
starts only on a roadmap item whose spec and tasks exist and whose dependencies are `verified`.
A change that no item asks for is not made. One item gets one concise spec; work beyond its
scope gets its own item.

### II. The owner decides, in writing

The owner and the controller (the agent driving the work) plan together: the controller may
draft the roadmap, specs and tasks; the owner reviews, edits and merges them. Merging is the
approval. These are the owner's alone and are never inferred: the product name, the
compatibility strategy for a rename, any new user-facing surface (such as a standalone CLI),
publishing to npm, and changes to the docs domain. An item becomes `verified` only when the
owner merges the change that says so.

### III. Every change arrives by pull request, with tests

Each change is one pull request for one roadmap item (or one slice of it), titled in
[Conventional Commits](https://www.conventionalcommits.org/) form, as commitlint already
enforces. It adds or updates tests for what it changes, keeps every existing test passing, and
passes CI. The owner merges; no one pushes to `main`.

### IV. The tool surface is a contract

The MCP tools, prompts and resources, their names and their input schemas are what users and
agents depend on. A change that removes or renames one, or narrows its inputs, is a breaking
change: it needs a roadmap item that says so, a major version, a CHANGELOG entry and a
migration note. Existing users are never broken silently. Accepted ADRs in `docs/adrs/` govern
the design until an ADR supersedes them.

### V. Skills orchestrate, they never re-implement

Agent skills shipped in `skills/` teach an agent which tools to call, in what order, with what
inputs, and how to check the result. A skill that explains how an analysis works instead of
which tool performs it is a defect. Where the tool surface can't do what a skill needs, the gap
is logged and proposed as a roadmap item, never worked around in prose.

### VI. Dependencies and toolchain are approved in planning

`package.json`, `package-lock.json`, `.nvmrc` and the Node version in CI change only through a
planning pull request the owner merges, or through an item whose spec names the change. An item
never adds a dependency on its own.

### VII. Tests are deterministic and offline

`npm test` runs with Jest and needs no network, no credentials and no external service. A test
that fails sometimes, or that leaves handles open so the runner must force-exit, is a defect.

### VIII. Planning files and CI belong to the owner

The constitution, the roadmap, specs, `.github/` and release scripts change only through owner
pull requests. An item's allowed paths never include them.

## Technology

TypeScript (ES modules), Node.js LTS, the MCP TypeScript SDK, Zod schemas, tree-sitter parsers,
Jest with ts-jest, ESLint and Prettier; Docusaurus for the docs site; released to npm.

## Governance

This constitution outranks other practices. Amendments are owner pull requests that state the
reason, update the version below, and record the change at the top of this file. Versions
follow semantic versioning: MAJOR for removed or redefined principles, MINOR for new ones,
PATCH for wording.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
