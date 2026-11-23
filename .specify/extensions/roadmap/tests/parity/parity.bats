#!/usr/bin/env bats
# parity.bats — T019 cross-implementation parity suite (Bats 1.13)
#
# For each fixture (valid / missing / env / invalid), run BOTH
# scripts/bash/load-config.sh and scripts/powershell/load-config.ps1 under
# identical conditions and assert NORMALIZED-JSON equality via python3
# (parse → compare field-by-field, order-independent).
#
# For the invalid fixture both scripts must fail identically: non-zero exit
# and no JSON on stdout.
#
# Strategy — same fake-repo technique as load-config.bats:
#   1. Build a minimal temp repo tree with a .specify/ directory.
#   2. Copy BOTH scripts into their canonical sub-paths inside that tree.
#   3. Install the fixture as roadmap-config.yml.
#   4. Run both copies; the script's own root-finding logic locates the tree.
#
# Run: bats tests/parity/parity.bats

bats_require_minimum_version 1.5.0

# Absolute path to repo root (resolved from this .bats file's location)
REPO_ROOT="$(cd -- "$(dirname -- "$BATS_TEST_FILENAME")/../.." && pwd)"
BASH_SCRIPT="$REPO_ROOT/scripts/bash/load-config.sh"
PS1_SCRIPT="$REPO_ROOT/scripts/powershell/load-config.ps1"
FIXTURES_DIR="$REPO_ROOT/tests/bash/fixtures"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Build a minimal fake repo under BATS_TEST_TMPDIR/parity_repo.
# Sets global FAKE_ROOT to the repo root.
_build_fake_repo() {
    FAKE_ROOT="$BATS_TEST_TMPDIR/parity_repo"
    mkdir -p "$FAKE_ROOT/.specify/extensions/roadmap"
    mkdir -p "$FAKE_ROOT/.specify/scripts/bash"
    mkdir -p "$FAKE_ROOT/scripts/bash"
    mkdir -p "$FAKE_ROOT/scripts/powershell"
    # Copy bash script so _find_specify_root (walks up from SCRIPT_DIR) finds FAKE_ROOT
    cp "$BASH_SCRIPT" "$FAKE_ROOT/scripts/bash/load-config.sh"
    # Copy PS1 script so Find-SpecifyRoot (walks up from $PSScriptRoot) finds FAKE_ROOT
    cp "$PS1_SCRIPT"  "$FAKE_ROOT/scripts/powershell/load-config.ps1"
    # Copy common.sh if present
    local common_src="$REPO_ROOT/.specify/scripts/bash/common.sh"
    [ -f "$common_src" ] && cp "$common_src" "$FAKE_ROOT/.specify/scripts/bash/common.sh"
}

# Install a named fixture as roadmap-config.yml in the fake repo.
_install_fixture() {
    local name="$1"
    cp "$FIXTURES_DIR/${name}" "$FAKE_ROOT/.specify/extensions/roadmap/roadmap-config.yml"
}

# Run both scripts and capture stdout/exit to BASH_OUT/PS1_OUT/BASH_EXIT/PS1_EXIT.
# Stderr is discarded (we only compare stdout contracts here).
_run_both() {
    BASH_OUT="$BATS_TEST_TMPDIR/bash_out.txt"
    PS1_OUT="$BATS_TEST_TMPDIR/ps1_out.txt"

    bash "$FAKE_ROOT/scripts/bash/load-config.sh" >"$BASH_OUT" 2>/dev/null
    BASH_EXIT=$?

    pwsh -NoProfile -File "$FAKE_ROOT/scripts/powershell/load-config.ps1" >"$PS1_OUT" 2>/dev/null
    PS1_EXIT=$?
}

# Assert that both stdout files contain semantically equal JSON (order-independent,
# consistent bool/int/string typing). Passes data via files to avoid shell-quoting
# hazards with backslashes and double-quotes.
_assert_json_parity() {
    python3 - "$BASH_OUT" "$PS1_OUT" <<'PYEOF'
import json, sys

bash_file = sys.argv[1]
ps1_file  = sys.argv[2]

with open(bash_file)  as f: bash_raw = f.read().strip()
with open(ps1_file)   as f: ps1_raw  = f.read().strip()

if not bash_raw:
    print("FAIL: bash stdout is empty", file=sys.stderr)
    sys.exit(1)
if not ps1_raw:
    print("FAIL: ps1 stdout is empty", file=sys.stderr)
    sys.exit(1)

try:
    bash_obj = json.loads(bash_raw)
except json.JSONDecodeError as e:
    print(f"FAIL: bash stdout is not valid JSON: {e}", file=sys.stderr)
    sys.exit(1)

try:
    ps1_obj = json.loads(ps1_raw)
except json.JSONDecodeError as e:
    print(f"FAIL: ps1 stdout is not valid JSON: {e}", file=sys.stderr)
    sys.exit(1)

required_fields = {"roadmap_path", "roadmap_exists", "adr_dir", "adr_present", "prd_globs", "max_findings"}
for field in required_fields:
    if field not in bash_obj:
        print(f"FAIL: bash output missing field: {field}", file=sys.stderr)
        sys.exit(1)
    if field not in ps1_obj:
        print(f"FAIL: ps1 output missing field: {field}", file=sys.stderr)
        sys.exit(1)

mismatches = []

# String fields
for field in ("roadmap_path", "adr_dir"):
    if bash_obj[field] != ps1_obj[field]:
        mismatches.append(f"{field}: bash={bash_obj[field]!r} ps1={ps1_obj[field]!r}")

# Integer field
if int(bash_obj["max_findings"]) != int(ps1_obj["max_findings"]):
    mismatches.append(f"max_findings: bash={bash_obj['max_findings']} ps1={ps1_obj['max_findings']}")

# Boolean fields (Python parses JSON booleans as bool; compare by value)
for field in ("roadmap_exists", "adr_present"):
    if bool(bash_obj[field]) != bool(ps1_obj[field]):
        mismatches.append(f"{field}: bash={bash_obj[field]} ps1={ps1_obj[field]}")

# Array field (order-sensitive: both scripts should produce same order)
if list(bash_obj["prd_globs"]) != list(ps1_obj["prd_globs"]):
    mismatches.append(f"prd_globs: bash={bash_obj['prd_globs']} ps1={ps1_obj['prd_globs']}")

if mismatches:
    print("PARITY FAIL:", file=sys.stderr)
    for m in mismatches:
        print(" ", m, file=sys.stderr)
    sys.exit(1)

print("MATCH")
PYEOF
}

# ---------------------------------------------------------------------------
# Parity test: valid.yml fixture
# ---------------------------------------------------------------------------

@test "parity: valid.yml — bash and PS1 outputs are semantically equal" {
    _build_fake_repo
    _install_fixture "valid.yml"
    _run_both
    [ "$BASH_EXIT" -eq 0 ]
    [ "$PS1_EXIT"  -eq 0 ]
    result=$(_assert_json_parity)
    [ "$result" = "MATCH" ]
}

# ---------------------------------------------------------------------------
# Parity test: missing.yml fixture (empty config — all built-in defaults)
# ---------------------------------------------------------------------------

@test "parity: missing.yml — bash and PS1 outputs are semantically equal" {
    _build_fake_repo
    _install_fixture "missing.yml"
    _run_both
    [ "$BASH_EXIT" -eq 0 ]
    [ "$PS1_EXIT"  -eq 0 ]
    result=$(_assert_json_parity)
    [ "$result" = "MATCH" ]
}

# ---------------------------------------------------------------------------
# Parity test: env.yml fixture (one key set; combined with env var overrides)
# ---------------------------------------------------------------------------

@test "parity: env.yml — bash and PS1 outputs are semantically equal (no env overrides)" {
    _build_fake_repo
    _install_fixture "env.yml"
    _run_both
    [ "$BASH_EXIT" -eq 0 ]
    [ "$PS1_EXIT"  -eq 0 ]
    result=$(_assert_json_parity)
    [ "$result" = "MATCH" ]
}

@test "parity: env.yml — bash and PS1 agree when all SPECKIT_ROADMAP_* env vars are set" {
    _build_fake_repo
    _install_fixture "env.yml"

    BASH_OUT="$BATS_TEST_TMPDIR/bash_env_out.txt"
    PS1_OUT="$BATS_TEST_TMPDIR/ps1_env_out.txt"

    SPECKIT_ROADMAP_PATH="e/road.md" \
    SPECKIT_ROADMAP_ADR_DIR="e/adr/" \
    SPECKIT_ROADMAP_MAX_FINDINGS=7 \
    SPECKIT_ROADMAP_PRD_GLOBS="e/prd.md,e/spec.yaml" \
    bash "$FAKE_ROOT/scripts/bash/load-config.sh" >"$BASH_OUT" 2>/dev/null
    BASH_EXIT=$?

    SPECKIT_ROADMAP_PATH="e/road.md" \
    SPECKIT_ROADMAP_ADR_DIR="e/adr/" \
    SPECKIT_ROADMAP_MAX_FINDINGS=7 \
    SPECKIT_ROADMAP_PRD_GLOBS="e/prd.md,e/spec.yaml" \
    pwsh -NoProfile -File "$FAKE_ROOT/scripts/powershell/load-config.ps1" >"$PS1_OUT" 2>/dev/null
    PS1_EXIT=$?

    [ "$BASH_EXIT" -eq 0 ]
    [ "$PS1_EXIT"  -eq 0 ]
    result=$(_assert_json_parity)
    [ "$result" = "MATCH" ]
}

# ---------------------------------------------------------------------------
# Parity test: invalid.yml fixture — both fail identically
# ---------------------------------------------------------------------------

@test "parity: invalid.yml — bash exits non-zero" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    run --separate-stderr bash "$FAKE_ROOT/scripts/bash/load-config.sh"
    [ "$status" -ne 0 ]
}

@test "parity: invalid.yml — PS1 exits non-zero" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    run --separate-stderr pwsh -NoProfile -File "$FAKE_ROOT/scripts/powershell/load-config.ps1"
    [ "$status" -ne 0 ]
}

@test "parity: invalid.yml — bash stdout is empty (no JSON)" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    run --separate-stderr bash "$FAKE_ROOT/scripts/bash/load-config.sh"
    [ -z "$output" ]
}

@test "parity: invalid.yml — PS1 stdout is empty (no JSON)" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    run --separate-stderr pwsh -NoProfile -File "$FAKE_ROOT/scripts/powershell/load-config.ps1"
    [ -z "$output" ]
}
