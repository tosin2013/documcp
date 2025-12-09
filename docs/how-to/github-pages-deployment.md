---
documcp:
  last_updated: "2025-11-20T00:46:21.951Z"
  last_validated: "2025-12-09T19:18:14.170Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# How to Deploy to GitHub Pages

This guide shows you how to deploy your documentation to GitHub Pages using DocuMCP's automated workflows. DocuMCP uses a dual-static-site-generator approach for optimal deployment.

## Architecture Overview

DocuMCP employs a **dual SSG strategy**:

- **Docusaurus**: Primary documentation system for development and rich content
- **Jekyll**: GitHub Pages deployment for reliable hosting
- **Docker**: Alternative testing and deployment method

## Quick Deployment

For immediate deployment:

```bash
# Prompt DocuMCP:
"deploy my documentation to GitHub Pages"
```

## Prerequisites

- Repository with documentation content
- GitHub account with repository access
- GitHub Pages enabled in repository settings
- Node.js 20.0.0+ for Docusaurus development

## Deployment Methods

### Method 1: Automated with DocuMCP (Recommended)

Use DocuMCP's intelligent deployment:

```bash
# Complete workflow:
"analyze my repository, recommend SSG, and deploy to GitHub Pages"
```

This will:

1. Analyze your project structure
2. Set up Docusaurus for development
3. Configure Jekyll for GitHub Pages deployment
4. Create GitHub Actions workflow
5. Deploy to Pages

### Method 2: Current DocuMCP Setup

DocuMCP currently uses the following deployment workflow:

#### GitHub Actions Workflow

```yaml
name: Deploy Jekyll to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.1"
          bundler-cache: true
      - name: Build with Jekyll
        run: bundle exec jekyll build
        env:
          JEKYLL_ENV: production
      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: "./_site"

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Development vs Production

- **Development**: Use Docusaurus (`cd docs && npm start`)
- **Production**: Jekyll builds and deploys to GitHub Pages
- **Testing**: Use Docker (`docker-compose -f docker-compose.docs.yml up`)

### Method 3: Manual Configuration

If you prefer manual setup:

#### Step 1: Choose Your SSG

```bash
# Get recommendation first:
"recommend static site generator for my project"
```

#### Step 2: Generate Config

```bash
# For example, with Hugo:
"generate Hugo configuration for GitHub Pages deployment"
```

#### Step 3: Deploy

```bash
"set up GitHub Pages deployment workflow for Hugo"
```

## GitHub Actions Workflow

DocuMCP generates optimized workflows for each SSG:

### Docusaurus Workflow

```yaml
name: Deploy Docusaurus

on:
  push:
    branches: [main]
    paths: ["docs/**", "docusaurus.config.js"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: "./build"

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Hugo Workflow

```yaml
name: Deploy Hugo

on:
  push:
    branches: [main]
    paths: ["content/**", "config.yml", "themes/**"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: "latest"
          extended: true

      - name: Build
        run: hugo --minify

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: "./public"

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### MkDocs Workflow

```yaml
name: Deploy MkDocs

on:
  push:
    branches: [main]
    paths: ["docs/**", "mkdocs.yml"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.x"

      - name: Install dependencies
        run: |
          pip install mkdocs mkdocs-material

      - name: Build
        run: mkdocs build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: "./site"

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Repository Configuration

### GitHub Pages Settings

1. Navigate to repository **Settings**
2. Go to **Pages** section
3. Set **Source** to "GitHub Actions"
4. Save configuration

### Branch Protection

Protect your main branch:

```yaml
# .github/branch-protection.yml
protection_rules:
  main:
    required_status_checks:
      strict: true
      contexts:
        - "Deploy Documentation"
    enforce_admins: false
    required_pull_request_reviews:
      required_approving_review_count: 1
```

## Custom Domain Setup

### Add Custom Domain

1. Create `CNAME` file in your docs directory:

```
docs.yourdomain.com
```

2. Configure DNS records:

```
CNAME docs yourusername.github.io
```

3. Update DocuMCP deployment:

```bash
"deploy to GitHub Pages with custom domain docs.yourdomain.com"
```

### SSL Certificate

GitHub automatically provides SSL certificates for custom domains.

Verification:

- Check `https://docs.yourdomain.com` loads correctly
- Verify SSL certificate is valid
- Test redirect from `http://` to `https://`

## Environment Configuration

### Production Optimization

DocuMCP automatically configures:

**Build optimization:**

```yaml
- name: Build with optimization
  run: |
    export NODE_ENV=production
    npm run build
  env:
    CI: true
    NODE_OPTIONS: --max-old-space-size=4096
```

**Caching strategy:**

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Environment Variables

Set up environment variables for production:

1. Go to repository **Settings**
2. Navigate to **Secrets and variables** > **Actions**
3. Add production variables:
   - `HUGO_ENV=production`
   - `NODE_ENV=production`
   - Custom API keys (if needed)

## Deployment Verification

### Automatic Verification

DocuMCP includes verification:

```bash
"verify my GitHub Pages deployment is working correctly"
```

This checks:

- ✅ Site is accessible
- ✅ All pages load correctly
- ✅ Navigation works
- ✅ Search functionality (if enabled)
- ✅ Mobile responsiveness
- ✅ SSL certificate validity

### Manual Verification Checklist

- [ ] Homepage loads at `https://username.github.io/repository`
- [ ] All navigation links work
- [ ] Search functions properly
- [ ] Mobile layout is responsive
- [ ] Images and assets load
- [ ] Forms work (if applicable)
- [ ] Analytics tracking (if configured)

## Troubleshooting Deployment Issues

### Common Problems

**Build Fails:**

```bash
# Check workflow logs in GitHub Actions tab
# Common issues:
- Node.js version mismatch
- Missing dependencies
- Configuration errors
```

**404 Errors:**

```bash
# Fix baseURL configuration
# For Docusaurus:
baseUrl: '/repository-name/',

# For Hugo:
baseURL: 'https://username.github.io/repository-name/'
```

**Assets Not Loading:**

```bash
# Check publicPath configuration
# Ensure all asset paths are relative
```

### Debug Mode

Enable debug mode in workflows:

```yaml
- name: Debug build
  run: |
    npm run build -- --verbose
  env:
    DEBUG: true
    ACTIONS_STEP_DEBUG: true
```

## Performance Optimization

### Build Performance

Optimize build times:

```yaml
- name: Cache build assets
  uses: actions/cache@v4
  with:
    path: |
      .next/cache
      .docusaurus/cache
      public/static
    key: ${{ runner.os }}-build-${{ hashFiles('**/*.md', '**/*.js') }}
```

### Site Performance

DocuMCP automatically optimizes:

- **Image compression**: WebP format when possible
- **CSS minification**: Remove unused styles
- **JavaScript bundling**: Code splitting and tree shaking
- **Asset preloading**: Critical resources loaded first

## Monitoring and Analytics

### GitHub Actions Monitoring

Set up notifications for deployment failures:

```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({
        owner: context.repo.owner,
        repo: context.repo.repo,
        title: 'Documentation Deployment Failed',
        body: 'Deployment workflow failed. Check logs for details.',
        labels: ['deployment', 'bug']
      });
```

### Site Analytics

Add analytics to track usage:

**Google Analytics (Docusaurus):**

```javascript
// docusaurus.config.js
const config = {
  presets: [
    [
      "classic",
      {
        gtag: {
          trackingID: "G-XXXXXXXXXX",
          anonymizeIP: true,
        },
      },
    ],
  ],
};
```

## Advanced Deployment Strategies

### Multi-Environment Deployment

Deploy to staging and production:

```yaml
# Deploy to staging on PR
on:
  pull_request:
    branches: [main]

# Deploy to production on merge
on:
  push:
    branches: [main]
```

### Rollback Strategy

Implement deployment rollback:

```yaml
- name: Store deployment info
  run: |
    echo "DEPLOYMENT_SHA=${{ github.sha }}" >> $GITHUB_ENV
    echo "DEPLOYMENT_TIME=$(date)" >> $GITHUB_ENV

- name: Create rollback script
  run: |
    echo "#!/bin/bash" > rollback.sh
    echo "git checkout ${{ env.DEPLOYMENT_SHA }}" >> rollback.sh
    chmod +x rollback.sh
```

## Security Considerations

### Permissions

DocuMCP uses minimal permissions:

```yaml
permissions:
  contents: read # Read repository content
  pages: write # Deploy to GitHub Pages
  id-token: write # OIDC authentication
```

### Secrets Management

Never commit secrets to repository:

- Use GitHub Actions secrets
- Environment variables for configuration
- OIDC tokens for authentication

## Next Steps

After successful deployment:

1. **[Monitor your site](site-monitoring.md)** for uptime and performance
2. **[Set up custom domain](custom-domains.md)** (optional)
3. **[Optimize for SEO](seo-optimization.md)**
4. **[Configure analytics](analytics-setup.md)**

## Summary

You now know how to:
✅ Deploy documentation using DocuMCP automation
✅ Configure GitHub Actions workflows
✅ Set up custom domains and SSL
✅ Verify deployments are working
✅ Troubleshoot common issues
✅ Optimize build and site performance
✅ Monitor deployments and analytics

Your documentation is now live and automatically updated!
