# DocuMCP - Intelligent Documentation Deployment MCP Server

[![CI](https://github.com/tosin2013/documcp/actions/workflows/ci.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml)
[![Coverage](https://codecov.io/gh/tosin2013/documcp/branch/main/graph/badge.svg)](https://codecov.io/gh/tosin2013/documcp)
[![npm version](https://badge.fury.io/js/documcp.svg)](https://badge.fury.io/js/documcp)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tosin2013/documcp)

DocuMCP is an intelligent Model Context Protocol (MCP) server that revolutionizes documentation deployment for open-source projects. It provides deep repository analysis, intelligent static site generator recommendations, and automated GitHub Pages deployment workflows.

## TL;DR

DocuMCP analyzes your repository, recommends the perfect static site generator (Jekyll, Hugo, Docusaurus, MkDocs, or Eleventy), creates professional documentation structure following Diataxis principles, and deploys it automatically to GitHub Pages. Just say "analyze my repository and deploy documentation" to get started.

## Features

### Core Capabilities

- 🔍 **Repository Analysis**: Deep multi-layered analysis of project structure, dependencies, and documentation needs
- 🎯 **SSG Recommendations**: Data-driven recommendations for Jekyll, Hugo, Docusaurus, MkDocs, or Eleventy
- 📚 **Diataxis Framework**: Automatic creation of well-structured documentation following proven principles
- 🚀 **GitHub Pages Deployment**: Automated workflow generation with SSG-specific optimizations
- ✅ **Deployment Verification**: Comprehensive checks and troubleshooting for successful deployments

### Intelligence & Learning (Phase 2)

- 🧠 **Historical Intelligence**: Learns from past deployments to improve recommendations
- 👤 **User Preferences**: Personalized recommendations based on your preferences and patterns
- 📊 **Deployment Analytics**: Comprehensive insights into deployment patterns and success rates
- 🎯 **Smart Scoring**: Intelligent SSG scoring based on success rates from similar projects
- 📈 **Trend Analysis**: Identifies deployment trends and provides health scores

### Documentation Maintenance (v0.5.2+)

- 📅 **Freshness Tracking**: Monitor documentation staleness with configurable thresholds
- ✅ **Freshness Validation**: Initialize and update freshness metadata automatically
- 🗺️ **Sitemap Management**: Generate, validate, and manage sitemap.xml for SEO
- 🔗 **Knowledge Graph Integration**: Track freshness history for intelligent recommendations

### AI-Powered Semantic Analysis (v0.6.0+)

- 🤖 **LLM Integration**: Optional integration with DeepSeek, OpenAI, Anthropic, or Ollama
- 🔍 **Semantic Code Analysis**: Detect behavioral changes beyond syntax using AI
- 🧪 **Example Validation**: Simulate code execution to verify documentation examples
- 🎯 **Intelligent Fallback**: Graceful degradation to AST-only analysis when LLM unavailable
- 🔒 **Privacy First**: Works fully offline with AST analysis, LLM completely optional

## Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: Latest stable version

## Installation

**Option A — npm global install (recommended):**

```bash
npm install -g documcp
```

**Option B — build from source (contributors / local dev):**

```bash
git clone https://github.com/tosin2013/documcp.git
cd documcp
npm install
npm run build
```

## MCP Client Setup

DocuMCP works with any MCP-enabled AI client. Pick the one you use:

### Claude Desktop

File location:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

Restart Claude Desktop to load the configuration.

### Claude Code (CLI)

```bash
# npm global install
claude mcp add documcp -- npx documcp

# local build (replace path as needed)
claude mcp add documcp -- node /path/to/documcp/dist/index.js
```

Verify with `claude mcp list` — no restart required.

### Cursor

File location: `~/.cursor/mcp.json` (or **Settings > MCP** in the UI)

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `settings.json` (**Cmd/Ctrl + Shift + P → Preferences: Open User Settings (JSON)**):

```json
{
  "mcp.servers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

### Troubleshooting

- Ensure `npx` is available in your PATH
- To find a global install path: `npm list -g documcp`
- To use the full path instead of npx:
  ```json
  {
    "command": "node",
    "args": ["/usr/local/lib/node_modules/documcp/dist/index.js"]
  }
  ```

## Quick Start

Once connected to your AI client, use natural language prompts:

```
Analyze my repository at /path/to/my-project
```

```
Recommend a static site generator based on my analysis
```

```
Set up a Diataxis documentation structure using Docusaurus
```

```
Deploy my documentation to GitHub Pages
```

DocuMCP provides 30+ tools including repository analysis, intelligent SSG recommendations, content generation, deployment automation with tracking, validation, user preference management, deployment analytics, and memory-enhanced insights. See the [complete documentation](docs/index.md) for detailed tool reference.

## Key Tools

### Analysis & Recommendations

- `analyze_repository` - Deep repository structure and dependency analysis
- `recommend_ssg` - Intelligent SSG recommendations with historical data and user preferences
- `detect_gaps` - Identify missing documentation sections

### Deployment & Tracking

- `deploy_site` - Automated deployment to GitHub Pages or Vercel with outcome tracking (`deploy_pages` still works as a back-compat alias)
- `verify_deployment` - Comprehensive deployment validation
- `analyze_deployments` - Analytics and insights from deployment history

### User Preferences & Learning

- `manage_preferences` - Manage user preferences for personalized recommendations
- View historical success rates and deployment patterns
- Get recommendations based on similar projects' success

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

DocuMCP follows a modular, stateless architecture:

- **TypeScript-based** implementation using the official MCP SDK
- **Stateless operation** for consistency and reliability
- **Modular design** with clear separation of concerns
- **Progressive complexity** allowing users to start simple

## Documentation Structure (Diataxis)

DocuMCP automatically creates documentation following the Diataxis framework:

- **Tutorials**: Learning-oriented guides for newcomers
- **How-To Guides**: Task-oriented recipes for specific goals
- **Reference**: Information-oriented technical descriptions
- **Explanation**: Understanding-oriented conceptual discussions

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### First Time Contributors

Look for issues labeled "good first issue" to get started with the project. We welcome contributions from developers of all experience levels.

### Reporting Issues

Please use our [issue templates](.github/ISSUE_TEMPLATE/) when reporting bugs or requesting features.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Security

Please see our [Security Policy](./SECURITY.md) for reporting vulnerabilities and security-related issues.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Follows the [Diataxis Framework](https://diataxis.fr/)
- Inspired by the need for better documentation in open-source projects
