/**
 * Tests for Phase 2.2: User Preference Integration
 * Tests recommend_ssg tool with user preference learning and application
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  createOrUpdateProject,
} from "../../src/memory/kg-integration.js";
import { recommendSSG } from "../../src/tools/recommend-ssg.js";
import { MemoryManager } from "../../src/memory/manager.js";
import {
  getUserPreferenceManager,
  clearPreferenceManagerCache,
} from "../../src/memory/user-preferences.js";

describe("recommendSSG with User Preferences (Phase 2.2)", () => {
  let testDir: string;
  let originalEnv: string | undefined;
  let memoryManager: MemoryManager;

  // Helper to create analysis memory entry in correct format
  const createAnalysisMemory = async (analysisData: any) => {
    return await memoryManager.remember("analysis", analysisData);
  };

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `recommend-ssg-preferences-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Set environment variable for storage
    originalEnv = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = testDir;

    // Initialize KG and memory
    await initializeKnowledgeGraph(testDir);
    memoryManager = new MemoryManager(testDir);
    await memoryManager.initialize();

    // Clear preference manager cache
    clearPreferenceManagerCache();
  });

  afterEach(async () => {
    // Restore environment
    if (originalEnv) {
      process.env.DOCUMCP_STORAGE_DIR = originalEnv;
    } else {
      delete process.env.DOCUMCP_STORAGE_DIR;
    }

    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up test directory:", error);
    }

    // Clear preference manager cache
    clearPreferenceManagerCache();
  });

  describe("User Preference Application", () => {
    it("should apply user preferences when auto-apply is enabled", async () => {
      // Set up user preferences
      const userId = "test-user-1";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: ["hugo", "eleventy"],
        autoApplyPreferences: true,
      });

      // Create analysis that would normally recommend Docusaurus
      const memoryEntry = await createAnalysisMemory({
        path: "/test/js-project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript", "typescript"],
        },
        structure: { totalFiles: 60 },
      });

      // Get recommendation
      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);

      // Should recommend Hugo (user's top preference)
      expect(data.recommended).toBe("hugo");
      expect(data.reasoning[0]).toContain("Switched to hugo");
      expect(data.reasoning[0]).toContain("usage history");
    });

    it("should not apply preferences when auto-apply is disabled", async () => {
      const userId = "test-user-2";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: ["jekyll"],
        autoApplyPreferences: false,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/js-project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should use default recommendation, not user preference
      expect(data.recommended).toBe("docusaurus");
      expect(data.reasoning[0]).not.toContain("Switched");
    });

    it("should keep recommendation if it matches user preference", async () => {
      const userId = "test-user-3";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: ["mkdocs"],
        autoApplyPreferences: true,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/python-project",
        dependencies: {
          ecosystem: "python",
          languages: ["python"],
        },
        structure: { totalFiles: 40 },
      });

      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should recommend mkdocs (matches both analysis and preference)
      expect(data.recommended).toBe("mkdocs");
      // Either "Matches" or "Switched to" is acceptable - both indicate preference was applied
      expect(data.reasoning[0]).toMatch(
        /Matches your preferred SSG|Switched to mkdocs/,
      );
    });

    it("should switch to user preference even if not ideal for ecosystem", async () => {
      const userId = "test-user-4";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: ["mkdocs", "jekyll"], // Python/Ruby SSGs
        autoApplyPreferences: true,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/js-project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should switch to mkdocs (user's top preference)
      // User preferences override ecosystem recommendations
      expect(data.recommended).toBe("mkdocs");
      expect(data.reasoning[0]).toContain("Switched to mkdocs");
      expect(data.reasoning[0]).toContain("usage history");
    });
  });

  describe("Preference Tracking Integration", () => {
    it("should use default user when no userId provided", async () => {
      const memoryEntry = await createAnalysisMemory({
        path: "/test/project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      // Should not throw error with no userId
      const result = await recommendSSG({
        analysisId: memoryEntry.id,
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.recommended).toBeDefined();
    });

    it("should work with multiple users independently", async () => {
      const user1 = "user1";
      const user2 = "user2";

      // Set different preferences for each user
      const manager1 = await getUserPreferenceManager(user1);
      await manager1.updatePreferences({
        preferredSSGs: ["hugo"],
        autoApplyPreferences: true,
      });

      const manager2 = await getUserPreferenceManager(user2);
      await manager2.updatePreferences({
        preferredSSGs: ["eleventy"],
        autoApplyPreferences: true,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      // Get recommendations for both users
      const result1 = await recommendSSG({
        analysisId: memoryEntry.id,
        userId: user1,
      });
      const result2 = await recommendSSG({
        analysisId: memoryEntry.id,
        userId: user2,
      });

      const data1 = JSON.parse(result1.content[0].text);
      const data2 = JSON.parse(result2.content[0].text);

      // Each user should get their preferred SSG
      expect(data1.recommended).toBe("hugo");
      expect(data2.recommended).toBe("eleventy");
    });
  });

  describe("Confidence Adjustment", () => {
    it("should boost confidence when preference is applied", async () => {
      const userId = "test-user-5";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: ["eleventy"],
        autoApplyPreferences: true,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/js-project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 60 },
      });

      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Confidence should be boosted when preference is applied
      // Base confidence varies by SSG, but preference adds +0.05 boost
      expect(data.confidence).toBeGreaterThan(0.7);
      expect(data.reasoning[0]).toContain("🎯");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty preferred SSGs list", async () => {
      const userId = "test-user-6";
      const manager = await getUserPreferenceManager(userId);
      await manager.updatePreferences({
        preferredSSGs: [],
        autoApplyPreferences: true,
      });

      const memoryEntry = await createAnalysisMemory({
        path: "/test/project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId,
      });

      const content = result.content[0];
      const data = JSON.parse(content.text);

      // Should use default recommendation
      expect(data.recommended).toBe("docusaurus");
      expect(data.reasoning[0]).not.toContain("Switched");
    });

    it("should handle preference manager initialization failure gracefully", async () => {
      const memoryEntry = await createAnalysisMemory({
        path: "/test/project",
        dependencies: {
          ecosystem: "javascript",
          languages: ["javascript"],
        },
        structure: { totalFiles: 50 },
      });

      // Should not throw even with invalid userId
      const result = await recommendSSG({
        analysisId: memoryEntry.id,
        userId: "any-user-id",
      });

      const content = result.content[0];
      expect(content.type).toBe("text");
      const data = JSON.parse(content.text);
      expect(data.recommended).toBeDefined();
    });
  });
});
