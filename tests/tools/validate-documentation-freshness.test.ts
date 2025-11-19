/**
 * Integration Tests for validate_documentation_freshness Tool
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { simpleGit } from "simple-git";
import {
  validateDocumentationFreshness,
  type ValidateDocumentationFreshnessInput,
} from "../../src/tools/validate-documentation-freshness.js";
import { parseDocFrontmatter } from "../../src/utils/freshness-tracker.js";

describe("validate_documentation_freshness Tool", () => {
  let tempDir: string;
  let docsDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "validate-freshness-test-"),
    );
    docsDir = path.join(tempDir, "docs");
    projectDir = tempDir;
    await fs.mkdir(docsDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("Initialization", () => {
    it("should initialize metadata for files without it", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test Document");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.initialized).toBe(1);

      const frontmatter = await parseDocFrontmatter(
        path.join(docsDir, "test.md"),
      );
      expect(frontmatter.documcp?.last_updated).toBeDefined();
      expect(frontmatter.documcp?.last_validated).toBeDefined();
    });

    it("should skip files that already have metadata", async () => {
      await fs.writeFile(
        path.join(docsDir, "existing.md"),
        `---
documcp:
  last_updated: "2025-01-01T00:00:00Z"
---
# Existing`,
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.initialized).toBe(0);
      expect(result.data.report.skipped).toBe(1);
    });

    it("should set default update frequency", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        updateFrequency: "weekly",
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);

      const frontmatter = await parseDocFrontmatter(
        path.join(docsDir, "test.md"),
      );
      expect(frontmatter.documcp?.update_frequency).toBe("weekly");
    });
  });

  describe("Updating Existing Metadata", () => {
    it("should update last_validated for existing files when requested", async () => {
      await fs.writeFile(
        path.join(docsDir, "existing.md"),
        `---
documcp:
  last_updated: "2025-01-01T00:00:00Z"
---
# Existing`,
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        updateExisting: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.updated).toBe(1);

      const frontmatter = await parseDocFrontmatter(
        path.join(docsDir, "existing.md"),
      );
      expect(frontmatter.documcp?.last_validated).toBeDefined();
      expect(
        new Date(frontmatter.documcp?.last_validated!).getTime(),
      ).toBeGreaterThan(new Date("2025-01-01").getTime());
    });

    it("should not update existing files when updateExisting is false", async () => {
      const originalDate = "2025-01-01T00:00:00Z";
      await fs.writeFile(
        path.join(docsDir, "existing.md"),
        `---
documcp:
  last_updated: "${originalDate}"
  last_validated: "${originalDate}"
---
# Existing`,
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        updateExisting: false,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.updated).toBe(0);

      const frontmatter = await parseDocFrontmatter(
        path.join(docsDir, "existing.md"),
      );
      expect(frontmatter.documcp?.last_validated).toBe(originalDate);
    });
  });

  describe("Git Integration", () => {
    it("should add git commit hash when git is available", async () => {
      // Initialize git repo
      const git = simpleGit(projectDir);
      await git.init();
      await git.addConfig("user.name", "Test User");
      await git.addConfig("user.email", "test@example.com");
      await fs.writeFile(path.join(projectDir, "README.md"), "# Test Repo");
      await git.add(".");
      await git.commit("Initial commit");

      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        validateAgainstGit: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.currentCommit).toBeDefined();

      const frontmatter = await parseDocFrontmatter(
        path.join(docsDir, "test.md"),
      );
      expect(frontmatter.documcp?.validated_against_commit).toBeDefined();
      expect(frontmatter.documcp?.validated_against_commit).toBe(
        result.data.report.currentCommit,
      );
    });

    it("should work without git when validateAgainstGit is false", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        validateAgainstGit: false,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.currentCommit).toBeUndefined();
    });

    it("should handle non-git directories gracefully", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        validateAgainstGit: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.currentCommit).toBeUndefined();
    });
  });

  describe("Batch Operations", () => {
    it("should process multiple files", async () => {
      await fs.writeFile(path.join(docsDir, "file1.md"), "# File 1");
      await fs.writeFile(path.join(docsDir, "file2.md"), "# File 2");
      await fs.writeFile(path.join(docsDir, "file3.md"), "# File 3");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.totalFiles).toBe(3);
      expect(result.data.report.initialized).toBe(3);
    });

    it("should handle nested directories", async () => {
      await fs.mkdir(path.join(docsDir, "api"));
      await fs.mkdir(path.join(docsDir, "guides"));

      await fs.writeFile(path.join(docsDir, "index.md"), "# Index");
      await fs.writeFile(path.join(docsDir, "api", "endpoints.md"), "# API");
      await fs.writeFile(
        path.join(docsDir, "guides", "tutorial.md"),
        "# Guide",
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.totalFiles).toBe(3);
    });

    it("should provide individual file results", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.data.report.files).toBeDefined();
      expect(result.data.report.files.length).toBe(1);
      expect(result.data.report.files[0].action).toBe("initialized");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent docs directory", async () => {
      const input: ValidateDocumentationFreshnessInput = {
        docsPath: "/nonexistent/docs",
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("FRESHNESS_VALIDATION_FAILED");
    });

    it("should track file-level errors", async () => {
      // Create a file that will cause issues
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      // Make it read-only to cause write errors (skip on Windows)
      if (process.platform !== "win32") {
        await fs.chmod(path.join(docsDir, "test.md"), 0o444);

        const input: ValidateDocumentationFreshnessInput = {
          docsPath: docsDir,
          projectPath: projectDir,
          initializeMissing: true,
        };

        const result = await validateDocumentationFreshness(input);

        // Restore permissions for cleanup
        await fs.chmod(path.join(docsDir, "test.md"), 0o644);

        expect(result.data.report.errors).toBeGreaterThan(0);
      }
    });

    it("should handle empty docs directory", async () => {
      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.totalFiles).toBe(0);
    });
  });

  describe("Output Format", () => {
    it("should include formatted report", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.data.formattedReport).toBeDefined();
      expect(result.data.formattedReport).toContain(
        "Documentation Freshness Validation Report",
      );
      expect(result.data.formattedReport).toContain("Summary");
      expect(result.data.formattedReport).toContain("Actions Performed");
    });

    it("should include summary", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.data.summary).toBeDefined();
      expect(result.data.summary).toContain("Validated");
      expect(result.data.summary).toContain("initialized");
    });

    it("should include metadata", async () => {
      await fs.writeFile(path.join(docsDir, "test.md"), "# Test");

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.toolVersion).toBe("1.0.0");
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Update Frequency Presets", () => {
    const frequencies: Array<
      "realtime" | "active" | "recent" | "weekly" | "monthly" | "quarterly"
    > = ["realtime", "active", "recent", "weekly", "monthly", "quarterly"];

    frequencies.forEach((frequency) => {
      it(`should work with ${frequency} update frequency`, async () => {
        await fs.writeFile(
          path.join(docsDir, `test-${frequency}.md`),
          "# Test",
        );

        const input: ValidateDocumentationFreshnessInput = {
          docsPath: docsDir,
          projectPath: projectDir,
          initializeMissing: true,
          updateFrequency: frequency,
        };

        const result = await validateDocumentationFreshness(input);

        expect(result.success).toBe(true);

        const frontmatter = await parseDocFrontmatter(
          path.join(docsDir, `test-${frequency}.md`),
        );
        expect(frontmatter.documcp?.update_frequency).toBe(frequency);
      });
    });
  });

  describe("Mixed File States", () => {
    it("should handle mix of initialized, updated, and skipped files", async () => {
      // File without metadata (will be initialized)
      await fs.writeFile(path.join(docsDir, "new.md"), "# New");

      // File with metadata (will be skipped if updateExisting=false)
      await fs.writeFile(
        path.join(docsDir, "existing.md"),
        `---
documcp:
  last_updated: "2025-01-01T00:00:00Z"
---
# Existing`,
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        updateExisting: false,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.initialized).toBe(1);
      expect(result.data.report.skipped).toBe(1);
      expect(result.data.report.updated).toBe(0);
    });

    it("should update all when both initializeMissing and updateExisting are true", async () => {
      await fs.writeFile(path.join(docsDir, "new.md"), "# New");
      await fs.writeFile(
        path.join(docsDir, "existing.md"),
        `---
documcp:
  last_updated: "2025-01-01T00:00:00Z"
---
# Existing`,
      );

      const input: ValidateDocumentationFreshnessInput = {
        docsPath: docsDir,
        projectPath: projectDir,
        initializeMissing: true,
        updateExisting: true,
      };

      const result = await validateDocumentationFreshness(input);

      expect(result.success).toBe(true);
      expect(result.data.report.initialized).toBe(1);
      expect(result.data.report.updated).toBe(1);
    });
  });
});
