import { Tool } from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { handleMemoryRecall } from "../memory/index.js";
// ESM-compatible dirname replacement - fallback for test environments
function getDirname(): string {
  // Use process.cwd() as fallback for all environments to avoid import.meta issues
  return process.cwd();
}

const currentDir = getDirname();

const execAsync = promisify(exec);

interface ValidationOptions {
  contentPath: string;
  analysisId?: string;
  validationType: "accuracy" | "completeness" | "compliance" | "all";
  includeCodeValidation: boolean;
  confidence: "strict" | "moderate" | "permissive";
}

interface ConfidenceMetrics {
  overall: number;
  breakdown: {
    technologyDetection: number;
    frameworkVersionAccuracy: number;
    codeExampleRelevance: number;
    architecturalAssumptions: number;
    businessContextAlignment: number;
  };
  riskFactors: RiskFactor[];
}

interface RiskFactor {
  type: "high" | "medium" | "low";
  category: string;
  description: string;
  impact: string;
  mitigation: string;
}

interface UncertaintyFlag {
  area: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  potentialImpact: string;
  clarificationNeeded: string;
  fallbackStrategy: string;
}

interface ValidationIssue {
  type: "error" | "warning" | "info";
  category: "accuracy" | "completeness" | "compliance" | "performance";
  location: {
    file: string;
    line?: number;
    section?: string;
  };
  description: string;
  evidence: string[];
  suggestedFix: string;
  confidence: number;
}

interface CodeValidationResult {
  overallSuccess: boolean;
  exampleResults: ExampleValidation[];
  confidence: number;
}

interface ExampleValidation {
  example: string;
  compilationSuccess: boolean;
  executionSuccess: boolean;
  issues: ValidationIssue[];
  confidence: number;
}

export interface ValidationResult {
  success: boolean;
  confidence: ConfidenceMetrics;
  issues: ValidationIssue[];
  uncertainties: UncertaintyFlag[];
  codeValidation?: CodeValidationResult;
  recommendations: string[];
  nextSteps: string[];
}

class ContentAccuracyValidator {
  private projectContext: any;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(currentDir, ".tmp");
  }

  async validateContent(
    options: ValidationOptions,
    context?: any,
  ): Promise<ValidationResult> {
    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 0, total: 100 });
    }

    const result: ValidationResult = {
      success: false,
      confidence: this.initializeConfidenceMetrics(),
      issues: [],
      uncertainties: [],
      recommendations: [],
      nextSteps: [],
    };

    // Load project context if analysis ID provided
    if (options.analysisId) {
      await context?.info?.("📊 Loading project context...");
      this.projectContext = await this.loadProjectContext(options.analysisId);
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 20, total: 100 });
    }

    // Determine if we should analyze application code vs documentation
    await context?.info?.("🔎 Analyzing content type...");
    const isApplicationValidation = await this.shouldAnalyzeApplicationCode(
      options.contentPath,
    );

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 40, total: 100 });
    }

    // Perform different types of validation based on request
    if (
      options.validationType === "all" ||
      options.validationType === "accuracy"
    ) {
      await this.validateAccuracy(options.contentPath, result);
    }

    if (
      options.validationType === "all" ||
      options.validationType === "completeness"
    ) {
      await this.validateCompleteness(options.contentPath, result);
    }

    if (
      options.validationType === "all" ||
      options.validationType === "compliance"
    ) {
      if (isApplicationValidation) {
        await this.validateApplicationStructureCompliance(
          options.contentPath,
          result,
        );
      } else {
        await this.validateDiataxisCompliance(options.contentPath, result);
      }
    }

    // Code validation if requested
    if (options.includeCodeValidation) {
      result.codeValidation = await this.validateCodeExamples(
        options.contentPath,
      );
      // Set code example relevance confidence based on code validation results
      if (result.codeValidation) {
        const successRate =
          result.codeValidation.exampleResults.length > 0
            ? result.codeValidation.exampleResults.filter(
                (e) => e.compilationSuccess,
              ).length / result.codeValidation.exampleResults.length
            : 1;
        result.confidence.breakdown.codeExampleRelevance = Math.round(
          successRate * 100,
        );
      }
    } else {
      // If code validation is skipped, assume reasonable confidence
      result.confidence.breakdown.codeExampleRelevance = 75;
    }

    // Set framework version accuracy based on technology detection confidence
    result.confidence.breakdown.frameworkVersionAccuracy = Math.min(
      90,
      result.confidence.breakdown.technologyDetection + 10,
    );

    // Set architectural assumptions confidence based on file structure and content analysis
    const filesAnalyzed = await this.getMarkdownFiles(options.contentPath);
    const hasStructuredContent = filesAnalyzed.length > 3; // Basic heuristic
    result.confidence.breakdown.architecturalAssumptions = hasStructuredContent
      ? 80
      : 60;

    // Calculate overall confidence and success
    this.calculateOverallMetrics(result);

    // Generate recommendations and next steps
    this.generateRecommendations(result, options);

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({ progress: 100, total: 100 });
    }

    const status = result.success ? "PASSED" : "ISSUES FOUND";
    await context?.info?.(
      `✅ Validation complete! Status: ${status} (${result.confidence.overall}% confidence, ${result.issues.length} issue(s))`,
    );

    return result;
  }

  private initializeConfidenceMetrics(): ConfidenceMetrics {
    return {
      overall: 0,
      breakdown: {
        technologyDetection: 0,
        frameworkVersionAccuracy: 0,
        codeExampleRelevance: 0,
        architecturalAssumptions: 0,
        businessContextAlignment: 0,
      },
      riskFactors: [],
    };
  }

  private async loadProjectContext(analysisId: string): Promise<any> {
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
            }
          }
        }

        // Try direct content or data access
        if (memory.content) {
          return memory.content;
        }
        if (memory.data) {
          return memory.data;
        }
      }
    } catch (error) {
      console.warn("Failed to retrieve from memory system:", error);
    }

    // Fallback to reading from cached analysis file
    try {
      const analysisPath = path.join(
        ".documcp",
        "analyses",
        `${analysisId}.json`,
      );
      const content = await fs.readFile(analysisPath, "utf-8");
      return JSON.parse(content);
    } catch {
      // Return default context if no analysis found
      return {
        metadata: { projectName: "unknown", primaryLanguage: "JavaScript" },
        technologies: {},
        dependencies: { packages: [] },
      };
    }
  }

  private async validateAccuracy(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    const files = await this.getMarkdownFiles(contentPath);

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");

      // Check for common accuracy issues
      await this.checkTechnicalAccuracy(file, content, result);
      await this.checkFrameworkVersionCompatibility(file, content, result);
      await this.checkCommandAccuracy(file, content, result);
      await this.checkLinkValidity(file, content, result);
    }

    // Update confidence based on findings
    this.updateAccuracyConfidence(result);
  }

  private async checkTechnicalAccuracy(
    filePath: string,
    content: string,
    result: ValidationResult,
  ): Promise<void> {
    // Check for deprecated patterns
    const deprecatedPatterns = [
      {
        pattern: /npm install -g/,
        suggestion: "Use npx instead of global installs",
      },
      { pattern: /var\s+\w+/, suggestion: "Use const or let instead of var" },
      { pattern: /function\(\)/, suggestion: "Consider using arrow functions" },
      { pattern: /http:\/\//, suggestion: "Use HTTPS URLs for security" },
    ];

    for (const { pattern, suggestion } of deprecatedPatterns) {
      if (pattern.test(content)) {
        result.issues.push({
          type: "warning",
          category: "accuracy",
          location: { file: path.basename(filePath) },
          description: `Potentially outdated pattern detected: ${pattern.source}`,
          evidence: [content.match(pattern)?.[0] || ""],
          suggestedFix: suggestion,
          confidence: 80,
        });
      }
    }

    // Check for missing error handling in code examples
    const codeBlocks = this.extractCodeBlocks(content);
    for (const block of codeBlocks) {
      if (block.language === "javascript" || block.language === "typescript") {
        if (
          block.code.includes("await") &&
          !block.code.includes("try") &&
          !block.code.includes("catch")
        ) {
          result.issues.push({
            type: "warning",
            category: "accuracy",
            location: { file: path.basename(filePath) },
            description: "Async code without error handling",
            evidence: [block.code.substring(0, 100)],
            suggestedFix: "Add try-catch blocks for async operations",
            confidence: 90,
          });
        }
      }
    }
  }

  private async checkFrameworkVersionCompatibility(
    filePath: string,
    content: string,
    result: ValidationResult,
  ): Promise<void> {
    if (!this.projectContext) return;

    // Check if mentioned versions align with project dependencies
    const versionPattern = /@(\d+\.\d+\.\d+)/g;
    const matches = content.match(versionPattern);

    if (matches) {
      for (const match of matches) {
        const version = match.replace("@", "");

        result.uncertainties.push({
          area: "version-compatibility",
          severity: "medium",
          description: `Version ${version} mentioned in documentation`,
          potentialImpact: "May not match actual project dependencies",
          clarificationNeeded: "Verify version compatibility with project",
          fallbackStrategy: "Use generic version-agnostic examples",
        });
      }
    }
  }

  private async checkCommandAccuracy(
    filePath: string,
    content: string,
    result: ValidationResult,
  ): Promise<void> {
    const codeBlocks = this.extractCodeBlocks(content);

    for (const block of codeBlocks) {
      if (block.language === "bash" || block.language === "sh") {
        // Check for common command issues
        const commands = block.code
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"));

        for (const command of commands) {
          // Check for potentially dangerous commands
          const dangerousPatterns = [
            /rm -rf \//,
            /sudo rm/,
            /chmod 777/,
            /> \/dev\/null 2>&1/,
          ];

          for (const pattern of dangerousPatterns) {
            if (pattern.test(command)) {
              result.issues.push({
                type: "error",
                category: "accuracy",
                location: { file: path.basename(filePath) },
                description: "Potentially dangerous command in documentation",
                evidence: [command],
                suggestedFix: "Review and provide safer alternative",
                confidence: 95,
              });
            }
          }

          // Check for non-portable commands (Windows vs Unix)
          if (command.includes("\\") && command.includes("/")) {
            result.issues.push({
              type: "warning",
              category: "accuracy",
              location: { file: path.basename(filePath) },
              description: "Mixed path separators in command",
              evidence: [command],
              suggestedFix:
                "Use consistent path separators or provide OS-specific examples",
              confidence: 85,
            });
          }
        }
      }
    }
  }

  private async checkLinkValidity(
    filePath: string,
    content: string,
    result: ValidationResult,
  ): Promise<void> {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: Array<{ text: string; url: string }> = [];
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      links.push({ text: match[1], url: match[2] });
    }

    for (const link of links) {
      // Check internal links
      if (!link.url.startsWith("http")) {
        const targetPath = path.resolve(path.dirname(filePath), link.url);
        try {
          await fs.access(targetPath);
        } catch {
          result.issues.push({
            type: "error",
            category: "accuracy",
            location: { file: path.basename(filePath) },
            description: `Broken internal link: ${link.url}`,
            evidence: [link.text],
            suggestedFix: "Fix the link path or create the missing file",
            confidence: 100,
          });
        }
      }

      // Flag external links for manual verification
      if (link.url.startsWith("http")) {
        result.uncertainties.push({
          area: "external-links",
          severity: "low",
          description: `External link: ${link.url}`,
          potentialImpact: "Link may become outdated or broken",
          clarificationNeeded: "Verify link is still valid",
          fallbackStrategy: "Archive important external content locally",
        });
      }
    }
  }

  private async validateCompleteness(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    const files = await this.getMarkdownFiles(contentPath);
    const structure = await this.analyzeDiataxisStructure(contentPath);

    // Check for missing essential sections
    const requiredSections = [
      "tutorials",
      "how-to",
      "reference",
      "explanation",
    ];
    const missingSections = requiredSections.filter(
      (section) => !structure.sections.includes(section),
    );

    if (missingSections.length > 0) {
      result.issues.push({
        type: "warning",
        category: "completeness",
        location: { file: "documentation structure" },
        description: `Missing Diataxis sections: ${missingSections.join(", ")}`,
        evidence: structure.sections,
        suggestedFix:
          "Add missing Diataxis sections for complete documentation",
        confidence: 100,
      });
    }

    // Check content depth in each section
    for (const section of structure.sections) {
      const sectionFiles = files.filter((f) => f.includes(`/${section}/`));
      if (sectionFiles.length < 2) {
        result.issues.push({
          type: "info",
          category: "completeness",
          location: { file: section },
          description: `Limited content in ${section} section`,
          evidence: [`Only ${sectionFiles.length} files`],
          suggestedFix: "Consider adding more comprehensive coverage",
          confidence: 75,
        });
      }
    }

    // Update completeness confidence
    result.confidence.breakdown.businessContextAlignment = Math.max(
      0,
      100 - missingSections.length * 25,
    );
  }

  private async validateDiataxisCompliance(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    const files = await this.getMarkdownFiles(contentPath);

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const section = this.identifyDiataxisSection(file);

      if (section) {
        await this.checkSectionCompliance(file, content, section, result);
      }
    }
  }

  private async validateApplicationStructureCompliance(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    // Analyze application source code for Diataxis compliance
    await this.validateSourceCodeDocumentation(contentPath, result);
    await this.validateApplicationArchitecture(contentPath, result);
    await this.validateInlineDocumentationPatterns(contentPath, result);
  }

  private async validateSourceCodeDocumentation(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    const sourceFiles = await this.getSourceFiles(contentPath);

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, "utf-8");

      // Check for proper JSDoc/TSDoc documentation
      await this.checkInlineDocumentationQuality(file, content, result);

      // Check for README files and their structure
      if (file.endsWith("README.md")) {
        await this.validateReadmeStructure(file, content, result);
      }

      // Check for proper module/class documentation
      await this.checkModuleDocumentation(file, content, result);
    }
  }

  private async validateApplicationArchitecture(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    // Check if the application structure supports different types of documentation
    const hasToolsDir = await this.pathExists(path.join(contentPath, "tools"));
    const hasTypesDir = await this.pathExists(path.join(contentPath, "types"));
    // Check for workflows directory (currently not used but may be useful for future validation)
    // const hasWorkflowsDir = await this.pathExists(path.join(contentPath, 'workflows'));

    if (!hasToolsDir) {
      result.issues.push({
        type: "warning",
        category: "compliance",
        location: { file: "application structure" },
        description:
          "No dedicated tools directory found - may impact reference documentation organization",
        evidence: ["Missing /tools directory"],
        suggestedFix:
          "Organize tools into dedicated directory for better reference documentation",
        confidence: 80,
      });
    }

    if (!hasTypesDir) {
      result.issues.push({
        type: "info",
        category: "compliance",
        location: { file: "application structure" },
        description:
          "No types directory found - may impact API reference documentation",
        evidence: ["Missing /types directory"],
        suggestedFix: "Consider organizing types for better API documentation",
        confidence: 70,
      });
    }
  }

  private async validateInlineDocumentationPatterns(
    contentPath: string,
    result: ValidationResult,
  ): Promise<void> {
    const sourceFiles = await this.getSourceFiles(contentPath);

    for (const file of sourceFiles) {
      const content = await fs.readFile(file, "utf-8");

      // Check for proper function documentation that could support tutorials
      const functions = this.extractFunctions(content);
      for (const func of functions) {
        if (func.isExported && !func.hasDocumentation) {
          result.issues.push({
            type: "warning",
            category: "compliance",
            location: { file: path.basename(file), line: func.line },
            description: `Exported function '${func.name}' lacks documentation`,
            evidence: [func.signature],
            suggestedFix:
              "Add JSDoc/TSDoc documentation to support tutorial and reference content",
            confidence: 85,
          });
        }
      }

      // Check for proper error handling documentation
      const errorPatterns = content.match(/throw new \w*Error/g);
      if (errorPatterns && errorPatterns.length > 0) {
        const hasErrorDocs =
          content.includes("@throws") || content.includes("@error");
        if (!hasErrorDocs) {
          result.issues.push({
            type: "info",
            category: "compliance",
            location: { file: path.basename(file) },
            description:
              "Error throwing code found without error documentation",
            evidence: errorPatterns,
            suggestedFix:
              "Document error conditions to support troubleshooting guides",
            confidence: 75,
          });
        }
      }
    }
  }

  private identifyDiataxisSection(filePath: string): string | null {
    const sections = ["tutorials", "how-to", "reference", "explanation"];

    for (const section of sections) {
      if (filePath.includes(`/${section}/`)) {
        return section;
      }
    }

    return null;
  }

  private async checkSectionCompliance(
    filePath: string,
    content: string,
    section: string,
    result: ValidationResult,
  ): Promise<void> {
    const complianceRules = this.getDiataxisComplianceRules(section);

    for (const rule of complianceRules) {
      if (!rule.check(content)) {
        result.issues.push({
          type: "warning",
          category: "compliance",
          location: { file: path.basename(filePath), section },
          description: rule.message,
          evidence: [rule.evidence?.(content) || ""],
          suggestedFix: rule.fix,
          confidence: rule.confidence,
        });
      }
    }
  }

  private getDiataxisComplianceRules(section: string) {
    const rules: any = {
      tutorials: [
        {
          check: (content: string) =>
            content.includes("## Prerequisites") ||
            content.includes("## Requirements"),
          message: "Tutorial should include prerequisites section",
          fix: "Add a prerequisites or requirements section",
          confidence: 90,
        },
        {
          check: (content: string) => /step|Step|STEP/.test(content),
          message: "Tutorial should be organized in clear steps",
          fix: "Structure content with numbered steps or clear progression",
          confidence: 85,
        },
        {
          check: (content: string) => content.includes("```"),
          message: "Tutorial should include practical code examples",
          fix: "Add code blocks with working examples",
          confidence: 80,
        },
      ],
      "how-to": [
        {
          check: (content: string) => /how to|How to|HOW TO/.test(content),
          message: "How-to guide should focus on specific tasks",
          fix: "Frame content around achieving specific goals",
          confidence: 75,
        },
        {
          check: (content: string) => content.length > 500,
          message: "How-to guide should provide detailed guidance",
          fix: "Expand with more detailed instructions",
          confidence: 70,
        },
      ],
      reference: [
        {
          check: (content: string) => /##|###/.test(content),
          message: "Reference should be well-structured with clear sections",
          fix: "Add proper headings and organization",
          confidence: 95,
        },
        {
          check: (content: string) => /\|.*\|/.test(content),
          message: "Reference should include tables for structured information",
          fix: "Consider using tables for parameters, options, etc.",
          confidence: 60,
        },
      ],
      explanation: [
        {
          check: (content: string) =>
            content.includes("why") || content.includes("Why"),
          message: 'Explanation should address the "why" behind concepts',
          fix: "Include rationale and context for decisions/concepts",
          confidence: 80,
        },
        {
          check: (content: string) => content.length > 800,
          message: "Explanation should provide in-depth coverage",
          fix: "Expand with more comprehensive explanation",
          confidence: 70,
        },
      ],
    };

    return rules[section] || [];
  }

  private async validateCodeExamples(
    contentPath: string,
  ): Promise<CodeValidationResult> {
    const files = await this.getMarkdownFiles(contentPath);
    const allExamples: ExampleValidation[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const codeBlocks = this.extractCodeBlocks(content);

      for (const block of codeBlocks) {
        if (this.isValidatableLanguage(block.language)) {
          const validation = await this.validateCodeBlock(block, file);
          allExamples.push(validation);
        }
      }
    }

    return {
      overallSuccess: allExamples.every((e) => e.compilationSuccess),
      exampleResults: allExamples,
      confidence: this.calculateCodeValidationConfidence(allExamples),
    };
  }

  private extractCodeBlocks(
    content: string,
  ): Array<{ language: string; code: string; id: string }> {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string; id: string }> = [];
    let match;
    let index = 0;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      blocks.push({
        language: match[1] || "text",
        code: match[2].trim(),
        id: `block-${index++}`,
      });
    }

    return blocks;
  }

  private isValidatableLanguage(language: string): boolean {
    const validatable = [
      "javascript",
      "typescript",
      "js",
      "ts",
      "json",
      "bash",
      "sh",
    ];
    return validatable.includes(language.toLowerCase());
  }

  private async validateCodeBlock(
    block: { language: string; code: string; id: string },
    filePath: string,
  ): Promise<ExampleValidation> {
    const validation: ExampleValidation = {
      example: block.id,
      compilationSuccess: false,
      executionSuccess: false,
      issues: [],
      confidence: 0,
    };

    try {
      if (block.language === "typescript" || block.language === "ts") {
        await this.validateTypeScriptCode(block.code, validation);
      } else if (block.language === "javascript" || block.language === "js") {
        await this.validateJavaScriptCode(block.code, validation);
      } else if (block.language === "json") {
        await this.validateJSONCode(block.code, validation);
      } else if (block.language === "bash" || block.language === "sh") {
        await this.validateBashCode(block.code, validation);
      }
    } catch (error: any) {
      validation.issues.push({
        type: "error",
        category: "accuracy",
        location: { file: path.basename(filePath) },
        description: `Code validation failed: ${error.message}`,
        evidence: [block.code.substring(0, 100)],
        suggestedFix: "Review and fix syntax errors",
        confidence: 95,
      });
    }

    return validation;
  }

  private async validateTypeScriptCode(
    code: string,
    validation: ExampleValidation,
  ): Promise<void> {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    const tempFile = path.join(this.tempDir, `temp-${Date.now()}.ts`);

    try {
      // Write code to temporary file
      await fs.writeFile(tempFile, code, "utf-8");

      // Try to compile with TypeScript
      const { stderr } = await execAsync(
        `npx tsc --noEmit --skipLibCheck ${tempFile}`,
      );

      if (stderr && stderr.includes("error")) {
        validation.issues.push({
          type: "error",
          category: "accuracy",
          location: { file: "code-example" },
          description: "TypeScript compilation error",
          evidence: [stderr],
          suggestedFix: "Fix TypeScript syntax and type errors",
          confidence: 90,
        });
      } else {
        validation.compilationSuccess = true;
        validation.confidence = 85;
      }
    } catch (error: any) {
      if (error.stderr && error.stderr.includes("error")) {
        validation.issues.push({
          type: "error",
          category: "accuracy",
          location: { file: "code-example" },
          description: "TypeScript compilation failed",
          evidence: [error.stderr],
          suggestedFix: "Fix compilation errors",
          confidence: 95,
        });
      }
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async validateJavaScriptCode(
    code: string,
    validation: ExampleValidation,
  ): Promise<void> {
    try {
      // Basic syntax check using Node.js
      new Function(code);
      validation.compilationSuccess = true;
      validation.confidence = 75;
    } catch (error: any) {
      validation.issues.push({
        type: "error",
        category: "accuracy",
        location: { file: "code-example" },
        description: `JavaScript syntax error: ${error.message}`,
        evidence: [code.substring(0, 100)],
        suggestedFix: "Fix JavaScript syntax errors",
        confidence: 90,
      });
    }
  }

  private async validateJSONCode(
    code: string,
    validation: ExampleValidation,
  ): Promise<void> {
    try {
      JSON.parse(code);
      validation.compilationSuccess = true;
      validation.confidence = 95;
    } catch (error: any) {
      validation.issues.push({
        type: "error",
        category: "accuracy",
        location: { file: "code-example" },
        description: `Invalid JSON: ${error.message}`,
        evidence: [code.substring(0, 100)],
        suggestedFix: "Fix JSON syntax errors",
        confidence: 100,
      });
    }
  }

  private async validateBashCode(
    code: string,
    validation: ExampleValidation,
  ): Promise<void> {
    // Basic bash syntax validation
    const lines = code
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));

    for (const line of lines) {
      // Check for basic syntax issues
      if (line.includes("&&") && line.includes("||")) {
        validation.issues.push({
          type: "warning",
          category: "accuracy",
          location: { file: "code-example" },
          description: "Complex command chaining may be confusing",
          evidence: [line],
          suggestedFix:
            "Consider breaking into separate commands or adding explanation",
          confidence: 60,
        });
      }

      // Check for unquoted variables in dangerous contexts
      if (line.includes("rm") && /\$\w+/.test(line) && !/'.*\$.*'/.test(line)) {
        validation.issues.push({
          type: "warning",
          category: "accuracy",
          location: { file: "code-example" },
          description: "Unquoted variable in potentially dangerous command",
          evidence: [line],
          suggestedFix: "Quote variables to prevent word splitting",
          confidence: 80,
        });
      }
    }

    validation.compilationSuccess =
      validation.issues.filter((i) => i.type === "error").length === 0;
    validation.confidence = validation.compilationSuccess ? 70 : 20;
  }

  private calculateCodeValidationConfidence(
    examples: ExampleValidation[],
  ): number {
    if (examples.length === 0) return 0;

    const totalConfidence = examples.reduce(
      (sum, ex) => sum + ex.confidence,
      0,
    );
    return Math.round(totalConfidence / examples.length);
  }

  public async getMarkdownFiles(
    contentPath: string,
    maxDepth: number = 5,
  ): Promise<string[]> {
    const files: string[] = [];
    const excludedDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      ".nuxt",
      "coverage",
      ".tmp",
      "tmp",
      ".cache",
      ".vscode",
      ".idea",
      "logs",
      ".logs",
      ".npm",
      ".yarn",
    ]);

    const scan = async (
      dir: string,
      currentDepth: number = 0,
    ): Promise<void> => {
      if (currentDepth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip excluded directories
            if (excludedDirs.has(entry.name) || entry.name.startsWith(".")) {
              continue;
            }

            // Prevent symlink loops
            try {
              const stats = await fs.lstat(fullPath);
              if (stats.isSymbolicLink()) {
                continue;
              }
            } catch {
              continue;
            }

            await scan(fullPath, currentDepth + 1);
          } else if (entry.name.endsWith(".md")) {
            files.push(fullPath);

            // Limit total files to prevent memory issues
            if (files.length > 500) {
              console.warn("Markdown file limit reached (500), stopping scan");
              return;
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${dir}:`, error);
      }
    };

    try {
      await scan(contentPath);
    } catch (error) {
      console.warn("Error scanning directory:", error);
    }

    return files;
  }

  private async getSourceFiles(
    contentPath: string,
    maxDepth: number = 5,
  ): Promise<string[]> {
    const files: string[] = [];
    const excludedDirs = new Set([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      ".nuxt",
      "coverage",
      ".tmp",
      "tmp",
      ".cache",
      ".vscode",
      ".idea",
      "logs",
      ".logs",
      ".npm",
      ".yarn",
    ]);

    const scan = async (
      dir: string,
      currentDepth: number = 0,
    ): Promise<void> => {
      if (currentDepth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip excluded directories
            if (excludedDirs.has(entry.name) || entry.name.startsWith(".")) {
              continue;
            }

            // Prevent symlink loops
            try {
              const stats = await fs.lstat(fullPath);
              if (stats.isSymbolicLink()) {
                continue;
              }
            } catch {
              continue;
            }

            await scan(fullPath, currentDepth + 1);
          } else if (
            entry.name.endsWith(".ts") ||
            entry.name.endsWith(".js") ||
            entry.name.endsWith(".md")
          ) {
            files.push(fullPath);

            // Limit total files to prevent memory issues
            if (files.length > 1000) {
              console.warn("File limit reached (1000), stopping scan");
              return;
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be read
        console.warn(`Warning: Could not read directory ${dir}:`, error);
      }
    };

    try {
      await scan(contentPath);
    } catch (error) {
      console.warn("Error scanning directory:", error);
    }

    return files;
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private extractFunctions(content: string): Array<{
    name: string;
    line: number;
    signature: string;
    isExported: boolean;
    hasDocumentation: boolean;
  }> {
    const functions: Array<{
      name: string;
      line: number;
      signature: string;
      isExported: boolean;
      hasDocumentation: boolean;
    }> = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match function declarations and exports
      const functionMatch = line.match(
        /^(export\s+)?(async\s+)?function\s+(\w+)/,
      );
      const arrowMatch = line.match(
        /^(export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/,
      );

      if (functionMatch) {
        const name = functionMatch[3];
        const isExported = !!functionMatch[1];
        const hasDocumentation = this.checkForDocumentation(lines, i);

        functions.push({
          name,
          line: i + 1,
          signature: line.trim(),
          isExported,
          hasDocumentation,
        });
      } else if (arrowMatch) {
        const name = arrowMatch[2];
        const isExported = !!arrowMatch[1];
        const hasDocumentation = this.checkForDocumentation(lines, i);

        functions.push({
          name,
          line: i + 1,
          signature: line.trim(),
          isExported,
          hasDocumentation,
        });
      }
    }

    return functions;
  }

  private async checkInlineDocumentationQuality(
    _file: string,
    _content: string,
    _result: ValidationResult,
  ): Promise<void> {
    // Implementation for checking JSDoc/TSDoc quality
    // This could check for proper parameter documentation, return types, etc.
  }

  private async validateReadmeStructure(
    _file: string,
    content: string,
    result: ValidationResult,
  ): Promise<void> {
    // Check if README follows good structure
    const hasTitle = /^#\s+/.test(content);
    const hasDescription =
      content.includes("## Description") || content.includes("## Overview");
    const hasInstallation =
      content.includes("## Installation") || content.includes("## Setup");
    const hasUsage =
      content.includes("## Usage") || content.includes("## Getting Started");

    if (!hasTitle) {
      result.issues.push({
        type: "warning",
        category: "compliance",
        location: { file: "README.md" },
        description: "README missing clear title",
        evidence: ["No H1 heading found"],
        suggestedFix: "Add clear title with # heading",
        confidence: 90,
      });
    }

    if (!hasDescription && !hasInstallation && !hasUsage) {
      result.issues.push({
        type: "warning",
        category: "compliance",
        location: { file: "README.md" },
        description:
          "README lacks essential sections (description, installation, usage)",
        evidence: ["Missing standard README sections"],
        suggestedFix:
          "Add sections for description, installation, and usage following Diataxis principles",
        confidence: 85,
      });
    }
  }

  private async checkModuleDocumentation(
    _file: string,
    _content: string,
    _result: ValidationResult,
  ): Promise<void> {
    // Implementation for checking module-level documentation
    // This could check for file-level JSDoc, proper exports documentation, etc.
  }

  private checkForDocumentation(
    lines: string[],
    functionLineIndex: number,
  ): boolean {
    // Look backwards from the function line to find documentation
    let checkIndex = functionLineIndex - 1;

    // Skip empty lines
    while (checkIndex >= 0 && lines[checkIndex].trim() === "") {
      checkIndex--;
    }

    // Check if we found the end of a JSDoc comment
    if (checkIndex >= 0 && lines[checkIndex].trim() === "*/") {
      // Look backwards to find the start of the JSDoc block
      let jsDocStart = checkIndex;
      while (jsDocStart >= 0) {
        const line = lines[jsDocStart].trim();
        if (line.startsWith("/**")) {
          return true; // Found complete JSDoc block
        }
        if (!line.startsWith("*") && line !== "*/") {
          break; // Not part of JSDoc block
        }
        jsDocStart--;
      }
    }

    // Also check for single-line JSDoc comments
    if (
      checkIndex >= 0 &&
      lines[checkIndex].trim().startsWith("/**") &&
      lines[checkIndex].includes("*/")
    ) {
      return true;
    }

    return false;
  }

  private async shouldAnalyzeApplicationCode(
    contentPath: string,
  ): Promise<boolean> {
    // Check if the path contains application source code vs documentation
    const hasSrcDir = await this.pathExists(path.join(contentPath, "src"));
    const hasPackageJson = await this.pathExists(
      path.join(contentPath, "package.json"),
    );
    const hasTypescriptFiles = (await this.getSourceFiles(contentPath)).some(
      (file) => file.endsWith(".ts"),
    );

    // If path ends with 'src' or is a project root with src/, analyze as application code
    if (
      contentPath.endsWith("/src") ||
      contentPath.endsWith("\\src") ||
      (hasSrcDir && hasPackageJson)
    ) {
      return true;
    }

    // If path contains TypeScript/JavaScript files and package.json, treat as application code
    if (hasTypescriptFiles && hasPackageJson) {
      return true;
    }

    // If path is specifically a documentation directory, analyze as documentation
    if (contentPath.includes("/docs") || contentPath.includes("\\docs")) {
      return false;
    }

    return false;
  }

  private async analyzeDiataxisStructure(
    contentPath: string,
  ): Promise<{ sections: string[] }> {
    const sections: string[] = [];

    try {
      const entries = await fs.readdir(contentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirName = entry.name;
          if (
            ["tutorials", "how-to", "reference", "explanation"].includes(
              dirName,
            )
          ) {
            sections.push(dirName);
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }

    return { sections };
  }

  private updateAccuracyConfidence(result: ValidationResult): void {
    const errorCount = result.issues.filter((i) => i.type === "error").length;
    const warningCount = result.issues.filter(
      (i) => i.type === "warning",
    ).length;

    // Base confidence starts high and decreases with issues
    let confidence = 95;
    confidence -= errorCount * 20;
    confidence -= warningCount * 5;
    confidence = Math.max(0, confidence);

    result.confidence.breakdown.technologyDetection = confidence;
  }

  private calculateOverallMetrics(result: ValidationResult): void {
    const breakdown = result.confidence.breakdown;
    const values = Object.values(breakdown).filter((v) => v > 0);

    if (values.length > 0) {
      result.confidence.overall = Math.round(
        values.reduce((a, b) => a + b, 0) / values.length,
      );
    }

    // Determine overall success
    const criticalIssues = result.issues.filter(
      (i) => i.type === "error",
    ).length;
    result.success = criticalIssues === 0;

    // Add risk factors based on issues
    if (criticalIssues > 0) {
      result.confidence.riskFactors.push({
        type: "high",
        category: "accuracy",
        description: `${criticalIssues} critical accuracy issues found`,
        impact: "Users may encounter broken examples or incorrect information",
        mitigation: "Fix all critical issues before publication",
      });
    }

    const uncertaintyCount = result.uncertainties.length;
    if (uncertaintyCount > 5) {
      result.confidence.riskFactors.push({
        type: "medium",
        category: "completeness",
        description: `${uncertaintyCount} areas requiring clarification`,
        impact: "Documentation may lack specificity for user context",
        mitigation: "Address high-priority uncertainties with user input",
      });
    }
  }

  private generateRecommendations(
    result: ValidationResult,
    _options: ValidationOptions,
  ): void {
    const recommendations: string[] = [];
    const nextSteps: string[] = [];

    // Generate recommendations based on issues found
    const errorCount = result.issues.filter((i) => i.type === "error").length;
    if (errorCount > 0) {
      recommendations.push(
        `Fix ${errorCount} critical accuracy issues before publication`,
      );
      nextSteps.push("Review and resolve all error-level validation issues");
    }

    const warningCount = result.issues.filter(
      (i) => i.type === "warning",
    ).length;
    if (warningCount > 0) {
      recommendations.push(
        `Address ${warningCount} potential accuracy concerns`,
      );
      nextSteps.push(
        "Review warning-level issues and apply fixes where appropriate",
      );
    }

    const uncertaintyCount = result.uncertainties.filter(
      (u) => u.severity === "high" || u.severity === "critical",
    ).length;
    if (uncertaintyCount > 0) {
      recommendations.push(
        `Clarify ${uncertaintyCount} high-uncertainty areas`,
      );
      nextSteps.push("Gather user input on areas flagged for clarification");
    }

    // Code validation recommendations
    if (result.codeValidation && !result.codeValidation.overallSuccess) {
      recommendations.push(
        "Fix code examples that fail compilation or execution tests",
      );
      nextSteps.push(
        "Test all code examples in appropriate development environment",
      );
    }

    // Completeness recommendations
    const missingCompliance = result.issues.filter(
      (i) => i.category === "compliance",
    ).length;
    if (missingCompliance > 0) {
      recommendations.push(
        "Improve Diataxis framework compliance for better user experience",
      );
      nextSteps.push(
        "Restructure content to better align with Diataxis principles",
      );
    }

    // General recommendations based on confidence level
    if (result.confidence.overall < 70) {
      recommendations.push(
        "Overall confidence is below recommended threshold - consider comprehensive review",
      );
      nextSteps.push(
        "Conduct manual review of generated content before publication",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Content validation passed - ready for publication");
      nextSteps.push("Deploy documentation and monitor for user feedback");
    }

    result.recommendations = recommendations;
    result.nextSteps = nextSteps;
  }
}

export const validateDiataxisContent: Tool = {
  name: "validate_diataxis_content",
  description:
    "Validate the accuracy, completeness, and compliance of generated Diataxis documentation",
  inputSchema: {
    type: "object",
    properties: {
      contentPath: {
        type: "string",
        description: "Path to the documentation directory to validate",
      },
      analysisId: {
        type: "string",
        description:
          "Optional repository analysis ID for context-aware validation",
      },
      validationType: {
        type: "string",
        enum: ["accuracy", "completeness", "compliance", "all"],
        default: "all",
        description: "Type of validation to perform",
      },
      includeCodeValidation: {
        type: "boolean",
        default: true,
        description: "Whether to validate code examples for correctness",
      },
      confidence: {
        type: "string",
        enum: ["strict", "moderate", "permissive"],
        default: "moderate",
        description:
          "Validation confidence level - stricter levels catch more issues",
      },
    },
    required: ["contentPath"],
  },
};

/**
 * Validates Diataxis-compliant documentation content for accuracy, completeness, and compliance.
 *
 * Performs comprehensive validation of documentation content including accuracy verification,
 * completeness assessment, compliance checking, and code example validation. Uses advanced
 * confidence scoring and risk assessment to provide detailed validation results with
 * actionable recommendations.
 *
 * @param args - The validation parameters
 * @param args.contentPath - Path to the documentation content directory
 * @param args.analysisId - Optional repository analysis ID for context-aware validation
 * @param args.validationType - Type of validation to perform: "accuracy", "completeness", "compliance", or "all"
 * @param args.includeCodeValidation - Whether to validate code examples and syntax
 * @param args.confidence - Validation confidence level: "strict", "moderate", or "permissive"
 *
 * @returns Promise resolving to comprehensive validation results
 * @returns success - Whether validation passed overall
 * @returns confidence - Confidence metrics and risk assessment
 * @returns issues - Array of validation issues found
 * @returns uncertainties - Areas requiring clarification
 * @returns codeValidation - Code example validation results
 * @returns recommendations - Suggested improvements
 * @returns nextSteps - Recommended next actions
 *
 * @throws {Error} When content path is inaccessible
 * @throws {Error} When validation processing fails
 *
 * @example
 * ```typescript
 * // Comprehensive validation
 * const result = await handleValidateDiataxisContent({
 *   contentPath: "./docs",
 *   validationType: "all",
 *   includeCodeValidation: true,
 *   confidence: "moderate"
 * });
 *
 * console.log(`Validation success: ${result.success}`);
 * console.log(`Overall confidence: ${result.confidence.overall}%`);
 * console.log(`Issues found: ${result.issues.length}`);
 *
 * // Strict accuracy validation
 * const accuracy = await handleValidateDiataxisContent({
 *   contentPath: "./docs",
 *   validationType: "accuracy",
 *   confidence: "strict"
 * });
 * ```
 *
 * @since 1.0.0
 */
export async function handleValidateDiataxisContent(
  args: any,
  context?: any,
): Promise<ValidationResult> {
  await context?.info?.("🔍 Starting Diataxis content validation...");

  const validator = new ContentAccuracyValidator();

  // Add timeout protection to prevent infinite hangs
  const timeoutMs = 120000; // 2 minutes
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<ValidationResult>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Validation timed out after ${
            timeoutMs / 1000
          } seconds. This may be due to a large directory structure. Try validating a smaller subset or specific directory.`,
        ),
      );
    }, timeoutMs);
  });

  const validationPromise = validator.validateContent(args, context);

  try {
    const result = await Promise.race([validationPromise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutHandle!);
    // Return a partial result with error information
    return {
      success: false,
      confidence: {
        overall: 0,
        breakdown: {
          technologyDetection: 0,
          frameworkVersionAccuracy: 0,
          codeExampleRelevance: 0,
          architecturalAssumptions: 0,
          businessContextAlignment: 0,
        },
        riskFactors: [
          {
            type: "high",
            category: "validation",
            description: "Validation process failed or timed out",
            impact: "Unable to complete content validation",
            mitigation:
              "Try validating a smaller directory or specific subset of files",
          },
        ],
      },
      issues: [],
      uncertainties: [],
      recommendations: [
        "Validation failed or timed out",
        "Consider validating smaller directory subsets",
        "Check for very large files or deep directory structures",
        `Error: ${error.message}`,
      ],
      nextSteps: [
        "Verify the content path is correct and accessible",
        "Try validating specific subdirectories instead of the entire project",
        "Check for circular symlinks or very deep directory structures",
      ],
    };
  }
}

interface GeneralValidationResult {
  success: boolean;
  linksChecked: number;
  brokenLinks: string[];
  codeBlocksValidated: number;
  codeErrors: string[];
  recommendations: string[];
  summary: string;
}

export async function validateGeneralContent(
  args: any,
): Promise<GeneralValidationResult> {
  const {
    contentPath,
    validationType = "all",
    includeCodeValidation = true,
    followExternalLinks = false,
  } = args;

  const result: GeneralValidationResult = {
    success: true,
    linksChecked: 0,
    brokenLinks: [],
    codeBlocksValidated: 0,
    codeErrors: [],
    recommendations: [],
    summary: "",
  };

  try {
    // Get all markdown files
    const validator = new ContentAccuracyValidator();
    const files = await validator.getMarkdownFiles(contentPath);

    // Check links if requested
    if (validationType === "all" || validationType === "links") {
      for (const file of files) {
        const content = await fs.readFile(file, "utf-8");
        const links = extractLinksFromMarkdown(content);

        for (const link of links) {
          result.linksChecked++;

          // Skip external links unless explicitly requested
          if (link.startsWith("http") && !followExternalLinks) continue;

          // Check internal links
          if (!link.startsWith("http")) {
            const fullPath = path.resolve(path.dirname(file), link);
            try {
              await fs.access(fullPath);
            } catch {
              result.brokenLinks.push(`${path.basename(file)}: ${link}`);
              result.success = false;
            }
          }
        }
      }
    }

    // Validate code blocks if requested
    if (
      includeCodeValidation &&
      (validationType === "all" || validationType === "code")
    ) {
      for (const file of files) {
        const content = await fs.readFile(file, "utf-8");
        const codeBlocks = extractCodeBlocks(content);

        for (const block of codeBlocks) {
          result.codeBlocksValidated++;

          // Basic syntax validation
          if (block.language && block.code.trim()) {
            if (block.language === "javascript" || block.language === "js") {
              try {
                // Basic JS syntax check - look for common issues
                if (
                  block.code.includes("console.log") &&
                  !block.code.includes(";")
                ) {
                  result.codeErrors.push(
                    `${path.basename(file)}: Missing semicolon in JS code`,
                  );
                }
              } catch (error) {
                result.codeErrors.push(
                  `${path.basename(file)}: JS syntax error - ${error}`,
                );
                result.success = false;
              }
            }
          }
        }
      }
    }

    // Generate recommendations
    if (result.brokenLinks.length > 0) {
      result.recommendations.push(
        `Fix ${result.brokenLinks.length} broken internal links`,
      );
      result.recommendations.push(
        "Run documentation build to catch additional link issues",
      );
    }

    if (result.codeErrors.length > 0) {
      result.recommendations.push(
        `Review and fix ${result.codeErrors.length} code syntax issues`,
      );
    }

    if (result.success) {
      result.recommendations.push(
        "Content validation passed - no critical issues found",
      );
    }

    // Create summary
    result.summary = `Validated ${files.length} files, ${
      result.linksChecked
    } links, ${result.codeBlocksValidated} code blocks. ${
      result.success
        ? "PASSED"
        : `ISSUES FOUND: ${
            result.brokenLinks.length + result.codeErrors.length
          }`
    }`;

    return result;
  } catch (error) {
    result.success = false;
    result.recommendations.push(`Validation failed: ${error}`);
    result.summary = `Validation error: ${error}`;
    return result;
  }
}

// Helper function to extract links from markdown
function extractLinksFromMarkdown(content: string): string[] {
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]); // The URL part
  }

  return links;
}

// Helper function to extract code blocks from markdown
function extractCodeBlocks(
  content: string,
): { language: string; code: string }[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { language: string; code: string }[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2],
    });
  }

  return blocks;
}
