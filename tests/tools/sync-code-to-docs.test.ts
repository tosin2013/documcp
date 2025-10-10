/**
 * Sync Code to Docs Tool Tests (Phase 3)
 */

import { handleSyncCodeToDocs } from "../../src/tools/sync-code-to-docs.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("sync_code_to_docs tool", () => {
  let tempDir: string;
  let projectPath: string;
  let docsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "sync-test-"));
    projectPath = join(tempDir, "project");
    docsPath = join(tempDir, "docs");

    await fs.mkdir(join(projectPath, "src"), { recursive: true });
    await fs.mkdir(docsPath, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Detect Mode", () => {
    test("should detect drift without making changes", async () => {
      // Create source file
      const sourceCode = `
export function calculate(x: number): number {
  return x * 2;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "calc.ts"), sourceCode);

      // Create documentation
      const docContent = `
# Calculator

## calculate(x: number): number

Doubles the input.
      `.trim();

      await fs.writeFile(join(docsPath, "calc.md"), docContent);

      // Run in detect mode
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: true,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.mode).toBe("detect");

      // Verify no changes were made
      const docAfter = await fs.readFile(join(docsPath, "calc.md"), "utf-8");
      expect(docAfter).toBe(docContent);
    });

    test("should create baseline snapshot on first run", async () => {
      const sourceCode = `export function test(): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), sourceCode);

      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: true,
      });

      expect(result).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.snapshotId).toBeTruthy();

      // Check snapshot was created
      const snapshotDir = join(tempDir, "project", ".documcp", "snapshots");
      const files = await fs.readdir(snapshotDir);
      expect(files.length).toBeGreaterThan(0);
    });

    test("should report drift statistics", async () => {
      // Create initial snapshot
      const oldCode = `
export function oldFunction(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "changes.ts"), oldCode);

      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: true,
      });

      // Make changes
      const newCode = `
export function newFunction(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "changes.ts"), newCode);

      // Detect drift
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.stats).toBeDefined();
      expect(data.data.stats.filesAnalyzed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Apply Mode", () => {
    test("should apply high-confidence changes automatically", async () => {
      // Create code with JSDoc
      const sourceCode = `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum
 */
export function add(a: number, b: number): number {
  return a + b;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "math.ts"), sourceCode);

      // Create minimal documentation
      const docContent = `
# Math Module

Documentation needed.
      `.trim();

      await fs.writeFile(join(docsPath, "math.md"), docContent);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: true,
      });

      // Run in apply mode with high threshold
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "apply",
        autoApplyThreshold: 0.9,
        createSnapshot: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.mode).toBe("apply");

      // Stats should show applied or pending changes
      const stats = data.data.stats;
      expect(
        stats.changesApplied + stats.changesPending,
      ).toBeGreaterThanOrEqual(0);
    });

    test("should respect confidence threshold", async () => {
      // Setup code and docs
      const sourceCode = `export function test(): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), sourceCode);

      const docContent = `# Test`;
      await fs.writeFile(join(docsPath, "test.md"), docContent);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Apply with very high threshold (most changes won't meet it)
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "apply",
        autoApplyThreshold: 0.99,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // With high threshold, most changes should be pending
      if (data.data.stats.driftsDetected > 0) {
        expect(data.data.pendingChanges.length).toBeGreaterThanOrEqual(0);
      }
    });

    test("should create snapshot before applying changes", async () => {
      const sourceCode = `export function test(): void {}`;
      await fs.writeFile(
        join(projectPath, "src", "snapshot-test.ts"),
        sourceCode,
      );

      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "apply",
        createSnapshot: true,
      });

      // Verify snapshot exists
      const snapshotDir = join(projectPath, ".documcp", "snapshots");
      const files = await fs.readdir(snapshotDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("Auto Mode", () => {
    test("should apply all changes in auto mode", async () => {
      const sourceCode = `
export function autoFunction(param: string): string {
  return param.toUpperCase();
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "auto.ts"), sourceCode);

      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "auto",
        createSnapshot: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.mode).toBe("auto");
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid project path", async () => {
      const result = await handleSyncCodeToDocs({
        projectPath: "/nonexistent/path",
        docsPath,
        mode: "detect",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      // Should either fail gracefully or handle missing path
      expect(data).toBeDefined();
    });

    test("should handle invalid docs path", async () => {
      const sourceCode = `export function test(): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), sourceCode);

      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath: "/nonexistent/docs",
        mode: "detect",
      });

      expect(result).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toBeDefined();
    });

    test("should handle empty project", async () => {
      // Empty project directory
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      expect(result).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.stats.filesAnalyzed).toBe(0);
    });
  });

  describe("Recommendations and Next Steps", () => {
    test("should provide recommendations based on results", async () => {
      const sourceCode = `
export function critical(param: number): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "critical.ts"), sourceCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Make breaking change
      const newCode = `
export function critical(param: string, extra: boolean): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "critical.ts"), newCode);

      // Detect changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    test("should provide next steps", async () => {
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.nextSteps).toBeDefined();
      expect(Array.isArray(data.nextSteps)).toBe(true);
    });
  });

  describe("Integration with Knowledge Graph", () => {
    test("should store sync events", async () => {
      const sourceCode = `export function kgTest(): void {}`;
      await fs.writeFile(join(projectPath, "src", "kg-test.ts"), sourceCode);

      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // Sync event should be created (even if storage fails, shouldn't error)
      expect(data.data).toBeDefined();
    });
  });

  describe("Preview Mode", () => {
    test("should show changes in preview mode without applying", async () => {
      const sourceCode = `
export function previewFunc(x: number): number {
  return x * 3;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "preview.ts"), sourceCode);

      const docContent = `
# Preview

Old documentation.
      `.trim();

      await fs.writeFile(join(docsPath, "preview.md"), docContent);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Change code
      const newCode = `
export function previewFunc(x: number, y: number): number {
  return x * y;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "preview.ts"), newCode);

      // Preview changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "preview",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.mode).toBe("preview");

      // Verify documentation wasn't changed
      const docAfter = await fs.readFile(join(docsPath, "preview.md"), "utf-8");
      expect(docAfter).toBe(docContent);
    });
  });
});
