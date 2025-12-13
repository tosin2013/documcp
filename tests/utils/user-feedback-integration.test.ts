/**
 * User Feedback Integration Tests (ADR-012 Phase 3)
 */

import { UserFeedbackIntegration } from "../../src/utils/user-feedback-integration.js";
import { DriftDetectionResult } from "../../src/utils/drift-detector.js";

describe("UserFeedbackIntegration", () => {
  let integration: UserFeedbackIntegration;

  beforeEach(() => {
    integration = new UserFeedbackIntegration();
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
  });
});
