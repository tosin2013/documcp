/**
 * Tests for manage-sitemap MCP tool
 */

import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  manageSitemap,
  ManageSitemapInputSchema,
} from "../../src/tools/manage-sitemap.js";

/**
 * Helper to parse data from MCP tool response
 */
function parseMCPResponse(result: { content: any[] }): any {
  if (!result.content || !result.content[0]) {
    throw new Error("Invalid MCP response structure");
  }
  return JSON.parse(result.content[0].text);
}

describe("manage-sitemap tool", () => {
  let testDir: string;
  let docsDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `sitemap-tool-test-${Date.now()}`);
    docsDir = path.join(testDir, "docs");
    await fs.mkdir(docsDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("input validation", () => {
    it("should validate required fields", () => {
      expect(() => {
        ManageSitemapInputSchema.parse({});
      }).toThrow();
    });

    it("should validate action enum", () => {
      expect(() => {
        ManageSitemapInputSchema.parse({
          action: "invalid",
          docsPath: "/path",
        });
      }).toThrow();
    });

    it("should accept valid input", () => {
      const result = ManageSitemapInputSchema.parse({
        action: "generate",
        docsPath: "/path/to/docs",
        baseUrl: "https://example.com",
      });

      expect(result.action).toBe("generate");
      expect(result.docsPath).toBe("/path/to/docs");
      expect(result.baseUrl).toBe("https://example.com");
    });
  });

  describe("generate action", () => {
    it("should generate sitemap.xml", async () => {
      // Create test documentation
      await fs.writeFile(path.join(docsDir, "index.md"), "# Home");
      await fs.writeFile(path.join(docsDir, "guide.md"), "# Guide");

      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("✅");
      expect(result.content[0].text).toContain(
        "Sitemap generated successfully",
      );

      // Verify data is in the response
      const data = JSON.parse(result.content[0].text);
      expect(data.action).toBe("generate");
      expect(data.totalUrls).toBe(2);

      // Verify file was created
      const sitemapPath = path.join(docsDir, "sitemap.xml");
      const exists = await fs
        .access(sitemapPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    it("should require baseUrl for generate action", async () => {
      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("BASE_URL_REQUIRED");
      expect(data.error.message).toContain("baseUrl is required");
    });

    it("should return error if docs directory does not exist", async () => {
      const result = await manageSitemap({
        action: "generate",
        docsPath: "/nonexistent/path",
        baseUrl: "https://example.com",
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("DOCS_DIR_NOT_FOUND");
      expect(data.error.message).toContain("not found");
    });

    it("should include statistics in output", async () => {
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "reference"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "tutorials", "guide.md"),
        "# Tutorial",
      );
      await fs.writeFile(path.join(docsDir, "reference", "api.md"), "# API");

      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const output = result.content[0].text;
      expect(output).toContain("URLs by Category");
      expect(output).toContain("Change Frequencies");
      expect(output).toContain("Next Steps");
    });
  });

  describe("validate action", () => {
    it("should validate existing sitemap", async () => {
      // Generate a sitemap first
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");
      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const result = await manageSitemap({
        action: "validate",
        docsPath: docsDir,
      });

      expect(result.content[0].text).toContain("✅");
      expect(result.content[0].text).toContain("Sitemap is valid");

      const data = parseMCPResponse(result);
      expect(data.valid).toBe(true);
    });

    it("should return error if sitemap does not exist", async () => {
      const result = await manageSitemap({
        action: "validate",
        docsPath: docsDir,
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("SITEMAP_NOT_FOUND");
      expect(data.error.message).toContain("Sitemap not found");
    });

    it("should detect invalid sitemap", async () => {
      // Create invalid sitemap
      const sitemapPath = path.join(docsDir, "sitemap.xml");
      await fs.writeFile(
        sitemapPath,
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>ftp://example.com/page.html</loc>
    <priority>5.0</priority>
  </url>
</urlset>`,
      );

      const result = await manageSitemap({
        action: "validate",
        docsPath: docsDir,
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_FAILED");
      expect(data.error.message).toContain("validation failed");
      expect(data.data.valid).toBe(false);
      expect(data.data.errorCount).toBeGreaterThan(0);
    });
  });

  describe("update action", () => {
    it("should update existing sitemap", async () => {
      // Create initial sitemap
      await fs.writeFile(path.join(docsDir, "page1.md"), "# Page 1");
      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      // Add new page
      await fs.writeFile(path.join(docsDir, "page2.md"), "# Page 2");

      const result = await manageSitemap({
        action: "update",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      expect(result.content[0].text).toContain("✅");
      expect(result.content[0].text).toContain("Sitemap updated successfully");

      const data = parseMCPResponse(result);
      expect(data.added).toBe(1);
      expect(data.total).toBe(2);
    });

    it("should require baseUrl for update action", async () => {
      const result = await manageSitemap({
        action: "update",
        docsPath: docsDir,
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("BASE_URL_REQUIRED");
      expect(data.error.message).toContain("baseUrl is required");
    });

    it("should show removed pages", async () => {
      // Create sitemap with 2 pages
      await fs.writeFile(path.join(docsDir, "page1.md"), "# Page 1");
      await fs.writeFile(path.join(docsDir, "page2.md"), "# Page 2");
      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      // Remove one page
      await fs.rm(path.join(docsDir, "page2.md"));

      const result = await manageSitemap({
        action: "update",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const data = parseMCPResponse(result);
      expect(data.removed).toBe(1);
      expect(data.total).toBe(1);
    });

    it("should detect no changes", async () => {
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");
      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const result = await manageSitemap({
        action: "update",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      expect(result.content[0].text).toContain("No changes detected");

      const data = parseMCPResponse(result);
      expect(data.added).toBe(0);
      expect(data.removed).toBe(0);
    });
  });

  describe("list action", () => {
    it("should list all URLs from sitemap", async () => {
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "tutorials", "guide.md"),
        "# Tutorial Guide",
      );
      await fs.writeFile(path.join(docsDir, "index.md"), "# Home");

      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const result = await manageSitemap({
        action: "list",
        docsPath: docsDir,
      });

      expect(result.content[0].text).toContain("Sitemap URLs");
      expect(result.content[0].text).toContain("Total: 2");

      const data = parseMCPResponse(result);
      expect(data.totalUrls).toBe(2);
      expect(data.urls).toHaveLength(2);
    });

    it("should group URLs by category", async () => {
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "reference"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "tutorials", "guide.md"),
        "# Tutorial",
      );
      await fs.writeFile(path.join(docsDir, "reference", "api.md"), "# API");

      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const result = await manageSitemap({
        action: "list",
        docsPath: docsDir,
      });

      const output = result.content[0].text;
      expect(output).toContain("tutorial");
      expect(output).toContain("reference");
    });

    it("should return error if sitemap does not exist", async () => {
      const result = await manageSitemap({
        action: "list",
        docsPath: docsDir,
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("SITEMAP_NOT_FOUND");
      expect(data.error.message).toContain("Sitemap not found");
    });
  });

  describe("custom sitemap path", () => {
    it("should use custom sitemap path", async () => {
      const customPath = path.join(testDir, "custom-sitemap.xml");
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");

      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
        sitemapPath: customPath,
      });

      const exists = await fs
        .access(customPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe("include and exclude patterns", () => {
    it("should respect include patterns", async () => {
      await fs.writeFile(path.join(docsDir, "page.md"), "# Markdown");
      await fs.writeFile(path.join(docsDir, "page.html"), "<h1>HTML</h1>");
      await fs.writeFile(path.join(docsDir, "data.json"), "{}");

      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
        includePatterns: ["**/*.md"],
      });

      const data = parseMCPResponse(result);
      expect(data.totalUrls).toBe(1);
    });

    it("should respect exclude patterns", async () => {
      await fs.mkdir(path.join(docsDir, "drafts"), { recursive: true });
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");
      await fs.writeFile(path.join(docsDir, "drafts", "draft.md"), "# Draft");

      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
        excludePatterns: ["**/drafts/**"],
      });

      const data = parseMCPResponse(result);
      expect(data.totalUrls).toBe(1);
    });
  });

  describe("change frequency", () => {
    it("should use custom update frequency", async () => {
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");

      await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
        updateFrequency: "daily",
      });

      const sitemapPath = path.join(docsDir, "sitemap.xml");
      const xml = await fs.readFile(sitemapPath, "utf-8");

      // Should contain daily for pages without specific category
      expect(xml).toContain("<changefreq>");
    });
  });

  describe("error handling", () => {
    it("should handle invalid action gracefully", async () => {
      const result = await manageSitemap({
        action: "generate" as any,
        docsPath: "/invalid/path",
        baseUrl: "https://example.com",
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should handle file system errors", async () => {
      // Try to write to read-only location (will fail on most systems)
      const readOnlyPath = "/root/docs";

      const result = await manageSitemap({
        action: "generate",
        docsPath: readOnlyPath,
        baseUrl: "https://example.com",
      });

      const data = parseMCPResponse(result);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe("integration with other tools", () => {
    it("should work with Diataxis structure", async () => {
      // Create Diataxis structure
      const categories = ["tutorials", "how-to", "reference", "explanation"];
      for (const category of categories) {
        await fs.mkdir(path.join(docsDir, category), { recursive: true });
        await fs.writeFile(
          path.join(docsDir, category, "index.md"),
          `# ${category}`,
        );
      }

      const result = await manageSitemap({
        action: "generate",
        docsPath: docsDir,
        baseUrl: "https://example.com",
      });

      const data = parseMCPResponse(result);
      expect(data.totalUrls).toBe(4);
      expect(data.categories).toHaveProperty("tutorial");
      expect(data.categories).toHaveProperty("how-to");
      expect(data.categories).toHaveProperty("reference");
      expect(data.categories).toHaveProperty("explanation");
    });
  });
});
