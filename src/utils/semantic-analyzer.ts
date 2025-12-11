/**
 * Semantic Code Analyzer (Phase 3)
 *
 * Provides semantic analysis of code changes using LLM integration,
 * with fallback to AST-based analysis when LLM is unavailable.
 */

import { ASTAnalyzer, CodeDiff } from "./ast-analyzer.js";
import {
  createLLMClient,
  LLMClient,
  SemanticAnalysis,
  SimulationResult,
} from "./llm-client.js";

export interface SemanticAnalysisOptions {
  useLLM?: boolean;
  confidenceThreshold?: number;
  includeASTFallback?: boolean;
  llmConfig?: {
    provider?: "deepseek" | "openai" | "anthropic" | "ollama";
    apiKey?: string;
    model?: string;
  };
}

export interface EnhancedSemanticAnalysis extends SemanticAnalysis {
  analysisMode: "llm" | "ast" | "hybrid";
  astDiffs?: CodeDiff[];
  llmAvailable: boolean;
  timestamp: string;
}

export interface CodeValidationResult {
  isValid: boolean;
  examples: ExampleValidation[];
  overallConfidence: number;
  requiresManualReview: boolean;
  suggestions: string[];
}

export interface ExampleValidation {
  exampleCode: string;
  simulationResult: SimulationResult;
  isValid: boolean;
  issues: string[];
}

// Type alias for AST analysis result to improve readability
type ASTAnalysisOutput = {
  hasSignificantChanges: boolean;
  hasBreakingChanges: boolean;
  description: string;
  affectedSections: string[];
  confidence: number;
  diffs: CodeDiff[];
};

/**
 * Semantic Analyzer with LLM integration and AST fallback
 */
export class SemanticAnalyzer {
  private astAnalyzer: ASTAnalyzer;
  private llmClient: LLMClient | null;
  private confidenceThreshold: number;
  private initialized: boolean = false;

  constructor(options: SemanticAnalysisOptions = {}) {
    this.astAnalyzer = new ASTAnalyzer();
    this.confidenceThreshold = options.confidenceThreshold || 0.7;

    // Try to create LLM client if enabled (default: true)
    const useLLM = options.useLLM !== false;
    this.llmClient = useLLM ? createLLMClient(options.llmConfig) : null;
  }

  /**
   * Initialize the analyzer
   */
  async initialize(): Promise<void> {
    await this.astAnalyzer.initialize();
    this.initialized = true;
  }

  /**
   * Check if LLM is available for semantic analysis
   */
  isLLMAvailable(): boolean {
    return this.llmClient !== null;
  }

  /**
   * Analyze semantic impact of code changes
   */
  async analyzeSemanticImpact(
    codeBefore: string,
    codeAfter: string,
    functionName?: string,
  ): Promise<EnhancedSemanticAnalysis> {
    // Ensure analyzer is initialized before use
    if (!this.initialized) {
      await this.initialize();
    }

    const timestamp = new Date().toISOString();

    // Try LLM-based analysis first
    if (this.llmClient) {
      try {
        const llmAnalysis = await this.llmClient.analyzeCodeChange(
          codeBefore,
          codeAfter,
        );

        // If confidence is high enough, return LLM result
        if (llmAnalysis.confidence >= this.confidenceThreshold) {
          return {
            ...llmAnalysis,
            analysisMode: "llm",
            llmAvailable: true,
            timestamp,
          };
        }

        // Low confidence: combine with AST analysis
        const astAnalysis = await this.performASTAnalysis(
          codeBefore,
          codeAfter,
          functionName,
        );
        return this.combineAnalyses(llmAnalysis, astAnalysis, timestamp);
      } catch (error) {
        // LLM failed, fall back to AST
        console.warn("LLM analysis failed, falling back to AST:", error);
      }
    }

    // Fallback to AST-only analysis
    const astAnalysis = await this.performASTAnalysis(
      codeBefore,
      codeAfter,
      functionName,
    );
    return {
      hasBehavioralChange: astAnalysis.hasSignificantChanges,
      breakingForExamples: astAnalysis.hasBreakingChanges,
      changeDescription: astAnalysis.description,
      affectedDocSections: astAnalysis.affectedSections,
      confidence: astAnalysis.confidence,
      analysisMode: "ast",
      astDiffs: astAnalysis.diffs,
      llmAvailable: false,
      timestamp,
    };
  }

  /**
   * Perform AST-based analysis (fallback mode)
   * Note: This is a simplified heuristic analysis for quick fallback.
   * For full AST parsing, use the astAnalyzer.compareASTs() method directly.
   */
  private async performASTAnalysis(
    codeBefore: string,
    codeAfter: string,
    functionName?: string,
  ): Promise<ASTAnalysisOutput> {
    // Simplified heuristic analysis for quick fallback
    // Full AST analysis would use this.astAnalyzer.analyzeFile() and compareASTs()

    const diffs: CodeDiff[] = [];
    let hasBreakingChanges = false;
    let hasSignificantChanges = false;

    // Detect function signature changes
    const beforeHasAsync = codeBefore.includes("async");
    const afterHasAsync = codeAfter.includes("async");
    if (beforeHasAsync !== afterHasAsync) {
      diffs.push({
        type: "modified",
        category: "function",
        name: functionName || "unknown",
        details: "Async modifier changed",
        impactLevel: "major",
      });
      hasSignificantChanges = true;
    }

    // Detect parameter changes (simplified)
    const beforeParams = this.extractParameters(codeBefore);
    const afterParams = this.extractParameters(codeAfter);
    if (beforeParams !== afterParams) {
      diffs.push({
        type: "modified",
        category: "function",
        name: functionName || "unknown",
        details: "Function parameters changed",
        oldSignature: beforeParams,
        newSignature: afterParams,
        impactLevel: "breaking",
      });
      hasBreakingChanges = true;
      hasSignificantChanges = true;
    }

    // Detect return type changes
    const beforeReturn = this.extractReturnType(codeBefore);
    const afterReturn = this.extractReturnType(codeAfter);
    if (beforeReturn !== afterReturn) {
      diffs.push({
        type: "modified",
        category: "function",
        name: functionName || "unknown",
        details: "Return type changed",
        impactLevel: "breaking",
      });
      hasBreakingChanges = true;
      hasSignificantChanges = true;
    }

    // Detect implementation changes
    if (codeBefore !== codeAfter && diffs.length === 0) {
      diffs.push({
        type: "modified",
        category: "function",
        name: functionName || "unknown",
        details: "Implementation changed",
        impactLevel: "minor",
      });
      hasSignificantChanges = true;
    }

    const description = this.generateChangeDescription(diffs);
    const affectedSections = this.determineAffectedSections(diffs);

    return {
      hasSignificantChanges,
      hasBreakingChanges,
      description,
      affectedSections,
      confidence: 0.6, // AST analysis has moderate confidence
      diffs,
    };
  }

  /**
   * Extract function parameters (simplified)
   */
  private extractParameters(code: string): string {
    const match = code.match(/\(([^)]*)\)/);
    return match ? match[1].trim() : "";
  }

  /**
   * Extract return type (simplified)
   */
  private extractReturnType(code: string): string {
    const match = code.match(/:\s*([^{=>\s]+)/);
    return match ? match[1].trim() : "void";
  }

  /**
   * Generate human-readable change description
   */
  private generateChangeDescription(diffs: CodeDiff[]): string {
    if (diffs.length === 0) {
      return "No significant changes detected";
    }

    const breakingChanges = diffs.filter((d) => d.impactLevel === "breaking");
    if (breakingChanges.length > 0) {
      return `Breaking changes detected: ${breakingChanges
        .map((d) => d.details)
        .join(", ")}`;
    }

    const majorChanges = diffs.filter((d) => d.impactLevel === "major");
    if (majorChanges.length > 0) {
      return `Major changes detected: ${majorChanges
        .map((d) => d.details)
        .join(", ")}`;
    }

    return `Minor changes detected: ${diffs.map((d) => d.details).join(", ")}`;
  }

  /**
   * Determine which documentation sections are affected
   */
  private determineAffectedSections(diffs: CodeDiff[]): string[] {
    const sections = new Set<string>();

    for (const diff of diffs) {
      if (diff.impactLevel === "breaking") {
        sections.add("API Reference");
        sections.add("Migration Guide");
      }
      if (diff.category === "function") {
        sections.add("API Reference");
        sections.add("Code Examples");
      }
      if (diff.category === "interface" || diff.category === "type") {
        sections.add("Type Definitions");
        sections.add("API Reference");
      }
    }

    return Array.from(sections);
  }

  /**
   * Combine LLM and AST analyses for hybrid approach
   */
  private combineAnalyses(
    llmAnalysis: SemanticAnalysis,
    astAnalysis: ASTAnalysisOutput,
    timestamp: string,
  ): EnhancedSemanticAnalysis {
    // Merge affected sections
    const allSections = new Set([
      ...llmAnalysis.affectedDocSections,
      ...astAnalysis.affectedSections,
    ]);

    // Take the more conservative assessment
    const hasBehavioralChange =
      llmAnalysis.hasBehavioralChange || astAnalysis.hasSignificantChanges;
    const breakingForExamples =
      llmAnalysis.breakingForExamples || astAnalysis.hasBreakingChanges;

    // Combine descriptions
    const description = `${llmAnalysis.changeDescription}. AST analysis: ${astAnalysis.description}`;

    // Average confidence, weighted toward AST for reliability
    const confidence =
      llmAnalysis.confidence * 0.6 + astAnalysis.confidence * 0.4;

    return {
      hasBehavioralChange,
      breakingForExamples,
      changeDescription: description,
      affectedDocSections: Array.from(allSections),
      confidence,
      analysisMode: "hybrid",
      astDiffs: astAnalysis.diffs,
      llmAvailable: true,
      timestamp,
    };
  }

  /**
   * Validate code examples against implementation
   */
  async validateExamples(
    examples: string[],
    implementation: string,
  ): Promise<CodeValidationResult> {
    if (!this.llmClient) {
      return {
        isValid: true,
        examples: [],
        overallConfidence: 0,
        requiresManualReview: true,
        suggestions: ["LLM not available - manual validation required"],
      };
    }

    const validations: ExampleValidation[] = [];

    for (const example of examples) {
      try {
        const simulation = await this.llmClient.simulateExecution(
          example,
          implementation,
        );
        validations.push({
          exampleCode: example,
          simulationResult: simulation,
          isValid: simulation.matches,
          issues: simulation.matches ? [] : simulation.differences,
        });
      } catch (error) {
        validations.push({
          exampleCode: example,
          simulationResult: {
            success: false,
            expectedOutput: "",
            actualOutput: "",
            matches: false,
            differences: [
              `Validation failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            ],
            confidence: 0,
          },
          isValid: false,
          issues: ["Validation failed"],
        });
      }
    }

    const validExamples = validations.filter((v) => v.isValid).length;
    const overallConfidence =
      validations.reduce((sum, v) => sum + v.simulationResult.confidence, 0) /
      validations.length;
    const isValid = validExamples === examples.length;
    const requiresManualReview = overallConfidence < this.confidenceThreshold;

    const suggestions: string[] = [];
    if (!isValid) {
      suggestions.push(
        `${examples.length - validExamples} example(s) may be invalid`,
      );
    }
    if (requiresManualReview) {
      suggestions.push("Low confidence - manual review recommended");
    }

    return {
      isValid,
      examples: validations,
      overallConfidence,
      requiresManualReview,
      suggestions,
    };
  }

  /**
   * Batch analyze multiple code changes
   */
  async analyzeBatch(
    changes: Array<{ before: string; after: string; name?: string }>,
  ): Promise<EnhancedSemanticAnalysis[]> {
    const results: EnhancedSemanticAnalysis[] = [];

    for (const change of changes) {
      const analysis = await this.analyzeSemanticImpact(
        change.before,
        change.after,
        change.name,
      );
      results.push(analysis);
    }

    return results;
  }
}

/**
 * Utility function to create a semantic analyzer with default configuration
 */
export function createSemanticAnalyzer(
  options?: SemanticAnalysisOptions,
): SemanticAnalyzer {
  return new SemanticAnalyzer(options);
}
