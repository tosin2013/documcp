/**
 * Test suite for Memory Pruning & Optimization System
 */

import { jest } from '@jest/globals';
import { MemoryPruningSystem } from '../../src/memory/pruning.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { MemoryEntry } from '../../src/memory/storage.js';
import {
  PruningPolicy,
  OptimizationMetrics,
  PruningResult,
  CompressionStrategy,
} from '../../src/memory/pruning.js';
import * as tmp from 'tmp';
import * as fs from 'fs/promises';

// Mock the MemoryManager
jest.mock('../../src/memory/manager.js');

describe('MemoryPruningSystem', () => {
  let pruningSystem: MemoryPruningSystem;
  let mockMemoryManager: jest.Mocked<MemoryManager>;
  let tempDir: tmp.DirResult;

  const defaultPolicy: PruningPolicy = {
    maxAge: 30, // 30 days
    maxSize: 100, // 100 MB
    maxEntries: 1000,
    preservePatterns: ['critical', 'user-preference'],
    compressionThreshold: 7, // 7 days
    redundancyThreshold: 0.9, // 90% similarity
  };

  const sampleMemoryEntry: MemoryEntry = {
    id: 'test-entry-1',
    content: 'Sample memory content for testing',
    metadata: {
      type: 'analysis',
      tags: ['test', 'sample'],
      timestamp: new Date().toISOString(),
      context: { project: 'test-project' },
    },
    importance: 0.7,
    lastAccessed: new Date().toISOString(),
    accessCount: 5,
  };

  beforeAll(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterAll(() => {
    tempDir.removeCallback();
  });

  beforeEach(() => {
    mockMemoryManager = new MemoryManager(tempDir.name) as jest.Mocked<MemoryManager>;
    pruningSystem = new MemoryPruningSystem(mockMemoryManager, defaultPolicy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default policy', () => {
      const system = new MemoryPruningSystem(mockMemoryManager);
      expect(system).toBeDefined();
      expect(system.getPolicy()).toBeDefined();
    });

    it('should initialize with custom policy', () => {
      const customPolicy: PruningPolicy = {
        ...defaultPolicy,
        maxAge: 60,
      };

      const system = new MemoryPruningSystem(mockMemoryManager, customPolicy);
      expect(system.getPolicy().maxAge).toBe(60);
    });

    it('should update policy dynamically', () => {
      const newPolicy: Partial<PruningPolicy> = {
        maxAge: 45,
        maxEntries: 500,
      };

      pruningSystem.updatePolicy(newPolicy);
      const updatedPolicy = pruningSystem.getPolicy();

      expect(updatedPolicy.maxAge).toBe(45);
      expect(updatedPolicy.maxEntries).toBe(500);
      expect(updatedPolicy.maxSize).toBe(defaultPolicy.maxSize); // Should preserve other values
    });
  });

  describe('Age-based Pruning', () => {
    it('should identify old entries for pruning', async () => {
      const oldEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'old-entry',
        metadata: {
          ...sampleMemoryEntry.metadata,
          timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days old
        },
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([oldEntry, sampleMemoryEntry]);

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.byAge.length).toBe(1);
      expect(candidates.byAge[0].id).toBe('old-entry');
    });

    it('should preserve entries matching preserve patterns', async () => {
      const criticalEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'critical-entry',
        metadata: {
          ...sampleMemoryEntry.metadata,
          type: 'critical',
          timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([criticalEntry]);

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.byAge.length).toBe(0); // Should not be marked for pruning
    });

    it('should handle invalid timestamps gracefully', async () => {
      const invalidEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'invalid-entry',
        metadata: {
          ...sampleMemoryEntry.metadata,
          timestamp: 'invalid-date',
        },
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([invalidEntry]);

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.byAge.length).toBe(0); // Should handle gracefully
    });
  });

  describe('Size-based Pruning', () => {
    it('should identify entries contributing to size limits', async () => {
      const largeSizeStats = {
        totalSize: 150 * 1024 * 1024, // 150 MB (exceeds 100 MB limit)
        entryCount: 500,
        averageSize: 300 * 1024,
      };

      mockMemoryManager.getStorageStats.mockResolvedValue(largeSizeStats);
      mockMemoryManager.getAllEntries.mockResolvedValue([sampleMemoryEntry]);

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.bySize.length).toBeGreaterThan(0);
    });

    it('should prioritize less important entries for size-based pruning', async () => {
      const lowImportanceEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'low-importance',
        importance: 0.2,
      };

      const highImportanceEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'high-importance',
        importance: 0.9,
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([lowImportanceEntry, highImportanceEntry]);
      mockMemoryManager.getStorageStats.mockResolvedValue({
        totalSize: 150 * 1024 * 1024,
        entryCount: 2,
        averageSize: 75 * 1024 * 1024,
      });

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.bySize[0].id).toBe('low-importance');
    });
  });

  describe('Redundancy Detection and Removal', () => {
    it('should detect similar entries', async () => {
      const similarEntry1: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'similar-1',
        content: 'This is a test document about React components',
      };

      const similarEntry2: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'similar-2',
        content: 'This is a test document about React components and props',
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([similarEntry1, similarEntry2]);

      const candidates = await pruningSystem.identifyPruningCandidates();

      expect(candidates.byRedundancy.length).toBeGreaterThan(0);
    });

    it('should preserve the most recently accessed similar entry', async () => {
      const recentEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'recent',
        lastAccessed: new Date().toISOString(),
        accessCount: 10,
      };

      const oldEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'old',
        lastAccessed: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        accessCount: 2,
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([recentEntry, oldEntry]);

      const duplicates = await pruningSystem.findDuplicates();

      if (duplicates.length > 0) {
        expect(duplicates[0].keepEntry).toBe('recent');
      }
    });
  });

  describe('Compression Strategies', () => {
    it('should identify entries for compression', async () => {
      const oldEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'compress-candidate',
        metadata: {
          ...sampleMemoryEntry.metadata,
          timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days old
        },
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([oldEntry]);

      const compressionCandidates = await pruningSystem.identifyCompressionCandidates();

      expect(compressionCandidates.length).toBe(1);
      expect(compressionCandidates[0].id).toBe('compress-candidate');
    });

    it('should apply gzip compression', async () => {
      const strategy: CompressionStrategy = {
        type: 'gzip',
        threshold: 1024, // 1KB
        ratio: 0.7,
      };

      const result = await pruningSystem.compressEntry(sampleMemoryEntry, strategy);

      expect(result.compressed).toBe(true);
      expect(result.originalSize).toBeGreaterThan(result.compressedSize);
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should handle compression errors gracefully', async () => {
      const strategy: CompressionStrategy = {
        type: 'gzip',
        threshold: 0,
        ratio: 0.5,
      };

      const invalidEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        content: undefined as any,
      };

      const result = await pruningSystem.compressEntry(invalidEntry, strategy);

      expect(result.compressed).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Pruning Execution', () => {
    it('should execute pruning operation successfully', async () => {
      const oldEntry: MemoryEntry = {
        ...sampleMemoryEntry,
        id: 'to-prune',
        metadata: {
          ...sampleMemoryEntry.metadata,
          timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      mockMemoryManager.getAllEntries.mockResolvedValue([oldEntry, sampleMemoryEntry]);
      mockMemoryManager.deleteEntry.mockResolvedValue(true);
      mockMemoryManager.getStorageStats.mockResolvedValue({
        totalSize: 50 * 1024 * 1024,
        entryCount: 1,
        averageSize: 50 * 1024 * 1024,
      });

      const result = await pruningSystem.executePruning();

      expect(result.entriesRemoved).toBeGreaterThan(0);
      expect(result.optimizationApplied).toBe(true);
      expect(mockMemoryManager.deleteEntry).toHaveBeenCalled();
    });

    it('should create backup before pruning if enabled', async () => {
      pruningSystem.enableBackup(true);

      const result = await pruningSystem.executePruning();

      expect(result.backupCreated).toBe(true);
    });

    it('should emit pruning events', (done) => {
      pruningSystem.on('pruningStarted', (data) => {
        expect(data.candidatesCount).toBeGreaterThanOrEqual(0);
        done();
      });

      pruningSystem.executePruning();
    });
  });

  describe('Optimization Metrics', () => {
    it('should calculate optimization metrics', async () => {
      mockMemoryManager.getStorageStats.mockResolvedValue({
        totalSize: 75 * 1024 * 1024,
        entryCount: 500,
        averageSize: 150 * 1024,
      });

      const metrics = await pruningSystem.getOptimizationMetrics();

      expect(metrics.totalEntries).toBe(500);
      expect(metrics.storageSize).toBe(75 * 1024 * 1024);
      expect(metrics.lastOptimization).toBeInstanceOf(Date);
    });

    it('should track performance improvements', async () => {
      const beforeMetrics = await pruningSystem.getOptimizationMetrics();

      await pruningSystem.executePruning();

      const afterMetrics = await pruningSystem.getOptimizationMetrics();
      expect(afterMetrics.lastOptimization.getTime()).toBeGreaterThan(
        beforeMetrics.lastOptimization.getTime(),
      );
    });
  });

  describe('Scheduled Pruning', () => {
    it('should schedule automatic pruning', () => {
      const interval = pruningSystem.scheduleAutomaticPruning('0 2 * * *'); // Daily at 2 AM

      expect(interval).toBeDefined();
      pruningSystem.stopAutomaticPruning();
    });

    it('should handle invalid cron expressions', () => {
      expect(() => {
        pruningSystem.scheduleAutomaticPruning('invalid-cron');
      }).toThrow();
    });

    it('should stop automatic pruning', () => {
      pruningSystem.scheduleAutomaticPruning('0 2 * * *');
      const stopped = pruningSystem.stopAutomaticPruning();

      expect(stopped).toBe(true);
    });
  });

  describe('Policy Validation', () => {
    it('should validate policy constraints', () => {
      const invalidPolicy: Partial<PruningPolicy> = {
        maxAge: -1, // Invalid negative value
        maxSize: 0, // Invalid zero value
      };

      expect(() => {
        pruningSystem.updatePolicy(invalidPolicy);
      }).toThrow();
    });

    it('should enforce minimum retention requirements', () => {
      const excessivePolicy: Partial<PruningPolicy> = {
        maxAge: 0.5, // Less than 1 day
        maxEntries: 10, // Too few entries
      };

      expect(() => {
        pruningSystem.updatePolicy(excessivePolicy);
      }).toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle storage errors during pruning', async () => {
      mockMemoryManager.deleteEntry.mockRejectedValue(new Error('Storage error'));
      mockMemoryManager.getAllEntries.mockResolvedValue([sampleMemoryEntry]);

      const result = await pruningSystem.executePruning();

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should recover from partial pruning failures', async () => {
      mockMemoryManager.deleteEntry
        .mockResolvedValueOnce(true) // First deletion succeeds
        .mockRejectedValueOnce(new Error('Failure')) // Second fails
        .mockResolvedValueOnce(true); // Third succeeds

      const entries = [
        { ...sampleMemoryEntry, id: 'entry-1' },
        { ...sampleMemoryEntry, id: 'entry-2' },
        { ...sampleMemoryEntry, id: 'entry-3' },
      ];

      mockMemoryManager.getAllEntries.mockResolvedValue(entries);

      const result = await pruningSystem.executePruning();

      expect(result.entriesRemoved).toBe(2); // Should remove 2 out of 3
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(1);
    });

    it('should validate memory state after pruning', async () => {
      const result = await pruningSystem.executePruning();

      expect(result.validationPassed).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure pruning operation duration', async () => {
      const startTime = Date.now();
      const result = await pruningSystem.executePruning();
      const duration = Date.now() - startTime;

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should track memory usage during pruning', async () => {
      const result = await pruningSystem.executePruning();

      expect(result.metrics.performanceGain).toBeGreaterThanOrEqual(0);
    });
  });
});
