/**
 * Performance benchmark for multi-language AST parsing (Issue #112, ADR-015).
 *
 * Acceptance criterion: parsing a 500-file polyglot repo completes in < 30s
 * on CI. We generate the polyglot tree synthetically — repeated copies of
 * representative Python / Go / TypeScript snippets across 500 files split
 * roughly evenly across languages — then run the full analyzer and time
 * the wall-clock end-to-end.
 *
 * The 30s budget is *generous* on purpose: GitHub Actions's `ubuntu-latest`
 * runners are notoriously variable and we'd rather under-fit the bound than
 * file flaky perf alarms. Locally this benchmark typically completes in
 * 1-3 seconds.
 */

import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

import { ASTAnalyzer } from "../../src/utils/ast-analyzer.js";

const FILE_COUNT = 500;
const PERF_BUDGET_MS = 30_000; // ADR-015 / issue #112 acceptance criterion

const PY_TEMPLATE = (i: number) => `"""Generated module ${i}."""

import os
from typing import List

CONST_${i} = ${i}


def fn_${i}(x: int, y: int = ${i}) -> int:
    """Add two numbers."""
    if x > y:
        return x
    return y


async def afn_${i}(values: List[int]) -> int:
    return sum(values) + ${i}


class Widget${i}:
    """Widget number ${i}."""

    legs: int = ${i}

    def __init__(self, name: str) -> None:
        self.name = name

    def emit(self) -> str:
        return self.name + "_${i}"
`;

const GO_TEMPLATE = (i: number) => `package gen${i}

import "fmt"

type Widget${i} struct {
\tID   int
\tName string
}

func (w *Widget${i}) Emit() string {
\treturn fmt.Sprintf("widget-%d-%s", w.ID, w.Name)
}

func New${i}(name string) *Widget${i} {
\treturn &Widget${i}{ID: ${i}, Name: name}
}

func helper${i}(x int) int {
\tif x > ${i} {
\t\treturn x
\t}
\treturn ${i}
}
`;

const TS_TEMPLATE = (i: number) => `// Generated module ${i}
import { promises as fs } from 'fs';

export interface Widget${i} {
  id: number;
  name: string;
}

export class WidgetService${i} {
  constructor(private readonly base: number) {}
  emit(name: string): Widget${i} {
    return { id: this.base + ${i}, name };
  }
}

export async function load${i}(path: string): Promise<string> {
  const buf = await fs.readFile(path, 'utf-8');
  return buf + '/${i}';
}
`;

describe("multi-language parsing benchmark", () => {
  let tempDir: string;
  let analyzer: ASTAnalyzer;

  beforeAll(async () => {
    analyzer = new ASTAnalyzer();
    await analyzer.initialize();
    tempDir = await mkdtemp(join(tmpdir(), "ml-bench-"));

    // Pre-create the 500 files. We split roughly evenly across languages so
    // every parser pays its first-load cost and steady-state throughput is
    // the dominant component of the timing.
    const promises: Array<Promise<void>> = [];
    for (let i = 0; i < FILE_COUNT; i++) {
      const lang = i % 3;
      let filename: string;
      let content: string;
      if (lang === 0) {
        filename = `file_${i}.py`;
        content = PY_TEMPLATE(i);
      } else if (lang === 1) {
        filename = `file_${i}.go`;
        content = GO_TEMPLATE(i);
      } else {
        filename = `file_${i}.ts`;
        content = TS_TEMPLATE(i);
      }
      promises.push(fs.writeFile(join(tempDir, filename), content, "utf-8"));
    }
    await Promise.all(promises);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test(
    `analyzes ${FILE_COUNT}-file polyglot repo in under ${
      PERF_BUDGET_MS / 1000
    }s`,
    async () => {
      const dirents = await fs.readdir(tempDir);
      expect(dirents).toHaveLength(FILE_COUNT);

      const start = process.hrtime.bigint();
      let analyzed = 0;
      let pythonHits = 0;
      let goHits = 0;
      let tsHits = 0;
      let totalFunctions = 0;

      // Sequential analysis is the conservative case; production code is
      // free to parallelize via Promise.all but the sequential bound is
      // what users actually hit when they run drift over a fresh repo.
      for (const file of dirents) {
        const result = await analyzer.analyzeFile(join(tempDir, file));
        if (!result) continue;
        analyzed++;
        totalFunctions += result.functions.length;
        if (result.language === "python") pythonHits++;
        else if (result.language === "go") goHits++;
        else if (result.language === "typescript") tsHits++;
      }

      const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;

      // Stash diagnostic info on the test object — Jest will log it on
      // failure so we can tell *why* the budget was blown when CI is mad.
      // eslint-disable-next-line no-console
      console.log(
        `[bench] analyzed ${analyzed}/${FILE_COUNT} files in ${elapsedMs.toFixed(
          1,
        )}ms (py=${pythonHits} go=${goHits} ts=${tsHits} funcs=${totalFunctions})`,
      );

      expect(analyzed).toBe(FILE_COUNT);
      expect(pythonHits).toBeGreaterThan(0);
      expect(goHits).toBeGreaterThan(0);
      expect(tsHits).toBeGreaterThan(0);
      expect(totalFunctions).toBeGreaterThan(FILE_COUNT); // every file has 2+ funcs
      expect(elapsedMs).toBeLessThan(PERF_BUDGET_MS);
    },
    PERF_BUDGET_MS + 30_000, // jest test timeout = budget + slack
  );
});
