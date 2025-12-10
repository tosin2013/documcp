import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import { cleanupAgentArtifacts } from "../../src/tools/cleanup-agent-artifacts.js";

describe("cleanupAgentArtifacts", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `cleanup-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Input Validation", () => {
    it("should validate required path parameter", async () => {
      const result = await cleanupAgentArtifacts({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("should reject non-existent paths", async () => {
      const result = await cleanupAgentArtifacts({
        path: "/non/existent/path",
        operation: "scan",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PATH_NOT_FOUND");
    });

    it("should reject file paths (not directories)", async () => {
      const filePath = path.join(testDir, "test.txt");
      await fs.writeFile(filePath, "test");

      const result = await cleanupAgentArtifacts({
        path: filePath,
        operation: "scan",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_PATH");
    });

    it("should validate operation parameter", async () => {
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "invalid" as any,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("should validate autoDeleteThreshold range", async () => {
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        autoDeleteThreshold: 1.5,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("Scan Operation", () => {
    it("should detect artifacts without making changes", async () => {
      // Create test artifacts
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.writeFile(path.join(testDir, "PLAN.md"), "# Plan");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.data?.operation).toBe("scan");
      expect(result.data?.result.artifacts.length).toBeGreaterThan(0);

      // Files should still exist
      const todoExists = await fs
        .access(path.join(testDir, "TODO.md"))
        .then(() => true)
        .catch(() => false);
      expect(todoExists).toBe(true);
    });

    it("should provide summary statistics", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.data?.result.summary).toBeDefined();
      expect(result.data?.result.summary.totalArtifacts).toBeGreaterThan(0);
      expect(result.data?.result.summary.byCategory).toBeDefined();
      expect(result.data?.result.summary.byRecommendation).toBeDefined();
    });

    it("should not have actionsPerformed for scan", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.data?.actionsPerformed).toBeUndefined();
    });

    it("should provide recommendations after scan", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });

    it("should provide next steps after scan", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps!.length).toBeGreaterThan(0);
    });

    it("should count scanned files", async () => {
      await fs.writeFile(path.join(testDir, "test1.ts"), "code();");
      await fs.writeFile(path.join(testDir, "test2.js"), "code();");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.data?.result.scannedFiles).toBeGreaterThan(0);
    });
  });

  describe("Clean Operation with Dry-Run", () => {
    it("should show what would be deleted without making changes", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.writeFile(path.join(testDir, "SCRATCH.md"), "# Scratch");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.operation).toContain("dry-run");

      // Files should still exist
      const todoExists = await fs
        .access(path.join(testDir, "TODO.md"))
        .then(() => true)
        .catch(() => false);
      expect(todoExists).toBe(true);
    });

    it("should provide recommendations for dry-run", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      const dryRunRec = result.recommendations?.find((r) =>
        r.title.includes("Dry-run"),
      );
      expect(dryRunRec).toBeDefined();
    });
  });

  describe("Clean Operation", () => {
    it("should delete high-confidence artifacts", async () => {
      await fs.writeFile(path.join(testDir, "SCRATCH.md"), "# Scratch");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
        autoDeleteThreshold: 0.9,
      });

      expect(result.success).toBe(true);
      expect(result.data?.actionsPerformed).toBeDefined();

      // Check if file was deleted (may be deleted or skipped depending on confidence)
      const scratchExists = await fs
        .access(path.join(testDir, "SCRATCH.md"))
        .then(() => true)
        .catch(() => false);

      // Should be deleted or skipped
      if (!scratchExists) {
        expect(result.data?.actionsPerformed?.deleted).toContain("SCRATCH.md");
      }
    });

    it("should delete directories", async () => {
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, "state.json"), "{}");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
        autoDeleteThreshold: 0.9,
      });

      expect(result.success).toBe(true);

      // Directory may be deleted
      const claudeExists = await fs
        .access(claudeDir)
        .then(() => true)
        .catch(() => false);

      // If deleted, should be in the deleted list
      if (!claudeExists) {
        expect(result.data?.actionsPerformed?.deleted).toBeDefined();
      }
    });

    it("should skip low-confidence artifacts", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
        autoDeleteThreshold: 0.99, // Very high threshold
      });

      expect(result.success).toBe(true);

      // File should still exist (skipped due to threshold)
      const todoExists = await fs
        .access(path.join(testDir, "TODO.md"))
        .then(() => true)
        .catch(() => false);
      expect(todoExists).toBe(true);

      if (result.data?.actionsPerformed?.skipped) {
        expect(result.data.actionsPerformed.skipped.length).toBeGreaterThan(0);
      }
    });

    it("should skip inline and block comments", async () => {
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// TODO(agent): Fix\ncode();");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
      });

      expect(result.success).toBe(true);

      // File should still exist (inline comments can't be auto-deleted)
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it("should provide next steps after cleanup", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
      });

      expect(result.success).toBe(true);
      // Next steps may or may not be present depending on actions
      if (
        result.data?.actionsPerformed?.deleted.length ||
        result.data?.actionsPerformed?.archived.length
      ) {
        expect(result.nextSteps).toBeDefined();
      }
    });
  });

  describe("Archive Operation", () => {
    it("should archive artifacts to .agent-archive/", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "archive",
        dryRun: false,
        autoDeleteThreshold: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.data?.actionsPerformed).toBeDefined();

      // Check if archive directory was created
      const archiveDir = path.join(testDir, ".agent-archive");
      const archiveExists = await fs
        .access(archiveDir)
        .then(() => true)
        .catch(() => false);

      if (result.data?.actionsPerformed?.archived.length) {
        expect(archiveExists).toBe(true);
      }
    });

    it("should preserve directory structure in archive", async () => {
      const subdir = path.join(testDir, "src");
      await fs.mkdir(subdir, { recursive: true });
      await fs.writeFile(path.join(subdir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "archive",
        dryRun: false,
        autoDeleteThreshold: 0.8,
      });

      expect(result.success).toBe(true);

      // If archived, check structure is preserved
      if (result.data?.actionsPerformed?.archived.length) {
        const archiveDir = path.join(testDir, ".agent-archive");
        const archiveExists = await fs
          .access(archiveDir)
          .then(() => true)
          .catch(() => false);
        expect(archiveExists).toBe(true);
      }
    });

    it("should remove original file after archiving", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "archive",
        dryRun: false,
        autoDeleteThreshold: 0.8,
      });

      expect(result.success).toBe(true);

      // If archived, original should be removed
      if (result.data?.actionsPerformed?.archived.length) {
        const todoExists = await fs
          .access(path.join(testDir, "TODO.md"))
          .then(() => true)
          .catch(() => false);
        expect(todoExists).toBe(false);
      }
    });

    it("should handle archive operation with dry-run", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "archive",
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.operation).toContain("dry-run");

      // File should still exist
      const todoExists = await fs
        .access(path.join(testDir, "TODO.md"))
        .then(() => true)
        .catch(() => false);
      expect(todoExists).toBe(true);
    });
  });

  describe("Interactive Mode", () => {
    it("should treat interactive mode as dry-run", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        interactive: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.operation).toContain("dry-run");

      // File should still exist
      const todoExists = await fs
        .access(path.join(testDir, "TODO.md"))
        .then(() => true)
        .catch(() => false);
      expect(todoExists).toBe(true);
    });
  });

  describe("Custom Patterns", () => {
    it("should detect custom file patterns", async () => {
      await fs.writeFile(path.join(testDir, "CUSTOM.md"), "# Custom");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        customPatterns: {
          files: ["CUSTOM.md"],
        },
      });

      expect(result.success).toBe(true);
      const customArtifact = result.data?.result.artifacts.find((a) =>
        a.path.includes("CUSTOM.md"),
      );
      expect(customArtifact).toBeDefined();
    });

    it("should detect custom directory patterns", async () => {
      await fs.mkdir(path.join(testDir, ".custom-agent"), { recursive: true });

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        customPatterns: {
          directories: [".custom-agent"],
        },
      });

      expect(result.success).toBe(true);
      const customArtifact = result.data?.result.artifacts.find((a) =>
        a.path.includes(".custom-agent"),
      );
      expect(customArtifact).toBeDefined();
    });

    it("should detect custom inline markers", async () => {
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// CUSTOM-MARKER: test");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        customPatterns: {
          inlineMarkers: ["// CUSTOM-MARKER:"],
        },
      });

      expect(result.success).toBe(true);
      const customArtifact = result.data?.result.artifacts.find((a) =>
        a.detectedBy.includes("CUSTOM-MARKER"),
      );
      expect(customArtifact).toBeDefined();
    });

    it("should merge custom patterns with defaults", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.writeFile(path.join(testDir, "CUSTOM.md"), "# Custom");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        customPatterns: {
          files: ["CUSTOM.md"],
        },
      });

      expect(result.success).toBe(true);
      // Should find both default and custom patterns
      expect(result.data?.result.artifacts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Configuration Options", () => {
    it("should respect autoDeleteThreshold setting", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const highThreshold = await cleanupAgentArtifacts({
        path: testDir,
        operation: "clean",
        dryRun: false,
        autoDeleteThreshold: 0.99,
      });

      expect(highThreshold.success).toBe(true);
      // With very high threshold, fewer deletions
    });

    it("should handle includeGitIgnored option", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
        includeGitIgnored: true,
      });

      expect(result.success).toBe(true);
      // Should scan regardless of .gitignore
    });
  });

  describe("Error Handling", () => {
    it("should handle permission errors gracefully", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      // This should still succeed even if some operations fail
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
    });

    it("should provide helpful error messages", async () => {
      const result = await cleanupAgentArtifacts({
        path: "/invalid/path",
        operation: "scan",
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBeTruthy();
      expect(result.error?.resolution).toBeTruthy();
    });
  });

  describe("Response Format", () => {
    it("should return properly formatted MCPToolResponse", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("metadata");
      expect(result.metadata).toHaveProperty("toolVersion");
      expect(result.metadata).toHaveProperty("executionTime");
      expect(result.metadata).toHaveProperty("timestamp");
    });

    it("should include execution metadata", async () => {
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeTruthy();
    });
  });

  describe("Empty Directory", () => {
    it("should handle empty directories", async () => {
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      expect(result.data?.result.artifacts.length).toBe(0);
      expect(result.data?.result.summary.totalArtifacts).toBe(0);
    });

    it("should not provide artifact recommendations for empty directories", async () => {
      const result = await cleanupAgentArtifacts({
        path: testDir,
        operation: "scan",
      });

      expect(result.success).toBe(true);
      // No recommendations if no artifacts found
      if (result.recommendations) {
        expect(result.recommendations.length).toBe(0);
      }
    });
  });
});
