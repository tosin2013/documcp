/**
 * Tests for Documentation Freshness Tracking Utilities
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  thresholdToMs,
  formatAge,
  parseDocFrontmatter,
  updateDocFrontmatter,
  calculateFreshnessStatus,
  findMarkdownFiles,
  scanDocumentationFreshness,
  initializeFreshnessMetadata,
  STALENESS_PRESETS,
  type StalenessThreshold,
  type DocFrontmatter,
} from "../../src/utils/freshness-tracker.js";

describe("Freshness Tracker Utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "freshness-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("thresholdToMs", () => {
    it("should convert minutes to milliseconds", () => {
      const threshold: StalenessThreshold = { value: 30, unit: "minutes" };
      expect(thresholdToMs(threshold)).toBe(30 * 60 * 1000);
    });

    it("should convert hours to milliseconds", () => {
      const threshold: StalenessThreshold = { value: 2, unit: "hours" };
      expect(thresholdToMs(threshold)).toBe(2 * 60 * 60 * 1000);
    });

    it("should convert days to milliseconds", () => {
      const threshold: StalenessThreshold = { value: 7, unit: "days" };
      expect(thresholdToMs(threshold)).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should handle fractional values", () => {
      const threshold: StalenessThreshold = { value: 0.5, unit: "hours" };
      expect(thresholdToMs(threshold)).toBe(30 * 60 * 1000);
    });
  });

  describe("formatAge", () => {
    it("should format seconds", () => {
      expect(formatAge(30 * 1000)).toBe("30 seconds");
    });

    it("should format single second", () => {
      expect(formatAge(1000)).toBe("1 second");
    });

    it("should format minutes", () => {
      expect(formatAge(5 * 60 * 1000)).toBe("5 minutes");
    });

    it("should format single minute", () => {
      expect(formatAge(60 * 1000)).toBe("1 minute");
    });

    it("should format hours", () => {
      expect(formatAge(3 * 60 * 60 * 1000)).toBe("3 hours");
    });

    it("should format single hour", () => {
      expect(formatAge(60 * 60 * 1000)).toBe("1 hour");
    });

    it("should format days", () => {
      expect(formatAge(5 * 24 * 60 * 60 * 1000)).toBe("5 days");
    });

    it("should format single day", () => {
      expect(formatAge(24 * 60 * 60 * 1000)).toBe("1 day");
    });

    it("should prefer larger units", () => {
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      expect(formatAge(twoDaysInMs)).toBe("2 days");
    });
  });

  describe("STALENESS_PRESETS", () => {
    it("should have all expected presets", () => {
      expect(STALENESS_PRESETS.realtime).toEqual({
        value: 30,
        unit: "minutes",
      });
      expect(STALENESS_PRESETS.active).toEqual({ value: 1, unit: "hours" });
      expect(STALENESS_PRESETS.recent).toEqual({ value: 24, unit: "hours" });
      expect(STALENESS_PRESETS.weekly).toEqual({ value: 7, unit: "days" });
      expect(STALENESS_PRESETS.monthly).toEqual({ value: 30, unit: "days" });
      expect(STALENESS_PRESETS.quarterly).toEqual({ value: 90, unit: "days" });
    });
  });

  describe("parseDocFrontmatter", () => {
    it("should parse frontmatter from markdown file", async () => {
      const filePath = path.join(tempDir, "test.md");
      const content = `---
title: Test Document
documcp:
  last_updated: "2025-01-15T10:00:00Z"
  last_validated: "2025-01-15T10:00:00Z"
---

# Test Content`;

      await fs.writeFile(filePath, content, "utf-8");
      const frontmatter = await parseDocFrontmatter(filePath);

      expect(frontmatter.title).toBe("Test Document");
      expect(frontmatter.documcp?.last_updated).toBe("2025-01-15T10:00:00Z");
    });

    it("should return empty object for file without frontmatter", async () => {
      const filePath = path.join(tempDir, "no-frontmatter.md");
      await fs.writeFile(filePath, "# Just Content", "utf-8");

      const frontmatter = await parseDocFrontmatter(filePath);
      expect(frontmatter).toEqual({});
    });

    it("should handle non-existent files gracefully", async () => {
      const filePath = path.join(tempDir, "nonexistent.md");
      const frontmatter = await parseDocFrontmatter(filePath);
      expect(frontmatter).toEqual({});
    });
  });

  describe("updateDocFrontmatter", () => {
    it("should update existing frontmatter", async () => {
      const filePath = path.join(tempDir, "update.md");
      const initialContent = `---
title: Original
documcp:
  last_updated: "2025-01-01T00:00:00Z"
---

Content`;

      await fs.writeFile(filePath, initialContent, "utf-8");

      await updateDocFrontmatter(filePath, {
        last_updated: "2025-01-15T10:00:00Z",
        last_validated: "2025-01-15T10:00:00Z",
      });

      const updated = await parseDocFrontmatter(filePath);
      expect(updated.documcp?.last_updated).toBe("2025-01-15T10:00:00Z");
      expect(updated.documcp?.last_validated).toBe("2025-01-15T10:00:00Z");
    });

    it("should preserve existing frontmatter fields", async () => {
      const filePath = path.join(tempDir, "preserve.md");
      const initialContent = `---
title: Original
description: Test
documcp:
  last_updated: "2025-01-01T00:00:00Z"
  auto_updated: false
---

Content`;

      await fs.writeFile(filePath, initialContent, "utf-8");

      await updateDocFrontmatter(filePath, {
        last_validated: "2025-01-15T10:00:00Z",
      });

      const updated = await parseDocFrontmatter(filePath);
      expect(updated.title).toBe("Original");
      expect(updated.description).toBe("Test");
      expect(updated.documcp?.last_updated).toBe("2025-01-01T00:00:00Z");
      expect(updated.documcp?.auto_updated).toBe(false);
      expect(updated.documcp?.last_validated).toBe("2025-01-15T10:00:00Z");
    });

    it("should add documcp field if not present", async () => {
      const filePath = path.join(tempDir, "add-documcp.md");
      const initialContent = `---
title: No DocuMCP
---

Content`;

      await fs.writeFile(filePath, initialContent, "utf-8");

      await updateDocFrontmatter(filePath, {
        last_updated: "2025-01-15T10:00:00Z",
      });

      const updated = await parseDocFrontmatter(filePath);
      expect(updated.documcp?.last_updated).toBe("2025-01-15T10:00:00Z");
    });
  });

  describe("calculateFreshnessStatus", () => {
    const thresholds = {
      warning: { value: 7, unit: "days" as const },
      stale: { value: 30, unit: "days" as const },
      critical: { value: 90, unit: "days" as const },
    };

    it("should mark file as fresh when recently updated", () => {
      const frontmatter: DocFrontmatter = {
        documcp: {
          last_updated: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 2 days ago
        },
      };

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.stalenessLevel).toBe("fresh");
      expect(status.isStale).toBe(false);
      expect(status.hasMetadata).toBe(true);
    });

    it("should mark file as warning when moderately old", () => {
      const frontmatter: DocFrontmatter = {
        documcp: {
          last_updated: new Date(
            Date.now() - 15 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 15 days ago
        },
      };

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.stalenessLevel).toBe("warning");
      expect(status.isStale).toBe(false);
    });

    it("should mark file as stale when old", () => {
      const frontmatter: DocFrontmatter = {
        documcp: {
          last_updated: new Date(
            Date.now() - 45 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 45 days ago
        },
      };

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.stalenessLevel).toBe("stale");
      expect(status.isStale).toBe(true);
    });

    it("should mark file as critical when very old", () => {
      const frontmatter: DocFrontmatter = {
        documcp: {
          last_updated: new Date(
            Date.now() - 100 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 100 days ago
        },
      };

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.stalenessLevel).toBe("critical");
      expect(status.isStale).toBe(true);
    });

    it("should mark file as unknown when no metadata", () => {
      const frontmatter: DocFrontmatter = {};

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.stalenessLevel).toBe("unknown");
      expect(status.isStale).toBe(true);
      expect(status.hasMetadata).toBe(false);
    });

    it("should include age information", () => {
      const frontmatter: DocFrontmatter = {
        documcp: {
          last_updated: new Date(
            Date.now() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      };

      const status = calculateFreshnessStatus(
        "/test.md",
        "test.md",
        frontmatter,
        thresholds,
      );

      expect(status.ageFormatted).toBe("5 days");
      expect(status.staleDays).toBe(5);
    });
  });

  describe("findMarkdownFiles", () => {
    it("should find all markdown files recursively", async () => {
      await fs.mkdir(path.join(tempDir, "subdir"));
      await fs.writeFile(path.join(tempDir, "file1.md"), "# Test 1");
      await fs.writeFile(path.join(tempDir, "file2.mdx"), "# Test 2");
      await fs.writeFile(path.join(tempDir, "subdir", "file3.md"), "# Test 3");
      await fs.writeFile(path.join(tempDir, "readme.txt"), "Not markdown");

      const files = await findMarkdownFiles(tempDir);

      expect(files).toHaveLength(3);
      expect(files.some((f) => f.endsWith("file1.md"))).toBe(true);
      expect(files.some((f) => f.endsWith("file2.mdx"))).toBe(true);
      expect(files.some((f) => f.endsWith("file3.md"))).toBe(true);
      expect(files.some((f) => f.endsWith("readme.txt"))).toBe(false);
    });

    it("should skip common directories", async () => {
      await fs.mkdir(path.join(tempDir, "node_modules"));
      await fs.mkdir(path.join(tempDir, ".git"));
      await fs.writeFile(path.join(tempDir, "file1.md"), "# Test");
      await fs.writeFile(
        path.join(tempDir, "node_modules", "skip.md"),
        "# Skip",
      );
      await fs.writeFile(path.join(tempDir, ".git", "skip.md"), "# Skip");

      const files = await findMarkdownFiles(tempDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/file1\.md$/);
    });

    it("should handle empty directories", async () => {
      const files = await findMarkdownFiles(tempDir);
      expect(files).toEqual([]);
    });
  });

  describe("scanDocumentationFreshness", () => {
    it("should scan and categorize files by freshness", async () => {
      // Create test files with different ages
      const now = Date.now();

      const freshFile = path.join(tempDir, "fresh.md");
      await fs.writeFile(
        freshFile,
        `---
documcp:
  last_updated: "${new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Fresh`,
      );

      const staleFile = path.join(tempDir, "stale.md");
      await fs.writeFile(
        staleFile,
        `---
documcp:
  last_updated: "${new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Stale`,
      );

      const noMetadataFile = path.join(tempDir, "no-metadata.md");
      await fs.writeFile(noMetadataFile, "# No Metadata");

      const report = await scanDocumentationFreshness(tempDir, {
        warning: { value: 7, unit: "days" },
        stale: { value: 30, unit: "days" },
        critical: { value: 90, unit: "days" },
      });

      expect(report.totalFiles).toBe(3);
      expect(report.freshFiles).toBe(1);
      expect(report.staleFiles).toBe(1);
      expect(report.filesWithoutMetadata).toBe(1);
    });

    it("should use default thresholds when not provided", async () => {
      await fs.writeFile(path.join(tempDir, "test.md"), "# Test");

      const report = await scanDocumentationFreshness(tempDir);

      expect(report.thresholds).toBeDefined();
      expect(report.thresholds.warning).toBeDefined();
      expect(report.thresholds.stale).toBeDefined();
      expect(report.thresholds.critical).toBeDefined();
    });
  });

  describe("initializeFreshnessMetadata", () => {
    it("should initialize metadata for file without it", async () => {
      const filePath = path.join(tempDir, "init.md");
      await fs.writeFile(filePath, "# Test");

      await initializeFreshnessMetadata(filePath, {
        updateFrequency: "monthly",
        autoUpdated: false,
      });

      const frontmatter = await parseDocFrontmatter(filePath);

      expect(frontmatter.documcp?.last_updated).toBeDefined();
      expect(frontmatter.documcp?.last_validated).toBeDefined();
      expect(frontmatter.documcp?.auto_updated).toBe(false);
      expect(frontmatter.documcp?.update_frequency).toBe("monthly");
    });

    it("should not overwrite existing metadata", async () => {
      const filePath = path.join(tempDir, "existing.md");
      const originalDate = "2025-01-01T00:00:00Z";
      await fs.writeFile(
        filePath,
        `---
documcp:
  last_updated: "${originalDate}"
---
# Test`,
      );

      await initializeFreshnessMetadata(filePath);

      const frontmatter = await parseDocFrontmatter(filePath);
      expect(frontmatter.documcp?.last_updated).toBe(originalDate);
    });

    it("should set staleness threshold when frequency is provided", async () => {
      const filePath = path.join(tempDir, "threshold.md");
      await fs.writeFile(filePath, "# Test");

      await initializeFreshnessMetadata(filePath, {
        updateFrequency: "weekly",
      });

      const frontmatter = await parseDocFrontmatter(filePath);
      expect(frontmatter.documcp?.staleness_threshold).toEqual(
        STALENESS_PRESETS.weekly,
      );
    });
  });
});
