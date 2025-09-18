---
id: api-documentation
title: DocuMCP API Reference
sidebar_label: API Reference
---

# DocuMCP API Reference

Complete reference documentation for all DocuMCP MCP tools and capabilities.

## Overview

DocuMCP provides intelligent documentation deployment through Model Context Protocol (MCP) tools. The server exposes 6 core tools plus advanced memory system capabilities for enhanced documentation workflows.

## Core Documentation Tools

### analyze_repository

Analyzes repository structure, dependencies, and documentation needs to provide comprehensive project insights.

**Parameters:**
- `path` (string, required): Path to the repository to analyze
- `depth` (enum, optional): Analysis depth - `quick`, `standard`, `deep` (default: `standard`)

**What it analyzes:**
- Project structure (files, directories, languages)
- Dependencies and ecosystem detection
- Existing documentation and CI/CD setup
- Project complexity and team size estimates

**Example Usage:**
```json
{
  "path": "/path/to/your/project",
  "depth": "standard"
}
```

**Response:**
```json
{
  "id": "analysis_mfopd2vt_xelzy",
  "timestamp": "2025-09-18T00:58:54.041Z",
  "structure": {
    "totalFiles": 1990,
    "totalDirectories": 74,
    "languages": {".ts": 80, ".js": 12, ".md": 15},
    "hasTests": true,
    "hasCI": true,
    "hasDocs": true
  },
  "dependencies": {
    "ecosystem": "javascript",
    "packages": ["@modelcontextprotocol/sdk", "zod"],
    "devPackages": ["typescript", "jest", "@types/node"]
  },
  "documentation": {
    "hasReadme": true,
    "hasContributing": true,
    "hasLicense": true,
    "existingDocs": ["README.md", "docs/index.md"],
    "estimatedComplexity": "complex"
  },
  "recommendations": {
    "primaryLanguage": "typescript",
    "projectType": "library",
    "teamSize": "large"
  }
}
```

**Memory Integration:**
- Analysis results are automatically stored in memory for future reference
- Similar projects are identified to provide contextual insights
- Historical patterns improve recommendation accuracy

### recommend_ssg

Provides intelligent static site generator recommendations based on project analysis.

**Parameters:**
- `analysisId` (string, required): ID from previous repository analysis
- `preferences` (object, optional): User preferences for ecosystem and priority

**Response:**
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
      "cons": ["Less flexible than Docusaurus"]
    }
  ]
}
```

### generate_config

Generates SSG-specific configuration files.

**Parameters:**
- `ssg` (enum, required): `jekyll`, `hugo`, `docusaurus`, `mkdocs`, `eleventy`
- `projectName` (string, required): Name of the project
- `outputPath` (string, required): Where to generate config files
- `projectDescription` (string, optional): Project description

### setup_structure

Creates Diataxis-compliant documentation structure.

**Parameters:**
- `path` (string, required): Root path for documentation
- `ssg` (enum, required): Static site generator type
- `includeExamples` (boolean, optional): Include example content (default: true)

### deploy_pages

Sets up GitHub Pages deployment workflow.

**Parameters:**
- `repository` (string, required): Repository path or URL
- `ssg` (enum, required): Static site generator type
- `branch` (string, optional): Target branch (default: `gh-pages`)
- `customDomain` (string, optional): Custom domain configuration

### verify_deployment

Verifies and troubleshoots GitHub Pages deployment.

**Parameters:**
- `repository` (string, required): Repository path or URL
- `url` (string, optional): Expected deployment URL

## Advanced Memory System

### memory_recall

Recalls memories about projects or topics to inform recommendations with historical data from 130+ previous projects.

**Parameters:**
- `query` (string, required): Search query or project ID
- `type` (enum, optional): `analysis`, `recommendation`, `deployment`, `configuration`, `interaction`, `all`
- `limit` (number, optional): Maximum memories to return (default: 10)

**Use Cases:**
- Find similar projects that used specific technologies
- Learn from past deployment successes and failures
- Discover proven configuration patterns
- Analyze trends across project types

**Example Usage:**
```json
{
  "query": "typescript docusaurus",
  "type": "recommendation",
  "limit": 5
}
```

**Response:**
Returns a list of relevant memories with project details, outcomes, and insights that can inform your current decisions.

### memory_intelligent_analysis

Enhanced analysis using learning patterns and knowledge graph.

**Parameters:**
- `projectPath` (string, required): Path to project for analysis
- `baseAnalysis` (object, required): Base analysis data to enhance

### memory_enhanced_recommendation

Get recommendations enhanced with learning and knowledge graph insights.

**Parameters:**
- `projectPath` (string, required): Path to the project
- `baseRecommendation` (object, required): Base recommendation to enhance
- `projectFeatures` (object, required): Project feature set

### memory_learning_stats

Get comprehensive learning and knowledge graph statistics.

**Parameters:**
- `includeDetails` (boolean, optional): Include detailed statistics (default: true)

**Response:**
```json
{
  "learningStats": {
    "patterns": {
      "mostCommonSSG": {"hugo": 98, "docusaurus": 56},
      "deploymentSuccess": {"success": 89, "failed": 40}
    },
    "insights": [
      "Most frequently used SSG: hugo (98 projects)",
      "Deployment success rate: 69.0%"
    ]
  }
}
```

## Content Enhancement Tools

### populate_diataxis_content

Intelligently populates Diataxis documentation with project-specific content.

**Parameters:**
- `analysisId` (string, required): Repository analysis ID
- `docsPath` (string, required): Path to documentation directory
- `populationLevel` (enum, optional): `basic`, `comprehensive`, `intelligent` (default: `comprehensive`)
- `includeProjectSpecific` (boolean, optional): Include project-specific content (default: true)

### validate_diataxis_content

Validates accuracy, completeness, and compliance of generated documentation.

**Parameters:**
- `contentPath` (string, required): Path to documentation directory
- `validationType` (enum, optional): `accuracy`, `completeness`, `compliance`, `all` (default: `all`)
- `confidence` (enum, optional): `strict`, `moderate`, `permissive` (default: `moderate`)

### detect_documentation_gaps

Analyzes repository and documentation to identify missing content and gaps.

**Parameters:**
- `repositoryPath` (string, required): Path to repository
- `documentationPath` (string, optional): Path to existing documentation
- `depth` (enum, optional): Analysis depth (default: `standard`)

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| INVALID_PATH | Repository path does not exist | Verify the path exists and is accessible |
| ANALYSIS_FAILED | Repository analysis could not complete | Check repository structure and permissions |
| CONFIG_ERROR | Configuration generation failed | Verify SSG type and parameters |
| DEPLOYMENT_ERROR | GitHub Pages deployment setup failed | Check repository permissions and settings |
| MEMORY_ERROR | Memory system operation failed | Retry operation or contact support |

## Response Format

All tools return responses in this standardized format:

```json
{
  "success": boolean,
  "data": object,
  "metadata": {
    "toolVersion": "1.0.0",
    "executionTime": 1250,
    "timestamp": "2025-09-18T00:58:54.041Z"
  },
  "recommendations": ["Next action recommendations"],
  "nextSteps": [
    {
      "action": "Description",
      "toolRequired": "tool_name"
    }
  ]
}
```