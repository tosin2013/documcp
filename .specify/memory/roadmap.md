<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.1.1
Bump rationale: PATCH — Q3 moved into 001's notes (001 answers it).

Prior: Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — new planned spec 004 (zod 4 migration) and a new dependency for 003.

Changes this revision (1.1.0):
  - Added spec 004 — zod 4 migration (production audit: zod high advisory GHSA-mrhx-c7xc-m3w5)
  - 003 now depends on 004
  - Planning PR also ran `npm audit fix` and moved simple-git to 4 (critical advisories)

Changes in 1.0.0:
  - Added spec 001 — v2.0 foundation (Node 24, skills layer, CLI verdict)
  - Added spec 002 — Rename (needs-info: the new name)
  - Added spec 003 — v2.0 release
  - Decisions recorded: C-01 to C-06

Specs affected: 001, 002, 003
Open questions added/resolved: Q1, Q2, Q3 added

Notes: built from the owner's v2.0 product requirements (2026-11-23), which are kept outside
this public repository; their goals, decisions and gates are carried here.
-->

# DocuMCP — Spec Roadmap

Living, non-binding map of the specs planned for DocuMCP. It is **not a commitment to order or
scope**; it captures the decisions, outcomes and constraints behind each planned spec so they
are not lost before the spec that needs them is written. Foundations: the project
[constitution](constitution.md).

Status legend (lifecycle): **undecided** · **needs-info** · **planned** · **specced** ·
**in-progress** · **implemented** · **verified** · **deferred** · **abandoned**.

---

## Vision & End States

- DocuMCP 2.0 ships under a new, ownable, transport-neutral name, with the old npm package
  deprecated and pointing to it, and no user broken silently.
- The repository is back to a maintainable baseline: CI green on `main` on a supported Node
  LTS, dependency updates and issues triaged.
- An embedded `skills/` layer lets an agent with no prior context run a correct documentation
  analysis through DocuMCP's tools.

## Constraints & Decisions

- **C-01 — One concise spec per item:** each item gets one spec; work beyond its scope gets its
  own item. The v2.0 work is three items because the rename can't be specified before the name
  is chosen.
- **C-02 — Node 24 LTS:** v2.0 targets Node 24 (Node 25 is end of life since 2026-06).
- **C-03 — Context7 dual pattern:** the repository keeps the MCP server and gains an embedded
  `skills/` folder in the Agent Skills format. Skills orchestrate the tools; they never
  re-implement analysis logic (constitution V).
- **C-04 — The new name is the owner's choice:** it must be transport-neutral (not tied to
  "MCP"). Candidate evaluation (npm, GitHub, domain availability, trademark check) prepares that
  decision; it doesn't make it. No candidate is decided.
- **C-05 — No new analysis features in v2.0:** the tool surface carries over unchanged except
  where the rename forces identifier changes (constitution IV).
- **C-06 — Built with Chalkeus:** items are built by Chalkeus forge runs (one slice per run
  where an item has user-story slices), and the owner reviews and merges every pull request.

## Planned Specs

### 001 — v2.0 foundation: Node 24, skills layer, CLI verdict  [status: specced]

- **Description:** Move DocuMCP to Node 24 LTS with CI green, add the flagship documentation-analysis
  skill under `skills/`, and record a verdict with evidence on the standalone CLI (issue #126).
- **Outcome:** CI and `npm test` pass on Node 24; `skills/` holds a flagship skill that a cold
  agent can follow to a correct analysis using only DocuMCP's tools, with a gap log of every
  improvisation; a verdict memo on #126 states build or don't build, with evidence.
- **Scope (in):** `.nvmrc`, `engines`, `@types/node` and CI's Node version; fixes needed for a
  green, offline, leak-free test run on Node 24; the `skills/` folder and its flagship skill; the
  #126 verdict memo, which reviews ADR-0017.
- **Scope (out):** the rename (002); publishing (003); building the CLI (a later item, only if
  the verdict says build and the owner approves); triage of Dependabot pull requests and issues
  (owner work, see Cross-Cutting Notes).
- **Depends on:** none
- **Governed by:** C-02, C-03, C-05, ADR-0017
- **Spec dir:** specs/001-v2-foundation/
- **Notes:** sliced by user story: US1 Node 24 baseline, US2 skills layer, US3 CLI verdict. US2
  and US3 build on US1's green baseline. US3's memo says whether to keep, amend or supersede
  ADR-0017 (standalone CLI, accepted); a build, if any, is a later item the owner approves.

### 002 — Rename to the new product name  [status: needs-info]

- **Description:** Rename the npm package, GitHub repository, binary, MCP server identifier,
  docs site, README and in-code identifiers to the owner's chosen name.
- **Outcome:** _to be defined_ once the name and the compatibility strategy are chosen.
- **Scope (in):** _to be defined_
- **Depends on:** 001
- **Governed by:** C-04
- **Notes:** blocked on Q1 and Q2. Recommendation for Q2: a clean break with a loud deprecation,
  given the small installed base.

### 003 — v2.0 release  [status: planned]

- **Description:** Release 2.0.0 under the new name, with a CHANGELOG entry and a migration note
  for existing npm users.
- **Outcome:** 2.0.0 is live on npm under the new name; the old package is deprecated with a
  pointer and still installs; the old docs domain redirects (301) to the new one.
- **Scope (in):** version, CHANGELOG, migration note in the README.
- **Scope (out):** publishing to npm and the domain cutover, which the owner does by hand.
- **Depends on:** 001, 002, 004

### 004 — zod 4 migration  [status: planned]

- **Description:** Move from zod 3 to zod 4, which fixes a high-severity advisory
  (GHSA-mrhx-c7xc-m3w5) that `npm audit --production` reports, and replace `zod-to-json-schema`
  (no zod 4 support) with zod 4's own JSON Schema output.
- **Outcome:** zod 4 is the only zod; the production audit has no high or critical finding; every
  MCP tool's published input schema is unchanged, or each difference is listed and accepted by
  the owner.
- **Scope (in):** the zod dependency change (in its planning PR, constitution VI), code changes
  for zod 4's API, and a before/after comparison of all tool input schemas.
- **Scope (out):** new tools or new parameters.
- **Depends on:** 001
- **Governed by:** C-05
- **Notes:** CI's Security Audit job fails on this advisory until 004 lands; the audit step is
  not loosened meanwhile. Tried 2026-11-23: zod 4 gives 3 type errors (`ZodTypeDef` in
  `src/index.ts` and `change-watcher.ts`, `ZodError.errors` in `cleanup-agent-artifacts.ts`).

## Open Questions

- Q1 — The new product name (owner decision, C-04). Unblocks 002.
- Q2 — Compatibility strategy for the rename: clean break or forwarding shims for one major
  version (owner decision, with the name). Unblocks 002.
- ~~Q3 — Keep or supersede ADR-0017?~~ Moved into 001's Notes (2026-11-23): 001's verdict
  memo answers it, so it isn't an open question blocking 001.

## Cross-Cutting Notes

- **Owner work outside the items:** triage the open Dependabot pull requests (merge, batch or
  close with a reason) and the open issues (#105, #121–#126, #128, #129, #163), each with a
  one-line disposition. Dependency changes still follow constitution VI.
- The docs site (Docusaurus) moves domains with 002 and 003; the old domain keeps 301 redirects.

---

**Version**: 1.1.1 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
