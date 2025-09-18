/**
 * Memory System Stress Testing
 * Tests memory system under extreme conditions and edge cases
 * Part of Issue #57 - Memory System Performance and Load Testing
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { performance } from 'perf_hooks';
import { MemoryManager } from '../../src/memory/manager.js';
import { JSONLStorage } from '../../src/memory/storage.js';

describe('Memory System Stress Testing', () => {
  let tempDir: string;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `memory-stress-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    memoryManager = new MemoryManager(tempDir);
    await memoryManager.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('High Volume Stress Tests', () => {
    test('should handle extremely large datasets', async () => {
      memoryManager.setContext({ projectId: 'extreme-volume-test' });

      const largeDatasetSize = 10000; // 10K memories
      const batchSize = 1000;
      const startTime = performance.now();

      console.log(`Starting extreme volume test with ${largeDatasetSize} memories...`);

      let processedCount = 0;
      for (let batch = 0; batch < largeDatasetSize / batchSize; batch++) {
        const batchData = Array.from({ length: batchSize }, (_, i) => ({
          projectId: 'extreme-volume-test',
          batch,
          index: i,
          globalIndex: processedCount + i,
          data: `stress-test-data-${processedCount + i}`,
          timestamp: new Date().toISOString(),
          metadata: {
            batch,
            processingOrder: processedCount + i,
            complexity: i % 5,
          },
        }));

        // Process batch
        const batchPromises = batchData.map((data) => memoryManager.remember('analysis', data));

        await Promise.all(batchPromises);
        processedCount += batchSize;

        // Progress update
        if (batch % 2 === 0) {
          const elapsed = performance.now() - startTime;
          const rate = processedCount / (elapsed / 1000);
          console.log(
            `Processed ${processedCount}/${largeDatasetSize} memories (${rate.toFixed(
              0,
            )} memories/sec)`,
          );
        }

        // Verify memory usage doesn't spiral out of control
        const memUsage = process.memoryUsage();
        expect(memUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageRate = largeDatasetSize / (totalTime / 1000);

      console.log(
        `Completed ${largeDatasetSize} memories in ${(totalTime / 1000).toFixed(
          2,
        )}s (${averageRate.toFixed(0)} memories/sec)`,
      );

      // Verify all memories were stored
      const allMemories = await memoryManager.search({ projectId: 'extreme-volume-test' });
      expect(allMemories.length).toBe(largeDatasetSize);

      // Performance expectations
      expect(totalTime).toBeLessThan(300000); // Should complete within 5 minutes
      expect(averageRate).toBeGreaterThan(30); // At least 30 memories per second
    }, 360000); // 6 minute timeout

    test('should handle rapid burst operations', async () => {
      memoryManager.setContext({ projectId: 'burst-test' });

      const burstSize = 1000;
      const burstCount = 5;
      const burstResults: number[] = [];

      console.log(`Testing ${burstCount} bursts of ${burstSize} operations each...`);

      for (let burst = 0; burst < burstCount; burst++) {
        const burstStartTime = performance.now();

        // Create burst data
        const burstData = Array.from({ length: burstSize }, (_, i) => ({
          projectId: 'burst-test',
          burst,
          index: i,
          data: `burst-${burst}-item-${i}`,
          timestamp: new Date().toISOString(),
        }));

        // Execute burst
        const burstPromises = burstData.map((data) => memoryManager.remember('analysis', data));

        await Promise.all(burstPromises);

        const burstEndTime = performance.now();
        const burstTime = burstEndTime - burstStartTime;
        burstResults.push(burstTime);

        console.log(
          `Burst ${burst + 1}: ${burstTime.toFixed(2)}ms (${(
            burstSize /
            (burstTime / 1000)
          ).toFixed(0)} ops/sec)`,
        );

        // Small delay between bursts
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Analyze burst performance consistency
      const avgBurstTime = burstResults.reduce((sum, time) => sum + time, 0) / burstResults.length;
      const maxBurstTime = Math.max(...burstResults);
      const minBurstTime = Math.min(...burstResults);

      const performanceVariation = (maxBurstTime - minBurstTime) / avgBurstTime;

      console.log(
        `Burst analysis: Avg ${avgBurstTime.toFixed(2)}ms, Min ${minBurstTime.toFixed(
          2,
        )}ms, Max ${maxBurstTime.toFixed(2)}ms`,
      );
      console.log(`Performance variation: ${(performanceVariation * 100).toFixed(1)}%`);

      // Performance should be consistent across bursts
      expect(avgBurstTime).toBeLessThan(10000); // Average burst < 10 seconds
      expect(performanceVariation).toBeLessThan(3); // Less than 300% variation
    });
  });

  describe('Resource Exhaustion Tests', () => {
    test('should handle memory pressure gracefully', async () => {
      memoryManager.setContext({ projectId: 'memory-pressure-test' });

      const largeItemSize = 1024 * 1024; // 1MB per item
      const maxItems = 100; // 100MB of data
      const memorySnapshots: Array<{ count: number; heapUsed: number; time: number }> = [];

      console.log('Testing memory pressure handling...');

      const startMemory = process.memoryUsage();
      const startTime = performance.now();

      for (let i = 0; i < maxItems; i++) {
        const largeData = {
          projectId: 'memory-pressure-test',
          index: i,
          payload: 'x'.repeat(largeItemSize),
          timestamp: new Date().toISOString(),
        };

        await memoryManager.remember('analysis', largeData);

        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          memorySnapshots.push({
            count: i + 1,
            heapUsed: currentMemory.heapUsed - startMemory.heapUsed,
            time: performance.now() - startTime,
          });

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }

        // Check for memory leaks - memory shouldn't grow unbounded
        const currentMemory = process.memoryUsage();
        const memoryUsed = currentMemory.heapUsed - startMemory.heapUsed;

        // Allow for reasonable memory growth but prevent runaway usage
        const expectedMaxMemory = (i + 1) * largeItemSize * 2; // 2x overhead allowance
        expect(memoryUsed).toBeLessThan(Math.max(expectedMaxMemory, 200 * 1024 * 1024)); // Max 200MB
      }

      const finalSnapshot = memorySnapshots[memorySnapshots.length - 1];
      console.log(
        `Memory pressure test: ${finalSnapshot.count} items, ${(
          finalSnapshot.heapUsed /
          1024 /
          1024
        ).toFixed(2)}MB used`,
      );

      // Verify data integrity under pressure
      const allMemories = await memoryManager.search({ projectId: 'memory-pressure-test' });
      expect(allMemories.length).toBe(maxItems);
    });

    test('should handle storage device pressure', async () => {
      memoryManager.setContext({ projectId: 'storage-pressure-test' });

      // Create many small files to stress the storage system
      const fileCount = 1000;
      const operationResults: boolean[] = [];

      console.log(`Testing storage pressure with ${fileCount} operations...`);

      for (let i = 0; i < fileCount; i++) {
        try {
          const data = {
            projectId: 'storage-pressure-test',
            index: i,
            data: `storage-pressure-item-${i}`,
            timestamp: new Date().toISOString(),
          };

          await memoryManager.remember('analysis', data);
          operationResults.push(true);

          if (i % 100 === 0) {
            console.log(`Storage operations completed: ${i + 1}/${fileCount}`);
          }
        } catch (error) {
          operationResults.push(false);
          console.error(`Storage operation ${i} failed:`, error);
        }
      }

      const successRate =
        operationResults.filter((result) => result).length / operationResults.length;
      console.log(`Storage pressure test: ${(successRate * 100).toFixed(1)}% success rate`);

      // Should handle most operations successfully
      expect(successRate).toBeGreaterThan(0.95); // At least 95% success rate

      // Verify storage integrity
      const storedMemories = await memoryManager.search({ projectId: 'storage-pressure-test' });
      expect(storedMemories.length).toBeGreaterThan(fileCount * 0.9); // At least 90% stored
    });
  });

  describe('Edge Case Stress Tests', () => {
    test('should handle extremely large individual memories', async () => {
      memoryManager.setContext({ projectId: 'large-individual-test' });

      const extremeSizes = [
        { name: 'huge', size: 5 * 1024 * 1024 }, // 5MB
        { name: 'massive', size: 10 * 1024 * 1024 }, // 10MB
        { name: 'gigantic', size: 25 * 1024 * 1024 }, // 25MB
      ];

      for (const testSize of extremeSizes) {
        console.log(
          `Testing ${testSize.name} memory (${(testSize.size / 1024 / 1024).toFixed(1)}MB)...`,
        );

        const startTime = performance.now();
        const largeData = {
          projectId: 'large-individual-test',
          size: testSize.name,
          payload: 'x'.repeat(testSize.size),
          metadata: { originalSize: testSize.size },
        };

        try {
          const memory = await memoryManager.remember('analysis', largeData);
          const createTime = performance.now() - startTime;

          // Verify storage
          const readStartTime = performance.now();
          const retrieved = await memoryManager.recall(memory.id);
          const readTime = performance.now() - readStartTime;

          expect(retrieved).not.toBeNull();
          expect(retrieved?.data.payload.length).toBe(testSize.size);

          console.log(
            `${testSize.name}: Create ${createTime.toFixed(2)}ms, Read ${readTime.toFixed(2)}ms`,
          );

          // Performance should be reasonable even for large items
          expect(createTime).toBeLessThan(30000); // 30 seconds max
          expect(readTime).toBeLessThan(10000); // 10 seconds max
        } catch (error) {
          console.error(`Failed to handle ${testSize.name} memory:`, error);
          throw error;
        }
      }
    });

    test('should handle deeply nested data structures', async () => {
      memoryManager.setContext({ projectId: 'nested-structure-test' });

      // Create deeply nested object
      const createNestedObject = (depth: number): any => {
        if (depth === 0) {
          return { value: 'leaf-node', depth: 0 };
        }
        return {
          level: depth,
          children: Array.from({ length: 3 }, (_, i) => ({
            id: `child-${depth}-${i}`,
            data: createNestedObject(depth - 1),
            metadata: { parent: depth, index: i },
          })),
          metadata: { depth, totalChildren: 3 },
        };
      };

      const testDepths = [10, 15, 20];

      for (const depth of testDepths) {
        console.log(`Testing nested structure depth ${depth}...`);

        const startTime = performance.now();
        const nestedData = {
          projectId: 'nested-structure-test',
          depth,
          structure: createNestedObject(depth),
          metadata: { maxDepth: depth, type: 'stress-test' },
        };

        try {
          const memory = await memoryManager.remember('analysis', nestedData);
          const createTime = performance.now() - startTime;

          // Verify retrieval
          const readStartTime = performance.now();
          const retrieved = await memoryManager.recall(memory.id);
          const readTime = performance.now() - readStartTime;

          expect(retrieved).not.toBeNull();
          expect(retrieved?.data.depth).toBe(depth);
          expect(retrieved?.data.structure.level).toBe(depth);

          console.log(
            `Depth ${depth}: Create ${createTime.toFixed(2)}ms, Read ${readTime.toFixed(2)}ms`,
          );

          // Should handle complex structures efficiently
          expect(createTime).toBeLessThan(5000); // 5 seconds max
          expect(readTime).toBeLessThan(2000); // 2 seconds max
        } catch (error) {
          console.error(`Failed to handle nested structure depth ${depth}:`, error);
          throw error;
        }
      }
    });

    test('should handle rapid context switching', async () => {
      const contextCount = 100;
      const operationsPerContext = 10;
      const totalOperations = contextCount * operationsPerContext;

      console.log(
        `Testing rapid context switching: ${contextCount} contexts, ${operationsPerContext} ops each...`,
      );

      const startTime = performance.now();
      const results: Array<{ context: string; operationTime: number }> = [];

      for (let context = 0; context < contextCount; context++) {
        const contextId = `rapid-context-${context}`;

        const contextStartTime = performance.now();
        memoryManager.setContext({ projectId: contextId });

        // Perform operations in this context
        const contextPromises = Array.from({ length: operationsPerContext }, async (_, i) => {
          return await memoryManager.remember('analysis', {
            projectId: contextId,
            contextIndex: context,
            operationIndex: i,
            data: `context-${context}-operation-${i}`,
            timestamp: new Date().toISOString(),
          });
        });

        await Promise.all(contextPromises);

        const contextTime = performance.now() - contextStartTime;
        results.push({ context: contextId, operationTime: contextTime });

        if (context % 20 === 0) {
          console.log(`Completed context ${context}/${contextCount}`);
        }
      }

      const totalTime = performance.now() - startTime;
      const avgContextTime = results.reduce((sum, r) => sum + r.operationTime, 0) / results.length;
      const totalRate = totalOperations / (totalTime / 1000);

      console.log(
        `Context switching test: ${(totalTime / 1000).toFixed(2)}s total, ${avgContextTime.toFixed(
          2,
        )}ms avg per context`,
      );
      console.log(`Overall rate: ${totalRate.toFixed(0)} operations/sec`);

      // Verify all operations completed
      const allMemories = await memoryManager.search('');
      expect(allMemories.length).toBeGreaterThanOrEqual(totalOperations * 0.95); // Allow for 5% loss

      // Performance should remain reasonable
      expect(totalTime).toBeLessThan(60000); // Complete within 1 minute
      expect(totalRate).toBeGreaterThan(50); // At least 50 ops/sec overall
    });
  });

  describe('Failure Recovery Stress Tests', () => {
    test('should recover from simulated storage failures', async () => {
      memoryManager.setContext({ projectId: 'storage-failure-test' });

      // Create initial data
      const initialMemories = [];
      for (let i = 0; i < 100; i++) {
        const memory = await memoryManager.remember('analysis', {
          projectId: 'storage-failure-test',
          index: i,
          data: `initial-data-${i}`,
          phase: 'before-failure',
        });
        initialMemories.push(memory);
      }

      // Simulate storage failure recovery by creating new manager instance
      const recoveryManager = new MemoryManager(tempDir);
      await recoveryManager.initialize();

      // Verify recovery
      const recoveredMemories = await recoveryManager.search({ projectId: 'storage-failure-test' });
      expect(recoveredMemories.length).toBe(100);

      // Continue operations after recovery
      recoveryManager.setContext({ projectId: 'storage-failure-test' });
      for (let i = 0; i < 50; i++) {
        await recoveryManager.remember('analysis', {
          projectId: 'storage-failure-test',
          index: 100 + i,
          data: `post-recovery-data-${i}`,
          phase: 'after-recovery',
        });
      }

      // Verify total state
      const finalMemories = await recoveryManager.search({ projectId: 'storage-failure-test' });
      expect(finalMemories.length).toBe(150);

      const beforeFailure = finalMemories.filter((m) => m.data.phase === 'before-failure');
      const afterRecovery = finalMemories.filter((m) => m.data.phase === 'after-recovery');

      expect(beforeFailure.length).toBe(100);
      expect(afterRecovery.length).toBe(50);

      console.log('Storage failure recovery test completed successfully');
    });

    test('should handle concurrent access corruption scenarios', async () => {
      memoryManager.setContext({ projectId: 'corruption-test' });

      const concurrentWorkers = 5;
      const operationsPerWorker = 100;
      const conflictData = Array.from({ length: concurrentWorkers }, (_, workerId) =>
        Array.from({ length: operationsPerWorker }, (_, opId) => ({
          projectId: 'corruption-test',
          workerId,
          operationId: opId,
          data: `worker-${workerId}-operation-${opId}`,
          timestamp: new Date().toISOString(),
        })),
      );

      console.log(
        `Testing concurrent access with ${concurrentWorkers} workers, ${operationsPerWorker} ops each...`,
      );

      // Execute concurrent operations that might cause conflicts
      const workerPromises = conflictData.map(async (workerData, workerId) => {
        const results = [];
        for (const data of workerData) {
          try {
            const memory = await memoryManager.remember('analysis', data);
            results.push({ success: true, id: memory.id });
          } catch (error) {
            results.push({ success: false, error: (error as Error).message });
          }
        }
        return { workerId, results };
      });

      const workerResults = await Promise.all(workerPromises);

      // Analyze results
      let totalOperations = 0;
      let successfulOperations = 0;

      workerResults.forEach(({ workerId, results }) => {
        const successful = results.filter((r) => r.success).length;
        totalOperations += results.length;
        successfulOperations += successful;

        console.log(`Worker ${workerId}: ${successful}/${results.length} operations successful`);
      });

      const successRate = successfulOperations / totalOperations;
      console.log(`Overall concurrent access success rate: ${(successRate * 100).toFixed(1)}%`);

      // Should handle most concurrent operations successfully
      expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate

      // Verify data integrity
      const allMemories = await memoryManager.search({ projectId: 'corruption-test' });
      expect(allMemories.length).toBeGreaterThanOrEqual(totalOperations * 0.85); // Allow for some conflicts
    });
  });
});
