/**
 * Validate Documentation Freshness Tool
 *
 * Validates documentation freshness, initializes metadata for files without it,
 * and updates timestamps based on code changes.
 */

import { z } from "zod";
import path from "path";
import { simpleGit } from "simple-git";
import {
  findMarkdownFiles,
  parseDocFrontmatter,
  updateDocFrontmatter,
  initializeFreshnessMetadata,
  STALENESS_PRESETS,
  type DocFreshnessMetadata,
  scanDocumentationFreshness,
} from "../utils/freshness-tracker.js";
import { type MCPToolResponse } from "../types/api.js";
import {
  storeFreshnessEvent,
  updateFreshnessEvent,
} from "../memory/freshness-kg-integration.js";

/**
 * Input schema for validate_documentation_freshness tool
 */
export const ValidateDocumentationFreshnessSchema = z.object({
  docsPath: z.string().describe("Path to documentation directory"),
  projectPath: z
    .string()
    .describe("Path to project root (for git integration)"),
  initializeMissing: z
    .boolean()
    .optional()
    .default(true)
    .describe("Initialize metadata for files without it"),
  updateExisting: z
    .boolean()
    .optional()
    .default(false)
    .describe("Update last_validated timestamp for all files"),
  updateFrequency: z
    .enum(["realtime", "active", "recent", "weekly", "monthly", "quarterly"])
    .optional()
    .default("monthly")
    .describe("Default update frequency for new metadata"),
  validateAgainstGit: z
    .boolean()
    .optional()
    .default(true)
    .describe("Validate against current git commit"),
});

export type ValidateDocumentationFreshnessInput = z.input<
  typeof ValidateDocumentationFreshnessSchema
>;

/**
 * Validation result for a single file
 */
interface FileValidationResult {
  filePath: string;
  relativePath: string;
  action: "initialized" | "updated" | "skipped" | "error";
  metadata?: DocFreshnessMetadata;
  error?: string;
}

/**
 * Validation report
 */
interface ValidationReport {
  validatedAt: string;
  docsPath: string;
  projectPath: string;
  totalFiles: number;
  initialized: number;
  updated: number;
  skipped: number;
  errors: number;
  currentCommit?: string;
  files: FileValidationResult[];
}

/**
 * Format validation report for display
 */
function formatValidationReport(report: ValidationReport): string {
  let output = "# Documentation Freshness Validation Report\n\n";
  output += `**Validated at**: ${new Date(
    report.validatedAt,
  ).toLocaleString()}\n`;
  output += `**Documentation path**: ${report.docsPath}\n`;

  if (report.currentCommit) {
    output += `**Current commit**: ${report.currentCommit.substring(0, 7)}\n`;
  }

  output += "\n## Summary\n\n";
  output += `- **Total files**: ${report.totalFiles}\n`;
  output += `- **Initialized**: ${report.initialized} files\n`;
  output += `- **Updated**: ${report.updated} files\n`;
  output += `- **Skipped**: ${report.skipped} files\n`;

  if (report.errors > 0) {
    output += `- **Errors**: ${report.errors} files\n`;
  }

  output += "\n## Actions Performed\n\n";

  // Group by action
  const grouped = {
    initialized: report.files.filter((f) => f.action === "initialized"),
    updated: report.files.filter((f) => f.action === "updated"),
    error: report.files.filter((f) => f.action === "error"),
  };

  if (grouped.initialized.length > 0) {
    output += `### ✨ Initialized (${grouped.initialized.length})\n\n`;
    for (const file of grouped.initialized) {
      output += `- ${file.relativePath}\n`;
    }
    output += "\n";
  }

  if (grouped.updated.length > 0) {
    output += `### 🔄 Updated (${grouped.updated.length})\n\n`;
    for (const file of grouped.updated) {
      output += `- ${file.relativePath}\n`;
    }
    output += "\n";
  }

  if (grouped.error.length > 0) {
    output += `### ❌ Errors (${grouped.error.length})\n\n`;
    for (const file of grouped.error) {
      output += `- ${file.relativePath}: ${file.error}\n`;
    }
    output += "\n";
  }

  // Recommendations
  output += "## Next Steps\n\n";

  if (report.initialized > 0) {
    output += `→ ${report.initialized} files now have freshness tracking enabled\n`;
  }

  if (report.updated > 0) {
    output += `→ ${report.updated} files have been marked as validated\n`;
  }

  output += `→ Run \`track_documentation_freshness\` to view current freshness status\n`;

  return output;
}

/**
 * Validate documentation freshness
 */
export async function validateDocumentationFreshness(
  input: ValidateDocumentationFreshnessInput,
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    const {
      docsPath,
      projectPath,
      initializeMissing,
      updateExisting,
      updateFrequency,
      validateAgainstGit,
    } = input;

    // Get current git commit if requested
    let currentCommit: string | undefined;
    if (validateAgainstGit) {
      try {
        const git = simpleGit(projectPath);
        const isRepo = await git.checkIsRepo();

        if (isRepo) {
          const log = await git.log({ maxCount: 1 });
          currentCommit = log.latest?.hash;
        }
      } catch (error) {
        // Git not available, continue without it
      }
    }

    // Find all markdown files
    const markdownFiles = await findMarkdownFiles(docsPath);
    const results: FileValidationResult[] = [];

    for (const filePath of markdownFiles) {
      const relativePath = path.relative(docsPath, filePath);

      try {
        const frontmatter = await parseDocFrontmatter(filePath);
        const hasMetadata = !!frontmatter.documcp?.last_updated;

        if (!hasMetadata && initializeMissing) {
          // Initialize metadata
          await initializeFreshnessMetadata(filePath, {
            updateFrequency,
            autoUpdated: false,
          });

          // If git is available, set validated_against_commit
          if (currentCommit) {
            await updateDocFrontmatter(filePath, {
              validated_against_commit: currentCommit,
            });
          }

          const updatedFrontmatter = await parseDocFrontmatter(filePath);
          results.push({
            filePath,
            relativePath,
            action: "initialized",
            metadata: updatedFrontmatter.documcp,
          });
        } else if (hasMetadata && updateExisting) {
          // Update existing metadata
          const updateData: Partial<DocFreshnessMetadata> = {
            last_validated: new Date().toISOString(),
          };

          if (currentCommit) {
            updateData.validated_against_commit = currentCommit;
          }

          await updateDocFrontmatter(filePath, updateData);

          const updatedFrontmatter = await parseDocFrontmatter(filePath);
          results.push({
            filePath,
            relativePath,
            action: "updated",
            metadata: updatedFrontmatter.documcp,
          });
        } else {
          results.push({
            filePath,
            relativePath,
            action: "skipped",
            metadata: frontmatter.documcp,
          });
        }
      } catch (error) {
        results.push({
          filePath,
          relativePath,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Generate report
    const report: ValidationReport = {
      validatedAt: new Date().toISOString(),
      docsPath,
      projectPath,
      totalFiles: markdownFiles.length,
      initialized: results.filter((r) => r.action === "initialized").length,
      updated: results.filter((r) => r.action === "updated").length,
      skipped: results.filter((r) => r.action === "skipped").length,
      errors: results.filter((r) => r.action === "error").length,
      currentCommit,
      files: results,
    };

    const formattedReport = formatValidationReport(report);

    // Store validation event in knowledge graph
    let eventId: string | undefined;
    if (report.initialized > 0 || report.updated > 0) {
      try {
        // Scan current state to get freshness metrics
        const scanReport = await scanDocumentationFreshness(docsPath, {
          warning: STALENESS_PRESETS.monthly,
          stale: {
            value: STALENESS_PRESETS.monthly.value * 2,
            unit: STALENESS_PRESETS.monthly.unit,
          },
          critical: {
            value: STALENESS_PRESETS.monthly.value * 3,
            unit: STALENESS_PRESETS.monthly.unit,
          },
        });

        // Determine event type
        const eventType = report.initialized > 0 ? "initialization" : "update";

        // Store in KG
        eventId = await storeFreshnessEvent(
          projectPath,
          docsPath,
          scanReport,
          eventType,
        );

        // Update event with validation details
        await updateFreshnessEvent(eventId, {
          filesInitialized: report.initialized,
          filesUpdated: report.updated,
          eventType,
        });
      } catch (error) {
        // KG storage failed, but continue with the response
        console.warn(
          "Failed to store validation event in knowledge graph:",
          error,
        );
      }
    }

    const response: MCPToolResponse = {
      success: true,
      data: {
        summary: `Validated ${report.totalFiles} files: ${report.initialized} initialized, ${report.updated} updated`,
        report,
        formattedReport,
        kgEventId: eventId,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [],
    };

    return response;
  } catch (error) {
    return {
      success: false,
      error: {
        code: "FRESHNESS_VALIDATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error validating documentation freshness",
        resolution:
          "Check that the documentation and project paths exist and are readable",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
