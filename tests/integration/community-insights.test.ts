/**
 * Integration tests for Community Insights Aggregation (Phase 3)
 *
 * Covers a multi-project Knowledge Graph with >= 3 projects and validates:
 *  - Aggregation produces expected shapes
 *  - Anonymization: no raw project paths leak
 *  - SSG success rates, common stacks, drift sources
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initializeKnowledgeGraph,
  resetKnowledgeGraph,
  createOrUpdateProject,
  trackDeployment,
} from "../../src/memory/kg-integration.js";
import {
  storeDriftEvent,
  generateProjectId,
  generateDriftId,
} from "../../src/memory/kg-drift-feedback.js";
import { aggregateCommunityInsights } from "../../src/memory/community-insights.js";

describe("Community Insights Integration", () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    testDir = join(tmpdir(), `community-insights-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    originalEnv = process.env.DOCUMCP_STORAGE_DIR;
    process.env.DOCUMCP_STORAGE_DIR = testDir;

    resetKnowledgeGraph();
    await initializeKnowledgeGraph(testDir);
  });

  afterEach(async () => {
    if (originalEnv !== undefined) {
      process.env.DOCUMCP_STORAGE_DIR = originalEnv;
    } else {
      delete process.env.DOCUMCP_STORAGE_DIR;
    }
    resetKnowledgeGraph();

    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  // ── Helper: build a minimal analysis fixture ────────────────────────────
  function makeAnalysis(
    id: string,
    path: string,
    name: string,
    languages: Record<string, number>,
    opts: { hasTests?: boolean; hasCI?: boolean; hasDocs?: boolean } = {},
  ) {
    const totalFiles = Object.values(languages).reduce((s, n) => s + n, 0);
    return {
      id,
      timestamp: new Date().toISOString(),
      path,
      projectName: name,
      structure: {
        totalFiles,
        totalDirectories: 5,
        languages,
        hasTests: opts.hasTests ?? false,
        hasCI: opts.hasCI ?? false,
        hasDocs: opts.hasDocs ?? false,
      },
    };
  }

  // ── Seed: 4 projects, 3 with TypeScript, 2 with Python ──────────────────
  async function seedMultiProjectKG() {
    const projects = [
      makeAnalysis(
        "p1",
        "/corp/alpha",
        "Alpha",
        { typescript: 80, javascript: 20 },
        { hasTests: true, hasCI: true, hasDocs: true },
      ),
      makeAnalysis(
        "p2",
        "/corp/beta",
        "Beta",
        { typescript: 60, python: 40 },
        { hasTests: true, hasCI: false, hasDocs: false },
      ),
      makeAnalysis(
        "p3",
        "/corp/gamma",
        "Gamma",
        { python: 90, bash: 10 },
        { hasTests: false, hasCI: true, hasDocs: false },
      ),
      makeAnalysis(
        "p4",
        "/corp/delta",
        "Delta",
        { typescript: 50, go: 50 },
        { hasTests: false, hasCI: false, hasDocs: true },
      ),
    ];

    const nodes = [];
    for (const analysis of projects) {
      const node = await createOrUpdateProject(analysis);
      nodes.push(node);
    }

    // Add SSG deployments: Jekyll for 2 projects, Hugo for 1 project
    await trackDeployment(nodes[0].id, "jekyll", true);
    await trackDeployment(nodes[0].id, "jekyll", true);
    await trackDeployment(nodes[1].id, "hugo", false);
    await trackDeployment(nodes[2].id, "jekyll", false);

    // Add drift events for 2 projects
    const projectPath1 = "/corp/alpha";
    const projectPath3 = "/corp/gamma";
    const now = new Date().toISOString();

    const driftId1 = generateDriftId(
      "src/utils/helper.ts",
      ["parseConfig"],
      now,
    );
    await storeDriftEvent(projectPath1, {
      driftId: driftId1,
      filePath: "src/utils/helper.ts",
      severity: "high",
      recommendation: "high",
      overallScore: 0.8,
      factors: {
        codeComplexity: 0.7,
        usageFrequency: 0.9,
        changeMagnitude: 0.8,
        documentationCoverage: 0.3,
        staleness: 0.6,
        userFeedback: 0.5,
      },
      detectedAt: now,
    });

    const later = new Date(Date.now() + 1000).toISOString();
    const driftId2 = generateDriftId("lib/auth.py", ["login"], later);
    await storeDriftEvent(projectPath3, {
      driftId: driftId2,
      filePath: "lib/auth.py",
      severity: "critical",
      recommendation: "critical",
      overallScore: 0.95,
      factors: {
        codeComplexity: 0.9,
        usageFrequency: 1.0,
        changeMagnitude: 0.9,
        documentationCoverage: 0.1,
        staleness: 0.8,
        userFeedback: 0.7,
      },
      detectedAt: later,
    });

    return nodes;
  }

  describe("aggregateCommunityInsights", () => {
    it("returns a valid structure for an empty KG", async () => {
      const insights = await aggregateCommunityInsights();

      expect(insights.generatedAt).toBeDefined();
      expect(typeof insights.generatedAt).toBe("string");
      expect(insights.projectCount).toBe(0);
      expect(insights.health.totalProjects).toBe(0);
      expect(Array.isArray(insights.commonStacks)).toBe(true);
      expect(Array.isArray(insights.ssgSuccessRates)).toBe(true);
      expect(Array.isArray(insights.frequentDriftSources)).toBe(true);
    });

    it("aggregates >= 3 projects and returns correct counts", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();

      expect(insights.projectCount).toBeGreaterThanOrEqual(3);
      expect(insights.health.totalProjects).toBeGreaterThanOrEqual(3);
    });

    it("calculates health coverage percentages correctly", async () => {
      await seedMultiProjectKG(); // 4 projects: 2 tests, 2 CI, 2 docs

      const insights = await aggregateCommunityInsights();
      const h = insights.health;

      // 2 out of 4 have tests → 50 %
      expect(h.withTests).toBe(2);
      expect(h.testsCoverage).toBe(50);

      // 2 out of 4 have CI → 50 %
      expect(h.withCI).toBe(2);
      expect(h.ciCoverage).toBe(50);

      // 2 out of 4 have docs → 50 %
      expect(h.withDocs).toBe(2);
      expect(h.docsCoverage).toBe(50);
    });

    it("reports TypeScript as most-used technology across 3 of 4 projects", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();
      const topStack = insights.commonStacks[0];

      expect(topStack).toBeDefined();
      expect(topStack.technology).toBe("typescript");
      expect(topStack.projectCount).toBe(3);
    });

    it("reports SSG success rates without exposing project paths", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();

      // Jekyll was deployed 3× (2 success, 1 failure) → success entry should exist
      const jekyllEntry = insights.ssgSuccessRates.find(
        (e) => e.ssg === "jekyll",
      );
      expect(jekyllEntry).toBeDefined();
      expect(jekyllEntry!.deploymentCount).toBeGreaterThan(0);
      expect(jekyllEntry!.successRate).toBeGreaterThanOrEqual(0);
      expect(jekyllEntry!.successRate).toBeLessThanOrEqual(100);

      // No project path should appear in the ssgSuccessRates
      const rawText = JSON.stringify(insights.ssgSuccessRates);
      expect(rawText).not.toContain("/corp/");
    });

    it("anonymizes drift source file paths", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();

      expect(insights.frequentDriftSources.length).toBeGreaterThan(0);

      for (const source of insights.frequentDriftSources) {
        // Must not contain a real file name — only glob patterns like "*.ts"
        expect(source.fileCategory).not.toMatch(
          /helper\.ts|auth\.py|index\.js/,
        );
        // Must end with a glob segment (e.g. "*.ts")
        expect(source.fileCategory).toMatch(/\*\.\w+$|\*$/);

        // Severity must be one of the allowed values
        expect(["critical", "high", "medium", "low"]).toContain(
          source.severity,
        );

        // No raw project paths
        expect(source.fileCategory).not.toContain("/corp/");
      }
    });

    it("does not leak raw project paths anywhere in the output", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();
      const json = JSON.stringify(insights);

      // Raw project paths used in the seed
      const sensitiveSegments = ["/corp/alpha", "/corp/beta", "/corp/gamma"];
      for (const seg of sensitiveSegments) {
        expect(json).not.toContain(seg);
      }
    });

    it("frequentDriftSources are sorted by occurrence count descending", async () => {
      await seedMultiProjectKG();

      // Add a second drift for the same category as "src/utils/helper.ts"
      // to ensure its count is > 1.
      const projectPath = "/corp/alpha";
      const ts2 = new Date(Date.now() + 2000).toISOString();
      const driftId3 = generateDriftId("src/utils/config.ts", ["load"], ts2);
      await storeDriftEvent(projectPath, {
        driftId: driftId3,
        filePath: "src/utils/config.ts",
        severity: "medium",
        recommendation: "medium",
        overallScore: 0.5,
        factors: {
          codeComplexity: 0.5,
          usageFrequency: 0.5,
          changeMagnitude: 0.5,
          documentationCoverage: 0.5,
          staleness: 0.5,
          userFeedback: 0.5,
        },
        detectedAt: ts2,
      });

      const insights = await aggregateCommunityInsights();
      const sources = insights.frequentDriftSources;

      for (let i = 1; i < sources.length; i++) {
        expect(sources[i - 1].occurrences).toBeGreaterThanOrEqual(
          sources[i].occurrences,
        );
      }
    });

    it("percentages in commonStacks are integers 0-100", async () => {
      await seedMultiProjectKG();

      const insights = await aggregateCommunityInsights();

      for (const entry of insights.commonStacks) {
        expect(Number.isInteger(entry.percentage)).toBe(true);
        expect(entry.percentage).toBeGreaterThanOrEqual(0);
        expect(entry.percentage).toBeLessThanOrEqual(100);
      }
    });

    it("generatedAt is a valid ISO 8601 timestamp", async () => {
      const insights = await aggregateCommunityInsights();
      expect(() => new Date(insights.generatedAt).toISOString()).not.toThrow();
    });
  });

  describe("generateProjectId helper (anonymization)", () => {
    it("produces a stable deterministic hash for a given path", () => {
      const id1 = generateProjectId("/corp/alpha");
      const id2 = generateProjectId("/corp/alpha");
      expect(id1).toBe(id2);
    });

    it("produces different IDs for different paths", () => {
      expect(generateProjectId("/corp/alpha")).not.toBe(
        generateProjectId("/corp/beta"),
      );
    });

    it("does not embed the original path in the ID", () => {
      const id = generateProjectId("/secret/project/path");
      expect(id).not.toContain("/secret/project/path");
    });
  });
});
