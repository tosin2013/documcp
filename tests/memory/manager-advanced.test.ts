/**
 * Tests for uncovered branches in Memory Manager
 * Covers: getRelated (lines 171-202), export (lines 381-398), import (lines 409-415)
 */

import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { MemoryManager } from "../../src/memory/manager.js";
import { MemoryEntry } from "../../src/memory/storage.js";

describe("MemoryManager - Advanced Features Coverage", () => {
  let manager: MemoryManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `manager-advanced-test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    manager = new MemoryManager(tempDir);
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      await manager.close();
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("getRelated - Tag-based Relationships (lines 189-195)", () => {
    it("should find related memories by overlapping tags", async () => {
      // Create entries with overlapping tags
      const entry1 = await manager.remember(
        "analysis",
        { name: "Project A" },
        {
          projectId: "proj-001",
          tags: ["typescript", "react", "frontend"],
        },
      );

      await manager.remember(
        "analysis",
        { name: "Project B" },
        {
          projectId: "proj-002",
          tags: ["typescript", "vue", "frontend"],
        },
      );

      await manager.remember(
        "analysis",
        { name: "Project C" },
        {
          projectId: "proj-003",
          tags: ["python", "backend"],
        },
      );

      // Get related memories for entry1 (should find project B via overlapping tags)
      const related = await manager.getRelated(entry1, 10);

      expect(related.length).toBeGreaterThan(0);

      // Should include Project B (shares typescript and frontend tags)
      const relatedNames = related.map((r) => r.data.name);
      expect(relatedNames).toContain("Project B");

      // Should not include entry1 itself
      expect(relatedNames).not.toContain("Project A");
    });

    it("should find related memories by same type (lines 182-186)", async () => {
      const entry1 = await manager.remember(
        "recommendation",
        { ssg: "jekyll" },
        { projectId: "proj-001" },
      );

      await manager.remember(
        "recommendation",
        { ssg: "hugo" },
        { projectId: "proj-002" },
      );

      await manager.remember(
        "analysis",
        { type: "different" },
        { projectId: "proj-003" },
      );

      const related = await manager.getRelated(entry1, 10);

      // Should find the other recommendation, not the analysis
      expect(related.length).toBeGreaterThan(0);
      const types = related.map((r) => r.type);
      expect(types).toContain("recommendation");
    });

    it("should find related memories by same project (lines 174-179)", async () => {
      manager.setContext({ projectId: "shared-project" });

      const entry1 = await manager.remember(
        "analysis",
        { step: "step1" },
        { projectId: "shared-project" },
      );

      await manager.remember(
        "analysis",
        { step: "step2" },
        { projectId: "shared-project" },
      );

      await manager.remember(
        "analysis",
        { step: "step3" },
        { projectId: "different-project" },
      );

      const related = await manager.getRelated(entry1, 10);

      // Should find step2 from same project
      expect(related.length).toBeGreaterThan(0);
      const projectIds = related.map((r) => r.metadata.projectId);
      expect(projectIds).toContain("shared-project");
    });

    it("should deduplicate and limit related memories (lines 198-202)", async () => {
      const entry1 = await manager.remember(
        "analysis",
        { name: "Entry 1" },
        {
          projectId: "proj-001",
          tags: ["tag1", "tag2"],
        },
      );

      // Create many related entries
      for (let i = 0; i < 20; i++) {
        await manager.remember(
          "analysis",
          { name: `Entry ${i + 2}` },
          {
            projectId: "proj-001",
            tags: i < 10 ? ["tag1"] : ["tag2"],
          },
        );
      }

      // Request limit of 5
      const related = await manager.getRelated(entry1, 5);

      // Should be limited to 5 (deduplicated)
      expect(related.length).toBeLessThanOrEqual(5);

      // Should not include entry1 itself
      const names = related.map((r) => r.data.name);
      expect(names).not.toContain("Entry 1");
    });

    it("should handle entry without tags gracefully (line 189)", async () => {
      const entryNoTags = await manager.remember(
        "analysis",
        { name: "No Tags" },
        { projectId: "proj-001" },
      );

      await manager.remember(
        "analysis",
        { name: "Also No Tags" },
        { projectId: "proj-001" },
      );

      // Should still find related by project
      const related = await manager.getRelated(entryNoTags, 10);
      expect(related.length).toBeGreaterThan(0);
    });

    it("should handle entry with empty tags array (line 189)", async () => {
      const entryEmptyTags = await manager.remember(
        "analysis",
        { name: "Empty Tags" },
        {
          projectId: "proj-001",
          tags: [],
        },
      );

      await manager.remember(
        "analysis",
        { name: "Other Entry" },
        { projectId: "proj-001" },
      );

      const related = await manager.getRelated(entryEmptyTags, 10);
      expect(related.length).toBeGreaterThan(0);
    });
  });

  describe("CSV Export (lines 381-398)", () => {
    it("should export memories as CSV format", async () => {
      manager.setContext({ projectId: "csv-proj-001" });

      await manager.remember(
        "analysis",
        { test: "data1" },
        {
          repository: "github.com/test/repo1",
          ssg: "jekyll",
        },
      );

      manager.setContext({ projectId: "csv-proj-002" });

      await manager.remember(
        "recommendation",
        { test: "data2" },
        {
          repository: "github.com/test/repo2",
          ssg: "hugo",
        },
      );

      // Export as CSV
      const csvData = await manager.export("csv");

      // Verify CSV structure
      expect(csvData).toContain("id,timestamp,type,projectId,repository,ssg");
      expect(csvData).toContain("csv-proj-001");
      expect(csvData).toContain("csv-proj-002");
      expect(csvData).toContain("github.com/test/repo1");
      expect(csvData).toContain("github.com/test/repo2");
      expect(csvData).toContain("jekyll");
      expect(csvData).toContain("hugo");

      // Verify rows are comma-separated
      const lines = csvData.split("\n").filter((l) => l.trim());
      expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 rows

      // Each line should have the same number of commas
      const headerCommas = (lines[0].match(/,/g) || []).length;
      for (let i = 1; i < lines.length; i++) {
        const rowCommas = (lines[i].match(/,/g) || []).length;
        expect(rowCommas).toBe(headerCommas);
      }
    });

    it("should export memories for specific project only", async () => {
      manager.setContext({ projectId: "project-a" });
      await manager.remember("analysis", { project: "A" }, {});

      manager.setContext({ projectId: "project-b" });
      await manager.remember("analysis", { project: "B" }, {});

      // Export only project-a
      const csvData = await manager.export("csv", "project-a");

      expect(csvData).toContain("project-a");
      expect(csvData).not.toContain("project-b");
    });

    it("should handle missing metadata fields in CSV export (lines 393-395)", async () => {
      // Create entry with minimal metadata
      await manager.remember("analysis", { test: "minimal" }, {});

      const csvData = await manager.export("csv");

      // Should have empty fields for missing metadata
      const lines = csvData.split("\n");
      expect(lines.length).toBeGreaterThan(1);

      // Verify header
      expect(lines[0]).toContain("id,timestamp,type,projectId,repository,ssg");

      // Data row should have appropriate number of commas (empty fields)
      const dataRow = lines[1];
      const headerCommas = (lines[0].match(/,/g) || []).length;
      const dataCommas = (dataRow.match(/,/g) || []).length;
      expect(dataCommas).toBe(headerCommas);
    });

    it("should export as JSON by default", async () => {
      await manager.remember(
        "analysis",
        { json: "test" },
        { projectId: "json-proj" },
      );

      const jsonData = await manager.export("json");

      const parsed = JSON.parse(jsonData);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].data.json).toBe("test");
    });
  });

  describe("CSV Import (lines 409-428)", () => {
    it("should import memories from CSV format", async () => {
      // Create CSV data
      const csvData = `id,timestamp,type,projectId,repository,ssg
mem-001,2024-01-01T00:00:00.000Z,analysis,proj-csv-001,github.com/test/repo1,jekyll
mem-002,2024-01-02T00:00:00.000Z,recommendation,proj-csv-002,github.com/test/repo2,hugo
mem-003,2024-01-03T00:00:00.000Z,deployment,proj-csv-003,github.com/test/repo3,mkdocs`;

      const imported = await manager.import(csvData, "csv");

      expect(imported).toBe(3);

      // Verify entries were imported
      const recalled1 = await manager.recall("mem-001");
      expect(recalled1).not.toBeNull();
      expect(recalled1?.type).toBe("analysis");
      expect(recalled1?.metadata.projectId).toBe("proj-csv-001");
      expect(recalled1?.metadata.ssg).toBe("jekyll");

      const recalled2 = await manager.recall("mem-002");
      expect(recalled2).not.toBeNull();
      expect(recalled2?.type).toBe("recommendation");
    });

    it("should skip malformed CSV rows (line 414)", async () => {
      // CSV with mismatched column counts
      const csvData = `id,timestamp,type,projectId,repository,ssg
mem-001,2024-01-01T00:00:00.000Z,analysis,proj-001,github.com/test/repo,jekyll
mem-002,2024-01-02T00:00:00.000Z,recommendation
mem-003,2024-01-03T00:00:00.000Z,deployment,proj-003,github.com/test/repo3,mkdocs`;

      const imported = await manager.import(csvData, "csv");

      // Should import 2 (skipping the malformed row)
      expect(imported).toBe(2);

      // Verify valid entries were imported
      const recalled1 = await manager.recall("mem-001");
      expect(recalled1).not.toBeNull();

      // Malformed entry should not be imported
      const recalled2 = await manager.recall("mem-002");
      expect(recalled2).toBeNull();

      const recalled3 = await manager.recall("mem-003");
      expect(recalled3).not.toBeNull();
    });

    it("should import memories from JSON format", async () => {
      const jsonData = JSON.stringify([
        {
          id: "json-001",
          timestamp: "2024-01-01T00:00:00.000Z",
          type: "analysis",
          data: { test: "json-import" },
          metadata: { projectId: "json-proj" },
        },
      ]);

      const imported = await manager.import(jsonData, "json");

      expect(imported).toBe(1);

      const recalled = await manager.recall("json-001");
      expect(recalled).not.toBeNull();
      expect(recalled?.data.test).toBe("json-import");
    });

    it("should emit import-complete event (line 437)", async () => {
      let eventEmitted = false;
      let importedCount = 0;

      manager.on("import-complete", (count) => {
        eventEmitted = true;
        importedCount = count;
      });

      const jsonData = JSON.stringify([
        {
          id: "event-001",
          timestamp: "2024-01-01T00:00:00.000Z",
          type: "analysis",
          data: {},
          metadata: {},
        },
      ]);

      await manager.import(jsonData, "json");

      expect(eventEmitted).toBe(true);
      expect(importedCount).toBe(1);
    });

    it("should handle empty CSV import gracefully", async () => {
      const csvData = `id,timestamp,type,projectId,repository,ssg`;

      const imported = await manager.import(csvData, "csv");

      expect(imported).toBe(0);
    });

    it("should handle empty JSON import gracefully", async () => {
      const jsonData = JSON.stringify([]);

      const imported = await manager.import(jsonData, "json");

      expect(imported).toBe(0);
    });
  });

  describe("Export and Import Round-trip", () => {
    it("should maintain data integrity through CSV round-trip", async () => {
      // Create test data
      manager.setContext({
        projectId: "roundtrip-proj",
        repository: "github.com/test/roundtrip",
      });
      const originalEntry = await manager.remember(
        "analysis",
        { roundtrip: "test" },
        {
          ssg: "docusaurus",
        },
      );

      // Export as CSV
      const csvData = await manager.export("csv");

      // Create new manager and import
      const tempDir2 = path.join(
        os.tmpdir(),
        `manager-roundtrip-${Date.now()}`,
      );
      await fs.mkdir(tempDir2, { recursive: true });
      const manager2 = new MemoryManager(tempDir2);
      await manager2.initialize();

      const imported = await manager2.import(csvData, "csv");
      expect(imported).toBeGreaterThan(0);

      // Verify data matches
      const recalled = await manager2.recall(originalEntry.id);
      expect(recalled).not.toBeNull();
      expect(recalled?.type).toBe(originalEntry.type);
      expect(recalled?.metadata.projectId).toBe(
        originalEntry.metadata.projectId,
      );
      expect(recalled?.metadata.ssg).toBe(originalEntry.metadata.ssg);

      await manager2.close();
      await fs.rm(tempDir2, { recursive: true, force: true });
    });

    it("should maintain data integrity through JSON round-trip", async () => {
      // Create test data with complex structure
      manager.setContext({ projectId: "json-roundtrip" });
      const originalEntry = await manager.remember(
        "analysis",
        {
          complex: "data",
          nested: { value: 123 },
          array: [1, 2, 3],
        },
        {
          tags: ["tag1", "tag2"],
        },
      );

      // Export as JSON
      const jsonData = await manager.export("json");

      // Create new manager and import
      const tempDir2 = path.join(
        os.tmpdir(),
        `manager-json-roundtrip-${Date.now()}`,
      );
      await fs.mkdir(tempDir2, { recursive: true });
      const manager2 = new MemoryManager(tempDir2);
      await manager2.initialize();

      const imported = await manager2.import(jsonData, "json");
      expect(imported).toBeGreaterThan(0);

      // Verify complex data maintained
      const recalled = await manager2.recall(originalEntry.id);
      expect(recalled).not.toBeNull();
      expect(recalled?.data).toEqual(originalEntry.data);
      expect(recalled?.metadata.tags).toEqual(originalEntry.metadata.tags);

      await manager2.close();
      await fs.rm(tempDir2, { recursive: true, force: true });
    });
  });
});
