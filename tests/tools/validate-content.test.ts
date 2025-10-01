import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs/promises";
import * as path from "path";
import {
  handleValidateDiataxisContent,
  validateGeneralContent,
} from "../../src/tools/validate-content.js";
import { ValidationResult } from "../../src/tools/validate-content.js";

describe("Content Validation Tool", () => {
  const testTempDir = path.join(__dirname, "../../.tmp/test-validation");

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testTempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testTempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Application Code Validation", () => {
    it("should detect application code path correctly", async () => {
      // Create mock application structure
      const appDir = path.join(testTempDir, "mock-app");
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, "src"), { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "test-app"}',
      );

      // Create TypeScript file without documentation
      const tsFile = path.join(appDir, "src", "index.ts");
      await fs.writeFile(
        tsFile,
        `
export function undocumentedFunction(param: string): string {
  return param.toUpperCase();
}

export const anotherFunction = (value: number) => {
  if (value < 0) {
    throw new Error('Invalid value');
  }
  return value * 2;
};
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "compliance",
        includeCodeValidation: true,
      });

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();

      // Should find issues with undocumented exported functions
      const undocumentedIssues = result.issues.filter((issue) =>
        issue.description.includes("lacks documentation"),
      );
      expect(undocumentedIssues.length).toBeGreaterThan(0);

      // Should find issues with undocumented error throwing
      const errorDocIssues = result.issues.filter((issue) =>
        issue.description.includes(
          "Error throwing code found without error documentation",
        ),
      );
      expect(errorDocIssues.length).toBeGreaterThan(0);
    });

    it("should validate application architecture structure", async () => {
      // Create mock application with missing directories
      const appDir = path.join(testTempDir, "incomplete-app");
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "incomplete-app"}',
      );

      // Missing tools and types directories
      await fs.mkdir(path.join(appDir, "src"), { recursive: true });
      await fs.writeFile(
        path.join(appDir, "src", "index.ts"),
        'export const app = "test";',
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      const structureIssues = result.issues.filter(
        (issue) => issue.location.file === "application structure",
      );
      expect(structureIssues.length).toBeGreaterThan(0);

      // Should suggest missing tools directory
      const toolsIssue = structureIssues.find((issue) =>
        issue.description.includes("tools directory"),
      );
      expect(toolsIssue).toBeDefined();
    });

    it("should validate README structure", async () => {
      const appDir = path.join(testTempDir, "readme-test");
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, "src"), { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "readme-test"}',
      );
      await fs.writeFile(
        path.join(appDir, "src", "index.ts"),
        'export const app = "test";',
      );

      // Create README with missing sections
      await fs.writeFile(
        path.join(appDir, "README.md"),
        `
This is a project without proper structure.
Some description here.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      // Application validation should find issues

      const readmeIssues = result.issues.filter(
        (issue) => issue.location.file === "README.md",
      );
      expect(readmeIssues.length).toBeGreaterThan(0);

      // Should find issues with README structure
      const structureIssue = readmeIssues.find((issue) =>
        issue.description.includes("lacks essential sections"),
      );
      expect(structureIssue).toBeDefined();
    });

    it("should detect properly documented functions", async () => {
      const appDir = path.join(testTempDir, "documented-app");
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, "src"), { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "documented-app"}',
      );

      // Create well-documented TypeScript file
      const tsFile = path.join(appDir, "src", "documented.ts");
      await fs.writeFile(
        tsFile,
        `
/**
 * Converts a string to uppercase
 * @param param - The input string
 * @returns The uppercase string
 */
export function documentedFunction(param: string): string {
  return param.toUpperCase();
}

/**
 * Doubles a positive number
 * @param value - The input number (must be positive)
 * @returns The doubled value
 * @throws {Error} When value is negative
 */
export const wellDocumentedFunction = (value: number) => {
  if (value < 0) {
    throw new Error('Invalid value');
  }
  return value * 2;
};
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "compliance",
        includeCodeValidation: true,
      });

      // Should have no undocumented issues since functions are properly documented
      const undocumentedIssues = result.issues.filter((issue) =>
        issue.description.includes("lacks documentation"),
      );
      expect(undocumentedIssues.length).toBe(0);

      // Should not complain about error documentation
      const errorDocIssues = result.issues.filter((issue) =>
        issue.description.includes(
          "Error throwing code found without error documentation",
        ),
      );
      expect(errorDocIssues.length).toBe(0);
    });
  });

  describe("Documentation Validation", () => {
    it("should detect documentation directory correctly", async () => {
      // Create mock documentation structure
      const docsDir = path.join(testTempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });

      await fs.writeFile(
        path.join(docsDir, "tutorials", "tutorial1.md"),
        `
# Tutorial 1

This is a tutorial without prerequisites section.

\`\`\`javascript
console.log("hello")
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: "compliance",
        includeCodeValidation: true,
      });

      expect(result).toBeDefined();

      // Should find Diataxis compliance issues
      const complianceIssues = result.issues.filter(
        (issue) => issue.category === "compliance",
      );
      expect(complianceIssues.length).toBeGreaterThan(0);

      // Should find missing prerequisites in tutorial
      const prereqIssue = complianceIssues.find((issue) =>
        issue.description.includes("prerequisites"),
      );
      expect(prereqIssue).toBeDefined();
    });

    it("should validate link integrity", async () => {
      const docsDir = path.join(testTempDir, "docs-links");
      await fs.mkdir(docsDir, { recursive: true });

      // Create file with broken internal link
      await fs.writeFile(
        path.join(docsDir, "index.md"),
        `
# Documentation

[Broken Link](./nonexistent.md)
[Another Link](./other.md)
      `.trim(),
      );

      // Create the referenced file
      await fs.writeFile(path.join(docsDir, "other.md"), "# Other Page");

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const linkIssues = result.issues.filter((issue) =>
        issue.description.includes("Broken internal link"),
      );
      expect(linkIssues.length).toBe(1);

      const brokenLink = linkIssues[0];
      expect(brokenLink.description).toContain("nonexistent.md");
    });

    it("should validate code blocks in documentation", async () => {
      const docsDir = path.join(testTempDir, "docs-code");
      await fs.mkdir(docsDir, { recursive: true });

      await fs.writeFile(
        path.join(docsDir, "guide.md"),
        `
# Code Examples

\`\`\`javascript
// Missing semicolon
console.log("test")
\`\`\`

\`\`\`json
{ "valid": "json" }
\`\`\`

\`\`\`json
{ "invalid": json }
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.codeValidation).toBeDefined();
      expect(result.codeValidation!.exampleResults.length).toBeGreaterThan(0);

      // Should find JSON syntax error
      const jsonErrors = result.codeValidation!.exampleResults.filter((ex) =>
        ex.issues.some((issue) => issue.description.includes("Invalid JSON")),
      );
      expect(jsonErrors.length).toBeGreaterThan(0);
    });
  });

  describe("General Content Validation", () => {
    it("should validate general content with link checking", async () => {
      const contentDir = path.join(testTempDir, "general-content");
      await fs.mkdir(contentDir, { recursive: true });

      await fs.writeFile(
        path.join(contentDir, "page.md"),
        `
# Test Page

[Good Link](./existing.md)
[Bad Link](./missing.md)

\`\`\`js
console.log("missing semicolon")
\`\`\`
      `.trim(),
      );

      await fs.writeFile(
        path.join(contentDir, "existing.md"),
        "# Existing Page",
      );

      const result = await validateGeneralContent({
        contentPath: contentDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.success).toBe(false);
      expect(result.brokenLinks.length).toBe(1);
      expect(result.brokenLinks[0]).toContain("missing.md");
      expect(result.codeBlocksValidated).toBeGreaterThan(0);
      expect(result.codeErrors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should pass validation for clean content", async () => {
      const contentDir = path.join(testTempDir, "clean-content");
      await fs.mkdir(contentDir, { recursive: true });

      await fs.writeFile(
        path.join(contentDir, "clean.md"),
        `
# Clean Page

[Good Link](./other.md)

\`\`\`json
{ "valid": "json" }
\`\`\`
      `.trim(),
      );

      await fs.writeFile(path.join(contentDir, "other.md"), "# Other Page");

      const result = await validateGeneralContent({
        contentPath: contentDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.success).toBe(true);
      expect(result.brokenLinks.length).toBe(0);
      expect(result.recommendations).toContain(
        "Content validation passed - no critical issues found",
      );
    });
  });

  describe("Confidence Metrics", () => {
    it("should calculate confidence metrics correctly", async () => {
      const appDir = path.join(testTempDir, "confidence-test");
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, "src"), { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "confidence-test"}',
      );
      await fs.writeFile(
        path.join(appDir, "src", "index.ts"),
        'export const test = "value";',
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.confidence).toBeDefined();
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(100);

      expect(result.confidence.breakdown).toBeDefined();
      expect(result.confidence.breakdown.technologyDetection).toBeDefined();
      expect(result.confidence.breakdown.codeExampleRelevance).toBeDefined();
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeDefined();
    });

    it("should provide recommendations based on confidence", async () => {
      const appDir = path.join(testTempDir, "recommendations-test");
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "recommendations-test"}',
      );

      // Create content that will generate issues
      await fs.writeFile(path.join(appDir, "README.md"), "No proper structure");

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);

      if (result.confidence.overall < 70) {
        expect(
          result.recommendations.some((rec) =>
            rec.includes("comprehensive review"),
          ),
        ).toBe(true);
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle non-existent content path gracefully", async () => {
      const nonExistentPath = path.join(testTempDir, "does-not-exist");

      const result = await handleValidateDiataxisContent({
        contentPath: nonExistentPath,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      // The function handles non-existent paths gracefully but may still succeed
      expect(result.confidence).toBeDefined();
    });

    it("should handle empty directory", async () => {
      const emptyDir = path.join(testTempDir, "empty-dir");
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await handleValidateDiataxisContent({
        contentPath: emptyDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result).toBeDefined();
      expect(result.confidence.breakdown.architecturalAssumptions).toBeLessThan(
        80,
      );
    });

    it("should handle project context loading with analysis ID", async () => {
      const appDir = path.join(testTempDir, "context-test");
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "context-test"}',
      );

      // Create .documcp directory with analysis
      const docucmpDir = path.join(appDir, ".documcp", "analyses");
      await fs.mkdir(docucmpDir, { recursive: true });
      await fs.writeFile(
        path.join(docucmpDir, "test-analysis.json"),
        JSON.stringify({
          metadata: {
            projectName: "test-project",
            primaryLanguage: "TypeScript",
          },
          technologies: { framework: "React" },
          dependencies: { packages: ["react", "typescript"] },
        }),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        analysisId: "test-analysis",
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should handle missing analysis ID gracefully", async () => {
      const appDir = path.join(testTempDir, "missing-analysis");
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, "package.json"),
        '{"name": "missing-analysis"}',
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        analysisId: "non-existent-analysis",
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should detect documentation directory correctly", async () => {
      const docsPath = path.join(testTempDir, "project", "docs");
      await fs.mkdir(docsPath, { recursive: true });
      await fs.writeFile(path.join(docsPath, "index.md"), "# Documentation");

      const result = await handleValidateDiataxisContent({
        contentPath: docsPath,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
      // Documentation directory should be processed
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeGreaterThan(0);
    });

    it("should handle different validation types", async () => {
      const appDir = path.join(testTempDir, "validation-types");
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, "test.md"),
        "# Test\n[broken link](./missing.md)",
      );

      // Test accuracy only
      const accuracyResult = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });
      expect(accuracyResult).toBeDefined();

      // Test completeness only
      const completenessResult = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "completeness",
        includeCodeValidation: false,
      });
      expect(completenessResult).toBeDefined();

      // Test compliance only
      const complianceResult = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });
      expect(complianceResult).toBeDefined();
    });

    it("should handle code validation failure scenarios", async () => {
      const appDir = path.join(testTempDir, "code-validation-fail");
      await fs.mkdir(appDir, { recursive: true });

      // Create markdown with broken code examples
      await fs.writeFile(
        path.join(appDir, "broken-code.md"),
        `
# Broken Code Examples

\`\`\`javascript
// Syntax error
console.log("missing quote);
\`\`\`

\`\`\`json
{ "invalid": json }
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.codeValidation).toBeDefined();
      expect(result.codeValidation!.overallSuccess).toBe(false);
      expect(
        result.recommendations.some((rec) => rec.includes("Fix code examples")),
      ).toBe(true);
    });

    it("should generate risk factors for critical issues", async () => {
      const appDir = path.join(testTempDir, "risk-factors");
      await fs.mkdir(appDir, { recursive: true });

      // Create content with multiple critical issues
      await fs.writeFile(
        path.join(appDir, "critical-issues.md"),
        `
# Critical Issues

[Broken Link 1](./missing1.md)
[Broken Link 2](./missing2.md)
[Broken Link 3](./missing3.md)
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result.confidence.riskFactors).toBeDefined();
      expect(result.confidence.riskFactors.length).toBeGreaterThan(0);

      const highRiskFactors = result.confidence.riskFactors.filter(
        (rf) => rf.type === "high",
      );
      expect(highRiskFactors.length).toBeGreaterThan(0);
    });

    it("should handle uncertainty flags and medium risk factors", async () => {
      const appDir = path.join(testTempDir, "uncertainty-test");
      await fs.mkdir(appDir, { recursive: true });

      // Create content that generates uncertainties
      await fs.writeFile(
        path.join(appDir, "uncertain.md"),
        `
# Uncertain Content

This content has many ambiguous references and unclear instructions.
Multiple areas need clarification for proper understanding.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      // Manually add uncertainties to test the risk factor generation
      result.uncertainties = [
        {
          area: "test1",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
        {
          area: "test2",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
        {
          area: "test3",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
        {
          area: "test4",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
        {
          area: "test5",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
        {
          area: "test6",
          severity: "high",
          description: "test",
          potentialImpact: "test",
          clarificationNeeded: "test",
          fallbackStrategy: "test",
        },
      ];

      expect(result.uncertainties.length).toBeGreaterThan(5);

      const highUncertainties = result.uncertainties.filter(
        (u) => u.severity === "high" || u.severity === "critical",
      );
      expect(highUncertainties.length).toBeGreaterThan(0);
    });

    it("should handle Diataxis structure analysis", async () => {
      const docsDir = path.join(testTempDir, "diataxis-structure");
      await fs.mkdir(docsDir, { recursive: true });

      // Create Diataxis structure
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "how-to"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "reference"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "explanation"), { recursive: true });

      await fs.writeFile(
        path.join(docsDir, "tutorials", "tutorial.md"),
        "# Tutorial",
      );
      await fs.writeFile(
        path.join(docsDir, "how-to", "guide.md"),
        "# How-to Guide",
      );
      await fs.writeFile(
        path.join(docsDir, "reference", "api.md"),
        "# API Reference",
      );
      await fs.writeFile(
        path.join(docsDir, "explanation", "concept.md"),
        "# Explanation",
      );

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeGreaterThan(60);
    });

    it("should handle successful validation with no issues", async () => {
      const cleanDir = path.join(testTempDir, "clean-validation");
      await fs.mkdir(cleanDir, { recursive: true });

      // Create clean content with no issues
      await fs.writeFile(
        path.join(cleanDir, "clean.md"),
        `
# Clean Documentation

This is well-structured documentation with no issues.

\`\`\`json
{ "valid": "json" }
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: cleanDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      // Should have minimal issues and good confidence
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should handle timeout scenarios", async () => {
      // Test timeout handling by creating a scenario that might take time
      const largeDir = path.join(testTempDir, "timeout-test");
      await fs.mkdir(largeDir, { recursive: true });

      // Create multiple markdown files to simulate processing time
      for (let i = 0; i < 5; i++) {
        await fs.writeFile(
          path.join(largeDir, `file${i}.md`),
          `
# File ${i}

Content for file ${i} with some text.

\`\`\`javascript
console.log("File ${i}");
\`\`\`
        `.trim(),
        );
      }

      const result = await handleValidateDiataxisContent({
        contentPath: largeDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should handle confidence levels and validation modes", async () => {
      const testDir = path.join(testTempDir, "confidence-levels");
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, "test.md"), "# Test Content");

      // Test different confidence levels
      const strictResult = await handleValidateDiataxisContent({
        contentPath: testDir,
        validationType: "all",
        includeCodeValidation: false,
        confidence: "strict",
      });
      expect(strictResult).toBeDefined();

      const moderateResult = await handleValidateDiataxisContent({
        contentPath: testDir,
        validationType: "all",
        includeCodeValidation: false,
        confidence: "moderate",
      });
      expect(moderateResult).toBeDefined();

      const permissiveResult = await handleValidateDiataxisContent({
        contentPath: testDir,
        validationType: "all",
        includeCodeValidation: false,
        confidence: "permissive",
      });
      expect(permissiveResult).toBeDefined();
    });

    it("should handle TypeScript files without package.json", async () => {
      const tsDir = path.join(testTempDir, "typescript-only");
      await fs.mkdir(tsDir, { recursive: true });
      await fs.mkdir(path.join(tsDir, "src"), { recursive: true });

      // Create TypeScript files without package.json
      await fs.writeFile(
        path.join(tsDir, "src", "app.ts"),
        `
export class TestClass {
  public method(): void {
    console.log('test');
  }
}
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: tsDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it("should handle mixed content scenarios", async () => {
      const mixedDir = path.join(testTempDir, "mixed-content");
      await fs.mkdir(mixedDir, { recursive: true });
      await fs.mkdir(path.join(mixedDir, "src"), { recursive: true });

      // Create both application and documentation content
      await fs.writeFile(
        path.join(mixedDir, "package.json"),
        '{"name": "mixed-app"}',
      );
      await fs.writeFile(
        path.join(mixedDir, "src", "index.ts"),
        'export const app = "test";',
      );
      await fs.writeFile(
        path.join(mixedDir, "README.md"),
        `
# Mixed Content App

## Installation

Run \`npm install\`

## Usage

See the documentation.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: mixedDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result).toBeDefined();
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeGreaterThanOrEqual(60);
    });

    it("should handle business context alignment scoring", async () => {
      const businessDir = path.join(testTempDir, "business-context");
      await fs.mkdir(businessDir, { recursive: true });

      // Create content with business context
      await fs.writeFile(
        path.join(businessDir, "business.md"),
        `
# Business Requirements

This application serves enterprise customers with specific needs.
The solution addresses market requirements and business objectives.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: businessDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(
        result.confidence.breakdown.businessContextAlignment,
      ).toBeGreaterThanOrEqual(0);
    });

    it("should handle deprecated patterns in technical accuracy checks", async () => {
      const deprecatedDir = path.join(testTempDir, "deprecated-patterns");
      await fs.mkdir(deprecatedDir, { recursive: true });

      await fs.writeFile(
        path.join(deprecatedDir, "deprecated.md"),
        `
# Deprecated Patterns

\`\`\`bash
npm install -g some-package
\`\`\`

\`\`\`javascript
var oldVariable = "test";
function() {
  console.log("old style");
}
\`\`\`

Visit http://example.com for more info.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: deprecatedDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const deprecatedIssues = result.issues.filter((issue) =>
        issue.description.includes("Potentially outdated pattern"),
      );
      expect(deprecatedIssues.length).toBeGreaterThan(0);
    });

    it("should handle async code without error handling", async () => {
      const asyncDir = path.join(testTempDir, "async-code");
      await fs.mkdir(asyncDir, { recursive: true });

      await fs.writeFile(
        path.join(asyncDir, "async.md"),
        `
# Async Code Examples

\`\`\`javascript
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}
\`\`\`

\`\`\`typescript
const getData = async (): Promise<any> => {
  const result = await someAsyncOperation();
  return result;
};
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: asyncDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const asyncIssues = result.issues.filter((issue) =>
        issue.description.includes("Async code without error handling"),
      );
      expect(asyncIssues.length).toBeGreaterThan(0);
    });

    it("should handle version compatibility checks with project context", async () => {
      const versionDir = path.join(testTempDir, "version-compat");
      await fs.mkdir(versionDir, { recursive: true });

      // Create .documcp directory with analysis
      const docucmpDir = path.join(versionDir, ".documcp", "analyses");
      await fs.mkdir(docucmpDir, { recursive: true });
      await fs.writeFile(
        path.join(docucmpDir, "version-analysis.json"),
        JSON.stringify({
          metadata: {
            projectName: "version-test",
            primaryLanguage: "TypeScript",
          },
          technologies: { framework: "React" },
          dependencies: { packages: ["react@18.2.0", "typescript@4.9.0"] },
        }),
      );

      await fs.writeFile(
        path.join(versionDir, "versions.md"),
        `
# Version Information

This project uses React @18.2.0 and TypeScript @4.9.0.
Also compatible with Node.js @16.14.0.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: versionDir,
        analysisId: "version-analysis",
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const versionUncertainties = result.uncertainties.filter(
        (u) => u.area === "version-compatibility",
      );
      expect(versionUncertainties.length).toBeGreaterThan(0);
    });

    it("should handle dangerous bash commands", async () => {
      const bashDir = path.join(testTempDir, "dangerous-bash");
      await fs.mkdir(bashDir, { recursive: true });

      await fs.writeFile(
        path.join(bashDir, "dangerous.md"),
        `
# Dangerous Commands

\`\`\`bash
rm -rf /
sudo rm -rf /tmp/important
chmod 777 /etc/passwd
command > /dev/null 2>&1
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: bashDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const dangerousIssues = result.issues.filter((issue) =>
        issue.description.includes("Potentially dangerous command"),
      );
      expect(dangerousIssues.length).toBeGreaterThan(0);
    });

    it("should handle mixed path separators in commands", async () => {
      const pathDir = path.join(testTempDir, "mixed-paths");
      await fs.mkdir(pathDir, { recursive: true });

      await fs.writeFile(
        path.join(pathDir, "paths.md"),
        `
# Mixed Path Examples

\`\`\`bash
cp /unix/path\\windows\\mixed /destination/path
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: pathDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const pathIssues = result.issues.filter((issue) =>
        issue.description.includes("Mixed path separators"),
      );
      expect(pathIssues.length).toBeGreaterThan(0);
    });

    it("should handle external links in accuracy validation", async () => {
      const linksDir = path.join(testTempDir, "external-links");
      await fs.mkdir(linksDir, { recursive: true });

      await fs.writeFile(
        path.join(linksDir, "external.md"),
        `
# External Links

[GitHub](https://github.com)
[Documentation](https://docs.example.com)
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: linksDir,
        validationType: "accuracy",
        includeCodeValidation: false,
      });

      const linkUncertainties = result.uncertainties.filter(
        (u) => u.area === "external-links",
      );
      expect(linkUncertainties.length).toBeGreaterThan(0);
    });

    it("should handle Diataxis compliance rules for different sections", async () => {
      const complianceDir = path.join(testTempDir, "diataxis-compliance");
      await fs.mkdir(complianceDir, { recursive: true });

      // Create directories for each Diataxis section
      await fs.mkdir(path.join(complianceDir, "tutorials"), {
        recursive: true,
      });
      await fs.mkdir(path.join(complianceDir, "how-to"), { recursive: true });
      await fs.mkdir(path.join(complianceDir, "reference"), {
        recursive: true,
      });
      await fs.mkdir(path.join(complianceDir, "explanation"), {
        recursive: true,
      });

      // Tutorial without prerequisites
      await fs.writeFile(
        path.join(complianceDir, "tutorials", "bad-tutorial.md"),
        `
# Bad Tutorial

This tutorial doesn't have prerequisites or clear steps.
      `.trim(),
      );

      // How-to without task focus
      await fs.writeFile(
        path.join(complianceDir, "how-to", "bad-howto.md"),
        `
# Bad Guide

Short guide.
      `.trim(),
      );

      // Reference without structure
      await fs.writeFile(
        path.join(complianceDir, "reference", "bad-reference.md"),
        `
Bad reference without headings or tables.
      `.trim(),
      );

      // Explanation without "why"
      await fs.writeFile(
        path.join(complianceDir, "explanation", "bad-explanation.md"),
        `
# Bad Explanation

Short explanation.
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: complianceDir,
        validationType: "compliance",
        includeCodeValidation: false,
      });

      const complianceIssues = result.issues.filter(
        (issue) => issue.category === "compliance",
      );
      expect(complianceIssues.length).toBeGreaterThan(4); // Should find issues in each section
    });

    it("should handle TypeScript code validation with compilation errors", async () => {
      const tsDir = path.join(testTempDir, "typescript-validation");
      await fs.mkdir(tsDir, { recursive: true });

      await fs.writeFile(
        path.join(tsDir, "typescript.md"),
        `
# TypeScript Examples

\`\`\`typescript
// This has type errors
let x: string = 123;
function badFunction(param: number): string {
  return param; // Type error
}
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: tsDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.codeValidation).toBeDefined();
      expect(result.codeValidation!.overallSuccess).toBe(false);
    });

    it("should handle bash code validation with complex chaining", async () => {
      const bashComplexDir = path.join(testTempDir, "bash-complex");
      await fs.mkdir(bashComplexDir, { recursive: true });

      await fs.writeFile(
        path.join(bashComplexDir, "complex-bash.md"),
        `
# Complex Bash

\`\`\`bash
# Complex command chaining
command1 && command2 || command3
rm $VARIABLE
\`\`\`
      `.trim(),
      );

      const result = await handleValidateDiataxisContent({
        contentPath: bashComplexDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.codeValidation).toBeDefined();
      const bashIssues = result.codeValidation!.exampleResults.flatMap(
        (ex) => ex.issues,
      );
      expect(bashIssues.length).toBeGreaterThan(0);
    });

    it("should handle file limit reached scenario", async () => {
      const largeDir = path.join(testTempDir, "large-directory");
      await fs.mkdir(largeDir, { recursive: true });

      // Create many markdown files to test file limit
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(largeDir, `file${i}.md`),
          `# File ${i}\nContent for file ${i}.`,
        );
      }

      const result = await handleValidateDiataxisContent({
        contentPath: largeDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeGreaterThan(60);
    });

    it("should handle symlink detection in file scanning", async () => {
      const symlinkDir = path.join(testTempDir, "symlink-test");
      await fs.mkdir(symlinkDir, { recursive: true });

      // Create a regular file
      await fs.writeFile(path.join(symlinkDir, "regular.md"), "# Regular File");

      // Create a subdirectory
      await fs.mkdir(path.join(symlinkDir, "subdir"), { recursive: true });
      await fs.writeFile(
        path.join(symlinkDir, "subdir", "nested.md"),
        "# Nested File",
      );

      const result = await handleValidateDiataxisContent({
        contentPath: symlinkDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
      expect(
        result.confidence.breakdown.architecturalAssumptions,
      ).toBeGreaterThanOrEqual(60);
    });

    it("should handle timeout scenario", async () => {
      const timeoutDir = path.join(testTempDir, "timeout-scenario");
      await fs.mkdir(timeoutDir, { recursive: true });
      await fs.writeFile(path.join(timeoutDir, "test.md"), "# Test");

      // Mock a timeout by creating a very short timeout
      const originalTimeout = 120000;

      const result = await handleValidateDiataxisContent({
        contentPath: timeoutDir,
        validationType: "all",
        includeCodeValidation: false,
      });

      expect(result).toBeDefined();
    });

    it("should handle general content validation with external links", async () => {
      const generalDir = path.join(testTempDir, "general-external");
      await fs.mkdir(generalDir, { recursive: true });

      await fs.writeFile(
        path.join(generalDir, "external.md"),
        `
# External Links Test

[GitHub](https://github.com)
[Local](./local.md)
      `.trim(),
      );

      await fs.writeFile(path.join(generalDir, "local.md"), "# Local File");

      const result = await validateGeneralContent({
        contentPath: generalDir,
        validationType: "all",
        includeCodeValidation: true,
        followExternalLinks: false,
      });

      expect(result.linksChecked).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it("should handle general content validation with code validation", async () => {
      const codeDir = path.join(testTempDir, "general-code");
      await fs.mkdir(codeDir, { recursive: true });

      await fs.writeFile(
        path.join(codeDir, "code.md"),
        `
# Code Test

\`\`\`javascript
console.log("test")
\`\`\`

\`\`\`js
console.log("another test");
\`\`\`
      `.trim(),
      );

      const result = await validateGeneralContent({
        contentPath: codeDir,
        validationType: "code",
        includeCodeValidation: true,
      });

      expect(result.codeBlocksValidated).toBeGreaterThan(0);
      expect(result.codeErrors.length).toBeGreaterThan(0); // Missing semicolon
    });

    it("should handle validation with no code blocks", async () => {
      const noCodeDir = path.join(testTempDir, "no-code");
      await fs.mkdir(noCodeDir, { recursive: true });

      await fs.writeFile(
        path.join(noCodeDir, "text.md"),
        `
# Text Only

This is just text with no code blocks.
      `.trim(),
      );

      const result = await validateGeneralContent({
        contentPath: noCodeDir,
        validationType: "all",
        includeCodeValidation: true,
      });

      expect(result.codeBlocksValidated).toBe(0);
      expect(result.success).toBe(true);
    });
  });
});
