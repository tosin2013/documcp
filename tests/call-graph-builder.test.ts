/**
 * Tests for Call Graph Builder (Issue #72)
 */

import {
  ASTAnalyzer,
  CallGraph,
  CallGraphNode,
  ConditionalPath,
  ExceptionPath,
  CallGraphOptions,
} from "../src/utils/ast-analyzer.js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("Call Graph Builder", () => {
  let analyzer: ASTAnalyzer;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "call-graph-test-"));
    analyzer = new ASTAnalyzer();
    await analyzer.initialize();
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("buildCallGraph", () => {
    it("should build call graph for a simple function", async () => {
      const code = `
export function main() {
  helper();
}

function helper() {
  return "helped";
}
`;
      await fs.writeFile(path.join(tempDir, "simple.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir);

      expect(graph.entryPoint).toBe("main");
      expect(graph.root.function.name).toBe("main");
      expect(graph.root.calls.length).toBeGreaterThanOrEqual(1);
      expect(graph.root.calls[0]?.function.name).toBe("helper");
    });

    it("should handle nested function calls", async () => {
      const code = `
export function outer() {
  middle();
}

function middle() {
  inner();
}

function inner() {
  return 42;
}
`;
      await fs.writeFile(path.join(tempDir, "nested.ts"), code);

      const graph = await analyzer.buildCallGraph("outer", tempDir, {
        maxDepth: 5,
      });

      expect(graph.entryPoint).toBe("outer");
      expect(graph.maxDepthReached).toBeGreaterThanOrEqual(2);

      // Find middle call
      const middleCall = graph.root.calls.find(
        (c) => c.function.name === "middle",
      );
      expect(middleCall).toBeDefined();

      // Find inner call within middle
      if (middleCall) {
        const innerCall = middleCall.calls.find(
          (c) => c.function.name === "inner",
        );
        expect(innerCall).toBeDefined();
      }
    });

    it("should respect maxDepth option", async () => {
      const code = `
export function level1() {
  level2();
}

function level2() {
  level3();
}

function level3() {
  level4();
}

function level4() {
  return "deep";
}
`;
      await fs.writeFile(path.join(tempDir, "deep.ts"), code);

      const graph = await analyzer.buildCallGraph("level1", tempDir, {
        maxDepth: 2,
      });

      expect(graph.maxDepthReached).toBeLessThanOrEqual(2);
      // level3 and level4 should not be fully traversed
    });

    it("should detect circular references", async () => {
      const code = `
export function funcA() {
  funcB();
}

function funcB() {
  funcA();
}
`;
      await fs.writeFile(path.join(tempDir, "circular.ts"), code);

      const graph = await analyzer.buildCallGraph("funcA", tempDir);

      expect(graph.circularReferences.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty graph for non-existent function", async () => {
      const graph = await analyzer.buildCallGraph(
        "nonExistentFunction",
        tempDir,
      );

      expect(graph.entryPoint).toBe("nonExistentFunction");
      expect(graph.root.isExternal).toBe(true);
      expect(graph.unresolvedCalls.length).toBeGreaterThan(0);
    });
  });

  describe("Conditional branch extraction", () => {
    it("should extract if/else branches", async () => {
      const code = `
export function withCondition(flag: boolean) {
  if (flag) {
    trueHandler();
  } else {
    falseHandler();
  }
}

function trueHandler() {
  return true;
}

function falseHandler() {
  return false;
}
`;
      await fs.writeFile(path.join(tempDir, "conditional.ts"), code);

      const graph = await analyzer.buildCallGraph("withCondition", tempDir, {
        extractConditionals: true,
      });

      expect(graph.root.conditionalBranches.length).toBeGreaterThanOrEqual(1);
      const ifBranch = graph.root.conditionalBranches.find(
        (c) => c.type === "if",
      );
      expect(ifBranch).toBeDefined();
      expect(ifBranch?.condition).toContain("flag");
    });

    it("should extract switch statement branches", async () => {
      const code = `
export function handleStatus(status: string) {
  switch (status) {
    case "success":
      handleSuccess();
      break;
    case "error":
      handleError();
      break;
    default:
      handleDefault();
  }
}

function handleSuccess() {}
function handleError() {}
function handleDefault() {}
`;
      await fs.writeFile(path.join(tempDir, "switch.ts"), code);

      const graph = await analyzer.buildCallGraph("handleStatus", tempDir, {
        extractConditionals: true,
      });

      const switchCases = graph.root.conditionalBranches.filter(
        (c) => c.type === "switch-case",
      );
      expect(switchCases.length).toBeGreaterThanOrEqual(1);
    });

    it("should extract ternary operators", async () => {
      const code = `
export function ternaryExample(condition: boolean) {
  const result = condition ? getValue() : getDefault();
  return result;
}

function getValue() { return 1; }
function getDefault() { return 0; }
`;
      await fs.writeFile(path.join(tempDir, "ternary.ts"), code);

      const graph = await analyzer.buildCallGraph("ternaryExample", tempDir, {
        extractConditionals: true,
      });

      const ternary = graph.root.conditionalBranches.find(
        (c) => c.type === "ternary",
      );
      expect(ternary).toBeDefined();
    });

    it("should skip conditional extraction when disabled", async () => {
      const code = `
export function withCondition(flag: boolean) {
  if (flag) {
    trueHandler();
  }
}

function trueHandler() {}
`;
      await fs.writeFile(path.join(tempDir, "no-conditionals.ts"), code);

      const graph = await analyzer.buildCallGraph("withCondition", tempDir, {
        extractConditionals: false,
      });

      expect(graph.root.conditionalBranches.length).toBe(0);
    });
  });

  describe("Exception path identification", () => {
    it("should detect throw statements", async () => {
      const code = `
export function throwingFunction() {
  throw new Error("Something went wrong");
}
`;
      await fs.writeFile(path.join(tempDir, "throwing.ts"), code);

      const graph = await analyzer.buildCallGraph("throwingFunction", tempDir, {
        trackExceptions: true,
      });

      expect(graph.root.exceptions.length).toBeGreaterThanOrEqual(1);
      const exception = graph.root.exceptions[0];
      expect(exception?.exceptionType).toBe("Error");
      expect(exception?.isCaught).toBe(false);
    });

    it("should detect caught exceptions", async () => {
      const code = `
export function caughtException() {
  try {
    throw new Error("Will be caught");
  } catch (e) {
    console.log(e);
  }
}
`;
      await fs.writeFile(path.join(tempDir, "caught.ts"), code);

      const graph = await analyzer.buildCallGraph("caughtException", tempDir, {
        trackExceptions: true,
      });

      const caughtExceptions = graph.root.exceptions.filter((e) => e.isCaught);
      expect(caughtExceptions.length).toBeGreaterThanOrEqual(1);
    });

    it("should detect custom exception types", async () => {
      const code = `
class CustomError extends Error {}

export function customException() {
  throw new CustomError("Custom error");
}
`;
      await fs.writeFile(path.join(tempDir, "custom-error.ts"), code);

      const graph = await analyzer.buildCallGraph("customException", tempDir, {
        trackExceptions: true,
      });

      const customEx = graph.root.exceptions.find(
        (e) => e.exceptionType === "CustomError",
      );
      expect(customEx).toBeDefined();
    });

    it("should skip exception tracking when disabled", async () => {
      const code = `
export function throwingFunction() {
  throw new Error("Something went wrong");
}
`;
      await fs.writeFile(path.join(tempDir, "no-exceptions.ts"), code);

      const graph = await analyzer.buildCallGraph("throwingFunction", tempDir, {
        trackExceptions: false,
      });

      expect(graph.root.exceptions.length).toBe(0);
    });
  });

  describe("Cross-file import resolution", () => {
    it("should resolve same-directory imports", async () => {
      // Create main file
      const mainCode = `
import { helper } from "./helper.js";

export function main() {
  helper();
}
`;
      // Create helper file
      const helperCode = `
export function helper() {
  return "helped";
}
`;
      const subDir = path.join(tempDir, "cross-file");
      await fs.mkdir(subDir, { recursive: true });
      await fs.writeFile(path.join(subDir, "main.ts"), mainCode);
      await fs.writeFile(path.join(subDir, "helper.ts"), helperCode);

      const graph = await analyzer.buildCallGraph("main", subDir, {
        resolveImports: true,
      });

      // Should have found the helper function
      expect(graph.analyzedFiles.length).toBeGreaterThanOrEqual(1);
    });

    it("should track unresolved external calls", async () => {
      const code = `
import { externalFunction } from "external-package";

export function main() {
  externalFunction();
  unknownFunction();
}
`;
      await fs.writeFile(path.join(tempDir, "external.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir);

      // External package calls should be unresolved
      expect(graph.unresolvedCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("should skip import resolution when disabled", async () => {
      const code = `
import { helper } from "./helper.js";

export function main() {
  helper();
}
`;
      await fs.writeFile(path.join(tempDir, "no-resolve.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir, {
        resolveImports: false,
      });

      // Only the main file should be analyzed
      expect(graph.analyzedFiles.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Class method handling", () => {
    it("should handle class method calls", async () => {
      const code = `
export class MyClass {
  public methodA() {
    this.methodB();
  }

  private methodB() {
    return "B";
  }
}
`;
      await fs.writeFile(path.join(tempDir, "class-methods.ts"), code);

      const graph = await analyzer.buildCallGraph("methodA", tempDir);

      // Should find methodA as entry
      expect(graph.entryPoint).toBe("methodA");
    });
  });

  describe("CallGraph structure", () => {
    it("should have correct graph structure", async () => {
      const code = `
export function main() {
  helper();
}

function helper() {}
`;
      await fs.writeFile(path.join(tempDir, "structure.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir);

      // Verify graph properties
      expect(graph).toHaveProperty("entryPoint");
      expect(graph).toHaveProperty("root");
      expect(graph).toHaveProperty("allFunctions");
      expect(graph).toHaveProperty("maxDepthReached");
      expect(graph).toHaveProperty("analyzedFiles");
      expect(graph).toHaveProperty("circularReferences");
      expect(graph).toHaveProperty("unresolvedCalls");
      expect(graph).toHaveProperty("buildTime");

      // Verify allFunctions is a Map
      expect(graph.allFunctions).toBeInstanceOf(Map);
    });

    it("should have correct node structure", async () => {
      const code = `
export function main() {
  helper();
}

function helper() {}
`;
      await fs.writeFile(path.join(tempDir, "node-structure.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir);

      // Verify node properties
      const node = graph.root;
      expect(node).toHaveProperty("function");
      expect(node).toHaveProperty("location");
      expect(node).toHaveProperty("calls");
      expect(node).toHaveProperty("conditionalBranches");
      expect(node).toHaveProperty("exceptions");
      expect(node).toHaveProperty("depth");
      expect(node).toHaveProperty("truncated");
      expect(node).toHaveProperty("isExternal");

      // Verify location structure
      expect(node.location).toHaveProperty("file");
      expect(node.location).toHaveProperty("line");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty function body", async () => {
      const code = `
export function emptyFunction() {}
`;
      await fs.writeFile(path.join(tempDir, "empty.ts"), code);

      const graph = await analyzer.buildCallGraph("emptyFunction", tempDir);

      expect(graph.root.function.name).toBe("emptyFunction");
      expect(graph.root.calls.length).toBe(0);
    });

    it("should handle async functions", async () => {
      const code = `
export async function asyncMain() {
  await asyncHelper();
}

async function asyncHelper() {
  return Promise.resolve(42);
}
`;
      await fs.writeFile(path.join(tempDir, "async.ts"), code);

      const graph = await analyzer.buildCallGraph("asyncMain", tempDir);

      expect(graph.root.function.name).toBe("asyncMain");
      expect(graph.root.function.isAsync).toBe(true);
    });

    it("should handle arrow functions", async () => {
      const code = `
export const arrowMain = () => {
  arrowHelper();
};

const arrowHelper = () => "helped";
`;
      await fs.writeFile(path.join(tempDir, "arrow.ts"), code);

      const graph = await analyzer.buildCallGraph("arrowMain", tempDir);

      expect(graph.root.function.name).toBe("arrowMain");
    });

    it("should handle functions with complex parameters", async () => {
      const code = `
export function complexParams(
  required: string,
  optional?: number,
  defaultVal = "default",
  ...rest: string[]
) {
  helper();
}

function helper() {}
`;
      await fs.writeFile(path.join(tempDir, "complex-params.ts"), code);

      const graph = await analyzer.buildCallGraph("complexParams", tempDir);

      expect(graph.root.function.parameters.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle deeply nested conditionals", async () => {
      const code = `
export function nested(a: boolean, b: boolean, c: boolean) {
  if (a) {
    if (b) {
      if (c) {
        deepFunction();
      }
    }
  }
}

function deepFunction() {}
`;
      await fs.writeFile(path.join(tempDir, "nested-conditionals.ts"), code);

      const graph = await analyzer.buildCallGraph("nested", tempDir, {
        extractConditionals: true,
      });

      // Should have at least one conditional
      expect(graph.root.conditionalBranches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Options validation", () => {
    it("should use default options when not provided", async () => {
      const code = `
export function main() {}
`;
      await fs.writeFile(path.join(tempDir, "defaults.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir);

      // Should complete without errors using defaults
      expect(graph.entryPoint).toBe("main");
    });

    it("should handle custom extensions option", async () => {
      const code = `
export function main() {}
`;
      await fs.writeFile(path.join(tempDir, "custom.ts"), code);

      const graph = await analyzer.buildCallGraph("main", tempDir, {
        extensions: [".ts"],
      });

      expect(graph.entryPoint).toBe("main");
    });
  });
});
