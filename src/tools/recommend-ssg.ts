import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import { initializeMemory } from "../memory/index.js";
import {
  getKnowledgeGraph,
  getProjectContext,
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
}> {
  try {
    const kg = await getKnowledgeGraph();

    // Find similar projects (either by path or by shared technologies)
    let similarProjects = await kg.findNodes({ type: "project" });

    if (projectPath) {
      // Get context for current project
      const context = await getProjectContext(projectPath);
      similarProjects = context.similarProjects;
    } else if (technologies && technologies.length > 0) {
      // Filter by shared technologies
      const techSet = new Set(technologies.map((t) => t.toLowerCase()));
      const projectsWithTech = [] as typeof similarProjects;

      for (const project of similarProjects) {
        const projectTechs = project.properties.technologies || [];
        const hasShared = projectTechs.some((t: string) =>
          techSet.has(t.toLowerCase()),
        );
        if (hasShared) {
          projectsWithTech.push(project);
        }
      }
      similarProjects = projectsWithTech;
    }

    // Aggregate deployment data by SSG
    const ssgStats: Record<
      string,
      { successes: number; failures: number; total: number }
    > = {};

    for (const project of similarProjects) {
      const deployments = await kg.findEdges({
        source: project.id,
        type: "project_deployed_with",
      });

      for (const deployment of deployments) {
        // Get configuration node
        const allNodes = await kg.getAllNodes();
        const configNode = allNodes.find((n) => n.id === deployment.target);

        if (configNode && configNode.type === "configuration") {
          const ssg = configNode.properties.ssg;
          if (!ssgStats[ssg]) {
            ssgStats[ssg] = { successes: 0, failures: 0, total: 0 };
          }

          ssgStats[ssg].total++;
          if (deployment.properties.success) {
            ssgStats[ssg].successes++;
          } else {
            ssgStats[ssg].failures++;
          }
        }
      }
    }

    // Calculate success rates
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

        // Track top performer (require at least 2 deployments)
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

    return {
      similarProjectCount: similarProjects.length,
      successRates,
      topPerformer,
    };
  } catch (error) {
    console.warn("Failed to retrieve historical deployment data:", error);
    return {
      similarProjectCount: 0,
      successRates: {},
    };
  }
}

export async function recommendSSG(args: unknown): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { analysisId, userId, preferences } = inputSchema.parse(args);

  const prioritizeSimplicity = preferences?.priority === "simplicity";
  const ecosystemPreference = preferences?.ecosystem;

  // Phase 2.2: Get user preference manager
  const userPreferenceManager = await getUserPreferenceManager(userId);

  try {
    // Try to retrieve analysis from memory
    let analysisData = null;
    try {
      const manager = await initializeMemory();
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

    // Phase 2.1: Retrieve historical deployment data
    let historicalData:
      | {
          similarProjectCount: number;
          successRates: Record<string, { rate: number; sampleSize: number }>;
          topPerformer?: {
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
    }

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
      if (historicalData && historicalData.similarProjectCount > 0) {
        const recommendedSuccessRate =
          historicalData.successRates[finalRecommendation];

        if (recommendedSuccessRate) {
          // Boost confidence if historically successful
          if (
            recommendedSuccessRate.rate > 0.8 &&
            recommendedSuccessRate.sampleSize >= 3
          ) {
            confidence = Math.min(0.98, confidence + 0.1);
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
        }

        // Consider switching to top performer if significantly better
        if (
          historicalData.topPerformer &&
          historicalData.topPerformer.ssg !== finalRecommendation
        ) {
          const topPerformer = historicalData.topPerformer;
          const currentRate = recommendedSuccessRate?.rate || 0.5;

          // Switch if top performer has 20%+ better success rate and enough samples
          if (
            topPerformer.successRate > currentRate + 0.2 &&
            topPerformer.deploymentCount >= 3
          ) {
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
          } else if (topPerformer.successRate > 0.9) {
            // Add as strong reasoning even if not switching
            reasoning.push(
              `💡 Alternative: ${topPerformer.ssg} has ${(
                topPerformer.successRate * 100
              ).toFixed(0)}% success rate in similar projects`,
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

    const response: MCPToolResponse<SSGRecommendation> = {
      success: true,
      data: recommendation,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
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
