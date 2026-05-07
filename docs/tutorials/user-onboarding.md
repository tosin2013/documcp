---
documcp:
  last_updated: "2026-05-07"
  last_validated: "2026-05-07"
  auto_updated: false
  update_frequency: monthly
---

# DocuMCP User Onboarding Guide

Welcome to DocuMCP. This guide covers common usage patterns once you have DocuMCP installed and connected to your AI client. If you have not done that yet, start with the [Getting Started](./getting-started.md) tutorial.

## Quick Recap: How DocuMCP Works

DocuMCP is an MCP server. You do not run CLI commands — you ask your AI assistant (Claude Desktop, Cursor, VS Code Copilot) and it calls the right DocuMCP tools on your behalf. Every pattern below shows the natural-language prompt alongside the underlying tool so you know what is happening.

---

## Usage Patterns

### Pattern 1: Repository Analysis

**MCP tool:** `analyze_repository`

```
Analyze my repository at /path/to/my-project
```

With depth control:

```
Do a deep analysis of /path/to/large-project to understand its documentation needs
```

Parameter reference:

```json
{
  "path": "/path/to/your/project",
  "depth": "standard"
}
```

Depth options: `quick` (large repos), `standard` (default), `deep` (comprehensive).

---

### Pattern 2: SSG Recommendation

**MCP tool:** `recommend_ssg`

```
Recommend a static site generator based on the analysis I just ran
```

With explicit preferences:

```
Recommend an SSG for analysis_abc123xyz, prioritizing performance and JavaScript ecosystem
```

Parameter reference:

```json
{
  "analysisId": "analysis_abc123xyz",
  "preferences": {
    "ecosystem": "javascript",
    "priority": "performance"
  }
}
```

---

### Pattern 3: Documentation Structure Setup

**MCP tool:** `setup_structure`

```
Set up a Diataxis documentation structure for Docusaurus in my project's docs folder
```

Parameter reference:

```json
{
  "path": "/path/to/your/project/docs",
  "ssg": "docusaurus",
  "includeExamples": true
}
```

---

### Pattern 4: Configuration Generation

**MCP tool:** `generate_config`

```
Generate a Docusaurus configuration for My Project
```

Parameter reference:

```json
{
  "ssg": "docusaurus",
  "projectName": "My Project",
  "projectDescription": "A description of my project",
  "outputPath": "/path/to/your/project"
}
```

---

### Pattern 5: Content Population

**MCP tool:** `populate_content`

```
Populate the documentation structure with content based on my repository analysis
```

Parameter reference:

```json
{
  "analysisId": "analysis_abc123xyz",
  "docsPath": "/path/to/your/project/docs"
}
```

---

### Pattern 6: Deployment

**MCP tool:** `deploy_site`

To GitHub Pages:

```
Deploy my documentation to GitHub Pages
```

To Vercel:

```
Deploy my documentation to Vercel
```

Parameter reference:

```json
{
  "projectPath": "/path/to/your/project",
  "target": "github-pages",
  "ssg": "docusaurus"
}
```

---

## Common Use Cases

### New Open Source Project

```
1. "Analyze my repository at /path/to/my-oss-project"
2. "Recommend an SSG focused on community and discoverability"
3. "Set up a Diataxis documentation structure using the recommended SSG"
4. "Generate the configuration files"
5. "Populate the docs with content from my project"
6. "Deploy to GitHub Pages"
```

### Enterprise Documentation

```
1. "Do a deep analysis of /path/to/enterprise-project"
2. "Recommend an SSG that prioritizes simplicity and low maintenance"
3. "Set up a minimal documentation structure without examples"
4. "Generate the Hugo configuration for enterprise-docs/"
5. "Deploy to GitHub Pages with custom domain docs.example.com"
```

### API Documentation

```
1. "Analyze /path/to/api-project"
2. "Recommend an SSG for API documentation with strong reference support"
3. "Set up documentation structure with API reference focus"
4. "Populate the reference section from my source code"
5. "Deploy to Vercel"
```

---

## Advanced Configuration

### Storage Directory

DocuMCP stores its memory and knowledge graph locally. To customize the location:

```bash
export DOCUMCP_STORAGE_DIR="/path/to/custom/storage"
```

Or pass it in the MCP server config:

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

---

## Troubleshooting

### Repository Analysis Returns No Results

- Ensure the path is absolute and the directory exists
- Check that the directory has at least some source files
- Try `depth: "deep"` for projects with unconventional layouts

### SSG Recommendation Has Low Confidence

Ask DocuMCP for a deeper analysis first:

```
Do a deep analysis of my project, then recommend an SSG
```

### Deployment Fails — Permission Errors

For GitHub Pages, confirm:

- GitHub Pages is enabled in your repository settings (Settings → Pages → Source: GitHub Actions)
- The generated workflow file has been committed and pushed

For Vercel, confirm:

- You have run `vercel link` inside the project as described in the generated `VERCEL_SETUP.md`
- The `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets are set in your repository

### Content Population Generates Empty Sections

Ensure the documentation structure was created first:

```
Set up the documentation structure before populating it
```

---

## Best Practices

### Repository Organization

- Keep a well-maintained `README.md` — DocuMCP uses it as the primary signal for project purpose
- Include dependency files (`package.json`, `requirements.txt`, `go.mod`) so language detection works accurately
- Use consistent naming conventions in your source tree

### Documentation Quality

- Follow Diataxis principles: separate tutorials (learning) from how-tos (tasks) from reference (lookup) from explanation (concepts)
- Run `validate_content` after populating to catch missing sections
- Keep docs close to the code they document

### Memory System

- Run analyses regularly; DocuMCP learns from each one and improves future recommendations
- Export the knowledge graph before major changes: ask "export my DocuMCP memory"

---

## Getting Help

- **GitHub Issues**: [https://github.com/tosin2013/documcp/issues](https://github.com/tosin2013/documcp/issues)
- **GitHub Discussions**: Ask questions and share patterns
- **MCP Tools Reference**: [../reference/mcp-tools.md](../reference/mcp-tools.md)
- **Troubleshooting Guide**: [../how-to/troubleshooting.md](../how-to/troubleshooting.md)
