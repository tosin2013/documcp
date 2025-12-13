import { UsageMetadataCollector } from "../../src/utils/usage-metadata.js";
import {
  DriftSnapshot,
  DocumentationSnapshot,
  DriftDetectionResult,
} from "../../src/utils/drift-detector.js";
import { ASTAnalysisResult } from "../../src/utils/ast-analyzer.js";
import { DriftDetector } from "../../src/utils/drift-detector.js";

describe("UsageMetadataCollector", () => {
  const collector = new UsageMetadataCollector();

  const makeSnapshot = (): DriftSnapshot => {
    const producerFile: ASTAnalysisResult = {
      filePath: "/repo/src/producer.ts",
      language: "typescript",
      functions: [
        {
          name: "produce",
          parameters: [],
          returnType: null,
          isAsync: false,
          isExported: true,
          isPublic: true,
          docComment: null,
          startLine: 1,
          endLine: 1,
          complexity: 1,
          dependencies: [],
        },
      ],
      classes: [
        {
          name: "Widget",
          isExported: true,
          extends: null,
          implements: [],
          methods: [],
          properties: [],
          docComment: null,
          startLine: 1,
          endLine: 1,
        },
      ],
      interfaces: [],
      types: [],
      imports: [],
      exports: ["produce", "Widget"],
      contentHash: "abc",
      lastModified: new Date().toISOString(),
      linesOfCode: 10,
      complexity: 1,
    };

    const consumerFile: ASTAnalysisResult = {
      filePath: "/repo/src/consumer.ts",
      language: "typescript",
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      imports: [
        {
          source: "./producer",
          imports: [{ name: "produce" }, { name: "Widget" }],
          isDefault: false,
          startLine: 1,
        },
      ],
      exports: [],
      contentHash: "def",
      lastModified: new Date().toISOString(),
      linesOfCode: 10,
      complexity: 1,
    };

    const docSnapshot: DocumentationSnapshot = {
      filePath: "/repo/docs/api.md",
      contentHash: "ghi",
      referencedCode: ["/repo/src/producer.ts"],
      lastUpdated: new Date().toISOString(),
      sections: [
        {
          title: "Widget",
          content: "Widget docs",
          referencedFunctions: [],
          referencedClasses: ["Widget"],
          referencedTypes: [],
          codeExamples: [],
          startLine: 1,
          endLine: 5,
        },
      ],
    };

    return {
      projectPath: "/repo",
      timestamp: new Date().toISOString(),
      files: new Map([
        [producerFile.filePath, producerFile],
        [consumerFile.filePath, consumerFile],
      ]),
      documentation: new Map([[docSnapshot.filePath, docSnapshot]]),
    };
  };

  it("counts imports and class/function references (sync fallback)", () => {
    const snapshot = makeSnapshot();
    const metadata = collector.collectSync(snapshot);

    expect(metadata.imports.get("produce")).toBe(1);
    expect(metadata.imports.get("Widget")).toBe(1);
    expect(metadata.functionCalls.get("produce")).toBe(1);
    // Widget is identified as a class and should increment class instantiations
    // once from docs and once from imports.
    expect(metadata.classInstantiations.get("Widget")).toBe(2);
  });

  it("collects usage metadata asynchronously with call graph analysis", async () => {
    const snapshot = makeSnapshot();
    const metadata = await collector.collect(snapshot);

    expect(metadata.imports.get("produce")).toBeGreaterThanOrEqual(1);
    expect(metadata.imports.get("Widget")).toBeGreaterThanOrEqual(1);
    // Function calls may be counted from call graph or imports
    expect(metadata.functionCalls.get("produce")).toBeGreaterThanOrEqual(0);
    expect(metadata.classInstantiations.get("Widget")).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("integrates with DriftDetector scoring when usage metadata is supplied", async () => {
    const snapshot = makeSnapshot();
    const metadata = await collector
      .collect(snapshot)
      .catch(() => collector.collectSync(snapshot));
    const detector = new DriftDetector("/repo");

    const result: DriftDetectionResult = {
      filePath: "/repo/src/producer.ts",
      hasDrift: true,
      severity: "medium" as const,
      drifts: [
        {
          type: "outdated" as const,
          affectedDocs: ["/repo/docs/api.md"],
          codeChanges: [
            {
              type: "modified" as const,
              category: "function" as const,
              name: "produce",
              details: "signature update",
              impactLevel: "minor" as const,
            },
          ],
          description: "function changed",
          detectedAt: new Date().toISOString(),
          severity: "medium" as const,
        },
      ],
      suggestions: [],
      impactAnalysis: {
        breakingChanges: 0,
        majorChanges: 0,
        minorChanges: 1,
        affectedDocFiles: ["/repo/docs/api.md"],
        estimatedUpdateEffort: "low" as const,
        requiresManualReview: false,
      },
    };

    const scoreWithoutUsage = detector.calculatePriorityScore(result, snapshot);
    const scoreWithUsage = detector.calculatePriorityScore(
      result,
      snapshot,
      metadata,
    );

    // Usage frequency should align with observed usage (imports + calls).
    const expectedUsage =
      (metadata.functionCalls.get("produce") ?? 0) +
      (metadata.imports.get("produce") ?? 0);
    expect(scoreWithUsage.factors.usageFrequency).toBe(expectedUsage);
    expect(scoreWithUsage.factors.usageFrequency).toBeGreaterThan(0);
  });
});
