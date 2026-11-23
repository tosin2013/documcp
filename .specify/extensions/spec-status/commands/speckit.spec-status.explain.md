---
description: "Explain any spec status diagnostic code: what it means, how serious it is, its usual cause, and the command that fixes it."
argument-hint: "[SS_CODE | item ID]"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Turn a finding into understanding and a next step. For a code (or every code reported for an item), give the meaning, severity, when it is fatal, the usual cause in a Spec Kit project, and the command that fixes it, using the project's own occurrences as examples.

## Operating Constraints

- Read `.specify/extensions/spec-status/reference/rules.md` first and follow it. Answer only from `.specify/extensions/spec-status/reference/output.md` and the actual `spec status` output; never invent a code or a meaning.
- **Read-only.** Explaining changes nothing. Fixes are suggested with their command; they are applied only through that command after approval.

## Outline

1. Run `spec version`. If it fails, stop and point to the install steps (`rules.md` item 15).
2. Run `spec status --json` and `spec status --color=never --explain` (exit `2` still reports a diagnostic: explain it).
3. Decide what to explain from `$ARGUMENTS`: an `SS_*` code; an item ID (explain every code reported for it); or nothing (explain each distinct code in the current output, most severe first).
4. For each code, look it up in `output.md` "Diagnostic codes" and give: severity and when it is fatal; meaning; the usual cause; the fix and the command that applies it; and this project's occurrences (item, `path:line`).
5. `SS_CONFIG_INVALID` is reserved and never emitted today; say so if asked.
6. A code not in `output.md` (for example from a newer `spec`): say it is unknown to this extension version, quote the message, and suggest checking `schema_version` and updating the extension.
7. If the finding looks like a defect in `spec` itself (a crash, a count or exit code you can show is wrong, a false warning on a template-shaped roadmap), say so and follow `rules.md` items 13 and 14 (issue form; security issues go to private reporting).

## Follow-ups

- `/speckit.spec-status.reconcile`: the finding is a status that disagrees with tasks or files.
- `/speckit.spec-status.unblock`: the finding is a dependency or supersession problem.
- `/speckit.roadmap.write`: the fix is a roadmap edit (after approval).
- `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`: the fix is a missing spec, plan or task list.
