---
documcp:
  last_updated: "2025-11-20T00:46:21.970Z"
  last_validated: "2025-12-09T19:41:38.601Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# Setting Up Your Development Environment

This tutorial covers setting up a development environment for ongoing documentation work with DocuMCP, including local testing, content workflows, and maintenance automation.

## What You'll Set Up

By the end of this tutorial, you'll have:

- Local documentation development environment
- Live reload and preview capabilities
- Content validation and testing workflow
- Automated quality checks
- Integration with your existing development tools

## Prerequisites

- Completed [Getting Started](getting-started.md) and [First Deployment](first-deployment.md)
- Node.js 20.0.0+ installed
- Your preferred code editor (VS Code recommended)
- Git and GitHub CLI (optional but recommended)

## Development Environment Setup

### Step 1: Local Development Server

Set up local development with live reload:

```bash
# Test local deployment before pushing to GitHub
"test my documentation build locally with live reload"
```

This will:

- Install development dependencies
- Start local server (typically on http://localhost:3000)
- Enable live reload for instant preview
- Validate build process

**For different SSGs:**

**Docusaurus:**

```bash
npm run start
# Opens http://localhost:3000 with live reload
```

**MkDocs:**

```bash
mkdocs serve
# Opens http://127.0.0.1:8000 with auto-reload
```

**Hugo:**

```bash
hugo server -D
# Opens http://localhost:1313 with live reload
```

**Jekyll:**

```bash
bundle exec jekyll serve --livereload
# Opens http://localhost:4000 with live reload
```

### Step 2: Content Validation Workflow

Set up automated content validation:

```bash
# Validate all documentation content
"validate my documentation content for accuracy and completeness"
```

This checks:

- **Link validation**: Internal and external links
- **Code syntax**: All code blocks and examples
- **Image references**: Missing or broken images
- **Content structure**: Diataxis compliance
- **SEO optimization**: Meta tags, headings

### Step 3: Quality Assurance Integration

Integrate quality checks into your workflow:

```bash
# Set up comprehensive documentation quality checks
"check all documentation links and validate content quality"
```

**Available validation levels:**

- **Basic**: Link checking and syntax validation
- **Comprehensive**: Full content analysis with Diataxis compliance
- **Advanced**: Performance testing and SEO analysis

### Step 4: Development Scripts Setup

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "docs:dev": "docusaurus start",
    "docs:build": "docusaurus build",
    "docs:serve": "docusaurus serve",
    "docs:validate": "npm run docs:check-links && npm run docs:test-build",
    "docs:check-links": "markdown-link-check docs/**/*.md",
    "docs:test-build": "npm run docs:build && npm run docs:serve -- --no-open",
    "docs:deploy": "npm run docs:validate && npm run docs:build"
  }
}
```

## Editor Configuration

### VS Code Setup

Create `.vscode/settings.json`:

```json
{
  "markdownlint.config": {
    "MD013": false,
    "MD033": false
  },
  "files.associations": {
    "*.mdx": "mdx"
  },
  "editor.wordWrap": "on",
  "editor.quickSuggestions": {
    "strings": true
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.quickSuggestions": {
      "comments": "off",
      "strings": "off",
      "other": "off"
    }
  }
}
```

**Recommended VS Code Extensions:**

- Markdown All in One
- markdownlint
- Prettier - Code formatter
- GitLens
- Live Server (for static preview)

### Content Writing Workflow

Establish a content creation workflow:

1. **Create branch** for documentation changes
2. **Write content** using Diataxis principles
3. **Test locally** with live server
4. **Validate content** using DocuMCP tools
5. **Review and refine** based on validation feedback
6. **Commit and push** to trigger deployment

## Automated Quality Checks

### Pre-commit Hooks

Set up automated checks before commits:

```bash
# Install husky for git hooks
npm install --save-dev husky

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run docs:validate"
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Validating documentation..."
npm run docs:validate

echo "📝 Checking markdown formatting..."
npx prettier --check "docs/**/*.md"

echo "🔗 Validating links..."
npm run docs:check-links
```

### GitHub Actions Integration

Enhance your deployment workflow with quality gates:

```yaml
# .github/workflows/docs-quality.yml
name: Documentation Quality

on:
  pull_request:
    paths: ["docs/**", "*.md"]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Validate documentation
        run: |
          npm run docs:validate
          npm run docs:check-links

      - name: Test build
        run: npm run docs:build

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Documentation quality checks passed!'
            });
```

## Content Management Strategies

### Diataxis Organization

Organize content following Diataxis principles:

**Directory Structure:**

```
docs/
├── tutorials/           # Learning-oriented (beginner-friendly)
│   ├── getting-started.md
│   ├── first-project.md
│   └── advanced-concepts.md
├── how-to-guides/      # Problem-solving (practical steps)
│   ├── troubleshooting.md
│   ├── configuration.md
│   └── deployment.md
├── reference/          # Information-oriented (comprehensive)
│   ├── api-reference.md
│   ├── cli-commands.md
│   └── configuration-options.md
└── explanation/        # Understanding-oriented (concepts)
    ├── architecture.md
    ├── design-decisions.md
    └── best-practices.md
```

### Content Templates

Create content templates for consistency:

**Tutorial Template:**

```markdown
# [Action] Tutorial

## What You'll Learn

- Objective 1
- Objective 2

## Prerequisites

- Requirement 1
- Requirement 2

## Step-by-Step Instructions

### Step 1: [Action]

Instructions...

### Step 2: [Action]

Instructions...

## Verification

How to confirm success...

## Next Steps

Where to go next...
```

**How-to Guide Template:**

```markdown
# How to [Solve Problem]

## Problem

Clear problem statement...

## Solution

Step-by-step solution...

## Alternative Approaches

Other ways to solve this...

## Troubleshooting

Common issues and fixes...
```

## Performance Optimization

### Build Performance

Optimize build times:

```bash
# Enable build caching
export GATSBY_CACHE_DIR=.cache
export GATSBY_PUBLIC_DIR=public

# Parallel processing
export NODE_OPTIONS="--max-old-space-size=8192"
```

**For large sites:**

- Enable incremental builds
- Use build caching
- Optimize image processing
- Minimize plugin usage

### Development Server Performance

Speed up local development:

```bash
# Fast refresh mode (Docusaurus)
npm run start -- --fast-refresh

# Hot reload with polling (for file system issues)
npm run start -- --poll

# Open specific page
npm run start -- --host 0.0.0.0 --port 3001
```

## Maintenance Automation

### Scheduled Content Validation

Set up scheduled validation:

```yaml
# .github/workflows/scheduled-validation.yml
name: Scheduled Documentation Validation

on:
  schedule:
    - cron: "0 2 * * 1" # Every Monday at 2 AM

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Full validation
        run: |
          "check all documentation links with external validation"
          "validate all content for accuracy and completeness"

      - name: Create issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Scheduled Documentation Validation Failed',
              body: 'The weekly documentation validation found issues. Check the workflow logs.',
              labels: ['documentation', 'maintenance']
            });
```

### Dependency Updates

Automate dependency maintenance:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "documentation"
```

## Collaboration Workflow

### Team Development

For team documentation:

1. **Branching strategy**: Feature branches for documentation changes
2. **Review process**: PR reviews for all documentation updates
3. **Style guide**: Consistent writing and formatting standards
4. **Content ownership**: Assign sections to team members

### Review Checklist

Documentation PR review checklist:

- [ ] Content follows Diataxis principles
- [ ] All links work (internal and external)
- [ ] Code examples are tested and accurate
- [ ] Images are optimized and accessible
- [ ] SEO metadata is complete
- [ ] Mobile responsiveness verified
- [ ] Build succeeds locally and in CI

## Next Steps

Your development environment is now ready! Next:

1. **[Learn advanced prompting](../how-to/prompting-guide.md)** for DocuMCP
2. **[Set up monitoring](../how-to/site-monitoring.md)** for your live site
3. **[Optimize for performance](../how-to/performance-optimization.md)**
4. **[Configure custom domains](../how-to/custom-domains.md)** (optional)

## Troubleshooting

**Common development issues:**

**Port conflicts:**

```bash
# Change default port
npm run start -- --port 3001
```

**Memory issues:**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
```

**File watching problems:**

```bash
# Enable polling for file changes
npm run start -- --poll
```

**Cache issues:**

```bash
# Clear build cache
rm -rf .docusaurus .cache public
npm run start
```

## Summary

You now have:
✅ Local development environment with live reload
✅ Content validation and quality checking
✅ Automated pre-commit hooks
✅ CI/CD integration for quality gates
✅ Performance optimization
✅ Maintenance automation
✅ Team collaboration workflow

Your documentation development environment is production-ready!
