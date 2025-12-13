/**
 * Documentation Drift Detection System (Phase 3)
 *
 * Detects when code changes invalidate existing documentation
 * Provides automatic update suggestions based on code changes
 */

import { promises as fs } from "fs";
import path from "path";
import { ASTAnalyzer, ASTAnalysisResult, CodeDiff } from "./ast-analyzer.js";

export interface DriftDetectionResult {
  filePath: string;
  hasDrift: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  drifts: DocumentationDrift[];
  suggestions: DriftSuggestion[];
  impactAnalysis: ImpactAnalysis;
}

export interface DocumentationDrift {
  type: "outdated" | "incorrect" | "missing" | "breaking";
  affectedDocs: string[];
  codeChanges: CodeDiff[];
  description: string;
  detectedAt: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface DriftSuggestion {
  docFile: string;
  section: string;
  currentContent: string;
  suggestedContent: string;
  reasoning: string;
  confidence: number;
  autoApplicable: boolean;
}

export interface ImpactAnalysis {
  breakingChanges: number;
  majorChanges: number;
  minorChanges: number;
  affectedDocFiles: string[];
  estimatedUpdateEffort: "low" | "medium" | "high";
  requiresManualReview: boolean;
}

export interface DriftSnapshot {
  projectPath: string;
  timestamp: string;
  files: Map<string, ASTAnalysisResult>;
  documentation: Map<string, DocumentationSnapshot>;
}

export interface DocumentationSnapshot {
  filePath: string;
  contentHash: string;
  referencedCode: string[];
  lastUpdated: string;
  sections: DocumentationSection[];
}

export interface DocumentationSection {
  title: string;
  content: string;
  referencedFunctions: string[];
  referencedClasses: string[];
  referencedTypes: string[];
  codeExamples: CodeExample[];
  startLine: number;
  endLine: number;
}

export interface CodeExample {
  language: string;
  code: string;
  description: string;
  referencedSymbols: string[];
  diataxisType?: "tutorial" | "how-to" | "reference" | "explanation";
  validationHints?: {
    expectedBehavior?: string;
    dependencies?: string[];
    contextRequired?: boolean;
  };
}

/**
 * Priority scoring for documentation drift
 */
export interface DriftPriorityScore {
  overall: number; // 0-100
  factors: {
    codeComplexity: number; // 0-100
    usageFrequency: number; // 0-100
    changeMagnitude: number; // 0-100
    documentationCoverage: number; // 0-100
    staleness: number; // 0-100
    userFeedback: number; // 0-100
  };
  recommendation: "critical" | "high" | "medium" | "low";
  suggestedAction: string;
}

/**
 * Configuration for priority scoring weights
 */
export interface PriorityWeights {
  codeComplexity: number; // default: 0.20
  usageFrequency: number; // default: 0.25
  changeMagnitude: number; // default: 0.25
  documentationCoverage: number; // default: 0.15
  staleness: number; // default: 0.10
  userFeedback: number; // default: 0.05
}

/**
 * Extended drift detection result with priority scoring
 */
export interface PrioritizedDriftResult extends DriftDetectionResult {
  priorityScore?: DriftPriorityScore;
}

/**
 * Usage metadata for calculating usage frequency
 */
export interface UsageMetadata {
  filePath: string;
  functionCalls: Map<string, number>; // function name -> call count
  classInstantiations: Map<string, number>; // class name -> instantiation count
  imports: Map<string, number>; // symbol -> import count
}

/**
 * Main Drift Detector class
 */
export class DriftDetector {
  // Constants for code analysis
  private static readonly DESCRIPTION_LOOKBACK_LINES = 3;
  private static readonly IMPORT_REGEX =
    /import\s+.*?\s+from\s+["']([^"']+)["']/g;
  private static readonly REQUIRE_REGEX = /require\(["']([^"']+)["']\)/g;

  // Default priority weights
  private static readonly DEFAULT_WEIGHTS: PriorityWeights = {
    codeComplexity: 0.2,
    usageFrequency: 0.25,
    changeMagnitude: 0.25,
    documentationCoverage: 0.15,
    staleness: 0.1,
    userFeedback: 0.05,
  };

  private analyzer: ASTAnalyzer;
  private snapshotDir: string;
  private currentSnapshot: DriftSnapshot | null = null;
  private previousSnapshot: DriftSnapshot | null = null;
  private customWeights?: PriorityWeights;
  private userFeedbackIntegration?: (
    result: DriftDetectionResult,
  ) => Promise<number> | number;

  constructor(projectPath: string, snapshotDir?: string) {
    this.analyzer = new ASTAnalyzer();
    this.snapshotDir =
      snapshotDir || path.join(projectPath, ".documcp", "snapshots");
  }

  /**
   * Initialize the drift detector
   */
  async initialize(): Promise<void> {
    await this.analyzer.initialize();
    await fs.mkdir(this.snapshotDir, { recursive: true });
  }

  /**
   * Create a snapshot of the current codebase and documentation
   */
  async createSnapshot(
    projectPath: string,
    docsPath: string,
  ): Promise<DriftSnapshot> {
    const files = new Map<string, ASTAnalysisResult>();
    const documentation = new Map<string, DocumentationSnapshot>();

    // Analyze source files
    const sourceFiles = await this.findSourceFiles(projectPath);
    for (const filePath of sourceFiles) {
      const analysis = await this.analyzer.analyzeFile(filePath);
      if (analysis) {
        files.set(filePath, analysis);
      }
    }

    // Analyze documentation files
    const docFiles = await this.findDocumentationFiles(docsPath);
    for (const docPath of docFiles) {
      const docSnapshot = await this.analyzeDocumentation(docPath);
      if (docSnapshot) {
        documentation.set(docPath, docSnapshot);
      }
    }

    const snapshot: DriftSnapshot = {
      projectPath,
      timestamp: new Date().toISOString(),
      files,
      documentation,
    };

    // Save snapshot
    await this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Detect drift between two snapshots
   */
  async detectDrift(
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
  ): Promise<DriftDetectionResult[]> {
    const results: DriftDetectionResult[] = [];

    // Compare each file
    for (const [filePath, newAnalysis] of newSnapshot.files) {
      const oldAnalysis = oldSnapshot.files.get(filePath);

      if (!oldAnalysis) {
        // New file - check if documentation is needed
        continue;
      }

      // Detect code changes
      const codeDiffs = await this.analyzer.detectDrift(
        oldAnalysis,
        newAnalysis,
      );

      if (codeDiffs.length > 0) {
        // Find affected documentation
        const affectedDocs = this.findAffectedDocumentation(
          filePath,
          codeDiffs,
          newSnapshot.documentation,
        );

        // Report drift even if no documentation is affected
        // (missing documentation is also a type of drift)
        const driftResult = await this.analyzeDrift(
          filePath,
          codeDiffs,
          affectedDocs,
          oldSnapshot,
          newSnapshot,
        );

        results.push(driftResult);
      }
    }

    return results;
  }

  /**
   * Analyze drift and generate suggestions
   */
  private async analyzeDrift(
    filePath: string,
    codeDiffs: CodeDiff[],
    affectedDocs: string[],
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
  ): Promise<DriftDetectionResult> {
    const drifts: DocumentationDrift[] = [];
    const suggestions: DriftSuggestion[] = [];

    // Categorize drifts by severity
    const breakingChanges = codeDiffs.filter(
      (d) => d.impactLevel === "breaking",
    );
    const majorChanges = codeDiffs.filter((d) => d.impactLevel === "major");
    const minorChanges = codeDiffs.filter((d) => d.impactLevel === "minor");

    // Create drift entries
    for (const diff of codeDiffs) {
      const drift: DocumentationDrift = {
        type: this.determineDriftType(diff),
        affectedDocs,
        codeChanges: [diff],
        description: this.generateDriftDescription(diff),
        detectedAt: new Date().toISOString(),
        severity: this.mapImpactToSeverity(diff.impactLevel),
      };

      drifts.push(drift);

      // Generate suggestions for each affected doc
      for (const docPath of affectedDocs) {
        const docSnapshot = newSnapshot.documentation.get(docPath);
        if (docSnapshot) {
          const docSuggestions = await this.generateSuggestions(
            diff,
            docSnapshot,
            newSnapshot,
          );
          suggestions.push(...docSuggestions);
        }
      }
    }

    const impactAnalysis: ImpactAnalysis = {
      breakingChanges: breakingChanges.length,
      majorChanges: majorChanges.length,
      minorChanges: minorChanges.length,
      affectedDocFiles: affectedDocs,
      estimatedUpdateEffort: this.estimateUpdateEffort(drifts),
      requiresManualReview:
        breakingChanges.length > 0 || majorChanges.length > 3,
    };

    const severity = this.calculateOverallSeverity(drifts);

    return {
      filePath,
      hasDrift: drifts.length > 0,
      severity,
      drifts,
      suggestions,
      impactAnalysis,
    };
  }

  /**
   * Generate update suggestions for documentation
   */
  private async generateSuggestions(
    diff: CodeDiff,
    docSnapshot: DocumentationSnapshot,
    snapshot: DriftSnapshot,
  ): Promise<DriftSuggestion[]> {
    const suggestions: DriftSuggestion[] = [];

    // Find sections that reference the changed code
    for (const section of docSnapshot.sections) {
      const isAffected = this.isSectionAffected(section, diff);

      if (isAffected) {
        const suggestion = await this.createSuggestion(
          diff,
          docSnapshot,
          section,
          snapshot,
        );

        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Create a specific suggestion for a documentation section
   */
  private async createSuggestion(
    diff: CodeDiff,
    docSnapshot: DocumentationSnapshot,
    section: DocumentationSection,
    snapshot: DriftSnapshot,
  ): Promise<DriftSuggestion | null> {
    let suggestedContent = section.content;
    let reasoning = "";
    let confidence = 0.5;
    let autoApplicable = false;

    switch (diff.type) {
      case "removed":
        reasoning = `The ${diff.category} '${diff.name}' has been removed from the codebase. This section should be updated or removed.`;
        suggestedContent = this.generateRemovalSuggestion(section, diff);
        confidence = 0.8;
        autoApplicable = false;
        break;

      case "added":
        reasoning = `A new ${diff.category} '${diff.name}' has been added. Consider documenting it.`;
        suggestedContent = this.generateAdditionSuggestion(
          section,
          diff,
          snapshot,
        );
        confidence = 0.6;
        autoApplicable = false;
        break;

      case "modified":
        reasoning = `The ${diff.category} '${diff.name}' has been modified: ${diff.details}`;
        suggestedContent = this.generateModificationSuggestion(
          section,
          diff,
          snapshot,
        );
        confidence = 0.7;
        autoApplicable = diff.impactLevel === "patch";
        break;
    }

    return {
      docFile: docSnapshot.filePath,
      section: section.title,
      currentContent: section.content,
      suggestedContent,
      reasoning,
      confidence,
      autoApplicable,
    };
  }

  /**
   * Generate suggestion for removed code
   */
  private generateRemovalSuggestion(
    section: DocumentationSection,
    diff: CodeDiff,
  ): string {
    let content = section.content;

    // Remove references to the deleted symbol
    const symbolRegex = new RegExp(`\\b${diff.name}\\b`, "g");
    content = content.replace(symbolRegex, `~~${diff.name}~~ (removed)`);

    // Add deprecation notice
    const notice = `\n\n> **Note**: The \`${diff.name}\` ${diff.category} has been removed in the latest version.\n`;
    content = notice + content;

    return content;
  }

  /**
   * Generate suggestion for added code
   */
  private generateAdditionSuggestion(
    section: DocumentationSection,
    diff: CodeDiff,
    _snapshot: DriftSnapshot,
  ): string {
    let content = section.content;

    // Add new section for the added symbol
    const additionNotice = `\n\n## ${diff.name}\n\nA new ${diff.category} has been added.\n\n`;

    // Try to extract signature if available
    if (diff.newSignature) {
      content +=
        additionNotice + `\`\`\`typescript\n${diff.newSignature}\n\`\`\`\n`;
    } else {
      content +=
        additionNotice +
        `> **Documentation needed**: Please document the \`${diff.name}\` ${diff.category}.\n`;
    }

    return content;
  }

  /**
   * Generate suggestion for modified code
   */
  private generateModificationSuggestion(
    section: DocumentationSection,
    diff: CodeDiff,
    _snapshot: DriftSnapshot,
  ): string {
    let content = section.content;

    // Update signature references
    if (diff.oldSignature && diff.newSignature) {
      content = content.replace(diff.oldSignature, diff.newSignature);
    }

    // Add update notice
    const updateNotice = `\n\n> **Updated**: ${diff.details}\n`;
    content = updateNotice + content;

    return content;
  }

  /**
   * Check if a section is affected by a code change
   */
  private isSectionAffected(
    section: DocumentationSection,
    diff: CodeDiff,
  ): boolean {
    switch (diff.category) {
      case "function":
        return section.referencedFunctions.includes(diff.name);
      case "class":
        return section.referencedClasses.includes(diff.name);
      case "interface":
      case "type":
        return section.referencedTypes.includes(diff.name);
      default:
        return false;
    }
  }

  /**
   * Find documentation files that reference changed code
   */
  private findAffectedDocumentation(
    filePath: string,
    codeDiffs: CodeDiff[],
    documentation: Map<string, DocumentationSnapshot>,
  ): string[] {
    const affected: string[] = [];

    for (const [docPath, docSnapshot] of documentation) {
      // Check if doc references the changed file
      if (docSnapshot.referencedCode.includes(filePath)) {
        affected.push(docPath);
        continue;
      }

      // Check if doc references changed symbols
      for (const diff of codeDiffs) {
        for (const section of docSnapshot.sections) {
          if (this.isSectionAffected(section, diff)) {
            affected.push(docPath);
            break;
          }
        }
      }
    }

    return [...new Set(affected)];
  }

  /**
   * Analyze a documentation file
   */
  private async analyzeDocumentation(
    docPath: string,
  ): Promise<DocumentationSnapshot | null> {
    try {
      const content = await fs.readFile(docPath, "utf-8");
      const crypto = await import("crypto");
      const contentHash = crypto
        .createHash("sha256")
        .update(content)
        .digest("hex");
      const stats = await fs.stat(docPath);

      const sections = this.extractDocSections(content, docPath);
      const referencedCode = this.extractCodeReferences(content);

      return {
        filePath: docPath,
        contentHash,
        referencedCode,
        lastUpdated: stats.mtime.toISOString(),
        sections,
      };
    } catch (error) {
      console.warn(`Failed to analyze documentation ${docPath}:`, error);
      return null;
    }
  }

  /**
   * Generate validation hints based on Diataxis type
   */
  private generateValidationHints(
    diataxisType: "tutorial" | "how-to" | "reference" | "explanation",
    code: string,
    language: string,
  ): {
    expectedBehavior?: string;
    dependencies?: string[];
    contextRequired?: boolean;
  } {
    const hints: {
      expectedBehavior?: string;
      dependencies?: string[];
      contextRequired?: boolean;
    } = {};

    // Default: no dependencies for reference and explanation types
    let dependencies: string[] = [];

    // Extract dependencies for executable types (tutorial, how-to)
    if (diataxisType === "tutorial" || diataxisType === "how-to") {
      dependencies = this.extractDependencies(code, language);
    }

    switch (diataxisType) {
      case "tutorial":
        // Tutorials should have complete, executable examples
        hints.expectedBehavior = "Complete step-by-step execution flow";
        hints.contextRequired = false; // Should be self-contained
        hints.dependencies = dependencies;
        break;

      case "how-to":
        // How-to guides focus on solving specific problems
        hints.expectedBehavior = "Practical outcome achievable";
        hints.contextRequired = true; // May require setup
        hints.dependencies = dependencies;
        break;

      case "reference":
        // Reference documentation shows API usage
        hints.expectedBehavior = "API signatures match implementation";
        hints.contextRequired = false;
        hints.dependencies = dependencies;
        break;

      case "explanation":
        // Explanation examples illustrate concepts
        hints.expectedBehavior = "Concepts align with code behavior";
        hints.contextRequired = true;
        hints.dependencies = dependencies;
        break;
    }

    return hints;
  }

  /**
   * Extract dependencies from code
   */
  private extractDependencies(code: string, language: string): string[] {
    const dependencies: string[] = [];

    switch (language.toLowerCase()) {
      case "typescript":
      case "javascript":
      case "tsx":
      case "jsx": {
        // Extract import statements
        const importMatches = code.matchAll(DriftDetector.IMPORT_REGEX);
        for (const match of importMatches) {
          dependencies.push(match[1]);
        }
        // Extract require statements
        const requireMatches = code.matchAll(DriftDetector.REQUIRE_REGEX);
        for (const match of requireMatches) {
          dependencies.push(match[1]);
        }
        break;
      }

      case "python": {
        // Extract "from X import Y" statements
        const pyFromImportMatches = code.matchAll(/^from\s+(\S+)\s+import/gm);
        for (const match of pyFromImportMatches) {
          dependencies.push(match[1]);
        }
        // Extract simple "import X" statements
        const pySimpleImportMatches = code.matchAll(/^import\s+(\S+)/gm);
        for (const match of pySimpleImportMatches) {
          dependencies.push(match[1]);
        }
        break;
      }

      case "go": {
        // Extract import statements
        const goImportMatches = code.matchAll(/import\s+["']([^"']+)["']/g);
        for (const match of goImportMatches) {
          dependencies.push(match[1]);
        }
        break;
      }

      case "rust": {
        // Extract use statements
        const useMatches = code.matchAll(/use\s+([^;]+);/g);
        for (const match of useMatches) {
          dependencies.push(match[1].split("::")[0]);
        }
        break;
      }

      case "java": {
        // Extract import statements
        const javaImportMatches = code.matchAll(/import\s+([^;]+);/g);
        for (const match of javaImportMatches) {
          dependencies.push(match[1]);
        }
        break;
      }
    }

    return [...new Set(dependencies)];
  }

  /**
   * Detect Diataxis type from file path
   */
  private detectDiataxisTypeFromPath(
    filePath: string,
  ): "tutorial" | "how-to" | "reference" | "explanation" | undefined {
    const lowerPath = filePath.toLowerCase();

    if (
      lowerPath.includes("/tutorial") ||
      lowerPath.includes("/tutorials") ||
      lowerPath.includes("getting-started") ||
      lowerPath.includes("getting_started")
    ) {
      return "tutorial";
    }

    if (
      lowerPath.includes("/how-to") ||
      lowerPath.includes("/howto") ||
      lowerPath.includes("/guides") ||
      lowerPath.includes("/guide")
    ) {
      return "how-to";
    }

    if (
      lowerPath.includes("/reference") ||
      lowerPath.includes("/api") ||
      lowerPath.includes("/api-reference")
    ) {
      return "reference";
    }

    if (
      lowerPath.includes("/explanation") ||
      lowerPath.includes("/concept") ||
      lowerPath.includes("/architecture") ||
      lowerPath.includes("/background")
    ) {
      return "explanation";
    }

    return undefined;
  }

  /**
   * Detect Diataxis type from frontmatter
   */
  private detectDiataxisTypeFromFrontmatter(
    content: string,
  ): "tutorial" | "how-to" | "reference" | "explanation" | undefined {
    // Look for YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return undefined;
    }

    const frontmatter = frontmatterMatch[1];

    // Check for explicit diataxis type
    const diataxisMatch = frontmatter.match(
      /diataxis[_-]?type:\s*["']?(tutorial|how-to|reference|explanation)["']?/i,
    );
    if (diataxisMatch) {
      return diataxisMatch[1] as
        | "tutorial"
        | "how-to"
        | "reference"
        | "explanation";
    }

    // Check for category field
    const categoryMatch = frontmatter.match(
      /category:\s*["']?(tutorial|how-to|reference|explanation)["']?/i,
    );
    if (categoryMatch) {
      return categoryMatch[1] as
        | "tutorial"
        | "how-to"
        | "reference"
        | "explanation";
    }

    return undefined;
  }

  /**
   * Infer Diataxis type from section content and context
   */
  private inferDiataxisTypeFromContext(
    sectionTitle: string,
    sectionContent: string,
  ): "tutorial" | "how-to" | "reference" | "explanation" | undefined {
    const title = sectionTitle.toLowerCase();
    const content = sectionContent.toLowerCase();

    // Tutorial indicators
    const tutorialIndicators = [
      "getting started",
      "introduction",
      "step-by-step",
      "learning",
      "beginner",
      "first steps",
      "walkthrough",
    ];
    if (
      tutorialIndicators.some(
        (indicator) => title.includes(indicator) || content.includes(indicator),
      )
    ) {
      return "tutorial";
    }

    // How-to indicators
    const howToIndicators = [
      "how to",
      "how do i",
      "recipe",
      "problem",
      "solution",
      "task",
      "accomplish",
    ];
    if (
      howToIndicators.some(
        (indicator) => title.includes(indicator) || content.includes(indicator),
      )
    ) {
      return "how-to";
    }

    // Reference indicators
    const referenceIndicators = [
      "api",
      "reference",
      "parameters",
      "returns",
      "arguments",
      "signature",
      "type",
      "interface",
    ];
    if (
      referenceIndicators.some(
        (indicator) => title.includes(indicator) || content.includes(indicator),
      )
    ) {
      return "reference";
    }

    // Explanation indicators
    const explanationIndicators = [
      "architecture",
      "concept",
      "background",
      "why",
      "understand",
      "theory",
      "design",
      "overview",
    ];
    if (
      explanationIndicators.some(
        (indicator) => title.includes(indicator) || content.includes(indicator),
      )
    ) {
      return "explanation";
    }

    return undefined;
  }

  /**
   * Extract sections from documentation
   * @param content - The markdown content to parse
   * @param filePath - The file path used for Diataxis type detection
   */
  private extractDocSections(
    content: string,
    filePath: string,
  ): DocumentationSection[] {
    const sections: DocumentationSection[] = [];
    const lines = content.split("\n");
    let currentSection: Partial<DocumentationSection> | null = null;
    let currentContent: string[] = [];

    // Detect Diataxis type from path and frontmatter
    const pathType = this.detectDiataxisTypeFromPath(filePath);
    const frontmatterType = this.detectDiataxisTypeFromFrontmatter(content);
    const documentType = frontmatterType || pathType;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join("\n");
          currentSection.endLine = i - 1;
          sections.push(currentSection as DocumentationSection);
        }

        const title = headingMatch[2];
        const referencedFunctions: string[] = [];
        const referencedClasses: string[] = [];

        // Extract function name from heading if it looks like a function signature
        // e.g., "## calculate(x: number): number" or "## myFunction()"
        const funcMatch = title.match(/^([a-z][A-Za-z0-9_]*)\s*\(/);
        if (funcMatch) {
          referencedFunctions.push(funcMatch[1]);
        }

        // Extract class name from heading if it starts with uppercase
        const classMatch = title.match(/^([A-Z][A-Za-z0-9_]*)/);
        if (classMatch && !funcMatch) {
          referencedClasses.push(classMatch[1]);
        }

        // Start new section
        currentSection = {
          title,
          startLine: i,
          referencedFunctions,
          referencedClasses,
          referencedTypes: [],
          codeExamples: [],
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);

        // Extract code examples
        if (line.startsWith("```")) {
          const langMatch = line.match(/```(\w+)/);
          const language = langMatch ? langMatch[1] : "text";
          const codeLines: string[] = [];
          const codeStartLine = i;
          i++;

          // Collect code lines
          while (i < lines.length && !lines[i].startsWith("```")) {
            codeLines.push(lines[i]);
            i++;
          }

          const codeContent = codeLines.join("\n");

          // Look for description before the code block
          let description = "";
          for (
            let j = Math.max(
              0,
              codeStartLine - DriftDetector.DESCRIPTION_LOOKBACK_LINES,
            );
            j < codeStartLine;
            j++
          ) {
            const descLine = lines[j].trim();
            if (descLine && !descLine.startsWith("#")) {
              description = descLine;
            }
          }

          // Determine Diataxis type for this code example
          let codeExampleType = documentType;
          if (!codeExampleType && currentSection.title) {
            // Infer from section context if not determined from document
            codeExampleType = this.inferDiataxisTypeFromContext(
              currentSection.title,
              currentContent.join("\n"),
            );
          }

          const codeExample: CodeExample = {
            language,
            code: codeContent,
            description,
            referencedSymbols: this.extractSymbolsFromCode(codeContent),
            diataxisType: codeExampleType,
          };

          // Add validation hints based on Diataxis type
          if (codeExampleType) {
            codeExample.validationHints = this.generateValidationHints(
              codeExampleType,
              codeContent,
              language,
            );
          }

          currentSection.codeExamples!.push(codeExample);
        }

        // Extract inline code references (with or without parentheses for functions)
        const inlineCodeMatches = line.matchAll(
          /`([A-Za-z_][A-Za-z0-9_]*)\(\)?`/g,
        );
        for (const match of inlineCodeMatches) {
          const symbol = match[1];
          // Heuristic: CamelCase = class/type, camelCase = function
          if (/^[A-Z]/.test(symbol)) {
            if (!currentSection.referencedClasses!.includes(symbol)) {
              currentSection.referencedClasses!.push(symbol);
            }
          } else {
            if (!currentSection.referencedFunctions!.includes(symbol)) {
              currentSection.referencedFunctions!.push(symbol);
            }
          }
        }

        // Also extract identifiers without parentheses
        const plainIdentifiers = line.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)`/g);
        for (const match of plainIdentifiers) {
          const symbol = match[1];
          if (/^[A-Z]/.test(symbol)) {
            if (!currentSection.referencedClasses!.includes(symbol)) {
              currentSection.referencedClasses!.push(symbol);
            }
          } else {
            if (!currentSection.referencedFunctions!.includes(symbol)) {
              currentSection.referencedFunctions!.push(symbol);
            }
          }
        }
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join("\n");
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection as DocumentationSection);
    }

    return sections;
  }

  /**
   * Extract code file references from documentation
   */
  private extractCodeReferences(content: string): string[] {
    const references: string[] = [];

    // Extract from markdown links
    const linkMatches = content.matchAll(
      /\[.*?\]\((.*?\.(ts|js|py|go|rs|java|rb).*?)\)/g,
    );
    for (const match of linkMatches) {
      references.push(match[1]);
    }

    // Extract from inline code
    const codeMatches = content.matchAll(
      /`([^`]+\.(ts|js|py|go|rs|java|rb))`/g,
    );
    for (const match of codeMatches) {
      references.push(match[1]);
    }

    return [...new Set(references)];
  }

  /**
   * Extract symbols from code examples
   */
  private extractSymbolsFromCode(code: string): string[] {
    const symbols: string[] = [];

    // Extract function calls
    const functionMatches = code.matchAll(/\b([a-z][A-Za-z0-9_]*)\s*\(/g);
    for (const match of functionMatches) {
      symbols.push(match[1]);
    }

    // Extract class/type references
    const classMatches = code.matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/g);
    for (const match of classMatches) {
      symbols.push(match[1]);
    }

    return [...new Set(symbols)];
  }

  /**
   * Find all source files in project
   */
  private async findSourceFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = [
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".py",
      ".go",
      ".rs",
      ".java",
      ".rb",
    ];

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            if (
              !["node_modules", "dist", "build", ".git", ".next"].includes(
                entry.name,
              )
            ) {
              await walk(fullPath);
            }
          } else {
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}:`, error);
      }
    };

    await walk(projectPath);
    return files;
  }

  /**
   * Find all documentation files
   */
  private async findDocumentationFiles(docsPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (
            entry.name.endsWith(".md") ||
            entry.name.endsWith(".mdx")
          ) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`Failed to read documentation directory ${dir}:`, error);
      }
    };

    try {
      await walk(docsPath);
    } catch {
      // Docs path doesn't exist
    }

    return files;
  }

  /**
   * Save snapshot to disk
   */
  private async saveSnapshot(snapshot: DriftSnapshot): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const snapshotPath = path.join(
      this.snapshotDir,
      `snapshot-${timestamp}.json`,
    );

    // Convert Maps to objects for JSON serialization
    const serializable = {
      projectPath: snapshot.projectPath,
      timestamp: snapshot.timestamp,
      files: Object.fromEntries(snapshot.files),
      documentation: Object.fromEntries(snapshot.documentation),
    };

    await fs.writeFile(snapshotPath, JSON.stringify(serializable, null, 2));
  }

  /**
   * Load the latest snapshot
   */
  async loadLatestSnapshot(): Promise<DriftSnapshot | null> {
    try {
      const files = await fs.readdir(this.snapshotDir);
      const snapshotFiles = files
        .filter((f) => f.startsWith("snapshot-"))
        .sort()
        .reverse();

      if (snapshotFiles.length === 0) return null;

      const latestPath = path.join(this.snapshotDir, snapshotFiles[0]);
      const content = await fs.readFile(latestPath, "utf-8");
      const data = JSON.parse(content);

      return {
        projectPath: data.projectPath,
        timestamp: data.timestamp,
        files: new Map(Object.entries(data.files)),
        documentation: new Map(Object.entries(data.documentation)),
      };
    } catch {
      return null;
    }
  }

  // Helper methods

  private determineDriftType(
    diff: CodeDiff,
  ): "outdated" | "incorrect" | "missing" | "breaking" {
    if (diff.impactLevel === "breaking") return "breaking";
    if (diff.type === "removed") return "incorrect";
    if (diff.type === "modified") return "outdated";
    return "missing";
  }

  private generateDriftDescription(diff: CodeDiff): string {
    const action =
      diff.type === "added"
        ? "added"
        : diff.type === "removed"
          ? "removed"
          : "modified";
    return `${diff.category} '${diff.name}' was ${action}: ${diff.details}`;
  }

  private mapImpactToSeverity(
    impact: "breaking" | "major" | "minor" | "patch",
  ): "low" | "medium" | "high" | "critical" {
    switch (impact) {
      case "breaking":
        return "critical";
      case "major":
        return "high";
      case "minor":
        return "medium";
      case "patch":
        return "low";
    }
  }

  private estimateUpdateEffort(
    drifts: DocumentationDrift[],
  ): "low" | "medium" | "high" {
    const critical = drifts.filter((d) => d.severity === "critical").length;
    const high = drifts.filter((d) => d.severity === "high").length;

    if (critical > 0 || high > 5) return "high";
    if (high > 0 || drifts.length > 10) return "medium";
    return "low";
  }

  private calculateOverallSeverity(
    drifts: DocumentationDrift[],
  ): "none" | "low" | "medium" | "high" | "critical" {
    if (drifts.length === 0) return "none";

    const hasCritical = drifts.some((d) => d.severity === "critical");
    if (hasCritical) return "critical";

    const hasHigh = drifts.some((d) => d.severity === "high");
    if (hasHigh) return "high";

    const hasMedium = drifts.some((d) => d.severity === "medium");
    if (hasMedium) return "medium";

    return "low";
  }

  // Priority Scoring Methods

  /**
   * Set custom weights for priority scoring
   * Note: Weights don't need to sum to 1.0 - they are applied as-is in the weighted sum
   */
  setCustomWeights(weights: Partial<PriorityWeights>): void {
    this.customWeights = {
      ...DriftDetector.DEFAULT_WEIGHTS,
      ...weights,
    };
  }

  /**
   * Get current weights (custom or default)
   */
  getWeights(): PriorityWeights {
    return this.customWeights || DriftDetector.DEFAULT_WEIGHTS;
  }

  /**
   * Calculate priority score for a drift detection result
   */
  calculatePriorityScore(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): DriftPriorityScore {
    const weights = this.getWeights();

    // Calculate individual factors
    const codeComplexity = this.calculateCodeComplexityScore(result, snapshot);
    const usageFrequency = this.calculateUsageFrequencyScore(
      result,
      snapshot,
      usageMetadata,
    );
    const changeMagnitude = this.calculateChangeMagnitudeScore(result);
    const documentationCoverage = this.calculateDocumentationCoverageScore(
      result,
      snapshot,
    );
    const staleness = this.calculateStalenessScore(result, snapshot);
    const userFeedback = this.calculateUserFeedbackScore(result);

    // Calculate weighted overall score
    const overall =
      codeComplexity * weights.codeComplexity +
      usageFrequency * weights.usageFrequency +
      changeMagnitude * weights.changeMagnitude +
      documentationCoverage * weights.documentationCoverage +
      staleness * weights.staleness +
      userFeedback * weights.userFeedback;

    const recommendation = this.determineRecommendation(overall);
    const suggestedAction = this.generateSuggestedAction(
      recommendation,
      result,
    );

    return {
      overall: Math.round(overall),
      factors: {
        codeComplexity: Math.round(codeComplexity),
        usageFrequency: Math.round(usageFrequency),
        changeMagnitude: Math.round(changeMagnitude),
        documentationCoverage: Math.round(documentationCoverage),
        staleness: Math.round(staleness),
        userFeedback: Math.round(userFeedback),
      },
      recommendation,
      suggestedAction,
    };
  }

  /**
   * Calculate code complexity score (0-100)
   * Higher complexity = higher priority
   */
  private calculateCodeComplexityScore(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
  ): number {
    const fileAnalysis = snapshot.files.get(result.filePath);
    if (!fileAnalysis) return 50; // Default moderate score

    // Use existing complexity metric from AST analysis
    const complexity = fileAnalysis.complexity || 0;

    // Normalize complexity to 0-100 scale
    // Assume complexity ranges from 0 (simple) to 50+ (very complex)
    const normalizedComplexity = Math.min(complexity * 2, 100);

    // Adjust based on drift severity
    const severityMultiplier =
      result.severity === "critical"
        ? 1.2
        : result.severity === "high"
          ? 1.1
          : result.severity === "medium"
            ? 1.0
            : 0.9;

    return Math.min(normalizedComplexity * severityMultiplier, 100);
  }

  /**
   * Calculate usage frequency score (0-100)
   * More used APIs = higher priority
   */
  private calculateUsageFrequencyScore(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): number {
    // Scoring constants for usage estimation
    const DEFAULT_SCORE = 60; // Moderate usage assumption
    const EXPORT_WEIGHT = 15; // Points per export (max ~60 for 4 exports)
    const EXPORT_MAX = 60; // Cap on export-based score
    const DOC_REF_WEIGHT = 25; // Points per doc reference (max ~40 for 2 refs)
    const DOC_REF_MAX = 40; // Cap on documentation reference score
    const PUBLIC_API_BONUS = 30; // Bonus for being exported (public API)

    if (!usageMetadata) {
      // Estimate based on exports and documentation references
      const fileAnalysis = snapshot.files.get(result.filePath);
      if (!fileAnalysis) return DEFAULT_SCORE;

      const exportCount = fileAnalysis.exports.length;
      const isPublicAPI = exportCount > 0;

      // Count documentation references
      let docReferences = 0;
      for (const docSnapshot of snapshot.documentation.values()) {
        if (docSnapshot.referencedCode.includes(result.filePath)) {
          docReferences++;
        }
      }

      // Score based on heuristics
      const exportScore = Math.min(exportCount * EXPORT_WEIGHT, EXPORT_MAX);
      const referenceScore = Math.min(
        docReferences * DOC_REF_WEIGHT,
        DOC_REF_MAX,
      );
      const publicAPIBonus = isPublicAPI ? PUBLIC_API_BONUS : 0;

      return Math.min(exportScore + referenceScore + publicAPIBonus, 100);
    }

    // Use actual usage data if available
    let totalUsage = 0;
    for (const drift of result.drifts) {
      for (const diff of drift.codeChanges) {
        if (diff.category === "function") {
          totalUsage += usageMetadata.functionCalls.get(diff.name) || 0;
        } else if (diff.category === "class") {
          totalUsage += usageMetadata.classInstantiations.get(diff.name) || 0;
        }
        totalUsage += usageMetadata.imports.get(diff.name) || 0;
      }
    }

    // Normalize to 0-100 (assume 100+ usages is very high)
    return Math.min(totalUsage, 100);
  }

  /**
   * Calculate change magnitude score (0-100)
   * Larger changes = higher priority
   */
  private calculateChangeMagnitudeScore(result: DriftDetectionResult): number {
    const { breakingChanges, majorChanges, minorChanges } =
      result.impactAnalysis;

    // Weighted score for different change types
    // Breaking changes are critical - even 1 breaking change should score high
    if (breakingChanges > 0) {
      return 100;
    }

    const majorScore = majorChanges * 20; // Multiple major changes add up
    const minorScore = minorChanges * 8; // Minor changes have some impact

    const totalScore = majorScore + minorScore;
    return Math.min(totalScore, 100);
  }

  /**
   * Calculate documentation coverage score (0-100)
   * Lower coverage = higher priority (inverted score)
   */
  private calculateDocumentationCoverageScore(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
  ): number {
    const { affectedDocFiles } = result.impactAnalysis;

    // If there are affected docs, give a reasonable base score
    // Documentation exists but may need updates
    if (affectedDocFiles.length > 0) {
      // Calculate how well the changed code is documented
      let totalSymbols = 0;
      let documentedSymbols = 0;

      for (const drift of result.drifts) {
        for (const diff of drift.codeChanges) {
          totalSymbols++;

          // Check if this symbol is documented
          for (const docPath of affectedDocFiles) {
            const docSnapshot = snapshot.documentation.get(docPath);
            if (docSnapshot) {
              for (const section of docSnapshot.sections) {
                const isDocumented =
                  section.referencedFunctions.includes(diff.name) ||
                  section.referencedClasses.includes(diff.name) ||
                  section.referencedTypes.includes(diff.name);

                if (isDocumented) {
                  documentedSymbols++;
                  break;
                }
              }
            }
          }
        }
      }

      if (totalSymbols === 0) return 40; // Docs exist, moderate priority

      // Invert coverage ratio: low coverage = high priority
      // But cap at 80 since docs do exist
      const coverageRatio = documentedSymbols / totalSymbols;
      return Math.round((1 - coverageRatio) * 80);
    }

    // Missing documentation is high priority
    return 90;
  }

  /**
   * Calculate staleness score (0-100)
   * Older docs = higher priority
   */
  private calculateStalenessScore(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
  ): number {
    const { affectedDocFiles } = result.impactAnalysis;

    if (affectedDocFiles.length === 0) return 50;

    let oldestDocAge = 0;

    for (const docPath of affectedDocFiles) {
      const docSnapshot = snapshot.documentation.get(docPath);
      if (docSnapshot) {
        const lastUpdated = new Date(docSnapshot.lastUpdated);
        const ageInDays =
          (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        oldestDocAge = Math.max(oldestDocAge, ageInDays);
      }
    }

    // Score based on age: 0-7 days = low, 7-30 days = medium, 30+ days = high
    if (oldestDocAge > 90) return 100;
    if (oldestDocAge > 30) return 80;
    if (oldestDocAge > 14) return 60;
    if (oldestDocAge > 7) return 40;
    return 20;
  }

  /**
   * Calculate user feedback score (0-100)
   * More reported issues = higher priority
   * Integrates with issue tracking systems when configured
   */
  private calculateUserFeedbackScore(result: DriftDetectionResult): number {
    // If user feedback integration is configured, use it
    if (this.userFeedbackIntegration) {
      const score = this.userFeedbackIntegration(result);
      // Handle both sync and async returns
      if (score instanceof Promise) {
        // For async, return 0 immediately (caller should use async version)
        return 0;
      }
      return score;
    }
    return 0; // Default: no feedback integration
  }

  /**
   * Set user feedback integration for calculating feedback scores
   * This allows external configuration of issue tracker integration
   */
  setUserFeedbackIntegration(
    integration: (result: DriftDetectionResult) => Promise<number> | number,
  ): void {
    this.userFeedbackIntegration = integration;
  }

  /**
   * Calculate priority score with async user feedback support
   */
  async calculatePriorityScoreAsync(
    result: DriftDetectionResult,
    snapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): Promise<DriftPriorityScore> {
    const weights = this.getWeights();

    // Calculate individual factors
    const codeComplexity = this.calculateCodeComplexityScore(result, snapshot);
    const usageFrequency = this.calculateUsageFrequencyScore(
      result,
      snapshot,
      usageMetadata,
    );
    const changeMagnitude = this.calculateChangeMagnitudeScore(result);
    const documentationCoverage = this.calculateDocumentationCoverageScore(
      result,
      snapshot,
    );
    const staleness = this.calculateStalenessScore(result, snapshot);

    // Get user feedback asynchronously if integration is configured
    let userFeedback = 0;
    if (this.userFeedbackIntegration) {
      const feedbackScore = this.userFeedbackIntegration(result);
      userFeedback =
        feedbackScore instanceof Promise ? await feedbackScore : feedbackScore;
    }

    // Calculate weighted overall score
    const overall =
      codeComplexity * weights.codeComplexity +
      usageFrequency * weights.usageFrequency +
      changeMagnitude * weights.changeMagnitude +
      documentationCoverage * weights.documentationCoverage +
      staleness * weights.staleness +
      userFeedback * weights.userFeedback;

    const recommendation = this.determineRecommendation(overall);
    const suggestedAction = this.generateSuggestedAction(
      recommendation,
      result,
    );

    return {
      overall: Math.round(overall),
      factors: {
        codeComplexity: Math.round(codeComplexity),
        usageFrequency: Math.round(usageFrequency),
        changeMagnitude: Math.round(changeMagnitude),
        documentationCoverage: Math.round(documentationCoverage),
        staleness: Math.round(staleness),
        userFeedback: Math.round(userFeedback),
      },
      recommendation,
      suggestedAction,
    };
  }

  /**
   * Determine priority recommendation based on overall score
   */
  private determineRecommendation(
    score: number,
  ): "critical" | "high" | "medium" | "low" {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  /**
   * Generate suggested action based on priority level
   */
  private generateSuggestedAction(
    recommendation: "critical" | "high" | "medium" | "low",
    result: DriftDetectionResult,
  ): string {
    const affectedCount = result.impactAnalysis.affectedDocFiles.length;

    switch (recommendation) {
      case "critical":
        return `Update immediately: ${result.impactAnalysis.breakingChanges} breaking change(s) affecting ${affectedCount} documentation file(s). Review and update within hours.`;
      case "high":
        return `Update within 1 day: ${result.drifts.length} drift(s) detected in ${affectedCount} file(s). Schedule update soon.`;
      case "medium":
        return `Update within 1 week: ${result.drifts.length} drift(s) affecting ${affectedCount} file(s). Plan update in next sprint.`;
      case "low":
        return `Update when convenient: Minor drift detected. Consider batching with other low-priority updates.`;
    }
  }

  /**
   * Detect drift with priority scoring (synchronous user feedback)
   */
  async detectDriftWithPriority(
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): Promise<PrioritizedDriftResult[]> {
    const results = await this.detectDrift(oldSnapshot, newSnapshot);

    return results.map((result) => ({
      ...result,
      priorityScore: this.calculatePriorityScore(
        result,
        newSnapshot,
        usageMetadata,
      ),
    }));
  }

  /**
   * Detect drift with priority scoring (async user feedback support)
   */
  async detectDriftWithPriorityAsync(
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): Promise<PrioritizedDriftResult[]> {
    const results = await this.detectDrift(oldSnapshot, newSnapshot);

    // Calculate priority scores with async user feedback
    const prioritizedResults = await Promise.all(
      results.map(async (result) => ({
        ...result,
        priorityScore: await this.calculatePriorityScoreAsync(
          result,
          newSnapshot,
          usageMetadata,
        ),
      })),
    );

    return prioritizedResults;
  }

  /**
   * Get prioritized drift results sorted by priority score
   */
  async getPrioritizedDriftResults(
    oldSnapshot: DriftSnapshot,
    newSnapshot: DriftSnapshot,
    usageMetadata?: UsageMetadata,
  ): Promise<PrioritizedDriftResult[]> {
    // Use async version if user feedback integration is configured
    const useAsyncFeedback = this.userFeedbackIntegration !== undefined;

    const results = useAsyncFeedback
      ? await this.detectDriftWithPriorityAsync(
          oldSnapshot,
          newSnapshot,
          usageMetadata,
        )
      : await this.detectDriftWithPriority(
          oldSnapshot,
          newSnapshot,
          usageMetadata,
        );

    // Sort by overall score (descending - highest priority first)
    return results.sort((a, b) => {
      const scoreA = a.priorityScore?.overall ?? 0;
      const scoreB = b.priorityScore?.overall ?? 0;
      return scoreB - scoreA;
    });
  }
}
