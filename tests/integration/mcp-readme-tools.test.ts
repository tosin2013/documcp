import { promises as fs } from "fs";
import { join } from "path";

describe("MCP Integration Tests", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), "test-mcp-integration-temp");
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Tool Registration", () => {
    test("should include evaluate_readme_health in tools list", async () => {
      // This test verifies that the README health tool is properly registered
      // Since we can't directly access the server instance, we'll test the tool functions directly
      // but verify they match the expected MCP interface

      const { evaluateReadmeHealth } = await import(
        "../../src/tools/evaluate-readme-health.js"
      );

      // Test with valid parameters that match the MCP schema
      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(readmePath, "# Test Project\n\nBasic README content.");

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: "community_library", // Valid enum value from schema
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    test("should include readme_best_practices in tools list", async () => {
      const { readmeBestPractices } = await import(
        "../../src/tools/readme-best-practices.js"
      );

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(
        readmePath,
        "# Test Library\n\nLibrary documentation.",
      );

      const result = await readmeBestPractices({
        readme_path: readmePath,
        project_type: "library", // Valid enum value from schema
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("Parameter Validation", () => {
    test("evaluate_readme_health should handle invalid project_type", async () => {
      const { evaluateReadmeHealth } = await import(
        "../../src/tools/evaluate-readme-health.js"
      );

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(readmePath, "# Test");

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: "invalid_type" as any,
      });

      expect(result.isError).toBe(true);
    });

    test("readme_best_practices should handle invalid project_type", async () => {
      const { readmeBestPractices } = await import(
        "../../src/tools/readme-best-practices.js"
      );

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(readmePath, "# Test");

      const result = await readmeBestPractices({
        readme_path: readmePath,
        project_type: "invalid_type" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("evaluate_readme_health should handle missing file", async () => {
      const { evaluateReadmeHealth } = await import(
        "../../src/tools/evaluate-readme-health.js"
      );

      const result = await evaluateReadmeHealth({
        readme_path: join(tempDir, "nonexistent.md"),
      });

      expect(result.isError).toBe(true);
    });

    test("readme_best_practices should handle missing file without template", async () => {
      const { readmeBestPractices } = await import(
        "../../src/tools/readme-best-practices.js"
      );

      const result = await readmeBestPractices({
        readme_path: join(tempDir, "nonexistent.md"),
        generate_template: false,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("README_NOT_FOUND");
    });
  });

  describe("Response Format Consistency", () => {
    test("evaluate_readme_health should return MCP-formatted response", async () => {
      const { evaluateReadmeHealth } = await import(
        "../../src/tools/evaluate-readme-health.js"
      );

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(
        readmePath,
        "# Complete Project\n\n## Description\nDetailed description.",
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      // Should be already formatted for MCP
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeDefined();

      // Should have execution metadata
      const metadataContent = result.content.find((c) =>
        c.text.includes("Execution completed"),
      );
      expect(metadataContent).toBeDefined();
    });

    test("readme_best_practices should return MCPToolResponse that can be formatted", async () => {
      const { readmeBestPractices } = await import(
        "../../src/tools/readme-best-practices.js"
      );
      const { formatMCPResponse } = await import("../../src/types/api.js");

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(
        readmePath,
        "# Library Project\n\n## Installation\nnpm install",
      );

      const result = await readmeBestPractices({
        readme_path: readmePath,
      });

      // Should be raw MCPToolResponse
      expect(result.success).toBeDefined();
      expect(result.metadata).toBeDefined();

      // Should be formattable
      const formatted = formatMCPResponse(result);
      expect(formatted.content).toBeDefined();
      expect(Array.isArray(formatted.content)).toBe(true);
      expect(formatted.isError).toBe(false);
    });
  });

  describe("Cross-tool Consistency", () => {
    test("both tools should handle the same README file", async () => {
      const { evaluateReadmeHealth } = await import(
        "../../src/tools/evaluate-readme-health.js"
      );
      const { readmeBestPractices } = await import(
        "../../src/tools/readme-best-practices.js"
      );

      const readmePath = join(tempDir, "README.md");
      await fs.writeFile(
        readmePath,
        `# Test Project

## Description
This is a comprehensive test project.

## Installation
\`\`\`bash
npm install test-project
\`\`\`

## Usage
\`\`\`javascript
const test = require('test-project');
test.run();
\`\`\`

## Contributing
Please read our contributing guidelines.

## License
MIT License
`,
      );

      // Both tools should work on the same file
      const healthResult = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: "community_library",
      });

      const practicesResult = await readmeBestPractices({
        readme_path: readmePath,
        project_type: "library",
      });

      expect(healthResult.isError).toBe(false);
      expect(practicesResult.success).toBe(true);
    });
  });
});
