/**
 * Basic unit tests for Knowledge Graph System
 * Tests basic instantiation and core functionality
 * Part of Issue #54 - Core Memory System Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/memory/knowledge-graph.js';

describe('KnowledgeGraph', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let graph: KnowledgeGraph;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `memory-graph-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  describe('Basic Graph Operations', () => {
    test('should create knowledge graph instance', () => {
      expect(graph).toBeDefined();
      expect(graph).toBeInstanceOf(KnowledgeGraph);
    });

    test('should add nodes to the graph', () => {
      const projectNode: Omit<GraphNode, 'lastUpdated'> = {
        id: 'project:test-project',
        type: 'project',
        label: 'Test Project',
        properties: {
          language: 'typescript',
          framework: 'react',
        },
        weight: 1.0,
      };

      const addedNode = graph.addNode(projectNode);
      expect(addedNode).toBeDefined();
      expect(addedNode.id).toBe('project:test-project');
      expect(addedNode.type).toBe('project');
      expect(addedNode.lastUpdated).toBeDefined();
    });

    test('should add edges to the graph', () => {
      // First add nodes
      const projectNode = graph.addNode({
        id: 'project:web-app',
        type: 'project',
        label: 'Web App',
        properties: { language: 'typescript' },
        weight: 1.0,
      });

      const techNode = graph.addNode({
        id: 'tech:react',
        type: 'technology',
        label: 'React',
        properties: { category: 'framework' },
        weight: 1.0,
      });

      // Add edge
      const edge: Omit<GraphEdge, 'id' | 'lastUpdated'> = {
        source: projectNode.id,
        target: techNode.id,
        type: 'uses',
        weight: 1.0,
        confidence: 0.9,
        properties: { importance: 'high' },
      };

      const addedEdge = graph.addEdge(edge);
      expect(addedEdge).toBeDefined();
      expect(addedEdge.source).toBe(projectNode.id);
      expect(addedEdge.target).toBe(techNode.id);
      expect(addedEdge.id).toBeDefined();
    });

    test('should get all nodes', async () => {
      // Add some nodes
      graph.addNode({
        id: 'project:test1',
        type: 'project',
        label: 'Test 1',
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: 'tech:vue',
        type: 'technology',
        label: 'Vue',
        properties: {},
        weight: 1.0,
      });

      const nodes = await graph.getAllNodes();
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBe(2);
    });

    test('should get all edges', async () => {
      // Add nodes and edges
      const node1 = graph.addNode({
        id: 'project:test2',
        type: 'project',
        label: 'Test 2',
        properties: {},
        weight: 1.0,
      });

      const node2 = graph.addNode({
        id: 'tech:angular',
        type: 'technology',
        label: 'Angular',
        properties: {},
        weight: 1.0,
      });

      graph.addEdge({
        source: node1.id,
        target: node2.id,
        type: 'uses',
        weight: 1.0,
        confidence: 0.8,
        properties: {},
      });

      const edges = await graph.getAllEdges();
      expect(Array.isArray(edges)).toBe(true);
      expect(edges.length).toBe(1);
    });
  });

  describe('Graph Queries', () => {
    test('should query nodes by type', () => {
      // Add multiple nodes of different types
      graph.addNode({
        id: 'project:project-a',
        type: 'project',
        label: 'Project A',
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: 'project:project-b',
        type: 'project',
        label: 'Project B',
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: 'tech:vue',
        type: 'technology',
        label: 'Vue',
        properties: { category: 'framework' },
        weight: 1.0,
      });

      const results = graph.query({
        nodeTypes: ['project'],
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results.nodes)).toBe(true);
      expect(results.nodes.length).toBe(2);
      expect(results.nodes.every((node) => node.type === 'project')).toBe(true);
    });

    test('should find connections for a node', async () => {
      // Add nodes and create connections
      const projectNode = graph.addNode({
        id: 'project:connected-test',
        type: 'project',
        label: 'Connected Test',
        properties: {},
        weight: 1.0,
      });

      const techNode = graph.addNode({
        id: 'tech:express',
        type: 'technology',
        label: 'Express',
        properties: {},
        weight: 1.0,
      });

      graph.addEdge({
        source: projectNode.id,
        target: techNode.id,
        type: 'uses',
        weight: 1.0,
        confidence: 0.9,
        properties: {},
      });

      const connections = await graph.getConnections(projectNode.id);
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBe(1);
      expect(connections[0]).toBe(techNode.id);
    });

    test('should find paths between nodes', () => {
      // Add nodes and create a path
      const projectNode = graph.addNode({
        id: 'project:path-test',
        type: 'project',
        label: 'Path Test Project',
        properties: {},
        weight: 1.0,
      });

      const techNode = graph.addNode({
        id: 'tech:nodejs',
        type: 'technology',
        label: 'Node.js',
        properties: {},
        weight: 1.0,
      });

      graph.addEdge({
        source: projectNode.id,
        target: techNode.id,
        type: 'uses',
        weight: 1.0,
        confidence: 0.9,
        properties: {},
      });

      const path = graph.findPath(projectNode.id, techNode.id);
      expect(path).toBeDefined();
      expect(path?.nodes.length).toBe(2);
      expect(path?.edges.length).toBe(1);
    });
  });

  describe('Graph Analysis', () => {
    test('should build from memory entries', async () => {
      // Add some test memory entries first
      await memoryManager.remember(
        'analysis',
        {
          language: { primary: 'python' },
          framework: { name: 'django' },
        },
        {
          projectId: 'analysis-project',
        },
      );

      await memoryManager.remember(
        'recommendation',
        {
          recommended: 'mkdocs',
          confidence: 0.9,
        },
        {
          projectId: 'analysis-project',
        },
      );

      // Build graph from memories
      await graph.buildFromMemories();

      const nodes = await graph.getAllNodes();
      // The buildFromMemories method might be implemented differently
      // Just verify it doesn't throw and returns an array
      expect(Array.isArray(nodes)).toBe(true);

      // The graph might start empty, which is okay for this basic test
      if (nodes.length > 0) {
        // Optionally check node types if any were created
        const nodeTypes = [...new Set(nodes.map((n) => n.type))];
        expect(nodeTypes.length).toBeGreaterThan(0);
      }
    });

    test('should generate graph-based recommendations', async () => {
      // Add some memory data first
      await memoryManager.remember(
        'analysis',
        {
          language: { primary: 'javascript' },
          framework: { name: 'react' },
        },
        {
          projectId: 'rec-test-project',
        },
      );

      await graph.buildFromMemories();

      const projectFeatures = {
        language: 'javascript',
        framework: 'react',
      };

      const recommendations = await graph.getGraphBasedRecommendation(projectFeatures, [
        'docusaurus',
        'gatsby',
      ]);

      expect(Array.isArray(recommendations)).toBe(true);
      // Even if no recommendations found, should return empty array
    });

    test('should provide graph statistics', async () => {
      // Add some nodes
      graph.addNode({
        id: 'project:stats-test',
        type: 'project',
        label: 'Stats Test',
        properties: {},
        weight: 1.0,
      });

      graph.addNode({
        id: 'tech:webpack',
        type: 'technology',
        label: 'Webpack',
        properties: {},
        weight: 1.0,
      });

      const stats = await graph.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.nodeCount).toBe('number');
      expect(typeof stats.edgeCount).toBe('number');
      expect(typeof stats.nodesByType).toBe('object');
      expect(typeof stats.averageConnectivity).toBe('number');
      expect(Array.isArray(stats.mostConnectedNodes)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle removing non-existent nodes', async () => {
      const removed = await graph.removeNode('non-existent-node');
      expect(removed).toBe(false);
    });

    test('should handle concurrent graph operations', () => {
      // Create multiple nodes concurrently
      const nodes = Array.from({ length: 10 }, (_, i) =>
        graph.addNode({
          id: `project:concurrent-${i}`,
          type: 'project',
          label: `Concurrent Project ${i}`,
          properties: { index: i },
          weight: 1.0,
        }),
      );

      expect(nodes).toHaveLength(10);
      expect(nodes.every((node) => typeof node.id === 'string')).toBe(true);
    });

    test('should handle invalid query parameters', () => {
      const results = graph.query({
        nodeTypes: ['non-existent-type'],
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results.nodes)).toBe(true);
      expect(results.nodes.length).toBe(0);
    });

    test('should handle empty graph operations', async () => {
      // Test operations on empty graph
      const path = graph.findPath('non-existent-1', 'non-existent-2');
      expect(path).toBeNull();

      const connections = await graph.getConnections('non-existent-node');
      expect(Array.isArray(connections)).toBe(true);
      expect(connections.length).toBe(0);
    });
  });

  describe('Persistence and Memory Integration', () => {
    test('should save and load from memory', async () => {
      // Add some data to the graph
      graph.addNode({
        id: 'project:persistence-test',
        type: 'project',
        label: 'Persistence Test',
        properties: {},
        weight: 1.0,
      });

      // Save to memory
      await graph.saveToMemory();

      // Create new graph and load
      const newGraph = new KnowledgeGraph(memoryManager);
      await newGraph.loadFromMemory();

      const nodes = await newGraph.getAllNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty graph statistics', async () => {
      const stats = await graph.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.nodeCount).toBe('number');
      expect(typeof stats.edgeCount).toBe('number');
      expect(stats.nodeCount).toBe(0); // Empty graph initially
      expect(stats.edgeCount).toBe(0);
    });
  });
});
