/**
 * Documentation Freshness Tracking Utilities
 *
 * Tracks when documentation files were last updated and validated,
 * supporting both short-term (minutes/hours) and long-term (days) staleness detection.
 */

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

/**
 * Time unit for staleness threshold
 */
export type TimeUnit = "minutes" | "hours" | "days";

/**
 * Staleness threshold configuration
 */
export interface StalenessThreshold {
  value: number;
  unit: TimeUnit;
}

/**
 * Predefined staleness levels
 */
export const STALENESS_PRESETS = {
  realtime: { value: 30, unit: "minutes" as TimeUnit },
  active: { value: 1, unit: "hours" as TimeUnit },
  recent: { value: 24, unit: "hours" as TimeUnit },
  weekly: { value: 7, unit: "days" as TimeUnit },
  monthly: { value: 30, unit: "days" as TimeUnit },
  quarterly: { value: 90, unit: "days" as TimeUnit },
} as const;

/**
 * Documentation metadata tracked in frontmatter
 */
export interface DocFreshnessMetadata {
  last_updated?: string; // ISO 8601 timestamp
  last_validated?: string; // ISO 8601 timestamp
  validated_against_commit?: string;
  auto_updated?: boolean;
  staleness_threshold?: StalenessThreshold;
  update_frequency?: keyof typeof STALENESS_PRESETS;
}

/**
 * Full frontmatter structure
 */
export interface DocFrontmatter {
  title?: string;
  description?: string;
  documcp?: DocFreshnessMetadata;
  [key: string]: unknown;
}

/**
 * File freshness status
 */
export interface FileFreshnessStatus {
  filePath: string;
  relativePath: string;
  hasMetadata: boolean;
  metadata?: DocFreshnessMetadata;
  lastUpdated?: Date;
  lastValidated?: Date;
  ageInMs?: number;
  ageFormatted?: string;
  isStale: boolean;
  stalenessLevel: "fresh" | "warning" | "stale" | "critical" | "unknown";
  staleDays?: number;
}

/**
 * Freshness scan report
 */
export interface FreshnessScanReport {
  scannedAt: string;
  docsPath: string;
  totalFiles: number;
  filesWithMetadata: number;
  filesWithoutMetadata: number;
  freshFiles: number;
  warningFiles: number;
  staleFiles: number;
  criticalFiles: number;
  files: FileFreshnessStatus[];
  thresholds: {
    warning: StalenessThreshold;
    stale: StalenessThreshold;
    critical: StalenessThreshold;
  };
}

/**
 * Convert time threshold to milliseconds
 */
export function thresholdToMs(threshold: StalenessThreshold): number {
  const { value, unit } = threshold;
  switch (unit) {
    case "minutes":
      return value * 60 * 1000;
    case "hours":
      return value * 60 * 60 * 1000;
    case "days":
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Format age in human-readable format
 */
export function formatAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
}

/**
 * Parse frontmatter from markdown file
 */
export async function parseDocFrontmatter(
  filePath: string,
): Promise<DocFrontmatter> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { data } = matter(content);
    return data as DocFrontmatter;
  } catch (error) {
    return {};
  }
}

/**
 * Update frontmatter in markdown file
 */
export async function updateDocFrontmatter(
  filePath: string,
  metadata: Partial<DocFreshnessMetadata>,
): Promise<void> {
  const content = await fs.readFile(filePath, "utf-8");
  const { data, content: body } = matter(content);

  const existingDocuMCP = (data.documcp as DocFreshnessMetadata) || {};
  const updatedData = {
    ...data,
    documcp: {
      ...existingDocuMCP,
      ...metadata,
    },
  };

  const newContent = matter.stringify(body, updatedData);
  await fs.writeFile(filePath, newContent, "utf-8");
}

/**
 * Calculate file freshness status
 */
export function calculateFreshnessStatus(
  filePath: string,
  relativePath: string,
  frontmatter: DocFrontmatter,
  thresholds: {
    warning: StalenessThreshold;
    stale: StalenessThreshold;
    critical: StalenessThreshold;
  },
): FileFreshnessStatus {
  const metadata = frontmatter.documcp;
  const hasMetadata = !!metadata?.last_updated;

  if (!hasMetadata) {
    return {
      filePath,
      relativePath,
      hasMetadata: false,
      isStale: true,
      stalenessLevel: "unknown",
    };
  }

  const lastUpdated = new Date(metadata.last_updated!);
  const lastValidated = metadata.last_validated
    ? new Date(metadata.last_validated)
    : undefined;
  const now = new Date();
  const ageInMs = now.getTime() - lastUpdated.getTime();
  const ageFormatted = formatAge(ageInMs);
  const staleDays = Math.floor(ageInMs / (24 * 60 * 60 * 1000));

  // Determine staleness level
  let stalenessLevel: FileFreshnessStatus["stalenessLevel"];
  let isStale: boolean;

  const warningMs = thresholdToMs(thresholds.warning);
  const staleMs = thresholdToMs(thresholds.stale);
  const criticalMs = thresholdToMs(thresholds.critical);

  if (ageInMs >= criticalMs) {
    stalenessLevel = "critical";
    isStale = true;
  } else if (ageInMs >= staleMs) {
    stalenessLevel = "stale";
    isStale = true;
  } else if (ageInMs >= warningMs) {
    stalenessLevel = "warning";
    isStale = false;
  } else {
    stalenessLevel = "fresh";
    isStale = false;
  }

  return {
    filePath,
    relativePath,
    hasMetadata: true,
    metadata,
    lastUpdated,
    lastValidated,
    ageInMs,
    ageFormatted,
    isStale,
    stalenessLevel,
    staleDays,
  };
}

/**
 * Find all markdown files in directory recursively
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      // Skip common directories
      if (entry.isDirectory()) {
        if (
          !["node_modules", ".git", "dist", "build", ".documcp"].includes(
            entry.name,
          )
        ) {
          await scan(fullPath);
        }
        continue;
      }

      // Include markdown files
      if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

/**
 * Scan directory for documentation freshness
 */
export async function scanDocumentationFreshness(
  docsPath: string,
  thresholds: {
    warning?: StalenessThreshold;
    stale?: StalenessThreshold;
    critical?: StalenessThreshold;
  } = {},
): Promise<FreshnessScanReport> {
  // Default thresholds
  const finalThresholds = {
    warning: thresholds.warning || STALENESS_PRESETS.weekly,
    stale: thresholds.stale || STALENESS_PRESETS.monthly,
    critical: thresholds.critical || STALENESS_PRESETS.quarterly,
  };

  // Find all markdown files
  const markdownFiles = await findMarkdownFiles(docsPath);

  // Analyze each file
  const files: FileFreshnessStatus[] = [];
  for (const filePath of markdownFiles) {
    const relativePath = path.relative(docsPath, filePath);
    const frontmatter = await parseDocFrontmatter(filePath);
    const status = calculateFreshnessStatus(
      filePath,
      relativePath,
      frontmatter,
      finalThresholds,
    );
    files.push(status);
  }

  // Calculate summary statistics
  const totalFiles = files.length;
  const filesWithMetadata = files.filter((f) => f.hasMetadata).length;
  const filesWithoutMetadata = totalFiles - filesWithMetadata;
  const freshFiles = files.filter((f) => f.stalenessLevel === "fresh").length;
  const warningFiles = files.filter(
    (f) => f.stalenessLevel === "warning",
  ).length;
  const staleFiles = files.filter((f) => f.stalenessLevel === "stale").length;
  const criticalFiles = files.filter(
    (f) => f.stalenessLevel === "critical",
  ).length;

  return {
    scannedAt: new Date().toISOString(),
    docsPath,
    totalFiles,
    filesWithMetadata,
    filesWithoutMetadata,
    freshFiles,
    warningFiles,
    staleFiles,
    criticalFiles,
    files,
    thresholds: finalThresholds,
  };
}

/**
 * Initialize frontmatter for files without metadata
 */
export async function initializeFreshnessMetadata(
  filePath: string,
  options: {
    updateFrequency?: keyof typeof STALENESS_PRESETS;
    autoUpdated?: boolean;
  } = {},
): Promise<void> {
  const frontmatter = await parseDocFrontmatter(filePath);

  if (!frontmatter.documcp?.last_updated) {
    const metadata: DocFreshnessMetadata = {
      last_updated: new Date().toISOString(),
      last_validated: new Date().toISOString(),
      auto_updated: options.autoUpdated ?? false,
      update_frequency: options.updateFrequency || "monthly",
    };

    if (options.updateFrequency) {
      metadata.staleness_threshold = STALENESS_PRESETS[options.updateFrequency];
    }

    await updateDocFrontmatter(filePath, metadata);
  }
}
