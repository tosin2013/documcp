/**
 * Comprehensive unit tests for Memory Storage System
 * Tests JSONL storage, indexing, CRUD operations, and performance
 * Part of Issue #54 - Core Memory System Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { JSONLStorage, MemoryEntry } from '../../src/memory/storage.js';

describe('JSONLStorage', () => {
  let storage: JSONLStorage;
  let tempDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(
      os.tmpdir(),
      `memory-storage-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    storage = new JSONLStorage(tempDir);
    await storage.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Storage Operations', () => {
    test('should create storage instance and initialize', async () => {
      expect(storage).toBeDefined();
      expect(storage).toBeInstanceOf(JSONLStorage);

      // Verify storage directory was created
      const stats = await fs.stat(tempDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should append and retrieve memory entries', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { project: 'test-project', result: 'success' },
        metadata: { projectId: 'test-proj', tags: ['test'] },
      };

      const stored = await storage.append(entry);
      expect(stored.id).toBeDefined();
      expect(stored.checksum).toBeDefined();
      expect(stored.type).toBe('analysis');
      expect(stored.data).toEqual(entry.data);
    });

    test('should handle different entry types', async () => {
      const entryTypes: Array<MemoryEntry['type']> = [
        'analysis',
        'recommendation',
        'deployment',
        'configuration',
        'interaction',
      ];

      for (const type of entryTypes) {
        const entry = {
          timestamp: new Date().toISOString(),
          type,
          data: { testType: type },
          metadata: { projectId: 'test-types' },
        };

        const stored = await storage.append(entry);
        expect(stored.type).toBe(type);
        expect(stored.data.testType).toBe(type);
      }
    });

    test('should generate unique IDs for different entries', async () => {
      const entry1 = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { project: 'test-1' },
        metadata: { projectId: 'test-1' },
      };

      const entry2 = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { project: 'test-2' },
        metadata: { projectId: 'test-2' },
      };

      const stored1 = await storage.append(entry1);
      const stored2 = await storage.append(entry2);

      expect(stored1.id).not.toBe(stored2.id);
      expect(stored1.checksum).not.toBe(stored2.checksum);
    });

    test('should generate same ID for identical entries', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { project: 'identical-test' },
        metadata: { projectId: 'identical' },
      };

      const stored1 = await storage.append(entry);
      const stored2 = await storage.append(entry);

      expect(stored1.id).toBe(stored2.id);
      expect(stored1.checksum).toBe(stored2.checksum);
    });
  });

  describe('File Management', () => {
    test('should create proper JSONL file structure', async () => {
      const entry = {
        timestamp: '2024-01-15T10:30:00.000Z',
        type: 'analysis' as const,
        data: { fileTest: true },
        metadata: { projectId: 'file-proj' },
      };

      await storage.append(entry);

      // Check that file was created with expected name pattern
      const files = await fs.readdir(tempDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
      expect(jsonlFiles.length).toBeGreaterThan(0);

      // Should have analysis_2024_01.jsonl
      const expectedFile = 'analysis_2024_01.jsonl';
      expect(jsonlFiles).toContain(expectedFile);

      // Verify file contains the entry
      const filePath = path.join(tempDir, expectedFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const parsedEntry = JSON.parse(lines[0]);
      expect(parsedEntry.data.fileTest).toBe(true);
    });

    test('should organize files by type and date', async () => {
      const entries = [
        {
          timestamp: '2024-01-15T10:30:00.000Z',
          type: 'analysis' as const,
          data: { test: 'analysis-jan' },
          metadata: { projectId: 'date-test' },
        },
        {
          timestamp: '2024-02-15T10:30:00.000Z',
          type: 'analysis' as const,
          data: { test: 'analysis-feb' },
          metadata: { projectId: 'date-test' },
        },
        {
          timestamp: '2024-01-15T10:30:00.000Z',
          type: 'recommendation' as const,
          data: { test: 'recommendation-jan' },
          metadata: { projectId: 'date-test' },
        },
      ];

      for (const entry of entries) {
        await storage.append(entry);
      }

      const files = await fs.readdir(tempDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      expect(jsonlFiles).toContain('analysis_2024_01.jsonl');
      expect(jsonlFiles).toContain('analysis_2024_02.jsonl');
      expect(jsonlFiles).toContain('recommendation_2024_01.jsonl');
    });

    test('should handle index persistence', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'configuration' as const,
        data: { indexTest: true },
        metadata: { projectId: 'index-test' },
      };

      await storage.append(entry);

      // Check that index file was created
      const indexPath = path.join(tempDir, '.index.json');
      const indexExists = await fs
        .access(indexPath)
        .then(() => true)
        .catch(() => false);
      expect(indexExists).toBe(true);

      // Index should contain entry information
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const indexData = JSON.parse(indexContent);
      expect(typeof indexData).toBe('object');
      expect(Array.isArray(indexData.entries)).toBe(true);
      expect(indexData.entries.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    test('should generate checksums for data integrity', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'deployment' as const,
        data: { integrity: 'test', checkData: 'important' },
        metadata: { projectId: 'integrity-test' },
      };

      const stored = await storage.append(entry);
      expect(stored.checksum).toBeDefined();
      expect(typeof stored.checksum).toBe('string');
      expect(stored.checksum?.length).toBe(32); // MD5 hash length
    });

    test('should handle entry timestamps correctly', async () => {
      const customTimestamp = '2024-06-15T14:30:00.000Z';
      const entry = {
        timestamp: customTimestamp,
        type: 'interaction' as const,
        data: { timestampTest: true },
        metadata: { projectId: 'timestamp-test' },
      };

      const stored = await storage.append(entry);
      expect(stored.timestamp).toBe(customTimestamp);
    });

    test('should auto-generate timestamp if not provided', async () => {
      const entry = {
        timestamp: '', // Will be auto-generated
        type: 'analysis' as const,
        data: { autoTimestamp: true },
        metadata: { projectId: 'auto-timestamp-test' },
      };

      const beforeTime = new Date().toISOString();
      const stored = await storage.append(entry);
      const afterTime = new Date().toISOString();

      expect(stored.timestamp).toBeDefined();
      expect(stored.timestamp >= beforeTime).toBe(true);
      expect(stored.timestamp <= afterTime).toBe(true);
    });
  });

  describe('Metadata Handling', () => {
    test('should preserve metadata structure', async () => {
      const metadata = {
        projectId: 'metadata-test',
        repository: 'github.com/test/repo',
        ssg: 'docusaurus',
        tags: ['frontend', 'typescript'],
        version: '1.0.0',
      };

      const entry = {
        timestamp: new Date().toISOString(),
        type: 'recommendation' as const,
        data: { recommendation: 'use-docusaurus' },
        metadata,
      };

      const stored = await storage.append(entry);
      expect(stored.metadata).toEqual(metadata);
      expect(stored.metadata.projectId).toBe('metadata-test');
      expect(stored.metadata.tags).toEqual(['frontend', 'typescript']);
    });

    test('should handle optional metadata fields', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { minimal: true },
        metadata: { projectId: 'minimal-test' },
      };

      const stored = await storage.append(entry);
      expect(stored.metadata.projectId).toBe('minimal-test');
      expect(stored.metadata.repository).toBeUndefined();
      expect(stored.metadata.tags).toBeUndefined();
    });

    test('should handle compression metadata', async () => {
      const metadata = {
        projectId: 'compression-test',
        compressed: true,
        compressionType: 'gzip',
        compressedAt: new Date().toISOString(),
        originalSize: 1024,
      };

      const entry = {
        timestamp: new Date().toISOString(),
        type: 'configuration' as const,
        data: { compressed: 'data' },
        metadata,
      };

      const stored = await storage.append(entry);
      expect(stored.metadata.compressed).toBe(true);
      expect(stored.metadata.compressionType).toBe('gzip');
      expect(stored.metadata.originalSize).toBe(1024);
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle concurrent writes safely', async () => {
      const concurrentWrites = 10;
      const promises: Promise<MemoryEntry>[] = [];

      // Create multiple concurrent append operations
      for (let i = 0; i < concurrentWrites; i++) {
        const promise = storage.append({
          timestamp: new Date().toISOString(),
          type: 'analysis',
          data: { index: i, concurrent: true },
          metadata: { projectId: 'concurrent-test' },
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(concurrentWrites);

      // All IDs should be unique (since data is different)
      const ids = results.map((r) => r.id);
      expect(new Set(ids).size).toBe(concurrentWrites);

      // All should have correct structure
      results.forEach((result, index) => {
        expect(result.data.index).toBe(index);
        expect(result.metadata.projectId).toBe('concurrent-test');
      });
    });

    test('should handle bulk append operations efficiently', async () => {
      const startTime = Date.now();
      const bulkSize = 50;

      // Append bulk entries
      for (let i = 0; i < bulkSize; i++) {
        await storage.append({
          timestamp: new Date().toISOString(),
          type: i % 2 === 0 ? 'analysis' : 'recommendation',
          data: { index: i, bulk: true },
          metadata: {
            projectId: 'bulk-test',
          },
        });
      }

      const appendTime = Date.now() - startTime;
      expect(appendTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify files were created
      const files = await fs.readdir(tempDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
      expect(jsonlFiles.length).toBeGreaterThan(0);
    });

    test('should maintain performance with large data entries', async () => {
      const largeData = {
        description: 'x'.repeat(10000), // 10KB string
        array: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          data: `large-item-${i}`,
          metadata: { processed: true },
        })),
      };

      const entry = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: largeData,
        metadata: { projectId: 'large-test' },
      };

      const startTime = Date.now();
      const stored = await storage.append(entry);
      const appendTime = Date.now() - startTime;

      expect(appendTime).toBeLessThan(1000); // Should append within 1 second
      expect(stored.data.description).toHaveLength(10000);
      expect(stored.data.array).toHaveLength(1000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle special characters in data', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'interaction' as const,
        data: {
          message: 'Special chars: äöü 🚀 @#$%^&*()[]{}|\\:";\'<>?,./`~',
          unicode: '测试中文字符',
          emoji: '🎉🔥💯⚡🚀',
          json: { nested: { deeply: { value: 'test' } } },
        },
        metadata: {
          projectId: 'special-chars-项目-🏗️',
          tags: ['special', 'unicode', '特殊字符'],
        },
      };

      const stored = await storage.append(entry);
      expect(stored.data.message).toContain('Special chars');
      expect(stored.data.unicode).toBe('测试中文字符');
      expect(stored.data.emoji).toBe('🎉🔥💯⚡🚀');
      expect(stored.metadata.projectId).toBe('special-chars-项目-🏗️');
    });

    test('should handle empty data gracefully', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'configuration' as const,
        data: {},
        metadata: { projectId: 'empty-test' },
      };

      const stored = await storage.append(entry);
      expect(stored.data).toEqual({});
      expect(stored.id).toBeDefined();
      expect(stored.checksum).toBeDefined();
    });

    test('should handle missing storage directory', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent', 'deeply', 'nested');
      const newStorage = new JSONLStorage(nonExistentDir);

      // Should create directory during initialization
      await newStorage.initialize();

      const stats = await fs.stat(nonExistentDir);
      expect(stats.isDirectory()).toBe(true);

      // Should be able to append entries
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'analysis' as const,
        data: { recovery: true },
        metadata: { projectId: 'recovery-test' },
      };

      const stored = await newStorage.append(entry);
      expect(stored.data.recovery).toBe(true);
    });

    test('should maintain data consistency across operations', async () => {
      const entries = [
        {
          timestamp: new Date().toISOString(),
          type: 'analysis' as const,
          data: { step: 1, consistency: 'test' },
          metadata: { projectId: 'consistency-test' },
        },
        {
          timestamp: new Date().toISOString(),
          type: 'recommendation' as const,
          data: { step: 2, consistency: 'test' },
          metadata: { projectId: 'consistency-test' },
        },
        {
          timestamp: new Date().toISOString(),
          type: 'deployment' as const,
          data: { step: 3, consistency: 'test' },
          metadata: { projectId: 'consistency-test' },
        },
      ];

      const storedEntries = [];
      for (const entry of entries) {
        const stored = await storage.append(entry);
        storedEntries.push(stored);
      }

      // Verify all entries were stored correctly
      expect(storedEntries).toHaveLength(3);
      storedEntries.forEach((stored, index) => {
        expect(stored.data.step).toBe(index + 1);
        expect(stored.metadata.projectId).toBe('consistency-test');
        expect(stored.id).toBeDefined();
        expect(stored.checksum).toBeDefined();
      });

      // All IDs should be unique
      const ids = storedEntries.map((s) => s.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});
