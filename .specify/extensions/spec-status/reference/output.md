# Output reference

The vocabulary every spec-status command uses to read `spec status` output. A repository test (`internal/extension`) keeps this file identical to the contracts in `specs/001-spec-status/diagnostics.md` and `json-contract.md`. **Fix** names the command that usually resolves the finding; any change still needs the user's approval (`rules.md`).

## Diagnostic codes

| Code | Severity | Fatal when | Meaning | Typical cause | Fix |
|---|---|---|---|---|---|
| `SS_INVOCATION_INVALID` | error, fatal | always | A flag, value or command could not be used. | A typo in a flag, a repeated flag, or an unsupported combination. | Fix the command line; see `spec status --help`. |
| `SS_CONFIG_INVALID` | error, fatal | always | Reserved, never emitted: there is no config file. | None today. | None needed. |
| `SS_ROOT_UNAVAILABLE` | error, fatal | always | No project root (a folder with `.specify`) could be used. | Running outside a Spec Kit project, or a wrong `--root`. | Run inside the project or pass `--root`. |
| `SS_ROADMAP_UNAVAILABLE` | error, fatal | always | The roadmap file is missing or unreadable. When missing, the message suggests `spec inventory`. | No roadmap yet (Spec Kit without the roadmap extension), or a wrong `--roadmap`. | Run `spec inventory` for a feature list without a roadmap; or create the roadmap with `/speckit.roadmap.write` (with the user's approval), or point `--roadmap` at it. |
| `SS_ROADMAP_UNRECOGNIZED` | error, fatal | always | The roadmap file is readable but is not a recognized roadmap: no item headings and no `## Planned Specs` heading. Since v0.3.0; it used to report zero items with exit 0. | A hand-written narrative roadmap, an empty file, or a different template. | Rewrite it in the supported template with `/speckit.roadmap.write` (with the user's approval), or run `spec inventory` for a feature list. |
| `SS_SPECS_DIRECTORY_MISSING` | info, report | never | `spec inventory` only: there is no `specs/` folder, so there are no feature folders. | A new project with no specs yet, or the wrong `--root`. | Create the first feature with `/speckit-specify`, or pass `--root`. |
| `SS_FOLDER_NOT_FEATURE` | info, report | never | `spec inventory` only: a folder under `specs/` is not named like a Spec Kit feature folder (`NNN-name` or `YYYYMMDD-HHMMSS-name`). | Notes or asset folders kept under `specs/`. | None needed, or move the folder out of `specs/`. |
| `SS_ENCODING_INVALID` | error, fatal | always | A required file is not valid UTF-8. | A file saved in another encoding. | Re-save the file as UTF-8. |
| `SS_LAYOUT_UNSUPPORTED` | error, fatal if inventory unreliable | when the item inventory would be unreliable | Item-like content in a layout `spec` will not guess at (for example a table of items). | Hand-edited roadmap structure outside the supported shapes. | Rewrite the items as `### NNN — Title [status: …]` headings with `- Field:` bullets, via `/speckit.roadmap.write`. |
| `SS_ITEM_MALFORMED` | error, fatal if inventory unreliable | when the item inventory would be unreliable | An item heading or field line is broken, or a metric label sits outside an accepted field line. | A typo in a heading or field, a misplaced `Depends on:` label. | Fix the line named in the diagnostic, via `/speckit.roadmap.write`. |
| `SS_DUPLICATE_ID` | error, report | never | Two items share an ID. | Copy-paste of an item. | Renumber one item, via `/speckit.roadmap.write`. |
| `SS_STATUS_UNKNOWN` | warning, report | never | A status word is not one of the nine known statuses. | A typo or a custom word such as `done`. | Pick the intended known status (see Status tokens), via `/speckit.roadmap.write`; `/speckit.spec-status.reconcile` proposes one. |
| `SS_DEPENDENCY_MALFORMED` | error, report | never | A `Depends on` value is not a list of three-digit IDs. | Free text, an annotation with a comma, or markup in the list. | Rewrite the list as `001, 002`, via `/speckit.roadmap.write`. |
| `SS_DEPENDENCY_MISSING` | error, report | never | A dependency names an ID that is not on the roadmap. | A deleted or renumbered item. | Fix or remove the reference, via `/speckit.roadmap.write`; see `/speckit.spec-status.unblock`. |
| `SS_DEPENDENCY_AMBIGUOUS` | error, report | never | A dependency names an ID that appears more than once. | Duplicate IDs. | Resolve the duplicate ID first, via `/speckit.roadmap.write`. |
| `SS_DEPENDENCY_SELF` | error, report | never | An item depends on itself. | A typo in `Depends on`. | Remove the self-reference, via `/speckit.roadmap.write`. |
| `SS_DEPENDENCY_CYCLE` | error, report | never | Dependencies form a cycle. | Two items each waiting on the other. | Break the cycle by removing one edge, via `/speckit.roadmap.write`; see `/speckit.spec-status.unblock`. |
| `SS_DEPENDENCY_BLOCKED` | warning, report | never | A dependency is not recorded `verified`. | Normal: the depended-on work is unfinished. | Finish and verify the dependency; see `/speckit.spec-status.unblock`. |
| `SS_DEPENDENCY_HUMAN_REVIEW` | warning, report | never | A dependency points at a superseded item; `spec` never redirects it. | The depended-on item was replaced. | The user decides whether to point at the successor; apply via `/speckit.roadmap.write`. See `/speckit.spec-status.unblock`. |
| `SS_VERIFIED_DEPENDENCY_CONTRADICTION` | error, report | never | An item is recorded `verified` while a dependency is not satisfied. | Status recorded too early, or the dependency's status is stale. | See `/speckit.spec-status.reconcile` and `/speckit.spec-status.unblock`. |
| `SS_SUPERSESSION_MALFORMED` | error, report | never | A `superseded-by` value is not a single ID. | Several IDs or free text. | Use one ID, via `/speckit.roadmap.write`. |
| `SS_SUPERSESSION_MISSING` | error, report | never | `superseded-by` names a missing item. | The successor was never added or was renumbered. | Add or fix the successor, via `/speckit.roadmap.write`. |
| `SS_SUPERSESSION_AMBIGUOUS` | error, report | never | `superseded-by` names a duplicated ID. | Duplicate IDs. | Resolve the duplicate, via `/speckit.roadmap.write`. |
| `SS_SUPERSESSION_SELF` | error, report | never | An item is superseded by itself. | A typo. | Fix the ID, via `/speckit.roadmap.write`. |
| `SS_SUPERSESSION_CYCLE` | error, report | never | Supersession forms a cycle. | Two items replacing each other. | Break the cycle, via `/speckit.roadmap.write`. |
| `SS_SUPERSESSION_CHAIN_INVALID` | error, report | never | A supersession edge leads into an invalid chain. | A problem further down the chain. | Fix the first invalid link in the chain (see the related diagnostic). |
| `SS_SPEC_REFERENCE_MISSING` | info for planned; error for specced/later | never | An item has no `Spec dir` (info when planned, error from specced on). | The spec was never written or never linked. | Write the spec with `/speckit-specify`, then add `Spec dir` via `/speckit.roadmap.write`; or correct the status. |
| `SS_SPEC_DIRECTORY_MISSING` | error, report | never | The linked spec directory does not exist. | A renamed or deleted spec folder. | Fix `Spec dir` via `/speckit.roadmap.write`, or create the spec with `/speckit-specify`. |
| `SS_STAGE_FILE_MISSING` | error under the stage matrix | never | The stage requires spec.md, plan.md or tasks.md and one is missing. | The status advanced past the work actually done. | Create the file (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`) or correct the status; see `/speckit.spec-status.reconcile`. |
| `SS_TASK_TARGET_MISSING` | error if checked, info if unchecked | never | A task links to a local file that does not exist (error if the box is checked). | The file moved, or the work was never done. | Restore the target or fix the link; see `/speckit.spec-status.reconcile`. |
| `SS_STATUS_AHEAD_OF_TASKS` | warning, report | never | An active item is recorded `implemented` or `verified`, but its linked tasks file has unchecked tasks. `related` points at the first unchecked box. Since v0.3.0. | The work is unfinished, or the boxes were never ticked. | Ask which is true, then lower the status via `/speckit.roadmap.write` or finish or tick the tasks via `/speckit-implement`; `/speckit.spec-status.reconcile` walks through it. |
| `SS_TASKS_DONE_STATUS_EARLY` | info, report | never | Every task in the linked tasks file is checked, but the item's status is still before `implemented`. Since v0.3.0. | The roadmap was not updated after the work was finished. | After the user confirms the work is done, advance the status to `implemented` (never `verified`) via `/speckit.roadmap.write`; `/speckit.spec-status.reconcile` walks through it. |
| `SS_FIELD_PLACEHOLDER` | info, report | never | A `Spec dir` or `Depends on` field still holds a template placeholder (for example `[specs/001-.../ — set once the spec exists; otherwise omit]`), so it is treated as not set. Since v0.3.0. | The entry was copied from the speckit-roadmap template and not filled in yet. | Fill in the real value or remove the line via `/speckit.roadmap.write` (with the user's approval); create the spec first with `/speckit-specify` if needed. |
| `SS_DEPENDENCY_DUPLICATE` | warning, report | never | A `Depends on` list names the same item more than once; it is counted once. Since v0.3.0. | A typo or a merge that repeated an ID. | Remove the repeat via `/speckit.roadmap.write` (with the user's approval). |
| `SS_REFERENCE_UNSUPPORTED` | warning, report unless required parse fatal | only if a required parse fails | A link form `spec` does not check (URL, reference-style, autolink). | Normal for web links; not checked. | Usually nothing; use a simple local link if it should be checked. |
| `SS_PATH_UNSAFE` | error; fatal for required source | for a required source | A path escapes the root, uses a symlink, or is not a regular file. | A symlinked folder or a `..` path. | Use a plain path inside the project. |
| `SS_REFERENCE_SENSITIVE_SKIPPED` | error, report; fatal if required source | for a required source | A reference names a sensitive file (for example `.env`, `*.key`), which is never opened. | Linking a secrets file from a task. | Remove the link; never link secrets. |
| `SS_INPUT_LIMIT` | error, fatal on required input/work | always | A fixed size or count limit was exceeded. | A very large roadmap or tasks file. | Split the content; limits are fixed by design. |
| `SS_SOURCE_CHANGED` | error, fatal | always | A file changed while it was being read. | An editor or tool writing at the same time. | Run `spec status` again. |

## JSON fields

`spec status --json` prints one document, schema `1.0`. Check `schema_version` first.

**Root:** `schema_version`, `outcome` (`report` or `fatal`), `complete`, `source` (`roadmap`, `input_format`), `configuration` (`fail_on`, `dependency_policy`, `task_scope`), `summary`, `items`, `diagnostics`, `error` (`code`, `message`, `source`; null on a report).

**Summary:** `total_items`, `status_counts`, `active_items`, `verified_active_items`, `verified_percent`, `superseded_items`, `invalid_supersession_items`, `blocked_count`, `human_review_count`, `tasks` (`checked`, `total`, `percent`, `scope`, `files_read`, `files_missing`, `files_skipped`).

**Item:** `id`, `title`, `status`, `status_known`, `source` (`path`, `line`), `active`, `description`, `outcome`, `scope`, `spec_dir`, `superseded_by`, `supersession` (`supplied`, `raw_reference`, `valid`, `terminal_id`), `dependencies`, `tasks` (`checked`, `total`, `percent`, `source`, `state`).

**Dependency** (each entry of `dependencies`): `id`, `satisfied`, `state`, `replacement_id`, `source`.

**Diagnostic:** `code`, `severity` (`info`, `warning`, `error`), `message`, `source` (`path`, `line`), `item_id`, `related`.

A complete report with `total_items: 0` means an explicitly empty roadmap (the `## Planned Specs` heading with no items).

`spec inventory --json` prints a separate document, `inventory_schema_version` `1.0` (`specs/001-spec-status/inventory-json.md`): `mode`, `source` (`specs_dir`, `specs_state`, `roadmap_file`), `summary` (`feature_folders`, `other_folders`, `skipped_entries`, `tasks`), and `folders` (`name`, `path`, `feature`, `name_form`, `skipped`, `spec`, `plan`, `tasks`). Inventory never reports a status, so the skills must not treat it as roadmap evidence.

Use `spec status --color=never --explain` for file:line on each row; the JSON `source` fields carry the same locations.

## Dependency states

| State | Meaning for the skills |
|---|---|
| `satisfied` | The dependency is recorded `verified`. Nothing to do. |
| `unfinished` | The dependency exists but is not `verified`; the dependent is blocked. See unblock. |
| `missing` | The ID is not on the roadmap (`SS_DEPENDENCY_MISSING`). |
| `ambiguous` | The ID appears more than once (`SS_DEPENDENCY_AMBIGUOUS`). |
| `self` | The item depends on itself (`SS_DEPENDENCY_SELF`). |
| `cycle` | Part of a dependency cycle (`SS_DEPENDENCY_CYCLE`). |
| `human_review` | Points at a superseded item; never redirected automatically (`SS_DEPENDENCY_HUMAN_REVIEW`). |

## Task states

| State | Meaning |
|---|---|
| `read` | The linked `tasks.md` was read; `checked`/`total` are real counts. |
| `missing` | The item links a spec directory, but that directory or its `tasks.md` is absent. |
| `skipped` | A tasks file was not read (unsafe, sensitive or unsupported); counts are null. |
| `not_linked` | The item has no `Spec dir`, so there is no task file. |

## Status tokens

In lifecycle order. Any other word is kept as written and reported as `SS_STATUS_UNKNOWN`.

| Status | Means |
|---|---|
| `undecided` | Not yet decided whether to do it. |
| `needs-info` | Waiting on information or a decision. |
| `planned` | Agreed, not yet specified. No spec link required. |
| `specced` | A spec exists; `Spec dir` and `spec.md` required. |
| `in-progress` | Being built; spec, plan and tasks required. |
| `implemented` | Built; not yet verified. |
| `verified` | Recorded as verified. A label, not proof. |
| `deferred` | Postponed; historical, not active. |
| `abandoned` | Dropped; historical, not active. |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No finding reached the `--fail-on` threshold. Not "done". |
| `1` | A finding reached the threshold. |
| `2` | The command, root or roadmap could not be evaluated. Stop and report. |
