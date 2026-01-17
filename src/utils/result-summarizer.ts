/**
 * Result Summarization for CE-MCP Compatibility (ADR-011)
 *
 * Implements smart summarization for large tool outputs to prevent
 * context pollution in Code Mode workflows. Large results are stored
 * as MCP resources, with only concise summaries returned to LLM context.
 *
 * Achieves 98% token reduction for complex workflows.
 *
 * Reference: docs/adrs/adr-0011-ce-mcp-compatibility.md
 */

import { getLargeResultTools } from "../types/tool-metadata.js";

export interface SummarizedResult<T = any> {
  /** Concise summary for LLM context */
  summary: string;

  /** Resource URI for full result access */
  resourceUri?: string;

  /** Key metrics extracted from full result */
  metrics?: Record<string, number | string>;

  /** Whether full result is available via resource */
  hasFullResult: boolean;

  /** Original result (only for small results) */
  fullResult?: T;
}

export interface SummarizationOptions {
  /** Maximum summary length in characters */
  maxSummaryLength?: number;

  /** Whether to include metrics in summary */
  includeMetrics?: boolean;

  /** Custom metric extractors */
  metricExtractors?: Record<string, (data: any) => number | string>;

  /** Force summarization even for small results */
  forceSummarize?: boolean;
}

/**
 * Size threshold for automatic summarization (10KB)
 */
const LARGE_RESULT_THRESHOLD = 10_000;

/**
 * Default maximum summary length
 */
const DEFAULT_MAX_SUMMARY_LENGTH = 500;

/**
 * Determine if a result should be summarized
 */
export function shouldSummarize(
  result: any,
  toolName?: string,
  options?: SummarizationOptions,
): boolean {
  if (options?.forceSummarize) return true;

  // Check if tool is known to return large results
  if (toolName && getLargeResultTools().includes(toolName)) {
    return true;
  }

  // Check result size
  const resultSize = JSON.stringify(result).length;
  return resultSize > LARGE_RESULT_THRESHOLD;
}

/**
 * Extract key metrics from analysis results
 */
function extractAnalysisMetrics(data: any): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};

  if (data.fileCount !== undefined) metrics.fileCount = data.fileCount;
  if (data.directoryCount !== undefined)
    metrics.directoryCount = data.directoryCount;
  if (data.primaryLanguage) metrics.primaryLanguage = data.primaryLanguage;
  if (data.totalLines !== undefined) metrics.totalLines = data.totalLines;
  if (data.complexity) metrics.complexity = data.complexity;

  return metrics;
}

/**
 * Extract key metrics from validation results
 */
function extractValidationMetrics(data: any): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};

  if (data.totalIssues !== undefined) metrics.totalIssues = data.totalIssues;
  if (data.errors !== undefined) metrics.errors = data.errors;
  if (data.warnings !== undefined) metrics.warnings = data.warnings;
  if (data.filesChecked !== undefined) metrics.filesChecked = data.filesChecked;
  if (data.overallScore !== undefined) metrics.overallScore = data.overallScore;

  return metrics;
}

/**
 * Extract key metrics from gap detection results
 */
function extractGapMetrics(data: any): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};

  if (data.totalGaps !== undefined) metrics.totalGaps = data.totalGaps;
  if (data.criticalGaps !== undefined) metrics.criticalGaps = data.criticalGaps;
  if (data.coverage !== undefined) metrics.coverage = `${data.coverage}%`;
  if (data.missingCategories)
    metrics.missingCategories = data.missingCategories.length;

  return metrics;
}

/**
 * Extract key metrics from deployment results
 */
function extractDeploymentMetrics(data: any): Record<string, number | string> {
  const metrics: Record<string, number | string> = {};

  if (data.deploymentTime !== undefined)
    metrics.deploymentTime = `${data.deploymentTime}ms`;
  if (data.filesDeployed !== undefined)
    metrics.filesDeployed = data.filesDeployed;
  if (data.status) metrics.status = data.status;
  if (data.url) metrics.url = data.url;

  return metrics;
}

/**
 * Generate a concise summary from result data
 */
function generateSummary(
  data: any,
  toolName?: string,
  maxLength: number = DEFAULT_MAX_SUMMARY_LENGTH,
): string {
  let summary = "";

  // Tool-specific summary generation
  switch (toolName) {
    case "analyze_repository":
      summary =
        `Repository analysis complete: ${data.fileCount || 0} files, ` +
        `${data.directoryCount || 0} directories, primary language: ${
          data.primaryLanguage || "unknown"
        }`;
      break;

    case "detect_documentation_gaps":
      summary =
        `Gap detection complete: ${data.totalGaps || 0} gaps found, ` +
        `${data.criticalGaps || 0} critical, coverage: ${data.coverage || 0}%`;
      break;

    case "validate_diataxis_content":
    case "validate_content":
      summary =
        `Validation complete: ${data.totalIssues || 0} issues ` +
        `(${data.errors || 0} errors, ${data.warnings || 0} warnings), ` +
        `score: ${data.overallScore || 0}%`;
      break;

    case "populate_diataxis_content":
      summary =
        `Content generation complete: ${
          data.filesCreated || 0
        } files created, ` +
        `${data.sectionsPopulated || 0} sections populated`;
      break;

    case "check_documentation_links":
      summary =
        `Link check complete: ${data.totalLinks || 0} links checked, ` +
        `${data.brokenLinks || 0} broken, ${data.validLinks || 0} valid`;
      break;

    case "deploy_pages":
      summary =
        `Deployment ${data.status || "complete"}: ${
          data.filesDeployed || 0
        } files, ` + `URL: ${data.url || "pending"}`;
      break;

    case "sync_code_to_docs":
      summary =
        `Sync complete: ${data.filesUpdated || 0} files updated, ` +
        `${data.changesDetected || 0} changes detected`;
      break;

    default:
      // Generic summary
      if (typeof data === "object" && data !== null) {
        const keys = Object.keys(data);
        summary = `Operation complete: ${keys.length} result fields`;

        // Add first few key-value pairs
        const preview = keys
          .slice(0, 3)
          .map((key) => {
            const value = data[key];
            if (typeof value === "object") return `${key}: [object]`;
            return `${key}: ${value}`;
          })
          .join(", ");

        if (preview) summary += ` (${preview})`;
      } else {
        summary = `Operation complete: ${String(data).substring(0, 100)}`;
      }
  }

  // Truncate if too long
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3) + "...";
  }

  return summary;
}

/**
 * Extract metrics based on tool type
 */
function extractMetrics(
  data: any,
  toolName?: string,
  customExtractors?: Record<string, (data: any) => number | string>,
): Record<string, number | string> {
  // Use custom extractors if provided
  if (customExtractors) {
    const metrics: Record<string, number | string> = {};
    for (const [key, extractor] of Object.entries(customExtractors)) {
      try {
        metrics[key] = extractor(data);
      } catch (error) {
        // Skip failed extractors
      }
    }
    return metrics;
  }

  // Tool-specific metric extraction
  switch (toolName) {
    case "analyze_repository":
      return extractAnalysisMetrics(data);

    case "validate_diataxis_content":
    case "validate_content":
    case "check_documentation_links":
      return extractValidationMetrics(data);

    case "detect_documentation_gaps":
      return extractGapMetrics(data);

    case "deploy_pages":
    case "verify_deployment":
      return extractDeploymentMetrics(data);

    default: {
      // Generic metric extraction
      const metrics: Record<string, number | string> = {};
      if (typeof data === "object" && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === "number" || typeof value === "string") {
            metrics[key] = value;
          }
        }
      }
      return metrics;
    }
  }
}

/**
 * Summarize a tool result for Code Mode efficiency
 *
 * @param result - The full tool result
 * @param toolName - Name of the tool that generated the result
 * @param resourceUri - Optional MCP resource URI for full result access
 * @param options - Summarization options
 * @returns Summarized result optimized for LLM context
 */
export function summarizeResult<T = any>(
  result: T,
  toolName?: string,
  resourceUri?: string,
  options?: SummarizationOptions,
): SummarizedResult<T> {
  const maxLength = options?.maxSummaryLength || DEFAULT_MAX_SUMMARY_LENGTH;

  // Check if summarization is needed
  if (!shouldSummarize(result, toolName, options)) {
    // Small result - return as-is
    return {
      summary: generateSummary(result, toolName, maxLength),
      hasFullResult: true,
      fullResult: result,
    };
  }

  // Large result - summarize and reference resource
  const summary = generateSummary(result, toolName, maxLength);
  const metrics =
    options?.includeMetrics !== false
      ? extractMetrics(result, toolName, options?.metricExtractors)
      : undefined;

  return {
    summary,
    resourceUri,
    metrics,
    hasFullResult: !!resourceUri,
  };
}

/**
 * Create a resource-based result for Code Mode workflows
 *
 * This is the recommended pattern for tools that return large results.
 * The full result is stored as an MCP resource, and only a summary
 * is returned to the LLM context.
 */
export function createResourceResult<T = any>(
  result: T,
  toolName: string,
  resourceId: string,
  options?: SummarizationOptions,
): SummarizedResult<T> {
  const resourceUri = `documcp://${toolName}/${resourceId}`;

  return summarizeResult(result, toolName, resourceUri, {
    ...options,
    forceSummarize: true, // Always summarize for resource-based results
  });
}

/**
 * Batch summarize multiple results
 */
export function summarizeBatch<T = any>(
  results: Array<{ result: T; toolName?: string; resourceUri?: string }>,
  options?: SummarizationOptions,
): SummarizedResult<T>[] {
  return results.map(({ result, toolName, resourceUri }) =>
    summarizeResult(result, toolName, resourceUri, options),
  );
}

/**
 * Calculate token savings from summarization
 */
export function calculateTokenSavings(
  originalSize: number,
  summarySize: number,
): { savedTokens: number; reductionPercent: number } {
  const savedTokens = originalSize - summarySize;
  const reductionPercent = (savedTokens / originalSize) * 100;

  return {
    savedTokens,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
  };
}
