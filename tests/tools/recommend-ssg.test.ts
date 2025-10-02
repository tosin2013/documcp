/**
 * Test suite for SSG Recommendation Tool
 */

import { jest } from "@jest/globals";
import { recommendSSG } from "../../src/tools/recommend-ssg.js";

// Mock the memory and KG integration
jest.mock("../../src/memory/kg-integration.js", () => ({
  getMemoryManager: jest.fn(),
  getKnowledgeGraph: jest.fn(),
  getUserPreferenceManager: jest.fn(),
  getProjectContext: jest.fn(),
  saveKnowledgeGraph: (jest.fn() as any).mockResolvedValue(undefined),
}));

describe("recommendSSG", () => {
  let mockManager: any;
  let mockKG: any;
  let mockPreferenceManager: any;

  beforeEach(() => {
    mockManager = {
      recall: jest.fn() as any,
    } as any;

    mockKG = {
      findNode: (jest.fn() as any).mockResolvedValue(null),
      findNodes: (jest.fn() as any).mockResolvedValue([]),
      findEdges: (jest.fn() as any).mockResolvedValue([]),
      getAllNodes: (jest.fn() as any).mockResolvedValue([]),
      addNode: (jest.fn() as any).mockImplementation((node: any) => node),
      addEdge: (jest.fn() as any).mockReturnValue(undefined),
    } as any;

    mockPreferenceManager = {
      getPreference: (jest.fn() as any).mockResolvedValue(null),
    } as any;

    const {
      getMemoryManager,
      getKnowledgeGraph,
      getUserPreferenceManager,
      getProjectContext,
    } = require("../../src/memory/kg-integration.js");

    getMemoryManager.mockResolvedValue(mockManager);
    getKnowledgeGraph.mockResolvedValue(mockKG);
    getUserPreferenceManager.mockResolvedValue(mockPreferenceManager);
    getProjectContext.mockResolvedValue({
      previousAnalyses: 0,
      lastAnalyzed: null,
      knownTechnologies: [],
      similarProjects: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation", () => {
    it("should validate required analysisId parameter", async () => {
      await expect(recommendSSG({})).rejects.toThrow();
    });

    it("should validate analysisId as string", async () => {
      await expect(recommendSSG({ analysisId: 123 })).rejects.toThrow();
    });

    it("should accept valid preferences", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: {
          priority: "simplicity",
          ecosystem: "javascript",
        },
      });

      expect(result.content).toBeDefined();
    });

    it("should reject invalid priority preference", async () => {
      await expect(
        recommendSSG({
          analysisId: "test-id",
          preferences: { priority: "invalid" },
        }),
      ).rejects.toThrow();
    });

    it("should reject invalid ecosystem preference", async () => {
      await expect(
        recommendSSG({
          analysisId: "test-id",
          preferences: { ecosystem: "invalid" },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Memory Integration", () => {
    it("should retrieve analysis from memory when available", async () => {
      const mockAnalysis = {
        data: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                repository: { language: "JavaScript" },
                complexity: "low",
                size: "small",
              }),
            },
          ],
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(mockManager.recall).toHaveBeenCalledWith("test-id");
      expect(result.content).toBeDefined();
    });

    it("should handle missing analysis gracefully", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "non-existent-id",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
    });

    it("should handle analysis with direct data structure", async () => {
      const mockAnalysis = {
        data: {
          repository: { language: "Python" },
          complexity: "medium",
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });

    it("should handle corrupted analysis data", async () => {
      const mockAnalysis = {
        data: {
          content: [
            {
              type: "text",
              text: "invalid json",
            },
          ],
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });
  });

  describe("SSG Recommendations", () => {
    it("should recommend Jekyll for Ruby projects", async () => {
      const mockAnalysis = {
        data: {
          dependencies: {
            ecosystem: "ruby",
          },
          complexity: "low",
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("jekyll");
    });

    it("should recommend Hugo for Go projects", async () => {
      const mockAnalysis = {
        data: {
          dependencies: {
            ecosystem: "go",
          },
          complexity: "medium",
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("hugo");
    });

    it("should recommend Docusaurus for JavaScript projects", async () => {
      const mockAnalysis = {
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          documentation: {
            estimatedComplexity: "complex",
          },
          recommendations: {
            teamSize: "large",
          },
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("docusaurus");
    });

    it("should recommend MkDocs for Python projects", async () => {
      const mockAnalysis = {
        data: {
          dependencies: {
            ecosystem: "python",
          },
          complexity: "medium",
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("mkdocs");
    });

    it("should recommend Eleventy for simple JavaScript projects with simplicity priority", async () => {
      const mockAnalysis = {
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          documentation: {
            estimatedComplexity: "simple",
          },
          recommendations: {
            teamSize: "small",
          },
        },
      };

      mockManager.recall.mockResolvedValue(mockAnalysis);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: { priority: "simplicity" },
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("eleventy");
    });
  });

  describe("Preference-based Recommendations", () => {
    it("should prioritize simplicity when requested", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: { priority: "simplicity" },
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(["jekyll", "eleventy"]).toContain(recommendation.recommended);
    });

    it("should consider ecosystem preferences", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: { ecosystem: "javascript" },
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(["docusaurus", "eleventy"]).toContain(recommendation.recommended);
    });

    it("should handle performance preference with fallback", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: { priority: "performance" },
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("docusaurus");
    });

    it("should handle features preference with fallback", async () => {
      mockManager.recall.mockResolvedValue(null);

      const result = await recommendSSG({
        analysisId: "test-id",
        preferences: { priority: "features" },
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("docusaurus");
    });
  });

  describe("Scoring and Alternatives", () => {
    it("should provide confidence scores", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          complexity: "medium",
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    it("should provide alternative recommendations", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          complexity: "medium",
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.alternatives).toBeDefined();
      expect(Array.isArray(recommendation.alternatives)).toBe(true);
      expect(recommendation.alternatives.length).toBeGreaterThan(0);
    });

    it("should include pros and cons for alternatives", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "python",
          },
          complexity: "medium",
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      const alternative = recommendation.alternatives[0];

      expect(alternative.name).toBeDefined();
      expect(alternative.score).toBeDefined();
      expect(Array.isArray(alternative.pros)).toBe(true);
      expect(Array.isArray(alternative.cons)).toBe(true);
    });

    it("should sort alternatives by score", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          documentation: {
            estimatedComplexity: "complex",
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      const scores = recommendation.alternatives.map((alt: any) => alt.score);

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });
  });

  describe("Complex Project Analysis", () => {
    it("should handle projects with React packages", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
            packages: ["react", "next"],
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBe("docusaurus");
      expect(recommendation.reasoning.length).toBeGreaterThan(0);
    });

    it("should consider project size in recommendations", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          structure: {
            totalFiles: 150, // Large project
          },
          documentation: {
            estimatedComplexity: "complex",
            hasReadme: true,
            hasDocs: true,
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.confidence).toBeGreaterThan(0.85); // Should have higher confidence with more data
    });

    it("should handle missing ecosystem information", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "unknown",
          },
          documentation: {
            estimatedComplexity: "moderate",
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBeDefined();
    });

    it("should consider existing documentation structure", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "javascript",
          },
          documentation: {
            hasReadme: true,
            hasDocs: true,
            estimatedComplexity: "moderate",
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.confidence).toBeGreaterThan(0.85); // Higher confidence with documentation
    });
  });

  describe("Memory Error Handling", () => {
    it("should handle memory initialization failure", async () => {
      const {
        getMemoryManager,
      } = require("../../src/memory/kg-integration.js");
      getMemoryManager.mockRejectedValue(new Error("Memory failed"));

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");

      // Reset the mock
      getMemoryManager.mockResolvedValue(mockManager);
    });

    it("should handle memory recall failure", async () => {
      mockManager.recall.mockRejectedValue(new Error("Recall failed"));

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });

    it("should handle corrupted memory data", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          content: [
            {
              type: "text",
              text: '{"invalid": json}',
            },
          ],
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });
  });

  describe("Performance and Timing", () => {
    it("should complete recommendation in reasonable time", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          repository: { language: "JavaScript" },
          complexity: "medium",
        },
      });

      const start = Date.now();
      await recommendSSG({
        analysisId: "test-id",
      });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should include execution time in response", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          repository: { language: "JavaScript" },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content[1].text).toContain("Execution completed in");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null analysis data", async () => {
      mockManager.recall.mockResolvedValue({
        data: null,
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });

    it("should handle empty analysis data", async () => {
      mockManager.recall.mockResolvedValue({
        data: {},
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result.content).toBeDefined();
    });

    it("should handle analysis without dependency data", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          documentation: {
            estimatedComplexity: "moderate",
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBeDefined();
    });

    it("should handle unknown programming languages", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          dependencies: {
            ecosystem: "unknown",
          },
          documentation: {
            estimatedComplexity: "moderate",
          },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);
      expect(recommendation.recommended).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("should return properly formatted MCP response", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          repository: { language: "JavaScript" },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      expect(result).toHaveProperty("content");
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty("type");
      expect(result.content[0]).toHaveProperty("text");
    });

    it("should include all required recommendation fields", async () => {
      mockManager.recall.mockResolvedValue({
        data: {
          repository: { language: "Python" },
        },
      });

      const result = await recommendSSG({
        analysisId: "test-id",
      });

      const recommendation = JSON.parse(result.content[0].text);

      expect(recommendation).toHaveProperty("recommended");
      expect(recommendation).toHaveProperty("confidence");
      expect(recommendation).toHaveProperty("reasoning");
      expect(recommendation).toHaveProperty("alternatives");
      expect(result.content[1].text).toContain("Execution completed in");
    });
  });
});
