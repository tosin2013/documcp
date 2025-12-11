/**
 * AST-based Code Analyzer (Phase 3)
 *
 * Uses tree-sitter parsers for multi-language AST analysis
 * Provides deep code structure extraction for drift detection
 */

import { parse as parseTypeScript } from "@typescript-eslint/typescript-estree";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Language configuration
const LANGUAGE_CONFIGS: Record<
  string,
  { parser: string; extensions: string[] }
> = {
  typescript: { parser: "tree-sitter-typescript", extensions: [".ts", ".tsx"] },
  javascript: {
    parser: "tree-sitter-javascript",
    extensions: [".js", ".jsx", ".mjs"],
  },
  python: { parser: "tree-sitter-python", extensions: [".py"] },
  rust: { parser: "tree-sitter-rust", extensions: [".rs"] },
  go: { parser: "tree-sitter-go", extensions: [".go"] },
  java: { parser: "tree-sitter-java", extensions: [".java"] },
  ruby: { parser: "tree-sitter-ruby", extensions: [".rb"] },
  bash: { parser: "tree-sitter-bash", extensions: [".sh", ".bash"] },
};

export interface FunctionSignature {
  name: string;
  parameters: ParameterInfo[];
  returnType: string | null;
  isAsync: boolean;
  isExported: boolean;
  isPublic: boolean;
  docComment: string | null;
  startLine: number;
  endLine: number;
  complexity: number;
  dependencies: string[];
}

export interface ParameterInfo {
  name: string;
  type: string | null;
  optional: boolean;
  defaultValue: string | null;
}

export interface ClassInfo {
  name: string;
  isExported: boolean;
  extends: string | null;
  implements: string[];
  methods: FunctionSignature[];
  properties: PropertyInfo[];
  docComment: string | null;
  startLine: number;
  endLine: number;
}

export interface PropertyInfo {
  name: string;
  type: string | null;
  isStatic: boolean;
  isReadonly: boolean;
  visibility: "public" | "private" | "protected";
}

export interface InterfaceInfo {
  name: string;
  isExported: boolean;
  extends: string[];
  properties: PropertyInfo[];
  methods: FunctionSignature[];
  docComment: string | null;
  startLine: number;
  endLine: number;
}

export interface TypeInfo {
  name: string;
  isExported: boolean;
  definition: string;
  docComment: string | null;
  startLine: number;
  endLine: number;
}

export interface ImportInfo {
  source: string;
  imports: Array<{ name: string; alias?: string }>;
  isDefault: boolean;
  startLine: number;
}

export interface ASTAnalysisResult {
  filePath: string;
  language: string;
  functions: FunctionSignature[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  types: TypeInfo[];
  imports: ImportInfo[];
  exports: string[];
  contentHash: string;
  lastModified: string;
  linesOfCode: number;
  complexity: number;
}

export interface CodeDiff {
  type: "added" | "removed" | "modified" | "unchanged";
  category: "function" | "class" | "interface" | "type" | "import" | "export";
  name: string;
  details: string;
  oldSignature?: string;
  newSignature?: string;
  impactLevel: "breaking" | "major" | "minor" | "patch";
}

/**
 * Call graph node representing a function and its calls (Issue #72)
 */
export interface CallGraphNode {
  /** Function signature with full metadata */
  function: FunctionSignature;
  /** File location of this function */
  location: {
    file: string;
    line: number;
    column?: number;
  };
  /** Child function calls made by this function */
  calls: CallGraphNode[];
  /** Conditional branches (if/else, switch) with their paths */
  conditionalBranches: ConditionalPath[];
  /** Exception types that can be raised */
  exceptions: ExceptionPath[];
  /** Current recursion depth */
  depth: number;
  /** Whether this node was truncated due to maxDepth */
  truncated: boolean;
  /** Whether this is an external/imported function */
  isExternal: boolean;
  /** Source of the import if external */
  importSource?: string;
}

/**
 * Conditional execution path (if/else, switch, ternary)
 */
export interface ConditionalPath {
  /** Type of conditional */
  type: "if" | "else-if" | "else" | "switch-case" | "ternary";
  /** The condition expression as string */
  condition: string;
  /** Line number of the conditional */
  lineNumber: number;
  /** Functions called in the true/case branch */
  trueBranch: CallGraphNode[];
  /** Functions called in the false/else branch */
  falseBranch: CallGraphNode[];
}

/**
 * Exception path tracking
 */
export interface ExceptionPath {
  /** Exception type/class being thrown */
  exceptionType: string;
  /** Line number of the throw statement */
  lineNumber: number;
  /** The throw expression as string */
  expression: string;
  /** Whether this is caught within the function */
  isCaught: boolean;
}

/**
 * Complete call graph for an entry point (Issue #72)
 */
export interface CallGraph {
  /** Name of the entry point function */
  entryPoint: string;
  /** Root node of the call graph */
  root: CallGraphNode;
  /** All discovered functions in the call graph */
  allFunctions: Map<string, FunctionSignature>;
  /** Maximum depth that was actually reached */
  maxDepthReached: number;
  /** Files that were analyzed */
  analyzedFiles: string[];
  /** Circular references detected */
  circularReferences: Array<{ from: string; to: string }>;
  /** External calls that couldn't be resolved */
  unresolvedCalls: Array<{
    name: string;
    location: { file: string; line: number };
  }>;
  /** Build timestamp */
  buildTime: string;
}

/**
 * Options for building call graphs
 */
export interface CallGraphOptions {
  /** Maximum recursion depth (default: 3) */
  maxDepth?: number;
  /** Whether to resolve cross-file imports (default: true) */
  resolveImports?: boolean;
  /** Whether to extract conditional branches (default: true) */
  extractConditionals?: boolean;
  /** Whether to track exceptions (default: true) */
  trackExceptions?: boolean;
  /** File extensions to consider for import resolution */
  extensions?: string[];
}

/**
 * Main AST Analyzer class
 */
export class ASTAnalyzer {
  private parsers: Map<string, any> = new Map();
  private initialized = false;

  /**
   * Initialize tree-sitter parsers for all languages
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Note: Tree-sitter initialization would happen here in a full implementation
    // For now, we're primarily using TypeScript/JavaScript parser
    // console.log(
    //   "AST Analyzer initialized with language support:",
    //   Object.keys(LANGUAGE_CONFIGS),
    // );
    this.initialized = true;
  }

  /**
   * Analyze a single file and extract AST information
   */
  async analyzeFile(filePath: string): Promise<ASTAnalysisResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const ext = path.extname(filePath);
    const language = this.detectLanguage(ext);

    if (!language) {
      console.warn(`Unsupported file extension: ${ext}`);
      return null;
    }

    const content = await fs.readFile(filePath, "utf-8");
    const stats = await fs.stat(filePath);

    // Use TypeScript parser for .ts/.tsx files
    if (language === "typescript" || language === "javascript") {
      return this.analyzeTypeScript(
        filePath,
        content,
        stats.mtime.toISOString(),
      );
    }

    // For other languages, use tree-sitter (placeholder)
    return this.analyzeWithTreeSitter(
      filePath,
      content,
      language,
      stats.mtime.toISOString(),
    );
  }

  /**
   * Analyze TypeScript/JavaScript using typescript-estree
   */
  private async analyzeTypeScript(
    filePath: string,
    content: string,
    lastModified: string,
  ): Promise<ASTAnalysisResult> {
    const functions: FunctionSignature[] = [];
    const classes: ClassInfo[] = [];
    const interfaces: InterfaceInfo[] = [];
    const types: TypeInfo[] = [];
    const imports: ImportInfo[] = [];
    const exports: string[] = [];

    try {
      const ast = parseTypeScript(content, {
        loc: true,
        range: true,
        tokens: false,
        comment: true,
        jsx: filePath.endsWith(".tsx") || filePath.endsWith(".jsx"),
      });

      // Extract functions
      this.extractFunctions(ast, content, functions);

      // Extract classes
      this.extractClasses(ast, content, classes);

      // Extract interfaces
      this.extractInterfaces(ast, content, interfaces);

      // Extract type aliases
      this.extractTypes(ast, content, types);

      // Extract imports
      this.extractImports(ast, imports);

      // Extract exports
      this.extractExports(ast, exports);
    } catch (error) {
      console.warn(`Failed to parse TypeScript file ${filePath}:`, error);
    }

    const contentHash = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
    const linesOfCode = content.split("\n").length;
    const complexity = this.calculateComplexity(functions, classes);

    return {
      filePath,
      language:
        filePath.endsWith(".ts") || filePath.endsWith(".tsx")
          ? "typescript"
          : "javascript",
      functions,
      classes,
      interfaces,
      types,
      imports,
      exports,
      contentHash,
      lastModified,
      linesOfCode,
      complexity,
    };
  }

  /**
   * Analyze using tree-sitter (placeholder for other languages)
   */
  private async analyzeWithTreeSitter(
    filePath: string,
    content: string,
    language: string,
    lastModified: string,
  ): Promise<ASTAnalysisResult> {
    // Placeholder for tree-sitter analysis
    // In a full implementation, we'd parse the content using tree-sitter
    // and extract language-specific constructs

    const contentHash = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");
    const linesOfCode = content.split("\n").length;

    return {
      filePath,
      language,
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      imports: [],
      exports: [],
      contentHash,
      lastModified,
      linesOfCode,
      complexity: 0,
    };
  }

  /**
   * Extract function declarations from AST
   */
  private extractFunctions(
    ast: any,
    content: string,
    functions: FunctionSignature[],
  ): void {
    const lines = content.split("\n");

    const traverse = (node: any, isExported = false) => {
      if (!node) return;

      // Handle export declarations
      if (
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
      ) {
        if (node.declaration) {
          traverse(node.declaration, true);
        }
        return;
      }

      // Function declarations
      if (node.type === "FunctionDeclaration") {
        const func = this.parseFunctionNode(node, lines, isExported);
        if (func) functions.push(func);
      }

      // Arrow functions assigned to variables
      if (node.type === "VariableDeclaration") {
        for (const declarator of node.declarations || []) {
          if (declarator.init?.type === "ArrowFunctionExpression") {
            const func = this.parseArrowFunction(declarator, lines, isExported);
            if (func) functions.push(func);
          }
        }
      }

      // Traverse children
      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child, false));
          } else {
            traverse(node[key], false);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Parse function node
   */
  private parseFunctionNode(
    node: any,
    lines: string[],
    isExported: boolean,
  ): FunctionSignature | null {
    if (!node.id?.name) return null;

    const docComment = this.extractDocComment(node.loc?.start.line - 1, lines);
    const parameters = this.extractParameters(node.params);

    return {
      name: node.id.name,
      parameters,
      returnType: this.extractReturnType(node),
      isAsync: node.async || false,
      isExported,
      isPublic: true,
      docComment,
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      complexity: this.calculateFunctionComplexity(node),
      dependencies: [],
    };
  }

  /**
   * Parse arrow function
   */
  private parseArrowFunction(
    declarator: any,
    lines: string[],
    isExported: boolean,
  ): FunctionSignature | null {
    if (!declarator.id?.name) return null;

    const node = declarator.init;
    const docComment = this.extractDocComment(
      declarator.loc?.start.line - 1,
      lines,
    );
    const parameters = this.extractParameters(node.params);

    return {
      name: declarator.id.name,
      parameters,
      returnType: this.extractReturnType(node),
      isAsync: node.async || false,
      isExported,
      isPublic: true,
      docComment,
      startLine: declarator.loc?.start.line || 0,
      endLine: declarator.loc?.end.line || 0,
      complexity: this.calculateFunctionComplexity(node),
      dependencies: [],
    };
  }

  /**
   * Extract classes from AST
   */
  private extractClasses(
    ast: any,
    content: string,
    classes: ClassInfo[],
  ): void {
    const lines = content.split("\n");

    const traverse = (node: any, isExported = false) => {
      if (!node) return;

      // Handle export declarations
      if (
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
      ) {
        if (node.declaration) {
          traverse(node.declaration, true);
        }
        return;
      }

      if (node.type === "ClassDeclaration" && node.id?.name) {
        const classInfo = this.parseClassNode(node, lines, isExported);
        if (classInfo) classes.push(classInfo);
      }

      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child, false));
          } else {
            traverse(node[key], false);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Parse class node
   */
  private parseClassNode(
    node: any,
    lines: string[],
    isExported: boolean,
  ): ClassInfo | null {
    const methods: FunctionSignature[] = [];
    const properties: PropertyInfo[] = [];

    // Extract methods and properties
    if (node.body?.body) {
      for (const member of node.body.body) {
        if (member.type === "MethodDefinition") {
          const method = this.parseMethodNode(member, lines);
          if (method) methods.push(method);
        } else if (member.type === "PropertyDefinition") {
          const property = this.parsePropertyNode(member);
          if (property) properties.push(property);
        }
      }
    }

    return {
      name: node.id.name,
      isExported,
      extends: node.superClass?.name || null,
      implements:
        node.implements?.map((i: any) => i.expression?.name || "unknown") || [],
      methods,
      properties,
      docComment: this.extractDocComment(node.loc?.start.line - 1, lines),
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
    };
  }

  /**
   * Parse method node
   */
  private parseMethodNode(
    node: any,
    lines: string[],
  ): FunctionSignature | null {
    if (!node.key?.name) return null;

    return {
      name: node.key.name,
      parameters: this.extractParameters(node.value?.params || []),
      returnType: this.extractReturnType(node.value),
      isAsync: node.value?.async || false,
      isExported: false,
      isPublic: !node.key.name.startsWith("_"),
      docComment: this.extractDocComment(node.loc?.start.line - 1, lines),
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      complexity: this.calculateFunctionComplexity(node.value),
      dependencies: [],
    };
  }

  /**
   * Parse property node
   */
  private parsePropertyNode(node: any): PropertyInfo | null {
    if (!node.key?.name) return null;

    return {
      name: node.key.name,
      type: this.extractTypeAnnotation(node.typeAnnotation),
      isStatic: node.static || false,
      isReadonly: node.readonly || false,
      visibility: this.determineVisibility(node),
    };
  }

  /**
   * Extract interfaces from AST
   */
  private extractInterfaces(
    ast: any,
    content: string,
    interfaces: InterfaceInfo[],
  ): void {
    const lines = content.split("\n");

    const traverse = (node: any, isExported = false) => {
      if (!node) return;

      // Handle export declarations
      if (
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
      ) {
        if (node.declaration) {
          traverse(node.declaration, true);
        }
        return;
      }

      if (node.type === "TSInterfaceDeclaration" && node.id?.name) {
        const interfaceInfo = this.parseInterfaceNode(node, lines, isExported);
        if (interfaceInfo) interfaces.push(interfaceInfo);
      }

      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child, false));
          } else {
            traverse(node[key], false);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Parse interface node
   */
  private parseInterfaceNode(
    node: any,
    lines: string[],
    isExported: boolean,
  ): InterfaceInfo | null {
    const properties: PropertyInfo[] = [];
    const methods: FunctionSignature[] = [];

    if (node.body?.body) {
      for (const member of node.body.body) {
        if (member.type === "TSPropertySignature") {
          const prop = this.parseInterfaceProperty(member);
          if (prop) properties.push(prop);
        } else if (member.type === "TSMethodSignature") {
          const method = this.parseInterfaceMethod(member);
          if (method) methods.push(method);
        }
      }
    }

    return {
      name: node.id.name,
      isExported,
      extends:
        node.extends?.map((e: any) => e.expression?.name || "unknown") || [],
      properties,
      methods,
      docComment: this.extractDocComment(node.loc?.start.line - 1, lines),
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
    };
  }

  /**
   * Parse interface property
   */
  private parseInterfaceProperty(node: any): PropertyInfo | null {
    if (!node.key?.name) return null;

    return {
      name: node.key.name,
      type: this.extractTypeAnnotation(node.typeAnnotation),
      isStatic: false,
      isReadonly: node.readonly || false,
      visibility: "public",
    };
  }

  /**
   * Parse interface method
   */
  private parseInterfaceMethod(node: any): FunctionSignature | null {
    if (!node.key?.name) return null;

    return {
      name: node.key.name,
      parameters: this.extractParameters(node.params || []),
      returnType: this.extractTypeAnnotation(node.returnType),
      isAsync: false,
      isExported: false,
      isPublic: true,
      docComment: null,
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      complexity: 0,
      dependencies: [],
    };
  }

  /**
   * Extract type aliases from AST
   */
  private extractTypes(ast: any, content: string, types: TypeInfo[]): void {
    const lines = content.split("\n");

    const traverse = (node: any, isExported = false) => {
      if (!node) return;

      // Handle export declarations
      if (
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
      ) {
        if (node.declaration) {
          traverse(node.declaration, true);
        }
        return;
      }

      if (node.type === "TSTypeAliasDeclaration" && node.id?.name) {
        const typeInfo = this.parseTypeNode(node, lines, isExported);
        if (typeInfo) types.push(typeInfo);
      }

      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child, false));
          } else {
            traverse(node[key], false);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Parse type alias node
   */
  private parseTypeNode(
    node: any,
    lines: string[],
    isExported: boolean,
  ): TypeInfo | null {
    return {
      name: node.id.name,
      isExported,
      definition: this.extractTypeDefinition(node.typeAnnotation),
      docComment: this.extractDocComment(node.loc?.start.line - 1, lines),
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
    };
  }

  /**
   * Extract imports from AST
   */
  private extractImports(ast: any, imports: ImportInfo[]): void {
    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === "ImportDeclaration") {
        const importInfo: ImportInfo = {
          source: node.source?.value || "",
          imports: [],
          isDefault: false,
          startLine: node.loc?.start.line || 0,
        };

        for (const specifier of node.specifiers || []) {
          if (specifier.type === "ImportDefaultSpecifier") {
            importInfo.isDefault = true;
            importInfo.imports.push({
              name: specifier.local?.name || "default",
            });
          } else if (specifier.type === "ImportSpecifier") {
            importInfo.imports.push({
              name: specifier.imported?.name || "",
              alias:
                specifier.local?.name !== specifier.imported?.name
                  ? specifier.local?.name
                  : undefined,
            });
          }
        }

        imports.push(importInfo);
      }

      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Extract exports from AST
   */
  private extractExports(ast: any, exports: string[]): void {
    const traverse = (node: any) => {
      if (!node) return;

      // Named exports
      if (node.type === "ExportNamedDeclaration") {
        if (node.declaration) {
          if (node.declaration.id?.name) {
            exports.push(node.declaration.id.name);
          } else if (node.declaration.declarations) {
            for (const decl of node.declaration.declarations) {
              if (decl.id?.name) exports.push(decl.id.name);
            }
          }
        }
        for (const specifier of node.specifiers || []) {
          if (specifier.exported?.name) exports.push(specifier.exported.name);
        }
      }

      // Default export
      if (node.type === "ExportDefaultDeclaration") {
        if (node.declaration?.id?.name) {
          exports.push(node.declaration.id.name);
        } else {
          exports.push("default");
        }
      }

      for (const key in node) {
        if (typeof node[key] === "object" && node[key] !== null) {
          if (Array.isArray(node[key])) {
            node[key].forEach((child: any) => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
  }

  // Helper methods

  private extractParameters(params: any[]): ParameterInfo[] {
    return params.map((param) => ({
      name: param.name || param.argument?.name || param.left?.name || "unknown",
      type: this.extractTypeAnnotation(param.typeAnnotation),
      optional: param.optional || false,
      defaultValue: param.right ? this.extractDefaultValue(param.right) : null,
    }));
  }

  private extractReturnType(node: any): string | null {
    return this.extractTypeAnnotation(node?.returnType);
  }

  private extractTypeAnnotation(typeAnnotation: any): string | null {
    if (!typeAnnotation) return null;
    if (typeAnnotation.typeAnnotation)
      return this.extractTypeDefinition(typeAnnotation.typeAnnotation);
    return this.extractTypeDefinition(typeAnnotation);
  }

  private extractTypeDefinition(typeNode: any): string {
    if (!typeNode) return "unknown";
    if (typeNode.type === "TSStringKeyword") return "string";
    if (typeNode.type === "TSNumberKeyword") return "number";
    if (typeNode.type === "TSBooleanKeyword") return "boolean";
    if (typeNode.type === "TSAnyKeyword") return "any";
    if (typeNode.type === "TSVoidKeyword") return "void";
    if (typeNode.type === "TSTypeReference")
      return typeNode.typeName?.name || "unknown";
    return "unknown";
  }

  private extractDefaultValue(node: any): string | null {
    if (node.type === "Literal") return String(node.value);
    if (node.type === "Identifier") return node.name;
    return null;
  }

  private extractDocComment(
    lineNumber: number,
    lines: string[],
  ): string | null {
    if (lineNumber < 0 || lineNumber >= lines.length) return null;

    const comment: string[] = [];
    let currentLine = lineNumber;

    // Look backwards for JSDoc comment
    while (currentLine >= 0) {
      const line = lines[currentLine].trim();
      if (line.startsWith("*/")) {
        comment.unshift(line);
        currentLine--;
        continue;
      }
      if (line.startsWith("*") || line.startsWith("/**")) {
        comment.unshift(line);
        if (line.startsWith("/**")) break;
        currentLine--;
        continue;
      }
      if (comment.length > 0) break;
      currentLine--;
    }

    return comment.length > 0 ? comment.join("\n") : null;
  }

  private isExported(node: any): boolean {
    if (!node) return false;

    // Check parent for export
    let current = node;
    while (current) {
      if (
        current.type === "ExportNamedDeclaration" ||
        current.type === "ExportDefaultDeclaration"
      ) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  private determineVisibility(node: any): "public" | "private" | "protected" {
    if (node.accessibility) return node.accessibility;
    if (node.key?.name?.startsWith("_")) return "private";
    if (node.key?.name?.startsWith("#")) return "private";
    return "public";
  }

  private calculateFunctionComplexity(node: any): number {
    // Simplified cyclomatic complexity
    let complexity = 1;

    const traverse = (n: any) => {
      if (!n) return;

      // Increment for control flow statements
      if (
        [
          "IfStatement",
          "ConditionalExpression",
          "ForStatement",
          "WhileStatement",
          "DoWhileStatement",
          "SwitchCase",
          "CatchClause",
        ].includes(n.type)
      ) {
        complexity++;
      }

      for (const key in n) {
        if (typeof n[key] === "object" && n[key] !== null) {
          if (Array.isArray(n[key])) {
            n[key].forEach((child: any) => traverse(child));
          } else {
            traverse(n[key]);
          }
        }
      }
    };

    traverse(node);
    return complexity;
  }

  private calculateComplexity(
    functions: FunctionSignature[],
    classes: ClassInfo[],
  ): number {
    const functionComplexity = functions.reduce(
      (sum, f) => sum + f.complexity,
      0,
    );
    const classComplexity = classes.reduce(
      (sum, c) =>
        sum + c.methods.reduce((methodSum, m) => methodSum + m.complexity, 0),
      0,
    );
    return functionComplexity + classComplexity;
  }

  private detectLanguage(ext: string): string | null {
    for (const [lang, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.extensions.includes(ext)) return lang;
    }
    return null;
  }

  /**
   * Compare two AST analysis results and detect changes
   */
  async detectDrift(
    oldAnalysis: ASTAnalysisResult,
    newAnalysis: ASTAnalysisResult,
  ): Promise<CodeDiff[]> {
    const diffs: CodeDiff[] = [];

    // Compare functions
    diffs.push(
      ...this.compareFunctions(oldAnalysis.functions, newAnalysis.functions),
    );

    // Compare classes
    diffs.push(
      ...this.compareClasses(oldAnalysis.classes, newAnalysis.classes),
    );

    // Compare interfaces
    diffs.push(
      ...this.compareInterfaces(oldAnalysis.interfaces, newAnalysis.interfaces),
    );

    // Compare types
    diffs.push(...this.compareTypes(oldAnalysis.types, newAnalysis.types));

    return diffs;
  }

  private compareFunctions(
    oldFuncs: FunctionSignature[],
    newFuncs: FunctionSignature[],
  ): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const oldMap = new Map(oldFuncs.map((f) => [f.name, f]));
    const newMap = new Map(newFuncs.map((f) => [f.name, f]));

    // Check for removed functions
    for (const [name, func] of oldMap) {
      if (!newMap.has(name)) {
        diffs.push({
          type: "removed",
          category: "function",
          name,
          details: `Function '${name}' was removed`,
          oldSignature: this.formatFunctionSignature(func),
          impactLevel: func.isExported ? "breaking" : "minor",
        });
      }
    }

    // Check for added functions
    for (const [name, func] of newMap) {
      if (!oldMap.has(name)) {
        diffs.push({
          type: "added",
          category: "function",
          name,
          details: `Function '${name}' was added`,
          newSignature: this.formatFunctionSignature(func),
          impactLevel: "patch",
        });
      }
    }

    // Check for modified functions
    for (const [name, newFunc] of newMap) {
      const oldFunc = oldMap.get(name);
      if (oldFunc) {
        const changes = this.detectFunctionChanges(oldFunc, newFunc);
        if (changes.length > 0) {
          diffs.push({
            type: "modified",
            category: "function",
            name,
            details: changes.join("; "),
            oldSignature: this.formatFunctionSignature(oldFunc),
            newSignature: this.formatFunctionSignature(newFunc),
            impactLevel: this.determineFunctionImpact(oldFunc, newFunc),
          });
        }
      }
    }

    return diffs;
  }

  private compareClasses(
    oldClasses: ClassInfo[],
    newClasses: ClassInfo[],
  ): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const oldMap = new Map(oldClasses.map((c) => [c.name, c]));
    const newMap = new Map(newClasses.map((c) => [c.name, c]));

    for (const [name, oldClass] of oldMap) {
      if (!newMap.has(name)) {
        diffs.push({
          type: "removed",
          category: "class",
          name,
          details: `Class '${name}' was removed`,
          impactLevel: oldClass.isExported ? "breaking" : "minor",
        });
      }
    }

    for (const [name] of newMap) {
      if (!oldMap.has(name)) {
        diffs.push({
          type: "added",
          category: "class",
          name,
          details: `Class '${name}' was added`,
          impactLevel: "patch",
        });
      }
    }

    return diffs;
  }

  private compareInterfaces(
    oldInterfaces: InterfaceInfo[],
    newInterfaces: InterfaceInfo[],
  ): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const oldMap = new Map(oldInterfaces.map((i) => [i.name, i]));
    const newMap = new Map(newInterfaces.map((i) => [i.name, i]));

    for (const [name, oldInterface] of oldMap) {
      if (!newMap.has(name)) {
        diffs.push({
          type: "removed",
          category: "interface",
          name,
          details: `Interface '${name}' was removed`,
          impactLevel: oldInterface.isExported ? "breaking" : "minor",
        });
      }
    }

    for (const [name] of newMap) {
      if (!oldMap.has(name)) {
        diffs.push({
          type: "added",
          category: "interface",
          name,
          details: `Interface '${name}' was added`,
          impactLevel: "patch",
        });
      }
    }

    return diffs;
  }

  private compareTypes(oldTypes: TypeInfo[], newTypes: TypeInfo[]): CodeDiff[] {
    const diffs: CodeDiff[] = [];
    const oldMap = new Map(oldTypes.map((t) => [t.name, t]));
    const newMap = new Map(newTypes.map((t) => [t.name, t]));

    for (const [name, oldType] of oldMap) {
      if (!newMap.has(name)) {
        diffs.push({
          type: "removed",
          category: "type",
          name,
          details: `Type '${name}' was removed`,
          impactLevel: oldType.isExported ? "breaking" : "minor",
        });
      }
    }

    for (const [name] of newMap) {
      if (!oldMap.has(name)) {
        diffs.push({
          type: "added",
          category: "type",
          name,
          details: `Type '${name}' was added`,
          impactLevel: "patch",
        });
      }
    }

    return diffs;
  }

  private detectFunctionChanges(
    oldFunc: FunctionSignature,
    newFunc: FunctionSignature,
  ): string[] {
    const changes: string[] = [];

    // Check parameter changes
    if (oldFunc.parameters.length !== newFunc.parameters.length) {
      changes.push(
        `Parameter count changed from ${oldFunc.parameters.length} to ${newFunc.parameters.length}`,
      );
    }

    // Check return type changes
    if (oldFunc.returnType !== newFunc.returnType) {
      changes.push(
        `Return type changed from '${oldFunc.returnType}' to '${newFunc.returnType}'`,
      );
    }

    // Check async changes
    if (oldFunc.isAsync !== newFunc.isAsync) {
      changes.push(
        newFunc.isAsync
          ? "Function became async"
          : "Function is no longer async",
      );
    }

    // Check export changes
    if (oldFunc.isExported !== newFunc.isExported) {
      changes.push(
        newFunc.isExported
          ? "Function is now exported"
          : "Function is no longer exported",
      );
    }

    return changes;
  }

  private determineFunctionImpact(
    oldFunc: FunctionSignature,
    newFunc: FunctionSignature,
  ): "breaking" | "major" | "minor" | "patch" {
    // Breaking changes
    if (oldFunc.isExported) {
      if (oldFunc.parameters.length !== newFunc.parameters.length)
        return "breaking";
      if (oldFunc.returnType !== newFunc.returnType) return "breaking";
      // If a function was exported and is no longer exported, that's breaking
      if (oldFunc.isExported && !newFunc.isExported) return "breaking";
    }

    // Major changes
    if (oldFunc.isAsync !== newFunc.isAsync) return "major";

    // Minor changes (new API surface)
    // If a function becomes exported, that's a minor change (new feature/API)
    if (!oldFunc.isExported && newFunc.isExported) return "minor";

    return "patch";
  }

  private formatFunctionSignature(func: FunctionSignature): string {
    const params = func.parameters
      .map((p) => `${p.name}: ${p.type || "any"}`)
      .join(", ");
    const returnType = func.returnType || "void";
    const asyncPrefix = func.isAsync ? "async " : "";
    return `${asyncPrefix}${func.name}(${params}): ${returnType}`;
  }

  // ============================================================================
  // Call Graph Builder (Issue #72)
  // ============================================================================

  /**
   * Build a call graph starting from an entry function
   *
   * @param entryFunction - Name of the function to start from
   * @param projectPath - Root path of the project for cross-file resolution
   * @param options - Call graph building options
   * @returns Complete call graph with all discovered paths
   */
  async buildCallGraph(
    entryFunction: string,
    projectPath: string,
    options: CallGraphOptions = {},
  ): Promise<CallGraph> {
    const resolvedOptions: Required<CallGraphOptions> = {
      maxDepth: options.maxDepth ?? 3,
      resolveImports: options.resolveImports ?? true,
      extractConditionals: options.extractConditionals ?? true,
      trackExceptions: options.trackExceptions ?? true,
      extensions: options.extensions ?? [".ts", ".tsx", ".js", ".jsx", ".mjs"],
    };

    if (!this.initialized) {
      await this.initialize();
    }

    // Find the entry file containing the function
    const entryFile = await this.findFunctionFile(
      entryFunction,
      projectPath,
      resolvedOptions.extensions,
    );

    if (!entryFile) {
      return this.createEmptyCallGraph(entryFunction);
    }

    // Analyze the entry file
    const entryAnalysis = await this.analyzeFile(entryFile);
    if (!entryAnalysis) {
      return this.createEmptyCallGraph(entryFunction);
    }

    const entryFunc = entryAnalysis.functions.find(
      (f) => f.name === entryFunction,
    );
    if (!entryFunc) {
      // Check class methods
      for (const cls of entryAnalysis.classes) {
        const method = cls.methods.find((m) => m.name === entryFunction);
        if (method) {
          return this.buildCallGraphFromFunction(
            method,
            entryFile,
            entryAnalysis,
            projectPath,
            resolvedOptions,
          );
        }
      }
      return this.createEmptyCallGraph(entryFunction);
    }

    return this.buildCallGraphFromFunction(
      entryFunc,
      entryFile,
      entryAnalysis,
      projectPath,
      resolvedOptions,
    );
  }

  /**
   * Build call graph from a specific function
   */
  private async buildCallGraphFromFunction(
    entryFunc: FunctionSignature,
    entryFile: string,
    entryAnalysis: ASTAnalysisResult,
    projectPath: string,
    options: Required<CallGraphOptions>,
  ): Promise<CallGraph> {
    const allFunctions = new Map<string, FunctionSignature>();
    const analyzedFiles: string[] = [entryFile];
    const circularReferences: Array<{ from: string; to: string }> = [];
    const unresolvedCalls: Array<{
      name: string;
      location: { file: string; line: number };
    }> = [];

    // Cache for analyzed files
    const analysisCache = new Map<string, ASTAnalysisResult>();
    analysisCache.set(entryFile, entryAnalysis);

    // Track visited functions to prevent infinite loops
    const visited = new Set<string>();
    let maxDepthReached = 0;

    const root = await this.buildCallGraphNode(
      entryFunc,
      entryFile,
      entryAnalysis,
      projectPath,
      options,
      0,
      visited,
      allFunctions,
      analysisCache,
      circularReferences,
      unresolvedCalls,
      analyzedFiles,
      (depth) => {
        maxDepthReached = Math.max(maxDepthReached, depth);
      },
    );

    return {
      entryPoint: entryFunc.name,
      root,
      allFunctions,
      maxDepthReached,
      analyzedFiles: [...new Set(analyzedFiles)],
      circularReferences,
      unresolvedCalls,
      buildTime: new Date().toISOString(),
    };
  }

  /**
   * Build a single call graph node recursively
   */
  private async buildCallGraphNode(
    func: FunctionSignature,
    filePath: string,
    analysis: ASTAnalysisResult,
    projectPath: string,
    options: Required<CallGraphOptions>,
    depth: number,
    visited: Set<string>,
    allFunctions: Map<string, FunctionSignature>,
    analysisCache: Map<string, ASTAnalysisResult>,
    circularReferences: Array<{ from: string; to: string }>,
    unresolvedCalls: Array<{
      name: string;
      location: { file: string; line: number };
    }>,
    analyzedFiles: string[],
    updateMaxDepth: (depth: number) => void,
  ): Promise<CallGraphNode> {
    const funcKey = `${filePath}:${func.name}`;
    updateMaxDepth(depth);

    // Check for circular reference
    if (visited.has(funcKey)) {
      circularReferences.push({ from: funcKey, to: func.name });
      return this.createTruncatedNode(func, filePath, depth, true);
    }

    // Check max depth
    if (depth >= options.maxDepth) {
      return this.createTruncatedNode(func, filePath, depth, false);
    }

    visited.add(funcKey);
    allFunctions.set(func.name, func);

    // Read the file content to extract function body
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      return this.createTruncatedNode(func, filePath, depth, false);
    }

    // Parse the function body to find calls, conditionals, and exceptions
    const functionBody = this.extractFunctionBody(content, func);
    const callExpressions = this.extractCallExpressions(
      functionBody,
      func.startLine,
    );
    const conditionalBranches: ConditionalPath[] = options.extractConditionals
      ? await this.extractConditionalPaths(
          functionBody,
          func.startLine,
          analysis,
          filePath,
          projectPath,
          options,
          depth,
          visited,
          allFunctions,
          analysisCache,
          circularReferences,
          unresolvedCalls,
          analyzedFiles,
          updateMaxDepth,
        )
      : [];
    const exceptions: ExceptionPath[] = options.trackExceptions
      ? this.extractExceptions(functionBody, func.startLine)
      : [];

    // Build child nodes for each call
    const calls: CallGraphNode[] = [];
    for (const call of callExpressions) {
      const childNode = await this.resolveAndBuildChildNode(
        call,
        filePath,
        analysis,
        projectPath,
        options,
        depth + 1,
        visited,
        allFunctions,
        analysisCache,
        circularReferences,
        unresolvedCalls,
        analyzedFiles,
        updateMaxDepth,
      );
      if (childNode) {
        calls.push(childNode);
      }
    }

    visited.delete(funcKey); // Allow revisiting from different paths

    return {
      function: func,
      location: {
        file: filePath,
        line: func.startLine,
      },
      calls,
      conditionalBranches,
      exceptions,
      depth,
      truncated: false,
      isExternal: false,
    };
  }

  /**
   * Resolve a function call and build its child node
   */
  private async resolveAndBuildChildNode(
    call: { name: string; line: number; isMethod: boolean; object?: string },
    currentFile: string,
    currentAnalysis: ASTAnalysisResult,
    projectPath: string,
    options: Required<CallGraphOptions>,
    depth: number,
    visited: Set<string>,
    allFunctions: Map<string, FunctionSignature>,
    analysisCache: Map<string, ASTAnalysisResult>,
    circularReferences: Array<{ from: string; to: string }>,
    unresolvedCalls: Array<{
      name: string;
      location: { file: string; line: number };
    }>,
    analyzedFiles: string[],
    updateMaxDepth: (depth: number) => void,
  ): Promise<CallGraphNode | null> {
    // First, try to find the function in the current file
    let targetFunc = currentAnalysis.functions.find(
      (f) => f.name === call.name,
    );
    let targetFile = currentFile;
    let targetAnalysis = currentAnalysis;

    // Check class methods if it's a method call
    if (!targetFunc && call.isMethod) {
      for (const cls of currentAnalysis.classes) {
        const method = cls.methods.find((m) => m.name === call.name);
        if (method) {
          targetFunc = method;
          break;
        }
      }
    }

    // If not found locally, try to resolve from imports
    if (!targetFunc && options.resolveImports) {
      const resolvedImport = await this.resolveImportedFunction(
        call.name,
        currentAnalysis.imports,
        currentFile,
        projectPath,
        options.extensions,
        analysisCache,
        analyzedFiles,
      );

      if (resolvedImport) {
        targetFunc = resolvedImport.func;
        targetFile = resolvedImport.file;
        targetAnalysis = resolvedImport.analysis;
      }
    }

    if (!targetFunc) {
      // Track as unresolved call (might be built-in or external library)
      if (!this.isBuiltInFunction(call.name)) {
        unresolvedCalls.push({
          name: call.name,
          location: { file: currentFile, line: call.line },
        });
      }
      return null;
    }

    return this.buildCallGraphNode(
      targetFunc,
      targetFile,
      targetAnalysis,
      projectPath,
      options,
      depth,
      visited,
      allFunctions,
      analysisCache,
      circularReferences,
      unresolvedCalls,
      analyzedFiles,
      updateMaxDepth,
    );
  }

  /**
   * Resolve an imported function to its source file
   */
  private async resolveImportedFunction(
    funcName: string,
    imports: ImportInfo[],
    currentFile: string,
    projectPath: string,
    extensions: string[],
    analysisCache: Map<string, ASTAnalysisResult>,
    analyzedFiles: string[],
  ): Promise<{
    func: FunctionSignature;
    file: string;
    analysis: ASTAnalysisResult;
  } | null> {
    // Find the import that provides this function
    for (const imp of imports) {
      const importedItem = imp.imports.find(
        (i) => i.name === funcName || i.alias === funcName,
      );

      if (
        importedItem ||
        (imp.isDefault && imp.imports[0]?.name === funcName)
      ) {
        // Resolve the import path
        const resolvedPath = await this.resolveImportPath(
          imp.source,
          currentFile,
          projectPath,
          extensions,
        );

        if (!resolvedPath) continue;

        // Check cache first
        let analysis: ASTAnalysisResult | undefined =
          analysisCache.get(resolvedPath);
        if (!analysis) {
          const analyzedFile = await this.analyzeFile(resolvedPath);
          if (analyzedFile) {
            analysis = analyzedFile;
            analysisCache.set(resolvedPath, analysis);
            analyzedFiles.push(resolvedPath);
          }
        }

        if (!analysis) continue;

        // Find the function in the resolved file
        const func = analysis.functions.find(
          (f) => f.name === (importedItem?.name || funcName),
        );
        if (func) {
          return { func, file: resolvedPath, analysis };
        }

        // Check class methods
        for (const cls of analysis.classes) {
          const method = cls.methods.find(
            (m) => m.name === (importedItem?.name || funcName),
          );
          if (method) {
            return { func: method, file: resolvedPath, analysis };
          }
        }
      }
    }

    return null;
  }

  /**
   * Resolve an import path to an absolute file path
   */
  private async resolveImportPath(
    importSource: string,
    currentFile: string,
    projectPath: string,
    extensions: string[],
  ): Promise<string | null> {
    // Skip node_modules and external packages
    if (
      !importSource.startsWith(".") &&
      !importSource.startsWith("/") &&
      !importSource.startsWith("@/")
    ) {
      return null;
    }

    const currentDir = path.dirname(currentFile);
    let basePath: string;

    if (importSource.startsWith("@/")) {
      // Handle alias imports (common in Next.js, etc.)
      basePath = path.join(projectPath, importSource.slice(2));
    } else {
      basePath = path.resolve(currentDir, importSource);
    }

    // Try with different extensions
    const candidates = [
      basePath,
      ...extensions.map((ext) => basePath + ext),
      path.join(basePath, "index.ts"),
      path.join(basePath, "index.tsx"),
      path.join(basePath, "index.js"),
    ];

    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // File doesn't exist, try next
      }
    }

    return null;
  }

  /**
   * Find the file containing a function
   */
  private async findFunctionFile(
    funcName: string,
    projectPath: string,
    extensions: string[],
  ): Promise<string | null> {
    // Search common source directories
    const searchDirs = ["src", "lib", "app", "."];

    for (const dir of searchDirs) {
      const searchPath = path.join(projectPath, dir);
      try {
        const files = await this.findFilesRecursive(searchPath, extensions);
        for (const file of files) {
          const analysis = await this.analyzeFile(file);
          if (analysis) {
            const func = analysis.functions.find((f) => f.name === funcName);
            if (func) return file;

            // Check class methods
            for (const cls of analysis.classes) {
              if (cls.methods.find((m) => m.name === funcName)) {
                return file;
              }
            }
          }
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Recursively find files with given extensions
   */
  private async findFilesRecursive(
    dir: string,
    extensions: string[],
    maxDepth: number = 5,
    currentDepth: number = 0,
  ): Promise<string[]> {
    if (currentDepth >= maxDepth) return [];

    const files: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules and hidden directories
        if (
          entry.name === "node_modules" ||
          entry.name.startsWith(".") ||
          entry.name === "dist" ||
          entry.name === "build"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(
            ...(await this.findFilesRecursive(
              fullPath,
              extensions,
              maxDepth,
              currentDepth + 1,
            )),
          );
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory access error
    }

    return files;
  }

  /**
   * Extract the body of a function from source code
   */
  private extractFunctionBody(
    content: string,
    func: FunctionSignature,
  ): string {
    const lines = content.split("\n");
    return lines.slice(func.startLine - 1, func.endLine).join("\n");
  }

  /**
   * Extract function call expressions from code
   */
  private extractCallExpressions(
    code: string,
    startLine: number,
  ): Array<{ name: string; line: number; isMethod: boolean; object?: string }> {
    const calls: Array<{
      name: string;
      line: number;
      isMethod: boolean;
      object?: string;
    }> = [];

    try {
      const ast = parseTypeScript(code, {
        loc: true,
        range: true,
        tokens: false,
        comment: false,
      });

      const traverse = (node: any) => {
        if (!node) return;

        if (node.type === "CallExpression") {
          const callee = node.callee;
          const line = (node.loc?.start.line || 0) + startLine - 1;

          if (callee.type === "Identifier") {
            calls.push({
              name: callee.name,
              line,
              isMethod: false,
            });
          } else if (callee.type === "MemberExpression") {
            if (callee.property?.name) {
              calls.push({
                name: callee.property.name,
                line,
                isMethod: true,
                object: callee.object?.name,
              });
            }
          }
        }

        for (const key in node) {
          if (typeof node[key] === "object" && node[key] !== null) {
            if (Array.isArray(node[key])) {
              node[key].forEach((child: any) => traverse(child));
            } else {
              traverse(node[key]);
            }
          }
        }
      };

      traverse(ast);
    } catch {
      // Parse error, return empty
    }

    return calls;
  }

  /**
   * Extract conditional paths from function body
   */
  private async extractConditionalPaths(
    code: string,
    startLine: number,
    currentAnalysis: ASTAnalysisResult,
    currentFile: string,
    projectPath: string,
    options: Required<CallGraphOptions>,
    depth: number,
    visited: Set<string>,
    allFunctions: Map<string, FunctionSignature>,
    analysisCache: Map<string, ASTAnalysisResult>,
    circularReferences: Array<{ from: string; to: string }>,
    unresolvedCalls: Array<{
      name: string;
      location: { file: string; line: number };
    }>,
    analyzedFiles: string[],
    updateMaxDepth: (depth: number) => void,
  ): Promise<ConditionalPath[]> {
    const conditionals: ConditionalPath[] = [];

    try {
      const ast = parseTypeScript(code, {
        loc: true,
        range: true,
        tokens: false,
        comment: false,
      });

      const extractConditionString = (node: any): string => {
        if (!node) return "unknown";
        if (node.type === "Identifier") return node.name;
        if (node.type === "BinaryExpression") {
          return `${extractConditionString(node.left)} ${
            node.operator
          } ${extractConditionString(node.right)}`;
        }
        if (node.type === "MemberExpression") {
          return `${extractConditionString(node.object)}.${
            node.property?.name || "?"
          }`;
        }
        if (node.type === "UnaryExpression") {
          return `${node.operator}${extractConditionString(node.argument)}`;
        }
        if (node.type === "Literal") {
          return String(node.value);
        }
        return "complex";
      };

      const extractBranchCalls = async (
        branchNode: any,
      ): Promise<CallGraphNode[]> => {
        if (!branchNode) return [];

        const branchCode =
          branchNode.type === "BlockStatement"
            ? code.slice(branchNode.range[0], branchNode.range[1])
            : code.slice(
                branchNode.range?.[0] || 0,
                branchNode.range?.[1] || 0,
              );

        const branchCalls = this.extractCallExpressions(
          branchCode,
          (branchNode.loc?.start.line || 0) + startLine - 1,
        );
        const nodes: CallGraphNode[] = [];

        for (const call of branchCalls) {
          const childNode = await this.resolveAndBuildChildNode(
            call,
            currentFile,
            currentAnalysis,
            projectPath,
            options,
            depth + 1,
            visited,
            allFunctions,
            analysisCache,
            circularReferences,
            unresolvedCalls,
            analyzedFiles,
            updateMaxDepth,
          );
          if (childNode) {
            nodes.push(childNode);
          }
        }

        return nodes;
      };

      const traverse = async (node: any) => {
        if (!node) return;

        // If statement
        if (node.type === "IfStatement") {
          const condition = extractConditionString(node.test);
          const line = (node.loc?.start.line || 0) + startLine - 1;

          conditionals.push({
            type: "if",
            condition,
            lineNumber: line,
            trueBranch: await extractBranchCalls(node.consequent),
            falseBranch: await extractBranchCalls(node.alternate),
          });
        }

        // Switch statement
        if (node.type === "SwitchStatement") {
          const discriminant = extractConditionString(node.discriminant);

          for (const switchCase of node.cases || []) {
            conditionals.push({
              type: "switch-case",
              condition: switchCase.test
                ? `${discriminant} === ${extractConditionString(
                    switchCase.test,
                  )}`
                : "default",
              lineNumber: (switchCase.loc?.start.line || 0) + startLine - 1,
              trueBranch: await extractBranchCalls(switchCase),
              falseBranch: [],
            });
          }
        }

        // Ternary operator
        if (node.type === "ConditionalExpression") {
          const condition = extractConditionString(node.test);
          const line = (node.loc?.start.line || 0) + startLine - 1;

          conditionals.push({
            type: "ternary",
            condition,
            lineNumber: line,
            trueBranch: await extractBranchCalls(node.consequent),
            falseBranch: await extractBranchCalls(node.alternate),
          });
        }

        for (const key in node) {
          if (typeof node[key] === "object" && node[key] !== null) {
            if (Array.isArray(node[key])) {
              for (const child of node[key]) {
                await traverse(child);
              }
            } else {
              await traverse(node[key]);
            }
          }
        }
      };

      await traverse(ast);
    } catch {
      // Parse error
    }

    return conditionals;
  }

  /**
   * Extract exception paths (throw statements)
   */
  private extractExceptions(code: string, startLine: number): ExceptionPath[] {
    const exceptions: ExceptionPath[] = [];

    try {
      const ast = parseTypeScript(code, {
        loc: true,
        range: true,
        tokens: false,
        comment: false,
      });

      // Track try-catch blocks to determine if throws are caught
      const catchRanges: Array<[number, number]> = [];

      const collectCatchBlocks = (node: any) => {
        if (!node) return;

        if (node.type === "TryStatement" && node.handler) {
          const handlerRange = node.handler.range || [0, 0];
          catchRanges.push(handlerRange);
        }

        for (const key in node) {
          if (typeof node[key] === "object" && node[key] !== null) {
            if (Array.isArray(node[key])) {
              node[key].forEach((child: any) => collectCatchBlocks(child));
            } else {
              collectCatchBlocks(node[key]);
            }
          }
        }
      };

      const traverse = (node: any, inTryBlock = false) => {
        if (!node) return;

        if (node.type === "TryStatement") {
          traverse(node.block, true);
          if (node.handler) traverse(node.handler.body, false);
          if (node.finalizer) traverse(node.finalizer, false);
          return;
        }

        if (node.type === "ThrowStatement") {
          const line = (node.loc?.start.line || 0) + startLine - 1;
          const argument = node.argument;
          let exceptionType = "Error";
          let expression = "unknown";

          if (argument?.type === "NewExpression") {
            exceptionType = argument.callee?.name || "Error";
            expression = `new ${exceptionType}(...)`;
          } else if (argument?.type === "Identifier") {
            exceptionType = argument.name;
            expression = argument.name;
          } else if (argument?.type === "CallExpression") {
            exceptionType = argument.callee?.name || "Error";
            expression = `${exceptionType}(...)`;
          }

          exceptions.push({
            exceptionType,
            lineNumber: line,
            expression,
            isCaught: inTryBlock,
          });
        }

        for (const key in node) {
          if (
            key !== "handler" &&
            key !== "finalizer" &&
            typeof node[key] === "object" &&
            node[key] !== null
          ) {
            if (Array.isArray(node[key])) {
              node[key].forEach((child: any) => traverse(child, inTryBlock));
            } else {
              traverse(node[key], inTryBlock);
            }
          }
        }
      };

      collectCatchBlocks(ast);
      traverse(ast);
    } catch {
      // Parse error
    }

    return exceptions;
  }

  /**
   * Check if a function name is a built-in JavaScript function
   */
  private isBuiltInFunction(name: string): boolean {
    const builtIns = new Set([
      // Console
      "log",
      "warn",
      "error",
      "info",
      "debug",
      "trace",
      "table",
      // Array methods
      "map",
      "filter",
      "reduce",
      "forEach",
      "find",
      "findIndex",
      "some",
      "every",
      "includes",
      "indexOf",
      "push",
      "pop",
      "shift",
      "unshift",
      "slice",
      "splice",
      "concat",
      "join",
      "sort",
      "reverse",
      "flat",
      "flatMap",
      // String methods
      "split",
      "trim",
      "toLowerCase",
      "toUpperCase",
      "replace",
      "substring",
      "substr",
      "charAt",
      "startsWith",
      "endsWith",
      "padStart",
      "padEnd",
      "repeat",
      // Object methods
      "keys",
      "values",
      "entries",
      "assign",
      "freeze",
      "seal",
      "hasOwnProperty",
      // Math methods
      "max",
      "min",
      "abs",
      "floor",
      "ceil",
      "round",
      "random",
      "sqrt",
      "pow",
      // JSON
      "stringify",
      "parse",
      // Promise
      "then",
      "catch",
      "finally",
      "resolve",
      "reject",
      "all",
      "race",
      "allSettled",
      // Timers
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      // Common
      "require",
      "import",
      "console",
      "Date",
      "Error",
      "Promise",
      "fetch",
    ]);
    return builtIns.has(name);
  }

  /**
   * Create an empty call graph for when entry function is not found
   */
  private createEmptyCallGraph(entryFunction: string): CallGraph {
    return {
      entryPoint: entryFunction,
      root: {
        function: {
          name: entryFunction,
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
        conditionalBranches: [],
        exceptions: [],
        depth: 0,
        truncated: false,
        isExternal: true,
      },
      allFunctions: new Map(),
      maxDepthReached: 0,
      analyzedFiles: [],
      circularReferences: [],
      unresolvedCalls: [
        {
          name: entryFunction,
          location: { file: "unknown", line: 0 },
        },
      ],
      buildTime: new Date().toISOString(),
    };
  }

  /**
   * Create a truncated node when max depth is reached or circular reference detected
   */
  private createTruncatedNode(
    func: FunctionSignature,
    filePath: string,
    depth: number,
    _isCircular: boolean,
  ): CallGraphNode {
    return {
      function: func,
      location: {
        file: filePath,
        line: func.startLine,
      },
      calls: [],
      conditionalBranches: [],
      exceptions: [],
      depth,
      truncated: true,
      isExternal: false,
    };
  }
}
