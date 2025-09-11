# DocuMCP - Intelligent Documentation Deployment MCP Server

[![CI](https://github.com/tosin2013/documcp/actions/workflows/ci.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/tosin2013/documcp/actions/workflows/codeql.yml)
[![Coverage](https://codecov.io/gh/tosin2013/documcp/branch/main/graph/badge.svg)](https://codecov.io/gh/tosin2013/documcp)
[![npm version](https://badge.fury.io/js/documcp.svg)](https://badge.fury.io/js/documcp)

DocuMCP is an intelligent Model Context Protocol (MCP) server that revolutionizes documentation deployment for open-source projects. It provides deep repository analysis, intelligent static site generator recommendations, and automated GitHub Pages deployment workflows.

## Features

- 🔍 **Repository Analysis**: Deep multi-layered analysis of project structure, dependencies, and documentation needs
- 🎯 **SSG Recommendations**: Data-driven recommendations for Jekyll, Hugo, Docusaurus, MkDocs, or Eleventy
- 📚 **Diataxis Framework**: Automatic creation of well-structured documentation following proven principles
- 🚀 **GitHub Pages Deployment**: Automated workflow generation with SSG-specific optimizations
- ✅ **Deployment Verification**: Comprehensive checks and troubleshooting for successful deployments

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

## Usage

Once configured with your MCP client, DocuMCP provides eleven comprehensive MCP tools:

### 1. Analyze Repository
Performs deep analysis of your project to understand its characteristics and documentation needs.

```json
{
  "tool": "analyze_repository",
  "arguments": {
    "path": "/path/to/your/repo",
    "depth": "standard"
  }
}
```

### 2. Recommend SSG
Provides intelligent recommendations for the best static site generator based on your project.

```json
{
  "tool": "recommend_ssg",
  "arguments": {
    "analysisId": "analysis_12345",
    "preferences": {
      "priority": "simplicity"
    }
  }
}
```

### 3. Generate Config
Creates all necessary configuration files for your chosen static site generator.

```json
{
  "tool": "generate_config",
  "arguments": {
    "ssg": "docusaurus",
    "projectName": "My Project",
    "outputPath": "./docs"
  }
}
```

### 4. Setup Structure
Creates a Diataxis-compliant documentation structure with proper categorization.

```json
{
  "tool": "setup_structure",
  "arguments": {
    "path": "./docs",
    "ssg": "docusaurus",
    "includeExamples": true
  }
}
```

### 5. Deploy Pages
Sets up GitHub Actions workflows for automated deployment to GitHub Pages.

```json
{
  "tool": "deploy_pages",
  "arguments": {
    "repository": ".",
    "ssg": "docusaurus",
    "branch": "gh-pages"
  }
}
```

### 6. Verify Deployment
Checks your setup and provides troubleshooting guidance for successful deployment.

```json
{
  "tool": "verify_deployment",
  "arguments": {
    "repository": ".",
    "url": "https://yourusername.github.io/yourproject"
  }
}
```

### 7. Populate Diataxis Content
Intelligently populates documentation with project-specific content.

```json
{
  "tool": "populate_diataxis_content",
  "arguments": {
    "analysisId": "analysis_12345",
    "docsPath": "./docs",
    "populationLevel": "comprehensive"
  }
}
```

### 8. Validate Diataxis Content
Validates accuracy, completeness, and compliance of documentation.

```json
{
  "tool": "validate_diataxis_content",
  "arguments": {
    "contentPath": "./docs",
    "validationType": "all"
  }
}
```

### 9. Validate Content
Checks general content quality including links and code syntax.

```json
{
  "tool": "validate_content",
  "arguments": {
    "contentPath": "./docs",
    "validationType": "links"
  }
}
```

### 10. Detect Documentation Gaps
Analyzes repository to identify missing documentation content.

```json
{
  "tool": "detect_documentation_gaps",
  "arguments": {
    "repositoryPath": ".",
    "documentationPath": "./docs"
  }
}
```

### 11. Test Local Deployment
Tests documentation build and local server before deployment.

```json
{
  "tool": "test_local_deployment",
  "arguments": {
    "repositoryPath": ".",
    "ssg": "docusaurus",
    "port": 3000
  }
}
```

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