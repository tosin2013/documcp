/**
 * Multi-language AST extraction via web-tree-sitter (Issue #112, ADR-015).
 *
 * Lazy-loaded parser registry: each language's `.wasm` grammar is loaded
 * on first use and cached for the process lifetime. Adding a language is
 * a single-PR change: register the wasm path here and (optionally) add a
 * dedicated extractor; everything else flows through the uniform
 * `extractSignatures` entry point.
 *
 * Existing TypeScript / JavaScript continues to use `@typescript-eslint/typescript-estree`
 * via the original `analyzeTypeScript` path in `ast-analyzer.ts`. This module
 * fills the historical TS/JS-only gap that CLAUDE.md flagged as
 * "Tree-sitter initialization currently simplified".
 */

import path from "path";
import { promises as fs } from "fs";
import { createRequire } from "module";

import type {
  ASTAnalysisResult,
  ClassInfo,
  FunctionSignature,
  ImportInfo,
  InterfaceInfo,
  ParameterInfo,
  PropertyInfo,
} from "./ast-analyzer.js";

// `web-tree-sitter` is a CommonJS module that ships named exports. We can't
// statically import its types in an ESM TS file without resolving them as
// `any`, so the helpers here treat tree-sitter nodes as `any`. This is the
// same pattern the existing `analyzeTypeScript` uses for the typescript-estree
// AST.
type TSParser = any;
type TSNode = any;

// `require.resolve` works for `package.json` of any installed package even in
// ESM mode (via `createRequire`). We seed it from the CWD so resolution finds
// every node_modules ancestor of the running project; this works identically
// in compiled ESM, in ts-jest's CommonJS test harness, and from a globally
// installed CLI invoked inside a project. We deliberately avoid `import.meta`
// here because the Jest ts-jest preset compiles with `module=commonjs` and
// rejects the meta-property at parse time even behind a `typeof` guard.
const requireFromHere = createRequire(`${process.cwd()}/`);

/**
 * Map from logical language name → relative wasm asset inside the language
 * pack. The package name is derived as `tree-sitter-${lang}` so the pack
 * resolves through normal node_modules resolution.
 */
const WASM_FILENAME_BY_LANG: Record<string, string> = {
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm",
  java: "tree-sitter-java.wasm",
  ruby: "tree-sitter-ruby.wasm",
  bash: "tree-sitter-bash.wasm",
};

// Module-level state. These caches survive across analyzer instances so
// repeated analyses (e.g. drift over a 500-file repo) don't pay the wasm
// load cost more than once per language.
let initPromise: Promise<void> | null = null;
const languageCache = new Map<string, any>();
const failedLanguages = new Set<string>();

/**
 * Acquire a `web-tree-sitter` Parser pre-configured for the given language.
 *
 * Returns `null` (and logs once) if the parser fails to initialize for any
 * reason — e.g. missing wasm asset on a partial install. Callers that get
 * `null` should fall back to structural-only analysis (content hash, line
 * count) so drift detection still has *something* to compare across runs.
 */
export async function getParserForLanguage(
  language: string,
): Promise<TSParser | null> {
  const wasmFilename = WASM_FILENAME_BY_LANG[language];
  if (!wasmFilename) return null;
  if (failedLanguages.has(language)) return null;

  let webTreeSitter: { Parser: any; Language: any };
  try {
    // Dynamic import keeps web-tree-sitter out of the hot path until a
    // non-TS/JS file is actually analyzed.
    webTreeSitter = (await import("web-tree-sitter")) as any;
  } catch (e) {
    failedLanguages.add(language);
    console.warn(
      `[ast-tree-sitter] failed to load web-tree-sitter runtime: ${
        (e as Error).message
      }`,
    );
    return null;
  }

  if (!initPromise) {
    initPromise = webTreeSitter.Parser.init();
  }
  try {
    await initPromise;
  } catch (e) {
    failedLanguages.add(language);
    console.warn(
      `[ast-tree-sitter] Parser.init() failed: ${(e as Error).message}`,
    );
    return null;
  }

  if (!languageCache.has(language)) {
    const wasmPath = resolveWasmPath(language, wasmFilename);
    if (!wasmPath) {
      failedLanguages.add(language);
      return null;
    }
    try {
      // Pass a buffer rather than the path string. `Language.load(string)`
      // ends up doing an internal dynamic import of the Emscripten module
      // which Jest's VM rejects with
      // "A dynamic import callback was invoked without --experimental-vm-modules".
      // Reading the wasm ourselves and handing in the bytes sidesteps that
      // entirely and is identically fast (Language.load mmap-equivalent).
      const wasmBytes = await fs.readFile(wasmPath);
      const lang = await webTreeSitter.Language.load(
        new Uint8Array(wasmBytes),
      );
      languageCache.set(language, lang);
    } catch (e) {
      failedLanguages.add(language);
      console.warn(
        `[ast-tree-sitter] failed to load wasm for ${language}: ${
          (e as Error).message
        }`,
      );
      return null;
    }
  }

  const parser = new webTreeSitter.Parser();
  parser.setLanguage(languageCache.get(language));
  return parser;
}

function resolveWasmPath(language: string, wasmFilename: string): string | null {
  const pkgName = `tree-sitter-${language}`;
  try {
    const pkgJsonPath = requireFromHere.resolve(`${pkgName}/package.json`);
    return path.join(path.dirname(pkgJsonPath), wasmFilename);
  } catch {
    // Fallback to a CWD-relative search for unusual layouts (e.g. monorepos
    // with hoisted node_modules elsewhere).
    const cwdGuess = path.resolve(
      process.cwd(),
      "node_modules",
      pkgName,
      wasmFilename,
    );
    return cwdGuess;
  }
}

// ---------------------------------------------------------------------------
// Generic walking helpers
// ---------------------------------------------------------------------------

/** Pre-order DFS yielding every descendant of `node`. */
function* walk(node: TSNode): Generator<TSNode> {
  yield node;
  for (const child of node.children) {
    yield* walk(child);
  }
}

/** Convert a tree-sitter node range to 1-based line numbers (matching estree). */
function lineRange(node: TSNode): { startLine: number; endLine: number } {
  return {
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
  };
}

// ---------------------------------------------------------------------------
// Python extractor
// ---------------------------------------------------------------------------
//
// Top-level Python node types we care about (per tree-sitter-python grammar):
//   - module / function_definition / async_function_definition (older grammars
//     emit a separate node type for async, newer ones emit `function_definition`
//     with an `async` modifier; we handle both)
//   - class_definition
//   - import_statement / import_from_statement
//   - decorated_definition (wraps a function/class with one or more decorators)

export function extractPythonSignatures(
  root: TSNode,
  source: string,
  result: {
    functions: FunctionSignature[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: string[];
  },
): void {
  const sourceLines = source.split("\n");

  // Python has no `export` keyword. By PEP 8 convention, names without a
  // leading underscore are public/exported at module scope.
  const isExported = (name: string) => name.length > 0 && !name.startsWith("_");

  for (const child of root.children) {
    visitPythonTopLevel(child, sourceLines, result, isExported);
  }
}

function visitPythonTopLevel(
  node: TSNode,
  sourceLines: string[],
  result: {
    functions: FunctionSignature[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: string[];
  },
  isExported: (name: string) => boolean,
): void {
  // Decorated function/class — unwrap the decorator wrapper but keep the
  // decorator names available for future use.
  if (node.type === "decorated_definition") {
    const inner =
      node.childForFieldName("definition") ||
      node.children[node.children.length - 1];
    if (inner) visitPythonTopLevel(inner, sourceLines, result, isExported);
    return;
  }

  if (
    node.type === "function_definition" ||
    node.type === "async_function_definition"
  ) {
    const fn = parsePythonFunction(node, sourceLines, isExported);
    if (fn) {
      result.functions.push(fn);
      if (fn.isExported) result.exports.push(fn.name);
    }
    return;
  }

  if (node.type === "class_definition") {
    const cls = parsePythonClass(node, sourceLines, isExported);
    if (cls) {
      result.classes.push(cls);
      if (cls.isExported) result.exports.push(cls.name);
    }
    return;
  }

  if (node.type === "import_statement") {
    // `import os`, `import sys as system`, `import a.b.c`, `import a, b as c`.
    // Each top-level child after the `import` keyword is either a
    // `dotted_name` (no alias) or an `aliased_import` (with alias).
    // We emit one ImportInfo per child so each imported module gets its own
    // entry — easier for downstream drift code than packing multiple sources
    // into a single record.
    for (const child of node.children) {
      if (child.type === "dotted_name") {
        result.imports.push({
          source: child.text,
          imports: [{ name: child.text }],
          isDefault: false,
          startLine: child.startPosition.row + 1,
        });
      } else if (child.type === "aliased_import") {
        const nameNode =
          child.childForFieldName("name") ||
          child.children.find((c: TSNode) => c.type === "dotted_name");
        const aliasNode = child.childForFieldName("alias");
        const sourceText = nameNode?.text || "";
        if (sourceText) {
          result.imports.push({
            source: sourceText,
            imports: [
              {
                name: sourceText,
                ...(aliasNode ? { alias: aliasNode.text } : {}),
              },
            ],
            isDefault: false,
            startLine: child.startPosition.row + 1,
          });
        }
      }
    }
    return;
  }

  if (node.type === "import_from_statement") {
    // `from x.y import a as b, c`
    // Tree shape: keyword "from" → dotted_name (module) → keyword "import" →
    // (dotted_name | aliased_import)+. Targets are everything between the
    // `import` keyword and end-of-statement; the very first `dotted_name`
    // child is the module path (also exposed via the `module_name` field).
    const moduleNode = node.childForFieldName("module_name");
    const moduleName = moduleNode?.text || "";
    const imports: Array<{ name: string; alias?: string }> = [];
    let seenImportKeyword = false;
    for (const child of node.children) {
      if (child.type === "import") {
        seenImportKeyword = true;
        continue;
      }
      if (!seenImportKeyword) continue;
      if (child.type === "dotted_name") {
        imports.push({ name: child.text });
      } else if (child.type === "aliased_import") {
        const nameNode =
          child.childForFieldName("name") ||
          child.children.find((c: TSNode) => c.type === "dotted_name");
        const aliasNode = child.childForFieldName("alias");
        const importedName = nameNode?.text || "";
        if (importedName) {
          imports.push({
            name: importedName,
            ...(aliasNode ? { alias: aliasNode.text } : {}),
          });
        }
      }
    }
    if (moduleName) {
      result.imports.push({
        source: moduleName,
        imports,
        isDefault: false,
        startLine: node.startPosition.row + 1,
      });
    }
    return;
  }
}

function parsePythonFunction(
  node: TSNode,
  sourceLines: string[],
  isExported: (name: string) => boolean,
  forceVisibility?: "public" | "private" | "protected",
): FunctionSignature | null {
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return null;
  const name = nameNode.text;
  const { startLine, endLine } = lineRange(node);

  const parametersNode = node.childForFieldName("parameters");
  const parameters: ParameterInfo[] = parametersNode
    ? parsePythonParameters(parametersNode)
    : [];

  const returnTypeNode = node.childForFieldName("return_type");
  const returnType = returnTypeNode ? returnTypeNode.text : null;

  const isAsync =
    node.type === "async_function_definition" ||
    node.children.some((c: TSNode) => c.type === "async");

  const docComment = extractPythonDocstring(
    node.childForFieldName("body"),
  );
  const visibility =
    forceVisibility ?? (name.startsWith("_") ? "private" : "public");

  return {
    name,
    parameters,
    returnType,
    isAsync,
    isExported: forceVisibility ? false : isExported(name),
    isPublic: visibility === "public",
    docComment,
    startLine,
    endLine,
    complexity: countPythonBranches(node) + 1,
    dependencies: [],
  };
}

function parsePythonParameters(node: TSNode): ParameterInfo[] {
  const out: ParameterInfo[] = [];
  for (const child of node.children) {
    switch (child.type) {
      case "identifier":
        out.push({
          name: child.text,
          type: null,
          optional: false,
          defaultValue: null,
        });
        break;
      case "typed_parameter": {
        const ident = child.children.find(
          (c: TSNode) => c.type === "identifier",
        );
        const typeNode = child.childForFieldName("type");
        out.push({
          name: ident?.text || "",
          type: typeNode?.text || null,
          optional: false,
          defaultValue: null,
        });
        break;
      }
      case "default_parameter": {
        const ident = child.childForFieldName("name");
        const value = child.childForFieldName("value");
        out.push({
          name: ident?.text || "",
          type: null,
          optional: true,
          defaultValue: value?.text || null,
        });
        break;
      }
      case "typed_default_parameter": {
        const ident = child.childForFieldName("name");
        const typeNode = child.childForFieldName("type");
        const value = child.childForFieldName("value");
        out.push({
          name: ident?.text || "",
          type: typeNode?.text || null,
          optional: true,
          defaultValue: value?.text || null,
        });
        break;
      }
      // `*args`, `**kwargs` — record but mark as variadic via `optional`
      case "list_splat_pattern":
      case "dictionary_splat_pattern": {
        out.push({
          name: child.text,
          type: null,
          optional: true,
          defaultValue: null,
        });
        break;
      }
    }
  }
  return out;
}

function parsePythonClass(
  node: TSNode,
  sourceLines: string[],
  isExported: (name: string) => boolean,
): ClassInfo | null {
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return null;
  const name = nameNode.text;
  const { startLine, endLine } = lineRange(node);

  const superclassesNode = node.childForFieldName("superclasses");
  let extendsBase: string | null = null;
  const implementsList: string[] = [];
  if (superclassesNode) {
    const bases = superclassesNode.children
      .filter((c: TSNode) => c.type !== "(" && c.type !== ")" && c.type !== ",")
      .map((c: TSNode) => c.text);
    if (bases.length > 0) {
      // Python has single-base inheritance semantically; the rest are mixins.
      extendsBase = bases[0];
      implementsList.push(...bases.slice(1));
    }
  }

  const bodyNode = node.childForFieldName("body");
  const methods: FunctionSignature[] = [];
  const properties: PropertyInfo[] = [];
  const docComment = extractPythonDocstring(bodyNode);

  if (bodyNode) {
    for (const member of bodyNode.children) {
      if (
        member.type === "function_definition" ||
        member.type === "async_function_definition"
      ) {
        const methodName = member.childForFieldName("name")?.text || "";
        const visibility = methodName.startsWith("__")
          ? "private"
          : methodName.startsWith("_")
          ? "protected"
          : "public";
        const fn = parsePythonFunction(
          member,
          sourceLines,
          isExported,
          visibility,
        );
        if (fn) methods.push(fn);
      } else if (member.type === "decorated_definition") {
        const inner =
          member.childForFieldName("definition") ||
          member.children[member.children.length - 1];
        if (
          inner &&
          (inner.type === "function_definition" ||
            inner.type === "async_function_definition")
        ) {
          const methodName = inner.childForFieldName("name")?.text || "";
          const visibility = methodName.startsWith("__")
            ? "private"
            : methodName.startsWith("_")
            ? "protected"
            : "public";
          const fn = parsePythonFunction(
            inner,
            sourceLines,
            isExported,
            visibility,
          );
          if (fn) methods.push(fn);
        }
      }
      // Class-level attribute assignments → properties
      if (
        member.type === "expression_statement" &&
        member.children[0]?.type === "assignment"
      ) {
        const assign = member.children[0];
        const left = assign.childForFieldName("left");
        const typeAnnotation = assign.childForFieldName("type");
        if (left && left.type === "identifier") {
          const propName = left.text;
          properties.push({
            name: propName,
            type: typeAnnotation?.text || null,
            isStatic: true,
            isReadonly: false,
            visibility: propName.startsWith("_") ? "private" : "public",
          });
        }
      }
    }
  }

  return {
    name,
    isExported: isExported(name),
    extends: extendsBase,
    implements: implementsList,
    methods,
    properties,
    docComment,
    startLine,
    endLine,
  };
}

function extractPythonDocstring(bodyNode: TSNode | null): string | null {
  if (!bodyNode) return null;
  const first = bodyNode.children[0];
  if (!first) return null;
  // Tree-sitter-python represents a docstring as an expression_statement whose
  // sole child is a string node.
  if (first.type === "expression_statement") {
    const str = first.children[0];
    if (str && str.type === "string") {
      // Strip the surrounding quote tokens for a tidy doc comment.
      const text: string = str.text;
      const stripped = text
        .replace(/^[ru]?("""|'''|"|')/, "")
        .replace(/("""|'''|"|')$/, "")
        .trim();
      return stripped || null;
    }
  }
  return null;
}

function countPythonBranches(node: TSNode): number {
  let n = 0;
  for (const desc of walk(node)) {
    if (
      desc.type === "if_statement" ||
      desc.type === "elif_clause" ||
      desc.type === "for_statement" ||
      desc.type === "while_statement" ||
      desc.type === "try_statement" ||
      desc.type === "case_clause"
    ) {
      n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Go extractor
// ---------------------------------------------------------------------------
//
// Top-level Go node types we care about (per tree-sitter-go grammar):
//   - source_file / package_clause / import_declaration
//   - function_declaration (top-level funcs)
//   - method_declaration (funcs with receivers)
//   - type_declaration → type_spec → struct_type | interface_type
//
// Go's export rule is purely lexical: identifiers starting with an uppercase
// letter are exported. We use that to populate `isExported`.

export function extractGoSignatures(
  root: TSNode,
  source: string,
  result: {
    functions: FunctionSignature[];
    classes: ClassInfo[];
    interfaces: InterfaceInfo[];
    imports: ImportInfo[];
    exports: string[];
  },
): void {
  const sourceLines = source.split("\n");
  const isExported = (name: string) =>
    name.length > 0 && name[0] >= "A" && name[0] <= "Z";

  for (const child of root.children) {
    switch (child.type) {
      case "function_declaration": {
        const fn = parseGoFunction(child, sourceLines, isExported, false);
        if (fn) {
          result.functions.push(fn);
          if (fn.isExported) result.exports.push(fn.name);
        }
        break;
      }
      case "method_declaration": {
        const fn = parseGoFunction(child, sourceLines, isExported, true);
        if (fn) {
          result.functions.push(fn);
          if (fn.isExported) result.exports.push(fn.name);
        }
        break;
      }
      case "type_declaration":
        for (const typeSpec of child.children) {
          if (typeSpec.type === "type_spec") {
            const nameNode = typeSpec.childForFieldName("name");
            const typeNode = typeSpec.childForFieldName("type");
            if (!nameNode || !typeNode) continue;
            const name = nameNode.text;
            const { startLine, endLine } = lineRange(typeSpec);

            if (typeNode.type === "struct_type") {
              const fields = parseGoStructFields(typeNode);
              result.classes.push({
                name,
                isExported: isExported(name),
                extends: null,
                implements: [],
                methods: [],
                properties: fields,
                docComment: null,
                startLine,
                endLine,
              });
              if (isExported(name)) result.exports.push(name);
            } else if (typeNode.type === "interface_type") {
              const methodSpecs = parseGoInterfaceMethods(typeNode);
              result.interfaces.push({
                name,
                isExported: isExported(name),
                extends: [],
                properties: [],
                methods: methodSpecs,
                docComment: null,
                startLine,
                endLine,
              });
              if (isExported(name)) result.exports.push(name);
            }
          }
        }
        break;
      case "import_declaration":
        result.imports.push(...parseGoImports(child));
        break;
    }
  }

  // Attach methods to their receiver structs after a first pass so struct
  // ordering doesn't matter. Methods with a known receiver type are grafted
  // onto the matching `ClassInfo` in `result.classes` (by name match).
  for (const fn of result.functions) {
    const receiverType = (fn as any).__receiverType as string | undefined;
    if (!receiverType) continue;
    const cls = result.classes.find((c) => c.name === receiverType);
    if (cls) cls.methods.push(fn);
    delete (fn as any).__receiverType;
  }
}

function parseGoFunction(
  node: TSNode,
  _sourceLines: string[],
  isExported: (name: string) => boolean,
  isMethod: boolean,
): FunctionSignature | null {
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return null;
  const name = nameNode.text;
  const { startLine, endLine } = lineRange(node);

  const parametersNode = node.childForFieldName("parameters");
  const parameters: ParameterInfo[] = parametersNode
    ? parseGoParameterList(parametersNode)
    : [];

  const resultNode = node.childForFieldName("result");
  const returnType = resultNode ? resultNode.text : null;

  let receiverType: string | undefined;
  if (isMethod) {
    const receiver = node.childForFieldName("receiver");
    if (receiver) {
      // Receiver is a parameter_list with one parameter_declaration; we want
      // the type, optionally pointer-stripped.
      const paramDecl = receiver.children.find(
        (c: TSNode) => c.type === "parameter_declaration",
      );
      const typeNode = paramDecl?.childForFieldName("type");
      if (typeNode) {
        const text = typeNode.text;
        receiverType = text.startsWith("*") ? text.slice(1) : text;
      }
    }
  }

  const fn: FunctionSignature & { __receiverType?: string } = {
    name,
    parameters,
    returnType,
    isAsync: false,
    isExported: isExported(name),
    isPublic: isExported(name),
    docComment: null,
    startLine,
    endLine,
    complexity: countGoBranches(node) + 1,
    dependencies: [],
  };
  if (receiverType) fn.__receiverType = receiverType;
  return fn;
}

function parseGoParameterList(node: TSNode): ParameterInfo[] {
  const out: ParameterInfo[] = [];
  for (const child of node.children) {
    if (child.type === "parameter_declaration") {
      const typeNode = child.childForFieldName("type");
      const typeText = typeNode?.text || null;
      // A parameter_declaration may bind multiple names: `x, y int` → two
      // parameters of type int.
      const names = child.children.filter(
        (c: TSNode) => c.type === "identifier",
      );
      if (names.length === 0) {
        out.push({
          name: "",
          type: typeText,
          optional: false,
          defaultValue: null,
        });
      } else {
        for (const n of names) {
          out.push({
            name: n.text,
            type: typeText,
            optional: false,
            defaultValue: null,
          });
        }
      }
    } else if (child.type === "variadic_parameter_declaration") {
      const typeNode = child.childForFieldName("type");
      const ident = child.children.find(
        (c: TSNode) => c.type === "identifier",
      );
      out.push({
        name: ident?.text || "",
        type: typeNode ? `...${typeNode.text}` : null,
        optional: true,
        defaultValue: null,
      });
    }
  }
  return out;
}

function parseGoStructFields(structType: TSNode): PropertyInfo[] {
  const fields: PropertyInfo[] = [];
  const fieldList = structType.children.find(
    (c: TSNode) => c.type === "field_declaration_list",
  );
  if (!fieldList) return fields;
  for (const decl of fieldList.children) {
    if (decl.type !== "field_declaration") continue;
    const typeNode = decl.childForFieldName("type");
    const typeText = typeNode?.text || null;
    const names = decl.children.filter(
      (c: TSNode) => c.type === "field_identifier",
    );
    if (names.length === 0) {
      // Anonymous (embedded) field: `Reader` embeds io.Reader. Use the type
      // text as the field name.
      if (typeText) {
        fields.push({
          name: typeText,
          type: typeText,
          isStatic: false,
          isReadonly: false,
          visibility: typeText[0] >= "A" && typeText[0] <= "Z"
            ? "public"
            : "private",
        });
      }
    } else {
      for (const n of names) {
        const visibility =
          n.text[0] >= "A" && n.text[0] <= "Z" ? "public" : "private";
        fields.push({
          name: n.text,
          type: typeText,
          isStatic: false,
          isReadonly: false,
          visibility,
        });
      }
    }
  }
  return fields;
}

function parseGoInterfaceMethods(
  interfaceType: TSNode,
): FunctionSignature[] {
  const methods: FunctionSignature[] = [];
  for (const desc of walk(interfaceType)) {
    if (desc.type === "method_elem" || desc.type === "method_spec") {
      const nameNode = desc.childForFieldName("name");
      if (!nameNode) continue;
      const parametersNode = desc.childForFieldName("parameters");
      const resultNode = desc.childForFieldName("result");
      const { startLine, endLine } = lineRange(desc);
      const name = nameNode.text;
      methods.push({
        name,
        parameters: parametersNode
          ? parseGoParameterList(parametersNode)
          : [],
        returnType: resultNode ? resultNode.text : null,
        isAsync: false,
        isExported: name.length > 0 && name[0] >= "A" && name[0] <= "Z",
        isPublic: true,
        docComment: null,
        startLine,
        endLine,
        complexity: 1,
        dependencies: [],
      });
    }
  }
  return methods;
}

function parseGoImports(node: TSNode): ImportInfo[] {
  const out: ImportInfo[] = [];
  for (const desc of walk(node)) {
    if (desc.type !== "import_spec") continue;
    const pathNode =
      desc.childForFieldName("path") ||
      desc.children.find((c: TSNode) => c.type === "interpreted_string_literal");
    if (!pathNode) continue;
    // strip surrounding quotes
    const source = pathNode.text.replace(/^"|"$/g, "");
    const aliasNode = desc.childForFieldName("name");
    out.push({
      source,
      imports: aliasNode
        ? [{ name: source, alias: aliasNode.text }]
        : [{ name: source }],
      isDefault: false,
      startLine: desc.startPosition.row + 1,
    });
  }
  return out;
}

function countGoBranches(node: TSNode): number {
  let n = 0;
  for (const desc of walk(node)) {
    if (
      desc.type === "if_statement" ||
      desc.type === "for_statement" ||
      desc.type === "type_switch_statement" ||
      desc.type === "expression_switch_statement" ||
      desc.type === "select_statement" ||
      desc.type === "case_clause"
    ) {
      n++;
    }
  }
  return n;
}

// Re-exports kept for downstream callers; these enable `analyzeWithTreeSitter`
// in `ast-analyzer.ts` to remain a thin wrapper that builds the final
// `ASTAnalysisResult` from the per-language extractors above.
export type {
  ASTAnalysisResult,
  ClassInfo,
  FunctionSignature,
  ImportInfo,
  InterfaceInfo,
  ParameterInfo,
  PropertyInfo,
};

// Test seam: callers that need to flush the parser cache between runs (e.g.
// benchmarks) can re-trigger lazy load by calling this. Not used in production.
export function _resetTreeSitterCachesForTesting(): void {
  initPromise = null;
  languageCache.clear();
  failedLanguages.clear();
}

