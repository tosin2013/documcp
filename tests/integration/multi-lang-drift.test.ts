/**
 * Integration test: drift detector identifies breaking changes in multi-language
 * source files (Issue #112, ADR-015 acceptance criterion #3).
 *
 * The unit tests in `tests/utils/ast-analyzer.test.ts` cover the extractors in
 * isolation; this file verifies the end-to-end pipe: each fixture is analyzed
 * once at its baseline state, then mutated in place to a "next version", then
 * re-analyzed, and the drift comparison surfaces the expected breaking
 * changes.
 *
 * We deliberately exercise *removed* and *modified* exported symbols —
 * removing an exported entity is always `breaking`, modifying its signature
 * (changed return type, added required parameter) is `major` per the existing
 * impact-level rules in `ASTAnalyzer.detectFunctionChanges`.
 */

import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

import {
  ASTAnalyzer,
  ASTAnalysisResult,
  CodeDiff,
} from "../../src/utils/ast-analyzer.js";

const PYTHON_BASELINE = `"""Module under drift test."""

def public_api(name: str) -> str:
    """Public API entry point."""
    return f"hi {name}"


def helper_to_be_removed(x: int) -> int:
    return x * 2


class DataLoader:
    """Loads data from disk."""

    def load(self, path: str) -> bytes:
        return b""

    def save(self, path: str, data: bytes) -> None:
        return None
`;

const PYTHON_MODIFIED = `"""Module under drift test."""

def public_api(name: str, *, polite: bool = True) -> bytes:
    """Public API entry point with new return type."""
    return b"hi"


# helper_to_be_removed is gone


class DataLoader:
    """Loads data from disk."""

    def load(self, path: str) -> bytes:
        return b""
    # save method removed
`;

const GO_BASELINE = `package sample

func PublicAPI(name string) string {
\treturn "hi " + name
}

func helperToBeRemoved(x int) int {
\treturn x * 2
}

type DataLoader struct {
\tPath string
}

func (d *DataLoader) Load() ([]byte, error) {
\treturn nil, nil
}

func (d *DataLoader) Save(data []byte) error {
\treturn nil
}
`;

const GO_MODIFIED = `package sample

func PublicAPI(name string, polite bool) ([]byte, error) {
\treturn nil, nil
}

// helperToBeRemoved is gone

type DataLoader struct {
\tPath string
}

func (d *DataLoader) Load() ([]byte, error) {
\treturn nil, nil
}
// Save method has been removed in this version
`;

describe("multi-language drift detection", () => {
  let analyzer: ASTAnalyzer;
  let tempDir: string;

  beforeAll(async () => {
    analyzer = new ASTAnalyzer();
    await analyzer.initialize();
    tempDir = await mkdtemp(join(tmpdir(), "multi-lang-drift-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("detects breaking + signature changes in Python", async () => {
    const filePath = join(tempDir, "service.py");
    await fs.writeFile(filePath, PYTHON_BASELINE, "utf-8");
    const before = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;

    await fs.writeFile(filePath, PYTHON_MODIFIED, "utf-8");
    const after = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;

    const diffs: CodeDiff[] = await analyzer.detectDrift(before, after);

    // helper_to_be_removed has no leading underscore, so the analyzer treats
    // it as exported per the Python convention; its removal is therefore
    // recorded as a breaking change at the function-comparison layer.
    const removedFn = diffs.find(
      (d) =>
        d.category === "function" &&
        d.type === "removed" &&
        d.name === "helper_to_be_removed",
    );
    expect(removedFn).toBeDefined();
    expect(removedFn?.impactLevel).toBe("breaking");

    // public_api gained a kw-only parameter and changed return type — both
    // are at least `major` per detectFunctionChanges, and an added required
    // parameter actually escalates to breaking.
    const modifiedPublic = diffs.find(
      (d) =>
        d.category === "function" &&
        d.type === "modified" &&
        d.name === "public_api",
    );
    expect(modifiedPublic).toBeDefined();
    expect(["breaking", "major"]).toContain(modifiedPublic?.impactLevel);

    // NOTE: removing `save` from class DataLoader currently does not surface
    // as a diff because the existing drift detector's class comparator
    // doesn't compare nested method sets, and Python class methods are
    // intentionally NOT promoted to the top-level functions list (Python
    // semantics treat them as bound to their class). Tracked as follow-up
    // work — out of scope for issue #112 which is about extraction
    // coverage, not class-comparator depth.
  });

  test("detects breaking + signature changes in Go", async () => {
    const filePath = join(tempDir, "service.go");
    await fs.writeFile(filePath, GO_BASELINE, "utf-8");
    const before = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;

    await fs.writeFile(filePath, GO_MODIFIED, "utf-8");
    const after = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;

    const diffs: CodeDiff[] = await analyzer.detectDrift(before, after);

    // Unexported helperToBeRemoved (lowercase) is recorded as removed but at
    // a non-breaking impact (`minor`) because it's package-private.
    const removedHelper = diffs.find(
      (d) =>
        d.category === "function" &&
        d.type === "removed" &&
        d.name === "helperToBeRemoved",
    );
    expect(removedHelper).toBeDefined();
    expect(removedHelper?.impactLevel).toBe("minor");

    // Exported PublicAPI changed: return type string → ([]byte, error) and a
    // new `polite bool` parameter was added. Adding a required parameter
    // counts as breaking.
    const modifiedPublic = diffs.find(
      (d) =>
        d.category === "function" &&
        d.type === "modified" &&
        d.name === "PublicAPI",
    );
    expect(modifiedPublic).toBeDefined();
    expect(["breaking", "major"]).toContain(modifiedPublic?.impactLevel);

    // Save method on DataLoader: in Go the extractor pushes methods into the
    // top-level functions list (as well as attaching to the receiver struct),
    // so its removal *does* surface here as a function removal — and because
    // Save is exported it's classified as breaking. This is a deliberate
    // contrast with Python: see note in the Python test above.
    const removedMethod = diffs.find(
      (d) =>
        d.category === "function" &&
        d.type === "removed" &&
        d.name === "Save",
    );
    expect(removedMethod).toBeDefined();
    expect(removedMethod?.impactLevel).toBe("breaking");
  });

  test("does not flag a no-op change as drift", async () => {
    const filePath = join(tempDir, "stable.py");
    await fs.writeFile(filePath, PYTHON_BASELINE, "utf-8");
    const before = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;
    // Re-write identical content — content hash differs only if mtime
    // changes, but signatures should be identical.
    await fs.writeFile(filePath, PYTHON_BASELINE, "utf-8");
    const after = (await analyzer.analyzeFile(
      filePath,
    )) as ASTAnalysisResult;

    const diffs = await analyzer.detectDrift(before, after);
    expect(diffs).toEqual([]);
  });
});
