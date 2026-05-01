/**
 * Unit tests for `DriftDetector.getCalibratedWeights()` (Issue #114, ADR-012
 * Phase 4).
 *
 * Each test seeds the KG directly via `storeDriftEvent` + `recordDriftOutcome`
 * (no actual drift detection plumbing) so we can pin the formula's behaviour
 * without worrying about AST / snapshot fluctuations. Storage is per-test
 * isolated via `DOCUMCP_STORAGE_DIR` to avoid cross-talk.
 */

import { promises as fs } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import { DriftDetector } from "../../src/utils/drift-detector.js";
import {
  storeDriftEvent,
  recordDriftOutcome,
  type DriftEventRecord,
  type DriftFactorSnapshot,
  type DriftOutcome,
} from "../../src/memory/kg-drift-feedback.js";
import { resetKnowledgeGraph } from "../../src/memory/kg-integration.js";

const PROJECT_PATH = "/virtual/project-114";

const DEFAULT_WEIGHTS = {
  codeComplexity: 0.2,
  usageFrequency: 0.25,
  changeMagnitude: 0.25,
  documentationCoverage: 0.15,
  staleness: 0.1,
  userFeedback: 0.05,
};

const FACTOR_KEYS = Object.keys(DEFAULT_WEIGHTS) as Array<
  keyof typeof DEFAULT_WEIGHTS
>;

function makeFactors(
  overrides: Partial<DriftFactorSnapshot> = {},
): DriftFactorSnapshot {
  return {
    codeComplexity: 50,
    usageFrequency: 50,
    changeMagnitude: 50,
    documentationCoverage: 50,
    staleness: 50,
    userFeedback: 50,
    ...overrides,
  };
}

function makeEvent(
  driftId: string,
  factorOverrides: Partial<DriftFactorSnapshot> = {},
): DriftEventRecord {
  return {
    driftId,
    filePath: `/src/${driftId}.ts`,
    severity: "high",
    recommendation: "high",
    overallScore: 70,
    factors: makeFactors(factorOverrides),
    detectedAt: new Date().toISOString(),
  };
}

async function seedOutcome(
  driftId: string,
  factors: Partial<DriftFactorSnapshot>,
  outcome: DriftOutcome,
): Promise<void> {
  await storeDriftEvent(PROJECT_PATH, makeEvent(driftId, factors));
  await recordDriftOutcome(PROJECT_PATH, driftId, outcome);
}

function sumWeights(weights: typeof DEFAULT_WEIGHTS): number {
  return FACTOR_KEYS.reduce((sum, k) => sum + weights[k], 0);
}

describe("DriftDetector.getCalibratedWeights() — Issue #114 calibration formula", () => {
  let storageRoot: string;
  let detector: DriftDetector;
  let originalStorageDir: string | undefined;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), "drift-feedback-calibration-"));
    originalStorageDir = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = join(storageRoot, ".documcp", "memory");
    await fs.mkdir(process.env.DOCUMCP_STORAGE_DIR, { recursive: true });
    resetKnowledgeGraph();

    detector = new DriftDetector(storageRoot);
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

  test("returns DEFAULT_WEIGHTS when there is no history at all", async () => {
    const weights = await detector.getCalibratedWeights(PROJECT_PATH);
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test("returns DEFAULT_WEIGHTS when fewer than 3 actionable+noise outcomes are recorded", async () => {
    await seedOutcome("d1", { usageFrequency: 90 }, "actionable");
    await seedOutcome("d2", { usageFrequency: 90 }, "actionable");
    // Only 2 actionable so far — below MIN_EVIDENCE_FOR_CALIBRATION (3).
    const weights = await detector.getCalibratedWeights(PROJECT_PATH);
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test("treats 'deferred' outcomes as zero-signal — they don't count toward evidence", async () => {
    await seedOutcome("d1", { usageFrequency: 90 }, "deferred");
    await seedOutcome("d2", { usageFrequency: 90 }, "deferred");
    await seedOutcome("d3", { usageFrequency: 90 }, "deferred");
    await seedOutcome("d4", { usageFrequency: 90 }, "deferred");
    // 4 deferred outcomes still produce zero evidence → DEFAULT_WEIGHTS.
    const weights = await detector.getCalibratedWeights(PROJECT_PATH);
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test("boosts a factor's weight when high scores correlate with actionable outcomes", async () => {
    // 3 actionable drifts, each with usageFrequency = 100 (max signal "this
    // factor mattered") and other factors at neutral 50.
    await seedOutcome("d1", { usageFrequency: 100 }, "actionable");
    await seedOutcome("d2", { usageFrequency: 100 }, "actionable");
    await seedOutcome("d3", { usageFrequency: 100 }, "actionable");

    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    // usageFrequency raw boost = +1 * 0.5 = +0.5 → 0.25 * 1.5 = 0.375 BEFORE
    // renormalization. Other factors get raw = DEFAULT (no movement). Then
    // everything renormalizes back to sum = 1.0, so usageFrequency comes out
    // > its 0.25 baseline.
    expect(weights.usageFrequency).toBeGreaterThan(DEFAULT_WEIGHTS.usageFrequency);
    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
  });

  test("suppresses a factor's weight when high scores correlate with noise", async () => {
    await seedOutcome("d1", { staleness: 100 }, "noise");
    await seedOutcome("d2", { staleness: 100 }, "noise");
    await seedOutcome("d3", { staleness: 100 }, "noise");

    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    expect(weights.staleness).toBeLessThan(DEFAULT_WEIGHTS.staleness);
    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
  });

  test("hits the cap-bounded minimum on a streak of noise (cap dominates the floor)", async () => {
    // 8 noise outcomes, all with staleness = 100. The MAX_CALIBRATION_ADJUSTMENT
    // cap (0.5) bounds the per-factor reduction at DEFAULT * 0.5, which is
    // already above the 25% floor (DEFAULT * 0.25). So with current
    // constants the cap dominates and the floor is effectively defence in
    // depth — staying as a guard for future tuning.
    for (let i = 0; i < 8; i++) {
      await seedOutcome(`cap-${i}`, { staleness: 100 }, "noise");
    }
    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    const cappedRawStaleness =
      DEFAULT_WEIGHTS.staleness * (1 - DriftDetector_MAX_ADJUSTMENT);
    // Other factors had neutral scores (50), so their raw values are
    // unchanged from defaults.
    const otherRawSum = FACTOR_KEYS.filter((k) => k !== "staleness").reduce(
      (sum, k) => sum + DEFAULT_WEIGHTS[k],
      0,
    );
    const expectedTotal = otherRawSum + cappedRawStaleness;

    expect(weights.staleness).toBeCloseTo(
      cappedRawStaleness / expectedTotal,
      5,
    );
    // Defence-in-depth: even if the cap loosens later, the floor must still
    // hold. Pre-renormalization invariant: raw_i >= DEFAULT_i * 0.25.
    expect(weights.staleness).toBeGreaterThanOrEqual(
      (DEFAULT_WEIGHTS.staleness * DriftDetector_MIN_FACTOR_FLOOR_RATIO) /
        (otherRawSum + DEFAULT_WEIGHTS.staleness * 1.5),
    );
    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
  });

  test("renormalizes the calibrated weight vector to sum to 1.0", async () => {
    // Mixed signal across factors.
    await seedOutcome(
      "d1",
      { codeComplexity: 100, staleness: 0 },
      "actionable",
    );
    await seedOutcome(
      "d2",
      { usageFrequency: 100, documentationCoverage: 0 },
      "actionable",
    );
    await seedOutcome(
      "d3",
      { changeMagnitude: 0, userFeedback: 100 },
      "noise",
    );

    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
    for (const k of FACTOR_KEYS) {
      expect(weights[k]).toBeGreaterThan(0); // No factor extinct.
      expect(weights[k]).toBeLessThan(1); // No factor monopolized everything.
    }
  });

  test("ignores 'deferred' outcomes when computing the actionable+noise evidence count", async () => {
    // Only 2 actionable + 1 noise = 3 evidence entries (passes threshold).
    // Deferred entries are ignored even though there are many of them.
    await seedOutcome("a1", { codeComplexity: 80 }, "actionable");
    await seedOutcome("a2", { codeComplexity: 80 }, "actionable");
    await seedOutcome("n1", { codeComplexity: 80 }, "noise");
    await seedOutcome("def-1", { codeComplexity: 100 }, "deferred");
    await seedOutcome("def-2", { codeComplexity: 100 }, "deferred");
    await seedOutcome("def-3", { codeComplexity: 100 }, "deferred");

    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    // Expect SOME calibration to have happened (we crossed the 3-evidence
    // threshold via 2 actionable + 1 noise). Deferred outcomes wouldn't have
    // moved any weight on their own.
    expect(weights).not.toEqual(DEFAULT_WEIGHTS);
    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
  });

  test("weight movement is symmetric: equal actionable/noise on the same factor cancels out", async () => {
    // Same factor scored at 100, half outcomes 'actionable', half 'noise'.
    await seedOutcome("a1", { staleness: 100 }, "actionable");
    await seedOutcome("a2", { staleness: 100 }, "actionable");
    await seedOutcome("n1", { staleness: 100 }, "noise");
    await seedOutcome("n2", { staleness: 100 }, "noise");

    const weights = await detector.getCalibratedWeights(PROJECT_PATH);

    // avg_credit for staleness = (1+1-1-1)/4 = 0 → boost = 0 → raw = default.
    // After renormalization the vector is identical to defaults.
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test("boost magnitude respects MAX_CALIBRATION_ADJUSTMENT (no factor moves more than ±50% of its default)", async () => {
    // Maximum possible boost for codeComplexity: 5 actionable outcomes all
    // at score 100 → avg_credit = 1.0 → boost = 0.5 → raw = default * 1.5.
    // After renormalization the absolute weight may be even higher, but the
    // RAW cap on movement is what we're checking here — verify by reading
    // the raw contribution implicitly: the calibrated value should not
    // exceed default * 1.5 / sum(min-other-floors-and-this-cap).
    for (let i = 0; i < 5; i++) {
      await seedOutcome(`boost-${i}`, { codeComplexity: 100 }, "actionable");
    }
    const weights = await detector.getCalibratedWeights(PROJECT_PATH);
    // After renormalization, maximum codeComplexity would be:
    //   raw_cc = 0.2 * 1.5 = 0.3
    //   raw_others = sum of unaffected defaults = 0.8
    //   total = 1.1
    //   calibrated_cc = 0.3 / 1.1 ≈ 0.2727
    expect(weights.codeComplexity).toBeCloseTo(0.3 / 1.1, 5);
    expect(weights.codeComplexity).toBeLessThan(0.3); // Strict cap pre-renorm.
    expect(sumWeights(weights)).toBeCloseTo(1.0, 5);
  });
});

// Re-expose the calibration constants as test-local mirrors so the formula
// assertions stay readable. We keep the production constants private; these
// mirrors are wired by hand and asserted against the values documented in
// ADR-012 Phase 4.
const DriftDetector_MIN_FACTOR_FLOOR_RATIO = 0.25;
const DriftDetector_MAX_ADJUSTMENT = 0.5;
