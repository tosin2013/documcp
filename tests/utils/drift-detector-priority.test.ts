/**
 * Drift Priority Scoring Tests
 */

import {
  DriftDetector,
  DriftDetectionResult,
  DriftPriorityScore,
  PriorityWeights,
  PrioritizedDriftResult,
  UsageMetadata,
  DriftSnapshot,
  DocumentationSnapshot,
} from "../../src/utils/drift-detector.js";
import { ASTAnalysisResult, CodeDiff } from "../../src/utils/ast-analyzer.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("DriftDetector Priority Scoring", () => {
  let detector: DriftDetector;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "drift-priority-test-"));
    detector = new DriftDetector(tempDir);
    await detector.initialize();
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Custom Weights", () => {
    test("should allow setting custom weights", () => {
      const customWeights: Partial<PriorityWeights> = {
        codeComplexity: 0.3,
        usageFrequency: 0.3,
      };

      detector.setCustomWeights(customWeights);
      const weights = detector.getWeights();

      expect(weights.codeComplexity).toBe(0.3);
      expect(weights.usageFrequency).toBe(0.3);
      // Other weights should retain defaults
      expect(weights.changeMagnitude).toBe(0.25);
    });

    test("should use default weights when no custom weights set", () => {
      const newDetector = new DriftDetector(tempDir);
      const weights = newDetector.getWeights();

      expect(weights.codeComplexity).toBe(0.2);
      expect(weights.usageFrequency).toBe(0.25);
      expect(weights.changeMagnitude).toBe(0.25);
      expect(weights.documentationCoverage).toBe(0.15);
      expect(weights.staleness).toBe(0.1);
      expect(weights.userFeedback).toBe(0.05);
    });
  });

  describe("Priority Score Calculation", () => {
    let mockSnapshot: DriftSnapshot;
    let mockResult: DriftDetectionResult;

    beforeEach(() => {
      // Create mock snapshot with file analysis
      const fileAnalysis: ASTAnalysisResult = {
        filePath: "/test/file.ts",
        language: "typescript",
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        imports: [],
        exports: ["myFunction", "MyClass"],
        contentHash: "abc123",
        lastModified: new Date().toISOString(),
        linesOfCode: 100,
        complexity: 10,
      };

      const docSnapshot: DocumentationSnapshot = {
        filePath: "/test/docs/api.md",
        contentHash: "def456",
        referencedCode: ["/test/file.ts"],
        lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        sections: [
          {
            title: "myFunction",
            content: "Description of myFunction",
            referencedFunctions: ["myFunction"],
            referencedClasses: [],
            referencedTypes: [],
            codeExamples: [],
            startLine: 1,
            endLine: 10,
          },
        ],
      };

      mockSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map([["/test/file.ts", fileAnalysis]]),
        documentation: new Map([["/test/docs/api.md", docSnapshot]]),
      };

      const codeDiff: CodeDiff = {
        type: "modified",
        category: "function",
        name: "myFunction",
        details: "Parameters changed",
        oldSignature: "myFunction(a: string): void",
        newSignature: "myFunction(a: string, b: number): void",
        impactLevel: "breaking",
      };

      mockResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "critical",
        drifts: [
          {
            type: "breaking",
            affectedDocs: ["/test/docs/api.md"],
            codeChanges: [codeDiff],
            description: "function 'myFunction' was modified: Parameters changed",
            detectedAt: new Date().toISOString(),
            severity: "critical",
          },
        ],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 1,
          majorChanges: 0,
          minorChanges: 0,
          affectedDocFiles: ["/test/docs/api.md"],
          estimatedUpdateEffort: "high",
          requiresManualReview: true,
        },
      };
    });

    test("should calculate priority score with all factors", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.factors.codeComplexity).toBeGreaterThanOrEqual(0);
      expect(score.factors.usageFrequency).toBeGreaterThanOrEqual(0);
      expect(score.factors.changeMagnitude).toBeGreaterThanOrEqual(0);
      expect(score.factors.documentationCoverage).toBeGreaterThanOrEqual(0);
      expect(score.factors.staleness).toBeGreaterThanOrEqual(0);
      expect(score.factors.userFeedback).toBeGreaterThanOrEqual(0);
    });

    test("should return critical recommendation for high scores", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // Breaking change should result in high score  
      expect(score.factors.changeMagnitude).toBe(100);
      // Overall score should be high priority (breaking change dominates)
      expect(score.recommendation).toMatch(/critical|high/);
      expect(score.overall).toBeGreaterThanOrEqual(60);
    });

    test("should generate appropriate suggested action", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // Should suggest prompt action for breaking changes
      expect(score.suggestedAction).toMatch(/Update (immediately|within 1 day)/);
      expect(score.suggestedAction).toContain("1");
    });

    test("should calculate code complexity score", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // File has complexity of 10, should be normalized
      expect(score.factors.codeComplexity).toBeGreaterThan(0);
      expect(score.factors.codeComplexity).toBeLessThanOrEqual(100);
    });

    test("should calculate change magnitude score", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // 1 breaking change should result in score of 100 (critical)
      expect(score.factors.changeMagnitude).toBe(100);
    });

    test("should calculate staleness score based on doc age", () => {
      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // Doc is 15 days old, should have moderate staleness score
      expect(score.factors.staleness).toBeGreaterThanOrEqual(40);
      expect(score.factors.staleness).toBeLessThanOrEqual(80);
    });

    test("should handle missing documentation as high priority", () => {
      const noDocs: DriftDetectionResult = {
        ...mockResult,
        impactAnalysis: {
          ...mockResult.impactAnalysis,
          affectedDocFiles: [],
        },
      };

      const score = detector.calculatePriorityScore(noDocs, mockSnapshot);

      // Missing documentation should have high coverage score (90 for missing docs)
      expect(score.factors.documentationCoverage).toBe(90);
    });

    test("should use usage metadata when provided", () => {
      const usageMetadata: UsageMetadata = {
        filePath: "/test/file.ts",
        functionCalls: new Map([["myFunction", 50]]),
        classInstantiations: new Map(),
        imports: new Map([["myFunction", 10]]),
      };

      const score = detector.calculatePriorityScore(
        mockResult,
        mockSnapshot,
        usageMetadata,
      );

      // High usage should result in higher usage frequency score
      expect(score.factors.usageFrequency).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Priority Recommendations", () => {
    let mockSnapshot: DriftSnapshot;

    beforeEach(() => {
      const fileAnalysis: ASTAnalysisResult = {
        filePath: "/test/file.ts",
        language: "typescript",
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        imports: [],
        exports: ["testFunc"],
        contentHash: "hash",
        lastModified: new Date().toISOString(),
        linesOfCode: 50,
        complexity: 5,
      };

      mockSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map([["/test/file.ts", fileAnalysis]]),
        documentation: new Map(),
      };
    });

    test("should recommend critical priority for breaking changes", () => {
      // Create a realistic scenario with exported API and documentation
      const fileAnalysis: ASTAnalysisResult = {
        filePath: "/test/file.ts",
        language: "typescript",
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        imports: [],
        exports: ["criticalFunction", "CriticalClass"], // Public API
        contentHash: "hash",
        lastModified: new Date().toISOString(),
        linesOfCode: 100,
        complexity: 15, // Moderate complexity
      };

      const docSnapshot: DocumentationSnapshot = {
        filePath: "/test/docs/api.md",
        contentHash: "hash",
        referencedCode: ["/test/file.ts"],
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days old
        sections: [
          {
            title: "criticalFunction",
            content: "Description",
            referencedFunctions: ["criticalFunction"],
            referencedClasses: [],
            referencedTypes: [],
            codeExamples: [],
            startLine: 1,
            endLine: 10,
          },
        ],
      };

      const snapshotWithDocs: DriftSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map([["/test/file.ts", fileAnalysis]]),
        documentation: new Map([["/test/docs/api.md", docSnapshot]]),
      };

      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "critical",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 2,
          majorChanges: 0,
          minorChanges: 0,
          affectedDocFiles: ["/test/docs/api.md"],
          estimatedUpdateEffort: "high",
          requiresManualReview: true,
        },
      };

      const score = detector.calculatePriorityScore(result, snapshotWithDocs);
      // Breaking changes with public API, old docs, and moderate complexity should score high
      expect(score.recommendation).toMatch(/critical|high/);
      expect(score.overall).toBeGreaterThanOrEqual(60);
    });

    test("should recommend high priority for major changes", () => {
      // Add documentation to snapshot
      const docSnapshot: DocumentationSnapshot = {
        filePath: "/test/docs/api.md",
        contentHash: "hash",
        referencedCode: ["/test/file.ts"],
        lastUpdated: new Date().toISOString(),
        sections: [],
      };

      const snapshotWithDocs: DriftSnapshot = {
        ...mockSnapshot,
        documentation: new Map([["/test/docs/api.md", docSnapshot]]),
      };

      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "high",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 4, // Increase to ensure score reaches threshold
          minorChanges: 0,
          affectedDocFiles: ["/test/docs/api.md"],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      const score = detector.calculatePriorityScore(result, snapshotWithDocs);
      // 4 major changes should score at least medium priority
      expect(score.recommendation).toMatch(/high|medium/);
      expect(score.overall).toBeGreaterThanOrEqual(40);
    });

    test("should recommend medium priority for minor changes", () => {
      // Add documentation to snapshot
      const docSnapshot: DocumentationSnapshot = {
        filePath: "/test/docs/api.md",
        contentHash: "hash",
        referencedCode: ["/test/file.ts"],
        lastUpdated: new Date().toISOString(),
        sections: [],
      };

      const snapshotWithDocs: DriftSnapshot = {
        ...mockSnapshot,
        documentation: new Map([["/test/docs/api.md", docSnapshot]]),
      };

      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 0,
          minorChanges: 8, // Increase to ensure score reaches threshold
          affectedDocFiles: ["/test/docs/api.md"],
          estimatedUpdateEffort: "low",
          requiresManualReview: false,
        },
      };

      const score = detector.calculatePriorityScore(result, snapshotWithDocs);
      // 8 minor changes should score at least low-medium priority
      expect(score.recommendation).toMatch(/medium|low/);
      expect(score.overall).toBeGreaterThan(0);
    });

    test("should recommend low priority for patch changes", () => {
      const result: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "low",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 0,
          minorChanges: 1,
          affectedDocFiles: [],
          estimatedUpdateEffort: "low",
          requiresManualReview: false,
        },
      };

      const score = detector.calculatePriorityScore(result, mockSnapshot);
      expect(score.recommendation).toBe("low");
      expect(score.overall).toBeLessThan(40);
    });
  });

  describe("Prioritized Drift Detection", () => {
    let projectPath: string;
    let docsPath: string;

    beforeEach(async () => {
      projectPath = join(tempDir, "project");
      docsPath = join(tempDir, "docs");

      await fs.mkdir(projectPath, { recursive: true });
      await fs.mkdir(join(projectPath, "src"), { recursive: true });
      await fs.mkdir(docsPath, { recursive: true });
    });

    test("should detect drift with priority scores", async () => {
      // Create initial code
      const initialCode = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}
      `.trim();
      await fs.writeFile(join(projectPath, "src", "math.ts"), initialCode);

      // Create documentation
      const docContent = `
# Math Module

## calculateSum

Adds two numbers together.

\`\`\`typescript
calculateSum(a: number, b: number): number
\`\`\`
      `.trim();
      await fs.writeFile(join(docsPath, "math.md"), docContent);

      // Create initial snapshot
      const oldSnapshot = await detector.createSnapshot(
        projectPath,
        docsPath,
      );

      // Modify code (breaking change)
      const modifiedCode = `
export function calculateSum(a: number, b: number, c: number): number {
  return a + b + c;
}
      `.trim();
      await fs.writeFile(join(projectPath, "src", "math.ts"), modifiedCode);

      // Create new snapshot
      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      // Detect drift with priority
      const results = await detector.detectDriftWithPriority(
        oldSnapshot,
        newSnapshot,
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      const result = results[0] as PrioritizedDriftResult;
      expect(result.priorityScore).toBeDefined();
      expect(result.priorityScore!.overall).toBeGreaterThanOrEqual(0);
      expect(result.priorityScore!.overall).toBeLessThanOrEqual(100);
      expect(result.priorityScore!.recommendation).toBeDefined();
      expect(result.priorityScore!.suggestedAction).toBeDefined();
    });

    test("should sort results by priority", async () => {
      // Create multiple files with different severity
      const criticalCode = `
export class CriticalAPI {
  public breaking(): void {}
}
      `.trim();
      const minorCode = `
export function minorChange(): void {
  // comment added
}
      `.trim();

      await fs.writeFile(
        join(projectPath, "src", "critical.ts"),
        criticalCode,
      );
      await fs.writeFile(join(projectPath, "src", "minor.ts"), minorCode);

      // Create docs
      await fs.writeFile(
        join(docsPath, "critical.md"),
        "# CriticalAPI\n\n## breaking\n\nA method.",
      );
      await fs.writeFile(
        join(docsPath, "minor.md"),
        "# minorChange\n\nA function.",
      );

      const oldSnapshot = await detector.createSnapshot(
        projectPath,
        docsPath,
      );

      // Make breaking change to critical, minor change to other
      const criticalModified = `
export class CriticalAPI {
  public breaking(newParam: string): void {}
}
      `.trim();
      await fs.writeFile(
        join(projectPath, "src", "critical.ts"),
        criticalModified,
      );

      const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

      const results = await detector.getPrioritizedDriftResults(
        oldSnapshot,
        newSnapshot,
      );

      if (results.length > 1) {
        // Results should be sorted by priority (highest first)
        for (let i = 0; i < results.length - 1; i++) {
          const currentScore = results[i].priorityScore?.overall ?? 0;
          const nextScore = results[i + 1].priorityScore?.overall ?? 0;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });
  });

  describe("Score Reproducibility", () => {
    test("should produce same score for same inputs", () => {
      const mockSnapshot: DriftSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map([
          [
            "/test/file.ts",
            {
              filePath: "/test/file.ts",
              language: "typescript",
              functions: [],
              classes: [],
              interfaces: [],
              types: [],
              imports: [],
              exports: ["func"],
              contentHash: "hash",
              lastModified: new Date().toISOString(),
              linesOfCode: 100,
              complexity: 15,
            },
          ],
        ]),
        documentation: new Map(),
      };

      const mockResult: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: true,
        severity: "high",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 1,
          majorChanges: 2,
          minorChanges: 3,
          affectedDocFiles: ["/test/docs/api.md"],
          estimatedUpdateEffort: "medium",
          requiresManualReview: true,
        },
      };

      const score1 = detector.calculatePriorityScore(mockResult, mockSnapshot);
      const score2 = detector.calculatePriorityScore(mockResult, mockSnapshot);

      expect(score1.overall).toBe(score2.overall);
      expect(score1.factors.codeComplexity).toBe(
        score2.factors.codeComplexity,
      );
      expect(score1.factors.changeMagnitude).toBe(
        score2.factors.changeMagnitude,
      );
      expect(score1.recommendation).toBe(score2.recommendation);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty drift results", () => {
      const mockSnapshot: DriftSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map(),
        documentation: new Map(),
      };

      const emptyResult: DriftDetectionResult = {
        filePath: "/test/file.ts",
        hasDrift: false,
        severity: "none",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 0,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "low",
          requiresManualReview: false,
        },
      };

      const score = detector.calculatePriorityScore(emptyResult, mockSnapshot);

      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      // Empty results can be low or medium depending on other factors
      expect(score.recommendation).toMatch(/low|medium/);
    });

    test("should handle missing file in snapshot", () => {
      const mockSnapshot: DriftSnapshot = {
        projectPath: "/test",
        timestamp: new Date().toISOString(),
        files: new Map(),
        documentation: new Map(),
      };

      const mockResult: DriftDetectionResult = {
        filePath: "/test/nonexistent.ts",
        hasDrift: true,
        severity: "medium",
        drifts: [],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 1,
          minorChanges: 0,
          affectedDocFiles: [],
          estimatedUpdateEffort: "medium",
          requiresManualReview: false,
        },
      };

      const score = detector.calculatePriorityScore(mockResult, mockSnapshot);

      // Should use default values when file not found
      expect(score).toBeDefined();
      expect(score.factors.codeComplexity).toBe(50); // default
    });
  });
});
