/**
 * Sitemap Generator Utility
 *
 * Generates and manages sitemap.xml files for documentation sites.
 * Follows the Sitemap 0.9 protocol: https://www.sitemaps.org/protocol.html
 */

import { promises as fs } from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Sitemap URL entry with metadata
 */
export interface SitemapUrl {
  loc: string; // URL of the page
  lastmod?: string; // Last modification date (ISO 8601)
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number; // Priority 0.0 to 1.0
  title?: string; // Page title (for internal use, not in XML)
  category?: string; // Diataxis category (for internal use)
}

/**
 * Sitemap generation options
 */
export interface SitemapOptions {
  baseUrl: string; // Base URL (e.g., https://user.github.io/repo)
  docsPath: string; // Documentation root directory
  includePatterns?: string[]; // File patterns to include
  excludePatterns?: string[]; // File patterns to exclude
  useGitHistory?: boolean; // Use git history for lastmod dates
  defaultChangeFreq?: SitemapUrl["changefreq"];
  defaultPriority?: number;
}

/**
 * Sitemap statistics
 */
export interface SitemapStats {
  totalUrls: number;
  byCategory: Record<string, number>;
  byChangeFreq: Record<string, number>;
  lastGenerated: string;
}

/**
 * Default include patterns for common documentation formats
 */
const DEFAULT_INCLUDE_PATTERNS = ["**/*.md", "**/*.html", "**/*.mdx"];

/**
 * Default exclude patterns
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.documcp/**",
];

/**
 * Priority mapping for Diataxis categories
 */
const DIATAXIS_PRIORITIES: Record<string, number> = {
  tutorial: 1.0, // Highest priority for learning
  "how-to": 0.9, // High priority for task guides
  reference: 0.8, // Important API documentation
  explanation: 0.7, // Conceptual documentation
  index: 0.9, // High priority for index pages
  home: 1.0, // Highest priority for home page
  default: 0.5, // Default for uncategorized
};

/**
 * Change frequency mapping based on documentation type
 */
const DIATAXIS_CHANGE_FREQ: Record<string, SitemapUrl["changefreq"]> = {
  tutorial: "monthly",
  "how-to": "monthly",
  reference: "weekly", // API docs change more frequently
  explanation: "monthly",
  index: "weekly",
  home: "weekly",
  default: "monthly",
};

/**
 * Generate sitemap.xml from documentation files
 */
export async function generateSitemap(options: SitemapOptions): Promise<{
  xml: string;
  urls: SitemapUrl[];
  stats: SitemapStats;
}> {
  const {
    baseUrl,
    docsPath,
    includePatterns = DEFAULT_INCLUDE_PATTERNS,
    excludePatterns = DEFAULT_EXCLUDE_PATTERNS,
    useGitHistory = true,
    defaultChangeFreq = "monthly",
    defaultPriority = 0.5,
  } = options;

  // Discover documentation files
  const files = await discoverDocumentationFiles(
    docsPath,
    includePatterns,
    excludePatterns,
  );

  // Convert files to sitemap URLs
  const urls: SitemapUrl[] = [];
  for (const file of files) {
    const url = await createSitemapUrl(
      file,
      docsPath,
      baseUrl,
      useGitHistory,
      defaultChangeFreq,
      defaultPriority,
    );
    urls.push(url);
  }

  // Sort URLs by priority (descending) and then alphabetically
  urls.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.loc.localeCompare(b.loc);
  });

  // Generate XML
  const xml = generateSitemapXML(urls);

  // Calculate statistics
  const stats = calculateSitemapStats(urls);

  return { xml, urls, stats };
}

/**
 * Discover documentation files matching patterns
 */
async function discoverDocumentationFiles(
  docsPath: string,
  includePatterns: string[],
  excludePatterns: string[],
): Promise<string[]> {
  const files: string[] = [];

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(docsPath, fullPath);

        // Check exclusion patterns (check both file and directory paths)
        if (shouldExclude(relativePath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Check if directory path matches exclusion patterns
          const dirRelPath = relativePath + "/"; // Add trailing slash for directory matching
          if (shouldExclude(dirRelPath, excludePatterns)) {
            continue;
          }
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // Check inclusion patterns
          if (shouldInclude(relativePath, includePatterns)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible, skip it
      console.warn(`Could not scan directory ${dir}:`, error);
    }
  }

  await scanDirectory(docsPath);
  return files;
}

/**
 * Check if file should be included based on patterns
 */
function shouldInclude(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = patternToRegex(pattern);
    return regex.test(filePath);
  });
}

/**
 * Check if file should be excluded based on patterns
 */
function shouldExclude(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = patternToRegex(pattern);
    if (regex.test(filePath)) {
      return true;
    }

    // Special handling for directory patterns like "**/node_modules/**"
    // Check if any path segment matches the pattern
    if (pattern.includes("**/") && pattern.includes("/**")) {
      // Extract the directory name from pattern (e.g., "node_modules" from "**/node_modules/**")
      const match = pattern.match(/\*\*\/([^/*]+)\/\*\*/);
      if (match) {
        const dirName = match[1];
        const pathParts = filePath.split("/");
        // Check if this directory exists in the path
        if (pathParts.includes(dirName)) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Convert glob pattern to regex
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "@@DOUBLE_STAR@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@DOUBLE_STAR@@/g, ".*");

  // For patterns like **/node_modules/**, match both exact and partial paths
  // This allows matching "node_modules" and "path/to/node_modules/file"
  const regexStr = `^${escaped}$`;
  return new RegExp(regexStr);
}

/**
 * Create sitemap URL entry from file
 */
async function createSitemapUrl(
  filePath: string,
  docsPath: string,
  baseUrl: string,
  useGitHistory: boolean,
  defaultChangeFreq: SitemapUrl["changefreq"],
  defaultPriority: number,
): Promise<SitemapUrl> {
  const relativePath = path.relative(docsPath, filePath);

  // Convert file path to URL path
  let urlPath = relativePath
    .replace(/\\/g, "/") // Windows paths
    .replace(/\.md$/, ".html") // Markdown to HTML
    .replace(/\.mdx$/, ".html") // MDX to HTML
    .replace(/\/index\.html$/, "/") // index.html to directory
    .replace(/index\.html$/, ""); // Root index.html

  // Remove leading slash if present
  urlPath = urlPath.replace(/^\//, "");

  // Construct full URL
  const loc = `${baseUrl.replace(/\/$/, "")}/${urlPath}`;

  // Detect category from path
  const category = detectCategory(relativePath);

  // Get last modification date
  const lastmod = useGitHistory
    ? await getGitLastModified(filePath)
    : await getFileLastModified(filePath);

  // Determine priority based on category
  const priority = DIATAXIS_PRIORITIES[category] || defaultPriority;

  // Determine change frequency based on category
  const changefreq = DIATAXIS_CHANGE_FREQ[category] || defaultChangeFreq;

  // Extract title from file if possible
  const title = await extractTitle(filePath);

  return {
    loc,
    lastmod,
    changefreq,
    priority,
    title,
    category,
  };
}

/**
 * Detect Diataxis category from file path
 */
function detectCategory(filePath: string): string {
  const lower = filePath.toLowerCase();

  if (lower.includes("tutorial")) return "tutorial";
  if (lower.includes("how-to") || lower.includes("howto")) return "how-to";
  if (lower.includes("reference") || lower.includes("api")) return "reference";
  if (lower.includes("explanation") || lower.includes("concept"))
    return "explanation";
  if (lower.includes("index") || lower === "index.md" || lower === "index.html")
    return "index";
  if (lower === "readme.md" || lower === "index.md") return "home";

  return "default";
}

/**
 * Get last modified date from git history
 */
async function getGitLastModified(
  filePath: string,
): Promise<string | undefined> {
  try {
    const timestamp = execSync(`git log -1 --format=%cI "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (timestamp) {
      // Format as YYYY-MM-DD (sitemap.xml standard)
      return timestamp.split("T")[0];
    }
  } catch (error) {
    // Git command failed, fall back to file system
  }

  return getFileLastModified(filePath);
}

/**
 * Get last modified date from file system
 */
async function getFileLastModified(filePath: string): Promise<string> {
  try {
    const stats = await fs.stat(filePath);
    // Format as YYYY-MM-DD
    return stats.mtime.toISOString().split("T")[0];
  } catch (error) {
    // If file doesn't exist, use current date
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Extract title from markdown or HTML file
 */
async function extractTitle(filePath: string): Promise<string | undefined> {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Try to extract from markdown heading
    const mdMatch = content.match(/^#\s+(.+)$/m);
    if (mdMatch) {
      return mdMatch[1].trim();
    }

    // Try to extract from HTML title tag
    const htmlMatch = content.match(/<title>(.+?)<\/title>/i);
    if (htmlMatch) {
      return htmlMatch[1].trim();
    }

    // Try to extract from frontmatter
    const frontmatterMatch = content.match(/^---\s*\ntitle:\s*(.+?)\n/m);
    if (frontmatterMatch) {
      return frontmatterMatch[1].trim().replace(/['"]/g, "");
    }
  } catch (error) {
    // Could not read file
  }

  return undefined;
}

/**
 * Generate sitemap XML from URLs
 */
function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlElements = urls
    .map((url) => {
      const parts = ["  <url>", `    <loc>${escapeXml(url.loc)}</loc>`];

      if (url.lastmod) {
        parts.push(`    <lastmod>${url.lastmod}</lastmod>`);
      }

      if (url.changefreq) {
        parts.push(`    <changefreq>${url.changefreq}</changefreq>`);
      }

      if (url.priority !== undefined) {
        parts.push(`    <priority>${url.priority.toFixed(1)}</priority>`);
      }

      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Calculate sitemap statistics
 */
function calculateSitemapStats(urls: SitemapUrl[]): SitemapStats {
  const byCategory: Record<string, number> = {};
  const byChangeFreq: Record<string, number> = {};

  for (const url of urls) {
    // Count by category
    const category = url.category || "default";
    byCategory[category] = (byCategory[category] || 0) + 1;

    // Count by change frequency
    const changefreq = url.changefreq || "monthly";
    byChangeFreq[changefreq] = (byChangeFreq[changefreq] || 0) + 1;
  }

  return {
    totalUrls: urls.length,
    byCategory,
    byChangeFreq,
    lastGenerated: new Date().toISOString(),
  };
}

/**
 * Parse existing sitemap.xml file
 */
export async function parseSitemap(sitemapPath: string): Promise<SitemapUrl[]> {
  try {
    const xml = await fs.readFile(sitemapPath, "utf-8");
    const urls: SitemapUrl[] = [];

    // Simple XML parsing (no external dependencies)
    const urlMatches = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);

    for (const match of urlMatches) {
      const urlBlock = match[1];

      const loc = urlBlock.match(/<loc>(.*?)<\/loc>/)?.[1];
      if (!loc) continue;

      const lastmod = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
      const changefreq = urlBlock.match(
        /<changefreq>(.*?)<\/changefreq>/,
      )?.[1] as SitemapUrl["changefreq"];
      const priority = parseFloat(
        urlBlock.match(/<priority>(.*?)<\/priority>/)?.[1] || "0.5",
      );

      urls.push({
        loc: unescapeXml(loc),
        lastmod,
        changefreq,
        priority,
      });
    }

    return urls;
  } catch (error) {
    throw new Error(`Failed to parse sitemap: ${error}`);
  }
}

/**
 * Unescape XML special characters
 */
function unescapeXml(str: string): string {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Validate sitemap.xml structure
 */
export async function validateSitemap(sitemapPath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  urlCount: number;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if file exists
    try {
      await fs.access(sitemapPath);
    } catch {
      errors.push("Sitemap file does not exist");
      return { valid: false, errors, warnings, urlCount: 0 };
    }

    // Parse sitemap
    const urls = await parseSitemap(sitemapPath);

    // Validate URL count
    if (urls.length === 0) {
      warnings.push("Sitemap contains no URLs");
    }

    if (urls.length > 50000) {
      errors.push("Sitemap contains more than 50,000 URLs (protocol limit)");
    }

    // Validate each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      // Validate loc
      if (!url.loc) {
        errors.push(`URL #${i + 1}: Missing <loc> element`);
        continue;
      }

      if (!url.loc.startsWith("http://") && !url.loc.startsWith("https://")) {
        errors.push(
          `URL #${i + 1}: Invalid protocol (must be http:// or https://)`,
        );
      }

      if (url.loc.length > 2048) {
        errors.push(`URL #${i + 1}: URL exceeds 2048 characters`);
      }

      // Validate priority
      if (
        url.priority !== undefined &&
        (url.priority < 0 || url.priority > 1)
      ) {
        errors.push(`URL #${i + 1}: Priority must be between 0.0 and 1.0`);
      }

      // Validate lastmod format
      if (url.lastmod && !isValidDateFormat(url.lastmod)) {
        warnings.push(
          `URL #${i + 1}: Invalid lastmod format (should be ISO 8601)`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      urlCount: urls.length,
    };
  } catch (error) {
    errors.push(`Failed to validate sitemap: ${error}`);
    return { valid: false, errors, warnings, urlCount: 0 };
  }
}

/**
 * Check if date string is valid ISO 8601 format
 */
function isValidDateFormat(dateStr: string): boolean {
  // Accept YYYY-MM-DD or full ISO 8601
  const regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?)?$/;
  return regex.test(dateStr);
}

/**
 * Update existing sitemap with new URLs
 */
export async function updateSitemap(
  sitemapPath: string,
  options: SitemapOptions,
): Promise<{
  added: number;
  removed: number;
  updated: number;
  total: number;
}> {
  // Generate new sitemap
  const { urls: newUrls } = await generateSitemap(options);

  // Parse existing sitemap if it exists
  let existingUrls: SitemapUrl[] = [];
  try {
    existingUrls = await parseSitemap(sitemapPath);
  } catch {
    // Sitemap doesn't exist or is invalid, create new one
  }

  // Create URL maps for comparison
  const existingMap = new Map(existingUrls.map((url) => [url.loc, url]));
  const newMap = new Map(newUrls.map((url) => [url.loc, url]));

  // Calculate differences
  const added = newUrls.filter((url) => !existingMap.has(url.loc)).length;
  const removed = existingUrls.filter((url) => !newMap.has(url.loc)).length;
  const updated = newUrls.filter((url) => {
    const existing = existingMap.get(url.loc);
    return existing && existing.lastmod !== url.lastmod;
  }).length;

  // Write updated sitemap
  const xml = generateSitemapXML(newUrls);
  await fs.writeFile(sitemapPath, xml, "utf-8");

  return {
    added,
    removed,
    updated,
    total: newUrls.length,
  };
}

/**
 * Get all URLs from sitemap
 */
export async function listSitemapUrls(
  sitemapPath: string,
): Promise<SitemapUrl[]> {
  return parseSitemap(sitemapPath);
}
