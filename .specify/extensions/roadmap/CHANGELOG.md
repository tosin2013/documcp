# Changelog

All notable changes to this extension are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). This file is managed by
release-please from Conventional Commits.

## [0.1.1](https://github.com/srobroek/speckit-roadmap/compare/v0.1.0...v0.1.1) (2026-09-11)


### Bug Fixes

* use valid script slugs for Specify 1.0 ([#6](https://github.com/srobroek/speckit-roadmap/issues/6)) ([bb904d9](https://github.com/srobroek/speckit-roadmap/commit/bb904d9b189fb9ce4920cf36e3d7cae6ffbc94b6))

## 0.1.0 (2026-06-24)

Initial release — a GitHub Spec Kit extension that adds a durable spec roadmap to the
workflow: written after the constitution, reviewed before and after each spec, and
reconciled on demand.

### Features

* initial release of speckit-roadmap extension (0.1.0) ([deb9126](https://github.com/srobroek/speckit-roadmap/commit/deb9126c2b726aa0fba61367dddf8ca20df1a3d7))
  * **`speckit.roadmap.write`** (hook: `after_constitution`) — create or amend the roadmap; harvests the constitution, ADRs, PRDs, the session, and prior notes; elicits gaps; non-destructive, with a Sync Impact Report changelog.
  * **`speckit.roadmap.brief`** (hook: `before_implement`) — read-only pre-implementation review of the spec against its roadmap entry.
  * **`speckit.roadmap.debrief`** (hook: `after_implement`) — read-only post-implementation review; classifies drift; proposes `verified`.
  * **`speckit.roadmap.sync`** (on demand) — read-only ledger↔disk reconciliation.
  * **`load-config`** (bash + PowerShell) — deterministic config resolver with Bats/Pester tests and a cross-platform JSON parity proof.

### Bug Fixes

* Windows-safe temp dir in Pester suite; split CI into parallel per-platform jobs ([db263fb](https://github.com/srobroek/speckit-roadmap/commit/db263fb102077e1c33e1afc7643ebd09567b0da5))
