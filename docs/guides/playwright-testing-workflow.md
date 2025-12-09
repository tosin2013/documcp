---
documcp:
  last_updated: "2025-11-20T00:46:21.949Z"
  last_validated: "2025-12-09T19:41:38.580Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# Playwright Testing Workflow for Documentation Deployment

## Overview

This document describes the complete logical workflow for testing documentation sites using Playwright in containers (Docker/Podman) integrated with GitHub Pages deployment.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Developer Workflow                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Local Development & Testing                                │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │  1. Edit documentation                                   │       │
│  │  2. Run local tests:                                     │       │
│  │     - docker-compose up -d                               │       │
│  │     - npm run test:playwright                            │       │
│  │  3. Validate links, accessibility, visual regression     │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 2: Git Push → GitHub Actions CI/CD                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│  Build Job                    │       │  Test Job (Playwright)        │
│  ┌─────────────────────────┐ │       │  ┌─────────────────────────┐ │
│  │ 1. Checkout code        │ │       │  │ 1. Start container      │ │
│  │ 2. Install dependencies │ │       │  │ 2. Wait for health      │ │
│  │ 3. Build SSG site       │ │       │  │ 3. Run Playwright tests │ │
│  │ 4. Upload artifact      │ │       │  │    - Link validation    │ │
│  └─────────────────────────┘ │       │  │    - Accessibility      │ │
└───────────────────────────────┘       │  │    - Visual regression  │ │
                                        │  │    - Navigation flow    │ │
                                        │  │ 4. Upload test results  │ │
                                        │  └─────────────────────────┘ │
                                        └───────────────────────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────────┐
                                        │  Tests Pass?          │
                                        └───────────────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │ YES                           │ NO
                                    ▼                               ▼
┌─────────────────────────────────────────────────────┐    ┌────────────────┐
│  Step 3: Deploy to GitHub Pages                     │    │  Fail Pipeline │
│  ┌───────────────────────────────────────────────┐ │    │  Notify Team   │
│  │ 1. Download build artifact                    │ │    └────────────────┘
│  │ 2. Deploy to gh-pages branch                  │ │
│  │ 3. GitHub Pages builds & serves               │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Step 4: Post-Deployment Verification                               │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │ 1. Wait for GitHub Pages deployment                     │       │
│  │ 2. Run Playwright tests against LIVE site               │       │
│  │ 3. Store results in Knowledge Graph                     │       │
│  │ 4. Update documentation health metrics                  │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Workflow Stages

### Stage 1: Local Development with Docker/Podman

**Purpose**: Test documentation in containerized environment before pushing

**Tools**:

- Docker or Podman
- Playwright
- SSG (Jekyll, Hugo, Docusaurus, etc.)

**Commands**:

```bash
# Start documentation container
docker-compose -f docker-compose.docs.yml up -d

# Wait for container health
docker-compose ps

# Run Playwright tests against container
npm run test:playwright:local

# Stop container
docker-compose down
```

**What Gets Tested**:

1. **Link Validation** - All external and internal links
2. **Accessibility** - WCAG compliance
3. **Navigation** - All menu items work
4. **Search** - Search functionality (if applicable)
5. **Visual Regression** - Screenshots match baseline

---

### Stage 2: CI/CD Pipeline (GitHub Actions)

**Trigger**: Push to `main` branch or Pull Request

**Jobs**:

#### Job 1: Build Documentation

```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - Checkout code
    - Setup SSG dependencies (Ruby/Node/Python)
    - Build documentation site
    - Upload build artifact
```

#### Job 2: Container Tests (Playwright)

```yaml
test-container:
  runs-on: ubuntu-latest
  services:
    docs:
      image: documcp-docs:test
      ports:
        - 3001:3001
  steps:
    - Install Playwright
    - Wait for container health
    - Run Playwright test suite
    - Upload test results & screenshots
```

#### Job 3: Deploy (Only on main branch, after tests pass)

```yaml
deploy:
  runs-on: ubuntu-latest
  needs: [build, test-container]
  if: github.ref == 'refs/heads/main'
  steps:
    - Download build artifact
    - Deploy to GitHub Pages
```

---

### Stage 3: Post-Deployment Verification

**Purpose**: Verify production site after GitHub Pages deployment

**Process**:

1. Wait 2-5 minutes for GitHub Pages to deploy
2. Run Playwright tests against live URL
3. Store results in Knowledge Graph
4. Update documentation health metrics

**Knowledge Graph Integration**:

```typescript
{
  type: "deployment_validation",
  properties: {
    url: "https://tosin2013.github.io/documcp/",
    timestamp: "2025-01-15T10:30:00Z",
    playwrightResults: {
      totalTests: 25,
      passed: 24,
      failed: 1,
      linksChecked: 127,
      brokenLinks: 0,
      accessibilityScore: 98,
    },
    healthScore: 96,
  }
}
```

---

## Container Setup with Playwright

### Why Containers?

1. **Reproducibility** - Same environment locally and in CI
2. **Isolation** - No conflicts with system packages
3. **Speed** - Pre-built images for faster testing
4. **Multi-SSG** - Test different SSGs without installing all dependencies

### Dockerfile with Playwright

```dockerfile
# Multi-stage build for documentation testing
FROM mcr.microsoft.com/playwright:v1.55.1-focal AS playwright-base

# Stage 1: Build documentation
FROM node:20-alpine AS builder
WORKDIR /app
COPY docs ./docs/
COPY package*.json ./
RUN npm ci
RUN npm run docs:build

# Stage 2: Test with Playwright
FROM playwright-base AS tester
WORKDIR /app
COPY --from=builder /app/docs-site/build ./build
COPY playwright.config.ts ./
COPY tests/e2e ./tests/e2e
RUN npm install -D @playwright/test
# Browsers already installed in playwright-base
CMD ["npx", "playwright", "test"]

# Stage 3: Serve for local testing
FROM nginx:alpine AS server
COPY --from=builder /app/docs-site/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose with Playwright

```yaml
version: "3.8"

services:
  # Documentation server
  docs:
    build:
      context: .
      dockerfile: Dockerfile.docs
      target: server
    ports:
      - "3001:80"
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost/"]
      interval: 5s
      timeout: 3s
      retries: 10

  # Playwright test runner
  playwright:
    build:
      context: .
      dockerfile: Dockerfile.docs
      target: tester
    depends_on:
      docs:
        condition: service_healthy
    environment:
      - BASE_URL=http://docs
    volumes:
      - ./playwright-results:/app/test-results
      - ./playwright-report:/app/playwright-report
    command: npx playwright test --reporter=html
```

---

## Playwright Test Suite

### Test Structure

```
tests/e2e/
├── link-validation.spec.ts      # External/internal link tests
├── accessibility.spec.ts         # a11y compliance tests
├── navigation.spec.ts            # Menu, search, breadcrumbs
├── visual-regression.spec.ts    # Screenshot comparisons
└── performance.spec.ts          # Load time, bundle size
```

### Example: Link Validation Test

```typescript
// tests/e2e/link-validation.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Link Validation", () => {
  test("all navigation links should work", async ({ page }) => {
    await page.goto("/");

    // Get all links
    const links = await page.locator("a[href]").all();

    for (const link of links) {
      const href = await link.getAttribute("href");

      // Skip external links (tested separately)
      if (href?.startsWith("http")) continue;

      // Click internal link
      await link.click();

      // Verify page loads (no 404)
      await expect(page).not.toHaveTitle(/404|Not Found/i);

      // Go back for next test
      await page.goBack();
    }
  });

  test("external links should be valid", async ({ page, request }) => {
    await page.goto("/");

    const externalLinks = await page.locator('a[href^="http"]').all();
    const uniqueUrls = new Set<string>();

    for (const link of externalLinks) {
      const href = await link.getAttribute("href");
      if (href) uniqueUrls.add(href);
    }

    // Check each unique URL
    for (const url of uniqueUrls) {
      const response = await request.head(url, { timeout: 10000 });
      expect(response.status()).toBeLessThan(400);
    }
  });
});
```

### Example: Accessibility Test

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility", () => {
  test("should not have automatic a11y violations", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });

  test("keyboard navigation should work", async ({ page }) => {
    await page.goto("/");

    // Tab through focusable elements
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(firstFocus).toBe("A"); // First link

    // Skip to main content
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });
});
```

---

## GitHub Actions Workflow with Playwright

```yaml
name: Deploy Documentation with E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
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

      - name: Build documentation
        run: npm run docs:build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: docs-build
          path: docs-site/build/

  test-container:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: docs-build
          path: docs-site/build/

      - name: Start documentation container
        run: |
          docker-compose -f docker-compose.docs.yml up -d
          docker-compose ps

      - name: Wait for container health
        run: |
          timeout 60 bash -c 'until docker inspect --format="{{.State.Health.Status}}" documcp-docs | grep -q healthy; do sleep 2; done'

      - name: Install Playwright
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3001

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots
          path: test-results/

      - name: Stop container
        if: always()
        run: docker-compose -f docker-compose.docs.yml down

  deploy:
    runs-on: ubuntu-latest
    needs: [build, test-container]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: docs-build
          path: .

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload to GitHub Pages
        uses: actions/upload-pages-artifact@v4
        with:
          path: .

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

  verify-production:
    runs-on: ubuntu-latest
    needs: deploy
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Wait for GitHub Pages deployment
        run: sleep 120 # 2 minutes

      - name: Install Playwright
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Test production site
        run: npx playwright test
        env:
          BASE_URL: https://tosin2013.github.io/documcp/

      - name: Store results in Knowledge Graph
        if: always()
        run: npm run kg:store-deployment-results
```

---

## Benefits of This Workflow

### 1. **Early Failure Detection**

- Broken links caught before deployment
- Accessibility issues found in PR review
- Visual regressions prevented

### 2. **Confidence in Deployment**

- Tests pass = safe to deploy
- No more "looks good on my machine"
- Reproducible across environments

### 3. **Knowledge Graph Integration**

- Track deployment quality over time
- Identify patterns in link failures
- Recommend improvements based on history

### 4. **Multi-Environment Testing**

- Local (Docker/Podman)
- CI (GitHub Actions)
- Production (Live site)

### 5. **Comprehensive Coverage**

- Links (external + internal)
- Accessibility (WCAG 2.1)
- Performance (load time)
- Visual consistency

---

## Podman Support

All Docker commands work with Podman:

```bash
# Use Podman instead of Docker
alias docker=podman
alias docker-compose=podman-compose

# Or explicitly
podman-compose -f docker-compose.docs.yml up -d
podman run -it documcp-docs:test npx playwright test
```

---

## Cost & Performance

### Resource Usage

- **Docker image size**: ~1.2GB (Playwright + Chrome)
- **Test execution time**: 2-5 minutes (25 tests)
- **CI minutes**: ~10 minutes total per deployment

### Optimization

- Use multi-stage builds (smaller final image)
- Cache Playwright browsers
- Parallel test execution
- Only run full suite on main branch

---

## Future Enhancements

1. **Visual Regression Baselines**

   - Store screenshots in Git LFS
   - Compare against baseline on each PR

2. **Performance Budgets**

   - Fail if bundle size > 500KB
   - Fail if First Contentful Paint > 2s

3. **AI-Powered Test Generation**

   - Auto-generate tests from documentation structure
   - Detect new pages and create tests

4. **Scheduled Checks**
   - Daily link validation on production
   - Weekly full test suite
   - Monthly accessibility audit

---

## Related Documentation

- [Link Validation Guide](./link-validation.md)
- [Architecture Decision Records](../adrs/)
- [Phase 2: Intelligence & Learning System](../phase-2-intelligence.md)
