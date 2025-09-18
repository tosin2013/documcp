# Pre-commit Hooks Setup for DocuMCP

This document describes the comprehensive pre-commit hooks configuration for the DocuMCP TypeScript MCP server project.

## Overview

Pre-commit hooks are automated quality gates that run before each commit to ensure code quality, security, and consistency. Our configuration is tailored specifically for the DocuMCP project's technology stack and existing development workflow.

## Quick Setup

For new team members or fresh installations:

```bash
./setup-precommit.sh
```

This script will:

- Install pre-commit framework
- Install all hook dependencies
- Configure integration with existing Husky setup
- Verify the installation

## Hook Configuration

### File Integrity & Formatting

- **Trailing Whitespace**: Removes trailing whitespace (preserves markdown formatting)
- **End of File**: Ensures files end with newline
- **Mixed Line Endings**: Standardizes to LF line endings
- **YAML/JSON Validation**: Validates configuration files

### Security & Safety

- **Private Key Detection**: Prevents accidental commit of private keys
- **Large File Check**: Prevents files larger than 1MB from being committed
- **Merge Conflict Detection**: Identifies unresolved merge conflicts

### Code Quality

- **ESLint**: TypeScript/JavaScript linting with auto-fix
- **Prettier**: Code formatting for TypeScript, JavaScript, JSON, Markdown, YAML
- **TypeScript Type Check**: Validates TypeScript compilation without emitting files

### Testing & Validation

- **Jest Stable Tests**: Runs core functional and integration tests (excludes memory system tests)
- **npm Security Audit**: Checks for known vulnerabilities
- **Build Verification**: Ensures TypeScript compilation succeeds
- **Package.json Validation**: Validates package.json syntax

### Documentation

- **Link Checking**: Validates internal documentation links

## Integration with Existing Workflow

The pre-commit configuration integrates seamlessly with DocuMCP's existing npm scripts:

| Pre-commit Hook     | Equivalent npm Script     | Purpose                      |
| ------------------- | ------------------------- | ---------------------------- |
| `eslint`            | `npm run lint:fix`        | Code linting with auto-fix   |
| `prettier`          | `npm run format`          | Code formatting              |
| `typescript-check`  | `npm run typecheck`       | Type checking                |
| `jest-tests-stable` | `npm run test` (filtered) | Core test execution          |
| `npm-audit`         | `npm run security:check`  | Security vulnerability check |
| `build-check`       | `npm run build`           | Compilation verification     |

## Hook Execution Strategy

### Performance Optimized

- **Incremental Execution**: Hooks run only on changed files when possible
- **Parallel Execution**: Independent hooks run in parallel
- **Focused Testing**: Only stable core tests run to avoid blocking commits
- **Smart Filtering**: Memory system tests excluded due to compilation issues

### Development-Friendly

- **Auto-fix**: ESLint and Prettier automatically fix issues
- **Non-blocking**: Build failures don't block commits (warning only)
- **Selective**: Only essential quality gates block commits

## Usage

### Automatic Execution

Hooks run automatically on every commit via Husky integration:

```bash
git add .
git commit -m "feat: add new feature"
# Pre-commit hooks run automatically
```

### Manual Execution

Run all hooks manually:

```bash
# Run on all files
pre-commit run --all-files

# Run on staged files only
pre-commit run

# Run specific hook
pre-commit run eslint

# Run on specific files
pre-commit run --files src/index.ts
```

### Emergency Override

Skip hooks in emergency situations:

```bash
git commit --no-verify -m "fix: emergency hotfix"
```

**⚠️ Use sparingly and fix issues in follow-up commit**

## Maintenance

### Update Hook Versions

```bash
pre-commit autoupdate
```

### Reinstall Hooks

```bash
pre-commit uninstall
pre-commit install
pre-commit install-hooks
```

### Debug Hook Issues

```bash
# Verbose output
pre-commit run --verbose

# Show hook configuration
pre-commit run --show-diff-on-failure

# Clean hook environments
pre-commit clean
```

## Team Onboarding

### For New Team Members

1. Clone the repository
2. Run `./setup-precommit.sh`
3. Verify setup: `pre-commit run --all-files`

### For Existing Contributors

If you already have the repository:

1. Pull latest changes
2. Run `./setup-precommit.sh` to update configuration
3. Continue development as normal

## Configuration Files

### Primary Configuration

- **`.pre-commit-config.yaml`**: Main hook configuration
- **`setup-precommit.sh`**: Installation and setup script

### Integration Points

- **`.husky/pre-commit`**: Git hook that calls pre-commit
- **`.eslintrc.json`**: ESLint configuration (used by hook)
- **`.prettierrc`**: Prettier configuration (used by hook)
- **`tsconfig.json`**: TypeScript configuration (used by type check)
- **`jest.config.js`**: Jest configuration (used by test hook)

## Quality Gates Summary

The pre-commit hooks implement these quality gates:

1. **File Integrity**: Consistent formatting and encoding
2. **Security**: No secrets or large files
3. **Code Style**: ESLint + Prettier enforcement
4. **Type Safety**: TypeScript compilation verification
5. **Core Functionality**: Essential test coverage
6. **Security**: Vulnerability scanning
7. **Build Success**: Compilation verification
8. **Documentation**: Link validity

## Troubleshooting

### Common Issues

**Hook Installation Fails**

```bash
# Clear cache and reinstall
pre-commit clean
pre-commit install-hooks
```

**ESLint Hook Fails**

```bash
# Run ESLint directly to see detailed errors
npm run lint:fix
```

**TypeScript Hook Fails**

```bash
# Run type check directly
npm run typecheck
```

**Test Hook Fails**

```bash
# Run stable tests directly
npm run test -- --testPathPattern="tests/(functional|tools|integration)" --testPathIgnorePatterns="memory"
```

**Performance Issues**

```bash
# Run only fast hooks
pre-commit run --hook-stage manual
```

### Hook-Specific Debugging

Each hook can be debugged individually:

```bash
pre-commit run <hook-id> --verbose
```

Where `<hook-id>` is one of:

- `trailing-whitespace`
- `eslint`
- `prettier`
- `typescript-check`
- `npm-audit`
- `jest-tests-stable`
- `build-check`

## Benefits

### For Developers

- **Consistent Code Style**: Automatic formatting enforcement
- **Early Error Detection**: Catch issues before CI/CD
- **Security Protection**: Prevent accidental secret commits
- **Quality Assurance**: Ensure minimum quality standards

### For the Project

- **Reduced CI/CD Load**: Fewer failing builds
- **Consistent Quality**: All commits meet standards
- **Security Compliance**: Automated vulnerability checks
- **Documentation Quality**: Link validation

## Best Practices

1. **Run hooks locally** before pushing to avoid CI failures
2. **Use auto-fix features** (ESLint, Prettier) to reduce manual work
3. **Keep hooks fast** to maintain developer experience
4. **Update regularly** using `pre-commit autoupdate`
5. **Document exceptions** when using `--no-verify`

## Advanced Configuration

### Custom Hook Development

Add project-specific hooks by editing `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: custom-check
      name: Custom Project Check
      entry: ./scripts/custom-check.sh
      language: system
      pass_filenames: false
```

### Hook Staging

Control when hooks run:

```yaml
stages: [pre-commit, pre-push, manual]
```

### File Filtering

Apply hooks to specific file patterns:

```yaml
files: \.(ts|js)$
exclude: \.test\.ts$
```

This configuration ensures high code quality while maintaining developer productivity for the DocuMCP project.
