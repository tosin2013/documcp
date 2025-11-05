# DocuMCP - Intelligent Documentation Deployment MCP Server

[![CI](https://github.com/tosin2013/documcp/actions/workflows/ci.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml)
[![Coverage](https://codecov.io/gh/tosin2013/documcp/branch/main/graph/badge.svg)](https://codecov.io/gh/tosin2013/documcp)
[![npm version](https://badge.fury.io/js/documcp.svg)](https://badge.fury.io/js/documcp)

DocuMCP is an intelligent Model Context Protocol (MCP) server that revolutionizes documentation deployment for open-source projects. It provides deep repository analysis, intelligent static site generator recommendations, and automated GitHub Pages deployment workflows.

<a href="https://glama.ai/mcp/servers/@tosin2013/documcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@tosin2013/documcp/badge" alt="documcp MCP server" />
</a>

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

## Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: Latest stable version

## Installation

```bash
# Clone the repository
git clone https://github.com/tosin2013/documcp.git
cd documcp

# Install dependencies
npm install

# Build the project
npm run build
```

## MCP Client Setup

DocuMCP works with various MCP-enabled clients. Here's how to configure it:

### Claude Desktop

1. **Locate Claude Desktop's configuration file**:

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

2. **Add documcp server configuration**:

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

3. **Restart Claude Desktop** to load the configuration.

### VS Code with GitHub Copilot

1. **Install MCP extension** for VS Code
2. **Configure in VS Code settings.json**:
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

### Cursor Editor

1. **Configure in Cursor settings**:
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

### Gemini Code Assist

1. **Check Gemini documentation** for MCP server configuration
2. **Add similar configuration** as above

### Troubleshooting

- Ensure `npx` is available in your PATH
- For global installations, use the full path:
  ```json
  {
    "command": "node",
    "args": ["/usr/local/lib/node_modules/documcp/dist/index.js"]
  }
  ```
- Find installation path: `npm list -g documcp`

## Quick Start

Once configured with your MCP client, just prompt DocuMCP with natural language:

```bash
# Complete workflow
"analyze my repository and deploy documentation to GitHub Pages"

# Step by step
"analyze my repository for documentation needs"
"recommend the best static site generator for my project"
"set up documentation structure and deploy to GitHub Pages"
```

DocuMCP provides 30+ tools including repository analysis, intelligent SSG recommendations, content generation, deployment automation with tracking, validation, user preference management, deployment analytics, and memory-enhanced insights. See the [complete documentation](docs/index.md) for detailed tool reference.

## Key Tools

### Analysis & Recommendations

- `analyze_repository` - Deep repository structure and dependency analysis
- `recommend_ssg` - Intelligent SSG recommendations with historical data and user preferences
- `detect_gaps` - Identify missing documentation sections

### Deployment & Tracking

- `deploy_pages` - Automated GitHub Pages deployment with outcome tracking
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