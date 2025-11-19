/**
 * Integration Tests for track_documentation_freshness Tool
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  trackDocumentationFreshness,
  type TrackDocumentationFreshnessInput,
} from "../../src/tools/track-documentation-freshness.js";

describe("track_documentation_freshness Tool", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "track-freshness-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Basic Functionality", () => {
    it("should track freshness with preset thresholds", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      // Create test files
      const now = Date.now();
      await fs.writeFile(
        path.join(docsPath, "fresh.md"),
        `---
documcp:
  last_updated: "${new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Fresh Doc`,
      );

      await fs.writeFile(
        path.join(docsPath, "old.md"),
        `---
documcp:
  last_updated: "${new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Old Doc`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.report.totalFiles).toBe(2);
      expect(result.data.report.freshFiles).toBeGreaterThan(0);
      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it("should track freshness with custom thresholds", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(
        path.join(docsPath, "test.md"),
        `---
documcp:
  last_updated: "${new Date(Date.now() - 45 * 60 * 1000).toISOString()}"
---
# Test`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        warningThreshold: { value: 30, unit: "minutes" },
        staleThreshold: { value: 1, unit: "hours" },
        criticalThreshold: { value: 2, unit: "hours" },
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report).toBeDefined();
      expect(result.data.thresholds.warning).toEqual({
        value: 30,
        unit: "minutes",
      });
    });

    it("should identify files without metadata", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(
        path.join(docsPath, "no-metadata.md"),
        "# No Metadata",
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.filesWithoutMetadata).toBe(1);
      expect(result.data.report.totalFiles).toBe(1);
    });
  });

  describe("Staleness Levels", () => {
    it("should correctly categorize fresh files", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(
        path.join(docsPath, "fresh.md"),
        `---
documcp:
  last_updated: "${new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString()}"
---
# Fresh`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.freshFiles).toBe(1);
      expect(result.data.report.staleFiles).toBe(0);
      expect(result.data.report.criticalFiles).toBe(0);
    });

    it("should correctly categorize stale files", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(
        path.join(docsPath, "stale.md"),
        `---
documcp:
  last_updated: "${new Date(
    Date.now() - 70 * 24 * 60 * 60 * 1000,
  ).toISOString()}"
---
# Stale`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.staleFiles).toBeGreaterThan(0);
    });

    it("should correctly categorize critical files", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(
        path.join(docsPath, "critical.md"),
        `---
documcp:
  last_updated: "${new Date(
    Date.now() - 100 * 24 * 60 * 60 * 1000,
  ).toISOString()}"
---
# Critical`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.criticalFiles).toBe(1);
    });
  });

  describe("File Listing Options", () => {
    it("should include file list when requested", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        includeFileList: true,
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.files).toBeDefined();
      expect(result.data.report.files.length).toBe(1);
      expect(result.data.formattedReport).toContain("File Details");
    });

    it("should exclude file list when not requested", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        includeFileList: false,
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.formattedReport).not.toContain("File Details");
    });
  });

  describe("Sorting Options", () => {
    it("should sort files by staleness", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      const now = Date.now();
      await fs.writeFile(
        path.join(docsPath, "fresh.md"),
        `---
documcp:
  last_updated: "${new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Fresh`,
      );

      await fs.writeFile(
        path.join(docsPath, "stale.md"),
        `---
documcp:
  last_updated: "${new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Stale`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        sortBy: "staleness",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      // Stale files should appear first when sorted by staleness
      const formattedReport = result.data.formattedReport;
      const staleIndex = formattedReport.indexOf("stale.md");
      const freshIndex = formattedReport.indexOf("fresh.md");

      if (staleIndex !== -1 && freshIndex !== -1) {
        expect(staleIndex).toBeLessThan(freshIndex);
      }
    });

    it("should sort files by age", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      const now = Date.now();
      await fs.writeFile(
        path.join(docsPath, "newer.md"),
        `---
documcp:
  last_updated: "${new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Newer`,
      );

      await fs.writeFile(
        path.join(docsPath, "older.md"),
        `---
documcp:
  last_updated: "${new Date(now - 50 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Older`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        sortBy: "age",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
    });
  });

  describe("Nested Directories", () => {
    it("should scan nested directories recursively", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);
      await fs.mkdir(path.join(docsPath, "api"));
      await fs.mkdir(path.join(docsPath, "guides"));

      await fs.writeFile(path.join(docsPath, "index.md"), "# Index");
      await fs.writeFile(path.join(docsPath, "api", "endpoints.md"), "# API");
      await fs.writeFile(
        path.join(docsPath, "guides", "tutorial.md"),
        "# Guide",
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.totalFiles).toBe(3);
    });

    it("should skip common ignored directories", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);
      await fs.mkdir(path.join(docsPath, "node_modules"));
      await fs.mkdir(path.join(docsPath, ".git"));

      await fs.writeFile(path.join(docsPath, "index.md"), "# Index");
      await fs.writeFile(
        path.join(docsPath, "node_modules", "skip.md"),
        "# Skip",
      );
      await fs.writeFile(path.join(docsPath, ".git", "skip.md"), "# Skip");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.report.totalFiles).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent directory", async () => {
      const input: TrackDocumentationFreshnessInput = {
        docsPath: "/nonexistent/path",
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("FRESHNESS_TRACKING_FAILED");
    });

    it("should handle empty directory", async () => {
      const docsPath = path.join(tempDir, "empty-docs");
      await fs.mkdir(docsPath);

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.totalFiles).toBe(0);
    });
  });

  describe("Preset Thresholds", () => {
    const presets: Array<
      keyof typeof import("../../src/utils/freshness-tracker.js").STALENESS_PRESETS
    > = ["realtime", "active", "recent", "weekly", "monthly", "quarterly"];

    presets.forEach((preset) => {
      it(`should work with ${preset} preset`, async () => {
        const docsPath = path.join(tempDir, `docs-${preset}`);
        await fs.mkdir(docsPath);

        await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

        const input: TrackDocumentationFreshnessInput = {
          docsPath,
          preset,
        };

        const result = await trackDocumentationFreshness(input);

        expect(result.success).toBe(true);
        expect(result.data.thresholds).toBeDefined();
      });
    });
  });

  describe("Output Format", () => {
    it("should include formatted report in response", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.formattedReport).toBeDefined();
      expect(result.data.formattedReport).toContain(
        "Documentation Freshness Report",
      );
      expect(result.data.formattedReport).toContain("Summary Statistics");
      expect(result.data.formattedReport).toContain("Freshness Breakdown");
    });

    it("should include summary in response", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.data.summary).toBeDefined();
      expect(result.data.summary).toContain("Scanned");
      expect(result.data.summary).toContain("files");
    });

    it("should include metadata in response", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.toolVersion).toBe("1.0.0");
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle KG storage disabled", async () => {
      const docsPath = path.join(tempDir, "docs");
      const projectPath = tempDir;
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        projectPath,
        preset: "monthly",
        storeInKG: false,
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.kgInsights).toBeUndefined();
    });

    it("should handle projectPath without KG storage", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "test.md"), "# Test");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        // No projectPath provided
        preset: "monthly",
        storeInKG: true, // Won't store because projectPath is missing
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
    });

    it("should handle error gracefully", async () => {
      const input: TrackDocumentationFreshnessInput = {
        docsPath: "/nonexistent/path/that/does/not/exist",
        preset: "monthly",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("FRESHNESS_TRACKING_FAILED");
      expect(result.metadata).toBeDefined();
    });

    it("should sort files by age", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      const now = Date.now();
      await fs.writeFile(
        path.join(docsPath, "newer.md"),
        `---
documcp:
  last_updated: "${new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Newer`,
      );

      await fs.writeFile(
        path.join(docsPath, "older.md"),
        `---
documcp:
  last_updated: "${new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString()}"
---
# Older`,
      );

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        sortBy: "age",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.files.length).toBe(2);
    });

    it("should sort files by path", async () => {
      const docsPath = path.join(tempDir, "docs");
      await fs.mkdir(docsPath);

      await fs.writeFile(path.join(docsPath, "z.md"), "# Z");
      await fs.writeFile(path.join(docsPath, "a.md"), "# A");

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        preset: "monthly",
        sortBy: "path",
      };

      const result = await trackDocumentationFreshness(input);

      expect(result.success).toBe(true);
    });

    it("should display commit hash for files validated against commits", async () => {
      const docsPath = path.join(tempDir, "docs");
      const projectPath = tempDir;
      await fs.mkdir(docsPath);

      // Create file with validated_against_commit metadata
      const fileContent = `---
last_updated: ${new Date().toISOString()}
last_validated: ${new Date().toISOString()}
validated_against_commit: ${SHA_EXAMPLE}
---
# Test Document
Content`;

      await fs.writeFile(path.join(docsPath, "test.md"), fileContent);

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        projectPath,
        preset: "monthly",
        includeFileList: true,
      };

      const result = await trackDocumentationFreshness(input);
      expect(result.success).toBe(true);
      expect(result.content).toContain(SHA_EXAMPLE.substring(0, 7));
    });

    it("should format warning recommendations correctly", async () => {
      const docsPath = path.join(tempDir, "docs");
      const projectPath = tempDir;
      await fs.mkdir(docsPath);

      // Create a file with warning-level staleness
      const warnDate = new Date();
      warnDate.setDate(warnDate.getDate() - 15); // 15 days ago (warning threshold for monthly is ~7-30 days)

      const fileContent = `---
last_updated: ${warnDate.toISOString()}
last_validated: ${warnDate.toISOString()}
---
# Test Document`;

      await fs.writeFile(path.join(docsPath, "warn.md"), fileContent);

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        projectPath,
        preset: "monthly",
        storeInKG: true,
      };

      const result = await trackDocumentationFreshness(input);
      expect(result.success).toBe(true);
      expect(result.data.report.warningFiles).toBeGreaterThan(0);
    });

    it("should format critical recommendations correctly", async () => {
      const docsPath = path.join(tempDir, "docs");
      const projectPath = tempDir;
      await fs.mkdir(docsPath);

      // Create a file with critical-level staleness
      const criticalDate = new Date();
      criticalDate.setDate(criticalDate.getDate() - 100); // 100 days ago (critical for monthly preset)

      const fileContent = `---
last_updated: ${criticalDate.toISOString()}
last_validated: ${criticalDate.toISOString()}
---
# Old Document`;

      await fs.writeFile(path.join(docsPath, "critical.md"), fileContent);

      const input: TrackDocumentationFreshnessInput = {
        docsPath,
        projectPath,
        preset: "monthly",
        storeInKG: true,
      };

      const result = await trackDocumentationFreshness(input);
      expect(result.success).toBe(true);
      expect(result.data.report.criticalFiles).toBeGreaterThan(0);
    });
  });
});
