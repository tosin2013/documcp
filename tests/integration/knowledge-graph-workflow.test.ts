/**
 * Integration Tests for Knowledge Graph Workflow
 * Phase 1: End-to-End KG-Analysis Integration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  getKnowledgeGraph,
  saveKnowledgeGraph,
  createOrUpdateProject,
  getProjectContext,
  trackDeployment,
  getKGStatistics,
} from "../../src/memory/kg-integration.js";

describe("Knowledge Graph Workflow Integration", () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `kg-workflow-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set environment variable for storage
    originalEnv = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = testDir;

    // Initialize KG
    await initializeKnowledgeGraph(testDir);
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
  });

  describe("Complete Analysis Workflow", () => {
    it("should handle first-time project analysis", async () => {
      const analysis = {
        id: "analysis_001",
        timestamp: new Date().toISOString(),
        path: "/test/project",
        projectName: "Test Project",
        structure: {
          totalFiles: 100,
          totalDirectories: 10,
          languages: {
            typescript: 60,
            javascript: 30,
            json: 10,
          },
          hasTests: true,
          hasCI: true,
          hasDocs: false,
        },
      };

      // Create project in KG
      const projectNode = await createOrUpdateProject(analysis);

      expect(projectNode).toBeDefined();
      expect(projectNode.type).toBe("project");
      expect(projectNode.properties.name).toBe("Test Project");
      expect(projectNode.properties.analysisCount).toBe(1);

      // Get context (should be empty for first analysis)
      const context = await getProjectContext("/test/project");
      expect(context.previousAnalyses).toBe(1);
      expect(context.knownTechnologies).toContain("typescript");
    });

    it("should track returning project with historical context", async () => {
      const analysis1 = {
        id: "analysis_001",
        timestamp: new Date().toISOString(),
        path: "/test/project",
        projectName: "Test Project",
        structure: {
          totalFiles: 100,
          languages: { typescript: 60, javascript: 40 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      };

      const analysis2 = {
        id: "analysis_002",
        timestamp: new Date().toISOString(),
        path: "/test/project",
        projectName: "Test Project",
        structure: {
          totalFiles: 120,
          languages: { typescript: 80, javascript: 40 },
          hasTests: true,
          hasCI: true,
          hasDocs: true,
        },
      };

      // First analysis
      await createOrUpdateProject(analysis1);

      // Second analysis
      const projectNode = await createOrUpdateProject(analysis2);

      expect(projectNode.properties.analysisCount).toBe(2);

      // Get context
      const context = await getProjectContext("/test/project");
      expect(context.previousAnalyses).toBe(2);
      expect(context.lastAnalyzed).toBeDefined();
    });

    it("should find similar projects based on technologies", async () => {
      // Create multiple projects with shared technologies
      const project1 = {
        id: "analysis_001",
        timestamp: new Date().toISOString(),
        path: "/test/project1",
        projectName: "React App",
        structure: {
          totalFiles: 50,
          languages: { typescript: 30, javascript: 20 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      };

      const project2 = {
        id: "analysis_002",
        timestamp: new Date().toISOString(),
        path: "/test/project2",
        projectName: "Another React App",
        structure: {
          totalFiles: 75,
          languages: { typescript: 50, javascript: 25 },
          hasTests: true,
          hasCI: true,
          hasDocs: false,
        },
      };

      const project3 = {
        id: "analysis_003",
        timestamp: new Date().toISOString(),
        path: "/test/project3",
        projectName: "Python Project",
        structure: {
          totalFiles: 40,
          languages: { python: 40 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      };

      // Create all projects
      await createOrUpdateProject(project1);
      await createOrUpdateProject(project2);
      await createOrUpdateProject(project3);

      // Get context for project1
      const context = await getProjectContext("/test/project1");

      // Should find project2 as similar (shares typescript/javascript)
      // Should not find project3 (uses different stack)
      expect(context.similarProjects.length).toBeGreaterThan(0);

      const similarProject = context.similarProjects.find(
        (p) => p.properties.name === "Another React App",
      );
      expect(similarProject).toBeDefined();
    });
  });

  describe("Deployment Tracking Workflow", () => {
    it("should track successful deployment", async () => {
      // Create project
      const analysis = {
        id: "project_001",
        timestamp: new Date().toISOString(),
        path: "/test/project",
        projectName: "Test Project",
        structure: {
          totalFiles: 50,
          languages: { typescript: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      };

      const projectNode = await createOrUpdateProject(analysis);

      // Track successful deployment
      await trackDeployment(projectNode.id, "docusaurus", true, {
        buildTime: 45,
        deploymentUrl: "https://test.github.io",
      });

      // Verify deployment was tracked
      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        source: projectNode.id,
        properties: { baseType: "project_deployed_with" },
      });

      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].properties.success).toBe(true);
      expect(edges[0].properties.buildTime).toBe(45);
    });

    it("should track failed deployment", async () => {
      const analysis = {
        id: "project_002",
        timestamp: new Date().toISOString(),
        path: "/test/project2",
        projectName: "Test Project 2",
        structure: {
          totalFiles: 50,
          languages: { javascript: 50 },
          hasTests: false,
          hasCI: false,
          hasDocs: false,
        },
      };

      const projectNode = await createOrUpdateProject(analysis);

      // Track failed deployment
      await trackDeployment(projectNode.id, "jekyll", false, {
        errorMessage: "Ruby version mismatch",
      });

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        source: projectNode.id,
        properties: { baseType: "project_deployed_with" },
      });

      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].properties.success).toBe(false);
      expect(edges[0].properties.errorMessage).toContain("Ruby version");
    });

    it("should update configuration success rate over time", async () => {
      const analysis = {
        id: "project_003",
        timestamp: new Date().toISOString(),
        path: "/test/project3",
        projectName: "Test Project 3",
        structure: {
          totalFiles: 50,
          languages: { typescript: 50 },
          hasTests: false,
          hasCI: false,
          hasDocs: false,
        },
      };

      const projectNode = await createOrUpdateProject(analysis);

      // Track multiple deployments
      await trackDeployment(projectNode.id, "hugo", true);
      await trackDeployment(projectNode.id, "hugo", true);
      await trackDeployment(projectNode.id, "hugo", false);

      const kg = await getKnowledgeGraph();
      const configNode = await kg.findNode({
        type: "configuration",
        properties: { ssg: "hugo" },
      });

      expect(configNode).toBeDefined();
      expect(configNode!.properties.usageCount).toBe(3);
      // Success rate: 2/3 = 0.666...
      expect(configNode!.properties.deploymentSuccessRate).toBeCloseTo(
        0.666,
        2,
      );
    });
  });

  describe("Knowledge Graph Statistics", () => {
    it("should return accurate statistics", async () => {
      // Create multiple projects
      for (let i = 0; i < 5; i++) {
        const analysis = {
          id: `project_00${i}`,
          timestamp: new Date().toISOString(),
          path: `/test/project${i}`,
          projectName: `Project ${i}`,
          structure: {
            totalFiles: 50,
            languages: { typescript: 30, javascript: 20 },
            hasTests: true,
            hasCI: false,
            hasDocs: false,
          },
        };
        await createOrUpdateProject(analysis);
      }

      const stats = await getKGStatistics();

      expect(stats.projectCount).toBe(5);
      expect(stats.technologyCount).toBeGreaterThan(0);
      expect(stats.nodeCount).toBeGreaterThan(5); // Projects + technologies
      expect(stats.edgeCount).toBeGreaterThan(0); // project_uses_technology edges
    });
  });

  describe("Persistence Workflow", () => {
    it("should persist data across sessions", async () => {
      const analysis = {
        id: "persistent_project",
        timestamp: new Date().toISOString(),
        path: "/test/persistent",
        projectName: "Persistent Project",
        structure: {
          totalFiles: 50,
          languages: { typescript: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      };

      // Create project and save
      await createOrUpdateProject(analysis);
      await saveKnowledgeGraph();

      // Reinitialize (simulating new session)
      await initializeKnowledgeGraph(testDir);

      // Verify data was loaded
      const context = await getProjectContext("/test/persistent");
      expect(context.previousAnalyses).toBe(1);
      expect(context.knownTechnologies).toContain("typescript");
    });
  });

  describe("Complex Multi-Step Workflow", () => {
    it("should handle complete project lifecycle", async () => {
      // Step 1: Initial analysis
      const initialAnalysis = {
        id: "lifecycle_project",
        timestamp: new Date().toISOString(),
        path: "/test/lifecycle",
        projectName: "Lifecycle Project",
        structure: {
          totalFiles: 30,
          languages: { javascript: 30 },
          hasTests: false,
          hasCI: false,
          hasDocs: false,
        },
      };

      const project1 = await createOrUpdateProject(initialAnalysis);
      expect(project1.properties.analysisCount).toBe(1);

      // Step 2: Track deployment attempt (failed)
      await trackDeployment(project1.id, "jekyll", false, {
        errorMessage: "Missing dependencies",
      });

      // Step 3: Re-analysis after fixes
      const updatedAnalysis = {
        ...initialAnalysis,
        id: "lifecycle_project_2",
        timestamp: new Date().toISOString(),
        structure: {
          totalFiles: 35,
          languages: { javascript: 30, json: 5 },
          hasTests: true,
          hasCI: true,
          hasDocs: true,
        },
      };

      const project2 = await createOrUpdateProject(updatedAnalysis);
      expect(project2.properties.analysisCount).toBe(2);
      expect(project2.properties.hasCI).toBe(true);

      // Step 4: Successful deployment
      await trackDeployment(project2.id, "eleventy", true, {
        buildTime: 30,
        deploymentUrl: "https://lifecycle.github.io",
      });

      // Verify complete lifecycle
      const kg = await getKnowledgeGraph();

      // Check project node
      const projectNode = await kg.findNode({
        type: "project",
        properties: { path: "/test/lifecycle" },
      });
      expect(projectNode).toBeDefined();
      expect(projectNode!.properties.analysisCount).toBe(2);

      // Check deployments
      const deployments = await kg.findEdges({
        source: projectNode!.id,
        properties: { baseType: "project_deployed_with" },
      });
      expect(deployments).toHaveLength(2);

      // Check technologies
      const techEdges = await kg.findEdges({
        source: projectNode!.id,
        type: "project_uses_technology",
      });
      expect(techEdges.length).toBeGreaterThan(0);

      // Get final context
      const context = await getProjectContext("/test/lifecycle");
      expect(context.previousAnalyses).toBe(2);
      expect(context.knownTechnologies).toContain("javascript");
    });
  });
});
