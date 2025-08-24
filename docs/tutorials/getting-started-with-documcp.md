# Getting Started with documcp

Welcome to documcp! This tutorial will guide you through installing and setting up the documcp MCP server for AI-powered documentation workflows.

## What is documcp?

documcp is an MCP (Model Context Protocol) server that provides AI clients with powerful tools for:
- Repository analysis and documentation gap detection
- Static site generator recommendations
- Diataxis-compliant documentation structure creation
- Automated content population and validation
- GitHub Pages deployment automation

## Prerequisites

Before you begin, ensure you have:

- Node.js (version 20 or higher)
- npm package manager
- AI client that supports MCP (Claude Desktop, GitHub Copilot, etc.)
- Git repository access for documentation projects

## Installation

### Method 1: NPM Installation (Recommended)

Install documcp globally from npm:

```bash
npm install -g documcp
```

Verify the installation:

```bash
documcp --version
```

### Method 2: Development Installation

For contributing to documcp or local development:

1. Clone the repository:
   ```bash
   git clone https://github.com/tosin2013/documcp.git
   cd documcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## AI Client Setup

### Claude Desktop Configuration

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

   **Optional: Set default target repository**:
   ```json
   {
     "mcpServers": {
       "documcp": {
         "command": "npx",
         "args": ["documcp"],
         "env": {
           "DOCUMCP_TARGET_REPO": "/path/to/your/project"
         }
       }
     }
   }
   ```

   **Alternative configuration** (if npx doesn't work):
   ```json
   {
     "mcpServers": {
       "documcp": {
         "command": "node",
         "args": ["/usr/local/lib/node_modules/documcp/dist/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. **Find your installation path** (if using node command):
   ```bash
   npm list -g documcp
   ```

4. **Restart Claude Desktop** to load the configuration.

### GitHub Copilot Configuration

1. **Install MCP extension** for VS Code
2. **Configure in VS Code settings.json**:
   ```json
   {
     "mcp.servers": {
       "documcp": {
         "transport": "stdio",
         "command": "npx",
         "args": ["documcp"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

   **Alternative configuration** (if npx doesn't work):
   ```json
   {
     "mcp.servers": {
       "documcp": {
         "transport": "stdio",
         "command": "node",
         "args": ["/usr/local/lib/node_modules/documcp/dist/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

## Verifying Your Setup

### Test MCP Server Connection

In your AI client (Claude Desktop), try:
```
Can you analyze my repository using documcp tools?
```

The AI should respond with available documcp tools and offer to help with documentation setup.

### Test Complete Workflow

Run a full documentation setup:
```
I need to set up comprehensive documentation for my TypeScript project. Can you:

1. Analyze my repository structure
2. Recommend the best static site generator
3. Create a complete Diataxis documentation structure
4. Set up GitHub Pages deployment
5. Populate the documentation with project-specific content
```

## First Documentation Project

### Quick Start Example

1. **Navigate to your project**:
   ```bash
   cd /path/to/your/project
   ```

2. **Ask your AI client to analyze the project**:
   ```
   Please analyze this repository and set up complete documentation using documcp.
   ```

3. **Follow the AI's recommendations** for:
   - Static site generator selection
   - Documentation structure creation
   - Content population
   - Deployment setup

### Expected Results

After setup, you should have:
- **Diataxis-compliant documentation structure**
- **Project-specific content** (tutorials, how-to guides, explanations, reference)
- **GitHub Pages deployment** workflow
- **Validation and quality checks**

## Troubleshooting

### Common Issues

**MCP Server Not Found**:
- Verify the path in your AI client configuration
- Check that Node.js and npm are in your PATH
- Ensure the server process can start

**Tool Execution Failures**:
- Check file permissions for repository access
- Verify Node.js version compatibility (20+)
- Review server logs for detailed error messages

### Debug Mode

Enable debug logging:
```bash
# For global installation
DEBUG=documcp:* documcp

# For development installation
DEBUG=documcp:* npm run dev
```

### Getting Help

If you encounter issues:
- Check the [Debugging Guide](../how-to/how-to-debug-common-issues.md)
- Review [MCP Server Configuration](../reference/configuration-options.md)
- Search [GitHub Issues](https://github.com/tosin2013/documcp/issues)

## Next Steps

### Learn More

- **[Architecture Overview](../explanation/architecture-overview.md)** - Understand documcp's design
- **[MCP Tools Reference](../reference/mcp-tools-reference.md)** - Complete tool documentation
- **[AI Client Integration](../how-to/how-to-deploy-your-application.md)** - Advanced setup options

### Advanced Usage

- **[Create Custom MCP Tools](../how-to/how-to-add-a-new-feature.md)** - Extend documcp functionality
- **[Production Deployment](../how-to/deploy-to-production.md)** - Enterprise setup guide
- **[Performance Tuning](../reference/configuration-options.md)** - Optimize for large repositories

### Community

- **[GitHub Repository](https://github.com/tosin2013/documcp)** - Source code and issues
- **[Discussions](https://github.com/tosin2013/documcp/discussions)** - Community support
- **[Contributing Guide](../how-to/how-to-add-a-new-feature.md)** - Help improve documcp

Welcome to the documcp community! 🚀
