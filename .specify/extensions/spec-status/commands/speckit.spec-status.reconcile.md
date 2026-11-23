---
description: "Find roadmap items whose recorded status disagrees with their tasks, files or dependencies, and propose one correction at a time, applied only through a Spec Kit command after approval."
argument-hint: "[item ID]"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Bring the record back into agreement with itself. For each mismatch between an item's recorded status and its tasks, spec files or dependencies, show the evidence, say which side is likely wrong, and propose one correction with the command that applies it. Nothing changes until the user approves that correction; afterwards `spec status` is run again to confirm.

## Operating Constraints

- Read `.specify/extensions/spec-status/reference/rules.md` first and follow it, especially the approval protocol. Field meanings are in `.specify/extensions/spec-status/reference/output.md`.
- **Writes:** only after the user approves the specific change, only through the named command, then confirmed by re-running `spec status`. One proposal at a time.
- Never move a status straight to `verified`; that is the user's call after `/speckit.spec-status.verify-readiness` and `/speckit.roadmap.debrief`.
- Skip superseded items (`superseded_by` set): they are history. When several items share one tasks file, report it once.

## Outline

1. Run `spec version`. If it fails, stop and point to the install steps (`rules.md` item 15).
2. Run `spec status --json` and `spec status --color=never --explain`. Exit `2`: report and stop. Check `schema_version`.
3. If `$ARGUMENTS` names an item, check only that item; otherwise check every active item.
4. Detect these mismatch kinds, citing `path:line`:
   - **tasks-done-status-early**: `tasks.state` `read`, `checked` = `total` > 0, status `undecided`, `needs-info`, `planned`, `specced` or `in-progress` (an active item). `spec` v0.3.0 and later reports it as `SS_TASKS_DONE_STATUS_EARLY`; with an older `spec`, derive it from the counts. Propose advancing to `implemented` (never `verified`) via `/speckit.roadmap.write`, after the user confirms the work is really done.
   - **status-ahead-of-tasks**: status `implemented` or `verified` with `checked` < `total` (an active item). `spec` v0.3.0 and later reports it as `SS_STATUS_AHEAD_OF_TASKS`; with an older `spec`, derive it from the counts. Ask which is true: the work is unfinished (propose lowering the status, usually to `in-progress`, via `/speckit.roadmap.write`) or the boxes are stale (finish or tick the tasks via `/speckit-implement`; edit task boxes only with approval).
   - **status-ahead-of-artifacts**: status `implemented` or `verified` with `tasks.state` `missing` or `not_linked`, or `SS_STAGE_FILE_MISSING`, `SS_SPEC_REFERENCE_MISSING` or `SS_SPEC_DIRECTORY_MISSING` on the item. Propose creating the missing artifact (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`) or correcting the status via `/speckit.roadmap.write`; ask which.
   - **verified-dependency-unverified**: `SS_VERIFIED_DEPENDENCY_CONTRADICTION`. Offer `/speckit.spec-status.unblock` for the dependency, or lowering the item to `implemented` via `/speckit.roadmap.write`; ask which.
   - **unknown-status**: `SS_STATUS_UNKNOWN`. List the nine known statuses (`output.md`). Suggest the highest status the **evidence** supports, never `verified`. A status from `specced` on needs a `Spec dir`; from `in-progress` on it needs spec, plan and tasks (C-07). If the word implies more than the evidence supports (for example `done` on an item with no `Spec dir`), say what is missing for that status and ask the user. Never assume. Apply via `/speckit.roadmap.write`.
   - **checked-target-missing**: `SS_TASK_TARGET_MISSING` with severity `error` (a checked task whose linked file is missing). Offer three options: restore the file by doing the work (`/speckit-implement`); fix the link; or, if the work was not done, uncheck the task. The last two are manual edits to `tasks.md` (show file, line, before and after; no Spec Kit command exists for them), made only after approval (`rules.md` approval protocol, step 3).
5. Present the mismatches as a numbered list (kind, item, evidence). Then take them **one at a time**: show the proposal (item, evidence, exact change, command) and wait for an explicit yes.
6. On a yes: apply through the named command. If the roadmap extension is not installed (`/speckit.roadmap.write` unavailable), show the exact manual edit instead. Then run `spec status` again and report **confirmed** or **unconfirmed**. On no: leave it as **proposed** and move on.
7. Finish with a one-line tally: found, proposed, applied, confirmed.

## Follow-ups

- `/speckit.roadmap.write`: apply an approved status, dependency or supersession change.
- `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`: create a missing spec, plan or task list.
- `/speckit-implement`: finish unchecked tasks.
- `/speckit.spec-status.unblock`: an unverified dependency blocks a recorded status.
- `/speckit.spec-status.verify-readiness`: before anything is recorded `verified`.
- `/speckit.roadmap.debrief`: check an implemented spec against its roadmap entry.
