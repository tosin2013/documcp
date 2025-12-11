/**
 * Execution Simulator for LLM-based Code Tracing (Issue #73)
 *
 * Uses LLM to trace code execution paths without actually running the code.
 * Enables validation of documentation examples by simulating their behavior.
 *
 * Supports ADR-010: Executable Documentation Examples
 */

import { createLLMClient, LLMClient, isLLMAvailable } from "./llm-client.js";
import {
  ASTAnalyzer,
  FunctionSignature,
  ASTAnalysisResult,
} from "./ast-analyzer.js";

/**
 * Represents the state of a variable during execution
 */
export interface VariableState {
  name: string;
  type: string;
  value: unknown;
  definedAt: number;
  lastModifiedAt: number;
  isParameter: boolean;
}

/**
 * Single step in execution trace
 */
export interface ExecutionStep {
  lineNumber: number;
  operation: string;
  stateChanges: Record<string, unknown>;
  callsMade: string[];
  branchTaken?: "if" | "else" | "switch-case" | "loop-continue" | "loop-break";
  returnValue?: unknown;
  errorThrown?: string;
  confidence: number;
}

/**
 * Trace of simulated code execution
 */
export interface ExecutionTrace {
  exampleId: string;
  entryPoint: string;
  executionSteps: ExecutionStep[];
  variablesAccessed: Record<string, VariableState>;
  potentialIssues: PotentialIssue[];
  confidenceScore: number;
  executionPath: string[];
  reachedEnd: boolean;
  simulationDuration: number;
}

/**
 * Potential issue detected during execution simulation
 */
export interface PotentialIssue {
  severity: "error" | "warning" | "info";
  type:
    | "null-reference"
    | "type-mismatch"
    | "undefined-variable"
    | "unreachable-code"
    | "infinite-loop"
    | "missing-error-handling"
    | "deprecated-api"
    | "other";
  location: {
    line: number;
    column?: number;
    function?: string;
  };
  description: string;
  suggestion: string;
  codeSnippet?: string;
}

/**
 * Call graph node for execution path tracing
 */
export interface CallGraphNode {
  function: FunctionSignature;
  location: { file: string; line: number };
  calls: CallGraphNode[];
  conditionals: ConditionalPath[];
  raises: string[];
  depth: number;
}

/**
 * Conditional branch in execution path
 */
export interface ConditionalPath {
  condition: string;
  lineNumber: number;
  trueBranch: CallGraphNode[];
  falseBranch: CallGraphNode[];
}

/**
 * Call graph for an entry point
 */
export interface CallGraph {
  entryPoint: string;
  root: CallGraphNode;
  allFunctions: FunctionSignature[];
  maxDepthReached: number;
}

/**
 * Options for execution simulation
 */
export interface SimulationOptions {
  maxDepth?: number;
  maxSteps?: number;
  timeoutMs?: number;
  includeCallGraph?: boolean;
  detectNullRefs?: boolean;
  detectTypeMismatches?: boolean;
  detectUnreachableCode?: boolean;
  confidenceThreshold?: number;
}

/**
 * Result of validating a code example
 */
export interface ExampleValidationResult {
  exampleCode: string;
  trace: ExecutionTrace;
  isValid: boolean;
  issues: PotentialIssue[];
  matchesDocumentation: boolean;
  suggestions: string[];
}

/**
 * Execution Simulator using LLM for code tracing
 */
export class ExecutionSimulator {
  private llmClient: LLMClient | null;
  private astAnalyzer: ASTAnalyzer;
  private initialized: boolean = false;
  private options: SimulationOptions;

  constructor(options: SimulationOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth || 10,
      maxSteps: options.maxSteps || 100,
      timeoutMs: options.timeoutMs || 30000,
      includeCallGraph: options.includeCallGraph !== false,
      detectNullRefs: options.detectNullRefs !== false,
      detectTypeMismatches: options.detectTypeMismatches !== false,
      detectUnreachableCode: options.detectUnreachableCode !== false,
      confidenceThreshold: options.confidenceThreshold || 0.7,
    };

    this.llmClient = isLLMAvailable() ? createLLMClient() : null;
    this.astAnalyzer = new ASTAnalyzer();
  }

  /**
   * Initialize the simulator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.astAnalyzer.initialize();
    this.initialized = true;
  }

  /**
   * Check if LLM is available for simulation
   */
  isLLMAvailable(): boolean {
    return this.llmClient !== null;
  }

  /**
   * Simulate execution of a code example
   */
  async simulateExecution(
    exampleCode: string,
    implementationCode: string,
    entryPoint?: string,
  ): Promise<ExecutionTrace> {
    await this.initialize();

    const startTime = Date.now();
    const exampleId = this.generateExampleId(exampleCode);

    // If LLM is not available, fall back to static analysis
    if (!this.llmClient) {
      return this.staticAnalysisTrace(
        exampleCode,
        implementationCode,
        exampleId,
        startTime,
      );
    }

    try {
      // Use LLM to trace execution
      const trace = await this.llmTraceExecution(
        exampleCode,
        implementationCode,
        entryPoint || this.detectEntryPoint(exampleCode),
        exampleId,
        startTime,
      );

      return trace;
    } catch (error) {
      // Fallback to static analysis on LLM failure
      console.warn(
        "LLM execution trace failed, falling back to static analysis:",
        error,
      );
      return this.staticAnalysisTrace(
        exampleCode,
        implementationCode,
        exampleId,
        startTime,
      );
    }
  }

  /**
   * Validate a documentation example against implementation
   */
  async validateExample(
    exampleCode: string,
    implementationCode: string,
    expectedBehavior?: string,
  ): Promise<ExampleValidationResult> {
    await this.initialize();

    const trace = await this.simulateExecution(exampleCode, implementationCode);

    const issues = this.analyzeTraceForIssues(trace);
    const isValid = issues.filter((i) => i.severity === "error").length === 0;
    const matchesDocumentation = await this.checkBehaviorMatch(
      trace,
      expectedBehavior,
    );

    const suggestions: string[] = [];
    if (!isValid) {
      suggestions.push(
        "Fix the identified errors before publishing documentation",
      );
    }
    if (!matchesDocumentation && expectedBehavior) {
      suggestions.push(
        "Update documentation to match actual implementation behavior",
      );
    }
    if (trace.confidenceScore < this.options.confidenceThreshold!) {
      suggestions.push("Low confidence simulation - manual review recommended");
    }

    return {
      exampleCode,
      trace,
      isValid,
      issues,
      matchesDocumentation,
      suggestions,
    };
  }

  /**
   * Batch validate multiple examples
   */
  async validateExamples(
    examples: Array<{
      code: string;
      implementation: string;
      expectedBehavior?: string;
    }>,
  ): Promise<ExampleValidationResult[]> {
    const results: ExampleValidationResult[] = [];

    for (const example of examples) {
      const result = await this.validateExample(
        example.code,
        example.implementation,
        example.expectedBehavior,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Build a call graph for a function
   */
  async buildCallGraph(
    entryFunction: string,
    analysisResult: ASTAnalysisResult,
    maxDepth: number = 3,
  ): Promise<CallGraph> {
    const allFunctions = analysisResult.functions;
    const entryFunc = allFunctions.find((f) => f.name === entryFunction);

    if (!entryFunc) {
      return {
        entryPoint: entryFunction,
        root: this.createEmptyNode(entryFunction),
        allFunctions,
        maxDepthReached: 0,
      };
    }

    const visited = new Set<string>();
    const root = await this.buildCallGraphNode(
      entryFunc,
      analysisResult,
      0,
      maxDepth,
      visited,
    );

    return {
      entryPoint: entryFunction,
      root,
      allFunctions,
      maxDepthReached: Math.min(maxDepth, visited.size),
    };
  }

  /**
   * Use LLM to trace code execution
   */
  private async llmTraceExecution(
    exampleCode: string,
    implementationCode: string,
    entryPoint: string,
    exampleId: string,
    startTime: number,
  ): Promise<ExecutionTrace> {
    const prompt = this.buildTracePrompt(
      exampleCode,
      implementationCode,
      entryPoint,
    );

    const response = await this.llmClient!.complete(prompt);
    const parsed = this.parseTraceResponse(response);

    return {
      exampleId,
      entryPoint,
      executionSteps: parsed.steps,
      variablesAccessed: parsed.variables,
      potentialIssues: parsed.issues,
      confidenceScore: parsed.confidence,
      executionPath: parsed.path,
      reachedEnd: parsed.reachedEnd,
      simulationDuration: Date.now() - startTime,
    };
  }

  /**
   * Build LLM prompt for execution tracing
   */
  private buildTracePrompt(
    exampleCode: string,
    implementationCode: string,
    entryPoint: string,
  ): string {
    return `You are a code execution simulator. Trace the execution of the following code example without actually running it.

## Example Code (to validate):
\`\`\`
${exampleCode}
\`\`\`

## Implementation Code:
\`\`\`
${implementationCode}
\`\`\`

## Entry Point: ${entryPoint}

Analyze the code flow step by step and respond in JSON format:

{
  "steps": [
    {
      "lineNumber": <number>,
      "operation": "<description of what happens>",
      "stateChanges": { "<variable>": <new_value> },
      "callsMade": ["<function_name>"],
      "branchTaken": "<if|else|switch-case|loop-continue|loop-break|null>",
      "returnValue": <value_if_returning>,
      "errorThrown": "<error_type_if_any|null>",
      "confidence": <0-1>
    }
  ],
  "variables": {
    "<name>": {
      "name": "<name>",
      "type": "<type>",
      "value": <value>,
      "definedAt": <line>,
      "lastModifiedAt": <line>,
      "isParameter": <boolean>
    }
  },
  "issues": [
    {
      "severity": "<error|warning|info>",
      "type": "<null-reference|type-mismatch|undefined-variable|unreachable-code|infinite-loop|missing-error-handling|deprecated-api|other>",
      "location": { "line": <number>, "function": "<name>" },
      "description": "<what's wrong>",
      "suggestion": "<how to fix>"
    }
  ],
  "confidence": <0-1 overall confidence>,
  "path": ["<function1>", "<function2>", ...],
  "reachedEnd": <boolean - did execution complete normally?>
}

Focus on:
1. Variable initialization and modifications
2. Function call order and arguments
3. Conditional branch decisions
4. Potential null/undefined access
5. Type mismatches between example and implementation
6. Error handling paths
7. Return values at each step`;
  }

  /**
   * Parse LLM response into trace structure
   */
  private parseTraceResponse(response: string): {
    steps: ExecutionStep[];
    variables: Record<string, VariableState>;
    issues: PotentialIssue[];
    confidence: number;
    path: string[];
    reachedEnd: boolean;
  } {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n?/g, "");
      }

      const parsed = JSON.parse(jsonStr);

      return {
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        variables: parsed.variables || {},
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        path: Array.isArray(parsed.path) ? parsed.path : [],
        reachedEnd: Boolean(parsed.reachedEnd),
      };
    } catch (error) {
      console.warn("Failed to parse LLM trace response:", error);
      return {
        steps: [],
        variables: {},
        issues: [
          {
            severity: "warning",
            type: "other",
            location: { line: 0 },
            description: "Failed to parse LLM response",
            suggestion: "Manual review required",
          },
        ],
        confidence: 0,
        path: [],
        reachedEnd: false,
      };
    }
  }

  /**
   * Static analysis fallback when LLM is not available
   */
  private async staticAnalysisTrace(
    exampleCode: string,
    implementationCode: string,
    exampleId: string,
    startTime: number,
  ): Promise<ExecutionTrace> {
    const issues: PotentialIssue[] = [];
    const variables: Record<string, VariableState> = {};
    const steps: ExecutionStep[] = [];

    // Basic static analysis
    const exampleLines = exampleCode.split("\n");
    // Note: implementationCode is used for context in detectUndefinedVariables

    // Detect potential null references
    if (this.options.detectNullRefs) {
      this.detectNullReferences(exampleCode, issues);
    }

    // Detect undefined variables
    this.detectUndefinedVariables(
      exampleCode,
      implementationCode,
      issues,
      variables,
    );

    // Detect unreachable code patterns
    if (this.options.detectUnreachableCode) {
      this.detectUnreachablePatterns(exampleCode, issues);
    }

    // Extract variable declarations
    this.extractVariableDeclarations(exampleCode, variables);

    // Create basic execution steps
    for (let i = 0; i < exampleLines.length; i++) {
      const line = exampleLines[i].trim();
      if (line && !line.startsWith("//") && !line.startsWith("/*")) {
        steps.push({
          lineNumber: i + 1,
          operation: this.inferOperation(line),
          stateChanges: {},
          callsMade: this.extractFunctionCalls(line),
          confidence: 0.5, // Lower confidence for static analysis
        });
      }
    }

    return {
      exampleId,
      entryPoint: this.detectEntryPoint(exampleCode),
      executionSteps: steps,
      variablesAccessed: variables,
      potentialIssues: issues,
      confidenceScore: 0.5, // Static analysis has lower confidence
      executionPath: [],
      reachedEnd: true,
      simulationDuration: Date.now() - startTime,
    };
  }

  /**
   * Detect potential null/undefined references
   */
  private detectNullReferences(code: string, issues: PotentialIssue[]): void {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      // Check for property access without null checks
      const propertyAccess = line.match(/(\w+)\.(\w+)/g);
      if (propertyAccess) {
        for (const access of propertyAccess) {
          // Check if there's an optional chaining or null check
          if (
            !line.includes("?.") &&
            !line.includes("&& ") &&
            !line.includes("!= null")
          ) {
            issues.push({
              severity: "warning",
              type: "null-reference",
              location: { line: index + 1 },
              description: `Potential null reference: ${access}`,
              suggestion: "Consider using optional chaining (?.) or null check",
              codeSnippet: line.trim(),
            });
          }
        }
      }
    });
  }

  /**
   * Detect undefined variable usage
   */
  private detectUndefinedVariables(
    exampleCode: string,
    implementationCode: string,
    issues: PotentialIssue[],
    variables: Record<string, VariableState>,
  ): void {
    // Extract declared variables from implementation
    const implVars = new Set<string>();
    const implMatches =
      implementationCode.match(/(const|let|var|function)\s+(\w+)/g) || [];
    for (const match of implMatches) {
      const name = match.split(/\s+/)[1];
      if (name) implVars.add(name);
    }

    // Check if example uses variables not in implementation
    const exampleLines = exampleCode.split("\n");
    exampleLines.forEach((line, index) => {
      const varUsage = line.match(/\b[a-zA-Z_]\w*\b/g) || [];
      for (const varName of varUsage) {
        // Skip keywords and common globals
        const keywords = [
          "const",
          "let",
          "var",
          "function",
          "if",
          "else",
          "for",
          "while",
          "return",
          "true",
          "false",
          "null",
          "undefined",
          "console",
          "async",
          "await",
          "import",
          "export",
        ];
        if (!keywords.includes(varName) && !implVars.has(varName)) {
          if (!variables[varName]) {
            issues.push({
              severity: "info",
              type: "undefined-variable",
              location: { line: index + 1 },
              description: `Variable '${varName}' used in example but not found in implementation`,
              suggestion: "Ensure the variable is defined or imported",
              codeSnippet: line.trim(),
            });
          }
        }
      }
    });
  }

  /**
   * Detect unreachable code patterns
   */
  private detectUnreachablePatterns(
    code: string,
    issues: PotentialIssue[],
  ): void {
    const lines = code.split("\n");
    let afterReturn = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (
        afterReturn &&
        trimmed &&
        !trimmed.startsWith("}") &&
        !trimmed.startsWith("//")
      ) {
        issues.push({
          severity: "warning",
          type: "unreachable-code",
          location: { line: index + 1 },
          description: "Code after return statement may be unreachable",
          suggestion: "Review control flow logic",
          codeSnippet: trimmed,
        });
      }

      if (trimmed.startsWith("return ") || trimmed === "return;") {
        afterReturn = true;
      }
      if (trimmed === "}") {
        afterReturn = false;
      }
    });
  }

  /**
   * Extract variable declarations from code
   */
  private extractVariableDeclarations(
    code: string,
    variables: Record<string, VariableState>,
  ): void {
    const lines = code.split("\n");

    lines.forEach((line, index) => {
      // Match const/let/var declarations
      const declMatch = line.match(
        /(const|let|var)\s+(\w+)(?:\s*:\s*(\w+))?\s*=\s*(.+)/,
      );
      if (declMatch) {
        const [, , name, type, value] = declMatch;
        variables[name] = {
          name,
          type: type || this.inferType(value),
          value: this.parseValue(value),
          definedAt: index + 1,
          lastModifiedAt: index + 1,
          isParameter: false,
        };
      }

      // Match function parameters
      const funcMatch = line.match(/function\s+\w+\s*\(([^)]*)\)/);
      if (funcMatch) {
        const params = funcMatch[1].split(",").map((p) => p.trim());
        for (const param of params) {
          if (param) {
            const [name, type] = param.split(":").map((s) => s.trim());
            if (name) {
              variables[name] = {
                name,
                type: type || "any",
                value: undefined,
                definedAt: index + 1,
                lastModifiedAt: index + 1,
                isParameter: true,
              };
            }
          }
        }
      }
    });
  }

  /**
   * Infer the operation from a line of code
   */
  private inferOperation(line: string): string {
    if (line.includes("=") && !line.includes("==")) {
      if (
        line.includes("const") ||
        line.includes("let") ||
        line.includes("var")
      ) {
        return "variable declaration";
      }
      return "assignment";
    }
    if (line.includes("if")) return "conditional check";
    if (line.includes("for") || line.includes("while")) return "loop iteration";
    if (line.includes("return")) return "return statement";
    if (line.includes("(") && line.includes(")")) return "function call";
    if (line.includes("await")) return "async operation";
    if (line.includes("throw")) return "throw error";
    if (line.includes("try")) return "try block start";
    if (line.includes("catch")) return "catch block";
    return "statement";
  }

  /**
   * Extract function calls from a line
   */
  private extractFunctionCalls(line: string): string[] {
    const calls: string[] = [];
    const callPattern = /(\w+)\s*\(/g;
    let match;

    while ((match = callPattern.exec(line)) !== null) {
      const name = match[1];
      // Skip keywords that look like function calls
      const keywords = ["if", "for", "while", "switch", "catch", "function"];
      if (!keywords.includes(name)) {
        calls.push(name);
      }
    }

    return calls;
  }

  /**
   * Infer type from value
   */
  private inferType(value: string): string {
    const trimmed = value.trim();
    if (
      trimmed.startsWith('"') ||
      trimmed.startsWith("'") ||
      trimmed.startsWith("`")
    )
      return "string";
    if (!isNaN(Number(trimmed))) return "number";
    if (trimmed === "true" || trimmed === "false") return "boolean";
    if (trimmed === "null") return "null";
    if (trimmed === "undefined") return "undefined";
    if (trimmed.startsWith("[")) return "array";
    if (trimmed.startsWith("{")) return "object";
    if (trimmed.includes("new ")) return "object";
    if (trimmed.includes("async") || trimmed.includes("=>")) return "function";
    return "unknown";
  }

  /**
   * Parse value from string
   */
  private parseValue(value: string): unknown {
    const trimmed = value.trim().replace(/;$/, "");
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  /**
   * Detect entry point from example code
   */
  private detectEntryPoint(code: string): string {
    // Look for function definitions
    const funcMatch = code.match(/(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) return funcMatch[1];

    // Look for arrow function assignments
    const arrowMatch = code.match(
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/,
    );
    if (arrowMatch) return arrowMatch[1];

    // Look for main function call
    const mainMatch = code.match(/(\w+)\s*\(/);
    if (mainMatch) return mainMatch[1];

    return "main";
  }

  /**
   * Generate unique example ID
   */
  private generateExampleId(code: string): string {
    const hash = code.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `example-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Analyze trace for issues
   */
  private analyzeTraceForIssues(trace: ExecutionTrace): PotentialIssue[] {
    const issues = [...trace.potentialIssues];

    // Check for low confidence steps
    const lowConfidenceSteps = trace.executionSteps.filter(
      (s) => s.confidence < 0.5,
    );
    if (lowConfidenceSteps.length > trace.executionSteps.length * 0.3) {
      issues.push({
        severity: "warning",
        type: "other",
        location: { line: 0 },
        description: "Many execution steps have low confidence",
        suggestion: "Manual review recommended for this example",
      });
    }

    // Check if execution didn't reach the end
    if (!trace.reachedEnd) {
      issues.push({
        severity: "warning",
        type: "other",
        location: { line: 0 },
        description: "Execution simulation did not complete normally",
        suggestion: "Check for infinite loops or early termination",
      });
    }

    return issues;
  }

  /**
   * Check if trace behavior matches expected documentation
   */
  private async checkBehaviorMatch(
    trace: ExecutionTrace,
    expectedBehavior?: string,
  ): Promise<boolean> {
    if (!expectedBehavior) return true;

    // If LLM is available, use it for semantic comparison
    if (this.llmClient) {
      try {
        const prompt = `Compare the following execution trace with the expected behavior.

## Execution Trace Summary:
- Steps: ${trace.executionSteps.length}
- Variables: ${Object.keys(trace.variablesAccessed).join(", ")}
- Issues found: ${trace.potentialIssues.length}
- Reached end: ${trace.reachedEnd}

## Expected Behavior:
${expectedBehavior}

Does the execution match the expected behavior? Respond with JSON:
{
  "matches": <boolean>,
  "reason": "<explanation>"
}`;

        const response = await this.llmClient.complete(prompt);
        const parsed = JSON.parse(
          response.replace(/```json\n?/g, "").replace(/```\n?$/g, ""),
        );
        return Boolean(parsed.matches);
      } catch {
        return true; // Default to matching if comparison fails
      }
    }

    return true;
  }

  /**
   * Build call graph node recursively
   */
  private async buildCallGraphNode(
    func: FunctionSignature,
    analysis: ASTAnalysisResult,
    depth: number,
    maxDepth: number,
    visited: Set<string>,
  ): Promise<CallGraphNode> {
    visited.add(func.name);

    const node: CallGraphNode = {
      function: func,
      location: {
        file: analysis.filePath,
        line: func.startLine,
      },
      calls: [],
      conditionals: [],
      raises: [],
      depth,
    };

    if (depth >= maxDepth) return node;

    // Find called functions
    for (const calledName of func.dependencies) {
      if (!visited.has(calledName)) {
        const calledFunc = analysis.functions.find(
          (f) => f.name === calledName,
        );
        if (calledFunc) {
          const childNode = await this.buildCallGraphNode(
            calledFunc,
            analysis,
            depth + 1,
            maxDepth,
            visited,
          );
          node.calls.push(childNode);
        }
      }
    }

    return node;
  }

  /**
   * Create empty call graph node
   */
  private createEmptyNode(name: string): CallGraphNode {
    return {
      function: {
        name,
        parameters: [],
        returnType: null,
        isAsync: false,
        isExported: false,
        isPublic: true,
        docComment: null,
        startLine: 0,
        endLine: 0,
        complexity: 0,
        dependencies: [],
      },
      location: { file: "unknown", line: 0 },
      calls: [],
      conditionals: [],
      raises: [],
      depth: 0,
    };
  }
}

/**
 * Factory function to create an execution simulator
 */
export function createExecutionSimulator(
  options?: SimulationOptions,
): ExecutionSimulator {
  return new ExecutionSimulator(options);
}
