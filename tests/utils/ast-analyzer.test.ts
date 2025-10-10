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
});
