# Reference Documentation

Complete technical reference for DocuMCP's API, configuration, and tools.

## 🎯 For AI Assistants: LLM_CONTEXT.md

**Essential for AI-powered workflows**: Reference the comprehensive context file:

- **[LLM Context Reference](../../LLM_CONTEXT.md)** - Complete tool reference for AI assistants (45 tools, workflows, examples)

Use in AI assistants: `@LLM_CONTEXT.md [your query]`

## API Reference

- **[API Overview](api-overview.md)** - Complete tool categorization and quick reference (NEW!)
- **[MCP Tools API](mcp-tools.md)** - Detailed API reference for all DocuMCP tools
- **[TypeDoc API](../api/)** - Auto-generated API documentation
- [Configuration Options](configuration.md) - Configuration file reference
- [CLI Commands](cli.md) - Command-line interface reference
- [Prompt Templates](prompt-templates.md) - Available prompt templates

## Quick Reference

### Essential Tools

```bash
# Repository Analysis
"analyze my repository with deep analysis"

# SSG Recommendation
"recommend static site generator for my project"

# Documentation Generation
"generate documentation structure for my project"

# Deployment
"deploy my documentation to GitHub Pages"
```

### Configuration Examples

```yaml
# Basic configuration
memory:
  storage_path: ".documcp/memory"
  retention_policy: "keep_all"

deployment:
  platform: "github-pages"
  branch: "gh-pages"
  domain: "docs.example.com"
```

## API Overview

DocuMCP provides **45 tools** across 7 main categories. See [API Overview](api-overview.md) for complete details.

### Analysis Tools

- `analyze_repository` - Comprehensive repository analysis
- `detect_gaps` - Documentation gap detection
- `evaluate_readme_health` - README quality assessment

### Recommendation Tools

- `recommend_ssg` - Static site generator recommendations
- `generate_config` - SSG configuration generation
- `setup_structure` - Documentation structure creation

### Content Tools

- `populate_content` - Intelligent content population
- `validate_content` - Content validation and checking
- `update_existing_documentation` - Documentation updates

### Deployment Tools

- `deploy_pages` - GitHub Pages deployment
- `verify_deployment` - Deployment verification
- `test_local_deployment` - Local testing

## Memory System

DocuMCP includes a sophisticated memory system for learning and optimization:

### Memory Operations

- `memory_recall` - Retrieve stored memories
- `memory_export` - Export memories for backup
- `memory_import` - Import memories from files
- `memory_cleanup` - Clean up old memories

### Analytics

- `analyze_deployments` - Deployment pattern analysis
- `memory_insights` - Memory-based insights
- `similar_projects` - Find similar projects

## Getting Started

1. **First Time**: Start with [Getting Started Tutorial](../tutorials/getting-started.md)
2. **API Reference**: Explore [MCP Tools API](mcp-tools.md)
3. **Configuration**: Review [Configuration Options](configuration.md)
4. **Advanced Usage**: Check [CLI Commands](cli.md)

## Support

- **Documentation**: This reference guide
- **Examples**: See [Tutorials](../tutorials/)
- **Community**: [GitHub Discussions](https://github.com/tosin2013/documcp/discussions)
- **Issues**: [GitHub Issues](https://github.com/tosin2013/documcp/issues)
