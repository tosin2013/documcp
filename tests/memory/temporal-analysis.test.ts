/**
 * Basic unit tests for Temporal Memory Analysis System
 * Tests core temporal analysis functionality
 * Part of Issue #55 - Advanced Memory Components Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import {
  TemporalMemoryAnalysis,
  TimeWindow,
  TemporalPattern,
  TemporalMetrics,
  TemporalQuery,
  TemporalInsight,
} from '../../src/memory/temporal-analysis.js';

describe('TemporalMemoryAnalysis', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let temporalAnalysis: TemporalMemoryAnalysis;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `temporal-analysis-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    // Create required dependencies for TemporalMemoryAnalysis
    const storage = (memoryManager as any).storage;
    const learningSystem = {
      learn: jest.fn(),
      predict: jest.fn(),
      adaptModel: jest.fn(),
    };
    const knowledgeGraph = {
      addNode: jest.fn(),
      addEdge: jest.fn(),
      findPaths: jest.fn(),
    };

    temporalAnalysis = new TemporalMemoryAnalysis(
      storage,
      memoryManager,
      learningSystem as any,
      knowledgeGraph as any,
    );
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Temporal Analysis Initialization', () => {
    test('should create temporal analysis system instance', () => {
      expect(temporalAnalysis).toBeDefined();
      expect(temporalAnalysis).toBeInstanceOf(TemporalMemoryAnalysis);
    });

    test('should analyze temporal patterns', async () => {
      // Add some test memories
      await memoryManager.remember('analysis', {
        projectPath: '/test/project',
        timestamp: new Date().toISOString(),
      });

      // Test temporal pattern analysis
      const patterns = await temporalAnalysis.analyzeTemporalPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('should get temporal metrics', async () => {
      // Add test memory
      await memoryManager.remember('deployment', {
        status: 'success',
        timestamp: new Date().toISOString(),
      });

      // Test temporal metrics
      const metrics = await temporalAnalysis.getTemporalMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.activityLevel).toBe('number');
    });

    test('should predict future activity', async () => {
      // Add test memories
      await memoryManager.remember('analysis', { test: 'data1' });
      await memoryManager.remember('analysis', { test: 'data2' });

      // Test prediction
      const prediction = await temporalAnalysis.predictFutureActivity();
      expect(prediction).toBeDefined();
      expect(typeof prediction.nextActivity.confidence).toBe('number');
    });

    test('should get temporal insights', async () => {
      // Add test memory
      await memoryManager.remember('recommendation', {
        type: 'ssg',
        recommendation: 'use-hugo',
      });

      // Test insights
      const insights = await temporalAnalysis.getTemporalInsights();
      expect(Array.isArray(insights)).toBe(true);
    });
  });

  describe('Temporal Query Support', () => {
    test('should handle temporal queries with parameters', async () => {
      // Add test data
      await memoryManager.remember('analysis', { framework: 'react' });
      await memoryManager.remember('deployment', { status: 'success' });

      const query: TemporalQuery = {
        granularity: 'day',
        aggregation: 'count',
        filters: { types: ['analysis'] },
      };

      const patterns = await temporalAnalysis.analyzeTemporalPatterns(query);
      expect(Array.isArray(patterns)).toBe(true);

      const metrics = await temporalAnalysis.getTemporalMetrics(query);
      expect(metrics).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty data gracefully', async () => {
      // Test with no memories
      const patterns = await temporalAnalysis.analyzeTemporalPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBe(0);

      const metrics = await temporalAnalysis.getTemporalMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.activityLevel).toBe(0);
    });

    test('should handle invalid query parameters', async () => {
      const invalidQuery = {
        granularity: 'invalid' as any,
        aggregation: 'count' as any,
      };

      // Should not throw but handle gracefully
      await expect(temporalAnalysis.analyzeTemporalPatterns(invalidQuery)).resolves.toBeDefined();
    });
  });
});
