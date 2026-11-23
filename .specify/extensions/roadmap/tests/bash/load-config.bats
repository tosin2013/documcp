#!/usr/bin/env bats
# load-config.bats — Bats 1.13 test suite for scripts/bash/load-config.sh
#
# Each test is self-contained: _build_fake_repo() builds a minimal fake repo
# tree under BATS_TEST_TMPDIR so the script's _find_specify_root walk always
# finds a controlled .specify/ directory, independent of CWD or any real repo.
#
# JSON PARSING APPROACH:
#   All python3 assertions pass data via stdin (printf "%s" "$json" | python3)
#   and use sys.argv[1] for field names. This avoids bash-expansion hazards
#   (backslashes, double-quotes) that break inline python string literals.
#
# Strategy for FILE override tests (T011):
#   load-config.sh resolves repo root by walking UP from its own $SCRIPT_DIR
#   looking for a .specify/ directory. To make it read a custom fixture as
#   roadmap-config.yml we:
#     1. Build a mini repo under $BATS_TEST_TMPDIR with a .specify/ directory.
#     2. Copy load-config.sh into a scripts/bash/ path inside that tree.
#     3. Copy the desired fixture as .specify/extensions/roadmap/roadmap-config.yml.
#     4. Run the COPY of the script, which finds the local .specify/ root.
#   This keeps every test hermetic and CWD-independent.
#
# Strategy for the json_escape FALLBACK path (T017):
#   The script copy is placed at BATS_TEST_TMPDIR/fallback/scripts/bash/ with
#   NO .specify/ directory anywhere above it. _find_specify_root returns empty,
#   REPO_ROOT falls back to the alien CWD, and none of the hardcoded relative
#   paths for common.sh resolve to a real file. The fallback json_escape defined
#   inside load-config.sh fires automatically. No modification of the script.

bats_require_minimum_version 1.5.0

# Absolute path to the script under test (resolved relative to this .bats file)
SCRIPT="$(cd -- "$(dirname -- "$BATS_TEST_FILENAME")/../.." && pwd)/scripts/bash/load-config.sh"

# Built-in defaults — source of truth for default-case assertions
DEFAULT_ROADMAP_PATH=".specify/memory/roadmap.md"
DEFAULT_ADR_DIR="docs/adr/"
DEFAULT_MAX_FINDINGS=50

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Build a minimal fake repo tree under $BATS_TEST_TMPDIR/repo.
# Sets global FAKE_ROOT to the repo root.
_build_fake_repo() {
    FAKE_ROOT="$BATS_TEST_TMPDIR/repo"
    mkdir -p "$FAKE_ROOT/.specify/extensions/roadmap"
    mkdir -p "$FAKE_ROOT/.specify/scripts/bash"
    mkdir -p "$FAKE_ROOT/scripts/bash"
    # Copy load-config.sh so _find_specify_root (walks up from SCRIPT_DIR) finds FAKE_ROOT
    cp "$SCRIPT" "$FAKE_ROOT/scripts/bash/load-config.sh"
    # Copy common.sh so the standard sourcing path also works
    local common_src
    common_src="$(cd -- "$(dirname -- "$BATS_TEST_FILENAME")/../.." && pwd)/.specify/scripts/bash/common.sh"
    [ -f "$common_src" ] && cp "$common_src" "$FAKE_ROOT/.specify/scripts/bash/common.sh"
}

# Copy a named fixture into the fake repo as roadmap-config.yml.
_install_fixture() {
    local name="$1"
    cp "$(cd -- "$(dirname -- "$BATS_TEST_FILENAME")" && pwd)/fixtures/${name}" \
       "$FAKE_ROOT/.specify/extensions/roadmap/roadmap-config.yml"
}

# Run the copy of load-config.sh inside FAKE_ROOT (stdout+stderr merged into $output).
_run_script() { run bash "$FAKE_ROOT/scripts/bash/load-config.sh" "$@"; }

# Run with stdout/stderr separated: $output = stdout only, $stderr = stderr only.
_run_script_sep() { run --separate-stderr bash "$FAKE_ROOT/scripts/bash/load-config.sh" "$@"; }

# Extract a single JSON field from a string.
# Passes json via stdin, field name via sys.argv[1] — no shell-quoting hazards.
# Usage: local v; v=$(_json_field "$json_string" "fieldname")
_json_field() {
    local json_str="$1" field="$2"
    printf "%s" "$json_str" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read().strip())
print(str(d[sys.argv[1]]))
" "$field"
}

# Return the length of a JSON array field.
_json_arr_len() {
    local json_str="$1" field="$2"
    printf "%s" "$json_str" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read().strip())
print(len(d[sys.argv[1]]))
" "$field"
}

# Assert JSON is parseable (exits 1 with message on failure).
_assert_valid_json() {
    local json_str="$1"
    printf "%s" "$json_str" | python3 -c "
import json, sys
try:
    json.loads(sys.stdin.read().strip())
    print('ok')
except json.JSONDecodeError as e:
    print('INVALID JSON: ' + str(e), file=sys.stderr)
    sys.exit(1)
"
}

# Assert that a JSON array field contains a specific string value.
_json_arr_contains() {
    local json_str="$1" field="$2" value="$3"
    printf "%s" "$json_str" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read().strip())
arr = d[sys.argv[1]]
val = sys.argv[2]
assert val in arr, f'{val!r} not in {arr}'
" "$field" "$value"
}

# ---------------------------------------------------------------------------
# T010: defaults — no config file present → all built-in defaults
# ---------------------------------------------------------------------------

@test "T010: defaults — roadmap_path is built-in default when no config file" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "$DEFAULT_ROADMAP_PATH" ]
}

@test "T010b: defaults — roadmap_exists is false when file absent" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_exists")" = "False" ]
}

@test "T010c: defaults — adr_dir is built-in default" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_dir")" = "$DEFAULT_ADR_DIR" ]
}

@test "T010d: defaults — adr_present is false when directory absent" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_present")" = "False" ]
}

@test "T010e: defaults — max_findings is built-in default (50)" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "max_findings")" = "$DEFAULT_MAX_FINDINGS" ]
}

@test "T010f: defaults — prd_globs contains all five expected default patterns" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_arr_len "$output" "prd_globs")" = "5" ]
    _json_arr_contains "$output" "prd_globs" "**/prd*.md"
    _json_arr_contains "$output" "prd_globs" "**/PRD*.md"
    _json_arr_contains "$output" "prd_globs" "**/prd-intake.yaml"
    _json_arr_contains "$output" "prd_globs" "**/product-spec.md"
    _json_arr_contains "$output" "prd_globs" "docs/product/**/*.md"
}

@test "T010g: defaults — output is valid JSON" {
    _build_fake_repo
    _run_script
    [ "$status" -eq 0 ]
    local result
    result=$(_assert_valid_json "$output")
    [ "$result" = "ok" ]
}

# ---------------------------------------------------------------------------
# T011: file-override — valid.yml values win over defaults
#        null-sentinel — null / ~ values fall through to defaults
# ---------------------------------------------------------------------------

@test "T011: file-override — roadmap_path from valid.yml overrides default" {
    _build_fake_repo
    _install_fixture "valid.yml"
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "docs/roadmap/my-roadmap.md" ]
}

@test "T011b: file-override — adr_dir from valid.yml overrides default" {
    _build_fake_repo
    _install_fixture "valid.yml"
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_dir")" = "docs/decisions/" ]
}

@test "T011c: file-override — max_findings from valid.yml overrides default" {
    _build_fake_repo
    _install_fixture "valid.yml"
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "max_findings")" = "25" ]
}

@test "T011d: file-override — prd_globs from valid.yml replaces built-in defaults" {
    _build_fake_repo
    _install_fixture "valid.yml"
    _run_script
    [ "$status" -eq 0 ]
    # valid.yml defines 3 custom globs; the 5 built-in defaults must not appear
    [ "$(_json_arr_len "$output" "prd_globs")" = "3" ]
    _json_arr_contains "$output" "prd_globs" "**/requirements/*.md"
}

@test "T011e: null-sentinel — null value for path falls through to built-in default" {
    _build_fake_repo
    printf 'roadmap:\n  path: null\n' > "$FAKE_ROOT/.specify/extensions/roadmap/roadmap-config.yml"
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "$DEFAULT_ROADMAP_PATH" ]
}

@test "T011f: null-sentinel — tilde (~) value for path falls through to built-in default" {
    _build_fake_repo
    printf 'roadmap:\n  path: ~\n' > "$FAKE_ROOT/.specify/extensions/roadmap/roadmap-config.yml"
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "$DEFAULT_ROADMAP_PATH" ]
}

# ---------------------------------------------------------------------------
# T012: env-override — SPECKIT_ROADMAP_* wins over file AND defaults
# ---------------------------------------------------------------------------

@test "T012: env-override — SPECKIT_ROADMAP_PATH wins over file value" {
    _build_fake_repo
    _install_fixture "env.yml"   # env.yml sets path to docs/env-test-roadmap.md
    SPECKIT_ROADMAP_PATH="custom/env-roadmap.md" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "custom/env-roadmap.md" ]
}

@test "T012b: env-override — SPECKIT_ROADMAP_ADR_DIR wins over defaults" {
    _build_fake_repo
    SPECKIT_ROADMAP_ADR_DIR="my/adr/" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_dir")" = "my/adr/" ]
}

@test "T012c: env-override — SPECKIT_ROADMAP_MAX_FINDINGS wins over defaults" {
    _build_fake_repo
    SPECKIT_ROADMAP_MAX_FINDINGS=99 _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "max_findings")" = "99" ]
}

@test "T012d: env-override — SPECKIT_ROADMAP_PRD_GLOBS (comma-separated) wins over defaults" {
    _build_fake_repo
    SPECKIT_ROADMAP_PRD_GLOBS="glob/one.md,glob/two.yaml" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_arr_len "$output" "prd_globs")" = "2" ]
    _json_arr_contains "$output" "prd_globs" "glob/one.md"
    _json_arr_contains "$output" "prd_globs" "glob/two.yaml"
}

@test "T012e: env-override — all four SPECKIT_ROADMAP_* vars simultaneously override everything" {
    _build_fake_repo
    _install_fixture "env.yml"
    SPECKIT_ROADMAP_PATH="e/road.md" \
    SPECKIT_ROADMAP_ADR_DIR="e/adr/" \
    SPECKIT_ROADMAP_MAX_FINDINGS=7 \
    SPECKIT_ROADMAP_PRD_GLOBS="e/prd.md" \
    _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_path")" = "e/road.md" ]
    [ "$(_json_field "$output" "adr_dir")" = "e/adr/" ]
    [ "$(_json_field "$output" "max_findings")" = "7" ]
    [ "$(_json_arr_len "$output" "prd_globs")" = "1" ]
    _json_arr_contains "$output" "prd_globs" "e/prd.md"
}

# ---------------------------------------------------------------------------
# T013: path/existence detection — roadmap_exists and adr_present booleans
# ---------------------------------------------------------------------------

@test "T013: existence detection — roadmap_exists true when file present" {
    _build_fake_repo
    mkdir -p "$FAKE_ROOT/docs"
    touch "$FAKE_ROOT/docs/roadmap.md"
    SPECKIT_ROADMAP_PATH="docs/roadmap.md" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_exists")" = "True" ]
}

@test "T013b: existence detection — roadmap_exists false when file absent" {
    _build_fake_repo
    SPECKIT_ROADMAP_PATH="nonexistent/roadmap.md" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_exists")" = "False" ]
}

@test "T013c: existence detection — adr_present true when directory present" {
    _build_fake_repo
    mkdir -p "$FAKE_ROOT/docs/adrs"
    SPECKIT_ROADMAP_ADR_DIR="docs/adrs" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_present")" = "True" ]
}

@test "T013d: existence detection — adr_present false when directory absent" {
    _build_fake_repo
    SPECKIT_ROADMAP_ADR_DIR="no/such/dir" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "adr_present")" = "False" ]
}

@test "T013e: existence detection — absolute roadmap path is resolved correctly" {
    _build_fake_repo
    local abs_path="$BATS_TEST_TMPDIR/abs-roadmap.md"
    touch "$abs_path"
    SPECKIT_ROADMAP_PATH="$abs_path" _run_script
    [ "$status" -eq 0 ]
    [ "$(_json_field "$output" "roadmap_exists")" = "True" ]
}

# ---------------------------------------------------------------------------
# T014: special-char / quote escaping — values with special chars produce valid JSON
# ---------------------------------------------------------------------------

@test "T014: escaping — double-quote in config value (valid.yml) produces valid parseable JSON" {
    _build_fake_repo
    _install_fixture "valid.yml"
    # valid.yml contains: **/specs/"annotated"/*.md  (embedded double quotes)
    _run_script
    [ "$status" -eq 0 ]
    # Assert the output parses without error
    local result
    result=$(_assert_valid_json "$output")
    [ "$result" = "ok" ]
    # Assert the annotated glob made it through (with the literal double-quote characters).
    # The YAML has an unquoted scalar:  - **/specs/"annotated"/*.md
    # The script's awk reader extracts it verbatim; json_escape escapes the " → \"
    # Python json.loads then recovers the literal " so the string is: **/specs/"annotated"/*.md
    _json_arr_contains "$output" "prd_globs" '**/specs/"annotated"/*.md'
}

@test "T014b: escaping — value with backslash via env override produces valid JSON" {
    _build_fake_repo
    # Backslash in path: json_escape must double it → \\
    SPECKIT_ROADMAP_PATH='path\with\backslash.md' _run_script
    [ "$status" -eq 0 ]
    local result
    result=$(_assert_valid_json "$output")
    [ "$result" = "ok" ]
}

# ---------------------------------------------------------------------------
# T015: non-repo-root CWD regression — invoking from an unrelated directory
#        must still yield valid output with non-empty prd_globs (FR-016b).
# ---------------------------------------------------------------------------

@test "T015: non-repo-root CWD — valid contract emitted when invoked from alien tmpdir" {
    _build_fake_repo
    # alien_dir has NO .specify/ ancestor — completely unrelated to any repo
    local alien_dir="$BATS_TEST_TMPDIR/alien"
    mkdir -p "$alien_dir"
    local script_copy="$FAKE_ROOT/scripts/bash/load-config.sh"
    run bash -c "cd '$alien_dir' && bash '$script_copy'"
    [ "$status" -eq 0 ]
    [ -n "$output" ]
    local result
    result=$(_assert_valid_json "$output")
    [ "$result" = "ok" ]
}

@test "T015b: non-repo-root CWD — prd_globs count is 5 (full default set) from alien CWD" {
    _build_fake_repo
    local alien_dir="$BATS_TEST_TMPDIR/alien2"
    mkdir -p "$alien_dir"
    local script_copy="$FAKE_ROOT/scripts/bash/load-config.sh"
    run bash -c "cd '$alien_dir' && bash '$script_copy'"
    [ "$status" -eq 0 ]
    # This is the regression guard: the bug caused empty prd_globs from non-repo CWDs
    [ "$(_json_arr_len "$output" "prd_globs")" = "5" ]
}

@test "T015c: non-repo-root CWD — all required fields present and non-empty" {
    _build_fake_repo
    local alien_dir="$BATS_TEST_TMPDIR/alien3"
    mkdir -p "$alien_dir"
    local script_copy="$FAKE_ROOT/scripts/bash/load-config.sh"
    run bash -c "cd '$alien_dir' && bash '$script_copy'"
    [ "$status" -eq 0 ]
    [ -n "$(_json_field "$output" "roadmap_path")" ]
    [ -n "$(_json_field "$output" "adr_dir")" ]
    # max_findings must be a number
    local mf
    mf=$(_json_field "$output" "max_findings")
    [[ "$mf" =~ ^[0-9]+$ ]]
}

# ---------------------------------------------------------------------------
# T016: invalid max_findings → non-zero exit, no JSON on stdout
# ---------------------------------------------------------------------------

@test "T016: invalid max_findings (from invalid.yml) — exits non-zero" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    _run_script_sep
    [ "$status" -ne 0 ]
}

@test "T016b: invalid max_findings — stdout is empty (no JSON emitted)" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    _run_script_sep
    # $output captures stdout only (--separate-stderr keeps stderr separate)
    [ -z "$output" ]
}

@test "T016c: invalid max_findings via env var — exits non-zero with no JSON on stdout" {
    _build_fake_repo
    SPECKIT_ROADMAP_MAX_FINDINGS="notanumber" run --separate-stderr bash "$FAKE_ROOT/scripts/bash/load-config.sh"
    [ "$status" -ne 0 ]
    [ -z "$output" ]
}

@test "T016d: invalid max_findings — stderr contains a human-readable error message" {
    _build_fake_repo
    _install_fixture "invalid.yml"
    _run_script_sep
    [ -n "$stderr" ]
}

# ---------------------------------------------------------------------------
# T017: json_escape FALLBACK path — when common.sh is NOT sourceable, the
#        built-in fallback json_escape must still produce valid escaped JSON.
#
# How the fallback is forced:
#   The script copy lives at BATS_TEST_TMPDIR/fallback/scripts/bash/ with NO
#   .specify/ directory anywhere above it. _find_specify_root returns empty,
#   REPO_ROOT falls back to the alien CWD. None of the hardcoded relative
#   paths for common.sh exist, so the fallback json_escape defined inside
#   load-config.sh is registered automatically.
# ---------------------------------------------------------------------------

@test "T017: json_escape fallback — output is valid JSON when common.sh unavailable" {
    # Tree with NO .specify/ → common.sh will never be sourced
    local fallback_dir="$BATS_TEST_TMPDIR/fallback"
    mkdir -p "$fallback_dir/scripts/bash"
    mkdir -p "$fallback_dir/alien"
    cp "$SCRIPT" "$fallback_dir/scripts/bash/load-config.sh"

    # Glob with an embedded double-quote exercises json_escape
    run bash -c "cd '$fallback_dir/alien' && SPECKIT_ROADMAP_PRD_GLOBS='path/with/\"quotes\"/glob.md' bash '$fallback_dir/scripts/bash/load-config.sh'"
    [ "$status" -eq 0 ]
    [ -n "$output" ]
    local result
    result=$(_assert_valid_json "$output")
    [ "$result" = "ok" ]
}

@test "T017b: json_escape fallback — the double-quoted glob value is preserved in output" {
    local fallback_dir="$BATS_TEST_TMPDIR/fallback2"
    mkdir -p "$fallback_dir/scripts/bash"
    mkdir -p "$fallback_dir/alien"
    cp "$SCRIPT" "$fallback_dir/scripts/bash/load-config.sh"

    run bash -c "cd '$fallback_dir/alien' && SPECKIT_ROADMAP_PRD_GLOBS='path/with/\"quotes\"/glob.md' bash '$fallback_dir/scripts/bash/load-config.sh'"
    [ "$status" -eq 0 ]
    _json_arr_contains "$output" "prd_globs" 'path/with/"quotes"/glob.md'
}

@test "T017c: json_escape fallback — types are correct (bool/int) without common.sh" {
    local fallback_dir="$BATS_TEST_TMPDIR/fallback3"
    mkdir -p "$fallback_dir/scripts/bash"
    mkdir -p "$fallback_dir/alien"
    cp "$SCRIPT" "$fallback_dir/scripts/bash/load-config.sh"

    run bash -c "cd '$fallback_dir/alien' && bash '$fallback_dir/scripts/bash/load-config.sh'"
    [ "$status" -eq 0 ]
    # Verify boolean and integer types are correctly emitted (not quoted strings)
    printf "%s" "$output" | python3 -c "
import json, sys
d = json.loads(sys.stdin.read().strip())
assert isinstance(d['max_findings'], int), f\"max_findings type={type(d['max_findings'])}\"
assert isinstance(d['roadmap_exists'], bool), 'roadmap_exists not bool'
assert isinstance(d['adr_present'], bool), 'adr_present not bool'
print('types ok')
"
}
