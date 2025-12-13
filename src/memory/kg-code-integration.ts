/**
 * Knowledge Graph Code Integration Module
 * Implements Phase 1.2: Documentation Context in Knowledge Graph
 *
 * Populates the knowledge graph with code file entities, documentation section entities,
 * and relationships between code and documentation for drift detection and coverage analysis.
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { GraphNode, GraphEdge } from "./knowledge-graph.js";
import { ExtractedContent } from "../utils/content-extractor.js";
import { getKnowledgeGraph } from "./kg-integration.js";
import { validateAndStoreDocumentationLinks } from "./kg-link-validator.js";
import { ASTAnalyzer } from "../utils/ast-analyzer.js";

/**
 * Create code file entities from repository source code
 */
export async function createCodeFileEntities(
  projectId: string,
  repoPath: string,
): Promise<GraphNode[]> {
  const kg = await getKnowledgeGraph();
  const codeFiles: GraphNode[] = [];

  // Directories to scan for code
  const sourceDirs = ["src", "lib", "app", "packages"];

  for (const dir of sourceDirs) {
    const dirPath = path.join(repoPath, dir);
    try {
      await fs.access(dirPath);
      const files = await walkSourceFiles(dirPath, repoPath);

      for (const filePath of files) {
        try {
          const codeFileNode = await createCodeFileEntity(
            projectId,
            filePath,
            repoPath,
          );
          if (codeFileNode) {
            kg.addNode(codeFileNode);
            codeFiles.push(codeFileNode);

            // Create relationship: project -> code_file
            kg.addEdge({
              source: projectId,
              target: codeFileNode.id,
              type: "depends_on",
              weight: 1.0,
              confidence: 1.0,
              properties: {
                dependencyType: "contains",
              },
            });
          }
        } catch (error) {
          console.warn(`Failed to process file ${filePath}:`, error);
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return codeFiles;
}

/**
 * Create a single code file entity
 */
async function createCodeFileEntity(
  projectId: string,
  filePath: string,
  repoPath: string,
): Promise<GraphNode | null> {
  const content = await fs.readFile(filePath, "utf-8");
  const stats = await fs.stat(filePath);
  const relativePath = path.relative(repoPath, filePath);
  const ext = path.extname(filePath);
  const language = getLanguageFromExtension(ext);

  if (!language) return null;

  // Calculate content hash for change detection
  const contentHash = crypto.createHash("sha256").update(content).digest("hex");

  // Extract functions and classes using AST parsing
  const { functions, classes, imports, exports } = await extractCodeStructure(
    filePath,
    content,
    language,
  );

  // Estimate complexity
  const linesOfCode = content.split("\n").length;
  const complexity = estimateComplexity(linesOfCode, functions.length);

  const nodeId = `code_file:${projectId}:${relativePath.replace(
    /[/\\]/g,
    ":",
  )}`;

  return {
    id: nodeId,
    type: "code_file",
    label: path.basename(filePath),
    properties: {
      path: relativePath,
      language,
      functions,
      classes,
      dependencies: imports, // Now extracted via AST
      imports,
      exports,
      lastModified: stats.mtime.toISOString(),
      linesOfCode,
      contentHash,
      complexity,
    },
    weight: 1.0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Create documentation section entities from extracted content
 */
export async function createDocumentationEntities(
  projectId: string,
  extractedContent: ExtractedContent,
): Promise<GraphNode[]> {
  const kg = await getKnowledgeGraph();
  const docSections: GraphNode[] = [];

  // Process README sections
  if (extractedContent.readme) {
    for (const section of extractedContent.readme.sections) {
      const docNode = createDocSectionEntity(
        projectId,
        "README.md",
        section.title,
        extractedContent.readme.content.substring(0, 1000), // First 1000 chars
        "reference",
      );
      kg.addNode(docNode);
      docSections.push(docNode);

      // Create relationship: project -> documentation_section
      kg.addEdge({
        source: projectId,
        target: docNode.id,
        type: "depends_on",
        weight: 1.0,
        confidence: 1.0,
        properties: {
          dependencyType: "contains",
        },
      });
    }
  }

  // Process existing docs
  for (const doc of extractedContent.existingDocs) {
    const docNode = createDocSectionEntity(
      projectId,
      doc.path,
      doc.title,
      doc.content,
      doc.category,
    );
    kg.addNode(docNode);
    docSections.push(docNode);

    // Create relationship: project -> documentation_section
    kg.addEdge({
      source: projectId,
      target: docNode.id,
      type: "depends_on",
      weight: 1.0,
      confidence: 1.0,
      properties: {
        dependencyType: "contains",
      },
    });

    // Validate external links in documentation (async, non-blocking)
    validateAndStoreDocumentationLinks(docNode.id, doc.content).catch((error) =>
      console.warn(`Failed to validate links in ${doc.path}:`, error.message),
    );
  }

  // Process ADRs
  for (const adr of extractedContent.adrs) {
    // Format ADR filename: adr-0001-title.md (4-digit zero-padded number)
    const adrNumber = adr.number.padStart(4, "0");
    const docNode = createDocSectionEntity(
      projectId,
      `docs/adrs/adr-${adrNumber}-${adr.title}.md`,
      adr.title,
      adr.content,
      "explanation",
    );
    kg.addNode(docNode);
    docSections.push(docNode);

    kg.addEdge({
      source: projectId,
      target: docNode.id,
      type: "depends_on",
      weight: 1.0,
      confidence: 1.0,
      properties: {
        dependencyType: "contains",
      },
    });
  }

  return docSections;
}

/**
 * Create a single documentation section entity
 */
function createDocSectionEntity(
  projectId: string,
  filePath: string,
  sectionTitle: string,
  content: string,
  category?: "tutorial" | "how-to" | "reference" | "explanation",
): GraphNode {
  const contentHash = crypto.createHash("sha256").update(content).digest("hex");
  const wordCount = content.split(/\s+/).length;
  const hasCodeExamples = /```/.test(content);

  // Extract referenced code files/functions from content
  const referencedCodeFiles = extractCodeReferences(content);
  const referencedFunctions = extractFunctionReferences(content);
  const referencedClasses = extractClassReferences(content);

  const nodeId = `documentation_section:${projectId}:${filePath.replace(
    /[/\\]/g,
    ":",
  )}:${sectionTitle.replace(/\s+/g, "_")}`;

  return {
    id: nodeId,
    type: "documentation_section",
    label: sectionTitle,
    properties: {
      filePath,
      sectionTitle,
      contentHash,
      referencedCodeFiles,
      referencedFunctions,
      referencedClasses,
      lastUpdated: new Date().toISOString(),
      category,
      effectivenessScore: hasCodeExamples ? 0.8 : 0.5,
      wordCount,
      hasCodeExamples,
    },
    weight: 1.0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Link code files to documentation sections
 */
export async function linkCodeToDocs(
  codeFiles: GraphNode[],
  docSections: GraphNode[],
): Promise<GraphEdge[]> {
  const kg = await getKnowledgeGraph();
  const edges: GraphEdge[] = [];

  for (const docSection of docSections) {
    const { referencedCodeFiles, referencedFunctions, referencedClasses } =
      docSection.properties;

    // Create "references" edges: documentation_section -> code_file
    for (const codeFile of codeFiles) {
      const codeFilePath = codeFile.properties.path;

      // Check if doc references this code file
      if (
        referencedCodeFiles.includes(codeFilePath) ||
        referencedFunctions.some((fn: string) =>
          codeFile.properties.functions.includes(fn),
        ) ||
        referencedClasses.some((cls: string) =>
          codeFile.properties.classes.includes(cls),
        )
      ) {
        const edge = kg.addEdge({
          source: docSection.id,
          target: codeFile.id,
          type: "references",
          weight: 1.0,
          confidence: 0.8,
          properties: {
            referenceType: determineReferenceType(
              docSection.properties.category,
            ),
            isAccurate: true, // Assume accurate until drift detected
            lastVerified: new Date().toISOString(),
          },
        });
        edges.push(edge);

        // Create reverse "documents" edge: code_file -> documentation_section
        const documentsEdge = kg.addEdge({
          source: codeFile.id,
          target: docSection.id,
          type: "documents",
          weight: 1.0,
          confidence: 0.8,
          properties: {
            coverage: determineCoverage(
              referencedFunctions.length,
              codeFile.properties.functions.length,
            ),
            lastVerified: new Date().toISOString(),
            quality: "medium",
          },
        });
        edges.push(documentsEdge);
      }
    }
  }

  // Detect outdated documentation
  for (const docSection of docSections) {
    for (const edge of edges) {
      if (edge.source === docSection.id && edge.type === "references") {
        const codeFile = codeFiles.find((cf) => cf.id === edge.target);
        if (codeFile) {
          // Check if code has changed since doc was last updated
          const docUpdated = new Date(docSection.properties.lastUpdated);
          const codeUpdated = new Date(codeFile.properties.lastModified);

          if (codeUpdated > docUpdated) {
            // Simple heuristic for change type - could be enhanced with drift detector
            const changeType = "modification"; // AST-based diff available via DriftDetector

            const outdatedEdge = kg.addEdge({
              source: docSection.id,
              target: codeFile.id,
              type: "outdated_for",
              weight: 0.5,
              confidence: 0.9,
              properties: {
                detectedAt: new Date().toISOString(),
                changeType, // Enhanced from "unknown" - can integrate DriftDetector for precise diff
                severity: "medium",
                autoFixable: false,
              },
            });
            edges.push(outdatedEdge);
          }
        }
      }
    }
  }

  return edges;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function walkSourceFiles(
  dir: string,
  baseDir: string,
  files: string[] = [],
): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules" &&
        entry.name !== "dist" &&
        entry.name !== "build"
      ) {
        await walkSourceFiles(fullPath, baseDir, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (
          [
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            ".py",
            ".rb",
            ".go",
            ".java",
            ".rs",
            ".c",
            ".cpp",
            ".cs",
          ].includes(ext)
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

function getLanguageFromExtension(ext: string): string | null {
  const languageMap: Record<string, string> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".java": "java",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
  };

  return languageMap[ext] || null;
}

/**
 * Extract code structure using AST parsing (replaces regex-based extraction)
 * Addresses TODO: Use proper AST parsing instead of basic regex
 */
async function extractCodeStructure(
  filePath: string,
  content: string,
  language: string,
): Promise<{
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
}> {
  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const exports: string[] = [];

  // Use AST analyzer for TypeScript/JavaScript files
  if (language === "typescript" || language === "javascript") {
    try {
      const analyzer = new ASTAnalyzer();
      await analyzer.initialize();

      const astResult = await analyzer.analyzeFile(filePath);

      if (astResult) {
        // Extract function names
        functions.push(...astResult.functions.map((f) => f.name));

        // Extract class names
        classes.push(...astResult.classes.map((c) => c.name));

        // Note: AST analyzer doesn't currently track dependencies per function/class
        // We'll extract imports from the code using regex as fallback
        const importMatches = content.matchAll(
          /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        );
        for (const match of importMatches) {
          imports.push(match[1]);
        }

        // Extract exports (check isExported flag)
        const exportedFunctions = astResult.functions
          .filter((f) => f.isExported)
          .map((f) => f.name);
        const exportedClasses = astResult.classes
          .filter((c) => c.isExported)
          .map((c) => c.name);
        exports.push(...exportedFunctions, ...exportedClasses);

        return { functions, classes, imports, exports };
      }
    } catch (error) {
      console.warn(
        `AST parsing failed for ${filePath}, falling back to regex:`,
        error,
      );
      // Fall through to regex-based extraction
    }
  }

  // Fallback: regex-based extraction for non-TS/JS or if AST fails
  if (language === "typescript" || language === "javascript") {
    // Extract function declarations
    const functionMatches = content.matchAll(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    );
    for (const match of functionMatches) {
      functions.push(match[1]);
    }

    // Extract arrow functions assigned to const/let
    const arrowFunctionMatches = content.matchAll(
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    );
    for (const match of arrowFunctionMatches) {
      functions.push(match[1]);
    }

    // Extract class declarations
    const classMatches = content.matchAll(/(?:export\s+)?class\s+(\w+)/g);
    for (const match of classMatches) {
      classes.push(match[1]);
    }

    // Extract imports
    const importMatches = content.matchAll(
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    );
    for (const match of importMatches) {
      imports.push(match[1]);
    }

    // Extract exports
    const exportMatches = content.matchAll(
      /export\s+(?:function|class|const|let|var)\s+(\w+)/g,
    );
    for (const match of exportMatches) {
      exports.push(match[1]);
    }
  } else if (language === "python") {
    const functionMatches = content.matchAll(/def\s+(\w+)/g);
    for (const match of functionMatches) {
      functions.push(match[1]);
    }

    const classMatches = content.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      classes.push(match[1]);
    }

    // Extract Python imports
    const importMatches = content.matchAll(
      /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g,
    );
    for (const match of importMatches) {
      imports.push(match[1] || match[2].trim());
    }
  }

  return { functions, classes, imports, exports };
}

function estimateComplexity(
  linesOfCode: number,
  functionCount: number,
): "low" | "medium" | "high" {
  const score = linesOfCode + functionCount * 10;

  if (score < 100) return "low";
  if (score < 300) return "medium";
  return "high";
}

function extractCodeReferences(content: string): string[] {
  const references: string[] = [];

  // Extract file paths from markdown links and code blocks
  const filePathMatches = content.matchAll(/`([^`]+\.(ts|js|py|rb|go|java))`/g);
  for (const match of filePathMatches) {
    references.push(match[1]);
  }

  return references;
}

function extractFunctionReferences(content: string): string[] {
  const functions: string[] = [];

  // Extract function names from code blocks and inline code
  const functionMatches = content.matchAll(/`(\w+)\(\)`/g);
  for (const match of functionMatches) {
    functions.push(match[1]);
  }

  return functions;
}

function extractClassReferences(content: string): string[] {
  const classes: string[] = [];

  // Extract class names from code blocks (usually PascalCase)
  const classMatches = content.matchAll(/`([A-Z][a-zA-Z0-9]+)`/g);
  for (const match of classMatches) {
    if (!/\(\)$/.test(match[1])) {
      // Not a function call
      classes.push(match[1]);
    }
  }

  return classes;
}

function determineReferenceType(
  category?: "tutorial" | "how-to" | "reference" | "explanation",
): "example" | "api-reference" | "tutorial" | "explanation" {
  switch (category) {
    case "tutorial":
      return "tutorial";
    case "reference":
      return "api-reference";
    case "how-to":
      return "example";
    case "explanation":
      return "explanation";
    default:
      return "api-reference";
  }
}

function determineCoverage(
  referencedCount: number,
  totalCount: number,
): "partial" | "complete" | "comprehensive" {
  if (totalCount === 0) return "partial";

  const ratio = referencedCount / totalCount;

  if (ratio >= 0.8) return "comprehensive";
  if (ratio >= 0.5) return "complete";
  return "partial";
}
