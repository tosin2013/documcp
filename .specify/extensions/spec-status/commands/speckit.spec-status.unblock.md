---
description: "List blocked roadmap items and dependencies on superseded items in the order to clear them, and say what each needs; dependency edits only through Spec Kit commands after approval."
argument-hint: "[item ID]"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Show what stands between blocked work and progress, earliest first: every unsatisfied dependency, what it needs to become `verified`, and every dependency on a superseded item that needs a human decision. Broken dependencies (missing, ambiguous, self, cycle) are named with the exact line and a proposed fix.

## Operating Constraints

- Read `.specify/extensions/spec-status/reference/rules.md` first and follow it. Dependency states are in `.specify/extensions/spec-status/reference/output.md`.
- **Writes:** only dependency or supersession edits, only after the user approves each one, only through `/speckit.roadmap.write`, then confirmed by re-running `spec status`.
- Never redirect a dependency on a superseded item to its successor without the user's decision (`rules.md` item 9).

## Outline

1. Run `spec version`. If it fails, stop and point to the install steps (`rules.md` item 15).
2. Run `spec status --json` and `spec status --color=never --explain`. Exit `2`: report and stop.
3. Collect every dependency whose `state` is not `satisfied` (all active items, or the item in `$ARGUMENTS` and its chain).
4. Order the work so that items depended on come before items that depend on them (follow `dependencies[].id`); report cycles separately. For each step give: the item, its recorded status, `path:line`, which items it unblocks, and what it needs to reach `verified` (for example "write the spec", "finish 2 tasks", "record verified after review").
5. `human_review` (dependency on a superseded item): explain that `spec` never redirects it; name the successor (`superseded_by` of the target); ask the user whether the dependent should depend on the successor instead. Only after a yes: change the dependent's `Depends on` via `/speckit.roadmap.write`, re-run `spec status`, report confirmed or unconfirmed.
6. `missing`, `ambiguous`, `self`, `cycle`: name the field and line from `--explain`, explain it (`output.md`), and propose the smallest fix (remove or correct the reference; for a cycle, the user chooses which edge to remove). Apply only after approval via `/speckit.roadmap.write`.
7. Finish with the first action: the first unfinished item to work on and its command. If every blocked item is part of a cycle, the first action is breaking the cycle (step 6).

## Follow-ups

- `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`: do the work on the first unfinished dependency.
- `/speckit.spec-status.verify-readiness`: check whether a dependency is ready to be recorded `verified`.
- `/speckit.spec-status.reconcile`: a dependency's recorded status disagrees with its tasks.
- `/speckit.roadmap.write`: apply an approved dependency or supersession edit.
