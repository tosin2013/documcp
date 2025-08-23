---
id: reference-index
title: Reference
sidebar_label: Reference
---

# Reference

Complete technical reference for DocuMCP tools, APIs, and configuration options.

## Available Documentation

This section contains comprehensive reference documentation following the Diataxis framework.

**Reference** documentation is information-oriented:
- Describe the machinery precisely
- Be accurate and complete
- Focus on describing, not explaining
- Structure content for finding information quickly

## 🔧 MCP Tools Reference

- **[MCP Tools API Reference](./api-reference.md)** - Complete reference for all 10 DocuMCP tools with parameters, examples, and error handling
- **[API Documentation](./api-documentation.md)** - Core server API documentation
- **[Configuration Options](./configuration-options.md)** - All configuration parameters and settings
- **[Command Line Interface](./command-line-interface.md)** - CLI commands and options

## 📋 Quick Reference

### Core MCP Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `analyze_repository` | Repository analysis | `path`, `depth` |
| `recommend_ssg` | SSG recommendation | `analysisId`, `preferences` |
| `generate_config` | Config generation | `ssg`, `projectName`, `outputPath` |
| `setup_structure` | Diataxis structure | `path`, `ssg`, `includeExamples` |
| `populate_diataxis_content` | Content population | `analysisId`, `docsPath`, `populationLevel` |
| `validate_diataxis_content` | Content validation | `contentPath`, `validationType` |
| `detect_documentation_gaps` | Gap analysis | `repositoryPath`, `documentationPath` |
| `deploy_pages` | GitHub Pages setup | `repository`, `ssg`, `branch` |
| `verify_deployment` | Deployment verification | `repository`, `url` |
| `test_local_deployment` | Local testing | `repositoryPath`, `ssg`, `port` |

### Error Codes Quick Reference

| Code | Meaning | Resolution |
|------|---------|------------|
| `INVALID_PATH` | Path not found | Check file/directory exists |
| `INVALID_SSG` | Unsupported SSG | Use jekyll, hugo, docusaurus, mkdocs, or eleventy |
| `MISSING_ANALYSIS` | Analysis ID required | Run `analyze_repository` first |
| `BUILD_FAILED` | Build process failed | Check dependencies and build logs |
| `PERMISSION_DENIED` | File access denied | Verify read/write permissions |

### Supported Static Site Generators

- **Jekyll** - Ruby-based, GitHub Pages native
- **Hugo** - Go-based, extremely fast builds  
- **Docusaurus** - React-based, feature-rich
- **MkDocs** - Python-based, simple and clean
- **Eleventy** - JavaScript-based, flexible templating

## 🔗 Related Resources

- [Getting Started Tutorial](../tutorials/getting-started-with-documcp.md)
- [MCP Debugging Guide](../how-to/how-to-debug-common-issues.md)
- [Architecture Overview](../explanation/architecture-overview.md)
