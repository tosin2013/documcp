/**
 * Integration tests for Knowledge Graph with Documentation Example Entities
 * Tests graph operations with new node and edge types
 * Part of Issue: Extend knowledge graph with documentation example entities
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { MemoryManager } from "../../src/memory/manager.js";
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
} from "../../src/memory/knowledge-graph.js";

describe("KnowledgeGraph with Documentation Examples", () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let graph: KnowledgeGraph;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `kg-doc-examples-test-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    // Create memory manager for knowledge graph
    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    graph = new KnowledgeGraph(memoryManager);
    await graph.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Documentation Example Nodes", () => {
    test("should add documentation_example node to graph", () => {
      const exampleNode: Omit<GraphNode, "lastUpdated"> = {
        id: "example:tutorial-001",
        type: "documentation_example",
        label: "Tutorial Example - Getting Started",
        properties: {
          sourceFile: "/docs/tutorials/getting-started.md",
          language: "typescript",
          code: 'import { DocuMCP } from "documcp";\nconst client = new DocuMCP();',
          diataxisType: "tutorial",
          referencedSymbols: ["DocuMCP"],
          validationStatus: "valid",
        },
        weight: 1.0,
      };

      const addedNode = graph.addNode(exampleNode);
      expect(addedNode).toBeDefined();
      expect(addedNode.id).toBe("example:tutorial-001");
      expect(addedNode.type).toBe("documentation_example");
      expect(addedNode.properties.language).toBe("typescript");
    });

    test("should add example_validation node to graph", () => {
      const validationNode: Omit<GraphNode, "lastUpdated"> = {
        id: "validation:run-001",
        type: "example_validation",
        label: "AST Validation - Tutorial 001",
        properties: {
          exampleId: "example:tutorial-001",
          validatedAt: "2025-12-10T00:00:00Z",
          result: "pass",
          issues: [],
          confidenceScore: 0.95,
          validationMethod: "ast",
        },
        weight: 1.0,
      };

      const addedNode = graph.addNode(validationNode);
      expect(addedNode).toBeDefined();
      expect(addedNode.type).toBe("example_validation");
      expect(addedNode.properties.result).toBe("pass");
    });

    test("should add call_graph node to graph", () => {
      const callGraphNode: Omit<GraphNode, "lastUpdated"> = {
        id: "callgraph:example-001",
        type: "call_graph",
        label: "Call Graph for Tutorial Example",
        properties: {
          rootFunction: "DocuMCP.constructor",
          nodes: [
            {
              functionName: "DocuMCP.constructor",
              filePath: "/src/index.ts",
              lineNumber: 10,
            },
            {
              functionName: "initialize",
              filePath: "/src/index.ts",
              lineNumber: 20,
            },
          ],
          edges: [
            {
              from: "DocuMCP.constructor",
              to: "initialize",
              callType: "direct",
            },
          ],
          depth: 2,
          generatedAt: "2025-12-10T00:00:00Z",
          totalFunctions: 2,
        },
        weight: 1.0,
      };

      const addedNode = graph.addNode(callGraphNode);
      expect(addedNode).toBeDefined();
      expect(addedNode.type).toBe("call_graph");
      expect(addedNode.properties.depth).toBe(2);
    });
  });

  describe("Documentation Example Relationships", () => {
    test("should add has_example edge between document and example", () => {
      // Add document node
      const docNode = graph.addNode({
        id: "doc:tutorials/getting-started",
        type: "documentation_section",
        label: "Getting Started Tutorial",
        properties: {
          filePath: "/docs/tutorials/getting-started.md",
          sectionTitle: "Getting Started",
          contentHash: "abc123",
          category: "tutorial",
        },
        weight: 1.0,
      });

      // Add example node
      const exampleNode = graph.addNode({
        id: "example:tutorial-001",
        type: "documentation_example",
        label: "Tutorial Example",
        properties: {
          sourceFile: "/docs/tutorials/getting-started.md",
          language: "typescript",
          code: "const x = 1;",
          diataxisType: "tutorial",
        },
        weight: 1.0,
      });

      // Add has_example edge
      const edge: Omit<GraphEdge, "id" | "lastUpdated"> = {
        source: docNode.id,
        target: exampleNode.id,
        type: "has_example",
        weight: 1.0,
        confidence: 0.95,
        properties: {
          exampleCount: 1,
          primaryLanguage: "typescript",
          exampleType: "inline",
        },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.type).toBe("has_example");
      expect(addedEdge.source).toBe(docNode.id);
      expect(addedEdge.target).toBe(exampleNode.id);
    });

    test("should add validates edge between validation and example", () => {
      // Add example node
      const exampleNode = graph.addNode({
        id: "example:tutorial-001",
        type: "documentation_example",
        label: "Tutorial Example",
        properties: {
          sourceFile: "/docs/tutorials/getting-started.md",
          language: "typescript",
          code: "const x = 1;",
          diataxisType: "tutorial",
        },
        weight: 1.0,
      });

      // Add validation node
      const validationNode = graph.addNode({
        id: "validation:run-001",
        type: "example_validation",
        label: "Validation Run",
        properties: {
          exampleId: exampleNode.id,
          validatedAt: "2025-12-10T00:00:00Z",
          result: "pass",
          confidenceScore: 0.9,
          validationMethod: "ast",
        },
        weight: 1.0,
      });

      // Add validates edge
      const edge: Omit<GraphEdge, "id" | "lastUpdated"> = {
        source: validationNode.id,
        target: exampleNode.id,
        type: "validates",
        weight: 1.0,
        confidence: 0.9,
        properties: {
          validationRun: "2025-12-10T00:00:00Z",
          resultChanged: false,
        },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.type).toBe("validates");
    });

    test("should add has_call_graph edge between example and call graph", () => {
      // Add example node
      const exampleNode = graph.addNode({
        id: "example:tutorial-001",
        type: "documentation_example",
        label: "Tutorial Example",
        properties: {
          sourceFile: "/docs/tutorials/getting-started.md",
          language: "typescript",
          code: "DocuMCP.start();",
          diataxisType: "tutorial",
        },
        weight: 1.0,
      });

      // Add call graph node
      const callGraphNode = graph.addNode({
        id: "callgraph:example-001",
        type: "call_graph",
        label: "Call Graph",
        properties: {
          rootFunction: "start",
          depth: 3,
          totalFunctions: 5,
          generatedAt: "2025-12-10T00:00:00Z",
        },
        weight: 1.0,
      });

      // Add has_call_graph edge
      const edge: Omit<GraphEdge, "id" | "lastUpdated"> = {
        source: exampleNode.id,
        target: callGraphNode.id,
        type: "has_call_graph",
        weight: 1.0,
        confidence: 0.85,
        properties: {
          graphDepth: 3,
          totalNodes: 5,
          totalEdges: 4,
          complexity: "medium",
        },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.type).toBe("has_call_graph");
      expect(addedEdge.properties.complexity).toBe("medium");
    });

    test("should add references edge from example to code file", () => {
      // Add code file node
      const codeFileNode = graph.addNode({
        id: "file:/src/index.ts",
        type: "code_file",
        label: "index.ts",
        properties: {
          path: "/src/index.ts",
          language: "typescript",
          functions: ["DocuMCP"],
          lastModified: "2025-12-10T00:00:00Z",
          contentHash: "xyz789",
        },
        weight: 1.0,
      });

      // Add example node
      const exampleNode = graph.addNode({
        id: "example:reference-001",
        type: "documentation_example",
        label: "API Reference Example",
        properties: {
          sourceFile: "/docs/reference/api.md",
          language: "typescript",
          code: "import { DocuMCP } from './index';",
          diataxisType: "reference",
          referencedSymbols: ["DocuMCP"],
        },
        weight: 1.0,
      });

      // Add references edge
      const edge: Omit<GraphEdge, "id" | "lastUpdated"> = {
        source: exampleNode.id,
        target: codeFileNode.id,
        type: "references",
        weight: 1.0,
        confidence: 0.9,
        properties: {
          referenceType: "api-reference",
          isAccurate: true,
          lastVerified: "2025-12-10T00:00:00Z",
        },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.type).toBe("references");
      expect(addedEdge.properties.referenceType).toBe("api-reference");
    });

    test("should add depends_on edge between examples", () => {
      // Add prerequisite example
      const prerequisiteExample = graph.addNode({
        id: "example:basic-001",
        type: "documentation_example",
        label: "Basic Setup",
        properties: {
          sourceFile: "/docs/tutorials/basic.md",
          language: "typescript",
          code: "const config = { ... };",
          diataxisType: "tutorial",
        },
        weight: 1.0,
      });

      // Add dependent example
      const dependentExample = graph.addNode({
        id: "example:advanced-001",
        type: "documentation_example",
        label: "Advanced Usage",
        properties: {
          sourceFile: "/docs/tutorials/advanced.md",
          language: "typescript",
          code: "// Requires basic setup",
          diataxisType: "tutorial",
        },
        weight: 1.0,
      });

      // Add depends_on edge
      const edge: Omit<GraphEdge, "id" | "lastUpdated"> = {
        source: dependentExample.id,
        target: prerequisiteExample.id,
        type: "depends_on",
        weight: 1.0,
        confidence: 0.8,
        properties: {
          dependencyType: "usage",
          isRequired: true,
        },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.type).toBe("depends_on");
      expect(addedEdge.properties.isRequired).toBe(true);
    });
  });

  describe("Query Operations with New Entity Types", () => {
    beforeEach(() => {
      // Set up a small graph with documentation examples
      const docNode = graph.addNode({
        id: "doc:tutorial",
        type: "documentation_section",
        label: "Tutorial",
        properties: {},
        weight: 1.0,
      });

      const exampleNode = graph.addNode({
        id: "example:001",
        type: "documentation_example",
        label: "Example 1",
        properties: { language: "typescript", diataxisType: "tutorial" },
        weight: 1.0,
      });

      const validationNode = graph.addNode({
        id: "validation:001",
        type: "example_validation",
        label: "Validation 1",
        properties: { result: "pass" },
        weight: 1.0,
      });

      graph.addEdge({
        source: docNode.id,
        target: exampleNode.id,
        type: "has_example",
        weight: 1.0,
        confidence: 0.9,
        properties: {},
      });

      graph.addEdge({
        source: validationNode.id,
        target: exampleNode.id,
        type: "validates",
        weight: 1.0,
        confidence: 0.95,
        properties: { validationRun: "2025-12-10T00:00:00Z" },
      });
    });

    test("should query for documentation_example nodes", async () => {
      const result = await graph.findNodes({ type: "documentation_example" });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("documentation_example");
    });

    test("should query for example_validation nodes", async () => {
      const result = await graph.findNodes({ type: "example_validation" });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("example_validation");
    });

    test("should query for has_example edges", async () => {
      const result = await graph.findEdges({ type: "has_example" });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("has_example");
    });

    test("should query for validates edges", async () => {
      const result = await graph.findEdges({ type: "validates" });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("validates");
    });

    test("should find path from document to example", async () => {
      const paths = await graph.findPaths({
        startNode: "doc:tutorial",
        endNode: "example:001",
        maxDepth: 5,
      });

      expect(paths.length).toBeGreaterThan(0);
      const path = paths[0];
      expect(path.nodes.length).toBeGreaterThanOrEqual(2);
      expect(path.edges.length).toBeGreaterThanOrEqual(1);
      // Verify the path goes through has_example edge
      expect(path.edges[0].type).toBe("has_example");
    });

    test("should query nodes by properties", async () => {
      const result = await graph.findNodes({
        type: "documentation_example",
        properties: { language: "typescript" },
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].properties.language).toBe("typescript");
    });
  });

  describe("Statistics with New Entity Types", () => {
    beforeEach(() => {
      // Add diverse nodes
      graph.addNode({
        id: "example:001",
        type: "documentation_example",
        label: "Example 1",
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: "validation:001",
        type: "example_validation",
        label: "Validation 1",
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: "callgraph:001",
        type: "call_graph",
        label: "Call Graph 1",
        properties: {},
        weight: 1.0,
      });
    });

    test("should include new node types in statistics", async () => {
      const stats = await graph.getStatistics();

      expect(stats.nodesByType["documentation_example"]).toBeDefined();
      expect(stats.nodesByType["example_validation"]).toBeDefined();
      expect(stats.nodesByType["call_graph"]).toBeDefined();
    });

    test("should count new node types correctly", async () => {
      const stats = await graph.getStatistics();

      expect(stats.nodesByType["documentation_example"]).toBe(1);
      expect(stats.nodesByType["example_validation"]).toBe(1);
      expect(stats.nodesByType["call_graph"]).toBe(1);
    });
  });

  describe("Schema Version Compatibility", () => {
    test("should return correct schema version", () => {
      const version = graph.getSchemaVersion();
      expect(version).toBe("1.1.0");
    });

    test("should validate new node types", () => {
      const exampleNode: GraphNode = {
        id: "example:test",
        type: "documentation_example",
        label: "Test Example",
        properties: {
          sourceFile: "/docs/test.md",
          language: "typescript",
          code: "const x = 1;",
          diataxisType: "tutorial",
          exampleId: "test-001",
          referencedSymbols: [],
          validationStatus: "unknown",
        },
        weight: 1.0,
        lastUpdated: "2025-12-10T00:00:00Z",
      };

      const isValid = graph.validateNode(exampleNode);
      expect(isValid).toBe(true);
    });

    test("should validate new edge types", () => {
      const hasExampleEdge: GraphEdge = {
        id: "edge-test",
        source: "doc:test",
        target: "example:test",
        type: "has_example",
        weight: 1.0,
        confidence: 0.9,
        properties: {
          exampleCount: 1,
          exampleType: "inline",
        },
        lastUpdated: "2025-12-10T00:00:00Z",
      };

      const isValid = graph.validateEdge(hasExampleEdge);
      expect(isValid).toBe(true);
    });
  });
});
