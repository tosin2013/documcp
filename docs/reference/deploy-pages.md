---
documcp:
  last_updated: "2025-11-20T00:46:21.961Z"
  last_validated: "2025-11-20T00:46:21.961Z"
  auto_updated: false
  update_frequency: monthly
---

# Deploy Pages Tool Documentation

## Overview

The `deploy_pages` tool provides automated GitHub Pages deployment setup with intelligent SSG (Static Site Generator) detection, optimized workflow generation, and comprehensive deployment tracking through the Knowledge Graph system.

## Features

- **SSG Auto-Detection**: Automatically retrieves SSG recommendations from Knowledge Graph using analysisId
- **Optimized Workflows**: Generates SSG-specific GitHub Actions workflows with best practices
- **Package Manager Detection**: Supports npm, yarn, and pnpm with automatic lockfile detection
- **Documentation Folder Detection**: Intelligently detects docs folders (docs/, website/, documentation/)
- **Custom Domain Support**: Automatic CNAME file generation
- **Deployment Tracking**: Integrates with Knowledge Graph to track deployment success/failure
- **User Preference Learning**: Tracks SSG usage patterns for personalized recommendations

## Usage

### Basic Usage

```javascript
// Deploy with explicit SSG
const result = await callTool("deploy_pages", {
  repository: "/path/to/project",
  ssg: "docusaurus",
});
```

### Advanced Usage with Knowledge Graph Integration

```javascript
// Deploy using SSG from previous analysis
const result = await callTool("deploy_pages", {
  repository: "https://github.com/user/repo.git",
  analysisId: "repo-analysis-123", // SSG retrieved from KG
  projectPath: "/local/path",
  projectName: "My Documentation Site",
  customDomain: "docs.example.com",
  userId: "developer-1",
});
```

## Parameters

| Parameter      | Type     | Required | Description                                                                 |
| -------------- | -------- | -------- | --------------------------------------------------------------------------- |
| `repository`   | `string` | ✅       | Repository path (local) or URL (remote)                                     |
| `ssg`          | `enum`   | ⚠️\*     | Static site generator: `jekyll`, `hugo`, `docusaurus`, `mkdocs`, `eleventy` |
| `branch`       | `string` | ❌       | Target branch for deployment (default: `gh-pages`)                          |
| `customDomain` | `string` | ❌       | Custom domain for GitHub Pages                                              |
| `projectPath`  | `string` | ❌       | Local project path for tracking                                             |
| `projectName`  | `string` | ❌       | Project name for tracking                                                   |
| `analysisId`   | `string` | ❌       | Repository analysis ID for SSG retrieval                                    |
| `userId`       | `string` | ❌       | User ID for preference tracking (default: `default`)                        |

\*Required unless `analysisId` is provided for SSG retrieval from Knowledge Graph

## SSG-Specific Workflows

### Docusaurus

- Node.js setup with configurable version
- Package manager auto-detection (npm/yarn/pnpm)
- Build caching optimization
- Working directory support for monorepos

### Hugo

- Extended Hugo version with latest releases
- Asset optimization and minification
- Submodule support for themes
- Custom build command detection

### Jekyll

- Ruby environment with Bundler
- Gemfile dependency management
- Production environment variables
- Custom plugin support

### MkDocs

- Python environment setup
- Requirements.txt dependency installation
- Direct GitHub Pages deployment
- Custom branch targeting

### Eleventy (11ty)

- Node.js with flexible configuration
- Custom output directory detection
- Plugin ecosystem support
- Development server integration

## Generated Workflow Features

### Security Best Practices

- **Minimal Permissions**: Only required `pages:write` and `id-token:write` permissions
- **OIDC Token Authentication**: JWT-based deployment validation
- **Environment Protection**: Production deployment safeguards
- **Dependency Scanning**: Automated security vulnerability checks

### Performance Optimizations

- **Build Caching**: Package manager and dependency caching
- **Incremental Builds**: Only rebuild changed content when possible
- **Asset Optimization**: Minification and compression
- **Parallel Processing**: Multi-stage builds where applicable

### Error Handling

- **Graceful Failures**: Comprehensive error reporting and recovery
- **Debug Information**: Detailed logging for troubleshooting
- **Health Checks**: Post-deployment validation
- **Rollback Support**: Automated rollback on deployment failures

## Knowledge Graph Integration

### Deployment Tracking

```typescript
// Successful deployment tracking
await trackDeployment(projectId, ssg, true, {
  buildTime: executionTime,
  branch: targetBranch,
  customDomain: domain,
});

// Failed deployment tracking
await trackDeployment(projectId, ssg, false, {
  errorMessage: error.message,
  failureStage: "build|deploy|verification",
});
```

### SSG Retrieval Logic

1. **Check Analysis ID**: Query project node in Knowledge Graph
2. **Get Recommendations**: Retrieve SSG recommendations sorted by confidence
3. **Fallback to History**: Use most recent successful deployment
4. **Smart Filtering**: Only consider successful deployments

### User Preference Learning

- **Success Rate Tracking**: Monitor SSG deployment success rates
- **Usage Pattern Analysis**: Track frequency of SSG selections
- **Personalized Recommendations**: Weight future suggestions based on history
- **Multi-User Support**: Separate preference tracking per userId

## Examples

### Complete Workflow Integration

```javascript
try {
  // 1. Analyze repository
  const analysis = await callTool("analyze_repository", {
    path: "/path/to/project",
  });

  // 2. Get SSG recommendation
  const recommendation = await callTool("recommend_ssg", {
    analysisId: analysis.analysisId,
  });

  // 3. Deploy with recommended SSG
  const deployment = await callTool("deploy_pages", {
    repository: "/path/to/project",
    analysisId: analysis.analysisId,
    projectName: "My Project",
    userId: "developer-1",
  });

  console.log(`Deployed ${deployment.ssg} to ${deployment.branch}`);
} catch (error) {
  console.error("Deployment workflow failed:", error);
}
```

### Custom Domain Setup

```javascript
const result = await callTool("deploy_pages", {
  repository: "/path/to/docs",
  ssg: "hugo",
  customDomain: "docs.mycompany.com",
  branch: "main", // Deploy from main branch
});

// CNAME file automatically created
console.log(`CNAME created: ${result.cnameCreated}`);
```

### Monorepo Documentation

```javascript
const result = await callTool("deploy_pages", {
  repository: "/path/to/monorepo",
  ssg: "docusaurus",
  // Will detect docs/ folder automatically
  projectPath: "/path/to/monorepo/packages/docs",
});

console.log(`Docs folder: ${result.detectedConfig.docsFolder}`);
console.log(`Build command: ${result.detectedConfig.buildCommand}`);
```

## Response Format

### Success Response

```javascript
{
  repository: "/path/to/project",
  ssg: "docusaurus",
  branch: "gh-pages",
  customDomain: "docs.example.com",
  workflowPath: "deploy-docs.yml",
  cnameCreated: true,
  repoPath: "/path/to/project",
  detectedConfig: {
    docsFolder: "docs",
    buildCommand: "npm run build",
    outputPath: "./build",
    packageManager: "npm",
    workingDirectory: "docs"
  }
}
```

### Error Response

```javascript
{
  success: false,
  error: {
    code: "SSG_NOT_SPECIFIED",
    message: "SSG parameter is required. Either provide it directly or ensure analysisId points to a project with SSG recommendations.",
    resolution: "Run analyze_repository and recommend_ssg first, or specify the SSG parameter explicitly."
  }
}
```

## Error Codes

| Code                         | Description                                       | Resolution                                          |
| ---------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| `SSG_NOT_SPECIFIED`          | No SSG provided and none found in Knowledge Graph | Provide SSG parameter or run analysis first         |
| `DEPLOYMENT_SETUP_FAILED`    | Failed to create workflow files                   | Check repository permissions and path accessibility |
| `INVALID_REPOSITORY`         | Repository path or URL invalid                    | Verify repository exists and is accessible          |
| `WORKFLOW_GENERATION_FAILED` | Failed to generate SSG-specific workflow          | Check SSG parameter and project structure           |

## Best Practices

### Repository Structure

- Place documentation in standard folders (`docs/`, `website/`, `documentation/`)
- Include `package.json` for Node.js projects with proper scripts
- Use lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) for dependency consistency

### Workflow Optimization

- Enable GitHub Pages in repository settings before first deployment
- Use semantic versioning for documentation releases
- Configure branch protection rules for production deployments
- Monitor deployment logs for performance bottlenecks

### Knowledge Graph Benefits

- Run `analyze_repository` before deployment for optimal SSG selection
- Use consistent `userId` for personalized recommendations
- Provide `projectName` and `projectPath` for deployment tracking
- Review deployment history through Knowledge Graph queries

## Troubleshooting

### Common Issues

**Build Failures**

- Verify all dependencies are listed in `package.json` or `requirements.txt`
- Check Node.js/Python version compatibility
- Ensure build scripts are properly configured

**Permission Errors**

- Enable GitHub Actions in repository settings
- Check workflow file permissions (should be automatically handled)
- Verify GitHub Pages is enabled for the target branch

**Custom Domain Issues**

- Verify DNS configuration points to GitHub Pages
- Allow 24-48 hours for DNS propagation
- Check CNAME file is created in repository root

### Debug Workflow

1. Check GitHub Actions logs in repository
2. Verify workflow file syntax using GitHub workflow validator
3. Test build locally using same commands as workflow
4. Review Knowledge Graph deployment history for patterns

## Related Tools

- [`analyze_repository`](../how-to/repository-analysis.md) - Repository analysis for SSG recommendations
- [`recommend_ssg`](./mcp-tools.md#recommend_ssg) - SSG recommendation engine
- [`verify_deployment`](./mcp-tools.md#verify_deployment) - Deployment verification and health checks
- [`manage_preferences`](./mcp-tools.md#manage_preferences) - User preference management
