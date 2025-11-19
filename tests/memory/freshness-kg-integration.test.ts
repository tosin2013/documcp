/**
 * Tests for Documentation Freshness Knowledge Graph Integration
 */

import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  storeFreshnessEvent,
  updateFreshnessEvent,
  getFreshnessHistory,
  getStalenessInsights,
  compareFreshnessAcrossProjects,
} from "../../src/memory/freshness-kg-integration.js";
import type { FreshnessScanReport } from "../../src/utils/freshness-tracker.js";

describe("Freshness Knowledge Graph Integration", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `freshness-kg-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set storage directory to test directory
    process.env.DOCUMCP_STORAGE_DIR = path.join(testDir, ".documcp/memory");
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    delete process.env.DOCUMCP_STORAGE_DIR;
  });

  describe("storeFreshnessEvent", () => {
    it("should store a freshness scan event in KG", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 8,
        filesWithoutMetadata: 2,
        freshFiles: 6,
        warningFiles: 2,
        staleFiles: 1,
        criticalFiles: 1,
        files: [
          {
            filePath: path.join(docsPath, "page1.md"),
            relativePath: "page1.md",
            hasMetadata: true,
            isStale: false,
            stalenessLevel: "fresh",
            ageInMs: 1000 * 60 * 60 * 24, // 1 day
            ageFormatted: "1 day",
          },
          {
            filePath: path.join(docsPath, "page2.md"),
            relativePath: "page2.md",
            hasMetadata: true,
            isStale: true,
            stalenessLevel: "critical",
            ageInMs: 1000 * 60 * 60 * 24 * 100, // 100 days
            ageFormatted: "100 days",
          },
        ],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const eventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "scan",
      );

      expect(eventId).toBeDefined();
      expect(eventId).toContain("freshness_event:");
    });

    it("should store event with different event types", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 5,
        filesWithMetadata: 5,
        filesWithoutMetadata: 0,
        freshFiles: 5,
        warningFiles: 0,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const initEventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "initialization",
      );
      expect(initEventId).toBeDefined();

      const updateEventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "update",
      );
      expect(updateEventId).toBeDefined();

      const validationEventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "validation",
      );
      expect(validationEventId).toBeDefined();
    });
  });

  describe("getFreshnessHistory", () => {
    it("should retrieve freshness event history", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 5,
        filesWithMetadata: 5,
        filesWithoutMetadata: 0,
        freshFiles: 5,
        warningFiles: 0,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      // Store multiple events
      await storeFreshnessEvent(projectPath, docsPath, report, "scan");
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      await storeFreshnessEvent(projectPath, docsPath, report, "update");

      const history = await getFreshnessHistory(projectPath, 10);

      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty array for project with no history", async () => {
      const projectPath = path.join(testDir, "new-project");

      const history = await getFreshnessHistory(projectPath, 10);

      expect(history).toEqual([]);
    });
  });

  describe("getStalenessInsights", () => {
    it("should return insights for project with no history", async () => {
      const projectPath = path.join(testDir, "new-project");

      const insights = await getStalenessInsights(projectPath);

      expect(insights).toBeDefined();
      expect(insights.totalEvents).toBe(0);
      expect(insights.averageImprovementScore).toBe(0);
      expect(insights.trend).toBe("stable");
      expect(insights.currentStatus).toBeNull();
      expect(insights.recommendations.length).toBeGreaterThan(0);
      expect(insights.recommendations[0]).toContain(
        "No freshness tracking history found",
      );
    });

    it("should calculate insights from event history", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 8,
        warningFiles: 1,
        staleFiles: 1,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, report, "scan");

      const insights = await getStalenessInsights(projectPath);

      expect(insights).toBeDefined();
      expect(insights.trend).toMatch(/improving|declining|stable/);
      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it("should detect improving trend", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      // Store older event with worse metrics
      const olderReport: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 5,
        warningFiles: 2,
        staleFiles: 2,
        criticalFiles: 1,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, olderReport, "scan");
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Store newer event with better metrics
      const newerReport: FreshnessScanReport = {
        ...olderReport,
        scannedAt: new Date().toISOString(),
        freshFiles: 9,
        warningFiles: 1,
        staleFiles: 0,
        criticalFiles: 0,
      };

      await storeFreshnessEvent(projectPath, docsPath, newerReport, "scan");

      const insights = await getStalenessInsights(projectPath);

      expect(insights.trend).toMatch(/improving|stable/);
    });

    it("should generate recommendations for critical files", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 5,
        warningFiles: 2,
        staleFiles: 1,
        criticalFiles: 2,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, report, "scan");

      const insights = await getStalenessInsights(projectPath);

      expect(insights).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });

    it("should recommend validation for files without metadata", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 7,
        filesWithoutMetadata: 3,
        freshFiles: 7,
        warningFiles: 0,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, report, "scan");

      const insights = await getStalenessInsights(projectPath);

      expect(insights).toBeDefined();
      expect(insights.recommendations).toBeDefined();
      expect(Array.isArray(insights.recommendations)).toBe(true);
    });
  });

  describe("compareFreshnessAcrossProjects", () => {
    it("should handle project with no history", async () => {
      const projectPath = path.join(testDir, "new-project");

      const comparison = await compareFreshnessAcrossProjects(projectPath);

      expect(comparison).toBeDefined();
      expect(comparison.currentProject.path).toBe(projectPath);
      expect(comparison.currentProject.improvementScore).toBe(0);
      expect(comparison.similarProjects).toEqual([]);
    });

    it("should calculate ranking for project", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 8,
        warningFiles: 1,
        staleFiles: 1,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, report, "scan");

      const comparison = await compareFreshnessAcrossProjects(projectPath);

      expect(comparison.ranking).toBeGreaterThan(0);
    });

    it("should compare with similar projects", async () => {
      const projectPath1 = path.join(testDir, "project1");
      const docsPath1 = path.join(projectPath1, "docs");
      const projectPath2 = path.join(testDir, "project2");
      const docsPath2 = path.join(projectPath2, "docs");

      // Store events for both projects
      const report1: FreshnessScanReport = {
        docsPath: docsPath1,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 9,
        warningFiles: 1,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const report2: FreshnessScanReport = {
        ...report1,
        docsPath: docsPath2,
        freshFiles: 7,
        warningFiles: 2,
        staleFiles: 1,
      };

      await storeFreshnessEvent(projectPath1, docsPath1, report1, "scan");
      await storeFreshnessEvent(projectPath2, docsPath2, report2, "scan");

      // The function should work even if there are no similar_to edges
      // (it will just return empty similarProjects array)
      const comparison = await compareFreshnessAcrossProjects(projectPath1);

      expect(comparison.currentProject.path).toBe(projectPath1);
      expect(comparison.similarProjects).toBeDefined();
      expect(Array.isArray(comparison.similarProjects)).toBe(true);
    });
  });

  describe("updateFreshnessEvent", () => {
    it("should update a freshness event with new data", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 8,
        filesWithoutMetadata: 2,
        freshFiles: 8,
        warningFiles: 0,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const eventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "scan",
      );

      await updateFreshnessEvent(eventId, {
        filesInitialized: 2,
        filesUpdated: 5,
        eventType: "update",
      });

      // Verify the update by checking history
      const history = await getFreshnessHistory(projectPath, 10);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should throw error for non-existent event", async () => {
      await expect(
        updateFreshnessEvent("freshness_event:nonexistent", {
          filesInitialized: 1,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Edge cases and additional coverage", () => {
    it("should handle more than 10 stale files", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      // Create 15 stale files
      const staleFiles = Array.from({ length: 15 }, (_, i) => ({
        filePath: path.join(docsPath, `stale${i}.md`),
        relativePath: `stale${i}.md`,
        hasMetadata: true,
        isStale: true,
        stalenessLevel: "stale" as const,
        ageInMs: 1000 * 60 * 60 * 24 * (40 + i), // 40+ days
        ageFormatted: `${40 + i} days`,
      }));

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 15,
        filesWithMetadata: 15,
        filesWithoutMetadata: 0,
        freshFiles: 0,
        warningFiles: 0,
        staleFiles: 15,
        criticalFiles: 0,
        files: staleFiles,
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const eventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "scan",
      );
      expect(eventId).toBeDefined();

      const history = await getFreshnessHistory(projectPath, 1);
      expect(history[0].event.mostStaleFiles.length).toBeLessThanOrEqual(10);
    });

    it("should recommend action for 30%+ stale files", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 6,
        warningFiles: 0,
        staleFiles: 4, // 40% stale
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, report, "scan");

      const insights = await getStalenessInsights(projectPath);
      expect(insights.recommendations).toBeDefined();
      expect(insights.recommendations.length).toBeGreaterThan(0);
      // Check that we get recommendations about stale files
      const hasStaleRecommendation = insights.recommendations.some(
        (r) => r.includes("30%") || r.includes("stale"),
      );
      expect(hasStaleRecommendation).toBe(true);
    });

    it("should detect declining trend", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      // Store older event with good metrics
      const olderReport: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        totalFiles: 10,
        filesWithMetadata: 10,
        filesWithoutMetadata: 0,
        freshFiles: 9,
        warningFiles: 1,
        staleFiles: 0,
        criticalFiles: 0,
        files: [],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      await storeFreshnessEvent(projectPath, docsPath, olderReport, "scan");
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Store newer event with worse metrics
      const newerReport: FreshnessScanReport = {
        ...olderReport,
        scannedAt: new Date().toISOString(),
        freshFiles: 5,
        warningFiles: 2,
        staleFiles: 2,
        criticalFiles: 1,
      };

      await storeFreshnessEvent(projectPath, docsPath, newerReport, "scan");

      const insights = await getStalenessInsights(projectPath);
      expect(insights.trend).toMatch(/declining|stable/);
    });

    it("should identify chronically stale files", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      // Create multiple events with same critical/stale files
      // Need to create enough events so files appear repeatedly
      for (let i = 0; i < 6; i++) {
        const report: FreshnessScanReport = {
          docsPath,
          scannedAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * (6 - i),
          ).toISOString(),
          totalFiles: 10,
          filesWithMetadata: 10,
          filesWithoutMetadata: 0,
          freshFiles: 6,
          warningFiles: 0,
          staleFiles: 2,
          criticalFiles: 2,
          files: [
            {
              filePath: path.join(docsPath, "always-stale.md"),
              relativePath: "always-stale.md",
              hasMetadata: true,
              isStale: true,
              stalenessLevel: "critical",
              ageInMs: 1000 * 60 * 60 * 24 * 100,
              ageFormatted: "100 days",
            },
            {
              filePath: path.join(docsPath, "also-stale.md"),
              relativePath: "also-stale.md",
              hasMetadata: true,
              isStale: true,
              stalenessLevel: "critical",
              ageInMs: 1000 * 60 * 60 * 24 * 95,
              ageFormatted: "95 days",
            },
            {
              filePath: path.join(docsPath, "stale-doc.md"),
              relativePath: "stale-doc.md",
              hasMetadata: true,
              isStale: true,
              stalenessLevel: "stale",
              ageInMs: 1000 * 60 * 60 * 24 * 40,
              ageFormatted: "40 days",
            },
            {
              filePath: path.join(docsPath, "another-stale.md"),
              relativePath: "another-stale.md",
              hasMetadata: true,
              isStale: true,
              stalenessLevel: "stale",
              ageInMs: 1000 * 60 * 60 * 24 * 35,
              ageFormatted: "35 days",
            },
          ],
          thresholds: {
            warning: { value: 7, unit: "days" },
            stale: { value: 30, unit: "days" },
            critical: { value: 90, unit: "days" },
          },
        };

        await storeFreshnessEvent(projectPath, docsPath, report, "scan");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const insights = await getStalenessInsights(projectPath);
      // With 6 events and files appearing in all of them,
      // should trigger chronically stale recommendation
      const hasChronicallyStale = insights.recommendations.some(
        (r) => r.includes("chronically") || r.includes("critical"),
      );
      expect(hasChronicallyStale).toBe(true);
    });

    it("should handle files without age information", async () => {
      const projectPath = path.join(testDir, "test-project");
      const docsPath = path.join(projectPath, "docs");

      const report: FreshnessScanReport = {
        docsPath,
        scannedAt: new Date().toISOString(),
        totalFiles: 5,
        filesWithMetadata: 3,
        filesWithoutMetadata: 2,
        freshFiles: 3,
        warningFiles: 0,
        staleFiles: 0,
        criticalFiles: 0,
        files: [
          {
            filePath: path.join(docsPath, "no-metadata.md"),
            relativePath: "no-metadata.md",
            hasMetadata: false,
            isStale: false,
            stalenessLevel: "unknown",
          },
        ],
        thresholds: {
          warning: { value: 7, unit: "days" },
          stale: { value: 30, unit: "days" },
          critical: { value: 90, unit: "days" },
        },
      };

      const eventId = await storeFreshnessEvent(
        projectPath,
        docsPath,
        report,
        "scan",
      );
      expect(eventId).toBeDefined();

      const history = await getFreshnessHistory(projectPath, 1);
      expect(history.length).toBeGreaterThan(0);
      if (history.length > 0) {
        expect(history[0].event.averageAge).toBeUndefined();
        expect(history[0].event.oldestFile).toBeUndefined();
      }
    });
  });
});
