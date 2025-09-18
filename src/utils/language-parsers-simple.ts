import { CodeElement, APIEndpoint } from './code-scanner.js';
import { spawn } from 'child_process';

export interface LanguageParser {
  extensions: string[];
  name: string;
  parseFile(content: string, filePath: string): Promise<LanguageParseResult>;
  supportsApiEndpoints?: boolean;
  supportsFrameworkDetection?: boolean;
}

export interface LanguageParseResult {
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
}

export class MultiLanguageCodeScanner {
  private parsers = new Map<string, LanguageParser>();

  constructor() {
    this.initializeParsers();
  }

  private initializeParsers() {
    // Register parsers based on your tech stack
    this.registerParser(new PythonParser());
    this.registerParser(new GoParser());
    this.registerParser(new YamlParser());
    this.registerParser(new BashParser());
  }

  private registerParser(parser: LanguageParser) {
    for (const extension of parser.extensions) {
      this.parsers.set(extension, parser);
    }
  }

  async parseFile(content: string, filePath: string): Promise<LanguageParseResult> {
    const extension = this.getFileExtension(filePath);
    const parser = this.parsers.get(extension);

    if (parser) {
      return await parser.parseFile(content, filePath);
    }

    // Return empty result for unsupported files
    return this.getEmptyResult();
  }

  private getFileExtension(filePath: string): string {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }

  private getEmptyResult(): LanguageParseResult {
    return {
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
    };
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.parsers.keys());
  }

  getParserInfo(): { extension: string; parser: string }[] {
    return Array.from(this.parsers.entries()).map(([ext, parser]) => ({
      extension: ext,
      parser: parser.name,
    }));
  }
}

// Python Parser Implementation using subprocess + regex fallback
export class PythonParser implements LanguageParser {
  extensions = ['py', 'pyi', 'pyx', 'pxd'];
  name = 'Python';
  supportsApiEndpoints = true;
  supportsFrameworkDetection = true;

  async parseFile(content: string, filePath: string): Promise<LanguageParseResult> {
    const result: LanguageParseResult = {
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
    };

    try {
      // Try subprocess-based AST parsing first
      const astResult = await this.parseWithPythonAST(content, filePath);
      if (astResult) {
        this.mergePythonASTResults(astResult, result, filePath);
      } else {
        // Fall back to regex-based parsing
        this.parseWithRegex(content, result, filePath);
      }

      // Look for Flask/FastAPI/Django endpoints
      this.findPythonApiEndpoints(content, result, filePath);
    } catch (error) {
      console.warn(`Failed to parse Python file ${filePath}:`, error);
      // Fall back to regex-based parsing
      this.parseWithRegex(content, result, filePath);
    }

    return result;
  }

  private async parseWithPythonAST(content: string, _filePath: string): Promise<any> {
    return new Promise((resolve) => {
      // Create a Python script to parse the AST
      const pythonScript = `
import ast
import sys
import json
import tempfile
import os

try:
    # Read content from stdin
    content = sys.stdin.read()

    tree = ast.parse(content)

    result = {
        'functions': [],
        'classes': [],
        'imports': [],
        'constants': [],
        'variables': []
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            result['functions'].append({
                'name': node.name,
                'line': node.lineno,
                'has_docstring': ast.get_docstring(node) is not None,
                'docstring': ast.get_docstring(node),
                'is_async': False,
                'exported': not node.name.startswith('_')
            })
        elif isinstance(node, ast.AsyncFunctionDef):
            result['functions'].append({
                'name': node.name,
                'line': node.lineno,
                'has_docstring': ast.get_docstring(node) is not None,
                'docstring': ast.get_docstring(node),
                'is_async': True,
                'exported': not node.name.startswith('_')
            })
        elif isinstance(node, ast.ClassDef):
            result['classes'].append({
                'name': node.name,
                'line': node.lineno,
                'has_docstring': ast.get_docstring(node) is not None,
                'docstring': ast.get_docstring(node),
                'exported': not node.name.startswith('_')
            })
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    result['imports'].append({
                        'name': alias.name,
                        'line': node.lineno
                    })
            else:  # ImportFrom
                result['imports'].append({
                    'name': node.module or 'relative',
                    'line': node.lineno
                })
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    is_constant = target.id.isupper()
                    result['constants' if is_constant else 'variables'].append({
                        'name': target.id,
                        'line': node.lineno,
                        'exported': not target.id.startswith('_')
                    })

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}), file=sys.stderr)
`;

      // Try to execute Python AST parsing
      const process = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Send content via stdin
      process.stdin.write(content);
      process.stdin.end();

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            if (!result.error) {
              resolve(result);
              return;
            }
          } catch (e) {
            // JSON parsing failed
            console.warn('Failed to parse Python AST output:', e);
          }
        }
        if (errorOutput) {
          console.warn('Python AST parsing errors:', errorOutput);
        }
        resolve(null); // Fall back to regex parsing
      });

      process.on('error', () => {
        resolve(null); // Python not available or failed
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        process.kill();
        resolve(null);
      }, 5000);
    });
  }

  private mergePythonASTResults(
    astResult: any,
    result: LanguageParseResult,
    filePath: string,
  ): void {
    astResult.functions?.forEach((func: any) => {
      result.functions.push({
        name: func.name,
        type: 'function',
        filePath,
        line: func.line,
        column: 0,
        exported: func.exported,
        isAsync: func.is_async,
        hasJSDoc: func.has_docstring,
        jsDocDescription: func.docstring || undefined,
      });
    });

    astResult.classes?.forEach((cls: any) => {
      result.classes.push({
        name: cls.name,
        type: 'class',
        filePath,
        line: cls.line,
        column: 0,
        exported: cls.exported,
        hasJSDoc: cls.has_docstring,
        jsDocDescription: cls.docstring || undefined,
      });
    });

    astResult.imports?.forEach((imp: any) => {
      result.imports.push({
        name: imp.name,
        type: 'import',
        filePath,
        line: imp.line,
        column: 0,
        exported: false,
      });
    });

    astResult.constants?.forEach((constant: any) => {
      result.constants.push({
        name: constant.name,
        type: 'variable',
        filePath,
        line: constant.line,
        column: 0,
        exported: constant.exported,
        hasJSDoc: false,
      });
    });

    astResult.variables?.forEach((variable: any) => {
      result.variables.push({
        name: variable.name,
        type: 'variable',
        filePath,
        line: variable.line,
        column: 0,
        exported: variable.exported,
        hasJSDoc: false,
      });
    });
  }

  private parseWithRegex(content: string, result: LanguageParseResult, filePath: string): void {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Function definitions
      const funcMatch = line.match(/^\s*(async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        const isAsync = !!funcMatch[1];
        const funcName = funcMatch[2];
        const hasDocstring = this.hasDocstringAfterLine(lines, index);

        result.functions.push({
          name: funcName,
          type: 'function',
          filePath,
          line: lineNum,
          column: 0,
          exported: !funcName.startsWith('_'),
          isAsync,
          hasJSDoc: hasDocstring,
        });
      }

      // Class definitions
      const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        const className = classMatch[1];
        const hasDocstring = this.hasDocstringAfterLine(lines, index);

        result.classes.push({
          name: className,
          type: 'class',
          filePath,
          line: lineNum,
          column: 0,
          exported: !className.startsWith('_'),
          hasJSDoc: hasDocstring,
        });
      }

      // Import statements
      const importMatch = line.match(/^\s*(?:from\s+([^\s]+)\s+)?import\s+(.+)/);
      if (importMatch) {
        const module = importMatch[1] || importMatch[2].split(',')[0].trim();
        result.imports.push({
          name: module,
          type: 'import',
          filePath,
          line: lineNum,
          column: 0,
          exported: false,
        });
      }

      // Constants and variables
      const assignMatch = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
      if (assignMatch) {
        result.constants.push({
          name: assignMatch[1],
          type: 'variable',
          filePath,
          line: lineNum,
          column: 0,
          exported: true,
          hasJSDoc: false,
        });
      }
    });
  }

  private hasDocstringAfterLine(lines: string[], lineIndex: number): boolean {
    // Check if next few lines contain a docstring
    for (let i = lineIndex + 1; i < Math.min(lineIndex + 3, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('"""') || line.startsWith("'''")) {
        return true;
      }
    }
    return false;
  }

  private findPythonApiEndpoints(content: string, result: LanguageParseResult, filePath: string) {
    // Flask patterns
    const flaskPatterns = [
      /@app\.(route|get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /@bp\.(route|get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    // FastAPI patterns
    const fastApiPatterns = [
      /@app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g,
    ];

    // Django patterns
    const djangoPatterns = [/path\s*\(\s*['"]([^'"]+)['"]/g, /url\s*\(\s*r?['"]([^'"]+)['"]/g];

    const allPatterns = [...flaskPatterns, ...fastApiPatterns, ...djangoPatterns];

    allPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const method =
          match[1] === 'route' ? 'ALL' : (match[1].toUpperCase() as APIEndpoint['method']);
        const path = match[2] || match[1]; // Handle different capture groups

        // Find line number
        const beforeMatch = content.substring(0, match.index!);
        const line = beforeMatch.split('\n').length;

        result.apiEndpoints.push({
          method,
          path,
          filePath,
          line,
          hasDocumentation: this.hasEndpointDocumentation(content, match.index!),
        });
      }
    });
  }

  private hasEndpointDocumentation(content: string, matchIndex: number): boolean {
    const beforeMatch = content.substring(0, matchIndex);
    const lines = beforeMatch.split('\n');

    // Check last few lines for docstrings or comments
    for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('"""') || line.startsWith("'''") || line.startsWith('#')) {
        return true;
      }
    }
    return false;
  }
}

// Go Parser Implementation (regex-based)
export class GoParser implements LanguageParser {
  extensions = ['go'];
  name = 'Go';
  supportsApiEndpoints = true;

  async parseFile(content: string, filePath: string): Promise<LanguageParseResult> {
    const result: LanguageParseResult = {
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
    };

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Function declarations
      const funcMatch = line.match(/^\s*func\s+(?:\([^)]*\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        result.functions.push({
          name: funcName,
          type: 'function',
          filePath,
          line: lineNum,
          column: 0,
          exported: this.isGoExported(funcName),
          hasJSDoc: this.hasGoDocComment(lines, index),
        });
      }

      // Type declarations (struct, interface, etc.)
      const typeMatch = line.match(/^\s*type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(struct|interface)/);
      if (typeMatch) {
        const typeName = typeMatch[1];
        const typeKind = typeMatch[2];

        if (typeKind === 'struct') {
          result.classes.push({
            name: typeName,
            type: 'class',
            filePath,
            line: lineNum,
            column: 0,
            exported: this.isGoExported(typeName),
            hasJSDoc: this.hasGoDocComment(lines, index),
          });
        } else if (typeKind === 'interface') {
          result.interfaces.push({
            name: typeName,
            type: 'interface',
            filePath,
            line: lineNum,
            column: 0,
            exported: this.isGoExported(typeName),
            hasJSDoc: this.hasGoDocComment(lines, index),
          });
        }
      }

      // Import declarations
      const importMatch = line.match(/^\s*(?:import\s*)?"([^"]+)"/);
      if (importMatch) {
        result.imports.push({
          name: importMatch[1],
          type: 'import',
          filePath,
          line: lineNum,
          column: 0,
          exported: false,
        });
      }

      // Constants and variables
      const constMatch = line.match(/^\s*(const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (constMatch) {
        const declType = constMatch[1];
        const varName = constMatch[2];

        const element: CodeElement = {
          name: varName,
          type: 'variable',
          filePath,
          line: lineNum,
          column: 0,
          exported: this.isGoExported(varName),
          hasJSDoc: this.hasGoDocComment(lines, index),
        };

        if (declType === 'const') {
          result.constants.push(element);
        } else {
          result.variables.push(element);
        }
      }
    });

    // Find Go API endpoints
    this.findGoApiEndpoints(content, result, filePath);

    return result;
  }

  private isGoExported(name: string): boolean {
    // In Go, exported names start with uppercase letter
    return name.length > 0 && name[0] === name[0].toUpperCase();
  }

  private hasGoDocComment(lines: string[], lineIndex: number): boolean {
    // Check if previous line has a doc comment
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1].trim();
      return prevLine.startsWith('//');
    }
    return false;
  }

  private findGoApiEndpoints(content: string, result: LanguageParseResult, filePath: string) {
    // Common Go web framework patterns
    const patterns = [
      // Gin framework
      /\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*"([^"]+)"/g,
      // Echo framework
      /\.(Get|Post|Put|Delete|Patch)\s*\(\s*"([^"]+)"/g,
      // Gorilla mux
      /\.HandleFunc\s*\(\s*"([^"]+)"/g,
      // Standard library
      /http\.HandleFunc\s*\(\s*"([^"]+)"/g,
    ];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let method: APIEndpoint['method'] = 'ALL';
        let path: string;

        if (match[1] && match[2]) {
          method = match[1].toUpperCase() as APIEndpoint['method'];
          path = match[2];
        } else {
          path = match[1] || match[2];
        }

        const beforeMatch = content.substring(0, match.index!);
        const line = beforeMatch.split('\n').length;

        result.apiEndpoints.push({
          method,
          path,
          filePath,
          line,
          hasDocumentation: this.hasEndpointDocumentation(content, match.index!),
        });
      }
    });
  }

  private hasEndpointDocumentation(content: string, matchIndex: number): boolean {
    const beforeMatch = content.substring(0, matchIndex);
    const lines = beforeMatch.split('\n');

    for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*')) {
        return true;
      }
    }
    return false;
  }
}

// YAML Parser for Kubernetes, Terraform, etc.
export class YamlParser implements LanguageParser {
  extensions = ['yml', 'yaml'];
  name = 'YAML';
  supportsFrameworkDetection = true;

  async parseFile(content: string, filePath: string): Promise<LanguageParseResult> {
    const result: LanguageParseResult = {
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
    };

    // YAML parsing focuses on identifying Kubernetes resources, Terraform configs, etc.
    this.identifyKubernetesResources(content, result, filePath);
    this.identifyDockerComposeServices(content, result, filePath);
    this.identifyGitHubActions(content, result, filePath);

    return result;
  }

  private identifyKubernetesResources(
    content: string,
    result: LanguageParseResult,
    filePath: string,
  ) {
    const lines = content.split('\n');
    let apiVersion = '';
    let kind = '';

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      const apiMatch = line.match(/^\s*apiVersion:\s*(.+)/);
      if (apiMatch) {
        apiVersion = apiMatch[1].trim();
      }

      const kindMatch = line.match(/^\s*kind:\s*(.+)/);
      if (kindMatch) {
        kind = kindMatch[1].trim();

        result.types.push({
          name: `${kind} (${apiVersion})`,
          type: 'type',
          filePath,
          line: lineNum,
          column: 0,
          exported: true,
          hasJSDoc: false,
        });
      }
    });
  }

  private identifyDockerComposeServices(
    content: string,
    result: LanguageParseResult,
    filePath: string,
  ) {
    let inServicesSection = false;

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (line.trim() === 'services:') {
        inServicesSection = true;
        return;
      }

      if (inServicesSection && line.match(/^[a-zA-Z]/)) {
        inServicesSection = false; // Left services section
      }

      if (inServicesSection) {
        const serviceMatch = line.match(/^\s+([a-zA-Z0-9_-]+):\s*$/);
        if (serviceMatch) {
          result.types.push({
            name: `service: ${serviceMatch[1]}`,
            type: 'type',
            filePath,
            line: index + 1,
            column: 0,
            exported: true,
            hasJSDoc: false,
          });
        }
      }
    });
  }

  private identifyGitHubActions(content: string, result: LanguageParseResult, filePath: string) {
    if (!filePath.includes('.github/workflows/')) return;

    const lines = content.split('\n');
    let inJobsSection = false;

    lines.forEach((line, index) => {
      if (line.trim() === 'jobs:') {
        inJobsSection = true;
        return;
      }

      if (inJobsSection && line.match(/^[a-zA-Z]/)) {
        inJobsSection = false;
      }

      if (inJobsSection) {
        const jobMatch = line.match(/^\s+([a-zA-Z0-9_-]+):\s*$/);
        if (jobMatch) {
          result.functions.push({
            name: `job: ${jobMatch[1]}`,
            type: 'function',
            filePath,
            line: index + 1,
            column: 0,
            exported: true,
            hasJSDoc: false,
          });
        }
      }
    });
  }
}

// Bash Parser for DevOps scripts
export class BashParser implements LanguageParser {
  extensions = ['sh', 'bash', 'zsh'];
  name = 'Bash';

  async parseFile(content: string, filePath: string): Promise<LanguageParseResult> {
    const result: LanguageParseResult = {
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
    };

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Function definitions
      const funcMatch = line.match(/^\s*(?:function\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\)/);
      if (funcMatch) {
        const functionName = funcMatch[1];

        result.functions.push({
          name: functionName,
          type: 'function',
          filePath,
          line: lineNum,
          column: 0,
          exported: true, // Bash functions are generally available in scope
          hasJSDoc: this.hasBashDocComment(lines, index),
        });
      }

      // Variable assignments
      const varMatch = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=/);
      if (varMatch) {
        const varName = varMatch[1];
        const isConstant = varName === varName.toUpperCase();

        const element: CodeElement = {
          name: varName,
          type: 'variable',
          filePath,
          line: lineNum,
          column: 0,
          exported: true,
          hasJSDoc: this.hasBashDocComment(lines, index),
        };

        if (isConstant) {
          result.constants.push(element);
        } else {
          result.variables.push(element);
        }
      }
    });

    return result;
  }

  private hasBashDocComment(lines: string[], lineIndex: number): boolean {
    // Check if previous line has a comment
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1].trim();
      return prevLine.startsWith('#');
    }
    return false;
  }
}
