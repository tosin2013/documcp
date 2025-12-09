---
documcp:
  last_updated: "2025-11-20T00:46:21.952Z"
  last_validated: "2025-12-09T19:18:14.171Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# Local Documentation Testing

This guide shows how to test your documentation locally before deploying to GitHub Pages using containerized environments that don't affect your system.

## 🎯 Best Practice: Test Build Before Pushing

**Always test your documentation build locally before pushing to git** to ensure GitHub Actions will build successfully:

### Option 1: Test Node.js Build (Recommended - Matches GitHub Actions)

```bash
# Test the same build process GitHub Actions uses
cd docs
npm ci
npm run build
```

This uses the exact same process as GitHub Actions and catches build issues early.

### Option 2: Test Docker Build (Optional - For Container Validation)

```bash
# Quick Docker validation (if Dockerfile is configured)
docker build -f Dockerfile.docs -t documcp-docs-test . && echo "✅ Docker build ready"
```

**Note**: Docker testing validates containerized environments, but GitHub Actions uses Node.js directly, so Option 1 is more reliable for CI validation.

## Quick Start - Containerized Testing

DocuMCP automatically generates a containerized testing environment that requires only Docker or Podman:

```bash
# Run the containerized testing script
./test-docs-local.sh
```

This script will:

1. **Detect** your container runtime (Podman or Docker)
2. **Build** a documentation container
3. **Check** for broken links in your documentation
4. **Serve** the documentation at http://localhost:3001

### Prerequisites

You need either Docker or Podman installed:

**Option 1: Podman (rootless, more secure)**

```bash
# macOS
brew install podman

# Ubuntu/Debian
sudo apt-get install podman

# RHEL/CentOS/Fedora
sudo dnf install podman
```

**Option 2: Docker**

```bash
# macOS
brew install docker

# Or download from: https://docs.docker.com/get-docker/
```

## Container-Based Testing Methods

### Method 1: Using the Generated Script (Recommended)

```bash
# Simple one-command testing
./test-docs-local.sh
```

### Method 2: Using Docker Compose

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.docs.yml up --build

# Or with Podman Compose
podman-compose -f docker-compose.docs.yml up --build
```

### Method 3: Manual Container Commands

```bash
# Build the container
docker build -f Dockerfile.docs -t documcp-docs .
# or: podman build -f Dockerfile.docs -t documcp-docs .

# Run the container
docker run --rm -p 3001:3001 documcp-docs
# or: podman run --rm -p 3001:3001 documcp-docs
```

### Method 4: Pre-Push Docker Validation

**Recommended workflow before pushing to git:**

```bash
# 1. Test Docker build (validates CI will work)
docker build -f Dockerfile.docs -t documcp-docs-test .

# 2. If successful, test locally
docker run --rm -p 3001:3001 documcp-docs-test

# 3. Verify at http://localhost:3001, then push to git
```

This ensures your Docker build matches what GitHub Actions will use.

### Method 5: Legacy Local Installation (Not Recommended)

If you prefer to install dependencies locally (affects your system):

```bash
cd docs
npm install
npm run build
npm run serve
```

## Pre-Push Checklist

Before pushing documentation changes to git, ensure:

- [ ] **Node.js build succeeds**: `cd docs && npm ci && npm run build` (matches GitHub Actions)
- [ ] **Local preview works**: Documentation serves correctly at http://localhost:3001
- [ ] **No broken links**: Run link checker (included in test script)
- [ ] **Build output valid**: Check `docs/build` directory structure
- [ ] **No console errors**: Check browser console for JavaScript errors

**Quick pre-push validation command (Node.js - Recommended):**

```bash
cd docs && npm ci && npm run build && echo "✅ Ready to push!"
```

**Alternative Docker validation (if Dockerfile is configured):**

```bash
docker build -f Dockerfile.docs -t documcp-docs-test . && \
docker run --rm -d -p 3001:3001 --name docs-test documcp-docs-test && \
sleep 5 && curl -f http://localhost:3001 > /dev/null && \
docker stop docs-test && echo "✅ Ready to push!"
```

**Note**: GitHub Actions uses Node.js directly (not Docker), so testing with `npm run build` is the most reliable way to validate CI will succeed.

## Verification Checklist

### ✅ Content Verification

- [ ] All pages load without errors
- [ ] Navigation works correctly
- [ ] Links between pages function properly
- [ ] Search functionality works (if enabled)
- [ ] Code blocks render correctly with syntax highlighting
- [ ] Images and assets load properly

### ✅ Structure Verification

- [ ] Sidebar navigation reflects your documentation structure
- [ ] Categories and sections are properly organized
- [ ] Page titles and descriptions are accurate
- [ ] Breadcrumb navigation works
- [ ] Footer links are functional

### ✅ Content Quality

- [ ] No broken internal links
- [ ] No broken external links
- [ ] Code examples are up-to-date
- [ ] Screenshots are current and clear
- [ ] All content follows Diataxis framework principles

### ✅ Performance Testing

- [ ] Pages load quickly (< 3 seconds)
- [ ] Search is responsive
- [ ] No console errors in browser developer tools
- [ ] Mobile responsiveness works correctly

## Troubleshooting Common Issues

### Container Build Failures

**Problem**: Container build fails

**Solutions**:

```bash
# Clean up any existing containers and images
docker system prune -f
# or: podman system prune -f

# Rebuild from scratch
docker build --no-cache -f Dockerfile.docs -t documcp-docs .
# or: podman build --no-cache -f Dockerfile.docs -t documcp-docs .

# Check for syntax errors in markdown files
find docs -name "*.md" -exec npx markdownlint {} \;
```

### Container Runtime Issues

**Problem**: "Neither Podman nor Docker found"

**Solutions**:

```bash
# Check if Docker/Podman is installed and running
docker --version
podman --version

# On macOS, ensure Docker Desktop is running
# On Linux, ensure Docker daemon is started:
sudo systemctl start docker

# For Podman on macOS, start the machine:
podman machine start
```

### Broken Links

**Problem**: Links between documentation pages don't work

**Solutions**:

- Check that file paths in your markdown match actual file locations
- Ensure relative links use correct syntax (e.g., `[text](../reference/configuration.md)`)
- Verify that `sidebars.js` references match actual file names

### Missing Pages

**Problem**: Some documentation pages don't appear in navigation

**Solutions**:

- Update `docs-site/sidebars.js` to include new pages
- Ensure files are in the correct directory structure
- Check that frontmatter is properly formatted

### Styling Issues

**Problem**: Documentation doesn't look right

**Solutions**:

- Check `docs-site/src/css/custom.css` for custom styles
- Verify Docusaurus theme configuration
- Clear browser cache and reload

## Link Checking

### Automated Link Checking

DocuMCP provides built-in link checking:

```bash
# Check all links
npm run docs:check-links

# Check only external links
npm run docs:check-links:external

# Check only internal links
npm run docs:check-links:internal
```

### Manual Link Checking

Use markdown-link-check for comprehensive link validation:

```bash
# Install globally
npm install -g markdown-link-check

# Check specific file
markdown-link-check docs/index.md

# Check all markdown files
find docs -name "*.md" -exec markdown-link-check {} \;
```

## Container Configuration Testing

### Verify Container Configuration

```bash
# Test container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
# or: podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check container logs
docker logs documcp-docs-test
# or: podman logs documcp-docs-test

# Execute commands inside running container
docker exec -it documcp-docs-test sh
# or: podman exec -it documcp-docs-test sh
```

### Test Different Container Environments

```bash
# Test production build in container
docker run --rm -e NODE_ENV=production -p 3001:3001 documcp-docs

# Interactive debugging mode
docker run --rm -it --entrypoint sh documcp-docs
# Inside container: cd docs-site && npm run build --verbose
```

## Deployment Preview

Before deploying to GitHub Pages, test with production settings:

```bash
# Build with production configuration
npm run build

# Serve the production build locally
npm run serve
```

This simulates exactly what GitHub Pages will serve.

## Integration with Development Workflow

### Pre-commit Testing

Add documentation testing to your git hooks:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run documentation tests
./test-docs-local.sh --build-only

# Run your regular tests
npm test
```

### CI/CD Integration

Add documentation testing to your GitHub Actions:

```yaml
# .github/workflows/docs-test.yml
name: Documentation Tests

on:
  pull_request:
    paths:
      - "docs/**"
      - "docs-site/**"

jobs:
  test-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: "docs-site/package-lock.json"

      - name: Test documentation build
        run: ./test-docs-local.sh --build-only
```

## Advanced Testing

### Performance Testing

```bash
# Install lighthouse CLI
npm install -g lighthouse

# Test performance of local documentation
lighthouse http://localhost:3001 --output=json --output-path=./lighthouse-report.json

# Check specific performance metrics
lighthouse http://localhost:3001 --only-categories=performance
```

### Accessibility Testing

```bash
# Test accessibility
lighthouse http://localhost:3001 --only-categories=accessibility

# Use axe for detailed accessibility testing
npm install -g axe-cli
axe http://localhost:3001
```

### SEO Testing

```bash
# Test SEO optimization
lighthouse http://localhost:3001 --only-categories=seo

# Check meta tags and structure
curl -s http://localhost:3001 | grep -E "<title>|<meta"
```

## Automated Testing Script

Create a comprehensive test script:

```bash
#!/bin/bash
# comprehensive-docs-test.sh

echo "🧪 Running comprehensive documentation tests..."

# Build test
echo "📦 Testing build..."
cd docs-site && npm run build

# Link checking
echo "🔗 Checking links..."
cd .. && npm run docs:check-links:all

# Performance test (if lighthouse is available)
if command -v lighthouse &> /dev/null; then
    echo "⚡ Testing performance..."
    cd docs-site && npm run serve &
    SERVER_PID=$!
    sleep 5
    lighthouse http://localhost:3001 --quiet --only-categories=performance
    kill $SERVER_PID
fi

echo "✅ All tests completed!"
```

## Best Practices

### 1. Test Early and Often

- Test after every significant documentation change
- Include documentation testing in your regular development workflow
- Set up automated testing in CI/CD pipelines

### 2. Test Different Scenarios

- Test with different screen sizes and devices
- Test with JavaScript disabled
- Test with slow internet connections

### 3. Monitor Performance

- Keep an eye on build times
- Monitor page load speeds
- Check for large images or files that slow down the site

### 4. Validate Content Quality

- Use spell checkers and grammar tools
- Ensure code examples work and are current
- Verify that external links are still valid

By following this guide, you can ensure your documentation works perfectly before deploying to GitHub Pages, providing a better experience for your users and avoiding broken deployments.
