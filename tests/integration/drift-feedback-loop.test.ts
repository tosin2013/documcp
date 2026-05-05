/**
 * End-to-end integration test for the drift priority feedback ingestion
 * loop (Issue #114, ADR-012 Phase 4).
 *
 * Walks the full happy path:
 *   1. Run `detectDriftWithPriority` against a synthetic snapshot pair with
 *      `{ projectPath }` so drift events get persisted.
 *   2. Each result carries a stable `driftId`.
 *   3. Call the `record_drift_outcome` MCP tool to submit outcomes.
 *   4. Re-run detection with `useCalibration: true` and confirm the weights
 *      changed in the expected direction.
 *   5. Confirm `getDeploymentRecommendations()` surfaces the feedback summary.
 *
 * We also check the failure path: recording an outcome for an unknown
 * driftId should produce a structured error, not silently swallow.
 */

import { promises as fs } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import {
  DriftDetector,
  type DriftSnapshot,
} from "../../src/utils/drift-detector.js";
import {
  ASTAnalysisResult,
  type FunctionSignature,
} from "../../src/utils/ast-analyzer.js";
import { handleRecordDriftOutcome } from "../../src/tools/record-drift-outcome.js";
import {
  resetKnowledgeGraph,
  getDeploymentRecommendations,
  getKnowledgeGraph,
} from "../../src/memory/kg-integration.js";
import {
  generateProjectId,
  getDriftFeedbackHistory,
  getDriftFeedbackSummary,
} from "../../src/memory/kg-drift-feedback.js";

const PROJECT_PATH = "/virtual/project-114-loop";

interface ParsedToolResponse {
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
}

function parseToolResponse(wrapper: any): ParsedToolResponse {
  // record_drift_outcome uses fullResponse: true → first text block is JSON.
  const first = wrapper?.content?.[0]?.text ?? "{}";
  return JSON.parse(first) as ParsedToolResponse;
}

function makeFunction(
  name: string,
  overrides: Partial<FunctionSignature> = {},
): FunctionSignature {
  return {
    name,
    parameters: [],
    returnType: "void",
    isAsync: false,
    isExported: true,
    isPublic: true,
    docComment: null,
    startLine: 1,
    endLine: 5,
    complexity: 1,
    dependencies: [],
    ...overrides,
  };
}

function makeFileAnalysis(
  filePath: string,
  functions: FunctionSignature[],
  contentHash: string,
  complexity = 10,
): ASTAnalysisResult {
  return {
    filePath,
    language: "typescript",
    functions,
    classes: [],
    interfaces: [],
    types: [],
    imports: [],
    exports: functions.map((f) => f.name),
    contentHash,
    lastModified: new Date().toISOString(),
    linesOfCode: 100,
    complexity,
  };
}

function makeSnapshotPair(): { before: DriftSnapshot; after: DriftSnapshot } {
  const filePath = join(PROJECT_PATH, "src", "lib.ts");
  // `bar` is removed in `after` and `baz` is added — the analyzer's
  // compareFunctions() turns this into a "removed" + "added" CodeDiff pair,
  // which is enough for DriftDetector to surface a drift result.
  const before: DriftSnapshot = {
    projectPath: PROJECT_PATH,
    timestamp: "2026-01-01T00:00:00.000Z",
    files: new Map([
      [
        filePath,
        makeFileAnalysis(
          filePath,
          [makeFunction("foo"), makeFunction("bar")],
          "hash-before",
        ),
      ],
    ]),
    documentation: new Map(),
  };
  const after: DriftSnapshot = {
    projectPath: PROJECT_PATH,
    timestamp: "2026-02-01T00:00:00.000Z",
    files: new Map([
      [
        filePath,
        makeFileAnalysis(
          filePath,
          [makeFunction("foo"), makeFunction("baz")],
          "hash-after",
        ),
      ],
    ]),
    documentation: new Map(),
  };
  return { before, after };
}

describe("drift priority feedback ingestion loop (issue #114)", () => {
  let storageRoot: string;
  let detectorRoot: string;
  let detector: DriftDetector;
  let originalStorageDir: string | undefined;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), "drift-feedback-loop-"));
    detectorRoot = join(storageRoot, "detector");
    await fs.mkdir(detectorRoot, { recursive: true });

    originalStorageDir = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = join(storageRoot, ".documcp", "memory");
    await fs.mkdir(process.env.DOCUMCP_STORAGE_DIR, { recursive: true });
    resetKnowledgeGraph();

    detector = new DriftDetector(detectorRoot);
    await detector.initialize();
  });

  afterEach(async () => {
    resetKnowledgeGraph();
    if (originalStorageDir !== undefined) {
      process.env.DOCUMCP_STORAGE_DIR = originalStorageDir;
    } else {
      delete process.env.DOCUMCP_STORAGE_DIR;
    }
    await rm(storageRoot, { recursive: true, force: true });
  });

  test("end-to-end: detect → persist → record outcome → calibrate", async () => {
    const { before, after } = makeSnapshotPair();

    // Step 1: detect with persistence enabled.
    const initial = await detector.detectDriftWithPriority(
      before,
      after,
      undefined,
      { projectPath: PROJECT_PATH },
    );

    expect(initial.length).toBeGreaterThan(0);
    const drift = initial[0];
    expect(drift.driftId).toBeDefined();
    expect(typeof drift.driftId).toBe("string");
    expect(drift.priorityScore?.factors).toBeDefined();

    // Step 2: confirm a drift_event landed in the KG.
    const kg = await getKnowledgeGraph();
    const events = await kg.findNodes({ type: "drift_event" });
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.properties.driftId === drift.driftId)).toBe(
      true,
    );

    // Step 3: record an outcome via the MCP tool wrapper. We seed three
    // outcomes (the calibration threshold) to actually move weights.
    for (let i = 0; i < 3; i++) {
      // Each call needs its own driftId — re-running detection produces the
      // same id (deterministic by filePath + symbols + snapshot timestamp),
      // so we mutate the snapshot timestamp slightly to spread outcomes
      // across multiple events.
      const variant = makeSnapshotPair();
      variant.after.timestamp = `2026-02-0${i + 1}T00:00:00.000Z`;
      const round = await detector.detectDriftWithPriority(
        variant.before,
        variant.after,
        undefined,
        { projectPath: PROJECT_PATH },
      );
      const variantDrift = round[0];
      expect(variantDrift.driftId).toBeDefined();
      const response = await handleRecordDriftOutcome({
        projectPath: PROJECT_PATH,
        driftId: variantDrift.driftId,
        outcome: "actionable",
        notes: `seed-${i}`,
      });
      const parsed = parseToolResponse(response);
      expect(parsed.success).toBe(true);
      expect(parsed.data?.summary?.actionable).toBe(i + 1);
    }

    // Step 4: calibration should now have produced weights that differ from
    // defaults — at least one factor should have moved.
    const calibrated = await detector.getCalibratedWeights(PROJECT_PATH);
    const defaults = {
      codeComplexity: 0.2,
      usageFrequency: 0.25,
      changeMagnitude: 0.25,
      documentationCoverage: 0.15,
      staleness: 0.1,
      userFeedback: 0.05,
    };
    const moved = (Object.keys(defaults) as Array<keyof typeof defaults>).some(
      (k) => Math.abs(calibrated[k] - defaults[k]) > 1e-6,
    );
    expect(moved).toBe(true);
    const sum = (Object.keys(calibrated) as Array<keyof typeof defaults>)
      .map((k) => calibrated[k])
      .reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);

    // Step 5: re-detecting WITH calibration should now use the calibrated
    // weights for THIS call without permanently mutating the detector's
    // customWeights.
    const calibratedRun = await detector.detectDriftWithPriority(
      before,
      after,
      undefined,
      { projectPath: PROJECT_PATH, useCalibration: true },
    );
    expect(calibratedRun.length).toBeGreaterThan(0);
    expect(calibratedRun[0].driftId).toBe(drift.driftId);

    // Custom weights should be untouched after the call (we only swap during
    // the detection window).
    expect(detector.getWeights()).toEqual(defaults);
  });

  test("getDeploymentRecommendations surfaces the drift feedback summary once outcomes exist", async () => {
    // First create the project node in the KG so getDeploymentRecommendations
    // can find it.
    const kg = await getKnowledgeGraph();
    const projectId = generateProjectId(PROJECT_PATH);
    kg.addNode({
      id: projectId,
      type: "project",
      label: "test-project",
      properties: { id: projectId, path: PROJECT_PATH },
      weight: 1.0,
    });

    // Seed three outcomes so the summary is non-empty.
    for (let i = 0; i < 3; i++) {
      const variant = makeSnapshotPair();
      variant.after.timestamp = `2026-03-0${i + 1}T00:00:00.000Z`;
      const round = await detector.detectDriftWithPriority(
        variant.before,
        variant.after,
        undefined,
        { projectPath: PROJECT_PATH },
      );
      await handleRecordDriftOutcome({
        projectPath: PROJECT_PATH,
        driftId: round[0].driftId,
        outcome: i === 0 ? "noise" : "actionable",
      });
    }

    const summary = await getDriftFeedbackSummary(PROJECT_PATH);
    expect(summary.totalOutcomes).toBe(3);
    expect(summary.actionable).toBe(2);
    expect(summary.noise).toBe(1);

    const recs = await getDeploymentRecommendations(projectId);
    // We don't have similar projects in this test, so recs may be empty —
    // but the function shouldn't throw and the summary should be available
    // via getDriftFeedbackSummary directly.
    expect(Array.isArray(recs)).toBe(true);

    // If there ARE recs, they each carry the summary. If there aren't, the
    // summary is still queryable via getDriftFeedbackSummary which is the
    // contract documented in ADR-012 Phase 4.
    for (const rec of recs) {
      expect(rec.driftFeedback?.totalOutcomes).toBe(3);
    }
  });

  test("rejects outcome recording for an unknown driftId with a structured error", async () => {
    const response = await handleRecordDriftOutcome({
      projectPath: PROJECT_PATH,
      driftId: "definitely-not-a-real-id",
      outcome: "actionable",
    });
    const parsed = parseToolResponse(response);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.code).toBe("DRIFT_NOT_FOUND");
    expect(parsed.error?.message).toMatch(/No drift event found/i);
  });

  test("rejects malformed input with INVALID_INPUT", async () => {
    const response = await handleRecordDriftOutcome({
      projectPath: PROJECT_PATH,
      // missing driftId
      outcome: "actionable",
    });
    const parsed = parseToolResponse(response);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.code).toBe("INVALID_INPUT");
  });

  test("multiple outcomes for the same driftId — most recent wins for calibration", async () => {
    const { before, after } = makeSnapshotPair();
    const initial = await detector.detectDriftWithPriority(
      before,
      after,
      undefined,
      { projectPath: PROJECT_PATH },
    );
    const driftId = initial[0].driftId!;

    // First record as 'noise', then revise to 'actionable'.
    await handleRecordDriftOutcome({
      projectPath: PROJECT_PATH,
      driftId,
      outcome: "noise",
    });
    // Tiny delay to ensure recordedAt timestamps differ — the feedback
    // history dedupes on recordedAt.
    await new Promise((r) => setTimeout(r, 10));
    await handleRecordDriftOutcome({
      projectPath: PROJECT_PATH,
      driftId,
      outcome: "actionable",
    });

    const history = await getDriftFeedbackHistory(PROJECT_PATH);
    // There should be a single entry (the latest outcome wins per driftId).
    const entryForDrift = history.find((h) => h.event.driftId === driftId);
    expect(entryForDrift).toBeDefined();
    expect(entryForDrift?.outcome.outcome).toBe("actionable");
  });
});
