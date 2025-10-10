/**
 * Tests for Phase 2.3: Deployment Outcome Tracking
 * Tests the enhanced deploy_pages tool with knowledge graph integration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  getKnowledgeGraph,
} from "../../src/memory/kg-integration.js";
import { deployPages } from "../../src/tools/deploy-pages.js";
import {
  getUserPreferenceManager,
  clearPreferenceManagerCache,
} from "../../src/memory/user-preferences.js";

describe("deployPages with Deployment Tracking (Phase 2.3)", () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `deploy-pages-tracking-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set environment variable for storage
    originalEnv = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = testDir;

    // Initialize KG
    await initializeKnowledgeGraph(testDir);

    // Clear preference manager cache
    clearPreferenceManagerCache();
  });

  afterEach(async () => {
    // Restore environment
    if (originalEnv) {
      process.env.DOCUMCP_STORAGE_DIR = originalEnv;
    } else {
      delete process.env.DOCUMCP_STORAGE_DIR;
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }

    // Clear preference manager cache
    clearPreferenceManagerCache();
  });

  describe("Deployment Tracking", () => {
    it("should track successful deployment setup in knowledge graph", async () => {
      const projectPath = testDir;

      const result = await deployPages({
        repository: projectPath,
        ssg: "docusaurus",
        projectPath,
        projectName: "Test Project",
        userId: "test-user-1",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.repository).toBeDefined();
      expect(data.ssg).toBe("docusaurus");

      // Verify deployment was tracked in knowledge graph
      const kg = await getKnowledgeGraph();
      const projects = await kg.findNodes({ type: "project" });
      expect(projects.length).toBeGreaterThan(0);

      // Find deployments
      const deployments = await kg.findEdges({
        properties: { baseType: "project_deployed_with" },
      });
      expect(deployments.length).toBeGreaterThan(0);
      expect(deployments[0].properties.success).toBe(true);
    });

    it("should track SSG usage in user preferences", async () => {
      const projectPath = testDir;
      const userId = "test-user-2";

      await deployPages({
        repository: projectPath,
        ssg: "mkdocs",
        projectPath,
        projectName: "Python Docs",
        userId,
      });

      // Check if user preferences were updated
      const manager = await getUserPreferenceManager(userId);
      const recommendations = await manager.getSSGRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].ssg).toBe("mkdocs");
      expect(recommendations[0].reason).toContain("Used 1 time");
    });

    it("should track deployment with custom analysisId", async () => {
      const projectPath = testDir;
      const analysisId = "test_analysis_123";

      await deployPages({
        repository: projectPath,
        ssg: "hugo",
        projectPath,
        projectName: "Hugo Site",
        analysisId,
        userId: "test-user-3",
      });

      const kg = await getKnowledgeGraph();
      const projects = await kg.findNodes({ type: "project" });

      // At least one project should be created with tracking
      expect(projects.length).toBeGreaterThan(0);

      // Verify deployment was tracked
      const deployments = await kg.findEdges({
        properties: { baseType: "project_deployed_with" },
      });
      expect(deployments.length).toBeGreaterThan(0);
    });

    it("should track deployment for multiple users independently", async () => {
      const projectPath = testDir;

      await deployPages({
        repository: projectPath,
        ssg: "eleventy",
        projectPath,
        projectName: "User1 Site",
        userId: "user1",
      });

      await deployPages({
        repository: projectPath,
        ssg: "jekyll",
        projectPath,
        projectName: "User2 Site",
        userId: "user2",
      });

      // Check user1 preferences
      const manager1 = await getUserPreferenceManager("user1");
      const recs1 = await manager1.getSSGRecommendations();
      expect(recs1[0].ssg).toBe("eleventy");

      // Check user2 preferences
      const manager2 = await getUserPreferenceManager("user2");
      const recs2 = await manager2.getSSGRecommendations();
      expect(recs2[0].ssg).toBe("jekyll");
    });
  });

  describe("Deployment without Tracking", () => {
    it("should work without projectPath (no tracking)", async () => {
      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.repository).toBeDefined();
      expect(data.ssg).toBe("docusaurus");

      // No projects should be created
      const kg = await getKnowledgeGraph();
      const projects = await kg.findNodes({ type: "project" });
      expect(projects.length).toBe(0);
    });

    it("should handle tracking errors gracefully", async () => {
      // Set invalid storage directory to trigger tracking error
      const invalidEnv = process.env.DOCUMCP_STORAGE_DIR;
      process.env.DOCUMCP_STORAGE_DIR = "/invalid/path/that/does/not/exist";

      const result = await deployPages({
        repository: testDir,
        ssg: "hugo",
        projectPath: testDir,
        projectName: "Test",
      });

      // Restore environment
      process.env.DOCUMCP_STORAGE_DIR = invalidEnv;

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      // Deployment should still succeed even if tracking fails
      expect(data.repository).toBe(testDir);
      expect(data.ssg).toBe("hugo");
    });
  });

  describe("Custom Domain and Branches", () => {
    it("should track deployment with custom domain", async () => {
      const result = await deployPages({
        repository: testDir,
        ssg: "jekyll",
        customDomain: "docs.example.com",
        projectPath: testDir,
        projectName: "Custom Domain Site",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);
      expect(data.customDomain).toBe("docs.example.com");
      expect(data.cnameCreated).toBe(true);
    });

    it("should track deployment with custom branch", async () => {
      const result = await deployPages({
        repository: testDir,
        ssg: "mkdocs",
        branch: "docs",
        projectPath: testDir,
        projectName: "Custom Branch Site",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);
      expect(data.branch).toBe("docs");
    });
  });

  describe("Preference Learning", () => {
    it("should increase user preference for repeatedly used SSG", async () => {
      const userId = "test-user-repeat";
      const projectPath = testDir;

      // Deploy with Hugo 3 times
      for (let i = 0; i < 3; i++) {
        await deployPages({
          repository: projectPath,
          ssg: "hugo",
          projectPath: `${projectPath}/project${i}`,
          projectName: `Project ${i}`,
          userId,
        });
      }

      const manager = await getUserPreferenceManager(userId);
      const recommendations = await manager.getSSGRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].ssg).toBe("hugo");
      expect(recommendations[0].reason).toContain("Used 3 time");
      expect(recommendations[0].score).toBeGreaterThan(0);
    });

    it("should track successful deployments with 100% success rate", async () => {
      const userId = "test-user-success";

      // Multiple successful deployments
      await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: `${testDir}/site1`,
        projectName: "Site 1",
        userId,
      });

      await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: `${testDir}/site2`,
        projectName: "Site 2",
        userId,
      });

      const manager = await getUserPreferenceManager(userId);
      const recommendations = await manager.getSSGRecommendations();

      expect(recommendations[0].ssg).toBe("docusaurus");
      expect(recommendations[0].reason).toContain("100% success rate");
    });

    test("should handle Eleventy SSG configuration", async () => {
      await fs.mkdir(join(testDir, "src"), { recursive: true });
      await fs.writeFile(join(testDir, ".eleventy.js"), "module.exports = {}");
      await fs.writeFile(join(testDir, "package.json"), '{"name": "test"}');

      const result = await deployPages({
        repository: testDir,
        ssg: "eleventy",
        projectPath: testDir,
        projectName: "Eleventy Test",
        userId: "test-user-eleventy",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("eleventy");
      expect(data.repository).toBeDefined();
    });

    test("should handle MkDocs SSG configuration", async () => {
      await fs.mkdir(join(testDir, "docs"), { recursive: true });
      await fs.writeFile(join(testDir, "mkdocs.yml"), "site_name: Test");
      await fs.writeFile(join(testDir, "docs", "index.md"), "# Test");

      const result = await deployPages({
        repository: testDir,
        ssg: "mkdocs",
        projectPath: testDir,
        projectName: "MkDocs Test",
        userId: "test-user-mkdocs",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("mkdocs");
      expect(data.repository).toBeDefined();
    });

    test("should handle Hugo SSG with custom config", async () => {
      await fs.mkdir(join(testDir, "content"), { recursive: true });
      await fs.writeFile(join(testDir, "config.toml"), 'baseURL = "/"');
      await fs.writeFile(join(testDir, "content", "test.md"), "# Test");

      const result = await deployPages({
        repository: testDir,
        ssg: "hugo",
        projectPath: testDir,
        projectName: "Hugo Test",
        userId: "test-user-hugo",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("hugo");
      expect(data.repository).toBeDefined();
    });

    test("should fallback gracefully when no config detected", async () => {
      const emptyDir = join(tmpdir(), "empty-" + Date.now());
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await deployPages({
        repository: emptyDir,
        ssg: "jekyll",
        projectPath: emptyDir,
        projectName: "Empty Test",
        userId: "test-user-empty",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("jekyll");
      expect(data.repository).toBeDefined();

      await fs.rm(emptyDir, { recursive: true, force: true });
    });

    test("should detect docs:build script in package.json", async () => {
      await fs.writeFile(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          scripts: { "docs:build": "docusaurus build" },
        }),
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "Docs Build Test",
        userId: "test-user-docs-build",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("docusaurus");
    });

    test("should detect docusaurus in start script", async () => {
      await fs.writeFile(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          scripts: { start: "docusaurus start" },
        }),
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "Start Script Test",
        userId: "test-user-start-script",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      expect(content.text).toBeDefined();
    });

    test("should detect yarn package manager", async () => {
      await fs.writeFile(join(testDir, "yarn.lock"), "# yarn lockfile");
      await fs.writeFile(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          scripts: { build: "yarn build" },
        }),
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "Yarn Test",
        userId: "test-user-yarn",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      expect(content.text).toBeDefined();
    });

    test("should detect pnpm package manager", async () => {
      await fs.writeFile(
        join(testDir, "pnpm-lock.yaml"),
        "lockfileVersion: 5.4",
      );
      await fs.writeFile(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          scripts: { build: "pnpm build" },
        }),
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "Pnpm Test",
        userId: "test-user-pnpm",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      expect(content.text).toBeDefined();
    });

    test("should detect Node version from engines field", async () => {
      await fs.writeFile(
        join(testDir, "package.json"),
        JSON.stringify({
          name: "test",
          engines: { node: ">=18.0.0" },
        }),
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "Node Version Test",
        userId: "test-user-node-version",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      expect(content.text).toBeDefined();
    });

    test("should retrieve SSG from knowledge graph when analysisId provided", async () => {
      // First deployment to populate knowledge graph
      const analysisId = "kg-test-analysis-" + Date.now();

      await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "KG Test Project",
        userId: "test-user-kg",
        analysisId,
      });

      // Second deployment using same analysisId should query KG
      const result = await deployPages({
        repository: testDir,
        ssg: "docusaurus",
        projectPath: testDir,
        projectName: "KG Test Project Repeat",
        userId: "test-user-kg",
        analysisId,
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("docusaurus");
    });

    test("should handle Jekyll SSG with custom config file", async () => {
      await fs.writeFile(
        join(testDir, "_config.yml"),
        "title: Test Site\ntheme: minima",
      );

      const result = await deployPages({
        repository: testDir,
        ssg: "jekyll",
        projectPath: testDir,
        projectName: "Jekyll Test",
        userId: "test-user-jekyll",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.ssg).toBe("jekyll");
    });

    test("should detect Python-based SSG from requirements.txt", async () => {
      await fs.mkdir(join(testDir, "docs"), { recursive: true });
      await fs.writeFile(join(testDir, "requirements.txt"), "mkdocs>=1.0");
      await fs.writeFile(join(testDir, "mkdocs.yml"), "site_name: Test");

      const result = await deployPages({
        repository: testDir,
        ssg: "mkdocs",
        projectPath: testDir,
        projectName: "Python SSG Test",
        userId: "test-user-python-ssg",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      expect(content.text).toBeDefined();
    });
  });
});
