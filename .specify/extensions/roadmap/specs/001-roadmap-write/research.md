# Phase 0 Research: 001-roadmap-write

All major unknowns were resolved during the constitution and a dedicated design
grilling that preceded this spec. This file consolidates the load-bearing decisions.

## D1 — Config resolution lives in a script; judgment in the command body

- **Decision**: `load-config` (bash + PowerShell) performs only deterministic work —
  precedence resolution, null-sentinel handling, path/existence checks, validation,
  and emitting a JSON contract. The `write` command body performs all judgment.
- **Rationale**: Constitution Principle II. Deterministic work must be reproducible and
  unit-testable; reasoning must not be faked by brittle string logic.
- **Alternatives considered**: Parsing the roadmap markdown in the script (rejected —
  brittle, and markdown parsing is exactly the string-logic the principle warns against;
  the model reads markdown directly, mirroring `verify`/`constitution`).

## D2 — JSON output contract, no hard `jq` dependency

- **Decision**: `load-config` emits a single-line JSON object. Bash builds it via core
  `common.sh` `json_escape` with a `jq`-if-available path; PowerShell uses
  `ConvertTo-Json -Compress`.
- **Rationale**: JSON-on-output is the canonical spec-kit script↔command contract (core
  `check-prerequisites.sh --json`). `common.sh` already ships a `jq → python3 → grep/sed`
  ladder, so JSON is safe with zero hard dependency.
- **Alternatives**: echo-style scalar output like `verify`'s `load-config.sh` (rejected —
  we have multiple values and need a clean equality contract for the parity test).

## D3 — Config precedence

- **Decision**: environment override (`SPECKIT_ROADMAP_*`) → `roadmap-config.yml` →
  `extension.yml` defaults → built-in defaults. Null sentinels (`null`, `~`) are treated
  as unset and fall through.
- **Rationale**: Mirrors `verify`'s `load-config` (env override + extension.yml fallback)
  and is the least-surprising precedence.

## D4 — Script path references use the installed path

- **Decision**: command frontmatter and body reference
  `.specify/extensions/roadmap/scripts/bash/load-config.sh` (and `.ps1`), and core
  `.specify/scripts/bash/check-prerequisites.sh` — the deployed paths.
- **Rationale**: The dogfood run (twice) surfaced that a repo-root-relative path
  (`scripts/bash/...`) does not resolve after install. The deployed `verify`/`critique`
  skills reference the full `.specify/extensions/.../` path; we match that.
- **Alternatives**: rely on `{SCRIPT}` substitution alone (insufficient — our frontmatter
  path was wrong; the explicit installed path is what the bundled extensions use).

## D5 — Test frameworks and layout (resolves roadmap Q1)

- **Decision**: Bats for `load-config.sh`, Pester for `load-config.ps1`, plus a parity
  test. Layout: top-level `tests/{bash,powershell,parity}` with shared fixtures under
  `tests/bash/fixtures`. `tests/` is excluded from the installed extension copy.
- **Rationale**: Bats/Pester are the de-facto standards; keeping tests out of `scripts/`
  keeps the shipped tree clean; the parity test needs its own home.
- **Alternatives**: `scripts/tests/` (rejected — couples tests to the shipped script tree).

## D6 — Cross-platform parity proof

- **Decision**: A parity test runs both implementations over identical fixtures and
  asserts normalized-JSON equality. Already manually verified MATCH during bootstrap.
- **Rationale**: Constitution Principle V; the test makes the parity claim falsifiable.

## D7 — Non-interactive fallback

- **Decision**: `write` detects whether it has an interactive channel; if not (delegated
  agent / hook), it proceeds, parking gaps as Open Questions / `needs-info` entries,
  never blocking or fabricating.
- **Rationale**: The dogfood run executed non-interactively and validated this path; the
  spec's FR-005 / SC-007 require it.

## D8 — Semver bump is model-computed inline (no script)

- **Decision**: The `write` command body decides the bump type (MAJOR/MINOR/PATCH) and
  computes the new version inline, like `/speckit.constitution` (which ships no script).
- **Rationale**: Deciding bump type is judgment; the arithmetic is trivial and has no
  cross-platform behavior. Keeping it in the body avoids a script-just-to-increment and
  preserves the one-script footprint.

## Out of scope (other specs)

- release-please type / packaging (roadmap Q2) — the packaging spec.
- brief / debrief / sync command behavior — their own specs.
- Authoring ADRs — the deferred separate `speckit-adr` extension.
