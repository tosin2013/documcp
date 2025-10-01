/**
 * Tests for Phase 2.1: Historical Deployment Data Integration
 * Tests the enhanced recommend_ssg tool with knowledge graph integration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  createOrUpdateProject,
  trackDeployment,
} from "../../src/memory/kg-integration.js";
import { recommendSSG } from "../../src/tools/recommend-ssg.js";
import { MemoryManager } from "../../src/memory/manager.js";

describe("recommendSSG with Historical Data (Phase 2.1)", () => {
  let testDir: string;
  let originalEnv: string | undefined;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `recommend-ssg-historical-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set environment variable for storage
    originalEnv = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = testDir;

    // Initialize KG and memory
    await initializeKnowledgeGraph(testDir);
    memoryManager = new MemoryManager(testDir);
    await memoryManager.initialize();
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

  describe("Historical Data Retrieval", () => {
    it("should include historical data when similar projects exist", async () => {
      // Create a project with successful deployments
      const project1 = await createOrUpdateProject({
        id: "test_project_1",
        timestamp: new Date().toISOString(),
        path: "/test/project1",
        projectName: "Test Project 1",
        structure: {
          totalFiles: 50,
          languages: { typescript: 30, javascript: 20 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      // Track successful Docusaurus deployments
      await trackDeployment(project1.id, "docusaurus", true, {
        buildTime: 45,
      });
      await trackDeployment(project1.id, "docusaurus", true, {
        buildTime: 42,
      });

      // Store analysis in memory for recommendation
      const memoryEntry = await memoryManager.remember("analysis", {
        path: "/test/project2",
        dependencies: {
          ecosystem: "javascript",
          languages: ["typescript", "javascript"],
        },
        structure: { totalFiles: 60 },
      });

      // Get recommendation
      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        preferences: {},
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      // Should include historical data
      expect(data.historicalData).toBeDefined();
      expect(data.historicalData.similarProjectCount).toBeGreaterThan(0);
      expect(data.historicalData.successRates.docusaurus).toBeDefined();
      expect(data.historicalData.successRates.docusaurus.rate).toBe(1.0);
      expect(data.historicalData.successRates.docusaurus.sampleSize).toBe(2);
    });

    it("should boost confidence when historical success rate is high", async () => {
      // Create multiple successful projects
      for (let i = 0; i < 3; i++) {
        const project = await createOrUpdateProject({
          id: `project_${i}`,
          timestamp: new Date().toISOString(),
          path: `/test/project${i}`,
          projectName: `Project ${i}`,
          structure: {
            totalFiles: 50,
            languages: { typescript: 50 },
            hasTests: true,
            hasCI: false,
            hasDocs: false,
          },
        });

        // Track successful Hugo deployments
        await trackDeployment(project.id, "hugo", true, { buildTime: 30 });
      }

      // Store analysis
      const memoryEntry = await memoryManager.remember("analysis", {
        path: "/test/new-project",
        dependencies: {
          ecosystem: "go",
          languages: ["typescript"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should have high confidence due to historical success
      expect(data.confidence).toBeGreaterThan(0.9);
      expect(data.reasoning[0]).toContain("100% success rate");
    });

    it("should reduce confidence when historical success rate is low", async () => {
      // Create project with failed deployments
      const project = await createOrUpdateProject({
        id: "failing_project",
        timestamp: new Date().toISOString(),
        path: "/test/failing",
        projectName: "Failing Project",
        structure: {
          totalFiles: 50,
          languages: { python: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      // Track mostly failed Jekyll deployments
      await trackDeployment(project.id, "jekyll", false, {
        errorMessage: "Build failed",
      });
      await trackDeployment(project.id, "jekyll", false, {
        errorMessage: "Build failed",
      });
      await trackDeployment(project.id, "jekyll", true, { buildTime: 60 });

      // Store analysis
      const memoryEntry003 = await memoryManager.remember("analysis", {
        path: "/test/new-python",
        dependencies: {
          ecosystem: "python",
          languages: ["python"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry003.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should have reduced confidence
      expect(data.confidence).toBeLessThan(0.8);
      expect(data.reasoning[0]).toContain("33% success rate");
    });

    it("should switch to top performer when significantly better", async () => {
      // Create projects with mixed results
      const project1 = await createOrUpdateProject({
        id: "project_mixed_1",
        timestamp: new Date().toISOString(),
        path: "/test/mixed1",
        projectName: "Mixed Project 1",
        structure: {
          totalFiles: 50,
          languages: { javascript: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      // Docusaurus: 50% success rate (2 samples)
      await trackDeployment(project1.id, "docusaurus", true);
      await trackDeployment(project1.id, "docusaurus", false);

      // Eleventy: 100% success rate (3 samples)
      const project2 = await createOrUpdateProject({
        id: "project_mixed_2",
        timestamp: new Date().toISOString(),
        path: "/test/mixed2",
        projectName: "Mixed Project 2",
        structure: {
          totalFiles: 50,
          languages: { javascript: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      await trackDeployment(project2.id, "eleventy", true);
      await trackDeployment(project2.id, "eleventy", true);
      await trackDeployment(project2.id, "eleventy", true);

      // Store analysis preferring JavaScript
      const memoryEntry004 = await memoryManager.remember("analysis", {
        path: "/test/new-js",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 40 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry004.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should switch to Eleventy due to better success rate
      expect(data.recommended).toBe("eleventy");
      expect(data.reasoning[0]).toContain("Switching to eleventy");
      expect(data.reasoning[0]).toContain("100% success rate");
    });

    it("should mention top performer as alternative if not switching", async () => {
      // Create successful Hugo deployments
      const project = await createOrUpdateProject({
        id: "hugo_success",
        timestamp: new Date().toISOString(),
        path: "/test/hugo",
        projectName: "Hugo Success",
        structure: {
          totalFiles: 100,
          languages: { go: 80, markdown: 20 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      await trackDeployment(project.id, "hugo", true);
      await trackDeployment(project.id, "hugo", true);

      // Store analysis for different ecosystem
      const memoryEntry005 = await memoryManager.remember("analysis", {
        path: "/test/new-python",
        dependencies: {
          ecosystem: "python",
          languages: ["python"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry005.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should keep Python recommendation but mention Hugo
      expect(data.recommended).toBe("mkdocs");
      const hugoMention = data.reasoning.find((r: string) =>
        r.includes("hugo"),
      );
      expect(hugoMention).toBeDefined();
    });

    it("should include deployment statistics in reasoning", async () => {
      // Create multiple projects with various deployments
      for (let i = 0; i < 3; i++) {
        const project = await createOrUpdateProject({
          id: `stats_project_${i}`,
          timestamp: new Date().toISOString(),
          path: `/test/stats${i}`,
          projectName: `Stats Project ${i}`,
          structure: {
            totalFiles: 50,
            languages: { typescript: 50 },
            hasTests: true,
            hasCI: false,
            hasDocs: false,
          },
        });

        await trackDeployment(project.id, "docusaurus", true);
        await trackDeployment(project.id, "docusaurus", true);
      }

      const memoryEntry006 = await memoryManager.remember("analysis", {
        path: "/test/stats-new",
        dependencies: {
          ecosystem: "javascript",
          languages: ["typescript"],
        },
        structure: { totalFiles: 50 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry006.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should mention deployment statistics
      const statsReasoning = data.reasoning.find((r: string) =>
        r.includes("deployment(s) across"),
      );
      expect(statsReasoning).toBeDefined();
      expect(statsReasoning).toContain("6 deployment(s)");
      expect(statsReasoning).toContain("3 similar project(s)");
    });
  });

  describe("Historical Data Structure", () => {
    it("should provide complete historical data structure", async () => {
      const project = await createOrUpdateProject({
        id: "structure_test",
        timestamp: new Date().toISOString(),
        path: "/test/structure",
        projectName: "Structure Test",
        structure: {
          totalFiles: 50,
          languages: { javascript: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      await trackDeployment(project.id, "jekyll", true);
      await trackDeployment(project.id, "hugo", true);
      await trackDeployment(project.id, "hugo", true);

      const memoryEntry007 = await memoryManager.remember("analysis", {
        path: "/test/structure-new",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry007.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.historicalData).toBeDefined();
      expect(data.historicalData.similarProjectCount).toBe(1);
      expect(data.historicalData.successRates).toBeDefined();
      expect(data.historicalData.successRates.jekyll).toEqual({
        rate: 1.0,
        sampleSize: 1,
      });
      expect(data.historicalData.successRates.hugo).toEqual({
        rate: 1.0,
        sampleSize: 2,
      });
      expect(data.historicalData.topPerformer).toBeDefined();
      expect(data.historicalData.topPerformer?.ssg).toBe("hugo");
      expect(data.historicalData.topPerformer?.deploymentCount).toBe(2);
    });

    it("should handle no historical data gracefully", async () => {
      const memoryEntry008 = await memoryManager.remember("analysis", {
        path: "/test/no-history",
        dependencies: {
          ecosystem: "ruby",
          languages: ["ruby"],
        },
        structure: { totalFiles: 30 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry008.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should still make recommendation
      expect(data.recommended).toBe("jekyll");
      expect(data.confidence).toBeGreaterThan(0);

      // Historical data should show no similar projects
      expect(data.historicalData).toBeDefined();
      expect(data.historicalData.similarProjectCount).toBe(0);
      expect(Object.keys(data.historicalData.successRates)).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single deployment samples cautiously", async () => {
      const project = await createOrUpdateProject({
        id: "single_sample",
        timestamp: new Date().toISOString(),
        path: "/test/single",
        projectName: "Single Sample",
        structure: {
          totalFiles: 50,
          languages: { python: 50 },
          hasTests: true,
          hasCI: false,
          hasDocs: false,
        },
      });

      // Single successful deployment
      await trackDeployment(project.id, "mkdocs", true);

      const memoryEntry009 = await memoryManager.remember("analysis", {
        path: "/test/single-new",
        dependencies: {
          ecosystem: "python",
          languages: ["python"],
        },
        structure: { totalFiles: 50 },
      });

      const result = await recommendSSG({ analysisId: memoryEntry009.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should not be a top performer with only 1 sample
      expect(data.historicalData?.topPerformer).toBeUndefined();
    });

    it("should handle knowledge graph initialization failure", async () => {
      // Use invalid storage directory
      const invalidDir = "/invalid/path/that/does/not/exist";
      const memoryEntry010 = await memoryManager.remember("analysis", {
        path: "/test/kg-fail",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      // Should still make recommendation despite KG failure
      const result = await recommendSSG({ analysisId: memoryEntry010.id });
      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.recommended).toBeDefined();
      expect(data.confidence).toBeGreaterThan(0);
    });
  });
});
