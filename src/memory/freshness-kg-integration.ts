/**
 * Documentation Freshness Knowledge Graph Integration
 *
 * Provides functions for storing and retrieving documentation freshness
 * tracking events in the Knowledge Graph for historical analysis and insights.
 */

import { getKnowledgeGraph, getKGStorage } from "./kg-integration.js";
import type {
  DocumentationFreshnessEventEntity,
  ProjectHasFreshnessEventRelationship,
} from "./schemas.js";
import type { FreshnessScanReport } from "../utils/freshness-tracker.js";
import crypto from "crypto";

/**
 * Generate a unique ID for a freshness event
 */
function generateFreshnessEventId(
  projectPath: string,
  timestamp: string,
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${projectPath}:${timestamp}`)
    .digest("hex")
    .substring(0, 16);
  return `freshness_event:${hash}`;
}

/**
 * Generate a project ID from project path
 */
function generateProjectId(projectPath: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(projectPath)
    .digest("hex")
    .substring(0, 16);
  return `project:${hash}`;
}

/**
 * Store a documentation freshness scan event in the Knowledge Graph
 */
export async function storeFreshnessEvent(
  projectPath: string,
  docsPath: string,
  report: FreshnessScanReport,
  eventType: "scan" | "validation" | "initialization" | "update" = "scan",
): Promise<string> {
  const kg = await getKnowledgeGraph();
  const storage = await getKGStorage();

  const timestamp = new Date().toISOString();
  const eventId = generateFreshnessEventId(projectPath, timestamp);
  const projectId = generateProjectId(projectPath);

  // Calculate average age in days
  const filesWithAge = report.files.filter((f) => f.ageInMs !== undefined);
  const averageAge =
    filesWithAge.length > 0
      ? filesWithAge.reduce((sum, f) => sum + (f.ageInMs || 0), 0) /
        filesWithAge.length /
        (1000 * 60 * 60 * 24)
      : undefined;

  // Find oldest file
  const oldestFile =
    filesWithAge.length > 0
      ? filesWithAge.reduce((oldest, current) =>
          (current.ageInMs || 0) > (oldest.ageInMs || 0) ? current : oldest,
        )
      : undefined;

  // Get most stale files (critical and stale)
  const mostStaleFiles = report.files
    .filter(
      (f) => f.stalenessLevel === "critical" || f.stalenessLevel === "stale",
    )
    .sort((a, b) => (b.ageInMs || 0) - (a.ageInMs || 0))
    .slice(0, 10)
    .map((f) => f.relativePath);

  // Create freshness event entity
  const freshnessEntity: DocumentationFreshnessEventEntity = {
    docsPath,
    projectPath,
    scannedAt: report.scannedAt,
    totalFiles: report.totalFiles,
    freshFiles: report.freshFiles,
    warningFiles: report.warningFiles,
    staleFiles: report.staleFiles,
    criticalFiles: report.criticalFiles,
    filesWithoutMetadata: report.filesWithoutMetadata,
    thresholds: report.thresholds,
    averageAge,
    oldestFile: oldestFile
      ? {
          path: oldestFile.relativePath,
          ageInDays: (oldestFile.ageInMs || 0) / (1000 * 60 * 60 * 24),
        }
      : undefined,
    mostStaleFiles,
    eventType,
  };

  // Add entity to knowledge graph
  kg.addNode({
    id: eventId,
    type: "documentation_freshness_event",
    label: `Freshness Event ${timestamp}`,
    properties: freshnessEntity,
    weight: 1.0,
  });

  // Check if project node exists via async findNode, if not, create a minimal one
  const projectNode = await kg.findNode({
    type: "project",
    properties: { path: projectPath },
  });
  if (!projectNode) {
    kg.addNode({
      id: projectId,
      type: "project",
      label: projectPath.split("/").pop() || "Unknown Project",
      properties: {
        name: projectPath.split("/").pop() || "Unknown",
        path: projectPath,
        createdAt: timestamp,
      },
      weight: 1.0,
    });
  }

  // Calculate improvement score (0-1, higher is better)
  const improvementScore =
    report.totalFiles > 0
      ? (report.freshFiles +
          report.warningFiles * 0.7 +
          report.staleFiles * 0.3) /
        report.totalFiles
      : 1.0;

  // Create relationship between project and freshness event
  const relationship: ProjectHasFreshnessEventRelationship = {
    type: "project_has_freshness_event",
    eventType,
    filesScanned: report.totalFiles,
    freshFiles: report.freshFiles,
    staleFiles: report.staleFiles,
    criticalFiles: report.criticalFiles,
    filesInitialized: 0, // This will be updated by validation events
    filesUpdated: 0, // This will be updated by update events
    averageStaleness: averageAge,
    improvementScore,
    weight: 1.0,
    confidence: 1.0,
    createdAt: timestamp,
    lastUpdated: timestamp,
    metadata: {
      docsPath,
      thresholds: report.thresholds,
    },
  };

  kg.addEdge({
    source: projectId,
    target: eventId,
    type: "project_has_freshness_event",
    weight: 1.0,
    confidence: 1.0,
    properties: relationship,
  });

  // Persist to storage
  const nodes = await kg.getAllNodes();
  const edges = await kg.getAllEdges();
  await storage.saveGraph(nodes, edges);

  return eventId;
}

/**
 * Update a freshness event with validation/update results
 */
export async function updateFreshnessEvent(
  eventId: string,
  updates: {
    filesInitialized?: number;
    filesUpdated?: number;
    eventType?: "scan" | "validation" | "initialization" | "update";
  },
): Promise<void> {
  const kg = await getKnowledgeGraph();
  const storage = await getKGStorage();

  // Find event node using async API
  const eventNode = await kg.findNode({
    type: "documentation_freshness_event",
  });
  if (!eventNode || eventNode.id !== eventId) {
    throw new Error(`Freshness event not found: ${eventId}`);
  }

  // Update entity properties
  if (updates.eventType) {
    eventNode.properties.eventType = updates.eventType;
  }
  eventNode.lastUpdated = new Date().toISOString();

  // Find and update the relationship
  const relEdges = await kg.findEdges({
    target: eventId,
    type: "project_has_freshness_event",
  });

  for (const edge of relEdges) {
    const props = edge.properties as ProjectHasFreshnessEventRelationship;
    if (updates.filesInitialized !== undefined) {
      props.filesInitialized = updates.filesInitialized;
    }
    if (updates.filesUpdated !== undefined) {
      props.filesUpdated = updates.filesUpdated;
    }
    if (updates.eventType) {
      props.eventType = updates.eventType;
    }
    edge.lastUpdated = new Date().toISOString();
  }

  // Persist to storage
  const allNodes = await kg.getAllNodes();
  const allEdges = await kg.getAllEdges();
  await storage.saveGraph(allNodes, allEdges);
}

/**
 * Get freshness event history for a project
 */
export async function getFreshnessHistory(
  projectPath: string,
  limit: number = 10,
): Promise<
  Array<{
    eventId: string;
    event: DocumentationFreshnessEventEntity;
    relationship: ProjectHasFreshnessEventRelationship;
  }>
> {
  const kg = await getKnowledgeGraph();
  const projectId = generateProjectId(projectPath);

  const edges = await kg.findEdges({
    source: projectId,
    type: "project_has_freshness_event",
  });

  // Sort by timestamp (most recent first)
  const sorted = await Promise.all(
    edges.map(async (edge) => {
      const eventNode = await kg.findNode({
        type: "documentation_freshness_event",
      });
      if (!eventNode || eventNode.id !== edge.target) {
        return null;
      }

      return {
        eventId: edge.target,
        event: eventNode.properties as DocumentationFreshnessEventEntity,
        relationship: edge.properties as ProjectHasFreshnessEventRelationship,
        timestamp: (eventNode.properties as DocumentationFreshnessEventEntity)
          .scannedAt,
      };
    }),
  );

  const filtered = sorted
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit);

  return filtered.map(({ eventId, event, relationship }) => ({
    eventId,
    event,
    relationship,
  }));
}

/**
 * Get staleness insights for a project
 */
export async function getStalenessInsights(projectPath: string): Promise<{
  totalEvents: number;
  averageImprovementScore: number;
  trend: "improving" | "declining" | "stable";
  currentStatus: {
    freshFiles: number;
    staleFiles: number;
    criticalFiles: number;
    totalFiles: number;
  } | null;
  recommendations: string[];
}> {
  const history = await getFreshnessHistory(projectPath, 100);

  if (history.length === 0) {
    return {
      totalEvents: 0,
      averageImprovementScore: 0,
      trend: "stable",
      currentStatus: null,
      recommendations: [
        "No freshness tracking history found. Run track_documentation_freshness to begin monitoring.",
      ],
    };
  }

  // Calculate average improvement score
  const avgScore =
    history.reduce(
      (sum, h) => sum + (h.relationship.improvementScore || 0),
      0,
    ) / history.length;

  // Determine trend (compare first half to second half)
  const midpoint = Math.floor(history.length / 2);
  const recentScore =
    history
      .slice(0, midpoint)
      .reduce((sum, h) => sum + (h.relationship.improvementScore || 0), 0) /
    Math.max(midpoint, 1);
  const olderScore =
    history
      .slice(midpoint)
      .reduce((sum, h) => sum + (h.relationship.improvementScore || 0), 0) /
    Math.max(history.length - midpoint, 1);

  let trend: "improving" | "declining" | "stable";
  if (recentScore > olderScore + 0.1) {
    trend = "improving";
  } else if (recentScore < olderScore - 0.1) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  // Get current status from most recent event
  const latest = history[0];
  const currentStatus = {
    freshFiles: latest.event.freshFiles,
    staleFiles: latest.event.staleFiles,
    criticalFiles: latest.event.criticalFiles,
    totalFiles: latest.event.totalFiles,
  };

  // Generate recommendations
  const recommendations: string[] = [];

  if (currentStatus.criticalFiles > 0) {
    recommendations.push(
      `🔴 ${currentStatus.criticalFiles} files are critically stale and need immediate attention`,
    );
  }

  if (currentStatus.staleFiles > currentStatus.totalFiles * 0.3) {
    recommendations.push(
      `🟠 Over 30% of documentation is stale. Consider running validate_documentation_freshness`,
    );
  }

  if (trend === "declining") {
    recommendations.push(
      "📉 Documentation freshness is declining. Review update processes and automation",
    );
  } else if (trend === "improving") {
    recommendations.push(
      "📈 Documentation freshness is improving. Keep up the good work!",
    );
  }

  if (latest.event.filesWithoutMetadata > 0) {
    recommendations.push(
      `⚠️ ${latest.event.filesWithoutMetadata} files lack freshness metadata. Run validate_documentation_freshness with initializeMissing=true`,
    );
  }

  // Analyze most commonly stale files
  const allStaleFiles = history.flatMap((h) => h.event.mostStaleFiles);
  const staleFileCounts = new Map<string, number>();
  for (const file of allStaleFiles) {
    staleFileCounts.set(file, (staleFileCounts.get(file) || 0) + 1);
  }

  const chronicallyStale = Array.from(staleFileCounts.entries())
    .filter(([_, count]) => count >= Math.min(3, history.length * 0.5))
    .map(([file]) => file);

  if (chronicallyStale.length > 0) {
    recommendations.push(
      `🔄 ${
        chronicallyStale.length
      } files are chronically stale: ${chronicallyStale
        .slice(0, 3)
        .join(", ")}${chronicallyStale.length > 3 ? "..." : ""}`,
    );
  }

  return {
    totalEvents: history.length,
    averageImprovementScore: avgScore,
    trend,
    currentStatus,
    recommendations,
  };
}

/**
 * Compare freshness across similar projects
 */
export async function compareFreshnessAcrossProjects(
  projectPath: string,
): Promise<{
  currentProject: {
    path: string;
    improvementScore: number;
  };
  similarProjects: Array<{
    path: string;
    improvementScore: number;
    similarity: number;
  }>;
  ranking: number; // 1-based ranking (1 = best)
}> {
  const kg = await getKnowledgeGraph();
  const projectId = generateProjectId(projectPath);

  // Get current project's latest score
  const history = await getFreshnessHistory(projectPath, 1);
  const currentScore =
    history.length > 0 ? history[0].relationship.improvementScore || 0 : 0;

  // Find similar projects
  const similarEdges = await kg.findEdges({
    source: projectId,
    type: "similar_to",
  });

  const similarProjectsPromises = similarEdges.map(async (edge) => {
    const similarProjectNode = await kg.findNode({ type: "project" });
    if (!similarProjectNode || similarProjectNode.id !== edge.target) {
      return null;
    }

    const similarPath = (similarProjectNode.properties as any).path || "";
    const similarHistory = await getFreshnessHistory(similarPath, 1);
    const similarScore =
      similarHistory.length > 0
        ? similarHistory[0].relationship.improvementScore || 0
        : 0;

    return {
      path: similarPath,
      improvementScore: similarScore,
      similarity: (edge.properties as any).similarityScore || 0,
    };
  });

  const similarProjects = await Promise.all(similarProjectsPromises);
  const validSimilarProjects = similarProjects.filter(
    (p): p is NonNullable<typeof p> => p !== null,
  );

  // Calculate ranking
  const allScores = [
    currentScore,
    ...validSimilarProjects.map((p) => p.improvementScore),
  ];
  const sortedScores = [...allScores].sort((a, b) => b - a);
  const ranking = sortedScores.indexOf(currentScore) + 1;

  return {
    currentProject: {
      path: projectPath,
      improvementScore: currentScore,
    },
    similarProjects: validSimilarProjects,
    ranking,
  };
}
