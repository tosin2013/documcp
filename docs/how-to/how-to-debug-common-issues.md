# How to Debug MCP Server Issues

This guide helps you troubleshoot and debug common issues with the documcp MCP server and AI client integration.

## MCP Server Debugging Tools

### Enable Debug Logging

Start the MCP server with comprehensive debugging:
```bash
DEBUG=documcp:* npm run dev
```

For specific components:
```bash
# Tool execution debugging
DEBUG=documcp:tools npm run dev

# Repository analysis debugging  
DEBUG=documcp:analysis npm run dev

# MCP protocol debugging
DEBUG=mcp:* npm run dev
```

### MCP Server Inspector

Run with Node.js inspector for breakpoint debugging:
```bash
node --inspect dist/index.js
```

Connect via Chrome DevTools or VS Code debugger.

### Validate MCP Configuration

Check your MCP server configuration:
```bash
# Verify server starts correctly
npm run build && node dist/index.js

# Test MCP protocol handshake
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' | node dist/index.js
```

## Common MCP Integration Issues

### Issue: AI Client Cannot Find MCP Server

**Symptoms**: 
- "MCP server not found" errors
- AI client shows no documcp tools available
- Connection timeouts

**Solutions**:
1. **Verify Installation Path**:
   ```bash
   which node
   npm list -g documcp
   ```

2. **Check AI Client Configuration**:
   ```json
   // Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
   {
     "mcpServers": {
       "documcp": {
         "command": "node",
         "args": ["/correct/path/to/documcp/dist/index.js"]
       }
     }
   }
   ```

3. **Test Server Startup**:
   ```bash
   node /path/to/documcp/dist/index.js
   # Should show MCP server initialization logs
   ```

### Issue: Tool Execution Failures

**Symptoms**:
- Tools appear available but fail when called
- "Validation error" messages
- Incomplete tool responses

**Solutions**:
1. **Check File Permissions**:
   ```bash
   # Ensure repository access
   ls -la /path/to/target/repository
   chmod -R 755 /path/to/target/repository
   ```

2. **Validate Input Parameters**:
   ```bash
   # Test tool with minimal valid input
   DEBUG=documcp:validation npm run dev
   ```

3. **Review Zod Schema Validation**:
   ```typescript
   // Check tool parameter validation
   import { z } from 'zod';
   
   const schema = z.object({
     path: z.string().min(1),
     depth: z.enum(['quick', 'standard', 'deep']).optional()
   });
   
   // Validate your input
   const result = schema.safeParse(yourInput);
   if (!result.success) {
     console.error('Validation errors:', result.error.issues);
   }
   ```

### Issue: Repository Analysis Failures

**Symptoms**:
- "Cannot analyze repository" errors
- Incomplete analysis results
- Memory or timeout errors

**Solutions**:
1. **Check Repository Structure**:
   ```bash
   # Verify it's a valid repository
   cd /path/to/repository
   ls -la
   git status  # If it's a git repo
   ```

2. **Increase Memory Limits**:
   ```bash
   node --max-old-space-size=4096 dist/index.js
   ```

3. **Enable Analysis Debugging**:
   ```bash
   DEBUG=documcp:analysis,documcp:filesystem npm run dev
   ```

4. **Test with Smaller Scope**:
   ```bash
   # Analyze specific subdirectory first
   DEBUG=documcp:* node -e "
   const { analyzeRepository } = require('./dist/tools/analyze-repository');
   analyzeRepository({ path: './src', depth: 'quick' });
   "
   ```

## MCP Protocol Debugging

### Trace MCP Messages

Monitor MCP protocol communication:
```bash
# Enable MCP protocol tracing
DEBUG=mcp:protocol npm run dev
```

### Validate Tool Definitions

Check that tools are properly registered:
```bash
# List available tools
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/index.js
```

### Test Individual Tools

Test tools in isolation:
```bash
# Test analyze_repository tool
echo '{
  "jsonrpc": "2.0", 
  "id": 1, 
  "method": "tools/call",
  "params": {
    "name": "analyze_repository",
    "arguments": {"path": "./test-repo", "depth": "quick"}
  }
}' | node dist/index.js
```

## Performance Debugging

### Memory Usage Analysis

Monitor memory consumption during large repository analysis:
```bash
# Enable garbage collection logs
node --expose-gc --trace-gc dist/index.js
```

### Profile Tool Execution

Profile slow tool execution:
```bash
# Generate CPU profile
node --prof dist/index.js
# Process profile after execution
node --prof-process isolate-*.log > profile.txt
```

### Monitor File System Operations

Track file system access patterns:
```bash
# macOS
sudo fs_usage -w -f filesystem node dist/index.js

# Linux  
strace -e trace=file node dist/index.js
```

## TypeScript and Build Issues

### Type Checking Errors

**Symptoms**: TypeScript compilation failures

**Solutions**:
1. **Run Type Checking**:
   ```bash
   npm run typecheck
   ```

2. **Check tsconfig.json**:
   ```bash
   # Verify TypeScript configuration
   npx tsc --showConfig
   ```

3. **Update Type Definitions**:
   ```bash
   npm install @types/node@latest
   npm install @modelcontextprotocol/sdk@latest
   ```

### Build Process Issues

**Symptoms**: Build failures, missing dist files

**Solutions**:
1. **Clean Build**:
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Check Build Dependencies**:
   ```bash
   npm audit
   npm install
   ```

### npm ci Failures

**Symptoms**: 
- `npm ci` fails with "Missing: package@version from lock file"
- Package-lock.json and package.json out of sync errors
- CI/CD pipeline failures on dependency installation

**Solutions**:
1. **Regenerate package-lock.json**:
   ```bash
   # Remove existing lock file and node_modules
   rm package-lock.json
   rm -rf node_modules
   
   # Reinstall dependencies
   npm install
   
   # Test that npm ci works
   rm -rf node_modules
   npm ci
   ```

2. **Fix package-lock.json sync issues**:
   ```bash
   # Update lock file to match package.json
   npm install --package-lock-only
   
   # Verify the fix
   npm ci
   ```

3. **Clear npm cache** (if persistent issues):
   ```bash
   npm cache clean --force
   npm install
   ```

4. **Ensure consistent Node.js/npm versions**:
   ```bash
   # Check versions match .nvmrc
   node --version  # Should be >=20.0.0
   npm --version
   
   # Use exact Node.js version
   nvm use $(cat .nvmrc)
   npm ci
   ```

## AI Client Specific Issues

### Claude Desktop Integration

**Debug Claude Desktop MCP Issues**:
1. Check Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/`
   - **Windows**: `%LOCALAPPDATA%\Claude\logs\`

2. Validate configuration syntax:
   ```bash
   # Validate JSON syntax
   python -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

### GitHub Copilot Integration

**Debug Copilot MCP Issues**:
1. Check VS Code extension logs
2. Verify MCP extension configuration
3. Test with minimal MCP server first

## Getting Help

### Diagnostic Information Collection

When reporting issues, collect this information:
```bash
# System information
node --version
npm --version
uname -a

# documcp information  
npm list documcp
DEBUG=documcp:* npm run dev 2>&1 | head -50

# MCP configuration
cat ~/.config/claude/claude_desktop_config.json  # or appropriate path
```

### Support Resources

1. **Check Documentation**: [API Reference](../reference/api-reference.md)
2. **Search Issues**: [GitHub Issues](https://github.com/tosin2013/documcp/issues)
3. **MCP Protocol**: [MCP Specification](https://modelcontextprotocol.io/docs)
4. **Community Support**: [Discussions](https://github.com/tosin2013/documcp/issues)

### Creating Bug Reports

Include in bug reports:
- **Environment**: OS, Node.js version, AI client
- **Configuration**: MCP server config (sanitized)
- **Reproduction Steps**: Minimal example
- **Logs**: Debug output with sensitive data removed
- **Expected vs Actual**: Clear description of the issue
