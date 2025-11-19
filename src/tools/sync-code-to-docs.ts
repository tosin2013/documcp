/**
 * Code-to-Documentation Synchronization Tool (Phase 3)
 *
 * MCP tool for automatic documentation synchronization
 * Detects drift and applies/suggests updates
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import {
  DriftDetector,
  DriftDetectionResult,
  DriftSuggestion,
} from "../utils/drift-detector.js";
import { formatMCPResponse, MCPToolResponse } from "../types/api.js";
import { getKnowledgeGraph } from "../memory/kg-integration.js";
import { updateDocFrontmatter } from "../utils/freshness-tracker.js";
import { simpleGit } from "simple-git";

const inputSchema = z.object({
  projectPath: z.string().describe("Path to the project root"),
  docsPath: z.string().describe("Path to the documentation directory"),
  mode: z
    .enum(["detect", "preview", "apply", "auto"])
    .default("detect")
    .describe(
      "Mode: detect=analyze only, preview=show changes, apply=apply safe changes, auto=apply all changes",
    ),
  autoApplyThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe("Confidence threshold for automatic application (0-1)"),
  createSnapshot: z
    .boolean()
    .default(true)
    .describe("Create a snapshot before making changes"),
});

type SyncMode = "detect" | "preview" | "apply" | "auto";

export interface SyncResult {
  mode: SyncMode;
  driftDetections: DriftDetectionResult[];
  appliedChanges: AppliedChange[];
  pendingChanges: PendingSuggestion[];
  stats: SyncStats;
  snapshotId?: string;
}

export interface AppliedChange {
  docFile: string;
  section: string;
  changeType: "updated" | "added" | "removed";
  confidence: number;
  details: string;
}

export interface PendingSuggestion {
  docFile: string;
  section: string;
  reason: string;
  suggestion: DriftSuggestion;
  requiresReview: boolean;
}

export interface SyncStats {
  filesAnalyzed: number;
  driftsDetected: number;
  changesApplied: number;
  changesPending: number;
  breakingChanges: number;
  estimatedUpdateTime: string;
}

/**
 * Main synchronization handler
 */
export async function handleSyncCodeToDocs(
  args: unknown,
  context?: any,
): Promise<{ content: any[] }> {
  const startTime = Date.now();

  try {
    const { projectPath, docsPath, mode, autoApplyThreshold, createSnapshot } =
      inputSchema.parse(args);

    await context?.info?.(
      `🔄 Starting code-to-documentation synchronization (mode: ${mode})...`,
    );

    // Initialize drift detector
    const detector = new DriftDetector(projectPath);
    await detector.initialize();

    // Create baseline snapshot if requested
    if (createSnapshot || mode !== "detect") {
      await context?.info?.("📸 Creating code snapshot...");
      await detector.createSnapshot(projectPath, docsPath);
    }

    // Load previous snapshot for comparison
    await context?.info?.("🔍 Detecting documentation drift...");
    const previousSnapshot = await detector.loadLatestSnapshot();

    if (!previousSnapshot) {
      await context?.info?.(
        "ℹ️ No previous snapshot found. Creating baseline...",
      );
      const baselineSnapshot = await detector.createSnapshot(
        projectPath,
        docsPath,
      );

      const result: SyncResult = {
        mode,
        driftDetections: [],
        appliedChanges: [],
        pendingChanges: [],
        stats: {
          filesAnalyzed: baselineSnapshot.files.size,
          driftsDetected: 0,
          changesApplied: 0,
          changesPending: 0,
          breakingChanges: 0,
          estimatedUpdateTime: "0 minutes",
        },
        snapshotId: baselineSnapshot.timestamp,
      };

      const response: MCPToolResponse<typeof result> = {
        success: true,
        data: result,
        metadata: {
          toolVersion: "3.0.0",
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        recommendations: [
          {
            type: "info",
            title: "Baseline Created",
            description:
              "Baseline snapshot created. Run sync again after code changes to detect drift.",
          },
        ],
      };

      return formatMCPResponse(response, { fullResponse: true });
    }

    // Create current snapshot and detect drift
    const currentSnapshot = await detector.createSnapshot(
      projectPath,
      docsPath,
    );
    const driftResults = await detector.detectDrift(
      previousSnapshot,
      currentSnapshot,
    );

    await context?.info?.(
      `📊 Found ${driftResults.length} file(s) with documentation drift`,
    );

    // Process based on mode
    const appliedChanges: AppliedChange[] = [];
    const pendingChanges: PendingSuggestion[] = [];

    for (const driftResult of driftResults) {
      if (driftResult.hasDrift) {
        for (const suggestion of driftResult.suggestions) {
          if (mode === "apply" || mode === "auto") {
            // Apply changes based on confidence
            const shouldApply =
              mode === "auto" ||
              (suggestion.autoApplicable &&
                suggestion.confidence >= autoApplyThreshold);

            if (shouldApply) {
              try {
                await applyDocumentationChange(
                  suggestion,
                  context,
                  projectPath,
                );
                appliedChanges.push({
                  docFile: suggestion.docFile,
                  section: suggestion.section,
                  changeType: "updated",
                  confidence: suggestion.confidence,
                  details: suggestion.reasoning,
                });
              } catch (error: any) {
                await context?.warn?.(
                  `Failed to apply change to ${suggestion.docFile}: ${error.message}`,
                );
                pendingChanges.push({
                  docFile: suggestion.docFile,
                  section: suggestion.section,
                  reason: `Auto-apply failed: ${error.message}`,
                  suggestion,
                  requiresReview: true,
                });
              }
            } else {
              pendingChanges.push({
                docFile: suggestion.docFile,
                section: suggestion.section,
                reason: "Requires manual review",
                suggestion,
                requiresReview: true,
              });
            }
          } else {
            // Preview/detect mode - just collect suggestions
            pendingChanges.push({
              docFile: suggestion.docFile,
              section: suggestion.section,
              reason: "Detected drift",
              suggestion,
              requiresReview: !suggestion.autoApplicable,
            });
          }
        }
      }
    }

    // Calculate stats
    const stats = calculateSyncStats(
      driftResults,
      appliedChanges,
      pendingChanges,
    );

    // Store sync results in knowledge graph
    await storeSyncResults(projectPath, driftResults, appliedChanges, context);

    const result: SyncResult = {
      mode,
      driftDetections: driftResults,
      appliedChanges,
      pendingChanges,
      stats,
      snapshotId: currentSnapshot.timestamp,
    };

    const response: MCPToolResponse<typeof result> = {
      success: true,
      data: result,
      metadata: {
        toolVersion: "3.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: generateRecommendations(result),
      nextSteps: generateNextSteps(result),
    };

    await context?.info?.(
      `✅ Synchronization complete: ${appliedChanges.length} applied, ${pendingChanges.length} pending`,
    );

    return formatMCPResponse(response, { fullResponse: true });
  } catch (error: any) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "SYNC_FAILED",
        message: `Documentation synchronization failed: ${error.message}`,
        resolution: "Check project and documentation paths are correct",
      },
      metadata: {
        toolVersion: "3.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };

    return formatMCPResponse(errorResponse, { fullResponse: true });
  }
}

/**
 * Apply a documentation change to a file
 */
async function applyDocumentationChange(
  suggestion: DriftSuggestion,
  context?: any,
  projectPath?: string,
): Promise<void> {
  const filePath = suggestion.docFile;

  // Read current file
  const content = await fs.readFile(filePath, "utf-8");

  // Find and replace the section
  const sectionPattern = new RegExp(
    `(#{1,6}\\s+${escapeRegex(suggestion.section)}[\\s\\S]*?)(?=#{1,6}\\s+|$)`,
    "g",
  );

  let newContent = content;
  const match = sectionPattern.exec(content);

  if (match) {
    // Replace existing section
    newContent = content.replace(sectionPattern, suggestion.suggestedContent);
    await context?.info?.(
      `✏️ Updated section '${suggestion.section}' in ${path.basename(
        filePath,
      )}`,
    );
  } else {
    // Append new section
    newContent = content + "\n\n" + suggestion.suggestedContent;
    await context?.info?.(
      `➕ Added section '${suggestion.section}' to ${path.basename(filePath)}`,
    );
  }

  // Write back to file
  await fs.writeFile(filePath, newContent, "utf-8");

  // Update freshness metadata
  try {
    let currentCommit: string | undefined;
    if (projectPath) {
      try {
        const git = simpleGit(projectPath);
        const isRepo = await git.checkIsRepo();
        if (isRepo) {
          const log = await git.log({ maxCount: 1 });
          currentCommit = log.latest?.hash;
        }
      } catch {
        // Git not available, continue without it
      }
    }

    await updateDocFrontmatter(filePath, {
      last_updated: new Date().toISOString(),
      last_validated: new Date().toISOString(),
      auto_updated: true,
      validated_against_commit: currentCommit,
    });

    await context?.info?.(
      `🏷️ Updated freshness metadata for ${path.basename(filePath)}`,
    );
  } catch (error) {
    // Non-critical error, just log it
    await context?.warn?.(`Failed to update freshness metadata: ${error}`);
  }
}

/**
 * Store sync results in knowledge graph
 */
async function storeSyncResults(
  projectPath: string,
  driftResults: DriftDetectionResult[],
  appliedChanges: AppliedChange[],
  context?: any,
): Promise<void> {
  try {
    const kg = await getKnowledgeGraph();

    // Store sync event
    const syncNode = {
      id: `sync:${projectPath}:${Date.now()}`,
      type: "sync_event" as const,
      label: "Code-Docs Sync",
      properties: {
        projectPath,
        timestamp: new Date().toISOString(),
        driftsDetected: driftResults.length,
        changesApplied: appliedChanges.length,
        success: true,
      },
      weight: 1.0,
      lastUpdated: new Date().toISOString(),
    };

    kg.addNode(syncNode);

    // Link to project
    const projectId = `project:${projectPath.split("/").pop() || "unknown"}`;
    kg.addEdge({
      source: projectId,
      target: syncNode.id,
      type: "has_sync_event",
      weight: 1.0,
      confidence: 1.0,
      properties: {
        eventType: "sync",
      },
    });
  } catch (error) {
    await context?.warn?.(
      `Failed to store sync results in knowledge graph: ${error}`,
    );
  }
}

/**
 * Calculate synchronization statistics
 */
function calculateSyncStats(
  driftResults: DriftDetectionResult[],
  appliedChanges: AppliedChange[],
  pendingChanges: PendingSuggestion[],
): SyncStats {
  const filesAnalyzed = driftResults.length;
  const driftsDetected = driftResults.filter((r) => r.hasDrift).length;
  const breakingChanges = driftResults.reduce(
    (sum, r) => sum + r.impactAnalysis.breakingChanges,
    0,
  );

  // Estimate update time (5 min per breaking change, 2 min per pending change)
  const estimatedMinutes = breakingChanges * 5 + pendingChanges.length * 2;
  const estimatedUpdateTime =
    estimatedMinutes < 60
      ? `${estimatedMinutes} minutes`
      : `${Math.round(estimatedMinutes / 60)} hours`;

  return {
    filesAnalyzed,
    driftsDetected,
    changesApplied: appliedChanges.length,
    changesPending: pendingChanges.length,
    breakingChanges,
    estimatedUpdateTime,
  };
}

/**
 * Generate recommendations based on sync results
 */
function generateRecommendations(result: SyncResult): Array<{
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
}> {
  const recommendations: Array<{
    type: "critical" | "warning" | "info";
    title: string;
    description: string;
  }> = [];

  if (result.stats.breakingChanges > 0) {
    recommendations.push({
      type: "critical",
      title: "Breaking Changes Detected",
      description: `${result.stats.breakingChanges} breaking change(s) detected. Review and update documentation carefully.`,
    });
  }

  if (result.pendingChanges.filter((c) => c.requiresReview).length > 0) {
    const reviewCount = result.pendingChanges.filter(
      (c) => c.requiresReview,
    ).length;
    recommendations.push({
      type: "warning",
      title: "Manual Review Required",
      description: `${reviewCount} change(s) require manual review before applying.`,
    });
  }

  if (result.appliedChanges.length > 0) {
    recommendations.push({
      type: "info",
      title: "Changes Applied Successfully",
      description: `${result.appliedChanges.length} documentation update(s) applied automatically.`,
    });
  }

  if (result.stats.driftsDetected === 0) {
    recommendations.push({
      type: "info",
      title: "No Drift Detected",
      description: "Documentation is up to date with code changes.",
    });
  }

  return recommendations;
}

/**
 * Generate next steps based on sync results
 */
function generateNextSteps(result: SyncResult): Array<{
  action: string;
  toolRequired?: string;
  description: string;
  priority: "high" | "medium" | "low";
}> {
  const nextSteps: Array<{
    action: string;
    toolRequired?: string;
    description: string;
    priority: "high" | "medium" | "low";
  }> = [];

  if (result.pendingChanges.length > 0 && result.mode === "detect") {
    nextSteps.push({
      action: "Apply safe documentation changes",
      toolRequired: "sync_code_to_docs",
      description:
        "Run sync with mode='apply' to apply high-confidence changes automatically",
      priority: "high",
    });
  }

  if (result.stats.breakingChanges > 0) {
    nextSteps.push({
      action: "Review breaking changes",
      description:
        "Manually review and update documentation for breaking API changes",
      priority: "high",
    });
  }

  if (result.appliedChanges.length > 0) {
    nextSteps.push({
      action: "Validate updated documentation",
      toolRequired: "validate_diataxis_content",
      description: "Run validation to ensure updated documentation is accurate",
      priority: "medium",
    });
  }

  if (result.pendingChanges.filter((c) => c.requiresReview).length > 0) {
    nextSteps.push({
      action: "Review pending suggestions",
      description:
        "Examine pending suggestions and apply manually where appropriate",
      priority: "medium",
    });
  }

  return nextSteps;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Tool definition
 */
export const syncCodeToDocs: Tool = {
  name: "sync_code_to_docs",
  description:
    "Automatically synchronize documentation with code changes using AST-based drift detection (Phase 3)",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: {
        type: "string",
        description: "Path to the project root directory",
      },
      docsPath: {
        type: "string",
        description: "Path to the documentation directory",
      },
      mode: {
        type: "string",
        enum: ["detect", "preview", "apply", "auto"],
        default: "detect",
        description:
          "Sync mode: detect=analyze only, preview=show changes, apply=apply safe changes, auto=apply all",
      },
      autoApplyThreshold: {
        type: "number",
        minimum: 0,
        maximum: 1,
        default: 0.8,
        description:
          "Confidence threshold (0-1) for automatic application of changes",
      },
      createSnapshot: {
        type: "boolean",
        default: true,
        description: "Create a snapshot before making changes (recommended)",
      },
    },
    required: ["projectPath", "docsPath"],
  },
};
