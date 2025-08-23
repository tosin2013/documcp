# GitHub Actions CI/CD Pipeline

This directory contains the complete CI/CD pipeline for DocuMCP, implementing automated testing, security, and deployment workflows.

## Workflows Overview

### 🔄 **ci.yml** - Continuous Integration
**Triggers**: Push to main/develop, Pull Requests to main
**Features**:
- Multi-Node.js version testing (20.x, 22.x)
- Type checking with TypeScript
- ESLint code quality checks
- Jest test suite with coverage reporting
- Codecov integration for coverage tracking
- Performance benchmarking (PERF-001 compliance)
- Build verification
- Security auditing with npm audit

### 🚀 **release.yml** - Release Management
**Triggers**: Git tags (v*.*.*), Manual workflow dispatch
**Features**:
- Pre-release testing with 80% coverage enforcement
- Automated GitHub releases with changelog
- npm package publishing
- Documentation deployment to GitHub Pages
- Version bumping (patch/minor/major)

### 🔒 **codeql.yml** - Security Analysis
**Triggers**: Push to main, Pull Requests, Weekly schedule
**Features**:
- GitHub CodeQL security scanning
- JavaScript/TypeScript vulnerability detection
- Security-extended query suite
- Automated security alerts

### 🛡️ **dependency-review.yml** - Dependency Security
**Triggers**: Pull Requests
**Features**:
- Dependency vulnerability scanning
- License compliance checking
- Blocks PRs with moderate+ vulnerabilities
- Allows MIT, Apache, BSD licenses only

### 🤖 **auto-merge.yml** - Dependabot Integration
**Triggers**: Dependabot PRs
**Features**:
- Automatic merging of dependency updates
- Patch and minor version auto-approval
- Maintains security posture

## Available npm Scripts

### Testing & Quality
- `npm run test` - Run test suite
- `npm run test:coverage` - Run tests with coverage
- `npm run test:ci` - CI-optimized test run
- `npm run test:performance` - Performance benchmarks

### Code Quality
- `npm run lint` - ESLint code checking
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Prettier code formatting
- `npm run format:check` - Check code formatting
- `npm run typecheck` - TypeScript type checking

### Validation & Security
- `npm run validate:rules` - Full quality check (lint + typecheck + coverage)
- `npm run security:check` - Security audit
- `npm run ci` - Complete CI pipeline locally

### Build & Release
- `npm run build` - TypeScript compilation
- `npm run prepare` - Pre-publish preparation

## Coverage Requirements

- **Minimum Coverage**: 80%
- **Current Coverage**: 82%+ (exceeds requirement)
- **Enforcement**: Release workflow blocks deployment below threshold
- **Reporting**: Codecov integration with badges

## Security Features

- **Vulnerability Scanning**: npm audit with moderate+ severity blocking
- **Code Analysis**: CodeQL security scanning
- **Dependency Review**: Automated license and vulnerability checks
- **OIDC Authentication**: GitHub Actions use secure OIDC tokens
- **Secret Management**: No hardcoded tokens or credentials

## Performance Compliance

- **PERF-001 Standard**: Repository analysis performance targets
- **Small repos** (<100 files): <1 second
- **Medium repos** (100-1000 files): <10 seconds  
- **Large repos** (1000+ files): <60 seconds

## Branch Protection

Recommended branch protection rules for `main` branch:
- Require status checks (CI workflow)
- Require up-to-date branches
- Require code reviews
- Dismiss stale reviews on push
- Restrict force pushes
- Require linear history

## Deployment Strategy

1. **Development**: Feature branches → Pull Requests
2. **Testing**: Automated CI on every push/PR
3. **Security**: CodeQL and dependency scanning
4. **Release**: Tagged releases trigger automated deployment
5. **Documentation**: Auto-deployed to GitHub Pages

## Monitoring

- **Coverage**: Codecov badges and reporting
- **Security**: GitHub Security tab for alerts
- **Performance**: Benchmark results in CI logs
- **Quality**: ESLint and TypeScript error reporting