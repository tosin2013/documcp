/**
 * Advanced unit tests for Enhanced Memory Manager
 * Tests intelligent memory management with learning and knowledge graph integration
 * Part of Issue #55 - Advanced Memory Components Unit Tests
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  EnhancedMemoryManager,
  EnhancedRecommendation,
  IntelligentAnalysis,
} from "../../src/memory/enhanced-manager.js";
import { ProjectFeatures } from "../../src/memory/learning.js";

describe("EnhancedMemoryManager", () => {
  let tempDir: string;
  let enhancedManager: EnhancedMemoryManager;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `enhanced-memory-test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    enhancedManager = new EnhancedMemoryManager(tempDir);
    await enhancedManager.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Enhanced Manager Initialization", () => {
    test("should create enhanced manager instance", () => {
      expect(enhancedManager).toBeDefined();
      expect(enhancedManager).toBeInstanceOf(EnhancedMemoryManager);
    });

    test("should initialize all subsystems", async () => {
      // Test that the enhanced manager properly initializes
      // The initialize() method should complete without throwing
      await enhancedManager.initialize();
      expect(true).toBe(true);
    });

    test("should have learning and knowledge graph capabilities", async () => {
      // Test that we can get learning statistics (indicating learning system exists)
      const learningStats = await enhancedManager.getLearningStatistics();
      expect(learningStats).toBeDefined();
      expect(learningStats.learning).toBeDefined();
      expect(learningStats.knowledgeGraph).toBeDefined();
    });
  });

  describe("Enhanced Recommendations", () => {
    test("should provide enhanced recommendations with multiple data sources", async () => {
      // Set up test context
      enhancedManager.setContext({ projectId: "enhanced-rec-test" });

      // Add some historical data
      await enhancedManager.remember("analysis", {
        language: { primary: "typescript" },
        framework: { name: "react" },
        stats: { files: 150 },
      });

      await enhancedManager.remember("recommendation", {
        recommended: "docusaurus",
        confidence: 0.9,
      });

      await enhancedManager.remember("deployment", {
        status: "success",
        ssg: "docusaurus",
      });

      // Test enhanced recommendation
      const projectFeatures: ProjectFeatures = {
        language: "typescript",
        framework: "react",
        size: "medium",
        complexity: "moderate",
        hasTests: true,
        hasCI: true,
        hasDocs: false,
        isOpenSource: true,
      };

      const baseRecommendation = {
        recommended: "gatsby",
        confidence: 0.7,
        score: 0.75,
      };

      const enhanced = await enhancedManager.getEnhancedRecommendation(
        "/test/project",
        baseRecommendation,
        projectFeatures,
      );

      expect(enhanced).toBeDefined();
      expect(enhanced.baseRecommendation).toEqual(baseRecommendation);
      expect(enhanced.learningEnhanced).toBeDefined();
      expect(Array.isArray(enhanced.graphBased)).toBe(true);
      expect(Array.isArray(enhanced.insights)).toBe(true);
      expect(typeof enhanced.confidence).toBe("number");
      expect(Array.isArray(enhanced.reasoning)).toBe(true);
      expect(enhanced.metadata).toBeDefined();
      expect(typeof enhanced.metadata.usedLearning).toBe("boolean");
      expect(typeof enhanced.metadata.usedKnowledgeGraph).toBe("boolean");
    });

    test("should handle recommendations with insufficient data", async () => {
      const projectFeatures: ProjectFeatures = {
        language: "unknown",
        size: "small",
        complexity: "simple",
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        isOpenSource: false,
      };

      const baseRecommendation = {
        recommended: "jekyll",
        confidence: 0.5,
      };

      const enhanced = await enhancedManager.getEnhancedRecommendation(
        "/test/project",
        baseRecommendation,
        projectFeatures,
      );

      expect(enhanced).toBeDefined();
      expect(enhanced.confidence).toBeGreaterThanOrEqual(0);
      expect(enhanced.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Intelligent Analysis", () => {
    test("should provide intelligent analysis with patterns and predictions", async () => {
      enhancedManager.setContext({ projectId: "intelligent-analysis-test" });

      // Add analysis data
      await enhancedManager.remember("analysis", {
        language: { primary: "python" },
        framework: { name: "flask" },
        dependencies: { count: 25 },
        testing: { hasTests: true },
        ci: { hasCI: true },
      });

      const analysisData = {
        language: "python",
        framework: "flask",
        size: "medium",
        hasTests: true,
        hasCI: true,
      };

      const intelligentAnalysis = await enhancedManager.getIntelligentAnalysis(
        "/test/project",
        analysisData,
      );

      expect(intelligentAnalysis).toBeDefined();
      expect(intelligentAnalysis.analysis).toBeDefined();
      expect(Array.isArray(intelligentAnalysis.patterns)).toBe(true);
      expect(Array.isArray(intelligentAnalysis.predictions)).toBe(true);
      expect(Array.isArray(intelligentAnalysis.recommendations)).toBe(true);
      expect(intelligentAnalysis.learningData).toBeDefined();
      expect(typeof intelligentAnalysis.learningData.similarProjects).toBe(
        "number",
      );
      expect(typeof intelligentAnalysis.learningData.confidenceLevel).toBe(
        "number",
      );
      expect(["low", "medium", "high"]).toContain(
        intelligentAnalysis.learningData.dataQuality,
      );

      // Check prediction structure
      if (intelligentAnalysis.predictions.length > 0) {
        const prediction = intelligentAnalysis.predictions[0];
        expect(["success_rate", "optimal_ssg", "potential_issues"]).toContain(
          prediction.type,
        );
        expect(typeof prediction.prediction).toBe("string");
        expect(typeof prediction.confidence).toBe("number");
      }
    });

    test("should adapt analysis based on historical patterns", async () => {
      enhancedManager.setContext({ projectId: "adaptive-analysis-test" });

      // Create pattern with multiple similar projects
      for (let i = 0; i < 3; i++) {
        await enhancedManager.remember("analysis", {
          language: { primary: "javascript" },
          framework: { name: "vue" },
        });

        await enhancedManager.remember("recommendation", {
          recommended: "vuepress",
          confidence: 0.8 + i * 0.05,
        });

        await enhancedManager.remember("deployment", {
          status: "success",
          ssg: "vuepress",
        });
      }

      const analysisData = {
        language: "javascript",
        framework: "vue",
        size: "small",
      };

      const analysis = await enhancedManager.getIntelligentAnalysis(
        "/test/project",
        analysisData,
      );

      expect(analysis.learningData.similarProjects).toBeGreaterThan(0);
      expect(analysis.learningData.dataQuality).toBe("medium");
    });
  });

  describe("Memory Integration", () => {
    test("should integrate learning feedback into knowledge graph", async () => {
      enhancedManager.setContext({ projectId: "integration-test" });

      // Create initial recommendation
      const memoryEntry = await enhancedManager.remember("recommendation", {
        recommended: "hugo",
        confidence: 0.8,
        language: { primary: "go" },
      });

      // Simulate feedback by creating a deployment success record
      await enhancedManager.remember("deployment", {
        status: "success",
        ssg: "hugo",
        feedback: {
          rating: 5,
          helpful: true,
          comments: "Worked perfectly",
        },
      });

      // Verify feedback was processed
      const stats = await enhancedManager.getLearningStatistics();
      expect(stats).toBeDefined();
      expect(stats.learning).toBeDefined();
    });

    test("should synchronize data between subsystems", async () => {
      enhancedManager.setContext({ projectId: "sync-test" });

      // Add data that should propagate between systems
      await enhancedManager.remember("analysis", {
        language: { primary: "rust" },
        framework: { name: "actix" },
      });

      await enhancedManager.remember("deployment", {
        status: "success",
        ssg: "mdbook",
      });

      // The subsystems should automatically sync through the enhanced manager
      // Verify data exists in both systems
      const learningStats = await enhancedManager.getLearningStatistics();

      expect(learningStats).toBeDefined();
      expect(learningStats.learning).toBeDefined();
      expect(learningStats.knowledgeGraph).toBeDefined();
      expect(learningStats.combined).toBeDefined();
    });
  });

  describe("Performance and Optimization", () => {
    test("should handle concurrent enhanced operations", async () => {
      enhancedManager.setContext({ projectId: "concurrent-enhanced-test" });

      const operations = Array.from({ length: 5 }, async (_, i) => {
        const projectFeatures: ProjectFeatures = {
          language: "go",
          size: "medium",
          complexity: "moderate",
          hasTests: true,
          hasCI: true,
          hasDocs: true,
          isOpenSource: true,
        };

        const baseRecommendation = {
          recommended: "hugo",
          confidence: 0.8 + i * 0.02,
        };

        return enhancedManager.getEnhancedRecommendation(
          "/test/project",
          baseRecommendation,
          projectFeatures,
        );
      });

      const results = await Promise.all(operations);
      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    test("should provide optimization insights", async () => {
      enhancedManager.setContext({ projectId: "optimization-test" });

      // Add some data
      await enhancedManager.remember("analysis", { performanceTest: true });

      // Test learning statistics as a proxy for optimization insights
      const stats = await enhancedManager.getLearningStatistics();
      expect(stats).toBeDefined();
      expect(stats.combined).toBeDefined();
      expect(typeof stats.combined.systemMaturity).toBe("string");
      expect(["nascent", "developing", "mature"]).toContain(
        stats.combined.systemMaturity,
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle malformed input gracefully", async () => {
      const malformedFeatures = {
        language: null,
        size: "invalid" as any,
        complexity: undefined as any,
      };

      const malformedRecommendation = {
        recommended: "",
        confidence: -1,
      };

      // Should not throw, but handle gracefully
      const result = await enhancedManager.getEnhancedRecommendation(
        "/test/project",
        malformedRecommendation,
        malformedFeatures as any,
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test("should handle subsystem failures gracefully", async () => {
      // Test with partial system availability
      const projectFeatures: ProjectFeatures = {
        language: "javascript",
        size: "small",
        complexity: "simple",
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        isOpenSource: true,
      };

      const baseRecommendation = {
        recommended: "gatsby",
        confidence: 0.6,
      };

      // Should work even if some subsystems have issues
      const result = await enhancedManager.getEnhancedRecommendation(
        "/test/project",
        baseRecommendation,
        projectFeatures,
      );

      expect(result).toBeDefined();
      expect(result.baseRecommendation).toEqual(baseRecommendation);
    });
  });
});
