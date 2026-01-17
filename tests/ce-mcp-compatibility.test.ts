/**
 * CE-MCP Compatibility Tests (ADR-011)
 *
 * Validates documcp's compatibility with Code Execution with MCP (CE-MCP)
 * paradigm, ensuring optimal performance in Code Mode workflows.
 *
 * Reference: docs/adrs/adr-0011-ce-mcp-compatibility.md
 */

import { describe, it, expect } from "@jest/globals";
import {
  TOOL_METADATA,
  getToolMetadata,
  getToolsByCategory,
  getToolsByComplexity,
  getParallelizableTools,
  getSuggestedWorkflow,
  estimateWorkflowTokens,
  getLargeResultTools,
} from "../src/types/tool-metadata.js";
import {
  summarizeResult,
  createResourceResult,
  shouldSummarize,
  calculateTokenSavings,
  summarizeBatch,
} from "../src/utils/result-summarizer.js";

describe("CE-MCP Compatibility", () => {
  describe("Tool Metadata System", () => {
    it("should provide metadata for all core tools", () => {
      const coreTools = [
        "analyze_repository",
        "recommend_ssg",
        "generate_config",
        "setup_structure",
        "deploy_pages",
        "validate_diataxis_content",
      ];

      coreTools.forEach((toolName) => {
        const metadata = getToolMetadata(toolName);
        expect(metadata).toBeDefined();
        expect(metadata?.category).toBeDefined();
        expect(metadata?.complexity).toBeDefined();
        expect(metadata?.estimatedTokens).toBeGreaterThan(0);
      });
    });

    it("should categorize tools correctly", () => {
      const analysisTools = getToolsByCategory("analysis");
      expect(analysisTools).toContain("analyze_repository");
      expect(analysisTools).toContain("detect_documentation_gaps");

      const generationTools = getToolsByCategory("generation");
      expect(generationTools).toContain("recommend_ssg");
      expect(generationTools).toContain("generate_config");

      const deploymentTools = getToolsByCategory("deployment");
      expect(deploymentTools).toContain("deploy_pages");
      expect(deploymentTools).toContain("verify_deployment");
    });

    it("should identify parallelizable tools", () => {
      const parallelizable = getParallelizableTools();

      // Analysis tools should be parallelizable
      expect(parallelizable).toContain("analyze_repository");
      expect(parallelizable).toContain("detect_documentation_gaps");

      // Deployment tools should NOT be parallelizable
      expect(parallelizable).not.toContain("deploy_pages");
    });

    it("should provide complexity ratings", () => {
      const simpleTools = getToolsByComplexity("simple");
      const complexTools = getToolsByComplexity("complex");

      expect(simpleTools.length).toBeGreaterThan(0);
      expect(complexTools.length).toBeGreaterThan(0);

      // Verify specific complexity ratings
      expect(simpleTools).toContain("read_directory");
      expect(complexTools).toContain("populate_diataxis_content");
    });

    it("should suggest logical workflows", () => {
      const workflow = getSuggestedWorkflow("recommend_ssg");

      // Should include dependency
      expect(workflow).toContain("analyze_repository");

      // Should include the tool itself
      expect(workflow).toContain("recommend_ssg");

      // Should include follow-ups
      expect(
        workflow.some(
          (tool) => tool === "generate_config" || tool === "setup_structure",
        ),
      ).toBe(true);
    });

    it("should estimate workflow token usage", () => {
      const workflow = [
        "analyze_repository",
        "recommend_ssg",
        "generate_config",
      ];
      const totalTokens = estimateWorkflowTokens(workflow);

      expect(totalTokens).toBeGreaterThan(0);
      expect(totalTokens).toBeLessThan(5000); // Reasonable upper bound
    });

    it("should identify large result tools", () => {
      const largeResultTools = getLargeResultTools();

      expect(largeResultTools).toContain("analyze_repository");
      expect(largeResultTools).toContain("detect_documentation_gaps");
      expect(largeResultTools).toContain("validate_diataxis_content");

      // Small result tools should not be included
      expect(largeResultTools).not.toContain("read_directory");
    });

    it("should have consistent metadata structure", () => {
      Object.entries(TOOL_METADATA).forEach(([toolName, metadata]) => {
        expect(metadata).toHaveProperty("category");
        expect(metadata).toHaveProperty("complexity");
        expect(metadata).toHaveProperty("estimatedTokens");
        expect(metadata).toHaveProperty("suggestedUse");
        expect(metadata).toHaveProperty("typicalExecutionMs");
        expect(metadata).toHaveProperty("returnsLargeResults");
        expect(metadata).toHaveProperty("parallelizable");

        // Validate types
        expect(typeof metadata.category).toBe("string");
        expect(typeof metadata.complexity).toBe("string");
        expect(typeof metadata.estimatedTokens).toBe("number");
        expect(typeof metadata.suggestedUse).toBe("string");
        expect(typeof metadata.typicalExecutionMs).toBe("number");
        expect(typeof metadata.returnsLargeResults).toBe("boolean");
        expect(typeof metadata.parallelizable).toBe("boolean");
      });
    });
  });

  describe("Result Summarization", () => {
    it("should summarize large analysis results", () => {
      const largeResult = {
        fileCount: 150,
        directoryCount: 25,
        primaryLanguage: "TypeScript",
        totalLines: 50000,
        complexity: "moderate",
        files: new Array(150).fill({ path: "/some/path", size: 1000 }),
      };

      const summarized = summarizeResult(
        largeResult,
        "analyze_repository",
        "documcp://analyze_repository/abc123",
      );

      expect(summarized.summary).toBeDefined();
      expect(summarized.summary.length).toBeLessThan(1000);
      expect(summarized.resourceUri).toBe(
        "documcp://analyze_repository/abc123",
      );
      expect(summarized.hasFullResult).toBe(true);
      expect(summarized.metrics).toBeDefined();
      expect(summarized.metrics?.fileCount).toBe(150);
    });

    it("should not summarize small results", () => {
      const smallResult = {
        status: "success",
        message: "Operation complete",
      };

      const summarized = summarizeResult(smallResult, "read_directory");

      expect(summarized.hasFullResult).toBe(true);
      expect(summarized.fullResult).toEqual(smallResult);
      expect(summarized.resourceUri).toBeUndefined();
    });

    it("should detect when summarization is needed", () => {
      const largeData = { data: new Array(10000).fill("x").join("") };
      const smallData = { status: "ok" };

      expect(shouldSummarize(largeData)).toBe(true);
      expect(shouldSummarize(smallData)).toBe(false);

      // Tool-based detection
      expect(shouldSummarize(smallData, "analyze_repository")).toBe(true);
      expect(shouldSummarize(smallData, "read_directory")).toBe(false);
    });

    it("should extract relevant metrics from validation results", () => {
      const validationResult = {
        totalIssues: 15,
        errors: 3,
        warnings: 12,
        filesChecked: 50,
        overallScore: 87,
        details: new Array(100).fill({ issue: "something" }),
      };

      const summarized = summarizeResult(
        validationResult,
        "validate_diataxis_content",
      );

      expect(summarized.metrics).toBeDefined();
      expect(summarized.metrics?.totalIssues).toBe(15);
      expect(summarized.metrics?.errors).toBe(3);
      expect(summarized.metrics?.overallScore).toBe(87);
    });

    it("should create resource-based results", () => {
      const result = { data: "large result" };
      const resourceResult = createResourceResult(
        result,
        "analyze_repository",
        "test-id-123",
      );

      expect(resourceResult.resourceUri).toBe(
        "documcp://analyze_repository/test-id-123",
      );
      expect(resourceResult.summary).toBeDefined();
      expect(resourceResult.hasFullResult).toBe(true);
    });

    it("should batch summarize multiple results", () => {
      const results: Array<{
        result: any;
        toolName?: string;
        resourceUri?: string;
      }> = [
        { result: { status: "ok" }, toolName: "read_directory" },
        {
          result: { fileCount: 100 },
          toolName: "analyze_repository",
          resourceUri: "documcp://test/123",
        },
        {
          result: { totalIssues: 5 },
          toolName: "validate_content",
          resourceUri: "documcp://test/456",
        },
      ];

      const summarized = summarizeBatch(results);

      expect(summarized).toHaveLength(3);
      summarized.forEach((summary) => {
        expect(summary.summary).toBeDefined();
      });

      // First result is small, should have full result
      expect(summarized[0].hasFullResult).toBe(true);
      expect(summarized[0].fullResult).toBeDefined();

      // Second and third are large result tools with resource URIs
      expect(summarized[1].hasFullResult).toBe(true);
      expect(summarized[1].resourceUri).toBe("documcp://test/123");
      expect(summarized[2].hasFullResult).toBe(true);
      expect(summarized[2].resourceUri).toBe("documcp://test/456");
    });

    it("should calculate token savings accurately", () => {
      const originalSize = 10000;
      const summarySize = 500;

      const savings = calculateTokenSavings(originalSize, summarySize);

      expect(savings.savedTokens).toBe(9500);
      expect(savings.reductionPercent).toBe(95);
    });

    it("should generate tool-specific summaries", () => {
      const gapResult = {
        totalGaps: 12,
        criticalGaps: 3,
        coverage: 75,
        gaps: new Array(12).fill({ type: "missing" }),
      };

      const summarized = summarizeResult(
        gapResult,
        "detect_documentation_gaps",
      );

      expect(summarized.summary).toContain("12 gaps");
      expect(summarized.summary).toContain("3 critical");
      expect(summarized.summary).toContain("75%");
    });

    it("should respect custom summarization options", () => {
      const result = { data: "test" };

      const summarized = summarizeResult(result, "test_tool", undefined, {
        maxSummaryLength: 50,
        includeMetrics: false,
        forceSummarize: true,
      });

      expect(summarized.summary.length).toBeLessThanOrEqual(50);
      expect(summarized.metrics).toBeUndefined();
    });
  });

  describe("Code Mode Workflow Optimization", () => {
    it("should identify optimal parallel execution groups", () => {
      const parallelizable = getParallelizableTools();

      // These tools can run in parallel
      const analysisGroup = [
        "analyze_repository",
        "detect_documentation_gaps",
        "check_documentation_links",
      ].filter((tool) => parallelizable.includes(tool));

      expect(analysisGroup.length).toBeGreaterThan(0);
    });

    it("should estimate token reduction for workflows", () => {
      // Simulate a typical workflow
      const workflow = [
        "analyze_repository",
        "recommend_ssg",
        "generate_config",
        "setup_structure",
        "populate_diataxis_content",
      ];

      const totalTokens = estimateWorkflowTokens(workflow);

      // With summarization, we expect ~98% reduction
      const withoutSummarization = totalTokens * 50; // Assume 50x bloat from full results
      const withSummarization = totalTokens + 500; // Just summaries

      const savings = calculateTokenSavings(
        withoutSummarization,
        withSummarization,
      );

      expect(savings.reductionPercent).toBeGreaterThan(90);
    });

    it("should provide dependency information for orchestration", () => {
      const metadata = getToolMetadata("populate_diataxis_content");

      expect(metadata?.dependencies).toBeDefined();
      expect(metadata?.dependencies).toContain("setup_structure");
      expect(metadata?.dependencies).toContain("analyze_repository");
    });

    it("should suggest follow-up tools for workflows", () => {
      const metadata = getToolMetadata("analyze_repository");

      expect(metadata?.commonFollowUps).toBeDefined();
      expect(metadata?.commonFollowUps?.length).toBeGreaterThan(0);
    });

    it("should categorize tools by execution time", () => {
      const fastTools = Object.entries(TOOL_METADATA)
        .filter(([_, meta]) => meta.typicalExecutionMs < 1000)
        .map(([name]) => name);

      const slowTools = Object.entries(TOOL_METADATA)
        .filter(([_, meta]) => meta.typicalExecutionMs > 3000)
        .map(([name]) => name);

      expect(fastTools.length).toBeGreaterThan(0);
      expect(slowTools.length).toBeGreaterThan(0);

      // Fast tools should include utilities
      expect(fastTools).toContain("read_directory");

      // Slow tools should include complex operations
      expect(
        slowTools.some(
          (tool) => tool.includes("populate") || tool.includes("deploy"),
        ),
      ).toBe(true);
    });
  });

  describe("MCP Protocol Compliance", () => {
    it("should maintain stateless operation", () => {
      // All tools should be stateless (no session state)
      // This is validated by the architecture - tools don't share state
      const metadata = getToolMetadata("analyze_repository");

      // Metadata should not reference any session or state management
      expect(metadata?.suggestedUse).not.toContain("session");
      expect(metadata?.suggestedUse).not.toContain("state");
    });

    it("should support composable tool workflows", () => {
      // Verify tools can be composed without conflicts
      const workflow1 = getSuggestedWorkflow("analyze_repository");
      const workflow2 = getSuggestedWorkflow("recommend_ssg");

      // Workflows should overlap (composable)
      const overlap = workflow1.filter((tool) => workflow2.includes(tool));
      expect(overlap.length).toBeGreaterThan(0);
    });

    it("should provide comprehensive tool coverage", () => {
      const categories = ["analysis", "generation", "deployment", "validation"];

      categories.forEach((category) => {
        const tools = getToolsByCategory(category as any);
        expect(tools.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Performance Characteristics", () => {
    it("should have reasonable token estimates", () => {
      Object.entries(TOOL_METADATA).forEach(([toolName, metadata]) => {
        // Token estimates should be reasonable (100-600 tokens per tool)
        expect(metadata.estimatedTokens).toBeGreaterThanOrEqual(100);
        expect(metadata.estimatedTokens).toBeLessThanOrEqual(600);
      });
    });

    it("should have realistic execution time estimates", () => {
      Object.entries(TOOL_METADATA).forEach(([toolName, metadata]) => {
        // Execution times should be reasonable (100ms - 10s)
        expect(metadata.typicalExecutionMs).toBeGreaterThanOrEqual(100);
        expect(metadata.typicalExecutionMs).toBeLessThanOrEqual(10000);
      });
    });

    it("should optimize for Code Mode workflows", () => {
      const largeResultTools = getLargeResultTools();

      // Large result tools should have resource-based patterns
      largeResultTools.forEach((toolName) => {
        const metadata = getToolMetadata(toolName);
        expect(metadata?.returnsLargeResults).toBe(true);
      });
    });
  });
});
