/**
 * User Feedback Integration Tests (ADR-012 Phase 3)
 */

import { UserFeedbackIntegration } from "../../src/utils/user-feedback-integration.js";
import { DriftDetectionResult } from "../../src/utils/drift-detector.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("UserFeedbackIntegration", () => {
  let integration: UserFeedbackIntegration;

  beforeEach(() => {
    integration = new UserFeedbackIntegration();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Configuration", () => {
    test("should configure GitHub integration", () => {
      integration.configure({
        provider: "github",
        apiToken: "test-token",
        owner: "test-owner",
        repo: "test-repo",
      });

      expect(integration).toBeDefined();
    });

    test("should clear cache on configuration change", () => {
      integration.configure({
        provider: "github",
        owner: "test",
        repo: "test",
      });

      integration.clearCache();
      expect(integration).toBeDefined();
    });
  });

  describe("Feedback Score Calculation", () => {
    test("should return 0 when no integration configured", async () => {
      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 1,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      const score = await integration.calculateFeedbackScore(result);
      expect(score).toBe(0);
    });

    test("should handle API errors gracefully", async () => {
      integration.configure({
        provider: "github",
        apiToken: "invalid-token",
        owner: "nonexistent",
        repo: "nonexistent",
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 1,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      const score = await integration.calculateFeedbackScore(result);
      expect(score).toBe(0);
    });

    test("should calculate feedback score from GitHub issues", async () => {
      integration.configure({
        provider: "github",
        apiToken: "test-token",
        owner: "test-owner",
        repo: "test-repo",
      });

      const mockIssues = [
        {
          number: 1,
          title: "Documentation issue",
          body: "The file `src/utils/test.ts` has outdated docs",
          state: "open",
          labels: [{ name: "documentation" }, { name: "critical" }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          number: 2,
          title: "Another docs issue",
          body: "Function `testFunction()` needs documentation",
          state: "open",
          labels: [{ name: "docs" }],
          created_at: new Date().toISOString(),
          updated_at: new Date(
            Date.now() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 10 days ago
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues,
      });

      const result: DriftDetectionResult = {
        filePath: "src/utils/test.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [
          {
            type: "missing",
            affectedDocs: [],
            codeChanges: [
              {
                name: "testFunction",
                type: "added",
                category: "function",
                details: "New function added",
                impactLevel: "minor",
              },
            ],
            description: "Function testFunction is missing documentation",
            detectedAt: new Date().toISOString(),
            severity: "medium",
          },
        ],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 1,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      const score = await integration.calculateFeedbackScore(result);
      // Should have score > 0 due to open issues
      expect(score).toBeGreaterThan(0);
    });

    test("should use cache for repeated requests", async () => {
      integration.configure({
        provider: "github",
        apiToken: "test-token",
        owner: "test-owner",
        repo: "test-repo",
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 1,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      // First call
      await integration.calculateFeedbackScore(result);
      // Second call should use cache
      await integration.calculateFeedbackScore(result);

      // Fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
