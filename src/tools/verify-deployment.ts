import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";

const inputSchema = z.object({
  repository: z.string(),
  url: z.string().optional(),
});

interface DeploymentCheck {
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  recommendation?: string;
}

export async function verifyDeployment(
  args: unknown,
): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { repository, url } = inputSchema.parse(args);

  try {
    const checks: DeploymentCheck[] = [];

    // Determine repository path
    const repoPath = repository.startsWith("http") ? "." : repository;

    // Check 1: GitHub Actions workflow exists
    const workflowPath = path.join(repoPath, ".github", "workflows");
    try {
      const workflows = await fs.readdir(workflowPath);
      const deployWorkflow = workflows.find(
        (f) =>
          f.includes("deploy") || f.includes("pages") || f.includes("docs"),
      );

      if (deployWorkflow) {
        checks.push({
          check: "GitHub Actions Workflow",
          status: "pass",
          message: `Found deployment workflow: ${deployWorkflow}`,
        });
      } else {
        checks.push({
          check: "GitHub Actions Workflow",
          status: "fail",
          message: "No deployment workflow found",
          recommendation: "Run deploy_pages tool to create a workflow",
        });
      }
    } catch {
      checks.push({
        check: "GitHub Actions Workflow",
        status: "fail",
        message: "No .github/workflows directory found",
        recommendation: "Run deploy_pages tool to set up GitHub Actions",
      });
    }

    // Check 2: Documentation source files exist
    const docsPaths = ["docs", "documentation", "site", "content"];
    let docsFound = false;

    for (const docsPath of docsPaths) {
      try {
        const fullPath = path.join(repoPath, docsPath);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const files = await fs.readdir(fullPath);
          const mdFiles = files.filter(
            (f) => f.endsWith(".md") || f.endsWith(".mdx"),
          );

          if (mdFiles.length > 0) {
            docsFound = true;
            checks.push({
              check: "Documentation Source Files",
              status: "pass",
              message: `Found ${mdFiles.length} documentation files in ${docsPath}/`,
            });
            break;
          }
        }
      } catch {
        // Directory doesn't exist, continue checking
      }
    }

    if (!docsFound) {
      checks.push({
        check: "Documentation Source Files",
        status: "warning",
        message: "No documentation files found in standard locations",
        recommendation:
          "Run setup_structure tool to create documentation structure",
      });
    }

    // Check 3: Configuration files
    const configPatterns = [
      "docusaurus.config.js",
      "mkdocs.yml",
      "hugo.toml",
      "hugo.yaml",
      "_config.yml",
      ".eleventy.js",
    ];

    let configFound = false;
    for (const config of configPatterns) {
      try {
        await fs.access(path.join(repoPath, config));
        configFound = true;
        checks.push({
          check: "SSG Configuration",
          status: "pass",
          message: `Found configuration file: ${config}`,
        });
        break;
      } catch {
        // File doesn't exist, continue
      }
    }

    if (!configFound) {
      checks.push({
        check: "SSG Configuration",
        status: "fail",
        message: "No static site generator configuration found",
        recommendation: "Run generate_config tool to create SSG configuration",
      });
    }

    // Check 4: Build output directory
    const buildDirs = ["_site", "build", "dist", "public", "out"];
    let buildFound = false;

    for (const buildDir of buildDirs) {
      try {
        const buildPath = path.join(repoPath, buildDir);
        const stats = await fs.stat(buildPath);
        if (stats.isDirectory()) {
          buildFound = true;
          checks.push({
            check: "Build Output",
            status: "pass",
            message: `Found build output directory: ${buildDir}/`,
          });
          break;
        }
      } catch {
        // Directory doesn't exist
      }
    }

    if (!buildFound) {
      checks.push({
        check: "Build Output",
        status: "warning",
        message: "No build output directory found",
        recommendation: "Run your SSG build command to generate the site",
      });
    }

    // Check 5: GitHub Pages settings (if URL provided)
    if (url) {
      checks.push({
        check: "Deployment URL",
        status: "warning",
        message: `Expected URL: ${url}`,
        recommendation: "Verify GitHub Pages is enabled in repository settings",
      });
    }

    // Generate summary
    const passCount = checks.filter((c) => c.status === "pass").length;
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;

    let overallStatus = "Ready for deployment";
    if (failCount > 0) {
      overallStatus = "Configuration required";
    } else if (warningCount > 0) {
      overallStatus = "Minor issues detected";
    }

    const verificationResult = {
      repository,
      url,
      overallStatus,
      checks,
      summary: {
        passed: passCount,
        warnings: warningCount,
        failed: failCount,
        total: checks.length,
      },
    };

    const response: MCPToolResponse<typeof verificationResult> = {
      success: true,
      data: verificationResult,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type:
            failCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
          title: "Deployment Verification Complete",
          description: `${overallStatus}. ${passCount} checks passed, ${warningCount} warnings, ${failCount} failures.`,
        },
      ],
      nextSteps: checks
        .filter((check) => check.recommendation)
        .map((check) => ({
          action: check.recommendation!,
          toolRequired: check.recommendation!.includes("deploy_pages")
            ? "deploy_pages"
            : check.recommendation!.includes("setup_structure")
              ? "setup_structure"
              : check.recommendation!.includes("generate_config")
                ? "generate_config"
                : "manual",
          description: check.message,
          priority: check.status === "fail" ? "high" : ("medium" as const),
        })),
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "VERIFICATION_FAILED",
        message: `Failed to verify deployment: ${error}`,
        resolution: "Ensure repository path is accessible",
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

// Removed unused getStatusEmoji function - status indicators now handled in formatMCPResponse
