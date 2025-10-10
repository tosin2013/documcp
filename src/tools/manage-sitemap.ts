/**
 * Manage Sitemap Tool
 *
 * MCP tool for generating, validating, and managing sitemap.xml files.
 * Sitemap.xml serves as the source of truth for all documentation links.
 */

import { z } from "zod";
import path from "path";
import { promises as fs } from "fs";
import {
  generateSitemap,
  validateSitemap,
  updateSitemap,
  listSitemapUrls,
  type SitemapUrl,
  type SitemapStats,
} from "../utils/sitemap-generator.js";
import { formatMCPResponse } from "../types/api.js";

/**
 * Input schema for manage_sitemap tool
 */
export const ManageSitemapInputSchema = z.object({
  action: z
    .enum(["generate", "validate", "update", "list"])
    .describe(
      "Action to perform: generate (create new), validate (check structure), update (sync with docs), list (show all URLs)",
    ),
  docsPath: z.string().describe("Path to documentation root directory"),
  baseUrl: z
    .string()
    .optional()
    .describe(
      "Base URL for the site (e.g., https://user.github.io/repo). Required for generate/update actions.",
    ),
  includePatterns: z
    .array(z.string())
    .optional()
    .describe(
      "File patterns to include (default: **/*.md, **/*.html, **/*.mdx)",
    ),
  excludePatterns: z
    .array(z.string())
    .optional()
    .describe(
      "File patterns to exclude (default: node_modules, .git, dist, build, .documcp)",
    ),
  updateFrequency: z
    .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
    .optional()
    .describe("Default change frequency for pages"),
  useGitHistory: z
    .boolean()
    .optional()
    .default(true)
    .describe("Use git history for last modified dates (default: true)"),
  sitemapPath: z
    .string()
    .optional()
    .describe("Custom path for sitemap.xml (default: docsPath/sitemap.xml)"),
});

export type ManageSitemapInput = z.infer<typeof ManageSitemapInputSchema>;

/**
 * Manage sitemap.xml for documentation
 */
export async function manageSitemap(
  input: ManageSitemapInput,
): Promise<{ content: any[] }> {
  const { action, docsPath, sitemapPath } = input;

  // Resolve sitemap path
  const resolvedSitemapPath = sitemapPath || path.join(docsPath, "sitemap.xml");

  try {
    // Verify docs directory exists
    try {
      await fs.access(docsPath);
    } catch {
      return formatMCPResponse({
        success: false,
        error: {
          code: "DOCS_DIR_NOT_FOUND",
          message: `Documentation directory not found: ${docsPath}`,
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now(),
          timestamp: new Date().toISOString(),
        },
      });
    }

    switch (action) {
      case "generate":
        return await generateSitemapAction(input, resolvedSitemapPath);

      case "validate":
        return await validateSitemapAction(resolvedSitemapPath);

      case "update":
        return await updateSitemapAction(input, resolvedSitemapPath);

      case "list":
        return await listSitemapAction(resolvedSitemapPath);

      default:
        return formatMCPResponse({
          success: false,
          error: {
            code: "UNKNOWN_ACTION",
            message: `Unknown action: ${action}`,
          },
          metadata: {
            toolVersion: "1.0.0",
            executionTime: Date.now(),
            timestamp: new Date().toISOString(),
          },
        });
    }
  } catch (error) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "SITEMAP_ERROR",
        message: `Error managing sitemap: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Generate new sitemap.xml
 */
async function generateSitemapAction(
  input: ManageSitemapInput,
  sitemapPath: string,
): Promise<{ content: any[] }> {
  const {
    docsPath,
    baseUrl,
    includePatterns,
    excludePatterns,
    updateFrequency,
  } = input;

  if (!baseUrl) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "BASE_URL_REQUIRED",
        message: "baseUrl is required for generate action",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Generate sitemap
  const { xml, urls, stats } = await generateSitemap({
    baseUrl,
    docsPath,
    includePatterns,
    excludePatterns,
    useGitHistory: input.useGitHistory,
    defaultChangeFreq: updateFrequency || "monthly",
  });

  // Write sitemap.xml
  await fs.writeFile(sitemapPath, xml, "utf-8");

  // Format output
  const output = formatGenerateOutput(sitemapPath, urls, stats);

  return formatMCPResponse({
    success: true,
    data: {
      action: "generate",
      sitemapPath,
      totalUrls: stats.totalUrls,
      categories: stats.byCategory,
      output,
    },
    metadata: {
      toolVersion: "1.0.0",
      executionTime: Date.now(),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Validate existing sitemap.xml
 */
async function validateSitemapAction(
  sitemapPath: string,
): Promise<{ content: any[] }> {
  // Check if sitemap exists
  try {
    await fs.access(sitemapPath);
  } catch {
    return formatMCPResponse({
      success: false,
      error: {
        code: "SITEMAP_NOT_FOUND",
        message: `Sitemap not found: ${sitemapPath}. Use action: "generate" to create a new sitemap.`,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Validate sitemap
  const validation = await validateSitemap(sitemapPath);

  // Format output
  const output = formatValidationOutput(sitemapPath, validation);

  return formatMCPResponse({
    success: validation.valid,
    data: {
      action: "validate",
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      urlCount: validation.urlCount,
      output,
    },
    error: validation.valid
      ? undefined
      : {
          code: "VALIDATION_FAILED",
          message: `Sitemap validation failed with ${validation.errors.length} error(s)`,
        },
    metadata: {
      toolVersion: "1.0.0",
      executionTime: Date.now(),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Update existing sitemap.xml
 */
async function updateSitemapAction(
  input: ManageSitemapInput,
  sitemapPath: string,
): Promise<{ content: any[] }> {
  const {
    docsPath,
    baseUrl,
    includePatterns,
    excludePatterns,
    updateFrequency,
  } = input;

  if (!baseUrl) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "BASE_URL_REQUIRED",
        message: "baseUrl is required for update action",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Check if sitemap exists
  const sitemapExists = await fs
    .access(sitemapPath)
    .then(() => true)
    .catch(() => false);

  if (!sitemapExists) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "SITEMAP_NOT_FOUND",
        message: `Sitemap not found: ${sitemapPath}. Run generate action first.`,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Update sitemap
  const changes = await updateSitemap(sitemapPath, {
    baseUrl,
    docsPath,
    includePatterns,
    excludePatterns,
    useGitHistory: input.useGitHistory,
    defaultChangeFreq: updateFrequency || "monthly",
  });

  // Format output
  const output = formatUpdateOutput(sitemapPath, changes);

  return formatMCPResponse({
    success: true,
    data: {
      action: "update",
      added: changes.added,
      removed: changes.removed,
      updated: changes.updated,
      total: changes.total,
      output,
    },
    metadata: {
      toolVersion: "1.0.0",
      executionTime: Date.now(),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * List all URLs from sitemap.xml
 */
async function listSitemapAction(
  sitemapPath: string,
): Promise<{ content: any[] }> {
  // Check if sitemap exists
  try {
    await fs.access(sitemapPath);
  } catch {
    return formatMCPResponse({
      success: false,
      error: {
        code: "SITEMAP_NOT_FOUND",
        message: `Sitemap not found: ${sitemapPath}. Use action: "generate" to create a new sitemap.`,
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: 0,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // List URLs
  const urls = await listSitemapUrls(sitemapPath);

  // Format output
  const output = formatListOutput(sitemapPath, urls);

  return formatMCPResponse({
    success: true,
    data: {
      action: "list",
      totalUrls: urls.length,
      urls: urls.map((u) => ({
        loc: u.loc,
        priority: u.priority,
        category: u.category,
        lastmod: u.lastmod,
      })),
      output,
    },
    metadata: {
      toolVersion: "1.0.0",
      executionTime: Date.now(),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Format generate action output
 */
function formatGenerateOutput(
  sitemapPath: string,
  urls: SitemapUrl[],
  stats: SitemapStats,
): string {
  const lines: string[] = [
    "✅ Sitemap generated successfully!",
    "",
    `📄 Location: ${sitemapPath}`,
    `📊 Total URLs: ${stats.totalUrls}`,
    "",
    "📋 URLs by Category:",
  ];

  // Sort categories by count (descending)
  const sortedCategories = Object.entries(stats.byCategory).sort(
    ([, a], [, b]) => b - a,
  );

  for (const [category, count] of sortedCategories) {
    const percentage = ((count / stats.totalUrls) * 100).toFixed(1);
    lines.push(`  • ${category}: ${count} (${percentage}%)`);
  }

  lines.push("");
  lines.push("🔄 Change Frequencies:");

  // Sort change frequencies
  const sortedFreqs = Object.entries(stats.byChangeFreq).sort(
    ([, a], [, b]) => b - a,
  );

  for (const [freq, count] of sortedFreqs) {
    lines.push(`  • ${freq}: ${count}`);
  }

  // Show top priority URLs
  const topUrls = urls.filter((u) => (u.priority || 0) >= 0.9).slice(0, 5);

  if (topUrls.length > 0) {
    lines.push("");
    lines.push("⭐ High Priority Pages:");
    for (const url of topUrls) {
      lines.push(`  • [${url.priority?.toFixed(1)}] ${url.title || url.loc}`);
    }
  }

  lines.push("");
  lines.push("💡 Next Steps:");
  lines.push("  → Submit sitemap to search engines (Google, Bing)");
  lines.push("  → Add sitemap to robots.txt");
  lines.push("  → Deploy to GitHub Pages");

  return lines.join("\n");
}

/**
 * Format validation output
 */
function formatValidationOutput(
  sitemapPath: string,
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    urlCount: number;
  },
): string {
  const lines: string[] = [];

  if (validation.valid) {
    lines.push("✅ Sitemap is valid!");
  } else {
    lines.push("❌ Sitemap validation failed!");
  }

  lines.push("");
  lines.push(`📄 Location: ${sitemapPath}`);
  lines.push(`📊 Total URLs: ${validation.urlCount}`);

  if (validation.errors.length > 0) {
    lines.push("");
    lines.push("🔴 Errors:");
    for (const error of validation.errors) {
      lines.push(`  • ${error}`);
    }
  }

  if (validation.warnings.length > 0) {
    lines.push("");
    lines.push("⚠️ Warnings:");
    for (const warning of validation.warnings) {
      lines.push(`  • ${warning}`);
    }
  }

  if (validation.valid) {
    lines.push("");
    lines.push("💡 Recommendations:");
    lines.push("  ℹ️ Sitemap follows the Sitemaps 0.9 protocol");
    lines.push("  ℹ️ Ready for search engine submission");
  }

  return lines.join("\n");
}

/**
 * Format update output
 */
function formatUpdateOutput(
  sitemapPath: string,
  changes: { added: number; removed: number; updated: number; total: number },
): string {
  const lines: string[] = [
    "✅ Sitemap updated successfully!",
    "",
    `📄 Location: ${sitemapPath}`,
    `📊 Total URLs: ${changes.total}`,
    "",
    "📝 Changes:",
  ];

  if (changes.added > 0) {
    lines.push(`  ✨ Added: ${changes.added} new page(s)`);
  }

  if (changes.removed > 0) {
    lines.push(`  🗑️ Removed: ${changes.removed} deleted page(s)`);
  }

  if (changes.updated > 0) {
    lines.push(`  🔄 Updated: ${changes.updated} modified page(s)`);
  }

  if (changes.added === 0 && changes.removed === 0 && changes.updated === 0) {
    lines.push("  ℹ️ No changes detected");
  }

  lines.push("");
  lines.push("💡 Next Steps:");
  lines.push("  → Review changes if needed");
  lines.push("  → Redeploy to GitHub Pages");
  lines.push("  → Notify search engines of updates");

  return lines.join("\n");
}

/**
 * Format list output
 */
function formatListOutput(sitemapPath: string, urls: SitemapUrl[]): string {
  const lines: string[] = [
    `📄 Sitemap URLs from: ${sitemapPath}`,
    `📊 Total: ${urls.length}`,
    "",
  ];

  // Group by category
  const byCategory: Record<string, SitemapUrl[]> = {};
  for (const url of urls) {
    const category = url.category || "default";
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(url);
  }

  // Display by category
  for (const [category, categoryUrls] of Object.entries(byCategory)) {
    lines.push(`📂 ${category} (${categoryUrls.length}):`);

    // Sort by priority
    const sorted = categoryUrls.sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    for (const url of sorted.slice(0, 10)) {
      // Show first 10 per category
      const priority = url.priority?.toFixed(1) || "0.5";
      const title = url.title || path.basename(url.loc);
      lines.push(`  [${priority}] ${title}`);
      lines.push(`      ${url.loc}`);
    }

    if (categoryUrls.length > 10) {
      lines.push(`  ... and ${categoryUrls.length - 10} more`);
    }

    lines.push("");
  }

  return lines.join("\n");
}
