# How to Debug MCP Server Issues

This guide helps you troubleshoot and debug common issues when developing with or integrating DocuMCP.

## MCP Server Debugging

### Testing MCP Server Directly

Test the server without an MCP client:
```bash
# Verify server starts correctly
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

# Expected output should list 10 tools
```

### Enable Debug Logging

Set environment variables for detailed logging:
```bash
# Enable all MCP debugging
DEBUG=mcp:* npm run dev

# Enable specific tool debugging
DEBUG=documcp:* npm run dev

# Full debug output
DEBUG=* npm run dev
```

### Validate MCP Client Configuration

Check your MCP client configuration file:

**Claude Desktop** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/absolute/path/to/documcp/dist/index.js"],
      "env": {
        "DEBUG": "documcp:*"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "documcp": {
      "command": "node", 
      "args": ["/absolute/path/to/documcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Common MCP Integration Issues

### Issue: MCP Server Not Found

**Symptoms**: "Failed to connect to MCP server" or "Server not available"

**Diagnosis Steps**:
1. Verify the build was successful:
   ```bash
   npm run build
   ls -la dist/index.js  # Should exist
   ```

2. Test server manually:
   ```bash
   node dist/index.js
   # Should not exit immediately
   ```

3. Check absolute paths in MCP configuration

**Solutions**:
- Use absolute paths, not relative paths
- Restart your MCP client after configuration changes
- Verify Node.js version compatibility (18+)

### Issue: Tools Not Available in MCP Client

**Symptoms**: DocuMCP tools don't appear in tool lists

**Diagnosis Steps**:
1. Test tools list directly:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
   ```

2. Check for JSON parsing errors in client logs

**Solutions**:
- Validate JSON syntax in MCP configuration
- Check client-specific MCP extension is enabled
- Restart MCP client completely

### Issue: Tool Execution Failures

**Symptoms**: Tools fail with permission or path errors

**Common Error**: `ENOENT: no such file or directory`
**Solution**: 
```bash
# Ensure proper absolute paths
pwd  # Note current directory
# Use full path like /Users/username/project instead of ./project
```

**Common Error**: `Permission denied` 
**Solution**:
```bash
# Check file permissions
ls -la /path/to/repository
chmod -R 755 /path/to/repository  # If needed
```

## Tool-Specific Debugging

### Repository Analysis Issues

**Issue**: `analyze_repository` fails to scan files

**Debug Steps**:
```bash
# Test repository access
ls -la /path/to/repo
find /path/to/repo -name "package.json" -o -name "*.ts" | head -10

# Check for large files that might cause timeout
find /path/to/repo -size +50M
```

**Solutions**:
- Exclude node_modules and build directories
- Use relative paths from repository root
- Check for symlinks that might cause loops

### SSG Recommendation Issues

**Issue**: `recommend_ssg` returns generic recommendations

**Debug Steps**:
1. Verify analysis ID is passed correctly
2. Check analysis results contain project metadata:
   ```bash
   # Analysis should detect languages and frameworks
   grep -r "package.json\|requirements.txt\|Gemfile" /path/to/repo
   ```

### Deployment Issues

**Issue**: `deploy_pages` creates invalid GitHub Actions workflows

**Debug Steps**:
1. Validate generated workflow syntax:
   ```bash
   # Check .github/workflows/deploy-docs.yml
   npx js-yaml .github/workflows/deploy-docs.yml
   ```

2. Test workflow locally:
   ```bash
   # Simulate build process
   cd docs && npm install && npm run build
   ```

## Performance Debugging

### Slow Tool Execution

**Monitor tool performance**:
```bash
# Time tool execution
time echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_repository","arguments":{"path":"."}}}' | node dist/index.js
```

**Common Causes**:
- Large repositories (&gt;1GB)
- Deep directory structures (&gt;20 levels) 
- Network issues during GitHub API calls

**Solutions**:
- Use `depth: "quick"` for large repositories
- Exclude unnecessary directories in .gitignore
- Check network connectivity for deployment tools

### Memory Issues

**Monitor memory usage**:
```bash
# Check memory during execution
node --max-old-space-size=4096 dist/index.js
```

## Integration Testing

### End-to-End Workflow Testing

Test complete documentation workflow:
```bash
# 1. Analyze repository
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_repository","arguments":{"path":".","depth":"standard"}}}' | node dist/index.js > analysis.json

# 2. Extract analysis ID
ANALYSIS_ID=$(cat analysis.json | jq -r '.result.id')

# 3. Get recommendation
echo "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"recommend_ssg\",\"arguments\":{\"analysisId\":\"$ANALYSIS_ID\"}}}" | node dist/index.js
```

### Validate Documentation Output

After running documentation tools:
```bash
# Check generated structure
find docs -type f -name "*.md" | sort

# Validate markdown syntax
npm install -g markdownlint-cli
markdownlint docs/**/*.md

# Test SSG build
cd docs
npm install && npm run build
```

## MCP Client-Specific Issues

### Claude Desktop

**Issue**: Tools appear but fail to execute
```bash
# Check Claude Desktop logs (macOS)
tail -f ~/Library/Logs/Claude/claude.log
```

### Cursor IDE

**Issue**: MCP extension not loading
1. Check Cursor extension logs
2. Verify MCP extension is enabled
3. Restart Cursor completely

### VS Code

**Issue**: MCP tools not appearing
1. Check MCP extension status
2. Reload VS Code window
3. Check extension output panel

## Getting Advanced Help

### Log Collection for Bug Reports

Collect comprehensive debugging information:
```bash
# System information
node --version
npm --version
uname -a

# MCP server test
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js > mcp-test.json

# Configuration check
cat ~/.claude/mcp.json # or .cursor/mcp.json

# Repository structure
find . -type f -name "*.json" -o -name "*.md" | head -20
```

### Community Resources

- **GitHub Issues**: [Report bugs](https://github.com/tosin2013/documcp/issues)
- **Discussions**: [Ask questions](https://github.com/tosin2013/documcp/discussions)
- **MCP Protocol**: [Official docs](https://modelcontextprotocol.io/)

### Advanced Debugging

Enable comprehensive debugging:
```bash
# Full debug with timing
DEBUG=* TIME=1 node dist/index.js

# Memory profiling
node --inspect --max-old-space-size=4096 dist/index.js

# CPU profiling
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```
