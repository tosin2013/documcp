/**
 * Enhanced Memory Manager with Learning and Knowledge Graph Integration
 * Combines Issues #47 and #48 for intelligent memory management
 */

import { MemoryManager } from "./manager.js";
import { MemoryEntry } from "./storage.js";
import IncrementalLearningSystem, {
  ProjectFeatures,
  LearningInsight,
} from "./learning.js";
import KnowledgeGraph, { RecommendationPath } from "./knowledge-graph.js";

export interface EnhancedRecommendation {
  baseRecommendation: any;
  learningEnhanced: any;
  graphBased: RecommendationPath[];
  insights: LearningInsight[];
  confidence: number;
  reasoning: string[];
  metadata: {
    usedLearning: boolean;
    usedKnowledgeGraph: boolean;
    patternsFound: number;
    similarProjects: number;
  };
}

export interface IntelligentAnalysis {
  analysis: any;
  patterns: string[];
  predictions: Array<{
    type: "success_rate" | "optimal_ssg" | "potential_issues";
    prediction: string;
    confidence: number;
  }>;
  recommendations: string[];
  learningData: {
    similarProjects: number;
    confidenceLevel: number;
    dataQuality: "low" | "medium" | "high";
  };
}

export class EnhancedMemoryManager extends MemoryManager {
  private learningSystem: IncrementalLearningSystem;
  private knowledgeGraph: KnowledgeGraph;
  private initialized: boolean = false;

  constructor(storageDir?: string) {
    super(storageDir);
    this.learningSystem = new IncrementalLearningSystem(this);
    this.knowledgeGraph = new KnowledgeGraph(this);
  }

  async initialize(): Promise<void> {
    await super.initialize();

    if (!this.initialized) {
      await this.learningSystem.initialize();
      await this.knowledgeGraph.initialize();
      this.initialized = true;

      // Set up automatic learning from new memories
      this.on("memory-created", this.handleNewMemory.bind(this));
    }
  }

  /**
   * Enhanced recommendation that combines base analysis with learning and graph intelligence
   */
  async getEnhancedRecommendation(
    projectPath: string,
    baseRecommendation: any,
    projectFeatures: ProjectFeatures,
  ): Promise<EnhancedRecommendation> {
    await this.initialize();

    // Get learning-enhanced recommendation
    const learningResult = await this.learningSystem.getImprovedRecommendation(
      projectFeatures,
      baseRecommendation,
    );

    // Get knowledge graph-based recommendations
    const candidateSSGs = this.extractCandidateSSGs(baseRecommendation);
    const graphRecommendations =
      await this.knowledgeGraph.getGraphBasedRecommendation(
        projectFeatures,
        candidateSSGs,
      );

    // Combine insights and reasoning
    const allInsights = [...learningResult.insights];
    const reasoning: string[] = [];

    // Add graph-based reasoning
    if (graphRecommendations.length > 0) {
      const topRecommendation = graphRecommendations[0];
      reasoning.push(...topRecommendation.reasoning);

      allInsights.push({
        type: "recommendation",
        message: `Knowledge graph analysis suggests ${topRecommendation.to.label} based on similar successful projects`,
        confidence: topRecommendation.confidence,
        actionable: true,
        data: { graphPath: topRecommendation.path },
      });
    }

    // Calculate combined confidence
    const combinedConfidence = this.calculateCombinedConfidence(
      baseRecommendation.confidence,
      learningResult.confidence,
      graphRecommendations[0]?.confidence || 0,
    );

    // Determine final recommendation
    const finalRecommendation = learningResult.recommendation;
    if (
      graphRecommendations.length > 0 &&
      graphRecommendations[0].confidence > 0.8
    ) {
      const graphChoice = graphRecommendations[0].to.label;
      if (graphChoice !== finalRecommendation.recommended) {
        finalRecommendation.graphSuggestion = graphChoice;
        finalRecommendation.conflictDetected = true;
        reasoning.push(
          `Knowledge graph suggests ${graphChoice} while learning system suggests ${finalRecommendation.recommended}`,
        );
      }
    }

    return {
      baseRecommendation,
      learningEnhanced: learningResult.recommendation,
      graphBased: graphRecommendations,
      insights: allInsights,
      confidence: combinedConfidence,
      reasoning,
      metadata: {
        usedLearning: learningResult.insights.length > 0,
        usedKnowledgeGraph: graphRecommendations.length > 0,
        patternsFound: await this.countRelevantPatterns(projectFeatures),
        similarProjects: graphRecommendations.length,
      },
    };
  }

  /**
   * Enhanced analysis that provides intelligent insights
   */
  async getIntelligentAnalysis(
    projectPath: string,
    baseAnalysis: any,
  ): Promise<IntelligentAnalysis> {
    await this.initialize();

    const projectFeatures = this.extractProjectFeatures(baseAnalysis);

    // Find patterns from similar projects
    const patterns = await this.findProjectPatterns(projectFeatures);

    // Generate predictions
    const predictions = await this.generatePredictions(
      projectFeatures,
      patterns,
    );

    // Generate recommendations
    const recommendations = await this.generateIntelligentRecommendations(
      projectFeatures,
      patterns,
      predictions,
    );

    // Assess learning data quality
    const learningData = await this.assessLearningData(projectFeatures);

    return {
      analysis: baseAnalysis,
      patterns: patterns.map((p) => p.description),
      predictions,
      recommendations,
      learningData,
    };
  }

  /**
   * Learn from new memory entries automatically
   */
  private async handleNewMemory(memory: MemoryEntry): Promise<void> {
    try {
      // Determine outcome for learning
      const outcome = this.inferOutcome(memory);

      if (outcome) {
        await this.learningSystem.learn(memory, outcome);
      }

      // Update knowledge graph
      await this.knowledgeGraph.buildFromMemories();

      // Periodically save graph to persistent storage
      if (Math.random() < 0.1) {
        // 10% chance to save
        await this.knowledgeGraph.saveToMemory();
      }
    } catch (error) {
      console.error("Error in automatic learning:", error);
    }
  }

  /**
   * Extract project features from analysis data
   */
  private extractProjectFeatures(analysis: any): ProjectFeatures {
    return {
      language: analysis.language?.primary || "unknown",
      framework: analysis.framework?.name,
      size: this.categorizeProjectSize(analysis.stats?.files || 0),
      complexity: this.categorizeProjectComplexity(analysis),
      hasTests: Boolean(analysis.testing?.hasTests),
      hasCI: Boolean(analysis.ci?.hasCI),
      hasDocs: Boolean(analysis.documentation?.exists),
      teamSize: analysis.team?.size,
      isOpenSource: Boolean(analysis.repository?.isPublic),
    };
  }

  private categorizeProjectSize(
    fileCount: number,
  ): "small" | "medium" | "large" {
    if (fileCount < 50) return "small";
    if (fileCount < 200) return "medium";
    return "large";
  }

  private categorizeProjectComplexity(
    analysis: any,
  ): "simple" | "moderate" | "complex" {
    let complexity = 0;

    if (analysis.dependencies?.count > 20) complexity++;
    if (analysis.framework?.name) complexity++;
    if (analysis.testing?.frameworks?.length > 1) complexity++;
    if (analysis.ci?.workflows?.length > 2) complexity++;
    if (analysis.architecture?.patterns?.length > 3) complexity++;

    if (complexity <= 1) return "simple";
    if (complexity <= 3) return "moderate";
    return "complex";
  }

  /**
   * Extract candidate SSGs from base recommendation
   */
  private extractCandidateSSGs(baseRecommendation: any): string[] {
    const candidates = [baseRecommendation.recommended];

    if (baseRecommendation.alternatives) {
      candidates.push(
        ...baseRecommendation.alternatives.map((alt: any) => alt.name || alt),
      );
    }

    return [...new Set(candidates)].filter(Boolean);
  }

  /**
   * Calculate combined confidence from multiple sources
   */
  private calculateCombinedConfidence(
    baseConfidence: number,
    learningConfidence: number,
    graphConfidence: number,
  ): number {
    // Weighted average with emphasis on learning and graph data when available
    const weights = {
      base: 0.4,
      learning: learningConfidence > 0 ? 0.4 : 0,
      graph: graphConfidence > 0 ? 0.2 : 0,
    };

    // Redistribute weights if some sources are unavailable
    const totalWeight = weights.base + weights.learning + weights.graph;
    const normalizedWeights = {
      base: weights.base / totalWeight,
      learning: weights.learning / totalWeight,
      graph: weights.graph / totalWeight,
    };

    return (
      baseConfidence * normalizedWeights.base +
      learningConfidence * normalizedWeights.learning +
      graphConfidence * normalizedWeights.graph
    );
  }

  /**
   * Count patterns relevant to project features
   */
  private async countRelevantPatterns(
    features: ProjectFeatures,
  ): Promise<number> {
    const tags = [features.language, features.framework, features.size].filter(
      (tag): tag is string => Boolean(tag),
    );
    const memories = await this.search({
      tags,
    });

    return memories.length;
  }

  /**
   * Find patterns from similar projects
   */
  private async findProjectPatterns(features: ProjectFeatures): Promise<
    Array<{
      type: string;
      description: string;
      confidence: number;
      frequency: number;
    }>
  > {
    const patterns: Array<{
      type: string;
      description: string;
      confidence: number;
      frequency: number;
    }> = [];

    // Find similar projects based on features
    const similarMemories = await this.search({
      tags: [features.language],
    });

    if (similarMemories.length >= 3) {
      // Pattern: Most common SSG for this language
      const ssgCounts = new Map<string, number>();
      for (const memory of similarMemories) {
        if (memory.metadata.ssg) {
          ssgCounts.set(
            memory.metadata.ssg,
            (ssgCounts.get(memory.metadata.ssg) || 0) + 1,
          );
        }
      }

      if (ssgCounts.size > 0) {
        const topSSG = Array.from(ssgCounts.entries()).sort(
          ([, a], [, b]) => b - a,
        )[0];

        patterns.push({
          type: "ssg_preference",
          description: `${topSSG[0]} is commonly used with ${features.language} (${topSSG[1]}/${similarMemories.length} projects)`,
          confidence: topSSG[1] / similarMemories.length,
          frequency: topSSG[1],
        });
      }

      // Pattern: Success rate analysis
      const deploymentMemories = similarMemories.filter(
        (m) => m.type === "deployment",
      );
      if (deploymentMemories.length >= 2) {
        const successRate =
          deploymentMemories.filter((m) => m.data.status === "success").length /
          deploymentMemories.length;

        patterns.push({
          type: "success_rate",
          description: `Similar ${features.language} projects have ${(
            successRate * 100
          ).toFixed(0)}% deployment success rate`,
          confidence: Math.min(deploymentMemories.length / 10, 1.0),
          frequency: deploymentMemories.length,
        });
      }
    }

    return patterns;
  }

  /**
   * Generate predictions based on patterns and features
   */
  private async generatePredictions(
    features: ProjectFeatures,
    patterns: Array<{ type: string; description: string; confidence: number }>,
  ): Promise<
    Array<{
      type: "success_rate" | "optimal_ssg" | "potential_issues";
      prediction: string;
      confidence: number;
    }>
  > {
    const predictions: Array<{
      type: "success_rate" | "optimal_ssg" | "potential_issues";
      prediction: string;
      confidence: number;
    }> = [];

    // Predict success rate
    const successPattern = patterns.find((p) => p.type === "success_rate");
    if (successPattern) {
      predictions.push({
        type: "success_rate",
        prediction: `Expected deployment success rate: ${
          successPattern.description.match(/(\d+)%/)?.[1] || "unknown"
        }%`,
        confidence: successPattern.confidence,
      });
    }

    // Predict optimal SSG
    const ssgPattern = patterns.find((p) => p.type === "ssg_preference");
    if (ssgPattern) {
      const ssg = ssgPattern.description.split(" ")[0];
      predictions.push({
        type: "optimal_ssg",
        prediction: `${ssg} is likely the optimal choice based on similar projects`,
        confidence: ssgPattern.confidence,
      });
    }

    // Predict potential issues
    if (!features.hasTests && features.size !== "small") {
      predictions.push({
        type: "potential_issues",
        prediction:
          "Deployment issues likely due to lack of tests in medium/large project",
        confidence: 0.7,
      });
    }

    if (!features.hasCI && features.complexity === "complex") {
      predictions.push({
        type: "potential_issues",
        prediction:
          "Complex project without CI/CD may face integration challenges",
        confidence: 0.6,
      });
    }

    return predictions;
  }

  /**
   * Generate intelligent recommendations
   */
  private async generateIntelligentRecommendations(
    features: ProjectFeatures,
    patterns: Array<{ type: string; description: string; confidence: number }>,
    predictions: Array<{
      type: string;
      prediction: string;
      confidence: number;
    }>,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recommendations based on patterns
    const ssgPattern = patterns.find((p) => p.type === "ssg_preference");
    if (ssgPattern && ssgPattern.confidence > 0.7) {
      const ssg = ssgPattern.description.split(" ")[0];
      recommendations.push(
        `Consider ${ssg} - it's proven successful for similar ${features.language} projects`,
      );
    }

    // Recommendations based on predictions
    const issuesPrediction = predictions.find(
      (p) => p.type === "potential_issues",
    );
    if (issuesPrediction && issuesPrediction.confidence > 0.6) {
      if (issuesPrediction.prediction.includes("tests")) {
        recommendations.push(
          "Set up automated testing before deployment to improve success rate",
        );
      }
      if (issuesPrediction.prediction.includes("CI/CD")) {
        recommendations.push(
          "Implement CI/CD pipeline to handle project complexity",
        );
      }
    }

    // Recommendations based on features
    if (features.complexity === "complex" && !features.hasDocs) {
      recommendations.push(
        "Invest in comprehensive documentation for this complex project",
      );
    }

    if (features.isOpenSource && features.size === "large") {
      recommendations.push(
        "Consider community-friendly documentation tools for large open-source project",
      );
    }

    return recommendations;
  }

  /**
   * Assess quality of learning data
   */
  private async assessLearningData(features: ProjectFeatures): Promise<{
    similarProjects: number;
    confidenceLevel: number;
    dataQuality: "low" | "medium" | "high";
  }> {
    const tags = [features.language, features.framework].filter(
      (tag): tag is string => Boolean(tag),
    );
    const similarMemories = await this.search({
      tags,
    });

    const similarProjects = similarMemories.length;
    let confidenceLevel = 0;

    if (similarProjects >= 10) {
      confidenceLevel = 0.9;
    } else if (similarProjects >= 5) {
      confidenceLevel = 0.7;
    } else if (similarProjects >= 2) {
      confidenceLevel = 0.5;
    } else {
      confidenceLevel = 0.2;
    }

    let dataQuality: "low" | "medium" | "high";
    if (similarProjects >= 8 && confidenceLevel >= 0.8) {
      dataQuality = "high";
    } else if (similarProjects >= 3 && confidenceLevel >= 0.5) {
      dataQuality = "medium";
    } else {
      dataQuality = "low";
    }

    return {
      similarProjects,
      confidenceLevel,
      dataQuality,
    };
  }

  /**
   * Infer outcome from memory entry
   */
  private inferOutcome(
    memory: MemoryEntry,
  ): "success" | "failure" | "neutral" | null {
    if (memory.type === "deployment") {
      if (memory.data.status === "success") return "success";
      if (memory.data.status === "failed") return "failure";
    }

    if (memory.type === "recommendation" && memory.data.feedback) {
      const rating = memory.data.feedback.rating || memory.data.feedback.score;
      if (rating > 3) return "success";
      if (rating < 3) return "failure";
    }

    return "neutral";
  }

  /**
   * Get comprehensive learning statistics
   */
  async getLearningStatistics(): Promise<{
    learning: any;
    knowledgeGraph: any;
    combined: {
      totalMemories: number;
      enhancedRecommendations: number;
      accuracyImprovement: number;
      systemMaturity: "nascent" | "developing" | "mature";
    };
  }> {
    const learningStats = await this.learningSystem.getStatistics();
    const graphStats = this.knowledgeGraph.getStatistics();

    const totalMemories = (await this.search("")).length;
    const graphStatsResult = await graphStats;
    const enhancedRecommendations =
      learningStats.totalPatterns + graphStatsResult.nodeCount;

    // Estimate accuracy improvement based on data volume
    let accuracyImprovement = 0;
    if (totalMemories >= 50) {
      accuracyImprovement = Math.min(0.3, totalMemories / 200);
    }

    // Determine system maturity
    let systemMaturity: "nascent" | "developing" | "mature";
    if (totalMemories >= 100 && learningStats.totalPatterns >= 20) {
      systemMaturity = "mature";
    } else if (totalMemories >= 20 && learningStats.totalPatterns >= 5) {
      systemMaturity = "developing";
    } else {
      systemMaturity = "nascent";
    }

    return {
      learning: learningStats,
      knowledgeGraph: graphStats,
      combined: {
        totalMemories,
        enhancedRecommendations,
        accuracyImprovement,
        systemMaturity,
      },
    };
  }

  /**
   * Close and cleanup
   */
  async close(): Promise<void> {
    await this.knowledgeGraph.saveToMemory();
    await super.close();
  }
}

export default EnhancedMemoryManager;
