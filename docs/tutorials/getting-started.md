---
id: getting-started
title: Getting Started with DocuMCP
sidebar_label: Getting Started
documcp:
  last_updated: "2025-11-20T00:46:21.972Z"
  last_validated: "2025-12-09T19:18:14.189Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# Getting Started with DocuMCP

This tutorial will guide you through setting up and using DocuMCP's intelligent documentation deployment system with memory-enhanced capabilities.

## Prerequisites

Before you begin, ensure you have:

- Node.js 20.0.0 or higher installed
- Access to a GitHub repository
- Claude Desktop, Cursor, or another MCP-compatible client
- Basic familiarity with documentation workflows

## 🎯 Pro Tip: Reference LLM_CONTEXT.md

When using DocuMCP through an AI assistant, **always reference the LLM_CONTEXT.md file** for comprehensive tool context:

```
@LLM_CONTEXT.md help me set up documentation for my TypeScript project
```

The `LLM_CONTEXT.md` file is auto-generated and contains:

- All 45 tool descriptions and parameters
- Usage examples and workflows
- Memory system documentation
- Phase 3 code-to-docs sync features

**Location**: `/LLM_CONTEXT.md` (in project root)

This ensures your AI assistant has complete context and can provide optimal recommendations.

## Step 1: Initial Repository Analysis

Start by analyzing your repository to understand its characteristics and documentation needs:

```json
{
  "path": "/path/to/your/project",
  "depth": "standard"
}
```

This will analyze your project and return:

- **Project structure**: File counts, languages used, and organization
- **Dependencies**: Production and development packages detected
- **Documentation status**: Existing docs, README, contributing guidelines
- **Smart recommendations**: Primary language, project type, team size estimates
- **Unique analysis ID**: For use in subsequent steps

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
  "dependencies": {
    "ecosystem": "javascript",
    "packages": ["react", "typescript"]
  },
  "recommendations": {
    "primaryLanguage": "typescript",
    "projectType": "library"
  }
}
```

## Step 2: Memory-Enhanced SSG Recommendation

Next, get intelligent recommendations powered by DocuMCP's memory system:

```json
{
  "analysisId": "analysis_abc123xyz",
  "preferences": {
    "ecosystem": "javascript",
    "priority": "features"
  }
}
```

The memory system leverages patterns from 130+ previous projects to provide:

- **Confidence-scored recommendations** (e.g., Docusaurus with 85% confidence)
- **Historical success data** (69% deployment success rate insights)
- **Pattern-based insights** (Hugo most common with 98 projects, but Docusaurus optimal for TypeScript)
- **Similar project examples** to learn from successful configurations

Example recommendation response:

```json
{
  "recommended": "docusaurus",
  "confidence": 0.85,
  "reasoning": [
    "JavaScript/TypeScript ecosystem detected",
    "Modern React-based framework aligns with project stack",
    "Strong community support and active development"
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

## Step 3: Configuration Generation

Generate optimized configuration files for your chosen SSG:

```javascript
// Generate Docusaurus configuration
{
  "ssg": "docusaurus",
  "projectName": "Your Project",
  "projectDescription": "Your project description",
  "outputPath": "/path/to/your/repository"
}
```

## Step 4: Diataxis Structure Setup

Create a professional documentation structure following the Diataxis framework:

```javascript
// Setup documentation structure
{
  "path": "/path/to/your/repository/docs",
  "ssg": "docusaurus",
  "includeExamples": true
}
```

This creates four optimized sections following the Diataxis framework:

- **Tutorials**: Learning-oriented guides for skill acquisition (study context)
- **How-to Guides**: Problem-solving guides for specific tasks (work context)
- **Reference**: Information-oriented content for lookup and verification (information context)
- **Explanation**: Understanding-oriented content for context and background (understanding context)

## Step 5: GitHub Pages Deployment

Set up automated deployment with security best practices:

```javascript
// Deploy to GitHub Pages
{
  "repository": "/path/to/your/repository",
  "ssg": "docusaurus",
  "branch": "gh-pages"
}
```

This generates:

- GitHub Actions workflow with OIDC authentication
- Minimal security permissions (pages:write, id-token:write only)
- Automated build and deployment pipeline

## Step 6: Memory System Exploration

Explore DocuMCP's advanced memory capabilities:

```javascript
// Get learning statistics
{
  "includeDetails": true
}

// Recall similar projects
{
  "query": "typescript documentation",
  "type": "recommendation",
  "limit": 5
}
```

The memory system provides:

- **Pattern Recognition**: Most successful SSG choices for your project type
- **Historical Insights**: Success rates and common issues
- **Smart Recommendations**: Enhanced suggestions based on similar projects

## Verification

Verify your setup with these checks:

1. **Documentation Structure**: Confirm all Diataxis directories are created
2. **Configuration Files**: Check generated config files are valid
3. **GitHub Actions**: Verify workflow file in `.github/workflows/`
4. **Memory Insights**: Review recommendations and confidence scores

## Summary

In this tutorial, you learned how to:

- **Analyze repositories** with comprehensive project profiling
- **Get intelligent SSG recommendations** using memory-enhanced insights
- **Generate optimized configurations** for your chosen static site generator
- **Create Diataxis-compliant structures** for professional documentation
- **Set up automated GitHub Pages deployment** with security best practices
- **Leverage the memory system** for enhanced recommendations and insights

## Next Steps

- Explore [Memory-Enhanced Workflows](./memory-workflows.md)
- Read [How-To Guides](../how-to/) for specific tasks
- Check the [API Reference](../reference/) for complete tool documentation
- Learn about [Diataxis Framework](../explanation/) principles
