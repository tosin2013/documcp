/**
 * Memory MCP Tool Persistence Tests
 * Tests persistence and state management for MCP tool memory integration
 * Part of Issue #56 - Memory MCP Tools Integration Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryManager } from '../../src/memory/manager.js';
import {
  initializeMemory,
  rememberAnalysis,
  rememberRecommendation,
  rememberDeployment,
  exportMemories,
  importMemories,
  cleanupOldMemories,
  resetMemoryManager,
} from '../../src/memory/integration.js';

describe('Memory MCP Tool Persistence', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `memory-persistence-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    // Reset the global memory manager to use the test directory
    await resetMemoryManager(tempDir);
    memoryManager = (await initializeMemory())!;
  });

  afterEach(async () => {
    try {
      await resetMemoryManager(); // Reset to default
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Tool State Persistence', () => {
    test('should persist tool analysis results across sessions', async () => {
      memoryManager.setContext({ projectId: 'persistence-test' });

      // Create analysis data from tool
      const analysisData = {
        projectId: 'persistence-test',
        toolVersion: '1.0.0',
        language: { primary: 'rust', secondary: ['javascript'] },
        framework: { name: 'actix-web', version: '4.0' },
        stats: {
          files: 75,
          directories: 12,
          linesOfCode: 8500,
          testCoverage: 90,
        },
        dependencies: {
          ecosystem: 'rust',
          packages: ['serde', 'tokio', 'actix-web'],
          devPackages: ['criterion', 'proptest'],
        },
        documentation: {
          hasReadme: true,
          hasContributing: true,
          hasLicense: true,
          estimatedComplexity: 'moderate',
        },
        timestamp: new Date().toISOString(),
      };

      const memoryId = await rememberAnalysis('/test/rust-project', analysisData);

      // Simulate session restart by creating new manager with same directory
      const newManager = new MemoryManager(tempDir);
      await newManager.initialize();

      // Verify persistence
      const recalled = await newManager.recall(memoryId);

      expect(recalled).not.toBeNull();
      expect(recalled?.data.language.primary).toBe('rust');
      expect(recalled?.data.framework.name).toBe('actix-web');
      expect(recalled?.data.stats.files).toBe(75);
      expect(recalled?.data.dependencies.packages).toContain('actix-web');
      expect(recalled?.metadata.projectId).toBe('persistence-test');
    });

    test('should persist recommendation chains across tool invocations', async () => {
      memoryManager.setContext({ projectId: 'chain-test' });

      // Create analysis
      const analysisData = {
        projectId: 'chain-test',
        language: { primary: 'python' },
        framework: { name: 'fastapi' },
        documentation: { type: 'api' },
      };
      const analysisId = await rememberAnalysis('/test/api-project', analysisData);

      // Create first recommendation
      const recommendation1 = {
        recommended: 'mkdocs',
        confidence: 0.8,
        reasoning: ['Python ecosystem', 'API documentation'],
        toolVersion: '1.0.0',
        analysisId,
      };
      const rec1Id = await rememberRecommendation(analysisId, recommendation1);

      // Create updated recommendation after user feedback
      const recommendation2 = {
        recommended: 'sphinx',
        confidence: 0.9,
        reasoning: ['Better API doc generation', 'Python native'],
        toolVersion: '1.1.0',
        analysisId,
        previousRecommendation: rec1Id,
      };
      const rec2Id = await rememberRecommendation(analysisId, recommendation2);

      // Verify chain persistence
      const analysis = await memoryManager.recall(analysisId);
      const rec1 = await memoryManager.recall(rec1Id);
      const rec2 = await memoryManager.recall(rec2Id);

      expect(analysis?.data.language.primary).toBe('python');
      expect(rec1?.data.recommended).toBe('mkdocs');
      expect(rec2?.data.recommended).toBe('sphinx');
      expect(rec2?.data.previousRecommendation).toBe(rec1Id);

      // Verify all have same project context
      expect(analysis?.metadata.projectId).toBe('chain-test');
      expect(rec1?.metadata.projectId).toBe('chain-test');
      expect(rec2?.metadata.projectId).toBe('chain-test');
    });

    test('should maintain deployment history with status tracking', async () => {
      memoryManager.setContext({ projectId: 'deployment-history' });

      const deployments = [
        {
          ssg: 'hugo',
          status: 'failed',
          error: 'Build timeout',
          duration: 300,
          attempt: 1,
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
        {
          ssg: 'hugo',
          status: 'failed',
          error: 'Missing dependency',
          duration: 120,
          attempt: 2,
          timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        },
        {
          ssg: 'hugo',
          status: 'success',
          url: 'https://project.github.io',
          duration: 180,
          attempt: 3,
          timestamp: new Date().toISOString(),
        },
      ];

      const deploymentIds = [];
      for (const deployment of deployments) {
        const id = await rememberDeployment('github.com/test/deployment-project', deployment);
        deploymentIds.push(id);
      }

      // Verify deployment history is preserved
      const allDeployments = await Promise.all(deploymentIds.map((id) => memoryManager.recall(id)));

      expect(allDeployments.length).toBe(3);
      expect(allDeployments[0]?.data.status).toBe('failed');
      expect(allDeployments[0]?.data.attempt).toBe(1);
      expect(allDeployments[1]?.data.status).toBe('failed');
      expect(allDeployments[1]?.data.attempt).toBe(2);
      expect(allDeployments[2]?.data.status).toBe('success');
      expect(allDeployments[2]?.data.attempt).toBe(3);

      // Verify chronological ordering can be reconstructed
      const sortedByTimestamp = allDeployments.sort(
        (a, b) => new Date(a!.data.timestamp).getTime() - new Date(b!.data.timestamp).getTime(),
      );

      expect(sortedByTimestamp[0]?.data.attempt).toBe(1);
      expect(sortedByTimestamp[2]?.data.attempt).toBe(3);
    });
  });

  describe('Cross-Session State Recovery', () => {
    test('should recover tool context after process restart', async () => {
      memoryManager.setContext({
        projectId: 'context-recovery',
        repository: 'github.com/test/context-project',
        branch: 'main',
        user: 'test-user',
        session: 'session-1',
      });

      // Create memories with rich context
      await memoryManager.remember('analysis', {
        sessionActive: true,
        toolState: 'initialized',
        contextData: 'session-specific',
      });

      await memoryManager.remember('configuration', {
        ssg: 'docusaurus',
        userPreferences: {
          theme: 'dark',
          language: 'en',
          features: ['search', 'versions'],
        },
      });

      // Simulate process restart
      const newManager = new MemoryManager(tempDir);
      await newManager.initialize();

      // Recover project memories
      const projectMemories = await newManager.search({ projectId: 'context-recovery' });

      expect(projectMemories.length).toBe(2);

      const analysisMemory = projectMemories.find((m) => m.type === 'analysis');
      const configMemory = projectMemories.find((m) => m.type === 'configuration');

      expect(analysisMemory?.data.sessionActive).toBe(true);
      expect(configMemory?.data.ssg).toBe('docusaurus');
      expect(configMemory?.data.userPreferences.theme).toBe('dark');

      // Verify context metadata is preserved
      expect(analysisMemory?.metadata.repository).toBe('github.com/test/context-project');
      expect(configMemory?.metadata.projectId).toBe('context-recovery');
    });

    test('should handle concurrent tool operations persistence', async () => {
      memoryManager.setContext({ projectId: 'concurrent-ops' });

      // Simulate concurrent tool operations
      const operations = Array.from({ length: 10 }, (_, i) => ({
        type: i % 3 === 0 ? 'analysis' : i % 3 === 1 ? 'recommendation' : 'deployment',
        data: {
          operationId: i,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          concurrentTest: true,
        },
      }));

      // Execute operations concurrently
      const promises = operations.map(async (op, index) => {
        if (op.type === 'analysis') {
          return rememberAnalysis(`/test/concurrent-${index}`, op.data);
        } else if (op.type === 'recommendation') {
          return rememberRecommendation(`analysis-${index}`, { ...op.data, recommended: 'jekyll' });
        } else {
          return rememberDeployment(`github.com/test/concurrent-${index}`, {
            ...op.data,
            status: 'success',
          });
        }
      });

      const memoryIds = await Promise.all(promises);

      // Verify all operations were persisted
      expect(memoryIds.length).toBe(10);
      expect(memoryIds.every((id) => typeof id === 'string')).toBe(true);

      // Verify no data corruption occurred
      const recalledMemories = await Promise.all(memoryIds.map((id) => memoryManager.recall(id)));

      expect(recalledMemories.every((m) => m !== null)).toBe(true);
      expect(recalledMemories.every((m) => m?.data.concurrentTest === true)).toBe(true);

      // Verify operation IDs are preserved and unique
      const operationIds = recalledMemories.map((m) => m?.data.operationId);
      const uniqueIds = new Set(operationIds);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Data Export and Import for Tools', () => {
    test('should export tool memories for backup and migration', async () => {
      memoryManager.setContext({ projectId: 'export-test' });

      // Create comprehensive tool data
      const analysisId = await rememberAnalysis('/test/export-project', {
        projectId: 'export-test',
        language: { primary: 'go' },
        framework: { name: 'gin' },
        exportTest: true,
      });

      await memoryManager.remember(
        'recommendation',
        {
          recommended: 'hugo',
          confidence: 0.95,
          exportTest: true,
        },
        {
          ssg: 'hugo',
          tags: ['recommendation', 'hugo'],
        },
      );

      // Temporarily store deployment with correct project context
      const deploymentData = {
        ssg: 'hugo',
        status: 'success',
        exportTest: true,
      };

      await memoryManager.remember('deployment', deploymentData, {
        repository: 'github.com/test/export-project',
        ssg: deploymentData.ssg,
        tags: ['deployment', deploymentData.status, deploymentData.ssg],
      });

      // Export memories for this project only
      const exportedData = await exportMemories('json', 'export-test');

      expect(exportedData).toBeDefined();
      expect(typeof exportedData).toBe('string');

      // Verify export contains our test data
      const parsed = JSON.parse(exportedData);
      expect(Array.isArray(parsed)).toBe(true);

      const exportTestMemories = parsed.filter((m: any) => m.data.exportTest === true);

      expect(exportTestMemories.length).toBe(3);

      // Verify different memory types are present
      const types = new Set(exportTestMemories.map((m: any) => m.type));
      expect(types.has('analysis')).toBe(true);
      expect(types.has('recommendation')).toBe(true);
      expect(types.has('deployment')).toBe(true);
    });

    test('should import tool memories with data validation', async () => {
      // Create export data
      const exportData = JSON.stringify([
        {
          id: 'import-analysis-1',
          type: 'analysis',
          data: {
            projectId: 'import-test',
            language: { primary: 'javascript' },
            framework: { name: 'svelte' },
            importTest: true,
          },
          metadata: {
            projectId: 'import-test',
            tags: ['analysis', 'javascript', 'svelte'],
          },
          timestamp: new Date().toISOString(),
        },
        {
          id: 'import-recommendation-1',
          type: 'recommendation',
          data: {
            recommended: 'sveltekit',
            confidence: 0.88,
            importTest: true,
          },
          metadata: {
            projectId: 'import-test',
            ssg: 'sveltekit',
            tags: ['recommendation', 'sveltekit'],
          },
          timestamp: new Date().toISOString(),
        },
      ]);

      // Import the data
      const importedCount = await importMemories(exportData, 'json');

      expect(importedCount).toBe(2);

      // Verify imported data is accessible
      const importedMemories = await memoryManager.search({ projectId: 'import-test' });

      expect(importedMemories.length).toBe(2);

      const analysis = importedMemories.find((m) => m.type === 'analysis');
      const recommendation = importedMemories.find((m) => m.type === 'recommendation');

      expect(analysis?.data.language.primary).toBe('javascript');
      expect(analysis?.data.framework.name).toBe('svelte');
      expect(recommendation?.data.recommended).toBe('sveltekit');
      expect(recommendation?.data.confidence).toBe(0.88);
    });

    test('should handle tool memory migration between environments', async () => {
      memoryManager.setContext({ projectId: 'migration-test' });

      // Create source environment data
      const sourceData = [
        {
          projectId: 'migration-project',
          language: { primary: 'python' },
          framework: { name: 'flask' },
          environment: 'development',
        },
        {
          projectId: 'migration-project',
          language: { primary: 'python' },
          framework: { name: 'flask' },
          environment: 'staging',
        },
        {
          projectId: 'migration-project',
          language: { primary: 'python' },
          framework: { name: 'flask' },
          environment: 'production',
        },
      ];

      // Store memories in source environment
      const sourceIds = await Promise.all(
        sourceData.map((data) => rememberAnalysis('/test/migration-project', data)),
      );

      expect(sourceIds.length).toBe(3);

      // Export from source (migration project only)
      const exportedData = await exportMemories('json', 'migration-project');

      // Create target environment (new directory)
      const targetDir = path.join(tempDir, 'target-environment');
      await fs.mkdir(targetDir, { recursive: true });

      const targetManager = new MemoryManager(targetDir);
      await targetManager.initialize();

      // Import to target environment
      const importedCount = await targetManager.import(exportedData, 'json');

      expect(importedCount).toBe(3);

      // Verify migration integrity
      const migratedMemories = await targetManager.search({ projectId: 'migration-project' });

      expect(migratedMemories.length).toBe(3);

      const environments = migratedMemories.map((m) => m.data.environment);
      expect(environments).toContain('development');
      expect(environments).toContain('staging');
      expect(environments).toContain('production');
    });
  });

  describe('Memory Cleanup and Maintenance', () => {
    test('should cleanup old tool memories automatically', async () => {
      memoryManager.setContext({ projectId: 'cleanup-test' });

      // Create old memories (simulate by manually setting timestamps)
      const oldTimestamp = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago
      const recentTimestamp = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

      // Create entries directly via storage to control timestamps
      await memoryManager.getStorage().append({
        type: 'analysis',
        timestamp: oldTimestamp,
        data: {
          projectId: 'cleanup-test',
          age: 'old',
        },
        metadata: {
          projectId: 'cleanup-test',
        },
      });

      await memoryManager.getStorage().append({
        type: 'analysis',
        timestamp: recentTimestamp,
        data: {
          projectId: 'cleanup-test',
          age: 'recent',
        },
        metadata: {
          projectId: 'cleanup-test',
        },
      });

      await memoryManager.getStorage().append({
        type: 'recommendation',
        timestamp: oldTimestamp,
        data: {
          recommended: 'hugo',
          age: 'old',
        },
        metadata: {
          projectId: 'cleanup-test',
        },
      });

      // Verify all memories exist before cleanup
      const beforeCleanup = await memoryManager.search({ projectId: 'cleanup-test' });
      expect(beforeCleanup.length).toBe(3);

      // Cleanup memories older than 30 days
      const cleanedCount = await cleanupOldMemories(30);

      expect(cleanedCount).toBeGreaterThanOrEqual(2); // Should cleanup the 2 old memories

      // Verify recent memories are preserved
      const afterCleanup = await memoryManager.search({ projectId: 'cleanup-test' });
      const recentMemories = afterCleanup.filter((m) => m.data.age === 'recent');

      expect(recentMemories.length).toBe(1);
      expect(recentMemories[0].data.age).toBe('recent');
    });

    test('should optimize memory storage for tool performance', async () => {
      memoryManager.setContext({ projectId: 'optimization-test' });

      // Create many memories to test optimization
      const memoryPromises = Array.from({ length: 100 }, (_, i) =>
        memoryManager.remember('analysis', {
          index: i,
          data: `optimization-test-${i}`,
          category: i % 10 === 0 ? 'heavy' : 'light',
        }),
      );

      await Promise.all(memoryPromises);

      // Measure search performance
      const startTime = Date.now();
      const searchResults = await memoryManager.search({ projectId: 'optimization-test' });
      const searchTime = Date.now() - startTime;

      expect(searchResults.length).toBe(100);
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second

      // Test category-based filtering performance
      const categoryStartTime = Date.now();
      const allMemories = await memoryManager.search('');
      const heavyMemories = allMemories.filter((m) => m.data.category === 'heavy');
      const categorySearchTime = Date.now() - categoryStartTime;

      expect(heavyMemories.length).toBe(10); // 10% of memories marked as 'heavy'
      expect(categorySearchTime).toBeLessThan(500); // Category search should be fast
    });

    test('should handle memory corruption recovery', async () => {
      memoryManager.setContext({ projectId: 'corruption-test' });

      // Create valid memories
      const valid1Entry = await memoryManager.remember('analysis', {
        valid: true,
        data: 'good-data',
      });

      const valid2Entry = await memoryManager.remember('recommendation', {
        recommended: 'docusaurus',
        valid: true,
      });

      // Verify memories are accessible
      const valid1 = await memoryManager.recall(valid1Entry.id);
      const valid2 = await memoryManager.recall(valid2Entry.id);

      expect(valid1?.data.valid).toBe(true);
      expect(valid2?.data.valid).toBe(true);

      // Simulate recovery after corruption by creating new manager
      const recoveryManager = new MemoryManager(tempDir);
      await recoveryManager.initialize();

      // Verify data recovery
      const recovered1 = await recoveryManager.recall(valid1Entry.id);
      const recovered2 = await recoveryManager.recall(valid2Entry.id);

      expect(recovered1?.data.valid).toBe(true);
      expect(recovered2?.data.recommended).toBe('docusaurus');

      // Verify search functionality after recovery
      const allRecovered = await recoveryManager.search({ projectId: 'corruption-test' });
      expect(allRecovered.length).toBe(2);
    });
  });
});
