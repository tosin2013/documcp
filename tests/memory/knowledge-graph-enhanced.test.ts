import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { KnowledgeGraph } from '../../src/memory/knowledge-graph.js';
import { MemoryManager } from '../../src/memory/manager.js';

describe('Knowledge Graph Basic Tests', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let knowledgeGraph: KnowledgeGraph;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `test-kg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    knowledgeGraph = new KnowledgeGraph(memoryManager);
    await knowledgeGraph.initialize();

    // Add test data to memory manager
    await memoryManager.remember(
      'analysis',
      {
        projectType: 'javascript',
        complexity: 'medium',
        framework: 'react',
        technologies: ['webpack', 'babel', 'jest'],
      },
      {
        projectId: 'project-1',
        tags: ['frontend', 'spa'],
      },
    );

    await memoryManager.remember(
      'recommendation',
      {
        ssg: 'docusaurus',
        confidence: 0.9,
        reasons: ['React ecosystem', 'Good documentation features'],
      },
      {
        projectId: 'project-1',
        tags: ['react', 'documentation'],
      },
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Functionality', () => {
    it('should initialize knowledge graph', async () => {
      expect(knowledgeGraph).toBeDefined();
    });

    it('should build graph from memories', async () => {
      await knowledgeGraph.buildFromMemories();
      const stats = await knowledgeGraph.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.nodeCount).toBe('number');
      expect(typeof stats.edgeCount).toBe('number');
      expect(stats.nodeCount).toBeGreaterThanOrEqual(0);
    });

    it('should get all nodes', async () => {
      await knowledgeGraph.buildFromMemories();
      const nodes = await knowledgeGraph.getAllNodes();

      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThanOrEqual(0);
    });

    it('should get all edges', async () => {
      await knowledgeGraph.buildFromMemories();
      const edges = await knowledgeGraph.getAllEdges();

      expect(Array.isArray(edges)).toBe(true);
      expect(edges.length).toBeGreaterThanOrEqual(0);
    });

    it('should get connections for a node', async () => {
      await knowledgeGraph.buildFromMemories();
      const nodes = await knowledgeGraph.getAllNodes();

      if (nodes.length > 0) {
        const connections = await knowledgeGraph.getConnections(nodes[0].id);
        expect(Array.isArray(connections)).toBe(true);
      }
    });
  });

  describe('Data Management', () => {
    it('should save and load from memory', async () => {
      await knowledgeGraph.buildFromMemories();

      // Save the current state
      await knowledgeGraph.saveToMemory();

      // Create new instance and load
      const newKG = new KnowledgeGraph(memoryManager);
      await newKG.initialize();
      await newKG.loadFromMemory();

      const originalStats = await knowledgeGraph.getStatistics();
      const loadedStats = await newKG.getStatistics();

      expect(loadedStats.nodeCount).toBe(originalStats.nodeCount);
    });

    it('should remove nodes', async () => {
      await knowledgeGraph.buildFromMemories();
      const nodes = await knowledgeGraph.getAllNodes();

      if (nodes.length > 0) {
        const initialCount = nodes.length;
        const removed = await knowledgeGraph.removeNode(nodes[0].id);

        expect(removed).toBe(true);

        const remainingNodes = await knowledgeGraph.getAllNodes();
        expect(remainingNodes.length).toBe(initialCount - 1);
      }
    });
  });

  describe('Performance', () => {
    it('should handle multiple memories efficiently', async () => {
      // Add more test data
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          memoryManager.remember(
            'analysis',
            {
              projectType: i % 2 === 0 ? 'javascript' : 'python',
              complexity: ['low', 'medium', 'high'][i % 3],
              index: i,
            },
            {
              projectId: `project-${Math.floor(i / 5)}`,
              tags: [`tag-${i % 3}`],
            },
          ),
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      await knowledgeGraph.buildFromMemories();
      const buildTime = Date.now() - startTime;

      expect(buildTime).toBeLessThan(2000); // Should complete within 2 seconds

      const stats = await knowledgeGraph.getStatistics();
      expect(stats.nodeCount).toBeGreaterThanOrEqual(0);
    });
  });
});
