/**
 * Incremental Learning System for DocuMCP
 * Implements Issue #47: Incremental Learning System
 *
 * Enables continuous improvement of recommendations based on historical patterns,
 * success rates, and user feedback to optimize SSG suggestions and documentation strategies.
 */

import { MemoryManager } from './manager.js';
import { MemoryEntry } from './storage.js';

export interface LearningPattern {
  id: string;
  type: 'ssg_preference' | 'deployment_success' | 'project_similarity' | 'user_behavior';
  pattern: Record<string, any>;
  confidence: number;
  sampleSize: number;
  lastUpdated: string;
  metadata: {
    projectTypes?: string[];
    technologies?: string[];
    successRate?: number;
    frequency?: number;
  };
}

export interface LearningInsight {
  type: 'recommendation' | 'warning' | 'optimization';
  message: string;
  confidence: number;
  actionable: boolean;
  data: Record<string, any>;
}

export interface ProjectFeatures {
  language: string;
  framework?: string;
  size: 'small' | 'medium' | 'large';
  complexity: 'simple' | 'moderate' | 'complex';
  hasTests: boolean;
  hasCI: boolean;
  hasDocs: boolean;
  teamSize?: number;
  isOpenSource: boolean;
}

export class IncrementalLearningSystem {
  private memoryManager: MemoryManager;
  private patterns: Map<string, LearningPattern>;
  private learningEnabled: boolean = true;
  private readonly minSampleSize = 3;
  private readonly confidenceThreshold = 0.7;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    this.patterns = new Map();
  }

  async initialize(): Promise<void> {
    await this.loadPatterns();
    await this.updatePatterns();
  }

  /**
   * Learn from a new interaction result
   */
  async learn(
    interaction: MemoryEntry,
    outcome: 'success' | 'failure' | 'neutral',
    feedback?: Record<string, any>
  ): Promise<void> {
    if (!this.learningEnabled) return;

    const features = this.extractFeatures(interaction);

    // Update SSG preference patterns
    if (interaction.type === 'recommendation' && interaction.metadata.ssg) {
      await this.updateSSGPattern(features, interaction.metadata.ssg, outcome);
    }

    // Update deployment success patterns
    if (interaction.type === 'deployment') {
      await this.updateDeploymentPattern(features, outcome);
    }

    // Update project similarity patterns
    if (interaction.type === 'analysis') {
      await this.updateSimilarityPattern(features, interaction);
    }

    // Learn from user feedback
    if (feedback) {
      await this.updateUserBehaviorPattern(features, feedback);
    }

    await this.persistPatterns();
  }

  /**
   * Get improved recommendations based on learned patterns
   */
  async getImprovedRecommendation(
    projectFeatures: ProjectFeatures,
    baseRecommendation: any
  ): Promise<{
    recommendation: any;
    confidence: number;
    insights: LearningInsight[];
  }> {
    const insights: LearningInsight[] = [];
    const adjustedRecommendation = { ...baseRecommendation };
    let confidenceBoost = 0;

    // Apply SSG preference patterns
    const ssgPattern = await this.getSSGPreferencePattern(projectFeatures);
    if (ssgPattern && ssgPattern.confidence > this.confidenceThreshold) {
      const preferredSSG = ssgPattern.pattern.preferredSSG;
      if (preferredSSG !== baseRecommendation.recommended) {
        insights.push({
          type: 'recommendation',
          message: `Based on ${ssgPattern.sampleSize} similar projects, ${preferredSSG} has a ${(ssgPattern.pattern.successRate * 100).toFixed(0)}% success rate`,
          confidence: ssgPattern.confidence,
          actionable: true,
          data: { suggestedSSG: preferredSSG, pattern: ssgPattern }
        });

        adjustedRecommendation.recommended = preferredSSG;
        adjustedRecommendation.learningAdjusted = true;
        confidenceBoost += 0.2;
      }
    }

    // Apply deployment success patterns
    const deploymentPattern = await this.getDeploymentPattern(projectFeatures);
    if (deploymentPattern && deploymentPattern.confidence > this.confidenceThreshold) {
      const riskFactors = deploymentPattern.pattern.riskFactors || [];
      if (riskFactors.length > 0) {
        insights.push({
          type: 'warning',
          message: `Projects with similar characteristics have ${riskFactors.length} common deployment issues`,
          confidence: deploymentPattern.confidence,
          actionable: true,
          data: { riskFactors, pattern: deploymentPattern }
        });

        adjustedRecommendation.deploymentWarnings = riskFactors;
      }
    }

    // Apply optimization patterns
    const optimizations = await this.getOptimizationInsights(projectFeatures);
    insights.push(...optimizations);

    const finalConfidence = Math.min(
      baseRecommendation.confidence + confidenceBoost,
      1.0
    );

    return {
      recommendation: adjustedRecommendation,
      confidence: finalConfidence,
      insights
    };
  }

  /**
   * Extract features from project data for pattern matching
   */
  private extractFeatures(interaction: MemoryEntry): ProjectFeatures {
    const data = interaction.data;

    return {
      language: data.language?.primary || 'unknown',
      framework: data.framework?.name,
      size: this.categorizeSize(data.stats?.files || 0),
      complexity: this.categorizeComplexity(data),
      hasTests: Boolean(data.testing?.hasTests),
      hasCI: Boolean(data.ci?.hasCI),
      hasDocs: Boolean(data.documentation?.exists),
      isOpenSource: Boolean(data.repository?.isPublic)
    };
  }

  private categorizeSize(fileCount: number): 'small' | 'medium' | 'large' {
    if (fileCount < 50) return 'small';
    if (fileCount < 200) return 'medium';
    return 'large';
  }

  private categorizeComplexity(data: any): 'simple' | 'moderate' | 'complex' {
    let complexity = 0;

    if (data.dependencies?.count > 20) complexity++;
    if (data.framework?.name) complexity++;
    if (data.testing?.frameworks?.length > 1) complexity++;
    if (data.ci?.workflows?.length > 2) complexity++;
    if (data.architecture?.patterns?.length > 3) complexity++;

    if (complexity <= 1) return 'simple';
    if (complexity <= 3) return 'moderate';
    return 'complex';
  }

  /**
   * Update SSG preference patterns based on outcomes
   */
  private async updateSSGPattern(
    features: ProjectFeatures,
    ssg: string,
    outcome: 'success' | 'failure' | 'neutral'
  ): Promise<void> {
    const patternKey = this.generatePatternKey('ssg_preference', features);
    const existing = this.patterns.get(patternKey);

    if (existing) {
      // Update existing pattern
      const totalCount = existing.sampleSize;
      const successCount = existing.pattern.successCount || 0;
      const newSuccessCount = outcome === 'success' ? successCount + 1 : successCount;

      existing.pattern.preferredSSG = ssg;
      existing.pattern.successCount = newSuccessCount;
      existing.pattern.successRate = newSuccessCount / (totalCount + 1);
      existing.sampleSize = totalCount + 1;
      existing.confidence = Math.min(existing.sampleSize / 10, 1.0);
      existing.lastUpdated = new Date().toISOString();
    } else {
      // Create new pattern
      const pattern: LearningPattern = {
        id: patternKey,
        type: 'ssg_preference',
        pattern: {
          preferredSSG: ssg,
          successCount: outcome === 'success' ? 1 : 0,
          successRate: outcome === 'success' ? 1.0 : 0.0
        },
        confidence: 0.1,
        sampleSize: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {
          projectTypes: [features.language],
          technologies: features.framework ? [features.framework] : []
        }
      };

      this.patterns.set(patternKey, pattern);
    }
  }

  /**
   * Update deployment success patterns
   */
  private async updateDeploymentPattern(
    features: ProjectFeatures,
    outcome: 'success' | 'failure' | 'neutral'
  ): Promise<void> {
    const patternKey = this.generatePatternKey('deployment_success', features);
    const existing = this.patterns.get(patternKey);

    const riskFactors: string[] = [];
    if (!features.hasTests) riskFactors.push('no_tests');
    if (!features.hasCI) riskFactors.push('no_ci');
    if (features.complexity === 'complex') riskFactors.push('high_complexity');
    if (features.size === 'large') riskFactors.push('large_codebase');

    if (existing) {
      const totalCount = existing.sampleSize;
      const successCount = existing.pattern.successCount || 0;
      const newSuccessCount = outcome === 'success' ? successCount + 1 : successCount;

      existing.pattern.successCount = newSuccessCount;
      existing.pattern.successRate = newSuccessCount / (totalCount + 1);
      existing.pattern.riskFactors = riskFactors;
      existing.sampleSize = totalCount + 1;
      existing.confidence = Math.min(existing.sampleSize / 10, 1.0);
      existing.lastUpdated = new Date().toISOString();
    } else {
      const pattern: LearningPattern = {
        id: patternKey,
        type: 'deployment_success',
        pattern: {
          successCount: outcome === 'success' ? 1 : 0,
          successRate: outcome === 'success' ? 1.0 : 0.0,
          riskFactors
        },
        confidence: 0.1,
        sampleSize: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {
          projectTypes: [features.language],
          successRate: outcome === 'success' ? 1.0 : 0.0
        }
      };

      this.patterns.set(patternKey, pattern);
    }
  }

  /**
   * Update project similarity patterns for better matching
   */
  private async updateSimilarityPattern(
    features: ProjectFeatures,
    _interaction: MemoryEntry
  ): Promise<void> {
    const patternKey = this.generatePatternKey('project_similarity', features);
    const existing = this.patterns.get(patternKey);

    const characteristics = {
      language: features.language,
      framework: features.framework,
      size: features.size,
      complexity: features.complexity
    };

    if (existing) {
      existing.pattern.characteristics = characteristics;
      existing.sampleSize += 1;
      existing.confidence = Math.min(existing.sampleSize / 15, 1.0);
      existing.lastUpdated = new Date().toISOString();
    } else {
      const pattern: LearningPattern = {
        id: patternKey,
        type: 'project_similarity',
        pattern: {
          characteristics,
          commonPatterns: []
        },
        confidence: 0.1,
        sampleSize: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {
          projectTypes: [features.language]
        }
      };

      this.patterns.set(patternKey, pattern);
    }
  }

  /**
   * Update user behavior patterns from feedback
   */
  private async updateUserBehaviorPattern(
    features: ProjectFeatures,
    feedback: Record<string, any>
  ): Promise<void> {
    const patternKey = this.generatePatternKey('user_behavior', features);
    const existing = this.patterns.get(patternKey);

    if (existing) {
      existing.pattern.feedback = { ...existing.pattern.feedback, ...feedback };
      existing.sampleSize += 1;
      existing.confidence = Math.min(existing.sampleSize / 5, 1.0);
      existing.lastUpdated = new Date().toISOString();
    } else {
      const pattern: LearningPattern = {
        id: patternKey,
        type: 'user_behavior',
        pattern: {
          feedback,
          preferences: {}
        },
        confidence: 0.2,
        sampleSize: 1,
        lastUpdated: new Date().toISOString(),
        metadata: {}
      };

      this.patterns.set(patternKey, pattern);
    }
  }

  /**
   * Generate a consistent pattern key for grouping similar projects
   */
  private generatePatternKey(type: string, features: ProjectFeatures): string {
    const keyParts = [
      type,
      features.language,
      features.framework || 'none',
      features.size,
      features.complexity
    ];
    return keyParts.join('_').toLowerCase();
  }

  /**
   * Get SSG preference pattern for similar projects
   */
  private async getSSGPreferencePattern(features: ProjectFeatures): Promise<LearningPattern | null> {
    const patternKey = this.generatePatternKey('ssg_preference', features);
    const pattern = this.patterns.get(patternKey);

    if (pattern && pattern.sampleSize >= this.minSampleSize) {
      return pattern;
    }

    // Try broader matching if exact match not found
    const broaderKey = `ssg_preference_${features.language}_${features.size}`;
    return this.patterns.get(broaderKey) || null;
  }

  /**
   * Get deployment success pattern for risk assessment
   */
  private async getDeploymentPattern(features: ProjectFeatures): Promise<LearningPattern | null> {
    const patternKey = this.generatePatternKey('deployment_success', features);
    const pattern = this.patterns.get(patternKey);

    if (pattern && pattern.sampleSize >= this.minSampleSize) {
      return pattern;
    }

    return null;
  }

  /**
   * Generate optimization insights based on learned patterns
   */
  private async getOptimizationInsights(features: ProjectFeatures): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Check for common optimization opportunities
    if (!features.hasTests) {
      insights.push({
        type: 'optimization',
        message: 'Adding tests could improve deployment success rate by 25%',
        confidence: 0.8,
        actionable: true,
        data: { optimization: 'add_tests', impact: 'deployment_success' }
      });
    }

    if (!features.hasCI && features.size !== 'small') {
      insights.push({
        type: 'optimization',
        message: 'CI/CD setup recommended for projects of this size',
        confidence: 0.7,
        actionable: true,
        data: { optimization: 'add_ci', impact: 'development_velocity' }
      });
    }

    if (features.complexity === 'complex' && !features.hasDocs) {
      insights.push({
        type: 'optimization',
        message: 'Complex projects benefit significantly from comprehensive documentation',
        confidence: 0.9,
        actionable: true,
        data: { optimization: 'improve_docs', impact: 'maintainability' }
      });
    }

    return insights;
  }

  /**
   * Load patterns from persistent storage
   */
  private async loadPatterns(): Promise<void> {
    try {
      const patternMemories = await this.memoryManager.search('learning_pattern');

      for (const memory of patternMemories) {
        if (memory.data.pattern) {
          this.patterns.set(memory.data.pattern.id, memory.data.pattern);
        }
      }
    } catch (error) {
      console.error('Failed to load learning patterns:', error);
    }
  }

  /**
   * Update patterns based on recent memory data
   */
  private async updatePatterns(): Promise<void> {
    // Analyze recent memories to update patterns
    const recentMemories = await this.memoryManager.search('', {
      sortBy: 'timestamp'
    });

    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    for (const memory of recentMemories) {
      if (new Date(memory.timestamp) > cutoffDate) {
        // Infer outcome based on memory data
        const outcome = this.inferOutcome(memory);
        if (outcome) {
          await this.learn(memory, outcome);
        }
      }
    }
  }

  /**
   * Infer outcome from memory entry data
   */
  private inferOutcome(memory: MemoryEntry): 'success' | 'failure' | 'neutral' | null {
    if (memory.type === 'deployment') {
      if (memory.data.status === 'success') return 'success';
      if (memory.data.status === 'failed') return 'failure';
    }

    if (memory.type === 'recommendation' && memory.data.feedback) {
      if (memory.data.feedback.rating > 3) return 'success';
      if (memory.data.feedback.rating < 3) return 'failure';
    }

    return 'neutral';
  }

  /**
   * Persist learned patterns to memory
   */
  private async persistPatterns(): Promise<void> {
    for (const [, pattern] of this.patterns) {
      if (pattern.sampleSize >= this.minSampleSize) {
        await this.memoryManager.remember('interaction', {
          pattern,
          type: 'learning_pattern'
        }, {
          tags: ['learning', 'pattern', pattern.type]
        });
      }
    }
  }

  /**
   * Get all learned patterns
   */
  async getPatterns(): Promise<LearningPattern[]> {
    return Array.from(this.patterns.values());
  }

  /**
   * Get learning statistics and insights
   */
  async getStatistics(): Promise<{
    totalPatterns: number;
    patternsByType: Record<string, number>;
    averageConfidence: number;
    learningVelocity: number;
    insights: string[];
  }> {
    const stats = {
      totalPatterns: this.patterns.size,
      patternsByType: {} as Record<string, number>,
      averageConfidence: 0,
      learningVelocity: 0,
      insights: [] as string[]
    };

    let totalConfidence = 0;
    for (const pattern of this.patterns.values()) {
      stats.patternsByType[pattern.type] = (stats.patternsByType[pattern.type] || 0) + 1;
      totalConfidence += pattern.confidence;
    }

    stats.averageConfidence = stats.totalPatterns > 0 ? totalConfidence / stats.totalPatterns : 0;

    // Calculate learning velocity (patterns learned in last week)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    stats.learningVelocity = Array.from(this.patterns.values())
      .filter(p => new Date(p.lastUpdated) > weekAgo).length;

    // Generate insights
    if (stats.totalPatterns > 10) {
      stats.insights.push(`System has learned ${stats.totalPatterns} patterns with ${(stats.averageConfidence * 100).toFixed(0)}% average confidence`);
    }

    if (stats.learningVelocity > 0) {
      stats.insights.push(`Learning velocity: ${stats.learningVelocity} new patterns this week`);
    }

    const topPatternType = Object.entries(stats.patternsByType)
      .sort(([,a], [,b]) => b - a)[0];

    if (topPatternType) {
      stats.insights.push(`Most common pattern type: ${topPatternType[0]} (${topPatternType[1]} patterns)`);
    }

    return stats;
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }

  /**
   * Clear all learned patterns (useful for testing or reset)
   */
  async clearPatterns(): Promise<void> {
    this.patterns.clear();
  }
}

export default IncrementalLearningSystem;