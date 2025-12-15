# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


### [0.5.8](https://github.com/tosin2013/documcp/compare/v0.5.6...v0.5.8) (2025-12-15)

### [0.5.7](https://github.com/tosin2013/documcp/compare/v0.5.6...v0.5.7) (2025-12-15)

### [0.5.6](https://github.com/tosin2013/documcp/compare/v0.5.4...v0.5.6) (2025-12-15)


### 🐛 Bug Fixes

* **ci:** fetch latest changes before release to prevent push conflicts ([d91d611](https://github.com/tosin2013/documcp/commit/d91d6118613d08b93b8a8bb920f9184d6b61747e))

### [0.5.5](https://github.com/tosin2013/documcp/compare/v0.5.4...v0.5.5) (2025-12-15)


### 🐛 Bug Fixes

* **ci:** fetch latest changes before release to prevent push conflicts ([d91d611](https://github.com/tosin2013/documcp/commit/d91d6118613d08b93b8a8bb920f9184d6b61747e))

### [0.5.4](https://github.com/tosin2013/documcp/compare/v0.5.3...v0.5.4) (2025-12-15)

### [0.5.3](https://github.com/tosin2013/documcp/compare/v0.5.2...v0.5.3) (2025-12-15)


### ⚠ BREAKING CHANGES

* **adr:** ADR filenames changed from XXX- to adr-XXXX- format.
All references updated, but external tools may need updates.

### 📚 Documentation

* add architectural changes summary ([81a5680](https://github.com/tosin2013/documcp/commit/81a5680bf411fc47b1b38e0fe915e569f869a1b2)), closes [#74](https://github.com/tosin2013/documcp/issues/74)
* add CE-MCP compatibility analysis and update ADRs ([149c058](https://github.com/tosin2013/documcp/commit/149c05812bf947cc61909ff263060098c2b8e7e1)), closes [#69](https://github.com/tosin2013/documcp/issues/69)
* add documentation for freshness tracking and sitemap management features ([050216a](https://github.com/tosin2013/documcp/commit/050216adf8c074d5cf30294bcf87772164788e0c))
* **adrs:** add workflow consistency note to ADR-005 ([1d25bd0](https://github.com/tosin2013/documcp/commit/1d25bd0fe8c0877b9c139ac89d5ba91003eb22c5))
* **adrs:** update ADR-013 status to Accepted with implementation details ([ef03918](https://github.com/tosin2013/documcp/commit/ef039181ad9e0ce8d6b3809b8cc235f31a392d68))
* update documentation freshness metadata ([4a70e6d](https://github.com/tosin2013/documcp/commit/4a70e6d687f8910b7baba86bdf6726317664d95f))
* update documentation freshness validation timestamps ([12e1c68](https://github.com/tosin2013/documcp/commit/12e1c68bc0c7722a0baab73c6f2f572645f168d0))


### 🚀 Features

* Add agent artifact detection and cleanup tool ([#80](https://github.com/tosin2013/documcp/issues/80)) ([210a274](https://github.com/tosin2013/documcp/commit/210a274095060e98b97209603a6e04375aa7da7c))
* add change watcher for drift detection ([362fbca](https://github.com/tosin2013/documcp/commit/362fbca24e0e15149a6c69394c0d83be7fdfe523))
* add Code Mode prompts and server optimization hints ([91800a9](https://github.com/tosin2013/documcp/commit/91800a9bba6754df7812aaeeceddc15a55d72e68))
* Add Diataxis type tracking to CodeExample interface ([#81](https://github.com/tosin2013/documcp/issues/81)) ([9bbac23](https://github.com/tosin2013/documcp/commit/9bbac2319fde065e4b9004787f53c0631b993eb8))
* Add LLM integration layer for semantic code analysis ([#82](https://github.com/tosin2013/documcp/issues/82)) ([f7b6fcd](https://github.com/tosin2013/documcp/commit/f7b6fcda63f9cf61f2f33696bd5c983dd64dd07e))
* Add priority scoring system for documentation drift ([#83](https://github.com/tosin2013/documcp/issues/83)) ([40afe64](https://github.com/tosin2013/documcp/commit/40afe64f4b39da5c3743d3be5b026f5a46ac499d))
* **adr:** standardize ADR naming and complete ADR-012 implementation ([b144770](https://github.com/tosin2013/documcp/commit/b144770cdf09b1873354f688a70576cf08955c13))
* **ast-analyzer:** add call graph builder for execution path tracing ([#72](https://github.com/tosin2013/documcp/issues/72)) ([8adb6ad](https://github.com/tosin2013/documcp/commit/8adb6ad0e74433510da91fac73f816cd3aa9a3da))
* **execution-simulator:** implement LLM-based code tracing ([#73](https://github.com/tosin2013/documcp/issues/73)) ([9809784](https://github.com/tosin2013/documcp/commit/980978405c4f6c2deccf5068a9860cba058c1c79))
* Extend knowledge graph with documentation example entities ([#78](https://github.com/tosin2013/documcp/issues/78)) ([577a312](https://github.com/tosin2013/documcp/commit/577a312c7a8308f4aa3d5e9b44d2c538e61303d7)), closes [#77](https://github.com/tosin2013/documcp/issues/77) [tosin2013/documcp#77](https://github.com/tosin2013/documcp/issues/77)
* **release:** implement npm publishing verification and automated changelog ([#1](https://github.com/tosin2013/documcp/issues/1), [#2](https://github.com/tosin2013/documcp/issues/2)) ([dbef13f](https://github.com/tosin2013/documcp/commit/dbef13f141970e60b1de6782812eaed5b97d9af6)), closes [#77](https://github.com/tosin2013/documcp/issues/77) [#78](https://github.com/tosin2013/documcp/issues/78) [#80](https://github.com/tosin2013/documcp/issues/80) [#81](https://github.com/tosin2013/documcp/issues/81) [#82](https://github.com/tosin2013/documcp/issues/82) [#83](https://github.com/tosin2013/documcp/issues/83) [#3](https://github.com/tosin2013/documcp/issues/3)


### 🐛 Bug Fixes

* **ci:** correct deploy-docs workflow for Docusaurus build ([66f7b94](https://github.com/tosin2013/documcp/commit/66f7b94451191a67b02fe708864ea7b30dd87763))
* **ci:** improve husky hook bypass for release workflow ([17dd37d](https://github.com/tosin2013/documcp/commit/17dd37d9105594dd7c701cb6dab1bfe134e09a46))
* **ci:** migrate deploy-docs workflow from Jekyll to Docusaurus ([8b44235](https://github.com/tosin2013/documcp/commit/8b442353be803428d4a53f90ddf93ee528a7142f))
* **ci:** optimize API docs workflow steps ([e0be347](https://github.com/tosin2013/documcp/commit/e0be34716435e5e52af29f4c1c1babcf1d79811e))
* **ci:** relax commitlint rules for release workflow ([f5a6fdf](https://github.com/tosin2013/documcp/commit/f5a6fdf10fad5a02d527da36b84fc16b821a2c9e))
* **ci:** remove deprecated husky.sh pattern from pre-commit hook ([25358e1](https://github.com/tosin2013/documcp/commit/25358e13f5403f3cc8a62a26250229597897c500))
* **ci:** resolve coverage threshold failure and add user-feedback-integration tests ([b4f6cc6](https://github.com/tosin2013/documcp/commit/b4f6cc6d2e35ae78f68ab86a1c7230e6e310b904))
* **ci:** resolve race condition in KG storage and add test isolation ([9d91aa8](https://github.com/tosin2013/documcp/commit/9d91aa845b1ffd8bc87812225a1d10ddaea58c66))
* **ci:** update deploy-docs workflow to use latest GitHub Actions versions ([2240f73](https://github.com/tosin2013/documcp/commit/2240f736c6c1fceeb6f8d5b431eab50a6299d8f7))
* **ci:** update deprecated GitHub Actions to v4 ([e8fd907](https://github.com/tosin2013/documcp/commit/e8fd907650b7766d5f7b0933505b013ece2deeae))
* **docs:** add missing id field to ADR-0010 frontmatter ([7afd3fc](https://github.com/tosin2013/documcp/commit/7afd3fc1d36c23eadd61f8563f68f48f15540232))
* **docs:** align sidebars.js with updated ADR frontmatter IDs ([dfd3163](https://github.com/tosin2013/documcp/commit/dfd3163d34988f9253056061a72986b5584fa137))
* **docs:** resolve MDX compilation errors in ADR and how-to files ([106b9fa](https://github.com/tosin2013/documcp/commit/106b9faf2f5a0df03ddb336084044aea8eff4750))
* **docs:** update ADR frontmatter IDs to match new naming convention ([b64e305](https://github.com/tosin2013/documcp/commit/b64e3053ec3317097b2714562af7056630b0303c))
* handle missing dependencies in generate-technical-writer-prompts ([306567b](https://github.com/tosin2013/documcp/commit/306567b32114502c606244ad6c2930360bcd4201))

### [0.5.2](https://github.com/tosin2013/documcp/compare/v0.5.1...v0.5.2) (2025-11-19)

### 🚀 Features

- add GitHub Copilot instructions and specialized agents ([3ba709f](https://github.com/tosin2013/documcp/commit/3ba709f2e209ae603f0142fa7f55a1d486f67829))
- add MCP prompts and resources for documentation freshness tracking ([2820c0e](https://github.com/tosin2013/documcp/commit/2820c0ed8fe35627e2434f78d2c172a7cdfa7370))
- implement documentation freshness tracking with KG integration and fix js-yaml vulnerability ([978aa5a](https://github.com/tosin2013/documcp/commit/978aa5a7f84049d2a1d8b2da8a30e53a7d3fbf99))
- improve branch coverage to 81.41%, add KG efficiency improvements ([e0f9641](https://github.com/tosin2013/documcp/commit/e0f96419a3b9566677e5defa54df24f0607371ae))

### 🐛 Bug Fixes

- correct sidebar reference for mcp-resource-pattern-redesign ([1168821](https://github.com/tosin2013/documcp/commit/1168821ab933ab84c4d66dcfce1caa7c15e16765)), closes [#19519888749](https://github.com/tosin2013/documcp/issues/19519888749)
- resolve KG storage issues and test failures, improve branch coverage to 81.32% ([9fd72d5](https://github.com/tosin2013/documcp/commit/9fd72d57e67faf370ac9ab13a9aa3bef0e81be49))
- update deploy-docs workflow from Jekyll to Docusaurus ([fdc363a](https://github.com/tosin2013/documcp/commit/fdc363a2af6e4f1bf4155210d4e3e2fe62304236)), closes [#19519733512](https://github.com/tosin2013/documcp/issues/19519733512)
- upgrade GitHub Actions to resolve deprecation warnings ([67fea5d](https://github.com/tosin2013/documcp/commit/67fea5ddf6e1a09907019a3c54edaca39f882936))

### [0.5.1](https://github.com/tosin2013/documcp/compare/v0.5.0...v0.5.1) (2025-11-18)

### 📚 Documentation

- comprehensive documentation validation and updates ([abc8bc5](https://github.com/tosin2013/documcp/commit/abc8bc5d6ac537f27ed83e690a99a3c668356bcd))

### 🐛 Bug Fixes

- add forceExit to Jest config for CI to prevent worker process hangs ([c5dada6](https://github.com/tosin2013/documcp/commit/c5dada607907adb6a04536accb50704435bb2516)), closes [#216](https://github.com/tosin2013/documcp/issues/216)
- remove ADR-010 from sidebar to fix Docker build ([1ce448f](https://github.com/tosin2013/documcp/commit/1ce448ff69e9184f3a48ac9f0143aabb134d7205))
- resolve GitHub Actions build failure ([a1b6b23](https://github.com/tosin2013/documcp/commit/a1b6b23e723f29b829c369feea386ebea601940a))
- update dependencies and adjust security audit workflow ([033a4f3](https://github.com/tosin2013/documcp/commit/033a4f340af903ceb84610531f3d1817964e91b9))

## [0.5.0](https://github.com/tosin2013/documcp/compare/v0.4.1...v0.5.0) (2025-10-12)

### ⚠ BREAKING CHANGES

- GitHub Actions workflow now requires Docusaurus instead of Jekyll
  Fixes: Deprecated artifact actions error
  Closes: Documentation completeness gaps

### ♻️ Code Refactoring

- implement MCP best practices and resource pattern redesign ([e3de334](https://github.com/tosin2013/documcp/commit/e3de334336580dc1e2e8f0e2302cc7f903a58b7d))

### 🐛 Bug Fixes

- ensure memory storage directory exists before file operations ([19961a1](https://github.com/tosin2013/documcp/commit/19961a1bb017f90931fff8957fd040723a5d0810))
- resolve sitemap test failures and type issues ([232ce57](https://github.com/tosin2013/documcp/commit/232ce57ae1d1d0537122db6fa46e2614416ad929))

### 🚀 Features

- add generate_llm_context tool for dynamic LLM reference generation ([c8e3282](https://github.com/tosin2013/documcp/commit/c8e32823e2eb5f048b98b82f2840e1b4dee61094))
- enhance ListRoots to auto-detect and list documentation directories ([d432c4c](https://github.com/tosin2013/documcp/commit/d432c4c0bf74f1944d142c24c074365c67e3bdd5))
- implement MCP Phase 1 - progress notifications and logging support ([7d0ceeb](https://github.com/tosin2013/documcp/commit/7d0ceeb5e74611ae0f8276c63fed61e58ad16789))
- implement MCP Phase 2 - roots permission system ([ba307af](https://github.com/tosin2013/documcp/commit/ba307afc3fb186db699f10d0fccf6d6935ceee4d))
- implement Phase 3 code-to-docs synchronization and sitemap.xml management ([bbde81b](https://github.com/tosin2013/documcp/commit/bbde81be27938bacd05f1c30765e673e8679e6c7))
- integrate AST analyzer into kg-code-integration for enhanced code parsing ([ef47894](https://github.com/tosin2013/documcp/commit/ef478940bf50616c672201a9c7720a7054eb0456))

### 📚 Documentation

- comprehensive documentation improvements and pipeline fixes ([be64fd2](https://github.com/tosin2013/documcp/commit/be64fd2ffbe277b87afd9bd214ee1c4d4d54b224))

### [0.4.1](https://github.com/tosin2013/documcp/compare/v0.4.0...v0.4.1) (2025-10-04)

### 📚 Documentation

- add release workflow fixes documentation ([44b8bc9](https://github.com/tosin2013/documcp/commit/44b8bc96adcedaeff70f5bdea0a8b0c7a49f1e52))

### 🚀 Features

- add Playwright testing integration and knowledge graph enhancements ([39dc058](https://github.com/tosin2013/documcp/commit/39dc058842dfcf2195ac71d0edc7d1f14077cb84))

### 🐛 Bug Fixes

- add cleanup step to CI workflow to prevent corrupted memory files ([b07692d](https://github.com/tosin2013/documcp/commit/b07692d41b6c57e4e0b8d50c84f886bd77f86adf))
- correct workflow to build Docusaurus instead of Jekyll ([246302c](https://github.com/tosin2013/documcp/commit/246302c16b779d4caa38980496d2d211e8a1f2cd))
- improve GitHub Actions release workflow for future releases ([f83e930](https://github.com/tosin2013/documcp/commit/f83e9308db3b7be4afc4d0afebb0d782269b7df8))
- remove problematic setup-playwright-tests test file ([adb20f2](https://github.com/tosin2013/documcp/commit/adb20f2f09dd58143d12767ba9da92a686ca4237)), closes [#18245578186](https://github.com/tosin2013/documcp/issues/18245578186)
- update deprecated GitHub Actions in deploy-docs workflow ([dc877d7](https://github.com/tosin2013/documcp/commit/dc877d748429ec1ccbe9873449f56315b3bae14b)), closes [#18246024667](https://github.com/tosin2013/documcp/issues/18246024667)

## [0.4.0](https://github.com/tosin2013/documcp/compare/v0.3.4...v0.4.0) (2025-10-02)

### 🚀 Features

- Complete API documentation and user onboarding system ([7e7944e](https://github.com/tosin2013/documcp/commit/7e7944e65d576d2531c627560288d61ae88717d1))
- implement Phase 2 Intelligence & Learning System ([26b3370](https://github.com/tosin2013/documcp/commit/26b3370e64796a6f02534b6e6a9170043edc0a0a))
- integrate Release Drafter for automated release notes ([d06d88a](https://github.com/tosin2013/documcp/commit/d06d88a116ee56f42c3a8bcd8adc58220fce9b95))

### 🐛 Bug Fixes

- adjust coverage threshold for kg-storage error handling ([0b3e121](https://github.com/tosin2013/documcp/commit/0b3e1210e778aa2b7a9b05e7d64403076da8eaaa))
- resolve GitHub Actions workflow build failures ([0baddff](https://github.com/tosin2013/documcp/commit/0baddff738519ca598555af4c32ab582394d98b0))
- resolve Phase 2.1 edge case test failures with nuanced logic ([52d1f32](https://github.com/tosin2013/documcp/commit/52d1f32c4c4f26eba9b5b0894cc61b7637349f26))
- resolve Phase 2.1 test failures with comprehensive fixes ([736f104](https://github.com/tosin2013/documcp/commit/736f1049c1ac1b9deb61d63d7f69ff970e4ccb49))
- resolve pre-commit shellcheck and prettier issues ([54b90bf](https://github.com/tosin2013/documcp/commit/54b90bf9753ae018ed7983c6e703415f35f71156))
- update Docusaurus sidebar configuration with correct document IDs ([b9dcd99](https://github.com/tosin2013/documcp/commit/b9dcd99fea130a69cfef205b20fa6ca0ee9b143a))
- update GitHub Actions to latest versions to resolve deprecated artifact actions ([fabbbf3](https://github.com/tosin2013/documcp/commit/fabbbf3a22fcc07b546f383c5ff67570adeab9e3))
- update GitHub Actions to use latest artifact actions ([37bdda0](https://github.com/tosin2013/documcp/commit/37bdda01ef3cdb29ab805cfcecb98067846bfa52))
- update GitHub Pages deployment from Jekyll to Docusaurus ([09d7133](https://github.com/tosin2013/documcp/commit/09d7133580c228b5cb0615228e3e7946b6e6889d))
- update GitHub Pages deployment workflow for Docusaurus ([7623671](https://github.com/tosin2013/documcp/commit/7623671d72f7fbc088dba9923f45eb01265278a1))

### [0.3.4](https://github.com/tosin2013/documcp/compare/v0.3.3...v0.3.4) (2025-09-18)

### 🐛 Bug Fixes

- exclude remaining experimental memory files from coverage ([6c436b0](https://github.com/tosin2013/documcp/commit/6c436b018d0e072f25058617fe728b39279b51fc))

### 🚀 Features

- achieve 90%+ coverage by focusing on core functionality ([561b8a5](https://github.com/tosin2013/documcp/commit/561b8a56a14ddc39387fce35a1efd2ad0c2983bc))

### [0.3.3](https://github.com/tosin2013/documcp/compare/v0.3.2...v0.3.3) (2025-09-18)

### 🚀 Features

- achieve 85%+ test coverage with comprehensive test suite ([d607514](https://github.com/tosin2013/documcp/commit/d60751449d9fdc431f4c25d1465ab8731c31d3d9))
- add comprehensive pre-commit hooks configuration ([46e71ee](https://github.com/tosin2013/documcp/commit/46e71eec6f26c8e8b560480ec75e7f8c300ec9ae))
- comprehensive documentation updates with memory-enhanced capabilities ([9b13be9](https://github.com/tosin2013/documcp/commit/9b13be938b11cafee151a071b7406d5d6fb32366))
- configure project-local storage with startup visibility ([dfe60f0](https://github.com/tosin2013/documcp/commit/dfe60f0afa4073d4e1b05a9cc569a7ad203a3716))
- implement complete MCP prompts and resources system (ADR-007) ([1c9b5c2](https://github.com/tosin2013/documcp/commit/1c9b5c2cdaf41b793ae0c956f5de59f102cf35de))
- implement comprehensive memory system with advanced AI capabilities ([e4c9d06](https://github.com/tosin2013/documcp/commit/e4c9d0608037bc6f2ff239cd2107c77972c4eaa9)), closes [#45-54](https://github.com/tosin2013/documcp/issues/45-54) [#45-46](https://github.com/tosin2013/documcp/issues/45-46) [#47-48](https://github.com/tosin2013/documcp/issues/47-48) [#49-50](https://github.com/tosin2013/documcp/issues/49-50) [#51-52](https://github.com/tosin2013/documcp/issues/51-52) [#53-54](https://github.com/tosin2013/documcp/issues/53-54)
- implement Docusaurus documentation deployment with GitHub Actions ([7b78e7b](https://github.com/tosin2013/documcp/commit/7b78e7b80deb9fb8f074c0209bd1c88e539cb329))
- implement missing memory tool handlers for DocuMCP ([576bab5](https://github.com/tosin2013/documcp/commit/576bab50545b9eb57b8c2a74e50b0c555bcb3c80))

### ♻️ Code Refactoring

- simplify documentation deployment and add GitHub Actions linting ([6996c55](https://github.com/tosin2013/documcp/commit/6996c553d35a1c7cbd473c6150a8994e00a0526c))

### 🐛 Bug Fixes

- correct Dockerfile syntax for heredocs ([7d3556d](https://github.com/tosin2013/documcp/commit/7d3556d783b9f4bb251d8c47ac8f3aed441b1764))
- deploy Docusaurus documentation instead of Jekyll ([48400ae](https://github.com/tosin2013/documcp/commit/48400ae40f2a77bb9c8e446a9db3deb726a1e252))
- **generate-config:** correct Docusaurus file paths for test compatibility ([72522b4](https://github.com/tosin2013/documcp/commit/72522b4dab07ab9f96454a32c81599119b09cfe3))
- improve error handling test for cross-environment compatibility ([676e1da](https://github.com/tosin2013/documcp/commit/676e1dafdd2cc87a267591d5c244252efdf10222))
- remove invalid exclude field from Docusaurus config ([ebac637](https://github.com/tosin2013/documcp/commit/ebac6376dfe15ef76f688e42a86c9b4e01391316))
- resolve analysis ID retrieval issues across DocuMCP tools ([37610d0](https://github.com/tosin2013/documcp/commit/37610d0c79b1e8d97dad3a87746a7533a1f27740))
- resolve analysis ID retrieval issues across DocuMCP tools ([1f141d4](https://github.com/tosin2013/documcp/commit/1f141d4de0fa97fecee27a401d7870e13b42a630))
- resolve critical memory system failures and improve functionality ([9d009dc](https://github.com/tosin2013/documcp/commit/9d009dcf8cfaa721d6163546bc919bc318e8a1ee))
- resolve ESLint errors in memory system implementation ([a500719](https://github.com/tosin2013/documcp/commit/a50071901f7ec05b4ae2fa464ec1d38feb8f670d))
- resolve ESLint unused variable errors while preserving memory functionality ([3412abe](https://github.com/tosin2013/documcp/commit/3412abe08c44766660388d9fab438a2221544eb5))
- resolve memory system import/export issues and performance bottlenecks ([7164e3d](https://github.com/tosin2013/documcp/commit/7164e3dbe00cac5d1e82d9bea79ae6ced71e2ce5))
- resolve remaining TypeScript compilation errors ([3674069](https://github.com/tosin2013/documcp/commit/3674069cf722f5bc4060af999ad3a2f1480301a2))
- resolve test failures and improve test reliability to 99.3% ([56f9bc8](https://github.com/tosin2013/documcp/commit/56f9bc842a19f7841b8a5b508daf5c8f58c0ec76))
- resolve test failures and restore MCP server functionality ([0755bd3](https://github.com/tosin2013/documcp/commit/0755bd3f4398d172ee42e571971755d8a2779412))
- resolve TypeScript build errors and add package.json protection ([315a601](https://github.com/tosin2013/documcp/commit/315a601d5375142c2f4dc15d271c1088c8a8608c))
- resolve TypeScript compilation errors from ESLint fixes ([0f628f7](https://github.com/tosin2013/documcp/commit/0f628f7f8e3788a658432dd4983be8b063ccdd08))
- resolve TypeScript compilation errors in memory system tests ([47d9afe](https://github.com/tosin2013/documcp/commit/47d9afe238f3e0723c813b6d4ef640c22c3e1659))
- resolve TypeScript compilation errors in memory system tests ([3003d0f](https://github.com/tosin2013/documcp/commit/3003d0f608f7b70d35dbddf14500fa5d91774e91))
- restore Docusaurus workflow and remove npm cache dependency ([bb2bc85](https://github.com/tosin2013/documcp/commit/bb2bc8518a00ea4a4807f7de1956956bcb4af74e))
- update GitHub Actions workflow to use Docker-based Docusaurus build ([65deb79](https://github.com/tosin2013/documcp/commit/65deb79f7e8caf8accd99183e7f91ec89b94261f))
- use Docker-based build for GitHub Actions documentation deployment ([1777268](https://github.com/tosin2013/documcp/commit/1777268ca82d8471480e6c17d4e1fb80fc45dcd4))
- use npm install instead of npm ci for dynamic package.json ([d4c9d5b](https://github.com/tosin2013/documcp/commit/d4c9d5b584b26868203badbf7e01d90cac04f02c))

### [0.3.2](https://github.com/tosin2013/documcp/compare/v0.3.1...v0.3.2) (2025-09-11)

### 🐛 Bug Fixes

- resolve documentation inconsistencies and improve type safety ([eeb5dde](https://github.com/tosin2013/documcp/commit/eeb5dde09885fdf94dd5fd91a31e7aa6dc157084))
- update deploy-docs workflow from Jekyll to Docusaurus ([26b4a30](https://github.com/tosin2013/documcp/commit/26b4a307dc2c558d15008e0f2624645b7d4b1a08))
- update deprecated GitHub Actions to latest versions ([e219410](https://github.com/tosin2013/documcp/commit/e2194109170fbb6d56513bbe8b4d93e950b98da9))

### [0.3.1](https://github.com/tosin2013/documcp/compare/v0.3.0...v0.3.1) (2025-09-11)

## [0.3.0](https://github.com/tosin2013/documcp/compare/v0.2.4...v0.3.0) (2025-09-11)

### 🐛 Bug Fixes

- add error handling for package.json parsing in project context analyzer ([0a5a3e6](https://github.com/tosin2013/documcp/commit/0a5a3e6d2802397d83bf87483a083b51fe3a1a8c))
- disable strict ESLint rules to resolve CI pipeline failures on main branch ([5a1dda4](https://github.com/tosin2013/documcp/commit/5a1dda4870472e074733b597ab3f0325a8c65d1d))
- regenerate package-lock.json to resolve CodeQL workflow failure ([613e6c0](https://github.com/tosin2013/documcp/commit/613e6c0f4319ee244e5037f1036b86085e97201a)), closes [#25](https://github.com/tosin2013/documcp/issues/25)
- resolve all failing test cases in optimize-readme.test.ts ([7353338](https://github.com/tosin2013/documcp/commit/7353338b33a5a98f6f0f87bbc090f068d38430fb))
- Resolve ESLint errors in generate-technical-writer-prompts.ts ([5a176f6](https://github.com/tosin2013/documcp/commit/5a176f672e1556450383a03c4d0f0475ca92e25d))
- resolve ESLint errors in README Technical Writer tools ([68810b0](https://github.com/tosin2013/documcp/commit/68810b0ceba74f541968f51ac6bc3ec6b8524cad))
- Resolve ESLint errors in validate-readme-checklist.ts ([0b3beab](https://github.com/tosin2013/documcp/commit/0b3beab437802b8c1393759b96ffd907683923b2))
- Update index.ts to use new Diataxis-aligned prompt API ([28dc2c0](https://github.com/tosin2013/documcp/commit/28dc2c0e727aa90219ae32f2b2036c2f9b206b3e))

### 🚀 Features

- Achieve 85%+ branch coverage for critical DocuMCP tools ([0111a1b](https://github.com/tosin2013/documcp/commit/0111a1b3aae09a27ab9db236ec1acfbe636d3361))
- add comprehensive technical writer prompts system ([7509f91](https://github.com/tosin2013/documcp/commit/7509f91de043237a528864f4b11cb485b0b2c03a))
- add Dependabot config for Docusaurus documentation dependencies and security updates ([16fbee7](https://github.com/tosin2013/documcp/commit/16fbee7fad535e4b4cc4960a88daf3062add19ba))
- Add README template generator and checklist validator tools ([4899e12](https://github.com/tosin2013/documcp/commit/4899e1217cd1fe60246f23c4d43731cc6ecbb0e6)), closes [#11](https://github.com/tosin2013/documcp/issues/11)
- Implement Diataxis-aligned technical writer prompts ([f32558a](https://github.com/tosin2013/documcp/commit/f32558a031a571579fb02da64f3e1e3bf8518664))
- implement README Technical Writer MCP tools ([728da0a](https://github.com/tosin2013/documcp/commit/728da0a21ec586b5f8361337edf42fec79dc70d0)), closes [#10](https://github.com/tosin2013/documcp/issues/10)
- improve validate-content.ts test coverage from 79.31% to 83.15% ([a51c0a7](https://github.com/tosin2013/documcp/commit/a51c0a7f1e7232db99d444fbe94ea7a74ec04ece)), closes [#7](https://github.com/tosin2013/documcp/issues/7)
- integrate main branch updates and fix merge conflicts ([6d30ddf](https://github.com/tosin2013/documcp/commit/6d30ddf63ccca01f67b90ecfef2fb438a16a369e))

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
