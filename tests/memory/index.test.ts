/**
 * Test suite for Memory System Index
 */

import { jest } from '@jest/globals';
import * as memoryIndex from '../../src/memory/index.js';

describe('Memory System Index', () => {
  it('should export MemoryManager', () => {
    expect(memoryIndex.MemoryManager).toBeDefined();
  });

  it('should export JSONLStorage', () => {
    expect(memoryIndex.JSONLStorage).toBeDefined();
  });

  it('should export KnowledgeGraph', () => {
    expect(memoryIndex.KnowledgeGraph).toBeDefined();
  });

  it('should export IncrementalLearningSystem', () => {
    expect(memoryIndex.IncrementalLearningSystem).toBeDefined();
  });

  it('should export TemporalMemoryAnalysis', () => {
    expect(memoryIndex.TemporalMemoryAnalysis).toBeDefined();
  });

  it('should export ContextualMemoryRetrieval', () => {
    expect(memoryIndex.ContextualMemoryRetrieval).toBeDefined();
  });

  it('should export MemoryVisualizationSystem', () => {
    expect(memoryIndex.MemoryVisualizationSystem).toBeDefined();
  });

  it('should export memory tools', () => {
    expect(memoryIndex.memoryTools).toBeDefined();
    expect(Array.isArray(memoryIndex.memoryTools)).toBe(true);
    expect(memoryIndex.memoryTools.length).toBeGreaterThan(0);
  });

  it('should export all main classes and interfaces', () => {
    const exports = Object.keys(memoryIndex);
    expect(exports.length).toBeGreaterThan(10);
  });

  it('should allow importing all exports without errors', () => {
    expect(() => {
      const {
        MemoryManager,
        JSONLStorage,
        KnowledgeGraph,
        IncrementalLearningSystem,
        TemporalMemoryAnalysis,
        ContextualMemoryRetrieval,
        MemoryVisualizationSystem,
      } = memoryIndex;

      expect(MemoryManager).toBeDefined();
      expect(JSONLStorage).toBeDefined();
      expect(KnowledgeGraph).toBeDefined();
      expect(IncrementalLearningSystem).toBeDefined();
      expect(TemporalMemoryAnalysis).toBeDefined();
      expect(ContextualMemoryRetrieval).toBeDefined();
      expect(MemoryVisualizationSystem).toBeDefined();
    }).not.toThrow();
  });
});
