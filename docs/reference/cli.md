---
documcp:
  last_updated: "2025-11-20T00:46:21.960Z"
  last_validated: "2025-12-09T19:41:38.590Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# Command Line Interface

DocuMCP primarily operates as an MCP server integrated with AI assistants, but it also provides command-line utilities for direct usage and debugging.

## MCP Server Usage

The primary way to use DocuMCP is through MCP-compatible clients:

### Starting the MCP Server

```bash
# Using npx (recommended)
npx documcp

# Using global installation
documcp

# Using Node.js directly
node dist/index.js
```

### Server Information

```bash
# Check version
documcp --version

# Show help
documcp --help

# Debug mode
DEBUG=* documcp
```

## MCP Client Integration

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"],
      "env": {
        "DOCUMCP_STORAGE_DIR": "/path/to/storage"
      }
    }
  }
}
```

### Environment Variables

| Variable              | Description              | Default           |
| --------------------- | ------------------------ | ----------------- |
| `DOCUMCP_STORAGE_DIR` | Memory storage directory | `.documcp/memory` |
| `DEBUG`               | Enable debug logging     | `false`           |
| `NODE_ENV`            | Node.js environment      | `development`     |

## Development Commands

For development and testing:

### Build Commands

```bash
# Build TypeScript
npm run build

# Build in watch mode
npm run dev

# Type checking
npm run typecheck
```

### Testing Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance

# CI test run
npm run test:ci
```

### Code Quality Commands

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Full validation
npm run validate:rules
```

### Documentation Commands

```bash
# Check documentation links
npm run docs:check-links

# Check external links
npm run docs:check-links:external

# Check internal links only
npm run docs:check-links:internal

# Validate documentation structure
npm run docs:validate

# Complete documentation test
npm run docs:test
```

### Security Commands

```bash
# Check for vulnerabilities
npm run security:check

# Audit dependencies
npm audit

# Fix security issues
npm audit fix
```

### Benchmark Commands

```bash
# Run performance benchmarks
npm run benchmark:run

# Show current performance metrics
npm run benchmark:current

# Create benchmark configuration
npm run benchmark:create-config

# Show benchmark help
npm run benchmark:help
```

## Tool Invocation via CLI

While DocuMCP is designed for MCP integration, you can test tools via Node.js:

### Direct Tool Testing

```javascript
// test-tool.js
import { analyzeRepository } from "./dist/tools/analyze-repository.js";

async function test() {
  const result = await analyzeRepository({
    path: process.cwd(),
    depth: "standard",
  });
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
```

```bash
# Run test
node test-tool.js
```

### Tool-Specific Examples

**Repository Analysis:**

```javascript
import { analyzeRepository } from "./dist/tools/analyze-repository.js";

const analysis = await analyzeRepository({
  path: "/path/to/repository",
  depth: "deep",
});
```

**SSG Recommendation:**

```javascript
import { recommendSSG } from "./dist/tools/recommend-ssg.js";

const recommendation = await recommendSSG({
  analysisId: "analysis_12345",
  preferences: {
    ecosystem: "javascript",
    priority: "features",
  },
});
```

**Configuration Generation:**

```javascript
import { generateConfig } from "./dist/tools/generate-config.js";

const config = await generateConfig({
  ssg: "docusaurus",
  projectName: "My Project",
  outputPath: "./docs",
});
```

## Debugging

### Debug Modes

Enable detailed logging:

```bash
# All debug info
DEBUG=* documcp

# Specific modules
DEBUG=documcp:* documcp
DEBUG=documcp:analysis documcp
DEBUG=documcp:memory documcp
```

### Log Levels

DocuMCP supports different log levels:

```bash
# Error only
NODE_ENV=production documcp

# Development (verbose)
NODE_ENV=development documcp

# Custom logging
DEBUG=documcp:error,documcp:warn documcp
```

### Performance Debugging

```bash
# Enable performance tracking
DEBUG=documcp:perf documcp

# Memory usage tracking
DEBUG=documcp:memory documcp

# Network requests
DEBUG=documcp:http documcp
```

## Configuration Files

### Project-level Configuration

Create `.documcprc.json` in your project:

```json
{
  "storage": {
    "directory": ".documcp/memory",
    "maxEntries": 1000,
    "cleanupDays": 30
  },
  "analysis": {
    "defaultDepth": "standard",
    "excludePatterns": ["node_modules", ".git", "dist"]
  },
  "deployment": {
    "defaultBranch": "gh-pages",
    "verifyDeployment": true
  }
}
```

### Global Configuration

Create `~/.documcp/config.json`:

```json
{
  "defaultPreferences": {
    "ecosystem": "any",
    "priority": "simplicity"
  },
  "github": {
    "defaultOrg": "your-username"
  },
  "memory": {
    "enableLearning": true,
    "shareAnonymousData": false
  }
}
```

## Exit Codes

DocuMCP uses standard exit codes:

| Code | Meaning              |
| ---- | -------------------- |
| 0    | Success              |
| 1    | General error        |
| 2    | Invalid arguments    |
| 3    | File system error    |
| 4    | Network error        |
| 5    | Configuration error  |
| 6    | Tool execution error |

## Scripting and Automation

### Batch Operations

Create scripts for common workflows:

```bash
#!/bin/bash
# deploy-docs.sh

set -e

echo "Starting documentation deployment..."

# Test locally first
echo "Testing local build..."
npm run docs:validate

# Deploy via DocuMCP
echo "Analyzing repository..."
# Trigger MCP analysis through your client

echo "Deployment complete!"
```

### CI/CD Integration

DocuMCP can be used in CI/CD pipelines:

```yaml
# .github/workflows/docs.yml
name: Documentation

on:
  push:
    branches: [main]
    paths: ["docs/**", "*.md"]

jobs:
  deploy-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install DocuMCP
        run: npm install -g documcp

      - name: Validate documentation
        run: |
          # Use DocuMCP validation tools
          npm run docs:validate
```

### Programmatic Usage

For advanced integration:

```javascript
// integration.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { analyzeRepository } from "./dist/tools/analyze-repository.js";
import { recommendSSG } from "./dist/tools/recommend-ssg.js";
import { deployPages } from "./dist/tools/deploy-pages.js";

class DocuMCPIntegration {
  async deployDocumentation(repoPath) {
    // Analyze
    const analysis = await analyzeRepository({
      path: repoPath,
      depth: "standard",
    });

    // Get recommendation
    const recommendation = await recommendSSG({
      analysisId: analysis.id,
    });

    // Deploy
    const deployment = await deployPages({
      repository: repoPath,
      ssg: recommendation.recommended,
    });

    return { analysis, recommendation, deployment };
  }
}
```

## Troubleshooting CLI Issues

### Common Problems

**Command not found:**

```bash
# Check installation
which documcp
npm list -g documcp

# Reinstall if needed
npm uninstall -g documcp
npm install -g documcp
```

**Permission errors:**

```bash
# Check permissions
ls -la $(which documcp)

# Fix permissions
chmod +x $(which documcp)
```

**Module resolution errors:**

```bash
# Clear npm cache
npm cache clean --force

# Rebuild
npm run build
```

### Getting Help

```bash
# Show help
documcp --help

# Show version
documcp --version

# Contact support
echo "Report issues: https://github.com/tosin2013/documcp/issues"
```

For more detailed troubleshooting, see the [Troubleshooting Guide](../how-to/troubleshooting.md).
