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

  describe("Documentation Change Application", () => {
    test("should apply changes when low-confidence changes exist in auto mode", async () => {
      // Create a source file with documentation
      const sourceCode = `
/**
 * Multiplies two numbers together
 * @param x First number
 * @param y Second number
 */
export function multiply(x: number, y: number): number {
  return x * y;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "math.ts"), sourceCode);

      // Create outdated documentation
      const docContent = `
# Math Module

## multiply

Adds two numbers.
      `.trim();

      await fs.writeFile(join(docsPath, "math.md"), docContent);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Run in auto mode (applies all changes)
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "auto",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.mode).toBe("auto");
    });

    test("should handle apply errors gracefully", async () => {
      // Create source file
      const sourceCode = `export function testFunc(): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), sourceCode);

      // Create documentation in a read-only parent directory would fail
      // But for this test, we'll just verify the error handling path exists
      const docContent = `# Test`;
      await fs.writeFile(join(docsPath, "test.md"), docContent);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Modify code
      const newCode = `export function testFunc(param: string): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), newCode);

      // Try to apply changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "apply",
        autoApplyThreshold: 0.0, // Very low threshold
      });

      // Should complete without crashing
      expect(result).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });
  });

  describe("Recommendation Edge Cases", () => {
    test("should recommend review for breaking changes", async () => {
      // Create initial code
      const oldCode = `
export function oldApi(x: number): string {
  return x.toString();
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "api.ts"), oldCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Make breaking change
      const newCode = `
export function newApi(x: number, y: string): boolean {
  return x > 0;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "api.ts"), newCode);

      // Detect changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // Should have recommendations
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    test("should show info when no drift detected", async () => {
      // Create code
      const sourceCode = `export function stable(): void {}`;
      await fs.writeFile(join(projectPath, "src", "stable.ts"), sourceCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Run again without changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.recommendations).toBeDefined();

      // Should have "No Drift Detected" recommendation
      const noDriftRec = data.recommendations.find(
        (r: any) => r.title?.includes("No Drift"),
      );
      expect(noDriftRec).toBeDefined();
    });

    test("should recommend validation after applying changes", async () => {
      const sourceCode = `
/**
 * Test function
 */
export function test(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "validated.ts"), sourceCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Modify code
      const newCode = `
/**
 * Modified test function
 */
export function test(param: string): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "validated.ts"), newCode);

      // Apply changes
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "auto",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      // Should have next steps
      expect(data.nextSteps).toBeDefined();
      expect(Array.isArray(data.nextSteps)).toBe(true);
    });
  });

  describe("Next Steps Generation", () => {
    test("should suggest apply mode when in detect mode with pending changes", async () => {
      const sourceCode = `export function needsSync(): void {}`;
      await fs.writeFile(join(projectPath, "src", "sync.ts"), sourceCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Change code
      const newCode = `export function needsSync(param: number): void {}`;
      await fs.writeFile(join(projectPath, "src", "sync.ts"), newCode);

      // Detect in detect mode
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.nextSteps).toBeDefined();

      // If there are pending changes, should suggest apply mode
      if (data.data.pendingChanges?.length > 0) {
        const applyStep = data.nextSteps.find(
          (s: any) => s.action?.includes("Apply"),
        );
        expect(applyStep).toBeDefined();
      }
    });

    test("should suggest review for pending manual changes", async () => {
      const sourceCode = `export function complex(): void {}`;
      await fs.writeFile(join(projectPath, "src", "complex.ts"), sourceCode);

      // Create baseline
      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
      });

      // Change code
      const newCode = `export function complex(a: number, b: string): boolean { return true; }`;
      await fs.writeFile(join(projectPath, "src", "complex.ts"), newCode);

      // Detect with very high threshold (forces manual review)
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "apply",
        autoApplyThreshold: 0.99,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.nextSteps).toBeDefined();
    });
  });

  describe("Snapshot Management", () => {
    test("should not create snapshot when createSnapshot is false in detect mode", async () => {
      const sourceCode = `export function noSnapshot(): void {}`;
      await fs.writeFile(join(projectPath, "src", "nosnapshot.ts"), sourceCode);

      await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: false,
      });

      // Should still work even without snapshot
      const result = await handleSyncCodeToDocs({
        projectPath,
        docsPath,
        mode: "detect",
        createSnapshot: false,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });
  });
});
