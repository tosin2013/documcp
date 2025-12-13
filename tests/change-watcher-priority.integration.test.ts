import { ChangeWatcher } from "../src/utils/change-watcher.js";
import {
  DriftSnapshot,
  PrioritizedDriftResult,
} from "../src/utils/drift-detector.js";
import { ASTAnalysisResult } from "../src/utils/ast-analyzer.js";

describe("ChangeWatcher priority integration", () => {
  it("passes collected usage metadata into prioritized drift results", async () => {
    // Baseline snapshot (pre-change)
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
      classes: [],
      interfaces: [],
      types: [],
      imports: [],
      exports: ["produce"],
      contentHash: "abc",
      lastModified: new Date().toISOString(),
      linesOfCode: 10,
      complexity: 1,
    };

    const baselineSnapshot: DriftSnapshot = {
      projectPath: "/repo",
      timestamp: new Date().toISOString(),
      files: new Map([[producerFile.filePath, producerFile]]),
      documentation: new Map(),
    };

    // Current snapshot adds an importing consumer and doc references
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
          imports: [{ name: "produce" }],
          isDefault: false,
          startLine: 1,
        },
      ],
      exports: [],
      contentHash: "def",
      lastModified: new Date().toISOString(),
      linesOfCode: 5,
      complexity: 1,
    };

    const docSnapshot = {
      filePath: "/repo/docs/api.md",
      contentHash: "ghi",
      referencedCode: [producerFile.filePath],
      lastUpdated: new Date().toISOString(),
      sections: [
        {
          title: "produce",
          content: "Description",
          referencedFunctions: ["produce"],
          referencedClasses: [],
          referencedTypes: [],
          codeExamples: [],
          startLine: 1,
          endLine: 5,
        },
      ],
    };

    const currentSnapshot: DriftSnapshot = {
      projectPath: "/repo",
      timestamp: new Date().toISOString(),
      files: new Map([
        [producerFile.filePath, producerFile],
        [consumerFile.filePath, consumerFile],
      ]),
      documentation: new Map([[docSnapshot.filePath, docSnapshot]]),
    };

    const driftResults: PrioritizedDriftResult[] = [
      {
        filePath: producerFile.filePath,
        hasDrift: true,
        severity: "medium",
        drifts: [
          {
            type: "outdated",
            affectedDocs: [docSnapshot.filePath],
            codeChanges: [
              {
                type: "modified",
                category: "function",
                name: "produce",
                details: "signature update",
                impactLevel: "minor",
              },
            ],
            description: "function changed",
            detectedAt: new Date().toISOString(),
            severity: "medium",
          },
        ],
        suggestions: [],
        impactAnalysis: {
          breakingChanges: 0,
          majorChanges: 0,
          minorChanges: 1,
          affectedDocFiles: [docSnapshot.filePath],
          estimatedUpdateEffort: "low",
          requiresManualReview: false,
        },
        priorityScore: {
          overall: 0,
          factors: {
            codeComplexity: 0,
            usageFrequency: 0,
            changeMagnitude: 0,
            documentationCoverage: 0,
            staleness: 0,
            userFeedback: 0,
          },
          recommendation: "low",
          suggestedAction: "",
        },
      },
    ];

    let capturedUsage: any = null;

    const detectorStub = {
      initialize: jest.fn().mockResolvedValue(undefined),
      loadLatestSnapshot: jest.fn().mockResolvedValue(baselineSnapshot),
      createSnapshot: jest.fn().mockResolvedValue(currentSnapshot),
      getPrioritizedDriftResults: jest
        .fn()
        .mockImplementation(
          async (
            _oldSnapshot: DriftSnapshot,
            _newSnapshot: DriftSnapshot,
            usageMetadata: any,
          ) => {
            capturedUsage = usageMetadata;
            // Encode usage frequency into the priority score for assertion
            const usageFreq = usageMetadata?.imports?.get("produce") ?? 0;
            return driftResults.map((dr) => ({
              ...dr,
              priorityScore: {
                ...dr.priorityScore!,
                factors: {
                  ...dr.priorityScore!.factors,
                  usageFrequency: usageFreq,
                },
                overall: usageFreq,
              },
            }));
          },
        ),
    };

    const watcher = new ChangeWatcher(
      {
        projectPath: "/repo",
        docsPath: "/repo/docs",
        watchPaths: [], // disable FS watcher side effects
      },
      {
        createDetector: () => detectorStub as any,
      },
    );

    await watcher.start();
    const result = await watcher.triggerManual("test-run");

    expect(detectorStub.initialize).toHaveBeenCalled();
    expect(detectorStub.getPrioritizedDriftResults).toHaveBeenCalled();

    // Usage metadata should reflect imports and doc references
    expect(capturedUsage).toBeTruthy();
    expect(capturedUsage.imports.get("produce")).toBe(1);
    // produce is exported as a function; collector should count it in functionCalls
    expect(capturedUsage.functionCalls.get("produce")).toBeGreaterThanOrEqual(
      1,
    );

    // Drift results returned to the caller should carry the usage-influenced score
    expect(result.driftResults[0].priorityScore?.overall).toBe(1);
    expect(result.driftResults[0].priorityScore?.factors.usageFrequency).toBe(
      1,
    );
  });
});
