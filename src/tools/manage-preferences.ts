/**
 * Manage User Preferences Tool
 * Phase 2.2: User Preference Management
 *
 * MCP tool for viewing and updating user preferences
 */

import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import { getUserPreferenceManager } from "../memory/user-preferences.js";

const inputSchema = z.object({
  action: z.enum([
    "get",
    "update",
    "reset",
    "export",
    "import",
    "recommendations",
  ]),
  userId: z.string().optional().default("default"),
  preferences: z
    .object({
      preferredSSGs: z.array(z.string()).optional(),
      documentationStyle: z
        .enum(["minimal", "comprehensive", "tutorial-heavy"])
        .optional(),
      expertiseLevel: z
        .enum(["beginner", "intermediate", "advanced"])
        .optional(),
      preferredTechnologies: z.array(z.string()).optional(),
      preferredDiataxisCategories: z
        .array(z.enum(["tutorials", "how-to", "reference", "explanation"]))
        .optional(),
      autoApplyPreferences: z.boolean().optional(),
    })
    .optional(),
  json: z.string().optional(), // For import action
});

export async function managePreferences(
  args: unknown,
): Promise<{ content: any[] }> {
  const startTime = Date.now();

  try {
    const { action, userId, preferences, json } = inputSchema.parse(args);

    const manager = await getUserPreferenceManager(userId);

    let result: any;
    let actionDescription: string;

    switch (action) {
      case "get":
        result = await manager.getPreferences();
        actionDescription = "Retrieved user preferences";
        break;

      case "update":
        if (!preferences) {
          throw new Error("Preferences object required for update action");
        }
        result = await manager.updatePreferences(preferences);
        actionDescription = "Updated user preferences";
        break;

      case "reset":
        result = await manager.resetPreferences();
        actionDescription = "Reset preferences to defaults";
        break;

      case "export": {
        const exportedJson = await manager.exportPreferences();
        result = { exported: exportedJson };
        actionDescription = "Exported preferences as JSON";
        break;
      }

      case "import": {
        if (!json) {
          throw new Error("JSON string required for import action");
        }
        result = await manager.importPreferences(json);
        actionDescription = "Imported preferences from JSON";
        break;
      }

      case "recommendations": {
        const recommendations = await manager.getSSGRecommendations();
        result = {
          recommendations,
          summary: `Found ${recommendations.length} SSG recommendation(s) based on usage history`,
        };
        actionDescription = "Retrieved SSG recommendations";
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
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
          description: `User preferences ${action} completed successfully for user: ${userId}`,
        },
      ],
    };

    // Add context-specific next steps
    if (action === "get" || action === "recommendations") {
      response.nextSteps = [
        {
          action: "Update Preferences",
          toolRequired: "manage_preferences",
          description: "Modify your preferences using the update action",
          priority: "medium",
        },
      ];
    } else if (action === "update" || action === "import") {
      response.nextSteps = [
        {
          action: "Test Recommendations",
          toolRequired: "recommend_ssg",
          description: "See how your preferences affect SSG recommendations",
          priority: "high",
        },
      ];
    }

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "PREFERENCE_MANAGEMENT_FAILED",
        message: `Failed to manage preferences: ${error}`,
        resolution:
          "Check that action and parameters are valid, and user ID exists",
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
