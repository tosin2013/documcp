---
sidebar_position: 1
documcp:
  last_updated: "2025-11-20T00:46:21.959Z"
  last_validated: "2025-11-20T00:46:21.959Z"
  auto_updated: false
  update_frequency: monthly
---

# API Overview

DocuMCP provides **45 specialized tools** organized into functional categories for intelligent documentation deployment via the Model Context Protocol (MCP).

## 🎯 Quick Reference: LLM_CONTEXT.md

For AI assistants and LLMs, reference the **comprehensive context file**:

**File**: `/LLM_CONTEXT.md` (in project root)

This auto-generated file provides:

- All 45 tool descriptions with parameters
- Usage examples and code snippets
- Common workflow patterns
- Memory system documentation
- Phase 3 code-to-docs sync features

**Usage in AI assistants**:

```
@LLM_CONTEXT.md help me deploy documentation to GitHub Pages
```

## 📚 Tool Categories

### Core Documentation Tools (9 tools)

Essential tools for repository analysis, recommendations, and deployment:

| Tool                            | Purpose                                  | Key Parameters                     |
| ------------------------------- | ---------------------------------------- | ---------------------------------- |
| `analyze_repository`            | Analyze project structure & dependencies | `path`, `depth`                    |
| `recommend_ssg`                 | Recommend static site generator          | `analysisId`, `preferences`        |
| `generate_config`               | Generate SSG configuration files         | `ssg`, `projectName`, `outputPath` |
| `setup_structure`               | Create Diataxis documentation structure  | `path`, `ssg`                      |
| `deploy_pages`                  | Deploy to GitHub Pages with tracking     | `repository`, `ssg`, `userId`      |
| `verify_deployment`             | Verify deployment status                 | `repository`, `url`                |
| `populate_diataxis_content`     | Generate project-specific content        | `analysisId`, `docsPath`           |
| `update_existing_documentation` | Update existing docs intelligently       | `analysisId`, `docsPath`           |
| `validate_diataxis_content`     | Validate documentation quality           | `contentPath`, `validationType`    |

### README Analysis & Generation (6 tools)

Specialized tools for README creation and optimization:

| Tool                        | Purpose                                   | Key Parameters                               |
| --------------------------- | ----------------------------------------- | -------------------------------------------- |
| `evaluate_readme_health`    | Assess README quality & onboarding        | `readme_path`, `project_type`                |
| `readme_best_practices`     | Analyze against best practices            | `readme_path`, `generate_template`           |
| `generate_readme_template`  | Create standardized README                | `projectName`, `description`, `templateType` |
| `validate_readme_checklist` | Validate against community standards      | `readmePath`, `strict`                       |
| `analyze_readme`            | Comprehensive length & structure analysis | `project_path`, `optimization_level`         |
| `optimize_readme`           | Restructure and condense content          | `readme_path`, `strategy`, `max_length`      |

### Phase 3: Code-to-Docs Synchronization (2 tools)

Advanced AST-based code analysis and drift detection:

| Tool                          | Purpose                            | Key Parameters                    |
| ----------------------------- | ---------------------------------- | --------------------------------- |
| `sync_code_to_docs`           | Detect and fix documentation drift | `projectPath`, `docsPath`, `mode` |
| `generate_contextual_content` | Generate docs from code analysis   | `filePath`, `documentationType`   |

**Supported Languages**: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, Bash

**Drift Types Detected**: Outdated, Incorrect, Missing, Breaking

### Memory & Analytics Tools (2 tools)

User preferences and deployment pattern analysis:

| Tool                  | Purpose                                | Key Parameters                      |
| --------------------- | -------------------------------------- | ----------------------------------- |
| `manage_preferences`  | Manage user preferences & SSG history  | `action`, `userId`, `preferences`   |
| `analyze_deployments` | Analyze deployment patterns & insights | `analysisType`, `ssg`, `periodDays` |

### Validation & Testing Tools (4 tools)

Quality assurance and deployment testing:

| Tool                        | Purpose                              | Key Parameters                               |
| --------------------------- | ------------------------------------ | -------------------------------------------- |
| `validate_content`          | Validate links, code, and references | `contentPath`, `validationType`              |
| `check_documentation_links` | Comprehensive link validation        | `documentation_path`, `check_external_links` |
| `test_local_deployment`     | Test build and local server          | `repositoryPath`, `ssg`, `port`              |
| `setup_playwright_tests`    | Generate E2E test infrastructure     | `repositoryPath`, `ssg`, `projectName`       |

### Utility Tools (3 tools)

Additional functionality and management:

| Tool                        | Purpose                           | Key Parameters                        |
| --------------------------- | --------------------------------- | ------------------------------------- |
| `detect_documentation_gaps` | Identify missing content          | `repositoryPath`, `documentationPath` |
| `manage_sitemap`            | Generate and validate sitemap.xml | `action`, `docsPath`, `baseUrl`       |
| `read_directory`            | List files within allowed roots   | `path`                                |

### Advanced Memory Tools (19 tools)

Sophisticated memory, learning, and knowledge graph operations:

| Tool Category       | Tools                                                                  | Purpose                       |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| **Memory Recall**   | `memory_recall`, `memory_contextual_search`                            | Retrieve and search memories  |
| **Intelligence**    | `memory_intelligent_analysis`, `memory_enhanced_recommendation`        | AI-powered insights           |
| **Knowledge Graph** | `memory_knowledge_graph`, `memory_learning_stats`                      | Graph queries and statistics  |
| **Collaboration**   | `memory_agent_network`                                                 | Multi-agent memory sharing    |
| **Insights**        | `memory_insights`, `memory_similar`, `memory_temporal_analysis`        | Pattern analysis              |
| **Data Management** | `memory_export`, `memory_cleanup`, `memory_pruning`                    | Export, cleanup, optimization |
| **Visualization**   | `memory_visualization`                                                 | Visual representations        |
| **Advanced I/O**    | `memory_export_advanced`, `memory_import_advanced`, `memory_migration` | Complex data operations       |
| **Metrics**         | `memory_optimization_metrics`                                          | Performance analysis          |

## 🔗 Detailed Documentation

### Full API Reference

- **[MCP Tools API](./mcp-tools.md)** - Complete tool descriptions with examples
- **[TypeDoc API](../api/)** - Auto-generated API documentation for all classes, interfaces, and functions
- **[LLM Context Reference](../../LLM_CONTEXT.md)** - Comprehensive tool reference for AI assistants

### Configuration & Usage

- **[Configuration Options](./configuration.md)** - All configuration settings
- **[CLI Commands](./cli.md)** - Command-line interface reference
- **[Prompt Templates](./prompt-templates.md)** - Pre-built prompt examples

## 🚀 Common Workflows

### 1. New Documentation Site

```
analyze_repository → recommend_ssg → generate_config →
setup_structure → populate_diataxis_content → deploy_pages
```

### 2. Documentation Sync (Phase 3)

```
sync_code_to_docs (detect) → review drift →
sync_code_to_docs (apply) → manual review
```

### 3. Existing Docs Improvement

```
analyze_repository → update_existing_documentation →
validate_diataxis_content → check_documentation_links
```

### 4. README Enhancement

```
analyze_readme → evaluate_readme_health →
readme_best_practices → optimize_readme
```

## 📦 Memory Knowledge Graph

DocuMCP includes a persistent memory system that learns from every analysis:

### Entity Types

- **Project**: Software projects with analysis history
- **User**: User preferences and SSG patterns
- **Configuration**: SSG deployment configs with success rates
- **Documentation**: Documentation structures and patterns
- **CodeFile**: Source code files with change tracking
- **DocumentationSection**: Docs sections linked to code
- **Technology**: Languages, frameworks, and tools

### Relationship Types

- `project_uses_technology`: Links projects to tech stack
- `user_prefers_ssg`: Tracks user SSG preferences
- `project_deployed_with`: Records deployment outcomes
- `similar_to`: Identifies similar projects
- `documents`: Links code files to documentation
- `outdated_for`: Flags out-of-sync documentation
- `depends_on`: Tracks technology dependencies

### Storage Location

- **Default**: `.documcp/memory/`
- **Entities**: `.documcp/memory/knowledge-graph-entities.jsonl`
- **Relationships**: `.documcp/memory/knowledge-graph-relationships.jsonl`
- **Backups**: `.documcp/memory/backups/`
- **Snapshots**: `.documcp/snapshots/` (for drift detection)

## 🎓 Getting Started

1. **Start with tutorials**: [Getting Started Guide](../tutorials/getting-started.md)
2. **Learn effective prompting**: [Prompting Guide](../how-to/prompting-guide.md)
3. **Reference LLM_CONTEXT.md**: Use `@LLM_CONTEXT.md` in AI assistants
4. **Explore workflows**: [Common Workflows](#-common-workflows)

## 📊 Tool Statistics

- **Total Tools**: 45
- **Core Documentation**: 9 tools
- **README Management**: 6 tools
- **Phase 3 Sync**: 2 tools
- **Memory & Analytics**: 2 tools
- **Validation**: 4 tools
- **Utilities**: 3 tools
- **Advanced Memory**: 19 tools

## 🔍 Search & Discovery

- **By functionality**: Use the category tables above
- **By name**: See [MCP Tools API](./mcp-tools.md)
- **By code**: Browse [TypeDoc API](../api/)
- **For AI assistants**: Reference [LLM_CONTEXT.md](../../LLM_CONTEXT.md)

---

_Documentation auto-generated from DocuMCP v0.3.2_
