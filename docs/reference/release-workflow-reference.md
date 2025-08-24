# Release Workflow Reference

Technical reference for the DocuMCP release automation system.

## Release Script (`release.sh`)

### Synopsis
```bash
./release.sh [VERSION_TYPE]
```

### Parameters
- `VERSION_TYPE`: `major`, `minor`, or `patch` (default: `patch`)

### Exit Codes
- `0`: Success
- `1`: Error (invalid branch, dirty working directory, invalid version type, etc.)

### Functions

#### `print_status(message)`
Prints green status messages prefixed with `[RELEASE]`.

#### `print_warning(message)`  
Prints yellow warning messages prefixed with `[WARNING]`.

#### `print_error(message)`
Prints red error messages prefixed with `[ERROR]`.

### Validation Checks
1. **Branch validation**: Must be on `main` branch
2. **Working directory**: Must be clean (no uncommitted changes)
3. **Version type**: Must be `major`, `minor`, or `patch`

### Version Calculation
Uses semantic versioning rules:
```bash
# Current: 0.2.0
patch: 0.2.0 → 0.2.1
minor: 0.2.0 → 0.3.0  
major: 0.2.0 → 1.0.0
```

## GitHub Actions Workflow

### Workflow File
`.github/workflows/release.yml`

### Triggers

#### Tag-based Release
```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

#### Manual Dispatch
```yaml
on:
  workflow_dispatch:
    inputs:
      version_type:
        description: 'Version bump type'
        required: true
        default: 'patch'
        type: choice
        options: [patch, minor, major]
```

### Jobs

#### Job: `test`
**Purpose**: Pre-release validation  
**Runner**: `ubuntu-latest`

**Steps**:
1. Checkout code (`actions/checkout@v4`)
2. Setup Node.js 20.x (`actions/setup-node@v4`)
3. Install dependencies (`npm ci`)
4. Run test suite with coverage (`npm test -- --coverage`)
5. Verify 80% coverage threshold
6. Run performance benchmarks (`npm run test:performance`)
7. Build verification (`npm run build`)

**Coverage Validation**:
```bash
coverage=$(npm test -- --coverage --silent | grep "All files" | awk '{print $4}' | sed 's/%//')
if (( $(echo "$coverage < 80" | bc -l) )); then
  echo "Coverage $coverage% is below 80% threshold"
  exit 1
fi
```

#### Job: `release`
**Purpose**: Create release and publish to npm  
**Runner**: `ubuntu-latest`  
**Depends on**: `test`

**Permissions**:
```yaml
permissions:
  contents: write
  packages: write
```

**Environment Variables**:
- `NODE_AUTH_TOKEN`: `${{ secrets.NPM_TOKEN }}`
- `GITHUB_TOKEN`: `${{ secrets.GITHUB_TOKEN }}`

**Steps**:
1. Checkout with full history (`fetch-depth: 0`)
2. Setup Node.js with npm registry
3. Install dependencies and build
4. Generate changelog
5. Create GitHub release (tag-triggered only)
6. Publish to npm (tag-triggered only)

**Release Body Template**:
```markdown
## DocuMCP Release ${{ github.ref_name }}

### Features
- MCP Server for intelligent documentation deployment
- Repository analysis and SSG recommendations
- Automated GitHub Pages deployment workflows

### Coverage
- Test Coverage: 80%+ (requirement met)
- Performance: PERF-001 compliant
- Security: Automated dependency scanning

### Installation
npm install -g documcp@${{ github.ref_name }}
```

#### Job: `docs`
**Purpose**: Deploy documentation to GitHub Pages  
**Runner**: `ubuntu-latest`  
**Depends on**: `test`, `release`

**Permissions**:
```yaml
permissions:
  pages: write
  id-token: write
```

**Documentation Structure**:
```
docs-site/
├── index.md (from README.md)
├── docs/ (copied recursively)
└── coverage/ (test coverage reports)
```

## Secrets Configuration

### Required Repository Secrets

#### `NPM_TOKEN`
**Purpose**: Authenticate npm package publishing  
**Type**: npm automation token  
**Scope**: Publish access to `documcp` package

**Setup**:
1. Generate token at https://www.npmjs.com/settings/tokens
2. Select "Automation" token type
3. Add to GitHub repository secrets

#### `GITHUB_TOKEN`
**Purpose**: Create GitHub releases  
**Type**: Automatic (provided by GitHub Actions)  
**Scope**: Repository contents and releases

## npm Package Configuration

### `package.json` Fields
```json
{
  "name": "documcp",
  "version": "0.2.0",
  "main": "dist/index.js",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Build Configuration
- **Source**: `src/`
- **Output**: `dist/`  
- **Build command**: `npm run build` (TypeScript compilation)
- **Prepare hook**: `npm run build` (runs before publish)

### Publication Files
Included in npm package:
- `dist/` (compiled JavaScript)
- `package.json`
- `README.md`
- `LICENSE`

## Error Handling

### Common Release Failures

#### Coverage Below 80%
```
Coverage 75% is below 80% threshold
```
**Solution**: Increase test coverage before releasing

#### npm Authentication Failed
```
npm ERR! code E401
npm ERR! 401 Unauthorized
```
**Solution**: Verify `NPM_TOKEN` secret is configured correctly

#### Tag Already Exists
```
fatal: tag 'v1.0.0' already exists
```
**Solution**: Delete existing tag or increment version

#### Build Failure
```
npm ERR! code 2
```
**Solution**: Fix TypeScript compilation errors

### Rollback Procedures

#### Unpublish from npm (within 24 hours)
```bash
npm unpublish documcp@1.0.0
```

#### Delete GitHub Release
1. Go to repository releases
2. Click "Delete" on the problematic release
3. Delete associated git tag:
   ```bash
   git tag -d v1.0.0
   git push origin --delete v1.0.0
   ```

## Performance Benchmarks

The release workflow includes performance validation:

### `npm run test:performance`
Executes benchmark tests ensuring:
- Memory usage within acceptable limits
- Response time thresholds met
- Throughput requirements satisfied

### Benchmark Compliance
Must meet PERF-001 compliance standards as defined in project benchmarks.