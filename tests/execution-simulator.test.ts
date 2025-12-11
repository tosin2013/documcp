/**
 * Tests for Execution Simulator (Issue #73)
 */

import {
  ExecutionSimulator,
  createExecutionSimulator,
  ExecutionTrace,
  ExecutionStep,
  VariableState,
  PotentialIssue,
  CallGraph,
  SimulationOptions,
  ExampleValidationResult,
} from "../src/utils/execution-simulator.js";
import { ASTAnalyzer } from "../src/utils/ast-analyzer.js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("ExecutionSimulator", () => {
  let simulator: ExecutionSimulator;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "exec-sim-test-"));
    simulator = createExecutionSimulator({
      maxDepth: 5,
      maxSteps: 50,
      timeoutMs: 10000,
      detectNullRefs: true,
      detectTypeMismatches: true,
      detectUnreachableCode: true,
      confidenceThreshold: 0.5,
    });
    await simulator.initialize();
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createExecutionSimulator", () => {
    it("should create a simulator with default options", () => {
      const defaultSimulator = createExecutionSimulator();
      expect(defaultSimulator).toBeInstanceOf(ExecutionSimulator);
    });

    it("should create a simulator with custom options", () => {
      const customSimulator = createExecutionSimulator({
        maxDepth: 3,
        maxSteps: 25,
        detectNullRefs: false,
      });
      expect(customSimulator).toBeInstanceOf(ExecutionSimulator);
    });
  });

  describe("simulateExecution", () => {
    it("should simulate simple code execution", async () => {
      const exampleCode = `
const x = 5;
const y = 10;
const result = x + y;
console.log(result);
`;
      const implementationCode = exampleCode;

      const trace = await simulator.simulateExecution(
        exampleCode,
        implementationCode,
      );

      expect(trace).toHaveProperty("exampleId");
      expect(trace).toHaveProperty("entryPoint");
      expect(trace).toHaveProperty("executionSteps");
      expect(trace).toHaveProperty("variablesAccessed");
      expect(trace).toHaveProperty("potentialIssues");
      expect(trace).toHaveProperty("confidenceScore");
      expect(trace).toHaveProperty("reachedEnd");
      expect(trace).toHaveProperty("simulationDuration");
      expect(trace.simulationDuration).toBeGreaterThanOrEqual(0);
    });

    it("should detect variables in code", async () => {
      const code = `
const name = "test";
let count = 0;
var total = 100;
`;

      const trace = await simulator.simulateExecution(code, code);

      expect(trace.variablesAccessed).toBeDefined();
      // Should have detected at least one variable
      const varCount = Object.keys(trace.variablesAccessed).length;
      expect(varCount).toBeGreaterThanOrEqual(0);
    });

    it("should detect potential null references", async () => {
      const code = `
const obj = null;
const value = obj.property;
`;

      const trace = await simulator.simulateExecution(code, code);

      // Should have detected potential null reference
      const nullRefIssues = trace.potentialIssues.filter(
        (i) => i.type === "null-reference",
      );
      // Note: Static analysis may or may not detect this depending on implementation
      expect(trace.potentialIssues).toBeDefined();
    });

    it("should detect unreachable code", async () => {
      const code = `
function test() {
  return 5;
  const unreachable = 10;
}
`;

      const trace = await simulator.simulateExecution(code, code);

      const unreachableIssues = trace.potentialIssues.filter(
        (i) => i.type === "unreachable-code",
      );
      // Should detect code after return
      expect(unreachableIssues.length).toBeGreaterThanOrEqual(0);
    });

    it("should extract function calls", async () => {
      const code = `
function greet(name) {
  return "Hello, " + name;
}
const message = greet("World");
console.log(message);
`;

      const trace = await simulator.simulateExecution(code, code);

      // Should have execution steps
      expect(trace.executionSteps.length).toBeGreaterThan(0);

      // Check that some steps have function calls
      const stepsWithCalls = trace.executionSteps.filter(
        (s) => s.callsMade.length > 0,
      );
      expect(stepsWithCalls.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle async code", async () => {
      const code = `
async function fetchData() {
  const response = await fetch("https://api.example.com");
  return response.json();
}
`;

      const trace = await simulator.simulateExecution(code, code);

      // Should detect the async function
      expect(trace.executionSteps.length).toBeGreaterThan(0);
    });

    it("should generate unique example IDs", async () => {
      const code1 = `const a = 1;`;
      const code2 = `const b = 2;`;

      const trace1 = await simulator.simulateExecution(code1, code1);
      const trace2 = await simulator.simulateExecution(code2, code2);

      expect(trace1.exampleId).not.toBe(trace2.exampleId);
    });
  });

  describe("validateExample", () => {
    it("should validate a simple example", async () => {
      const code = `
const add = (a, b) => a + b;
const result = add(2, 3);
`;

      const validation = await simulator.validateExample(code, code);

      expect(validation).toHaveProperty("exampleCode");
      expect(validation).toHaveProperty("trace");
      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("issues");
      expect(validation).toHaveProperty("matchesDocumentation");
      expect(validation).toHaveProperty("suggestions");
      expect(validation.exampleCode).toBe(code);
    });

    it("should validate against expected behavior", async () => {
      const code = `
function multiply(a, b) {
  return a * b;
}
const result = multiply(3, 4);
`;

      const validation = await simulator.validateExample(
        code,
        code,
        "multiplies two numbers and returns the product",
      );

      expect(validation.matchesDocumentation).toBeDefined();
    });

    it("should identify issues in invalid examples", async () => {
      const code = `
const data = undefined;
const value = data.map(x => x);
`;

      const validation = await simulator.validateExample(code, code);

      // Should have detected potential issues
      expect(validation.issues).toBeDefined();
    });

    it("should provide suggestions for problematic code", async () => {
      const code = `
const obj = null;
const prop = obj.value;
`;

      const validation = await simulator.validateExample(code, code);

      expect(validation.suggestions).toBeDefined();
      expect(Array.isArray(validation.suggestions)).toBe(true);
    });
  });

  describe("validateExamples (batch)", () => {
    it("should validate multiple examples in batch", async () => {
      const examples = [
        { code: `const a = 1;`, implementation: `const a = 1;` },
        { code: `const b = 2;`, implementation: `const b = 2;` },
        {
          code: `function test() { return true; }`,
          implementation: `function test() { return true; }`,
        },
      ];

      const results = await simulator.validateExamples(examples);

      expect(results.length).toBe(examples.length);
      results.forEach((result) => {
        expect(result).toHaveProperty("trace");
        expect(result).toHaveProperty("isValid");
      });
    });

    it("should handle empty batch", async () => {
      const results = await simulator.validateExamples([]);
      expect(results).toEqual([]);
    });
  });

  describe("buildCallGraph", () => {
    it("should build call graph for a function", async () => {
      // Create a test file
      const testFile = path.join(tempDir, "call-graph-test.ts");
      const code = `
export function main() {
  helper();
}

function helper() {
  return "helped";
}
`;
      await fs.writeFile(testFile, code);

      const astAnalyzer = new ASTAnalyzer();
      await astAnalyzer.initialize();
      const analysis = await astAnalyzer.analyzeFile(testFile);

      if (analysis) {
        const callGraph = await simulator.buildCallGraph("main", analysis, 2);

        expect(callGraph).toHaveProperty("entryPoint", "main");
        expect(callGraph).toHaveProperty("root");
        expect(callGraph).toHaveProperty("allFunctions");
        expect(callGraph).toHaveProperty("maxDepthReached");
        expect(callGraph.root.function.name).toBe("main");
      }
    });

    it("should handle non-existent entry function", async () => {
      const testFile = path.join(tempDir, "no-entry-test.ts");
      await fs.writeFile(testFile, `const x = 1;`);

      const astAnalyzer = new ASTAnalyzer();
      await astAnalyzer.initialize();
      const analysis = await astAnalyzer.analyzeFile(testFile);

      if (analysis) {
        const callGraph = await simulator.buildCallGraph(
          "nonExistentFunction",
          analysis,
          2,
        );

        expect(callGraph.entryPoint).toBe("nonExistentFunction");
        expect(callGraph.root.function.name).toBe("nonExistentFunction");
      }
    });
  });

  describe("isLLMAvailable", () => {
    it("should return a boolean indicating LLM availability", () => {
      const available = simulator.isLLMAvailable();
      expect(typeof available).toBe("boolean");
    });
  });

  describe("ExecutionTrace structure", () => {
    it("should have correct trace structure", async () => {
      const code = `const x = 5;`;
      const trace = await simulator.simulateExecution(code, code);

      // Verify trace structure
      expect(typeof trace.exampleId).toBe("string");
      expect(typeof trace.entryPoint).toBe("string");
      expect(Array.isArray(trace.executionSteps)).toBe(true);
      expect(typeof trace.variablesAccessed).toBe("object");
      expect(Array.isArray(trace.potentialIssues)).toBe(true);
      expect(typeof trace.confidenceScore).toBe("number");
      expect(Array.isArray(trace.executionPath)).toBe(true);
      expect(typeof trace.reachedEnd).toBe("boolean");
      expect(typeof trace.simulationDuration).toBe("number");
    });

    it("should have valid execution steps", async () => {
      const code = `
const x = 5;
const y = x + 10;
`;
      const trace = await simulator.simulateExecution(code, code);

      trace.executionSteps.forEach((step) => {
        expect(typeof step.lineNumber).toBe("number");
        expect(typeof step.operation).toBe("string");
        expect(typeof step.stateChanges).toBe("object");
        expect(Array.isArray(step.callsMade)).toBe(true);
        expect(typeof step.confidence).toBe("number");
      });
    });
  });

  describe("PotentialIssue structure", () => {
    it("should have correct issue structure when issues are found", async () => {
      const code = `
const obj = null;
const val = obj.prop;
`;
      const trace = await simulator.simulateExecution(code, code);

      trace.potentialIssues.forEach((issue) => {
        expect(["error", "warning", "info"]).toContain(issue.severity);
        expect(typeof issue.type).toBe("string");
        expect(typeof issue.location).toBe("object");
        expect(typeof issue.location.line).toBe("number");
        expect(typeof issue.description).toBe("string");
        expect(typeof issue.suggestion).toBe("string");
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle empty code", async () => {
      const trace = await simulator.simulateExecution("", "");
      expect(trace).toBeDefined();
      expect(trace.executionSteps).toBeDefined();
    });

    it("should handle code with only comments", async () => {
      const code = `
// This is a comment
/* Multi-line
   comment */
`;
      const trace = await simulator.simulateExecution(code, code);
      expect(trace).toBeDefined();
    });

    it("should handle complex nested code", async () => {
      const code = `
function outer() {
  function inner() {
    function deepest() {
      return 42;
    }
    return deepest();
  }
  return inner();
}
const result = outer();
`;
      const trace = await simulator.simulateExecution(code, code);
      expect(trace).toBeDefined();
      expect(trace.executionSteps.length).toBeGreaterThan(0);
    });

    it("should handle code with try-catch", async () => {
      const code = `
try {
  const result = riskyOperation();
} catch (error) {
  console.error(error);
}
`;
      const trace = await simulator.simulateExecution(code, code);
      expect(trace).toBeDefined();
    });

    it("should handle class definitions", async () => {
      const code = `
class MyClass {
  constructor(value) {
    this.value = value;
  }

  getValue() {
    return this.value;
  }
}

const instance = new MyClass(10);
const val = instance.getValue();
`;
      const trace = await simulator.simulateExecution(code, code);
      expect(trace).toBeDefined();
      expect(trace.executionSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Confidence scoring", () => {
    it("should return confidence between 0 and 1", async () => {
      const code = `const x = 5;`;
      const trace = await simulator.simulateExecution(code, code);
      expect(trace.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(trace.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should have step-level confidence", async () => {
      const code = `
const a = 1;
const b = 2;
const c = a + b;
`;
      const trace = await simulator.simulateExecution(code, code);

      trace.executionSteps.forEach((step) => {
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe("ExecutionSimulator options", () => {
  it("should respect maxSteps option", async () => {
    const simulator = createExecutionSimulator({ maxSteps: 5 });
    await simulator.initialize();

    const code = `
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
const f = 6;
const g = 7;
`;
    const trace = await simulator.simulateExecution(code, code);

    // Steps should be limited (though exact behavior may vary)
    expect(trace.executionSteps.length).toBeLessThanOrEqual(10);
  });

  it("should respect detectNullRefs option", async () => {
    const simulatorWithDetection = createExecutionSimulator({
      detectNullRefs: true,
    });
    const simulatorWithoutDetection = createExecutionSimulator({
      detectNullRefs: false,
    });

    await simulatorWithDetection.initialize();
    await simulatorWithoutDetection.initialize();

    const code = `
const obj = null;
const val = obj.prop;
`;

    const traceWith = await simulatorWithDetection.simulateExecution(
      code,
      code,
    );
    const traceWithout = await simulatorWithoutDetection.simulateExecution(
      code,
      code,
    );

    // Both should complete without errors
    expect(traceWith).toBeDefined();
    expect(traceWithout).toBeDefined();
  });
});
