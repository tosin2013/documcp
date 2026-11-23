# Roles and partner extensions

`/speckit.spec-status.review as <role>` changes **what comes first**, never the facts. Every role sees the same counts, findings and `path:line` citations as the default view; a role only reorders sections and recommends some follow-ups first (decision D-2026-11-12-05). A repository test keeps this file valid.

## Review sections

The closed list of sections review produces. Each section is shown only when it has something in it.

| Section | Contents |
|---|---|
| `progress` | Recorded-verified active items, checked tasks, totals. |
| `blockers` | Active items with an unsatisfied dependency, and which dependency. |
| `human-review` | Dependencies on superseded items (never redirected automatically). |
| `diagnostics` | All findings grouped by severity: error, warning, info. |
| `ready-to-start` | `planned` or `specced` items whose dependencies are all satisfied, excluding items whose tasks are all checked. |
| `unchecked-tasks` | Active items with unchecked tasks, with counts. |
| `missing-artifacts` | Error-level missing spec link, spec directory, spec.md, plan.md or tasks.md for the recorded stage (active, non-superseded items). |
| `evidence-gaps` | Active, non-superseded items recorded `implemented` or `verified` with unchecked tasks, an unread task file, an unverified dependency, or error diagnostics. |
| `dependency-chains` | Each blocked item's chain back to the first unfinished dependency. |
| `supersession` | Superseded items, their successors, and invalid chains. |
| `constraints` | Each item's `Governed by` constraints, as recorded in the roadmap. |
| `verification-gap` | Active items not recorded verified, counted per close-gap cause (ready for debrief, tasks done early, status ahead of tasks, missing artifacts, unknown status, blocked), with IDs; planned items without a spec are listed apart as not started. |

## Roles

| Role | Leads with | First follow-ups | Role checks |
|---|---|---|---|
| `default` | `progress`, `blockers`, `human-review`, `diagnostics`, `ready-to-start` | /speckit.spec-status.reconcile, /speckit.spec-status.unblock | Route every finding (see review). |
| `pm` | `verification-gap`, `progress`, `blockers`, `ready-to-start`, `human-review` | /speckit.spec-status.close-gap, /speckit.spec-status.unblock, /speckit.spec-status.reconcile | Report progress in recorded terms only: say "recorded verified", never "done". Name what is ready to start and what each blocker waits on. Do not infer dates or quarters. (Replaces the project-manager sample prompt.) |
| `developer` | `ready-to-start`, `unchecked-tasks`, `missing-artifacts`, `blockers` | /speckit.spec-status.reconcile, /speckit-tasks, /speckit-implement | Pick the next item that is ready and has a spec, plan and tasks; if none has all three, say so and suggest the command that creates the first missing artifact for the first ready item (/speckit-specify, /speckit-plan or /speckit-tasks). Point out stale or unchecked tasks. A checked box is not a passing test; do not run the project's tests or other commands unless the user allows it. (Replaces the software-engineer sample prompt.) |
| `qa` | `evidence-gaps`, `diagnostics`, `unchecked-tasks` | /speckit.spec-status.verify-readiness, /speckit.roadmap.debrief, /speckit-analyze | Flag every item recorded `implemented` or `verified` that has unchecked tasks, a task file that was not read, an unverified dependency, or error diagnostics. `verified` is a label, not proof. |
| `architect` | `dependency-chains`, `supersession`, `human-review`, `constraints` | /speckit.spec-status.unblock, /speckit.spec-status.explain, /speckit.roadmap.sync | Trace dependency chains and supersession, flag cycles and invalid chains, and list the constraints each affected item is governed by. Never redirect a superseded dependency without the user's decision. |

An unknown role: list the roles above and use `default`.

## Partners

Other Spec Kit extensions a role may recommend **only when the project has them installed and enabled** (read `.specify/extensions/.registry`; recommend only commands listed under `registered_commands`). They are never required, installed or run without the user's approval (decisions D-2026-11-12-06, -07). When a partner is not installed, mention it once, with its install command.

| Role | Extension | Version checked | Catalog | Install | Requirements | Commands | Adds |
|---|---|---|---|---|---|---|---|
| `developer` | `bug` | 1.0.1 (catalog install, 2026-11-12); repository main 1.0.2 | default | `specify extension add bug` | Spec Kit >=0.9.0 | `speckit.bug.assess`, `speckit.bug.fix`, `speckit.bug.test` | Bug Triage: when reconcile finds a checked task whose work is reported broken, assess, fix and test it. |
| `qa` | `assure` | 2.7.5 | community (discovery only) | Review it first (not vetted by Spec Kit), then `specify extension add assure --from <archive URL from https://github.com/samykabu/sanduq>` | Spec Kit >=0.2.0; requires the `illustrate` extension and Python 3.11+ | `speckit.assure.init`, `speckit.assure.analyze`, `speckit.assure.document` | Assure: test-readiness analysis and a QA test manual as evidence before an item is recorded `verified`. |
| `architect` | `arch-governance` | 1.2.3 | community (discovery only) | Review it first (not vetted by Spec Kit), then `specify extension add arch-governance --from https://github.com/ashbrener/spec-kit-arch-governance/archive/refs/tags/v1.2.3.zip` | Spec Kit >=0.1.0 (declared). Its commands also run Python scripts with `uv` (Python 3.11+, pydantic, pyyaml) and call `git`; these are not declared in its manifest | `speckit.arch-governance.validate`, `speckit.arch-governance.gate`, `speckit.arch-governance.install`, `speckit.arch-governance.sync`, `speckit.arch-governance.repin`, `speckit.arch-governance.issues` | Architecture Governance: check that specs and plans still cite current ADRs (`validate`, read-only) after a dependency or supersession change, and check its implementation gate before an item is recorded `verified`. Its `install`, `sync`, `repin` and `issues` commands write files; propose them only with approval. |
