import { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import {
  handleMemoryRecall,
  handleMemoryEnhancedRecommendation,
  handleMemoryIntelligentAnalysis,
} from "../memory/index.js";

interface UpdateOptions {
  analysisId: string;
  docsPath: string;
  compareMode: "comprehensive" | "gap-detection" | "accuracy-check";
  updateStrategy: "conservative" | "moderate" | "aggressive";
  preserveStyle: boolean;
  focusAreas?: string[];
}

interface DocumentationGap {
  type: "missing" | "outdated" | "incorrect" | "incomplete";
  location: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestedUpdate: string;
  memoryEvidence?: any[];
}

interface CodeDocumentationComparison {
  codeFeatures: any[];
  documentedFeatures: any[];
  gaps: DocumentationGap[];
  outdatedSections: any[];
  accuracyIssues: any[];
}

interface UpdateRecommendation {
  section: string;
  currentContent: string;
  suggestedContent: string;
  reasoning: string;
  memoryEvidence: any[];
  confidence: number;
  effort: "low" | "medium" | "high";
}

interface UpdateResult {
  success: boolean;
  analysisPerformed: CodeDocumentationComparison;
  recommendations: UpdateRecommendation[];
  memoryInsights: {
    similarProjects: any[];
    successfulUpdatePatterns: any[];
    commonGapTypes: Record<string, number>;
  };
  updateMetrics: {
    gapsDetected: number;
    recommendationsGenerated: number;
    confidenceScore: number;
    estimatedEffort: string;
  };
  nextSteps: string[];
}

class DocumentationUpdateEngine {
  private memoryInsights: any = null;
  private codeAnalysis: any = null;
  private existingDocs: Map<string, any> = new Map();

  async updateExistingDocumentation(
    options: UpdateOptions,
  ): Promise<UpdateResult> {
    // 1. Load repository analysis and memory insights
    const analysis = await this.getRepositoryAnalysis(options.analysisId);
    this.codeAnalysis = analysis;

    // 2. Load memory insights for intelligent comparison
    await this.loadMemoryInsights(analysis, options);

    // 3. Analyze existing documentation structure and content
    const existingDocs = await this.analyzeExistingDocumentation(
      options.docsPath,
    );
    this.existingDocs = existingDocs;

    // 4. Perform comprehensive code-documentation comparison
    const comparison = await this.performCodeDocumentationComparison(
      analysis,
      existingDocs,
      options,
    );

    // 5. Generate memory-informed update recommendations
    const recommendations = await this.generateUpdateRecommendations(
      comparison,
      options,
    );

    // 6. Calculate metrics and confidence scores
    const updateMetrics = this.calculateUpdateMetrics(
      comparison,
      recommendations,
    );

    return {
      success: true,
      analysisPerformed: comparison,
      recommendations,
      memoryInsights: this.memoryInsights,
      updateMetrics,
      nextSteps: this.generateMemoryInformedNextSteps(
        comparison,
        recommendations,
      ),
    };
  }

  private async getRepositoryAnalysis(analysisId: string): Promise<any> {
    // Try to get analysis from memory system first
    try {
      const memoryRecall = await handleMemoryRecall({
        query: analysisId,
        type: "analysis",
        limit: 1,
      });

      // Handle the memory recall result structure
      if (
        memoryRecall &&
        memoryRecall.memories &&
        memoryRecall.memories.length > 0
      ) {
        const memory = memoryRecall.memories[0];

        // Handle wrapped content structure
        if (
          memory.data &&
          memory.data.content &&
          Array.isArray(memory.data.content)
        ) {
          // Extract the JSON from the first text content
          const firstContent = memory.data.content[0];
          if (
            firstContent &&
            firstContent.type === "text" &&
            firstContent.text
          ) {
            try {
              return JSON.parse(firstContent.text);
            } catch (parseError) {
              console.warn(
                "Failed to parse analysis content from memory:",
                parseError,
              );
              return memory.data;
            }
          }
        }

        // Try direct content access (legacy format)
        if (memory.content) {
          return memory.content;
        }

        // Try data field
        if (memory.data) {
          return memory.data;
        }
      }
    } catch (error) {
      console.warn("Failed to retrieve from memory system:", error);
    }

    // Fallback to reading from cached analysis file
    const analysisPath = path.join(
      ".documcp",
      "analyses",
      `${analysisId}.json`,
    );
    try {
      const content = await fs.readFile(analysisPath, "utf-8");
      return JSON.parse(content);
    } catch {
      throw new Error(
        `Repository analysis with ID '${analysisId}' not found. Please run analyze_repository first.`,
      );
    }
  }

  private async loadMemoryInsights(
    analysis: any,
    options: UpdateOptions,
  ): Promise<void> {
    try {
      // Get similar projects that had successful documentation updates
      const similarProjectsQuery = `${
        analysis.metadata?.primaryLanguage || ""
      } ${analysis.metadata?.ecosystem || ""} documentation update`;
      const similarProjects = await handleMemoryRecall({
        query: similarProjectsQuery,
        type: "recommendation",
        limit: 10,
      });

      // Get patterns for successful documentation updates
      const updatePatternsQuery =
        "documentation update successful patterns gaps outdated";
      const updatePatterns = await handleMemoryRecall({
        query: updatePatternsQuery,
        type: "configuration",
        limit: 5,
      });

      // Get memory-enhanced analysis for this specific update task
      const enhancedAnalysis = await handleMemoryIntelligentAnalysis({
        projectPath: analysis.projectPath || "",
        baseAnalysis: analysis,
      });

      // Get memory-enhanced recommendations for update strategy
      const enhancedRecommendations = await handleMemoryEnhancedRecommendation({
        projectPath: analysis.projectPath || "",
        baseRecommendation: {
          updateStrategy: options.updateStrategy,
          compareMode: options.compareMode,
          focusAreas: options.focusAreas || [],
        },
        projectFeatures: {
          ecosystem: analysis.metadata?.ecosystem || "unknown",
          primaryLanguage: analysis.metadata?.primaryLanguage || "unknown",
          complexity: analysis.complexity || "medium",
          hasTests: analysis.structure?.hasTests || false,
          hasCI: analysis.structure?.hasCI || false,
          docStructure: "existing", // Indicates we're updating existing docs
        },
      });

      this.memoryInsights = {
        similarProjects: similarProjects.memories || [],
        updatePatterns: updatePatterns.memories || [],
        enhancedAnalysis: enhancedAnalysis,
        enhancedRecommendations: enhancedRecommendations,
        successfulUpdatePatterns: this.extractUpdatePatterns(
          similarProjects.memories || [],
        ),
        commonGapTypes: this.extractCommonGapTypes(
          similarProjects.memories || [],
        ),
      };
    } catch (error) {
      console.warn("Failed to load memory insights:", error);
      this.memoryInsights = {
        similarProjects: [],
        updatePatterns: [],
        enhancedAnalysis: null,
        enhancedRecommendations: null,
        successfulUpdatePatterns: [],
        commonGapTypes: {},
      };
    }
  }

  private extractUpdatePatterns(projects: any[]): any[] {
    return projects
      .filter(
        (p) => p.content?.updatePatterns || p.content?.documentationUpdates,
      )
      .map((p) => p.content?.updatePatterns || p.content?.documentationUpdates)
      .flat()
      .filter(Boolean);
  }

  private extractCommonGapTypes(projects: any[]): Record<string, number> {
    const gapTypes: Record<string, number> = {};

    projects.forEach((p) => {
      const gaps = p.content?.documentationGaps || [];
      gaps.forEach((gap: any) => {
        const type = gap.type || "unknown";
        gapTypes[type] = (gapTypes[type] || 0) + 1;
      });
    });

    return gapTypes;
  }

  private async analyzeExistingDocumentation(
    docsPath: string,
  ): Promise<Map<string, any>> {
    const docs = new Map<string, any>();

    try {
      await this.recursivelyAnalyzeDocuments(docsPath, docs);
    } catch (error) {
      console.warn("Failed to analyze existing documentation:", error);
    }

    return docs;
  }

  private async recursivelyAnalyzeDocuments(
    dirPath: string,
    docs: Map<string, any>,
    relativePath: string = "",
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const docPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await this.recursivelyAnalyzeDocuments(fullPath, docs, docPath);
        } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            const analysis = this.analyzeDocumentContent(content, docPath);
            docs.set(docPath, {
              content,
              analysis,
              lastModified: (await fs.stat(fullPath)).mtime,
              path: fullPath,
            });
          } catch (error) {
            console.warn(`Failed to read document ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }
  }

  private analyzeDocumentContent(content: string, filePath: string): any {
    return {
      type: this.inferDocumentType(filePath, content),
      sections: this.extractSections(content),
      codeBlocks: this.extractCodeBlocks(content),
      links: this.extractLinks(content),
      lastUpdated: this.extractLastUpdated(content),
      version: this.extractVersion(content),
      dependencies: this.extractMentionedDependencies(content),
      features: this.extractDocumentedFeatures(content),
      wordCount: content.split(/\s+/).length,
      headingStructure: this.extractHeadingStructure(content),
    };
  }

  private inferDocumentType(filePath: string, content: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    const pathParts = filePath.toLowerCase().split(path.sep);

    // Diataxis categories
    if (pathParts.includes("tutorials")) return "tutorial";
    if (pathParts.includes("how-to") || pathParts.includes("howto"))
      return "how-to";
    if (pathParts.includes("reference")) return "reference";
    if (pathParts.includes("explanation")) return "explanation";

    // Common documentation types
    if (fileName.includes("readme")) return "readme";
    if (fileName.includes("getting-started") || fileName.includes("quickstart"))
      return "getting-started";
    if (fileName.includes("api")) return "api-reference";
    if (fileName.includes("install") || fileName.includes("setup"))
      return "installation";
    if (fileName.includes("deploy")) return "deployment";
    if (fileName.includes("config")) return "configuration";

    // Infer from content
    if (
      content.includes("# Getting Started") ||
      content.includes("## Getting Started")
    )
      return "getting-started";
    if (content.includes("# API") || content.includes("## API"))
      return "api-reference";
    if (
      content.includes("# Installation") ||
      content.includes("## Installation")
    )
      return "installation";

    return "general";
  }

  private extractSections(content: string): any[] {
    const sections: any[] = [];
    const lines = content.split("\n");
    let currentSection: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

      if (headingMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }

        currentSection = {
          level: headingMatch[1].length,
          title: headingMatch[2],
          startLine: i + 1,
          content: [],
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.map((section) => ({
      ...section,
      content: section.content.join("\n"),
      wordCount: section.content.join(" ").split(/\s+/).length,
    }));
  }

  private extractCodeBlocks(content: string): any[] {
    const codeBlocks: any[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || "text",
        code: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return codeBlocks;
  }

  private extractLinks(content: string): any[] {
    const links: any[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        isInternal: !match[2].startsWith("http"),
        startIndex: match.index,
      });
    }

    return links;
  }

  private extractLastUpdated(content: string): string | null {
    const updateMatch = content.match(
      /(?:last updated|updated|modified):\s*(.+)/i,
    );
    return updateMatch ? updateMatch[1] : null;
  }

  private extractVersion(content: string): string | null {
    const versionMatch = content.match(/(?:version|v)[\s:]+([\d.]+)/i);
    return versionMatch ? versionMatch[1] : null;
  }

  private extractMentionedDependencies(content: string): string[] {
    const dependencies: Set<string> = new Set();

    // Extract from npm install commands
    const npmMatches = content.match(/npm install\s+([^`\n]+)/g);
    if (npmMatches) {
      npmMatches.forEach((match) => {
        const packages = match.replace("npm install", "").trim().split(/\s+/);
        packages.forEach((pkg) => {
          if (pkg && !pkg.startsWith("-")) {
            dependencies.add(pkg);
          }
        });
      });
    }

    // Extract from import statements
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach((match) => {
        const packageMatch = match.match(/from\s+['"]([^'"]+)['"]/);
        if (packageMatch && !packageMatch[1].startsWith(".")) {
          dependencies.add(packageMatch[1]);
        }
      });
    }

    return Array.from(dependencies);
  }

  private extractDocumentedFeatures(content: string): string[] {
    const features: Set<string> = new Set();

    // Extract function names from code blocks
    const functionMatches = content.match(
      /(?:function|const|let|var)\s+(\w+)/g,
    );
    if (functionMatches) {
      functionMatches.forEach((match) => {
        const functionMatch = match.match(/(?:function|const|let|var)\s+(\w+)/);
        if (functionMatch) {
          features.add(functionMatch[1]);
        }
      });
    }

    // Extract API endpoints
    const apiMatches = content.match(
      /(?:GET|POST|PUT|DELETE|PATCH)\s+([/\w-]+)/g,
    );
    if (apiMatches) {
      apiMatches.forEach((match) => {
        const endpointMatch = match.match(
          /(?:GET|POST|PUT|DELETE|PATCH)\s+([/\w-]+)/,
        );
        if (endpointMatch) {
          features.add(endpointMatch[1]);
        }
      });
    }

    // Extract mentioned features from headings
    const headings = content.match(/#{1,6}\s+(.+)/g);
    if (headings) {
      headings.forEach((heading) => {
        const headingText = heading.replace(/#{1,6}\s+/, "").toLowerCase();
        if (
          headingText.includes("feature") ||
          headingText.includes("functionality")
        ) {
          features.add(headingText);
        }
      });
    }

    return Array.from(features);
  }

  private extractHeadingStructure(content: string): any[] {
    const headings: any[] = [];
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        headings.push({
          level: headingMatch[1].length,
          text: headingMatch[2],
          line: index + 1,
        });
      }
    });

    return headings;
  }

  private async performCodeDocumentationComparison(
    analysis: any,
    existingDocs: Map<string, any>,
    _options: UpdateOptions,
  ): Promise<CodeDocumentationComparison> {
    const codeFeatures = this.extractCodeFeatures(analysis);
    const documentedFeatures = this.extractAllDocumentedFeatures(existingDocs);

    const gaps = await this.detectDocumentationGaps(
      codeFeatures,
      documentedFeatures,
      _options,
    );
    const outdatedSections = await this.detectOutdatedSections(
      analysis,
      existingDocs,
    );
    const accuracyIssues = await this.detectAccuracyIssues(
      analysis,
      existingDocs,
    );

    return {
      codeFeatures,
      documentedFeatures,
      gaps,
      outdatedSections,
      accuracyIssues,
    };
  }

  private extractCodeFeatures(analysis: any): any[] {
    const features: any[] = [];

    // Extract from dependencies
    if (analysis.dependencies?.packages) {
      analysis.dependencies.packages.forEach((pkg: string) => {
        features.push({
          type: "dependency",
          name: pkg,
          source: "package.json",
        });
      });
    }

    // Extract from scripts
    const packageJson = this.findPackageJsonInAnalysis(analysis);
    if (packageJson?.scripts) {
      Object.keys(packageJson.scripts).forEach((script) => {
        features.push({
          type: "script",
          name: script,
          command: packageJson.scripts[script],
          source: "package.json",
        });
      });
    }

    // Extract from file structure
    if (analysis.structure) {
      if (analysis.structure.hasTests) {
        features.push({
          type: "testing",
          name: "test suite",
          source: "structure",
        });
      }
      if (analysis.structure.hasCI) {
        features.push({
          type: "ci-cd",
          name: "continuous integration",
          source: "structure",
        });
      }
    }

    // Extract from technologies
    if (analysis.technologies) {
      Object.entries(analysis.technologies).forEach(([key, value]) => {
        if (value) {
          features.push({
            type: "technology",
            name: key,
            value: value,
            source: "analysis",
          });
        }
      });
    }

    return features;
  }

  private findPackageJsonInAnalysis(analysis: any): any {
    const files = analysis.files || [];
    const packageFile = files.find((f: any) => f.name === "package.json");

    if (packageFile?.content) {
      try {
        return JSON.parse(packageFile.content);
      } catch {
        return null;
      }
    }

    return null;
  }

  private extractAllDocumentedFeatures(existingDocs: Map<string, any>): any[] {
    const allFeatures: any[] = [];

    existingDocs.forEach((doc, docPath) => {
      const features = doc.analysis?.features || [];
      const dependencies = doc.analysis?.dependencies || [];

      features.forEach((feature: string) => {
        allFeatures.push({
          name: feature,
          source: docPath,
          type: "documented-feature",
        });
      });

      dependencies.forEach((dep: string) => {
        allFeatures.push({
          name: dep,
          source: docPath,
          type: "documented-dependency",
        });
      });
    });

    return allFeatures;
  }

  private async detectDocumentationGaps(
    codeFeatures: any[],
    documentedFeatures: any[],
    _options: UpdateOptions,
  ): Promise<DocumentationGap[]> {
    const gaps: DocumentationGap[] = [];
    const memoryGapPatterns = this.memoryInsights?.commonGapTypes || {};

    // Find features in code that aren't documented
    codeFeatures.forEach((codeFeature) => {
      const isDocumented = documentedFeatures.some((docFeature) =>
        this.featuresMatch(codeFeature, docFeature),
      );

      if (!isDocumented) {
        const severity = this.determineGapSeverity(
          codeFeature,
          memoryGapPatterns,
        );
        const suggestedUpdate = this.generateGapSuggestion(
          codeFeature,
          _options,
        );

        gaps.push({
          type: "missing",
          location: `${codeFeature.source} -> documentation`,
          description: `${codeFeature.type} '${codeFeature.name}' exists in code but is not documented`,
          severity,
          suggestedUpdate,
          memoryEvidence: this.findMemoryEvidenceForGap(codeFeature),
        });
      }
    });

    // Find documented features that no longer exist in code
    documentedFeatures.forEach((docFeature) => {
      const existsInCode = codeFeatures.some((codeFeature) =>
        this.featuresMatch(codeFeature, docFeature),
      );

      if (!existsInCode) {
        gaps.push({
          type: "outdated",
          location: docFeature.source,
          description: `Documented feature '${docFeature.name}' no longer exists in code`,
          severity: "medium",
          suggestedUpdate: `Remove or update documentation for '${docFeature.name}'`,
          memoryEvidence: this.findMemoryEvidenceForOutdated(docFeature),
        });
      }
    });

    return gaps;
  }

  private featuresMatch(codeFeature: any, docFeature: any): boolean {
    // Exact name match
    if (codeFeature.name === docFeature.name) return true;

    // Type-specific matching
    if (
      codeFeature.type === "dependency" &&
      docFeature.type === "documented-dependency"
    ) {
      return codeFeature.name === docFeature.name;
    }

    // Partial match for similar names
    const codeName = codeFeature.name.toLowerCase();
    const docName = docFeature.name.toLowerCase();

    return codeName.includes(docName) || docName.includes(codeName);
  }

  private determineGapSeverity(
    codeFeature: any,
    memoryGapPatterns: Record<string, number>,
  ): "low" | "medium" | "high" | "critical" {
    // High importance features
    if (
      codeFeature.type === "script" &&
      ["start", "dev", "build", "test"].includes(codeFeature.name)
    ) {
      return "high";
    }

    if (
      codeFeature.type === "dependency" &&
      this.isCriticalDependency(codeFeature.name)
    ) {
      return "high";
    }

    if (codeFeature.type === "testing" || codeFeature.type === "ci-cd") {
      return "medium";
    }

    // Check memory patterns for common gaps
    const gapFrequency = memoryGapPatterns[codeFeature.type] || 0;
    if (gapFrequency > 5) return "medium"; // Common gap type
    if (gapFrequency > 2) return "low";

    return "low";
  }

  private isCriticalDependency(depName: string): boolean {
    const criticalDeps = [
      "react",
      "vue",
      "angular",
      "express",
      "fastify",
      "next",
      "nuxt",
      "gatsby",
      "typescript",
      "jest",
      "mocha",
      "webpack",
      "vite",
      "rollup",
    ];

    return criticalDeps.some((critical) => depName.includes(critical));
  }

  private generateGapSuggestion(
    codeFeature: any,
    _options: UpdateOptions,
  ): string {
    switch (codeFeature.type) {
      case "script":
        return `Add documentation for the '${codeFeature.name}' script: \`npm run ${codeFeature.name}\``;
      case "dependency":
        return `Document the '${codeFeature.name}' dependency and its usage`;
      case "testing":
        return `Add testing documentation explaining how to run and write tests`;
      case "ci-cd":
        return `Document the CI/CD pipeline and deployment process`;
      case "technology":
        return `Add explanation for ${codeFeature.name}: ${codeFeature.value}`;
      default:
        return `Document the ${codeFeature.type} '${codeFeature.name}'`;
    }
  }

  private findMemoryEvidenceForGap(codeFeature: any): any[] {
    return (
      this.memoryInsights?.similarProjects
        .filter((p: any) =>
          p.content?.gaps?.some((gap: any) => gap.type === codeFeature.type),
        )
        .slice(0, 3) || []
    );
  }

  private findMemoryEvidenceForOutdated(docFeature: any): any[] {
    return (
      this.memoryInsights?.similarProjects
        .filter((p: any) =>
          p.content?.outdatedSections?.some(
            (section: any) => section.feature === docFeature.name,
          ),
        )
        .slice(0, 3) || []
    );
  }

  private async detectOutdatedSections(
    analysis: any,
    existingDocs: Map<string, any>,
  ): Promise<any[]> {
    const outdatedSections: any[] = [];

    existingDocs.forEach((doc, docPath) => {
      const sections = doc.analysis?.sections || [];

      sections.forEach((section: any) => {
        const isOutdated = this.checkSectionOutdated(section, analysis);

        if (isOutdated) {
          outdatedSections.push({
            location: docPath,
            section: section.title,
            reason: isOutdated.reason,
            confidence: isOutdated.confidence,
            suggestedUpdate: isOutdated.suggestedUpdate,
          });
        }
      });
    });

    return outdatedSections;
  }

  private checkSectionOutdated(section: any, analysis: any): any {
    const sectionContent = section.content.toLowerCase();

    // Check for outdated Node.js versions
    const nodeVersionMatch = sectionContent.match(/node(?:\.js)?\s+(\d+)/);
    if (nodeVersionMatch) {
      const documentedVersion = parseInt(nodeVersionMatch[1], 10);
      const currentRecommended = 18; // Current LTS

      if (documentedVersion < currentRecommended - 2) {
        return {
          reason: `Documented Node.js version ${documentedVersion} is outdated`,
          confidence: 0.9,
          suggestedUpdate: `Update to recommend Node.js ${currentRecommended}+`,
        };
      }
    }

    // Check for outdated package names
    const packageJson = this.findPackageJsonInAnalysis(analysis);
    if (packageJson?.dependencies) {
      const currentDeps = Object.keys(packageJson.dependencies);

      // Look for documented packages that are no longer dependencies
      for (const dep of currentDeps) {
        if (sectionContent.includes(dep)) {
          const version = packageJson.dependencies[dep];
          if (
            sectionContent.includes(dep) &&
            !sectionContent.includes(version)
          ) {
            return {
              reason: `Package version information may be outdated for ${dep}`,
              confidence: 0.7,
              suggestedUpdate: `Update ${dep} version references to ${version}`,
            };
          }
        }
      }
    }

    return null;
  }

  private async detectAccuracyIssues(
    analysis: any,
    existingDocs: Map<string, any>,
  ): Promise<any[]> {
    const accuracyIssues: any[] = [];

    existingDocs.forEach((doc, docPath) => {
      const codeBlocks = doc.analysis?.codeBlocks || [];

      codeBlocks.forEach((codeBlock: any, index: number) => {
        const issues = this.validateCodeBlock(codeBlock, analysis);

        issues.forEach((issue) => {
          accuracyIssues.push({
            location: `${docPath}:code-block-${index}`,
            type: issue.type,
            description: issue.description,
            severity: issue.severity,
            suggestedFix: issue.suggestedFix,
          });
        });
      });
    });

    return accuracyIssues;
  }

  private validateCodeBlock(codeBlock: any, analysis: any): any[] {
    const issues: any[] = [];
    const code = codeBlock.code;

    // Check npm install commands against actual dependencies
    const npmInstallMatches = code.match(/npm install\s+([^`\n]+)/g);
    if (npmInstallMatches) {
      const packageJson = this.findPackageJsonInAnalysis(analysis);
      const actualDeps = packageJson
        ? Object.keys(packageJson.dependencies || {})
        : [];

      npmInstallMatches.forEach((match: string) => {
        const packages = match.replace("npm install", "").trim().split(/\s+/);
        packages.forEach((pkg: string) => {
          if (pkg && !pkg.startsWith("-") && !actualDeps.includes(pkg)) {
            issues.push({
              type: "incorrect-dependency",
              description: `npm install command includes '${pkg}' which is not in package.json`,
              severity: "medium",
              suggestedFix: `Remove '${pkg}' or add it to dependencies`,
            });
          }
        });
      });
    }

    // Check for outdated import syntax
    if (
      code.includes("require(") &&
      analysis.metadata?.primaryLanguage === "TypeScript"
    ) {
      issues.push({
        type: "outdated-syntax",
        description: "Using require() syntax in TypeScript project",
        severity: "low",
        suggestedFix: "Update to ES6 import syntax",
      });
    }

    return issues;
  }

  private async generateUpdateRecommendations(
    comparison: CodeDocumentationComparison,
    _options: UpdateOptions,
  ): Promise<UpdateRecommendation[]> {
    const recommendations: UpdateRecommendation[] = [];

    // Generate recommendations for gaps
    for (const gap of comparison.gaps) {
      if (
        gap.severity === "critical" ||
        gap.severity === "high" ||
        (gap.severity === "medium" &&
          _options.updateStrategy !== "conservative")
      ) {
        const recommendation = await this.generateGapRecommendation(
          gap,
          _options,
        );
        recommendations.push(recommendation);
      }
    }

    // Generate recommendations for outdated sections
    for (const outdated of comparison.outdatedSections) {
      const recommendation = await this.generateOutdatedRecommendation(
        outdated,
        _options,
      );
      recommendations.push(recommendation);
    }

    // Generate recommendations for accuracy issues
    for (const issue of comparison.accuracyIssues) {
      if (
        issue.severity !== "low" ||
        _options.updateStrategy === "aggressive"
      ) {
        const recommendation = await this.generateAccuracyRecommendation(
          issue,
          _options,
        );
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private async generateGapRecommendation(
    gap: DocumentationGap,
    _options: UpdateOptions,
  ): Promise<UpdateRecommendation> {
    const memoryEvidence = gap.memoryEvidence || [];
    const successfulPatterns =
      this.memoryInsights?.successfulUpdatePatterns || [];

    return {
      section: gap.location,
      currentContent: "", // No current content for missing items
      suggestedContent: this.generateContentForGap(gap, successfulPatterns),
      reasoning: `${gap.description}. ${memoryEvidence.length} similar projects had similar gaps.`,
      memoryEvidence,
      confidence: this.calculateGapConfidence(gap, memoryEvidence),
      effort: this.estimateGapEffort(gap),
    };
  }

  private generateContentForGap(
    gap: DocumentationGap,
    patterns: any[],
  ): string {
    // Use memory patterns to generate appropriate content
    const relevantPatterns = patterns.filter((p) => p.gapType === gap.type);

    if (relevantPatterns.length > 0) {
      const bestPattern = relevantPatterns[0];
      return this.adaptPatternToGap(bestPattern, gap);
    }

    return gap.suggestedUpdate;
  }

  private adaptPatternToGap(pattern: any, gap: DocumentationGap): string {
    let content = pattern.template || pattern.content || gap.suggestedUpdate;

    // Replace placeholders with actual gap information
    content = content.replace(/\{feature\}/g, gap.description);
    content = content.replace(/\{location\}/g, gap.location);

    return content;
  }

  private calculateGapConfidence(
    gap: DocumentationGap,
    evidence: any[],
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on severity
    switch (gap.severity) {
      case "critical":
        confidence += 0.4;
        break;
      case "high":
        confidence += 0.3;
        break;
      case "medium":
        confidence += 0.2;
        break;
      case "low":
        confidence += 0.1;
        break;
    }

    // Increase confidence based on memory evidence
    confidence += Math.min(evidence.length * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  private estimateGapEffort(gap: DocumentationGap): "low" | "medium" | "high" {
    switch (gap.type) {
      case "missing":
        return gap.severity === "critical" ? "high" : "medium";
      case "outdated":
        return "low";
      case "incorrect":
        return "medium";
      case "incomplete":
        return "low";
      default:
        return "medium";
    }
  }

  private async generateOutdatedRecommendation(
    outdated: any,
    _options: UpdateOptions,
  ): Promise<UpdateRecommendation> {
    return {
      section: outdated.location,
      currentContent: outdated.section,
      suggestedContent: outdated.suggestedUpdate,
      reasoning: outdated.reason,
      memoryEvidence: [],
      confidence: outdated.confidence || 0.8,
      effort: "low",
    };
  }

  private async generateAccuracyRecommendation(
    issue: any,
    _options: UpdateOptions,
  ): Promise<UpdateRecommendation> {
    return {
      section: issue.location,
      currentContent: "Code block with accuracy issues",
      suggestedContent: issue.suggestedFix,
      reasoning: issue.description,
      memoryEvidence: [],
      confidence: issue.severity === "high" ? 0.9 : 0.7,
      effort: issue.severity === "high" ? "medium" : "low",
    };
  }

  private calculateUpdateMetrics(
    comparison: CodeDocumentationComparison,
    recommendations: UpdateRecommendation[],
  ): any {
    const totalGaps = comparison.gaps.length;
    const totalRecommendations = recommendations.length;
    const avgConfidence =
      recommendations.reduce((sum, r) => sum + r.confidence, 0) /
        recommendations.length || 0;

    const effortCounts = recommendations.reduce(
      (acc, r) => {
        acc[r.effort] = (acc[r.effort] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    let estimatedEffort = "low";
    if (effortCounts.high > 0) estimatedEffort = "high";
    else if (effortCounts.medium > effortCounts.low) estimatedEffort = "medium";

    return {
      gapsDetected: totalGaps,
      recommendationsGenerated: totalRecommendations,
      confidenceScore: Math.round(avgConfidence * 100) / 100,
      estimatedEffort,
    };
  }

  private generateMemoryInformedNextSteps(
    comparison: CodeDocumentationComparison,
    recommendations: UpdateRecommendation[],
  ): string[] {
    const nextSteps = [];
    const highConfidenceRecs = recommendations.filter(
      (r) => r.confidence > 0.8,
    );
    const criticalGaps = comparison.gaps.filter(
      (g) => g.severity === "critical",
    );

    if (criticalGaps.length > 0) {
      nextSteps.push(
        `Address ${criticalGaps.length} critical documentation gaps immediately`,
      );
    }

    if (highConfidenceRecs.length > 0) {
      nextSteps.push(
        `Implement ${highConfidenceRecs.length} high-confidence recommendations first`,
      );
    }

    if (comparison.accuracyIssues.length > 0) {
      nextSteps.push(
        `Fix ${comparison.accuracyIssues.length} code accuracy issues in documentation`,
      );
    }

    nextSteps.push(
      "Review and validate all recommended changes before implementation",
    );
    nextSteps.push("Test updated code examples to ensure they work correctly");

    const memoryInsights = this.memoryInsights?.similarProjects?.length || 0;
    if (memoryInsights > 0) {
      nextSteps.push(
        `Leverage patterns from ${memoryInsights} similar projects for additional improvements`,
      );
    }

    return nextSteps;
  }
}

// Export the tool implementation
export const updateExistingDocumentation: Tool = {
  name: "update_existing_documentation",
  description:
    "Intelligently analyze and update existing documentation using memory insights and code comparison",
  inputSchema: {
    type: "object",
    properties: {
      analysisId: {
        type: "string",
        description: "Repository analysis ID from analyze_repository tool",
      },
      docsPath: {
        type: "string",
        description: "Path to existing documentation directory",
      },
      compareMode: {
        type: "string",
        enum: ["comprehensive", "gap-detection", "accuracy-check"],
        default: "comprehensive",
        description: "Mode of comparison between code and documentation",
      },
      updateStrategy: {
        type: "string",
        enum: ["conservative", "moderate", "aggressive"],
        default: "moderate",
        description: "How aggressively to suggest updates",
      },
      preserveStyle: {
        type: "boolean",
        default: true,
        description: "Preserve existing documentation style and formatting",
      },
      focusAreas: {
        type: "array",
        items: { type: "string" },
        description:
          'Specific areas to focus updates on (e.g., "dependencies", "scripts", "api")',
      },
    },
    required: ["analysisId", "docsPath"],
  },
};

export async function handleUpdateExistingDocumentation(
  args: any,
): Promise<UpdateResult> {
  const engine = new DocumentationUpdateEngine();
  return await engine.updateExistingDocumentation(args);
}
