/**
 * User Feedback Integration for Priority Scoring (ADR-012 Phase 3)
 *
 * Integrates with issue tracking systems (GitHub Issues, GitLab Issues, etc.)
 * to incorporate user-reported documentation issues into priority scoring.
 */

import { DriftDetectionResult } from "./drift-detector.js";

export interface IssueTrackerConfig {
  provider: "github" | "gitlab" | "jira" | "linear";
  apiToken?: string;
  baseUrl?: string;
  owner?: string;
  repo?: string;
  project?: string;
}

export interface DocumentationIssue {
  id: string;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  createdAt: string;
  updatedAt: string;
  affectedFiles?: string[];
  affectedSymbols?: string[];
  severity?: "low" | "medium" | "high" | "critical";
}

export interface UserFeedbackScore {
  totalIssues: number;
  openIssues: number;
  criticalIssues: number;
  recentIssues: number; // Issues updated in last 30 days
  score: number; // 0-100
}

/**
 * User Feedback Integration for ADR-012
 *
 * Fetches documentation-related issues from issue trackers
 * and calculates user feedback scores for priority scoring.
 */
export class UserFeedbackIntegration {
  private config: IssueTrackerConfig | null = null;
  private cache: Map<
    string,
    { issues: DocumentationIssue[]; timestamp: number }
  > = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config?: IssueTrackerConfig) {
    this.config = config || null;
  }

  /**
   * Configure issue tracker connection
   */
  configure(config: IssueTrackerConfig): void {
    this.config = config;
    this.cache.clear(); // Clear cache when config changes
  }

  /**
   * Calculate user feedback score for a drift detection result
   */
  async calculateFeedbackScore(result: DriftDetectionResult): Promise<number> {
    if (!this.config) {
      return 0; // No feedback integration configured
    }

    try {
      const issues = await this.getDocumentationIssues(result.filePath);
      const feedback = this.analyzeIssues(issues, result);

      return feedback.score;
    } catch (error) {
      console.warn(
        `Failed to fetch user feedback for ${result.filePath}:`,
        error,
      );
      return 0; // Graceful degradation
    }
  }

  /**
   * Get documentation-related issues for a file
   */
  private async getDocumentationIssues(
    filePath: string,
  ): Promise<DocumentationIssue[]> {
    const cacheKey = `issues:${filePath}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.issues;
    }

    if (!this.config) {
      return [];
    }

    let issues: DocumentationIssue[] = [];

    try {
      switch (this.config.provider) {
        case "github":
          issues = await this.fetchGitHubIssues(filePath);
          break;
        case "gitlab":
          issues = await this.fetchGitLabIssues(filePath);
          break;
        case "jira":
          issues = await this.fetchJiraIssues(filePath);
          break;
        case "linear":
          issues = await this.fetchLinearIssues(filePath);
          break;
      }

      // Cache the results
      this.cache.set(cacheKey, {
        issues,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn(
        `Failed to fetch issues from ${this.config.provider}:`,
        error,
      );
    }

    return issues;
  }

  /**
   * Fetch GitHub Issues related to documentation
   */
  private async fetchGitHubIssues(
    filePath: string,
  ): Promise<DocumentationIssue[]> {
    if (!this.config?.apiToken || !this.config.owner || !this.config.repo) {
      return [];
    }

    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/issues?state=all&labels=documentation,docs`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DocuMCP/1.0",
    };

    if (this.config.apiToken) {
      headers.Authorization = `token ${this.config.apiToken}`;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as any[];
      return this.parseGitHubIssues(data, filePath);
    } catch (error) {
      console.warn("GitHub API fetch failed:", error);
      return [];
    }
  }

  /**
   * Parse GitHub Issues API response
   */
  private parseGitHubIssues(
    data: any[],
    filePath: string,
  ): DocumentationIssue[] {
    return data
      .filter((issue) => !issue.pull_request) // Exclude PRs
      .map((issue) => {
        // Extract affected files/symbols from issue body
        const affectedFiles = this.extractFileReferences(issue.body || "");
        const affectedSymbols = this.extractSymbolReferences(issue.body || "");

        // Determine severity from labels
        const severity = this.determineSeverityFromLabels(issue.labels || []);

        return {
          id: issue.number.toString(),
          title: issue.title,
          body: issue.body || "",
          state: (issue.state === "open" ? "open" : "closed") as
            | "open"
            | "closed",
          labels: (issue.labels || []).map((l: any) => l.name || l),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          affectedFiles,
          affectedSymbols,
          severity,
        };
      })
      .filter((issue) => {
        // Filter to issues that mention the file or its symbols
        const fileMatches = issue.affectedFiles?.some(
          (f) => filePath.includes(f) || f.includes(filePath),
        );
        const isDocumentationRelated = issue.labels.some((l: string) =>
          ["documentation", "docs", "doc"].includes(l.toLowerCase()),
        );
        return fileMatches || isDocumentationRelated;
      });
  }

  /**
   * Fetch GitLab Issues (placeholder)
   */
  private async fetchGitLabIssues(
    _filePath: string,
  ): Promise<DocumentationIssue[]> {
    // TODO: Implement GitLab API integration
    return [];
  }

  /**
   * Fetch Jira Issues (placeholder)
   */
  private async fetchJiraIssues(
    _filePath: string,
  ): Promise<DocumentationIssue[]> {
    // TODO: Implement Jira API integration
    return [];
  }

  /**
   * Fetch Linear Issues (placeholder)
   */
  private async fetchLinearIssues(
    _filePath: string,
  ): Promise<DocumentationIssue[]> {
    // TODO: Implement Linear API integration
    return [];
  }

  /**
   * Extract file references from issue body
   */
  private extractFileReferences(body: string): string[] {
    const files: string[] = [];
    // Match file paths in markdown code blocks or inline code
    const filePatterns = [
      /`([^`]+\.(ts|js|tsx|jsx|md|mdx))`/g,
      /\[([^\]]+\.(ts|js|tsx|jsx|md|mdx))\]/g,
      /(?:file|path|location):\s*([^\s]+\.(ts|js|tsx|jsx|md|mdx))/gi,
    ];

    for (const pattern of filePatterns) {
      const matches = body.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          files.push(match[1]);
        }
      }
    }

    return [...new Set(files)];
  }

  /**
   * Extract symbol references from issue body
   */
  private extractSymbolReferences(body: string): string[] {
    const symbols: string[] = [];
    // Match function/class names in code blocks
    const symbolPatterns = [
      /`([A-Za-z_][A-Za-z0-9_]*\(\)?)`/g,
      /(?:function|class|method|API):\s*`?([A-Za-z_][A-Za-z0-9_]*)`?/gi,
    ];

    for (const pattern of symbolPatterns) {
      const matches = body.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          symbols.push(match[1]);
        }
      }
    }

    return [...new Set(symbols)];
  }

  /**
   * Determine severity from issue labels
   */
  private determineSeverityFromLabels(
    labels: Array<{ name?: string } | string>,
  ): "low" | "medium" | "high" | "critical" {
    const labelNames = labels.map((l) =>
      typeof l === "string" ? l : l.name || "",
    );
    const lowerLabels = labelNames.map((l) => l.toLowerCase());

    if (
      lowerLabels.some((l) =>
        ["critical", "p0", "severity: critical", "priority: critical"].includes(
          l,
        ),
      )
    ) {
      return "critical";
    }
    if (
      lowerLabels.some((l) =>
        ["high", "p1", "severity: high", "priority: high"].includes(l),
      )
    ) {
      return "high";
    }
    if (
      lowerLabels.some((l) =>
        ["medium", "p2", "severity: medium", "priority: medium"].includes(l),
      )
    ) {
      return "medium";
    }
    return "low";
  }

  /**
   * Analyze issues and calculate feedback score
   */
  private analyzeIssues(
    issues: DocumentationIssue[],
    result: DriftDetectionResult,
  ): UserFeedbackScore {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const openIssues = issues.filter((i) => i.state === "open");
    const criticalIssues = issues.filter(
      (i) => i.severity === "critical" && i.state === "open",
    );
    const recentIssues = issues.filter(
      (i) => new Date(i.updatedAt).getTime() > thirtyDaysAgo,
    );

    // Calculate score based on issue metrics
    let score = 0;

    // Critical open issues contribute heavily
    score += criticalIssues.length * 30;
    score = Math.min(score, 100);

    // Open issues contribute moderately
    score += openIssues.length * 10;
    score = Math.min(score, 100);

    // Recent activity indicates ongoing concern
    if (recentIssues.length > 0) {
      score += Math.min(recentIssues.length * 5, 20);
      score = Math.min(score, 100);
    }

    // Match issues to affected symbols for higher relevance
    const affectedSymbols = new Set<string>();
    for (const drift of result.drifts) {
      for (const diff of drift.codeChanges) {
        affectedSymbols.add(diff.name);
      }
    }

    const relevantIssues = issues.filter((issue) => {
      if (!issue.affectedSymbols) return false;
      return issue.affectedSymbols.some((symbol) =>
        affectedSymbols.has(symbol),
      );
    });

    if (relevantIssues.length > 0) {
      score += Math.min(relevantIssues.length * 15, 30);
      score = Math.min(score, 100);
    }

    return {
      totalIssues: issues.length,
      openIssues: openIssues.length,
      criticalIssues: criticalIssues.length,
      recentIssues: recentIssues.length,
      score: Math.round(score),
    };
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
