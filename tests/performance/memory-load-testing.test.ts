/**
 * Memory System Performance and Load Testing
 * Tests performance, scalability, and resource usage of memory system
 * Part of Issue #57 - Memory System Performance and Load Testing
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { performance } from "perf_hooks";
import { MemoryManager } from "../../src/memory/manager.js";
import { EnhancedMemoryManager } from "../../src/memory/enhanced-manager.js";
import { IncrementalLearningSystem } from "../../src/memory/learning.js";
import { KnowledgeGraph } from "../../src/memory/knowledge-graph.js";
import {
  initializeMemory,
  rememberAnalysis,
  rememberRecommendation,
  getSimilarProjects,
} from "../../src/memory/integration.js";

interface PerformanceMetrics {
  operationTime: number;
  memoryUsed: number;
  operationsPerSecond: number;
  throughput: number;
}

describe("Memory System Performance and Load Testing", () => {
  let tempDir: string;
  let memoryManager: MemoryManager;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `memory-performance-test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
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

  function measurePerformance<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    return new Promise(async (resolve) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const result = await operation();

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      const operationTime = endTime - startTime;
      const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

      resolve({
        result,
        metrics: {
          operationTime,
          memoryUsed,
          operationsPerSecond: 1000 / operationTime,
          throughput: 1000 / operationTime,
        },
      });
    });
  }

  describe("Basic Operations Performance", () => {
    test("should perform single memory operations efficiently", async () => {
      memoryManager.setContext({ projectId: "performance-single" });

      const testData = {
        projectId: "performance-single",
        language: { primary: "typescript" },
        framework: { name: "react" },
        stats: { files: 100, lines: 10000 },
      };

      const { metrics: createMetrics } = await measurePerformance(async () => {
        return await memoryManager.remember("analysis", testData);
      });

      const memoryId = (await memoryManager.remember("analysis", testData)).id;

      const { metrics: readMetrics } = await measurePerformance(async () => {
        return await memoryManager.recall(memoryId);
      });

      const { metrics: searchMetrics } = await measurePerformance(async () => {
        return await memoryManager.search({ projectId: "performance-single" });
      });

      // Performance expectations (adjust based on system capabilities)
      expect(createMetrics.operationTime).toBeLessThan(100); // 100ms
      expect(readMetrics.operationTime).toBeLessThan(50); // 50ms
      expect(searchMetrics.operationTime).toBeLessThan(100); // 100ms

      // Memory usage should be reasonable
      expect(createMetrics.memoryUsed).toBeLessThan(10 * 1024 * 1024); // 10MB
      expect(readMetrics.memoryUsed).toBeLessThan(1 * 1024 * 1024); // 1MB

      console.log("Single Operation Performance:");
      console.log(
        `Create: ${createMetrics.operationTime.toFixed(2)}ms, Memory: ${(
          createMetrics.memoryUsed / 1024
        ).toFixed(2)}KB`,
      );
      console.log(
        `Read: ${readMetrics.operationTime.toFixed(2)}ms, Memory: ${(
          readMetrics.memoryUsed / 1024
        ).toFixed(2)}KB`,
      );
      console.log(
        `Search: ${searchMetrics.operationTime.toFixed(2)}ms, Memory: ${(
          searchMetrics.memoryUsed / 1024
        ).toFixed(2)}KB`,
      );
    });

    test("should handle batch operations efficiently", async () => {
      memoryManager.setContext({ projectId: "performance-batch" });

      const batchSize = 100;
      const testData = Array.from({ length: batchSize }, (_, i) => ({
        projectId: "performance-batch",
        index: i,
        language: { primary: i % 2 === 0 ? "typescript" : "javascript" },
        framework: {
          name: i % 3 === 0 ? "react" : i % 3 === 1 ? "vue" : "angular",
        },
        stats: { files: 10 + i, lines: 1000 + i * 100 },
      }));

      const { metrics: batchCreateMetrics } = await measurePerformance(
        async () => {
          const promises = testData.map((data) =>
            memoryManager.remember("analysis", data),
          );
          return await Promise.all(promises);
        },
      );

      const { metrics: batchSearchMetrics } = await measurePerformance(
        async () => {
          return await memoryManager.search({ projectId: "performance-batch" });
        },
      );

      // Batch operations should be efficient
      expect(batchCreateMetrics.operationTime).toBeLessThan(5000); // 5 seconds for 100 items
      expect(batchSearchMetrics.operationTime).toBeLessThan(1000); // 1 second to search 100 items

      // Calculate throughput
      const createThroughput =
        batchSize / (batchCreateMetrics.operationTime / 1000);
      const searchThroughput =
        batchSize / (batchSearchMetrics.operationTime / 1000);

      expect(createThroughput).toBeGreaterThan(20); // At least 20 ops/sec
      expect(searchThroughput).toBeGreaterThan(100); // At least 100 searches/sec

      console.log("Batch Operation Performance:");
      console.log(
        `Create ${batchSize} items: ${batchCreateMetrics.operationTime.toFixed(
          2,
        )}ms (${createThroughput.toFixed(2)} ops/sec)`,
      );
      console.log(
        `Search ${batchSize} items: ${batchSearchMetrics.operationTime.toFixed(
          2,
        )}ms (${searchThroughput.toFixed(2)} ops/sec)`,
      );
    });
  });

  describe("Scalability Testing", () => {
    test("should scale linearly with data size", async () => {
      memoryManager.setContext({ projectId: "scalability-test" });

      const testSizes = [10, 50, 100, 500];
      const results: Array<{
        size: number;
        createTime: number;
        searchTime: number;
      }> = [];

      for (const size of testSizes) {
        const testData = Array.from({ length: size }, (_, i) => ({
          projectId: "scalability-test",
          index: i,
          data: `test-data-${i}`,
          timestamp: new Date().toISOString(),
        }));

        // Measure creation time
        const { metrics: createMetrics } = await measurePerformance(
          async () => {
            const promises = testData.map((data) =>
              memoryManager.remember("analysis", data),
            );
            return await Promise.all(promises);
          },
        );

        // Measure search time
        const { metrics: searchMetrics } = await measurePerformance(
          async () => {
            return await memoryManager.search({
              projectId: "scalability-test",
            });
          },
        );

        results.push({
          size,
          createTime: createMetrics.operationTime,
          searchTime: searchMetrics.operationTime,
        });
      }

      // Verify roughly linear scaling (allow for some variance)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];

        const sizeRatio = curr.size / prev.size;
        const createTimeRatio = curr.createTime / prev.createTime;
        const searchTimeRatio = curr.searchTime / prev.searchTime;

        // Create time should scale roughly linearly (within 3x of size ratio)
        expect(createTimeRatio).toBeLessThan(sizeRatio * 3);

        // Search time should not degrade too badly (within 2x of size ratio)
        expect(searchTimeRatio).toBeLessThan(sizeRatio * 2);
      }

      console.log("Scalability Results:");
      results.forEach((result) => {
        console.log(
          `Size ${result.size}: Create ${result.createTime.toFixed(
            2,
          )}ms, Search ${result.searchTime.toFixed(2)}ms`,
        );
      });
    });

    test("should handle large individual memories efficiently", async () => {
      memoryManager.setContext({ projectId: "large-memory-test" });

      const sizes = [
        { name: "small", data: "x".repeat(1000) }, // 1KB
        { name: "medium", data: "x".repeat(10000) }, // 10KB
        { name: "large", data: "x".repeat(100000) }, // 100KB
        { name: "xlarge", data: "x".repeat(1000000) }, // 1MB
      ];

      const results: Array<{
        name: string;
        createTime: number;
        readTime: number;
      }> = [];

      for (const size of sizes) {
        const testData = {
          projectId: "large-memory-test",
          size: size.name,
          content: size.data,
          metadata: { size: size.data.length },
        };

        // Measure creation time
        const { result: memory, metrics: createMetrics } =
          await measurePerformance(async () => {
            return await memoryManager.remember("analysis", testData);
          });

        // Measure read time
        const { metrics: readMetrics } = await measurePerformance(async () => {
          return await memoryManager.recall(memory.id);
        });

        results.push({
          name: size.name,
          createTime: createMetrics.operationTime,
          readTime: readMetrics.operationTime,
        });

        // Large memories should still be handled within reasonable time
        expect(createMetrics.operationTime).toBeLessThan(5000); // 5 seconds
        expect(readMetrics.operationTime).toBeLessThan(1000); // 1 second
      }

      console.log("Large Memory Performance:");
      results.forEach((result) => {
        console.log(
          `${result.name}: Create ${result.createTime.toFixed(
            2,
          )}ms, Read ${result.readTime.toFixed(2)}ms`,
        );
      });
    });
  });

  describe("Concurrent Operations Performance", () => {
    test("should handle concurrent read/write operations", async () => {
      memoryManager.setContext({ projectId: "concurrent-test" });

      // Pre-populate with some data
      const initialData = Array.from({ length: 50 }, (_, i) => ({
        projectId: "concurrent-test",
        index: i,
        data: `initial-data-${i}`,
      }));

      const initialMemories = await Promise.all(
        initialData.map((data) => memoryManager.remember("analysis", data)),
      );

      const concurrentOperations = 20;

      const { metrics: concurrentMetrics } = await measurePerformance(
        async () => {
          const operations = Array.from(
            { length: concurrentOperations },
            async (_, i) => {
              if (i % 3 === 0) {
                // Create new memory
                return await memoryManager.remember("analysis", {
                  projectId: "concurrent-test",
                  index: 100 + i,
                  data: `concurrent-data-${i}`,
                });
              } else if (i % 3 === 1) {
                // Read existing memory
                const randomMemory =
                  initialMemories[
                    Math.floor(Math.random() * initialMemories.length)
                  ];
                return await memoryManager.recall(randomMemory.id);
              } else {
                // Search memories
                return await memoryManager.search({
                  projectId: "concurrent-test",
                });
              }
            },
          );

          return await Promise.all(operations);
        },
      );

      expect(concurrentMetrics.operationTime).toBeLessThan(3000); // 3 seconds for 20 concurrent ops

      const throughput =
        concurrentOperations / (concurrentMetrics.operationTime / 1000);
      expect(throughput).toBeGreaterThan(5); // At least 5 concurrent ops/sec

      console.log("Concurrent Operations Performance:");
      console.log(
        `${concurrentOperations} concurrent ops: ${concurrentMetrics.operationTime.toFixed(
          2,
        )}ms (${throughput.toFixed(2)} ops/sec)`,
      );
    });

    test("should maintain performance under sustained load", async () => {
      memoryManager.setContext({ projectId: "sustained-load-test" });

      const testDuration = 3000; // 3 seconds
      const operationInterval = 100; // Every 100ms
      const results: number[] = [];

      const startTime = Date.now();
      let operationCount = 0;

      while (Date.now() - startTime < testDuration) {
        const { metrics } = await measurePerformance(async () => {
          return await memoryManager.remember("analysis", {
            projectId: "sustained-load-test",
            index: operationCount++,
            timestamp: Date.now(),
            data: `sustained-load-data-${operationCount}`,
          });
        });

        results.push(metrics.operationTime);

        // Wait for next interval
        await new Promise((resolve) => setTimeout(resolve, operationInterval));
      }

      const avgTime =
        results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);

      // Performance should remain consistent under sustained load
      expect(avgTime).toBeLessThan(200); // Average operation time < 200ms
      expect(maxTime).toBeLessThan(1000); // No single operation > 1 second

      // Performance degradation should be minimal
      const firstHalf = results.slice(0, Math.floor(results.length / 2));
      const secondHalf = results.slice(Math.floor(results.length / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      const degradation = secondHalfAvg / firstHalfAvg;
      expect(degradation).toBeLessThan(2); // Less than 2x degradation

      console.log("Sustained Load Performance:");
      console.log(
        `Operations: ${results.length}, Avg: ${avgTime.toFixed(
          2,
        )}ms, Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`,
      );
      console.log(
        `Performance degradation: ${((degradation - 1) * 100).toFixed(1)}%`,
      );
    });
  });

  describe("Memory Resource Usage", () => {
    test("should manage memory usage efficiently", async () => {
      memoryManager.setContext({ projectId: "memory-usage-test" });

      const initialMemory = process.memoryUsage();
      const memorySnapshots: Array<{ count: number; heapUsed: number }> = [];

      // Add memories in batches and monitor memory usage
      for (let batch = 0; batch < 10; batch++) {
        const batchSize = 100;
        const batchData = Array.from({ length: batchSize }, (_, i) => ({
          projectId: "memory-usage-test",
          batch,
          index: i,
          data: "x".repeat(1000), // 1KB per memory
          timestamp: new Date().toISOString(),
        }));

        await Promise.all(
          batchData.map((data) => memoryManager.remember("analysis", data)),
        );

        const currentMemory = process.memoryUsage();
        memorySnapshots.push({
          count: (batch + 1) * batchSize,
          heapUsed: currentMemory.heapUsed - initialMemory.heapUsed,
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Memory usage should be reasonable
      const finalMemoryUsage = memorySnapshots[memorySnapshots.length - 1];
      const memoryPerItem = finalMemoryUsage.heapUsed / finalMemoryUsage.count;

      expect(memoryPerItem).toBeLessThan(50 * 1024); // Less than 50KB per memory item (including overhead)
      expect(finalMemoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total

      console.log("Memory Usage Analysis:");
      console.log(
        `Total items: ${finalMemoryUsage.count}, Total memory: ${(
          finalMemoryUsage.heapUsed /
          1024 /
          1024
        ).toFixed(2)}MB`,
      );
      console.log(`Memory per item: ${(memoryPerItem / 1024).toFixed(2)}KB`);
    });

    test("should not leak memory on cleanup operations", async () => {
      memoryManager.setContext({ projectId: "memory-leak-test" });

      const initialMemory = process.memoryUsage();

      // Create and delete memories multiple times
      for (let cycle = 0; cycle < 5; cycle++) {
        const memories = [];

        // Create memories
        for (let i = 0; i < 100; i++) {
          const memory = await memoryManager.remember("analysis", {
            projectId: "memory-leak-test",
            cycle,
            index: i,
            data: "x".repeat(1000),
          });
          memories.push(memory);
        }

        // Delete all memories
        for (const memory of memories) {
          await memoryManager.forget(memory.id);
        }

        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryDifference = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory usage should return close to initial levels
      expect(memoryDifference).toBeLessThan(15 * 1024 * 1024); // Less than 15MB difference

      console.log("Memory Leak Test:");
      console.log(
        `Memory difference: ${(memoryDifference / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });

  describe("Enhanced Components Performance", () => {
    test("should benchmark enhanced memory manager performance", async () => {
      const enhancedTempDir = path.join(tempDir, "enhanced");
      await fs.mkdir(enhancedTempDir, { recursive: true });

      const enhancedManager = new EnhancedMemoryManager(enhancedTempDir);
      await enhancedManager.initialize();

      enhancedManager.setContext({ projectId: "enhanced-performance" });

      const projectFeatures: import("../../src/memory/learning.js").ProjectFeatures =
        {
          language: "typescript",
          framework: "react",
          size: "medium",
          complexity: "moderate",
          hasTests: true,
          hasCI: true,
          hasDocs: true,
          isOpenSource: true,
        };

      const baseRecommendation = {
        recommended: "docusaurus",
        confidence: 0.8,
        score: 0.85,
      };

      // Benchmark enhanced recommendation
      const { metrics: enhancedMetrics } = await measurePerformance(
        async () => {
          return await enhancedManager.getEnhancedRecommendation(
            "/test/enhanced-performance",
            baseRecommendation,
            projectFeatures,
          );
        },
      );

      expect(enhancedMetrics.operationTime).toBeLessThan(5000); // 5 seconds

      // Benchmark intelligent analysis
      const analysisData = {
        language: "typescript",
        framework: "react",
        size: "medium",
        hasTests: true,
        hasCI: true,
      };

      const { metrics: analysisMetrics } = await measurePerformance(
        async () => {
          return await enhancedManager.getIntelligentAnalysis(
            "/test/enhanced-performance",
            analysisData,
          );
        },
      );

      expect(analysisMetrics.operationTime).toBeLessThan(3000); // 3 seconds

      console.log("Enhanced Components Performance:");
      console.log(
        `Enhanced recommendation: ${enhancedMetrics.operationTime.toFixed(
          2,
        )}ms`,
      );
      console.log(
        `Intelligent analysis: ${analysisMetrics.operationTime.toFixed(2)}ms`,
      );
    });

    test("should benchmark learning system performance", async () => {
      const learningTempDir = path.join(tempDir, "learning");
      await fs.mkdir(learningTempDir, { recursive: true });

      const tempLearningManager = new MemoryManager(learningTempDir);
      await tempLearningManager.initialize();
      const learningSystem = new IncrementalLearningSystem(tempLearningManager);
      await learningSystem.initialize();

      const projectFeatures: import("../../src/memory/learning.js").ProjectFeatures =
        {
          language: "python",
          framework: "django",
          size: "large",
          complexity: "complex",
          hasTests: true,
          hasCI: true,
          hasDocs: false,
          isOpenSource: true,
        };

      const baseRecommendation = {
        recommended: "sphinx",
        confidence: 0.7,
      };

      // Add training data through memory manager (learning system learns from stored memories)
      for (let i = 0; i < 50; i++) {
        await tempLearningManager.remember("analysis", {
          ...projectFeatures,
          index: i,
          feedback: {
            rating: 3 + (i % 3),
            helpful: i % 2 === 0,
            comments: `Training feedback ${i}`,
          },
        });
      }

      // Benchmark improved recommendation
      const { metrics: improveMetrics } = await measurePerformance(async () => {
        return await learningSystem.getImprovedRecommendation(
          projectFeatures,
          baseRecommendation,
        );
      });

      expect(improveMetrics.operationTime).toBeLessThan(1000); // 1 second

      // Benchmark pattern detection
      const { metrics: patternMetrics } = await measurePerformance(async () => {
        return await learningSystem.getPatterns();
      });

      expect(patternMetrics.operationTime).toBeLessThan(2000); // 2 seconds

      console.log("Learning System Performance:");
      console.log(
        `Improved recommendation: ${improveMetrics.operationTime.toFixed(2)}ms`,
      );
      console.log(
        `Pattern detection: ${patternMetrics.operationTime.toFixed(2)}ms`,
      );
    });

    test("should benchmark knowledge graph performance", async () => {
      const graphTempDir = path.join(tempDir, "graph");
      await fs.mkdir(graphTempDir, { recursive: true });

      const tempGraphManager = new MemoryManager(graphTempDir);
      await tempGraphManager.initialize();
      const knowledgeGraph = new KnowledgeGraph(tempGraphManager);
      await knowledgeGraph.initialize();

      // Add nodes and edges
      const nodeCount = 100;
      const edgeCount = 200;

      const { metrics: buildMetrics } = await measurePerformance(async () => {
        // Add nodes
        for (let i = 0; i < nodeCount; i++) {
          knowledgeGraph.addNode({
            id: `node-${i}`,
            type:
              i % 3 === 0 ? "project" : i % 3 === 1 ? "technology" : "pattern",
            label: `Node ${i}`,
            weight: 1.0,
            properties: {
              name: `Node ${i}`,
              category: i % 5 === 0 ? "frontend" : "backend",
            },
          });
        }

        // Add edges
        for (let i = 0; i < edgeCount; i++) {
          const sourceId = `node-${Math.floor(Math.random() * nodeCount)}`;
          const targetId = `node-${Math.floor(Math.random() * nodeCount)}`;

          if (sourceId !== targetId) {
            knowledgeGraph.addEdge({
              source: sourceId,
              target: targetId,
              type: i % 2 === 0 ? "uses" : "similar_to",
              weight: Math.random(),
              properties: {},
              confidence: Math.random(),
            });
          }
        }
      });

      expect(buildMetrics.operationTime).toBeLessThan(5000); // 5 seconds to build graph

      // Benchmark pathfinding
      const { metrics: pathMetrics } = await measurePerformance(async () => {
        return knowledgeGraph.findPath("node-0", "node-50");
      });

      expect(pathMetrics.operationTime).toBeLessThan(500); // 500ms for pathfinding

      // Benchmark node queries (using available methods)
      const { metrics: queryMetrics } = await measurePerformance(async () => {
        return knowledgeGraph.getAllNodes();
      });

      expect(queryMetrics.operationTime).toBeLessThan(1000); // 1 second for node queries

      console.log("Knowledge Graph Performance:");
      console.log(
        `Build graph (${nodeCount} nodes, ${edgeCount} edges): ${buildMetrics.operationTime.toFixed(
          2,
        )}ms`,
      );
      console.log(`Find path: ${pathMetrics.operationTime.toFixed(2)}ms`);
      console.log(`Nodes query: ${queryMetrics.operationTime.toFixed(2)}ms`);
    });
  });

  describe("Integration Performance", () => {
    test("should benchmark MCP integration performance", async () => {
      // Test memory integration functions
      const analysisData = {
        projectId: "integration-performance",
        language: { primary: "go" },
        framework: { name: "gin" },
        stats: { files: 200, lines: 50000 },
      };

      const { metrics: analysisMetrics } = await measurePerformance(
        async () => {
          return await rememberAnalysis(
            "/test/integration-performance",
            analysisData,
          );
        },
      );

      const { metrics: recommendationMetrics } = await measurePerformance(
        async () => {
          return await rememberRecommendation("analysis-id", {
            recommended: "hugo",
            confidence: 0.9,
          });
        },
      );

      const { metrics: similarMetrics } = await measurePerformance(async () => {
        return await getSimilarProjects(analysisData, 5);
      });

      expect(analysisMetrics.operationTime).toBeLessThan(1000); // 1 second
      expect(recommendationMetrics.operationTime).toBeLessThan(1000); // 1 second
      expect(similarMetrics.operationTime).toBeLessThan(2000); // 2 seconds

      console.log("MCP Integration Performance:");
      console.log(
        `Remember analysis: ${analysisMetrics.operationTime.toFixed(2)}ms`,
      );
      console.log(
        `Remember recommendation: ${recommendationMetrics.operationTime.toFixed(
          2,
        )}ms`,
      );
      console.log(
        `Get similar projects: ${similarMetrics.operationTime.toFixed(2)}ms`,
      );
    });
  });
});
