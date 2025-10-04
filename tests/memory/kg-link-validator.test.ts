import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  validateExternalLinks,
  validateAndStoreDocumentationLinks,
  extractLinksFromContent,
} from "../../src/memory/kg-link-validator";

describe("KG Link Validator", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `kg-link-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("validateExternalLinks", () => {
    it("should validate valid URLs", async () => {
      const urls = ["https://www.google.com", "https://github.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.totalLinks).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.validLinks + result.brokenLinks + result.unknownLinks).toBe(
        2,
      );
    });

    it("should detect broken links", async () => {
      const urls = ["https://this-domain-definitely-does-not-exist-12345.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 3000,
      });

      expect(result.totalLinks).toBe(1);
      expect(result.results).toHaveLength(1);
      // Should be either broken or unknown
      expect(result.brokenLinks + result.unknownLinks).toBeGreaterThan(0);
    });

    it("should handle empty URL list", async () => {
      const result = await validateExternalLinks([]);

      expect(result.totalLinks).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should respect timeout option", async () => {
      const urls = ["https://www.google.com"];

      const startTime = Date.now();
      await validateExternalLinks(urls, {
        timeout: 1000,
      });
      const duration = Date.now() - startTime;

      // Should complete reasonably quickly
      expect(duration).toBeLessThan(10000);
    });
  });

  describe("extractLinksFromContent", () => {
    it("should extract external links", () => {
      const content = `
        # Test
        [Google](https://www.google.com)
        [GitHub](https://github.com)
      `;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks.length).toBeGreaterThan(0);
    });

    it("should extract internal links", () => {
      const content = `
        # Test
        [Page 1](./page1.md)
        [Page 2](../page2.md)
      `;

      const result = extractLinksFromContent(content);

      expect(result.internalLinks.length).toBeGreaterThan(0);
    });

    it("should handle mixed links", () => {
      const content = `
        # Test
        [External](https://example.com)
        [Internal](./page.md)
      `;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks.length).toBeGreaterThan(0);
      expect(result.internalLinks.length).toBeGreaterThan(0);
    });
  });

  describe("validateAndStoreDocumentationLinks", () => {
    it("should validate and store documentation links", async () => {
      const content =
        "# Test\n[Link](./other.md)\n[External](https://example.com)";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      expect(result.totalLinks).toBeGreaterThan(0);
    });

    it("should handle documentation without links", async () => {
      const content = "# Test\nNo links here";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      expect(result.totalLinks).toBe(0);
    });

    it("should handle content with only internal links", async () => {
      const content = "# Test\n[Page](./page.md)";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      // Only external links are validated
      expect(result.totalLinks).toBe(0);
    });
  });
});
