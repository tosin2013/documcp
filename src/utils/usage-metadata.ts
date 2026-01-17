import {
  DriftSnapshot,
  UsageMetadata,
  DocumentationSection,
} from "./drift-detector.js";
import { ASTAnalyzer, CallGraph } from "./ast-analyzer.js";

/**
 * Builds UsageMetadata from snapshot artifacts so priority scoring can
 * incorporate real import/reference counts and call graph analysis.
 *
 * Enhanced implementation (ADR-012 Phase 2):
 * - Builds call graphs for exported functions to count actual usage
 * - Extracts class instantiations from AST analysis
 * - Counts imports with better accuracy
 * - Incorporates documentation references
 */
export class UsageMetadataCollector {
  private analyzer: ASTAnalyzer;

  constructor(analyzer?: ASTAnalyzer) {
    this.analyzer = analyzer || new ASTAnalyzer();
  }

  /**
   * Collect usage metadata from snapshot using AST call graph analysis
   */
  async collect(snapshot: DriftSnapshot): Promise<UsageMetadata> {
    const functionCalls = new Map<string, number>();
    const classInstantiations = new Map<string, number>();
    const imports = new Map<string, number>();
    const exportedSymbols = new Set<string>();
    const functionSymbols = new Map<string, { file: string; signature: any }>();
    const classSymbols = new Map<string, { file: string; info: any }>();

    // Initialize analyzer if needed
    await this.analyzer.initialize();

    // Phase 1: Collect all exported symbols and their locations
    for (const [filePath, fileAnalysis] of snapshot.files.entries()) {
      // Track exports
      for (const symbol of fileAnalysis.exports ?? []) {
        exportedSymbols.add(symbol);
      }

      // Track functions with their file locations
      for (const fn of fileAnalysis.functions ?? []) {
        if (fn.name) {
          functionSymbols.set(fn.name, { file: filePath, signature: fn });
        }
      }

      // Track classes with their file locations
      for (const cls of fileAnalysis.classes ?? []) {
        if (cls.name) {
          classSymbols.set(cls.name, { file: filePath, info: cls });
        }
      }
    }

    // Phase 2: Build call graphs for exported functions to count actual usage
    const callGraphPromises: Promise<CallGraph | null>[] = [];
    const exportedFunctions = Array.from(exportedSymbols).filter((name) =>
      functionSymbols.has(name),
    );

    for (const funcName of exportedFunctions.slice(0, 50)) {
      // Limit to top 50 exported functions to avoid performance issues
      const funcInfo = functionSymbols.get(funcName);
      if (funcInfo) {
        callGraphPromises.push(
          this.analyzer
            .buildCallGraph(funcName, funcInfo.file, {
              maxDepth: 2, // Limit depth for performance
              resolveImports: true,
              extractConditionals: false, // Skip for performance
              trackExceptions: false,
            })
            .catch(() => null), // Gracefully handle failures
        );
      }
    }

    const callGraphs = await Promise.all(callGraphPromises);

    // Count function calls from call graphs
    for (const graph of callGraphs) {
      if (!graph) continue;

      // Count calls recursively in the call graph
      const countCalls = (node: any): void => {
        if (!node.function?.name) return;

        const funcName = node.function.name;
        functionCalls.set(funcName, (functionCalls.get(funcName) ?? 0) + 1);

        // Recursively count child calls
        for (const childCall of node.calls ?? []) {
          countCalls(childCall);
        }
      };

      countCalls(graph.root);
    }

    // Phase 3: Count imports and infer usage
    for (const fileAnalysis of snapshot.files.values()) {
      for (const imp of fileAnalysis.imports ?? []) {
        for (const imported of imp.imports ?? []) {
          const name = imported.alias || imported.name;
          if (name) {
            imports.set(name, (imports.get(name) ?? 0) + 1);

            // If imported symbol is an exported function/class, count as usage
            const isFunction = functionSymbols.has(name);
            const isClass = classSymbols.has(name);

            if (exportedSymbols.has(name)) {
              if (isClass) {
                classInstantiations.set(
                  name,
                  (classInstantiations.get(name) ?? 0) + 1,
                );
              } else if (isFunction) {
                // Only count if not already counted from call graph
                if (!functionCalls.has(name)) {
                  functionCalls.set(name, (functionCalls.get(name) ?? 0) + 1);
                }
              }
            }
          }
        }
      }
    }

    // Phase 4: Extract class instantiations from AST
    // Look for "new ClassName()" patterns in function bodies
    for (const fileAnalysis of snapshot.files.values()) {
      for (const fn of fileAnalysis.functions ?? []) {
        // Check function dependencies for class instantiations
        for (const dep of fn.dependencies ?? []) {
          if (classSymbols.has(dep)) {
            classInstantiations.set(
              dep,
              (classInstantiations.get(dep) ?? 0) + 1,
            );
          }
        }
      }
    }

    // Phase 5: Count references from documentation sections
    const bumpRefs = (
      sections: DocumentationSection[],
      target: "fn" | "cls",
    ) => {
      for (const section of sections) {
        const refs =
          target === "fn"
            ? (section.referencedFunctions ?? [])
            : (section.referencedClasses ?? []);
        for (const ref of refs) {
          if (target === "fn") {
            functionCalls.set(ref, (functionCalls.get(ref) ?? 0) + 1);
          } else {
            classInstantiations.set(
              ref,
              (classInstantiations.get(ref) ?? 0) + 1,
            );
          }
        }
      }
    };

    for (const doc of snapshot.documentation.values()) {
      bumpRefs(doc.sections ?? [], "fn");
      bumpRefs(doc.sections ?? [], "cls");
    }

    return {
      filePath: snapshot.projectPath,
      functionCalls,
      classInstantiations,
      imports,
    };
  }

  /**
   * Synchronous collection using heuristics (fallback when analyzer unavailable)
   * This maintains backward compatibility with existing code
   */
  collectSync(snapshot: DriftSnapshot): UsageMetadata {
    const functionCalls = new Map<string, number>();
    const classInstantiations = new Map<string, number>();
    const imports = new Map<string, number>();
    const exportedSymbols = new Set<string>();
    const functionSymbols = new Set<string>();
    const classSymbols = new Set<string>();

    // Collect exported symbols and discovered functions/classes
    for (const file of snapshot.files.values()) {
      for (const symbol of file.exports ?? []) {
        exportedSymbols.add(symbol);
      }
      for (const fn of file.functions ?? []) {
        if (fn.name) functionSymbols.add(fn.name);
      }
      for (const cls of file.classes ?? []) {
        if (cls.name) classSymbols.add(cls.name);
      }
    }

    // Count imports from source files
    for (const file of snapshot.files.values()) {
      for (const imp of file.imports ?? []) {
        for (const imported of imp.imports ?? []) {
          const name = imported.alias || imported.name;
          if (name) {
            imports.set(name, (imports.get(name) ?? 0) + 1);

            const isFunction = functionSymbols.has(name);
            const isClass = classSymbols.has(name);
            if (exportedSymbols.has(name) || isFunction || isClass) {
              if (isClass) {
                classInstantiations.set(
                  name,
                  (classInstantiations.get(name) ?? 0) + 1,
                );
              } else {
                functionCalls.set(name, (functionCalls.get(name) ?? 0) + 1);
              }
            }
          }
        }
      }
    }

    // Count references from documentation sections
    const bumpRefs = (
      sections: DocumentationSection[],
      target: "fn" | "cls",
    ) => {
      for (const section of sections) {
        const refs =
          target === "fn"
            ? (section.referencedFunctions ?? [])
            : (section.referencedClasses ?? []);
        for (const ref of refs) {
          if (target === "fn") {
            functionCalls.set(ref, (functionCalls.get(ref) ?? 0) + 1);
          } else {
            classInstantiations.set(
              ref,
              (classInstantiations.get(ref) ?? 0) + 1,
            );
          }
        }
      }
    };

    for (const doc of snapshot.documentation.values()) {
      bumpRefs(doc.sections ?? [], "fn");
      bumpRefs(doc.sections ?? [], "cls");
    }

    return {
      filePath: snapshot.projectPath,
      functionCalls,
      classInstantiations,
      imports,
    };
  }
}
