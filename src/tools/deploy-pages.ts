import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import {
  createOrUpdateProject,
  trackDeployment,
  getDeploymentRecommendations,
  getKnowledgeGraph,
} from "../memory/kg-integration.js";
import { getUserPreferenceManager } from "../memory/user-preferences.js";

const inputSchema = z.object({
  repository: z.string(),
  ssg: z
    .enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"])
    .optional()
    .describe(
      "Static site generator to use. If not provided, will be retrieved from knowledge graph using analysisId",
    ),
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
    .describe("ID from repository analysis for linking and SSG retrieval"),
  userId: z
    .string()
    .optional()
    .default("default")
    .describe("User ID for preference tracking"),
});

interface BuildConfig {
  workingDirectory: string | null;
  buildCommand: string;
  outputPath: string;
  nodeVersion?: string;
  packageManager?: "npm" | "yarn" | "pnpm";
}

/**
 * Retrieve SSG from knowledge graph using analysisId
 */
async function getSSGFromKnowledgeGraph(
  analysisId: string,
): Promise<string | null> {
  try {
    const kg = await getKnowledgeGraph();

    // Find project node by analysis ID
    const projectNode = await kg.findNode({
      type: "project",
      properties: { id: analysisId },
    });

    if (!projectNode) {
      return null;
    }

    // Get deployment recommendations for this project
    const recommendations = await getDeploymentRecommendations(projectNode.id);

    if (recommendations.length > 0) {
      // Return the highest confidence SSG
      const topRecommendation = recommendations.sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      return topRecommendation.ssg;
    }

    // Fallback: check if there are any previous successful deployments
    const edges = await kg.findEdges({
      source: projectNode.id,
    });

    const deploymentEdges = edges.filter((e) =>
      e.type.startsWith("project_deployed_with"),
    );

    if (deploymentEdges.length > 0) {
      // Get the most recent successful deployment
      const successfulDeployments = deploymentEdges.filter(
        (e) => e.properties?.success === true,
      );

      if (successfulDeployments.length > 0) {
        const mostRecent = successfulDeployments.sort(
          (a, b) =>
            new Date(b.properties?.timestamp || 0).getTime() -
            new Date(a.properties?.timestamp || 0).getTime(),
        )[0];

        const configNode = (await kg.getAllNodes()).find(
          (n) => n.id === mostRecent.target,
        );

        return configNode?.properties?.ssg || null;
      }
    }

    return null;
  } catch (error) {
    console.warn("Failed to retrieve SSG from knowledge graph:", error);
    return null;
  }
}

/**
 * Detect documentation folder in repository
 */
async function detectDocsFolder(repoPath: string): Promise<string | null> {
  const commonFolders = [
    "docs",
    "documentation",
    "website",
    "doc",
    "site",
    "pages",
  ];

  for (const folder of commonFolders) {
    const folderPath = path.join(repoPath, folder);
    try {
      const stat = await fs.stat(folderPath);
      if (stat.isDirectory()) {
        // Check if it has package.json or other SSG-specific files
        const hasPackageJson = await fs
          .access(path.join(folderPath, "package.json"))
          .then(() => true)
          .catch(() => false);
        const hasMkDocsYml = await fs
          .access(path.join(folderPath, "mkdocs.yml"))
          .then(() => true)
          .catch(() => false);
        const hasConfigToml = await fs
          .access(path.join(folderPath, "config.toml"))
          .then(() => true)
          .catch(() => false);

        if (hasPackageJson || hasMkDocsYml || hasConfigToml) {
          return folder;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Detect build configuration from package.json
 */
async function detectBuildConfig(
  repoPath: string,
  ssg: string,
  docsFolder: string | null,
): Promise<BuildConfig> {
  const workingDir = docsFolder || ".";
  const packageJsonPath = path.join(repoPath, workingDir, "package.json");

  const defaults: Record<string, BuildConfig> = {
    docusaurus: {
      workingDirectory: docsFolder,
      buildCommand: "npm run build",
      outputPath: "./build",
    },
    eleventy: {
      workingDirectory: docsFolder,
      buildCommand: "npm run build",
      outputPath: "./_site",
    },
    hugo: {
      workingDirectory: docsFolder,
      buildCommand: "hugo --minify",
      outputPath: "./public",
    },
    jekyll: {
      workingDirectory: docsFolder,
      buildCommand: "bundle exec jekyll build",
      outputPath: "./_site",
    },
    mkdocs: {
      workingDirectory: docsFolder,
      buildCommand: "mkdocs build",
      outputPath: "./site",
    },
  };

  const config = defaults[ssg] || defaults.docusaurus;

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

    // Detect build command from scripts
    const scripts = packageJson.scripts || {};
    if (scripts.build) {
      config.buildCommand = "npm run build";
    } else if (scripts["docs:build"]) {
      config.buildCommand = "npm run docs:build";
    } else if (scripts.start && scripts.start.includes("docusaurus")) {
      config.buildCommand = "npm run build";
    }

    // Detect package manager
    const hasYarnLock = await fs
      .access(path.join(repoPath, workingDir, "yarn.lock"))
      .then(() => true)
      .catch(() => false);
    const hasPnpmLock = await fs
      .access(path.join(repoPath, workingDir, "pnpm-lock.yaml"))
      .then(() => true)
      .catch(() => false);

    if (hasYarnLock) {
      config.packageManager = "yarn";
      config.buildCommand = config.buildCommand.replace("npm", "yarn");
    } else if (hasPnpmLock) {
      config.packageManager = "pnpm";
      config.buildCommand = config.buildCommand.replace("npm", "pnpm");
    } else {
      config.packageManager = "npm";
    }

    // Detect Node version from engines field
    if (packageJson.engines?.node) {
      config.nodeVersion = packageJson.engines.node;
    }
  } catch (error) {
    // If package.json doesn't exist or can't be read, use defaults
    console.warn("Using default build configuration:", error);
  }

  return config;
}

export async function deployPages(
  args: unknown,
  context?: any,
): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const {
    repository,
    ssg: providedSSG,
    branch,
    customDomain,
    projectPath,
    projectName,
    analysisId,
    userId,
  } = inputSchema.parse(args);

  // Declare ssg outside try block so it's accessible in catch
  let ssg:
    | "jekyll"
    | "hugo"
    | "docusaurus"
    | "mkdocs"
    | "eleventy"
    | undefined = providedSSG;

  // Report initial progress
  if (context?.meta?.progressToken) {
    await context.meta.reportProgress?.({
      progress: 0,
      total: 100,
    });
  }

  await context?.info?.("🚀 Starting GitHub Pages deployment configuration...");

  try {
    // Determine repository path (local or remote)
    const repoPath = repository.startsWith("http") ? "." : repository;
    await context?.info?.(`📂 Target repository: ${repository}`);

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 10,
        total: 100,
      });
    }

    // Retrieve SSG from knowledge graph if not provided
    ssg = providedSSG;
    if (!ssg && analysisId) {
      await context?.info?.(
        `🔍 Retrieving SSG recommendation from analysis ${analysisId}...`,
      );
      const retrievedSSG = await getSSGFromKnowledgeGraph(analysisId);
      if (retrievedSSG) {
        ssg = retrievedSSG as
          | "jekyll"
          | "hugo"
          | "docusaurus"
          | "mkdocs"
          | "eleventy";
        await context?.info?.(`✅ Found recommended SSG: ${ssg}`);
      }
    } else if (ssg) {
      await context?.info?.(`ℹ️ Using specified SSG: ${ssg}`);
    }

    if (!ssg) {
      const errorResponse: MCPToolResponse = {
        success: false,
        error: {
          code: "SSG_NOT_SPECIFIED",
          message:
            "SSG parameter is required. Either provide it directly or ensure analysisId points to a project with SSG recommendations.",
          resolution:
            "Run analyze_repository and recommend_ssg first, or specify the SSG parameter explicitly.",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
      return formatMCPResponse(errorResponse);
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 25,
        total: 100,
      });
    }

    // Detect documentation folder
    await context?.info?.("📑 Detecting documentation folder...");
    const docsFolder = await detectDocsFolder(repoPath);
    await context?.info?.(
      `📁 Documentation folder: ${docsFolder || "root directory"}`,
    );

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 40,
        total: 100,
      });
    }

    // Detect build configuration
    await context?.info?.(`⚙️ Detecting build configuration for ${ssg}...`);
    const buildConfig = await detectBuildConfig(repoPath, ssg, docsFolder);

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 55,
        total: 100,
      });
    }

    // Create .github/workflows directory
    await context?.info?.("📂 Creating GitHub Actions workflow directory...");
    const workflowsDir = path.join(repoPath, ".github", "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 70,
        total: 100,
      });
    }

    // Generate workflow based on SSG and build config
    await context?.info?.(`✍️ Generating ${ssg} deployment workflow...`);
    const workflow = generateWorkflow(ssg, branch, customDomain, buildConfig);
    const workflowPath = path.join(workflowsDir, "deploy-docs.yml");
    await fs.writeFile(workflowPath, workflow);
    await context?.info?.(
      `✅ Workflow created: .github/workflows/deploy-docs.yml`,
    );

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 85,
        total: 100,
      });
    }

    // Create CNAME file if custom domain is specified
    let cnameCreated = false;
    if (customDomain) {
      await context?.info?.(
        `🌐 Creating CNAME file for custom domain: ${customDomain}...`,
      );
      const cnamePath = path.join(repoPath, "CNAME");
      await fs.writeFile(cnamePath, customDomain);
      cnameCreated = true;
      await context?.info?.("✅ CNAME file created");
    }

    const deploymentResult = {
      repository,
      ssg,
      branch,
      customDomain,
      workflowPath: "deploy-docs.yml",
      cnameCreated,
      repoPath,
      detectedConfig: {
        docsFolder: docsFolder || "root",
        buildCommand: buildConfig.buildCommand,
        outputPath: buildConfig.outputPath,
        packageManager: buildConfig.packageManager || "npm",
        workingDirectory: buildConfig.workingDirectory,
      },
    };

    // Phase 2.3: Track deployment setup in knowledge graph
    await context?.info?.("💾 Tracking deployment in Knowledge Graph...");
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

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 100,
        total: 100,
      });
    }

    const executionTime = Date.now() - startTime;
    await context?.info?.(
      `✅ Deployment configuration complete! ${ssg} workflow created in ${Math.round(
        executionTime / 1000,
      )}s`,
    );

    const response: MCPToolResponse<typeof deploymentResult> = {
      success: true,
      data: deploymentResult,
      metadata: {
        toolVersion: "2.0.0",
        executionTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Deployment Workflow Created",
          description: `GitHub Actions workflow configured for ${ssg} deployment to ${branch} branch`,
        },
        ...(!providedSSG && analysisId
          ? [
              {
                type: "info" as const,
                title: "SSG Auto-Detected",
                description: `Retrieved ${ssg} from knowledge graph using analysisId`,
              },
            ]
          : []),
        ...(docsFolder
          ? [
              {
                type: "info" as const,
                title: "Documentation Folder Detected",
                description: `Found documentation in '${docsFolder}/' folder. Workflow configured with working-directory.`,
              },
            ]
          : []),
        ...(buildConfig.packageManager !== "npm"
          ? [
              {
                type: "info" as const,
                title: "Package Manager Detected",
                description: `Using ${buildConfig.packageManager} based on lockfile detection`,
              },
            ]
          : []),
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
      if ((projectPath || projectName) && ssg) {
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

        // Track failed deployment (only if ssg is known)
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
  _customDomain: string | undefined,
  buildConfig: BuildConfig,
): string {
  const workingDirPrefix = buildConfig.workingDirectory
    ? `      working-directory: ${buildConfig.workingDirectory}\n`
    : "";

  const nodeVersion = buildConfig.nodeVersion || "20";
  const packageManager = buildConfig.packageManager || "npm";

  // Helper to get install command
  const getInstallCmd = () => {
    if (packageManager === "yarn") return "yarn install --frozen-lockfile";
    if (packageManager === "pnpm") return "pnpm install --frozen-lockfile";
    return "npm ci";
  };

  // Helper to add working directory to steps
  // const _addWorkingDir = (step: string) => {
  //   if (!buildConfig.workingDirectory) return step;
  //   return step.replace(
  //     /^(\s+)run:/gm,
  //     `$1working-directory: ${buildConfig.workingDirectory}\n$1run:`,
  //   );
  // };

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
          node-version: '${nodeVersion}'
          cache: '${packageManager}'${
            buildConfig.workingDirectory
              ? `\n          cache-dependency-path: ${buildConfig.workingDirectory}/package-lock.json`
              : ""
          }

      - name: Install dependencies
${workingDirPrefix}        run: ${getInstallCmd()}

      - name: Build website
${workingDirPrefix}        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

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
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
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
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
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
        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

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
    runs-on: ubuntu-latest${
      buildConfig.workingDirectory
        ? `\n    defaults:\n      run:\n        working-directory: ${buildConfig.workingDirectory}`
        : ""
    }
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true${
            buildConfig.workingDirectory
              ? `\n          working-directory: ${buildConfig.workingDirectory}`
              : ""
          }

      - name: Build with Jekyll
        run: ${buildConfig.buildCommand}
        env:
          JEKYLL_ENV: production

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2${
          buildConfig.workingDirectory
            ? `\n        with:\n          path: ${buildConfig.workingDirectory}/${buildConfig.outputPath}`
            : ""
        }

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
          node-version: '${nodeVersion}'
          cache: '${packageManager}'${
            buildConfig.workingDirectory
              ? `\n          cache-dependency-path: ${buildConfig.workingDirectory}/package-lock.json`
              : ""
          }

      - name: Install dependencies
${workingDirPrefix}        run: ${getInstallCmd()}

      - name: Build site
${workingDirPrefix}        run: ${buildConfig.buildCommand}

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ${
            buildConfig.workingDirectory
              ? `${buildConfig.workingDirectory}/${buildConfig.outputPath}`
              : buildConfig.outputPath
          }

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
