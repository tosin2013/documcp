---
documcp:
  last_updated: "2025-11-20T00:46:21.948Z"
  last_validated: "2025-12-09T19:18:14.167Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# Playwright Integration Guide

## Overview

DocuMCP can generate a complete Playwright E2E testing setup for your documentation site, including:

- Playwright configuration
- Link validation tests
- Accessibility tests (WCAG 2.1 AA)
- Docker/Podman containerization
- GitHub Actions CI/CD workflow

**Important**: Playwright is NOT a dependency of DocuMCP itself. Instead, DocuMCP **generates** the Playwright setup for your documentation site.

## Quick Start

### Generate Playwright Setup

Use the `setup_playwright_tests` tool to generate all necessary files:

```typescript
{
  tool: "setup_playwright_tests",
  arguments: {
    repositoryPath: "./my-docs-site",
    ssg: "docusaurus",
    projectName: "My Documentation",
    mainBranch: "main",
    includeAccessibilityTests: true,
    includeDockerfile: true,
    includeGitHubActions: true
  }
}
```

### What Gets Generated

```
my-docs-site/
├── playwright.config.ts           # Playwright configuration
├── Dockerfile.playwright           # Multi-stage Docker build
├── .github/workflows/
│   └── docs-e2e-tests.yml         # CI/CD workflow
├── tests/e2e/
│   ├── link-validation.spec.ts    # Link tests
│   └── accessibility.spec.ts       # A11y tests
├── package.json                    # Updated with Playwright deps
└── .gitignore                     # Updated with test artifacts
```

## Generated Files Explained

### 1. Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
  },
  projects: [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
});
```

### 2. Link Validation Tests

- ✅ Internal navigation links
- ✅ External link HTTP status
- ✅ Anchor/hash links
- ✅ 404 detection

### 3. Accessibility Tests

- ✅ WCAG 2.1 AA compliance (axe-core)
- ✅ Keyboard navigation
- ✅ Image alt text
- ✅ Color contrast

### 4. Docker Multi-Stage Build

```dockerfile
# Build docs
FROM node:20-alpine AS builder
RUN npm run build

# Run tests
FROM mcr.microsoft.com/playwright:v1.55.1 AS tester
RUN npx playwright test

# Serve production
FROM nginx:alpine AS server
COPY build /usr/share/nginx/html
```

### 5. GitHub Actions Workflow

Automated testing on every push/PR:

1. **Build** → Compile documentation
2. **Test** → Run Playwright in container (chromium, firefox, webkit)
3. **Deploy** → Push to GitHub Pages (if tests pass)
4. **Verify** → Test live production site

## Usage After Generation

### Local Testing

```bash
# Install dependencies (in YOUR docs site, not DocuMCP)
cd my-docs-site
npm install

# Install Playwright browsers
npx playwright install

# Run tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

### Docker Testing

```bash
# Build test container
docker build -t my-docs-test -f Dockerfile.playwright .

# Run tests in container
docker run --rm my-docs-test

# Or with Podman
podman build -t my-docs-test -f Dockerfile.playwright .
podman run --rm my-docs-test
```

### CI/CD Integration

Push to trigger GitHub Actions:

```bash
git add .
git commit -m "Add Playwright E2E tests"
git push origin main
```

Workflow will automatically:

- Build docs
- Run E2E tests across browsers
- Deploy to GitHub Pages (if all tests pass)
- Test production site after deployment

## Customization

### Add More Tests

Create new test files in `tests/e2e/`:

```typescript
// tests/e2e/navigation.spec.ts
import { test, expect } from "@playwright/test";

test("breadcrumbs should work", async ({ page }) => {
  await page.goto("/docs/some-page");
  const breadcrumbs = page.locator('[aria-label="breadcrumb"]');
  await expect(breadcrumbs).toBeVisible();
});
```

### Modify Configuration

Edit `playwright.config.ts`:

```typescript
export default defineConfig({
  // Increase timeout for slow networks
  timeout: 60 * 1000,

  // Add mobile viewports
  projects: [
    { name: "chromium" },
    { name: "Mobile Chrome", use: devices["Pixel 5"] },
  ],
});
```

## SSG-Specific Configuration

DocuMCP automatically configures for your SSG:

| SSG        | Build Command              | Build Dir | Port |
| ---------- | -------------------------- | --------- | ---- |
| Jekyll     | `bundle exec jekyll build` | `_site`   | 4000 |
| Hugo       | `hugo`                     | `public`  | 1313 |
| Docusaurus | `npm run build`            | `build`   | 3000 |
| MkDocs     | `mkdocs build`             | `site`    | 8000 |
| Eleventy   | `npx @11ty/eleventy`       | `_site`   | 8080 |

## Knowledge Graph Integration

Test results are tracked in DocuMCP's Knowledge Graph:

```typescript
{
  type: "deployment_validation",
  properties: {
    playwrightResults: {
      totalTests: 25,
      passed: 24,
      failed: 1,
      browsers: ["chromium", "firefox", "webkit"],
      linksChecked: 127,
      brokenLinks: 0,
      accessibilityScore: 98,
    }
  }
}
```

## Troubleshooting

### Tests Fail on External Links

External link validation can fail due to:

- Network timeouts
- Rate limiting
- CORS issues

**Solution**: Tests only check first 10 external links. Increase timeout in config.

### Container Build Fails

**Issue**: Docker build fails on dependency installation

**Solution**: Check SSG-specific dependencies in package.json

### CI/CD Workflow Times Out

**Issue**: GitHub Actions workflow exceeds time limit

**Solution**: Run only chromium in CI, full matrix locally:

```yaml
# .github/workflows/docs-e2e-tests.yml
strategy:
  matrix:
    browser: [chromium] # Only chromium in CI
```

## Best Practices

1. **Run tests before pushing** - `npm run test:e2e`
2. **Use Docker locally** - Same environment as CI
3. **Update baselines** - When changing UI intentionally
4. **Monitor CI reports** - Check artifacts for failures
5. **Test production** - Workflow tests live site automatically

## Example Workflow

```bash
# 1. User analyzes their documentation repo with DocuMCP
documcp analyze_repository --path ./my-docs

# 2. User generates Playwright setup
documcp setup_playwright_tests \
  --repositoryPath ./my-docs \
  --ssg docusaurus \
  --projectName "My Docs"

# 3. User installs dependencies (in THEIR repo)
cd my-docs
npm install
npx playwright install

# 4. User runs tests locally
npm run test:e2e

# 5. User pushes to GitHub
git push origin main

# 6. GitHub Actions runs tests automatically
# 7. If tests pass, deploys to GitHub Pages
# 8. Tests production site
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Complete Workflow Guide](./playwright-testing-workflow.md)
- [Link Validation Integration](./link-validation.md)
- [Axe Accessibility Testing](https://github.com/dequelabs/axe-core)
