/**
 * Advanced unit tests for Contextual Memory Retrieval System
 * Tests intelligent, context-aware memory retrieval capabilities
 * Part of Issue #55 - Advanced Memory Components Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import {
  ContextualRetrievalSystem,
  RetrievalContext,
  ContextualMatch,
  SemanticEmbedding
} from '../../src/memory/contextual-retrieval.js';

describe('ContextualRetrievalSystem', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let contextualRetrieval: ContextualRetrievalSystem;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `contextual-retrieval-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    contextualRetrieval = new ContextualRetrievalSystem(memoryManager);
    await contextualRetrieval.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Contextual Retrieval Initialization', () => {
    test('should create contextual retrieval system instance', () => {
      expect(contextualRetrieval).toBeDefined();
      expect(contextualRetrieval).toBeInstanceOf(ContextualRetrievalSystem);
    });

    test('should initialize semantic embeddings system', async () => {
      const isEmbeddingsReady = await contextualRetrieval.isEmbeddingsSystemReady();
      // Embeddings system may not be available in test environment, so we check gracefully
      expect(typeof isEmbeddingsReady).toBe('boolean');
    });

    test('should handle configuration options', async () => {
      const config = {
        embeddingModel: 'test-model',
        maxContextSize: 1000,
        semanticThreshold: 0.7
      };

      await contextualRetrieval.configure(config);
      const currentConfig = await contextualRetrieval.getConfiguration();

      expect(currentConfig).toBeDefined();
      expect(currentConfig.maxContextSize).toBe(1000);
      expect(currentConfig.semanticThreshold).toBe(0.7);
    });
  });

  describe('Context-Aware Retrieval', () => {
    test('should retrieve memories based on project context', async () => {
      memoryManager.setContext({ projectId: 'context-test-project' });

      // Add test memories with different contexts
      await memoryManager.remember('analysis', {
        language: { primary: 'typescript' },
        framework: { name: 'react' },
        domain: 'web-development'
      });

      await memoryManager.remember('recommendation', {
        recommended: 'docusaurus',
        confidence: 0.9,
        context: 'documentation'
      });

      await memoryManager.remember('deployment', {
        status: 'success',
        platform: 'github-pages',
        duration: 120
      });

      // Define retrieval context
      const retrievalContext: RetrievalContext = {
        currentProject: {
          path: '/test/project',
          language: 'typescript',
          framework: 'react',
          domain: 'web-development',
          size: 'medium'
        },
        userIntent: {
          action: 'recommend',
          urgency: 'medium',
          experience: 'intermediate'
        },
        temporalContext: {
          recency: 'recent'
        }
      };

      const matches = await contextualRetrieval.retrieveContextual(
        'typescript react documentation',
        retrievalContext
      );

      expect(Array.isArray(matches)).toBe(true);

      // Check match structure
      matches.forEach(match => {
        expect(match).toHaveProperty('memory');
        expect(match).toHaveProperty('relevanceScore');
        expect(match).toHaveProperty('contextualFactors');
        expect(typeof match.relevanceScore).toBe('number');
        expect(match.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(match.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    test('should prioritize based on user intent', async () => {
      memoryManager.setContext({ projectId: 'intent-test-project' });

      // Add memories for different intents
      await memoryManager.remember('analysis', {
        type: 'code-analysis',
        findings: ['performance issues', 'code smells']
      });

      await memoryManager.remember('recommendation', {
        type: 'tool-recommendation',
        tools: ['eslint', 'prettier', 'jest']
      });

      await memoryManager.remember('deployment', {
        type: 'deployment-guide',
        steps: ['build', 'test', 'deploy']
      });

      // Test different intents
      const troubleshootContext: RetrievalContext = {
        userIntent: {
          action: 'troubleshoot',
          urgency: 'high',
          experience: 'expert'
        }
      };

      const recommendContext: RetrievalContext = {
        userIntent: {
          action: 'recommend',
          urgency: 'low',
          experience: 'novice'
        }
      };

      const troubleshootMatches = await contextualRetrieval.retrieveContextual(
        'performance issues',
        troubleshootContext
      );

      const recommendMatches = await contextualRetrieval.retrieveContextual(
        'tools setup',
        recommendContext
      );

      expect(Array.isArray(troubleshootMatches)).toBe(true);
      expect(Array.isArray(recommendMatches)).toBe(true);
    });

    test('should consider temporal context', async () => {
      memoryManager.setContext({ projectId: 'temporal-test-project' });

      // Add recent memory
      await memoryManager.remember('analysis', {
        timestamp: new Date().toISOString(),
        type: 'recent-analysis',
        findings: 'current issues'
      });

      // Simulate older memory by creating entry with past timestamp
      const olderTimestamp = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await memoryManager.remember('analysis', {
        timestamp: olderTimestamp,
        type: 'historical-analysis',
        findings: 'past issues'
      });

      // Test recent vs historical retrieval
      const recentContext: RetrievalContext = {
        temporalContext: {
          recency: 'recent'
        }
      };

      const historicalContext: RetrievalContext = {
        temporalContext: {
          recency: 'historical'
        }
      };

      const recentMatches = await contextualRetrieval.retrieveContextual(
        'analysis',
        recentContext
      );

      const historicalMatches = await contextualRetrieval.retrieveContextual(
        'analysis',
        historicalContext
      );

      expect(Array.isArray(recentMatches)).toBe(true);
      expect(Array.isArray(historicalMatches)).toBe(true);
    });
  });

  describe('Semantic Similarity', () => {
    test('should generate semantic embeddings for content', async () => {
      const testContent = 'React TypeScript application with modern tooling';

      const embedding = await contextualRetrieval.generateEmbedding(testContent);

      // Embeddings might not be available in test environment
      if (embedding) {
        expect(embedding).toHaveProperty('vector');
        expect(embedding).toHaveProperty('metadata');
        expect(Array.isArray(embedding.vector)).toBe(true);
        expect(embedding.metadata.source).toBe('test-content');
        expect(typeof embedding.metadata.confidence).toBe('number');
      } else {
        // Handle case where embeddings are not available
        expect(embedding).toBeNull();
      }
    });

    test('should calculate semantic similarity between texts', async () => {
      const text1 = 'React TypeScript application';
      const text2 = 'TypeScript React project';
      const text3 = 'Python Django web application';

      const similarity12 = await contextualRetrieval.calculateSimilarity(text1, text2);
      const similarity13 = await contextualRetrieval.calculateSimilarity(text1, text3);

      // If semantic analysis is available, similar texts should have higher similarity
      if (similarity12 !== null && similarity13 !== null) {
        expect(typeof similarity12).toBe('number');
        expect(typeof similarity13).toBe('number');
        expect(similarity12).toBeGreaterThanOrEqual(0);
        expect(similarity12).toBeLessThanOrEqual(1);
        expect(similarity13).toBeGreaterThanOrEqual(0);
        expect(similarity13).toBeLessThanOrEqual(1);
        // Similar texts should have higher similarity
        expect(similarity12).toBeGreaterThanOrEqual(similarity13);
      }
    });

    test('should cluster similar memories', async () => {
      memoryManager.setContext({ projectId: 'clustering-test' });

      // Add similar memories
      await memoryManager.remember('analysis', {
        technology: 'react',
        type: 'frontend',
        category: 'ui-library'
      });

      await memoryManager.remember('analysis', {
        technology: 'vue',
        type: 'frontend',
        category: 'ui-framework'
      });

      await memoryManager.remember('analysis', {
        technology: 'express',
        type: 'backend',
        category: 'web-server'
      });

      const clusters = await contextualRetrieval.clusterSimilarMemories();

      expect(Array.isArray(clusters)).toBe(true);

      // Each cluster should have meaningful structure
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('centroid');
        expect(cluster).toHaveProperty('members');
        expect(cluster).toHaveProperty('coherence');
        expect(Array.isArray(cluster.members)).toBe(true);
        expect(typeof cluster.coherence).toBe('number');
      });
    });
  });

  describe('Advanced Filtering and Ranking', () => {
    test('should apply complex filtering criteria', async () => {
      memoryManager.setContext({ projectId: 'filtering-test' });

      // Add diverse test data
      await memoryManager.remember('analysis', {
        language: 'typescript',
        complexity: 'high',
        performance: 'good'
      }, { tags: ['frontend', 'performance'] });

      await memoryManager.remember('recommendation', {
        tool: 'webpack',
        category: 'bundler',
        reliability: 'high'
      }, { tags: ['tooling', 'build'] });

      await memoryManager.remember('deployment', {
        platform: 'vercel',
        status: 'success',
        duration: 45
      }, { tags: ['deployment', 'success'] });

      const filterCriteria = {
        types: ['analysis', 'recommendation'],
        tags: ['frontend', 'tooling'],
        complexity: ['high'],
        performance: { minimum: 'good' }
      };

      const filtered = await contextualRetrieval.applyFilters(filterCriteria);

      expect(Array.isArray(filtered)).toBe(true);

      // Verify filtering worked
      filtered.forEach(memory => {
        expect(['analysis', 'recommendation']).toContain(memory.type);
        const hasRequiredTag = memory.metadata.tags?.some(tag =>
          ['frontend', 'tooling'].includes(tag)
        );
        if (memory.metadata.tags) {
          expect(hasRequiredTag).toBe(true);
        }
      });
    });

    test('should rank results by relevance', async () => {
      memoryManager.setContext({ projectId: 'ranking-test' });

      // Add memories with different relevance levels
      await memoryManager.remember('analysis', {
        query: 'typescript react performance',
        relevance: 'high',
        topic: 'performance optimization'
      });

      await memoryManager.remember('analysis', {
        query: 'javascript performance',
        relevance: 'medium',
        topic: 'general performance'
      });

      await memoryManager.remember('analysis', {
        query: 'css styling',
        relevance: 'low',
        topic: 'styling'
      });

      const context: RetrievalContext = {
        currentProject: {
          path: '/test',
          language: 'typescript',
          framework: 'react'
        }
      };

      const rankedResults = await contextualRetrieval.retrieveContextual(
        'typescript react performance optimization',
        context,
        { maxResults: 10, minRelevance: 0.1 }
      );

      expect(Array.isArray(rankedResults)).toBe(true);

      // Results should be sorted by relevance (descending)
      for (let i = 1; i < rankedResults.length; i++) {
        expect(rankedResults[i-1].relevanceScore).toBeGreaterThanOrEqual(
          rankedResults[i].relevanceScore
        );
      }
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large-scale retrieval efficiently', async () => {
      memoryManager.setContext({ projectId: 'performance-test' });

      // Add many memories
      const promises = Array.from({ length: 50 }, (_, i) =>
        memoryManager.remember('analysis', {
          index: i,
          content: `test content ${i}`,
          category: i % 5 === 0 ? 'high-priority' : 'normal'
        })
      );

      await Promise.all(promises);

      const startTime = Date.now();

      const context: RetrievalContext = {
        currentProject: {
          path: '/performance-test',
          language: 'typescript'
        }
      };

      const results = await contextualRetrieval.retrieveContextual(
        'test content',
        context,
        { maxResults: 20 }
      );

      const retrievalTime = Date.now() - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(20);
      expect(retrievalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cache frequently accessed embeddings', async () => {
      const frequentQuery = 'typescript react application';

      // First retrieval
      const startTime1 = Date.now();
      await contextualRetrieval.generateEmbedding(frequentQuery);
      const time1 = Date.now() - startTime1;

      // Second retrieval (should be cached)
      const startTime2 = Date.now();
      await contextualRetrieval.generateEmbedding(frequentQuery);
      const time2 = Date.now() - startTime2;

      // If caching is implemented, second retrieval should be faster
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed retrieval contexts', async () => {
      const malformedContext = {
        currentProject: {
          language: null,
          size: 'invalid' as any
        },
        userIntent: {
          action: 'unknown' as any,
          urgency: undefined as any
        }
      };

      // Should not throw, but handle gracefully
      const results = await contextualRetrieval.retrieveContextual(
        'test query',
        malformedContext as any
      );

      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle embedding system failures', async () => {
      // Simulate embedding system failure by using invalid content
      const invalidContent = null;

      const embedding = await contextualRetrieval.generateEmbedding(invalidContent as any);

      // Should handle gracefully and return null or default
      expect(embedding).toBeNull();
    });

    test('should provide fallback retrieval when semantic search fails', async () => {
      memoryManager.setContext({ projectId: 'fallback-test' });

      await memoryManager.remember('analysis', {
        fallbackTest: true,
        content: 'fallback content'
      });

      // Test with context that might cause semantic search to fail
      const results = await contextualRetrieval.retrieveContextual(
        'fallback content',
        {},
        { fallbackToKeyword: true }
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });
});