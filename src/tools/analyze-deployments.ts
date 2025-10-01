/**
 * Analyze Deployments Tool
 * Phase 2.4: Deployment Analytics and Insights
 *
 * MCP tool for analyzing deployment patterns and generating insights
 */

import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import { getDeploymentAnalytics } from "../memory/deployment-analytics.js";

const inputSchema = z.object({
  analysisType: z
    .enum(["full_report", "ssg_stats", "compare", "health", "trends"])
    .optional()
    .default("full_report"),
  ssg: z.string().optional().describe("SSG name for ssg_stats analysis"),
  ssgs: z
    .array(z.string())
    .optional()
    .describe("Array of SSG names for comparison"),
  periodDays: z
    .number()
    .optional()
    .default(30)
    .describe("Period in days for trend analysis"),
});

export async function analyzeDeployments(
  args: unknown,
): Promise<{ content: any[] }> {
  const startTime = Date.now();

  try {
    const { analysisType, ssg, ssgs, periodDays } = inputSchema.parse(args);

    const analytics = getDeploymentAnalytics();
    let result: any;
    let actionDescription: string;

    switch (analysisType) {
      case "full_report":
        result = await analytics.generateReport();
        actionDescription =
          "Generated comprehensive deployment analytics report";
        break;

      case "ssg_stats":
        if (!ssg) {
          throw new Error("SSG name required for ssg_stats analysis");
        }
        result = await analytics.getSSGStatistics(ssg);
        if (!result) {
          throw new Error(`No deployment data found for SSG: ${ssg}`);
        }
        actionDescription = `Retrieved statistics for ${ssg}`;
        break;

      case "compare":
        if (!ssgs || ssgs.length < 2) {
          throw new Error(
            "At least 2 SSG names required for comparison analysis",
          );
        }
        result = await analytics.compareSSGs(ssgs);
        actionDescription = `Compared ${ssgs.length} SSGs`;
        break;

      case "health":
        result = await analytics.getHealthScore();
        actionDescription = "Calculated deployment health score";
        break;

      case "trends":
        result = await analytics.identifyTrends(periodDays);
        actionDescription = `Identified deployment trends over ${periodDays} days`;
        break;

      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    const response: MCPToolResponse<any> = {
      success: true,
      data: result,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: actionDescription,
          description: `Analysis completed successfully`,
        },
      ],
    };

    // Add context-specific recommendations
    if (analysisType === "full_report" && result.recommendations) {
      response.recommendations?.push(
        ...result.recommendations.slice(0, 3).map((rec: string) => ({
          type: "info" as const,
          title: "Recommendation",
          description: rec,
        })),
      );
    }

    if (analysisType === "health") {
      const healthStatus =
        result.score > 70 ? "good" : result.score > 40 ? "warning" : "critical";
      response.recommendations?.push({
        type: healthStatus === "good" ? "info" : "warning",
        title: `Health Score: ${result.score}/100`,
        description: `Deployment health is ${healthStatus}`,
      });
    }

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "ANALYTICS_FAILED",
        message: `Failed to analyze deployments: ${error}`,
        resolution:
          "Ensure deployment data exists in the knowledge graph and parameters are valid",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}
