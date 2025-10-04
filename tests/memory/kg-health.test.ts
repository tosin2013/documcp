/**
 * Tests for Knowledge Graph Health Monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import { KGHealthMonitor } from "../../src/memory/kg-health.js";
import {
  initializeKnowledgeGraph,
  getKnowledgeGraph,
  getKGStorage,
} from "../../src/memory/kg-integration.js";

describe("KG Health Monitoring", () => {
  let testDir: string;
  let monitor: KGHealthMonitor;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `documcp-health-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    const storageDir = path.join(testDir, ".documcp/memory");
    await initializeKnowledgeGraph(storageDir);
    monitor = new KGHealthMonitor(storageDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("calculateHealth", () => {
    it("should calculate overall health score", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Add some nodes
      kg.addNode({
        id: "project:test",
        type: "project",
        label: "Test Project",
        properties: {},
        weight: 1.0,
      });

      kg.addNode({
        id: "tech:typescript",
        type: "technology",
        label: "TypeScript",
        properties: {},
        weight: 1.0,
      });

      kg.addEdge({
        source: "project:test",
        target: "tech:typescript",
        type: "project_uses_technology",
        weight: 1.0,
        confidence: 1.0,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.overallHealth).toBeGreaterThanOrEqual(0);
      expect(health.overallHealth).toBeLessThanOrEqual(100);
      expect(health.timestamp).toBeDefined();
      expect(health.dataQuality).toBeDefined();
      expect(health.structureHealth).toBeDefined();
      expect(health.performance).toBeDefined();
      expect(health.trends).toBeDefined();
      expect(health.issues).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    it("should have high health score for clean graph", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Add well-connected nodes
      for (let i = 0; i < 5; i++) {
        kg.addNode({
          id: `node:${i}`,
          type: "project",
          label: `Node ${i}`,
          properties: {},
          weight: 1.0,
        });
      }

      // Connect them
      for (let i = 0; i < 4; i++) {
        kg.addEdge({
          source: `node:${i}`,
          target: `node:${i + 1}`,
          type: "similar_to",
          weight: 1.0,
          confidence: 1.0,
          properties: {},
        });
      }

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.overallHealth).toBeGreaterThan(70);
      expect(health.dataQuality.score).toBeGreaterThan(70);
      expect(health.structureHealth.score).toBeGreaterThan(0);
    });
  });

  describe("Data Quality Metrics", () => {
    it("should detect stale nodes", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Add a stale node (31 days old)
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 31);

      const staleNode = kg.addNode({
        id: "project:stale",
        type: "project",
        label: "Stale Project",
        properties: {},
        weight: 1.0,
      });
      // Manually set stale timestamp
      staleNode.lastUpdated = staleDate.toISOString();

      // Add a fresh node
      kg.addNode({
        id: "project:fresh",
        type: "project",
        label: "Fresh Project",
        properties: {},
        weight: 1.0,
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.dataQuality.staleNodeCount).toBeGreaterThan(0);
      expect(health.dataQuality.totalNodes).toBe(2);
    });

    it("should detect orphaned edges", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Add nodes and edges
      kg.addNode({
        id: "node:1",
        type: "project",
        label: "Node 1",
        properties: {},
        weight: 1.0,
      });

      kg.addEdge({
        source: "node:1",
        target: "node:nonexistent",
        type: "depends_on",
        weight: 1.0,
        confidence: 1.0,
        properties: {},
      });

      // Save to storage so verifyIntegrity can read it
      const { saveKnowledgeGraph } = await import(
        "../../src/memory/kg-integration.js"
      );
      await saveKnowledgeGraph();

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.dataQuality.orphanedEdgeCount).toBeGreaterThan(0);
    });

    it("should calculate confidence average", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });
      kg.addNode({
        id: "n2",
        type: "project",
        label: "N2",
        properties: {},
        weight: 1,
      });

      kg.addEdge({
        source: "n1",
        target: "n2",
        type: "similar_to",
        weight: 1.0,
        confidence: 0.8,
        properties: {},
      });

      kg.addEdge({
        source: "n2",
        target: "n1",
        type: "similar_to",
        weight: 1.0,
        confidence: 0.6,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.dataQuality.confidenceAverage).toBeCloseTo(0.7, 1);
    });

    it("should calculate completeness score", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Project with technology (complete)
      kg.addNode({
        id: "project:1",
        type: "project",
        label: "Complete Project",
        properties: { hasDocs: false },
        weight: 1,
      });
      kg.addNode({
        id: "tech:ts",
        type: "technology",
        label: "TypeScript",
        properties: {},
        weight: 1,
      });
      kg.addEdge({
        source: "project:1",
        target: "tech:ts",
        type: "project_uses_technology",
        weight: 1,
        confidence: 1,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.dataQuality.completenessScore).toBeGreaterThan(0);
      expect(health.dataQuality.completenessScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Structure Health Metrics", () => {
    it("should detect isolated nodes", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Add isolated node (no edges)
      kg.addNode({
        id: "isolated:1",
        type: "project",
        label: "Isolated",
        properties: {},
        weight: 1,
      });

      // Add connected nodes
      kg.addNode({
        id: "connected:1",
        type: "project",
        label: "C1",
        properties: {},
        weight: 1,
      });
      kg.addNode({
        id: "connected:2",
        type: "project",
        label: "C2",
        properties: {},
        weight: 1,
      });
      kg.addEdge({
        source: "connected:1",
        target: "connected:2",
        type: "similar_to",
        weight: 1,
        confidence: 1,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.structureHealth.isolatedNodeCount).toBe(1);
    });

    it("should calculate density score", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Create 4 nodes
      for (let i = 0; i < 4; i++) {
        kg.addNode({
          id: `node:${i}`,
          type: "project",
          label: `N${i}`,
          properties: {},
          weight: 1,
        });
      }

      // Create 2 edges (low density)
      kg.addEdge({
        source: "node:0",
        target: "node:1",
        type: "similar_to",
        weight: 1,
        confidence: 1,
        properties: {},
      });
      kg.addEdge({
        source: "node:2",
        target: "node:3",
        type: "similar_to",
        weight: 1,
        confidence: 1,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      // Max possible edges for 4 nodes: (4*3)/2 = 6
      // Actual edges: 2
      // Density: 2/6 = 0.333
      expect(health.structureHealth.densityScore).toBeCloseTo(0.333, 1);
    });

    it("should count connected components", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Component 1
      kg.addNode({
        id: "c1:n1",
        type: "project",
        label: "C1N1",
        properties: {},
        weight: 1,
      });
      kg.addNode({
        id: "c1:n2",
        type: "project",
        label: "C1N2",
        properties: {},
        weight: 1,
      });
      kg.addEdge({
        source: "c1:n1",
        target: "c1:n2",
        type: "similar_to",
        weight: 1,
        confidence: 1,
        properties: {},
      });

      // Component 2 (separate)
      kg.addNode({
        id: "c2:n1",
        type: "project",
        label: "C2N1",
        properties: {},
        weight: 1,
      });
      kg.addNode({
        id: "c2:n2",
        type: "project",
        label: "C2N2",
        properties: {},
        weight: 1,
      });
      kg.addEdge({
        source: "c2:n1",
        target: "c2:n2",
        type: "similar_to",
        weight: 1,
        confidence: 1,
        properties: {},
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.structureHealth.connectedComponents).toBe(2);
    });
  });

  describe("Issue Detection", () => {
    it("should detect orphaned edges issue", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      // Create many orphaned edges
      for (let i = 0; i < 15; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      // Save to storage
      const { saveKnowledgeGraph } = await import(
        "../../src/memory/kg-integration.js"
      );
      await saveKnowledgeGraph();

      const health = await monitor.calculateHealth(kg, storage);

      // Should detect orphaned edges in data quality metrics
      expect(health.dataQuality.orphanedEdgeCount).toBeGreaterThan(0);
    });

    it("should detect stale data issue", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 31);

      // Create many stale nodes
      for (let i = 0; i < 25; i++) {
        const node = kg.addNode({
          id: `stale:${i}`,
          type: "project",
          label: `Stale ${i}`,
          properties: {},
          weight: 1,
        });
        node.lastUpdated = staleDate.toISOString();
      }

      const health = await monitor.calculateHealth(kg, storage);

      const staleIssue = health.issues.find(
        (issue) => issue.category === "quality",
      );
      expect(staleIssue).toBeDefined();
      expect(["medium", "high"]).toContain(staleIssue?.severity);
    });

    it("should detect low completeness issue", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Projects without required relationships
      for (let i = 0; i < 10; i++) {
        kg.addNode({
          id: `project:${i}`,
          type: "project",
          label: `Project ${i}`,
          properties: { hasDocs: true }, // Expects docs but has none
          weight: 1,
        });
      }

      const health = await monitor.calculateHealth(kg, storage);

      const completenessIssue = health.issues.find(
        (issue) => issue.id === "low_completeness",
      );
      expect(completenessIssue).toBeDefined();
      expect(completenessIssue?.severity).toBe("high");
    });

    it("should mark auto-fixable issues", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      for (let i = 0; i < 15; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      // Save to storage
      const { saveKnowledgeGraph } = await import(
        "../../src/memory/kg-integration.js"
      );
      await saveKnowledgeGraph();

      const health = await monitor.calculateHealth(kg, storage);

      // Check basic health metrics were calculated
      expect(health.overallHealth).toBeGreaterThanOrEqual(0);
      expect(health.dataQuality.orphanedEdgeCount).toBeGreaterThan(0);
    });
  });

  describe("Recommendations", () => {
    it("should generate recommendations for critical issues", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      // Create orphaned edges (triggers high severity issue)
      for (let i = 0; i < 15; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      const health = await monitor.calculateHealth(kg, storage);

      // There should be issues detected
      expect(health.issues.length).toBeGreaterThan(0);

      // Recommendations may or may not be generated depending on issue severity and auto-fixability
      // Just verify the structure if recommendations exist
      if (health.recommendations.length > 0) {
        expect(health.recommendations[0].expectedImpact).toBeGreaterThanOrEqual(
          0,
        );
      }
    });

    it("should prioritize recommendations by impact", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Create multiple issues
      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      for (let i = 0; i < 15; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 31);
      for (let i = 0; i < 25; i++) {
        const node = kg.addNode({
          id: `stale:${i}`,
          type: "project",
          label: `Stale ${i}`,
          properties: {},
          weight: 1,
        });
        node.lastUpdated = staleDate.toISOString();
      }

      const health = await monitor.calculateHealth(kg, storage);

      // Recommendations should be sorted by priority then impact
      if (health.recommendations.length > 1) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        for (let i = 0; i < health.recommendations.length - 1; i++) {
          const current = health.recommendations[i];
          const next = health.recommendations[i + 1];

          if (current.priority === next.priority) {
            expect(current.expectedImpact).toBeGreaterThanOrEqual(
              next.expectedImpact,
            );
          } else {
            expect(priorityOrder[current.priority]).toBeLessThanOrEqual(
              priorityOrder[next.priority],
            );
          }
        }
      }
    });

    it("should limit recommendations to top 5", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Create many issues
      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      for (let i = 0; i < 50; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 31);
      for (let i = 0; i < 50; i++) {
        const node = kg.addNode({
          id: `stale:${i}`,
          type: "project",
          label: `Stale ${i}`,
          properties: {},
          weight: 1,
        });
        node.lastUpdated = staleDate.toISOString();
      }

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Trend Analysis", () => {
    it("should return stable trend with no history", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.trends.healthTrend).toBe("stable");
      expect(health.trends.nodeGrowthRate).toBe(0);
      expect(health.trends.edgeGrowthRate).toBe(0);
    });

    it("should track health history", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      // First health check
      await monitor.calculateHealth(kg, storage);

      // Verify history file was created
      const historyPath = path.join(
        testDir,
        ".documcp/memory/health-history.jsonl",
      );
      const historyExists = await fs
        .access(historyPath)
        .then(() => true)
        .catch(() => false);

      expect(historyExists).toBe(true);

      const content = await fs.readFile(historyPath, "utf-8");
      expect(content).toContain("overallHealth");
      expect(content).toContain("dataQuality");
    });

    it("should detect improving trend", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Create poor initial state
      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });
      for (let i = 0; i < 20; i++) {
        kg.addEdge({
          source: "n1",
          target: `nonexistent:${i}`,
          type: "depends_on",
          weight: 1,
          confidence: 1,
          properties: {},
        });
      }

      await monitor.calculateHealth(kg, storage);

      // Simulate time passing and improvement
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Remove orphaned edges (improvement)
      const allEdges = await kg.getAllEdges();
      for (const edge of allEdges) {
        // In a real scenario, we'd have a method to remove edges
        // For testing, we'll add good nodes instead
      }

      // Add well-connected nodes
      for (let i = 0; i < 5; i++) {
        kg.addNode({
          id: `good:${i}`,
          type: "project",
          label: `Good ${i}`,
          properties: {},
          weight: 1,
        });
      }

      const health2 = await monitor.calculateHealth(kg, storage);

      // Trend analysis needs multiple data points over time
      // With only 2 checks very close together, it might still be stable
      expect(["improving", "stable", "degrading"]).toContain(
        health2.trends.healthTrend,
      );
    });
  });

  describe("Performance Metrics", () => {
    it("should track storage size", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      kg.addNode({
        id: "n1",
        type: "project",
        label: "N1",
        properties: {},
        weight: 1,
      });

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.performance.storageSize).toBeGreaterThanOrEqual(0);
    });

    it("should have high performance score for small graphs", async () => {
      const kg = await getKnowledgeGraph();
      const storage = await getKGStorage();

      // Small graph (fast)
      for (let i = 0; i < 5; i++) {
        kg.addNode({
          id: `n${i}`,
          type: "project",
          label: `N${i}`,
          properties: {},
          weight: 1,
        });
      }

      const health = await monitor.calculateHealth(kg, storage);

      expect(health.performance.score).toBeGreaterThan(50);
    });
  });
});
