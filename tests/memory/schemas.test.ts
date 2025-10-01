/**
 * Tests for Knowledge Graph Schemas
 * Phase 1: Core Knowledge Graph Integration
 */

import { describe, it, expect } from "@jest/globals";
import {
  ProjectEntitySchema,
  UserEntitySchema,
  ConfigurationEntitySchema,
  CodeFileEntitySchema,
  DocumentationSectionEntitySchema,
  TechnologyEntitySchema,
  ProjectUsesTechnologySchema,
  UserPrefersSSGSchema,
  ProjectDeployedWithSchema,
  SimilarToSchema,
  DocumentsSchema,
  ReferencesSchema,
  OutdatedForSchema,
  validateEntity,
  validateRelationship,
  isProjectEntity,
  isUserEntity,
  SCHEMA_METADATA,
} from "../../src/memory/schemas.js";

describe("Entity Schemas", () => {
  describe("ProjectEntitySchema", () => {
    it("should validate a valid project entity", () => {
      const validProject = {
        name: "test-project",
        path: "/path/to/project",
        technologies: ["typescript", "javascript"],
        size: "medium" as const,
        lastAnalyzed: new Date().toISOString(),
        analysisCount: 1,
        hasTests: true,
        hasCI: true,
        hasDocs: false,
        totalFiles: 100,
      };

      const result = ProjectEntitySchema.parse(validProject);
      expect(result).toBeDefined();
      expect(result.name).toBe("test-project");
      expect(result.technologies).toHaveLength(2);
    });

    it("should apply defaults for optional fields", () => {
      const minimalProject = {
        name: "minimal-project",
        path: "/path/to/minimal",
        lastAnalyzed: new Date().toISOString(),
      };

      const result = ProjectEntitySchema.parse(minimalProject);
      expect(result.technologies).toEqual([]);
      expect(result.size).toBe("medium");
      expect(result.analysisCount).toBe(0);
      expect(result.hasTests).toBe(false);
    });

    it("should reject invalid size values", () => {
      const invalidProject = {
        name: "test-project",
        path: "/path/to/project",
        size: "huge", // Invalid
        lastAnalyzed: new Date().toISOString(),
      };

      expect(() => ProjectEntitySchema.parse(invalidProject)).toThrow();
    });

    it("should require name and path", () => {
      const missingName = {
        path: "/path/to/project",
        lastAnalyzed: new Date().toISOString(),
      };

      expect(() => ProjectEntitySchema.parse(missingName)).toThrow();
    });
  });

  describe("UserEntitySchema", () => {
    it("should validate a valid user entity", () => {
      const validUser = {
        userId: "user123",
        expertiseLevel: "intermediate" as const,
        preferredTechnologies: ["react", "typescript"],
        preferredSSGs: ["docusaurus"],
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const result = UserEntitySchema.parse(validUser);
      expect(result.userId).toBe("user123");
      expect(result.expertiseLevel).toBe("intermediate");
    });

    it("should apply defaults", () => {
      const minimalUser = {
        userId: "user456",
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const result = UserEntitySchema.parse(minimalUser);
      expect(result.expertiseLevel).toBe("intermediate");
      expect(result.preferredTechnologies).toEqual([]);
      expect(result.documentationStyle).toBe("comprehensive");
    });
  });

  describe("ConfigurationEntitySchema", () => {
    it("should validate a valid configuration entity", () => {
      const validConfig = {
        ssg: "docusaurus" as const,
        settings: { theme: "classic" },
        deploymentSuccessRate: 0.95,
        usageCount: 10,
        lastUsed: new Date().toISOString(),
      };

      const result = ConfigurationEntitySchema.parse(validConfig);
      expect(result.ssg).toBe("docusaurus");
      expect(result.deploymentSuccessRate).toBe(0.95);
    });

    it("should reject invalid SSG values", () => {
      const invalidConfig = {
        ssg: "gatsby", // Not in enum
        lastUsed: new Date().toISOString(),
      };

      expect(() => ConfigurationEntitySchema.parse(invalidConfig)).toThrow();
    });

    it("should validate success rate bounds", () => {
      const invalidRate = {
        ssg: "jekyll" as const,
        deploymentSuccessRate: 1.5, // > 1.0
        lastUsed: new Date().toISOString(),
      };

      expect(() => ConfigurationEntitySchema.parse(invalidRate)).toThrow();
    });
  });

  describe("CodeFileEntitySchema", () => {
    it("should validate a valid code file entity", () => {
      const validCodeFile = {
        path: "/src/index.ts",
        language: "typescript",
        functions: ["main", "helper"],
        classes: ["App"],
        dependencies: ["express", "zod"],
        lastModified: new Date().toISOString(),
        contentHash: "abc123",
        linesOfCode: 150,
      };

      const result = CodeFileEntitySchema.parse(validCodeFile);
      expect(result.language).toBe("typescript");
      expect(result.functions).toHaveLength(2);
    });
  });

  describe("DocumentationSectionEntitySchema", () => {
    it("should validate a valid documentation section", () => {
      const validSection = {
        filePath: "/docs/api.md",
        sectionTitle: "API Reference",
        contentHash: "def456",
        referencedCodeFiles: ["/src/api.ts"],
        lastUpdated: new Date().toISOString(),
        category: "reference" as const,
      };

      const result = DocumentationSectionEntitySchema.parse(validSection);
      expect(result.category).toBe("reference");
      expect(result.referencedCodeFiles).toHaveLength(1);
    });
  });
});

describe("Relationship Schemas", () => {
  describe("ProjectUsesTechnologySchema", () => {
    it("should validate a valid project-technology relationship", () => {
      const validRelationship = {
        type: "project_uses_technology" as const,
        weight: 0.8,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        fileCount: 50,
        percentage: 80,
        isPrimary: true,
        metadata: {},
      };

      const result = ProjectUsesTechnologySchema.parse(validRelationship);
      expect(result.type).toBe("project_uses_technology");
      expect(result.isPrimary).toBe(true);
    });
  });

  describe("ProjectDeployedWithSchema", () => {
    it("should validate a successful deployment relationship", () => {
      const validDeployment = {
        type: "project_deployed_with" as const,
        weight: 1.0,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        success: true,
        timestamp: new Date().toISOString(),
        buildTime: 45,
        deploymentUrl: "https://example.com",
        metadata: {},
      };

      const result = ProjectDeployedWithSchema.parse(validDeployment);
      expect(result.success).toBe(true);
      expect(result.buildTime).toBe(45);
    });

    it("should validate a failed deployment relationship", () => {
      const failedDeployment = {
        type: "project_deployed_with" as const,
        weight: 0.5,
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        success: false,
        timestamp: new Date().toISOString(),
        errorMessage: "Build failed",
        metadata: {},
      };

      const result = ProjectDeployedWithSchema.parse(failedDeployment);
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe("Build failed");
    });
  });

  describe("OutdatedForSchema", () => {
    it("should validate an outdated documentation relationship", () => {
      const validOutdated = {
        type: "outdated_for" as const,
        weight: 1.0,
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        detectedAt: new Date().toISOString(),
        changeType: "function_signature" as const,
        severity: "high" as const,
        autoFixable: false,
        metadata: {},
      };

      const result = OutdatedForSchema.parse(validOutdated);
      expect(result.changeType).toBe("function_signature");
      expect(result.severity).toBe("high");
    });
  });
});

describe("Validation Functions", () => {
  describe("validateEntity", () => {
    it("should validate a complete entity", () => {
      const entity = {
        type: "project",
        name: "test-project",
        path: "/test",
        lastAnalyzed: new Date().toISOString(),
      };

      const result = validateEntity(entity);
      expect(result).toBeDefined();
      expect(result.type).toBe("project");
    });

    it("should throw on invalid entity", () => {
      const invalidEntity = {
        type: "invalid_type",
        name: "test",
      };

      expect(() => validateEntity(invalidEntity)).toThrow();
    });
  });

  describe("validateRelationship", () => {
    it("should validate a complete relationship", () => {
      const relationship = {
        type: "similar_to",
        weight: 0.85,
        confidence: 0.9,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        similarityScore: 0.85,
        sharedTechnologies: ["typescript"],
        metadata: {},
      };

      const result = validateRelationship(relationship);
      expect(result).toBeDefined();
    });
  });
});

describe("Type Guards", () => {
  describe("isProjectEntity", () => {
    it("should return true for project entities", () => {
      const entity = {
        type: "project" as const,
        name: "test",
        path: "/test",
        technologies: ["typescript"],
        size: "medium" as const,
        lastAnalyzed: new Date().toISOString(),
        analysisCount: 1,
        hasTests: false,
        hasCI: false,
        hasDocs: false,
        totalFiles: 10,
      };

      expect(isProjectEntity(entity)).toBe(true);
    });

    it("should return false for non-project entities", () => {
      const entity = {
        type: "user" as const,
        userId: "user123",
        expertiseLevel: "intermediate" as const,
        preferredTechnologies: [],
        preferredSSGs: [],
        documentationStyle: "comprehensive" as const,
        preferredDiataxisCategories: [],
        projectCount: 0,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(isProjectEntity(entity as any)).toBe(false);
    });
  });

  describe("isUserEntity", () => {
    it("should return true for user entities", () => {
      const entity = {
        type: "user" as const,
        userId: "user123",
        expertiseLevel: "intermediate" as const,
        preferredTechnologies: [],
        preferredSSGs: [],
        documentationStyle: "comprehensive" as const,
        preferredDiataxisCategories: [],
        projectCount: 0,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      expect(isUserEntity(entity)).toBe(true);
    });
  });
});

describe("Schema Metadata", () => {
  it("should have correct version", () => {
    expect(SCHEMA_METADATA.version).toBe("1.0.0");
  });

  it("should list all entity types", () => {
    expect(SCHEMA_METADATA.entityTypes).toContain("project");
    expect(SCHEMA_METADATA.entityTypes).toContain("user");
    expect(SCHEMA_METADATA.entityTypes).toContain("configuration");
    expect(SCHEMA_METADATA.entityTypes).toContain("code_file");
    expect(SCHEMA_METADATA.entityTypes).toHaveLength(7);
  });

  it("should list all relationship types", () => {
    expect(SCHEMA_METADATA.relationshipTypes).toContain(
      "project_uses_technology",
    );
    expect(SCHEMA_METADATA.relationshipTypes).toContain("outdated_for");
    expect(SCHEMA_METADATA.relationshipTypes).toHaveLength(11);
  });
});
