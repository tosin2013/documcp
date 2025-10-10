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
}
