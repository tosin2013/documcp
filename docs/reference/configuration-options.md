# MCP Server Configuration Reference

Complete guide to configuring the documcp MCP server for optimal performance and integration.

## Configuration Overview

documcp MCP server configuration is managed through:
1. Environment variables (recommended)
2. AI client configuration files
3. Runtime parameters

## MCP Server Configuration

### Core Server Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | 'development' | Runtime environment |
| `DEBUG` | string | '' | Debug logging namespaces |
| `LOG_LEVEL` | string | 'info' | Logging level (debug, info, warn, error) |
| `MCP_SERVER_TIMEOUT` | number | 30000 | Tool execution timeout (ms) |

### Performance Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_OPTIONS` | string | '' | Node.js runtime options |
| `UV_THREADPOOL_SIZE` | number | 4 | Thread pool size for I/O operations |
| `MAX_OLD_SPACE_SIZE` | number | 2048 | Maximum heap size (MB) |

### Analysis Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DOCUMCP_MAX_FILE_SIZE` | string | '10MB' | Maximum file size for analysis |
| `DOCUMCP_MAX_ANALYSIS_TIME` | number | 300 | Maximum analysis time (seconds) |
| `DOCUMCP_CACHE_ENABLED` | boolean | true | Enable analysis result caching |
| `DOCUMCP_CACHE_TTL` | number | 3600 | Cache time-to-live (seconds) |

## AI Client Configuration

### Claude Desktop Configuration

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "documcp:*",
        "LOG_LEVEL": "info",
        "UV_THREADPOOL_SIZE": "8",
        "NODE_OPTIONS": "--max-old-space-size=4096"
      }
    }
  }
}
```

### GitHub Copilot Configuration

**Location**: VS Code `settings.json`

```json
{
  "mcp.servers": {
    "documcp": {
      "transport": "stdio",
      "command": "node",
      "args": [
        "--max-old-space-size=4096",
        "/path/to/documcp/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "DEBUG": "documcp:tools",
        "DOCUMCP_MAX_ANALYSIS_TIME": "600"
      }
    }
  }
}
```

## Environment Variables Reference

### Development Environment

```bash
# Basic development setup
export NODE_ENV=development
export DEBUG=documcp:*
export LOG_LEVEL=debug

# Performance tuning for large repositories
export UV_THREADPOOL_SIZE=8
export NODE_OPTIONS="--max-old-space-size=4096"

# Analysis configuration
export DOCUMCP_MAX_FILE_SIZE=50MB
export DOCUMCP_MAX_ANALYSIS_TIME=600
```

### Production Environment

```bash
# Production setup
export NODE_ENV=production
export LOG_LEVEL=info
export DEBUG=documcp:errors

# Performance optimization
export UV_THREADPOOL_SIZE=16
export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"

# Security and limits
export DOCUMCP_MAX_FILE_SIZE=100MB
export DOCUMCP_MAX_ANALYSIS_TIME=300
export DOCUMCP_ALLOWED_PATHS="/workspace,/projects"
```

### Debugging Configuration

```bash
# Comprehensive debugging
export DEBUG=documcp:*,mcp:*
export LOG_LEVEL=debug
export NODE_ENV=development

# Specific component debugging
export DEBUG=documcp:tools          # Tool execution
export DEBUG=documcp:analysis       # Repository analysis
export DEBUG=documcp:validation     # Input validation
export DEBUG=mcp:protocol          # MCP protocol messages
```

## Tool-Specific Configuration

### Repository Analysis

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DOCUMCP_ANALYSIS_DEPTH` | string | 'standard' | Default analysis depth |
| `DOCUMCP_IGNORE_PATTERNS` | string | 'node_modules,dist,.git' | Comma-separated ignore patterns |
| `DOCUMCP_MAX_FILES` | number | 10000 | Maximum files to analyze |

### SSG Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DOCUMCP_DEFAULT_SSG` | string | '' | Default SSG recommendation |
| `DOCUMCP_SSG_PREFERENCES` | string | 'simplicity' | Default preference (simplicity, features, performance) |

### Content Generation

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DOCUMCP_CONTENT_LEVEL` | string | 'comprehensive' | Default content population level |
| `DOCUMCP_PRESERVE_EXISTING` | boolean | true | Preserve existing content by default |
| `DOCUMCP_INCLUDE_EXAMPLES` | boolean | true | Include example content |

## Security Configuration

### File System Access

```bash
# Restrict file system access
export DOCUMCP_ALLOWED_PATHS="/home/user/projects,/workspace"
export DOCUMCP_DENIED_PATHS="/etc,/var,/usr"
export DOCUMCP_MAX_PATH_DEPTH=10
```

### Network Security

```bash
# Disable external network access
export DOCUMCP_ALLOW_NETWORK=false
export DOCUMCP_ALLOW_EXTERNAL_URLS=false

# Configure proxy if needed
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

## Performance Tuning

### Memory Management

```bash
# Large repository optimization
export NODE_OPTIONS="--max-old-space-size=8192 --expose-gc"
export UV_THREADPOOL_SIZE=16

# Memory monitoring
export NODE_OPTIONS="--trace-gc --trace-gc-verbose"
```

### I/O Optimization

```bash
# File system optimization
export UV_THREADPOOL_SIZE=32
export DOCUMCP_CONCURRENT_FILES=50
export DOCUMCP_BUFFER_SIZE=65536
```

### Caching Configuration

```bash
# Analysis result caching
export DOCUMCP_CACHE_ENABLED=true
export DOCUMCP_CACHE_TTL=7200
export DOCUMCP_CACHE_MAX_SIZE=1000
export DOCUMCP_CACHE_DIRECTORY=/tmp/documcp-cache
```

## Configuration Validation

### Validate Configuration

Test your configuration:

```bash
# Test MCP server startup
NODE_ENV=production DEBUG=documcp:config node dist/index.js

# Validate environment variables
node -e "console.log(process.env)" | grep DOCUMCP
```

### Configuration Health Check

```bash
# Check memory limits
node -e "console.log('Max memory:', process.memoryUsage())"

# Check thread pool size
node -e "console.log('Thread pool size:', process.env.UV_THREADPOOL_SIZE || 4)"

# Test file system access
node -e "console.log('CWD:', process.cwd()); console.log('Access:', require('fs').accessSync('.'))"
```

## Troubleshooting Configuration

### Common Issues

**Memory Errors**:
```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
```

**Timeout Issues**:
```bash
# Increase timeouts
export DOCUMCP_MAX_ANALYSIS_TIME=900
export MCP_SERVER_TIMEOUT=60000
```

**Permission Errors**:
```bash
# Check allowed paths
export DOCUMCP_ALLOWED_PATHS="/correct/path"
chmod -R 755 /path/to/repositories
```

### Debug Configuration

```bash
# Enable configuration debugging
export DEBUG=documcp:config,documcp:env
node dist/index.js
```

## Configuration Templates

### Team Development Template

```bash
#!/bin/bash
# team-config.sh
export NODE_ENV=development
export DEBUG=documcp:tools,documcp:analysis
export LOG_LEVEL=info
export UV_THREADPOOL_SIZE=8
export NODE_OPTIONS="--max-old-space-size=4096"
export DOCUMCP_MAX_ANALYSIS_TIME=600
export DOCUMCP_PRESERVE_EXISTING=true
```

### CI/CD Template

```bash
#!/bin/bash
# ci-config.sh
export NODE_ENV=production
export LOG_LEVEL=warn
export DEBUG=documcp:errors
export UV_THREADPOOL_SIZE=4
export NODE_OPTIONS="--max-old-space-size=2048"
export DOCUMCP_MAX_ANALYSIS_TIME=300
export DOCUMCP_CACHE_ENABLED=false
```

### Enterprise Template

```bash
#!/bin/bash
# enterprise-config.sh
export NODE_ENV=production
export LOG_LEVEL=info
export DEBUG=documcp:audit
export UV_THREADPOOL_SIZE=16
export NODE_OPTIONS="--max-old-space-size=8192"
export DOCUMCP_ALLOWED_PATHS="/enterprise/projects"
export DOCUMCP_AUDIT_ENABLED=true
export DOCUMCP_SECURITY_STRICT=true
```
