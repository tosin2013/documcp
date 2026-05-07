---
id: getting-started
title: Getting Started with DocuMCP
sidebar_label: Getting Started
documcp:
  last_updated: "2026-05-07"
  last_validated: "2026-05-07"
  auto_updated: false
  update_frequency: monthly
---

# Getting Started with DocuMCP

DocuMCP is a **Model Context Protocol (MCP) server** that gives your AI assistant the ability to analyze repositories, recommend static site generators, generate documentation structures, and deploy documentation sites. It runs as a background server and your AI client (Claude Desktop, Cursor, VS Code) communicates with it automatically — you interact entirely through natural language.

## Prerequisites

- Node.js 20.0.0 or higher
- npm (latest stable)
- Git
- One of: Claude Desktop, Cursor, or VS Code with GitHub Copilot

---

## Step 0: Install DocuMCP and Connect Your AI Client

### Install DocuMCP

**Option A — npm global install (recommended)**

```bash
npm install -g documcp
```

**Option B — build from source (contributors / local development)**

```bash
git clone https://github.com/tosin2013/documcp.git
cd documcp
npm install
npm run build
```

When using Option B, use the full path to `dist/index.js` in the MCP config below instead of `"npx"`.

---

### Connect to your AI client

Choose the config for your client. Add it to the file shown, then restart the application.

#### Claude Desktop

File location:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

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

#### Cursor

File location: `~/.cursor/mcp.json` (or add via **Settings > MCP**)

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

#### VS Code (GitHub Copilot)

Add to your `settings.json`:

```json
{
  "mcp.servers": {
    "documcp": {
      "command": "npx",
      "args": ["documcp"]
    }
  }
}
```

---

### Verify the connection

After restarting your AI client, ask it:

```
What tools does DocuMCP provide?
```

You should receive a list of available tools (analyze_repository, recommend_ssg, deploy_site, and others). If you do not, check that DocuMCP is installed and that the config file is saved correctly.

> **Tip:** For the most detailed tool context, reference `LLM_CONTEXT.md` in your prompts once you have cloned or are working inside a DocuMCP-connected project:
>
> ```
> @LLM_CONTEXT.md help me set up documentation for my TypeScript project
> ```

---

## Step 1: Analyze Your Repository

**MCP tool:** `analyze_repository`

Tell your AI assistant:

```
Analyze my repository at /path/to/your/project
```

Or with explicit parameters:

```json
{
  "path": "/path/to/your/project",
  "depth": "standard"
}
```

DocuMCP returns:

- **Project structure** — file counts, languages used, directory layout
- **Dependencies** — production and development packages detected
- **Documentation status** — existing docs, README, contributing guidelines
- **Smart recommendations** — primary language, project type, team size estimates
- **Analysis ID** — a unique identifier used in the next steps (e.g., `analysis_abc123xyz`)

Example response snippet:

```json
{
  "id": "analysis_abc123xyz",
  "structure": {
    "totalFiles": 150,
    "languages": { ".ts": 45, ".js": 12, ".md": 8 },
    "hasTests": true,
    "hasCI": true
  },
  "recommendations": {
    "primaryLanguage": "typescript",
    "projectType": "library"
  }
}
```

---

## Step 2: Get an SSG Recommendation

**MCP tool:** `recommend_ssg`

```
Recommend a static site generator based on analysis_abc123xyz
```

Or with preferences:

```json
{
  "analysisId": "analysis_abc123xyz",
  "preferences": {
    "ecosystem": "javascript",
    "priority": "features"
  }
}
```

DocuMCP uses its memory system — built from patterns across many past projects — to return confidence-scored recommendations:

```json
{
  "recommended": "docusaurus",
  "confidence": 0.85,
  "reasoning": [
    "JavaScript/TypeScript ecosystem detected",
    "Modern React-based framework aligns with project stack"
  ],
  "alternatives": [
    {
      "name": "MkDocs",
      "score": 0.75,
      "pros": ["Simple setup", "Great themes"],
      "cons": ["Limited React component support"]
    }
  ]
}
```

---

## Step 3: Generate Configuration

**MCP tool:** `generate_config`

```
Generate a Docusaurus configuration for my project
```

Or explicitly:

```json
{
  "ssg": "docusaurus",
  "projectName": "Your Project",
  "projectDescription": "Your project description",
  "outputPath": "/path/to/your/repository"
}
```

This creates a ready-to-use `docusaurus.config.js` (or equivalent) tailored to your project.

---

## Step 4: Set Up Documentation Structure

**MCP tool:** `setup_structure`

```
Set up a Diataxis documentation structure for my project using Docusaurus
```

Or explicitly:

```json
{
  "path": "/path/to/your/repository/docs",
  "ssg": "docusaurus",
  "includeExamples": true
}
```

This creates four Diataxis-compliant sections:

- **Tutorials** — learning-oriented guides for skill acquisition
- **How-to Guides** — problem-solving guides for specific tasks
- **Reference** — information-oriented content for lookup
- **Explanation** — understanding-oriented conceptual content

---

## Step 5: Deploy

**MCP tool:** `deploy_site`

To deploy to **GitHub Pages**:

```
Deploy my documentation to GitHub Pages
```

```json
{
  "projectPath": "/path/to/your/repository",
  "target": "github-pages",
  "ssg": "docusaurus"
}
```

To deploy to **Vercel**:

```
Deploy my documentation to Vercel
```

```json
{
  "projectPath": "/path/to/your/repository",
  "target": "vercel",
  "ssg": "docusaurus"
}
```

`deploy_site` generates:

- A GitHub Actions workflow file (`.github/workflows/deploy-github-pages.yml` or `deploy-vercel.yml`)
- OIDC authentication with minimal permissions
- A setup checklist (`VERCEL_SETUP.md` for Vercel) committed to your repo

> **Back-compat note:** The older `deploy_pages` tool still works and maps to `deploy_site` with `target=github-pages`. It will be removed in v1.1.0.

---

## What You Learned

- What DocuMCP is and how it integrates with your AI client
- How to install and connect DocuMCP (npm or git clone)
- How to verify the MCP server is running
- How to run the core workflow: analyze → recommend → configure → structure → deploy

## Next Steps

- [Your First Deployment](./first-deployment.md) — end-to-end walkthrough with a real project
- [How-To Guides](../how-to/) — task-specific guides for common operations
- [MCP Tools Reference](../reference/mcp-tools.md) — full parameter documentation for all tools
- [Memory Workflows](./memory-workflows.md) — advanced memory system features
