/**
 * Community Insights Aggregation
 * Phase 3 completion: aggregates cross-project KG signals while
 * preserving per-project anonymization (no raw paths are exposed).
 *
 * Surfaces:
 *  - Deployment success rates per SSG (from configuration nodes)
 *  - Common technology stacks (from technology + project_uses_technology edges)
 *  - Frequent drift sources (from drift_event nodes, path-stripped)
 *  - Project health distribution (test/CI/docs coverage rates)
 */

import crypto from "crypto";
import { getKnowledgeGraph } from "./kg-integration.js";

export interface StackEntry {
  technology: string;
  projectCount: number;
  percentage: number;
}

export interface SSGSuccessEntry {
  ssg: string;
  successRate: number;
  deploymentCount: number;
}

export interface DriftSourceEntry {
  /** Anonymized file category derived from the path (e.g. "src/utils", "*.ts") */
  fileCategory: string;
  occurrences: number;
  severity: "critical" | "high" | "medium" | "low";
  averageScore: number;
}

export interface ProjectHealthStats {
  totalProjects: number;
  withTests: number;
  withCI: number;
  withDocs: number;
  testsCoverage: number;
  ciCoverage: number;
  docsCoverage: number;
}

export interface CommunityInsights {
  generatedAt: string;
  projectCount: number;
  health: ProjectHealthStats;
  commonStacks: StackEntry[];
  ssgSuccessRates: SSGSuccessEntry[];
  frequentDriftSources: DriftSourceEntry[];
}

/**
 * Replace the last segment of a file path with its extension glob so that
 * specific file names are never included in community insights.
 *
 * Examples:
 *   src/utils/helper.ts  →  src/utils/*.ts
 *   lib/auth.py          →  lib/*.py
 *   index.js             →  *.js
 */
function anonymiseFilePath(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  const basename = parts[parts.length - 1] ?? "";
  const dotIndex = basename.lastIndexOf(".");
  const ext = dotIndex > 0 ? basename.slice(dotIndex) : "";
  const glob = ext ? `*${ext}` : "*";

  if (parts.length <= 1) {
    return glob;
  }
  return [...parts.slice(0, -1), glob].join("/");
}

/**
 * Aggregate cross-project signals from the Knowledge Graph.
 * Raw project paths are never included in the returned value.
 */
export async function aggregateCommunityInsights(): Promise<CommunityInsights> {
  const kg = await getKnowledgeGraph();
  const allNodes = await kg.getAllNodes();
  const allEdges = await kg.getAllEdges();

  const nodesById = new Map(allNodes.map((n) => [n.id, n]));

  // ── Project health distribution ─────────────────────────────────────────
  const projectNodes = allNodes.filter((n) => n.type === "project");
  const health: ProjectHealthStats = {
    totalProjects: projectNodes.length,
    withTests: 0,
    withCI: 0,
    withDocs: 0,
    testsCoverage: 0,
    ciCoverage: 0,
    docsCoverage: 0,
  };

  for (const p of projectNodes) {
    if (p.properties.hasTests) health.withTests += 1;
    if (p.properties.hasCI) health.withCI += 1;
    if (p.properties.hasDocs) health.withDocs += 1;
  }

  if (health.totalProjects > 0) {
    health.testsCoverage = Math.round(
      (health.withTests / health.totalProjects) * 100,
    );
    health.ciCoverage = Math.round(
      (health.withCI / health.totalProjects) * 100,
    );
    health.docsCoverage = Math.round(
      (health.withDocs / health.totalProjects) * 100,
    );
  }

  // ── Common technology stacks ─────────────────────────────────────────────
  // Count distinct projects per technology (avoid double-counting one project
  // that uses a technology many times).
  const techProjectSets = new Map<string, Set<string>>();

  for (const edge of allEdges) {
    if (edge.type !== "project_uses_technology") continue;
    const techNode = nodesById.get(edge.target);
    if (!techNode) continue;
    const techName: string = techNode.properties.name as string;
    if (!techProjectSets.has(techName)) {
      techProjectSets.set(techName, new Set());
    }
    techProjectSets.get(techName)!.add(edge.source);
  }

  const commonStacks: StackEntry[] = Array.from(techProjectSets.entries())
    .map(([technology, projects]) => ({
      technology,
      projectCount: projects.size,
      percentage:
        health.totalProjects > 0
          ? Math.round((projects.size / health.totalProjects) * 100)
          : 0,
    }))
    .sort((a, b) => b.projectCount - a.projectCount);

  // ── SSG deployment success rates ─────────────────────────────────────────
  const configNodes = allNodes.filter((n) => n.type === "configuration");

  const ssgSuccessRates: SSGSuccessEntry[] = configNodes
    .filter((n) => n.properties.ssg)
    .map((n) => ({
      ssg: n.properties.ssg as string,
      successRate: Math.round(
        ((n.properties.deploymentSuccessRate ?? 0) as number) * 100,
      ),
      deploymentCount: (n.properties.usageCount ?? 0) as number,
    }))
    .sort((a, b) => b.deploymentCount - a.deploymentCount);

  // ── Frequent drift sources ───────────────────────────────────────────────
  // Aggregate drift events by anonymised file category, keeping the
  // most-severe observation per category group.
  const driftNodes = allNodes.filter((n) => n.type === "drift_event");

  const driftByCategory = new Map<
    string,
    {
      occurrences: number;
      severity: string;
      scoreSum: number;
    }
  >();

  const severityOrder: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  for (const driftNode of driftNodes) {
    const rawPath = (driftNode.properties.filePath as string | undefined) ?? "";
    const category = anonymiseFilePath(rawPath);
    const severity = (driftNode.properties.severity as string) ?? "low";
    const score = (driftNode.properties.overallScore as number) ?? 0;

    const existing = driftByCategory.get(category);
    if (!existing) {
      driftByCategory.set(category, {
        occurrences: 1,
        severity,
        scoreSum: score,
      });
    } else {
      existing.occurrences += 1;
      existing.scoreSum += score;
      // Escalate to highest observed severity
      if (
        (severityOrder[severity] ?? 0) > (severityOrder[existing.severity] ?? 0)
      ) {
        existing.severity = severity;
      }
    }
  }

  const frequentDriftSources: DriftSourceEntry[] = Array.from(
    driftByCategory.entries(),
  )
    .map(([fileCategory, agg]) => ({
      fileCategory,
      occurrences: agg.occurrences,
      severity: agg.severity as DriftSourceEntry["severity"],
      averageScore:
        agg.occurrences > 0
          ? Math.round((agg.scoreSum / agg.occurrences) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return {
    generatedAt: new Date().toISOString(),
    projectCount: health.totalProjects,
    health,
    commonStacks,
    ssgSuccessRates,
    frequentDriftSources,
  };
}

/**
 * Deterministic hash helper — used in tests that need stable IDs.
 */
export function hashPath(p: string): string {
  return crypto.createHash("sha256").update(p).digest("hex").substring(0, 16);
}
