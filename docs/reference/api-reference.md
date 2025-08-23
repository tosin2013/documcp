# MCP Tools API Reference

Complete reference for all DocuMCP Model Context Protocol tools, parameters, and usage patterns.

## Overview

DocuMCP provides 10 specialized MCP tools for intelligent documentation deployment. Each tool follows the MCP specification and can be called through any MCP-compatible client.

## Tool Categories

- **📊 Analysis Tools**: Repository analysis and gap detection
- **🎯 Recommendation Tools**: SSG selection and optimization
- **⚙️ Setup Tools**: Configuration and structure creation
- **📝 Content Tools**: Intelligent content population and validation
- **🚀 Deployment Tools**: GitHub Pages deployment and testing

---

## 📊 Analysis Tools

### `analyze_repository`

Performs deep multi-layered analysis of project structure, dependencies, and documentation needs.

**Parameters:**
- `path` (string, required): Path to the repository to analyze
- `depth` (string, optional): Analysis depth
  - `'quick'`: Basic structure scan
  - `'standard'`: Standard analysis (default)
  - `'deep'`: Comprehensive analysis with dependency scanning

**Returns:**
```typescript
{
  id: string;                    // Unique analysis ID for referencing
  timestamp: string;             // ISO timestamp
  path: string;                  // Analyzed repository path
  structure: {
    totalFiles: number;
    totalDirectories: number;
    languages: Record<string, number>;  // File extension counts
    hasTests: boolean;
    hasCI: boolean;
    hasDocs: boolean;
  };
  dependencies: {
    ecosystem: string;           // Primary language ecosystem
    packages: string[];          // Main dependencies
    devPackages: string[];       // Development dependencies
  };
  documentation: {
    hasReadme: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    existingDocs: string[];      // Found documentation files
    estimatedComplexity: 'simple' | 'moderate' | 'complex';
  };
  recommendations: {
    primaryLanguage: string;
    projectType: string;
    teamSize: string;
  };
}
```

**Example:**
```json
{
  "tool": "analyze_repository",
  "arguments": {
    "path": "/path/to/project",
    "depth": "standard"
  }
}
```

**Error Codes:**
- `REPO_NOT_FOUND`: Repository path does not exist
- `PERMISSION_DENIED`: Insufficient permissions to read repository
- `ANALYSIS_FAILED`: Analysis process encountered an error

---

### `detect_documentation_gaps`

Analyzes repository and existing documentation to identify missing content and structural gaps.

**Parameters:**
- `repositoryPath` (string, required): Path to the repository to analyze
- `documentationPath` (string, optional): Path to existing documentation directory
- `analysisId` (string, optional): Existing analysis ID to reuse (from `analyze_repository`)
- `depth` (string, optional): Analysis depth (`'quick'` | `'standard'` | `'comprehensive'`)

**Returns:**
```typescript
{
  gaps: {
    critical: GapItem[];         // High-priority missing content
    important: GapItem[];        // Medium-priority gaps
    optional: GapItem[];         // Nice-to-have improvements
  };
  existing: {
    strengths: string[];         // Well-documented areas
    weaknesses: string[];        // Poorly documented areas
  };
  recommendations: string[];     // Prioritized action items
  diataxisCompliance: {
    tutorials: number;           // Compliance percentage
    howTo: number;
    reference: number;
    explanation: number;
  };
}
```

**Example:**
```json
{
  "tool": "detect_documentation_gaps",
  "arguments": {
    "repositoryPath": "/path/to/project",
    "documentationPath": "/path/to/project/docs",
    "depth": "comprehensive"
  }
}
```

---

## 🎯 Recommendation Tools

### `recommend_ssg`

Provides intelligent recommendations for the best static site generator based on project analysis.

**Parameters:**
- `analysisId` (string, required): Analysis ID from `analyze_repository`
- `preferences` (object, optional): User preferences
  - `priority` (string): `'simplicity'` | `'features'` | `'performance'`
  - `ecosystem` (string): `'javascript'` | `'python'` | `'ruby'` | `'go'` | `'any'`

**Returns:**
```typescript
{
  recommended: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  confidence: number;            // 0-1 confidence score
  reasoning: string[];           // Explanation of recommendation
  alternatives: Array<{
    name: string;
    score: number;
    pros: string[];
    cons: string[];
  }>;
}
```

**Example:**
```json
{
  "tool": "recommend_ssg",
  "arguments": {
    "analysisId": "analysis_12345",
    "preferences": {
      "priority": "features",
      "ecosystem": "javascript"
    }
  }
}
```

---

## ⚙️ Setup Tools

### `generate_config`

Creates all necessary configuration files for the selected static site generator.

**Parameters:**
- `ssg` (string, required): Static site generator (`'jekyll'` | `'hugo'` | `'docusaurus'` | `'mkdocs'` | `'eleventy'`)
- `projectName` (string, required): Name of the project
- `projectDescription` (string, optional): Project description
- `outputPath` (string, required): Directory where config files should be generated

**Returns:**
```typescript
{
  ssg: string;
  projectName: string;
  projectDescription?: string;
  outputPath: string;
  filesCreated: string[];        // List of generated files
  totalFiles: number;
}
```

**Example:**
```json
{
  "tool": "generate_config",
  "arguments": {
    "ssg": "docusaurus",
    "projectName": "My Awesome Project",
    "projectDescription": "A revolutionary tool for developers",
    "outputPath": "./docs"
  }
}
```

---

### `setup_structure`

Creates a Diataxis-compliant documentation structure with proper categorization.

**Parameters:**
- `path` (string, required): Root path for documentation
- `ssg` (string, required): Static site generator type
- `includeExamples` (boolean, optional): Include example content (default: true)

**Returns:**
```typescript
{
  docsPath: string;
  ssg: string;
  includeExamples: boolean;
  directoriesCreated: string[];  // Created directory paths
  filesCreated: string[];        // Created file paths
  diataxisCategories: string[];  // ['tutorials', 'how-to', 'reference', 'explanation']
  totalDirectories: number;
  totalFiles: number;
}
```

**Example:**
```json
{
  "tool": "setup_structure",
  "arguments": {
    "path": "./docs",
    "ssg": "docusaurus",
    "includeExamples": true
  }
}
```

---

## 📝 Content Tools

### `populate_diataxis_content`

Intelligently populates Diataxis documentation with project-specific content.

**Parameters:**
- `analysisId` (string, required): Repository analysis ID from `analyze_repository`
- `docsPath` (string, required): Path to documentation directory
- `populationLevel` (string, optional): Content generation level
  - `'basic'`: Minimal content with placeholders
  - `'comprehensive'`: Detailed content with examples (default)
  - `'intelligent'`: AI-enhanced content with advanced features
- `includeProjectSpecific` (boolean, optional): Include project-specific examples (default: true)
- `preserveExisting` (boolean, optional): Preserve existing content (default: true)
- `technologyFocus` (string[], optional): Specific technologies to emphasize

**Returns:**
```typescript
{
  filesCreated: number;
  filesModified: number;
  populationMetrics: {
    coverage: number;            // Percentage of content generated
    completeness: number;        // Content completeness score
    projectSpecificity: number;  // Project-specific content ratio
  };
  nextSteps: string[];          // Recommended follow-up actions
}
```

**Example:**
```json
{
  "tool": "populate_diataxis_content",
  "arguments": {
    "analysisId": "analysis_12345",
    "docsPath": "./docs",
    "populationLevel": "comprehensive",
    "technologyFocus": ["typescript", "react", "nodejs"]
  }
}
```

---

### `validate_diataxis_content`

Validates the accuracy, completeness, and Diataxis compliance of documentation.

**Parameters:**
- `contentPath` (string, required): Path to documentation directory to validate
- `analysisId` (string, optional): Repository analysis ID for context-aware validation
- `validationType` (string, optional): Validation scope
  - `'accuracy'`: Check technical accuracy
  - `'completeness'`: Check content completeness
  - `'compliance'`: Check Diataxis compliance
  - `'all'`: Comprehensive validation (default)
- `includeCodeValidation` (boolean, optional): Validate code examples (default: true)
- `confidence` (string, optional): Validation strictness (`'strict'` | `'moderate'` | `'permissive'`)

**Returns:**
```typescript
{
  success: boolean;
  confidence: {
    overall: number;             // Overall confidence percentage
    accuracy: number;
    completeness: number;
    compliance: number;
  };
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: string;
    description: string;
    file?: string;
    line?: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  recommendations: string[];     // Improvement suggestions
  diataxisScore: {
    tutorials: number;
    howTo: number;
    reference: number;
    explanation: number;
  };
}
```

**Example:**
```json
{
  "tool": "validate_diataxis_content",
  "arguments": {
    "contentPath": "./docs",
    "validationType": "all",
    "confidence": "moderate"
  }
}
```

---

## 🚀 Deployment Tools

### `deploy_pages`

Sets up GitHub Actions workflow for automated deployment to GitHub Pages.

**Parameters:**
- `repository` (string, required): Repository path or URL
- `ssg` (string, required): Static site generator type
- `branch` (string, optional): Target deployment branch (default: 'gh-pages')
- `customDomain` (string, optional): Custom domain name

**Returns:**
```typescript
{
  repository: string;
  ssg: string;
  branch: string;
  workflowPath: string;          // Path to created workflow file
  cnameCreated: boolean;         // Whether CNAME file was created
  repoPath: string;
}
```

**Example:**
```json
{
  "tool": "deploy_pages",
  "arguments": {
    "repository": ".",
    "ssg": "docusaurus",
    "branch": "gh-pages",
    "customDomain": "docs.myproject.com"
  }
}
```

---

### `verify_deployment`

Verifies and troubleshoots GitHub Pages deployment configuration.

**Parameters:**
- `repository` (string, required): Repository path or URL
- `url` (string, optional): Expected deployment URL

**Returns:**
```typescript
{
  status: 'success' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    recommendation?: string;
  }>;
  deploymentUrl?: string;
  lastDeployment?: {
    timestamp: string;
    status: string;
    commit: string;
  };
  troubleshooting: string[];     // Step-by-step troubleshooting guide
}
```

**Example:**
```json
{
  "tool": "verify_deployment",
  "arguments": {
    "repository": ".",
    "url": "https://username.github.io/project"
  }
}
```

---

### `test_local_deployment`

Tests documentation build and local server before deploying to GitHub Pages.

**Parameters:**
- `repositoryPath` (string, required): Path to the repository
- `ssg` (string, required): Static site generator type
- `port` (number, optional): Port for local server (default: 3000)
- `timeout` (number, optional): Build timeout in seconds (default: 60)
- `skipBuild` (boolean, optional): Skip build and only start server (default: false)

**Returns:**
```typescript
{
  buildSuccess: boolean;
  serverStarted: boolean;
  serverUrl?: string;
  buildTime?: number;            // Build time in milliseconds
  errors: string[];
  warnings: string[];
  buildOutput: string;
  nextSteps: string[];
}
```

**Example:**
```json
{
  "tool": "test_local_deployment",
  "arguments": {
    "repositoryPath": ".",
    "ssg": "docusaurus",
    "port": 3000,
    "timeout": 120
  }
}
```

---

## Error Handling

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `INVALID_PATH` | Provided path does not exist | Verify path exists and is accessible |
| `INVALID_SSG` | Unsupported static site generator | Use supported SSG: jekyll, hugo, docusaurus, mkdocs, eleventy |
| `MISSING_ANALYSIS` | Required analysis ID not found | Run `analyze_repository` first |
| `BUILD_FAILED` | Documentation build failed | Check build logs and dependencies |
| `NETWORK_ERROR` | Network connectivity issues | Check internet connection and GitHub access |
| `PERMISSION_DENIED` | Insufficient file permissions | Ensure proper read/write permissions |
| `CONFIG_INVALID` | Invalid configuration parameters | Validate parameter types and values |

### Error Response Format

All tools return errors in a consistent format:

```typescript
{
  content: [{
    type: 'text',
    text: 'Error executing {tool_name}: {error_message}'
  }],
  isError: true
}
```

---

## Resources

DocuMCP automatically stores results as MCP resources for later retrieval:

- `documcp://analysis/{id}`: Repository analysis results
- `documcp://config/{id}`: Generated configuration files
- `documcp://structure/{id}`: Documentation structure data
- `documcp://deployment/{id}`: GitHub Actions workflows
- `documcp://templates/{type}`: Reusable templates

---

## Best Practices

1. **Always start with `analyze_repository`** to understand your project
2. **Use the analysis ID** consistently across related tools
3. **Test locally** with `test_local_deployment` before deploying
4. **Validate content** with `validate_diataxis_content` regularly
5. **Monitor deployment** with `verify_deployment` after setup

---

## Integration Examples

### Complete Documentation Workflow

```json
[
  {
    "tool": "analyze_repository",
    "arguments": { "path": "./project", "depth": "standard" }
  },
  {
    "tool": "recommend_ssg",
    "arguments": { "analysisId": "{analysis_id}" }
  },
  {
    "tool": "generate_config",
    "arguments": { "ssg": "{recommended_ssg}", "projectName": "My Project", "outputPath": "./docs" }
  },
  {
    "tool": "setup_structure",
    "arguments": { "path": "./docs", "ssg": "{recommended_ssg}" }
  },
  {
    "tool": "populate_diataxis_content",
    "arguments": { "analysisId": "{analysis_id}", "docsPath": "./docs" }
  },
  {
    "tool": "deploy_pages",
    "arguments": { "repository": ".", "ssg": "{recommended_ssg}" }
  }
]
```

### Gap Analysis and Improvement

```json
[
  {
    "tool": "detect_documentation_gaps",
    "arguments": { "repositoryPath": "./project", "documentationPath": "./docs" }
  },
  {
    "tool": "validate_diataxis_content",
    "arguments": { "contentPath": "./docs", "validationType": "all" }
  }
]
```
