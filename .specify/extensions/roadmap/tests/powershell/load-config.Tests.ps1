#!/usr/bin/env pwsh
# load-config.Tests.ps1 — Pester 5 test suite for scripts/powershell/load-config.ps1
#
# Mirrors every behavior in tests/bash/load-config.bats (T010-T017).
# Uses the same fake-repo strategy as the Bats suite:
#   1. Build a minimal temp tree with a .specify/ directory.
#   2. Copy load-config.ps1 into scripts/powershell/ inside that tree.
#   3. Run the COPY so that $PSScriptRoot-based Find-SpecifyRoot finds the
#      temp repo root — keeping every test hermetic and CWD-independent.
#
# JSON parsing uses ConvertFrom-Json throughout.
# Env vars are passed to child processes via Invoke-FakeRepoScript; they
# never pollute the current process.
#
# Run:
#   pwsh -NoProfile -Command "Invoke-Pester -Path tests/powershell/load-config.Tests.ps1 -Output Detailed"

BeforeAll {
    # Absolute path to the production script.
    # $PSScriptRoot in BeforeAll == directory containing this .Tests.ps1 file
    # (tests/powershell/). One level up is tests/, two levels up is repo root.
    $script:REPO_ROOT     = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $script:PROD_SCRIPT   = Join-Path $script:REPO_ROOT 'scripts/powershell/load-config.ps1'
    $script:FIXTURES_DIR  = Join-Path $script:REPO_ROOT 'tests/bash/fixtures'

    # Cross-platform temp dir: GetTempPath() returns the per-user $TMPDIR on macOS
    # (sandbox-allowed), %TEMP% on Windows, and /tmp on Linux. Do NOT use $env:TMPDIR
    # directly — it is null on Windows and breaks Join-Path there.
    $script:SUITE_TMP     = Join-Path ([System.IO.Path]::GetTempPath()) "pester_load_config_$(New-Guid)"
    $null = New-Item -ItemType Directory -Path $script:SUITE_TMP -Force

    # Built-in defaults
    $script:DEFAULT_ROADMAP_PATH = '.specify/memory/roadmap.md'
    $script:DEFAULT_ADR_DIR      = 'docs/adr/'
    $script:DEFAULT_MAX_FINDINGS = 50
    $script:DEFAULT_PRD_GLOBS    = @('**/prd*.md','**/PRD*.md','**/prd-intake.yaml','**/product-spec.md','docs/product/**/*.md')

    # -----------------------------------------------------------------------
    # New-FakeRepo: build a minimal fake repo tree and return its root path.
    # The script copy lives at <root>/scripts/powershell/load-config.ps1 so
    # Find-SpecifyRoot (which walks up from $PSScriptRoot) finds <root>/.specify.
    # -----------------------------------------------------------------------
    function New-FakeRepo {
        $root = Join-Path $script:SUITE_TMP "repo_$(New-Guid)"
        $null = New-Item -ItemType Directory -Path (Join-Path $root '.specify/extensions/roadmap') -Force
        $null = New-Item -ItemType Directory -Path (Join-Path $root 'scripts/powershell') -Force
        Copy-Item -Path $script:PROD_SCRIPT -Destination (Join-Path $root 'scripts/powershell/load-config.ps1')
        return $root
    }

    # -----------------------------------------------------------------------
    # Install-Fixture: copy a named fixture into a fake repo as roadmap-config.yml.
    # -----------------------------------------------------------------------
    function Install-Fixture([string]$repoRoot, [string]$name) {
        $src = Join-Path $script:FIXTURES_DIR $name
        $dst = Join-Path $repoRoot '.specify/extensions/roadmap/roadmap-config.yml'
        Copy-Item -Path $src -Destination $dst -Force
    }

    # -----------------------------------------------------------------------
    # Invoke-FakeRepoScript: run the copy of load-config.ps1 inside a fake repo.
    # Env vars in $envVars (hashtable) are set in the child process only.
    # Returns: @{ ExitCode; Stdout; Stderr }
    # -----------------------------------------------------------------------
    function Invoke-FakeRepoScript([string]$repoRoot, [hashtable]$envVars = @{}, [string]$workingDir = '') {
        $scriptPath = Join-Path $repoRoot 'scripts/powershell/load-config.ps1'
        $wd = if ($workingDir) { $workingDir } else { $repoRoot }

        # Build env-setting prefix for the -Command string
        $envLines = @()
        foreach ($kv in $envVars.GetEnumerator()) {
            $safeVal = $kv.Value.Replace("'", "''")
            $envLines += ('$env:{0} = ''{1}''' -f $kv.Key, $safeVal)
        }
        $safePath = $scriptPath.Replace("'", "''")
        $envPrefix = if ($envLines.Count -gt 0) { ($envLines -join '; ') + '; ' } else { '' }
        $cmd = "${envPrefix}& '${safePath}'"

        $outFile = Join-Path $script:SUITE_TMP "out_$(New-Guid).txt"
        $errFile = Join-Path $script:SUITE_TMP "err_$(New-Guid).txt"
        $proc = Start-Process pwsh `
            -ArgumentList @('-NoProfile', '-Command', $cmd) `
            -WorkingDirectory $wd `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError  $errFile `
            -Wait -PassThru -NoNewWindow

        $stdout = (Get-Content $outFile -Raw -ErrorAction SilentlyContinue) ?? ''
        $stderr = (Get-Content $errFile -Raw -ErrorAction SilentlyContinue) ?? ''
        Remove-Item $outFile, $errFile -ErrorAction SilentlyContinue
        return @{
            ExitCode = $proc.ExitCode
            Stdout   = $stdout.Trim()
            Stderr   = $stderr.Trim()
        }
    }

    # -----------------------------------------------------------------------
    # Get-OutputJson: parse stdout as JSON; throws on failure.
    # -----------------------------------------------------------------------
    function Get-OutputJson([string]$stdout) {
        if (-not $stdout) { throw 'stdout is empty — no JSON to parse' }
        return $stdout | ConvertFrom-Json
    }
}

AfterAll {
    # Clean up the suite-level temp directory.
    Remove-Item $script:SUITE_TMP -Recurse -Force -ErrorAction SilentlyContinue
}

# ===========================================================================
# T010: defaults — no config file present → all built-in defaults
# ===========================================================================
Describe 'T010: defaults — no config file present' {
    BeforeAll {
        $script:t010Root   = New-FakeRepo
        $script:t010Result = Invoke-FakeRepoScript $script:t010Root
        $script:t010Json   = Get-OutputJson $script:t010Result.Stdout
    }

    It 'exits with code 0' {
        $script:t010Result.ExitCode | Should -Be 0
    }

    It 'roadmap_path is built-in default' {
        $script:t010Json.roadmap_path | Should -Be $script:DEFAULT_ROADMAP_PATH
    }

    It 'roadmap_exists is false when file absent' {
        $script:t010Json.roadmap_exists | Should -Be $false
    }

    It 'adr_dir is built-in default' {
        $script:t010Json.adr_dir | Should -Be $script:DEFAULT_ADR_DIR
    }

    It 'adr_present is false when directory absent' {
        $script:t010Json.adr_present | Should -Be $false
    }

    It 'max_findings is built-in default (50)' {
        $script:t010Json.max_findings | Should -Be $script:DEFAULT_MAX_FINDINGS
    }

    It 'max_findings is an integer type (int or long)' {
        # ConvertFrom-Json returns [long] (Int64) in PowerShell 7; accept any integer width.
        $script:t010Json.max_findings | Should -BeOfType [System.Int64]
    }

    It 'roadmap_exists is a boolean type' {
        $script:t010Json.roadmap_exists | Should -BeOfType [bool]
    }

    It 'adr_present is a boolean type' {
        $script:t010Json.adr_present | Should -BeOfType [bool]
    }

    It 'prd_globs contains exactly 5 default patterns' {
        $script:t010Json.prd_globs.Count | Should -Be 5
    }

    It 'prd_globs contains **/prd*.md' {
        $script:t010Json.prd_globs | Should -Contain '**/prd*.md'
    }

    It 'prd_globs contains **/PRD*.md' {
        $script:t010Json.prd_globs | Should -Contain '**/PRD*.md'
    }

    It 'prd_globs contains **/prd-intake.yaml' {
        $script:t010Json.prd_globs | Should -Contain '**/prd-intake.yaml'
    }

    It 'prd_globs contains **/product-spec.md' {
        $script:t010Json.prd_globs | Should -Contain '**/product-spec.md'
    }

    It 'prd_globs contains docs/product/**/*.md' {
        $script:t010Json.prd_globs | Should -Contain 'docs/product/**/*.md'
    }

    It 'stdout is valid JSON (round-trips without error)' {
        { Get-OutputJson $script:t010Result.Stdout } | Should -Not -Throw
    }
}

# ===========================================================================
# T011: file-override — valid.yml values win over defaults
# ===========================================================================
Describe 'T011: file-override — valid.yml overrides defaults' {
    BeforeAll {
        $script:t011Root   = New-FakeRepo
        Install-Fixture $script:t011Root 'valid.yml'
        $script:t011Result = Invoke-FakeRepoScript $script:t011Root
        $script:t011Json   = Get-OutputJson $script:t011Result.Stdout
    }

    It 'exits with code 0' {
        $script:t011Result.ExitCode | Should -Be 0
    }

    It 'roadmap_path from valid.yml overrides default' {
        $script:t011Json.roadmap_path | Should -Be 'docs/roadmap/my-roadmap.md'
    }

    It 'adr_dir from valid.yml overrides default' {
        $script:t011Json.adr_dir | Should -Be 'docs/decisions/'
    }

    It 'max_findings from valid.yml overrides default' {
        $script:t011Json.max_findings | Should -Be 25
    }

    It 'prd_globs from valid.yml replaces built-in defaults (3 patterns)' {
        $script:t011Json.prd_globs.Count | Should -Be 3
    }

    It 'prd_globs contains custom **/requirements/*.md' {
        $script:t011Json.prd_globs | Should -Contain '**/requirements/*.md'
    }
}

# ===========================================================================
# T011e-f: null-sentinel — null and ~ values fall through to defaults
# ===========================================================================
Describe 'T011e-f: null-sentinel — null and tilde fall through to defaults' {
    It 'null value for path falls through to built-in default' {
        $root = New-FakeRepo
        Set-Content -Path (Join-Path $root '.specify/extensions/roadmap/roadmap-config.yml') `
            -Value "roadmap:`n  path: null`n"
        $result = Invoke-FakeRepoScript $root
        $json   = Get-OutputJson $result.Stdout
        $json.roadmap_path | Should -Be $script:DEFAULT_ROADMAP_PATH
    }

    It 'tilde (~) value for path falls through to built-in default' {
        $root = New-FakeRepo
        Set-Content -Path (Join-Path $root '.specify/extensions/roadmap/roadmap-config.yml') `
            -Value "roadmap:`n  path: ~`n"
        $result = Invoke-FakeRepoScript $root
        $json   = Get-OutputJson $result.Stdout
        $json.roadmap_path | Should -Be $script:DEFAULT_ROADMAP_PATH
    }
}

# ===========================================================================
# T012: env-override — SPECKIT_ROADMAP_* wins over file AND defaults
# ===========================================================================
Describe 'T012: env-override — SPECKIT_ROADMAP_* wins over file and defaults' {
    It 'SPECKIT_ROADMAP_PATH wins over file value' {
        $root   = New-FakeRepo
        Install-Fixture $root 'env.yml'
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PATH = 'custom/env-roadmap.md' }
        $json   = Get-OutputJson $result.Stdout
        $json.roadmap_path | Should -Be 'custom/env-roadmap.md'
    }

    It 'SPECKIT_ROADMAP_ADR_DIR wins over defaults' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_ADR_DIR = 'my/adr/' }
        $json   = Get-OutputJson $result.Stdout
        $json.adr_dir | Should -Be 'my/adr/'
    }

    It 'SPECKIT_ROADMAP_MAX_FINDINGS wins over defaults' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_MAX_FINDINGS = '99' }
        $json   = Get-OutputJson $result.Stdout
        $json.max_findings | Should -Be 99
    }

    It 'SPECKIT_ROADMAP_PRD_GLOBS comma-separated wins over defaults (2 globs)' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PRD_GLOBS = 'glob/one.md,glob/two.yaml' }
        $json   = Get-OutputJson $result.Stdout
        $json.prd_globs.Count | Should -Be 2
        $json.prd_globs | Should -Contain 'glob/one.md'
        $json.prd_globs | Should -Contain 'glob/two.yaml'
    }

    It 'all four SPECKIT_ROADMAP_* vars simultaneously override everything' {
        $root   = New-FakeRepo
        Install-Fixture $root 'env.yml'
        $result = Invoke-FakeRepoScript $root @{
            SPECKIT_ROADMAP_PATH         = 'e/road.md'
            SPECKIT_ROADMAP_ADR_DIR      = 'e/adr/'
            SPECKIT_ROADMAP_MAX_FINDINGS = '7'
            SPECKIT_ROADMAP_PRD_GLOBS    = 'e/prd.md'
        }
        $json = Get-OutputJson $result.Stdout
        $json.roadmap_path    | Should -Be 'e/road.md'
        $json.adr_dir         | Should -Be 'e/adr/'
        $json.max_findings    | Should -Be 7
        $json.prd_globs.Count | Should -Be 1
        $json.prd_globs       | Should -Contain 'e/prd.md'
    }
}

# ===========================================================================
# T013: path/existence detection — roadmap_exists and adr_present booleans
# ===========================================================================
Describe 'T013: existence detection — roadmap_exists and adr_present' {
    It 'roadmap_exists true when file present' {
        $root = New-FakeRepo
        $null = New-Item -ItemType Directory -Path (Join-Path $root 'docs') -Force
        $null = New-Item -ItemType File -Path (Join-Path $root 'docs/roadmap.md') -Force
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PATH = 'docs/roadmap.md' }
        $json   = Get-OutputJson $result.Stdout
        $json.roadmap_exists | Should -Be $true
    }

    It 'roadmap_exists false when file absent' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PATH = 'nonexistent/roadmap.md' }
        $json   = Get-OutputJson $result.Stdout
        $json.roadmap_exists | Should -Be $false
    }

    It 'adr_present true when directory present' {
        $root = New-FakeRepo
        $null = New-Item -ItemType Directory -Path (Join-Path $root 'docs/adrs') -Force
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_ADR_DIR = 'docs/adrs' }
        $json   = Get-OutputJson $result.Stdout
        $json.adr_present | Should -Be $true
    }

    It 'adr_present false when directory absent' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_ADR_DIR = 'no/such/dir' }
        $json   = Get-OutputJson $result.Stdout
        $json.adr_present | Should -Be $false
    }

    It 'absolute roadmap path is resolved correctly (roadmap_exists true)' {
        $root    = New-FakeRepo
        $absPath = Join-Path $script:SUITE_TMP 'abs-roadmap.md'
        $null    = New-Item -ItemType File -Path $absPath -Force
        $result  = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PATH = $absPath }
        $json    = Get-OutputJson $result.Stdout
        $json.roadmap_exists | Should -Be $true
    }
}

# ===========================================================================
# T014: special-char / quote escaping — special chars produce valid JSON
# ===========================================================================
Describe 'T014: escaping — special characters produce valid JSON' {
    It 'double-quote in valid.yml prd_glob produces valid parseable JSON' {
        $root   = New-FakeRepo
        Install-Fixture $root 'valid.yml'
        $result = Invoke-FakeRepoScript $root
        $json   = Get-OutputJson $result.Stdout
        # valid.yml has: - **/specs/"annotated"/*.md (embedded double quotes)
        $json.prd_globs | Should -Contain '**/specs/"annotated"/*.md'
    }

    It 'backslash in path via env override produces valid JSON' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_PATH = 'path\with\backslash.md' }
        { Get-OutputJson $result.Stdout } | Should -Not -Throw
    }
}

# ===========================================================================
# T015: non-repo-root CWD regression — invoking from an unrelated directory
#        must still yield valid output with non-empty prd_globs (FR-016b).
# ===========================================================================
Describe 'T015: non-repo-root CWD — valid contract from alien working directory' {
    BeforeAll {
        $alienDir = Join-Path $script:SUITE_TMP "alien_$(New-Guid)"
        $null = New-Item -ItemType Directory -Path $alienDir -Force
        # The fake repo gives the script a .specify root via $PSScriptRoot walk.
        # Running it from an alien CWD exercises the CWD-independence property.
        $root = New-FakeRepo
        $script:t015Result = Invoke-FakeRepoScript $root @{} -workingDir $alienDir
        $script:t015Json   = Get-OutputJson $script:t015Result.Stdout
    }

    It 'exits with code 0 from alien CWD' {
        $script:t015Result.ExitCode | Should -Be 0
    }

    It 'stdout is non-empty from alien CWD' {
        $script:t015Result.Stdout | Should -Not -BeNullOrEmpty
    }

    It 'stdout is valid JSON from alien CWD' {
        { Get-OutputJson $script:t015Result.Stdout } | Should -Not -Throw
    }

    It 'prd_globs count is 5 (full default set) from alien CWD' {
        $script:t015Json.prd_globs.Count | Should -Be 5
    }

    It 'roadmap_path is non-empty from alien CWD' {
        $script:t015Json.roadmap_path | Should -Not -BeNullOrEmpty
    }

    It 'adr_dir is non-empty from alien CWD' {
        $script:t015Json.adr_dir | Should -Not -BeNullOrEmpty
    }

    It 'max_findings is a non-negative integer from alien CWD' {
        $script:t015Json.max_findings | Should -BeGreaterOrEqual 0
    }
}

# ===========================================================================
# T016: invalid max_findings → non-zero exit, no JSON on stdout
# ===========================================================================
Describe 'T016: invalid max_findings — non-zero exit, no JSON' {
    BeforeAll {
        $root = New-FakeRepo
        Install-Fixture $root 'invalid.yml'
        $script:t016Result = Invoke-FakeRepoScript $root
    }

    It 'exits non-zero for invalid max_findings from invalid.yml' {
        $script:t016Result.ExitCode | Should -Not -Be 0
    }

    It 'stdout is empty — no JSON emitted on invalid max_findings' {
        $script:t016Result.Stdout | Should -BeNullOrEmpty
    }

    It 'stderr contains a human-readable error message' {
        $script:t016Result.Stderr | Should -Not -BeNullOrEmpty
    }

    It 'invalid max_findings via env var — exits non-zero with no JSON on stdout' {
        $root   = New-FakeRepo
        $result = Invoke-FakeRepoScript $root @{ SPECKIT_ROADMAP_MAX_FINDINGS = 'notanumber' }
        $result.ExitCode | Should -Not -Be 0
        $result.Stdout   | Should -BeNullOrEmpty
    }
}

# ===========================================================================
# T017: no-.specify-ancestor — when script has no .specify ancestor,
#        built-in defaults apply and output is still valid JSON with correct types.
# ===========================================================================
Describe 'T017: no-.specify-ancestor fallback — valid JSON with correct types' {
    BeforeAll {
        # Build a dir tree with NO .specify anywhere — script falls back to CWD defaults.
        $fbBase = Join-Path $script:SUITE_TMP "fallback_$(New-Guid)"
        $null   = New-Item -ItemType Directory -Path (Join-Path $fbBase 'scripts/powershell') -Force
        $null   = New-Item -ItemType Directory -Path (Join-Path $fbBase 'alien') -Force
        Copy-Item -Path $script:PROD_SCRIPT -Destination (Join-Path $fbBase 'scripts/powershell/load-config.ps1')
        $fbScriptPath = Join-Path $fbBase 'scripts/powershell/load-config.ps1'
        $fbAlienDir   = Join-Path $fbBase 'alien'

        # Build a wrapper .ps1 that sets the env var with a literal double-quote and
        # then calls the subject script. Using [char]34 (double-quote) inside a double-
        # quoted string avoids quoting-escaping issues that arise when passing -Command
        # through Start-Process argument lists on macOS.
        $dq          = [char]34
        $wrapPath    = Join-Path $script:SUITE_TMP "wrap_$(New-Guid).ps1"
        $wrapContent = "`$env:SPECKIT_ROADMAP_PRD_GLOBS = 'path/with/${dq}quotes${dq}/glob.md'" + "`n" +
                       "& '$($fbScriptPath.Replace("'","''"))'"
        [System.IO.File]::WriteAllText($wrapPath, $wrapContent)

        $outFile = Join-Path $script:SUITE_TMP "fb_out_$(New-Guid).txt"
        $errFile = Join-Path $script:SUITE_TMP "fb_err_$(New-Guid).txt"
        $proc = Start-Process pwsh `
            -ArgumentList @('-NoProfile', '-File', $wrapPath) `
            -WorkingDirectory $fbAlienDir `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError  $errFile `
            -Wait -PassThru -NoNewWindow
        $stdout = (Get-Content $outFile -Raw -ErrorAction SilentlyContinue) ?? ''
        $stderr = (Get-Content $errFile -Raw -ErrorAction SilentlyContinue) ?? ''
        Remove-Item $outFile, $errFile, $wrapPath -ErrorAction SilentlyContinue
        $script:t017Result = @{ ExitCode = $proc.ExitCode; Stdout = $stdout.Trim(); Stderr = $stderr.Trim() }
        $script:t017Json   = Get-OutputJson $script:t017Result.Stdout
    }

    It 'exits with code 0 without a .specify ancestor' {
        $script:t017Result.ExitCode | Should -Be 0
    }

    It 'stdout is valid JSON without a .specify ancestor' {
        { Get-OutputJson $script:t017Result.Stdout } | Should -Not -Throw
    }

    It 'double-quoted glob value is preserved in output' {
        $script:t017Json.prd_globs | Should -Contain 'path/with/"quotes"/glob.md'
    }

    It 'max_findings is an integer type without .specify ancestor (int or long)' {
        # ConvertFrom-Json returns [long] (Int64) in PowerShell 7; accept any integer width.
        $script:t017Json.max_findings | Should -BeOfType [System.Int64]
    }

    It 'roadmap_exists is a boolean type without .specify ancestor' {
        $script:t017Json.roadmap_exists | Should -BeOfType [bool]
    }

    It 'adr_present is a boolean type without .specify ancestor' {
        $script:t017Json.adr_present | Should -BeOfType [bool]
    }
}
