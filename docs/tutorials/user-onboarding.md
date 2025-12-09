---
documcp:
  last_updated: "2025-11-20T00:46:21.973Z"
  last_validated: "2025-12-09T19:18:14.190Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# DocuMCP User Onboarding Guide

Welcome to DocuMCP! This comprehensive guide will help you get started with DocuMCP in your own environment, from initial setup to advanced usage patterns.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For repository analysis
- **GitHub Account**: For GitHub Pages deployment

### Installation

```bash
# Install DocuMCP globally
npm install -g documcp

# Or install locally in your project
npm install documcp --save-dev
```

### Verify Installation

```bash
# Check if DocuMCP is installed correctly
documcp --version

# Should output: DocuMCP v0.5.0
```

## 📋 Basic Usage Patterns

### Pattern 1: Repository Analysis

Start by analyzing your repository to understand its structure and documentation needs.

```bash
# Basic repository analysis
documcp analyze-repository --path ./my-project --depth standard

# Quick analysis for large repositories
documcp analyze-repository --path ./large-project --depth quick

# Deep analysis for comprehensive documentation
documcp analyze-repository --path ./complex-project --depth deep
```

**Example Output:**

```json
{
  "success": true,
  "data": {
    "id": "analysis_abc123_def456",
    "structure": {
      "totalFiles": 150,
      "totalDirectories": 25,
      "languages": { ".ts": 100, ".md": 20, ".json": 10 },
      "hasTests": true,
      "hasCI": true,
      "hasDocs": false
    },
    "recommendations": {
      "primaryLanguage": "TypeScript",
      "projectType": "Library",
      "teamSize": "small"
    }
  }
}
```

### Pattern 2: SSG Recommendation

Get intelligent recommendations for the best static site generator for your project.

```bash
# Get SSG recommendation based on analysis
documcp recommend-ssg --analysis-id analysis_abc123_def456

# With user preferences
documcp recommend-ssg --analysis-id analysis_abc123_def456 --priority performance --ecosystem javascript

# For enterprise users
documcp recommend-ssg --analysis-id analysis_abc123_def456 --priority simplicity
```

**Example Output:**

```json
{
  "success": true,
  "data": {
    "recommended": "docusaurus",
    "confidence": 0.92,
    "reasoning": [
      "React-based project detected",
      "Documentation focus identified",
      "Team size suitable for Docusaurus"
    ],
    "alternatives": [
      {
        "name": "hugo",
        "score": 0.85,
        "pros": ["Performance", "Fast builds"],
        "cons": ["Learning curve", "Go templates"]
      }
    ]
  }
}
```

### Pattern 3: Documentation Structure Setup

Create a Diataxis-compliant documentation structure.

```bash
# Set up documentation structure
documcp setup-structure --path ./docs --ssg docusaurus --include-examples

# Minimal structure for existing projects
documcp setup-structure --path ./site --ssg hugo --include-examples false
```

### Pattern 4: Configuration Generation

Generate configuration files for your chosen SSG.

```bash
# Generate Docusaurus configuration
documcp generate-config --ssg docusaurus --project-name "My Project" --output-path ./docs

# Generate Hugo configuration
documcp generate-config --ssg hugo --project-name "My Site" --output-path ./site
```

### Pattern 5: Content Population

Populate your documentation with intelligent content based on your repository.

```bash
# Populate documentation content
documcp populate-content --analysis-id analysis_abc123_def456 --docs-path ./docs

# With specific focus areas
documcp populate-content --analysis-id analysis_abc123_def456 --docs-path ./docs --focus-areas api,examples
```

### Pattern 6: GitHub Pages Deployment

Deploy your documentation to GitHub Pages.

```bash
# Deploy to GitHub Pages
documcp deploy-pages --repository "user/repo" --ssg docusaurus

# With custom domain
documcp deploy-pages --repository "user/repo" --ssg docusaurus --custom-domain "docs.example.com"
```

## 🎯 Common Use Cases

### Use Case 1: New Open Source Project

For a new open source project, follow this workflow:

```bash
# 1. Analyze your repository
ANALYSIS_ID=$(documcp analyze-repository --path . --depth standard | jq -r '.data.id')

# 2. Get SSG recommendation
documcp recommend-ssg --analysis-id $ANALYSIS_ID --priority community_focused

# 3. Set up documentation structure
documcp setup-structure --path ./docs --ssg docusaurus --include-examples

# 4. Generate configuration
documcp generate-config --ssg docusaurus --project-name "My Open Source Project" --output-path ./docs

# 5. Populate content
documcp populate-content --analysis-id $ANALYSIS_ID --docs-path ./docs

# 6. Deploy to GitHub Pages
documcp deploy-pages --repository "$(git remote get-url origin | sed 's/.*github.com[:/]\([^.]*\).*/\1/')" --ssg docusaurus
```

### Use Case 2: Enterprise Documentation

For enterprise documentation with specific requirements:

```bash
# 1. Analyze with enterprise focus
ANALYSIS_ID=$(documcp analyze-repository --path . --depth deep | jq -r '.data.id')

# 2. Get enterprise-focused recommendation
documcp recommend-ssg --analysis-id $ANALYSIS_ID --priority enterprise_focused

# 3. Set up minimal structure
documcp setup-structure --path ./enterprise-docs --ssg hugo --include-examples false

# 4. Generate enterprise configuration
documcp generate-config --ssg hugo --project-name "Enterprise Documentation" --output-path ./enterprise-docs

# 5. Populate with enterprise focus
documcp populate-content --analysis-id $ANALYSIS_ID --docs-path ./enterprise-docs --focus-areas security,compliance,api
```

### Use Case 3: API Documentation

For API-focused projects:

```bash
# 1. Analyze API project
ANALYSIS_ID=$(documcp analyze-repository --path . --depth standard | jq -r '.data.id')

# 2. Get API-focused recommendation
documcp recommend-ssg --analysis-id $ANALYSIS_ID --priority features

# 3. Set up API documentation structure
documcp setup-structure --path ./api-docs --ssg docusaurus --include-examples

# 4. Generate API documentation configuration
documcp generate-config --ssg docusaurus --project-name "API Documentation" --output-path ./api-docs

# 5. Populate with API focus
documcp populate-content --analysis-id $ANALYSIS_ID --docs-path ./api-docs --focus-areas api,examples,integration
```

## 🔧 Advanced Configuration

### Environment Variables

Set up environment variables for advanced configuration:

```bash
# GitHub token for deployment
export GITHUB_TOKEN="your_github_token"

# Custom storage directory for memory
export DOCUMCP_STORAGE_DIR="./.documcp"

# Development mode for debugging
export NODE_ENV="development"
```

### Memory System Configuration

Configure the memory system for learning and pattern recognition:

```bash
# Initialize memory system
documcp memory initialize --storage-dir ./.documcp

# Export memories for backup
documcp memory export --format json --output ./documcp-memories.json

# Import memories from backup
documcp memory import --format json --input ./documcp-memories.json
```

### User Preferences

Set up user preferences for personalized recommendations:

```bash
# Set user preferences
documcp preferences set --user-id "developer123" --priority performance --ecosystem javascript

# Get personalized recommendations
documcp recommend-ssg --analysis-id $ANALYSIS_ID --user-id "developer123"

# Export preferences
documcp preferences export --user-id "developer123" --output ./preferences.json
```

## 🚨 Troubleshooting

### Common Issues

#### Issue 1: Repository Analysis Fails

**Problem:** `Permission denied: Cannot read directory`

**Solution:**

```bash
# Check directory permissions
ls -la /path/to/repository

# Fix permissions if needed
chmod -R 755 /path/to/repository

# Run analysis again
documcp analyze-repository --path /path/to/repository --depth standard
```

#### Issue 2: SSG Recommendation Returns Low Confidence

**Problem:** Low confidence scores in recommendations

**Solution:**

```bash
# Try deeper analysis
documcp analyze-repository --path . --depth deep

# Use specific preferences
documcp recommend-ssg --analysis-id $ANALYSIS_ID --priority simplicity --ecosystem any

# Check for similar projects in memory
documcp memory similar --analysis-id $ANALYSIS_ID
```

#### Issue 3: GitHub Pages Deployment Fails

**Problem:** Deployment fails with permission errors

**Solution:**

```bash
# Check GitHub token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Ensure token has repo and pages permissions
# Regenerate token with correct permissions if needed

# Try deployment again
documcp deploy-pages --repository "user/repo" --ssg docusaurus
```

#### Issue 4: Content Population Generates Empty Content

**Problem:** No content is generated during population

**Solution:**

```bash
# Check if repository has sufficient content
documcp analyze-repository --path . --depth deep

# Ensure documentation structure exists
documcp setup-structure --path ./docs --ssg docusaurus

# Try with different population level
documcp populate-content --analysis-id $ANALYSIS_ID --docs-path ./docs --population-level comprehensive
```

## 📚 Best Practices

### 1. Repository Organization

- Keep your repository well-organized with clear directory structure
- Include a comprehensive README.md file
- Use consistent naming conventions
- Include package.json or equivalent dependency files

### 2. Documentation Structure

- Follow Diataxis framework principles
- Use clear, descriptive headings
- Include code examples and use cases
- Keep documentation up-to-date with code changes

### 3. Memory System Usage

- Regularly export memories for backup
- Use consistent user IDs for preference tracking
- Clean up old memories periodically
- Share memories across team members for better recommendations

### 4. Deployment Strategy

- Test documentation locally before deployment
- Use staging environments for testing
- Monitor deployment success rates
- Keep deployment configurations in version control

## 🔗 Integration Examples

### GitHub Actions Integration

```yaml
name: Deploy Documentation

on:
  push:
    branches: [main]
    paths: ["docs/**", "src/**"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install DocuMCP
        run: npm install -g documcp

      - name: Analyze Repository
        id: analyze
        run: |
          ANALYSIS_ID=$(documcp analyze-repository --path . --depth standard | jq -r '.data.id')
          echo "analysis_id=$ANALYSIS_ID" >> $GITHUB_OUTPUT

      - name: Deploy Documentation
        run: |
          documcp deploy-pages --repository ${{ github.repository }} --ssg docusaurus
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Docker Integration

```dockerfile
FROM node:20-alpine

# Install DocuMCP
RUN npm install -g documcp

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Analyze and deploy documentation
RUN documcp analyze-repository --path . --depth standard && \
    documcp recommend-ssg --analysis-id $(documcp analyze-repository --path . | jq -r '.data.id') && \
    documcp deploy-pages --repository $REPOSITORY --ssg docusaurus

EXPOSE 3000
CMD ["documcp", "serve", "--port", "3000"]
```

## 📖 Additional Resources

- [API Reference](../api/) - Complete API documentation
- [Configuration Guide](../reference/configuration.md) - Detailed configuration options
- [MCP Tools Reference](../reference/mcp-tools.md) - MCP tool specifications
- [GitHub Pages Deployment](../how-to/github-pages-deployment.md) - Deployment guide
- [Troubleshooting Guide](../how-to/troubleshooting.md) - Common issues and solutions

## 🤝 Getting Help

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Check the comprehensive documentation
- **API Reference**: Explore the complete API documentation

Welcome to the DocuMCP community! 🎉
