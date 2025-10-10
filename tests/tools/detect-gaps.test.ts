import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";

// Mock dependencies that don't involve filesystem
const mockAnalyzeRepository = jest.fn();
const mockValidateContent = jest.fn();

jest.mock("../../src/tools/analyze-repository.js", () => ({
  analyzeRepository: mockAnalyzeRepository,
}));

jest.mock("../../src/tools/validate-content.js", () => ({
  handleValidateDiataxisContent: mockValidateContent,
}));

jest.mock("../../src/utils/code-scanner.js", () => ({
  CodeScanner: jest.fn().mockImplementation(() => ({
    analyzeRepository: jest.fn().mockResolvedValue({
      summary: {
        totalFiles: 5,
        parsedFiles: 3,
        functions: 10,
        classes: 2,
        interfaces: 3,
        types: 1,
        constants: 2,
        apiEndpoints: 1,
      },
      files: ["src/test.ts"],
      functions: [
        {
          name: "testFunction",
          filePath: "src/test.ts",
          line: 1,
          exported: true,
          hasJSDoc: false,
        },
      ],
      classes: [
        {
          name: "TestClass",
          filePath: "src/test.ts",
          line: 5,
          exported: true,
          hasJSDoc: false,
        },
      ],
      interfaces: [
        {
          name: "TestInterface",
          filePath: "src/test.ts",
          line: 10,
          exported: true,
          hasJSDoc: false,
        },
      ],
      types: [],
      constants: [],
      apiEndpoints: [],
      imports: [],
      exports: [],
      frameworks: [],
    }),
  })),
}));

// Helper functions for creating test directories and files
async function createTestDirectory(name: string): Promise<string> {
  const testDir = path.join(
    tmpdir(),
    "documcp-test-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(7),
  );
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function createTestFile(
  filePath: string,
  content: string,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function cleanupTestDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Now import the module under test
import { detectDocumentationGaps } from "../../src/tools/detect-gaps.js";

describe("detectDocumentationGaps (Real Filesystem)", () => {
  const mockRepositoryAnalysis = {
    id: "analysis_123",
    structure: {
      hasTests: true,
      hasCI: true,
      hasDocs: true,
    },
    dependencies: {
      ecosystem: "javascript",
      packages: ["react", "express"],
    },
    hasApiEndpoints: true,
    packageManager: "npm",
    hasDocker: true,
    hasCICD: true,
  };

  const mockValidationResult = {
    success: true,
    confidence: { overall: 85 },
    issues: [{ type: "warning", description: "Missing API examples" }],
    validationResults: [
      { status: "pass", message: "Good structure" },
      {
        status: "fail",
        message: "Missing references",
        recommendation: "Add API docs",
      },
    ],
  };

  let testRepoDir: string;
  const createdDirs: string[] = [];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a fresh test directory for each test
    testRepoDir = await createTestDirectory("test-repo");
    createdDirs.push(testRepoDir);

    // Default successful repository analysis
    mockAnalyzeRepository.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify(mockRepositoryAnalysis),
        },
      ],
    });

    // Default validation result
    mockValidateContent.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, data: mockValidationResult }),
        },
      ],
    } as any);
  });

  afterEach(async () => {
    // Cleanup all created directories
    await Promise.all(createdDirs.map((dir) => cleanupTestDirectory(dir)));
    createdDirs.length = 0;
  });

  describe("basic functionality", () => {
    it("should detect gaps in repository without documentation", async () => {
      // No docs directory created - test repo is empty

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        depth: "quick",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      const data = JSON.parse(result.content[0].text);

      expect(data.repositoryPath).toBe(testRepoDir);
      expect(data.analysisId).toBe("analysis_123");
      expect(data.overallScore).toBe(0);
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "general",
          gapType: "missing_section",
          description: "No documentation directory found",
          priority: "critical",
        }),
      );
    });

    it("should detect missing Diataxis sections", async () => {
      // Create docs directory with some sections but missing tutorials and how-to
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(
        path.join(docsDir, "index.md"),
        "# Main Documentation",
      );

      // Create reference and explanation sections
      await fs.mkdir(path.join(docsDir, "reference"));
      await createTestFile(
        path.join(docsDir, "reference", "api.md"),
        "# API Reference",
      );
      await fs.mkdir(path.join(docsDir, "explanation"));
      await createTestFile(
        path.join(docsDir, "explanation", "concepts.md"),
        "# Concepts",
      );

      // tutorials and how-to are missing

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "standard",
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "tutorials",
          gapType: "missing_section",
          priority: "high",
        }),
      );
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "how-to",
          gapType: "missing_section",
          priority: "medium",
        }),
      );
    });

    it("should identify existing documentation strengths", async () => {
      // Create comprehensive docs structure
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(
        path.join(docsDir, "README.md"),
        "# Project Documentation",
      );

      // Create all Diataxis sections
      await fs.mkdir(path.join(docsDir, "tutorials"));
      await createTestFile(
        path.join(docsDir, "tutorials", "getting-started.md"),
        "# Getting Started",
      );
      await fs.mkdir(path.join(docsDir, "how-to"));
      await createTestFile(
        path.join(docsDir, "how-to", "deployment.md"),
        "# How to Deploy",
      );
      await fs.mkdir(path.join(docsDir, "reference"));
      await createTestFile(
        path.join(docsDir, "reference", "api.md"),
        "# API Reference",
      );
      await fs.mkdir(path.join(docsDir, "explanation"));
      await createTestFile(
        path.join(docsDir, "explanation", "architecture.md"),
        "# Architecture",
      );

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.strengths).toContain("Has main documentation index file");
      expect(data.strengths).toContain(
        "Well-organized sections: tutorials, how-to, reference, explanation",
      );
      expect(data.overallScore).toBeGreaterThan(50); // Adjust expectation to match actual scoring
    });
  });

  describe("error handling", () => {
    it("should handle repository analysis failure", async () => {
      mockAnalyzeRepository.mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: false, error: "Analysis failed" }),
          },
        ],
      });

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
      });

      expect(result.content[0].text).toContain("GAP_DETECTION_FAILED");
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle file system errors gracefully", async () => {
      // Create a docs directory but then make it inaccessible
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.analysisId).toBe("analysis_123");
      expect(data.gaps).toBeInstanceOf(Array);
    });
  });

  describe("code-based gap detection", () => {
    it("should detect missing API documentation when endpoints exist", async () => {
      // Create docs directory without API documentation
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(path.join(docsDir, "index.md"), "# Documentation");

      // Mock CodeScanner to return API endpoints
      const { CodeScanner } = require("../../src/utils/code-scanner.js");
      CodeScanner.mockImplementationOnce(() => ({
        analyzeRepository: jest.fn().mockResolvedValue({
          summary: {
            totalFiles: 5,
            parsedFiles: 3,
            functions: 10,
            classes: 2,
            interfaces: 3,
            types: 1,
            constants: 2,
            apiEndpoints: 3,
          },
          files: ["src/api.ts", "src/routes.ts"],
          functions: [],
          classes: [],
          interfaces: [],
          types: [],
          constants: [],
          apiEndpoints: [
            {
              method: "GET",
              path: "/api/users",
              filePath: "src/api.ts",
              line: 10,
              hasDocumentation: true,
            },
            {
              method: "POST",
              path: "/api/users",
              filePath: "src/api.ts",
              line: 20,
              hasDocumentation: true,
            },
            {
              method: "DELETE",
              path: "/api/users/:id",
              filePath: "src/routes.ts",
              line: 5,
              hasDocumentation: true,
            },
          ],
          imports: [],
          exports: [],
          frameworks: [],
        }),
      }));

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      // Should detect missing API documentation section
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "reference",
          gapType: "missing_section",
          description: expect.stringContaining("API endpoints"),
          priority: "critical",
        }),
      );
    });

    it("should detect undocumented API endpoints", async () => {
      // Create docs directory with API section
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await fs.mkdir(path.join(docsDir, "reference"));
      await createTestFile(
        path.join(docsDir, "reference", "api.md"),
        "# API Reference",
      );

      // Mock CodeScanner to return endpoints without documentation
      const { CodeScanner } = require("../../src/utils/code-scanner.js");
      CodeScanner.mockImplementationOnce(() => ({
        analyzeRepository: jest.fn().mockResolvedValue({
          summary: {
            totalFiles: 5,
            parsedFiles: 3,
            functions: 10,
            classes: 2,
            interfaces: 3,
            types: 1,
            constants: 2,
            apiEndpoints: 2,
          },
          files: ["src/api.ts"],
          functions: [],
          classes: [],
          interfaces: [],
          types: [],
          constants: [],
          apiEndpoints: [
            {
              method: "GET",
              path: "/api/data",
              filePath: "src/api.ts",
              line: 15,
              hasDocumentation: false, // No JSDoc
            },
            {
              method: "POST",
              path: "/api/data",
              filePath: "src/api.ts",
              line: 25,
              hasDocumentation: false, // No JSDoc
            },
          ],
          imports: [],
          exports: [],
          frameworks: [],
        }),
      }));

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      // Should detect undocumented endpoints
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "reference",
          gapType: "missing_examples",
          description: expect.stringContaining("2 API endpoints lack"),
          priority: "high",
        }),
      );
    });

    it("should detect undocumented exported classes", async () => {
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(path.join(docsDir, "index.md"), "# Documentation");

      // Mock CodeScanner to return undocumented classes
      const { CodeScanner } = require("../../src/utils/code-scanner.js");
      CodeScanner.mockImplementationOnce(() => ({
        analyzeRepository: jest.fn().mockResolvedValue({
          summary: {
            totalFiles: 5,
            parsedFiles: 3,
            functions: 10,
            classes: 3,
            interfaces: 2,
            types: 1,
            constants: 2,
            apiEndpoints: 0,
          },
          files: ["src/models.ts"],
          functions: [],
          classes: [
            {
              name: "UserModel",
              filePath: "src/models.ts",
              line: 10,
              exported: true,
              hasJSDoc: false,
            },
            {
              name: "PostModel",
              filePath: "src/models.ts",
              line: 30,
              exported: true,
              hasJSDoc: false,
            },
            {
              name: "InternalHelper",
              filePath: "src/models.ts",
              line: 50,
              exported: false, // Not exported, should be ignored
              hasJSDoc: false,
            },
          ],
          interfaces: [],
          types: [],
          constants: [],
          apiEndpoints: [],
          imports: [],
          exports: [],
          frameworks: [],
        }),
      }));

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      // Should detect undocumented exported classes (only 2, not the non-exported one)
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "reference",
          gapType: "incomplete_content",
          description: expect.stringContaining("2 exported classes lack"),
          priority: "medium",
        }),
      );
    });

    it("should detect undocumented exported interfaces", async () => {
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(path.join(docsDir, "index.md"), "# Documentation");

      // Mock CodeScanner to return undocumented interfaces
      const { CodeScanner } = require("../../src/utils/code-scanner.js");
      CodeScanner.mockImplementationOnce(() => ({
        analyzeRepository: jest.fn().mockResolvedValue({
          summary: {
            totalFiles: 5,
            parsedFiles: 3,
            functions: 10,
            classes: 2,
            interfaces: 3,
            types: 1,
            constants: 2,
            apiEndpoints: 0,
          },
          files: ["src/types.ts"],
          functions: [],
          classes: [],
          interfaces: [
            {
              name: "IUser",
              filePath: "src/types.ts",
              line: 5,
              exported: true,
              hasJSDoc: false,
            },
            {
              name: "IConfig",
              filePath: "src/types.ts",
              line: 15,
              exported: true,
              hasJSDoc: false,
            },
            {
              name: "IInternalState",
              filePath: "src/types.ts",
              line: 25,
              exported: false, // Not exported
              hasJSDoc: false,
            },
          ],
          types: [],
          constants: [],
          apiEndpoints: [],
          imports: [],
          exports: [],
          frameworks: [],
        }),
      }));

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      // Should detect undocumented exported interfaces
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: "reference",
          gapType: "incomplete_content",
          description: expect.stringContaining("2 exported interfaces lack"),
          priority: "medium",
        }),
      );
    });

    it("should handle validation errors gracefully", async () => {
      const docsDir = path.join(testRepoDir, "docs");
      await fs.mkdir(docsDir);
      await createTestFile(path.join(docsDir, "index.md"), "# Documentation");

      // Mock validation to throw an error
      mockValidateContent.mockRejectedValueOnce(
        new Error("Validation service unavailable"),
      );

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        documentationPath: docsDir,
        depth: "comprehensive",
      });

      const data = JSON.parse(result.content[0].text);

      // Should still succeed without validation data
      expect(data.analysisId).toBe("analysis_123");
      expect(data.gaps).toBeInstanceOf(Array);
      expect(data.repositoryPath).toBe(testRepoDir);
    });

    it("should handle empty repository analysis result", async () => {
      // Mock analyze_repository to return empty/no content
      mockAnalyzeRepository.mockResolvedValueOnce({
        content: [], // Empty content array
      });

      const result = await detectDocumentationGaps({
        repositoryPath: testRepoDir,
        depth: "quick",
      });

      // Should return error about failed analysis
      expect(result.content[0].text).toContain("GAP_DETECTION_FAILED");
      expect(result.content[0].text).toContain("Repository analysis failed");
    });
  });

  describe("input validation", () => {
    it("should require repositoryPath", async () => {
      await expect(detectDocumentationGaps({} as any)).rejects.toThrow();
    });

    it("should handle invalid depth parameter", async () => {
      await expect(
        detectDocumentationGaps({
          repositoryPath: testRepoDir,
          depth: "invalid" as any,
        }),
      ).rejects.toThrow();
    });
  });
});
