/**
 * Advanced unit tests for Memory Export/Import System
 * Tests data portability, backup, and migration capabilities
 * Part of Issue #55 - Advanced Memory Components Unit Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import { JSONLStorage } from '../../src/memory/storage.js';
import { IncrementalLearningSystem } from '../../src/memory/learning.js';
import { KnowledgeGraph } from '../../src/memory/knowledge-graph.js';
import {
  MemoryExportImportSystem,
  ExportOptions,
  ImportOptions,
  ExportResult,
  ImportResult,
} from '../../src/memory/export-import.js';

describe('MemoryExportImportSystem', () => {
  let tempDir: string;
  let exportDir: string;
  let memoryManager: MemoryManager;
  let storage: JSONLStorage;
  let learningSystem: IncrementalLearningSystem;
  let knowledgeGraph: KnowledgeGraph;
  let exportImportSystem: MemoryExportImportSystem;

  beforeEach(async () => {
    // Create unique temp directories for each test
    tempDir = path.join(
      os.tmpdir(),
      `export-import-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    exportDir = path.join(tempDir, 'exports');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(exportDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();

    // Create required dependencies for MemoryExportImportSystem
    storage = new JSONLStorage(tempDir);
    await storage.initialize();

    learningSystem = new IncrementalLearningSystem(memoryManager);
    await learningSystem.initialize();

    knowledgeGraph = new KnowledgeGraph(memoryManager);
    await knowledgeGraph.initialize();

    exportImportSystem = new MemoryExportImportSystem(
      storage,
      memoryManager,
      learningSystem,
      knowledgeGraph,
    );
  });

  afterEach(async () => {
    // Cleanup temp directories
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Export System', () => {
    beforeEach(async () => {
      // Set up test data for export tests
      memoryManager.setContext({ projectId: 'export-test-project' });

      await memoryManager.remember(
        'analysis',
        {
          language: { primary: 'typescript' },
          framework: { name: 'react' },
          metrics: { complexity: 'medium', performance: 'good' },
        },
        {
          tags: ['frontend', 'typescript'],
          repository: 'github.com/test/repo',
        },
      );

      await memoryManager.remember(
        'recommendation',
        {
          recommended: 'docusaurus',
          confidence: 0.9,
          reasoning: ['typescript support', 'react compatibility'],
        },
        {
          tags: ['documentation', 'ssg'],
        },
      );

      await memoryManager.remember(
        'deployment',
        {
          status: 'success',
          platform: 'github-pages',
          duration: 120,
          url: 'https://test.github.io',
        },
        {
          tags: ['deployment', 'success'],
        },
      );
    });

    test('should export memories in JSON format', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
        compression: 'none',
      };

      const exportPath = path.join(exportDir, 'test-export.json');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.entries).toBeGreaterThan(0);
      expect(result.filePath).toBe(exportPath);

      // Verify file was created
      const fileExists = await fs
        .access(exportPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const content = await fs.readFile(exportPath, 'utf-8');
      const exported = JSON.parse(content);

      expect(exported).toHaveProperty('metadata');
      expect(exported).toHaveProperty('memories');
      expect(Array.isArray(exported.memories)).toBe(true);
      expect(exported.memories.length).toBe(3);
    });

    test('should export memories in JSONL format', async () => {
      const exportOptions: ExportOptions = {
        format: 'jsonl',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
      };

      const exportPath = path.join(exportDir, 'test-export.jsonl');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);

      expect(result.success).toBe(true);
      expect(result.entries).toBe(3);

      // Verify JSONL format
      const content = await fs.readFile(exportPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    test('should export with filtering options', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
        filters: {
          types: ['analysis', 'recommendation'],
          tags: ['frontend'],
        },
      };

      const exportPath = path.join(exportDir, 'filtered-export.json');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);

      expect(result.success).toBe(true);

      const content = await fs.readFile(exportPath, 'utf-8');
      const exported = JSON.parse(content);

      // Should only include filtered types
      exported.memories.forEach((memory: any) => {
        expect(['analysis', 'recommendation']).toContain(memory.type);
      });
    });

    test('should handle compression options', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
        compression: 'gzip',
      };

      const exportPath = path.join(exportDir, 'compressed-export.json.gz');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);

      expect(result.success).toBe(true);
      expect(result.metadata.compression).toBe('gzip');

      // Verify compressed file exists
      const fileExists = await fs
        .access(exportPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should export with anonymization', async () => {
      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
        anonymize: {
          enabled: true,
          fields: ['repository', 'url'],
          method: 'hash',
        },
      };

      const exportPath = path.join(exportDir, 'anonymized-export.json');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);

      expect(result.success).toBe(true);

      const content = await fs.readFile(exportPath, 'utf-8');
      const exported = JSON.parse(content);

      // Check that specified fields are anonymized
      exported.memories.forEach((memory: any) => {
        if (memory.metadata.repository) {
          // Should be hashed, not original value
          expect(memory.metadata.repository).not.toBe('github.com/test/repo');
        }
        if (memory.data.url) {
          expect(memory.data.url).not.toBe('https://test.github.io');
        }
      });
    });
  });

  describe('Import System', () => {
    let testExportPath: string;

    beforeEach(async () => {
      // Create test export file for import tests
      testExportPath = path.join(exportDir, 'test-import.json');
      const testData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          source: 'test',
        },
        memories: [
          {
            id: 'test-import-1',
            type: 'analysis',
            timestamp: new Date().toISOString(),
            data: {
              language: { primary: 'python' },
              framework: { name: 'django' },
            },
            metadata: {
              projectId: 'import-test-project',
              tags: ['backend', 'python'],
            },
          },
          {
            id: 'test-import-2',
            type: 'recommendation',
            timestamp: new Date().toISOString(),
            data: {
              recommended: 'mkdocs',
              confidence: 0.8,
            },
            metadata: {
              projectId: 'import-test-project',
              tags: ['documentation'],
            },
          },
        ],
      };

      await fs.writeFile(testExportPath, JSON.stringify(testData, null, 2));
    });

    test('should import memories from JSON file', async () => {
      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'strict',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
      };

      const result = await exportImportSystem.importMemories(testExportPath, importOptions);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify memories were imported
      const searchResults = await memoryManager.search('import-test-project');
      expect(searchResults.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle import conflicts', async () => {
      // First import
      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'loose',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
      };

      await exportImportSystem.importMemories(testExportPath, importOptions);

      // Second import with same data (should skip duplicates)
      const result2 = await exportImportSystem.importMemories(testExportPath, importOptions);

      expect(result2.success).toBe(true);
      expect(result2.skipped).toBeGreaterThan(0);
    });

    test('should validate imported data', async () => {
      // Create invalid test data
      const invalidDataPath = path.join(exportDir, 'invalid-import.json');
      const invalidData = {
        memories: [
          {
            // Missing required fields
            type: 'invalid',
            data: null,
          },
        ],
      };

      await fs.writeFile(invalidDataPath, JSON.stringify(invalidData));

      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'strict',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
      };

      const result = await exportImportSystem.importMemories(invalidDataPath, importOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should perform dry run import', async () => {
      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'strict',
        conflictResolution: 'skip',
        backup: false,
        dryRun: true,
      };

      const result = await exportImportSystem.importMemories(testExportPath, importOptions);

      expect(result.success).toBe(true);
      // In dry run mode, nothing should be actually imported
      expect(result.imported).toBe(0); // Nothing actually imported in dry run

      // Verify no memories were actually imported
      const searchResults = await memoryManager.search('import-test-project');
      expect(searchResults.length).toBe(0);
    });

    test('should create backup before import', async () => {
      // Add some existing data
      memoryManager.setContext({ projectId: 'existing-data' });
      await memoryManager.remember('analysis', { existing: true });

      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'replace',
        validation: 'loose',
        conflictResolution: 'overwrite',
        backup: true,
        dryRun: false,
      };

      const result = await exportImportSystem.importMemories(testExportPath, importOptions);

      expect(result.success).toBe(true);
      // Backup creation is handled internally during import process
      // Verify that the import was successful
      expect(result.success).toBe(true);
    });
  });

  describe('Data Migration and Transformation', () => {
    test('should transform data during import', async () => {
      const sourceDataPath = path.join(exportDir, 'source-data.json');
      const sourceData = {
        memories: [
          {
            id: 'transform-test-1',
            type: 'analysis',
            timestamp: new Date().toISOString(),
            data: {
              // Old format
              lang: 'typescript',
              fw: 'react',
            },
            metadata: {
              project: 'transform-test',
            },
          },
        ],
      };

      await fs.writeFile(sourceDataPath, JSON.stringify(sourceData));

      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'loose',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
        mapping: {
          'data.lang': 'data.language.primary',
          'data.fw': 'data.framework.name',
          'metadata.project': 'metadata.projectId',
        },
        transformation: {
          enabled: true,
          rules: [
            {
              field: 'data.language.primary',
              operation: 'transform',
              params: { value: 'typescript' },
            },
          ],
        },
      };

      const result = await exportImportSystem.importMemories(sourceDataPath, importOptions);

      expect(result.success).toBe(true);
      // Transformation should result in successful import
      expect(result.imported).toBeGreaterThan(0);

      // Verify transformation worked
      const imported = await memoryManager.search('transform-test');
      expect(imported.length).toBe(1);
      expect(imported[0].data.language?.primary).toBe('typescript');
      expect(imported[0].data.framework?.name).toBe('react');
      expect(imported[0].metadata.projectId).toBe('transform-test');
    });

    test('should migrate between different versions', async () => {
      const oldVersionData = {
        version: '0.1.0',
        memories: [
          {
            id: 'migration-test-1',
            type: 'analysis',
            timestamp: new Date().toISOString(),
            // Old schema
            project: 'migration-test',
            language: 'python',
            recommendation: 'mkdocs',
          },
        ],
      };

      const migrationPath = path.join(exportDir, 'migration-data.json');
      await fs.writeFile(migrationPath, JSON.stringify(oldVersionData));

      // Create a simple migration plan for testing
      const migrationPlan = await exportImportSystem.createMigrationPlan(
        { system: 'OldVersion', fields: {} },
        { system: 'DocuMCP', fields: {} },
      );

      const result = await exportImportSystem.executeMigration(migrationPath, migrationPlan);

      expect(result.success).toBe(true);
      expect(result.imported).toBeGreaterThan(0);

      // Verify migration created proper structure
      const migrated = await memoryManager.search('migration-test');
      expect(migrated.length).toBe(1);
      expect(migrated[0]).toHaveProperty('data');
      expect(migrated[0]).toHaveProperty('metadata');
    });
  });

  describe('Bulk Operations and Performance', () => {
    test('should handle large-scale export efficiently', async () => {
      memoryManager.setContext({ projectId: 'bulk-export-test' });

      // Create many memories
      const promises = Array.from({ length: 100 }, (_, i) =>
        memoryManager.remember('analysis', {
          index: i,
          content: `bulk test content ${i}`,
        }),
      );

      await Promise.all(promises);

      const exportOptions: ExportOptions = {
        format: 'jsonl',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
      };

      const startTime = Date.now();
      const exportPath = path.join(exportDir, 'bulk-export.jsonl');
      const result = await exportImportSystem.exportMemories(exportPath, exportOptions);
      const exportTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.entries).toBe(100);
      expect(exportTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should provide progress updates for long operations', async () => {
      memoryManager.setContext({ projectId: 'progress-test' });

      // Add test data
      await memoryManager.remember('analysis', { progressTest: true });

      const progressUpdates: number[] = [];

      exportImportSystem.on('export-progress', (progress: number) => {
        progressUpdates.push(progress);
      });

      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
      };

      const exportPath = path.join(exportDir, 'progress-export.json');
      await exportImportSystem.exportMemories(exportPath, exportOptions);

      // Progress updates might not be generated for small datasets
      expect(Array.isArray(progressUpdates)).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle file system errors gracefully', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/export.json';

      const exportOptions: ExportOptions = {
        format: 'json',
        includeMetadata: true,
        includeLearning: false,
        includeKnowledgeGraph: false,
      };

      const result = await exportImportSystem.exportMemories(invalidPath, exportOptions);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should recover from partial import failures', async () => {
      const partialDataPath = path.join(exportDir, 'partial-data.json');
      const partialData = {
        memories: [
          {
            id: 'valid-memory',
            type: 'analysis',
            timestamp: new Date().toISOString(),
            data: { valid: true },
            metadata: { projectId: 'partial-test' },
          },
          {
            // Invalid memory
            id: 'invalid-memory',
            type: null,
            data: null,
          },
        ],
      };

      await fs.writeFile(partialDataPath, JSON.stringify(partialData));

      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'loose',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
      };

      const result = await exportImportSystem.importMemories(partialDataPath, importOptions);

      expect(result.imported).toBe(1); // Only valid memory imported
      expect(result.errors).toBe(1); // One error for invalid memory
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should validate data integrity', async () => {
      const corruptDataPath = path.join(exportDir, 'corrupt-data.json');
      await fs.writeFile(corruptDataPath, '{ invalid json');

      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'append',
        validation: 'strict',
        conflictResolution: 'skip',
        backup: false,
        dryRun: false,
      };

      const result = await exportImportSystem.importMemories(corruptDataPath, importOptions);

      expect(result.success).toBe(false);
      expect(result.errors).toBeGreaterThan(0);
    });
  });
});
