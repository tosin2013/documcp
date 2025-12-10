/**
 * Unit tests for Documentation Example Knowledge Graph Entities
 * Tests new entity types and relationships for documentation examples
 * Part of Issue: Extend knowledge graph with documentation example entities
 */

import {
  DocumentationExampleEntitySchema,
  ExampleValidationEntitySchema,
  CallGraphEntitySchema,
  CallGraphNodeSchema,
  CallGraphEdgeSchema,
  HasExampleSchema,
  ValidatesSchema,
  HasCallGraphSchema,
  validateEntity,
  validateRelationship,
  isDocumentationExampleEntity,
  isExampleValidationEntity,
  isCallGraphEntity,
  SCHEMA_VERSION,
  SCHEMA_METADATA,
} from "../../src/memory/schemas.js";

describe("Documentation Example Entities", () => {
  describe("DocumentationExampleEntitySchema", () => {
    test("should validate a valid documentation example entity", () => {
      const validExample = {
        type: "documentation_example",
        sourceFile: "/docs/tutorial.md",
        language: "typescript",
        code: "const result = add(1, 2);",
        diataxisType: "tutorial",
        referencedSymbols: ["add"],
        lastValidated: "2025-12-10T00:00:00Z",
        validationStatus: "valid",
        exampleId: "example-001",
        contentHash: "abc123",
        lineStart: 10,
        lineEnd: 15,
      };

      const result = validateEntity(validExample);
      expect(result).toBeDefined();
      expect(result.type).toBe("documentation_example");
    });

    test("should require sourceFile field", () => {
      const invalidExample = {
        type: "documentation_example",
        language: "typescript",
        code: "const x = 1;",
        diataxisType: "tutorial",
        exampleId: "example-002",
      };

      expect(() => validateEntity(invalidExample)).toThrow();
    });

    test("should validate diataxisType enum", () => {
      const validTypes = ["tutorial", "how-to", "reference", "explanation"];

      validTypes.forEach((diataxisType) => {
        const example = {
          type: "documentation_example",
          sourceFile: "/docs/test.md",
          language: "typescript",
          code: "const x = 1;",
          diataxisType,
          exampleId: `example-${diataxisType}`,
        };

        expect(() => validateEntity(example)).not.toThrow();
      });
    });

    test("should default validationStatus to unknown", () => {
      const example = {
        sourceFile: "/docs/test.md",
        language: "typescript",
        code: "const x = 1;",
        diataxisType: "tutorial" as const,
        exampleId: "example-003",
      };

      const parsed = DocumentationExampleEntitySchema.parse(example);
      expect(parsed.validationStatus).toBe("unknown");
    });

    test("should default referencedSymbols to empty array", () => {
      const example = {
        sourceFile: "/docs/test.md",
        language: "typescript",
        code: "const x = 1;",
        diataxisType: "tutorial" as const,
        exampleId: "example-004",
      };

      const parsed = DocumentationExampleEntitySchema.parse(example);
      expect(parsed.referencedSymbols).toEqual([]);
    });

    test("should validate with referenced symbols", () => {
      const example = {
        type: "documentation_example",
        sourceFile: "/docs/api.md",
        language: "typescript",
        code: "calculator.add(1, 2);",
        diataxisType: "reference",
        referencedSymbols: ["calculator", "add"],
        exampleId: "example-005",
      };

      const result = validateEntity(example);
      if (isDocumentationExampleEntity(result)) {
        expect(result.referencedSymbols).toEqual(["calculator", "add"]);
      } else {
        fail("Result should be a documentation example entity");
      }
    });
  });

  describe("ExampleValidationEntitySchema", () => {
    test("should validate a valid example validation entity", () => {
      const validation = {
        type: "example_validation",
        exampleId: "example-001",
        validatedAt: "2025-12-10T00:00:00Z",
        result: "pass",
        issues: [],
        confidenceScore: 0.95,
        validationMethod: "ast",
        suggestions: ["Consider adding error handling"],
      };

      const result = validateEntity(validation);
      expect(result).toBeDefined();
      expect(result.type).toBe("example_validation");
    });

    test("should require all mandatory fields", () => {
      const invalidValidation = {
        type: "example_validation",
        exampleId: "example-001",
        // Missing validatedAt, result, confidenceScore, validationMethod
      };

      expect(() => validateEntity(invalidValidation)).toThrow();
    });

    test("should validate result enum", () => {
      const validResults = ["pass", "fail", "warning"];

      validResults.forEach((result) => {
        const validation = {
          type: "example_validation",
          exampleId: "example-001",
          validatedAt: "2025-12-10T00:00:00Z",
          result,
          issues: [],
          confidenceScore: 0.8,
          validationMethod: "ast" as const,
        };

        expect(() => validateEntity(validation)).not.toThrow();
      });
    });

    test("should validate validationMethod enum", () => {
      const validMethods = ["ast", "llm", "execution"];

      validMethods.forEach((validationMethod) => {
        const validation = {
          type: "example_validation",
          exampleId: "example-001",
          validatedAt: "2025-12-10T00:00:00Z",
          result: "pass" as const,
          issues: [],
          confidenceScore: 0.9,
          validationMethod,
        };

        expect(() => validateEntity(validation)).not.toThrow();
      });
    });

    test("should enforce confidenceScore range", () => {
      const invalidValidation = {
        type: "example_validation",
        exampleId: "example-001",
        validatedAt: "2025-12-10T00:00:00Z",
        result: "pass",
        issues: [],
        confidenceScore: 1.5, // Invalid: > 1
        validationMethod: "ast",
      };

      expect(() => validateEntity(invalidValidation)).toThrow();
    });

    test("should default issues and suggestions to empty arrays", () => {
      const validation = {
        exampleId: "example-001",
        validatedAt: "2025-12-10T00:00:00Z",
        result: "pass" as const,
        confidenceScore: 0.9,
        validationMethod: "ast" as const,
      };

      const parsed = ExampleValidationEntitySchema.parse(validation);
      expect(parsed.issues).toEqual([]);
      expect(parsed.suggestions).toEqual([]);
    });
  });

  describe("CallGraphEntitySchema", () => {
    test("should validate a valid call graph entity", () => {
      const callGraph = {
        type: "call_graph",
        rootFunction: "main",
        nodes: [
          { functionName: "main", filePath: "/src/main.ts", lineNumber: 10 },
          { functionName: "helper", filePath: "/src/utils.ts", lineNumber: 5 },
        ],
        edges: [
          { from: "main", to: "helper", callType: "direct", weight: 1.0 },
        ],
        depth: 2,
        generatedAt: "2025-12-10T00:00:00Z",
        analysisMethod: "static",
        totalFunctions: 2,
      };

      const result = validateEntity(callGraph);
      expect(result).toBeDefined();
      expect(result.type).toBe("call_graph");
    });

    test("should validate CallGraphNodeSchema", () => {
      const node = {
        functionName: "calculateSum",
        filePath: "/src/math.ts",
        lineNumber: 42,
        callCount: 5,
      };

      const parsed = CallGraphNodeSchema.parse(node);
      expect(parsed.functionName).toBe("calculateSum");
      expect(parsed.callCount).toBe(5);
    });

    test("should validate CallGraphEdgeSchema", () => {
      const edge = {
        from: "main",
        to: "helper",
        callType: "async",
        weight: 0.8,
      };

      const parsed = CallGraphEdgeSchema.parse(edge);
      expect(parsed.callType).toBe("async");
      expect(parsed.weight).toBe(0.8);
    });

    test("should default callCount to 1", () => {
      const node = {
        functionName: "test",
        filePath: "/src/test.ts",
      };

      const parsed = CallGraphNodeSchema.parse(node);
      expect(parsed.callCount).toBe(1);
    });

    test("should default callType to direct", () => {
      const edge = {
        from: "main",
        to: "helper",
      };

      const parsed = CallGraphEdgeSchema.parse(edge);
      expect(parsed.callType).toBe("direct");
      expect(parsed.weight).toBe(1.0);
    });

    test("should default nodes and edges to empty arrays", () => {
      const callGraph = {
        rootFunction: "main",
        depth: 0,
        generatedAt: "2025-12-10T00:00:00Z",
      };

      const parsed = CallGraphEntitySchema.parse(callGraph);
      expect(parsed.nodes).toEqual([]);
      expect(parsed.edges).toEqual([]);
      expect(parsed.analysisMethod).toBe("static");
      expect(parsed.totalFunctions).toBe(0);
    });
  });

  describe("Relationship Schemas", () => {
    describe("HasExampleSchema", () => {
      test("should validate has_example relationship", () => {
        const relationship = {
          type: "has_example",
          weight: 1.0,
          confidence: 0.95,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
          exampleCount: 3,
          primaryLanguage: "typescript",
          exampleType: "inline",
          metadata: {},
        };

        const result = validateRelationship(relationship);
        expect(result.type).toBe("has_example");
        if (result.type === "has_example") {
          expect(result.exampleCount).toBe(3);
        }
      });

      test("should default exampleCount to 1", () => {
        const relationship = {
          type: "has_example",
          weight: 1.0,
          confidence: 1.0,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
        };

        const result = HasExampleSchema.parse(relationship);
        expect(result.exampleCount).toBe(1);
        expect(result.exampleType).toBe("inline");
      });

      test("should validate exampleType enum", () => {
        const validTypes = ["inline", "reference", "embedded", "external"];

        validTypes.forEach((exampleType) => {
          const relationship = {
            type: "has_example" as const,
            weight: 1.0,
            confidence: 1.0,
            createdAt: "2025-12-10T00:00:00Z",
            lastUpdated: "2025-12-10T00:00:00Z",
            exampleType,
          };

          expect(() => validateRelationship(relationship)).not.toThrow();
        });
      });
    });

    describe("ValidatesSchema", () => {
      test("should validate validates relationship", () => {
        const relationship = {
          type: "validates",
          weight: 1.0,
          confidence: 0.9,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
          validationRun: "2025-12-10T00:00:00Z",
          previousResult: "pass",
          resultChanged: false,
          metadata: {},
        };

        const result = validateRelationship(relationship);
        expect(result.type).toBe("validates");
        if (result.type === "validates") {
          expect(result.validationRun).toBeDefined();
        }
      });

      test("should default resultChanged to false", () => {
        const relationship = {
          type: "validates",
          weight: 1.0,
          confidence: 1.0,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
          validationRun: "2025-12-10T00:00:00Z",
        };

        const result = ValidatesSchema.parse(relationship);
        expect(result.resultChanged).toBe(false);
      });
    });

    describe("HasCallGraphSchema", () => {
      test("should validate has_call_graph relationship", () => {
        const relationship = {
          type: "has_call_graph",
          weight: 1.0,
          confidence: 0.85,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
          graphDepth: 5,
          totalNodes: 10,
          totalEdges: 15,
          complexity: "medium",
          metadata: {},
        };

        const result = validateRelationship(relationship);
        expect(result.type).toBe("has_call_graph");
        if (result.type === "has_call_graph") {
          expect(result.graphDepth).toBe(5);
          expect(result.totalNodes).toBe(10);
        }
      });

      test("should require graphDepth, totalNodes, totalEdges", () => {
        const relationship = {
          type: "has_call_graph",
          weight: 1.0,
          confidence: 1.0,
          createdAt: "2025-12-10T00:00:00Z",
          lastUpdated: "2025-12-10T00:00:00Z",
          // Missing required fields
        };

        expect(() => validateRelationship(relationship)).toThrow();
      });

      test("should validate complexity enum", () => {
        const validComplexities = ["low", "medium", "high"];

        validComplexities.forEach((complexity) => {
          const relationship = {
            type: "has_call_graph" as const,
            weight: 1.0,
            confidence: 1.0,
            createdAt: "2025-12-10T00:00:00Z",
            lastUpdated: "2025-12-10T00:00:00Z",
            graphDepth: 3,
            totalNodes: 5,
            totalEdges: 4,
            complexity,
          };

          expect(() => validateRelationship(relationship)).not.toThrow();
        });
      });
    });
  });

  describe("Type Guards", () => {
    test("isDocumentationExampleEntity should identify documentation examples", () => {
      const entity = {
        type: "documentation_example" as const,
        sourceFile: "/docs/test.md",
        language: "typescript",
        code: "const x = 1;",
        diataxisType: "tutorial" as const,
        exampleId: "example-001",
        referencedSymbols: [],
        validationStatus: "unknown" as const,
      };

      expect(isDocumentationExampleEntity(entity)).toBe(true);
    });

    test("isExampleValidationEntity should identify validation entities", () => {
      const entity = {
        type: "example_validation" as const,
        exampleId: "example-001",
        validatedAt: "2025-12-10T00:00:00Z",
        result: "pass" as const,
        issues: [],
        confidenceScore: 0.9,
        validationMethod: "ast" as const,
        suggestions: [],
      };

      expect(isExampleValidationEntity(entity)).toBe(true);
    });

    test("isCallGraphEntity should identify call graph entities", () => {
      const entity = {
        type: "call_graph" as const,
        rootFunction: "main",
        nodes: [],
        edges: [],
        depth: 0,
        generatedAt: "2025-12-10T00:00:00Z",
        analysisMethod: "static" as const,
        totalFunctions: 0,
      };

      expect(isCallGraphEntity(entity)).toBe(true);
    });

    test("type guards should return false for wrong entity types", () => {
      const projectEntity = {
        type: "project" as const,
        name: "Test Project",
        path: "/test",
        lastAnalyzed: "2025-12-10T00:00:00Z",
        technologies: [],
        size: "medium" as const,
        analysisCount: 0,
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        totalFiles: 0,
      };

      expect(isDocumentationExampleEntity(projectEntity)).toBe(false);
      expect(isExampleValidationEntity(projectEntity)).toBe(false);
      expect(isCallGraphEntity(projectEntity)).toBe(false);
    });
  });

  describe("Schema Metadata", () => {
    test("should include new entity types in metadata", () => {
      expect(SCHEMA_METADATA.entityTypes).toContain("documentation_example");
      expect(SCHEMA_METADATA.entityTypes).toContain("example_validation");
      expect(SCHEMA_METADATA.entityTypes).toContain("call_graph");
    });

    test("should include new relationship types in metadata", () => {
      expect(SCHEMA_METADATA.relationshipTypes).toContain("has_example");
      expect(SCHEMA_METADATA.relationshipTypes).toContain("validates");
      expect(SCHEMA_METADATA.relationshipTypes).toContain("has_call_graph");
    });

    test("should have updated schema version", () => {
      expect(SCHEMA_VERSION).toBe("1.1.0");
      expect(SCHEMA_METADATA.version).toBe("1.1.0");
    });

    test("should have updated lastUpdated date", () => {
      expect(SCHEMA_METADATA.lastUpdated).toBe("2025-12-10");
    });
  });
});
