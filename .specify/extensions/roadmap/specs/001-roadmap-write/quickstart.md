# Quickstart / Validation: 001-roadmap-write

How to run and validate this feature end-to-end. Run from the repo root.

## Prerequisites

- `specify` CLI ≥ 0.11.6, `bash`, `pwsh` (PowerShell 7+), and the test runners
  `bats` and Pester installed.
- The extension source at the repo root (`extension.yml`, `commands/`, `scripts/`,
  `templates/`, `config-template.yml`).

## 1. Validate the config contract (deterministic script)

```bash
# Defaults (no config file): expect the documented JSON contract
bash scripts/bash/load-config.sh | python3 -m json.tool

# PowerShell parity: expect identical normalized JSON
pwsh -NoProfile -File scripts/powershell/load-config.ps1 | python3 -m json.tool
```

**Expected**: both emit an object matching `contracts/load-config.schema.json`
(`roadmap_path`, `roadmap_exists`, `adr_dir`, `adr_present`, `prd_globs`, `max_findings`).

```bash
# Invalid value must fail closed (non-zero, no JSON)
SPECKIT_ROADMAP_MAX_FINDINGS=abc bash scripts/bash/load-config.sh; echo "exit=$?"
```

**Expected**: non-zero exit, a clear stderr message, no JSON on stdout.

## 2. Run the test suite (proves every behavior + parity)

```bash
# Linux/bash behaviors
bats tests/bash/load-config.bats

# Windows/PowerShell behaviors
pwsh -NoProfile -Command "Invoke-Pester tests/powershell/load-config.Tests.ps1"

# Cross-platform parity (bash JSON == PowerShell JSON over shared fixtures)
bats tests/parity/parity.bats
```

**Expected**: all pass. Behaviors covered: defaults, file-override, env-override,
null-sentinel, path/existence detection, PRD-glob detection, invalid-value exit code,
and JSON parity.

## 3. Dogfood the authoring command (create branch)

Install from a staging copy (NEVER `specify extension add .` from repo root — it
recurses infinitely because the source contains the install target):

```bash
STAGE="/tmp/roadmap-ext-$(date +%s)"
mkdir -p "$STAGE/scripts/bash" "$STAGE/scripts/powershell"
cp extension.yml config-template.yml "$STAGE"/
cp -R commands templates "$STAGE"/
cp scripts/bash/load-config.sh "$STAGE/scripts/bash/"
cp scripts/powershell/load-config.ps1 "$STAGE/scripts/powershell/"
specify extension add "$STAGE" --dev --force && specify extension enable roadmap
```

Then run the deployed skill `speckit-roadmap-write` in a project that has a constitution
but no roadmap.

**Expected (create)**: a new `.specify/memory/roadmap.md` at version 1.0.0 with a Sync
Impact Report, Vision & End States, Constraints & Decisions, a Planned Specs ledger,
Open Questions, and the version footer — populated from harvested context, with genuine
gaps recorded (not fabricated).

## 4. Validate amendment (amend branch)

Re-run the skill against the now-existing roadmap and make a small change (advance a
spec status).

**Expected (amend)**: prior content preserved; version bumps at PATCH for a status
change (MINOR for a new spec, MAJOR for a direction reversal); Sync Impact Report and
Last Amended date updated; nothing deleted (superseded content marked).

## 5. Non-interactive check (SC-007)

Run the `write` skill via a delegated agent with no interactive channel.

**Expected**: a valid roadmap is still produced; unresolved points are parked as Open
Questions / `needs-info` entries; the command never blocks waiting for input.

## Acceptance mapping

- Config behaviors + parity (US3, FR-016–024) → steps 1–2.
- Create (US1, FR-001–006) → step 3.
- Amend (US2, FR-007–011) → step 4.
- Non-interactive (FR-005, SC-007) → step 5.
