import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { analyzeRepository } from "../tools/analyze-repository.js";
import { setupStructure } from "../tools/setup-structure.js";
import {
  DriftDetector,
  type DriftSnapshot,
} from "../utils/drift-detector.js";
import type {
  ASTAnalysisResult,
  FunctionSignature,
} from "../utils/ast-analyzer.js";

export const FIXTURE_SIZES = [100, 1000, 5000] as const;
export type FixtureSize = (typeof FIXTURE_SIZES)[number];
export type BenchmarkOperation =
  | "analyze_repository"
  | "detect_drift"
  | "setup_structure";

export interface BenchmarkThresholds {
  maxRegressionPercent: number;
  baselinesMs: Record<BenchmarkOperation, Partial<Record<FixtureSize, number>>>;
}

export interface Percentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface OperationBenchmarkResult {
  samples: number[];
  percentiles: Percentiles;
}

export interface FixtureBenchmarkResult {
  fixtureSize: FixtureSize;
  operations: Record<BenchmarkOperation, OperationBenchmarkResult>;
}

export interface RegressionResult {
  fixtureSize: FixtureSize;
  operation: BenchmarkOperation;
  actualP50: number;
  baselineP50: number;
  deltaPercent: number;
}

export interface ScaleBenchmarkReport {
  generatedAt: string;
  fixtures: FixtureBenchmarkResult[];
  thresholds: BenchmarkThresholds;
  regressions: RegressionResult[];
  passed: boolean;
}

const LANGUAGE_TEMPLATES: Array<{ ext: string; content: (i: number) => string }> =
  [
    {
      ext: ".ts",
      content: (i) =>
        `export function fn${i}(value: number): number { return value + ${i}; }\n`,
    },
    {
      ext: ".py",
      content: (i) => `def fn_${i}(value: int) -> int:\n    return value + ${i}\n`,
    },
    {
      ext: ".go",
      content: (i) =>
        `package generated\n\nfunc Fn${i}(value int) int { return value + ${i} }\n`,
    },
    {
      ext: ".rb",
      content: (i) => `def fn_${i}(value)\n  value + ${i}\nend\n`,
    },
    {
      ext: ".java",
      content: (i) =>
        `class Generated${i} { int fn(int value) { return value + ${i}; } }\n`,
    },
  ];

const SAMPLE_COUNTS: Record<FixtureSize, number> = {
  100: 5,
  1000: 3,
  5000: 1,
};

export function computePercentiles(values: number[]): Percentiles {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number): number => {
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
    );
    return sorted[index];
  };

  return {
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
  };
}

export function evaluateRegressions(
  fixtures: FixtureBenchmarkResult[],
  thresholds: BenchmarkThresholds,
): RegressionResult[] {
  const regressions: RegressionResult[] = [];

  for (const fixture of fixtures) {
    for (const [operation, result] of Object.entries(fixture.operations) as Array<
      [BenchmarkOperation, OperationBenchmarkResult]
    >) {
      const baseline = thresholds.baselinesMs[operation][fixture.fixtureSize];
      if (typeof baseline !== "number" || baseline <= 0) continue;

      const deltaPercent = ((result.percentiles.p50 - baseline) / baseline) * 100;
      if (deltaPercent > thresholds.maxRegressionPercent) {
        regressions.push({
          fixtureSize: fixture.fixtureSize,
          operation,
          actualP50: result.percentiles.p50,
          baselineP50: baseline,
          deltaPercent,
        });
      }
    }
  }

  return regressions;
}

export function buildMarkdownSummary(report: ScaleBenchmarkReport): string {
  const rows = report.fixtures
    .flatMap((fixture) =>
      (Object.entries(fixture.operations) as Array<
        [BenchmarkOperation, OperationBenchmarkResult]
      >).map(([operation, result]) => {
        const baseline =
          report.thresholds.baselinesMs[operation][fixture.fixtureSize] ?? 0;
        const deltaPercent =
          baseline > 0 ? ((result.percentiles.p50 - baseline) / baseline) * 100 : 0;
        const status =
          deltaPercent > report.thresholds.maxRegressionPercent
            ? "❌ Regression"
            : "✅ OK";
        return `| ${fixture.fixtureSize} | ${operation} | ${result.percentiles.p50.toFixed(1)} | ${result.percentiles.p95.toFixed(1)} | ${result.percentiles.p99.toFixed(1)} | ${baseline.toFixed(1)} | ${deltaPercent.toFixed(1)}% | ${status} |`;
      }),
    )
    .join("\n");

  const regressionSection =
    report.regressions.length === 0
      ? "✅ No regressions above threshold."
      : report.regressions
          .map(
            (item) =>
              `- ❌ \`${item.operation}\` on ${item.fixtureSize} files is ${item.deltaPercent.toFixed(
                1,
              )}% slower (baseline ${item.baselineP50.toFixed(
                1,
              )}ms → current ${item.actualP50.toFixed(1)}ms)`,
          )
          .join("\n");

  return [
    "<!-- documcp-benchmark-summary -->",
    "## Performance Benchmark Summary",
    "",
    `Regression threshold: **${report.thresholds.maxRegressionPercent}%**`,
    "",
    "| Fixture | Operation | p50 (ms) | p95 (ms) | p99 (ms) | Baseline p50 (ms) | Delta | Status |",
    "| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    rows,
    "",
    "### Regression Check",
    regressionSection,
    "",
    `Overall result: ${report.passed ? "✅ PASS" : "❌ FAIL"}`,
  ].join("\n");
}

async function synthesizePolyglotRepo(
  rootDir: string,
  fixtureSize: FixtureSize,
): Promise<string> {
  const repoPath = path.join(rootDir, `fixture-${fixtureSize}`);
  await fs.mkdir(repoPath, { recursive: true });

  const writePromises: Array<Promise<void>> = [];
  for (let i = 0; i < fixtureSize; i++) {
    const language = LANGUAGE_TEMPLATES[i % LANGUAGE_TEMPLATES.length];
    const dirPath = path.join(repoPath, "src", `group-${Math.floor(i / 100)}`);
    const filePath = path.join(dirPath, `file-${i}${language.ext}`);
    const task = fs
      .mkdir(dirPath, { recursive: true })
      .then(() => fs.writeFile(filePath, language.content(i), "utf-8"));
    writePromises.push(task);
  }

  await Promise.all(writePromises);
  return repoPath;
}

function createFunctionSignature(name: string): FunctionSignature {
  return {
    name,
    parameters: [],
    returnType: "number",
    isAsync: false,
    isExported: true,
    isPublic: true,
    docComment: null,
    startLine: 1,
    endLine: 1,
    complexity: 1,
    dependencies: [],
  };
}

function createASTResult(
  filePath: string,
  language: string,
  version: "old" | "new",
): ASTAnalysisResult {
  return {
    filePath,
    language,
    functions: [createFunctionSignature(version === "old" ? "handler" : "handlerV2")],
    classes: [],
    interfaces: [],
    types: [],
    imports: [],
    exports: [version === "old" ? "handler" : "handlerV2"],
    contentHash: `${version}-${filePath}`,
    lastModified: new Date().toISOString(),
    linesOfCode: 4,
    complexity: 1,
  };
}

function buildDriftSnapshots(
  repoPath: string,
  fixtureSize: FixtureSize,
): { oldSnapshot: DriftSnapshot; newSnapshot: DriftSnapshot } {
  const oldFiles = new Map<string, ASTAnalysisResult>();
  const newFiles = new Map<string, ASTAnalysisResult>();
  const docs = new Map();
  const timestamp = new Date().toISOString();

  for (let i = 0; i < fixtureSize; i++) {
    const filePath = path.join(
      repoPath,
      "src",
      `group-${Math.floor(i / 100)}`,
      `drift-${i}.ts`,
    );
    const language = i % 2 === 0 ? "typescript" : "python";
    oldFiles.set(filePath, createASTResult(filePath, language, "old"));
    newFiles.set(filePath, createASTResult(filePath, language, "new"));
  }

  return {
    oldSnapshot: {
      projectPath: repoPath,
      timestamp,
      files: oldFiles,
      documentation: docs,
    },
    newSnapshot: {
      projectPath: repoPath,
      timestamp,
      files: newFiles,
      documentation: docs,
    },
  };
}

async function timeOperation(action: () => Promise<unknown>): Promise<number> {
  const start = process.hrtime.bigint();
  await action();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000;
}

export async function runScaleBenchmarks(
  thresholdsPath: string,
  outputDir: string,
  options?: { fixtureRootDir?: string },
): Promise<ScaleBenchmarkReport> {
  const rootDir = options?.fixtureRootDir
    ? await fs.mkdtemp(path.join(options.fixtureRootDir, "documcp-scale-bench-"))
    : await fs.mkdtemp(path.join(os.tmpdir(), "documcp-scale-bench-"));
  const thresholds = JSON.parse(
    await fs.readFile(thresholdsPath, "utf-8"),
  ) as BenchmarkThresholds;
  const fixtures: FixtureBenchmarkResult[] = [];

  try {
    for (const fixtureSize of FIXTURE_SIZES) {
      const fixturePath = await synthesizePolyglotRepo(rootDir, fixtureSize);
      const samplesToCollect = SAMPLE_COUNTS[fixtureSize];
      const analyzeSamples: number[] = [];
      const driftSamples: number[] = [];
      const setupSamples: number[] = [];

      const detector = new DriftDetector(fixturePath);
      await detector.initialize();
      const snapshots = buildDriftSnapshots(fixturePath, fixtureSize);

      for (let sample = 0; sample < samplesToCollect; sample++) {
        analyzeSamples.push(
          await timeOperation(async () => {
            await analyzeRepository({ path: fixturePath, depth: "quick" });
          }),
        );

        driftSamples.push(
          await timeOperation(async () => {
            await detector.detectDrift(snapshots.oldSnapshot, snapshots.newSnapshot);
          }),
        );

        const docsPath = path.join(fixturePath, `docs-bench-${sample}`);
        setupSamples.push(
          await timeOperation(async () => {
            await setupStructure({
              path: docsPath,
              ssg: "docusaurus",
              includeExamples: false,
            });
          }),
        );
      }

      fixtures.push({
        fixtureSize,
        operations: {
          analyze_repository: {
            samples: analyzeSamples,
            percentiles: computePercentiles(analyzeSamples),
          },
          detect_drift: {
            samples: driftSamples,
            percentiles: computePercentiles(driftSamples),
          },
          setup_structure: {
            samples: setupSamples,
            percentiles: computePercentiles(setupSamples),
          },
        },
      });
    }
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }

  const regressions = evaluateRegressions(fixtures, thresholds);
  const report: ScaleBenchmarkReport = {
    generatedAt: new Date().toISOString(),
    fixtures,
    thresholds,
    regressions,
    passed: regressions.length === 0,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "results.json"),
    JSON.stringify(report, null, 2),
    "utf-8",
  );
  await fs.writeFile(
    path.join(outputDir, "summary.md"),
    buildMarkdownSummary(report),
    "utf-8",
  );

  return report;
}
