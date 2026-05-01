/**
 * Semantic Code Analyzer (Phase 3)
 *
 * Provides AST-based semantic analysis of code changes.
 * LLM-based analysis was removed in v0.6.0 (ADR-014).
 */

import { ASTAnalyzer, CodeDiff } from "./ast-analyzer.js";

export interface SemanticAnalysisOptions {
  confidenceThreshold?: number;
  /** @deprecated useLLM is ignored since v0.6.0 — analysis is always AST-only */
  useLLM?: boolean;
  /** @deprecated llmConfig is ignored since v0.6.0 */
  llmConfig?: {
    provider?: string;
    apiKey?: string;
    model?: string;
  };
  /** @deprecated includeASTFallback is ignored since v0.6.0 — analysis is always AST-only */
  includeASTFallback?: boolean;
}

export interface SemanticAnalysis {
  hasBehavioralChange: boolean;
  breakingForExamples: boolean;
  changeDescription: string;
  affectedDocSections: string[];
  confidence: number;
}

export interface EnhancedSemanticAnalysis extends SemanticAnalysis {
  /** Always 'ast' since v0.6.0 */
  analysisMode: "ast";
  astDiffs?: CodeDiff[];
  /** Always false since v0.6.0 */
  llmAvailable: false;
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
  simulationResult: {
    success: boolean;
    expectedOutput: string;
    actualOutput: string;
    matches: boolean;
    differences: string[];
    confidence: number;
  };
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
 * Semantic Analyzer — AST-only mode (v0.6.0+)
 *
 * The LLM-based analysis path was removed in v0.6.0. All analysis is
 * performed using AST heuristics. See ADR-014 and the v0.6.0 migration guide.
 */
export class SemanticAnalyzer {
  private astAnalyzer: ASTAnalyzer;
  private confidenceThreshold: number;
  private initialized: boolean = false;

  constructor(options: SemanticAnalysisOptions = {}) {
    this.astAnalyzer = new ASTAnalyzer();
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
  }

  /**
   * Initialize the analyzer
   */
  async initialize(): Promise<void> {
    await this.astAnalyzer.initialize();
    this.initialized = true;
  }

  /**
   * Always returns false — LLM support was removed in v0.6.0.
   * @deprecated Check removed in favour of always returning false.
   */
  isLLMAvailable(): false {
    return false;
  }

  /**
   * Analyze semantic impact of code changes using AST heuristics
   */
  async analyzeSemanticImpact(
    codeBefore: string,
    codeAfter: string,
    functionName?: string,
  ): Promise<EnhancedSemanticAnalysis> {
    if (!this.initialized) {
      await this.initialize();
    }

    const timestamp = new Date().toISOString();
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
   * Perform AST-based analysis.
   * Note: This is a simplified heuristic analysis for quick fallback.
   * For full AST parsing, use the astAnalyzer.compareASTs() method directly.
   */
  private async performASTAnalysis(
    codeBefore: string,
    codeAfter: string,
    functionName?: string,
  ): Promise<ASTAnalysisOutput> {
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
   * Validate code examples — always requires manual review in v0.6.0+.
   *
   * LLM-based simulation was removed. This method now immediately signals
   * that manual review is required.
   */
  async validateExamples(
    _examples: string[],
    _implementation: string,
  ): Promise<CodeValidationResult> {
    return {
      isValid: true,
      examples: [],
      overallConfidence: 0,
      requiresManualReview: true,
      suggestions: ["LLM not available - manual validation required"],
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
