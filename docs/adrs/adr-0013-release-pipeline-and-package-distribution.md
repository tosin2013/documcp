---
id: 013-release-pipeline-and-package-distribution
title: "ADR-013: Release Pipeline and Package Distribution Architecture"
sidebar_label: "ADR-013: Release Pipeline Architecture"
sidebar_position: 13
documcp:
  last_updated: "2025-01-14T00:00:00.000Z"
  last_validated: "2025-12-12T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: dbef13f
status: accepted
date: "2025-01-14"
---

# ADR-013: Release Pipeline and Package Distribution Architecture

## Status

Accepted

## Date

2025-01-14

## Implementation Date

2025-01-14

## Context

DocuMCP needs a robust release pipeline for package distribution via npm and automated changelog generation. Current manual processes lead to inconsistencies, missed entries, and potential publication failures. The project requires architectural decisions for automation, verification, and quality assurance in the release process.

**Core Problems**:

1. **npm Package Publishing** (Issue #1): Release workflow is configured to publish to npm, but package "documcp" is not found on the npm registry, indicating either publication failures or configuration issues
2. **Manual Changelog Updates** (Issue #2): Changelog updates are currently manual, leading to potential inconsistencies and missed entries
3. **Test Coverage Gaps** (Issue #3): Current test coverage (82.59%) is below the 85% target threshold
4. **Inconsistent Commit Messages**: Lack of conventional commit standards makes automated processing difficult

**Current State**:

- Basic release workflow exists in `.github/workflows/release.yml`
- Manual `CHANGELOG.md` updates
- Partial conventional commit adoption
- No publication verification
- No automated changelog generation

**Strategic Importance**: Release pipeline quality directly impacts:

- Package availability and distribution
- User trust and adoption
- Developer experience and workflow efficiency
- Documentation accuracy and completeness

## Decision

We will implement an automated release pipeline with npm package publishing, conventional commits enforcement via commitlint, automated changelog generation using standard-version, and comprehensive verification steps. The pipeline will include publication verification, error handling, retry mechanisms, and quality gates for test coverage and commit message standards.

### Release Pipeline Architecture:

#### 1. Conventional Commits Enforcement

**Purpose**: Standardize commit messages for automated processing
**Implementation**:

- **commitlint**: Enforce conventional commit format
- **Husky hooks**: Pre-commit validation of commit messages
- **Commit message format**: `type(scope): subject` (e.g., `feat(tools): add cleanup agent artifacts`)
- **Types**: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

#### 2. Automated Changelog Generation

**Purpose**: Generate consistent, comprehensive changelogs automatically
**Implementation**:

- **standard-version**: Automated version bumping and changelog generation
- **Categorization**: Features, Bug Fixes, Documentation, Chores, etc.
- **Integration**: GitHub Releases with generated changelog content
- **Version management**: Semantic versioning (major.minor.patch)

#### 3. npm Package Publishing

**Purpose**: Reliable package distribution via npm registry
**Implementation**:

- **Publication verification**: Verify package exists after publish
- **Error handling**: Retry mechanisms for transient failures
- **Token management**: Secure NPM_TOKEN handling
- **Dry-run testing**: Validate publication before actual release

#### 4. Quality Gates

**Purpose**: Ensure release quality and reliability
**Gates**:

- **Test coverage**: Minimum 85% statement coverage
- **Commit message validation**: All commits follow conventional format
- **Build verification**: All tests pass before release
- **Publication verification**: Confirm package availability after publish

### Implementation Details:

#### Conventional Commits Setup

```typescript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "test",
        "chore",
        "perf",
        "ci",
        "build",
        "revert",
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
  },
};
```

#### Automated Changelog Configuration

```javascript
// .versionrc.js
module.exports = {
  types: [
    { type: "feat", section: "✨ Features" },
    { type: "fix", section: "🐛 Bug Fixes" },
    { type: "docs", section: "📚 Documentation" },
    { type: "style", section: "💎 Styles" },
    { type: "refactor", section: "📦 Code Refactoring" },
    { type: "perf", section: "⚡ Performance Improvements" },
    { type: "test", section: "✅ Tests" },
    { type: "build", section: "👷 Build System" },
    { type: "ci", section: "🔧 CI/CD" },
    { type: "chore", section: "♻️ Chores" },
    { type: "revert", section: "⏪ Reverts" },
  ],
  releaseCommitMessageFormat: "chore(release): {{currentTag}}",
  bumpFiles: [
    {
      filename: "package.json",
      type: "json",
    },
    {
      filename: "package-lock.json",
      type: "json",
    },
  ],
};
```

#### npm Publishing with Verification

```yaml
# .github/workflows/release.yml (excerpt)
- name: Publish to npm
  run: |
    npm publish --access public || {
      echo "Publication failed, will retry..."
      sleep 5
      npm publish --access public
    }
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

- name: Verify npm publication
  run: |
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    npm view documcp@${PACKAGE_VERSION} || {
      echo "Package verification failed"
      exit 1
    }

- name: Test package installation
  run: |
    npm install -g documcp@${PACKAGE_VERSION}
    documcp --version
```

#### Quality Gates Implementation

```yaml
# Quality gates in release workflow
- name: Check test coverage
  run: |
    COVERAGE=$(npm run test:coverage -- --coverageReporters=text-summary | grep "Statements" | awk '{print $2}' | sed 's/%//')
    if (( $(echo "$COVERAGE < 85" | bc -l) )); then
      echo "Test coverage ${COVERAGE}% is below 85% threshold"
      exit 1
    fi

- name: Validate commit messages
  run: |
    npx commitlint --from origin/main --to HEAD --verbose
```

## Alternatives Considered

### Manual Release Process

- **Pros**: Full control, no tooling dependencies, simple workflow
- **Cons**: Error-prone, inconsistent, time-consuming, human error risk
- **Decision**: Rejected - manual processes are unreliable and don't scale

### Third-Party Release Tools (semantic-release)

- **Pros**: More features, GitHub integration, automated releases
- **Cons**: Higher complexity, more dependencies, steeper learning curve
- **Decision**: Considered but standard-version chosen for simplicity and control

### GitHub-Only Distribution

- **Pros**: Simpler, no npm account needed, GitHub-native
- **Cons**: Not standard for Node.js packages, limited discoverability, poor developer experience
- **Decision**: Rejected - npm is the standard distribution channel for Node.js packages

### No Changelog Automation

- **Pros**: Simpler implementation, no tooling overhead
- **Cons**: Manual process is unreliable, inconsistent formatting, missed entries
- **Decision**: Rejected - automated changelog is essential for documentation quality

## Consequences

### Positive

- **Consistent Releases**: Automated process ensures consistent, reliable releases
- **Reduced Errors**: Automation eliminates human error in versioning and changelog generation
- **Improved Documentation**: Automated changelog ensures comprehensive release documentation
- **Better Developer Experience**: Conventional commits provide clear project history
- **Reliable Distribution**: Publication verification ensures package availability
- **Quality Assurance**: Quality gates prevent low-quality releases

### Negative

- **Tooling Complexity**: Additional tools (commitlint, husky, standard-version) require maintenance
- **Learning Curve**: Team must learn and adopt conventional commit format
- **External Dependencies**: Dependency on npm registry availability and reliability
- **CI/CD Maintenance**: Release pipeline requires ongoing maintenance and updates
- **Initial Setup**: Requires configuration and integration work

### Risks and Mitigations

- **npm Publication Failures**: Implement retry mechanisms and verification steps
- **Commit Message Rejection**: Provide clear documentation and pre-commit hooks
- **Tool Compatibility**: Test tools with Node.js 20+ and maintain compatibility
- **Coverage Regression**: Set quality gates and monitor coverage trends

## Integration Points

### GitHub Actions Integration (ADR-005)

- Release pipeline integrates with GitHub Pages deployment workflow
- Shared secrets and configuration management
- Coordinated release and deployment processes

### MCP Server Architecture (ADR-001)

- Package distribution enables MCP server installation via npm
- Version management aligns with MCP SDK compatibility
- Release process supports MCP protocol evolution

### Documentation System (ADR-004, ADR-008)

- Automated changelog integrates with Diataxis documentation structure
- Release notes follow documentation standards
- Version documentation supports user guidance

## Implementation Roadmap

### Phase 1: Foundation (High Priority)

- Set up commitlint configuration
- Configure Husky hooks for commit validation
- Add standard-version for changelog generation
- Update release workflow with basic automation

### Phase 2: npm Publishing (High Priority)

- Verify NPM_TOKEN configuration
- Add publication verification steps
- Implement error handling and retry mechanisms
- Test complete publication flow

### Phase 3: Quality Gates (Medium Priority)

- Implement test coverage gate (85% threshold)
- Add commit message validation in CI
- Create release health monitoring
- Document release process

### Phase 4: Advanced Features (Low Priority)

- AI-enhanced release notes (Issue #7)
- Release health dashboard (Issue #8)
- Smart Dependabot auto-merge (Issue #6)
- Enhanced release notes with metrics

## Quality Assurance

### Release Process Testing

```typescript
describe("Release Pipeline", () => {
  it("should validate commit messages");
  it("should generate changelog correctly");
  it("should publish to npm successfully");
  it("should verify package availability");
  it("should enforce quality gates");
});
```

### Verification Checklist

- [ ] Commit messages follow conventional format
- [ ] Changelog automatically generated and accurate
- [ ] Package published to npm successfully
- [ ] Package verification passes
- [ ] Test coverage meets 85% threshold
- [ ] All tests pass before release
- [ ] GitHub Release created with changelog

## Success Metrics

### Release Quality

- **Publication Success Rate**: 100% successful npm publications
- **Changelog Accuracy**: 100% of commits included in changelog
- **Coverage Compliance**: 100% of releases meet 85% coverage threshold
- **Commit Compliance**: 100% of commits follow conventional format

### Developer Experience

- **Release Time**: Under 10 minutes from tag to publication
- **Error Rate**: Under 1% release failures
- **Documentation Quality**: Comprehensive release notes for all releases

## Future Enhancements

### Advanced Automation

- AI-powered release note generation (Issue #7)
- Release health dashboard with metrics (Issue #8)
- Automated dependency updates with Dependabot (Issue #6)
- Multi-package monorepo support

### Quality Improvements

- Performance benchmarking in releases
- Security scanning integration
- Automated compatibility testing
- Release rollback capabilities

## Implementation Status

**Status**: ✅ Implemented (2025-01-14)

**Commit**: dbef13f - "feat(release): implement npm publishing verification and automated changelog (#1, #2)"

### Completed Features

1. **npm Publishing Verification** ✅

   - Authentication verification before publishing
   - Retry mechanism (3 attempts with 5-second delays)
   - Publication verification step (checks package exists on npm registry)
   - Package installation test after publication

2. **Automated Changelog Generation** ✅

   - standard-version integration verified and working
   - Enhanced changelog extraction in release workflow
   - Improved error handling for changelog generation
   - Proper integration with GitHub Releases

3. **Commit Message Validation** ✅

   - Pre-release commit message validation added
   - Validates commits follow conventional format
   - Clear error messages for invalid commits

4. **Quality Gates** ✅
   - Coverage threshold updated from 80% to 85%
   - Test coverage check integrated (currently 91.65%)
   - Build verification before release

### Implementation Files

- `.github/workflows/release.yml` - Source of implementation; it wires the `test` job (coverage gate, commitlint validation, performance and build checks) with the `release` job (conventional commits validation, npm publication + retry, publication verification, GitHub Release + changelog, and package installation smoke tests).
- `commitlint.config.js` - Already configured (no changes needed)
- `.versionrc.json` - Already configured (no changes needed)
- `.husky/commit-msg` - Already configured (no changes needed)

### Verification

- ✅ `npm run release:dry-run` tested and working
- ✅ Changelog generation verified
- ✅ All quality gates in place
- ✅ Error handling implemented throughout

## References

- [ADR-001: MCP Server Architecture](adr-0001-mcp-server-architecture.md)
- [ADR-005: GitHub Pages Deployment Automation](adr-0005-github-pages-deployment-automation.md)
- GitHub Issue: #1 - Fix npm Package Publishing (✅ Fixed)
- GitHub Issue: #2 - Implement Automated Changelog Generation (✅ Implemented)
- GitHub Issue: #3 - Improve Test Coverage to 85% (✅ Exceeded - 91.65%)
- Commit: dbef13f - Implementation commit
- [Conventional Commits](https://www.conventionalcommits.org/)
- [standard-version](https://github.com/conventional-changelog/standard-version)
- [commitlint](https://commitlint.js.org/)
