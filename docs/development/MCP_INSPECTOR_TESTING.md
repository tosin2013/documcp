---
documcp:
  last_updated: "2025-11-20T00:46:21.945Z"
  last_validated: "2025-11-20T00:46:21.945Z"
  auto_updated: false
  update_frequency: monthly
---

# MCP Inspector Testing Guide

The MCP Inspector is an in-browser debugging tool for testing MCP servers without connecting to actual applications. This guide explains how to use it for DocuMCP development.

## Prerequisites

- Node.js 20+ installed
- DocuMCP repository cloned
- Dependencies installed (`npm install`)

## Quick Start

### Option 1: Build and Launch Inspector

```bash
npm run build:inspect
```

This command:

1. Compiles TypeScript to `dist/`
2. Launches MCP Inspector
3. Opens browser at `http://localhost:5173` (or similar)

### Option 2: Launch Inspector with Existing Build

```bash
npm run build          # First build (if needed)
npm run dev:inspect    # Then launch inspector
```

## Using the Inspector

### 1. Connect to Server

1. Open the browser URL provided by the inspector
2. Click the "Connect" button in the left sidebar
3. Wait for connection confirmation

### 2. Test Tools

The Tools section lists all available MCP tools:

**Example: Testing `analyze_repository`**

1. Click "Tools" in the top navigation
2. Select "analyze_repository" from the list
3. In the right panel, enter parameters:
   ```json
   {
     "path": "./",
     "depth": "standard"
   }
   ```
4. Click "Run Tool"
5. Verify the output includes:
   - File counts
   - Language detection
   - Dependency analysis
   - Memory insights

**Example: Testing `recommend_ssg`**

1. First run `analyze_repository` (as above) to get an `analysisId`
2. Select "recommend_ssg"
3. Enter parameters:
   ```json
   {
     "analysisId": "<id-from-previous-analysis>",
     "userId": "test-user",
     "preferences": {
       "priority": "simplicity",
       "ecosystem": "javascript"
     }
   }
   ```
4. Click "Run Tool"
5. Verify recommendation includes:
   - Recommended SSG
   - Confidence score
   - Reasoning
   - Alternative options

### 3. Test Resources

Resources provide static data for application UIs:

**Example: Testing SSG List**

1. Click "Resources" in the top navigation
2. Select "documcp://ssgs/available"
3. Verify output shows all 5 SSGs:
   - Jekyll
   - Hugo
   - Docusaurus
   - MkDocs
   - Eleventy
4. Check each SSG includes:
   - ID, name, description
   - Language, complexity, build speed
   - Best use cases

**Example: Testing Configuration Templates**

1. Select "documcp://templates/jekyll-config"
2. Verify YAML template is returned
3. Test other templates:
   - `documcp://templates/hugo-config`
   - `documcp://templates/docusaurus-config`
   - `documcp://templates/mkdocs-config`
   - `documcp://templates/eleventy-config`
   - `documcp://templates/diataxis-structure`

### 4. Test Prompts

Prompts provide pre-written instructions for specialized tasks:

**Example: Testing `tutorial-writer`**

1. Click "Prompts" in the top navigation
2. Select "tutorial-writer"
3. Provide arguments:
   ```json
   {
     "project_path": "./",
     "target_audience": "beginners",
     "learning_goal": "deploy first documentation site"
   }
   ```
4. Click "Get Prompt"
5. Verify prompt messages include:
   - Project context (languages, frameworks)
   - Diataxis tutorial requirements
   - Step-by-step structure guidance

**Example: Testing `analyze-and-recommend` workflow**

1. Select "analyze-and-recommend"
2. Provide arguments:
   ```json
   {
     "project_path": "./",
     "analysis_depth": "standard",
     "preferences": "good community support"
   }
   ```
3. Verify workflow prompt includes:
   - Complete analysis workflow
   - SSG recommendation guidance
   - Implementation steps

## Common Test Cases

### Tool Testing Checklist

- [ ] **analyze_repository**

  - [ ] Test with current directory (`./`)
  - [ ] Test with different depth levels
  - [ ] Verify memory integration works
  - [ ] Check similar projects are found

- [ ] **recommend_ssg**

  - [ ] Test with valid analysisId
  - [ ] Test different preference combinations
  - [ ] Verify confidence scores
  - [ ] Check historical data integration

- [ ] **generate_config**

  - [ ] Test each SSG type
  - [ ] Verify output format
  - [ ] Check template variables

- [ ] **setup_structure**

  - [ ] Test Diataxis structure creation
  - [ ] Verify all categories included
  - [ ] Check example content

- [ ] **deploy_pages**

  - [ ] Test workflow generation
  - [ ] Verify GitHub Actions YAML
  - [ ] Check custom domain support

- [ ] **validate_content**
  - [ ] Test with documentation path
  - [ ] Verify link checking
  - [ ] Check code block validation

### Resource Testing Checklist

- [ ] **documcp://ssgs/available**

  - [ ] All 5 SSGs listed
  - [ ] Complete metadata for each

- [ ] **Templates**

  - [ ] Jekyll config valid YAML
  - [ ] Hugo config valid YAML
  - [ ] Docusaurus config valid JS
  - [ ] MkDocs config valid YAML
  - [ ] Eleventy config valid JS
  - [ ] Diataxis structure valid JSON

- [ ] **Workflows**
  - [ ] All workflows listed
  - [ ] Quick setup available
  - [ ] Full setup available
  - [ ] Guidance provided

### Prompt Testing Checklist

- [ ] **Technical Writer Prompts**

  - [ ] tutorial-writer
  - [ ] howto-guide-writer
  - [ ] reference-writer
  - [ ] explanation-writer
  - [ ] diataxis-organizer
  - [ ] readme-optimizer

- [ ] **Workflow Prompts**
  - [ ] analyze-and-recommend
  - [ ] setup-documentation
  - [ ] troubleshoot-deployment

## Troubleshooting

### Inspector Won't Connect

**Problem:** Connection fails or times out

**Solutions:**

1. Ensure server is built: `npm run build`
2. Check no other process is using the port
3. Try restarting: `Ctrl+C` and re-run `npm run dev:inspect`

### Tool Returns Error

**Problem:** Tool execution fails with error message

**Solutions:**

1. Check parameter format (must be valid JSON)
2. Verify required parameters are provided
3. Ensure file paths exist (for file-based tools)
4. Check server logs for detailed error messages

### Resource Not Found

**Problem:** Resource URI returns "Resource not found" error

**Solutions:**

1. Verify URI spelling matches exactly (case-sensitive)
2. Check resource list for available URIs
3. Ensure server version matches documentation

### Prompt Arguments Missing

**Problem:** Prompt doesn't use provided arguments

**Solutions:**

1. Check argument names match prompt definition
2. Verify JSON format is correct
3. Required arguments must be provided

## Best Practices

### During Development

1. **Keep Inspector Open:** Launch inspector at start of development session
2. **Test After Changes:** Run tool tests after modifying tool implementation
3. **Verify All Paths:** Test both success and error paths
4. **Check Edge Cases:** Test with unusual inputs, empty values, etc.

### Before Committing

1. **Full Tool Test:** Test at least one example from each tool
2. **Resource Validation:** Verify all resources return valid data
3. **Prompt Verification:** Check prompts generate correct messages
4. **Error Handling:** Test with invalid inputs to verify error messages

### For Bug Fixing

1. **Reproduce in Inspector:** Use inspector to reproduce bug consistently
2. **Test Fix:** Verify fix works in inspector before integration testing
3. **Regression Test:** Test related tools to ensure no regressions
4. **Document:** Add test case to this guide if bug was subtle

## Integration with Development Workflow

### Daily Development

```bash
# Morning startup
npm run build:inspect

# Keep inspector tab open
# Make code changes in editor
# Test changes in inspector
# Iterate until working

# Before lunch/end of day
npm run build && npm test
```

### Pre-Commit Workflow

```bash
# Run full validation
npm run ci

# Test in inspector
npm run build:inspect

# Manual spot checks on key tools
# Commit when all checks pass
```

### CI/CD Integration

While MCP Inspector is primarily for local development, you can add automated checks:

```bash
# In CI pipeline (future enhancement)
npm run build
npx @modelcontextprotocol/inspector dist/index.js --test automated-tests.json
```

## Additional Resources

- **MCP Inspector GitHub:** https://github.com/modelcontextprotocol/inspector
- **MCP Specification:** https://modelcontextprotocol.io/docs
- **MCP TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **DocuMCP Architecture:** See `docs/adrs/` for detailed architectural decisions

## Feedback

If you encounter issues with MCP Inspector or this guide:

1. Check for known issues: https://github.com/modelcontextprotocol/inspector/issues
2. Report DocuMCP-specific issues: https://github.com/anthropics/documcp/issues
3. Suggest improvements to this guide via pull request

---

**Last Updated:** 2025-10-09
**Version:** 1.0.0
