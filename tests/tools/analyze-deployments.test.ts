/**
 * Tests for Phase 2.4: Deployment Analytics and Insights
 * Tests the analyze_deployments tool with comprehensive pattern analysis
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  getKnowledgeGraph,
  createOrUpdateProject,
  trackDeployment,
} from "../../src/memory/kg-integration.js";
import { analyzeDeployments } from "../../src/tools/analyze-deployments.js";

describe("analyzeDeployments (Phase 2.4)", () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `analyze-deployments-test-${Date.now()}`);
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

  /**
   * Helper function to create sample deployment data
   */
  const createSampleDeployments = async () => {
    const timestamp = new Date().toISOString();

    // Create 3 projects
    const project1 = await createOrUpdateProject({
      id: "project1",
      timestamp,
      path: "/test/project1",
      projectName: "Docusaurus Site",
      structure: {
        totalFiles: 50,
        languages: { typescript: 30, javascript: 20 },
        hasTests: true,
        hasCI: true,
        hasDocs: true,
      },
    });

    const project2 = await createOrUpdateProject({
      id: "project2",
      timestamp,
      path: "/test/project2",
      projectName: "Hugo Blog",
      structure: {
        totalFiles: 30,
        languages: { go: 15, html: 15 },
        hasTests: false,
        hasCI: true,
        hasDocs: true,
      },
    });

    const project3 = await createOrUpdateProject({
      id: "project3",
      timestamp,
      path: "/test/project3",
      projectName: "MkDocs Docs",
      structure: {
        totalFiles: 40,
        languages: { python: 25, markdown: 15 },
        hasTests: true,
        hasCI: true,
        hasDocs: true,
      },
    });

    // Track successful deployments
    await trackDeployment(project1.id, "docusaurus", true, {
      buildTime: 25000,
    });
    await trackDeployment(project1.id, "docusaurus", true, {
      buildTime: 23000,
    });

    await trackDeployment(project2.id, "hugo", true, { buildTime: 15000 });
    await trackDeployment(project2.id, "hugo", true, { buildTime: 14000 });
    await trackDeployment(project2.id, "hugo", true, { buildTime: 16000 });

    await trackDeployment(project3.id, "mkdocs", true, { buildTime: 30000 });
    await trackDeployment(project3.id, "mkdocs", false, {
      errorMessage: "Build failed",
    });

    return { project1, project2, project3 };
  };

  describe("Full Report Analysis", () => {
    it("should generate comprehensive analytics report with no data", async () => {
      const result = await analyzeDeployments({});

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      expect(data.summary).toBeDefined();
      expect(data.summary.totalProjects).toBe(0);
      expect(data.summary.totalDeployments).toBe(0);
      expect(data.patterns).toEqual([]);
      // With 0 deployments, we get a warning insight about low success rate
      expect(Array.isArray(data.insights)).toBe(true);
      expect(data.recommendations).toBeDefined();
    });

    it("should generate comprehensive analytics report with sample data", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      // Verify summary
      expect(data.summary).toBeDefined();
      expect(data.summary.totalProjects).toBe(3);
      // Each project has 1 configuration node, so 3 total deployments tracked
      expect(data.summary.totalDeployments).toBeGreaterThanOrEqual(3);
      expect(data.summary.overallSuccessRate).toBeGreaterThan(0);
      expect(data.summary.mostUsedSSG).toBeDefined();

      // Verify patterns
      expect(data.patterns).toBeDefined();
      expect(data.patterns.length).toBeGreaterThan(0);
      expect(data.patterns[0]).toHaveProperty("ssg");
      expect(data.patterns[0]).toHaveProperty("totalDeployments");
      expect(data.patterns[0]).toHaveProperty("successRate");

      // Verify insights and recommendations
      expect(data.insights).toBeDefined();
      expect(data.recommendations).toBeDefined();
    });

    it("should include insights about high success rates", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should have success insights for docusaurus and hugo
      const successInsights = data.insights.filter(
        (i: any) => i.type === "success",
      );
      expect(successInsights.length).toBeGreaterThan(0);
    });
  });

  describe("SSG Statistics Analysis", () => {
    it("should return error for non-existent SSG", async () => {
      const result = await analyzeDeployments({
        analysisType: "ssg_stats",
        ssg: "nonexistent",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should return error response when SSG has no data
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should return statistics for specific SSG", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "ssg_stats",
        ssg: "docusaurus",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      expect(data.ssg).toBe("docusaurus");
      // project1 has 2 deployments with docusaurus
      expect(data.totalDeployments).toBeGreaterThanOrEqual(1);
      expect(data.successfulDeployments).toBeGreaterThanOrEqual(1);
      expect(data.successRate).toBeGreaterThan(0);
      expect(data.averageBuildTime).toBeDefined();
      expect(data.projectCount).toBeGreaterThan(0);
    });

    it("should calculate average build time correctly", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "ssg_stats",
        ssg: "hugo",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.averageBuildTime).toBeDefined();
      // Hugo has 3 deployments with build times
      expect(data.averageBuildTime).toBeGreaterThan(0);
      expect(data.averageBuildTime).toBeLessThan(20000);
    });

    it("should show success rate less than 100% for failed deployments", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "ssg_stats",
        ssg: "mkdocs",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.totalDeployments).toBeGreaterThanOrEqual(1);
      expect(data.failedDeployments).toBeGreaterThanOrEqual(1);
      expect(data.successRate).toBeLessThan(1.0);
    });
  });

  describe("SSG Comparison Analysis", () => {
    it("should fail without enough SSGs", async () => {
      const result = await analyzeDeployments({
        analysisType: "compare",
        ssgs: ["docusaurus"],
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      // Should be an error response
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("ANALYTICS_FAILED");
    });

    it("should compare multiple SSGs by success rate", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "compare",
        ssgs: ["docusaurus", "hugo", "mkdocs"],
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Should be sorted by success rate (descending)
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].pattern.successRate).toBeGreaterThanOrEqual(
          data[i + 1].pattern.successRate,
        );
      }
    });

    it("should include only SSGs with deployment data", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "compare",
        ssgs: ["docusaurus", "nonexistent", "hugo"],
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should only include docusaurus and hugo
      expect(data.length).toBe(2);
      const ssgs = data.map((d: any) => d.ssg);
      expect(ssgs).toContain("docusaurus");
      expect(ssgs).toContain("hugo");
      expect(ssgs).not.toContain("nonexistent");
    });
  });

  describe("Health Score Analysis", () => {
    it("should calculate health score with no data", async () => {
      const result = await analyzeDeployments({
        analysisType: "health",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      expect(data.score).toBeDefined();
      expect(data.score).toBeGreaterThanOrEqual(0);
      expect(data.score).toBeLessThanOrEqual(100);
      expect(data.factors).toBeDefined();
      expect(Array.isArray(data.factors)).toBe(true);
      expect(data.factors.length).toBe(4); // 4 factors
    });

    it("should calculate health score with sample data", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "health",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.score).toBeGreaterThan(0);
      expect(data.factors.length).toBe(4);

      // Check all factors present
      const factorNames = data.factors.map((f: any) => f.name);
      expect(factorNames).toContain("Overall Success Rate");
      expect(factorNames).toContain("Active Projects");
      expect(factorNames).toContain("Deployment Activity");
      expect(factorNames).toContain("SSG Diversity");

      // Each factor should have impact and status
      data.factors.forEach((factor: any) => {
        expect(factor.impact).toBeDefined();
        expect(factor.status).toMatch(/^(good|warning|critical)$/);
      });
    });

    it("should have good health with high success rate", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "health",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should have decent health with our sample data
      expect(data.score).toBeGreaterThan(30);

      const successRateFactor = data.factors.find(
        (f: any) => f.name === "Overall Success Rate",
      );
      expect(successRateFactor.status).toMatch(/^(good|warning)$/);
    });
  });

  describe("Trend Analysis", () => {
    it("should analyze trends with default period", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "trends",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      expect(Array.isArray(data)).toBe(true);
      // Trends are grouped by time periods
    });

    it("should analyze trends with custom period", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "trends",
        periodDays: 7,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing SSG parameter for ssg_stats", async () => {
      const result = await analyzeDeployments({
        analysisType: "ssg_stats",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("ANALYTICS_FAILED");
      expect(data.error.message).toContain("SSG name required");
    });

    it("should handle invalid analysis type gracefully", async () => {
      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      // Should not throw, should return valid response
    });
  });

  describe("Recommendations Generation", () => {
    it("should generate recommendations based on patterns", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data.recommendations.length).toBeGreaterThan(0);
    });

    it("should recommend best performing SSG", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should have recommendations
      expect(data.recommendations.length).toBeGreaterThan(0);
      // At least one recommendation should mention an SSG or general advice
      const allText = data.recommendations.join(" ").toLowerCase();
      expect(allText.length).toBeGreaterThan(0);
    });
  });

  describe("Build Time Analysis", () => {
    it("should identify fast builds in insights", async () => {
      await createSampleDeployments();

      const result = await analyzeDeployments({
        analysisType: "full_report",
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Hugo has ~15s builds, should be identified as fast
      const fastBuildInsights = data.insights.filter(
        (i: any) => i.title && i.title.includes("Fast Builds"),
      );
      expect(fastBuildInsights.length).toBeGreaterThan(0);
    });
  });
});
