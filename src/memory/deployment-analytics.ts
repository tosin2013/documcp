/**
 * Deployment Analytics Module
 * Phase 2.4: Pattern Analysis and Insights
 *
 * Analyzes deployment history to identify patterns, trends, and provide insights
 */

import { getKnowledgeGraph } from "./kg-integration.js";
import { GraphNode, GraphEdge } from "./knowledge-graph.js";

export interface DeploymentPattern {
  ssg: string;
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  successRate: number;
  averageBuildTime?: number;
  commonTechnologies: string[];
  projectCount: number;
}

export interface DeploymentTrend {
  period: string;
  deployments: number;
  successRate: number;
  topSSG: string;
}

export interface DeploymentInsight {
  type: "success" | "warning" | "recommendation";
  title: string;
  description: string;
  ssg?: string;
  metric?: number;
}

export interface AnalyticsReport {
  summary: {
    totalProjects: number;
    totalDeployments: number;
    overallSuccessRate: number;
    mostUsedSSG: string;
    mostSuccessfulSSG: string;
  };
  patterns: DeploymentPattern[];
  insights: DeploymentInsight[];
  recommendations: string[];
}

/**
 * Deployment Analytics Engine
 */
export class DeploymentAnalytics {
  /**
   * Generate comprehensive analytics report
   */
  async generateReport(): Promise<AnalyticsReport> {
    const kg = await getKnowledgeGraph();

    // Get all projects and deployments
    const projects = await kg.findNodes({ type: "project" });
    const deploymentEdges = await kg.findEdges({
      type: "project_deployed_with",
    });

    // Aggregate deployment data by SSG
    const ssgStats = await this.aggregateSSGStatistics(
      projects,
      deploymentEdges,
    );

    // Calculate summary metrics
    const summary = this.calculateSummary(ssgStats, projects.length);

    // Identify patterns
    const patterns = this.identifyPatterns(ssgStats);

    // Generate insights
    const insights = this.generateInsights(patterns, summary);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, insights);

    return {
      summary,
      patterns,
      insights,
      recommendations,
    };
  }

  /**
   * Get deployment statistics for a specific SSG
   */
  async getSSGStatistics(ssg: string): Promise<DeploymentPattern | null> {
    const kg = await getKnowledgeGraph();

    const deployments = await kg.findEdges({
      type: "project_deployed_with",
    });

    const allNodes = await kg.getAllNodes();

    // Filter deployments for this SSG
    const ssgDeployments = deployments.filter((edge) => {
      const configNode = allNodes.find((n) => n.id === edge.target);
      return configNode?.properties.ssg === ssg;
    });

    if (ssgDeployments.length === 0) {
      return null;
    }

    const successful = ssgDeployments.filter(
      (d) => d.properties.success,
    ).length;
    const failed = ssgDeployments.length - successful;

    // Calculate average build time
    const buildTimes = ssgDeployments
      .filter((d) => d.properties.buildTime)
      .map((d) => d.properties.buildTime as number);

    const averageBuildTime =
      buildTimes.length > 0
        ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length
        : undefined;

    // Get unique projects using this SSG
    const projectIds = new Set(ssgDeployments.map((d) => d.source));

    // Get common technologies from projects
    const technologies = new Set<string>();
    for (const projectId of projectIds) {
      const project = allNodes.find((n) => n.id === projectId);
      if (project?.properties.technologies) {
        project.properties.technologies.forEach((tech: string) =>
          technologies.add(tech),
        );
      }
    }

    return {
      ssg,
      totalDeployments: ssgDeployments.length,
      successfulDeployments: successful,
      failedDeployments: failed,
      successRate: successful / ssgDeployments.length,
      averageBuildTime,
      commonTechnologies: Array.from(technologies),
      projectCount: projectIds.size,
    };
  }

  /**
   * Compare multiple SSGs
   */
  async compareSSGs(
    ssgs: string[],
  ): Promise<{ ssg: string; pattern: DeploymentPattern }[]> {
    const comparisons: { ssg: string; pattern: DeploymentPattern }[] = [];

    for (const ssg of ssgs) {
      const pattern = await this.getSSGStatistics(ssg);
      if (pattern) {
        comparisons.push({ ssg, pattern });
      }
    }

    // Sort by success rate
    return comparisons.sort(
      (a, b) => b.pattern.successRate - a.pattern.successRate,
    );
  }

  /**
   * Identify deployment trends over time
   */
  async identifyTrends(periodDays: number = 30): Promise<DeploymentTrend[]> {
    const kg = await getKnowledgeGraph();
    const deployments = await kg.findEdges({
      type: "project_deployed_with",
    });

    // Group deployments by time period
    const now = Date.now();
    const periodMs = periodDays * 24 * 60 * 60 * 1000;

    const trends: Map<string, DeploymentTrend> = new Map();

    for (const deployment of deployments) {
      const timestamp = deployment.properties.timestamp;
      if (!timestamp) continue;

      const deploymentTime = new Date(timestamp).getTime();
      const periodsAgo = Math.floor((now - deploymentTime) / periodMs);

      if (periodsAgo < 0 || periodsAgo > 12) continue; // Last 12 periods

      const periodKey = `${periodsAgo} periods ago`;

      if (!trends.has(periodKey)) {
        trends.set(periodKey, {
          period: periodKey,
          deployments: 0,
          successRate: 0,
          topSSG: "",
        });
      }

      const trend = trends.get(periodKey)!;
      trend.deployments++;

      if (deployment.properties.success) {
        trend.successRate++;
      }
    }

    // Calculate success rates and identify top SSG per period
    for (const trend of trends.values()) {
      trend.successRate = trend.successRate / trend.deployments;
    }

    return Array.from(trends.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  /**
   * Get deployment health score (0-100)
   */
  async getHealthScore(): Promise<{
    score: number;
    factors: {
      name: string;
      impact: number;
      status: "good" | "warning" | "critical";
    }[];
  }> {
    const report = await this.generateReport();

    const factors: {
      name: string;
      impact: number;
      status: "good" | "warning" | "critical";
    }[] = [];
    let totalScore = 0;

    // Factor 1: Overall success rate (40 points)
    const successRateScore = report.summary.overallSuccessRate * 40;
    totalScore += successRateScore;
    factors.push({
      name: "Overall Success Rate",
      impact: successRateScore,
      status:
        report.summary.overallSuccessRate > 0.8
          ? "good"
          : report.summary.overallSuccessRate > 0.5
            ? "warning"
            : "critical",
    });

    // Factor 2: Number of projects (20 points)
    const projectScore = Math.min(20, report.summary.totalProjects * 2);
    totalScore += projectScore;
    factors.push({
      name: "Active Projects",
      impact: projectScore,
      status:
        report.summary.totalProjects > 5
          ? "good"
          : report.summary.totalProjects > 2
            ? "warning"
            : "critical",
    });

    // Factor 3: Deployment frequency (20 points)
    const deploymentScore = Math.min(20, report.summary.totalDeployments * 1.5);
    totalScore += deploymentScore;
    factors.push({
      name: "Deployment Activity",
      impact: deploymentScore,
      status:
        report.summary.totalDeployments > 10
          ? "good"
          : report.summary.totalDeployments > 5
            ? "warning"
            : "critical",
    });

    // Factor 4: SSG diversity (20 points)
    const ssgDiversity = report.patterns.length;
    const diversityScore = Math.min(20, ssgDiversity * 5);
    totalScore += diversityScore;
    factors.push({
      name: "SSG Diversity",
      impact: diversityScore,
      status:
        ssgDiversity > 3 ? "good" : ssgDiversity > 1 ? "warning" : "critical",
    });

    return {
      score: Math.round(totalScore),
      factors,
    };
  }

  /**
   * Private: Aggregate SSG statistics
   */
  private async aggregateSSGStatistics(
    projects: GraphNode[],
    deploymentEdges: GraphEdge[],
  ): Promise<Map<string, DeploymentPattern>> {
    const kg = await getKnowledgeGraph();
    const allNodes = await kg.getAllNodes();
    const ssgStats = new Map<string, DeploymentPattern>();

    for (const deployment of deploymentEdges) {
      const configNode = allNodes.find((n) => n.id === deployment.target);
      if (!configNode || configNode.type !== "configuration") continue;

      const ssg = configNode.properties.ssg;
      if (!ssg) continue;

      if (!ssgStats.has(ssg)) {
        ssgStats.set(ssg, {
          ssg,
          totalDeployments: 0,
          successfulDeployments: 0,
          failedDeployments: 0,
          successRate: 0,
          commonTechnologies: [],
          projectCount: 0,
        });
      }

      const stats = ssgStats.get(ssg)!;
      stats.totalDeployments++;

      if (deployment.properties.success) {
        stats.successfulDeployments++;
      } else {
        stats.failedDeployments++;
      }

      // Track build times
      if (deployment.properties.buildTime) {
        if (!stats.averageBuildTime) {
          stats.averageBuildTime = 0;
        }
        stats.averageBuildTime += deployment.properties.buildTime;
      }
    }

    // Calculate final metrics
    for (const stats of ssgStats.values()) {
      stats.successRate = stats.successfulDeployments / stats.totalDeployments;
      if (stats.averageBuildTime) {
        stats.averageBuildTime /= stats.totalDeployments;
      }
    }

    return ssgStats;
  }

  /**
   * Private: Calculate summary metrics
   */
  private calculateSummary(
    ssgStats: Map<string, DeploymentPattern>,
    projectCount: number,
  ): AnalyticsReport["summary"] {
    let totalDeployments = 0;
    let totalSuccessful = 0;
    let mostUsedSSG = "";
    let mostUsedCount = 0;
    let mostSuccessfulSSG = "";
    let highestSuccessRate = 0;

    for (const [ssg, stats] of ssgStats.entries()) {
      totalDeployments += stats.totalDeployments;
      totalSuccessful += stats.successfulDeployments;

      if (stats.totalDeployments > mostUsedCount) {
        mostUsedCount = stats.totalDeployments;
        mostUsedSSG = ssg;
      }

      if (
        stats.successRate > highestSuccessRate &&
        stats.totalDeployments >= 2
      ) {
        highestSuccessRate = stats.successRate;
        mostSuccessfulSSG = ssg;
      }
    }

    return {
      totalProjects: projectCount,
      totalDeployments,
      overallSuccessRate:
        totalDeployments > 0 ? totalSuccessful / totalDeployments : 0,
      mostUsedSSG: mostUsedSSG || "none",
      mostSuccessfulSSG: mostSuccessfulSSG || mostUsedSSG || "none",
    };
  }

  /**
   * Private: Identify patterns
   */
  private identifyPatterns(
    ssgStats: Map<string, DeploymentPattern>,
  ): DeploymentPattern[] {
    return Array.from(ssgStats.values()).sort(
      (a, b) => b.totalDeployments - a.totalDeployments,
    );
  }

  /**
   * Private: Generate insights
   */
  private generateInsights(
    patterns: DeploymentPattern[],
    summary: AnalyticsReport["summary"],
  ): DeploymentInsight[] {
    const insights: DeploymentInsight[] = [];

    // Overall health insight
    if (summary.overallSuccessRate > 0.8) {
      insights.push({
        type: "success",
        title: "High Success Rate",
        description: `Excellent! ${(summary.overallSuccessRate * 100).toFixed(
          1,
        )}% of deployments succeed`,
        metric: summary.overallSuccessRate,
      });
    } else if (summary.overallSuccessRate < 0.5) {
      insights.push({
        type: "warning",
        title: "Low Success Rate",
        description: `Only ${(summary.overallSuccessRate * 100).toFixed(
          1,
        )}% of deployments succeed. Review common failure patterns.`,
        metric: summary.overallSuccessRate,
      });
    }

    // SSG-specific insights
    for (const pattern of patterns) {
      if (pattern.successRate === 1.0 && pattern.totalDeployments >= 3) {
        insights.push({
          type: "success",
          title: `${pattern.ssg} Perfect Track Record`,
          description: `All ${pattern.totalDeployments} deployments with ${pattern.ssg} succeeded`,
          ssg: pattern.ssg,
          metric: pattern.successRate,
        });
      } else if (pattern.successRate < 0.5 && pattern.totalDeployments >= 2) {
        insights.push({
          type: "warning",
          title: `${pattern.ssg} Struggling`,
          description: `Only ${(pattern.successRate * 100).toFixed(
            0,
          )}% success rate with ${pattern.ssg}`,
          ssg: pattern.ssg,
          metric: pattern.successRate,
        });
      }

      // Build time insights
      if (pattern.averageBuildTime) {
        if (pattern.averageBuildTime < 30000) {
          insights.push({
            type: "success",
            title: `${pattern.ssg} Fast Builds`,
            description: `Average build time: ${(
              pattern.averageBuildTime / 1000
            ).toFixed(1)}s`,
            ssg: pattern.ssg,
            metric: pattern.averageBuildTime,
          });
        } else if (pattern.averageBuildTime > 120000) {
          insights.push({
            type: "warning",
            title: `${pattern.ssg} Slow Builds`,
            description: `Average build time: ${(
              pattern.averageBuildTime / 1000
            ).toFixed(1)}s. Consider optimization.`,
            ssg: pattern.ssg,
            metric: pattern.averageBuildTime,
          });
        }
      }
    }

    return insights;
  }

  /**
   * Private: Generate recommendations
   */
  private generateRecommendations(
    patterns: DeploymentPattern[],
    insights: DeploymentInsight[],
  ): string[] {
    const recommendations: string[] = [];

    // Find best performing SSG
    const bestSSG = patterns.find(
      (p) => p.successRate > 0.8 && p.totalDeployments >= 2,
    );
    if (bestSSG) {
      recommendations.push(
        `Consider using ${bestSSG.ssg} for new projects (${(
          bestSSG.successRate * 100
        ).toFixed(0)}% success rate)`,
      );
    }

    // Identify problematic SSGs
    const problematicSSG = patterns.find(
      (p) => p.successRate < 0.5 && p.totalDeployments >= 3,
    );
    if (problematicSSG) {
      recommendations.push(
        `Review ${problematicSSG.ssg} deployment process - ${problematicSSG.failedDeployments} recent failures`,
      );
    }

    // Diversity recommendation
    if (patterns.length < 2) {
      recommendations.push(
        "Experiment with different SSGs to find the best fit for different project types",
      );
    }

    // Activity recommendation
    const totalDeployments = patterns.reduce(
      (sum, p) => sum + p.totalDeployments,
      0,
    );
    if (totalDeployments < 5) {
      recommendations.push(
        "Deploy more projects to build a robust historical dataset for better recommendations",
      );
    }

    // Warning-based recommendations
    const warnings = insights.filter((i) => i.type === "warning");
    if (warnings.length > 2) {
      recommendations.push(
        "Multiple deployment issues detected - consider reviewing documentation setup process",
      );
    }

    return recommendations;
  }
}

/**
 * Get singleton analytics instance
 */
let analyticsInstance: DeploymentAnalytics | null = null;

export function getDeploymentAnalytics(): DeploymentAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new DeploymentAnalytics();
  }
  return analyticsInstance;
}
