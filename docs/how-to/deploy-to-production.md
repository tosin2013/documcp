---
id: deploy-to-production
title: Deploy documcp MCP Server
sidebar_label: Deploy MCP Server
---

# Deploy documcp MCP Server

This guide shows you how to deploy and configure the documcp MCP server for production use with AI clients.

## Prerequisites

- Node.js 20 or higher installed
- npm package manager
- AI client that supports MCP (Claude Desktop, GitHub Copilot, etc.)
- Git repository access for documentation projects

## Installation Methods

### Method 1: NPM Installation (Recommended)

1. Install documcp globally:
```bash
npm install -g documcp
```

2. Verify installation:
```bash
documcp --version
```

### Method 2: Local Development Setup

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

4. Start the MCP server:
```bash
npm run dev
```

## MCP Client Configuration

### Claude Desktop Configuration

1. Locate Claude Desktop's configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add documcp server configuration:
```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

3. Restart Claude Desktop to load the configuration.

### GitHub Copilot Configuration

1. Install the MCP extension for your IDE
2. Configure the MCP server endpoint:
```json
{
  "mcp.servers": {
    "documcp": {
      "transport": "stdio",
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"]
    }
  }
}
```

## Verification Steps

### 1. Test MCP Server Connection

In your AI client, try a basic command:
```
Can you analyze this repository using documcp?
```

The AI should respond with available documcp tools.

### 2. Verify Tool Availability

Check that all core tools are accessible:
- `analyzeRepository`
- `recommendSSG`
- `generateConfiguration`
- `createDiataxisStructure`
- `generateWorkflow`

### 3. Test Complete Workflow

Run a full documentation setup:
```
Use documcp to analyze my project and set up complete documentation with GitHub Pages deployment.
```

## Production Configuration

### Environment Variables

Set these environment variables for production:
```bash
export NODE_ENV=production
export LOG_LEVEL=info
export MCP_SERVER_PORT=3000
```

### Performance Optimization

1. **Memory Limits**: Set Node.js memory limits for large repositories:
```bash
node --max-old-space-size=4096 dist/index.js
```

2. **Concurrent Processing**: Configure worker thread limits:
```bash
export UV_THREADPOOL_SIZE=8
```

### Security Configuration

1. **File System Access**: Limit repository access paths:
```json
{
  "security": {
    "allowedPaths": ["/home/user/projects", "/workspace"],
    "maxFileSize": "100MB",
    "maxAnalysisTime": "300s"
  }
}
```

2. **Network Security**: Configure firewall rules if needed:
```bash
# Allow only local connections
iptables -A INPUT -p tcp --dport 3000 -s 127.0.0.1 -j ACCEPT
```

## Monitoring and Logging

### Enable Detailed Logging

```bash
export DEBUG=documcp:*
npm start
```

### Log File Configuration

```json
{
  "logging": {
    "level": "info",
    "file": "/var/log/documcp/server.log",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

### Health Check Endpoint

Test server health:
```bash
curl http://localhost:3000/health
```

## Troubleshooting

### Common Issues

**MCP Server Not Found**
- Verify the path in your AI client configuration
- Check that Node.js and npm are in your PATH
- Ensure the server process is running

**Tool Execution Failures**
- Check file permissions for repository access
- Verify Node.js version compatibility (20+)
- Review server logs for detailed error messages

**Performance Issues**
- Increase memory limits for large repositories
- Configure appropriate worker thread counts
- Monitor disk I/O for repository analysis

### Debug Mode

Enable debug mode for troubleshooting:
```bash
NODE_ENV=development DEBUG=* npm run dev
```

## Maintenance

### Regular Updates

1. Check for updates:
```bash
npm outdated -g documcp
```

2. Update to latest version:
```bash
npm update -g documcp
```

### Dependency Security

Run security audits regularly:
```bash
npm audit
npm audit fix
```

## Related Guides

- [How to Debug MCP Issues](./how-to-debug-common-issues.md)
- [How to Create Custom MCP Tools](./how-to-add-a-new-feature.md)
- [AI Client Integration Setup](./how-to-deploy-your-application.md)
- [Reference Documentation](../reference/)