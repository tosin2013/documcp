/**
 * Knowledge Graph Health Check Tool
 * MCP tool for checking knowledge graph health and getting recommendations
 */

import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import { getKnowledgeGraph, getKGStorage } from "../memory/kg-integration.js";
import { KGHealthMonitor, KGHealthMetrics } from "../memory/kg-health.js";

const inputSchema = z.object({
  includeHistory: z.boolean().optional().default(false),
  generateReport: z.boolean().optional().default(true),
  days: z.number().min(1).max(90).optional().default(7),
});

/**
 * Check the health of the knowledge graph
 *
 * Performs comprehensive health analysis including data quality, structure health,
 * performance metrics, issue detection, and trend analysis.
 *
 * @param args - The input arguments
 * @param args.includeHistory - Include historical health trend data
 * @param args.generateReport - Generate a formatted health report
 * @param args.days - Number of days of history to include (1-90)
 *
 * @returns Health metrics with recommendations
 *
 * @example
 * ```typescript
 * const result = await checkKGHealth({
 *   includeHistory: true,
 *   generateReport: true,
 *   days: 7
 * });
 * ```
 */
export async function checkKGHealth(
  args: unknown,
): Promise<{ content: any[]; isError?: boolean }> {
  const startTime = Date.now();

  try {
    const { includeHistory, generateReport } = inputSchema.parse(args);

    // Get KG instances
    const kg = await getKnowledgeGraph();
    const storage = await getKGStorage();

    // Create health monitor
    const monitor = new KGHealthMonitor();

    // Calculate health
    const health = await monitor.calculateHealth(kg, storage);

    // Generate report if requested
    let report = "";
    if (generateReport) {
      report = generateHealthReport(health, includeHistory);
    }

    const response: MCPToolResponse<KGHealthMetrics> = {
      success: true,
      data: health,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: health.recommendations.map((rec) => ({
        type: rec.priority === "high" ? "warning" : "info",
        title: rec.action,
        description: `Expected impact: +${rec.expectedImpact} health score | Effort: ${rec.effort}`,
      })),
      nextSteps: [
        {
          action: "Apply Recommendations",
          toolRequired: "manual",
          description:
            "Implement high-priority recommendations to improve health",
          priority: "high",
        },
        ...(health.issues.filter((i) => i.severity === "critical").length > 0
          ? [
              {
                action: "Fix Critical Issues",
                toolRequired: "manual" as const,
                description: "Address critical issues immediately",
                priority: "high" as const,
              },
            ]
          : []),
      ],
    };

    if (generateReport) {
      // Add report as additional content
      return {
        content: [
          ...formatMCPResponse(response).content,
          {
            type: "text",
            text: report,
          },
        ],
      };
    }

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: `Failed to check KG health: ${error}`,
        resolution: "Ensure the knowledge graph is properly initialized",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

/**
 * Generate a human-readable health report
 */
function generateHealthReport(
  health: KGHealthMetrics,
  includeHistory: boolean,
): string {
  const lines: string[] = [];

  // Header
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("       KNOWLEDGE GRAPH HEALTH REPORT");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("");

  // Overall Health
  lines.push(
    `📊 OVERALL HEALTH: ${health.overallHealth}/100 ${getHealthEmoji(
      health.overallHealth,
    )}`,
  );
  lines.push(
    `   Trend: ${health.trends.healthTrend.toUpperCase()} ${getTrendEmoji(
      health.trends.healthTrend,
    )}`,
  );
  lines.push("");

  // Component Scores
  lines.push("Component Scores:");
  lines.push(
    `  • Data Quality:     ${health.dataQuality.score}/100 ${getHealthEmoji(
      health.dataQuality.score,
    )}`,
  );
  lines.push(
    `  • Structure Health: ${health.structureHealth.score}/100 ${getHealthEmoji(
      health.structureHealth.score,
    )}`,
  );
  lines.push(
    `  • Performance:      ${health.performance.score}/100 ${getHealthEmoji(
      health.performance.score,
    )}`,
  );
  lines.push("");

  // Graph Statistics
  lines.push("Graph Statistics:");
  lines.push(`  • Total Nodes:      ${health.dataQuality.totalNodes}`);
  lines.push(`  • Total Edges:      ${health.dataQuality.totalEdges}`);
  lines.push(
    `  • Avg Connectivity: ${health.structureHealth.densityScore.toFixed(3)}`,
  );
  lines.push(
    `  • Storage Size:     ${formatBytes(health.performance.storageSize)}`,
  );
  lines.push("");

  // Data Quality Details
  if (health.dataQuality.score < 90) {
    lines.push("⚠️  Data Quality Issues:");
    if (health.dataQuality.staleNodeCount > 0) {
      lines.push(
        `  • ${health.dataQuality.staleNodeCount} stale nodes (>30 days old)`,
      );
    }
    if (health.dataQuality.orphanedEdgeCount > 0) {
      lines.push(`  • ${health.dataQuality.orphanedEdgeCount} orphaned edges`);
    }
    if (health.dataQuality.duplicateCount > 0) {
      lines.push(`  • ${health.dataQuality.duplicateCount} duplicate entities`);
    }
    if (health.dataQuality.completenessScore < 0.8) {
      lines.push(
        `  • Completeness: ${Math.round(
          health.dataQuality.completenessScore * 100,
        )}%`,
      );
    }
    lines.push("");
  }

  // Critical Issues
  const criticalIssues = health.issues.filter((i) => i.severity === "critical");
  const highIssues = health.issues.filter((i) => i.severity === "high");

  if (criticalIssues.length > 0 || highIssues.length > 0) {
    lines.push("🚨 CRITICAL & HIGH PRIORITY ISSUES:");
    for (const issue of [...criticalIssues, ...highIssues].slice(0, 5)) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.description}`);
      lines.push(`    → ${issue.remediation}`);
    }
    lines.push("");
  }

  // Top Recommendations
  if (health.recommendations.length > 0) {
    lines.push("💡 TOP RECOMMENDATIONS:");
    for (const rec of health.recommendations.slice(0, 5)) {
      lines.push(`  ${getPriorityIcon(rec.priority)} ${rec.action}`);
      lines.push(`     Impact: +${rec.expectedImpact} | Effort: ${rec.effort}`);
    }
    lines.push("");
  }

  // Trends
  if (includeHistory) {
    lines.push("📈 TRENDS (Last 7 Days):");
    lines.push(
      `  • Health:     ${health.trends.healthTrend} ${getTrendEmoji(
        health.trends.healthTrend,
      )}`,
    );
    lines.push(
      `  • Quality:    ${health.trends.qualityTrend} ${getTrendEmoji(
        health.trends.qualityTrend,
      )}`,
    );
    lines.push(
      `  • Node Growth:   ${health.trends.nodeGrowthRate.toFixed(1)} nodes/day`,
    );
    lines.push(
      `  • Edge Growth:   ${health.trends.edgeGrowthRate.toFixed(1)} edges/day`,
    );
    lines.push("");
  }

  // Footer
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(
    `Report generated: ${new Date(health.timestamp).toLocaleString()}`,
  );
  lines.push("═══════════════════════════════════════════════════════");

  return lines.join("\n");
}

// Helper functions

function getHealthEmoji(score: number): string {
  if (score >= 90) return "🟢 Excellent";
  if (score >= 75) return "🟡 Good";
  if (score >= 60) return "🟠 Fair";
  return "🔴 Poor";
}

function getTrendEmoji(trend: string): string {
  if (trend === "improving") return "📈";
  if (trend === "degrading") return "📉";
  return "➡️";
}

function getPriorityIcon(priority: string): string {
  if (priority === "high") return "🔴";
  if (priority === "medium") return "🟡";
  return "🟢";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
