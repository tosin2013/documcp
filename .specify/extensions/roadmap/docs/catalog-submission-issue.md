<!-- Body for the github/spec-kit Extension Submission issue.
     Title: [Extension]: Add Spec Roadmap
     Template fields are filled inline below as they appear in the form. -->

### Extension ID
roadmap

### Extension Name
Spec Roadmap

### Version
0.1.0

### Description
Capture a durable spec roadmap after the constitution, then review specs against it before and after implementation so spec-specific decisions, outcomes, and constraints are never lost.

### Author
srobroek

### Repository URL
https://github.com/srobroek/speckit-roadmap

### Download URL
https://github.com/srobroek/speckit-roadmap/archive/refs/tags/v0.1.0.zip

### License
Apache-2.0

### Homepage (optional)
https://github.com/srobroek/speckit-roadmap

### Documentation URL (optional)
https://github.com/srobroek/speckit-roadmap/blob/main/README.md

### Changelog URL (optional)
https://github.com/srobroek/speckit-roadmap/blob/main/CHANGELOG.md

### Required Spec Kit Version
>=0.11.6

### Required Tools (optional)
- PowerShell 7+ (pwsh) — only for running the extension's own test suite on Windows; not required to use the extension.

### Number of Commands
4

### Number of Hooks (optional)
3

### Tags
roadmap, planning, governance, review, spec-alignment

### Key Features
- `speckit.roadmap.write` (hook: after_constitution) — create or amend a versioned roadmap; harvests the constitution, ADRs, PRDs, the session, and prior notes; elicits gaps; non-destructive with a Sync Impact Report changelog.
- `speckit.roadmap.brief` (hook: before_implement) — read-only pre-implementation review surfacing the roadmap's recorded outcome/scope/decisions/dependencies for the active spec and flagging drift.
- `speckit.roadmap.debrief` (hook: after_implement) — read-only post-implementation review classifying drift (outcome-miss / scope-creep / constraint-violation / roadmap-stale) and proposing a `verified` status.
- `speckit.roadmap.sync` (on demand) — read-only reconciliation of the whole roadmap ledger against the specs on disk (orphans, phantom entries, status drift, dependency contradictions).
- Deterministic `load-config` script (bash + PowerShell) with a stable JSON contract, covered by Bats + Pester and a cross-platform parity test (CI on Linux, macOS, Windows).

### Testing Checklist
- [x] Extension installs successfully via download URL
- [x] All commands execute without errors
- [x] Documentation is complete and accurate
- [x] No security vulnerabilities identified
- [x] Tested on at least one real project

### Submission Requirements
- [x] Valid `extension.yml` manifest included
- [x] README.md with installation and usage instructions
- [x] LICENSE file included
- [x] GitHub release created with version tag
- [x] All command files exist and are properly formatted
- [x] Extension ID follows naming conventions (lowercase-with-hyphens)

### Testing Details
**Tested on:**
- macOS (bash 3.2 + PowerShell 7) with Spec Kit v0.11.6
- CI: Ubuntu (Bats), macOS (Bats), Windows (Pester) — all green

**Test project:** the extension's own repository (https://github.com/srobroek/speckit-roadmap) — it was built through the spec-kit workflow and dogfooded on itself (see `specs/` and `.specify/memory/roadmap.md`).

**Automated tests:** the deterministic `load-config` script is covered by 35 Bats tests, 53 Pester tests, and an 8-case cross-platform JSON parity suite (bash output == PowerShell output across all fixtures), run on Linux, macOS, and Windows in CI.

**Test scenarios:**
1. Installed via the release download URL (`specify extension add --from …/v0.1.0.zip`); all four commands register and their hooks fire at `after_constitution`, `before_implement`, `after_implement`.
2. Ran `speckit.roadmap.write` to create and later amend the roadmap (versioned, non-destructive, Sync Impact Report changelog).
3. Ran `speckit.roadmap.brief`/`debrief`/`sync` and verified each is strictly read-only (roadmap file unchanged before/after each run) and emits a report.
4. Verified the invalid-config path fails closed and the bash/PowerShell config outputs are byte-equal under normalized JSON.

### Example Usage
```bash
# Install from the community catalog by name:
specify extension add roadmap
specify extension enable roadmap

# After /speckit.constitution — capture the roadmap:
/speckit.roadmap.write

# Before /speckit.implement — see what the roadmap expects for this spec (read-only):
/speckit.roadmap.brief

# After /speckit.implement — check the build against the roadmap (read-only):
/speckit.roadmap.debrief

# Anytime — reconcile the whole roadmap against specs on disk (read-only):
/speckit.roadmap.sync
```

### Proposed Catalog Entry
```json
{
  "roadmap": {
    "name": "Spec Roadmap",
    "id": "roadmap",
    "description": "Capture a durable spec roadmap after the constitution, then review specs against it before and after implementation so spec-specific decisions, outcomes, and constraints are never lost.",
    "author": "srobroek",
    "version": "0.1.0",
    "download_url": "https://github.com/srobroek/speckit-roadmap/archive/refs/tags/v0.1.0.zip",
    "repository": "https://github.com/srobroek/speckit-roadmap",
    "homepage": "https://github.com/srobroek/speckit-roadmap",
    "documentation": "https://github.com/srobroek/speckit-roadmap/blob/main/README.md",
    "changelog": "https://github.com/srobroek/speckit-roadmap/blob/main/CHANGELOG.md",
    "license": "Apache-2.0",
    "requires": {
      "speckit_version": ">=0.11.6"
    },
    "provides": {
      "commands": 4,
      "hooks": 3
    },
    "tags": ["roadmap", "planning", "governance", "review", "spec-alignment"],
    "verified": false,
    "downloads": 0,
    "stars": 0,
    "created_at": "2026-06-24T00:00:00Z",
    "updated_at": "2026-06-24T00:00:00Z"
  }
}
```

### Additional Context
Built and maintained through spec-kit's own workflow (constitution → roadmap → specify → plan → tasks → implement), with release-please managing versioned GitHub Releases (the `download_url` above is a release-please-published release). Requires Spec Kit `>=0.11.6` because it uses the extension hook keys and `check-prerequisites --json` behavior from the 0.11.x line.
