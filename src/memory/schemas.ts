/**
 * Knowledge Graph Schema Definitions
 * Implements Phase 1.1: Enhanced Knowledge Graph Schema Implementation
 *
 * Defines comprehensive Zod schemas for all entity types and relationships
 * in the DocuMCP knowledge graph.
 */

import { z } from "zod";

// ============================================================================
// Entity Schemas
// ============================================================================

/**
 * Project Entity Schema
 * Represents a software project analyzed by DocuMCP
 */
export const ProjectEntitySchema = z.object({
  name: z.string().min(1, "Project name is required"),
  path: z.string().min(1, "Project path is required"),
  technologies: z.array(z.string()).default([]),
  size: z.enum(["small", "medium", "large"]).default("medium"),
  domain: z.string().optional(),
  lastAnalyzed: z.string().datetime(),
  analysisCount: z.number().int().min(0).default(0),
  primaryLanguage: z.string().optional(),
  hasTests: z.boolean().default(false),
  hasCI: z.boolean().default(false),
  hasDocs: z.boolean().default(false),
  totalFiles: z.number().int().min(0).default(0),
  linesOfCode: z.number().int().min(0).optional(),
});

export type ProjectEntity = z.infer<typeof ProjectEntitySchema>;

/**
 * User Entity Schema
 * Represents a DocuMCP user with their preferences and behavior patterns
 */
export const UserEntitySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  expertiseLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .default("intermediate"),
  preferredTechnologies: z.array(z.string()).default([]),
  preferredSSGs: z.array(z.string()).default([]),
  documentationStyle: z
    .enum(["minimal", "comprehensive", "tutorial-heavy"])
    .default("comprehensive"),
  preferredDiataxisCategories: z
    .array(z.enum(["tutorials", "how-to", "reference", "explanation"]))
    .default([]),
  projectCount: z.number().int().min(0).default(0),
  lastActive: z.string().datetime(),
  createdAt: z.string().datetime(),
});

export type UserEntity = z.infer<typeof UserEntitySchema>;

/**
 * Configuration Entity Schema
 * Represents a deployment configuration with success metrics
 */
export const ConfigurationEntitySchema = z.object({
  ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
  settings: z.record(z.string(), z.any()).default({}),
  deploymentSuccessRate: z.number().min(0).max(1).default(1.0),
  usageCount: z.number().int().min(0).default(0),
  lastUsed: z.string().datetime(),
  buildTimeAverage: z.number().min(0).optional(), // in seconds
  failureReasons: z.array(z.string()).default([]),
  compatibleTechnologies: z.array(z.string()).default([]),
});

export type ConfigurationEntity = z.infer<typeof ConfigurationEntitySchema>;

/**
 * Documentation Entity Schema
 * Represents a documentation structure or pattern
 */
export const DocumentationEntitySchema = z.object({
  type: z.enum(["structure", "pattern", "template"]),
  framework: z.enum(["diataxis", "custom", "mixed"]).default("diataxis"),
  categories: z.array(z.string()).default([]),
  effectivenessScore: z.number().min(0).max(1).optional(),
  usageCount: z.number().int().min(0).default(0),
  lastUsed: z.string().datetime(),
  contentPatterns: z.record(z.string(), z.any()).default({}),
  suitableFor: z
    .array(z.enum(["library", "application", "tool", "framework"]))
    .default([]),
});

export type DocumentationEntity = z.infer<typeof DocumentationEntitySchema>;

/**
 * CodeFile Entity Schema
 * Represents a source code file with its structure and metadata
 */
export const CodeFileEntitySchema = z.object({
  path: z.string().min(1, "File path is required"),
  language: z.string().min(1, "Language is required"),
  functions: z.array(z.string()).default([]),
  classes: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  imports: z.array(z.string()).default([]),
  exports: z.array(z.string()).default([]),
  lastModified: z.string().datetime(),
  linesOfCode: z.number().int().min(0).default(0),
  contentHash: z.string().min(1, "Content hash is required"),
  complexity: z.enum(["low", "medium", "high"]).optional(),
});

export type CodeFileEntity = z.infer<typeof CodeFileEntitySchema>;

/**
 * DocumentationSection Entity Schema
 * Represents a specific section of documentation
 */
export const DocumentationSectionEntitySchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  sectionTitle: z.string().min(1, "Section title is required"),
  contentHash: z.string().min(1, "Content hash is required"),
  referencedCodeFiles: z.array(z.string()).default([]),
  referencedFunctions: z.array(z.string()).default([]),
  referencedClasses: z.array(z.string()).default([]),
  lastUpdated: z.string().datetime(),
  category: z
    .enum(["tutorial", "how-to", "reference", "explanation"])
    .optional(),
  effectivenessScore: z.number().min(0).max(1).optional(),
  wordCount: z.number().int().min(0).default(0),
  hasCodeExamples: z.boolean().default(false),
});

export type DocumentationSectionEntity = z.infer<
  typeof DocumentationSectionEntitySchema
>;

/**
 * Technology Entity Schema
 * Represents a technology, framework, or language
 */
export const TechnologyEntitySchema = z.object({
  name: z.string().min(1, "Technology name is required"),
  category: z.enum(["language", "framework", "library", "tool", "platform"]),
  version: z.string().optional(),
  ecosystem: z
    .enum(["javascript", "python", "ruby", "go", "rust", "java", "other"])
    .optional(),
  popularityScore: z.number().min(0).max(1).optional(),
  usageCount: z.number().int().min(0).default(0),
});

export type TechnologyEntity = z.infer<typeof TechnologyEntitySchema>;

/**
 * LinkValidation Entity Schema
 * Represents link validation results for documentation
 */
export const LinkValidationEntitySchema = z.object({
  totalLinks: z.number().int().min(0).default(0),
  validLinks: z.number().int().min(0).default(0),
  brokenLinks: z.number().int().min(0).default(0),
  warningLinks: z.number().int().min(0).default(0),
  unknownLinks: z.number().int().min(0).default(0),
  healthScore: z.number().min(0).max(100).default(100),
  lastValidated: z.string().datetime(),
  brokenLinksList: z.array(z.string()).default([]),
});

export type LinkValidationEntity = z.infer<typeof LinkValidationEntitySchema>;

/**
 * Sitemap Entity Schema
 * Represents a sitemap.xml file with generation and update tracking
 */
export const SitemapEntitySchema = z.object({
  baseUrl: z.string().url("Valid base URL required"),
  docsPath: z.string().min(1, "Documentation path is required"),
  totalUrls: z.number().int().min(0).default(0),
  lastGenerated: z.string().datetime(),
  lastUpdated: z.string().datetime().optional(),
  urlsByCategory: z.record(z.string(), z.number()).default({}),
  urlsByPriority: z
    .object({
      high: z.number().int().min(0).default(0), // priority >= 0.9
      medium: z.number().int().min(0).default(0), // priority 0.5-0.9
      low: z.number().int().min(0).default(0), // priority < 0.5
    })
    .default({ high: 0, medium: 0, low: 0 }),
  updateFrequency: z
    .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
    .default("monthly"),
  validationStatus: z
    .enum(["valid", "invalid", "not_validated"])
    .default("not_validated"),
  validationErrors: z.array(z.string()).default([]),
  sitemapPath: z.string().min(1),
  ssg: z
    .enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"])
    .optional(),
  submittedToSearchEngines: z.boolean().default(false),
  searchEngines: z.array(z.string()).default([]),
});

export type SitemapEntity = z.infer<typeof SitemapEntitySchema>;

// ============================================================================
// Relationship Schemas
// ============================================================================

/**
 * Base Relationship Schema
 * Common fields for all relationship types
 */
export const BaseRelationshipSchema = z.object({
  weight: z.number().min(0).max(1).default(1.0),
  confidence: z.number().min(0).max(1).default(1.0),
  createdAt: z.string().datetime(),
  lastUpdated: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).default({}),
});

/**
 * Project Uses Technology Relationship
 */
export const ProjectUsesTechnologySchema = BaseRelationshipSchema.extend({
  type: z.literal("project_uses_technology"),
  fileCount: z.number().int().min(0).default(0),
  percentage: z.number().min(0).max(100).optional(),
  isPrimary: z.boolean().default(false),
});

export type ProjectUsesTechnologyRelationship = z.infer<
  typeof ProjectUsesTechnologySchema
>;

/**
 * User Prefers SSG Relationship
 */
export const UserPrefersSSGSchema = BaseRelationshipSchema.extend({
  type: z.literal("user_prefers_ssg"),
  usageCount: z.number().int().min(0).default(0),
  lastUsed: z.string().datetime(),
  successRate: z.number().min(0).max(1).optional(),
});

export type UserPrefersSSGRelationship = z.infer<typeof UserPrefersSSGSchema>;

/**
 * Project Deployed With Configuration Relationship
 */
export const ProjectDeployedWithSchema = BaseRelationshipSchema.extend({
  type: z.literal("project_deployed_with"),
  success: z.boolean(),
  timestamp: z.string().datetime(),
  buildTime: z.number().min(0).optional(), // in seconds
  errorMessage: z.string().optional(),
  deploymentUrl: z.string().url().optional(),
});

export type ProjectDeployedWithRelationship = z.infer<
  typeof ProjectDeployedWithSchema
>;

/**
 * Similar To Relationship
 */
export const SimilarToSchema = BaseRelationshipSchema.extend({
  type: z.literal("similar_to"),
  similarityScore: z.number().min(0).max(1),
  sharedTechnologies: z.array(z.string()).default([]),
  sharedPatterns: z.array(z.string()).default([]),
  reason: z.string().optional(),
});

export type SimilarToRelationship = z.infer<typeof SimilarToSchema>;

/**
 * Documents Relationship (CodeFile -> DocumentationSection)
 */
export const DocumentsSchema = BaseRelationshipSchema.extend({
  type: z.literal("documents"),
  coverage: z.enum(["partial", "complete", "comprehensive"]).default("partial"),
  lastVerified: z.string().datetime(),
  quality: z.enum(["low", "medium", "high"]).optional(),
});

export type DocumentsRelationship = z.infer<typeof DocumentsSchema>;

/**
 * References Relationship (DocumentationSection -> CodeFile)
 */
export const ReferencesSchema = BaseRelationshipSchema.extend({
  type: z.literal("references"),
  referenceType: z.enum([
    "example",
    "api-reference",
    "tutorial",
    "explanation",
  ]),
  isAccurate: z.boolean().optional(),
  lastVerified: z.string().datetime().optional(),
});

export type ReferencesRelationship = z.infer<typeof ReferencesSchema>;

/**
 * Outdated For Relationship
 */
export const OutdatedForSchema = BaseRelationshipSchema.extend({
  type: z.literal("outdated_for"),
  detectedAt: z.string().datetime(),
  changeType: z.enum([
    "function_signature",
    "class_structure",
    "dependency",
    "behavior",
    "removed",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  autoFixable: z.boolean().default(false),
});

export type OutdatedForRelationship = z.infer<typeof OutdatedForSchema>;

/**
 * Depends On Relationship
 */
export const DependsOnSchema = BaseRelationshipSchema.extend({
  type: z.literal("depends_on"),
  dependencyType: z.enum(["import", "inheritance", "composition", "usage"]),
  isRequired: z.boolean().default(true),
  version: z.string().optional(),
});

export type DependsOnRelationship = z.infer<typeof DependsOnSchema>;

/**
 * Recommends Relationship
 */
export const RecommendsSchema = BaseRelationshipSchema.extend({
  type: z.literal("recommends"),
  reason: z.string(),
  basedOn: z.array(z.string()).default([]), // IDs of supporting evidence
  contextFactors: z.array(z.string()).default([]),
});

export type RecommendsRelationship = z.infer<typeof RecommendsSchema>;

/**
 * Results In Relationship
 */
export const ResultsInSchema = BaseRelationshipSchema.extend({
  type: z.literal("results_in"),
  outcomeType: z.enum(["success", "failure", "partial"]),
  metrics: z.record(z.string(), z.number()).default({}),
  notes: z.string().optional(),
});

export type ResultsInRelationship = z.infer<typeof ResultsInSchema>;

/**
 * Created By Relationship
 */
export const CreatedBySchema = BaseRelationshipSchema.extend({
  type: z.literal("created_by"),
  role: z.enum(["author", "contributor", "maintainer"]).default("author"),
  timestamp: z.string().datetime(),
});

export type CreatedByRelationship = z.infer<typeof CreatedBySchema>;

/**
 * Project Has Sitemap Relationship
 * Links a project to its sitemap with generation metrics
 */
export const ProjectHasSitemapSchema = BaseRelationshipSchema.extend({
  type: z.literal("project_has_sitemap"),
  generationCount: z.number().int().min(0).default(0),
  lastAction: z.enum(["generate", "update", "validate"]).default("generate"),
  urlsAdded: z.number().int().min(0).default(0),
  urlsRemoved: z.number().int().min(0).default(0),
  urlsUpdated: z.number().int().min(0).default(0),
  successRate: z.number().min(0).max(1).default(1.0),
});

export type ProjectHasSitemapRelationship = z.infer<
  typeof ProjectHasSitemapSchema
>;

// ============================================================================
// Union Types and Type Guards
// ============================================================================

/**
 * All Entity Types Union
 */
const ProjectEntityWithType = ProjectEntitySchema.extend({
  type: z.literal("project"),
});
const UserEntityWithType = UserEntitySchema.extend({ type: z.literal("user") });
const ConfigurationEntityWithType = ConfigurationEntitySchema.extend({
  type: z.literal("configuration"),
});
const DocumentationEntityWithType = DocumentationEntitySchema.extend({
  type: z.literal("documentation"),
});
const CodeFileEntityWithType = CodeFileEntitySchema.extend({
  type: z.literal("code_file"),
});
const DocumentationSectionEntityWithType =
  DocumentationSectionEntitySchema.extend({
    type: z.literal("documentation_section"),
  });
const TechnologyEntityWithType = TechnologyEntitySchema.extend({
  type: z.literal("technology"),
});
const LinkValidationEntityWithType = LinkValidationEntitySchema.extend({
  type: z.literal("link_validation"),
});
const SitemapEntityWithType = SitemapEntitySchema.extend({
  type: z.literal("sitemap"),
});

export const EntitySchema = z.union([
  ProjectEntityWithType,
  UserEntityWithType,
  ConfigurationEntityWithType,
  DocumentationEntityWithType,
  CodeFileEntityWithType,
  DocumentationSectionEntityWithType,
  TechnologyEntityWithType,
  LinkValidationEntityWithType,
  SitemapEntityWithType,
]);

export type Entity = z.infer<typeof EntitySchema>;

/**
 * All Relationship Types Union
 */
export const RelationshipSchema = z.union([
  ProjectUsesTechnologySchema,
  UserPrefersSSGSchema,
  ProjectDeployedWithSchema,
  SimilarToSchema,
  DocumentsSchema,
  ReferencesSchema,
  OutdatedForSchema,
  DependsOnSchema,
  RecommendsSchema,
  ResultsInSchema,
  CreatedBySchema,
  ProjectHasSitemapSchema,
]);

export type Relationship =
  | ProjectUsesTechnologyRelationship
  | UserPrefersSSGRelationship
  | ProjectDeployedWithRelationship
  | SimilarToRelationship
  | DocumentsRelationship
  | ReferencesRelationship
  | OutdatedForRelationship
  | DependsOnRelationship
  | RecommendsRelationship
  | ResultsInRelationship
  | CreatedByRelationship
  | ProjectHasSitemapRelationship;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate an entity against its schema
 */
export function validateEntity(entity: any): Entity {
  return EntitySchema.parse(entity);
}

/**
 * Validate a relationship against its schema
 */
export function validateRelationship(relationship: any): Relationship {
  return RelationshipSchema.parse(relationship);
}

/**
 * Type guard for specific entity types
 */
export function isProjectEntity(
  entity: Entity,
): entity is ProjectEntity & { type: "project" } {
  return entity.type === "project";
}

export function isUserEntity(
  entity: Entity,
): entity is UserEntity & { type: "user" } {
  return entity.type === "user";
}

export function isConfigurationEntity(
  entity: Entity,
): entity is ConfigurationEntity & { type: "configuration" } {
  return entity.type === "configuration";
}

export function isCodeFileEntity(
  entity: Entity,
): entity is CodeFileEntity & { type: "code_file" } {
  return entity.type === "code_file";
}

export function isDocumentationSectionEntity(
  entity: Entity,
): entity is DocumentationSectionEntity & { type: "documentation_section" } {
  return entity.type === "documentation_section";
}

// ============================================================================
// Schema Metadata
// ============================================================================

/**
 * Schema version for migration support
 */
export const SCHEMA_VERSION = "1.0.0";

/**
 * Schema metadata for documentation and validation
 */
export const SCHEMA_METADATA = {
  version: SCHEMA_VERSION,
  entityTypes: [
    "project",
    "user",
    "configuration",
    "documentation",
    "code_file",
    "documentation_section",
    "technology",
  ] as const,
  relationshipTypes: [
    "project_uses_technology",
    "user_prefers_ssg",
    "project_deployed_with",
    "similar_to",
    "documents",
    "references",
    "outdated_for",
    "depends_on",
    "recommends",
    "results_in",
    "created_by",
  ] as const,
  lastUpdated: "2025-10-01",
} as const;
