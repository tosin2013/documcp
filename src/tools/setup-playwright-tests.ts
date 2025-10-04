/**
 * Setup Playwright E2E Tests Tool
 * Generates Playwright test configuration and files for user's documentation site
 */

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
// Return type matches MCP tool response format
type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputSchema = z.object({
  repositoryPath: z.string().describe("Path to the documentation repository"),
  ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
  projectName: z.string().describe("Project name for tests"),
  mainBranch: z.string().optional().default("main"),
  includeAccessibilityTests: z.boolean().optional().default(true),
  includeDockerfile: z.boolean().optional().default(true),
  includeGitHubActions: z.boolean().optional().default(true),
});

interface SSGConfig {
  buildCommand: string;
  buildDir: string;
  port: number;
  packageDeps: Record<string, string>;
}

const SSG_CONFIGS: Record<string, SSGConfig> = {
  jekyll: {
    buildCommand: "bundle exec jekyll build",
    buildDir: "_site",
    port: 4000,
    packageDeps: {},
  },
  hugo: {
    buildCommand: "hugo",
    buildDir: "public",
    port: 1313,
    packageDeps: {},
  },
  docusaurus: {
    buildCommand: "npm run build",
    buildDir: "build",
    port: 3000,
    packageDeps: {
      "@docusaurus/core": "^3.0.0",
      "@docusaurus/preset-classic": "^3.0.0",
    },
  },
  mkdocs: {
    buildCommand: "mkdocs build",
    buildDir: "site",
    port: 8000,
    packageDeps: {},
  },
  eleventy: {
    buildCommand: "npx @11ty/eleventy",
    buildDir: "_site",
    port: 8080,
    packageDeps: {
      "@11ty/eleventy": "^2.0.0",
    },
  },
};

export async function setupPlaywrightTests(
  args: unknown,
): Promise<ToolResponse> {
  const {
    repositoryPath,
    ssg,
    projectName,
    mainBranch,
    includeAccessibilityTests,
    includeDockerfile,
    includeGitHubActions,
  } = inputSchema.parse(args);

  try {
    const config = SSG_CONFIGS[ssg];
    const templatesDir = path.join(__dirname, "../templates/playwright");

    // Create directories
    const testsDir = path.join(repositoryPath, "tests/e2e");
    await fs.mkdir(testsDir, { recursive: true });

    if (includeGitHubActions) {
      const workflowsDir = path.join(repositoryPath, ".github/workflows");
      await fs.mkdir(workflowsDir, { recursive: true });
    }

    // Read and process templates
    const filesCreated: string[] = [];

    // 1. Playwright config
    const configTemplate = await fs.readFile(
      path.join(templatesDir, "playwright.config.template.ts"),
      "utf-8",
    );
    const playwrightConfig = configTemplate.replace(
      /{{port}}/g,
      config.port.toString(),
    );

    await fs.writeFile(
      path.join(repositoryPath, "playwright.config.ts"),
      playwrightConfig,
    );
    filesCreated.push("playwright.config.ts");

    // 2. Link validation tests
    const linkTestTemplate = await fs.readFile(
      path.join(templatesDir, "link-validation.spec.template.ts"),
      "utf-8",
    );
    const linkTest = linkTestTemplate.replace(/{{projectName}}/g, projectName);

    await fs.writeFile(
      path.join(testsDir, "link-validation.spec.ts"),
      linkTest,
    );
    filesCreated.push("tests/e2e/link-validation.spec.ts");

    // 3. Accessibility tests (if enabled)
    if (includeAccessibilityTests) {
      const a11yTemplate = await fs.readFile(
        path.join(templatesDir, "accessibility.spec.template.ts"),
        "utf-8",
      );

      await fs.writeFile(
        path.join(testsDir, "accessibility.spec.ts"),
        a11yTemplate,
      );
      filesCreated.push("tests/e2e/accessibility.spec.ts");
    }

    // 4. Dockerfile (if enabled)
    if (includeDockerfile) {
      const dockerTemplate = await fs.readFile(
        path.join(templatesDir, "Dockerfile.template"),
        "utf-8",
      );
      const dockerfile = dockerTemplate
        .replace(/{{ssg}}/g, ssg)
        .replace(/{{buildCommand}}/g, config.buildCommand)
        .replace(/{{buildDir}}/g, config.buildDir);

      await fs.writeFile(
        path.join(repositoryPath, "Dockerfile.playwright"),
        dockerfile,
      );
      filesCreated.push("Dockerfile.playwright");
    }

    // 5. GitHub Actions workflow (if enabled)
    if (includeGitHubActions) {
      const workflowTemplate = await fs.readFile(
        path.join(templatesDir, "docs-e2e.workflow.template.yml"),
        "utf-8",
      );
      const workflow = workflowTemplate
        .replace(/{{mainBranch}}/g, mainBranch)
        .replace(/{{buildCommand}}/g, config.buildCommand)
        .replace(/{{buildDir}}/g, config.buildDir)
        .replace(/{{port}}/g, config.port.toString());

      await fs.writeFile(
        path.join(repositoryPath, ".github/workflows/docs-e2e-tests.yml"),
        workflow,
      );
      filesCreated.push(".github/workflows/docs-e2e-tests.yml");
    }

    // 6. Update package.json
    const packageJsonPath = path.join(repositoryPath, "package.json");
    let packageJson: any = {};

    try {
      const existing = await fs.readFile(packageJsonPath, "utf-8");
      packageJson = JSON.parse(existing);
    } catch {
      // Create new package.json
      packageJson = {
        name: projectName.toLowerCase().replace(/\s+/g, "-"),
        version: "1.0.0",
        private: true,
        scripts: {},
        dependencies: {},
        devDependencies: {},
      };
    }

    // Add Playwright dependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      "@playwright/test": "^1.55.1",
      ...(includeAccessibilityTests
        ? { "@axe-core/playwright": "^4.10.2" }
        : {}),
    };

    // Add test scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "test:e2e": "playwright test",
      "test:e2e:ui": "playwright test --ui",
      "test:e2e:report": "playwright show-report",
      "test:e2e:docker":
        "docker build -t docs-test -f Dockerfile.playwright . && docker run --rm docs-test",
    };

    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    filesCreated.push("package.json (updated)");

    // 7. Create .gitignore entries
    const gitignorePath = path.join(repositoryPath, ".gitignore");
    const gitignoreEntries = [
      "test-results/",
      "playwright-report/",
      "playwright-results.json",
      "playwright/.cache/",
    ].join("\n");

    try {
      const existing = await fs.readFile(gitignorePath, "utf-8");
      if (!existing.includes("test-results/")) {
        await fs.writeFile(
          gitignorePath,
          `${existing}\n\n# Playwright\n${gitignoreEntries}\n`,
        );
        filesCreated.push(".gitignore (updated)");
      }
    } catch {
      await fs.writeFile(gitignorePath, `# Playwright\n${gitignoreEntries}\n`);
      filesCreated.push(".gitignore");
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: true,
              filesCreated,
              nextSteps: [
                "Run `npm install` to install Playwright dependencies",
                "Run `npx playwright install` to download browser binaries",
                "Test locally: `npm run test:e2e`",
                includeDockerfile
                  ? "Build container: `docker build -t docs-test -f Dockerfile.playwright .`"
                  : "",
                includeGitHubActions
                  ? "Push to trigger GitHub Actions workflow"
                  : "",
              ].filter(Boolean),
              configuration: {
                ssg,
                buildCommand: config.buildCommand,
                buildDir: config.buildDir,
                port: config.port,
                testsIncluded: {
                  linkValidation: true,
                  accessibility: includeAccessibilityTests,
                },
                integrations: {
                  docker: includeDockerfile,
                  githubActions: includeGitHubActions,
                },
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
