# How to Contribute an SSG Adapter

This guide walks you through adding support for a new Static Site Generator (SSG) to DocuMCP.

## Overview

SSG adapters enable DocuMCP to:

- Detect which SSG a project uses
- Generate appropriate configuration files
- Provide SSG-specific deployment guidance
- Recommend the best SSG for new projects

## Prerequisites

- Understanding of the target SSG's configuration and structure
- Node.js 20.x and npm installed
- DocuMCP development environment set up ([see setup guide](../tutorials/setting-up-your-development-environment.md))

## Step 1: Research the SSG

Before coding, understand your target SSG:

### Key Information to Gather

1. **Detection markers**: How to identify this SSG in a project
   - Configuration files (e.g., `docusaurus.config.js`, `mkdocs.yml`)
   - Package.json dependencies
   - Directory structure patterns

2. **Configuration format**: YAML, JavaScript, JSON, TOML?

3. **Build commands**: How to build and serve locally

4. **Deployment requirements**: Special setup needed for GitHub Pages?

5. **Documentation**: Official docs, examples, best practices

### Example: Astro

```
Detection: astro.config.mjs, package.json with "astro" dependency
Config format: JavaScript/TypeScript
Build: npm run build (outputs to dist/)
Serve: npm run dev
Deployment: Static files, needs base path configuration
```

## Step 2: Add SSG to Type Definitions

Update the SSG type definition in `src/types/api.ts`:

```typescript
export type SSG =
  | "docusaurus"
  | "mkdocs"
  | "jekyll"
  | "hugo"
  | "sphinx"
  | "astro" // Add your SSG here
  | "vitepress"
  | "unknown";
```

## Step 3: Add Detection Logic

Update `src/tools/recommend-ssg.ts` to detect your SSG:

```typescript
function detectSSG(projectPath: string): SSG {
  // Check for Astro
  if (
    fs.existsSync(path.join(projectPath, "astro.config.mjs")) ||
    fs.existsSync(path.join(projectPath, "astro.config.js")) ||
    fs.existsSync(path.join(projectPath, "astro.config.ts"))
  ) {
    return "astro";
  }

  // Check package.json for Astro dependency
  const packageJsonPath = path.join(projectPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    if (packageJson.dependencies?.astro || packageJson.devDependencies?.astro) {
      return "astro";
    }
  }

  // ... other SSG checks ...
}
```

## Step 4: Add Scoring Criteria

Add scoring logic for SSG recommendation in `src/tools/recommend-ssg.ts`:

```typescript
function scoreSSG(ssg: SSG, context: AnalysisContext): number {
  let score = 0;

  switch (ssg) {
    case "astro":
      // Language preferences
      if (context.languages.includes("TypeScript")) score += 30;
      if (context.languages.includes("JavaScript")) score += 25;

      // Framework detection
      if (context.frameworks.includes("React")) score += 20;
      if (context.frameworks.includes("Vue")) score += 20;
      if (context.frameworks.includes("Svelte")) score += 20;

      // Project characteristics
      if (context.hasComponents) score += 15;
      if (context.projectSize === "small") score += 10;
      if (context.projectSize === "medium") score += 15;

      // Performance focus
      if (context.requiresPerformance) score += 20;

      break;

    // ... other SSG cases ...
  }

  return score;
}
```

## Step 5: Add Configuration Generation

Create configuration template in `src/tools/generate-config.ts`:

```typescript
function generateAstroConfig(projectName: string): string {
  return `import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://${projectName}.github.io',
  base: '/${projectName}',
  outDir: './dist',
  build: {
    assets: 'assets'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark'
    }
  }
});
`;
}
```

## Step 6: Add Deployment Instructions

Update `src/tools/deploy-pages.ts` with deployment logic:

```typescript
async function deployAstro(projectPath: string): Promise<DeploymentResult> {
  const steps = [
    "Build the Astro site: npm run build",
    "Output will be in dist/ directory",
    "Deploy dist/ to GitHub Pages",
    "Ensure base path matches repository name in astro.config.mjs",
  ];

  return {
    success: true,
    ssg: "astro",
    steps,
    buildCommand: "npm run build",
    outputDirectory: "dist",
  };
}
```

## Step 7: Write Tests

Create comprehensive tests in `tests/tools/`:

```typescript
describe("Astro SSG Support", () => {
  describe("Detection", () => {
    it("should detect Astro from astro.config.mjs", () => {
      // Test implementation
    });

    it("should detect Astro from package.json", () => {
      // Test implementation
    });
  });

  describe("Scoring", () => {
    it("should score Astro highly for TypeScript projects", () => {
      // Test implementation
    });

    it("should score Astro highly for component-based projects", () => {
      // Test implementation
    });
  });

  describe("Configuration", () => {
    it("should generate valid Astro config", () => {
      // Test implementation
    });
  });

  describe("Deployment", () => {
    it("should provide correct deployment steps", () => {
      // Test implementation
    });
  });
});
```

## Step 8: Update Documentation

Add your SSG to the documentation:

### Update API Reference

Add to `docs/reference/api-reference.md`:

```markdown
#### Astro

**Detection**: `astro.config.{js,mjs,ts}`, package.json dependency
**Strengths**: Performance, flexibility, component framework agnostic
**Best for**: Content-focused sites, blogs, documentation with interactive components
**Configuration**: JavaScript/TypeScript
**Build**: `npm run build` → `dist/`
```

### Update README

Add to the supported SSGs list in `README.md`.

## Step 9: Test Your Implementation

Run the full test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Ensure coverage stays above 85%
npm run ci
```

Test manually:

```bash
# Build the project
npm run build

# Test SSG detection
node dist/index.js

# Test in a real project with your SSG
cd /path/to/astro-project
documcp analyze-repository
```

## Step 10: Submit Your PR

1. **Commit your changes**:

   ```bash
   git add -A
   git commit -m "feat(ssg): add Astro adapter support"
   ```

2. **Push to your fork**:

   ```bash
   git push origin feat/add-astro-adapter
   ```

3. **Create Pull Request** with:
   - Clear title: "feat(ssg): add Astro adapter support"
   - Description explaining the SSG and why it's useful
   - Link to any relevant issues
   - Screenshots or examples if applicable

## Checklist

Before submitting your PR, ensure:

- [ ] SSG type added to `src/types/api.ts`
- [ ] Detection logic implemented in `src/tools/recommend-ssg.ts`
- [ ] Scoring criteria added
- [ ] Configuration generation implemented
- [ ] Deployment instructions added
- [ ] Comprehensive tests written (>85% coverage)
- [ ] Documentation updated (API reference, README)
- [ ] All tests passing (`npm test`)
- [ ] Linting passing (`npm run lint`)
- [ ] Type checking passing (`npm run typecheck`)
- [ ] Manual testing completed
- [ ] Conventional commit message used

## Example PRs

Reference these PRs for guidance:

- Existing SSG implementations in `src/tools/recommend-ssg.ts`
- [PR #144](https://github.com/tosin2013/documcp/pull/144) - Example of adding new functionality

## Common Pitfalls

### 1. Incomplete Detection

**Problem**: SSG not detected in all scenarios

**Solution**: Test multiple detection methods (config files, package.json, directory structure)

### 2. Incorrect Scoring

**Problem**: SSG recommended inappropriately

**Solution**: Carefully tune scoring based on project characteristics

### 3. Missing Edge Cases

**Problem**: Fails with non-standard configurations

**Solution**: Test with various project structures and configurations

### 4. Poor Test Coverage

**Problem**: Tests don't cover all scenarios

**Solution**: Write tests for detection, scoring, config generation, and deployment

## Getting Help

- **Questions**: Create a [GitHub Discussion](https://github.com/tosin2013/documcp/discussions)
- **Issues**: Check existing [SSG adapter issues](https://github.com/tosin2013/documcp/labels/area%2Fssg-adapter)
- **Examples**: Review existing SSG implementations in the codebase

## Related Documentation

- [How to Create Custom MCP Tools](how-to-add-a-new-feature.md)
- [Setting Up Development Environment](../tutorials/setting-up-your-development-environment.md)
- [Writing and Running Tests](../tutorials/writing-and-running-tests.md)
- [API Reference](../reference/api-reference.md)
