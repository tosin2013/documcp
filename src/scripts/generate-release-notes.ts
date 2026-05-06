#!/usr/bin/env node
/**
 * Enhanced Release Notes Generator
 *
 * Deterministic release notes generator that:
 * - Groups commits by conventional commit type/scope
 * - Links to PRs and commits
 * - Detects and links ADR file changes
 * - Computes test coverage delta
 * - Summarizes dependency bumps
 *
 * No LLM required - all data extracted from git metadata and project files.
 *
 * Usage:
 *   tsx src/scripts/generate-release-notes.ts <from-tag> <to-tag>
 *   tsx src/scripts/generate-release-notes.ts v0.6.0 v0.7.0
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface ConventionalCommit {
  hash: string;
  shortHash: string;
  type: string;
  scope?: string;
  subject: string;
  body: string;
  breaking: boolean;
  prNumber?: string;
  adrFiles: string[];
}

interface CommitGroup {
  type: string;
  emoji: string;
  title: string;
  commits: ConventionalCommit[];
}

interface CoverageSummary {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

interface DependencyBump {
  name: string;
  from: string;
  to: string;
  type: "dependencies" | "devDependencies";
}

interface ReleaseNotes {
  version: string;
  date: string;
  compareUrl: string;
  groups: CommitGroup[];
  adrChanges: string[];
  coverageDelta?: {
    previous: number;
    current: number;
    change: number;
  };
  dependencyBumps: DependencyBump[];
  breakingChanges: ConventionalCommit[];
}

const COMMIT_TYPES: Record<
  string,
  { emoji: string; title: string; priority: number }
> = {
  feat: { emoji: "🚀", title: "Features", priority: 1 },
  fix: { emoji: "🐛", title: "Bug Fixes", priority: 2 },
  perf: { emoji: "⚡", title: "Performance Improvements", priority: 3 },
  refactor: { emoji: "♻️", title: "Code Refactoring", priority: 4 },
  docs: { emoji: "📚", title: "Documentation", priority: 5 },
  test: { emoji: "✅", title: "Tests", priority: 6 },
  build: { emoji: "👷", title: "Build System", priority: 7 },
  ci: { emoji: "🔄", title: "CI/CD", priority: 8 },
  chore: { emoji: "🔧", title: "Chores", priority: 9 },
  revert: { emoji: "⏪", title: "Reverts", priority: 10 },
};

const REPO_URL = "https://github.com/tosin2013/documcp";

/**
 * Execute git command and return output
 */
function gitCommand(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    console.error(`Git command failed: ${cmd}`);
    throw error;
  }
}

/**
 * Parse conventional commit message
 */
function parseCommit(commitLine: string): ConventionalCommit | null {
  const [hash, ...messageParts] = commitLine.split(" ");
  const message = messageParts.join(" ");

  // Match conventional commit format: type(scope): subject
  const conventionalMatch = message.match(
    /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/,
  );

  if (!conventionalMatch) {
    // Skip non-conventional commits
    return null;
  }

  const [, type, scope, breakingMarker, subject] = conventionalMatch;

  // Extract PR number from subject
  const prMatch = subject.match(/\(#(\d+)\)/);
  const prNumber = prMatch ? prMatch[1] : undefined;

  // Get commit details
  const body = gitCommand(`git log -1 --format=%b ${hash}`);
  const breaking = !!breakingMarker || body.includes("BREAKING CHANGE:");

  // Get files changed in this commit
  const filesChanged = gitCommand(
    `git diff-tree --no-commit-id --name-only -r ${hash}`,
  )
    .split("\n")
    .filter(Boolean);

  // Find ADR files
  const adrFiles = filesChanged.filter(
    (file) => file.startsWith("docs/adrs/") && file.endsWith(".md"),
  );

  return {
    hash,
    shortHash: hash.substring(0, 7),
    type,
    scope,
    subject: subject.replace(/\s*\(#\d+\)$/, ""), // Remove PR number from subject
    body,
    breaking,
    prNumber,
    adrFiles,
  };
}

/**
 * Get commits between two tags
 */
function getCommits(fromTag: string, toTag: string): ConventionalCommit[] {
  const commitRange = `${fromTag}..${toTag}`;
  const commitHashes = gitCommand(`git log ${commitRange} --format=%H`)
    .split("\n")
    .filter(Boolean);

  const commits: ConventionalCommit[] = [];

  for (const hash of commitHashes) {
    const commitLine = gitCommand(`git log -1 --format="%H %s" ${hash}`);
    const parsed = parseCommit(commitLine);
    if (parsed) {
      commits.push(parsed);
    }
  }

  return commits;
}

/**
 * Group commits by type
 */
function groupCommits(commits: ConventionalCommit[]): CommitGroup[] {
  const groups = new Map<string, ConventionalCommit[]>();

  for (const commit of commits) {
    if (!groups.has(commit.type)) {
      groups.set(commit.type, []);
    }
    groups.get(commit.type)!.push(commit);
  }

  const result: CommitGroup[] = [];

  for (const [type, typeCommits] of groups.entries()) {
    const config = COMMIT_TYPES[type] || {
      emoji: "📝",
      title: type.charAt(0).toUpperCase() + type.slice(1),
      priority: 99,
    };

    result.push({
      type,
      emoji: config.emoji,
      title: config.title,
      commits: typeCommits,
    });
  }

  // Sort by priority
  result.sort((a, b) => {
    const aPriority = COMMIT_TYPES[a.type]?.priority ?? 99;
    const bPriority = COMMIT_TYPES[b.type]?.priority ?? 99;
    return aPriority - bPriority;
  });

  return result;
}

/**
 * Get all ADR files changed between tags
 */
function getADRChanges(fromTag: string, toTag: string): string[] {
  const filesChanged = gitCommand(`git diff --name-only ${fromTag}..${toTag}`)
    .split("\n")
    .filter(Boolean);

  return filesChanged.filter(
    (file) => file.startsWith("docs/adrs/") && file.endsWith(".md"),
  );
}

/**
 * Read coverage summary from file
 */
function readCoverageSummary(tag: string): number | null {
  try {
    // Checkout the tag temporarily
    const currentBranch = gitCommand("git rev-parse --abbrev-ref HEAD");
    gitCommand(`git checkout ${tag} --quiet`);

    const coveragePath = path.join(
      process.cwd(),
      "coverage/coverage-summary.json",
    );

    if (!fs.existsSync(coveragePath)) {
      gitCommand(`git checkout ${currentBranch} --quiet`);
      return null;
    }

    const coverageData: CoverageSummary = JSON.parse(
      fs.readFileSync(coveragePath, "utf-8"),
    );
    const totalCoverage = coverageData.total.lines.pct;

    gitCommand(`git checkout ${currentBranch} --quiet`);
    return totalCoverage;
  } catch (error) {
    console.warn(`Could not read coverage for ${tag}:`, error);
    return null;
  }
}

/**
 * Get dependency bumps between tags
 */
function getDependencyBumps(fromTag: string, toTag: string): DependencyBump[] {
  try {
    const oldPackageJson = gitCommand(`git show ${fromTag}:package.json`);
    const newPackageJson = gitCommand(`git show ${toTag}:package.json`);

    const oldPkg = JSON.parse(oldPackageJson);
    const newPkg = JSON.parse(newPackageJson);

    const bumps: DependencyBump[] = [];

    // Check dependencies
    for (const [name, newVersion] of Object.entries(
      newPkg.dependencies || {},
    )) {
      const oldVersion = oldPkg.dependencies?.[name];
      if (oldVersion && oldVersion !== newVersion) {
        bumps.push({
          name,
          from: oldVersion as string,
          to: newVersion as string,
          type: "dependencies",
        });
      }
    }

    // Check devDependencies
    for (const [name, newVersion] of Object.entries(
      newPkg.devDependencies || {},
    )) {
      const oldVersion = oldPkg.devDependencies?.[name];
      if (oldVersion && oldVersion !== newVersion) {
        bumps.push({
          name,
          from: oldVersion as string,
          to: newVersion as string,
          type: "devDependencies",
        });
      }
    }

    return bumps;
  } catch (error) {
    console.warn("Could not compute dependency bumps:", error);
    return [];
  }
}

/**
 * Format commit for markdown
 */
function formatCommit(commit: ConventionalCommit): string {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  const prLink = commit.prNumber
    ? ` ([#${commit.prNumber}](${REPO_URL}/issues/${commit.prNumber}))`
    : "";
  const commitLink = `([${commit.shortHash}](${REPO_URL}/commit/${commit.hash}))`;

  let line = `- ${scope}${commit.subject}${prLink} ${commitLink}`;

  // Add ADR links if any
  if (commit.adrFiles.length > 0) {
    const adrLinks = commit.adrFiles.map((file) => {
      const adrName = path.basename(file, ".md");
      return `[${adrName}](${file})`;
    });
    line += ` - ADRs: ${adrLinks.join(", ")}`;
  }

  return line;
}

/**
 * Generate release notes
 */
function generateReleaseNotes(fromTag: string, toTag: string): ReleaseNotes {
  console.log(`Generating release notes from ${fromTag} to ${toTag}...`);

  const commits = getCommits(fromTag, toTag);
  const groups = groupCommits(commits);
  const adrChanges = getADRChanges(fromTag, toTag);
  const dependencyBumps = getDependencyBumps(fromTag, toTag);
  const breakingChanges = commits.filter((c) => c.breaking);

  // Get version from toTag
  const version = toTag.replace(/^v/, "");
  const date = new Date().toISOString().split("T")[0];
  const compareUrl = `${REPO_URL}/compare/${fromTag}...${toTag}`;

  // Try to get coverage delta
  let coverageDelta;
  const previousCoverage = readCoverageSummary(fromTag);
  const currentCoverage = readCoverageSummary(toTag);

  if (previousCoverage !== null && currentCoverage !== null) {
    coverageDelta = {
      previous: previousCoverage,
      current: currentCoverage,
      change: currentCoverage - previousCoverage,
    };
  }

  return {
    version,
    date,
    compareUrl,
    groups,
    adrChanges,
    coverageDelta,
    dependencyBumps,
    breakingChanges,
  };
}

/**
 * Format release notes as markdown
 */
function formatReleaseNotes(notes: ReleaseNotes): string {
  const lines: string[] = [];

  lines.push(`## [${notes.version}](${notes.compareUrl}) (${notes.date})`);
  lines.push("");

  // Breaking changes section
  if (notes.breakingChanges.length > 0) {
    lines.push("### ⚠️ BREAKING CHANGES");
    lines.push("");
    for (const commit of notes.breakingChanges) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
  }

  // Commit groups
  for (const group of notes.groups) {
    lines.push(`### ${group.emoji} ${group.title}`);
    lines.push("");
    for (const commit of group.commits) {
      lines.push(formatCommit(commit));
    }
    lines.push("");
  }

  // ADR changes
  if (notes.adrChanges.length > 0) {
    lines.push("### 📋 Architecture Decisions");
    lines.push("");
    lines.push("The following ADRs were modified in this release:");
    lines.push("");
    for (const adr of notes.adrChanges) {
      const adrName = path.basename(adr, ".md");
      lines.push(`- [${adrName}](${adr})`);
    }
    lines.push("");
  }

  // Coverage delta
  if (notes.coverageDelta) {
    const { previous, current, change } = notes.coverageDelta;
    const changeSymbol = change >= 0 ? "+" : "";
    const changeEmoji = change >= 0 ? "📈" : "📉";

    lines.push(`### ${changeEmoji} Test Coverage`);
    lines.push("");
    lines.push(
      `Coverage changed from **${previous.toFixed(2)}%** to **${current.toFixed(
        2,
      )}%** (${changeSymbol}${change.toFixed(2)}%)`,
    );
    lines.push("");
  }

  // Dependency bumps
  if (notes.dependencyBumps.length > 0) {
    lines.push("### 📦 Dependency Updates");
    lines.push("");
    for (const bump of notes.dependencyBumps) {
      const type = bump.type === "dependencies" ? "prod" : "dev";
      lines.push(`- **${bump.name}** (${type}): ${bump.from} → ${bump.to}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error(
      "Usage: tsx src/scripts/generate-release-notes.ts <from-tag> <to-tag>",
    );
    console.error(
      "Example: tsx src/scripts/generate-release-notes.ts v0.6.0 v0.7.0",
    );
    process.exit(1);
  }

  const [fromTag, toTag] = args;

  try {
    const notes = generateReleaseNotes(fromTag, toTag);
    const markdown = formatReleaseNotes(notes);

    console.log("\n" + "=".repeat(80));
    console.log("ENHANCED RELEASE NOTES");
    console.log("=".repeat(80) + "\n");
    console.log(markdown);

    // Optionally write to file
    const outputFile = `release-notes-${notes.version}.md`;
    fs.writeFileSync(outputFile, markdown);
    console.log(`\n✅ Release notes written to ${outputFile}`);
  } catch (error) {
    console.error("Error generating release notes:", error);
    process.exit(1);
  }
}

// Check if running as main module (CLI execution)
// In ES modules, we check if this file is being executed directly
const isDirectExecution = process.argv[1]?.includes("generate-release-notes");

if (isDirectExecution) {
  main();
}

export { generateReleaseNotes, formatReleaseNotes, type ReleaseNotes };
