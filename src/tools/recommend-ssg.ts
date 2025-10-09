import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import {
  getKnowledgeGraph,
  getProjectContext,
  getMemoryManager,
} from "../memory/kg-integration.js";
import { getUserPreferenceManager } from "../memory/user-preferences.js";

// SSG scoring matrix based on ADR-003
export interface SSGRecommendation {
  recommended: "jekyll" | "hugo" | "docusaurus" | "mkdocs" | "eleventy";
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    name: string;
    score: number;
    pros: string[];
    cons: string[];
  }>;
  historicalData?: {
    similarProjectCount: number;
    successRates: Record<string, { rate: number; sampleSize: number }>;
    topPerformer?: {
      ssg: string;
      successRate: number;
      deploymentCount: number;
    };
  };
}

const inputSchema = z.object({
  analysisId: z.string(),
  userId: z.string().optional().default("default"),
  preferences: z
    .object({
      priority: z.enum(["simplicity", "features", "performance"]).optional(),
      ecosystem: z
        .enum(["javascript", "python", "ruby", "go", "any"])
        .optional(),
    })
    .optional(),
});

/**
 * Phase 2.1: Retrieve historical deployment data from knowledge graph
 */
async function getHistoricalDeploymentData(
  projectPath?: string,
  technologies?: string[],
): Promise<{
  similarProjectCount: number;
  successRates: Record<string, { rate: number; sampleSize: number }>;
  topPerformer?: {
    ssg: string;
    successRate: number;
    deploymentCount: number;
  };
  globalTopPerformer?: {
    ssg: string;
    successRate: number;
    deploymentCount: number;
  };
}> {
  try {
    const kg = await getKnowledgeGraph();

    // Get ALL projects for finding global top performers
    const allProjects = await kg.findNodes({ type: "project" });

    // Find similar projects (either by path or by shared technologies)
    let similarProjects = allProjects;

    if (projectPath) {
      // Get context for current project
      const context = await getProjectContext(projectPath);

      // If project exists in KG, use its similar projects
      if (context.similarProjects.length > 0) {
        similarProjects = context.similarProjects;
      } else if (technologies && technologies.length > 0) {
        // Project doesn't exist yet, but we have technologies - find similar by tech
        const techSet = new Set(technologies.map((t) => t.toLowerCase()));
        const projectsWithTech = [] as typeof similarProjects;

        for (const project of allProjects) {
          const projectTechs = project.properties.technologies || [];
          const hasShared = projectTechs.some((t: string) =>
            techSet.has(t.toLowerCase()),
          );
          if (hasShared) {
            projectsWithTech.push(project);
          }
        }
        similarProjects = projectsWithTech;
      } else {
        // No project found and no technologies provided
        similarProjects = [];
      }
    } else if (technologies && technologies.length > 0) {
      // Filter by shared technologies
      const techSet = new Set(technologies.map((t) => t.toLowerCase()));
      const projectsWithTech = [] as typeof similarProjects;

      for (const project of allProjects) {
        const projectTechs = project.properties.technologies || [];
        const hasShared = projectTechs.some((t: string) =>
          techSet.has(t.toLowerCase()),
        );
        if (hasShared) {
          projectsWithTech.push(project);
        }
      }
      similarProjects = projectsWithTech;
    } else {
      // No criteria provided
      similarProjects = [];
    }

    // Aggregate deployment data by SSG for similar projects
    const ssgStats: Record<
      string,
      { successes: number; failures: number; total: number }
    > = {};

    // Also track global stats across ALL projects for finding top performers
    const globalSSGStats: Record<
      string,
      { successes: number; failures: number; total: number }
    > = {};

    // Helper function to aggregate stats for a set of projects
    const aggregateStats = async (projects: typeof allProjects) => {
      const stats: Record<
        string,
        { successes: number; failures: number; total: number }
      > = {};

      for (const project of projects) {
        const allEdges = await kg.findEdges({ source: project.id });
        const deployments = allEdges.filter(
          (e) =>
            e.type.startsWith("project_deployed_with") ||
            e.properties.baseType === "project_deployed_with",
        );

        for (const deployment of deployments) {
          const allNodes = await kg.getAllNodes();
          const configNode = allNodes.find((n) => n.id === deployment.target);

          if (configNode && configNode.type === "configuration") {
            const ssg = configNode.properties.ssg;
            if (!stats[ssg]) {
              stats[ssg] = { successes: 0, failures: 0, total: 0 };
            }

            stats[ssg].total++;
            if (deployment.properties.success) {
              stats[ssg].successes++;
            } else {
              stats[ssg].failures++;
            }
          }
        }
      }
      return stats;
    };

    // Aggregate for similar projects
    Object.assign(ssgStats, await aggregateStats(similarProjects));

    // Aggregate for ALL projects (for global top performer)
    Object.assign(globalSSGStats, await aggregateStats(allProjects));

    // Calculate success rates for similar projects
    const successRates: Record<string, { rate: number; sampleSize: number }> =
      {};
    let topPerformer:
      | { ssg: string; successRate: number; deploymentCount: number }
      | undefined;
    let maxRate = 0;

    for (const [ssg, stats] of Object.entries(ssgStats)) {
      if (stats.total > 0) {
        const rate = stats.successes / stats.total;
        successRates[ssg] = {
          rate,
          sampleSize: stats.total,
        };

        // Track top performer in similar projects (require at least 2 deployments)
        if (stats.total >= 2 && rate > maxRate) {
          maxRate = rate;
          topPerformer = {
            ssg,
            successRate: rate,
            deploymentCount: stats.total,
          };
        }
      }
    }

    // Calculate global top performer from ALL projects
    let globalTopPerformer:
      | { ssg: string; successRate: number; deploymentCount: number }
      | undefined;
    let globalMaxRate = 0;

    for (const [ssg, stats] of Object.entries(globalSSGStats)) {
      if (stats.total >= 2) {
        const rate = stats.successes / stats.total;
        if (rate > globalMaxRate) {
          globalMaxRate = rate;
          globalTopPerformer = {
            ssg,
            successRate: rate,
            deploymentCount: stats.total,
          };
        }
      }
    }

    return {
      similarProjectCount: similarProjects.length,
      successRates,
      topPerformer,
      globalTopPerformer,
    };
  } catch (error) {
    console.warn("Failed to retrieve historical deployment data:", error);
    return {
      similarProjectCount: 0,
      successRates: {},
    };
  }
}

/**
 * Recommends the optimal static site generator (SSG) for a project based on analysis and historical data.
 *
 * This function provides intelligent SSG recommendations by analyzing project characteristics,
 * considering user preferences, and leveraging historical deployment data from the knowledge graph.
 * It uses a multi-criteria decision analysis approach to score different SSGs and provide
 * confidence-weighted recommendations with detailed reasoning.
 *
 * @param args - The input arguments for SSG recommendation
 * @param args.analysisId - Unique identifier from a previous repository analysis
 * @param args.userId - User identifier for personalized recommendations (defaults to "default")
 * @param args.preferences - Optional user preferences for recommendation weighting
 * @param args.preferences.priority - Priority focus: "simplicity", "features", or "performance"
 * @param args.preferences.ecosystem - Preferred technology ecosystem: "javascript", "python", "ruby", "go", or "any"
 *
 * @returns Promise resolving to SSG recommendation results
 * @returns content - Array containing the recommendation results in MCP tool response format
 *
 * @throws {Error} When the analysis ID is invalid or not found
 * @throws {Error} When historical data cannot be retrieved
 * @throws {Error} When recommendation scoring fails
 *
 * @example
 * ```typescript
 * // Basic recommendation
 * const recommendation = await recommendSSG({
 *   analysisId: "analysis_abc123_def456",
 *   userId: "user123"
 * });
 *
 * // With preferences
 * const personalized = await recommendSSG({
 *   analysisId: "analysis_abc123_def456",
 *   userId: "user123",
 *   preferences: {
 *     priority: "performance",
 *     ecosystem: "javascript"
 *   }
 * });
 * ```
 *
 * @since 1.0.0
 * @version 1.2.0 - Added historical data integration and user preferences
 */
export async function recommendSSG(
  args: unknown,
  context?: any,
): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { analysisId, userId, preferences } = inputSchema.parse(args);

  const prioritizeSimplicity = preferences?.priority === "simplicity";
  const ecosystemPreference = preferences?.ecosystem;

  // Report initial progress
  if (context?.meta?.progressToken) {
    await context.meta.reportProgress?.({
      progress: 0,
      total: 100,
    });
  }

  await context?.info?.("🔍 Starting SSG recommendation engine...");

  // Phase 2.2: Get user preference manager
  await context?.info?.(`👤 Loading preferences for user: ${userId}...`);
  const userPreferenceManager = await getUserPreferenceManager(userId);

  if (context?.meta?.progressToken) {
    await context.meta.reportProgress?.({
      progress: 15,
      total: 100,
    });
  }

  try {
    // Try to retrieve analysis from memory
    await context?.info?.(`📊 Retrieving analysis: ${analysisId}...`);
    let analysisData = null;
    try {
      const manager = await getMemoryManager();
      const analysis = await manager.recall(analysisId);
      if (analysis && analysis.data) {
        // Handle the wrapped content structure
        if (analysis.data.content && Array.isArray(analysis.data.content)) {
          // Extract the JSON from the first text content
          const firstContent = analysis.data.content[0];
          if (
            firstContent &&
            firstContent.type === "text" &&
            firstContent.text
          ) {
            try {
              analysisData = JSON.parse(firstContent.text);
            } catch (parseError) {
              // If parse fails, try the direct data
              analysisData = analysis.data;
            }
          }
        } else {
          // Direct data structure
          analysisData = analysis.data;
        }
      }
    } catch (error) {
      // If memory retrieval fails, continue with fallback logic
      console.warn(
        `Could not retrieve analysis ${analysisId} from memory:`,
        error,
      );
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 30,
        total: 100,
      });
    }

    // Phase 2.1: Retrieve historical deployment data
    await context?.info?.("📈 Analyzing historical deployment data...");
    let historicalData:
      | {
          similarProjectCount: number;
          successRates: Record<string, { rate: number; sampleSize: number }>;
          topPerformer?: {
            ssg: string;
            successRate: number;
            deploymentCount: number;
          };
          globalTopPerformer?: {
            ssg: string;
            successRate: number;
            deploymentCount: number;
          };
        }
      | undefined;

    if (analysisData) {
      const projectPath = analysisData.path;
      const technologies = analysisData.dependencies?.languages || [];
      historicalData = await getHistoricalDeploymentData(
        projectPath,
        technologies,
      );

      if (historicalData && historicalData.similarProjectCount > 0) {
        await context?.info?.(
          `✨ Found ${historicalData.similarProjectCount} similar project(s) with deployment history`,
        );
      }
    }

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 50,
        total: 100,
      });
    }

    await context?.info?.("🤔 Calculating SSG recommendations...");

    // Determine recommendation based on analysis data if available
    let finalRecommendation:
      | "jekyll"
      | "hugo"
      | "docusaurus"
      | "mkdocs"
      | "eleventy";
    let reasoning: string[] = [];
    let confidence = 0.85;

    if (analysisData) {
      // Use actual analysis data to make informed recommendation
      const ecosystem = analysisData.dependencies?.ecosystem || "unknown";
      const hasReact = analysisData.dependencies?.packages?.some(
        (p: string) => p.includes("react") || p.includes("next"),
      );
      const complexity =
        analysisData.documentation?.estimatedComplexity || "moderate";
      const teamSize = analysisData.recommendations?.teamSize || "small";

      // Logic based on real analysis
      if (ecosystem === "python") {
        finalRecommendation = "mkdocs";
        reasoning = [
          "Python ecosystem detected - MkDocs integrates naturally",
          "Simple configuration with YAML",
          "Material theme provides excellent UI out of the box",
          "Strong Python community support",
        ];
      } else if (ecosystem === "ruby") {
        finalRecommendation = "jekyll";
        reasoning = [
          "Ruby ecosystem detected - Jekyll is the native choice",
          "GitHub Pages native support",
          "Simple static site generation",
          "Extensive theme ecosystem",
        ];
      } else if (hasReact || ecosystem === "javascript") {
        if (complexity === "complex" || teamSize === "large") {
          finalRecommendation = "docusaurus";
          reasoning = [
            "JavaScript/TypeScript ecosystem with React detected",
            "Complex project structure benefits from Docusaurus features",
            "Built-in versioning and internationalization",
            "MDX support for interactive documentation",
          ];
        } else if (prioritizeSimplicity) {
          finalRecommendation = "eleventy";
          reasoning = [
            "JavaScript ecosystem with simplicity priority",
            "Minimal configuration required",
            "Fast build times",
            "Flexible templating options",
          ];
        } else {
          finalRecommendation = "docusaurus";
          reasoning = [
            "JavaScript/TypeScript ecosystem detected",
            "Modern React-based framework",
            "Active community and regular updates",
            "Great developer experience",
          ];
        }
      } else if (ecosystem === "go") {
        finalRecommendation = "hugo";
        reasoning = [
          "Go ecosystem detected - Hugo is written in Go",
          "Extremely fast build times",
          "No runtime dependencies",
          "Excellent for large documentation sites",
        ];
      } else {
        // Default logic when ecosystem is unknown
        if (prioritizeSimplicity) {
          finalRecommendation = "jekyll";
          reasoning = [
            "Simple setup and configuration",
            "GitHub Pages native support",
            "Extensive documentation and community",
            "Mature and stable platform",
          ];
        } else {
          finalRecommendation = "docusaurus";
          reasoning = [
            "Modern documentation framework",
            "Rich feature set out of the box",
            "Great for technical documentation",
            "Active development and support",
          ];
        }
      }

      // Apply preference overrides
      if (ecosystemPreference && ecosystemPreference !== "any") {
        if (ecosystemPreference === "python") {
          finalRecommendation = "mkdocs";
          reasoning.unshift("Python ecosystem explicitly requested");
        } else if (ecosystemPreference === "ruby") {
          finalRecommendation = "jekyll";
          reasoning.unshift("Ruby ecosystem explicitly requested");
        } else if (ecosystemPreference === "go") {
          finalRecommendation = "hugo";
          reasoning.unshift("Go ecosystem explicitly requested");
        } else if (ecosystemPreference === "javascript") {
          if (
            finalRecommendation !== "docusaurus" &&
            finalRecommendation !== "eleventy"
          ) {
            finalRecommendation = prioritizeSimplicity
              ? "eleventy"
              : "docusaurus";
            reasoning.unshift("JavaScript ecosystem explicitly requested");
          }
        }
      }

      // Adjust confidence based on data quality
      if (analysisData.structure?.totalFiles > 100) {
        confidence = Math.min(0.95, confidence + 0.05);
      }
      if (
        analysisData.documentation?.hasReadme &&
        analysisData.documentation?.hasDocs
      ) {
        confidence = Math.min(0.95, confidence + 0.05);
      }

      // Phase 2.1: Adjust recommendation and confidence based on historical data
      if (historicalData && historicalData.similarProjectCount >= 0) {
        const recommendedSuccessRate =
          historicalData.successRates[finalRecommendation];

        if (recommendedSuccessRate) {
          // Boost confidence if historically successful
          if (recommendedSuccessRate.rate >= 1.0) {
            // Perfect success rate - maximum boost
            confidence = Math.min(0.98, confidence + 0.2);
            reasoning.unshift(
              `✅ 100% success rate in ${recommendedSuccessRate.sampleSize} similar project(s)`,
            );
          } else if (
            recommendedSuccessRate.rate > 0.8 &&
            recommendedSuccessRate.sampleSize >= 2
          ) {
            // High success rate - good boost
            confidence = Math.min(0.98, confidence + 0.15);
            reasoning.unshift(
              `✅ ${(recommendedSuccessRate.rate * 100).toFixed(
                0,
              )}% success rate in ${
                recommendedSuccessRate.sampleSize
              } similar project(s)`,
            );
          } else if (
            recommendedSuccessRate.rate < 0.5 &&
            recommendedSuccessRate.sampleSize >= 2
          ) {
            // Reduce confidence if historically problematic
            confidence = Math.max(0.5, confidence - 0.15);
            reasoning.unshift(
              `⚠️ Only ${(recommendedSuccessRate.rate * 100).toFixed(
                0,
              )}% success rate in ${
                recommendedSuccessRate.sampleSize
              } similar project(s)`,
            );
          }
        } else {
          // No deployment history for recommended SSG
          // Check if similar projects had poor outcomes with OTHER SSGs
          // This indicates general deployment challenges
          const allSuccessRates = Object.values(historicalData.successRates);
          if (allSuccessRates.length > 0) {
            const avgSuccessRate =
              allSuccessRates.reduce((sum, data) => sum + data.rate, 0) /
              allSuccessRates.length;
            const totalSamples = allSuccessRates.reduce(
              (sum, data) => sum + data.sampleSize,
              0,
            );

            // If similar projects had poor deployment success overall, reduce confidence
            if (avgSuccessRate < 0.5 && totalSamples >= 2) {
              confidence = Math.max(0.6, confidence - 0.2);
              // Find the SSG with worst performance to mention
              const worstSSG = Object.entries(
                historicalData.successRates,
              ).reduce(
                (worst, [ssg, data]) =>
                  data.rate < worst.rate ? { ssg, rate: data.rate } : worst,
                { ssg: "", rate: 1.0 },
              );
              reasoning.unshift(
                `⚠️ Similar projects had deployment challenges (${
                  worstSSG.ssg
                }: ${(worstSSG.rate * 100).toFixed(0)}% success rate)`,
              );
            }
          }
        }

        // Consider switching to top performer if significantly better
        // Prefer similar project top performer, fall back to global top performer
        const performerToConsider =
          historicalData.topPerformer || historicalData.globalTopPerformer;

        if (
          performerToConsider &&
          performerToConsider.ssg !== finalRecommendation
        ) {
          const topPerformer = performerToConsider;
          const currentRate = recommendedSuccessRate?.rate || 0.5;
          const isFromSimilarProjects = !!historicalData.topPerformer;

          // Only switch if from similar projects (same ecosystem/technologies)
          // For cross-ecosystem recommendations, just mention as alternative
          const shouldSwitch =
            isFromSimilarProjects &&
            topPerformer.successRate > currentRate + 0.2 &&
            topPerformer.deploymentCount >= 2;

          const shouldMention =
            !shouldSwitch &&
            topPerformer.successRate >= 0.8 &&
            topPerformer.deploymentCount >= 2;

          if (shouldSwitch) {
            reasoning.unshift(
              `📊 Switching to ${topPerformer.ssg} based on ${(
                topPerformer.successRate * 100
              ).toFixed(0)}% success rate across ${
                topPerformer.deploymentCount
              } deployments`,
            );
            finalRecommendation = topPerformer.ssg as
              | "jekyll"
              | "hugo"
              | "docusaurus"
              | "mkdocs"
              | "eleventy";
            confidence = Math.min(0.95, topPerformer.successRate + 0.1);
          } else if (shouldMention) {
            // Mention as alternative if it has good success rate
            const projectScope = isFromSimilarProjects
              ? "similar projects"
              : "all projects";
            reasoning.push(
              `💡 Alternative: ${topPerformer.ssg} has ${(
                topPerformer.successRate * 100
              ).toFixed(0)}% success rate in ${projectScope}`,
            );
          }
        }

        // Add general historical context
        if (historicalData.similarProjectCount >= 2) {
          const totalDeployments = Object.values(
            historicalData.successRates,
          ).reduce((sum, data) => sum + data.sampleSize, 0);
          reasoning.push(
            `📚 Based on ${totalDeployments} deployment(s) across ${historicalData.similarProjectCount} similar project(s)`,
          );
        }
      }
    } else {
      // Fallback logic when no analysis data is available
      const baseRecommendation = prioritizeSimplicity ? "jekyll" : "docusaurus";
      finalRecommendation =
        ecosystemPreference === "python" ? "mkdocs" : baseRecommendation;
      reasoning = [
        "Recommendation based on preferences without full analysis",
        "Consider running analyze_repository for more accurate recommendation",
      ];
      confidence = 0.65; // Lower confidence without analysis data
    }

    // Phase 2.2: Apply user preferences to recommendation
    // For preference checking, include all SSGs except the current recommendation
    // This ensures user preferences can override even if their preferred SSG isn't in top alternatives
    const allSSGs: Array<
      "jekyll" | "hugo" | "docusaurus" | "mkdocs" | "eleventy"
    > = ["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"];
    const alternativeNames = allSSGs.filter(
      (ssg) => ssg !== finalRecommendation,
    );

    const preferenceAdjustment =
      userPreferenceManager.applyPreferencesToRecommendation(
        finalRecommendation,
        alternativeNames,
      );

    if (preferenceAdjustment.adjustmentReason) {
      // User preferences led to a different recommendation
      finalRecommendation = preferenceAdjustment.recommended as
        | "jekyll"
        | "hugo"
        | "docusaurus"
        | "mkdocs"
        | "eleventy";
      reasoning.unshift(`🎯 ${preferenceAdjustment.adjustmentReason}`);
      confidence = Math.min(0.95, confidence + 0.05);
    }

    const recommendation: SSGRecommendation = {
      recommended: finalRecommendation,
      confidence,
      reasoning,
      alternatives: getAlternatives(finalRecommendation, prioritizeSimplicity),
      historicalData,
    };

    if (context?.meta?.progressToken) {
      await context.meta.reportProgress?.({
        progress: 100,
        total: 100,
      });
    }

    const executionTime = Date.now() - startTime;
    await context?.info?.(
      `✅ Recommendation complete! Suggesting ${recommendation.recommended.toUpperCase()} with ${(
        recommendation.confidence * 100
      ).toFixed(0)}% confidence (${Math.round(executionTime / 1000)}s)`,
    );

    const response: MCPToolResponse<SSGRecommendation> = {
      success: true,
      data: recommendation,
      metadata: {
        toolVersion: "1.0.0",
        executionTime,
        timestamp: new Date().toISOString(),
        analysisId,
      },
      recommendations: [
        {
          type: "info",
          title: "SSG Recommendation",
          description: `${recommendation.recommended} recommended with ${(
            recommendation.confidence * 100
          ).toFixed(0)}% confidence`,
        },
      ],
      nextSteps: [
        {
          action: "Generate Configuration",
          toolRequired: "generate_config",
          description: `Create ${recommendation.recommended} configuration files`,
          priority: "high",
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "RECOMMENDATION_FAILED",
        message: `Failed to generate SSG recommendation: ${error}`,
        resolution:
          "Ensure analysis ID is valid and preferences are correctly formatted",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        analysisId,
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

function getAlternatives(
  recommended: string,
  prioritizeSimplicity: boolean,
): SSGRecommendation["alternatives"] {
  const allSSGs = [
    {
      name: "Jekyll",
      score: prioritizeSimplicity ? 0.85 : 0.7,
      pros: [
        "Simple setup",
        "GitHub Pages native",
        "Extensive themes",
        "Ruby ecosystem",
      ],
      cons: [
        "Ruby dependency",
        "Slower builds for large sites",
        "Limited dynamic features",
      ],
    },
    {
      name: "Hugo",
      score: prioritizeSimplicity ? 0.65 : 0.75,
      pros: [
        "Extremely fast builds",
        "No dependencies",
        "Go templating",
        "Great for large sites",
      ],
      cons: [
        "Steeper learning curve",
        "Go templating may be unfamiliar",
        "Less flexible themes",
      ],
    },
    {
      name: "Docusaurus",
      score: prioritizeSimplicity ? 0.7 : 0.9,
      pros: [
        "React-based",
        "Rich features",
        "MDX support",
        "Built-in versioning",
      ],
      cons: [
        "More complex setup",
        "Node.js dependency",
        "Heavier than static generators",
      ],
    },
    {
      name: "MkDocs",
      score: prioritizeSimplicity ? 0.8 : 0.75,
      pros: [
        "Simple setup",
        "Python-based",
        "Great themes",
        "Easy configuration",
      ],
      cons: [
        "Python dependency",
        "Less flexible than React-based",
        "Limited customization",
      ],
    },
    {
      name: "Eleventy",
      score: prioritizeSimplicity ? 0.75 : 0.7,
      pros: [
        "Minimal config",
        "Fast builds",
        "Flexible templates",
        "JavaScript ecosystem",
      ],
      cons: [
        "Less opinionated",
        "Fewer built-in features",
        "Requires more setup for complex sites",
      ],
    },
  ];

  // Filter out the recommended SSG and sort by score
  return allSSGs
    .filter((ssg) => ssg.name.toLowerCase() !== recommended.toLowerCase())
    .sort((a, b) => b.score - a.score)
    .slice(0, 2); // Return top 2 alternatives
}
