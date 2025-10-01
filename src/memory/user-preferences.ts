/**
 * User Preference Management Module
 * Phase 2.2: User Preference Learning and Application
 *
 * Tracks and applies user preferences across DocuMCP operations
 */

import { getKnowledgeGraph, saveKnowledgeGraph } from "./kg-integration.js";
import { GraphNode } from "./knowledge-graph.js";

export interface UserPreferences {
  userId: string;
  preferredSSGs: string[];
  documentationStyle: "minimal" | "comprehensive" | "tutorial-heavy";
  expertiseLevel: "beginner" | "intermediate" | "advanced";
  preferredTechnologies: string[];
  preferredDiataxisCategories: Array<
    "tutorials" | "how-to" | "reference" | "explanation"
  >;
  autoApplyPreferences: boolean;
  lastUpdated: string;
}

export interface SSGUsageEvent {
  ssg: string;
  success: boolean;
  timestamp: string;
  projectType?: string;
}

/**
 * User Preference Manager
 * Handles storage, retrieval, and inference of user preferences
 */
export class UserPreferenceManager {
  private userId: string;
  private preferences: UserPreferences | null = null;

  constructor(userId: string = "default") {
    this.userId = userId;
  }

  /**
   * Initialize and load user preferences from knowledge graph
   */
  async initialize(): Promise<void> {
    const kg = await getKnowledgeGraph();

    // Find existing user node
    const userNode = await kg.findNode({
      type: "user",
      properties: { userId: this.userId },
    });

    if (userNode) {
      this.preferences = {
        userId: this.userId,
        preferredSSGs: userNode.properties.preferredSSGs || [],
        documentationStyle:
          userNode.properties.documentationStyle || "comprehensive",
        expertiseLevel: userNode.properties.expertiseLevel || "intermediate",
        preferredTechnologies: userNode.properties.preferredTechnologies || [],
        preferredDiataxisCategories:
          userNode.properties.preferredDiataxisCategories || [],
        autoApplyPreferences:
          userNode.properties.autoApplyPreferences !== false,
        lastUpdated: userNode.properties.lastActive || new Date().toISOString(),
      };
    } else {
      // Create default preferences
      this.preferences = {
        userId: this.userId,
        preferredSSGs: [],
        documentationStyle: "comprehensive",
        expertiseLevel: "intermediate",
        preferredTechnologies: [],
        preferredDiataxisCategories: [],
        autoApplyPreferences: true,
        lastUpdated: new Date().toISOString(),
      };

      // Store in knowledge graph
      await this.save();
    }
  }

  /**
   * Get current user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    if (!this.preferences) {
      await this.initialize();
    }
    return this.preferences!;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    updates: Partial<Omit<UserPreferences, "userId" | "lastUpdated">>,
  ): Promise<UserPreferences> {
    if (!this.preferences) {
      await this.initialize();
    }

    this.preferences = {
      ...this.preferences!,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    await this.save();
    return this.preferences;
  }

  /**
   * Track SSG usage and infer preferences
   */
  async trackSSGUsage(event: SSGUsageEvent): Promise<void> {
    if (!this.preferences) {
      await this.initialize();
    }

    const kg = await getKnowledgeGraph();

    // Find user node
    const userNodeId = `user:${this.userId}`;
    let userNode = await kg.findNode({
      type: "user",
      properties: { userId: this.userId },
    });

    if (!userNode) {
      userNode = kg.addNode({
        id: userNodeId,
        type: "user",
        label: this.userId,
        properties: {
          userId: this.userId,
          expertiseLevel: this.preferences!.expertiseLevel,
          preferredSSGs: [],
          preferredTechnologies: [],
          documentationStyle: this.preferences!.documentationStyle,
          projectCount: 0,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        weight: 1.0,
      });
    }

    // Find or create configuration node
    const configNodeId = `configuration:${event.ssg}`;
    let configNode = await kg.findNode({
      type: "configuration",
      properties: { ssg: event.ssg },
    });

    if (!configNode) {
      configNode = kg.addNode({
        id: configNodeId,
        type: "configuration",
        label: `${event.ssg} configuration`,
        properties: {
          ssg: event.ssg,
          settings: {},
          deploymentSuccessRate: event.success ? 1.0 : 0.0,
          usageCount: 1,
          lastUsed: event.timestamp,
        },
        weight: 1.0,
      });
    }

    // Create or update preference relationship
    const existingEdges = await kg.findEdges({
      source: userNode.id,
      target: configNode.id,
      type: "user_prefers_ssg",
    });

    if (existingEdges.length > 0) {
      // Update existing preference
      const edge = existingEdges[0];
      const currentCount = edge.properties.usageCount || 1;
      const currentRate = edge.properties.successRate || 0.5;

      edge.properties.usageCount = currentCount + 1;
      edge.properties.successRate =
        (currentRate * currentCount + (event.success ? 1.0 : 0.0)) /
        (currentCount + 1);
      edge.properties.lastUsed = event.timestamp;
      edge.weight = edge.properties.successRate;
    } else {
      // Create new preference relationship
      kg.addEdge({
        source: userNode.id,
        target: configNode.id,
        type: "user_prefers_ssg",
        weight: event.success ? 1.0 : 0.5,
        confidence: 1.0,
        properties: {
          usageCount: 1,
          lastUsed: event.timestamp,
          successRate: event.success ? 1.0 : 0.0,
        },
      });
    }

    // Update user's preferred SSGs list based on success rate
    await this.inferPreferredSSGs();

    await saveKnowledgeGraph();
  }

  /**
   * Infer preferred SSGs from usage history
   */
  private async inferPreferredSSGs(): Promise<void> {
    if (!this.preferences) {
      await this.initialize();
    }

    const kg = await getKnowledgeGraph();

    // Find user node
    const userNode = await kg.findNode({
      type: "user",
      properties: { userId: this.userId },
    });

    if (!userNode) return;

    // Get all SSG preference edges
    const preferenceEdges = await kg.findEdges({
      source: userNode.id,
      type: "user_prefers_ssg",
    });

    // Calculate preference scores (usage count * success rate)
    const ssgScores = new Map<string, number>();

    for (const edge of preferenceEdges) {
      const configNode = (await kg.getAllNodes()).find(
        (n) => n.id === edge.target,
      );
      if (configNode && configNode.type === "configuration") {
        const ssg = configNode.properties.ssg;
        const usageCount = edge.properties.usageCount || 1;
        const successRate = edge.properties.successRate || 0.5;

        // Score = usage frequency * success rate
        const score = usageCount * successRate;
        ssgScores.set(ssg, score);
      }
    }

    // Sort by score and take top 3
    const topSSGs = Array.from(ssgScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ssg]) => ssg);

    // Update preferences
    this.preferences!.preferredSSGs = topSSGs;
    this.preferences!.lastUpdated = new Date().toISOString();

    // Update user node
    userNode.properties.preferredSSGs = topSSGs;
  }

  /**
   * Get SSG recommendations based on user preferences
   */
  async getSSGRecommendations(): Promise<
    Array<{ ssg: string; score: number; reason: string }>
  > {
    if (!this.preferences) {
      await this.initialize();
    }

    const kg = await getKnowledgeGraph();

    // Find user node
    const userNode = await kg.findNode({
      type: "user",
      properties: { userId: this.userId },
    });

    if (!userNode) {
      return [];
    }

    // Get all SSG preference edges
    const preferenceEdges = await kg.findEdges({
      source: userNode.id,
      type: "user_prefers_ssg",
    });

    const recommendations: Array<{
      ssg: string;
      score: number;
      reason: string;
    }> = [];

    for (const edge of preferenceEdges) {
      const configNode = (await kg.getAllNodes()).find(
        (n) => n.id === edge.target,
      );

      if (configNode && configNode.type === "configuration") {
        const ssg = configNode.properties.ssg;
        const usageCount = edge.properties.usageCount || 1;
        const successRate = edge.properties.successRate || 0.5;

        // Calculate recommendation score
        const score = usageCount * successRate;

        let reason = `Used ${usageCount} time(s)`;
        if (successRate >= 0.8) {
          reason += `, ${(successRate * 100).toFixed(0)}% success rate`;
        } else if (successRate < 0.5) {
          reason += `, only ${(successRate * 100).toFixed(0)}% success rate`;
        }

        recommendations.push({ ssg, score, reason });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Apply user preferences to a recommendation
   */
  applyPreferencesToRecommendation(
    recommendation: string,
    alternatives: string[],
  ): { recommended: string; adjustmentReason?: string } {
    if (!this.preferences || !this.preferences.autoApplyPreferences) {
      return { recommended: recommendation };
    }

    // Check if user has a strong preference
    const preferredSSGs = this.preferences.preferredSSGs;

    if (preferredSSGs.length > 0) {
      // If recommended SSG is already in preferences, keep it
      if (preferredSSGs.includes(recommendation)) {
        return {
          recommended: recommendation,
          adjustmentReason: "Matches your preferred SSG",
        };
      }

      // Check if any preferred SSG is in alternatives
      for (const preferred of preferredSSGs) {
        if (alternatives.includes(preferred)) {
          return {
            recommended: preferred,
            adjustmentReason: `Switched to ${preferred} based on your usage history`,
          };
        }
      }
    }

    return { recommended: recommendation };
  }

  /**
   * Save preferences to knowledge graph
   */
  private async save(): Promise<void> {
    if (!this.preferences) return;

    const kg = await getKnowledgeGraph();

    const userNodeId = `user:${this.userId}`;
    const existingNode = await kg.findNode({
      type: "user",
      properties: { userId: this.userId },
    });

    const userNode: GraphNode = {
      id: existingNode?.id || userNodeId,
      type: "user",
      label: this.userId,
      properties: {
        userId: this.preferences.userId,
        expertiseLevel: this.preferences.expertiseLevel,
        preferredSSGs: this.preferences.preferredSSGs,
        preferredTechnologies: this.preferences.preferredTechnologies,
        documentationStyle: this.preferences.documentationStyle,
        preferredDiataxisCategories:
          this.preferences.preferredDiataxisCategories,
        autoApplyPreferences: this.preferences.autoApplyPreferences,
        projectCount: existingNode?.properties.projectCount || 0,
        lastActive: this.preferences.lastUpdated,
        createdAt:
          existingNode?.properties.createdAt || this.preferences.lastUpdated,
      },
      weight: 1.0,
      lastUpdated: this.preferences.lastUpdated,
    };

    kg.addNode(userNode);
    await saveKnowledgeGraph();
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<UserPreferences> {
    this.preferences = {
      userId: this.userId,
      preferredSSGs: [],
      documentationStyle: "comprehensive",
      expertiseLevel: "intermediate",
      preferredTechnologies: [],
      preferredDiataxisCategories: [],
      autoApplyPreferences: true,
      lastUpdated: new Date().toISOString(),
    };

    await this.save();
    return this.preferences;
  }

  /**
   * Export preferences as JSON
   */
  async exportPreferences(): Promise<string> {
    if (!this.preferences) {
      await this.initialize();
    }
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  async importPreferences(json: string): Promise<UserPreferences> {
    const imported = JSON.parse(json) as UserPreferences;

    // Validate userId matches
    if (imported.userId !== this.userId) {
      throw new Error(
        `User ID mismatch: expected ${this.userId}, got ${imported.userId}`,
      );
    }

    this.preferences = {
      ...imported,
      lastUpdated: new Date().toISOString(),
    };

    await this.save();
    return this.preferences;
  }
}

/**
 * Get or create a user preference manager instance
 */
const userPreferenceManagers = new Map<string, UserPreferenceManager>();

export async function getUserPreferenceManager(
  userId: string = "default",
): Promise<UserPreferenceManager> {
  if (!userPreferenceManagers.has(userId)) {
    const manager = new UserPreferenceManager(userId);
    await manager.initialize();
    userPreferenceManagers.set(userId, manager);
  }
  return userPreferenceManagers.get(userId)!;
}

/**
 * Clear all cached preference managers (for testing)
 */
export function clearPreferenceManagerCache(): void {
  userPreferenceManagers.clear();
}
