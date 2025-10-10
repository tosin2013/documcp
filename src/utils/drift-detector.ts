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
}

/**
 * Main Drift Detector class
 */
export class DriftDetector {
  private analyzer: ASTAnalyzer;
  private snapshotDir: string;
  private currentSnapshot: DriftSnapshot | null = null;
  private previousSnapshot: DriftSnapshot | null = null;

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

      const sections = this.extractDocSections(content);
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
   * Extract sections from documentation
   */
  private extractDocSections(content: string): DocumentationSection[] {
    const sections: DocumentationSection[] = [];
    const lines = content.split("\n");
    let currentSection: Partial<DocumentationSection> | null = null;
    let currentContent: string[] = [];

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
          i++;

          while (i < lines.length && !lines[i].startsWith("```")) {
            codeLines.push(lines[i]);
            i++;
          }

          const codeExample: CodeExample = {
            language,
            code: codeLines.join("\n"),
            description: "",
            referencedSymbols: this.extractSymbolsFromCode(
              codeLines.join("\n"),
            ),
          };

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
}
