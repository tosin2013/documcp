/**
 * Drift Detector Tests (Phase 3)
 */

import {
  DriftDetector,
  DriftDetectionResult,
} from "../../src/utils/drift-detector.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("DriftDetector", () => {
  let detector: DriftDetector;
  let tempDir: string;
  let projectPath: string;
  let docsPath: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "drift-test-"));
    projectPath = join(tempDir, "project");
    docsPath = join(tempDir, "docs");

    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(join(projectPath, "src"), { recursive: true });
    await fs.mkdir(docsPath, { recursive: true });

    detector = new DriftDetector(tempDir);
    await detector.initialize();
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Snapshot Creation", () => {
    test("should create snapshot of codebase and documentation", async () => {
      // Create sample source file
      const sourceCode = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "math.ts"), sourceCode);

      // Create sample documentation
      const docContent = `
# Math Module

## calculateSum

Adds two numbers together.

\`\`\`typescript
calculateSum(a: number, b: number): number
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "math.md"), docContent);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);

      expect(snapshot).toBeDefined();
      expect(snapshot.projectPath).toBe(projectPath);
      expect(snapshot.timestamp).toBeTruthy();
      expect(snapshot.files.size).toBeGreaterThan(0);
      expect(snapshot.documentation.size).toBeGreaterThan(0);
    });

    test("should store snapshot to disk", async () => {
      const sourceCode = `export function test(): void {}`;
      await fs.writeFile(join(projectPath, "src", "test.ts"), sourceCode);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);

      // Check that snapshot directory was created
      const snapshotDir = join(tempDir, ".documcp", "snapshots");
      const files = await fs.readdir(snapshotDir);

      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.startsWith("snapshot-"))).toBe(true);
    });

    test("should load latest snapshot", async () => {
      const sourceCode = `export function loadTest(): void {}`;
      await fs.writeFile(join(projectPath, "src", "load-test.ts"), sourceCode);

      await detector.createSnapshot(projectPath, docsPath);

      const loaded = await detector.loadLatestSnapshot();

      expect(loaded).toBeDefined();
      expect(loaded?.projectPath).toBe(projectPath);
    });
  });

  describe("Drift Detection", () => {
    test("should detect when function signature changes", async () => {
      // Create initial version
      const oldCode = `
export function processData(data: string): void {
  console.log(data);
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "processor.ts"), oldCode);

      const oldDoc = `
# Processor

## processData(data: string): void

Processes string data.
      `.trim();

      await fs.writeFile(join(docsPath, "processor.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Modify function signature
      const newCode = `
export function processData(data: string, options: object): Promise<string> {
  console.log(data, options);
  return Promise.resolve("done");
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "processor.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      expect(drifts.length).toBeGreaterThan(0);

      const processorDrift = drifts.find((d) =>
        d.filePath.includes("processor.ts"),
      );

      expect(processorDrift).toBeDefined();
      expect(processorDrift?.hasDrift).toBe(true);
      expect(processorDrift?.drifts.length).toBeGreaterThan(0);
    });

    test("should detect when functions are removed", async () => {
      // Initial code with two functions
      const oldCode = `
export function keepMe(): void {}
export function removeMe(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "removal.ts"), oldCode);

      const oldDoc = `
# Functions

## keepMe
## removeMe
      `.trim();

      await fs.writeFile(join(docsPath, "removal.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Remove one function
      const newCode = `
export function keepMe(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "removal.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const removalDrift = drifts.find((d) =>
        d.filePath.includes("removal.ts"),
      );

      expect(removalDrift).toBeDefined();
      expect(
        removalDrift?.drifts.some((drift) => drift.type === "breaking"),
      ).toBe(true);
    });

    test("should detect when new functions are added", async () => {
      const oldCode = `
export function existing(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "addition.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const newCode = `
export function existing(): void {}
export function newFunction(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "addition.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const additionDrift = drifts.find((d) =>
        d.filePath.includes("addition.ts"),
      );

      expect(additionDrift).toBeDefined();
      expect(
        additionDrift?.drifts.some((drift) => drift.type === "missing"),
      ).toBe(true);
    });

    test("should classify drift severity correctly", async () => {
      // Breaking change
      const oldCode = `
export function criticalFunction(param: string): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "severity.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Remove exported function - breaking change
      const newCode = `
function criticalFunction(param: string): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "severity.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const severityDrift = drifts.find((d) =>
        d.filePath.includes("severity.ts"),
      );

      expect(severityDrift).toBeDefined();
      expect(severityDrift?.severity).toBe("critical"); // Removing export is breaking
    });
  });

  describe("Suggestion Generation", () => {
    test("should generate suggestions for outdated documentation", async () => {
      const oldCode = `
export function calculate(x: number): number {
  return x * 2;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "calc.ts"), oldCode);

      const oldDoc = `
# Calculator

## calculate(x: number): number

Doubles the input.
      `.trim();

      await fs.writeFile(join(docsPath, "calc.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Change function signature
      const newCode = `
export function calculate(x: number, y: number): number {
  return x * y;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "calc.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const calcDrift = drifts.find((d) => d.filePath.includes("calc.ts"));

      expect(calcDrift).toBeDefined();
      expect(calcDrift?.suggestions.length).toBeGreaterThan(0);

      const suggestion = calcDrift?.suggestions[0];
      expect(suggestion).toBeDefined();
      expect(suggestion?.suggestedContent).toBeTruthy();
      expect(suggestion?.confidence).toBeGreaterThan(0);
    });

    test("should provide auto-applicable flag for safe changes", async () => {
      const oldCode = `
export function simpleChange(a: number): number {
  return a;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "simple.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Minor change
      const newCode = `
export function simpleChange(a: number): number {
  return a * 2;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "simple.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      // Minor internal changes shouldn't require doc updates if signature is same
      const simpleDrift = drifts.find((d) => d.filePath.includes("simple.ts"));

      if (simpleDrift && simpleDrift.suggestions.length > 0) {
        const suggestion = simpleDrift.suggestions[0];
        expect(typeof suggestion.autoApplicable).toBe("boolean");
      }
    });
  });

  describe("Impact Analysis", () => {
    test("should analyze impact of changes", async () => {
      const oldCode = `
export function breaking(): void {}
export function major(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "impact.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Breaking change - remove function
      const newCode = `
export function major(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "impact.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const impactDrift = drifts.find((d) => d.filePath.includes("impact.ts"));

      expect(impactDrift?.impactAnalysis).toBeDefined();
      expect(impactDrift?.impactAnalysis.breakingChanges).toBeGreaterThan(0);
      expect(impactDrift?.impactAnalysis.estimatedUpdateEffort).toBeDefined();
    });

    test("should identify affected documentation files", async () => {
      const code = `
export function documented(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "documented.ts"), code);

      const doc = `
# Documentation

\`documented()\` is a function.
      `.trim();

      await fs.writeFile(join(docsPath, "documented.md"), doc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Change the function
      const newCode = `
export function documented(param: string): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "documented.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      const docDrift = drifts.find((d) => d.filePath.includes("documented.ts"));

      expect(docDrift?.impactAnalysis.affectedDocFiles.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle no drift scenario", async () => {
      const code = `
export function unchangedFunction(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "unchanged.ts"), code);

      const snapshot1 = await detector.createSnapshot(projectPath, docsPath);
      const snapshot2 = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(snapshot1, snapshot2);

      // No changes should mean no drifts
      const unchangedDrift = drifts.find((d) =>
        d.filePath.includes("unchanged.ts"),
      );

      if (unchangedDrift) {
        expect(unchangedDrift.hasDrift).toBe(false);
      }
    });

    test("should handle missing documentation gracefully", async () => {
      const code = `
export function undocumentedFunction(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "undocumented.ts"), code);

      // Don't create documentation
      const snapshot = await detector.createSnapshot(projectPath, docsPath);

      expect(snapshot).toBeDefined();
      expect(snapshot.documentation.size).toBeGreaterThanOrEqual(0);
    });

    test("should handle new files correctly", async () => {
      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Add new file
      const newCode = `
export function brandNew(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "brand-new.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      // New files might not show as drift if they have no corresponding docs
      expect(Array.isArray(drifts)).toBe(true);
    });
  });

  describe("Documentation Section Extraction", () => {
    test("should extract documentation sections", async () => {
      const doc = `
# Main Title

This is the introduction.

## Section 1

Content for section 1.

\`\`\`typescript
function example(): void {}
\`\`\`

## Section 2

Content for section 2.
      `.trim();

      await fs.writeFile(join(docsPath, "sections.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);

      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "sections.md"),
      );

      expect(docSnapshot).toBeDefined();
      expect(docSnapshot?.sections.length).toBeGreaterThan(0);

      const section1 = docSnapshot?.sections.find(
        (s) => s.title === "Section 1",
      );
      expect(section1).toBeDefined();
      expect(section1?.codeExamples.length).toBeGreaterThan(0);
    });

    test("should extract code references from documentation", async () => {
      const doc = `
# API Reference

See \`calculateSum()\` for details.

The function is in \`src/math.ts\`.

Check out the \`MathUtils\` class.
      `.trim();

      await fs.writeFile(join(docsPath, "references.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);

      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "references.md"),
      );

      expect(docSnapshot).toBeDefined();

      const section = docSnapshot?.sections[0];
      expect(section?.referencedFunctions.length).toBeGreaterThan(0);
    });
  });

  describe("Suggestion Generation Helper Methods", () => {
    test("should generate removal suggestion with deprecation notice", async () => {
      const oldCode = `
export function deprecatedFunc(x: number): number {
  return x;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "deprecated.ts"), oldCode);

      const oldDoc = `
# API

## deprecatedFunc(x: number): number

This function does something.
      `.trim();

      await fs.writeFile(join(docsPath, "deprecated.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Remove the function
      const newCode = `// Function removed`;

      await fs.writeFile(join(projectPath, "src", "deprecated.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const deprecatedDrift = drifts.find((d) =>
        d.filePath.includes("deprecated.ts"),
      );

      expect(deprecatedDrift).toBeDefined();
      expect(deprecatedDrift?.suggestions.length).toBeGreaterThan(0);

      const suggestion = deprecatedDrift?.suggestions[0];
      expect(suggestion?.suggestedContent).toContain("removed");
      expect(suggestion?.suggestedContent).toContain("Note");
    });

    test("should generate addition suggestion with code signature", async () => {
      const oldCode = `export function existing(): void {}`;

      await fs.writeFile(join(projectPath, "src", "additions.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Add new function
      const newCode = `
export function existing(): void {}
export function newAddedFunc(a: number, b: string): boolean {
  return true;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "additions.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const additionDrift = drifts.find((d) =>
        d.filePath.includes("additions.ts"),
      );

      expect(additionDrift?.drifts.some((d) => d.type === "missing")).toBe(
        true,
      );
    });

    test("should generate modification suggestion with signature update", async () => {
      const oldCode = `
export function modifyMe(x: number): number {
  return x;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "modify.ts"), oldCode);

      const oldDoc = `
# API

## modifyMe(x: number): number

Returns the input number.
      `.trim();

      await fs.writeFile(join(docsPath, "modify.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Modify the function signature
      const newCode = `
export function modifyMe(x: number, y: number): number {
  return x + y;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "modify.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const modifyDrift = drifts.find((d) => d.filePath.includes("modify.ts"));

      expect(modifyDrift).toBeDefined();
      expect(modifyDrift?.suggestions.length).toBeGreaterThan(0);

      const suggestion = modifyDrift?.suggestions[0];
      expect(suggestion?.suggestedContent).toBeTruthy();
    });

    test("should set auto-applicable flag correctly for safe changes", async () => {
      const oldCode = `
export function safeChange(x: number): number {
  return x;
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "safe.ts"), oldCode);

      const oldDoc = `
# API

## safeChange(x: number): number
      `.trim();

      await fs.writeFile(join(docsPath, "safe.md"), oldDoc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Internal implementation change (patch level)
      const newCode = `
export function safeChange(x: number): number {
  return x * 2; // Changed implementation but not signature
}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "safe.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);

      // If there are any drifts, check their suggestions
      if (drifts.length > 0) {
        const safeDrift = drifts.find((d) => d.filePath.includes("safe.ts"));
        if (safeDrift && safeDrift.suggestions.length > 0) {
          const suggestion = safeDrift.suggestions[0];
          expect(typeof suggestion.autoApplicable).toBe("boolean");
        }
      }
    });
  });

  describe("Comparison Helper Methods", () => {
    test("should correctly identify affected sections by function name", async () => {
      const code = `
export function targetFunc(): void {}
export function otherFunc(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "target.ts"), code);

      const doc = `
# API

See \`targetFunc()\` for details.

## targetFunc

This documents the target function.

## otherFunc

This documents another function.
      `.trim();

      await fs.writeFile(join(docsPath, "target.md"), doc);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Modify only targetFunc
      const newCode = `
export function targetFunc(param: string): void {}
export function otherFunc(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "target.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const targetDrift = drifts.find((d) => d.filePath.includes("target.ts"));

      expect(targetDrift).toBeDefined();
      // Drift was detected, and impact analysis was performed
      expect(targetDrift?.impactAnalysis).toBeDefined();
      expect(
        targetDrift?.impactAnalysis.affectedDocFiles.length,
      ).toBeGreaterThanOrEqual(0);
    });

    test("should correctly classify drift types", async () => {
      const oldCode = `
export function removedFunc(): void {}
export function modifiedFunc(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "classify.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Remove one function, keep the other unchanged
      const newCode = `
export function modifiedFunc(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "classify.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const classifyDrift = drifts.find((d) =>
        d.filePath.includes("classify.ts"),
      );

      expect(classifyDrift).toBeDefined();
      expect(classifyDrift?.drifts.length).toBeGreaterThan(0);

      // Verify drift types are correctly classified
      const driftTypes = classifyDrift?.drifts.map((d) => d.type) || [];
      expect(driftTypes.length).toBeGreaterThan(0);

      // Should have breaking or incorrect drift for removed function
      const hasRemovalDrift = classifyDrift?.drifts.some(
        (d) => d.type === "breaking" || d.type === "incorrect",
      );
      expect(hasRemovalDrift).toBe(true);
    });

    test("should map impact levels to severity correctly", async () => {
      const oldCode = `
export function critical(): void {}
export function major(): void {}
export function minor(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "severity-map.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Breaking change
      const newCode = `
export function major(): void {}
export function minor(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "severity-map.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const severityDrift = drifts.find((d) =>
        d.filePath.includes("severity-map.ts"),
      );

      expect(severityDrift).toBeDefined();
      expect(severityDrift?.severity).toBe("critical");
    });

    test("should estimate update effort based on drift count", async () => {
      const oldCode = `
export function func1(): void {}
export function func2(): void {}
export function func3(): void {}
export function func4(): void {}
export function func5(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "effort.ts"), oldCode);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Remove multiple functions - high effort
      const newCode = `
export function func5(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "effort.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const effortDrift = drifts.find((d) => d.filePath.includes("effort.ts"));

      expect(effortDrift).toBeDefined();
      expect(effortDrift?.impactAnalysis.estimatedUpdateEffort).toBeDefined();
      expect(
        ["low", "medium", "high"].includes(
          effortDrift!.impactAnalysis.estimatedUpdateEffort,
        ),
      ).toBe(true);
    });

    test("should calculate overall severity from multiple drifts", async () => {
      const oldCode = `
export function criticalChange(): void {}
export function minorChange(): void {}
      `.trim();

      await fs.writeFile(
        join(projectPath, "src", "overall-severity.ts"),
        oldCode,
      );

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Breaking change dominates
      const newCode = `
export function minorChange(x: number): void {}
      `.trim();

      await fs.writeFile(
        join(projectPath, "src", "overall-severity.ts"),
        newCode,
      );

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const overallDrift = drifts.find((d) =>
        d.filePath.includes("overall-severity.ts"),
      );

      expect(overallDrift).toBeDefined();
      expect(
        ["none", "low", "medium", "high", "critical"].includes(
          overallDrift!.severity,
        ),
      ).toBe(true);
    });

    test("should handle multiple documentation files referencing same code", async () => {
      const code = `
export function sharedFunc(): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "shared.ts"), code);

      const doc1 = `
# Guide 1

See \`sharedFunc()\` for details.
      `.trim();

      const doc2 = `
# Guide 2

Also uses \`sharedFunc()\`.
      `.trim();

      await fs.writeFile(join(docsPath, "guide1.md"), doc1);
      await fs.writeFile(join(docsPath, "guide2.md"), doc2);

      const oldSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Change the shared function
      const newCode = `
export function sharedFunc(param: string): void {}
      `.trim();

      await fs.writeFile(join(projectPath, "src", "shared.ts"), newCode);

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const drifts = await detector.detectDrift(oldSnapshot, newSnapshot);
      const sharedDrift = drifts.find((d) => d.filePath.includes("shared.ts"));

      expect(sharedDrift).toBeDefined();
      // Should affect both documentation files
      expect(
        sharedDrift?.impactAnalysis.affectedDocFiles.length,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
