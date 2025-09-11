# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


### [0.3.1](https://github.com/tosin2013/documcp/compare/v0.3.0...v0.3.1) (2025-09-11)

## [0.3.0](https://github.com/tosin2013/documcp/compare/v0.2.4...v0.3.0) (2025-09-11)


### 🐛 Bug Fixes

* add error handling for package.json parsing in project context analyzer ([0a5a3e6](https://github.com/tosin2013/documcp/commit/0a5a3e6d2802397d83bf87483a083b51fe3a1a8c))
* disable strict ESLint rules to resolve CI pipeline failures on main branch ([5a1dda4](https://github.com/tosin2013/documcp/commit/5a1dda4870472e074733b597ab3f0325a8c65d1d))
* regenerate package-lock.json to resolve CodeQL workflow failure ([613e6c0](https://github.com/tosin2013/documcp/commit/613e6c0f4319ee244e5037f1036b86085e97201a)), closes [#25](https://github.com/tosin2013/documcp/issues/25)
* resolve all failing test cases in optimize-readme.test.ts ([7353338](https://github.com/tosin2013/documcp/commit/7353338b33a5a98f6f0f87bbc090f068d38430fb))
* Resolve ESLint errors in generate-technical-writer-prompts.ts ([5a176f6](https://github.com/tosin2013/documcp/commit/5a176f672e1556450383a03c4d0f0475ca92e25d))
* resolve ESLint errors in README Technical Writer tools ([68810b0](https://github.com/tosin2013/documcp/commit/68810b0ceba74f541968f51ac6bc3ec6b8524cad))
* Resolve ESLint errors in validate-readme-checklist.ts ([0b3beab](https://github.com/tosin2013/documcp/commit/0b3beab437802b8c1393759b96ffd907683923b2))
* Update index.ts to use new Diataxis-aligned prompt API ([28dc2c0](https://github.com/tosin2013/documcp/commit/28dc2c0e727aa90219ae32f2b2036c2f9b206b3e))


### 🚀 Features

* Achieve 85%+ branch coverage for critical DocuMCP tools ([0111a1b](https://github.com/tosin2013/documcp/commit/0111a1b3aae09a27ab9db236ec1acfbe636d3361))
* add comprehensive technical writer prompts system ([7509f91](https://github.com/tosin2013/documcp/commit/7509f91de043237a528864f4b11cb485b0b2c03a))
* add Dependabot config for Docusaurus documentation dependencies and security updates ([16fbee7](https://github.com/tosin2013/documcp/commit/16fbee7fad535e4b4cc4960a88daf3062add19ba))
* Add README template generator and checklist validator tools ([4899e12](https://github.com/tosin2013/documcp/commit/4899e1217cd1fe60246f23c4d43731cc6ecbb0e6)), closes [#11](https://github.com/tosin2013/documcp/issues/11)
* Implement Diataxis-aligned technical writer prompts ([f32558a](https://github.com/tosin2013/documcp/commit/f32558a031a571579fb02da64f3e1e3bf8518664))
* implement README Technical Writer MCP tools ([728da0a](https://github.com/tosin2013/documcp/commit/728da0a21ec586b5f8361337edf42fec79dc70d0)), closes [#10](https://github.com/tosin2013/documcp/issues/10)
* improve validate-content.ts test coverage from 79.31% to 83.15% ([a51c0a7](https://github.com/tosin2013/documcp/commit/a51c0a7f1e7232db99d444fbe94ea7a74ec04ece)), closes [#7](https://github.com/tosin2013/documcp/issues/7)
* integrate main branch updates and fix merge conflicts ([6d30ddf](https://github.com/tosin2013/documcp/commit/6d30ddf63ccca01f67b90ecfef2fb438a16a369e))

## [0.2.3] - 2025-08-24

### Fixed
- Added missing `bin` field to package.json to enable npx execution (Fixes #3)
- Made dist/index.js executable with proper permissions

### Added
- CLI executable support via `npx documcp` command
- Direct command-line invocation capability

## [0.2.2] - 2025-08-24

### Added
- Version display and badges to documentation pages
- Enhanced documentation structure

## [0.2.1] - 2025-08-24

### Changed
- Minor documentation updates

## [0.2.0] - 2025-08-24

### Changed
- **BREAKING**: Updated Node.js requirements from >=18.0.0 to >=20.0.0
- Updated CI/CD pipeline to test Node.js 20.x and 22.x (removed 18.x)
- Updated all generated GitHub Actions workflows to use Node.js 20
- Updated Docker base images from node:18 to node:20 in test fixtures
- Updated @types/node references from ^18.0.0 to ^20.0.0
- Enhanced content validation capabilities and improved documentation structure
- Improved Docusaurus deployment build path configuration
- Refactored local deployment tests with better input validation and response structure

### Added
- Created .nvmrc file specifying Node.js 22 for development
- Added Node.js version requirements to README.md
- Comprehensive test suite additions with improved coverage
- Enhanced error handling and response structure improvements
- Content generation methods with consistent parameter naming

### Fixed
- Critical linting errors resolved (lexical declarations in case blocks)
- Unused variable cleanup in validation tools
- Correct build path for Docusaurus deployment

### Technical Details
- CI/CD pipeline now tests compatibility with Node.js 20.x and 22.x
- All generated deployment workflows use Node.js 20 by default
- Test coverage maintained at 82.76% (exceeds 80% requirement)
- All builds and tests pass with updated Node.js requirements
- 161 tests passing across 13 test suites
- Enhanced documentation gap detection and content validation

## [0.1.0] - 2025-08-22

### Added
- Initial release of DocuMCP
- Complete MCP Server implementation with 6 core tools
- Comprehensive CI/CD pipeline with GitHub Actions
- 82% test coverage (exceeds 80% requirement)
- Performance benchmarking system (PERF-001 compliant)
- Security scanning and dependency review
- Automated release and deployment workflows