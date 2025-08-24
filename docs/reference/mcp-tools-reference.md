# MCP Tools Reference

Complete technical reference for all DocuMCP MCP server tools.

## Tool Overview

DocuMCP provides 11 MCP tools for intelligent documentation deployment:

| Tool | Purpose | Input Schema | Output |
|------|---------|--------------|--------|
| `analyze_repository` | Repository analysis and structure detection | `{path, depth?}` | Analysis results |
| `recommend_ssg` | Static site generator recommendations | `{analysisId, preferences?}` | SSG recommendation |
| `generate_config` | Configuration file generation | `{ssg, projectName, outputPath}` | Config files |
| `setup_structure` | Diataxis documentation structure | `{path, ssg, includeExamples?}` | Directory structure |
| `deploy_pages` | GitHub Pages deployment setup | `{repository, ssg, branch?, customDomain?}` | Deployment workflow |
| `verify_deployment` | Deployment verification and troubleshooting | `{repository, url?}` | Verification results |
| `populate_diataxis_content` | Intelligent content population | `{analysisId, docsPath, populationLevel?}` | Generated content |
| `validate_diataxis_content` | Content validation and compliance | `{contentPath, analysisId?, validationType?}` | Validation report |
| `validate_content` | General content quality validation | `{contentPath, validationType?, includeCodeValidation?}` | Quality report |
| `detect_documentation_gaps` | Documentation gap analysis | `{repositoryPath, documentationPath?, analysisId?}` | Gap analysis |
| `test_local_deployment` | Local deployment testing | `{repositoryPath, ssg, port?, timeout?}` | Test results |

## Tool Schemas

### analyze_repository

Analyzes repository structure, dependencies, and documentation needs.

**Input Schema:**
```typescript
{
  path: string;           // Path to repository
  depth?: 'quick' | 'standard' | 'deep';  // Analysis depth (default: 'standard')
}
```

**Output:** Repository analysis with technology detection, file structure, and recommendations.

### recommend_ssg

Recommends optimal static site generator based on project analysis.

**Input Schema:**
```typescript
{
  analysisId: string;     // ID from analyze_repository
  preferences?: {
    priority?: 'simplicity' | 'features' | 'performance';
    ecosystem?: 'javascript' | 'python' | 'ruby' | 'go' | 'any';
  };
}
```

**Output:** SSG recommendation with scoring and justification.

### generate_config

Generates configuration files for selected static site generator.

**Input Schema:**
```typescript
{
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  projectName: string;
  projectDescription?: string;
  outputPath: string;     // Where to generate config files
}
```

**Output:** Generated configuration files and setup instructions.

### setup_structure

Creates Diataxis-compliant documentation structure.

**Input Schema:**
```typescript
{
  path: string;           // Root path for documentation
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  includeExamples?: boolean;  // Include example content (default: true)
}
```

**Output:** Created directory structure and template files.

### deploy_pages

Sets up GitHub Pages deployment workflow.

**Input Schema:**
```typescript
{
  repository: string;     // Repository path or URL
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  branch?: string;        // Target branch (default: 'gh-pages')
  customDomain?: string;  // Custom domain configuration
}
```

**Output:** GitHub Actions workflow and deployment configuration.

### verify_deployment

Verifies and troubleshoots GitHub Pages deployment.

**Input Schema:**
```typescript
{
  repository: string;     // Repository path or URL
  url?: string;          // Expected deployment URL
}
```

**Output:** Deployment status, issues found, and troubleshooting recommendations.

### populate_diataxis_content

Intelligently populates Diataxis documentation with project-specific content.

**Input Schema:**
```typescript
{
  analysisId: string;     // Repository analysis ID
  docsPath: string;       // Path to documentation directory
  populationLevel?: 'basic' | 'comprehensive' | 'intelligent';  // Default: 'comprehensive'
  includeProjectSpecific?: boolean;  // Default: true
  preserveExisting?: boolean;        // Default: true
  technologyFocus?: string[];        // Specific technologies to emphasize
}
```

**Output:** Generated content files with coverage metrics.

### validate_diataxis_content

Validates accuracy, completeness, and compliance of Diataxis documentation.

**Input Schema:**
```typescript
{
  contentPath: string;    // Path to documentation directory
  analysisId?: string;    // Optional repository analysis ID
  validationType?: 'accuracy' | 'completeness' | 'compliance' | 'all';  // Default: 'all'
  includeCodeValidation?: boolean;  // Default: true
  confidence?: 'strict' | 'moderate' | 'permissive';  // Default: 'moderate'
}
```

**Output:** Validation results with confidence scores and recommendations.

### validate_content

Validates general content quality: broken links, code syntax, references.

**Input Schema:**
```typescript
{
  contentPath: string;    // Path to content directory
  validationType?: 'links' | 'code' | 'references' | 'all';  // Default: 'all'
  includeCodeValidation?: boolean;  // Default: true
  followExternalLinks?: boolean;     // Default: false (slower)
}
```

**Output:** Content quality report with issues and recommendations.

### detect_documentation_gaps

Analyzes repository and existing documentation to identify missing content.

**Input Schema:**
```typescript
{
  repositoryPath: string;      // Path to repository
  documentationPath?: string;  // Path to existing documentation
  analysisId?: string;         // Optional existing analysis ID
  depth?: 'quick' | 'standard' | 'comprehensive';  // Default: 'standard'
}
```

**Output:** Gap analysis with missing content identification and priorities.

### test_local_deployment

Tests documentation build and local server before deploying.

**Input Schema:**
```typescript
{
  repositoryPath: string;  // Path to repository
  ssg: 'jekyll' | 'hugo' | 'docusaurus' | 'mkdocs' | 'eleventy';
  port?: number;          // Port for local server (default: 3000)
  timeout?: number;       // Timeout in seconds (default: 60)
  skipBuild?: boolean;    // Skip build step (default: false)
}
```

**Output:** Test results with build status and server information.

## Tool Chaining Workflows

### Complete Documentation Setup
```
1. analyze_repository → 2. recommend_ssg → 3. generate_config → 4. setup_structure → 5. populate_diataxis_content → 6. validate_diataxis_content → 7. deploy_pages
```

### Quality Assurance Workflow
```
1. validate_content → 2. validate_diataxis_content → 3. detect_documentation_gaps → 4. test_local_deployment
```

### Deployment Workflow
```
1. test_local_deployment → 2. deploy_pages → 3. verify_deployment
```

## Error Handling

All tools return standardized MCP responses with:
- `success`: Boolean indicating operation success
- `error`: Error details if operation failed
- `metadata`: Tool version, execution time, timestamp
- `recommendations`: Actionable next steps

Common error codes:
- `INVALID_PATH`: Invalid file or directory path
- `ANALYSIS_FAILED`: Repository analysis failed
- `CONFIG_GENERATION_FAILED`: Configuration generation failed
- `DEPLOYMENT_SETUP_FAILED`: Deployment setup failed
- `VALIDATION_FAILED`: Content validation failed

## Performance Requirements

Tools must meet PERF-001 compliance standards:
- Small repositories (&lt;100 files): &lt;1 second
- Medium repositories (100-1000 files): &lt;10 seconds  
- Large repositories (1000+ files): &lt;60 seconds
