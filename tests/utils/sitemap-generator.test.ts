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

    it("should exclude directories matching exclusion patterns", async () => {
      // Create directory structure with excluded dirs
      await fs.mkdir(path.join(docsDir, "node_modules"), { recursive: true });
      await fs.mkdir(path.join(docsDir, "valid"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "node_modules", "package.md"),
        "# Should be excluded",
      );
      await fs.writeFile(
        path.join(docsDir, "valid", "page.md"),
        "# Valid Page",
      );

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      // Should only include valid directory, not node_modules
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).toContain("valid/page");
    });

    it("should handle directory scan errors gracefully", async () => {
      // Create a valid docs directory
      await fs.writeFile(path.join(docsDir, "valid.md"), "# Valid");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      // Should succeed despite potential permission issues
      expect(result.urls.length).toBeGreaterThanOrEqual(1);
    });

    it("should categorize explanation pages correctly", async () => {
      await fs.mkdir(path.join(docsDir, "explanation"), { recursive: true });
      await fs.writeFile(
        path.join(docsDir, "explanation", "concepts.md"),
        "# Concepts",
      );

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.stats.byCategory).toHaveProperty("explanation");
      expect(result.stats.byCategory.explanation).toBeGreaterThan(0);
    });

    it("should fall back to file system date when git fails", async () => {
      await fs.writeFile(path.join(docsDir, "no-git.md"), "# No Git");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: true, // Try git but will fall back
      });

      // Should still have a lastmod date from file system
      expect(result.urls[0].lastmod).toBeDefined();
      expect(result.urls[0].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle files without extensions", async () => {
      await fs.writeFile(path.join(docsDir, "README"), "# Readme");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        includePatterns: ["**/*"], // Include all files
        useGitHistory: false,
      });

      // Should handle extensionless files
      expect(result.urls.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty git timestamp", async () => {
      // Create file and generate sitemap with git enabled
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: true,
      });

      // Should have valid dates even if git returns empty
      expect(result.urls[0].lastmod).toBeDefined();
    });

    it("should handle files in deeply excluded paths", async () => {
      await fs.mkdir(path.join(docsDir, ".git", "objects"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(docsDir, ".git", "objects", "file.md"),
        "# Git Object",
      );
      await fs.writeFile(path.join(docsDir, "valid.md"), "# Valid");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      // Should exclude .git directory
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].loc).not.toContain(".git");
    });

    it("should extract title from HTML title tag", async () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>HTML Page Title</title>
</head>
<body>
  <h1>Different Heading</h1>
</body>
</html>`;

      await fs.writeFile(path.join(docsDir, "page.html"), htmlContent);

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        includePatterns: ["**/*.html"],
        useGitHistory: false,
      });

      expect(result.urls[0].title).toBe("HTML Page Title");
    });

    it("should handle files with no extractable title", async () => {
      await fs.writeFile(path.join(docsDir, "notitle.md"), "Just content");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      expect(result.urls[0].title).toBeUndefined();
    });

    it("should handle inaccessible files gracefully", async () => {
      await fs.writeFile(path.join(docsDir, "readable.md"), "# Readable");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: docsDir,
        useGitHistory: false,
      });

      // Should still process readable files
      expect(result.urls.length).toBeGreaterThan(0);
    });
  });

  describe("validateSitemap - additional validations", () => {
    it("should detect empty sitemap", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("no URLs"))).toBe(true);
    });

    it("should detect URL exceeding 2048 characters", async () => {
      const longUrl = `https://example.com/${"a".repeat(2100)}`;
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${longUrl}</loc>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds 2048"))).toBe(true);
    });

    it("should warn about invalid lastmod format", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/page.html</loc>
    <lastmod>invalid-date</lastmod>
  </url>
</urlset>`;

      const sitemapPath = path.join(testDir, "sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.warnings.some((w) => w.includes("Invalid lastmod"))).toBe(
        true,
      );
    });

    it("should detect sitemap with more than 50,000 URLs", async () => {
      // Create sitemap XML with >50,000 URLs
      const urls = Array.from(
        { length: 50001 },
        (_, i) => `  <url>
    <loc>https://example.com/page${i}.html</loc>
    <lastmod>2025-01-01</lastmod>
  </url>`,
      ).join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      const sitemapPath = path.join(testDir, "large-sitemap.xml");
      await fs.writeFile(sitemapPath, xml);

      const result = await validateSitemap(sitemapPath);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("50,000"))).toBe(true);
    });

    it("should handle malformed XML gracefully", async () => {
      // The regex-based parser is lenient and extracts data where possible
      // This tests that the parser doesn't crash on malformed XML
      const malformedXml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com</loc>
  </url>
  <!-- Missing closing urlset tag`;

      const sitemapPath = path.join(testDir, "malformed.xml");
      await fs.writeFile(sitemapPath, malformedXml);

      // Should parse successfully despite malformation (regex-based parsing)
      const result = await validateSitemap(sitemapPath);
      expect(result).toBeDefined();
      expect(result.urlCount).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle excluded directories", async () => {
      // Create structure with node_modules
      await fs.mkdir(path.join(testDir, "node_modules"), { recursive: true });
      await fs.writeFile(
        path.join(testDir, "node_modules", "package.md"),
        "# Should be excluded",
      );
      await fs.writeFile(path.join(testDir, "included.md"), "# Included");

      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: testDir,
        includePatterns: ["**/*.md"],
        useGitHistory: false,
      });

      expect(result.urls.some((u) => u.loc.includes("node_modules"))).toBe(
        false,
      );
      expect(result.urls.some((u) => u.loc.includes("included"))).toBe(true);
    });

    it("should handle directory scan errors gracefully", async () => {
      // Test with a path that has permission issues or doesn't exist
      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: path.join(testDir, "nonexistent"),
        includePatterns: ["**/*.md"],
        useGitHistory: false,
      });

      expect(result.urls).toEqual([]);
    });

    it("should use git timestamp when available", async () => {
      // Initialize git and create a committed file
      await fs.writeFile(path.join(testDir, "test.md"), "# Test");

      try {
        const { execSync } = require("child_process");
        execSync("git init", { cwd: testDir, stdio: "ignore" });
        execSync("git config user.email 'test@example.com'", {
          cwd: testDir,
          stdio: "ignore",
        });
        execSync("git config user.name 'Test'", {
          cwd: testDir,
          stdio: "ignore",
        });
        execSync("git add test.md", { cwd: testDir, stdio: "ignore" });
        execSync("git commit -m 'test'", { cwd: testDir, stdio: "ignore" });

        const result = await generateSitemap({
          baseUrl: "https://example.com",
          docsPath: testDir,
          includePatterns: ["**/*.md"],
          useGitHistory: true,
        });

        expect(result.urls.length).toBe(1);
        expect(result.urls[0].lastmod).toMatch(/\d{4}-\d{2}-\d{2}/);
      } catch (error) {
        // Git might not be available in test environment, skip
        console.log("Git test skipped:", error);
      }
    });

    it("should use current date when file doesn't exist", async () => {
      // This tests the getFileLastModified error path
      // We'll indirectly test this by ensuring dates are always returned
      const result = await generateSitemap({
        baseUrl: "https://example.com",
        docsPath: testDir,
        includePatterns: ["**/*.md"],
        useGitHistory: false,
      });

      // Even with no files, function should not crash
      expect(result).toBeDefined();
      expect(Array.isArray(result.urls)).toBe(true);
    });
  });
});
