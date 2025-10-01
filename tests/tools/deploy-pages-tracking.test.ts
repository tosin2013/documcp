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
        type: "project_deployed_with",
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
        type: "project_deployed_with",
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
  });
});
