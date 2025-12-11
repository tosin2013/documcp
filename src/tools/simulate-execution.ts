/**
 * MCP Tool: Simulate Execution (Issue #73)
 *
 * Provides LLM-based code execution simulation for documentation validation.
 * Traces code execution paths without running code, identifying potential issues.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";
import {
  createExecutionSimulator,
  ExecutionTrace,
  ExampleValidationResult,
  SimulationOptions,
  CallGraph,
} from "../utils/execution-simulator.js";
import { ASTAnalyzer } from "../utils/ast-analyzer.js";

/**
 * Input schema for the simulate_execution tool
 */
export interface SimulateExecutionInput {
  exampleCode: string;
  implementationCode?: string;
  implementationPath?: string;
  entryPoint?: string;
  expectedBehavior?: string;
  options?: SimulationOptions;
}

/**
 * Result type for execution simulation
 */
export interface SimulateExecutionResult {
  success: boolean;
  trace: ExecutionTrace;
  validation?: ExampleValidationResult;
  callGraph?: CallGraph;
  summary: string;
  recommendations: string[];
}

/**
 * MCP Tool definition for execution simulation
 */
export const simulateExecution: Tool = {
  name: "simulate_execution",
  description:
    "Simulate code execution using LLM to trace execution paths without running the code. " +
    "Validates documentation examples by predicting behavior, detecting potential issues " +
    "(null references, type mismatches, unreachable code), and comparing against expected results. " +
    "Supports building call graphs for complex execution path analysis.",
  inputSchema: {
    type: "object",
    properties: {
      exampleCode: {
        type: "string",
        description: "The code example to simulate (from documentation)",
      },
      implementationCode: {
        type: "string",
        description:
          "The actual implementation code to trace against (if not using implementationPath)",
      },
      implementationPath: {
        type: "string",
        description:
          "Path to the implementation file (alternative to implementationCode)",
      },
      entryPoint: {
        type: "string",
        description:
          "Function name to start tracing from (auto-detected if not provided)",
      },
      expectedBehavior: {
        type: "string",
        description: "Description of expected behavior for validation",
      },
      options: {
        type: "object",
        properties: {
          maxDepth: {
            type: "number",
            description: "Maximum call depth to trace (default: 10)",
          },
          maxSteps: {
            type: "number",
            description: "Maximum execution steps to simulate (default: 100)",
          },
          timeoutMs: {
            type: "number",
            description:
              "Timeout for simulation in milliseconds (default: 30000)",
          },
          includeCallGraph: {
            type: "boolean",
            description: "Include call graph in results (default: true)",
          },
          detectNullRefs: {
            type: "boolean",
            description:
              "Detect potential null/undefined references (default: true)",
          },
          detectTypeMismatches: {
            type: "boolean",
            description: "Detect type mismatches (default: true)",
          },
          detectUnreachableCode: {
            type: "boolean",
            description: "Detect unreachable code (default: true)",
          },
          confidenceThreshold: {
            type: "number",
            description: "Minimum confidence threshold (0-1, default: 0.7)",
          },
        },
      },
    },
    required: ["exampleCode"],
  },
};

/**
 * Handle execution simulation request
 */
export async function handleSimulateExecution(
  args: SimulateExecutionInput,
  context?: any,
): Promise<SimulateExecutionResult> {
  await context?.info?.("🔬 Starting execution simulation...");

  const {
    exampleCode,
    implementationCode,
    implementationPath,
    entryPoint,
    expectedBehavior,
    options,
  } = args;

  // Get implementation code
  let implCode = implementationCode;
  if (!implCode && implementationPath) {
    try {
      implCode = await fs.readFile(implementationPath, "utf-8");
      await context?.info?.(
        `📄 Loaded implementation from ${path.basename(implementationPath)}`,
      );
    } catch (error) {
      return {
        success: false,
        trace: createEmptyTrace(),
        summary: `Failed to load implementation file: ${implementationPath}`,
        recommendations: [
          "Verify the implementation path exists and is readable",
        ],
      };
    }
  }

  if (!implCode) {
    // Use example code as implementation if none provided
    implCode = exampleCode;
    await context?.info?.("ℹ️ No implementation provided, using example code");
  }

  // Create simulator
  const simulator = createExecutionSimulator(options);
  const isLLMAvailable = simulator.isLLMAvailable();

  if (!isLLMAvailable) {
    await context?.info?.(
      "⚠️ LLM not available, using static analysis fallback",
    );
  }

  try {
    // Perform simulation
    await context?.info?.("🔄 Simulating execution...");
    const trace = await simulator.simulateExecution(
      exampleCode,
      implCode,
      entryPoint,
    );

    // Validate against expected behavior if provided
    let validation: ExampleValidationResult | undefined;
    if (expectedBehavior) {
      await context?.info?.("📋 Validating against expected behavior...");
      validation = await simulator.validateExample(
        exampleCode,
        implCode,
        expectedBehavior,
      );
    }

    // Build call graph if requested
    let callGraph: CallGraph | undefined;
    if (options?.includeCallGraph !== false && implementationPath) {
      await context?.info?.("🌳 Building call graph...");
      try {
        const astAnalyzer = new ASTAnalyzer();
        await astAnalyzer.initialize();
        const analysis = await astAnalyzer.analyzeFile(implementationPath);
        if (analysis && trace.entryPoint) {
          callGraph = await simulator.buildCallGraph(
            trace.entryPoint,
            analysis,
          );
        }
      } catch (error) {
        // Call graph is optional, don't fail on error
        await context?.info?.("⚠️ Could not build call graph");
      }
    }

    // Generate summary and recommendations
    const summary = generateSummary(trace, validation, isLLMAvailable);
    const recommendations = generateRecommendations(trace, validation);

    const issueCount = trace.potentialIssues.length;
    const confidencePercent = Math.round(trace.confidenceScore * 100);
    const status =
      issueCount === 0
        ? "✅ No issues found"
        : `⚠️ ${issueCount} issue(s) detected`;

    await context?.info?.(`${status} (${confidencePercent}% confidence)`);

    return {
      success: true,
      trace,
      validation,
      callGraph,
      summary,
      recommendations,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await context?.info?.(`❌ Simulation failed: ${errorMessage}`);

    return {
      success: false,
      trace: createEmptyTrace(),
      summary: `Simulation failed: ${errorMessage}`,
      recommendations: [
        "Check that the code is valid TypeScript/JavaScript",
        "Verify the implementation is available",
        "Try with a simpler code example",
      ],
    };
  }
}

/**
 * Create an empty execution trace for error cases
 */
function createEmptyTrace(): ExecutionTrace {
  return {
    exampleId: "error",
    entryPoint: "unknown",
    executionSteps: [],
    variablesAccessed: {},
    potentialIssues: [],
    confidenceScore: 0,
    executionPath: [],
    reachedEnd: false,
    simulationDuration: 0,
  };
}

/**
 * Generate human-readable summary of simulation results
 */
function generateSummary(
  trace: ExecutionTrace,
  validation?: ExampleValidationResult,
  isLLMAvailable?: boolean,
): string {
  const parts: string[] = [];

  // Analysis mode
  parts.push(
    isLLMAvailable
      ? "Execution simulated using LLM-based analysis"
      : "Execution analyzed using static analysis (LLM unavailable)",
  );

  // Execution overview
  parts.push(`Traced ${trace.executionSteps.length} execution step(s)`);
  parts.push(
    `${Object.keys(trace.variablesAccessed).length} variable(s) tracked`,
  );

  // Confidence
  const confidencePercent = Math.round(trace.confidenceScore * 100);
  let confidenceLabel = "low";
  if (confidencePercent >= 80) confidenceLabel = "high";
  else if (confidencePercent >= 50) confidenceLabel = "moderate";
  parts.push(`Confidence: ${confidencePercent}% (${confidenceLabel})`);

  // Completion status
  if (trace.reachedEnd) {
    parts.push("Execution completed normally");
  } else {
    parts.push(
      "Execution did not complete (possible early termination or error)",
    );
  }

  // Issues
  if (trace.potentialIssues.length > 0) {
    const errors = trace.potentialIssues.filter(
      (i) => i.severity === "error",
    ).length;
    const warnings = trace.potentialIssues.filter(
      (i) => i.severity === "warning",
    ).length;
    const infos = trace.potentialIssues.filter(
      (i) => i.severity === "info",
    ).length;

    const issueParts: string[] = [];
    if (errors > 0) issueParts.push(`${errors} error(s)`);
    if (warnings > 0) issueParts.push(`${warnings} warning(s)`);
    if (infos > 0) issueParts.push(`${infos} info(s)`);

    parts.push(`Issues detected: ${issueParts.join(", ")}`);
  } else {
    parts.push("No issues detected");
  }

  // Validation result
  if (validation) {
    parts.push(
      validation.isValid
        ? "Example validation: PASSED"
        : "Example validation: FAILED",
    );
    if (validation.matchesDocumentation) {
      parts.push("Behavior matches documentation");
    }
  }

  return parts.join(". ") + ".";
}

/**
 * Generate recommendations based on simulation results
 */
function generateRecommendations(
  trace: ExecutionTrace,
  validation?: ExampleValidationResult,
): string[] {
  const recommendations: string[] = [];

  // Low confidence recommendations
  if (trace.confidenceScore < 0.5) {
    recommendations.push(
      "Low simulation confidence - manual code review strongly recommended",
    );
    recommendations.push(
      "Consider breaking down the example into smaller, testable units",
    );
  } else if (trace.confidenceScore < 0.7) {
    recommendations.push(
      "Moderate simulation confidence - review flagged areas manually",
    );
  }

  // Issue-specific recommendations
  const issueTypes = new Set(trace.potentialIssues.map((i) => i.type));

  if (issueTypes.has("null-reference")) {
    recommendations.push(
      "Add null/undefined checks or use optional chaining (?.) for safer property access",
    );
  }

  if (issueTypes.has("type-mismatch")) {
    recommendations.push(
      "Review type annotations and ensure example types match implementation",
    );
  }

  if (issueTypes.has("undefined-variable")) {
    recommendations.push(
      "Ensure all variables used in examples are properly defined or imported",
    );
  }

  if (issueTypes.has("unreachable-code")) {
    recommendations.push(
      "Review control flow - some code paths may never execute",
    );
  }

  if (issueTypes.has("missing-error-handling")) {
    recommendations.push(
      "Add try-catch blocks for async operations and potential error conditions",
    );
  }

  // Execution path recommendations
  if (!trace.reachedEnd) {
    recommendations.push(
      "Execution did not complete - check for infinite loops, uncaught errors, or early returns",
    );
  }

  // Validation recommendations
  if (validation && !validation.isValid) {
    recommendations.push(...validation.suggestions);
  }

  // Default recommendation if everything looks good
  if (recommendations.length === 0) {
    recommendations.push(
      "Example simulation completed successfully - ready for documentation",
    );
  }

  return recommendations;
}

/**
 * Batch simulation tool definition
 */
export const batchSimulateExecution: Tool = {
  name: "batch_simulate_execution",
  description:
    "Simulate execution of multiple code examples in batch. " +
    "Useful for validating all examples in a documentation file at once.",
  inputSchema: {
    type: "object",
    properties: {
      examples: {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The code example",
            },
            implementationPath: {
              type: "string",
              description: "Path to implementation file",
            },
            expectedBehavior: {
              type: "string",
              description: "Expected behavior description",
            },
          },
          required: ["code"],
        },
        description: "Array of examples to simulate",
      },
      globalOptions: {
        type: "object",
        description: "Options applied to all simulations",
      },
    },
    required: ["examples"],
  },
};

/**
 * Handle batch execution simulation
 */
export async function handleBatchSimulateExecution(
  args: {
    examples: Array<{
      code: string;
      implementationPath?: string;
      expectedBehavior?: string;
    }>;
    globalOptions?: SimulationOptions;
  },
  context?: any,
): Promise<{
  success: boolean;
  results: SimulateExecutionResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageConfidence: number;
  };
}> {
  await context?.info?.(
    `🔬 Starting batch simulation of ${args.examples.length} example(s)...`,
  );

  const results: SimulateExecutionResult[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < args.examples.length; i++) {
    const example = args.examples[i];
    await context?.info?.(
      `📝 Simulating example ${i + 1}/${args.examples.length}...`,
    );

    let implCode: string | undefined;
    if (example.implementationPath) {
      try {
        implCode = await fs.readFile(example.implementationPath, "utf-8");
      } catch {
        // Use example as implementation
      }
    }

    const result = await handleSimulateExecution(
      {
        exampleCode: example.code,
        implementationCode: implCode,
        expectedBehavior: example.expectedBehavior,
        options: args.globalOptions,
      },
      context,
    );

    results.push(result);
    totalConfidence += result.trace.confidenceScore;
  }

  const passed = results.filter(
    (r) =>
      r.success &&
      r.trace.potentialIssues.filter((i) => i.severity === "error").length ===
        0,
  ).length;
  const failed = results.length - passed;
  const averageConfidence =
    results.length > 0 ? totalConfidence / results.length : 0;

  await context?.info?.(
    `✅ Batch simulation complete: ${passed} passed, ${failed} failed`,
  );

  return {
    success: failed === 0,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      averageConfidence,
    },
  };
}
