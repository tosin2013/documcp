#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * link-todo-to-issues.cjs
 *
 * Injects `tosin2013/documcp#NNN` references into TODO.md tasks based on a
 * static map of ADR file slug -> related GitHub issue numbers.
 *
 * Idempotent: a task that already has a `**Related issues:**` line is left
 * untouched. Re-running the script is safe.
 *
 * Why a static map? generate_adr_todo does not (yet) carry GitHub issue
 * numbers from milestones into individual tasks. Until that round-trip
 * exists, this script bridges the gap so contributors can click straight
 * from TODO.md to the tracking issue.
 *
 * Usage:
 *   node scripts/link-todo-to-issues.cjs            # mutate TODO.md in place
 *   node scripts/link-todo-to-issues.cjs --check    # exit 1 if any task
 *                                                   # in scope is missing
 *                                                   # its issue ref (CI use)
 *   node scripts/link-todo-to-issues.cjs --dry-run  # print stats only
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO = "tosin2013/documcp";
const TODO_PATH = path.resolve(__dirname, "..", "TODO.md");

// ---------------------------------------------------------------------------
// Static map: ADR file (must match the `<!-- adr: ... -->` marker in TODO.md)
// -> array of related issue numbers. Order: epic first, then leaves.
// Keep this map in sync when filing new ADRs/issues.
// ---------------------------------------------------------------------------
const ADR_TO_ISSUES = {
  // ADR-014: Removal of Server-Side LLM Dependency
  "adr-0014-removal-of-server-side-llm-dependency-in-favor-of-mcp-sampling.md":
    [106, 107, 108, 109, 110],

  // ADR-015: Multi-Language AST Analysis via Tree-sitter Parser Registry
  "adr-0015-multi-language-ast-analysis-via-tree-sitter-parser-registry.md": [
    112,
  ],

  // ADR-016: SSG Adapter Plugin Pattern
  "adr-0016-ssg-adapter-plugin-pattern-for-recommendation-configuration-and-deployment.md":
    [122, 123],

  // ADR-017: Standalone CLI Surface
  "adr-0017-standalone-cli-surface-for-non-mcp-workflows.md": [126],

  // ADR-018: Deploy Target Adapter Pattern
  "adr-0018-deploy-target-adapter-pattern-for-github-pages-vercel-netlify-and-cloudflare-pages.md":
    [127, 128, 129, 130],

  // ----- Existing ADRs that gain new milestone-tracked issues this cycle -----

  // ADR-002: Repository analysis engine (performance benchmark suite)
  "adr-0002-repository-analysis-engine.md": [118],

  // ADR-004: Diataxis Framework (documentation quality audit per category)
  "adr-0004-diataxis-framework-integration.md": [119],

  // ADR-009: Content Accuracy Framework (community insights aggregation)
  "adr-0009-content-accuracy-validation-framework.md": [111],

  // ADR-012: Drift priority scoring (change-watcher persistence,
  // priority-feedback ingestion, GitHub App for continuous drift)
  "adr-0012-priority-scoring-system-for-documentation-drift.md": [113, 114, 125],

  // ADR-013: Release pipeline (template-based release notes, release health
  // dashboard, smart Dependabot auto-merge)
  "adr-0013-release-pipeline-and-package-distribution.md": [115, 116, 117],
};

// Leaf issues that don't sit under any specific ADR but still belong on
// the roadmap (process / onboarding / community work). Reported by `--check`
// so CI can flag missing coverage.
const ADDITIONAL_LEAF_ISSUES = [
  // CONTRIBUTING.md refresh (process; spans many ADRs)
  120,
  // Docker Compose demo (onboarding; no single ADR)
  121,
  // VS Code extension shim (community/onboarding)
  124,
];

// All issue numbers expected to be linked somewhere in TODO.md.
function expectedIssueSet() {
  const fromMap = Object.values(ADR_TO_ISSUES).flat();
  return new Set([...fromMap, ...ADDITIONAL_LEAF_ISSUES]);
}

function formatIssueRefs(numbers) {
  return numbers.map((n) => `${REPO}#${n}`).join(", ");
}

// Split the document into tasks. A task starts with `## ` at column 0 and ends
// at the next `## ` or end of file. The header before the first `## ` is
// preserved verbatim.
function splitTasks(md) {
  const lines = md.split("\n");
  const sections = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith("## ") && current.length) {
      sections.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }
  if (current.length) sections.push(current.join("\n"));
  return sections;
}

function getAdrMarker(section) {
  const m = section.match(/<!--\s*adr:\s*([^\s>]+)\s*-->/);
  return m ? m[1] : null;
}

function alreadyLinked(section) {
  return /^\*\*Related issues:\*\*/m.test(section);
}

// Inject a `**Related issues:** ...` line directly after the `**Priority:** X`
// line (or at the end of the front-matter block if no Priority line is found).
function injectRelatedIssues(section, refs) {
  const line = `**Related issues:** ${refs}`;
  if (alreadyLinked(section)) return section;

  const lines = section.split("\n");
  let insertAt = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/^\*\*Priority:\*\*/.test(lines[i])) {
      insertAt = i + 1;
      break;
    }
  }

  // Fall back to inserting after the first blank line that follows the
  // HTML comments at the top of the section.
  if (insertAt === -1) {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "" && lines[i - 1].startsWith("<!--")) {
        insertAt = i;
        break;
      }
    }
  }

  if (insertAt === -1) insertAt = lines.length;
  lines.splice(insertAt, 0, line);
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const check = args.includes("--check");

  if (!fs.existsSync(TODO_PATH)) {
    console.error(`TODO.md not found at ${TODO_PATH}`);
    process.exit(2);
  }

  const original = fs.readFileSync(TODO_PATH, "utf8");
  const sections = splitTasks(original);

  const linkedIssues = new Set();
  const tasksMutated = [];
  let mutatedCount = 0;

  const updated = sections
    .map((section) => {
      const adr = getAdrMarker(section);
      if (!adr) return section;
      const refs = ADR_TO_ISSUES[adr];
      if (!refs || refs.length === 0) return section;

      refs.forEach((n) => linkedIssues.add(n));

      if (alreadyLinked(section)) return section;

      const injected = injectRelatedIssues(section, formatIssueRefs(refs));
      if (injected !== section) {
        mutatedCount += 1;
        const titleMatch = section.match(/^##\s+(.+)$/m);
        tasksMutated.push(titleMatch ? titleMatch[1] : "(unknown task)");
      }
      return injected;
    })
    .join("\n");

  if (!dryRun && updated !== original) {
    fs.writeFileSync(TODO_PATH, updated, "utf8");
  }

  const expected = expectedIssueSet();
  const missing = [...expected].filter((n) => !linkedIssues.has(n)).sort(
    (a, b) => a - b,
  );

  console.log(`link-todo-to-issues: scanned ${sections.length} sections`);
  console.log(`  tasks mutated:        ${mutatedCount}`);
  console.log(`  unique issues linked: ${linkedIssues.size}`);
  console.log(
    `  expected coverage:    ${expected.size} (${ADR_TO_ISSUES ? Object.keys(ADR_TO_ISSUES).length : 0} ADR-mapped + ${ADDITIONAL_LEAF_ISSUES.length} additional)`,
  );

  if (tasksMutated.length && tasksMutated.length <= 25) {
    console.log("  mutated tasks:");
    tasksMutated.forEach((t) => console.log(`    - ${t}`));
  } else if (tasksMutated.length > 25) {
    console.log(`  mutated tasks: ${tasksMutated.length} (truncated)`);
  }

  if (missing.length) {
    console.log(
      `  WARNING: ${missing.length} expected issue(s) not linked to any ADR-derived task: ${missing
        .map((n) => `#${n}`)
        .join(", ")}`,
    );
    console.log(
      "    (these are tracked under ADDITIONAL_LEAF_ISSUES and likely belong to ADRs 008/009/012/013 or to onboarding/backlog)",
    );
  }

  if (check && missing.length) {
    process.exit(1);
  }

  if (dryRun) {
    console.log("(dry run — TODO.md not modified)");
  } else if (updated === original) {
    console.log("(idempotent: no changes needed)");
  } else {
    console.log(`TODO.md updated.`);
  }
}

main();
