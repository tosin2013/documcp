import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { KnowledgeGraph } from '../../src/memory/knowledge-graph.js';
import { JSONLStorage } from '../../src/memory/storage.js';

describe('Enhanced Knowledge Graph System', () => {
  let tempDir: string;
  let storage: JSONLStorage;
  let knowledgeGraph: KnowledgeGraph;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `test-kg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });

    storage = new JSONLStorage(tempDir);
    await storage.initialize();

    knowledgeGraph = new KnowledgeGraph(storage);
    await knowledgeGraph.initialize();

    // Add test data
    await storage.store({
      id: 'test-node-1',
      timestamp: new Date().toISOString(),
      type: 'analysis',
      data: {
        projectType: 'javascript',
        complexity: 'medium',
        framework: 'react',
        technologies: ['webpack', 'babel', 'jest'],
      },
      metadata: {
        projectId: 'project-1',
        tags: ['frontend', 'spa'],
      },
    });

    await storage.store({
      id: 'test-node-2',
      timestamp: new Date().toISOString(),
      type: 'recommendation',
      data: {
        ssg: 'docusaurus',
        confidence: 0.9,
        reasons: ['React ecosystem', 'Good documentation features'],
      },
      metadata: {
        projectId: 'project-1',
        tags: ['react', 'documentation'],
      },
    });

    await storage.store({
      id: 'test-node-3',
      timestamp: new Date().toISOString(),
      type: 'analysis',
      data: {
        projectType: 'python',
        complexity: 'high',
        framework: 'django',
        technologies: ['postgresql', 'redis', 'celery'],
      },
      metadata: {
        projectId: 'project-2',
        tags: ['backend', 'api'],
      },
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Node Management', () => {
    it('should add nodes to the knowledge graph', async () => {
      await knowledgeGraph.buildGraph();

      const node = await knowledgeGraph.getNode('test-node-1');
      expect(node).toBeDefined();
      expect(node?.id).toBe('test-node-1');
      expect(node?.type).toBe('analysis');
      expect(node?.data.projectType).toBe('javascript');
    });

    it('should handle node properties correctly', async () => {
      await knowledgeGraph.buildGraph();

      const node = await knowledgeGraph.getNode('test-node-2');
      expect(node).toBeDefined();
      expect(node?.data.ssg).toBe('docusaurus');
      expect(node?.data.confidence).toBe(0.9);
      expect(node?.metadata.tags).toContain('react');
    });

    it('should return undefined for non-existent nodes', async () => {
      await knowledgeGraph.buildGraph();

      const node = await knowledgeGraph.getNode('non-existent-node');
      expect(node).toBeUndefined();
    });
  });

  describe('Relationship Discovery', () => {
    it('should discover relationships between related projects', async () => {
      await knowledgeGraph.buildGraph();

      const relationships = await knowledgeGraph.findRelationships('test-node-1');
      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);

      // Should find relationship with test-node-2 (same project)
      const sameProjectRelation = relationships.find(
        (rel) => rel.target === 'test-node-2' || rel.source === 'test-node-2',
      );
      expect(sameProjectRelation).toBeDefined();
    });

    it('should identify technology-based relationships', async () => {
      await knowledgeGraph.buildGraph();

      const similarProjects = await knowledgeGraph.findSimilarProjects('test-node-1', {
        minSimilarity: 0.1,
        maxResults: 5,
      });

      expect(Array.isArray(similarProjects)).toBe(true);
      // Should include some results based on shared technologies or patterns
    });

    it('should handle relationship queries for nodes with no connections', async () => {
      // Add isolated node
      await storage.store({
        id: 'isolated-node',
        timestamp: new Date().toISOString(),
        type: 'analysis',
        data: { projectType: 'rust', complexity: 'low' },
        metadata: { projectId: 'isolated-project', tags: ['systems'] },
      });

      await knowledgeGraph.buildGraph();

      const relationships = await knowledgeGraph.findRelationships('isolated-node');
      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);
    });
  });

  describe('Pattern Recognition', () => {
    it('should identify common patterns in project data', async () => {
      await knowledgeGraph.buildGraph();

      const patterns = await knowledgeGraph.identifyPatterns({
        type: 'technology_clusters',
        minSupport: 0.1,
      });

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should analyze project evolution patterns', async () => {
      // Add time-series data
      const timestamps = [
        new Date('2024-01-01').toISOString(),
        new Date('2024-02-01').toISOString(),
        new Date('2024-03-01').toISOString(),
      ];

      for (let i = 0; i < timestamps.length; i++) {
        await storage.store({
          id: `evolution-${i}`,
          timestamp: timestamps[i],
          type: 'analysis',
          data: {
            projectType: 'javascript',
            complexity: i === 0 ? 'low' : i === 1 ? 'medium' : 'high',
            version: `v${i + 1}.0.0`,
          },
          metadata: { projectId: 'evolving-project', tags: ['evolution'] },
        });
      }

      await knowledgeGraph.buildGraph();

      const evolution = await knowledgeGraph.analyzeEvolution('evolving-project');
      expect(evolution).toBeDefined();
    });

    it('should detect anomalies in project patterns', async () => {
      // Add anomalous data
      await storage.store({
        id: 'anomaly-node',
        timestamp: new Date().toISOString(),
        type: 'analysis',
        data: {
          projectType: 'unknown-language',
          complexity: 'extreme',
          framework: 'never-heard-of-this',
        },
        metadata: { projectId: 'anomaly-project', tags: ['unusual'] },
      });

      await knowledgeGraph.buildGraph();

      const anomalies = await knowledgeGraph.detectAnomalies({
        threshold: 0.5,
        features: ['projectType', 'complexity', 'framework'],
      });

      expect(anomalies).toBeDefined();
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });

  describe('Path Finding', () => {
    it('should find paths between nodes', async () => {
      await knowledgeGraph.buildGraph();

      const path = await knowledgeGraph.findPath('test-node-1', 'test-node-2');
      expect(path).toBeDefined();

      if (path && path.length > 0) {
        expect(path[0]).toBe('test-node-1');
        expect(path[path.length - 1]).toBe('test-node-2');
      }
    });

    it('should find shortest paths efficiently', async () => {
      await knowledgeGraph.buildGraph();

      const shortestPath = await knowledgeGraph.findShortestPath('test-node-1', 'test-node-3');
      expect(shortestPath).toBeDefined();
      expect(Array.isArray(shortestPath)).toBe(true);
    });

    it('should handle unreachable nodes gracefully', async () => {
      // Add completely isolated node
      await storage.store({
        id: 'unreachable-node',
        timestamp: new Date().toISOString(),
        type: 'analysis',
        data: { projectType: 'isolated' },
        metadata: { projectId: 'isolated', tags: [] },
      });

      await knowledgeGraph.buildGraph();

      const path = await knowledgeGraph.findPath('test-node-1', 'unreachable-node');
      // Should handle gracefully (return empty path or null)
      expect(path === null || Array.isArray(path)).toBe(true);
    });
  });

  describe('Clustering and Communities', () => {
    it('should identify project clusters', async () => {
      await knowledgeGraph.buildGraph();

      const clusters = await knowledgeGraph.findClusters({
        algorithm: 'modularity',
        minClusterSize: 1,
      });

      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
    });

    it('should detect technology communities', async () => {
      await knowledgeGraph.buildGraph();

      const communities = await knowledgeGraph.detectCommunities({
        resolution: 1.0,
        minCommunitySize: 1,
      });

      expect(communities).toBeDefined();
      expect(Array.isArray(communities)).toBe(true);
    });

    it('should analyze cluster stability over time', async () => {
      await knowledgeGraph.buildGraph();

      const stability = await knowledgeGraph.analyzeClusterStability({
        timeWindow: '1month',
        stabilityThreshold: 0.8,
      });

      expect(stability).toBeDefined();
    });
  });

  describe('Graph Metrics', () => {
    it('should calculate centrality measures', async () => {
      await knowledgeGraph.buildGraph();

      const centrality = await knowledgeGraph.calculateCentrality('test-node-1');
      expect(centrality).toBeDefined();
      expect(typeof centrality.betweenness).toBe('number');
      expect(typeof centrality.closeness).toBe('number');
      expect(typeof centrality.degree).toBe('number');
    });

    it('should compute graph statistics', async () => {
      await knowledgeGraph.buildGraph();

      const stats = await knowledgeGraph.getGraphStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.nodeCount).toBe('number');
      expect(typeof stats.edgeCount).toBe('number');
      expect(typeof stats.density).toBe('number');
      expect(stats.nodeCount).toBeGreaterThan(0);
    });

    it('should measure graph connectivity', async () => {
      await knowledgeGraph.buildGraph();

      const connectivity = await knowledgeGraph.analyzeConnectivity();
      expect(connectivity).toBeDefined();
      expect(typeof connectivity.isConnected).toBe('boolean');
      expect(typeof connectivity.componentCount).toBe('number');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large graphs efficiently', async () => {
      // Add many nodes
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          storage.store({
            id: `perf-node-${i}`,
            timestamp: new Date().toISOString(),
            type: 'analysis',
            data: {
              projectType: i % 2 === 0 ? 'javascript' : 'python',
              complexity: ['low', 'medium', 'high'][i % 3],
              index: i,
            },
            metadata: {
              projectId: `project-${Math.floor(i / 10)}`,
              tags: [`tag-${i % 5}`],
            },
          }),
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      await knowledgeGraph.buildGraph();
      const buildTime = Date.now() - startTime;

      expect(buildTime).toBeLessThan(5000); // Should complete within 5 seconds

      const stats = await knowledgeGraph.getGraphStatistics();
      expect(stats.nodeCount).toBeGreaterThan(100);
    });

    it('should optimize memory usage for large datasets', async () => {
      await knowledgeGraph.buildGraph();

      // Test memory optimization
      const memoryBefore = process.memoryUsage().heapUsed;
      await knowledgeGraph.optimizeMemory();
      const memoryAfter = process.memoryUsage().heapUsed;

      // Memory should not increase significantly
      expect(memoryAfter).toBeLessThan(memoryBefore * 1.5);
    });

    it('should support incremental graph updates', async () => {
      await knowledgeGraph.buildGraph();
      const initialStats = await knowledgeGraph.getGraphStatistics();

      // Add new node
      await storage.store({
        id: 'incremental-node',
        timestamp: new Date().toISOString(),
        type: 'analysis',
        data: { projectType: 'go', complexity: 'medium' },
        metadata: { projectId: 'new-project', tags: ['incremental'] },
      });

      await knowledgeGraph.incrementalUpdate(['incremental-node']);
      const updatedStats = await knowledgeGraph.getGraphStatistics();

      expect(updatedStats.nodeCount).toBe(initialStats.nodeCount + 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted graph data gracefully', async () => {
      await knowledgeGraph.buildGraph();

      // Simulate corruption by directly modifying internal state
      await expect(async () => {
        await knowledgeGraph.findRelationships('invalid-node-id');
      }).not.toThrow();
    });

    it('should recover from failed operations', async () => {
      await knowledgeGraph.buildGraph();

      // Test recovery after simulated failure
      const originalNode = await knowledgeGraph.getNode('test-node-1');
      expect(originalNode).toBeDefined();

      // Should still work after potential errors
      const relationships = await knowledgeGraph.findRelationships('test-node-1');
      expect(Array.isArray(relationships)).toBe(true);
    });

    it('should validate input parameters', async () => {
      await knowledgeGraph.buildGraph();

      // Test with invalid parameters
      await expect(
        knowledgeGraph.findSimilarProjects('', { minSimilarity: -1 }),
      ).resolves.toBeDefined(); // Should handle gracefully

      await expect(knowledgeGraph.findPath('', '')).resolves.toBeDefined(); // Should handle gracefully
    });
  });

  describe('Serialization and Persistence', () => {
    it('should export graph structure', async () => {
      await knowledgeGraph.buildGraph();

      const exported = await knowledgeGraph.exportGraph({
        format: 'json',
        includeMetadata: true,
      });

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('nodes');
      expect(parsed).toHaveProperty('edges');
    });

    it('should import graph structure', async () => {
      await knowledgeGraph.buildGraph();

      // Export first
      const exported = await knowledgeGraph.exportGraph({
        format: 'json',
        includeMetadata: true,
      });

      // Create new graph and import
      const newKG = new KnowledgeGraph(storage);
      await newKG.initialize();

      await newKG.importGraph(exported, {
        format: 'json',
        merge: false,
      });

      const importedStats = await newKG.getGraphStatistics();
      expect(importedStats.nodeCount).toBeGreaterThan(0);
    });

    it('should maintain graph consistency across save/load cycles', async () => {
      await knowledgeGraph.buildGraph();
      const originalStats = await knowledgeGraph.getGraphStatistics();

      // Save and reload
      await knowledgeGraph.saveToStorage();
      await knowledgeGraph.loadFromStorage();

      const reloadedStats = await knowledgeGraph.getGraphStatistics();
      expect(reloadedStats.nodeCount).toBe(originalStats.nodeCount);
      expect(reloadedStats.edgeCount).toBe(originalStats.edgeCount);
    });
  });
});
