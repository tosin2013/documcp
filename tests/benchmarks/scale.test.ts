import {
  buildMarkdownSummary,
  computePercentiles,
  evaluateRegressions,
  type BenchmarkThresholds,
  type FixtureBenchmarkResult,
  type ScaleBenchmarkReport,
} from "../../src/benchmarks/scale";

describe("Scale benchmark utilities", () => {
  it("computes p50/p95/p99 percentiles", () => {
    const percentiles = computePercentiles([5, 15, 25, 35, 45]);

    expect(percentiles.p50).toBe(25);
    expect(percentiles.p95).toBe(45);
    expect(percentiles.p99).toBe(45);
  });

  it("detects regressions above threshold", () => {
    const fixtures: FixtureBenchmarkResult[] = [
      {
        fixtureSize: 100,
        operations: {
          analyze_repository: {
            samples: [120],
            percentiles: { p50: 120, p95: 120, p99: 120 },
          },
          detect_drift: {
            samples: [50],
            percentiles: { p50: 50, p95: 50, p99: 50 },
          },
          setup_structure: {
            samples: [20],
            percentiles: { p50: 20, p95: 20, p99: 20 },
          },
        },
      },
    ];

    const thresholds: BenchmarkThresholds = {
      maxRegressionPercent: 10,
      baselinesMs: {
        analyze_repository: { "100": 100 },
        detect_drift: { "100": 50 },
        setup_structure: { "100": 20 },
      },
    };

    const regressions = evaluateRegressions(fixtures, thresholds);
    expect(regressions).toHaveLength(1);
    expect(regressions[0].operation).toBe("analyze_repository");
  });

  it("builds markdown summary with benchmark marker", () => {
    const report: ScaleBenchmarkReport = {
      generatedAt: new Date().toISOString(),
      fixtures: [
        {
          fixtureSize: 100,
          operations: {
            analyze_repository: {
              samples: [100],
              percentiles: { p50: 100, p95: 100, p99: 100 },
            },
            detect_drift: {
              samples: [10],
              percentiles: { p50: 10, p95: 10, p99: 10 },
            },
            setup_structure: {
              samples: [5],
              percentiles: { p50: 5, p95: 5, p99: 5 },
            },
          },
        },
      ],
      thresholds: {
        maxRegressionPercent: 10,
        baselinesMs: {
          analyze_repository: { "100": 100 },
          detect_drift: { "100": 10 },
          setup_structure: { "100": 5 },
        },
      },
      regressions: [],
      passed: true,
    };

    const markdown = buildMarkdownSummary(report);
    expect(markdown).toContain("<!-- documcp-benchmark-summary -->");
    expect(markdown).toContain("| Fixture | Operation | p50 (ms) |");
    expect(markdown).toContain("Overall result: ✅ PASS");
  });
});
