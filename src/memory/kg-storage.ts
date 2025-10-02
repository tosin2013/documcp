/**
 * Knowledge Graph Storage Module
 * Implements Phase 1.1: Enhanced Storage Format
 *
 * Provides persistent storage for knowledge graph entities and relationships
 * using separate JSONL files with safety mechanisms.
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { GraphNode, GraphEdge } from "./knowledge-graph.js";
import { SCHEMA_METADATA } from "./schemas.js";

// File markers for safety
const ENTITY_FILE_MARKER = `# DOCUMCP_KNOWLEDGE_GRAPH_ENTITIES v${SCHEMA_METADATA.version}`;
const RELATIONSHIP_FILE_MARKER = `# DOCUMCP_KNOWLEDGE_GRAPH_RELATIONSHIPS v${SCHEMA_METADATA.version}`;

export interface KGStorageConfig {
  storageDir: string;
  backupOnWrite?: boolean;
  validateOnRead?: boolean;
}

export interface KGStorageStats {
  entityCount: number;
  relationshipCount: number;
  lastModified: string;
  schemaVersion: string;
  fileSize: {
    entities: number;
    relationships: number;
  };
}

export class KGStorage {
  private config: Required<KGStorageConfig>;
  private entityFilePath: string;
  private relationshipFilePath: string;
  private backupDir: string;

  constructor(config: KGStorageConfig) {
    this.config = {
      backupOnWrite: true,
      validateOnRead: true,
      ...config,
    };

    this.entityFilePath = join(
      config.storageDir,
      "knowledge-graph-entities.jsonl",
    );
    this.relationshipFilePath = join(
      config.storageDir,
      "knowledge-graph-relationships.jsonl",
    );
    this.backupDir = join(config.storageDir, "backups");
  }

  /**
   * Initialize storage (create directories and files if needed)
   */
  async initialize(): Promise<void> {
    try {
      // Create storage directory
      await fs.mkdir(this.config.storageDir, { recursive: true });

      // Create backup directory
      if (this.config.backupOnWrite) {
        await fs.mkdir(this.backupDir, { recursive: true });
      }

      // Initialize entity file
      await this.initializeFile(this.entityFilePath, ENTITY_FILE_MARKER);

      // Initialize relationship file
      await this.initializeFile(
        this.relationshipFilePath,
        RELATIONSHIP_FILE_MARKER,
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize KG storage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Initialize a JSONL file with marker
   */
  private async initializeFile(
    filePath: string,
    marker: string,
  ): Promise<void> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // File exists, verify marker
      const firstLine = await this.readFirstLine(filePath);
      if (!firstLine.startsWith("# DOCUMCP_KNOWLEDGE_GRAPH")) {
        throw new Error(
          `File ${filePath} is not a DocuMCP knowledge graph file. ` +
            `Refusing to overwrite to prevent data loss.`,
        );
      }
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist, create it with marker
        await fs.writeFile(filePath, marker + "\n", "utf-8");
      } else {
        throw error;
      }
    }
  }

  /**
   * Read the first line of a file
   */
  private async readFirstLine(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, "utf-8");
    return content.split("\n")[0];
  }

  /**
   * Save entities to storage
   */
  async saveEntities(entities: GraphNode[]): Promise<void> {
    try {
      // Ensure parent directory exists
      await fs.mkdir(dirname(this.entityFilePath), { recursive: true });

      // Create backup if enabled
      if (this.config.backupOnWrite) {
        await this.backupFile(this.entityFilePath, "entities");
      }

      // Write to temporary file first (atomic write)
      const tempFile = `${this.entityFilePath}.tmp`;

      // Write marker
      await fs.writeFile(tempFile, ENTITY_FILE_MARKER + "\n", "utf-8");

      // Append entities as JSONL
      for (const entity of entities) {
        const line = JSON.stringify(entity) + "\n";
        await fs.appendFile(tempFile, line, "utf-8");
      }

      // Atomic rename
      await fs.rename(tempFile, this.entityFilePath);
    } catch (error) {
      throw new Error(
        `Failed to save entities: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Load entities from storage
   */
  async loadEntities(): Promise<GraphNode[]> {
    try {
      // Check if file exists
      await fs.access(this.entityFilePath);

      const content = await fs.readFile(this.entityFilePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      // Skip marker line
      const dataLines = lines.slice(1);

      const entities: GraphNode[] = [];
      for (const line of dataLines) {
        try {
          const entity = JSON.parse(line) as GraphNode;

          // Validate if enabled
          if (this.config.validateOnRead) {
            this.validateEntity(entity);
          }

          entities.push(entity);
        } catch (error) {
          console.error(`Failed to parse entity line: ${line}`, error);
        }
      }

      return entities;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return []; // File doesn't exist yet
      }
      throw new Error(
        `Failed to load entities: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Save relationships to storage
   */
  async saveRelationships(relationships: GraphEdge[]): Promise<void> {
    try {
      // Ensure parent directory exists
      await fs.mkdir(dirname(this.relationshipFilePath), { recursive: true });

      // Create backup if enabled
      if (this.config.backupOnWrite) {
        await this.backupFile(this.relationshipFilePath, "relationships");
      }

      // Write to temporary file first (atomic write)
      const tempFile = `${this.relationshipFilePath}.tmp`;

      // Write marker
      await fs.writeFile(tempFile, RELATIONSHIP_FILE_MARKER + "\n", "utf-8");

      // Append relationships as JSONL
      for (const relationship of relationships) {
        const line = JSON.stringify(relationship) + "\n";
        await fs.appendFile(tempFile, line, "utf-8");
      }

      // Atomic rename
      await fs.rename(tempFile, this.relationshipFilePath);
    } catch (error) {
      throw new Error(
        `Failed to save relationships: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Load relationships from storage
   */
  async loadRelationships(): Promise<GraphEdge[]> {
    try {
      // Check if file exists
      await fs.access(this.relationshipFilePath);

      const content = await fs.readFile(this.relationshipFilePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      // Skip marker line
      const dataLines = lines.slice(1);

      const relationships: GraphEdge[] = [];
      for (const line of dataLines) {
        try {
          const relationship = JSON.parse(line) as GraphEdge;

          // Validate if enabled
          if (this.config.validateOnRead) {
            this.validateRelationship(relationship);
          }

          relationships.push(relationship);
        } catch (error) {
          console.error(`Failed to parse relationship line: ${line}`, error);
        }
      }

      return relationships;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return []; // File doesn't exist yet
      }
      throw new Error(
        `Failed to load relationships: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Save complete graph (entities + relationships)
   */
  async saveGraph(
    entities: GraphNode[],
    relationships: GraphEdge[],
  ): Promise<void> {
    await Promise.all([
      this.saveEntities(entities),
      this.saveRelationships(relationships),
    ]);
  }

  /**
   * Load complete graph (entities + relationships)
   */
  async loadGraph(): Promise<{
    entities: GraphNode[];
    relationships: GraphEdge[];
  }> {
    const [entities, relationships] = await Promise.all([
      this.loadEntities(),
      this.loadRelationships(),
    ]);

    return { entities, relationships };
  }

  /**
   * Create a backup of a file
   */
  private async backupFile(
    filePath: string,
    type: "entities" | "relationships",
  ): Promise<void> {
    try {
      // Check if file exists
      await fs.access(filePath);

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFilename = `${type}-${timestamp}.jsonl`;
      const backupPath = join(this.backupDir, backupFilename);

      // Copy file
      await fs.copyFile(filePath, backupPath);

      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups(type);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        // Only warn if it's not a "file not found" error
        console.warn(`Failed to backup file ${filePath}:`, error);
      }
    }
  }

  /**
   * Clean up old backup files (keep last N)
   */
  private async cleanupOldBackups(
    type: "entities" | "relationships",
    keepCount: number = 10,
  ): Promise<void> {
    try {
      // Ensure backup directory exists before reading
      await fs.mkdir(this.backupDir, { recursive: true });

      const files = await fs.readdir(this.backupDir);

      // Filter files by type
      const typeFiles = files
        .filter((file) => file.startsWith(type))
        .map((file) => join(this.backupDir, file));

      // Sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        typeFiles.map(async (file) => {
          try {
            const stats = await fs.stat(file);
            return { file, mtime: stats.mtime.getTime() };
          } catch (error) {
            // File might have been deleted, return null
            return null;
          }
        }),
      );

      // Filter out null values and sort
      const validFiles = filesWithStats.filter((f) => f !== null) as Array<{
        file: string;
        mtime: number;
      }>;
      validFiles.sort((a, b) => b.mtime - a.mtime);

      // Delete old files
      const filesToDelete = validFiles.slice(keepCount);
      await Promise.all(
        filesToDelete.map(({ file }) => fs.unlink(file).catch(() => {})),
      );
    } catch (error) {
      // Only log if it's not a missing directory error
      if ((error as any).code !== "ENOENT") {
        console.warn(`Failed to cleanup old backups:`, error);
      }
    }
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): Promise<KGStorageStats> {
    const [entities, relationships] = await Promise.all([
      this.loadEntities(),
      this.loadRelationships(),
    ]);

    const [entitiesStats, relationshipsStats] = await Promise.all([
      fs
        .stat(this.entityFilePath)
        .catch(() => ({ size: 0, mtime: new Date() })),
      fs
        .stat(this.relationshipFilePath)
        .catch(() => ({ size: 0, mtime: new Date() })),
    ]);

    const lastModified = new Date(
      Math.max(
        entitiesStats.mtime.getTime(),
        relationshipsStats.mtime.getTime(),
      ),
    ).toISOString();

    return {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      lastModified,
      schemaVersion: SCHEMA_METADATA.version,
      fileSize: {
        entities: entitiesStats.size,
        relationships: relationshipsStats.size,
      },
    };
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(
    type: "entities" | "relationships",
    timestamp?: string,
  ): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);

      // Filter backup files by type
      const backupFiles = files.filter((file) => file.startsWith(type));

      if (backupFiles.length === 0) {
        throw new Error(`No backups found for ${type}`);
      }

      let backupFile: string;

      if (timestamp) {
        // Find backup with specific timestamp
        backupFile = backupFiles.find((file) => file.includes(timestamp)) || "";
        if (!backupFile) {
          throw new Error(`Backup with timestamp ${timestamp} not found`);
        }
      } else {
        // Use most recent backup
        const filesWithStats = await Promise.all(
          backupFiles.map(async (file) => {
            const stats = await fs.stat(join(this.backupDir, file));
            return { file, mtime: stats.mtime.getTime() };
          }),
        );

        filesWithStats.sort((a, b) => b.mtime - a.mtime);
        backupFile = filesWithStats[0].file;
      }

      const backupPath = join(this.backupDir, backupFile);
      const targetPath =
        type === "entities" ? this.entityFilePath : this.relationshipFilePath;

      // Restore backup
      await fs.copyFile(backupPath, targetPath);

      // Log restoration success (can be monitored)
      if (process.env.DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`Restored ${type} from backup: ${backupFile}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to restore from backup: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Validate entity structure
   */
  private validateEntity(entity: GraphNode): void {
    if (!entity.id || !entity.type || !entity.label) {
      throw new Error(`Invalid entity structure: missing required fields`);
    }
  }

  /**
   * Validate relationship structure
   */
  private validateRelationship(relationship: GraphEdge): void {
    if (
      !relationship.id ||
      !relationship.source ||
      !relationship.target ||
      !relationship.type
    ) {
      throw new Error(
        `Invalid relationship structure: missing required fields`,
      );
    }
  }

  /**
   * Verify integrity of stored data
   */
  async verifyIntegrity(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Load all data
      const { entities, relationships } = await this.loadGraph();

      // Check for orphaned relationships
      const entityIds = new Set(entities.map((e) => e.id));

      for (const relationship of relationships) {
        if (!entityIds.has(relationship.source)) {
          warnings.push(
            `Relationship ${relationship.id} references missing source entity: ${relationship.source}`,
          );
        }
        if (!entityIds.has(relationship.target)) {
          warnings.push(
            `Relationship ${relationship.id} references missing target entity: ${relationship.target}`,
          );
        }
      }

      // Check for duplicate entities
      const idCounts = new Map<string, number>();
      for (const entity of entities) {
        idCounts.set(entity.id, (idCounts.get(entity.id) || 0) + 1);
      }

      for (const [id, count] of idCounts) {
        if (count > 1) {
          errors.push(`Duplicate entity ID found: ${id} (${count} instances)`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Integrity check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Export graph as JSON (for inspection/debugging)
   */
  async exportAsJSON(): Promise<string> {
    const { entities, relationships } = await this.loadGraph();

    return JSON.stringify(
      {
        metadata: {
          version: SCHEMA_METADATA.version,
          exportDate: new Date().toISOString(),
          entityCount: entities.length,
          relationshipCount: relationships.length,
        },
        entities,
        relationships,
      },
      null,
      2,
    );
  }
}
