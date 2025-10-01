import { z } from "zod";
import { promises as fs } from "fs";
import * as path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";

const execAsync = promisify(exec);

const inputSchema = z.object({
  repositoryPath: z.string().describe("Path to the repository"),
  ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
  port: z.number().optional().default(3000).describe("Port for local server"),
  timeout: z
    .number()
    .optional()
    .default(60)
    .describe("Timeout in seconds for build process"),
  skipBuild: z
    .boolean()
    .optional()
    .default(false)
    .describe("Skip build step and only start server"),
});

interface LocalTestResult {
  repositoryPath: string;
  ssg: string;
  buildSuccess: boolean;
  buildOutput?: string;
  buildErrors?: string;
  serverStarted: boolean;
  localUrl?: string;
  port: number;
  testScript: string;
  recommendations: string[];
  nextSteps: string[];
}

interface SSGConfig {
  buildCommand: string;
  serveCommand: string;
  buildDir: string;
  configFiles: string[];
  installCommand?: string;
}

const SSG_CONFIGS: Record<string, SSGConfig> = {
  jekyll: {
    buildCommand: "bundle exec jekyll build",
    serveCommand: "bundle exec jekyll serve",
    buildDir: "_site",
    configFiles: ["_config.yml", "_config.yaml"],
    installCommand: "bundle install",
  },
  hugo: {
    buildCommand: "hugo",
    serveCommand: "hugo server",
    buildDir: "public",
    configFiles: [
      "hugo.toml",
      "hugo.yaml",
      "hugo.yml",
      "config.toml",
      "config.yaml",
      "config.yml",
    ],
  },
  docusaurus: {
    buildCommand: "npm run build",
    serveCommand: "npm run serve",
    buildDir: "build",
    configFiles: ["docusaurus.config.js", "docusaurus.config.ts"],
    installCommand: "npm install",
  },
  mkdocs: {
    buildCommand: "mkdocs build",
    serveCommand: "mkdocs serve",
    buildDir: "site",
    configFiles: ["mkdocs.yml", "mkdocs.yaml"],
    installCommand: "pip install -r requirements.txt",
  },
  eleventy: {
    buildCommand: "npx @11ty/eleventy",
    serveCommand: "npx @11ty/eleventy --serve",
    buildDir: "_site",
    configFiles: [".eleventy.js", "eleventy.config.js", ".eleventy.json"],
    installCommand: "npm install",
  },
};

export async function testLocalDeployment(
  args: unknown,
): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { repositoryPath, ssg, port, timeout, skipBuild } =
    inputSchema.parse(args);

  try {
    const config = SSG_CONFIGS[ssg];
    if (!config) {
      throw new Error(`Unsupported SSG: ${ssg}`);
    }

    // Change to repository directory
    process.chdir(repositoryPath);

    const testResult: LocalTestResult = {
      repositoryPath,
      ssg,
      buildSuccess: false,
      serverStarted: false,
      port,
      testScript: "",
      recommendations: [],
      nextSteps: [],
    };

    // Step 1: Check if configuration exists (always check, even if skipBuild)
    const configExists = await checkConfigurationExists(repositoryPath, config);
    if (!configExists) {
      testResult.recommendations.push(
        `Missing configuration file. Expected one of: ${config.configFiles.join(
          ", ",
        )}`,
      );
      testResult.nextSteps.push(
        "Run generate_config tool to create configuration",
      );
    } else {
      // Always mention which config file was found/expected for test purposes
      testResult.recommendations.push(
        `Using ${ssg} configuration: ${config.configFiles.join(" or ")}`,
      );
    }

    // Step 2: Install dependencies if needed
    if (config.installCommand && !skipBuild) {
      try {
        const { stderr } = await execAsync(config.installCommand, {
          cwd: repositoryPath,
          timeout: timeout * 1000,
        });
        if (stderr && !stderr.includes("npm WARN")) {
          testResult.recommendations.push(
            "Dependency installation warnings detected",
          );
        }
      } catch (error: any) {
        testResult.recommendations.push(
          `Dependency installation failed: ${error.message}`,
        );
        testResult.nextSteps.push(
          "Fix dependency installation issues before testing deployment",
        );
      }
    }

    // Step 3: Build the site (unless skipped)
    if (!skipBuild) {
      try {
        const { stdout, stderr } = await execAsync(config.buildCommand, {
          cwd: repositoryPath,
          timeout: timeout * 1000,
        });
        testResult.buildSuccess = true;
        testResult.buildOutput = stdout;

        if (stderr && stderr.trim()) {
          testResult.buildErrors = stderr;
          if (stderr.includes("error") || stderr.includes("Error")) {
            testResult.recommendations.push(
              "Build completed with errors - review build output",
            );
          }
        }

        // Check if build directory was created
        const buildDirExists = await checkBuildOutput(
          repositoryPath,
          config.buildDir,
        );
        if (!buildDirExists) {
          testResult.recommendations.push(
            `Build directory ${config.buildDir} was not created`,
          );
        }
      } catch (error: any) {
        testResult.buildSuccess = false;
        testResult.buildErrors = error.message;
        testResult.recommendations.push(
          "Build failed - fix build errors before deployment",
        );
        testResult.nextSteps.push(
          "Review build configuration and resolve errors",
        );
      }
    } else {
      testResult.buildSuccess = true; // Assume success if skipped
    }

    // Step 4: Generate test script
    testResult.testScript = generateTestScript(
      ssg,
      config,
      port,
      repositoryPath,
    );

    // Step 5: Try to start local server (non-blocking)
    if (testResult.buildSuccess || skipBuild) {
      const serverResult = await startLocalServer(
        config,
        port,
        repositoryPath,
        10,
      ); // 10 second timeout for server start
      testResult.serverStarted = serverResult.started;
      testResult.localUrl = serverResult.url;

      if (testResult.serverStarted) {
        testResult.recommendations.push(
          "Local server started successfully - test manually at the provided URL",
        );
        testResult.nextSteps.push("Verify content loads correctly in browser");
        testResult.nextSteps.push("Test navigation and responsive design");
      } else {
        testResult.recommendations.push(
          "Could not automatically start local server - run manually using the provided script",
        );
        testResult.nextSteps.push(
          "Start server manually and verify it works before GitHub deployment",
        );
      }
    }

    // Step 6: Generate final recommendations
    if (testResult.buildSuccess && testResult.serverStarted) {
      testResult.recommendations.push(
        "Local deployment test successful - ready for GitHub Pages",
      );
      testResult.nextSteps.push(
        "Run deploy_pages tool to set up GitHub Actions workflow",
      );
    } else if (testResult.buildSuccess && !testResult.serverStarted) {
      testResult.recommendations.push(
        "Build successful but server test incomplete - manual verification needed",
      );
      testResult.nextSteps.push(
        "Test server manually before deploying to GitHub",
      );
    }

    const response: MCPToolResponse<typeof testResult> = {
      success: true,
      data: testResult,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: testResult.buildSuccess ? "info" : "warning",
          title: "Local Deployment Test Complete",
          description: `Build ${
            testResult.buildSuccess ? "succeeded" : "failed"
          }, Server ${
            testResult.serverStarted ? "started" : "failed to start"
          }`,
        },
      ],
      nextSteps: testResult.nextSteps.map((step) => ({
        action: step,
        toolRequired: getRecommendedTool(step),
        description: step,
        priority: testResult.buildSuccess ? "medium" : ("high" as const),
      })),
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "LOCAL_TEST_FAILED",
        message: `Failed to test local deployment: ${error}`,
        resolution:
          "Ensure repository path is valid and SSG is properly configured",
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

async function checkConfigurationExists(
  repoPath: string,
  config: SSGConfig,
): Promise<boolean> {
  for (const configFile of config.configFiles) {
    try {
      await fs.access(path.join(repoPath, configFile));
      return true;
    } catch {
      // File doesn't exist, continue checking
    }
  }
  return false;
}

async function checkBuildOutput(
  repoPath: string,
  buildDir: string,
): Promise<boolean> {
  try {
    const buildPath = path.join(repoPath, buildDir);
    const stats = await fs.stat(buildPath);
    if (stats.isDirectory()) {
      const files = await fs.readdir(buildPath);
      return files.length > 0;
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
  return false;
}

async function startLocalServer(
  config: SSGConfig,
  port: number,
  repoPath: string,
  timeout: number,
): Promise<{ started: boolean; url?: string }> {
  return new Promise((resolve) => {
    let serverProcess: any = null;
    let resolved = false;

    const cleanup = () => {
      if (serverProcess && !serverProcess.killed) {
        try {
          serverProcess.kill("SIGTERM");
          // Force kill if SIGTERM doesn't work after 1 second
          const forceKillTimeout = setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
              serverProcess.kill("SIGKILL");
            }
          }, 1000);

          // Clear the timeout if process exits normally
          serverProcess.on("exit", () => {
            clearTimeout(forceKillTimeout);
          });
        } catch (error) {
          // Process may already be dead
        }
      }
    };

    const safeResolve = (result: { started: boolean; url?: string }) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    const serverTimeout = setTimeout(() => {
      safeResolve({ started: false });
    }, timeout * 1000);

    try {
      let command = config.serveCommand;

      // Modify serve command to use custom port for some SSGs
      if (config.serveCommand.includes("jekyll serve")) {
        command = `${config.serveCommand} --port ${port}`;
      } else if (config.serveCommand.includes("hugo server")) {
        command = `${config.serveCommand} --port ${port}`;
      } else if (config.serveCommand.includes("mkdocs serve")) {
        command = `${config.serveCommand} --dev-addr localhost:${port}`;
      } else if (config.serveCommand.includes("--serve")) {
        command = `${config.serveCommand} --port ${port}`;
      }

      serverProcess = spawn("sh", ["-c", command], {
        cwd: repoPath,
        detached: false,
        stdio: "pipe",
      });

      let serverStarted = false;

      serverProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();

        // Check for server start indicators
        if (
          !serverStarted &&
          (output.includes("Server running") ||
            output.includes("Serving on") ||
            output.includes("Local:") ||
            output.includes("localhost:") ||
            output.includes(`http://127.0.0.1:${port}`) ||
            output.includes(`http://localhost:${port}`))
        ) {
          serverStarted = true;
          clearTimeout(serverTimeout);

          safeResolve({
            started: true,
            url: `http://localhost:${port}`,
          });
        }
      });

      serverProcess.stderr?.on("data", (data: Buffer) => {
        const error = data.toString();

        // Some servers output startup info to stderr
        if (
          !serverStarted &&
          (error.includes("Serving on") ||
            error.includes("Local:") ||
            error.includes("localhost:"))
        ) {
          serverStarted = true;
          clearTimeout(serverTimeout);

          safeResolve({
            started: true,
            url: `http://localhost:${port}`,
          });
        }
      });

      serverProcess.on("error", (_error: Error) => {
        clearTimeout(serverTimeout);
        safeResolve({ started: false });
      });

      serverProcess.on("exit", () => {
        clearTimeout(serverTimeout);
        if (!resolved) {
          safeResolve({ started: false });
        }
      });
    } catch (_error) {
      clearTimeout(serverTimeout);
      safeResolve({ started: false });
    }
  });
}

function generateTestScript(
  ssg: string,
  config: SSGConfig,
  port: number,
  repoPath: string,
): string {
  const commands: string[] = [
    `# Local Deployment Test Script for ${ssg}`,
    `# Generated on ${new Date().toISOString()}`,
    ``,
    `cd "${repoPath}"`,
    ``,
  ];

  // Add install command if needed
  if (config.installCommand) {
    commands.push(`# Install dependencies`);
    commands.push(config.installCommand);
    commands.push(``);
  }

  // Add build command
  commands.push(`# Build the site`);
  commands.push(config.buildCommand);
  commands.push(``);

  // Add serve command with custom port
  commands.push(`# Start local server`);
  let serveCommand = config.serveCommand;

  if (serveCommand.includes("jekyll serve")) {
    serveCommand = `${serveCommand} --port ${port}`;
  } else if (serveCommand.includes("hugo server")) {
    serveCommand = `${serveCommand} --port ${port}`;
  } else if (serveCommand.includes("mkdocs serve")) {
    serveCommand = `${serveCommand} --dev-addr localhost:${port}`;
  } else if (serveCommand.includes("--serve")) {
    serveCommand = `${serveCommand} --port ${port}`;
  }

  commands.push(serveCommand);
  commands.push(``);
  commands.push(`# Open in browser:`);
  commands.push(`# http://localhost:${port}`);

  return commands.join("\n");
}

function getRecommendedTool(step: string): string {
  if (step.includes("generate_config")) return "generate_config";
  if (step.includes("deploy_pages")) return "deploy_pages";
  if (step.includes("verify_deployment")) return "verify_deployment";
  return "manual";
}
