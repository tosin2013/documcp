# How to Set Up AI Client Integration

This guide covers setting up AI clients to work with the documcp MCP server for seamless documentation workflows.

## Prerequisites

- documcp MCP server installed and working
- AI client that supports MCP protocol
- Basic understanding of JSON configuration files

## Supported AI Clients

### Claude Desktop (Recommended)

Claude Desktop provides the most mature MCP integration with documcp.

#### Installation

1. **Download Claude Desktop**:
   - Visit [Claude Desktop](https://claude.ai/download)
   - Install for your operating system

2. **Locate Configuration File**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/claude/claude_desktop_config.json`

3. **Configure documcp Server**:
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

4. **Find Your documcp Path**:
   ```bash
   # If installed globally
   npm list -g documcp
   
   # If installed locally
   pwd  # Use this path + /dist/index.js
   ```

5. **Restart Claude Desktop** to load the configuration.

#### Verification

Test the integration by asking Claude:
```
Can you analyze my repository using documcp tools?
```

Claude should respond with available documcp tools and offer to help with documentation setup.

### GitHub Copilot Integration

GitHub Copilot Chat supports MCP through extensions.

#### Setup Steps

1. **Install MCP Extension**:
   - Open VS Code
   - Install "MCP for GitHub Copilot" extension
   - Restart VS Code

2. **Configure MCP Server**:
   ```json
   // settings.json
   {
     "mcp.servers": {
       "documcp": {
         "transport": "stdio",
         "command": "node",
         "args": ["/path/to/documcp/dist/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. **Enable MCP in Copilot**:
   - Open Command Palette (`Cmd+Shift+P`)
   - Run "MCP: Enable Server"
   - Select "documcp"

#### Usage

In GitHub Copilot Chat:
```
@mcp documcp analyze this repository and recommend documentation structure
```

### Other AI Clients

#### OpenAI ChatGPT (via MCP Bridge)

Use community MCP bridges for ChatGPT integration:

1. **Install MCP Bridge**:
   ```bash
   npm install -g mcp-chatgpt-bridge
   ```

2. **Configure Bridge**:
   ```json
   {
     "servers": {
       "documcp": {
         "command": "node",
         "args": ["/path/to/documcp/dist/index.js"]
       }
     },
     "chatgpt": {
       "apiKey": "your-openai-api-key",
       "model": "gpt-4"
     }
   }
   ```

## Configuration Best Practices

### Security Configuration

1. **Limit File Access**:
   ```json
   {
     "mcpServers": {
       "documcp": {
         "command": "node",
         "args": ["/path/to/documcp/dist/index.js"],
         "env": {
           "NODE_ENV": "production",
           "ALLOWED_PATHS": "/home/user/projects,/workspace"
         }
       }
     }
   }
   ```

2. **Resource Limits**:
   ```json
   {
     "mcpServers": {
       "documcp": {
         "command": "node",
         "args": [
           "--max-old-space-size=2048",
           "/path/to/documcp/dist/index.js"
         ],
         "timeout": 30000
       }
     }
   }
   ```

### Performance Optimization

1. **Memory Management**:
   ```json
   {
     "mcpServers": {
       "documcp": {
         "command": "node",
         "args": [
           "--max-old-space-size=4096",
           "--expose-gc",
           "/path/to/documcp/dist/index.js"
         ]
       }
     }
   }
   ```

2. **Concurrent Processing**:
   ```json
   {
     "mcpServers": {
       "documcp": {
         "env": {
           "UV_THREADPOOL_SIZE": "8",
           "NODE_OPTIONS": "--max-old-space-size=4096"
         }
       }
     }
   }
   ```

## Workflow Integration

### Complete Documentation Setup

Once your AI client is configured, you can run complete documentation workflows:

```
I need to set up comprehensive documentation for my TypeScript project. Can you:

1. Analyze my repository structure
2. Recommend the best static site generator
3. Create a complete Diataxis documentation structure
4. Set up GitHub Pages deployment
5. Populate the documentation with project-specific content
```

### Automated Documentation Updates

Set up automated documentation maintenance:

```
Please help me:
1. Detect gaps in my current documentation
2. Validate all existing content for accuracy
3. Update outdated sections
4. Generate missing how-to guides
```

### Multi-Project Management

For teams managing multiple projects:

```
Can you help me standardize documentation across multiple repositories? I want to:
1. Analyze 5 different projects
2. Create consistent documentation templates
3. Set up automated deployment workflows
4. Establish documentation quality standards
```

## Troubleshooting Integration

### Common Issues

**AI Client Shows No Tools**:
1. Verify MCP server path is correct
2. Check that Node.js is in PATH
3. Restart the AI client
4. Review client-specific logs

**Tool Execution Timeouts**:
1. Increase timeout values in configuration
2. Add memory limits to prevent crashes
3. Test with smaller repositories first

**Permission Errors**:
1. Ensure documcp has read access to target repositories
2. Check file system permissions
3. Verify environment variable configuration

### Debug Mode

Enable debug mode for troubleshooting:
```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {
        "DEBUG": "documcp:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Advanced Integration

### Custom Tool Configuration

Configure specific tools for your workflow:
```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {
        "DOCUMCP_DEFAULT_SSG": "docusaurus",
        "DOCUMCP_DEFAULT_DEPTH": "comprehensive",
        "DOCUMCP_ENABLE_GITHUB_INTEGRATION": "true"
      }
    }
  }
}
```

### Team Configuration

Share configuration across team members:
```bash
# Create team configuration template
cat > team-mcp-config.json << EOF
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["$(npm root -g)/documcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "TEAM_STANDARDS": "true"
      }
    }
  }
}
EOF
```

## Related Guides

- [Deploy documcp MCP Server](./deploy-to-production.md)
- [Debug MCP Issues](./how-to-debug-common-issues.md)
- [Create Custom MCP Tools](./how-to-add-a-new-feature.md)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)
