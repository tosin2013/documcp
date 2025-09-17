/**
 * Basic unit tests for Incremental Learning System
 * Tests basic instantiation and core functionality
 * Part of Issue #54 - Core Memory System Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import { IncrementalLearningSystem, ProjectFeatures } from '../../src/memory/learning.js';

describe('IncrementalLearningSystem', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;
  let learning: IncrementalLearningSystem;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `memory-learning-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create memory manager for learning system
    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    learning = new IncrementalLearningSystem(memoryManager);
    await learning.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Learning System Tests', () => {
    test('should create learning system instance', () => {
      expect(learning).toBeDefined();
      expect(learning).toBeInstanceOf(IncrementalLearningSystem);
    });

    test('should be able to enable and disable learning', () => {
      learning.setLearningEnabled(false);
      learning.setLearningEnabled(true);
      // Just test that the methods exist and don't throw
      expect(true).toBe(true);
    });

    test('should have pattern retrieval capabilities', async () => {
      // Test pattern retrieval without throwing errors
      const patterns = await learning.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });

    test('should provide learning statistics', async () => {
      const stats = await learning.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.totalPatterns).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(Array.isArray(stats.insights)).toBe(true);
    });

    test('should handle clearing patterns', async () => {
      await learning.clearPatterns();
      // Verify patterns are cleared
      const patterns = await learning.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBe(0);
    });

    test('should provide improved recommendations', async () => {
      const projectFeatures: ProjectFeatures = {
        language: 'typescript',
        framework: 'react',
        size: 'medium' as const,
        complexity: 'moderate' as const,
        hasTests: true,
        hasCI: true,
        hasDocs: false,
        isOpenSource: true
      };

      const baseRecommendation = {
        recommended: 'docusaurus',
        confidence: 0.8,
        score: 0.85
      };

      const improved = await learning.getImprovedRecommendation(projectFeatures, baseRecommendation);
      expect(improved).toBeDefined();
      expect(improved.recommendation).toBeDefined();
      expect(typeof improved.confidence).toBe('number');
      expect(Array.isArray(improved.insights)).toBe(true);
    });

    test('should handle learning from memory entries', async () => {
      const memoryEntry = await memoryManager.remember('recommendation', {
        recommended: 'docusaurus',
        confidence: 0.9,
        language: { primary: 'typescript' },
        framework: { name: 'react' }
      }, {
        projectId: 'test-project',
        ssg: 'docusaurus'
      });

      // Learn from successful outcome
      await learning.learn(memoryEntry, 'success');
      // Verify no errors thrown
      expect(true).toBe(true);
    });
  });

  describe('Learning Statistics and Analysis', () => {
    test('should provide comprehensive learning statistics', async () => {
      const stats = await learning.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.totalPatterns).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(typeof stats.learningVelocity).toBe('number');
      expect(typeof stats.patternsByType).toBe('object');
      expect(Array.isArray(stats.insights)).toBe(true);
    });

    test('should handle multiple learning iterations', async () => {
      const projectFeatures: ProjectFeatures = {
        language: 'javascript',
        framework: 'vue',
        size: 'small' as const,
        complexity: 'simple' as const,
        hasTests: false,
        hasCI: false,
        hasDocs: true,
        isOpenSource: false
      };

      const baseRecommendation = {
        recommended: 'vuepress',
        confidence: 0.7,
        score: 0.75
      };

      // Multiple learning cycles
      for (let i = 0; i < 3; i++) {
        const improved = await learning.getImprovedRecommendation(projectFeatures, baseRecommendation);
        expect(improved.recommendation).toBeDefined();
      }

      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty patterns gracefully', async () => {
      // Clear all patterns first
      await learning.clearPatterns();

      const patterns = await learning.getPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBe(0);
    });

    test('should handle learning with minimal data', async () => {
      const projectFeatures: ProjectFeatures = {
        language: 'unknown',
        size: 'small' as const,
        complexity: 'simple' as const,
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        isOpenSource: false
      };

      const baseRecommendation = {
        recommended: 'jekyll',
        confidence: 0.5
      };

      const improved = await learning.getImprovedRecommendation(projectFeatures, baseRecommendation);
      expect(improved).toBeDefined();
      expect(improved.recommendation).toBeDefined();
    });

    test('should handle concurrent learning operations', async () => {
      const promises = Array.from({ length: 3 }, async (_, i) => {
        const projectFeatures: ProjectFeatures = {
          language: 'go',
          size: 'medium' as const,
          complexity: 'moderate' as const,
          hasTests: true,
          hasCI: true,
          hasDocs: true,
          isOpenSource: true
        };

        const baseRecommendation = {
          recommended: 'hugo',
          confidence: 0.8 + i * 0.02
        };

        return learning.getImprovedRecommendation(projectFeatures, baseRecommendation);
      });

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.recommendation).toBeDefined();
      });
    });
  });
});