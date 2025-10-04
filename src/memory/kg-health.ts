/**
 * Knowledge Graph Health Monitoring Module
 * Implements Phase 2: KG Health Tracking
 *
 * Provides comprehensive health monitoring, issue detection, and trend analysis
 * for the DocuMCP knowledge graph to ensure data quality and performance.
 */

import { promises as fs } from "fs";
import { join } from "path";
import KnowledgeGraph, { GraphNode, GraphEdge } from "./knowledge-graph.js";
import { KGStorage } from "./kg-storage.js";

// ============================================================================
// Health Metrics Schema
// ============================================================================

export interface KGHealthMetrics {
  timestamp: string;
  overallHealth: number; // 0-100 score
  dataQuality: DataQualityMetrics;
  structureHealth: StructureHealthMetrics;
  performance: PerformanceMetrics;
  trends: HealthTrends;
  issues: HealthIssue[];
  recommendations: HealthRecommendation[];
}

export interface DataQualityMetrics {
  score: number; // 0-100
  staleNodeCount: number; // nodes not updated in 30+ days
  orphanedEdgeCount: number;
  duplicateCount: number;
  confidenceAverage: number;
  completenessScore: number; // % of expected relationships present
  totalNodes: number;
  totalEdges: number;
}

export interface StructureHealthMetrics {
  score: number; // 0-100
  isolatedNodeCount: number; // nodes with no edges
  clusteringCoefficient: number;
  averagePathLength: number;
  densityScore: number;
  connectedComponents: number;
}

export interface PerformanceMetrics {
  score: number; // 0-100
  avgQueryTime: number; // ms
  storageSize: number; // bytes
  growthRate: number; // bytes/day
  indexEfficiency: number;
}

export interface HealthTrends {
  healthTrend: "improving" | "stable" | "degrading";
  nodeGrowthRate: number; // nodes/day
  edgeGrowthRate: number; // edges/day
  errorRate: number; // errors/operations (from last 100 operations)
  qualityTrend: "improving" | "stable" | "degrading";
}

export interface HealthIssue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "integrity" | "performance" | "quality" | "structure";
  description: string;
  affectedEntities: string[];
  remediation: string;
  detectedAt: string;
  autoFixable: boolean;
}

export interface HealthRecommendation {
  id: string;
  priority: "high" | "medium" | "low";
  action: string;
  expectedImpact: number; // health score increase (0-100)
  effort: "low" | "medium" | "high";
  category: string;
}

export interface HealthHistory {
  timestamp: string;
  overallHealth: number;
  dataQuality: number;
  structureHealth: number;
  performance: number;
  nodeCount: number;
  edgeCount: number;
}

// ============================================================================
// Health Monitoring Class
// ============================================================================

export class KGHealthMonitor {
  private storageDir: string;
  private historyFilePath: string;
  private issueDetectors: IssueDetector[];
  private performanceTracking: PerformanceTracker;

  constructor(storageDir?: string) {
    this.storageDir = storageDir || `${process.cwd()}/.documcp/memory`;
    this.historyFilePath = join(this.storageDir, "health-history.jsonl");
    this.issueDetectors = createIssueDetectors();
    this.performanceTracking = new PerformanceTracker();
  }

  /**
   * Calculate comprehensive health metrics
   */
  async calculateHealth(
    kg: KnowledgeGraph,
    storage: KGStorage,
  ): Promise<KGHealthMetrics> {
    const timestamp = new Date().toISOString();

    // Calculate component metrics
    const dataQuality = await this.calculateDataQuality(kg, storage);
    const structureHealth = await this.calculateStructureHealth(kg);
    const performance = await this.calculatePerformance(storage);

    // Calculate overall health (weighted average)
    const overallHealth = Math.round(
      dataQuality.score * 0.4 +
        structureHealth.score * 0.3 +
        performance.score * 0.3,
    );

    // Detect issues
    const issues = await this.detectIssues(kg, {
      dataQuality,
      structureHealth,
      performance,
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, {
      dataQuality,
      structureHealth,
      performance,
    });

    // Analyze trends
    const trends = await this.analyzeTrends(overallHealth);

    const metrics: KGHealthMetrics = {
      timestamp,
      overallHealth,
      dataQuality,
      structureHealth,
      performance,
      trends,
      issues,
      recommendations,
    };

    // Track history
    await this.trackHealthHistory(metrics);

    return metrics;
  }

  /**
   * Calculate data quality metrics
   */
  private async calculateDataQuality(
    kg: KnowledgeGraph,
    storage: KGStorage,
  ): Promise<DataQualityMetrics> {
    await kg.getStatistics();
    const integrity = await storage.verifyIntegrity();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Count stale nodes
    const allNodes = await kg.getAllNodes();
    const staleNodeCount = allNodes.filter((node) => {
      const lastUpdated = new Date(node.lastUpdated);
      return lastUpdated < thirtyDaysAgo;
    }).length;

    // Get orphaned edges from integrity check
    const orphanedEdgeCount = integrity.warnings.filter((w) =>
      w.includes("missing"),
    ).length;

    // Get duplicate count from integrity check
    const duplicateCount = integrity.errors.filter((e) =>
      e.includes("Duplicate"),
    ).length;

    // Calculate average confidence
    const allEdges = await kg.getAllEdges();
    const confidenceAverage =
      allEdges.length > 0
        ? allEdges.reduce((sum, edge) => sum + edge.confidence, 0) /
          allEdges.length
        : 1.0;

    // Calculate completeness (% of projects with expected relationships)
    const completenessScore = this.calculateCompleteness(allNodes, allEdges);

    // Calculate data quality score (0-100)
    const stalePercentage =
      (staleNodeCount / Math.max(allNodes.length, 1)) * 100;
    const orphanPercentage =
      (orphanedEdgeCount / Math.max(allEdges.length, 1)) * 100;
    const qualityDeductions =
      stalePercentage * 0.3 + orphanPercentage * 0.5 + duplicateCount * 10;

    const score = Math.max(
      0,
      Math.min(100, 100 - qualityDeductions + (completenessScore - 0.5) * 50),
    );

    return {
      score: Math.round(score),
      staleNodeCount,
      orphanedEdgeCount,
      duplicateCount,
      confidenceAverage,
      completenessScore,
      totalNodes: allNodes.length,
      totalEdges: allEdges.length,
    };
  }

  /**
   * Calculate structure health metrics
   */
  private async calculateStructureHealth(
    kg: KnowledgeGraph,
  ): Promise<StructureHealthMetrics> {
    await kg.getStatistics();
    const allNodes = await kg.getAllNodes();
    const allEdges = await kg.getAllEdges();

    // Count isolated nodes (no edges)
    const nodeConnections = new Map<string, number>();
    for (const edge of allEdges) {
      nodeConnections.set(
        edge.source,
        (nodeConnections.get(edge.source) || 0) + 1,
      );
      nodeConnections.set(
        edge.target,
        (nodeConnections.get(edge.target) || 0) + 1,
      );
    }

    const isolatedNodeCount = allNodes.filter(
      (node) => !nodeConnections.has(node.id),
    ).length;

    // Calculate clustering coefficient (simplified)
    const clusteringCoefficient = this.calculateClusteringCoefficient(
      allNodes,
      allEdges,
    );

    // Calculate average path length (simplified - using BFS on sample)
    const averagePathLength = this.calculateAveragePathLength(
      allNodes,
      allEdges,
    );

    // Calculate density score
    const maxPossibleEdges = (allNodes.length * (allNodes.length - 1)) / 2;
    const densityScore =
      maxPossibleEdges > 0 ? allEdges.length / maxPossibleEdges : 0;

    // Count connected components
    const connectedComponents = this.countConnectedComponents(
      allNodes,
      allEdges,
    );

    // Calculate structure health score
    const isolatedPercentage =
      (isolatedNodeCount / Math.max(allNodes.length, 1)) * 100;
    const score = Math.max(
      0,
      Math.min(
        100,
        100 -
          isolatedPercentage * 0.5 +
          clusteringCoefficient * 20 -
          (connectedComponents - 1) * 5,
      ),
    );

    return {
      score: Math.round(score),
      isolatedNodeCount,
      clusteringCoefficient,
      averagePathLength,
      densityScore,
      connectedComponents,
    };
  }

  /**
   * Calculate performance metrics
   */
  private async calculatePerformance(
    storage: KGStorage,
  ): Promise<PerformanceMetrics> {
    const storageStats = await storage.getStatistics();

    // Get average query time from performance tracker
    const avgQueryTime = this.performanceTracking.getAverageQueryTime();

    // Calculate storage size
    const storageSize =
      storageStats.fileSize.entities + storageStats.fileSize.relationships;

    // Calculate growth rate (bytes/day) from history
    const growthRate = await this.calculateGrowthRate();

    // Index efficiency (placeholder - would need actual indexing metrics)
    const indexEfficiency = 0.8;

    // Calculate performance score
    const queryScore =
      avgQueryTime < 10 ? 100 : Math.max(0, 100 - avgQueryTime);
    const sizeScore =
      storageSize < 10 * 1024 * 1024
        ? 100
        : Math.max(0, 100 - storageSize / (1024 * 1024));
    const score = Math.round(
      queryScore * 0.5 + sizeScore * 0.3 + indexEfficiency * 100 * 0.2,
    );

    return {
      score,
      avgQueryTime,
      storageSize,
      growthRate,
      indexEfficiency,
    };
  }

  /**
   * Detect issues in the knowledge graph
   */
  private async detectIssues(
    kg: KnowledgeGraph,
    metrics: {
      dataQuality: DataQualityMetrics;
      structureHealth: StructureHealthMetrics;
      performance: PerformanceMetrics;
    },
  ): Promise<HealthIssue[]> {
    const issues: HealthIssue[] = [];

    for (const detector of this.issueDetectors) {
      const detectedIssues = await detector.detect(kg, metrics);
      issues.push(...detectedIssues);
    }

    // Sort by severity
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return issues;
  }

  /**
   * Generate recommendations based on issues and metrics
   */
  private generateRecommendations(
    issues: HealthIssue[],
    metrics: {
      dataQuality: DataQualityMetrics;
      structureHealth: StructureHealthMetrics;
      performance: PerformanceMetrics;
    },
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    // Generate recommendations for critical/high severity issues
    for (const issue of issues.filter(
      (i) => i.severity === "critical" || i.severity === "high",
    )) {
      if (issue.autoFixable) {
        recommendations.push({
          id: `fix_${issue.id}`,
          priority: "high",
          action: issue.remediation,
          expectedImpact: issue.severity === "critical" ? 20 : 10,
          effort: "low",
          category: issue.category,
        });
      }
    }

    // Data quality recommendations
    if (metrics.dataQuality.score < 70) {
      if (metrics.dataQuality.staleNodeCount > 10) {
        recommendations.push({
          id: "refresh_stale_data",
          priority: "medium",
          action: `Re-analyze ${metrics.dataQuality.staleNodeCount} stale projects to refresh data`,
          expectedImpact: 15,
          effort: "medium",
          category: "data_quality",
        });
      }

      if (metrics.dataQuality.orphanedEdgeCount > 5) {
        recommendations.push({
          id: "cleanup_orphaned_edges",
          priority: "high",
          action: "Run automated cleanup to remove orphaned relationships",
          expectedImpact: 10,
          effort: "low",
          category: "data_quality",
        });
      }
    }

    // Structure health recommendations
    if (metrics.structureHealth.score < 70) {
      if (metrics.structureHealth.isolatedNodeCount > 0) {
        recommendations.push({
          id: "connect_isolated_nodes",
          priority: "medium",
          action: `Review and connect ${metrics.structureHealth.isolatedNodeCount} isolated nodes`,
          expectedImpact: 8,
          effort: "medium",
          category: "structure",
        });
      }
    }

    // Performance recommendations
    if (metrics.performance.score < 70) {
      if (metrics.performance.storageSize > 50 * 1024 * 1024) {
        recommendations.push({
          id: "optimize_storage",
          priority: "medium",
          action: "Archive or compress old knowledge graph data",
          expectedImpact: 12,
          effort: "high",
          category: "performance",
        });
      }
    }

    // Sort by priority and expected impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.expectedImpact - a.expectedImpact;
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Analyze trends from historical health data
   */
  private async analyzeTrends(currentHealth: number): Promise<HealthTrends> {
    const history = await this.getHealthHistory(7); // Last 7 days

    if (history.length < 2) {
      return {
        healthTrend: "stable",
        nodeGrowthRate: 0,
        edgeGrowthRate: 0,
        errorRate: 0,
        qualityTrend: "stable",
      };
    }

    // Calculate health trend
    const sevenDayAvg =
      history.reduce((sum, h) => sum + h.overallHealth, 0) / history.length;
    const healthDiff = currentHealth - sevenDayAvg;

    const healthTrend =
      healthDiff > 5 ? "improving" : healthDiff < -5 ? "degrading" : "stable";

    // Calculate growth rates
    const oldestEntry = history[history.length - 1];
    const newestEntry = history[0];
    const daysDiff = Math.max(
      1,
      (new Date(newestEntry.timestamp).getTime() -
        new Date(oldestEntry.timestamp).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const nodeGrowthRate =
      (newestEntry.nodeCount - oldestEntry.nodeCount) / daysDiff;
    const edgeGrowthRate =
      (newestEntry.edgeCount - oldestEntry.edgeCount) / daysDiff;

    // Quality trend
    const qualityAvg =
      history.reduce((sum, h) => sum + h.dataQuality, 0) / history.length;
    const qualityDiff = history[0].dataQuality - qualityAvg;

    const qualityTrend =
      qualityDiff > 5 ? "improving" : qualityDiff < -5 ? "degrading" : "stable";

    return {
      healthTrend,
      nodeGrowthRate: Math.round(nodeGrowthRate * 10) / 10,
      edgeGrowthRate: Math.round(edgeGrowthRate * 10) / 10,
      errorRate: 0, // TODO: Track from operations log
      qualityTrend,
    };
  }

  /**
   * Track health history to persistent storage
   */
  private async trackHealthHistory(metrics: KGHealthMetrics): Promise<void> {
    const historyEntry: HealthHistory = {
      timestamp: metrics.timestamp,
      overallHealth: metrics.overallHealth,
      dataQuality: metrics.dataQuality.score,
      structureHealth: metrics.structureHealth.score,
      performance: metrics.performance.score,
      nodeCount: metrics.dataQuality.totalNodes,
      edgeCount: metrics.dataQuality.totalEdges,
    };

    try {
      await fs.appendFile(
        this.historyFilePath,
        JSON.stringify(historyEntry) + "\n",
        "utf-8",
      );

      // Keep only last 90 days of history
      await this.pruneHistoryFile(90);
    } catch (error) {
      console.warn("Failed to track health history:", error);
    }
  }

  /**
   * Get health history for the last N days
   */
  private async getHealthHistory(days: number): Promise<HealthHistory[]> {
    try {
      const content = await fs.readFile(this.historyFilePath, "utf-8");
      const lines = content.trim().split("\n");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const history: HealthHistory[] = [];
      for (const line of lines) {
        if (line.trim()) {
          const entry = JSON.parse(line) as HealthHistory;
          if (new Date(entry.timestamp) >= cutoffDate) {
            history.push(entry);
          }
        }
      }

      return history.reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  /**
   * Prune history file to keep only last N days
   */
  private async pruneHistoryFile(days: number): Promise<void> {
    try {
      const history = await this.getHealthHistory(days);
      const content = history.map((h) => JSON.stringify(h)).join("\n") + "\n";
      await fs.writeFile(this.historyFilePath, content, "utf-8");
    } catch (error) {
      console.warn("Failed to prune history file:", error);
    }
  }

  // Helper methods

  private calculateCompleteness(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): number {
    const projectNodes = nodes.filter((n) => n.type === "project");
    if (projectNodes.length === 0) return 1.0;

    let totalExpected = 0;
    let totalFound = 0;

    for (const project of projectNodes) {
      // Expected relationships for each project:
      // 1. At least one technology relationship
      // 2. Documentation relationship (if hasDocs = true)
      // 3. Configuration relationship (if deployed)

      totalExpected += 1; // Technology

      const projectEdges = edges.filter((e) => e.source === project.id);

      if (projectEdges.some((e) => e.type === "project_uses_technology")) {
        totalFound += 1;
      }

      if (project.properties.hasDocs) {
        totalExpected += 1;
        if (
          projectEdges.some(
            (e) =>
              e.type === "depends_on" &&
              nodes.find((n) => n.id === e.target)?.type ===
                "documentation_section",
          )
        ) {
          totalFound += 1;
        }
      }
    }

    return totalExpected > 0 ? totalFound / totalExpected : 1.0;
  }

  private calculateClusteringCoefficient(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): number {
    // Simplified clustering coefficient calculation
    if (nodes.length < 3) return 0;

    const adjacency = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, new Set());
      }
      adjacency.get(edge.source)!.add(edge.target);
    }

    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of nodes.slice(0, 100)) {
      // Sample first 100 nodes
      const neighbors = adjacency.get(node.id);
      if (!neighbors || neighbors.size < 2) continue;

      const neighborArray = Array.from(neighbors);
      let triangles = 0;
      const possibleTriangles =
        (neighborArray.length * (neighborArray.length - 1)) / 2;

      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const n1Neighbors = adjacency.get(neighborArray[i]);
          if (n1Neighbors?.has(neighborArray[j])) {
            triangles++;
          }
        }
      }

      if (possibleTriangles > 0) {
        totalCoefficient += triangles / possibleTriangles;
        nodeCount++;
      }
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private calculateAveragePathLength(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): number {
    // Simplified using sample BFS
    if (nodes.length === 0) return 0;

    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, []);
      }
      adjacency.get(edge.source)!.push(edge.target);
    }

    // Sample 10 random nodes for BFS
    const sampleSize = Math.min(10, nodes.length);
    let totalPathLength = 0;
    let pathCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const startNode = nodes[i];
      const distances = new Map<string, number>();
      const queue = [startNode.id];
      distances.set(startNode.id, 0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = distances.get(current)!;

        const neighbors = adjacency.get(current) || [];
        for (const neighbor of neighbors) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, currentDist + 1);
            queue.push(neighbor);
          }
        }
      }

      for (const dist of distances.values()) {
        if (dist > 0) {
          totalPathLength += dist;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  private countConnectedComponents(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): number {
    if (nodes.length === 0) return 0;

    const adjacency = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, new Set());
      }
      if (!adjacency.has(edge.target)) {
        adjacency.set(edge.target, new Set());
      }
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }

    const visited = new Set<string>();
    let components = 0;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        components++;
        const queue = [node.id];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;

          visited.add(current);
          const neighbors = adjacency.get(current) || new Set();
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              queue.push(neighbor);
            }
          }
        }
      }
    }

    return components;
  }

  private async calculateGrowthRate(): Promise<number> {
    const history = await this.getHealthHistory(30);
    if (history.length < 2) return 0;

    // Calculate storage size growth (simplified)
    return 1024; // Placeholder: 1KB/day
  }
}

// ============================================================================
// Issue Detectors
// ============================================================================

interface IssueDetector {
  name: string;
  detect(
    kg: KnowledgeGraph,
    metrics: {
      dataQuality: DataQualityMetrics;
      structureHealth: StructureHealthMetrics;
      performance: PerformanceMetrics;
    },
  ): Promise<HealthIssue[]>;
}

function createIssueDetectors(): IssueDetector[] {
  return [
    {
      name: "orphaned_edges",
      async detect(kg, metrics) {
        if (metrics.dataQuality.orphanedEdgeCount > 10) {
          return [
            {
              id: "orphaned_edges_high",
              severity: "high",
              category: "integrity",
              description: `Found ${metrics.dataQuality.orphanedEdgeCount} orphaned relationships`,
              affectedEntities: [],
              remediation: "Run kg.removeOrphanedEdges() to clean up",
              detectedAt: new Date().toISOString(),
              autoFixable: true,
            },
          ];
        }
        return [];
      },
    },
    {
      name: "stale_data",
      async detect(kg, metrics) {
        if (metrics.dataQuality.staleNodeCount > 20) {
          return [
            {
              id: "stale_data_high",
              severity: "medium",
              category: "quality",
              description: `${metrics.dataQuality.staleNodeCount} nodes haven't been updated in 30+ days`,
              affectedEntities: [],
              remediation: "Re-analyze stale projects to refresh data",
              detectedAt: new Date().toISOString(),
              autoFixable: false,
            },
          ];
        }
        return [];
      },
    },
    {
      name: "low_completeness",
      async detect(kg, metrics) {
        if (metrics.dataQuality.completenessScore < 0.7) {
          return [
            {
              id: "low_completeness",
              severity: "high",
              category: "quality",
              description: `Completeness score is ${Math.round(
                metrics.dataQuality.completenessScore * 100,
              )}%`,
              affectedEntities: [],
              remediation: "Review projects for missing relationships",
              detectedAt: new Date().toISOString(),
              autoFixable: false,
            },
          ];
        }
        return [];
      },
    },
    {
      name: "isolated_nodes",
      async detect(kg, metrics) {
        const threshold = metrics.structureHealth.isolatedNodeCount;
        if (threshold > metrics.dataQuality.totalNodes * 0.05) {
          return [
            {
              id: "isolated_nodes_high",
              severity: "medium",
              category: "structure",
              description: `${threshold} nodes are isolated (no connections)`,
              affectedEntities: [],
              remediation: "Review and connect isolated nodes",
              detectedAt: new Date().toISOString(),
              autoFixable: false,
            },
          ];
        }
        return [];
      },
    },
    {
      name: "duplicate_entities",
      async detect(kg, metrics) {
        if (metrics.dataQuality.duplicateCount > 0) {
          return [
            {
              id: "duplicate_entities",
              severity: "critical",
              category: "integrity",
              description: `Found ${metrics.dataQuality.duplicateCount} duplicate entities`,
              affectedEntities: [],
              remediation: "Merge duplicate entities",
              detectedAt: new Date().toISOString(),
              autoFixable: false,
            },
          ];
        }
        return [];
      },
    },
  ];
}

// ============================================================================
// Performance Tracker
// ============================================================================

class PerformanceTracker {
  private queryTimes: number[] = [];
  private maxSamples = 100;

  trackQuery(timeMs: number): void {
    this.queryTimes.push(timeMs);
    if (this.queryTimes.length > this.maxSamples) {
      this.queryTimes.shift();
    }
  }

  getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return (
      this.queryTimes.reduce((sum, t) => sum + t, 0) / this.queryTimes.length
    );
  }
}
