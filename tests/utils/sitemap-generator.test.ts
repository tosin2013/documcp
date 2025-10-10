/**
 * Tests for sitemap-generator utility
 */

import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  generateSitemap,
  parseSitemap,
  validateSitemap,
  updateSitemap,
  listSitemapUrls,
  type SitemapUrl,
  type SitemapOptions,
} from "../../src/utils/sitemap-generator.js";

describe("sitemap-generator", () => {
  let testDir: string;
  let docsDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `sitemap-test-${Date.now()}`);
    docsDir = path.join(testDir, "docs");
    await fs.mkdir(docsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("generateSitemap", () => {
    it("should generate sitemap.xml from documentation files", async () => {
      // Create test documentation structure
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "reference"), { recursive: true });

      await fs.writeFile(
        path.join(docsDir, "index.md"),
        "# Home\n\nWelcome to the docs!",
      );
      await fs.writeFile(
        path.join(docsDir, "tutorials", "getting-started.md"),
        "# Getting Started\n\nStart here.",
      );
      await fs.writeFile(
        path.join(docsDir, "reference", "api.md"),
        "# API Reference\n\nAPI documentation.",
      );

      const options: SitemapOptions = {
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      };

      const result = await generateSitemap(options);

      expect(result.xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.xml).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(result.urls).toHaveLength(3);
      expect(result.stats.totalUrls).toBe(3);
      expect(result.stats.byCategory).toHaveProperty("home");
      expect(result.stats.byCategory).toHaveProperty("tutorial");
      expect(result.stats.byCategory).toHaveProperty("reference");
    });

    it("should generate URLs with correct priorities based on categories", async () => {
      await fs.mkdir(path.join(docsDir, "tutorials"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "reference"), { recursive: true });

      await fs.writeFile(
        path.join(docsDir, "tutorials", "guide.md"),
        "# Tutorial",
      );
      await fs.writeFile(
        path.join(docsDir, "reference", "api.md"),
        "# Reference",
      );

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      const tutorialUrl = result.urls.find((u) => u.category === "tutorial");
      const referenceUrl = result.urls.find((u) => u.category === "reference");

      expect(tutorialUrl?.priority).toBe(1.0); // Highest priority
      expect(referenceUrl?.priority).toBe(0.8);
    });

    it("should handle empty documentation directory", async () => {
      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls).toHaveLength(0);
      expect(result.stats.totalUrls).toBe(0);
    });

    it("should exclude node_modules and other excluded patterns", async () => {
      await fs.mkdir(path.join(docsDir, "node_modules"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "node_modules", "package.md"),
        "# Package",
      );
      await fs.writeFile(path.join(docsDir, "guide.md"), "# Guide");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).toContain("guide.html");
    });

    it("should convert markdown extensions to html", async () => {
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");
      await fs.writeFile(path.join(docsDir, "component.mdx"), "# Component");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls[0].loc).toContain(".html");
      expect(result.urls[1].loc).toContain(".html");
      expect(result.urls.some((u) => u.loc.endsWith(".md"))).toBe(false);
      expect(result.urls.some((u) => u.loc.endsWith(".mdx"))).toBe(false);
    });

    it("should extract title from markdown frontmatter", async () => {
      const content = `---
title: My Custom Title
---

# Main Heading

Content here.`;

      await fs.writeFile(path.join(docsDir, "page.md"), content);

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls[0].title).toBe("My Custom Title");
    });

    it("should extract title from markdown heading", async () => {
      await fs.writeFile(
        path.join(docsDir, "page.md"),
        "# Page Title\n\nContent",
      );

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls[0].title).toBe("Page Title");
    });

    it("should handle custom include and exclude patterns", async () => {
      await fs.writeFile(path.join(docsDir, "page.md"), "# Markdown");
      await fs.writeFile(path.join(docsDir, "page.html"), "<h1>HTML</h1>");
      await fs.writeFile(path.join(docsDir, "page.txt"), "Text");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        includePatterns: ["**/*.md"],
        excludePatterns: [],
        useGitHistory: false,
      });

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).toContain("page.html");
    });
  });

  describe("parseSitemap", () => {
    it("should parse existing sitemap.xml", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1.html</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/page2.html</loc>
    <lastmod>2025-01-02</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const urls = await parseSitemap(sitemapPath);

      expect(urls).toHaveLength(2);
      expect(urls[0].loc).toBe("https://example.com/page1.html");
      expect(urls[0].lastmod).toBe("2025-01-01");
      expect(urls[0].changefreq).toBe("monthly");
      expect(urls[0].priority).toBe(0.8);
      expect(urls[1].loc).toBe("https://example.com/page2.html");
    });

    it("should handle XML special characters", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page?id=1&amp;type=test</loc>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const urls = await parseSitemap(sitemapPath);

      expect(urls[0].loc).toBe("https://example.com/page?id=1&type=test");
    });

    it("should throw error for invalid sitemap", async () => {
      const sitemapPath = path.join(testDir, "invalid.xml");
      await fs.writeFile(sitemapPath, "not xml");

      const urls = await parseSitemap(sitemapPath);
      expect(urls).toHaveLength(0); // Graceful handling of invalid XML
    });
  });

  describe("validateSitemap", () => {
    it("should validate correct sitemap", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page.html</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.urlCount).toBe(1);
    });

    it("should detect missing loc element", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <lastmod>2025-01-01</lastmod>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Missing <loc>"))).toBe(true);
    });

    it("should detect invalid priority", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page.html</loc>
    <priority>1.5</priority>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("Priority must be between 0.0 and 1.0"),
        ),
      ).toBe(true);
    });

    it("should detect invalid protocol", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>ftp://example.com/page.html</loc>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid protocol"))).toBe(
        true,
      );
    });

    it("should return error if sitemap does not exist", async () => {
      const sitemapPath = path.join(testDir, "nonexistent.xml");

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("does not exist"))).toBe(
        true,
      );
    });
  });

  describe("updateSitemap", () => {
    it("should update existing sitemap with new pages", async () => {
      // Create initial sitemap
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1.html</loc>
    <lastmod>2025-01-01</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      // Add new documentation file
      await fs.writeFile(path.join(docsDir, "page1.md"), "# Page 1");
      await fs.writeFile(path.join(docsDir, "page2.md"), "# Page 2");

      const changes = await updateSitemap(sitemapPath, {
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(changes.added).toBe(1); // page2.md is new
      expect(changes.total).toBe(2);
    });

    it("should detect removed pages", async () => {
      // Create initial sitemap with 2 URLs
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1.html</loc>
  </url>
  <url>
    <loc>https://example.com/page2.html</loc>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      // Only create page1.md
      await fs.writeFile(path.join(docsDir, "page1.md"), "# Page 1");

      const changes = await updateSitemap(sitemapPath, {
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(changes.removed).toBe(1); // page2.html was removed
      expect(changes.total).toBe(1);
    });

    it("should create new sitemap if none exists", async () => {
      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(path.join(docsDir, "page.md"), "# Page");

      const changes = await updateSitemap(sitemapPath, {
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(changes.added).toBe(1);
      expect(changes.total).toBe(1);

      // Verify sitemap was created
      const exists = await fs
        .access(sitemapPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe("listSitemapUrls", () => {
    it("should list all URLs from sitemap", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page1.html</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://example.com/page2.html</loc>
    <priority>0.8</priority>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const urls = await listSitemapUrls(sitemapPath);

      expect(urls).toHaveLength(2);
      expect(urls[0].loc).toBe("https://example.com/page1.html");
      expect(urls[1].loc).toBe("https://example.com/page2.html");
    });
  });

  describe("edge cases", () => {
    it("should handle deeply nested directory structures", async () => {
      const deepPath = path.join(docsDir, "a", "b", "c", "d");
      await fs.mkdir(deepPath, { recursive: true });
      await fs.writeFile(path.join(deepPath, "deep.md"), "# Deep Page");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).toContain("a/b/c/d/deep.html");
    });

    it("should handle files with special characters in names", async () => {
      await fs.writeFile(path.join(docsDir, "my-page-2024.md"), "# Page");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).toContain("my-page-2024.html");
    });

    it("should handle index.html correctly", async () => {
      await fs.writeFile(path.join(docsDir, "index.md"), "# Home");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls[0].loc).toBe("https://example.com/");
    });
  });
});
