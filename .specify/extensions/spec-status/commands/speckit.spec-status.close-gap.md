---
description: "Explain why the recorded-verified share is low, item by item and cause by cause, then close the gap one approved change at a time, applied only through Spec Kit commands."
argument-hint: "[item ID to start from]"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

A low `recorded verified X/Y` has several different causes, and each needs a different next step. First show, read-only, why each active item is not recorded `verified`, grouped by cause, with evidence and the order to work in. Then, only if the user wants to continue, propose **one change at a time**, apply it only after the user approves that specific change, re-check with `spec status`, and move on. This command sequences the existing skills (reconcile, verify-readiness, unblock); it adds no new judgment.

## Operating Constraints

- Read `.specify/extensions/spec-status/reference/rules.md` first and follow it, including the approval protocol. Answer only from `spec status` output and `.specify/extensions/spec-status/reference/output.md`.
- **Read-only until a specific change is approved.** One proposal at a time; "yes" approves only that proposal. Changes are applied only through Spec Kit commands (`/speckit.roadmap.write`, `/speckit.roadmap.debrief`, `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`).
- **`verified` is a label, not proof.** Propose `verified` only for an item already recorded `implemented`, only after `/speckit.roadmap.debrief` reports no must-address finding, and only if the user then agrees. Never move any item straight to `verified`.
- Never redirect a dependency on a superseded item; route it to `/speckit.spec-status.unblock` for a human decision.
- `spec inventory` output is not roadmap evidence and is never used to change a status.
- Say "recorded verified", never "done". Do not infer dates or quarters.

## Outline

1. Run `spec version`. If it fails, stop and point to the install steps (`rules.md` item 15).
2. Run `spec status --json` and `spec status --color=never --explain`. Exit `2`: report the diagnostic and stop (for `SS_ROADMAP_UNAVAILABLE` you may mention that `spec inventory` lists feature folders, as information only). Check `schema_version`.
3. Classify every **active** item that is not recorded `verified` into exactly **one** cause, checking in this order and taking the first that matches (older `spec` builds without the v0.3.0 codes: use the fallback in brackets):
   1. **unknown status**: `status_known` is false (`SS_STATUS_UNKNOWN`).
   2. **missing artifacts**: an **error** `SS_STAGE_FILE_MISSING`, `SS_SPEC_REFERENCE_MISSING` or `SS_SPEC_DIRECTORY_MISSING` for the item.
   3. **status ahead of tasks**: `SS_STATUS_AHEAD_OF_TASKS` [status `implemented`/`verified`, `tasks.state` `read`, `checked` < `total`].
   4. **tasks done, status early**: `SS_TASKS_DONE_STATUS_EARLY` [status before `implemented`, `tasks.state` `read`, `total` > 0, `checked` = `total`].
   5. **blocked**: any dependency whose `state` is not `satisfied`. A dependency is satisfied only by a recorded `verified` item, so a blocked item cannot honestly be recorded `verified` yet, whatever its own evidence. Causes 1–4 are checked before this one on purpose: they are fixed in the item's own status or files, whatever its dependencies, so an item with every task checked and an unverified dependency is still "tasks done, status early" (advancing it to `implemented` is honest); a dependency only stops an item from being recorded `verified`.
   6. **ready for debrief**: status `implemented`, `tasks.state` `read`, `checked` = `total` > 0, every dependency satisfied, and no error diagnostic for the item.
   Not part of the gap (report them apart): **not started** (`planned`, `undecided` or `needs-info` with none of the above) and **in progress** (anything else, such as `specced` or `in-progress` with partial tasks and no recorded inconsistency).
4. Report, before any proposal:
   - `recorded verified X/Y` exactly as `spec status` prints it;
   - each cause with its items, citing item ID, the item's heading `path:line`, and the code or field that shows the cause (with the diagnostic's own `path:line` when it points elsewhere, such as a field line);
   - the items outside the gap, and why;
   - the **order of work**: ready for debrief; tasks done, status early; status ahead of tasks; missing artifacts; unknown status; blocked (a blocked item comes after its blocking dependency has been handled or skipped). Within a cause, roadmap order.
   If nothing is in the gap, say so and stop. If the user asked only for the breakdown, stop here. Otherwise ask whether to work through the gap one approved change at a time, and continue only on a yes.
5. Take the first item in the order (or the item named in `$ARGUMENTS`) and propose **one** change, showing the item, cause, evidence, the exact change, the command, and what will be re-checked:
   - ready for debrief: two separate proposals. First, run `/speckit.roadmap.debrief` for the item (it writes only its review report and changes no status; report its verdict instead of a re-check). Only if it reports no must-address finding, make a second proposal: record `verified` via `/speckit.roadmap.write`, which needs its own yes.
   - tasks done, status early: first ask the user to confirm the work is really done; that answer is not approval of a change. `implemented` needs spec, plan and tasks (C-07): if `spec status` does not show all three for the item (for a `planned` item it does not check them), say which may be missing and propose creating it first. Otherwise propose advancing to `implemented` (never `verified`) via `/speckit.roadmap.write`, which needs its own yes.
   - status ahead of tasks: ask which is true: the work is unfinished (lower the status, usually to `in-progress`, via `/speckit.roadmap.write`) or the boxes are stale (finish or tick the tasks via `/speckit-implement`). Do not choose for the user.
   - missing artifacts: create the first missing artifact (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`) or correct the status via `/speckit.roadmap.write`; ask which.
   - unknown status: list the nine known statuses and ask which one the evidence supports (never `verified`); apply via `/speckit.roadmap.write`.
   - blocked: work on the blocking dependency's own cause first; a dependency on a superseded item goes to `/speckit.spec-status.unblock` and is never redirected. If the blocking dependency was skipped or is still not recorded `verified`, say the item stays blocked and why, propose nothing for it, and move on.
   Then wait.
6. On an explicit yes: apply only through the named command (if the roadmap extension is missing, show the exact manual edit instead). After a status change, run `spec status --json` again and report **confirmed** (the re-read shows the change) or **not confirmed**, and the new `recorded verified X/Y`. Then go to step 5 with the next item (or the second proposal for the same item). On "no" or "skip": leave the proposal unapplied and go to the next item. On "stop" or no answer: stop.
7. Finish with a summary: recorded verified before and after (if nothing was applied, say it is unchanged; no re-run is needed), proposals made, applied, confirmed, declined or skipped, and what is left in the gap.

## Follow-ups

- `/speckit.spec-status.reconcile`: the full list of status/task mismatches, outside the guided order.
- `/speckit.spec-status.verify-readiness`: the evidence check for one implemented item before a debrief.
- `/speckit.spec-status.unblock`: blockers and human-review dependencies in the order to clear them.
- `/speckit.roadmap.debrief`: check an implemented spec against its roadmap entry before anything is recorded `verified`.
- `/speckit.roadmap.write`: apply an approved status change.
- `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`: create a missing spec, plan or task list.
- `/speckit-implement`: finish unchecked tasks.
