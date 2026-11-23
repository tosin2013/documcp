# Autonomous Decisions & Ambiguity Log

Started 2026-06-24, when the user granted autonomy to follow the speckit flow for specs
002/003/004 and beyond. This logs decisions I made without asking, ambiguities I hit, and
questions I would otherwise have raised — so they can be reviewed.

Format: each entry = **[spec/phase] decision/question — what I chose and why — confidence**.

---

## Standing decisions (apply across the autonomous run)

- **Path parenthetical removed (pre-002):** All four command bodies now use `{SCRIPT}` +
  the `scripts:` frontmatter only; the redundant hardcoded `.../bash/... / .../powershell/...`
  prose was stripped (it duplicated `{SCRIPT}` and re-introduced path-fragility). Core
  `check-prerequisites.sh` is still referenced explicitly (stable core script). Confidence: high.
- **after_specify / after_plan / after_tasks optional hooks** (agent-context, refine,
  worktree, critique, diagram, fleet, security-review): I run **critique** at the plan gate
  (high-value + dogfood of a sibling), and **our own brief/debrief** at the implement gates
  (the dogfood that is this project's point). I skip the rest unless a finding warrants them
  — agent-context is APM-managed here; refine-status has nothing to drift against yet;
  security-review/qa have negligible surface for read-only markdown commands. Confidence: high.
- **Review commands (002/003/004) ship no new scripts and no unit tests** — they are
  judgment (Constitution Principle II), validated by dogfood. This is a deliberate, logged
  boundary, not an omission. Confidence: high.
- **Numbering drift (roadmap entry N ≠ spec-dir N):** known and tolerated; entry matching is
  by spec-dir → title → number. Roadmap Open Question Q1 tracks the eventual reconciliation.
  Confidence: high.

## Open questions I could not resolve without the user (carried forward)

- **Q-A1 — GitHub remote / org:** The manifest uses `srobroek/speckit-roadmap` and Apache-2.0
  (from the earlier setup answers). The remote is NOT yet created. Before packaging (Task #5)
  I will need confirmation to actually create it / push. Deferring the create as outward-facing.
- **Q-A2 — release-please specifics:** I'll implement the `simple` release type tracking
  `extension.yml`'s `version:` via `extra-files`, Conventional Commits. If the user wants a
  different release-type or changelog sectioning, that's a packaging-phase decision.
  - **NOT YET IMPLEMENTED (confirmed to user 2026-06-24):** no release-please config, no
    workflow, extension.yml version (0.1.0) is hand-bumped. Repo has NO commits yet —
    release-please fundamentally needs a commit history + remote.
  - **USER REQ (2026-06-24):** seed an initial **0.1.0 release commit** as the release-please
    baseline. Plan: create `.release-please-manifest.json` = {".":"0.1.0"} +
    `release-please-config.json` (release-type: simple, extra-files: extension.yml), make the
    initial commit at 0.1.0, and bootstrap the manifest so release-please continues from there
    (avoids it trying to release 1.0.0 on first run). Tag v0.1.0 to match.
- **Q-A3 — roadmap entry/spec-dir renumbering:** whether to renumber roadmap entries to match
  `specs/NNN-*` or leave the drift documented. Low-stakes; leaving as-is + matching by title
  unless told otherwise.

## Per-spec entries

### Spec 002 — roadmap.brief (formal re-run)
- **Plan phase:** plan.md/research.md/quickstart.md already existed from prior hand-work and
  match what the formal flow produces (constitution check = 7/7 pass). Accepted as-is; no
  before_plan hooks. Confidence: high.
- **Critique (after_plan, dogfood):** verdict ✅ PROCEED, 0 must-address. Applied the one
  high-value recommendation (E2/X1): ambiguous-entry-match tie-break → list candidates + ask
  (added to FR-003 + brief command body). Confidence: high.
- **Q-002.1 (critique P3) — DECIDED autonomously:** When the active spec has no matching
  ledger entry, the brief STOPS and suggests adding it (does not fabricate a briefing from the
  spec alone). Rationale: no-fabrication stance; the spec text is already available to the
  implementer. Would have asked; chose the no-fabrication-consistent option. Confidence: high.
- **Q-002.2 (critique E4) — DECIDED autonomously:** Report pruning (old timestamped reports
  under roadmap-reviews/) is OUT OF SCOPE — an audit trail is desirable and the files are
  small; pruning is the user's call. Confidence: high.
- **Skipped after_plan hooks:** agent-context (APM-managed), refine-status (no prior artifacts
  to drift from), security-review (read-only markdown command, negligible surface).

### Spec 003 — roadmap.debrief (full formal flow)
- Full gate order ran: specify → plan → critique → tasks → brief → implement → debrief → write-amend.
- Critique ✅ PROCEED, 0 must-address. Applied recommendations: verified-gate (propose verified
  ONLY when outcome met AND zero must-address — FR-007), bounded artifact reading (FR-004),
  partial→outcome-miss (FR-004). Confidence: high.
- debrief reviewed its OWN implementation (recursive dogfood); roadmap → v1.3.0, entry 004 verified.

### Spec 004 — roadmap.sync (full formal flow)
- Full gate order ran. Critique ✅ PROCEED, 0 must-address. Applied: precise empty-dir
  definition (spec.md missing/template, no deep scan — FR-006), dependency resolved against
  ledger entries (FR-005).
- REAL DOGFOOD: ran sync against THIS repo's roadmap (4 specs + 7 entries). Correctly flagged
  entry 005 status-lagging. **Surfaced a genuine design gap (F2):** process/bootstrap entries
  (entry 001, no spec-dir) would be mis-flagged as phantoms → added the process-entry exception
  to FR-006 + the command. This is the dogfood doing exactly its job. roadmap → v1.4.0, entry
  005 verified, Q6 logged, Q5 resolved.
- **Q-004.1 — DECIDED autonomously:** process/bootstrap ledger entries (no `spec dir:` pointer)
  are exempt from phantom detection (reported as informational "process entries"). Would have
  asked; logged as roadmap Q6 for user confirmation. Confidence: medium (sensible default, but
  the convention for marking bootstrap entries is worth user input).

- **SEQUENCING CORRECTION (user caught this):** the pre-implementation review IS our `brief`
  (before_implement hook), which fires at the gate BETWEEN tasks and implement — not after
  implement. I had nearly slid from tasks → implement without firing it. Corrected: fired
  brief at the proper gate for 002 (read-only verified, roadmap mtime unchanged), regenerated
  against the post-critique spec. **Canonical gate order for every spec from here:**
  specify → plan → [critique] → tasks → [brief=before_implement] → implement → [debrief=after_implement].
  003/004 will follow this exactly.
