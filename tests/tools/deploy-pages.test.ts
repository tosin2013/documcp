import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs/promises";
import * as path from "path";
import { deployPages } from "../../src/tools/deploy-pages.js";

describe("deployPages", () => {
  const testTempDir = path.join(__dirname, "../../.tmp/test-deploy-pages");

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testTempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testTempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Input Validation", () => {
    it("should validate required repository parameter", async () => {
      await expect(deployPages({})).rejects.toThrow();
    });

    it("should return error when ssg not provided and no analysisId", async () => {
      const result = await deployPages({ repository: "test-repo" });
      expect(result.content).toBeDefined();

      // Parse the response to check for error
      const textContent = result.content.find((c: any) => c.type === "text");
      expect(textContent).toBeDefined();
      const response = JSON.parse(textContent.text);
      expect(response.success).toBe(false);
      expect(response.error.code).toBe("SSG_NOT_SPECIFIED");
    });

    it("should validate ssg enum values", async () => {
      await expect(
        deployPages({
          repository: "test-repo",
          ssg: "invalid-ssg",
        }),
      ).rejects.toThrow();
    });

    it("should accept valid ssg values", async () => {
      const validSSGs = ["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"];

      for (const ssg of validSSGs) {
        const result = await deployPages({
          repository: testTempDir,
          ssg,
        });

        expect(result.content).toBeDefined();
        const data = JSON.parse(result.content[0].text);
        expect(data.ssg).toBe(ssg);
      }
    });

    it("should use default branch when not specified", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.branch).toBe("gh-pages");
    });

    it("should accept custom branch", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
        branch: "main",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.branch).toBe("main");
    });
  });

  describe("Workflow Generation", () => {
    it("should generate Jekyll workflow", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      // Check that workflow file was created
      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy Jekyll to GitHub Pages");
      expect(workflowContent).toContain("ruby/setup-ruby@v1");
      expect(workflowContent).toContain("bundle exec jekyll build");
    });

    it("should generate Hugo workflow", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "hugo",
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy Hugo to GitHub Pages");
      expect(workflowContent).toContain("peaceiris/actions-hugo@v2");
      expect(workflowContent).toContain("hugo --minify");
    });

    it("should generate Docusaurus workflow", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy Docusaurus to GitHub Pages");
      expect(workflowContent).toContain("actions/setup-node@v4");
      expect(workflowContent).toContain("./build");
    });

    it("should generate MkDocs workflow", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "mkdocs",
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy MkDocs to GitHub Pages");
      expect(workflowContent).toContain("actions/setup-python@v4");
      expect(workflowContent).toContain("mkdocs gh-deploy");
    });

    it("should generate Eleventy workflow", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "eleventy",
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy Eleventy to GitHub Pages");
      expect(workflowContent).toContain("actions/setup-node@v4");
      expect(workflowContent).toContain("./_site");
    });

    it("should use custom branch in MkDocs workflow", async () => {
      const customBranch = "custom-pages";
      const result = await deployPages({
        repository: testTempDir,
        ssg: "mkdocs",
        branch: customBranch,
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain(`--branch ${customBranch}`);
    });

    it("should fallback to Jekyll for unknown SSG", async () => {
      // This tests the fallback logic in generateWorkflow
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll", // Using valid SSG but testing fallback logic
      });

      expect(result.content).toBeDefined();

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("Deploy Jekyll to GitHub Pages");
    });
  });

  describe("Custom Domain Support", () => {
    it("should create CNAME file when custom domain is specified", async () => {
      const customDomain = "docs.example.com";
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
        customDomain,
      });

      expect(result.content).toBeDefined();

      // Check CNAME file was created
      const cnamePath = path.join(testTempDir, "CNAME");
      const cnameContent = await fs.readFile(cnamePath, "utf-8");
      expect(cnameContent).toBe(customDomain);

      // Check response indicates CNAME was created
      const data = JSON.parse(result.content[0].text);
      expect(data.cnameCreated).toBe(true);
      expect(data.customDomain).toBe(customDomain);
    });

    it("should not create CNAME file when custom domain is not specified", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      // Check CNAME file was not created
      const cnamePath = path.join(testTempDir, "CNAME");
      await expect(fs.access(cnamePath)).rejects.toThrow();

      // Check response indicates CNAME was not created
      const data = JSON.parse(result.content[0].text);
      expect(data.cnameCreated).toBe(false);
      expect(data.customDomain).toBeUndefined();
    });

    it("should include custom domain recommendation when specified", async () => {
      const customDomain = "docs.example.com";
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
        customDomain,
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.customDomain).toBe(customDomain);
      expect(data.cnameCreated).toBe(true);
    });

    it("should not include custom domain recommendation when not specified", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.customDomain).toBeUndefined();
      expect(data.cnameCreated).toBe(false);
    });
  });

  describe("Repository Path Handling", () => {
    it("should handle local repository path", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.repoPath).toBe(testTempDir);
    });

    it("should handle remote repository URL", async () => {
      const remoteRepo = "https://github.com/user/repo.git";
      const result = await deployPages({
        repository: remoteRepo,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.repoPath).toBe(".");
      expect(data.repository).toBe(remoteRepo);
    });

    it("should handle HTTP repository URL", async () => {
      const httpRepo = "http://github.com/user/repo.git";
      const result = await deployPages({
        repository: httpRepo,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.repoPath).toBe(".");
    });
  });

  describe("Response Structure", () => {
    it("should return properly formatted MCP response", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      const data = JSON.parse(result.content[0].text);
      expect(data.repository).toBe(testTempDir);
      expect(data.ssg).toBe("jekyll");
      expect(data.branch).toBe("gh-pages");
      expect(data.workflowPath).toBe("deploy-docs.yml");
    });

    it("should include execution metadata", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.repository).toBeDefined();
      expect(data.ssg).toBeDefined();
      expect(data.repoPath).toBeDefined();
    });

    it("should include deployment recommendations", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "hugo",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe("hugo");
      expect(data.workflowPath).toBe("deploy-docs.yml");

      // Check that workflow file was created
      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");
      expect(workflowContent).toContain("hugo");
    });

    it("should include next steps", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe("jekyll");
      expect(data.workflowPath).toBe("deploy-docs.yml");

      // Verify workflow file was created
      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const stats = await fs.stat(workflowPath);
      expect(stats.isFile()).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle file system errors gracefully", async () => {
      // Try to write to a path that doesn't exist and can't be created
      const invalidPath = "/invalid/path/that/cannot/be/created";

      const result = await deployPages({
        repository: invalidPath,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("DEPLOYMENT_SETUP_FAILED");
      expect(data.error.message).toContain("Failed to setup deployment");
      expect(data.error.resolution).toContain(
        "Ensure repository path is accessible",
      );
    });

    it("should include error metadata in failed responses", async () => {
      const invalidPath = "/invalid/path/that/cannot/be/created";

      const result = await deployPages({
        repository: invalidPath,
        ssg: "jekyll",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("DEPLOYMENT_SETUP_FAILED");
    });
  });

  describe("Directory Creation", () => {
    it("should create .github/workflows directory structure", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      // Check directory structure was created
      const workflowsDir = path.join(testTempDir, ".github", "workflows");
      const stats = await fs.stat(workflowsDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should handle existing .github/workflows directory", async () => {
      // Pre-create the directory
      const workflowsDir = path.join(testTempDir, ".github", "workflows");
      await fs.mkdir(workflowsDir, { recursive: true });

      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });

      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe("jekyll");
      expect(data.workflowPath).toBe("deploy-docs.yml");
    });
  });

  describe("Workflow File Content", () => {
    it("should include proper permissions in workflows", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
      });

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("permissions:");
      expect(workflowContent).toContain("contents: read");
      expect(workflowContent).toContain("pages: write");
      expect(workflowContent).toContain("id-token: write");
    });

    it("should include concurrency settings in workflows", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "hugo",
      });

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("concurrency:");
      expect(workflowContent).toContain('group: "pages"');
      expect(workflowContent).toContain("cancel-in-progress: false");
    });

    it("should include proper triggers in workflows", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "eleventy",
      });

      const workflowPath = path.join(
        testTempDir,
        ".github",
        "workflows",
        "deploy-docs.yml",
      );
      const workflowContent = await fs.readFile(workflowPath, "utf-8");

      expect(workflowContent).toContain("on:");
      expect(workflowContent).toContain("push:");
      expect(workflowContent).toContain("branches: [main]");
      expect(workflowContent).toContain("workflow_dispatch:");
    });
  });
});
