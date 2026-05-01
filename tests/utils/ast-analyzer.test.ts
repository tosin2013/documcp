/**
 * AST Analyzer Tests (Phase 3)
 */

import {
  ASTAnalyzer,
  FunctionSignature,
  ClassInfo,
} from "../../src/utils/ast-analyzer.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("ASTAnalyzer", () => {
  let analyzer: ASTAnalyzer;
  let tempDir: string;

  beforeAll(async () => {
    analyzer = new ASTAnalyzer();
    await analyzer.initialize();
    tempDir = await mkdtemp(join(tmpdir(), "ast-test-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("TypeScript/JavaScript Analysis", () => {
    test("should extract function declarations", async () => {
      const code = `
export async function testFunction(param1: string, param2: number): Promise<void> {
  console.log(param1, param2);
}

export function syncFunction(name: string): string {
  return name.toUpperCase();
}
      `.trim();

      const filePath = join(tempDir, "test-functions.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(2);

      const asyncFunc = result?.functions.find(
        (f) => f.name === "testFunction",
      );
      expect(asyncFunc).toBeDefined();
      expect(asyncFunc?.isAsync).toBe(true);
      expect(asyncFunc?.isExported).toBe(true);
      expect(asyncFunc?.parameters).toHaveLength(2);
      expect(asyncFunc?.returnType).toBe("Promise");

      const syncFunc = result?.functions.find((f) => f.name === "syncFunction");
      expect(syncFunc).toBeDefined();
      expect(syncFunc?.isAsync).toBe(false);
      expect(syncFunc?.returnType).toBe("string");
    });

    test("should extract arrow function declarations", async () => {
      const code = `
export const arrowFunc = async (x: number, y: number): Promise<number> => {
  return x + y;
};

const privateFunc = (name: string) => {
  return name.toLowerCase();
};
      `.trim();

      const filePath = join(tempDir, "test-arrow.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(2);

      const exportedArrow = result?.functions.find(
        (f) => f.name === "arrowFunc",
      );
      expect(exportedArrow).toBeDefined();
      expect(exportedArrow?.isAsync).toBe(true);
      expect(exportedArrow?.parameters).toHaveLength(2);
    });

    test("should extract class information", async () => {
      const code = `
/**
 * Test class documentation
 */
export class TestClass extends BaseClass {
  private value: number;
  public readonly name: string;

  constructor(name: string) {
    super();
    this.name = name;
    this.value = 0;
  }

  /**
   * Public method
   */
  public async getValue(): Promise<number> {
    return this.value;
  }

  private setValue(val: number): void {
    this.value = val;
  }
}
      `.trim();

      const filePath = join(tempDir, "test-class.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.classes).toHaveLength(1);

      const testClass = result?.classes[0];
      expect(testClass?.name).toBe("TestClass");
      expect(testClass?.isExported).toBe(true);
      expect(testClass?.extends).toBe("BaseClass");
      expect(testClass?.properties).toHaveLength(2);
      expect(testClass?.methods.length).toBeGreaterThan(0);

      const publicMethod = testClass?.methods.find(
        (m) => m.name === "getValue",
      );
      expect(publicMethod).toBeDefined();
      expect(publicMethod?.isAsync).toBe(true);
      expect(publicMethod?.isPublic).toBe(true);
    });

    test("should extract interface information", async () => {
      const code = `
/**
 * User interface
 */
export interface User {
  id: string;
  name: string;
  age: number;
  readonly email: string;
  getProfile(): Promise<Profile>;
}

interface Profile {
  bio: string;
}
      `.trim();

      const filePath = join(tempDir, "test-interface.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.interfaces).toHaveLength(2);

      const userInterface = result?.interfaces.find((i) => i.name === "User");
      expect(userInterface).toBeDefined();
      expect(userInterface?.isExported).toBe(true);
      expect(userInterface?.properties).toHaveLength(4);
      expect(userInterface?.methods).toHaveLength(1);

      const emailProp = userInterface?.properties.find(
        (p) => p.name === "email",
      );
      expect(emailProp?.isReadonly).toBe(true);
    });

    test("should extract type aliases", async () => {
      const code = `
export type ID = string | number;
export type Status = "pending" | "active" | "inactive";
type PrivateType = { x: number; y: number };
      `.trim();

      const filePath = join(tempDir, "test-types.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.types).toHaveLength(3);

      const idType = result?.types.find((t) => t.name === "ID");
      expect(idType?.isExported).toBe(true);
    });

    test("should extract imports and exports", async () => {
      const code = `
import { func1, func2 } from "./module1";
import type { Type1 } from "./types";
import defaultExport from "./default";

export { func1, func2 };
export default class MyClass {}
      `.trim();

      const filePath = join(tempDir, "test-imports.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.imports.length).toBeGreaterThan(0);
      expect(result?.exports).toContain("func1");
      expect(result?.exports).toContain("func2");
    });

    test("should calculate complexity metrics", async () => {
      const code = `
export function complexFunction(x: number): number {
  if (x > 10) {
    for (let i = 0; i < x; i++) {
      if (i % 2 === 0) {
        try {
          return i;
        } catch (error) {
          continue;
        }
      }
    }
  } else {
    return 0;
  }
  return -1;
}
      `.trim();

      const filePath = join(tempDir, "test-complexity.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      const func = result?.functions[0];
      expect(func?.complexity).toBeGreaterThan(1);
    });

    test("should extract JSDoc comments", async () => {
      const code = `
/**
 * This function adds two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum
 */
export function add(a: number, b: number): number {
  return a + b;
}
      `.trim();

      const filePath = join(tempDir, "test-jsdoc.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      const func = result?.functions[0];
      expect(func?.docComment).toBeTruthy();
      expect(func?.docComment).toContain("adds two numbers");
    });
  });

  describe("Drift Detection", () => {
    test("should detect function signature changes", async () => {
      const oldCode = `
export function processData(data: string): void {
  console.log(data);
}
      `.trim();

      const newCode = `
export function processData(data: string, options: object): Promise<string> {
  console.log(data, options);
  return Promise.resolve("done");
}
      `.trim();

      const oldFile = join(tempDir, "old-file.ts");
      const newFile = join(tempDir, "new-file.ts");

      await fs.writeFile(oldFile, oldCode);
      await fs.writeFile(newFile, newCode);

      const oldAnalysis = await analyzer.analyzeFile(oldFile);
      const newAnalysis = await analyzer.analyzeFile(newFile);

      expect(oldAnalysis).not.toBeNull();
      expect(newAnalysis).not.toBeNull();

      const diffs = await analyzer.detectDrift(oldAnalysis!, newAnalysis!);

      expect(diffs.length).toBeGreaterThan(0);
      const funcDiff = diffs.find(
        (d) => d.category === "function" && d.name === "processData",
      );
      expect(funcDiff).toBeDefined();
      expect(funcDiff?.type).toBe("modified");
      expect(funcDiff?.impactLevel).toBe("breaking");
    });

    test("should detect removed functions", async () => {
      const oldCode = `
export function oldFunction(): void {}
export function keepFunction(): void {}
      `.trim();

      const newCode = `
export function keepFunction(): void {}
      `.trim();

      const oldFile = join(tempDir, "old-removed.ts");
      const newFile = join(tempDir, "new-removed.ts");

      await fs.writeFile(oldFile, oldCode);
      await fs.writeFile(newFile, newCode);

      const oldAnalysis = await analyzer.analyzeFile(oldFile);
      const newAnalysis = await analyzer.analyzeFile(newFile);

      const diffs = await analyzer.detectDrift(oldAnalysis!, newAnalysis!);

      const removedDiff = diffs.find((d) => d.name === "oldFunction");
      expect(removedDiff).toBeDefined();
      expect(removedDiff?.type).toBe("removed");
      expect(removedDiff?.impactLevel).toBe("breaking");
    });

    test("should detect added functions", async () => {
      const oldCode = `
export function existingFunction(): void {}
      `.trim();

      const newCode = `
export function existingFunction(): void {}
export function newFunction(): void {}
      `.trim();

      const oldFile = join(tempDir, "old-added.ts");
      const newFile = join(tempDir, "new-added.ts");

      await fs.writeFile(oldFile, oldCode);
      await fs.writeFile(newFile, newCode);

      const oldAnalysis = await analyzer.analyzeFile(oldFile);
      const newAnalysis = await analyzer.analyzeFile(newFile);

      const diffs = await analyzer.detectDrift(oldAnalysis!, newAnalysis!);

      const addedDiff = diffs.find((d) => d.name === "newFunction");
      expect(addedDiff).toBeDefined();
      expect(addedDiff?.type).toBe("added");
      expect(addedDiff?.impactLevel).toBe("patch");
    });

    test("should detect minor changes", async () => {
      const oldCode = `
function internalFunction(): void {}
      `.trim();

      const newCode = `
export function internalFunction(): void {}
      `.trim();

      const oldFile = join(tempDir, "old-minor.ts");
      const newFile = join(tempDir, "new-minor.ts");

      await fs.writeFile(oldFile, oldCode);
      await fs.writeFile(newFile, newCode);

      const oldAnalysis = await analyzer.analyzeFile(oldFile);
      const newAnalysis = await analyzer.analyzeFile(newFile);

      const diffs = await analyzer.detectDrift(oldAnalysis!, newAnalysis!);

      const minorDiff = diffs.find((d) => d.name === "internalFunction");
      expect(minorDiff).toBeDefined();
      expect(minorDiff?.type).toBe("modified");
      expect(minorDiff?.impactLevel).toBe("minor");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty files", async () => {
      const filePath = join(tempDir, "empty.ts");
      await fs.writeFile(filePath, "");

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(0);
      expect(result?.classes).toHaveLength(0);
    });

    test("should handle files with only comments", async () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
      `.trim();

      const filePath = join(tempDir, "comments-only.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.functions).toHaveLength(0);
    });

    test("should handle syntax errors gracefully", async () => {
      const code = `
export function broken(
  // Missing closing paren and body
      `.trim();

      const filePath = join(tempDir, "syntax-error.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      // Should still return a result, even if incomplete
      expect(result).not.toBeNull();
    });

    test("should return null for unsupported file types", async () => {
      const filePath = join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Some text content");

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeNull();
    });
  });

  describe("Content Hashing", () => {
    test("should generate consistent content hashes", async () => {
      const code = `export function test(): void {}`;

      const file1 = join(tempDir, "hash1.ts");
      const file2 = join(tempDir, "hash2.ts");

      await fs.writeFile(file1, code);
      await fs.writeFile(file2, code);

      const result1 = await analyzer.analyzeFile(file1);
      const result2 = await analyzer.analyzeFile(file2);

      expect(result1?.contentHash).toBe(result2?.contentHash);
    });

    test("should generate different hashes for different content", async () => {
      const code1 = `export function test1(): void {}`;
      const code2 = `export function test2(): void {}`;

      const file1 = join(tempDir, "diff1.ts");
      const file2 = join(tempDir, "diff2.ts");

      await fs.writeFile(file1, code1);
      await fs.writeFile(file2, code2);

      const result1 = await analyzer.analyzeFile(file1);
      const result2 = await analyzer.analyzeFile(file2);

      expect(result1?.contentHash).not.toBe(result2?.contentHash);
    });
  });

  describe("Multi-Language Support", () => {
    test("should handle Python files with tree-sitter", async () => {
      const pythonCode = `
def hello_world():
    print("Hello, World!")

class MyClass:
    def __init__(self):
        self.value = 42
      `.trim();

      const filePath = join(tempDir, "test.py");
      await fs.writeFile(filePath, pythonCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.language).toBe("python");
      expect(result?.filePath).toBe(filePath);
      expect(result?.linesOfCode).toBeGreaterThan(0);
    });

    test("should handle Go files with tree-sitter", async () => {
      const goCode = `
package main

func main() {
    println("Hello, World!")
}
      `.trim();

      const filePath = join(tempDir, "test.go");
      await fs.writeFile(filePath, goCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.language).toBe("go");
    });

    test("should handle Rust files with tree-sitter", async () => {
      const rustCode = `
fn main() {
    println!("Hello, World!");
}
      `.trim();

      const filePath = join(tempDir, "test.rs");
      await fs.writeFile(filePath, rustCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.language).toBe("rust");
    });
  });

  describe("Advanced TypeScript Features", () => {
    test("should extract default values from parameters", async () => {
      const code = `
export function withDefaults(
  name: string = "default",
  count: number = 42,
  flag: boolean = true
): void {
  console.log(name, count, flag);
}
      `.trim();

      const filePath = join(tempDir, "defaults.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      const func = result?.functions.find((f) => f.name === "withDefaults");
      expect(func).toBeDefined();
      expect(func?.parameters.length).toBe(3);

      const nameParam = func?.parameters.find((p) => p.name === "name");
      expect(nameParam?.defaultValue).toBeTruthy();
    });

    test("should detect private methods with underscore prefix", async () => {
      const code = `
export class TestClass {
  public publicMethod(): void {}

  private _privateMethod(): void {}

  #reallyPrivate(): void {}
}
      `.trim();

      const filePath = join(tempDir, "private-methods.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      const testClass = result?.classes[0];
      expect(testClass).toBeDefined();
      expect(testClass?.methods.length).toBeGreaterThanOrEqual(1);
    });

    test("should detect exported declarations correctly", async () => {
      const code = `
export function exportedFunc(): void {}

function nonExportedFunc(): void {}

export const exportedConst = () => {};

const nonExportedConst = () => {};
      `.trim();

      const filePath = join(tempDir, "exports.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();

      const exportedFunc = result?.functions.find(
        (f) => f.name === "exportedFunc",
      );
      expect(exportedFunc?.isExported).toBe(true);

      const exportedArrow = result?.functions.find(
        (f) => f.name === "exportedConst",
      );
      expect(exportedArrow?.isExported).toBe(true);
    });

    test("should handle files without initialization", async () => {
      const newAnalyzer = new ASTAnalyzer();
      // Don't call initialize() - should auto-initialize

      const code = `export function test(): void {}`;
      const filePath = join(tempDir, "auto-init.ts");
      await fs.writeFile(filePath, code);

      const result = await newAnalyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.functions.length).toBeGreaterThan(0);
    });
  });

  describe("Interface and Type Detection", () => {
    test("should detect interface vs type differences", async () => {
      const code = `
export interface UserInterface {
  id: string;
  name: string;
}

export type UserType = {
  id: string;
  name: string;
};

export type StatusType = "active" | "inactive";
      `.trim();

      const filePath = join(tempDir, "types-vs-interfaces.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      expect(result?.interfaces.length).toBe(1);
      expect(result?.types.length).toBe(2);

      const userInterface = result?.interfaces.find(
        (i) => i.name === "UserInterface",
      );
      expect(userInterface?.isExported).toBe(true);

      const statusType = result?.types.find((t) => t.name === "StatusType");
      expect(statusType?.isExported).toBe(true);
    });

    test("should handle interface methods", async () => {
      const code = `
export interface Repository {
  save(data: string): Promise<void>;
  load(): Promise<string>;
  delete(id: string): boolean;
}
      `.trim();

      const filePath = join(tempDir, "interface-methods.ts");
      await fs.writeFile(filePath, code);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).not.toBeNull();
      const repo = result?.interfaces.find((i) => i.name === "Repository");
      expect(repo?.methods.length).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // Multi-language analysis (Issue #112, ADR-015)
  //
  // Verifies that tree-sitter-python and tree-sitter-go are wired up via
  // web-tree-sitter and produce non-empty signature sets for the curated
  // fixtures in `tests/fixtures/multi-lang/`. We intentionally assert on
  // shape and a few high-signal members rather than freezing every detail
  // — grammar updates can renumber positions and we don't want false
  // positives on benign upstream changes.
  // -----------------------------------------------------------------------
  describe("Multi-Language Analysis (tree-sitter)", () => {
    const fixtureRoot = join(
      process.cwd(),
      "tests",
      "fixtures",
      "multi-lang",
    );

    describe("Python", () => {
      let result: Awaited<ReturnType<ASTAnalyzer["analyzeFile"]>>;

      beforeAll(async () => {
        result = await analyzer.analyzeFile(
          join(fixtureRoot, "python", "sample.py"),
        );
      });

      test("returns a non-null Python result", () => {
        expect(result).not.toBeNull();
        expect(result?.language).toBe("python");
        expect(result?.linesOfCode).toBeGreaterThan(10);
      });

      test("extracts top-level functions with type hints and async", () => {
        const greet = result?.functions.find((f) => f.name === "greet");
        expect(greet).toBeDefined();
        expect(greet?.isAsync).toBe(false);
        expect(greet?.isExported).toBe(true);
        expect(greet?.returnType).toBe("str");
        expect(greet?.parameters.map((p) => p.name)).toEqual([
          "name",
          "polite",
        ]);
        expect(greet?.parameters[0].type).toBe("str");
        expect(greet?.parameters[1].optional).toBe(true);

        const fetchUser = result?.functions.find(
          (f) => f.name === "fetch_user",
        );
        expect(fetchUser).toBeDefined();
        expect(fetchUser?.isAsync).toBe(true);
        expect(fetchUser?.isExported).toBe(true);
        // Optional[dict] is a generic alias; tree-sitter returns the verbatim text.
        expect(fetchUser?.returnType).toContain("Optional");

        const internal = result?.functions.find(
          (f) => f.name === "_internal_helper",
        );
        expect(internal).toBeDefined();
        expect(internal?.isExported).toBe(false);
      });

      test("extracts classes, inheritance, and method visibility", () => {
        const animal = result?.classes.find((c) => c.name === "Animal");
        expect(animal).toBeDefined();
        expect(animal?.extends).toBeNull();
        expect(animal?.methods.map((m) => m.name).sort()).toEqual(
          ["__init__", "_sniff", "speak"].sort(),
        );

        // Class-level annotated attribute is captured as a property.
        const legs = animal?.properties.find((p) => p.name === "legs");
        expect(legs).toBeDefined();
        expect(legs?.type).toBe("int");

        const speak = animal?.methods.find((m) => m.name === "speak");
        expect(speak?.isPublic).toBe(true);
        const sniff = animal?.methods.find((m) => m.name === "_sniff");
        expect(sniff?.isPublic).toBe(false);

        const dog = result?.classes.find((c) => c.name === "Dog");
        expect(dog?.extends).toBe("Animal");
        const fetch = dog?.methods.find((m) => m.name === "fetch");
        expect(fetch?.isAsync).toBe(true);
      });

      test("extracts imports including aliases and from-imports", () => {
        const sources = result?.imports.map((i) => i.source);
        expect(sources).toEqual(
          expect.arrayContaining(["os", "sys", "collections", "typing"]),
        );

        const sysImport = result?.imports.find((i) => i.source === "sys");
        expect(sysImport?.imports[0].alias).toBe("system");

        const fromTyping = result?.imports.find((i) => i.source === "typing");
        expect(fromTyping?.imports.map((i) => i.name).sort()).toEqual([
          "List",
          "Optional",
        ]);
      });

      test("populates exports for public top-level names", () => {
        expect(result?.exports).toEqual(
          expect.arrayContaining(["greet", "fetch_user", "Animal", "Dog"]),
        );
        expect(result?.exports).not.toContain("_internal_helper");
      });
    });

    describe("Go", () => {
      let result: Awaited<ReturnType<ASTAnalyzer["analyzeFile"]>>;

      beforeAll(async () => {
        result = await analyzer.analyzeFile(
          join(fixtureRoot, "go", "sample.go"),
        );
      });

      test("returns a non-null Go result", () => {
        expect(result).not.toBeNull();
        expect(result?.language).toBe("go");
        expect(result?.linesOfCode).toBeGreaterThan(10);
      });

      test("extracts top-level functions and unexported helpers", () => {
        const hello = result?.functions.find((f) => f.name === "Hello");
        expect(hello).toBeDefined();
        expect(hello?.isExported).toBe(true);
        expect(hello?.returnType).toBe("string");
        expect(hello?.parameters[0].name).toBe("name");
        expect(hello?.parameters[0].type).toBe("string");

        const helloMany = result?.functions.find(
          (f) => f.name === "helloMany",
        );
        expect(helloMany).toBeDefined();
        expect(helloMany?.isExported).toBe(false);
        // Variadic param: type is rendered with `...` prefix.
        const variadic = helloMany?.parameters.find(
          (p) => p.name === "names",
        );
        expect(variadic?.type).toBe("...string");
      });

      test("extracts struct types with mixed-visibility fields", () => {
        const server = result?.classes.find((c) => c.name === "Server");
        expect(server).toBeDefined();
        expect(server?.isExported).toBe(true);

        const port = server?.properties.find((p) => p.name === "Port");
        expect(port?.visibility).toBe("public");
        expect(port?.type).toBe("int");

        const host = server?.properties.find((p) => p.name === "host");
        expect(host?.visibility).toBe("private");
      });

      test("attaches methods to their receiver struct", () => {
        const server = result?.classes.find((c) => c.name === "Server");
        const methodNames = server?.methods.map((m) => m.name).sort() ?? [];
        expect(methodNames).toEqual(["Start", "listen"].sort());

        const start = server?.methods.find((m) => m.name === "Start");
        expect(start?.isExported).toBe(true);
        const listen = server?.methods.find((m) => m.name === "listen");
        expect(listen?.isExported).toBe(false);
      });

      test("extracts interface declarations with method specs", () => {
        const greeter = result?.interfaces.find((i) => i.name === "Greeter");
        expect(greeter).toBeDefined();
        expect(greeter?.isExported).toBe(true);
        expect(greeter?.methods.map((m) => m.name).sort()).toEqual(
          ["Greet", "GreetMany"].sort(),
        );
      });

      test("extracts imports including aliased imports", () => {
        const sources = result?.imports.map((i) => i.source);
        expect(sources).toEqual(
          expect.arrayContaining(["fmt", "io", "context"]),
        );
        const ioImport = result?.imports.find((i) => i.source === "io");
        expect(ioImport?.imports[0].alias).toBe("stdio");
      });

      test("populates exports with capitalized identifiers", () => {
        expect(result?.exports).toEqual(
          expect.arrayContaining([
            "Greeter",
            "Server",
            "NewServer",
            "Hello",
          ]),
        );
        expect(result?.exports).not.toContain("helloMany");
      });
    });

    describe("Graceful degradation", () => {
      test("returns a structural-only result for unsupported but-declared languages", async () => {
        // tree-sitter-rust ships a wasm but we haven't written an extractor
        // for Rust yet (that's the natural follow-up). The analyzer should
        // still return a result whose contentHash + linesOfCode are valid so
        // drift detection can compare files at file granularity.
        const filePath = join(tempDir, "stub.rs");
        await fs.writeFile(
          filePath,
          'fn main() { println!("hello"); }\n',
          "utf-8",
        );

        const result = await analyzer.analyzeFile(filePath);
        expect(result).not.toBeNull();
        expect(result?.language).toBe("rust");
        expect(result?.functions).toEqual([]);
        expect(result?.contentHash.length).toBe(64); // sha256 hex
        expect(result?.linesOfCode).toBeGreaterThan(0);
      });
    });
  });
});
