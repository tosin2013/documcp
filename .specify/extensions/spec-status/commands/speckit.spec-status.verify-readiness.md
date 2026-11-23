---
description: "Before recording a roadmap item verified, list the evidence still missing: unchecked tasks, unread task files, unverified dependencies, error diagnostics, missing spec files. Never records a status."
argument-hint: "[item ID]"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Prevent over-claiming. For an item about to be recorded `verified` (or every item recorded `implemented`), check that the record is consistent and list what is still missing. A consistent record is necessary, not sufficient: independent evidence (the debrief, tests, review) remains the user's call.

## Operating Constraints

- Read `.specify/extensions/spec-status/reference/rules.md` first and follow it.
- **Read-only.** This command never records a status. Recording `verified` is done by the user through `/speckit.roadmap.write`, after approval.

## Outline

1. Run `spec version`. If it fails, stop and point to the install steps (`rules.md` item 15).
2. Run `spec status --json` and `spec status --color=never --explain`. Exit `2`: report and stop.
3. Select the item in `$ARGUMENTS`; otherwise every active item recorded `implemented` (and any recorded `verified` that the user asks about).
4. For each, check and cite `path:line`:
   - tasks: `tasks.state` is `read` and `checked` = `total` (and `total` > 0);
   - dependencies: every entry `state` `satisfied`;
   - diagnostics: no `error` diagnostic with this `item_id`;
   - artifacts: spec link present and no `SS_STAGE_FILE_MISSING`, `SS_SPEC_DIRECTORY_MISSING` or `SS_SPEC_REFERENCE_MISSING` for the item.
5. Report each item as **consistent** or **not consistent**, listing every gap with the command that closes it.
6. For a consistent item, say plainly: the record is consistent, but `verified` is a label, not proof. Suggest `/speckit.roadmap.debrief` to check the implementation against the roadmap entry, and only if the user then agrees, recording `verified` via `/speckit.roadmap.write`.

## Follow-ups

- `/speckit.roadmap.debrief`: check the implemented spec against its roadmap entry before recording `verified`.
- `/speckit-analyze`: check spec, plan and tasks for consistency.
- `/speckit.roadmap.write`: record the status, if the user decides to.
- `/speckit.spec-status.reconcile`: a gap is a status or task mismatch.
- `/speckit.spec-status.unblock`: a gap is an unverified dependency.
