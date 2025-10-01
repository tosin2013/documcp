import { parse } from "@typescript-eslint/typescript-estree";
import { globby } from "globby";
import { promises as fs } from "fs";
import path from "path";
import {
  MultiLanguageCodeScanner,
  LanguageParseResult,
} from "./language-parsers-simple.js";

export interface CodeElement {
  name: string;
  type:
    | "function"
    | "class"
    | "interface"
    | "type"
    | "enum"
    | "variable"
    | "export"
    | "import";
  filePath: string;
  line: number;
  column: number;
  exported: boolean;
  isAsync?: boolean;
  isPrivate?: boolean;
  hasJSDoc?: boolean;
  jsDocDescription?: string;
  parameters?: string[];
  returnType?: string;
  decorators?: string[];
}

export interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ALL";
  path: string;
  filePath: string;
  line: number;
  handlerName?: string;
  hasDocumentation?: boolean;
}

export interface CodeAnalysisResult {
  functions: CodeElement[];
  classes: CodeElement[];
  interfaces: CodeElement[];
  types: CodeElement[];
  enums: CodeElement[];
  exports: CodeElement[];
  imports: CodeElement[];
  apiEndpoints: APIEndpoint[];
  constants: CodeElement[];
  variables: CodeElement[];
  hasTests: boolean;
  testFiles: string[];
  configFiles: string[];
  packageManagers: string[];
  frameworks: string[];
  dependencies: string[];
  devDependencies: string[];
  supportedLanguages: string[];
}

export class CodeScanner {
  private rootPath: string;
  private multiLanguageScanner: MultiLanguageCodeScanner;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.multiLanguageScanner = new MultiLanguageCodeScanner();
  }

  async analyzeRepository(): Promise<CodeAnalysisResult> {
    const result: CodeAnalysisResult = {
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      enums: [],
      exports: [],
      imports: [],
      apiEndpoints: [],
      constants: [],
      variables: [],
      hasTests: false,
      testFiles: [],
      configFiles: [],
      packageManagers: [],
      frameworks: [],
      dependencies: [],
      devDependencies: [],
      supportedLanguages: [],
    };

    // Find all relevant files (now including Python, Go, YAML, Bash)
    const codeFiles = await this.findCodeFiles();
    const configFiles = await this.findConfigFiles();
    const testFiles = await this.findTestFiles();

    result.configFiles = configFiles;
    result.testFiles = testFiles;
    result.hasTests = testFiles.length > 0;
    result.supportedLanguages =
      this.multiLanguageScanner.getSupportedExtensions();

    // Analyze package.json for dependencies and frameworks
    await this.analyzePackageJson(result);

    // Analyze code files with multi-language support
    for (const filePath of codeFiles) {
      try {
        await this.analyzeFile(filePath, result);
      } catch (error) {
        // Skip files that can't be parsed (e.g., invalid syntax)
        console.warn(`Failed to analyze ${filePath}:`, error);
      }
    }

    return result;
  }

  private async findCodeFiles(): Promise<string[]> {
    const patterns = [
      // TypeScript/JavaScript
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.mjs",
      "**/*.cjs",
      // Python
      "**/*.py",
      "**/*.pyi",
      "**/*.pyx",
      "**/*.pxd",
      // Go
      "**/*.go",
      // YAML/Config
      "**/*.yml",
      "**/*.yaml",
      // Shell scripts
      "**/*.sh",
      "**/*.bash",
      "**/*.zsh",
      // Exclusions
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/build/**",
      "!**/.git/**",
      "!**/coverage/**",
      "!**/*.min.js",
      "!**/venv/**",
      "!**/__pycache__/**",
      "!**/vendor/**",
    ];

    return await globby(patterns, { cwd: this.rootPath, absolute: true });
  }

  private async findConfigFiles(): Promise<string[]> {
    const patterns = [
      // JavaScript/Node.js configs
      "package.json",
      "tsconfig.json",
      "jsconfig.json",
      ".eslintrc*",
      "prettier.config.*",
      "webpack.config.*",
      "vite.config.*",
      "rollup.config.*",
      "babel.config.*",
      "next.config.*",
      "nuxt.config.*",
      "vue.config.*",
      "svelte.config.*",
      "tailwind.config.*",
      "jest.config.*",
      "vitest.config.*",
      // Python configs
      "setup.py",
      "setup.cfg",
      "pyproject.toml",
      "requirements*.txt",
      "Pipfile",
      "poetry.lock",
      "tox.ini",
      "pytest.ini",
      ".flake8",
      "mypy.ini",
      // Go configs
      "go.mod",
      "go.sum",
      "Makefile",
      // Container configs
      "dockerfile*",
      "docker-compose*",
      ".dockerignore",
      "Containerfile*",
      // Kubernetes configs
      "k8s/**/*.yml",
      "k8s/**/*.yaml",
      "kubernetes/**/*.yml",
      "kubernetes/**/*.yaml",
      "manifests/**/*.yml",
      "manifests/**/*.yaml",
      // Terraform configs
      "**/*.tf",
      "**/*.tfvars",
      "terraform.tfstate*",
      // CI/CD configs
      ".github/workflows/*.yml",
      ".github/workflows/*.yaml",
      ".gitlab-ci.yml",
      "Jenkinsfile",
      ".circleci/config.yml",
      // Ansible configs
      "ansible.cfg",
      "playbook*.yml",
      "inventory*",
      // Cloud configs
      "serverless.yml",
      "sam.yml",
      "template.yml",
      "cloudformation*.yml",
      "pulumi*.yml",
    ];

    return await globby(patterns, {
      cwd: this.rootPath,
      absolute: true,
      caseSensitiveMatch: false,
    });
  }

  private async findTestFiles(): Promise<string[]> {
    const patterns = [
      // JavaScript/TypeScript tests
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test.js",
      "**/*.test.jsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.spec.js",
      "**/*.spec.jsx",
      "**/test/**/*.ts",
      "**/test/**/*.js",
      "**/tests/**/*.ts",
      "**/tests/**/*.js",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.js",
      // Python tests
      "**/*_test.py",
      "**/test_*.py",
      "**/tests/**/*.py",
      "**/test/**/*.py",
      // Go tests
      "**/*_test.go",
      // Shell script tests
      "**/test*.sh",
      "**/tests/**/*.sh",
      "!**/node_modules/**",
      "!**/venv/**",
      "!**/vendor/**",
    ];

    return await globby(patterns, { cwd: this.rootPath, absolute: true });
  }

  private async analyzePackageJson(result: CodeAnalysisResult): Promise<void> {
    try {
      const packageJsonPath = path.join(this.rootPath, "package.json");
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);

      // Extract dependencies
      if (packageJson.dependencies) {
        result.dependencies = Object.keys(packageJson.dependencies);
      }
      if (packageJson.devDependencies) {
        result.devDependencies = Object.keys(packageJson.devDependencies);
      }

      // Detect package managers
      const allDeps = [...result.dependencies, ...result.devDependencies];
      if (allDeps.some((dep) => dep.startsWith("@npm/")))
        result.packageManagers.push("npm");
      if (allDeps.some((dep) => dep.includes("yarn")))
        result.packageManagers.push("yarn");
      if (allDeps.some((dep) => dep.includes("pnpm")))
        result.packageManagers.push("pnpm");

      // Check for scripts that might indicate package managers
      if (packageJson.scripts) {
        const scripts = Object.keys(packageJson.scripts).join(" ");
        if (scripts.includes("yarn")) result.packageManagers.push("yarn");
        if (scripts.includes("pnpm")) result.packageManagers.push("pnpm");
      }

      // Detect frameworks (expanded for your DevOps/Cloud stack)
      const frameworkMap: Record<string, string[]> = {
        // Web Frameworks
        React: ["react", "@types/react"],
        Vue: ["vue", "@vue/core"],
        Angular: ["@angular/core"],
        Svelte: ["svelte"],
        "Next.js": ["next"],
        Nuxt: ["nuxt"],
        Express: ["express"],
        Fastify: ["fastify"],
        Koa: ["koa"],
        NestJS: ["@nestjs/core"],
        // Build Tools
        Vite: ["vite"],
        Webpack: ["webpack"],
        Rollup: ["rollup"],
        // Testing
        Jest: ["jest"],
        Vitest: ["vitest"],
        Playwright: ["@playwright/test"],
        Cypress: ["cypress"],
        // Cloud/DevOps (Python)
        Flask: ["flask"],
        Django: ["django"],
        FastAPI: ["fastapi"],
        Ansible: ["ansible"],
        Boto3: ["boto3"],
        // Infrastructure
        "AWS CDK": ["aws-cdk-lib", "@aws-cdk/core"],
        Pulumi: ["@pulumi/pulumi"],
        "Terraform CDK": ["cdktf"],
      };

      for (const [framework, deps] of Object.entries(frameworkMap)) {
        if (deps.some((dep) => allDeps.includes(dep))) {
          result.frameworks.push(framework);
        }
      }
    } catch (error) {
      // package.json not found or invalid
    }
  }

  private async analyzeFile(
    filePath: string,
    result: CodeAnalysisResult,
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const relativePath = path.relative(this.rootPath, filePath);
      const extension = path.extname(filePath).slice(1).toLowerCase();

      // Try multi-language parsing first
      if (
        this.multiLanguageScanner.getSupportedExtensions().includes(extension)
      ) {
        const parseResult = await this.multiLanguageScanner.parseFile(
          content,
          filePath,
        );
        this.mergeParseResults(parseResult, result);
      }
      // Fall back to TypeScript/JavaScript parsing for .ts/.js files
      else if (["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(extension)) {
        await this.analyzeTypeScriptFile(content, relativePath, result);
      }
      // Otherwise skip or warn
      else {
        console.warn(`Unsupported file type: ${filePath}`);
      }
    } catch (error) {
      // File parsing failed - could be due to syntax errors or unsupported syntax
      console.warn(`Failed to parse file ${filePath}:`, error);
    }
  }

  private async analyzeTypeScriptFile(
    content: string,
    relativePath: string,
    result: CodeAnalysisResult,
  ): Promise<void> {
    try {
      // Parse with TypeScript-ESLint parser
      const ast = parse(content, {
        filePath: relativePath,
        sourceType: "module",
        ecmaVersion: 2022,
        ecmaFeatures: {
          jsx: true,
        },
        comment: true,
        range: true,
        loc: true,
      });

      // Traverse AST to extract code elements
      this.traverseAST(ast, result, relativePath);

      // Look for API endpoints in the content
      this.findAPIEndpoints(content, result, relativePath);
    } catch (error) {
      throw new Error(
        `TypeScript parsing failed for ${relativePath}: ${error}`,
      );
    }
  }

  private mergeParseResults(
    parseResult: LanguageParseResult,
    result: CodeAnalysisResult,
  ): void {
    result.functions.push(...parseResult.functions);
    result.classes.push(...parseResult.classes);
    result.interfaces.push(...parseResult.interfaces);
    result.types.push(...parseResult.types);
    result.enums.push(...parseResult.enums);
    result.exports.push(...parseResult.exports);
    result.imports.push(...parseResult.imports);
    result.apiEndpoints.push(...parseResult.apiEndpoints);
    result.constants.push(...parseResult.constants);
    result.variables.push(...parseResult.variables);
  }

  private traverseAST(
    node: any,
    result: CodeAnalysisResult,
    filePath: string,
    isInExport = false,
  ): void {
    if (!node || typeof node !== "object") return;

    const line = node.loc?.start?.line || 0;
    const column = node.loc?.start?.column || 0;

    switch (node.type) {
      case "FunctionDeclaration":
        if (node.id?.name) {
          result.functions.push({
            name: node.id.name,
            type: "function",
            filePath,
            line,
            column,
            exported: isInExport || this.isExported(node),
            isAsync: node.async,
            hasJSDoc: this.hasJSDoc(node),
            jsDocDescription: this.getJSDocDescription(node),
            parameters: node.params?.map((p: any) => p.name || "param") || [],
          });
        }
        break;

      case "ClassDeclaration":
        if (node.id?.name) {
          result.classes.push({
            name: node.id.name,
            type: "class",
            filePath,
            line,
            column,
            exported: isInExport || this.isExported(node),
            hasJSDoc: this.hasJSDoc(node),
            jsDocDescription: this.getJSDocDescription(node),
            decorators:
              node.decorators?.map(
                (d: any) => d.expression?.name || "decorator",
              ) || [],
          });
        }
        break;

      case "TSInterfaceDeclaration":
        if (node.id?.name) {
          result.interfaces.push({
            name: node.id.name,
            type: "interface",
            filePath,
            line,
            column,
            exported: isInExport || this.isExported(node),
            hasJSDoc: this.hasJSDoc(node),
            jsDocDescription: this.getJSDocDescription(node),
          });
        }
        break;

      case "TSTypeAliasDeclaration":
        if (node.id?.name) {
          result.types.push({
            name: node.id.name,
            type: "type",
            filePath,
            line,
            column,
            exported: isInExport || this.isExported(node),
            hasJSDoc: this.hasJSDoc(node),
            jsDocDescription: this.getJSDocDescription(node),
          });
        }
        break;

      case "TSEnumDeclaration":
        if (node.id?.name) {
          result.enums.push({
            name: node.id.name,
            type: "enum",
            filePath,
            line,
            column,
            exported: isInExport || this.isExported(node),
            hasJSDoc: this.hasJSDoc(node),
            jsDocDescription: this.getJSDocDescription(node),
          });
        }
        break;

      case "ExportNamedDeclaration":
      case "ExportDefaultDeclaration":
        // Handle exports
        if (node.declaration) {
          this.traverseAST(node.declaration, result, filePath, true);
        }
        if (node.specifiers) {
          node.specifiers.forEach((spec: any) => {
            if (spec.exported?.name) {
              result.exports.push({
                name: spec.exported.name,
                type: "export",
                filePath,
                line,
                column,
                exported: true,
              });
            }
          });
        }
        break;

      case "ImportDeclaration":
        if (node.source?.value) {
          result.imports.push({
            name: node.source.value,
            type: "import",
            filePath,
            line,
            column,
            exported: false,
          });
        }
        break;
    }

    // Recursively traverse child nodes
    for (const key in node) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c) => this.traverseAST(c, result, filePath, isInExport));
      } else if (child && typeof child === "object") {
        this.traverseAST(child, result, filePath, isInExport);
      }
    }
  }

  private findAPIEndpoints(
    content: string,
    result: CodeAnalysisResult,
    filePath: string,
  ): void {
    // Common patterns for API endpoints
    const patterns = [
      // Express/Fastify/Koa patterns
      /\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      // Router patterns
      /router\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      // App patterns
      /app\.(get|post|put|delete|patch|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    ];

    const lines = content.split("\n");

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method = match[1].toUpperCase() as APIEndpoint["method"];
        const path = match[2];

        // Find line number
        let line = 1;
        let pos = 0;
        for (let i = 0; i < lines.length; i++) {
          if (pos + lines[i].length >= match.index!) {
            line = i + 1;
            break;
          }
          pos += lines[i].length + 1; // +1 for newline
        }

        result.apiEndpoints.push({
          method,
          path,
          filePath,
          line,
          hasDocumentation: this.hasEndpointDocumentation(
            content,
            match.index!,
          ),
        });
      }
    });
  }

  private isExported(node: any): boolean {
    // Check if node is part of an export declaration
    return (
      node.parent?.type === "ExportNamedDeclaration" ||
      node.parent?.type === "ExportDefaultDeclaration"
    );
  }

  private hasJSDoc(node: any): boolean {
    return (
      node.comments?.some(
        (comment: any) =>
          comment.type === "Block" && comment.value.startsWith("*"),
      ) || false
    );
  }

  private getJSDocDescription(node: any): string | undefined {
    const jsDocComment = node.comments?.find(
      (comment: any) =>
        comment.type === "Block" && comment.value.startsWith("*"),
    );

    if (jsDocComment) {
      // Extract first line of JSDoc as description
      const lines = jsDocComment.value.split("\n");
      for (const line of lines) {
        const cleaned = line.replace(/^\s*\*\s?/, "").trim();
        if (cleaned && !cleaned.startsWith("@")) {
          return cleaned;
        }
      }
    }

    return undefined;
  }

  private hasEndpointDocumentation(
    content: string,
    matchIndex: number,
  ): boolean {
    // Look for JSDoc or comments before the endpoint
    const beforeMatch = content.substring(0, matchIndex);
    const lines = beforeMatch.split("\n");

    // Check last few lines for documentation
    for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        line.startsWith("/**") ||
        line.startsWith("/*") ||
        line.startsWith("//")
      ) {
        return true;
      }
    }

    return false;
  }
}
