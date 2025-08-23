# Changelog

All notable changes to DocuMCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Updated Node.js requirements from >=18.0.0 to >=20.0.0
- Updated CI/CD pipeline to test Node.js 20.x and 22.x (removed 18.x)
- Updated all generated GitHub Actions workflows to use Node.js 20
- Updated Docker base images from node:18 to node:20 in test fixtures
- Updated @types/node references from ^18.0.0 to ^20.0.0

### Added
- Created .nvmrc file specifying Node.js 22 for development
- Added Node.js version requirements to README.md

### Technical Details
- CI/CD pipeline now tests compatibility with Node.js 20.x and 22.x
- All generated deployment workflows use Node.js 20 by default
- Test coverage maintained at 82% (exceeds 80% requirement)
- All builds and tests pass with updated Node.js requirements

## [0.1.0] - 2025-08-22

### Added
- Initial release of DocuMCP
- Complete MCP Server implementation with 6 core tools
- Comprehensive CI/CD pipeline with GitHub Actions
- 82% test coverage (exceeds 80% requirement)
- Performance benchmarking system (PERF-001 compliant)
- Security scanning and dependency review
- Automated release and deployment workflows