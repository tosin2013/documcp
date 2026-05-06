#!/usr/bin/env tsx
/**
 * Collect release health metrics for the dashboard
 * Pulls data from GitHub API and npm registry
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ReleaseMetrics {
  version: string;
  publishedAt: string;
  timeToPublishMinutes: number;
  ciSuccess: boolean;
  npmDownloads?: number;
}

interface CIMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  flakeRate: number;
  averageDurationMinutes: number;
}

interface CoverageMetrics {
  timestamp: string;
  coverage: number;
  trend: "up" | "down" | "stable";
}

interface ReleaseHealthData {
  generatedAt: string;
  recentReleases: ReleaseMetrics[];
  ciMetrics: CIMetrics;
  coverageTrend: CoverageMetrics[];
  npmStats: {
    weeklyDownloads: number;
    monthlyDownloads: number;
    totalDownloads: number;
  };
}

/**
 * Execute shell command and return output
 */
function exec(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch (error) {
    console.error(`Command failed: ${command}`);
    return "";
  }
}

/**
 * Fetch recent releases from GitHub
 */
async function fetchRecentReleases(limit = 10): Promise<ReleaseMetrics[]> {
  try {
    const releasesJson = exec(
      `gh release list --limit ${limit} --json tagName,publishedAt,createdAt`
    );

    if (!releasesJson) {
      return [];
    }

    const releases = JSON.parse(releasesJson);

    return releases.map((release: any) => {
      const created = new Date(release.createdAt);
      const published = new Date(release.publishedAt);
      const timeToPublish = (published.getTime() - created.getTime()) / 1000 / 60;

      return {
        version: release.tagName,
        publishedAt: release.publishedAt,
        timeToPublishMinutes: Math.round(timeToPublish),
        ciSuccess: true, // We'll check this separately
      };
    });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return [];
  }
}

/**
 * Fetch CI metrics from recent workflow runs
 */
async function fetchCIMetrics(): Promise<CIMetrics> {
  try {
    const runsJson = exec(
      'gh run list --workflow=ci.yml --limit 50 --json conclusion,createdAt,updatedAt'
    );

    if (!runsJson) {
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        flakeRate: 0,
        averageDurationMinutes: 0,
      };
    }

    const runs = JSON.parse(runsJson);
    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r: any) => r.conclusion === "success").length;
    const failedRuns = runs.filter((r: any) => r.conclusion === "failure").length;

    // Calculate average duration
    const durations = runs
      .filter((r: any) => r.createdAt && r.updatedAt)
      .map((r: any) => {
        const created = new Date(r.createdAt);
        const updated = new Date(r.updatedAt);
        return (updated.getTime() - created.getTime()) / 1000 / 60;
      });

    const averageDuration =
      durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;

    // Simple flake detection: runs that failed but were retried successfully
    const flakeRate = 0; // TODO: Implement retry detection

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0,
      flakeRate,
      averageDurationMinutes: Math.round(averageDuration),
    };
  } catch (error) {
    console.error("Failed to fetch CI metrics:", error);
    return {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      successRate: 0,
      flakeRate: 0,
      averageDurationMinutes: 0,
    };
  }
}

/**
 * Fetch coverage trend from recent commits
 */
async function fetchCoverageTrend(): Promise<CoverageMetrics[]> {
  // For now, return current coverage
  // In the future, we could parse coverage reports from CI artifacts
  const currentCoverage = 92.52; // From latest CI run

  return [
    {
      timestamp: new Date().toISOString(),
      coverage: currentCoverage,
      trend: "stable",
    },
  ];
}

/**
 * Fetch npm download statistics
 */
async function fetchNpmStats(): Promise<{
  weeklyDownloads: number;
  monthlyDownloads: number;
  totalDownloads: number;
}> {
  try {
    // Fetch from npm registry API
    const response = await fetch(
      "https://api.npmjs.org/downloads/point/last-week/documcp"
    );
    const weekData = (await response.json()) as { downloads: number };

    const monthResponse = await fetch(
      "https://api.npmjs.org/downloads/point/last-month/documcp"
    );
    const monthData = (await monthResponse.json()) as { downloads: number };

    return {
      weeklyDownloads: weekData.downloads || 0,
      monthlyDownloads: monthData.downloads || 0,
      totalDownloads: monthData.downloads || 0, // npm doesn't provide total
    };
  } catch (error) {
    console.error("Failed to fetch npm stats:", error);
    return {
      weeklyDownloads: 0,
      monthlyDownloads: 0,
      totalDownloads: 0,
    };
  }
}

/**
 * Main function to collect all metrics
 */
async function collectReleaseHealth(): Promise<ReleaseHealthData> {
  console.log("📊 Collecting release health metrics...");

  const [recentReleases, ciMetrics, coverageTrend, npmStats] = await Promise.all([
    fetchRecentReleases(),
    fetchCIMetrics(),
    fetchCoverageTrend(),
    fetchNpmStats(),
  ]);

  const data: ReleaseHealthData = {
    generatedAt: new Date().toISOString(),
    recentReleases,
    ciMetrics,
    coverageTrend,
    npmStats,
  };

  return data;
}

/**
 * Save metrics to JSON file
 */
async function saveMetrics(data: ReleaseHealthData, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✅ Metrics saved to ${outputPath}`);
}

/**
 * CLI entry point
 */
async function main() {
  try {
    const outputPath =
      process.argv[2] || path.join(process.cwd(), "docs/data/release-health.json");

    const data = await collectReleaseHealth();

    await saveMetrics(data, outputPath);

    // Print summary
    console.log("\n📈 Release Health Summary:");
    console.log(`  Recent releases: ${data.recentReleases.length}`);
    console.log(`  CI success rate: ${data.ciMetrics.successRate.toFixed(1)}%`);
    console.log(`  Average CI duration: ${data.ciMetrics.averageDurationMinutes} min`);
    console.log(`  Current coverage: ${data.coverageTrend[0]?.coverage}%`);
    console.log(`  Weekly npm downloads: ${data.npmStats.weeklyDownloads}`);
  } catch (error) {
    console.error("❌ Failed to collect release health metrics:", error);
    process.exit(1);
  }
}

export { collectReleaseHealth, type ReleaseHealthData };

// Run if called directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
