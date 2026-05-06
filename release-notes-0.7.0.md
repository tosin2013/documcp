## [0.7.0](https://github.com/tosin2013/documcp/compare/v0.6.0...v0.7.0) (2026-05-06)

### 🚀 Features

- implement community insights aggregation (Phase 3) ([#147](https://github.com/tosin2013/documcp/issues/147)) ([a06f515](https://github.com/tosin2013/documcp/commit/a06f51558d090aefdd85e512554bb7d503044d2a))
- **drift:** add priority scoring feedback ingestion loop (#114) ([#114](https://github.com/tosin2013/documcp/issues/114)) ([e4ba20d](https://github.com/tosin2013/documcp/commit/e4ba20df094bd6969a3dbe29b6dc85dfed69281c)) - ADRs: [adr-0012-priority-scoring-system-for-documentation-drift](docs/adrs/adr-0012-priority-scoring-system-for-documentation-drift.md)
- **watcher:** persist watcher state to JSONL and add integration tests (#113) ([#113](https://github.com/tosin2013/documcp/issues/113)) ([3c94642](https://github.com/tosin2013/documcp/commit/3c94642aa78f342e1ff283e743415c730052834c))
- **ast:** wire up tree-sitter parsers for Python and Go (#112) ([#112](https://github.com/tosin2013/documcp/issues/112)) ([c056e45](https://github.com/tosin2013/documcp/commit/c056e45f61a04ab894298522ad75bbb795861a17))

### 🐛 Bug Fixes

- **deps,docs:** bump @docusaurus/core to 3.10.1 and force serialize-javascript@^7.0.5 ([159eb9d](https://github.com/tosin2013/documcp/commit/159eb9db2155fbf301dd10dca4a35567942363eb))

### 🔄 CI/CD

- skip commitlint validation for Copilot bootstrap commits ([#143](https://github.com/tosin2013/documcp/issues/143)) ([0369452](https://github.com/tosin2013/documcp/commit/03694525835fc98911994aef470f3bbaeb2cd96f))
- **pages:** consolidate GitHub Pages deployment into deploy-docs.yml ([4b429ba](https://github.com/tosin2013/documcp/commit/4b429ba58b62e2faf0ded84e595526a5f4340077))

### 🔧 Chores

- **release:** 0.7.0 ([4ef7ab5](https://github.com/tosin2013/documcp/commit/4ef7ab54db5a474879dbd28100a6348ab5135d2d))
- **deps:** bump picomatch from 2.3.1 to 2.3.2 in /docs ([#148](https://github.com/tosin2013/documcp/issues/148)) ([dc2b1cf](https://github.com/tosin2013/documcp/commit/dc2b1cf16a4903e194104c2dda037622a6a36af8))
- **deps:** bump ajv from 8.17.1 to 8.20.0 in /docs ([#142](https://github.com/tosin2013/documcp/issues/142)) ([c7aac06](https://github.com/tosin2013/documcp/commit/c7aac0633de1419c5bcf9aecbbf35b37235689a2))
- **deps:** bump minimatch, @typescript-eslint/eslint-plugin and @typescript-eslint/parser ([#141](https://github.com/tosin2013/documcp/issues/141)) ([5313666](https://github.com/tosin2013/documcp/commit/5313666c374bb083ed6883acd8d212fa3a5637b3))
- **lint,ci:** prepare base for @typescript-eslint v8 + minimatch ReDoS fix (PR #141) ([0c3548f](https://github.com/tosin2013/documcp/commit/0c3548fdbce62515933c5f9b76bf01072a16c56b))

### 📋 Architecture Decisions

The following ADRs were modified in this release:

- [adr-0012-priority-scoring-system-for-documentation-drift](docs/adrs/adr-0012-priority-scoring-system-for-documentation-drift.md)

### 📦 Dependency Updates

- **@typescript-eslint/eslint-plugin** (dev): ^6.19.0 → ^8.59.1
- **@typescript-eslint/parser** (dev): ^6.19.0 → ^8.59.1
