/**
 * Tests for User Preference Management
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  UserPreferenceManager,
  getUserPreferenceManager,
  clearPreferenceManagerCache,
} from "../../src/memory/user-preferences.js";
import {
  getKnowledgeGraph,
  initializeKnowledgeGraph,
} from "../../src/memory/kg-integration.js";

describe("UserPreferenceManager", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `user-prefs-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Initialize KG with test directory
    await initializeKnowledgeGraph(testDir);
    clearPreferenceManagerCache();
  });

  afterEach(async () => {
    clearPreferenceManagerCache();
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Initialization", () => {
    it("should create default preferences for new user", async () => {
      const manager = new UserPreferenceManager("test-user");
      await manager.initialize();

      const prefs = await manager.getPreferences();
      expect(prefs.userId).toBe("test-user");
      expect(prefs.preferredSSGs).toEqual([]);
      expect(prefs.documentationStyle).toBe("comprehensive");
      expect(prefs.expertiseLevel).toBe("intermediate");
      expect(prefs.autoApplyPreferences).toBe(true);
    });

    it("should load existing preferences from knowledge graph", async () => {
      // Create a user with preferences
      const kg = await getKnowledgeGraph();
      kg.addNode({
        id: "user:existing-user",
        type: "user",
        label: "existing-user",
        properties: {
          userId: "existing-user",
          preferredSSGs: ["jekyll", "hugo"],
          documentationStyle: "minimal",
          expertiseLevel: "advanced",
          preferredTechnologies: ["typescript"],
          preferredDiataxisCategories: ["tutorials"],
          autoApplyPreferences: false,
          lastActive: "2025-01-01T00:00:00.000Z",
        },
        weight: 1.0,
      });

      const manager = new UserPreferenceManager("existing-user");
      await manager.initialize();

      const prefs = await manager.getPreferences();
      expect(prefs.userId).toBe("existing-user");
      expect(prefs.preferredSSGs).toEqual(["jekyll", "hugo"]);
      expect(prefs.documentationStyle).toBe("minimal");
      expect(prefs.expertiseLevel).toBe("advanced");
      expect(prefs.autoApplyPreferences).toBe(false);
    });

    it("should handle getPreferences before initialization", async () => {
      const manager = new UserPreferenceManager("auto-init");
      const prefs = await manager.getPreferences();

      expect(prefs.userId).toBe("auto-init");
      expect(prefs.preferredSSGs).toEqual([]);
    });
  });

  describe("Update Preferences", () => {
    it("should update preferences and save to knowledge graph", async () => {
      const manager = new UserPreferenceManager("update-test");
      await manager.initialize();

      await manager.updatePreferences({
        documentationStyle: "tutorial-heavy",
        expertiseLevel: "beginner",
        preferredTechnologies: ["python", "go"],
      });

      const prefs = await manager.getPreferences();
      expect(prefs.documentationStyle).toBe("tutorial-heavy");
      expect(prefs.expertiseLevel).toBe("beginner");
      expect(prefs.preferredTechnologies).toEqual(["python", "go"]);
    });

    it("should initialize before update if not already initialized", async () => {
      const manager = new UserPreferenceManager("lazy-init");

      await manager.updatePreferences({
        expertiseLevel: "advanced",
      });

      const prefs = await manager.getPreferences();
      expect(prefs.expertiseLevel).toBe("advanced");
    });
  });

  describe("Track SSG Usage", () => {
    it("should track successful SSG usage and create preference", async () => {
      const manager = new UserPreferenceManager("ssg-tracker");
      await manager.initialize();

      await manager.trackSSGUsage({
        ssg: "jekyll",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const prefs = await manager.getPreferences();
      expect(prefs.preferredSSGs).toContain("jekyll");
    });

    it("should track failed SSG usage", async () => {
      const manager = new UserPreferenceManager("fail-tracker");
      await manager.initialize();

      await manager.trackSSGUsage({
        ssg: "hugo",
        success: false,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        type: "user_prefers_ssg",
      });

      expect(edges.length).toBeGreaterThan(0);
      const edge = edges.find((e) => e.target.includes("hugo"));
      expect(edge).toBeDefined();
      expect(edge!.weight).toBe(0.5); // Failed usage has lower weight
    });

    it("should update existing SSG preference", async () => {
      const manager = new UserPreferenceManager("update-tracker");
      await manager.initialize();

      // First usage - success
      await manager.trackSSGUsage({
        ssg: "docusaurus",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      // Second usage - success
      await manager.trackSSGUsage({
        ssg: "docusaurus",
        success: true,
        timestamp: "2025-01-02T00:00:00.000Z",
      });

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        type: "user_prefers_ssg",
      });

      const docEdge = edges.find((e) => e.target.includes("docusaurus"));
      expect(docEdge!.properties.usageCount).toBe(2);
      expect(docEdge!.properties.successRate).toBe(1.0);
    });

    it("should calculate average success rate correctly", async () => {
      const manager = new UserPreferenceManager("avg-tracker");
      await manager.initialize();

      // Success
      await manager.trackSSGUsage({
        ssg: "mkdocs",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      // Failure
      await manager.trackSSGUsage({
        ssg: "mkdocs",
        success: false,
        timestamp: "2025-01-02T00:00:00.000Z",
      });

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        type: "user_prefers_ssg",
      });

      const mkdocsEdge = edges.find((e) => e.target.includes("mkdocs"));
      expect(mkdocsEdge!.properties.successRate).toBe(0.5);
    });

    it("should create user node if it doesn't exist during tracking", async () => {
      const manager = new UserPreferenceManager("new-tracker");
      // Don't initialize - let trackSSGUsage create it

      await manager.trackSSGUsage({
        ssg: "eleventy",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const kg = await getKnowledgeGraph();
      const userNode = await kg.findNode({
        type: "user",
        properties: { userId: "new-tracker" },
      });

      expect(userNode).toBeDefined();
    });
  });

  describe("SSG Recommendations", () => {
    it("should return recommendations sorted by score", async () => {
      const manager = new UserPreferenceManager("rec-test");
      await manager.initialize();

      // Track multiple SSGs with different success rates
      await manager.trackSSGUsage({
        ssg: "jekyll",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });
      await manager.trackSSGUsage({
        ssg: "jekyll",
        success: true,
        timestamp: "2025-01-02T00:00:00.000Z",
      });
      await manager.trackSSGUsage({
        ssg: "hugo",
        success: true,
        timestamp: "2025-01-03T00:00:00.000Z",
      });

      const recommendations = await manager.getSSGRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].ssg).toBe("jekyll"); // Higher usage count
      expect(recommendations[0].score).toBeGreaterThan(
        recommendations[1].score,
      );
    });

    it("should include reason with high success rate", async () => {
      const manager = new UserPreferenceManager("reason-test");
      await manager.initialize();

      await manager.trackSSGUsage({
        ssg: "docusaurus",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });

      const recommendations = await manager.getSSGRecommendations();
      const docRec = recommendations.find((r) => r.ssg === "docusaurus");

      expect(docRec!.reason).toContain("100% success rate");
    });

    it("should include reason with low success rate", async () => {
      const manager = new UserPreferenceManager("low-success-test");
      await manager.initialize();

      // Track both success and failure to get a low rate (not exactly 0)
      await manager.trackSSGUsage({
        ssg: "eleventy",
        success: true,
        timestamp: "2025-01-01T00:00:00.000Z",
      });
      await manager.trackSSGUsage({
        ssg: "eleventy",
        success: false,
        timestamp: "2025-01-02T00:00:00.000Z",
      });
      await manager.trackSSGUsage({
        ssg: "eleventy",
        success: false,
        timestamp: "2025-01-03T00:00:00.000Z",
      });

      const recommendations = await manager.getSSGRecommendations();
      const eleventyRec = recommendations.find((r) => r.ssg === "eleventy");

      expect(eleventyRec!.reason).toContain("only");
      expect(eleventyRec!.reason).toContain("success rate");
    });

    it("should return empty array if no user node exists", async () => {
      const manager = new UserPreferenceManager("no-user");
      // Don't initialize or create user node

      const recommendations = await manager.getSSGRecommendations();

      expect(recommendations).toEqual([]);
    });
  });

  describe("Apply Preferences to Recommendation", () => {
    it("should return original recommendation if autoApply is false", async () => {
      const manager = new UserPreferenceManager("no-auto");
      await manager.updatePreferences({
        autoApplyPreferences: false,
        preferredSSGs: ["jekyll"],
      });

      const result = manager.applyPreferencesToRecommendation("hugo", [
        "jekyll",
        "hugo",
      ]);

      expect(result.recommended).toBe("hugo");
      expect(result.adjustmentReason).toBeUndefined();
    });

    it("should keep recommendation if it matches preferred SSG", async () => {
      const manager = new UserPreferenceManager("match-pref");
      await manager.updatePreferences({
        preferredSSGs: ["jekyll", "hugo"],
      });

      const result = manager.applyPreferencesToRecommendation("jekyll", [
        "jekyll",
        "hugo",
        "mkdocs",
      ]);

      expect(result.recommended).toBe("jekyll");
      expect(result.adjustmentReason).toContain("Matches your preferred SSG");
    });

    it("should switch to preferred SSG if in alternatives", async () => {
      const manager = new UserPreferenceManager("switch-pref");
      await manager.updatePreferences({
        preferredSSGs: ["docusaurus"],
      });

      const result = manager.applyPreferencesToRecommendation("jekyll", [
        "jekyll",
        "docusaurus",
        "hugo",
      ]);

      expect(result.recommended).toBe("docusaurus");
      expect(result.adjustmentReason).toContain(
        "Switched to docusaurus based on your usage history",
      );
    });

    it("should return original if no preferred SSGs match", async () => {
      const manager = new UserPreferenceManager("no-match");
      await manager.updatePreferences({
        preferredSSGs: ["eleventy"],
      });

      const result = manager.applyPreferencesToRecommendation("jekyll", [
        "jekyll",
        "hugo",
      ]);

      expect(result.recommended).toBe("jekyll");
      expect(result.adjustmentReason).toBeUndefined();
    });

    it("should return original if no preferences set", async () => {
      const manager = new UserPreferenceManager("empty-pref");
      await manager.initialize();

      const result = manager.applyPreferencesToRecommendation("jekyll", [
        "jekyll",
        "hugo",
      ]);

      expect(result.recommended).toBe("jekyll");
      expect(result.adjustmentReason).toBeUndefined();
    });
  });

  describe("Reset Preferences", () => {
    it("should reset preferences to defaults", async () => {
      const manager = new UserPreferenceManager("reset-test");
      await manager.updatePreferences({
        documentationStyle: "minimal",
        expertiseLevel: "advanced",
        preferredSSGs: ["jekyll", "hugo"],
      });

      await manager.resetPreferences();

      const prefs = await manager.getPreferences();
      expect(prefs.documentationStyle).toBe("comprehensive");
      expect(prefs.expertiseLevel).toBe("intermediate");
      expect(prefs.preferredSSGs).toEqual([]);
    });
  });

  describe("Export/Import Preferences", () => {
    it("should export preferences as JSON", async () => {
      const manager = new UserPreferenceManager("export-test");
      await manager.updatePreferences({
        expertiseLevel: "advanced",
        preferredSSGs: ["jekyll"],
      });

      const exported = await manager.exportPreferences();
      const parsed = JSON.parse(exported);

      expect(parsed.userId).toBe("export-test");
      expect(parsed.expertiseLevel).toBe("advanced");
      expect(parsed.preferredSSGs).toEqual(["jekyll"]);
    });

    it("should import preferences from JSON", async () => {
      const manager = new UserPreferenceManager("import-test");
      await manager.initialize();

      const importData = {
        userId: "import-test",
        preferredSSGs: ["hugo", "docusaurus"],
        documentationStyle: "tutorial-heavy" as const,
        expertiseLevel: "beginner" as const,
        preferredTechnologies: ["python"],
        preferredDiataxisCategories: ["tutorials" as const],
        autoApplyPreferences: false,
        lastUpdated: "2025-01-01T00:00:00.000Z",
      };

      await manager.importPreferences(JSON.stringify(importData));

      const prefs = await manager.getPreferences();
      expect(prefs.expertiseLevel).toBe("beginner");
      expect(prefs.preferredSSGs).toEqual(["hugo", "docusaurus"]);
      expect(prefs.autoApplyPreferences).toBe(false);
    });

    it("should throw error on userId mismatch during import", async () => {
      const manager = new UserPreferenceManager("user1");
      await manager.initialize();

      const importData = {
        userId: "user2", // Different user ID
        preferredSSGs: [],
        documentationStyle: "comprehensive" as const,
        expertiseLevel: "intermediate" as const,
        preferredTechnologies: [],
        preferredDiataxisCategories: [],
        autoApplyPreferences: true,
        lastUpdated: "2025-01-01T00:00:00.000Z",
      };

      await expect(
        manager.importPreferences(JSON.stringify(importData)),
      ).rejects.toThrow("User ID mismatch");
    });
  });

  describe("Manager Cache", () => {
    it("should cache preference managers", async () => {
      const manager1 = await getUserPreferenceManager("cached-user");
      const manager2 = await getUserPreferenceManager("cached-user");

      expect(manager1).toBe(manager2); // Same instance
    });

    it("should create different managers for different users", async () => {
      const manager1 = await getUserPreferenceManager("user1");
      const manager2 = await getUserPreferenceManager("user2");

      expect(manager1).not.toBe(manager2);
    });

    it("should clear cache", async () => {
      const manager1 = await getUserPreferenceManager("clear-test");
      clearPreferenceManagerCache();
      const manager2 = await getUserPreferenceManager("clear-test");

      expect(manager1).not.toBe(manager2); // Different instances after clear
    });
  });
});
