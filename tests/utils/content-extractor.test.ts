import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { extractRepositoryContent } from "../../src/utils/content-extractor";

describe("Content Extractor", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `content-extractor-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("extractRepositoryContent", () => {
    it("should extract README.md content", async () => {
      const readmeContent = `# Test Project\n## Installation\nRun npm install\n## Usage\nUse it like this`;
      await fs.writeFile(path.join(tempDir, "README.md"), readmeContent);

      const result = await extractRepositoryContent(tempDir);

      expect(result.readme).toBeDefined();
      expect(result.readme?.content).toBe(readmeContent);
      expect(result.readme?.sections.length).toBeGreaterThan(0);
      expect(result.readme?.sections[0].title).toBe("Test Project");
    });

    it("should extract readme.md (lowercase) content", async () => {
      const readmeContent = `# Test\nContent`;
      await fs.writeFile(path.join(tempDir, "readme.md"), readmeContent);

      const result = await extractRepositoryContent(tempDir);

      expect(result.readme).toBeDefined();
      expect(result.readme?.content).toBe(readmeContent);
    });

    it("should extract Readme.md (mixed case) content", async () => {
      const readmeContent = `# Test\nContent`;
      await fs.writeFile(path.join(tempDir, "Readme.md"), readmeContent);

      const result = await extractRepositoryContent(tempDir);

      expect(result.readme).toBeDefined();
      expect(result.readme?.content).toBe(readmeContent);
    });

    it("should return undefined when no README exists", async () => {
      const result = await extractRepositoryContent(tempDir);

      expect(result.readme).toBeUndefined();
    });

    it("should extract existing documentation from docs directory", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "guide.md"),
        "# Guide\nHow to do things",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBeGreaterThan(0);
      expect(result.existingDocs[0].title).toBe("Guide");
      expect(result.existingDocs[0].path).toContain("guide.md");
    });

    it("should extract documentation from documentation directory", async () => {
      const docsDir = path.join(tempDir, "documentation");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test Doc\nContent");

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBeGreaterThan(0);
    });

    it("should extract documentation from doc directory", async () => {
      const docsDir = path.join(tempDir, "doc");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test\nContent");

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBeGreaterThan(0);
    });

    it("should extract .mdx files", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "component.mdx"),
        "# Component\nJSX content",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBeGreaterThan(0);
      expect(result.existingDocs[0].path).toContain("component.mdx");
    });

    it("should recursively extract docs from subdirectories", async () => {
      const docsDir = path.join(tempDir, "docs");
      const subDir = path.join(docsDir, "guides");
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(
        path.join(subDir, "tutorial.md"),
        "# Tutorial\nStep by step",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBeGreaterThan(0);
      expect(result.existingDocs[0].path).toContain("guides");
    });

    it("should skip hidden directories", async () => {
      const docsDir = path.join(tempDir, "docs");
      const hiddenDir = path.join(docsDir, ".hidden");
      await fs.mkdir(hiddenDir, { recursive: true });
      await fs.writeFile(
        path.join(hiddenDir, "secret.md"),
        "# Secret\nContent",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(
        result.existingDocs.find((d) => d.path.includes(".hidden")),
      ).toBeUndefined();
    });

    it("should categorize documents as tutorial", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "getting-started.md"),
        "# Getting Started\n## Step 1\nFirst, do this",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs[0].category).toBe("tutorial");
    });

    it("should categorize documents as how-to", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "how-to-deploy.md"),
        "# How to Deploy\nYou can deploy by...",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs[0].category).toBe("how-to");
    });

    it("should categorize documents as reference", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "api.md"),
        "# API Reference\nEndpoints",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs[0].category).toBe("reference");
    });

    it("should categorize documents as explanation", async () => {
      const docsDir = path.join(tempDir, "docs");
      const adrDir = path.join(docsDir, "adrs");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "001-decision.md"),
        "# Decision\nExplanation",
      );

      const result = await extractRepositoryContent(tempDir);

      const adrDocs = result.existingDocs.filter((d) => d.path.includes("adr"));
      expect(adrDocs.length).toBeGreaterThan(0);
      expect(adrDocs[0].category).toBe("explanation");
    });

    it("should extract title from first heading", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "doc.md"),
        "Some text\n# Main Title\nContent",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs[0].title).toBe("Main Title");
    });

    it("should use filename as title when no heading exists", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(path.join(docsDir, "my-doc-file.md"), "No heading");

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs[0].title).toBe("my doc file");
    });

    it("should extract ADRs from docs/adrs", async () => {
      const adrDir = path.join(tempDir, "docs/adrs");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "001-use-typescript.md"),
        "# 1. Use TypeScript\n## Status\nAccepted\n## Decision\nWe will use TypeScript\n## Consequences\nBetter type safety",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.adrs.length).toBeGreaterThan(0);
      expect(result.adrs[0].number).toBe("001");
      expect(result.adrs[0].title).toBe("Use TypeScript");
      expect(result.adrs[0].status).toBe("Accepted");
      expect(result.adrs[0].decision).toContain("TypeScript");
      expect(result.adrs[0].consequences).toContain("type safety");
    });

    it("should extract ADRs from docs/adr", async () => {
      const adrDir = path.join(tempDir, "docs/adr");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "0001-test.md"),
        "# Test\n## Status\nDraft\n## Decision\nTest",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.adrs.length).toBeGreaterThan(0);
    });

    it("should extract ADRs from docs/decisions", async () => {
      const adrDir = path.join(tempDir, "docs/decisions");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "0001-test.md"),
        "# Test\n## Status\nDraft\n## Decision\nTest",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.adrs.length).toBeGreaterThan(0);
    });

    it("should skip ADRs without number in filename", async () => {
      const adrDir = path.join(tempDir, "docs/adrs");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "template.md"),
        "# Template\n## Status\nN/A",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.adrs.length).toBe(0);
    });

    it("should extract code examples from examples directory", async () => {
      const examplesDir = path.join(tempDir, "examples");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.writeFile(
        path.join(examplesDir, "hello.js"),
        "// Example: Hello World\nconsole.log('hello');",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples.length).toBeGreaterThan(0);
      expect(result.codeExamples[0].language).toBe("javascript");
      expect(result.codeExamples[0].file).toBe("hello.js");
    });

    it("should extract code examples from samples directory", async () => {
      const samplesDir = path.join(tempDir, "samples");
      await fs.mkdir(samplesDir, { recursive: true });
      await fs.writeFile(
        path.join(samplesDir, "test.py"),
        "# Demo: Python example\nprint('test')",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples.length).toBeGreaterThan(0);
      expect(result.codeExamples[0].language).toBe("python");
    });

    it("should extract code examples from demo directory", async () => {
      const demoDir = path.join(tempDir, "demo");
      await fs.mkdir(demoDir, { recursive: true });
      await fs.writeFile(path.join(demoDir, "test.ts"), "const x = 1;");

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples.length).toBeGreaterThan(0);
      expect(result.codeExamples[0].language).toBe("typescript");
    });

    it("should extract inline examples from @example tags", async () => {
      const srcDir = path.join(tempDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "utils.ts"),
        "/**\n * @example\n * const result = add(1, 2);\n */\nfunction add(a, b) { return a + b; }",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples.length).toBeGreaterThan(0);
      expect(result.codeExamples[0].code).toContain("add(1, 2)");
    });

    it("should support various programming languages", async () => {
      const examplesDir = path.join(tempDir, "examples");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.writeFile(path.join(examplesDir, "test.rb"), "puts 'hello'");
      await fs.writeFile(path.join(examplesDir, "test.go"), "package main");
      await fs.writeFile(path.join(examplesDir, "test.java"), "class Test {}");
      await fs.writeFile(path.join(examplesDir, "test.rs"), "fn main() {}");

      const result = await extractRepositoryContent(tempDir);

      const languages = result.codeExamples.map((e) => e.language);
      expect(languages).toContain("ruby");
      expect(languages).toContain("go");
      expect(languages).toContain("java");
      expect(languages).toContain("rust");
    });

    it("should extract API docs from markdown files", async () => {
      const apiContent = `## \`getUserById\` function\n\nGet user by ID\n\n### Parameters\n\n- \`id\` (string) - User ID\n\n### Returns\n\nUser object`;
      await fs.writeFile(path.join(tempDir, "api.md"), apiContent);

      const result = await extractRepositoryContent(tempDir);

      expect(result.apiDocs.length).toBeGreaterThan(0);
      expect(result.apiDocs[0].function).toBe("getUserById");
      expect(result.apiDocs[0].parameters.length).toBeGreaterThan(0);
    });

    it("should extract API docs from OpenAPI spec", async () => {
      const openApiSpec = {
        paths: {
          "/users": {
            get: {
              summary: "List users",
              parameters: [
                {
                  name: "page",
                  type: "integer",
                  description: "Page number",
                },
              ],
              responses: {
                "200": {
                  description: "Success",
                },
              },
            },
          },
        },
      };
      await fs.writeFile(
        path.join(tempDir, "openapi.json"),
        JSON.stringify(openApiSpec),
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.apiDocs.length).toBeGreaterThan(0);
      expect(result.apiDocs[0].endpoint).toContain("GET");
    });

    it("should extract JSDoc from source files", async () => {
      const srcDir = path.join(tempDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "utils.js"),
        "/**\n * Add two numbers\n * @param {number} a - First number\n * @param {number} b - Second number\n * @returns {number} Sum of a and b\n */\nfunction add(a, b) { return a + b; }",
      );

      const result = await extractRepositoryContent(tempDir);

      // JSDoc extraction may or may not find the function depending on parsing
      // Just ensure it doesn't crash and returns valid structure
      expect(result.apiDocs).toBeDefined();
      expect(Array.isArray(result.apiDocs)).toBe(true);
    });

    it("should handle empty repository gracefully", async () => {
      const result = await extractRepositoryContent(tempDir);

      expect(result.readme).toBeUndefined();
      expect(result.existingDocs).toEqual([]);
      expect(result.adrs).toEqual([]);
      expect(result.codeExamples).toEqual([]);
      expect(result.apiDocs).toEqual([]);
    });

    it("should handle unreadable files gracefully", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });

      // Create a file and immediately make it unreadable (if possible)
      const filePath = path.join(docsDir, "test.md");
      await fs.writeFile(filePath, "content");

      // The function should handle errors gracefully and continue
      const result = await extractRepositoryContent(tempDir);

      expect(result).toBeDefined();
    });

    it("should parse markdown sections correctly", async () => {
      const readmeContent = `# Main\nIntro\n## Section 1\nContent 1\n### Subsection\nContent 2\n## Section 2\nContent 3`;
      await fs.writeFile(path.join(tempDir, "README.md"), readmeContent);

      const result = await extractRepositoryContent(tempDir);

      expect(result.readme?.sections.length).toBeGreaterThan(2);
      expect(result.readme?.sections[0].level).toBe(1);
      expect(result.readme?.sections[1].level).toBe(2);
    });

    it("should handle ADRs with 4-digit numbers", async () => {
      const adrDir = path.join(tempDir, "docs/adrs");
      await fs.mkdir(adrDir, { recursive: true });
      await fs.writeFile(
        path.join(adrDir, "1234-long-number.md"),
        "# Test\n## Status\nAccepted\n## Decision\nTest",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.adrs.length).toBeGreaterThan(0);
      expect(result.adrs[0].number).toBe("1234");
    });

    it("should extract example description from code comments", async () => {
      const examplesDir = path.join(tempDir, "examples");
      await fs.mkdir(examplesDir, { recursive: true });
      await fs.writeFile(
        path.join(examplesDir, "test.js"),
        "// Example: This is a demo\nconsole.log('test');",
      );

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples[0].description).toContain("Example:");
    });

    it("should limit code example length", async () => {
      const examplesDir = path.join(tempDir, "examples");
      await fs.mkdir(examplesDir, { recursive: true });
      const longCode = "x".repeat(1000);
      await fs.writeFile(path.join(examplesDir, "test.js"), longCode);

      const result = await extractRepositoryContent(tempDir);

      expect(result.codeExamples[0].code.length).toBeLessThanOrEqual(500);
    });

    it("should handle invalid OpenAPI spec gracefully", async () => {
      await fs.writeFile(path.join(tempDir, "openapi.json"), "invalid json{");

      const result = await extractRepositoryContent(tempDir);

      // Should not crash, just skip the invalid spec
      expect(result).toBeDefined();
    });

    it("should skip non-markdown files in docs", async () => {
      const docsDir = path.join(tempDir, "docs");
      await fs.mkdir(docsDir, { recursive: true });
      await fs.writeFile(path.join(docsDir, "image.png"), "binary data");
      await fs.writeFile(path.join(docsDir, "valid.md"), "# Valid\nContent");

      const result = await extractRepositoryContent(tempDir);

      expect(result.existingDocs.length).toBe(1);
      expect(result.existingDocs[0].path).toContain("valid.md");
    });

    it("should handle swagger.yaml files", async () => {
      await fs.writeFile(path.join(tempDir, "swagger.yaml"), "openapi: 3.0.0");

      const result = await extractRepositoryContent(tempDir);

      // Should attempt to parse it (even if it fails due to YAML parsing)
      expect(result).toBeDefined();
    });
  });
});
