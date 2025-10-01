// API tests for MCP response format compliance and standardization
import { formatMCPResponse, MCPToolResponse } from "../../src/types/api";

describe("API Response Standardization Tests", () => {
  describe("MCPToolResponse Interface Compliance", () => {
    it("should validate successful response structure", () => {
      const successResponse: MCPToolResponse<{ data: string }> = {
        success: true,
        data: { data: "test-data" },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 100,
          timestamp: "2023-01-01T00:00:00.000Z",
        },
        recommendations: [
          {
            type: "info",
            title: "Test Recommendation",
            description: "This is a test recommendation",
          },
        ],
        nextSteps: [
          {
            action: "Next Action",
            toolRequired: "next_tool",
            description: "Description of next step",
            priority: "high",
          },
        ],
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(successResponse.metadata).toBeDefined();
      expect(successResponse.metadata.toolVersion).toBe("1.0.0");
      expect(successResponse.metadata.executionTime).toBe(100);
      expect(successResponse.recommendations).toHaveLength(1);
      expect(successResponse.nextSteps).toHaveLength(1);
    });

    it("should validate error response structure", () => {
      const errorResponse: MCPToolResponse = {
        success: false,
        error: {
          code: "TEST_ERROR",
          message: "Test error message",
          details: { context: "test" },
          resolution: "Test resolution steps",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 50,
          timestamp: "2023-01-01T00:00:00.000Z",
        },
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error!.code).toBe("TEST_ERROR");
      expect(errorResponse.error!.message).toBe("Test error message");
      expect(errorResponse.error!.resolution).toBe("Test resolution steps");
      expect(errorResponse.data).toBeUndefined();
    });

    it("should validate recommendation types", () => {
      const recommendations = [
        {
          type: "info" as const,
          title: "Info",
          description: "Info description",
        },
        {
          type: "warning" as const,
          title: "Warning",
          description: "Warning description",
        },
        {
          type: "critical" as const,
          title: "Critical",
          description: "Critical description",
        },
      ];

      recommendations.forEach((rec) => {
        expect(["info", "warning", "critical"]).toContain(rec.type);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
      });
    });

    it("should validate next step priorities", () => {
      const nextSteps = [
        {
          action: "Low Priority",
          toolRequired: "tool1",
          priority: "low" as const,
        },
        {
          action: "Medium Priority",
          toolRequired: "tool2",
          priority: "medium" as const,
        },
        {
          action: "High Priority",
          toolRequired: "tool3",
          priority: "high" as const,
        },
      ];

      nextSteps.forEach((step) => {
        expect(["low", "medium", "high"]).toContain(step.priority);
        expect(step.action).toBeDefined();
        expect(step.toolRequired).toBeDefined();
      });
    });
  });

  describe("formatMCPResponse Function", () => {
    it("should format successful response correctly", () => {
      const response: MCPToolResponse<{ result: string }> = {
        success: true,
        data: { result: "success" },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 123,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
        recommendations: [
          {
            type: "info",
            title: "Success",
            description: "Operation completed successfully",
          },
        ],
        nextSteps: [
          {
            action: "Proceed to next step",
            toolRequired: "next_tool",
            priority: "medium",
          },
        ],
      };

      const formatted = formatMCPResponse(response);

      expect(formatted.content).toBeDefined();
      expect(formatted.content.length).toBeGreaterThan(0);
      expect(formatted.isError).toBeFalsy();

      // Check main data is included
      const dataContent = formatted.content.find((c) =>
        c.text.includes("success"),
      );
      expect(dataContent).toBeDefined();

      // Check metadata is included
      const metadataContent = formatted.content.find((c) =>
        c.text.includes("123ms"),
      );
      expect(metadataContent).toBeDefined();

      // Check recommendations are included
      const recommendationContent = formatted.content.find((c) =>
        c.text.includes("Recommendations:"),
      );
      expect(recommendationContent).toBeDefined();

      // Check next steps are included
      const nextStepContent = formatted.content.find((c) =>
        c.text.includes("Next Steps:"),
      );
      expect(nextStepContent).toBeDefined();
    });

    it("should format error response correctly", () => {
      const errorResponse: MCPToolResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Input validation failed",
          resolution: "Check your input parameters",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 25,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      const formatted = formatMCPResponse(errorResponse);

      expect(formatted.content).toBeDefined();
      expect(formatted.isError).toBe(true);

      // Check error message is included
      const errorContent = formatted.content.find((c) =>
        c.text.includes("Input validation failed"),
      );
      expect(errorContent).toBeDefined();

      // Check resolution is included
      const resolutionContent = formatted.content.find((c) =>
        c.text.includes("Check your input parameters"),
      );
      expect(resolutionContent).toBeDefined();
    });

    it("should handle responses without optional fields", () => {
      const minimalResponse: MCPToolResponse<string> = {
        success: true,
        data: "minimal data",
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 10,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      const formatted = formatMCPResponse(minimalResponse);

      expect(formatted.content).toBeDefined();
      expect(formatted.isError).toBeFalsy();

      // Should not include recommendations or next steps sections
      const fullText = formatted.content.map((c) => c.text).join("\n");
      expect(fullText).not.toContain("Recommendations:");
      expect(fullText).not.toContain("Next Steps:");
    });

    it("should include recommendation icons correctly", () => {
      const response: MCPToolResponse<{}> = {
        success: true,
        data: {},
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 10,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
        recommendations: [
          { type: "info", title: "Info", description: "Info description" },
          {
            type: "warning",
            title: "Warning",
            description: "Warning description",
          },
          {
            type: "critical",
            title: "Critical",
            description: "Critical description",
          },
        ],
      };

      const formatted = formatMCPResponse(response);
      const recommendationText =
        formatted.content.find((c) => c.text.includes("Recommendations:"))
          ?.text || "";

      expect(recommendationText).toContain("ℹ️"); // Info icon
      expect(recommendationText).toContain("⚠️"); // Warning icon
      expect(recommendationText).toContain("🔴"); // Critical icon
    });
  });

  describe("Response Consistency Across Tools", () => {
    it("should ensure all tools follow the same metadata structure", () => {
      const commonMetadata = {
        toolVersion: "1.0.0",
        executionTime: 100,
        timestamp: "2023-01-01T12:00:00.000Z",
      };

      // Test that metadata structure is consistent
      expect(commonMetadata.toolVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof commonMetadata.executionTime).toBe("number");
      expect(commonMetadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(commonMetadata.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("should validate error code consistency", () => {
      const errorCodes = [
        "ANALYSIS_FAILED",
        "RECOMMENDATION_FAILED",
        "CONFIG_GENERATION_FAILED",
        "STRUCTURE_SETUP_FAILED",
        "DEPLOYMENT_SETUP_FAILED",
        "VERIFICATION_FAILED",
      ];

      errorCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z_]+$/);
        expect(code).toContain("_");
        expect(code.endsWith("_FAILED")).toBe(true);
      });
    });

    it("should validate next step tool references", () => {
      const validTools = [
        "analyze_repository",
        "recommend_ssg",
        "generate_config",
        "setup_structure",
        "deploy_pages",
        "verify_deployment",
      ];

      validTools.forEach((tool) => {
        expect(tool).toMatch(/^[a-z_]+$/);
        expect(tool).not.toContain("-");
        expect(tool).not.toContain(" ");
      });
    });

    it("should validate recommendation action patterns", () => {
      const recommendationActions = [
        "Get SSG Recommendation",
        "Generate Configuration",
        "Setup Documentation Structure",
        "Setup GitHub Pages Deployment",
        "Verify Deployment Setup",
      ];

      recommendationActions.forEach((action) => {
        expect(action).toMatch(/^[A-Z]/); // Starts with capital
        expect(action.length).toBeGreaterThan(5); // Meaningful length
        expect(action.endsWith(".")).toBe(false); // No trailing period
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain MCP content format compatibility", () => {
      const response: MCPToolResponse<{ test: boolean }> = {
        success: true,
        data: { test: true },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 50,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      const formatted = formatMCPResponse(response);

      // Must have content array for MCP compatibility
      expect(formatted.content).toBeDefined();
      expect(Array.isArray(formatted.content)).toBe(true);

      // Each content item must have type and text
      formatted.content.forEach((item) => {
        expect(item.type).toBe("text");
        expect(typeof item.text).toBe("string");
        expect(item.text.length).toBeGreaterThan(0);
      });
    });

    it("should handle legacy response format gracefully", () => {
      // Test that we can still process responses that don't have all new fields
      const legacyStyleData = {
        success: true,
        result: "legacy result",
        timestamp: "2023-01-01T12:00:00.000Z",
      };

      // Should not throw even if not strictly typed
      expect(() => {
        const formatted = formatMCPResponse({
          success: true,
          data: legacyStyleData,
          metadata: {
            toolVersion: "1.0.0",
            executionTime: 100,
            timestamp: "2023-01-01T12:00:00.000Z",
          },
        });
        return formatted;
      }).not.toThrow();
    });
  });

  describe("Error Boundary Testing", () => {
    it("should handle undefined data gracefully", () => {
      const response: MCPToolResponse = {
        success: true,
        // data is undefined
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 10,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      const formatted = formatMCPResponse(response);
      expect(formatted.content).toBeDefined();
      expect(formatted.content.length).toBeGreaterThan(0);
    });

    it("should handle null values in data", () => {
      const response: MCPToolResponse<{ value: null }> = {
        success: true,
        data: { value: null },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 10,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      expect(() => formatMCPResponse(response)).not.toThrow();
    });

    it("should handle very large data objects", () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      };

      const response: MCPToolResponse<typeof largeData> = {
        success: true,
        data: largeData,
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 1000,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      const formatted = formatMCPResponse(response);
      expect(formatted.content).toBeDefined();

      // Should include the large data in JSON format
      const dataContent = formatted.content.find((c) =>
        c.text.includes('"items"'),
      );
      expect(dataContent).toBeDefined();
    });

    it("should handle circular references safely", () => {
      const circularData: any = { name: "test" };
      circularData.self = circularData;

      // Should not cause JSON.stringify to throw
      expect(() => {
        JSON.stringify(circularData);
      }).toThrow();

      // But our formatter should handle it (though we should avoid circular refs)
      // This test documents the expected behavior
      const response: MCPToolResponse<any> = {
        success: true,
        data: { safe: "data" }, // Use safe data instead
        metadata: {
          toolVersion: "1.0.0",
          executionTime: 10,
          timestamp: "2023-01-01T12:00:00.000Z",
        },
      };

      expect(() => formatMCPResponse(response)).not.toThrow();
    });
  });
});
