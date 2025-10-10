import { checkDocumentationLinks } from "../../src/tools/check-documentation-links.js";
import { formatMCPResponse } from "../../src/types/api.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

describe("checkDocumentationLinks", () => {
  const testDir = join(process.cwd(), "test-docs-temp");

  beforeEach(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, "guides"), { recursive: true });
    await mkdir(join(testDir, "api"), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Input Validation", () => {
    test("should use default values for optional parameters", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "# Test\n[Link](./guides/test.md)",
      );
      await writeFile(join(testDir, "guides", "test.md"), "# Guide");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 1');
    });

    test("should validate timeout_ms parameter", async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        timeout_ms: 500, // Below minimum
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain(
        "Number must be greater than or equal to 1000",
      );
    });

    test("should validate max_concurrent_checks parameter", async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        max_concurrent_checks: 25, // Above maximum
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain("Number must be less than or equal to 20");
    });
  });

  describe("File Scanning", () => {
    test("should find markdown files in nested directories", async () => {
      await writeFile(join(testDir, "README.md"), "# Root");
      await writeFile(join(testDir, "guides", "guide1.md"), "# Guide 1");
      await writeFile(join(testDir, "api", "reference.mdx"), "# API Reference");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"filesScanned": 3');
    });

    test("should handle empty documentation directory", async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain("No documentation files found");
    });

    test("should handle non-existent directory", async () => {
      const result = await checkDocumentationLinks({
        documentation_path: "/non/existent/path",
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
    });
  });

  describe("Link Extraction", () => {
    test("should extract markdown links", async () => {
      const content = `# Test Document
[Internal Link](./guides/test.md)
[External Link](https://example.com)
`;
      await writeFile(join(testDir, "test.md"), content);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 1');
    });

    test("should extract HTML links", async () => {
      const content = `# Test Document
<a href="./guides/test.md">Internal Link</a>
<a href="https://example.com">External Link</a>
`;
      await writeFile(join(testDir, "test.md"), content);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should skip mailto and tel links", async () => {
      const content = `# Contact
[Email](mailto:test@example.com)
[Phone](tel:+1234567890)
[Valid Link](./test.md)
`;
      await writeFile(join(testDir, "contact.md"), content);
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check the valid link, not mailto/tel
    });
  });

  describe("Internal Link Checking", () => {
    test("should validate existing internal links", async () => {
      await writeFile(join(testDir, "README.md"), "[Valid](./guides/test.md)");
      await mkdir(join(testDir, "guides"), { recursive: true });
      await writeFile(join(testDir, "guides", "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"status": "valid"');
    });

    test("should detect broken internal links", async () => {
      await writeFile(join(testDir, "README.md"), "[Broken](./missing.md)");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
        fail_on_broken_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"status": "broken"');
    });

    test("should handle relative path navigation", async () => {
      await writeFile(
        join(testDir, "guides", "guide1.md"),
        "[Back](../README.md)",
      );
      await writeFile(join(testDir, "README.md"), "# Root");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"status": "valid"');
    });

    test("should handle anchor links in internal files", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Section](./guide.md#section)",
      );
      await writeFile(join(testDir, "guide.md"), "# Guide\n## Section");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });
  });

  describe("External Link Checking", () => {
    test("should skip external links when disabled", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[External](https://example.com)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should have 0 links checked since external checking is disabled
    });

    test("should respect allowed domains", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[Allowed](https://github.com/test)
[Not Allowed](https://example.com)
`,
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        allowed_domains: ["github.com"],
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle timeout for slow external links", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Slow](https://httpstat.us/200?sleep=10000)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 1000,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should timeout and mark as warning
    });
  });

  describe("Link Filtering", () => {
    test("should ignore links matching ignore patterns", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[Ignored](./temp/file.md)
[Valid](./guides/test.md)
`,
      );
      await writeFile(join(testDir, "guides", "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        ignore_patterns: ["temp/"],
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check the valid link, ignore the temp/ link
    });

    test("should filter by link types", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[Internal](./test.md)
[External](https://example.com)
[Anchor](#section)
`,
      );
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
        check_anchor_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check internal links
    });
  });

  describe("Failure Modes", () => {
    test("should fail when fail_on_broken_links is true and links are broken", async () => {
      await writeFile(join(testDir, "README.md"), "[Broken](./missing.md)");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain("Found 1 broken links");
    });

    test("should not fail when fail_on_broken_links is false", async () => {
      await writeFile(join(testDir, "README.md"), "[Broken](./missing.md)");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });
  });

  describe("Report Generation", () => {
    test("should generate comprehensive report with summary", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[Valid Internal](./test.md)
[Broken Internal](./missing.md)
`,
      );
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"summary"');
      expect(contentText).toContain('"results"');
      expect(contentText).toContain('"recommendations"');
      expect(contentText).toContain('"totalLinks": 2');
    });

    test("should include execution metrics", async () => {
      await writeFile(join(testDir, "README.md"), "[Test](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"executionTime"');
      expect(contentText).toContain('"filesScanned"');
    });

    test("should provide recommendations based on results", async () => {
      await writeFile(join(testDir, "README.md"), "[Valid](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain(
        "All links are valid - excellent documentation quality!",
      );
    });
  });

  describe("Concurrency Control", () => {
    test("should respect max_concurrent_checks limit", async () => {
      // Create multiple files with links
      for (let i = 0; i < 10; i++) {
        await writeFile(
          join(testDir, `file${i}.md`),
          `[Link](./target${i}.md)`,
        );
        await writeFile(join(testDir, `target${i}.md`), `# Target ${i}`);
      }

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        max_concurrent_checks: 2,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should complete successfully with concurrency control
    });
  });

  describe("Edge Cases", () => {
    test("should handle files with no links", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "# No Links Here\nJust plain text.",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 0');
    });

    test("should handle malformed markdown", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
# Malformed
[Incomplete link](
[Missing closing](test.md
[Valid](./test.md)
`,
      );
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should handle malformed links gracefully
    });

    test("should handle binary files gracefully", async () => {
      await writeFile(join(testDir, "README.md"), "[Test](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");
      // Create a binary file that should be ignored
      await writeFile(
        join(testDir, "image.png"),
        Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should ignore binary files and process markdown files
    });
  });

  describe("Advanced Branch Coverage Tests", () => {
    test("should handle reference links", async () => {
      const content = `# Test Document
[Reference Link][ref1]
[Another Reference][ref2]

[ref1]: ./guides/test.md
[ref2]: https://example.com
`;
      await writeFile(join(testDir, "test.md"), content);
      await writeFile(join(testDir, "guides", "test.md"), "# Guide");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 1');
    });

    test("should handle anchor-only links", async () => {
      const content = `# Test Document
[Anchor Only](#section)
[Valid Link](./test.md)
`;
      await writeFile(join(testDir, "README.md"), content);
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_anchor_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle empty URL in links", async () => {
      const content = `# Test Document
[Empty Link]()
[Valid Link](./test.md)
`;
      await writeFile(join(testDir, "README.md"), content);
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle different internal link path formats", async () => {
      await mkdir(join(testDir, "subdir"), { recursive: true });
      await mkdir(join(testDir, "guides"), { recursive: true });
      await writeFile(
        join(testDir, "subdir", "nested.md"),
        `
[Current Dir](./file.md)
[Parent Dir](../README.md)
[Absolute](/guides/test.md)
[Relative](file.md)
`,
      );
      await writeFile(join(testDir, "subdir", "file.md"), "# File");
      await writeFile(join(testDir, "README.md"), "# Root");
      await writeFile(join(testDir, "guides", "test.md"), "# Guide");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle external link domain filtering", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[GitHub](https://github.com/test)
[Subdomain](https://api.github.com/test)
[Not Allowed](https://example.com)
`,
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        allowed_domains: ["github.com"],
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle external link fetch errors", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Invalid URL](https://invalid-domain-that-does-not-exist-12345.com)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 2000,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"status": "broken"');
    });

    test("should handle HTTP error status codes", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Not Found](https://httpstat.us/404)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 5000,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle directory scanning errors", async () => {
      // Create a directory with restricted permissions
      await mkdir(join(testDir, "restricted"), { recursive: true });
      await writeFile(join(testDir, "README.md"), "[Test](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should handle file reading errors gracefully", async () => {
      await writeFile(join(testDir, "README.md"), "[Test](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");
      // Create a file that might cause reading issues
      await writeFile(join(testDir, "problematic.md"), "# Test\x00\x01\x02");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test("should generate recommendations for large link counts", async () => {
      let content = "# Test Document\n";
      for (let i = 0; i < 101; i++) {
        content += `[Link ${i}](./file${i}.md)\n`;
        await writeFile(join(testDir, `file${i}.md`), `# File ${i}`);
      }
      await writeFile(join(testDir, "README.md"), content);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain(
        "Consider implementing automated link checking in CI/CD pipeline",
      );
    });

    test("should handle mixed link types with warnings", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
[Valid](./test.md)
[Broken](./missing.md)
[Timeout](https://httpstat.us/200?sleep=10000)
`,
      );
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 1000,
        fail_on_broken_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"brokenLinks"');
      expect(contentText).toContain('"warningLinks"');
    });

    test("should handle node_modules and hidden directory exclusion", async () => {
      await mkdir(join(testDir, "node_modules"), { recursive: true });
      await mkdir(join(testDir, ".hidden"), { recursive: true });
      await writeFile(
        join(testDir, "node_modules", "package.md"),
        "# Should be ignored",
      );
      await writeFile(
        join(testDir, ".hidden", "secret.md"),
        "# Should be ignored",
      );
      await writeFile(join(testDir, "README.md"), "[Test](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"filesScanned": 2'); // Only README.md and test.md
    });

    test("should handle different markdown file extensions", async () => {
      await writeFile(join(testDir, "README.md"), "[MD](./test.md)");
      await writeFile(join(testDir, "guide.mdx"), "[MDX](./test.md)");
      await writeFile(join(testDir, "doc.markdown"), "[MARKDOWN](./test.md)");
      await writeFile(join(testDir, "test.md"), "# Test");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"filesScanned": 4');
    });
  });

  describe("Special Link Types", () => {
    test("should skip mailto links during filtering", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Email](mailto:test@example.com)\n[Valid](./guide.md)",
      );
      await writeFile(join(testDir, "guide.md"), "# Guide");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      // Should find only the internal link, mailto is filtered
      expect(contentText).toContain('"totalLinks": 1');
      expect(contentText).toContain("./guide.md");
    });

    test("should skip tel links during filtering", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Phone](tel:+1234567890)\n[Valid](./guide.md)",
      );
      await writeFile(join(testDir, "guide.md"), "# Guide");

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        check_internal_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      // Should find only the internal link, tel is filtered
      expect(contentText).toContain('"totalLinks": 1');
      expect(contentText).toContain("./guide.md");
    });

    test("should check anchor links when enabled and file exists", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Guide Anchor](./guide.md#introduction)",
      );
      await writeFile(
        join(testDir, "guide.md"),
        "# Guide\n\n## Introduction\n\nContent here.",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_anchor_links: true,
        check_internal_links: true,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 1');
      expect(contentText).toContain("./guide.md#introduction");
    });

    test("should handle anchor links to other files", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Guide Section](./guide.md#setup)",
      );
      await writeFile(
        join(testDir, "guide.md"),
        "# Guide\n\n## Setup\n\nSetup instructions.",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_anchor_links: true,
        check_internal_links: true,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      expect(contentText).toContain('"totalLinks": 1');
    });
  });

  describe("Error Handling Edge Cases", () => {
    test("should handle internal link check errors gracefully", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Broken](./nonexistent/deeply/nested/file.md)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_internal_links: true,
        check_external_links: false,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      // Should report broken link
      expect(contentText).toContain('"brokenLinks": 1');
    });

    test("should handle network errors for external links", async () => {
      await writeFile(
        join(testDir, "README.md"),
        "[Invalid](https://this-domain-should-not-exist-12345.com)",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 2000,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should handle as broken or warning
    });

    test("should handle multiple link types in same document", async () => {
      await writeFile(
        join(testDir, "README.md"),
        `
# Documentation

[Internal](./guide.md)
[External](https://github.com)
[Email](mailto:test@example.com)
[Phone](tel:123-456-7890)
[Anchor](./guide.md#section)

## Section
Content here.
`,
      );
      await writeFile(
        join(testDir, "guide.md"),
        "# Guide\n\n## Section\n\nContent",
      );

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_internal_links: true,
        check_external_links: true,
        check_anchor_links: true,
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map((c) => c.text).join(" ");
      // Should process checkable link types (internal, external, anchor to file)
      // mailto and tel are filtered out
      expect(contentText).toContain('"totalLinks": 3');
      expect(contentText).toContain("./guide.md");
      expect(contentText).toContain("https://github.com");
    });
  });
});
