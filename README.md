# DocuMCP - Intelligent Documentation Deployment MCP Server

[![CI](https://github.com/tosinakinosho/documcp/actions/workflows/ci.yml/badge.svg)](https://github.com/tosinakinosho/documcp/actions/workflows/ci.yml)
[![CodeQL](https://github.com/tosinakinosho/documcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/tosinakinosho/documcp/actions/workflows/codeql.yml)
[![Coverage](https://codecov.io/gh/tosinakinosho/documcp/branch/main/graph/badge.svg)](https://codecov.io/gh/tosinakinosho/documcp)
[![npm version](https://badge.fury.io/js/documcp.svg)](https://badge.fury.io/js/documcp)

DocuMCP is an intelligent Model Context Protocol (MCP) server that revolutionizes documentation deployment for open-source projects. It provides deep repository analysis, intelligent static site generator recommendations, and automated GitHub Pages deployment workflows.

## Features

- 🔍 **Repository Analysis**: Deep multi-layered analysis of project structure, dependencies, and documentation needs
- 🎯 **SSG Recommendations**: Data-driven recommendations for Jekyll, Hugo, Docusaurus, MkDocs, or Eleventy
- 📚 **Diataxis Framework**: Automatic creation of well-structured documentation following proven principles
- 🚀 **GitHub Pages Deployment**: Automated workflow generation with SSG-specific optimizations
- ✅ **Deployment Verification**: Comprehensive checks and troubleshooting for successful deployments

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/documcp.git
cd documcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

DocuMCP provides six core MCP tools:

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

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- Built on the [Model Context Protocol](https://modelcontextprotocol.io/)
- Follows the [Diataxis Framework](https://diataxis.fr/)
- Inspired by the need for better documentation in open-source projects