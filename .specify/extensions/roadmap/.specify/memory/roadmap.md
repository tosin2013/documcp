<!--
SYNC IMPACT REPORT
==================
Version change: 1.3.0 → 1.4.0
Bump rationale: MINOR — post-implementation amendment after spec 004 (roadmap.sync)
  verified, plus a new Open Question (Q6). Status transition + scope addition + a new
  open question; no direction change, so not MAJOR.

Changes this revision (1.4.0, amended 2026-06-24):
  - 005 roadmap.sync: planned → verified; scope-in gains the STATUS-as-pivot rule, the
    divergence taxonomy, the empty-dir definition, and the process-entry exception; added
    spec dir specs/004-roadmap-sync/; governed-by gains C-01.
  - Q5 resolved (agent-context refreshed). Q6 added (process/bootstrap-entry phantom
    exemption — surfaced by the real sync dogfood). Q2/Q4 noted partially resolved.
  - Triggered by the spec 004 debrief (after_implement gate). With this, all four review
    commands + the authoring command are verified.

Specs affected: 005
Open questions added/resolved: Q5 resolved; Q6 added; Q1 still open.

--- Prior revision (1.3.0, amended 2026-06-24): MINOR — after spec 003 verified.
    004 roadmap.debrief → verified; scope-in gained the drift taxonomy + verified-gate +
    bounded reading; spec dir + C-01 added.

--- Prior revision (1.2.0, amended 2026-06-24): MINOR — after spec 002 verified.
    003 roadmap.brief → verified; scope-in gained the shared review template + the
    ambiguous-match tie-break; spec dir + C-01 added.

--- Prior revision (1.1.0, amended 2026-06-24): MINOR — after spec 001 verified.
    002 → verified (folded in PowerShell parity + test suite from former 006); 006
    → abandoned (absorbed into 002, struck through not deleted); Q4 resolved.

--- Prior revision (1.0.0, ratified 2026-06-24): MAJOR — first ratified roadmap;
    replaced the template skeleton with vision, decisions C-01..C-07, the 001–007
    spec ledger, and Open Questions Q1..Q5. Drafted by harvesting the constitution,
    extension.yml, config-template.yml, and the task list; gaps parked as Open
    Questions rather than fabricated.
-->

# speckit-roadmap — Spec Roadmap

Living, non-binding map of the specs planned for **speckit-roadmap**. It is **not a
commitment to order or scope** — it captures the spec-specific discussion,
decisions, technology choices, outcomes, and constraints surfaced during the
constitution and grilling phases so they are not lost before the spec that needs
them is written. Specs are scoped and clarified when they are actually started.
Foundations: the project [constitution](constitution.md). No PRD detected.

Status legend (lifecycle): **undecided** · **needs-info** · **planned** ·
**specced** · **in-progress** · **implemented** · **verified** · **deferred** ·
**abandoned**.

---

## Vision & End States

<!-- Harvested from the constitution; the WHY of the project. -->

- A spec-kit extension (`speckit-roadmap`) that **installs and registers cleanly**
  via `specify extension add` / `enable` and whose three lifecycle hooks
  (`after_constitution`, `before_implement`, `after_implement`) fire correctly in a
  real spec-kit project.
- A **durable, versioned roadmap artifact** lives beside the constitution
  (`.specify/memory/roadmap.md`) that captures the WHY — decisions, technology
  choices, intended outcomes, constraints — plus a cross-spec ledger (planned specs,
  dependencies, lifecycle status), surviving across features.
- **No loss of constitution-phase / grilling context**: spec-specific intent for
  specs not written for weeks or months is recorded once and checked later.
- **Pre- and post-implementation reviews** that read the roadmap and check the spec
  about to be / just built against its recorded outcome and scope — strictly
  read-only, proposing changes rather than applying them.
- The extension is **dogfooded on its own repository** (built through
  constitution → roadmap → specify → plan → tasks → implement) before release, and
  ships with cross-platform (bash + PowerShell) parity and Apache-2.0 licensing.

## Constraints & Decisions

<!-- Durable "why", harvested from the constitution and extension.yml. No ADRs
     present, so none of these link out yet. Stable ids let spec entries reference
     them. -->

- **C-01 — Canonical conformance (Constitution I):** the extension MUST match real
  spec-kit extension shape (valid `extension.yml`; `commands/` whose `name:` is the
  full `speckit.{id}.{cmd}` slug; paired bash + PowerShell scripts; `templates/`;
  `config-template.yml`; README + CHANGELOG + LICENSE). Ground truth is spec-kit
  docs then real bundled extensions (`critique`, `verify`).
- **C-02 — Determinism split (Constitution II):** deterministic mechanics
  (path/feature resolution, prereq checks, JSON output contracts, version/changelog
  arithmetic, file-existence checks) live in scripts; judgment (elicitation,
  synthesis, drift detection, review reasoning) lives in command bodies. Neither
  re-derives the other's work.
- **C-03 — Non-destructive & idempotent (Constitution III):** commands never
  overwrite user-authored content; review commands are STRICTLY read-only and only
  edit after explicit approval; every command is safe to re-run; roadmap changes
  append to the Sync Impact Report changelog and mark (not delete) superseded
  entries.
- **C-04 — Roadmap as durable governance (Constitution IV):** the roadmap is a
  project-level artifact beside the constitution (default
  `.specify/memory/roadmap.md`, overridable via `config-template.yml`), carries
  constitution-style semver + Sync Impact Report, and survives across features.
- **C-05 — Cross-platform parity (Constitution V):** every shipped script exists as
  a `.sh` + `.ps1` pair with equivalent behavior and identical JSON output
  contracts; the `scripts.sh` / `scripts.ps1` frontmatter references both; commands
  work on macOS, Linux, Windows.
- **C-06 — Elicitation completeness, no fabrication (Constitution VI):** the draft
  command actively asks for end states, goals, scope (in/out), outcomes, and
  constraints where the constitution did not settle them, and never invents content
  — unknowns become explicit Open Questions or `needs-info`/`undecided` entries.
- **C-07 — Packaging & distribution (Technology Constraints):** distributed as a
  spec-kit extension; source of truth at the repo root; scripts are POSIX bash +
  PowerShell 7+ emitting JSON on a `--json` flag, reusing core
  `.specify/scripts/bash/common.sh` helpers where appropriate; hooks are
  `after_constitution` / `before_implement` / `after_implement`; license Apache-2.0.
  Non-binding: if it conflicts with a principle, the principle wins.

## Planned Specs

<!-- THE LEDGER. Spec numbers are a planning sequence; they do NOT yet correspond
     to specs/NNN-* directories (none exist yet). Status reflects the current
     task-list state at draft time. -->

### Core extension

### 001 — Bootstrap extension skeleton  [status: implemented]

- **Description:** The minimal installable shell of the extension — `extension.yml`
  manifest (id, provides, hooks, requires), the roadmap template, and the initial
  `roadmap.write` command body — enough to install and fire the
  `after_constitution` hook.
- **Outcome:** `extension.yml` validates against the spec-kit loader; the extension
  installs/enables and the `after_constitution` hook is registered; the roadmap
  template and draft command exist at the repo root.
- **Scope (in):** `extension.yml`, `templates/roadmap-template.md`, initial
  `commands/speckit.roadmap.write.md`.
- **Scope (out):** brief/debrief/sync commands; PowerShell scripts; tests; release
  packaging.
- **Depends on:** none.
- **Governed by:** C-01, C-07.
- **Notes:** Matches task "Author minimal bootstrap (manifest, template, draft)",
  marked complete. The bootstrap artifacts are present at the repo root and mirrored
  under `.specify/extensions/roadmap/`.

### 002 — roadmap.write command + load-config script  [status: verified]

- **Description:** The create/amend `write` command plus its `load-config` script
  (bash + PowerShell) that emits the JSON config contract (`roadmap_path`,
  `roadmap_exists`, `adr_dir`, `adr_present`, `prd_globs`, `max_findings`).
- **Outcome:** Running `speckit.roadmap.write` after the constitution produces a
  versioned `roadmap.md` (v1.0.0 on create) or non-destructively amends + version-
  bumps an existing one; the script resolves config from `config-template.yml` /
  `roadmap-config.yml` and `SPECKIT_ROADMAP_*` env overrides, identically on bash and
  PowerShell. **Achieved** — verified by 96 passing tests (Bats 35 + Pester 53 +
  parity 8) and two clean verification gates.
- **Scope (in):** `commands/speckit.roadmap.write.md`, `scripts/bash/load-config.sh`,
  **`scripts/powershell/load-config.ps1` + the Bats/Pester/parity test suite** (folded
  in from former entry 006), config detection logic, self-detecting create-vs-amend,
  semver bump rules, malformed-roadmap guard.
- **Scope (out):** brief/debrief/sync (entries 003–005); release packaging (007).
- **Depends on:** 001.
- **Governed by:** C-02, C-03, C-04, C-05, C-06.
- **Spec dir:** specs/001-roadmap-write/
- **Notes:** Built via the full SDD cycle (specify → plan → critique → tasks →
  implement → verify → debrief). The debrief surfaced that PowerShell parity landed
  here rather than in a separate spec; entry 006 is absorbed into this one (see v1.1.0
  Sync Impact Report). Resolves former Q4 (script path → installed `.specify/extensions/
  roadmap/...` path).

### 003 — roadmap.brief (pre-implementation review)  [status: verified]

- **Description:** Read-only briefing fired by the `before_implement` hook that
  surfaces what the roadmap expects for the spec about to be implemented — outcome,
  scope, governing decisions, dependencies.
- **Outcome:** Before `/speckit.implement`, the implementer sees the roadmap entry's
  recorded outcome, in/out scope, governing C-/ADR ids, and dependency specs, with
  no file mutation. **Achieved** — built via the full SDD cycle and dogfood-verified
  read-only (roadmap unchanged across runs).
- **Scope (in):** `commands/speckit.roadmap.brief.md`; matching the active spec to its
  ledger entry (spec-dir → title → number, with an **ambiguous-match tie-break: list
  candidates and ask**); rendering a briefing report; **the shared
  `templates/review-report-template.md`** (also reused by debrief/sync).
- **Scope (out):** any roadmap or spec mutation; status transitions.
- **Depends on:** 002 (verified).
- **Governed by:** C-01, C-03.
- **Spec dir:** specs/002-roadmap-brief/
- **Notes:** Built via specify → plan → critique → tasks → brief → implement → debrief.
  No new scripts/tests (judgment, Principle II — validated by dogfood). Critique added
  the ambiguous-match tie-break; debrief proposed this verified status + scope update.

### 004 — roadmap.debrief (post-implementation review)  [status: verified]

- **Description:** Read-only review fired by the `after_implement` hook that checks
  the implemented spec against its roadmap entry's outcome and scope, classifies drift,
  and proposes a status transition.
- **Outcome:** After `/speckit.implement`, a report compares the built spec to its
  recorded outcome/scope and PROPOSES (does not apply) a ledger status update.
  **Achieved** — built via the full SDD cycle and dogfood-verified read-only.
- **Scope (in):** `commands/speckit.roadmap.debrief.md`; outcome/scope comparison; the
  **drift taxonomy** (outcome-miss / scope-creep / constraint-violation / roadmap-stale);
  the **verified-gate** (propose verified only when outcome met AND zero must-address);
  bounded reading of spec-referenced artifacts; uses the shared review-report template.
- **Scope (out):** applying edits without approval; authoring spec or ADR files.
- **Depends on:** 002 (verified), 003-brief (verified).
- **Governed by:** C-01, C-03.
- **Spec dir:** specs/003-roadmap-debrief/
- **Notes:** Built via specify → plan → critique → tasks → brief → implement → debrief
  (the debrief reviewed its own implementation). No new scripts/tests (judgment,
  Principle II). Critique added the verified-gate + bounded reading.

### 005 — roadmap.sync (drift reconciliation)  [status: verified]

- **Description:** Read-only reconciliation that detects drift between the roadmap
  ledger and specs on disk — orphans, phantom entries, status drift, dependency
  contradictions, superseded ADRs.
- **Outcome:** A findings report (capped at `max_findings`) listing roadmap/spec
  drift, proposing reconciling edits without applying them. **Achieved** — built via
  the full SDD cycle and dogfooded against this repo's own roadmap (correctly flagged
  the then-in-progress sync spec as status-lagging).
- **Scope (in):** `commands/speckit.roadmap.sync.md`; whole-ledger-vs-`specs/`
  comparison; the **STATUS-as-pivot** disk-existence rule; the divergence taxonomy
  (orphan-spec / phantom-entry / status-lagging / dependency-contradiction /
  superseded-ADR); the **empty-dir** definition (spec.md missing or still template);
  the **process-entry exception** (entries with no `spec dir:` pointer are not phantoms);
  uses the shared review-report template; roadmap-level report.
- **Scope (out):** auto-applying reconciliation; mutating specs.
- **Depends on:** 002 (verified).
- **Governed by:** C-01, C-03.
- **Spec dir:** specs/004-roadmap-sync/
- **Notes:** Manual command, no lifecycle hook. Built via specify → plan → critique →
  tasks → brief → implement → debrief. No new scripts/tests (judgment, Principle II;
  `specs/` enumerated in-model). The real dogfood surfaced the process-entry exception
  (now in scope) — see Open Question Q6.

### Cross-cutting

### 006 — Cross-platform script parity + tests  [status: abandoned]

- **Description:** ~~PowerShell counterparts for every bash script with identical JSON
  output contracts, plus parity tests proving bash and PowerShell agree.~~
  **ABSORBED into entry 002** (debrief 2026-06-24): cross-platform parity is
  foundational, not a separable follow-on — PowerShell `load-config.ps1` and the
  Bats/Pester/parity suite were delivered as part of spec 001. Future scripts added by
  003–005 carry the C-05 parity obligation within their own specs.
- **Outcome:** _superseded — see entry 002._
- **Scope (in):** _superseded — see entry 002._
- **Depends on:** 002.
- **Governed by:** C-05, C-02.
- **Notes:** Not a separate spec. Kept here (struck through, not deleted) to preserve
  the decision history per the Non-Destructive principle.
  `tests/` is currently a `.gitkeep` placeholder.

### 007 — Release packaging  [status: planned]

- **Description:** Release-readiness artifacts: README, CHANGELOG, LICENSE
  (Apache-2.0), and release-please automation; final conformance check that the
  extension installs and hooks fire in a real spec-kit project.
- **Outcome:** The extension is publishable — docs present, changelog automated,
  Apache-2.0 license shipped, and dogfooded install/hook-fire verified.
- **Scope (in):** README.md, CHANGELOG.md, LICENSE, release-please config, final
  conformance/dogfood gate.
- **Scope (out):** feature behavior of the four commands.
- **Depends on:** 002, 003, 004, 005, 006.
- **Governed by:** C-01, C-07.
- **Notes:** Maps to task "Add release-please + README/CHANGELOG/LICENSE". LICENSE
  exists at the repo root already; README/CHANGELOG for the extension still pending.

## Open Questions

<!-- Genuine gaps the draft could not resolve from harvested context. These were
     NOT fabricated into ledger content. Resolve into the ledger as decisions firm. -->

- **Q1 — Spec numbering vs. directory mapping:** the 001–007 numbers above are a
  planning sequence; no `specs/NNN-*` directories exist yet. Confirm whether each
  ledger item becomes one `/speckit.specify` feature (and thus one `specs/` dir) or
  whether some are bundled. Resolves the `spec dir:` fields.
- **Q2 — Granularity of the four commands:** should the four commands ship as one
  spec (matching the single task "Implement full extension: 4 commands + script +
  tests") or as separate specs (002–005 as drafted)? This changes the ledger
  grouping and dependency edges. Evidence: how the user intends to run
  `/speckit.specify`.
- **Q3 — Target spec-kit version & validation method:** `extension.yml` requires
  `speckit_version >=0.11.6`. Confirm the canonical reference extensions/version to
  validate conformance against (constitution names `critique`, `verify`).
- **Q4 — Script path discrepancy (found while drafting):** the draft command body /
  skill reference `.specify/scripts/bash/load-config.sh`, but the working script is
  at `scripts/bash/load-config.sh` (repo root) and mirrored at
  `.specify/extensions/roadmap/scripts/bash/load-config.sh`. The documented path
  does not exist. Confirm the intended canonical path so 002/006 align.
- **Q5 — Stale agent context files:** ~~`CLAUDE.md` and `AGENTS.md` embed the unfilled
  constitution template~~ **RESOLVED 2026-06-24** — refreshed via `apm compile` to the
  ratified v1.0.0 constitution.
- **Q6 — Process/bootstrap-entry phantom-exemption (NEW, from the sync dogfood):** Entry
  001 (Bootstrap) has a lifecycle status (`implemented`) but no `spec dir:` pointer and no
  `specs/` directory, because it is a process/bootstrap step rather than a numbered spec.
  Strict status-gating would mis-flag it as a phantom. The sync command now exempts entries
  with no `spec dir:` pointer (treats them as informational "process entries"). Confirm this
  convention and whether bootstrap-style entries should carry an explicit marker.

> **Partially resolved:** Q2 (granularity) → per-command specs (002–005 each own a spec).
> Q4 (script path) → commands reference the installed `.specify/extensions/roadmap/...` path
> via `{SCRIPT}` frontmatter. Q1 (numbering) remains: roadmap entry N ≠ spec-dir N; matched
> by title/`spec dir:` pointer for now.

## Cross-Cutting Notes

<!-- Architecture-level notes spanning multiple specs. -->

- **Determinism split is the recurring shape.** Every command (002–005) pairs a thin
  deterministic script (path resolution, prereq + existence checks, JSON contract,
  version/changelog arithmetic) with a judgment-bearing command body. Any new script
  carries the C-05 cross-platform-parity obligation within its own spec.
- **Read-only is the default for reviews.** brief/debrief/sync (003/004/005) must
  emit reports and PROPOSE edits only; only `write` (002) writes, and only the roadmap
  artifact, non-destructively.
- **Source of truth is the repo root**, mirrored into `.specify/extensions/roadmap/`
  for the installed/dogfooded copy. Keep both in sync when editing commands/scripts.

---

**Version**: 1.4.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
