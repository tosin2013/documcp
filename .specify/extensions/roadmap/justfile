default:
    @just --list

# Run the full test suite: bash (Bats), cross-platform parity (Bats), PowerShell (Pester)
test: test-bash test-parity test-powershell

# Bash unit tests for load-config (Bats)
test-bash:
    bats tests/bash/load-config.bats

# Cross-platform JSON parity (bash vs PowerShell) — requires pwsh
test-parity:
    bats tests/parity/parity.bats

# PowerShell unit tests for load-config (Pester) — skipped if pwsh/Pester absent
test-powershell:
    @command -v pwsh >/dev/null 2>&1 && \
        pwsh -NoProfile -Command '$c=New-PesterConfiguration; $c.Run.Path="tests/powershell/load-config.Tests.ps1"; $c.Run.Exit=$true; $c.TestDrive.Enabled=$false; $c.Output.Verbosity="Detailed"; Invoke-Pester -Configuration $c' \
        || echo "pwsh not found — skipping Pester (runs in CI on Windows)"

# Lint and format
lint:
    pre-commit run --all-files

# Build
build:
    @echo "TODO: configure build command"

# Start dev server
dev:
    @echo "TODO: configure dev command"

# Clean build artifacts
clean:
    @echo "TODO: configure clean command"
