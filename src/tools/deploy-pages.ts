import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import {
  createOrUpdateProject,
  trackDeployment,
} from "../memory/kg-integration.js";
import { getUserPreferenceManager } from "../memory/user-preferences.js";

const inputSchema = z.object({
  repository: z.string(),
  ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
  branch: z.string().optional().default("gh-pages"),
  customDomain: z.string().optional(),
  projectPath: z
    .string()
    .optional()
    .describe("Local path to the project for tracking"),
  projectName: z.string().optional().describe("Project name for tracking"),
  analysisId: z
    .string()
    .optional()
    .describe("ID from repository analysis for linking"),
  userId: z
    .string()
    .optional()
    .default("default")
    .describe("User ID for preference tracking"),
});

export async function deployPages(args: unknown): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const {
    repository,
    ssg,
    branch,
    customDomain,
    projectPath,
    projectName,
    analysisId,
    userId,
  } = inputSchema.parse(args);

  try {
    // Determine repository path (local or remote)
    const repoPath = repository.startsWith("http") ? "." : repository;

    // Create .github/workflows directory
    const workflowsDir = path.join(repoPath, ".github", "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    // Generate workflow based on SSG
    const workflow = generateWorkflow(ssg, branch, customDomain);
    const workflowPath = path.join(workflowsDir, "deploy-docs.yml");
    await fs.writeFile(workflowPath, workflow);

    // Create CNAME file if custom domain is specified
    let cnameCreated = false;
    if (customDomain) {
      const cnamePath = path.join(repoPath, "CNAME");
      await fs.writeFile(cnamePath, customDomain);
      cnameCreated = true;
    }

    const deploymentResult = {
      repository,
      ssg,
      branch,
      customDomain,
      workflowPath: "deploy-docs.yml",
      cnameCreated,
      repoPath,
    };

    // Phase 2.3: Track deployment setup in knowledge graph
    try {
      // Create or update project in knowledge graph
      if (projectPath || projectName) {
        const timestamp = new Date().toISOString();
        const project = await createOrUpdateProject({
          id:
            analysisId ||
            `deploy_${repository.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
          timestamp,
          path: projectPath || repository,
          projectName: projectName || repository,
          structure: {
            totalFiles: 0, // Unknown at this point
            languages: {},
            hasTests: false,
            hasCI: true, // We just added CI
            hasDocs: true, // Setting up docs deployment
          },
        });

        // Track successful deployment setup
        await trackDeployment(project.id, ssg, true, {
          buildTime: Date.now() - startTime,
        });

        // Update user preferences with SSG usage
        const userPreferenceManager = await getUserPreferenceManager(userId);
        await userPreferenceManager.trackSSGUsage({
          ssg,
          success: true, // Setup successful
          timestamp,
          projectType: projectPath || repository,
        });
      }
    } catch (trackingError) {
      // Don't fail the whole deployment if tracking fails
      console.warn(
        "Failed to track deployment in knowledge graph:",
        trackingError,
      );
    }

    const response: MCPToolResponse<typeof deploymentResult> = {
      success: true,
      data: deploymentResult,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Deployment Workflow Created",
          description: `GitHub Actions workflow configured for ${ssg} deployment to ${branch} branch`,
        },
        ...(customDomain
          ? [
              {
                type: "info" as const,
                title: "Custom Domain Configured",
                description: `CNAME file created for ${customDomain}`,
              },
            ]
          : []),
      ],
      nextSteps: [
        {
          action: "Verify Deployment Setup",
          toolRequired: "verify_deployment",
          description: "Check that all deployment requirements are met",
          priority: "high",
        },
        {
          action: "Commit and Push",
          toolRequired: "git",
          description: "Commit workflow files and push to trigger deployment",
          priority: "high",
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    // Phase 2.3: Track failed deployment setup
    try {
      if (projectPath || projectName) {
        const timestamp = new Date().toISOString();
        const project = await createOrUpdateProject({
          id:
            analysisId ||
            `deploy_${repository.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
          timestamp,
          path: projectPath || repository,
          projectName: projectName || repository,
          structure: {
            totalFiles: 0,
            languages: {},
            hasTests: false,
            hasCI: false,
            hasDocs: false,
          },
        });

        // Track failed deployment
        await trackDeployment(project.id, ssg, false, {
          errorMessage: String(error),
        });

        // Update user preferences with failed SSG usage
        const userPreferenceManager = await getUserPreferenceManager(userId);
        await userPreferenceManager.trackSSGUsage({
          ssg,
          success: false,
          timestamp,
          projectType: projectPath || repository,
        });
      }
    } catch (trackingError) {
      console.warn("Failed to track deployment failure:", trackingError);
    }

    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "DEPLOYMENT_SETUP_FAILED",
        message: `Failed to setup deployment: ${error}`,
        resolution:
          "Ensure repository path is accessible and GitHub Actions are enabled",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

function generateWorkflow(
  ssg: string,
  branch: string,
  _customDomain?: string,
): string {
  const workflows: Record<string, string> = {
    docusaurus: `name: Deploy Docusaurus to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build website
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./build

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

    mkdocs: `name: Deploy MkDocs to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Build and Deploy
        run: mkdocs gh-deploy --force --branch ${branch}`,

    hugo: `name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true

      - name: Build
        run: hugo --minify

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

    jekyll: `name: Deploy Jekyll to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true

      - name: Build with Jekyll
        run: bundle exec jekyll build
        env:
          JEKYLL_ENV: production

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,

    eleventy: `name: Deploy Eleventy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./_site

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3`,
  };

  return workflows[ssg] || workflows.jekyll;
}
