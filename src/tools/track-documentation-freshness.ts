/**
 * Track Documentation Freshness Tool
 *
 * Scans documentation directory for staleness markers,
 * identifies files needing updates based on configurable time thresholds.
 */

import { z } from "zod";
import {
  scanDocumentationFreshness,
  STALENESS_PRESETS,
  type StalenessThreshold,
  type FreshnessScanReport,
} from "../utils/freshness-tracker.js";
import { type MCPToolResponse } from "../types/api.js";
import {
  storeFreshnessEvent,
  getStalenessInsights,
} from "../memory/freshness-kg-integration.js";

/**
 * Input schema for track_documentation_freshness tool
 */
export const TrackDocumentationFreshnessSchema = z.object({
  docsPath: z.string().describe("Path to documentation directory"),
  projectPath: z
    .string()
    .optional()
    .describe("Path to project root (for knowledge graph tracking)"),
  warningThreshold: z
    .object({
      value: z.number().positive(),
      unit: z.enum(["minutes", "hours", "days"]),
    })
    .optional()
    .describe("Warning threshold (yellow flag)"),
  staleThreshold: z
    .object({
      value: z.number().positive(),
      unit: z.enum(["minutes", "hours", "days"]),
    })
    .optional()
    .describe("Stale threshold (orange flag)"),
  criticalThreshold: z
    .object({
      value: z.number().positive(),
      unit: z.enum(["minutes", "hours", "days"]),
    })
    .optional()
    .describe("Critical threshold (red flag)"),
  preset: z
    .enum(["realtime", "active", "recent", "weekly", "monthly", "quarterly"])
    .optional()
    .describe("Use predefined threshold preset"),
  includeFileList: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include detailed file list in response"),
  sortBy: z
    .enum(["age", "path", "staleness"])
    .optional()
    .default("staleness")
    .describe("Sort order for file list"),
  storeInKG: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Store tracking event in knowledge graph for historical analysis",
    ),
});

export type TrackDocumentationFreshnessInput = z.input<
  typeof TrackDocumentationFreshnessSchema
>;

/**
 * Format freshness report for display
 */
function formatFreshnessReport(
  report: FreshnessScanReport,
  includeFileList: boolean,
  sortBy: "age" | "path" | "staleness",
): string {
  const {
    totalFiles,
    filesWithMetadata,
    filesWithoutMetadata,
    freshFiles,
    warningFiles,
    staleFiles,
    criticalFiles,
    files,
    thresholds,
  } = report;

  let output = "# Documentation Freshness Report\n\n";
  output += `**Scanned at**: ${new Date(report.scannedAt).toLocaleString()}\n`;
  output += `**Documentation path**: ${report.docsPath}\n\n`;

  // Summary statistics
  output += "## Summary Statistics\n\n";
  output += `- **Total files**: ${totalFiles}\n`;
  output += `- **With metadata**: ${filesWithMetadata} (${Math.round(
    (filesWithMetadata / totalFiles) * 100,
  )}%)\n`;
  output += `- **Without metadata**: ${filesWithoutMetadata}\n\n`;

  // Freshness breakdown
  output += "## Freshness Breakdown\n\n";
  output += `- ✅ **Fresh**: ${freshFiles} files\n`;
  output += `- 🟡 **Warning**: ${warningFiles} files (older than ${thresholds.warning.value} ${thresholds.warning.unit})\n`;
  output += `- 🟠 **Stale**: ${staleFiles} files (older than ${thresholds.stale.value} ${thresholds.stale.unit})\n`;
  output += `- 🔴 **Critical**: ${criticalFiles} files (older than ${thresholds.critical.value} ${thresholds.critical.unit})\n`;
  output += `- ❓ **Unknown**: ${filesWithoutMetadata} files (no metadata)\n\n`;

  // Recommendations
  if (filesWithoutMetadata > 0 || criticalFiles > 0 || staleFiles > 0) {
    output += "## Recommendations\n\n";

    if (filesWithoutMetadata > 0) {
      output += `⚠️ **${filesWithoutMetadata} files lack freshness metadata**. Run \`validate_documentation_freshness\` to initialize metadata.\n\n`;
    }

    if (criticalFiles > 0) {
      output += `🔴 **${criticalFiles} files are critically stale**. Immediate review and update recommended.\n\n`;
    } else if (staleFiles > 0) {
      output += `🟠 **${staleFiles} files are stale**. Consider reviewing and updating soon.\n\n`;
    }
  }

  // File list
  if (includeFileList && files.length > 0) {
    output += "## File Details\n\n";

    // Sort files
    const sortedFiles = [...files];
    switch (sortBy) {
      case "age":
        sortedFiles.sort((a, b) => (b.ageInMs || 0) - (a.ageInMs || 0));
        break;
      case "path":
        sortedFiles.sort((a, b) =>
          a.relativePath.localeCompare(b.relativePath),
        );
        break;
      case "staleness": {
        const order = {
          critical: 0,
          stale: 1,
          warning: 2,
          fresh: 3,
          unknown: 4,
        };
        sortedFiles.sort(
          (a, b) => order[a.stalenessLevel] - order[b.stalenessLevel],
        );
        break;
      }
    }

    // Group by staleness level
    const grouped = {
      critical: sortedFiles.filter((f) => f.stalenessLevel === "critical"),
      stale: sortedFiles.filter((f) => f.stalenessLevel === "stale"),
      warning: sortedFiles.filter((f) => f.stalenessLevel === "warning"),
      fresh: sortedFiles.filter((f) => f.stalenessLevel === "fresh"),
      unknown: sortedFiles.filter((f) => f.stalenessLevel === "unknown"),
    };

    for (const [level, levelFiles] of Object.entries(grouped)) {
      if (levelFiles.length === 0) continue;

      const icon = {
        critical: "🔴",
        stale: "🟠",
        warning: "🟡",
        fresh: "✅",
        unknown: "❓",
      }[level];

      output += `### ${icon} ${
        level.charAt(0).toUpperCase() + level.slice(1)
      } (${levelFiles.length})\n\n`;

      for (const file of levelFiles) {
        output += `- **${file.relativePath}**`;

        if (file.ageFormatted) {
          output += ` - Last updated ${file.ageFormatted} ago`;
        }

        if (file.metadata?.validated_against_commit) {
          output += ` (commit: ${file.metadata.validated_against_commit.substring(
            0,
            7,
          )})`;
        }

        if (!file.hasMetadata) {
          output += " - ⚠️ No metadata";
        }

        output += "\n";
      }

      output += "\n";
    }
  }

  return output;
}

/**
 * Track documentation freshness
 */
export async function trackDocumentationFreshness(
  input: TrackDocumentationFreshnessInput,
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    const {
      docsPath,
      projectPath,
      warningThreshold,
      staleThreshold,
      criticalThreshold,
      preset,
      includeFileList,
      sortBy,
      storeInKG,
    } = input;

    // Determine thresholds
    let thresholds: {
      warning?: StalenessThreshold;
      stale?: StalenessThreshold;
      critical?: StalenessThreshold;
    } = {};

    if (preset) {
      // Use preset thresholds
      const presetThreshold = STALENESS_PRESETS[preset];
      thresholds = {
        warning: presetThreshold,
        stale: { value: presetThreshold.value * 2, unit: presetThreshold.unit },
        critical: {
          value: presetThreshold.value * 3,
          unit: presetThreshold.unit,
        },
      };
    } else {
      // Use custom thresholds
      if (warningThreshold) thresholds.warning = warningThreshold;
      if (staleThreshold) thresholds.stale = staleThreshold;
      if (criticalThreshold) thresholds.critical = criticalThreshold;
    }

    // Scan documentation
    const report = await scanDocumentationFreshness(docsPath, thresholds);

    // Store in knowledge graph if requested and projectPath provided
    let kgInsights:
      | Awaited<ReturnType<typeof getStalenessInsights>>
      | undefined;
    if (storeInKG !== false && projectPath) {
      try {
        await storeFreshnessEvent(projectPath, docsPath, report, "scan");
        kgInsights = await getStalenessInsights(projectPath);
      } catch (error) {
        // KG storage failed, but continue with the response
        console.warn(
          "Failed to store freshness event in knowledge graph:",
          error,
        );
      }
    }

    // Format response
    const formattedReport = formatFreshnessReport(
      report,
      includeFileList ?? true,
      sortBy ?? "staleness",
    );

    // Add KG insights to formatted report if available
    let enhancedReport = formattedReport;
    if (kgInsights && kgInsights.totalEvents > 0) {
      enhancedReport += "\n## Historical Insights\n\n";
      enhancedReport += `- **Total tracking events**: ${kgInsights.totalEvents}\n`;
      enhancedReport += `- **Average improvement score**: ${(
        kgInsights.averageImprovementScore * 100
      ).toFixed(1)}%\n`;
      enhancedReport += `- **Trend**: ${
        kgInsights.trend === "improving"
          ? "📈 Improving"
          : kgInsights.trend === "declining"
            ? "📉 Declining"
            : "➡️ Stable"
      }\n\n`;

      if (kgInsights.recommendations.length > 0) {
        enhancedReport += "### Knowledge Graph Insights\n\n";
        for (const rec of kgInsights.recommendations) {
          enhancedReport += `${rec}\n\n`;
        }
      }
    }

    // Convert KG insights to Recommendation objects
    const recommendations =
      kgInsights?.recommendations.map((rec) => {
        // Determine type based on content
        let type: "info" | "warning" | "critical" = "info";
        if (rec.includes("🔴") || rec.includes("critical")) {
          type = "critical";
        } else if (
          rec.includes("🟠") ||
          rec.includes("⚠️") ||
          rec.includes("warning")
        ) {
          type = "warning";
        }

        return {
          type,
          title: "Documentation Freshness Insight",
          description: rec,
        };
      }) || [];

    const response: MCPToolResponse = {
      success: true,
      data: {
        summary: `Scanned ${report.totalFiles} files: ${report.criticalFiles} critical, ${report.staleFiles} stale, ${report.warningFiles} warnings, ${report.freshFiles} fresh`,
        report,
        thresholds: thresholds,
        formattedReport: enhancedReport,
        kgInsights,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations,
    };

    return response;
  } catch (error) {
    return {
      success: false,
      error: {
        code: "FRESHNESS_TRACKING_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error tracking documentation freshness",
        resolution: "Check that the documentation path exists and is readable",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
