# Setting Up Your DocuMCP Development Environment

This guide will help you set up a complete development environment for contributing to DocuMCP, including the MCP server, documentation tools, and testing infrastructure.

## Prerequisites

DocuMCP requires Node.js 20+ for optimal performance with the MCP SDK and TypeScript compilation.

## Installing Node.js

### Using Node Version Manager (nvm) - Recommended

1. Install nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/latest/install.sh | bash
   ```

2. Install and use Node.js 20 (required by DocuMCP):
   ```bash
   nvm install 20
   nvm use 20
   ```

3. Verify installation:
   ```bash
   node --version  # Should show v20.x.x
   npm --version   # Should show 10.x.x or higher
   ```

## Clone and Setup DocuMCP

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

4. Verify the MCP server works:
   ```bash
   npm start
   ```

## Development Tools

### Recommended VS Code Extensions for DocuMCP Development

- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **TypeScript and JavaScript Language Features**: Enhanced TypeScript support
- **GitLens**: Git integration and history
- **MCP Protocol Support**: For MCP server development (if available)

### Debugging the MCP Server

Create a `.vscode/launch.json` file for debugging DocuMCP:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug DocuMCP Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Tools",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/tools/analyze-repository.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Testing Your Setup

1. **Run the test suite**:
   ```bash
   npm test
   ```

2. **Test MCP server locally**:
   ```bash
   npm run dev
   ```

3. **Test documentation generation**:
   ```bash
   npm run test:docs
   ```

## MCP Client Integration

To test DocuMCP with AI clients during development:

1. **Build the development version**:
   ```bash
   npm run build
   ```

2. **Link for local testing**:
   ```bash
   npm link
   ```

3. **Configure Claude Desktop for development**:
   ```json
   {
     "mcpServers": {
       "documcp-dev": {
         "command": "node",
         "args": ["/path/to/documcp/dist/index.js"],
         "env": {
           "DOCUMCP_TARGET_REPO": "/path/to/test/project"
         }
       }
     }
   }
   ```

## Next Steps

- Read the [Writing and Running Tests](writing-and-running-tests.md) tutorial
- Explore the [API Reference](../reference/api-reference.md)
- Check out [How to Add a New Feature](../how-to/how-to-add-a-new-feature.md)
