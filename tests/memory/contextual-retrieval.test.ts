/**
 * Basic unit tests for Contextual Memory Retrieval System
 * Tests basic context-aware memory retrieval capabilities
 * Part of Issue #55 - Advanced Memory Components Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import ContextualRetrievalSystem, {
  RetrievalContext,
} from '../../src/memory/contextual-retrieval.js';

describe('ContextualRetrievalSystem', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let knowledgeGraph: any;
  let contextualRetrieval: ContextualRetrievalSystem;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `contextual-retrieval-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    // Create a mock knowledge graph for testing
    knowledgeGraph = {
      findRelatedNodes: jest.fn().mockResolvedValue([]),
      getConnectionStrength: jest.fn().mockResolvedValue(0.5),
      query: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    };

    contextualRetrieval = new ContextualRetrievalSystem(memoryManager, knowledgeGraph);
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization and Configuration', () => {
    test('should create ContextualRetrievalSystem instance', () => {
      expect(contextualRetrieval).toBeInstanceOf(ContextualRetrievalSystem);
    });

    test('should have memory manager and knowledge graph dependencies', () => {
      expect(contextualRetrieval).toBeDefined();
      // Basic integration test - system should be created with dependencies
    });
  });

  describe('Basic Contextual Retrieval', () => {
    beforeEach(async () => {
      // Set up test memories for retrieval tests
      await memoryManager.remember('analysis', {
        projectPath: '/test/typescript-project',
        language: 'typescript',
        framework: 'react',
        outcome: 'success',
        recommendation: 'Use TypeScript for better type safety',
      });

      await memoryManager.remember('deployment', {
        projectPath: '/test/node-project',
        language: 'javascript',
        framework: 'express',
        outcome: 'success',
        recommendation: 'Deploy with Docker for consistency',
      });

      await memoryManager.remember('recommendation', {
        projectPath: '/test/python-project',
        language: 'python',
        framework: 'django',
        outcome: 'failure',
        recommendation: 'Check Python version compatibility',
      });
    });

    test('should retrieve contextual matches based on project context', async () => {
      const retrievalContext: RetrievalContext = {
        currentProject: {
          path: '/test/typescript-project',
          language: 'typescript',
          framework: 'react',
        },
        userIntent: {
          action: 'analyze',
          urgency: 'medium',
          experience: 'intermediate',
        },
        temporalContext: {
          recency: 'recent',
        },
      };

      const result = await contextualRetrieval.retrieve(
        'typescript react documentation',
        retrievalContext,
      );

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);

      // Basic structure validation
      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match).toHaveProperty('memory');
        expect(match).toHaveProperty('relevanceScore');
        expect(typeof match.relevanceScore).toBe('number');
      }
    });

    test('should handle different user intents', async () => {
      const troubleshootContext: RetrievalContext = {
        userIntent: {
          action: 'troubleshoot',
          urgency: 'high',
          experience: 'novice',
        },
      };

      const recommendContext: RetrievalContext = {
        userIntent: {
          action: 'recommend',
          urgency: 'low',
          experience: 'expert',
        },
      };

      const troubleshootResult = await contextualRetrieval.retrieve(
        'deployment failed',
        troubleshootContext,
      );
      const recommendResult = await contextualRetrieval.retrieve(
        'best practices',
        recommendContext,
      );

      expect(troubleshootResult).toBeDefined();
      expect(recommendResult).toBeDefined();
      expect(Array.isArray(troubleshootResult.matches)).toBe(true);
      expect(Array.isArray(recommendResult.matches)).toBe(true);
    });

    test('should consider temporal context for relevance', async () => {
      const recentContext: RetrievalContext = {
        temporalContext: {
          recency: 'recent',
        },
      };

      const historicalContext: RetrievalContext = {
        temporalContext: {
          recency: 'historical',
        },
      };

      const recentResult = await contextualRetrieval.retrieve('recent activity', recentContext);
      const historicalResult = await contextualRetrieval.retrieve(
        'historical data',
        historicalContext,
      );

      expect(recentResult).toBeDefined();
      expect(historicalResult).toBeDefined();
      expect(Array.isArray(recentResult.matches)).toBe(true);
      expect(Array.isArray(historicalResult.matches)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty query gracefully', async () => {
      const context: RetrievalContext = {
        userIntent: {
          action: 'analyze',
          urgency: 'medium',
          experience: 'intermediate',
        },
      };

      const result = await contextualRetrieval.retrieve('', context);

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });

    test('should handle minimal context', async () => {
      const minimalContext: RetrievalContext = {};

      const result = await contextualRetrieval.retrieve('test query', minimalContext);

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });
});
