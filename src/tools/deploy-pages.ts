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
import { getAdapter } from "../deploy-targets/index.js";
import type { BuildConfig } from "../deploy-targets/types.js";

const inputSchema = z.object({
  repository: z.string(),
  ssg: z
    .enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"])
    .optional()
    .describe(
      "Static site generator to use. If not provided, will be retrieved from knowledge graph using analysisId",
    ),
  target: z
    .enum(["github-pages", "vercel"])
    .optional()
    .default("github-pages")
    .describe(
      "Deployment target. 'github-pages' (default) generates a GitHub Actions workflow. 'vercel' generates vercel.json and a Vercel CLI workflow.",
    ),
  branch: z.string().optional().default("gh-pages"),
  customDomain: z.string().optional(),
  invokeCliCommand: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "When true and target=vercel, the adapter's CLI command (vercel deploy --prod) is included in next steps",
    ),
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

/**
 * Retrieve SSG from knowledge graph using analysisId
 */
async function getSSGFromKnowledgeGraph(
  analysisId: string,
): Promise<string | null> {
  try {
    const kg = await getKnowledgeGraph();

    const projectNode = await kg.findNode({
      type: "project",
      properties: { id: analysisId },
    });

    if (!projectNode) {
      return null;
    }

    const recommendations = await getDeploymentRecommendations(analysisId);

    if (recommendations.length > 0) {
      const topRecommendation = recommendations.sort(
        (a, b) => b.confidence - a.confidence,
      )[0];
      return topRecommendation.ssg;
    }

    const edges = await kg.findEdges({ source: projectNode.id });
    const deploymentEdges = edges.filter((e) =>
      e.type.startsWith("project_deployed_with"),
    );

    if (deploymentEdges.length > 0) {
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

    const scripts = packageJson.scripts || {};
    if (scripts.build) {
      config.buildCommand = "npm run build";
    } else if (scripts["docs:build"]) {
      config.buildCommand = "npm run docs:build";
    } else if (scripts.start && scripts.start.includes("docusaurus")) {
      config.buildCommand = "npm run build";
    }

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

    if (packageJson.engines?.node) {
      config.nodeVersion = packageJson.engines.node;
    }
  } catch (error) {
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
    target,
    branch,
    customDomain,
    invokeCliCommand,
    projectPath,
    projectName,
    analysisId,
    userId,
  } = inputSchema.parse(args);

  let ssg:
    | "jekyll"
    | "hugo"
    | "docusaurus"
    | "mkdocs"
    | "eleventy"
    | undefined = providedSSG;

  if (context?.meta?.progressToken) {
    await context.meta.reportProgress?.({ progress: 0, total: 100 });
  }

  const targetLabel = target === "vercel" ? "Vercel" : "GitHub Pages";
  await context?.info?.(
    `🚀 Starting ${targetLabel} deployment configuration...`,
  );

  try {
    const repoPath = repository.startsWith("http") ? "." : repository;
    await context?.info?.(`📂 Target repository: ${repository}`);

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 10, total: 100 });
    }

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
      await context.meta.reportProgress?.({ progress: 25, total: 100 });
    }

    await context?.info?.("📑 Detecting documentation folder...");
    const docsFolder = await detectDocsFolder(repoPath);
    await context?.info?.(
      `📁 Documentation folder: ${docsFolder || "root directory"}`,
    );

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 40, total: 100 });
    }

    await context?.info?.(`⚙️ Detecting build configuration for ${ssg}...`);
    const buildConfig = await detectBuildConfig(repoPath, ssg, docsFolder);

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 55, total: 100 });
    }

    // Resolve adapter and generate deployment artifacts
    const adapter = getAdapter(target);
    if (!adapter) {
      return formatMCPResponse({
        success: false,
        error: {
          code: "UNKNOWN_DEPLOY_TARGET",
          message: `Unknown deployment target: '${target}'. Supported targets: github-pages, vercel.`,
          resolution: "Set target to 'github-pages' or 'vercel'.",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await context?.info?.(
      `✍️ Generating ${targetLabel} deployment artifacts...`,
    );
    const generatedFiles = adapter.generateDeploymentArtifact(ssg, {
      ssg,
      branch,
      customDomain,
      buildConfig,
      invokeCliCommand,
    });

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 70, total: 100 });
    }

    // Write all generated files
    for (const file of generatedFiles) {
      const filePath = path.join(repoPath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
      await context?.info?.(`✅ Created: ${file.path}`);
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 85, total: 100 });
    }

    const cliCommand = adapter.optionalCliCommand({
      ssg,
      branch,
      customDomain,
      buildConfig,
      invokeCliCommand,
    });

    const deploymentResult = {
      repository,
      ssg,
      target,
      branch,
      customDomain,
      generatedFiles: generatedFiles.map((f) => f.path),
      cliCommand,
      repoPath,
      detectedConfig: {
        docsFolder: docsFolder || "root",
        buildCommand: buildConfig.buildCommand,
        outputPath: buildConfig.outputPath,
        packageManager: buildConfig.packageManager || "npm",
        workingDirectory: buildConfig.workingDirectory,
      },
    };

    // Track deployment setup in knowledge graph
    await context?.info?.("💾 Tracking deployment in Knowledge Graph...");
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
            hasCI: true,
            hasDocs: true,
          },
        });

        await trackDeployment(project.id, ssg, true, {
          buildTime: Date.now() - startTime,
        });

        const userPreferenceManager = await getUserPreferenceManager(userId);
        await userPreferenceManager.trackSSGUsage({
          ssg,
          success: true,
          timestamp,
          projectType: projectPath || repository,
        });
      }
    } catch (trackingError) {
      console.warn(
        "Failed to track deployment in knowledge graph:",
        trackingError,
      );
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 100, total: 100 });
    }

    const executionTime = Date.now() - startTime;
    await context?.info?.(
      `✅ ${targetLabel} deployment configuration complete in ${Math.round(
        executionTime / 1000,
      )}s`,
    );

    const response: MCPToolResponse<typeof deploymentResult> = {
      success: true,
      data: deploymentResult,
      metadata: {
        toolVersion: "1.0.0",
        executionTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Deployment Artifacts Created",
          description: `${targetLabel} configuration generated for ${ssg}: ${deploymentResult.generatedFiles.join(
            ", ",
          )}`,
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
                description: `Found documentation in '${docsFolder}/' — build config uses this as working directory.`,
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
                description: `Custom domain ${customDomain} added to deployment config`,
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
          description: "Commit generated files and push to trigger deployment",
          priority: "high",
        },
        ...(target === "vercel"
          ? [
              {
                action: "Configure Vercel Secrets",
                description:
                  "Add VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID as GitHub Actions secrets. See docs: https://documcp.vercel.app/how-to/deploy-to-vercel",
                priority: "high" as const,
              },
              ...(cliCommand
                ? [
                    {
                      action: "Deploy via CLI",
                      description: `Run: ${cliCommand}`,
                      priority: "medium" as const,
                    },
                  ]
                : []),
            ]
          : []),
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
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

        await trackDeployment(project.id, ssg, false, {
          errorMessage: String(error),
        });

        const userPreferenceManager = await getUserPreferenceManager(userId);
        await userPreferenceManager.trackSSGUsage({
          ssg,
          success: false,
          timestamp: new Date().toISOString(),
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
          "Ensure repository path is accessible and the deployment target is supported",
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
