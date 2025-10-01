import {
  HealthAnalysis,
  ChecklistItem,
  BestPracticesReport,
  convertBestPracticesReportToChecklistItems,
  generateHealthRecommendations,
} from "../../src/types/api";

describe("Type Safety Tests", () => {
  describe("HealthAnalysis", () => {
    it("should create valid HealthAnalysis object", () => {
      const healthAnalysis: HealthAnalysis = {
        score: 85,
        issues: [
          {
            type: "warning",
            message: "Missing section",
            section: "introduction",
            line: 10,
          },
        ],
        recommendations: ["Add introduction section"],
        metadata: {
          checkDate: "2023-01-01",
          version: "1.0.0",
        },
      };

      expect(healthAnalysis.score).toBe(85);
      expect(healthAnalysis.issues).toHaveLength(1);
      expect(healthAnalysis.recommendations).toContain(
        "Add introduction section",
      );
    });
  });

  describe("BestPracticesReport and ChecklistItem", () => {
    it("should create valid BestPracticesReport with ChecklistItems", () => {
      const checklistItems: ChecklistItem[] = [
        {
          id: "readme-title",
          title: "Has clear title",
          description: "README has a clear, descriptive title",
          completed: true,
          required: true,
          category: "structure",
        },
        {
          id: "readme-description",
          title: "Has description",
          description: "README includes project description",
          completed: false,
          required: true,
          category: "content",
        },
      ];

      const report: BestPracticesReport = {
        items: checklistItems,
        score: 50,
        categories: {
          structure: { total: 1, completed: 1, score: 100 },
          content: { total: 1, completed: 0, score: 0 },
        },
        recommendations: ["Add project description"],
      };

      expect(report.items).toHaveLength(2);
      expect(report.score).toBe(50);
      expect(report.categories.structure.score).toBe(100);
    });

    it("should convert BestPracticesReport to ChecklistItem array", () => {
      const report: BestPracticesReport = {
        items: [
          {
            id: "test-item",
            title: "Test Item",
            description: "Test description",
            completed: true,
            required: true,
            category: "test",
          },
        ],
        score: 100,
        categories: { test: { total: 1, completed: 1, score: 100 } },
        recommendations: [],
      };

      const items = convertBestPracticesReportToChecklistItems(report);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("test-item");
    });
  });

  describe("Utility Functions", () => {
    it("should generate health recommendations from analysis", () => {
      const analysis: HealthAnalysis = {
        score: 75,
        issues: [],
        recommendations: ["Add more examples", "Improve documentation"],
        metadata: {
          checkDate: "2023-01-01",
          version: "1.0.0",
        },
      };

      const recommendations = generateHealthRecommendations(analysis);
      expect(recommendations).toEqual([
        "Add more examples",
        "Improve documentation",
      ]);
    });
  });
});
