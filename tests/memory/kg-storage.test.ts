/**
 * Tests for Knowledge Graph Storage
 * Phase 1: Core Knowledge Graph Integration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { KGStorage } from "../../src/memory/kg-storage.js";
import { GraphNode, GraphEdge } from "../../src/memory/knowledge-graph.js";
import { tmpdir } from "os";

describe("KGStorage", () => {
  let storage: KGStorage;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `kg-storage-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    storage = new KGStorage({
      storageDir: testDir,
      backupOnWrite: true,
      validateOnRead: true,
    });

    await storage.initialize();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }
  });

  describe("Initialization", () => {
    it("should create storage directory", async () => {
      const stats = await fs.stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it("should create entity and relationship files", async () => {
      const entityFile = join(testDir, "knowledge-graph-entities.jsonl");
      const relationshipFile = join(
        testDir,
        "knowledge-graph-relationships.jsonl",
      );

      await fs.access(entityFile);
      await fs.access(relationshipFile);

      // Files should exist (no error thrown)
      expect(true).toBe(true);
    });

    it("should write file markers", async () => {
      const entityFile = join(testDir, "knowledge-graph-entities.jsonl");
      const content = await fs.readFile(entityFile, "utf-8");

      expect(content).toContain("# DOCUMCP_KNOWLEDGE_GRAPH_ENTITIES");
    });

    it("should reject non-DocuMCP files", async () => {
      // Create a non-DocuMCP file
      const fakeFile = join(testDir, "knowledge-graph-entities.jsonl");
      await fs.writeFile(fakeFile, "not a documcp file\n", "utf-8");

      const newStorage = new KGStorage({ storageDir: testDir });

      await expect(newStorage.initialize()).rejects.toThrow(
        "is not a DocuMCP knowledge graph file",
      );
    });
  });

  describe("Entity Storage", () => {
    it("should save and load entities", async () => {
      const entities: GraphNode[] = [
        {
          id: "project:test",
          type: "project",
          label: "Test Project",
          properties: { name: "Test" },
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "tech:typescript",
          type: "technology",
          label: "TypeScript",
          properties: { name: "TypeScript" },
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveEntities(entities);
      const loaded = await storage.loadEntities();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe("project:test");
      expect(loaded[1].id).toBe("tech:typescript");
    });

    it("should handle empty entity list", async () => {
      await storage.saveEntities([]);
      const loaded = await storage.loadEntities();

      expect(loaded).toHaveLength(0);
    });

    it("should preserve entity properties", async () => {
      const entity: GraphNode = {
        id: "project:complex",
        type: "project",
        label: "Complex Project",
        properties: {
          name: "Complex",
          technologies: ["typescript", "react"],
          metadata: { nested: { value: 123 } },
        },
        weight: 0.85,
        lastUpdated: new Date().toISOString(),
      };

      await storage.saveEntities([entity]);
      const loaded = await storage.loadEntities();

      expect(loaded[0].properties.technologies).toEqual([
        "typescript",
        "react",
      ]);
      expect(loaded[0].properties.metadata.nested.value).toBe(123);
    });
  });

  describe("Relationship Storage", () => {
    it("should save and load relationships", async () => {
      const relationships: GraphEdge[] = [
        {
          id: "project:test-uses-tech:typescript",
          source: "project:test",
          target: "tech:typescript",
          type: "uses",
          weight: 1.0,
          confidence: 0.9,
          properties: {},
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveRelationships(relationships);
      const loaded = await storage.loadRelationships();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].source).toBe("project:test");
      expect(loaded[0].target).toBe("tech:typescript");
    });

    it("should handle empty relationship list", async () => {
      await storage.saveRelationships([]);
      const loaded = await storage.loadRelationships();

      expect(loaded).toHaveLength(0);
    });

    it("should preserve relationship properties", async () => {
      const relationship: GraphEdge = {
        id: "test-edge",
        source: "node1",
        target: "node2",
        type: "similar_to",
        weight: 0.75,
        confidence: 0.8,
        properties: {
          similarityScore: 0.75,
          sharedTechnologies: ["typescript"],
        },
        lastUpdated: new Date().toISOString(),
      };

      await storage.saveRelationships([relationship]);
      const loaded = await storage.loadRelationships();

      expect(loaded[0].properties.similarityScore).toBe(0.75);
      expect(loaded[0].properties.sharedTechnologies).toEqual(["typescript"]);
    });
  });

  describe("Complete Graph Storage", () => {
    it("should save and load complete graph", async () => {
      const entities: GraphNode[] = [
        {
          id: "project:test",
          type: "project",
          label: "Test",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      const relationships: GraphEdge[] = [
        {
          id: "test-edge",
          source: "project:test",
          target: "tech:ts",
          type: "uses",
          weight: 1.0,
          confidence: 1.0,
          properties: {},
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveGraph(entities, relationships);
      const loaded = await storage.loadGraph();

      expect(loaded.entities).toHaveLength(1);
      expect(loaded.relationships).toHaveLength(1);
    });
  });

  describe("Backup System", () => {
    it("should create backups on write", async () => {
      const entities: GraphNode[] = [
        {
          id: "test",
          type: "project",
          label: "Test",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveEntities(entities);
      await storage.saveEntities(entities); // Second save should create backup

      const backupDir = join(testDir, "backups");
      const files = await fs.readdir(backupDir);

      const backupFiles = files.filter((f) => f.startsWith("entities-"));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it("should restore from backup", async () => {
      const entities1: GraphNode[] = [
        {
          id: "version1",
          type: "project",
          label: "V1",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      const entities2: GraphNode[] = [
        {
          id: "version2",
          type: "project",
          label: "V2",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      // Save first version
      await storage.saveEntities(entities1);

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Save second version (creates backup of first)
      await storage.saveEntities(entities2);

      // Verify we have second version
      let loaded = await storage.loadEntities();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("version2");

      // Restore from backup
      await storage.restoreFromBackup("entities");

      // Verify we have first version back
      loaded = await storage.loadEntities();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("version1");
    });
  });

  describe("Statistics", () => {
    it("should return accurate statistics", async () => {
      const entities: GraphNode[] = [
        {
          id: "e1",
          type: "project",
          label: "E1",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "e2",
          type: "technology",
          label: "E2",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      const relationships: GraphEdge[] = [
        {
          id: "r1",
          source: "e1",
          target: "e2",
          type: "uses",
          weight: 1.0,
          confidence: 1.0,
          properties: {},
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveGraph(entities, relationships);
      const stats = await storage.getStatistics();

      expect(stats.entityCount).toBe(2);
      expect(stats.relationshipCount).toBe(1);
      expect(stats.schemaVersion).toBe("1.0.0");
      expect(stats.fileSize.entities).toBeGreaterThan(0);
    });
  });

  describe("Integrity Verification", () => {
    it("should detect orphaned relationships", async () => {
      const entities: GraphNode[] = [
        {
          id: "e1",
          type: "project",
          label: "E1",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      const relationships: GraphEdge[] = [
        {
          id: "r1",
          source: "e1",
          target: "missing", // References non-existent entity
          type: "uses",
          weight: 1.0,
          confidence: 1.0,
          properties: {},
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveGraph(entities, relationships);
      const result = await storage.verifyIntegrity();

      expect(result.valid).toBe(true); // No errors, just warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("missing");
    });

    it("should detect duplicate entities", async () => {
      const entities: GraphNode[] = [
        {
          id: "duplicate",
          type: "project",
          label: "E1",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
        {
          id: "duplicate",
          type: "project",
          label: "E2",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveEntities(entities);
      const result = await storage.verifyIntegrity();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Duplicate entity ID");
    });
  });

  describe("Export", () => {
    it("should export graph as JSON", async () => {
      const entities: GraphNode[] = [
        {
          id: "test",
          type: "project",
          label: "Test",
          properties: {},
          weight: 1.0,
          lastUpdated: new Date().toISOString(),
        },
      ];

      await storage.saveEntities(entities);
      const json = await storage.exportAsJSON();
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.version).toBe("1.0.0");
      expect(parsed.entities).toHaveLength(1);
      expect(parsed.relationships).toHaveLength(0);
    });
  });
});
