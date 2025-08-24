# How to Release DocuMCP

This guide walks you through releasing a new version of DocuMCP to npm and creating a GitHub release.

## Prerequisites

Before releasing, ensure you have:

1. **npm account access**: You need publish permissions for the `documcp` package
2. **Clean working directory**: All changes must be committed
3. **Main branch**: Must be on the `main` branch
4. **Tests passing**: All tests and linting must pass

## Authentication Setup

### npm Authentication

Login to npm (one-time setup):
```bash
npm login
```

Verify you're logged in:
```bash
npm whoami
```

### GitHub Authentication

The release workflow uses GitHub Actions with these secrets:
- `GITHUB_TOKEN` (automatic)
- `NPM_TOKEN` (must be configured in repository secrets)

## Release Methods

### Method 1: Using the Release Script (Recommended)

The project includes a release script that handles version bumping and tagging:

```bash
# Patch release (0.2.0 → 0.2.1)
./release.sh patch

# Minor release (0.2.0 → 0.3.0)
./release.sh minor

# Major release (0.2.0 → 1.0.0)
./release.sh major
```

The script will:
1. Verify you're on main branch with clean working directory
2. Update `package.json` version
3. Run pre-release checks (`npm run ci`)
4. Create commit with version changes
5. Create annotated git tag
6. Push commit and tag to trigger GitHub Actions

### Method 2: Manual Release

If you prefer manual control:

1. **Update version**:
   ```bash
   npm version patch  # or minor/major
   ```

2. **Run tests**:
   ```bash
   npm run ci
   ```

3. **Commit changes**:
   ```bash
   git add .
   git commit -m "chore(release): bump version to vX.X.X"
   ```

4. **Create and push tag**:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin main
   git push origin v1.0.0
   ```

## GitHub Actions Workflow

Once you push a tag matching `v*.*.*`, the release workflow automatically:

### 1. Pre-release Tests
- Runs full test suite with coverage verification (80% minimum)
- Executes performance benchmarks
- Validates build process

### 2. Create Release
- Builds the project
- Creates GitHub release with changelog
- Publishes to npm registry

### 3. Deploy Documentation
- Generates documentation site
- Deploys to GitHub Pages

## Monitoring Release Progress

1. **GitHub Actions**: Monitor the workflow at:
   ```
   https://github.com/tosin2013/documcp/actions
   ```

2. **npm package**: Verify publication at:
   ```
   https://www.npmjs.com/package/documcp
   ```

3. **GitHub release**: Check the release page:
   ```
   https://github.com/tosin2013/documcp/releases
   ```

## Release Checklist

Before running the release:

- [ ] All changes committed and pushed to main
- [ ] Tests passing locally (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)
- [ ] npm authentication configured
- [ ] NPM_TOKEN secret configured in GitHub repository

## Troubleshooting

### Release Workflow Fails

**Test failures**: The workflow requires 80% test coverage and all tests to pass.
```bash
npm run test:coverage
```

**npm publish fails**: Check that `NPM_TOKEN` is configured in repository secrets.

**Tag already exists**: Delete the tag and try again:
```bash
git tag -d v1.0.0
git push origin --delete v1.0.0
```

### Version Conflicts

If `npm version` fails due to uncommitted changes:
```bash
git status
git add .
git commit -m "prepare for release"
```

### Permission Issues

Ensure you have publish permissions for the `documcp` package:
```bash
npm owner ls documcp
```

## Post-Release Tasks

After a successful release:

1. **Verify npm package**: Install and test the published package
2. **Update documentation**: Ensure docs reflect the new version
3. **Announce release**: Update relevant channels/communities
4. **Monitor issues**: Watch for any post-release issues

## Version Strategy

DocuMCP follows [Semantic Versioning](https://semver.org/):

- **Patch** (0.2.0 → 0.2.1): Bug fixes, minor improvements
- **Minor** (0.2.0 → 0.3.0): New features, backward compatible
- **Major** (0.2.0 → 1.0.0): Breaking changes

Given the current production-ready status, consider using minor versions for feature additions and reserve major versions for breaking API changes.