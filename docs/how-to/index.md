---
id: how-to-index
title: How to
sidebar_label: How to
---

# How-To Guides

Practical, task-oriented guides for accomplishing specific goals with DocuMCP.

## Available Guides

This section contains comprehensive how-to documentation following the Diataxis framework.

**How-To Guides** are task-oriented and help users accomplish specific goals:
- Solve specific problems step-by-step
- Assume some knowledge and experience with MCP
- Provide a clear series of actions
- Focus on practical results

## 🚀 Getting Started

- **[Deploy to Production](./deploy-to-production.md)** - Production deployment checklist and best practices
- **[Deploy Your Application](./how-to-deploy-your-application.md)** - Complete deployment workflows for different platforms

## 🔧 Development & Integration

- **[Develop Custom MCP Tools](./how-to-add-a-new-feature.md)** - Complete guide to extending DocuMCP with custom tools
- **[Debug MCP Server Issues](./how-to-debug-common-issues.md)** - Comprehensive troubleshooting for MCP integration problems

## 📋 Common Tasks

### MCP Tool Development
Learn how to create custom tools that integrate seamlessly with DocuMCP's workflow.

### Troubleshooting MCP Integration
Step-by-step debugging guide for common MCP server and client issues.

### Production Deployment
Best practices for deploying documentation sites with automated workflows.

### Multi-Platform Deployment
Deploy to GitHub Pages, Vercel, Netlify, and other platforms.

## 🔄 Workflow Examples

### Complete Documentation Setup
```bash
# 1. Analyze your project
analyze_repository --path ./my-project

# 2. Get SSG recommendation  
recommend_ssg --analysis-id <id>

# 3. Generate configuration
generate_config --ssg docusaurus --project "My Project"

# 4. Create structure
setup_structure --path ./docs --ssg docusaurus

# 5. Populate content
populate_diataxis_content --analysis-id <id> --docs-path ./docs

# 6. Deploy to GitHub Pages
deploy_pages --repository . --ssg docusaurus
```

### Debugging Failed Deployments
```bash
# 1. Test local build
test_local_deployment --repository-path . --ssg docusaurus

# 2. Verify deployment configuration
verify_deployment --repository . --url https://myuser.github.io/myproject

# 3. Check for common issues
# See debugging guide for detailed steps
```

### Gap Analysis and Improvement
```bash
# 1. Detect documentation gaps
detect_documentation_gaps --repository-path . --documentation-path ./docs

# 2. Validate existing content
validate_diataxis_content --content-path ./docs --validation-type all

# 3. Populate missing content
populate_diataxis_content --analysis-id <id> --docs-path ./docs
```

## 🎯 By Use Case

### For MCP Tool Developers
- [Develop Custom MCP Tools](./how-to-add-a-new-feature.md) - Complete development workflow
- [Debug MCP Server Issues](./how-to-debug-common-issues.md) - Tool-specific debugging

### For Documentation Teams  
- [Deploy to Production](./deploy-to-production.md) - Production deployment
- [Deploy Your Application](./how-to-deploy-your-application.md) - Platform-specific deployment

### For Project Maintainers
- All guides above - DocuMCP covers the complete documentation lifecycle

## 🔗 Related Resources

- [MCP Tools API Reference](../reference/api-reference.md) - Complete tool documentation
- [Getting Started Tutorial](../tutorials/getting-started-with-documcp.md) - New user onboarding  
- [Architecture Overview](../explanation/architecture-overview.md) - Understanding DocuMCP design
