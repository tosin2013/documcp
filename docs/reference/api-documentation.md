---
id: mcp-tools-reference
title: MCP Tools Reference
sidebar_label: MCP Tools
---

# MCP Tools Reference

Complete technical reference for all documcp MCP tools with parameter schemas and examples.

## Overview

documcp provides 11 core MCP tools for comprehensive documentation workflows. Each tool follows the MCP protocol specification with Zod schema validation.

## Core Analysis Tools

### analyze_repository

Analyzes repository structure, dependencies, and documentation needs.

**Parameters:**
```typescript
{
  path: string;              // Repository path to analyze
  depth?: 'quick' | 'standard' | 'deep'; // Analysis depth (default: 'standard')
}
```

**Example:**
```json
{
  "name": "analyze_repository",
  "arguments": {
    "path": "./my-project",
    "depth": "comprehensive"
  }
}
```

**Returns:**
- Repository structure analysis
- Technology stack detection
- Documentation gaps identification
- SSG recommendations

### detect_documentation_gaps

Identifies missing documentation and content gaps.

**Parameters:**
```typescript
{
  repositoryPath: string;     // Path to repository
  documentationPath?: string; // Path to existing docs
  analysisId?: string;        // Reuse previous analysis
  depth?: 'quick' | 'standard' | 'comprehensive';
}
```

**Returns:**
- Gap analysis report
- Missing documentation sections
- Content quality assessment
- Improvement recommendations

## SSG and Configuration Tools

### recommend_ssg

Recommends optimal static site generator based on project analysis.

**Parameters:**
```typescript
{
  analysisId?: string;        // Previous analysis ID
  preferences?: {
    ecosystem?: 'javascript' | 'python' | 'ruby' | 'go' | 'any';
    priority?: 'simplicity' | 'features' | 'performance';
  };
}
```

**Returns:**
- Recommended SSG with rationale
- Alternative options
- Setup complexity assessment
- Feature comparison

### generate_config

Generates configuration files for selected static site generator.

**Parameters:**
```typescript
{
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  projectName: string;
  projectDescription?: string;
  outputPath: string;
}
```

**Returns:**
- Generated configuration files
- Setup instructions
- Customization options

## Structure and Content Tools

### setup_structure

Creates Diataxis-compliant documentation structure.

**Parameters:**
```typescript
{
  path: string;               // Documentation root path
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  includeExamples?: boolean;  // Include example content (default: true)
}
```

**Returns:**
- Created directory structure
- Template files
- Navigation configuration

### populate_diataxis_content

Intelligently populates documentation with project-specific content.

**Parameters:**
```typescript
{
  docsPath: string;           // Documentation directory
  analysisId?: string;        // Repository analysis ID
  populationLevel?: 'basic' | 'comprehensive' | 'intelligent';
  preserveExisting?: boolean; // Preserve existing content (default: true)
  includeProjectSpecific?: boolean; // Include project-specific content
  technologyFocus?: string[]; // Specific technologies to emphasize
}
```

**Returns:**
- Generated content files
- Population report
- Content quality metrics

## Validation Tools

### validate_content

Validates general content quality including links and code syntax.

**Parameters:**
```typescript
{
  contentPath: string;        // Content directory to validate
  validationType?: 'links' | 'code' | 'references' | 'all';
  includeCodeValidation?: boolean; // Validate code blocks (default: true)
  followExternalLinks?: boolean;   // Check external URLs (default: false)
}
```

**Returns:**
- Validation results
- Broken links report
- Code syntax errors
- Fix recommendations

### validate_diataxis_content

Validates Diataxis documentation compliance and accuracy.

**Parameters:**
```typescript
{
  contentPath: string;        // Documentation directory
  validationType?: 'accuracy' | 'completeness' | 'compliance' | 'all';
  confidence?: 'strict' | 'moderate' | 'permissive';
  analysisId?: string;        // Repository analysis for context
  includeCodeValidation?: boolean;
}
```

**Returns:**
- Diataxis compliance report
- Content accuracy assessment
- Completeness analysis
- Improvement suggestions

## Deployment Tools

### deploy_pages

Sets up GitHub Pages deployment workflow.

**Parameters:**
```typescript
{
  repository: string;         // Repository path or URL
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  branch?: string;           // Deployment branch (default: 'gh-pages')
  customDomain?: string;     // Custom domain configuration
}
```

**Returns:**
- GitHub Actions workflow
- Deployment configuration
- Setup instructions

### test_local_deployment

Tests documentation build and local server.

**Parameters:**
```typescript
{
  repositoryPath: string;     // Repository path
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  port?: number;             // Local server port (default: 3000)
  timeout?: number;          // Build timeout in seconds (default: 60)
  skipBuild?: boolean;       // Skip build, only start server
}
```

**Returns:**
- Build results
- Local server status
- Error diagnostics

### verify_deployment

Verifies and troubleshoots GitHub Pages deployment.

**Parameters:**
```typescript
{
  repository: string;         // Repository path or URL
  url: string;               // Expected deployment URL
}
```

**Returns:**
- Deployment status
- Accessibility verification
- Troubleshooting guidance

## Tool Chaining Examples

### Complete Documentation Setup
```json
[
  {
    "name": "analyze_repository",
    "arguments": { "path": "./project", "depth": "comprehensive" }
  },
  {
    "name": "recommend_ssg",
    "arguments": { "analysisId": "<from-previous>" }
  },
  {
    "name": "generate_config",
    "arguments": { "ssg": "docusaurus", "projectName": "My Project" }
  },
  {
    "name": "setup_structure",
    "arguments": { "path": "./docs", "ssg": "docusaurus" }
  },
  {
    "name": "populate_diataxis_content",
    "arguments": { "docsPath": "./docs", "analysisId": "<from-analysis>" }
  },
  {
    "name": "deploy_pages",
    "arguments": { "repository": ".", "ssg": "docusaurus" }
  }
]
```

### Quality Assurance Workflow
```json
[
  {
    "name": "detect_documentation_gaps",
    "arguments": { "repositoryPath": ".", "documentationPath": "./docs" }
  },
  {
    "name": "validate_content",
    "arguments": { "contentPath": "./docs", "validationType": "all" }
  },
  {
    "name": "validate_diataxis_content",
    "arguments": { "contentPath": "./docs", "validationType": "all" }
  }
]
```

## Error Handling

All tools return standardized error responses:

```typescript
interface ToolError {
  content: [{
    type: 'text';
    text: string; // Error message
  }];
  isError: true;
}
```

## Common Error Codes

| Error Type | Description | Resolution |
|------------|-------------|------------|
| ValidationError | Invalid input parameters | Check parameter types and required fields |
| FileSystemError | File/directory access issues | Verify paths and permissions |
| NetworkError | External service failures | Check network connectivity and retry |
| ConfigurationError | Invalid SSG or tool configuration | Review configuration syntax |
| ContentError | Malformed content or parsing issues | Validate content format and structure |

## Performance Considerations

- **Memory Usage**: Large repositories may require increased Node.js memory limits
- **Timeout Settings**: Adjust timeouts for comprehensive analysis of large codebases
- **Concurrent Operations**: Tools can be chained but avoid parallel file system operations
- **Cache Management**: Analysis results are cached to improve performance