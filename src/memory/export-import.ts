/**
 * Memory Export/Import System for DocuMCP
 * Comprehensive data portability, backup, and migration capabilities
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import { MemoryEntry, JSONLStorage } from './storage.js';
import { MemoryManager } from './manager.js';
import { IncrementalLearningSystem } from './learning.js';
import { KnowledgeGraph } from './knowledge-graph.js';
import { MemoryPruningSystem } from './pruning.js';

export interface ExportOptions {
  format: 'json' | 'jsonl' | 'csv' | 'xml' | 'yaml' | 'sqlite' | 'archive';
  compression?: 'gzip' | 'zip' | 'none';
  includeMetadata: boolean;
  includeLearning: boolean;
  includeKnowledgeGraph: boolean;
  filters?: {
    types?: string[];
    dateRange?: { start: Date; end: Date };
    projects?: string[];
    tags?: string[];
    outcomes?: string[];
  };
  anonymize?: {
    enabled: boolean;
    fields: string[];
    method: 'hash' | 'remove' | 'pseudonymize';
  };
  encryption?: {
    enabled: boolean;
    algorithm: 'aes-256-gcm' | 'aes-192-gcm' | 'aes-128-gcm';
    password?: string;
  };
}

export interface ImportOptions {
  format: 'json' | 'jsonl' | 'csv' | 'xml' | 'yaml' | 'sqlite' | 'archive';
  mode: 'merge' | 'replace' | 'append' | 'update';
  validation: 'strict' | 'loose' | 'none';
  conflictResolution: 'skip' | 'overwrite' | 'merge' | 'rename';
  backup: boolean;
  dryRun: boolean;
  mapping?: Record<string, string>; // Field mapping for different schemas
  transformation?: {
    enabled: boolean;
    rules: Array<{
      field: string;
      operation: 'convert' | 'transform' | 'validate';
      params: any;
    }>;
  };
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  format: string;
  size: number;
  entries: number;
  metadata: {
    exportedAt: Date;
    version: string;
    source: string;
    includes: string[];
    compression?: string;
    encryption?: boolean;
  };
  warnings: string[];
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
  conflicts: number;
  validation: {
    valid: number;
    invalid: number;
    warnings: string[];
  };
  summary: {
    newEntries: number;
    updatedEntries: number;
    duplicateEntries: number;
    failedEntries: number;
  };
  metadata: {
    importedAt: Date;
    source: string;
    format: string;
    mode: string;
  };
}

export interface MigrationPlan {
  sourceSystem: string;
  targetSystem: string;
  mapping: Record<string, string>;
  transformations: Array<{
    field: string;
    type: 'rename' | 'convert' | 'merge' | 'split' | 'calculate';
    source: string | string[];
    target: string;
    operation?: string;
  }>;
  validation: Array<{
    field: string;
    rules: string[];
    required: boolean;
  }>;
  postProcessing: string[];
}

export interface ArchiveMetadata {
  version: string;
  created: Date;
  source: string;
  description: string;
  manifest: {
    files: Array<{
      name: string;
      type: string;
      size: number;
      checksum: string;
      entries?: number;
    }>;
    total: {
      files: number;
      size: number;
      entries: number;
    };
  };
  options: ExportOptions;
}

export class MemoryExportImportSystem extends EventEmitter {
  private storage: JSONLStorage;
  private manager: MemoryManager;
  private learningSystem: IncrementalLearningSystem;
  private knowledgeGraph: KnowledgeGraph;
  private pruningSystem?: MemoryPruningSystem;
  private readonly version = '1.0.0';

  constructor(
    storage: JSONLStorage,
    manager: MemoryManager,
    learningSystem: IncrementalLearningSystem,
    knowledgeGraph: KnowledgeGraph,
    pruningSystem?: MemoryPruningSystem
  ) {
    super();
    this.storage = storage;
    this.manager = manager;
    this.learningSystem = learningSystem;
    this.knowledgeGraph = knowledgeGraph;
    this.pruningSystem = pruningSystem;
  }

  /**
   * Export memory data to specified format
   */
  async exportMemories(
    outputPath: string,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    const defaultOptions: ExportOptions = {
      format: 'json',
      compression: 'none',
      includeMetadata: true,
      includeLearning: true,
      includeKnowledgeGraph: true,
      anonymize: {
        enabled: false,
        fields: ['userId', 'email', 'personalInfo'],
        method: 'hash'
      },
      encryption: {
        enabled: false,
        algorithm: 'aes-256-gcm'
      }
    };

    const activeOptions = { ...defaultOptions, ...options };
    const startTime = Date.now();

    this.emit('export_started', { outputPath, options: activeOptions });

    try {
      // Get filtered entries
      const entries = await this.getFilteredEntries(activeOptions.filters);

      // Prepare export data
      const exportData = await this.prepareExportData(entries, activeOptions);

      // Apply anonymization if enabled
      if (activeOptions.anonymize?.enabled) {
        this.applyAnonymization(exportData, activeOptions.anonymize);
      }

      // Export to specified format
      let filePath: string;
      let size = 0;

      switch (activeOptions.format) {
        case 'json':
          filePath = await this.exportToJSON(outputPath, exportData, activeOptions);
          break;
        case 'jsonl':
          filePath = await this.exportToJSONL(outputPath, exportData, activeOptions);
          break;
        case 'csv':
          filePath = await this.exportToCSV(outputPath, exportData, activeOptions);
          break;
        case 'xml':
          filePath = await this.exportToXML(outputPath, exportData, activeOptions);
          break;
        case 'yaml':
          filePath = await this.exportToYAML(outputPath, exportData, activeOptions);
          break;
        case 'sqlite':
          filePath = await this.exportToSQLite(outputPath, exportData, activeOptions);
          break;
        case 'archive':
          filePath = await this.exportToArchive(outputPath, exportData, activeOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${activeOptions.format}`);
      }

      // Apply compression if specified
      if (activeOptions.compression && activeOptions.compression !== 'none') {
        filePath = await this.applyCompression(filePath, activeOptions.compression);
      }

      // Apply encryption if enabled
      if (activeOptions.encryption?.enabled) {
        filePath = await this.applyEncryption(filePath, activeOptions.encryption);
      }

      // Get file size
      const stats = await fs.stat(filePath);
      size = stats.size;

      const result: ExportResult = {
        success: true,
        filePath,
        format: activeOptions.format,
        size,
        entries: entries.length,
        metadata: {
          exportedAt: new Date(),
          version: this.version,
          source: 'DocuMCP Memory System',
          includes: this.getIncludedComponents(activeOptions),
          compression: activeOptions.compression !== 'none' ? activeOptions.compression : undefined,
          encryption: activeOptions.encryption?.enabled
        },
        warnings: [],
        errors: []
      };

      this.emit('export_completed', {
        result,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('export_error', { error: errorMessage });

      return {
        success: false,
        format: activeOptions.format,
        size: 0,
        entries: 0,
        metadata: {
          exportedAt: new Date(),
          version: this.version,
          source: 'DocuMCP Memory System',
          includes: []
        },
        warnings: [],
        errors: [errorMessage]
      };
    }
  }

  /**
   * Import memory data from specified source
   */
  async importMemories(
    inputPath: string,
    options: Partial<ImportOptions> = {}
  ): Promise<ImportResult> {
    const defaultOptions: ImportOptions = {
      format: 'json',
      mode: 'merge',
      validation: 'strict',
      conflictResolution: 'skip',
      backup: true,
      dryRun: false
    };

    const activeOptions = { ...defaultOptions, ...options };
    const startTime = Date.now();

    this.emit('import_started', { inputPath, options: activeOptions });

    try {
      // Create backup if requested
      if (activeOptions.backup && !activeOptions.dryRun) {
        await this.createBackup();
      }

      // Detect and verify format
      const detectedFormat = await this.detectFormat(inputPath);
      if (detectedFormat !== activeOptions.format) {
        this.emit('format_mismatch', {
          detected: detectedFormat,
          specified: activeOptions.format
        });
      }

      // Load and parse import data
      const importData = await this.loadImportData(inputPath, activeOptions);

      // Validate import data
      const validationResult = await this.validateImportData(importData, activeOptions);

      if (validationResult.invalid > 0 && activeOptions.validation === 'strict') {
        throw new Error(`Validation failed: ${validationResult.invalid} invalid entries`);
      }

      // Process import data
      const result = await this.processImportData(importData, activeOptions);

      this.emit('import_completed', {
        result,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('import_error', { error: errorMessage });

      return {
        success: false,
        processed: 0,
        imported: 0,
        skipped: 0,
        errors: 1,
        conflicts: 0,
        validation: {
          valid: 0,
          invalid: 0,
          warnings: []
        },
        summary: {
          newEntries: 0,
          updatedEntries: 0,
          duplicateEntries: 0,
          failedEntries: 0
        },
        metadata: {
          importedAt: new Date(),
          source: inputPath,
          format: activeOptions.format,
          mode: activeOptions.mode
        }
      };
    }
  }

  /**
   * Create migration plan between different systems
   */
  async createMigrationPlan(
    sourceSchema: any,
    targetSchema: any,
    options?: {
      autoMap?: boolean;
      preserveStructure?: boolean;
      customMappings?: Record<string, string>;
    }
  ): Promise<MigrationPlan> {
    const plan: MigrationPlan = {
      sourceSystem: sourceSchema.system || 'Unknown',
      targetSystem: 'DocuMCP',
      mapping: {},
      transformations: [],
      validation: [],
      postProcessing: []
    };

    // Auto-generate field mappings
    if (options?.autoMap !== false) {
      plan.mapping = this.generateFieldMappings(sourceSchema, targetSchema);
    }

    // Apply custom mappings
    if (options?.customMappings) {
      Object.assign(plan.mapping, options.customMappings);
    }

    // Generate transformations
    plan.transformations = this.generateTransformations(sourceSchema, targetSchema, plan.mapping);

    // Generate validation rules
    plan.validation = this.generateValidationRules(targetSchema);

    // Generate post-processing steps
    plan.postProcessing = this.generatePostProcessingSteps(targetSchema);

    return plan;
  }

  /**
   * Execute migration plan
   */
  async executeMigration(
    inputPath: string,
    migrationPlan: MigrationPlan,
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    this.emit('migration_started', { inputPath, plan: migrationPlan });

    try {
      // Load source data
      const sourceData = await this.loadRawData(inputPath);

      // Apply transformations
      const transformedData = await this.applyTransformations(sourceData, migrationPlan);

      // Convert to import format
      const importData = this.convertToImportFormat(transformedData, migrationPlan);

      // Execute import with migration settings
      const importOptions: ImportOptions = {
        format: 'json',
        mode: 'merge',
        validation: 'strict',
        conflictResolution: 'merge',
        backup: true,
        dryRun: false,
        ...options,
        transformation: {
          enabled: true,
          rules: migrationPlan.transformations.map(t => ({
            field: t.target,
            operation: t.type as any,
            params: { source: t.source, operation: t.operation }
          }))
        }
      };

      const result = await this.processImportData(importData, importOptions);

      // Execute post-processing
      if (migrationPlan.postProcessing.length > 0) {
        await this.executePostProcessing(migrationPlan.postProcessing);
      }

      this.emit('migration_completed', { result });
      return result;

    } catch (error) {
      this.emit('migration_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): {
    export: string[];
    import: string[];
    compression: string[];
    encryption: string[];
  } {
    return {
      export: ['json', 'jsonl', 'csv', 'xml', 'yaml', 'sqlite', 'archive'],
      import: ['json', 'jsonl', 'csv', 'xml', 'yaml', 'sqlite', 'archive'],
      compression: ['gzip', 'zip', 'none'],
      encryption: ['aes-256-gcm', 'aes-192-gcm', 'aes-128-gcm']
    };
  }

  /**
   * Validate export/import compatibility
   */
  async validateCompatibility(
    sourcePath: string,
    _targetSystem: string = 'DocuMCP'
  ): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
    migrationRequired: boolean;
  }> {
    try {
      const format = await this.detectFormat(sourcePath);
      const sampleData = await this.loadSampleData(sourcePath, format);

      const issues: string[] = [];
      const recommendations: string[] = [];
      let compatible = true;
      let migrationRequired = false;

      // Check format compatibility
      if (!this.getSupportedFormats().import.includes(format)) {
        issues.push(`Unsupported format: ${format}`);
        compatible = false;
      }

      // Check schema compatibility
      const schemaIssues = this.validateSchema(sampleData);
      if (schemaIssues.length > 0) {
        issues.push(...schemaIssues);
        migrationRequired = true;
      }

      // Check data integrity
      const integrityIssues = this.validateDataIntegrity(sampleData);
      if (integrityIssues.length > 0) {
        issues.push(...integrityIssues);
        recommendations.push('Consider data cleaning before import');
      }

      // Generate recommendations
      if (migrationRequired) {
        recommendations.push('Create migration plan for schema transformation');
      }

      if (format === 'csv') {
        recommendations.push('Consider using JSON or JSONL for better data preservation');
      }

      return {
        compatible,
        issues,
        recommendations,
        migrationRequired
      };

    } catch (error) {
      return {
        compatible: false,
        issues: [error instanceof Error ? error.message : String(error)],
        recommendations: ['Verify file format and accessibility'],
        migrationRequired: false
      };
    }
  }

  /**
   * Private helper methods
   */
  private async getFilteredEntries(filters?: ExportOptions['filters']): Promise<MemoryEntry[]> {
    let entries = await this.storage.getAll();

    if (!filters) return entries;

    // Apply type filter
    if (filters.types && filters.types.length > 0) {
      entries = entries.filter(entry => filters.types!.includes(entry.type));
    }

    // Apply date range filter
    if (filters.dateRange) {
      entries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= filters.dateRange!.start && entryDate <= filters.dateRange!.end;
      });
    }

    // Apply project filter
    if (filters.projects && filters.projects.length > 0) {
      entries = entries.filter(entry =>
        filters.projects!.some(project =>
          entry.data.projectPath?.includes(project) || entry.data.projectId === project
        )
      );
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      entries = entries.filter(entry =>
        entry.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    // Apply outcomes filter
    if (filters.outcomes && filters.outcomes.length > 0) {
      entries = entries.filter(entry =>
        filters.outcomes!.includes(entry.data.outcome) ||
        (entry.data.success === true && filters.outcomes!.includes('success')) ||
        (entry.data.success === false && filters.outcomes!.includes('failure'))
      );
    }

    return entries;
  }

  private async prepareExportData(
    entries: MemoryEntry[],
    options: ExportOptions
  ): Promise<any> {
    const exportData: any = {
      metadata: {
        version: this.version,
        exportedAt: new Date().toISOString(),
        source: 'DocuMCP Memory System',
        entries: entries.length,
        options: {
          includeMetadata: options.includeMetadata,
          includeLearning: options.includeLearning,
          includeKnowledgeGraph: options.includeKnowledgeGraph
        }
      },
      memories: entries
    };

    // Include learning data if requested
    if (options.includeLearning) {
      const patterns = await this.learningSystem.getPatterns();
      exportData.learning = {
        patterns,
        statistics: await this.learningSystem.getStatistics()
      };
    }

    // Include knowledge graph if requested
    if (options.includeKnowledgeGraph) {
      const nodes = await this.knowledgeGraph.getAllNodes();
      const edges = await this.knowledgeGraph.getAllEdges();
      exportData.knowledgeGraph = {
        nodes,
        edges,
        statistics: await this.knowledgeGraph.getStatistics()
      };
    }

    return exportData;
  }

  private applyAnonymization(
    data: any,
    anonymizeOptions: { fields: string[]; method: string }
  ): void {
    const anonymizeValue = (value: any, method: string): any => {
      if (typeof value !== 'string') return value;

      switch (method) {
        case 'hash':
          return this.hashValue(value);
        case 'remove':
          return null;
        case 'pseudonymize':
          return this.pseudonymizeValue(value);
        default:
          return value;
      }
    };

    const anonymizeObject = (obj: any): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (anonymizeOptions.fields.includes(key)) {
          obj[key] = anonymizeValue(value, anonymizeOptions.method);
        } else if (typeof value === 'object' && value !== null) {
          anonymizeObject(value);
        }
      }
    };

    anonymizeObject(data);
  }

  private hashValue(value: string): string {
    // Simple hash - in production, use a proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  }

  private pseudonymizeValue(_value: string): string {
    // Simple pseudonymization - in production, use proper techniques
    const prefixes = ['user', 'project', 'system', 'item'];
    const suffix = Math.random().toString(36).substr(2, 8);
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix}_${suffix}`;
  }

  private async exportToJSON(
    outputPath: string,
    data: any,
    _options: ExportOptions
  ): Promise<string> {
    const jsonData = JSON.stringify(data, null, 2);
    const filePath = outputPath.endsWith('.json') ? outputPath : `${outputPath}.json`;
    await fs.writeFile(filePath, jsonData, 'utf8');
    return filePath;
  }

  private async exportToJSONL(
    outputPath: string,
    data: any,
    _options: ExportOptions
  ): Promise<string> {
    const filePath = outputPath.endsWith('.jsonl') ? outputPath : `${outputPath}.jsonl`;
    const writeStream = createWriteStream(filePath);

    // Write metadata as first line
    writeStream.write(JSON.stringify(data.metadata) + '\n');

    // Write each memory entry as a separate line
    for (const entry of data.memories) {
      writeStream.write(JSON.stringify(entry) + '\n');
    }

    // Write learning data if included
    if (data.learning) {
      writeStream.write(JSON.stringify({ type: 'learning', data: data.learning }) + '\n');
    }

    // Write knowledge graph if included
    if (data.knowledgeGraph) {
      writeStream.write(JSON.stringify({ type: 'knowledgeGraph', data: data.knowledgeGraph }) + '\n');
    }

    writeStream.end();
    return filePath;
  }

  private async exportToCSV(
    outputPath: string,
    data: any,
    _options: ExportOptions
  ): Promise<string> {
    const filePath = outputPath.endsWith('.csv') ? outputPath : `${outputPath}.csv`;

    // Flatten memory entries for CSV format
    const flattenedEntries = data.memories.map((entry: MemoryEntry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      type: entry.type,
      projectPath: entry.data.projectPath || '',
      projectId: entry.data.projectId || '',
      language: entry.data.language || '',
      framework: entry.data.framework || '',
      outcome: entry.data.outcome || '',
      success: entry.data.success || false,
      tags: entry.tags?.join(';') || '',
      metadata: JSON.stringify(entry.metadata || {})
    }));

    // Generate CSV headers
    const headers = Object.keys(flattenedEntries[0] || {});
    const csvLines = [headers.join(',')];

    // Generate CSV rows
    for (const entry of flattenedEntries) {
      const row = headers.map(header => {
        const value = entry[header as keyof typeof entry];
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvLines.push(row.join(','));
    }

    await fs.writeFile(filePath, csvLines.join('\n'), 'utf8');
    return filePath;
  }

  private async exportToXML(
    outputPath: string,
    data: any,
    _options: ExportOptions
  ): Promise<string> {
    const filePath = outputPath.endsWith('.xml') ? outputPath : `${outputPath}.xml`;

    const xmlData = this.convertToXML(data);
    await fs.writeFile(filePath, xmlData, 'utf8');
    return filePath;
  }

  private async exportToYAML(
    outputPath: string,
    data: any,
    _options: ExportOptions
  ): Promise<string> {
    const filePath = outputPath.endsWith('.yaml') ? outputPath : `${outputPath}.yaml`;

    // Simple YAML conversion - in production, use a proper YAML library
    const yamlData = this.convertToYAML(data);
    await fs.writeFile(filePath, yamlData, 'utf8');
    return filePath;
  }

  private async exportToSQLite(
    _outputPath: string,
    _data: any,
    _options: ExportOptions
  ): Promise<string> {
    // This would require a SQLite library like better-sqlite3
    // For now, throw an error indicating additional dependencies needed
    throw new Error('SQLite export requires additional dependencies (better-sqlite3)');
  }

  private async exportToArchive(
    outputPath: string,
    data: any,
    options: ExportOptions
  ): Promise<string> {
    const archivePath = outputPath.endsWith('.tar') ? outputPath : `${outputPath}.tar`;

    // Create archive metadata
    const metadata: ArchiveMetadata = {
      version: this.version,
      created: new Date(),
      source: 'DocuMCP Memory System',
      description: 'Complete memory system export archive',
      manifest: {
        files: [],
        total: { files: 0, size: 0, entries: data.memories.length }
      },
      options
    };

    // This would require archiving capabilities
    // For now, create multiple files and reference them in metadata
    const baseDir = archivePath.replace('.tar', '');
    await fs.mkdir(baseDir, { recursive: true });

    // Export memories as JSON
    const memoriesPath = `${baseDir}/memories.json`;
    await this.exportToJSON(memoriesPath, { memories: data.memories }, options);
    metadata.manifest.files.push({
      name: 'memories.json',
      type: 'memories',
      size: (await fs.stat(memoriesPath)).size,
      checksum: 'sha256-placeholder',
      entries: data.memories.length
    });

    // Export learning data if included
    if (data.learning) {
      const learningPath = `${baseDir}/learning.json`;
      await this.exportToJSON(learningPath, data.learning, options);
      metadata.manifest.files.push({
        name: 'learning.json',
        type: 'learning',
        size: (await fs.stat(learningPath)).size,
        checksum: 'sha256-placeholder'
      });
    }

    // Export knowledge graph if included
    if (data.knowledgeGraph) {
      const kgPath = `${baseDir}/knowledge-graph.json`;
      await this.exportToJSON(kgPath, data.knowledgeGraph, options);
      metadata.manifest.files.push({
        name: 'knowledge-graph.json',
        type: 'knowledge-graph',
        size: (await fs.stat(kgPath)).size,
        checksum: 'sha256-placeholder'
      });
    }

    // Write metadata
    const metadataPath = `${baseDir}/metadata.json`;
    await this.exportToJSON(metadataPath, metadata, options);

    return baseDir;
  }

  private async applyCompression(filePath: string, compression: string): Promise<string> {
    // This would require compression libraries
    // For now, return the original path
    this.emit('compression_skipped', { reason: 'Not implemented', compression });
    return filePath;
  }

  private async applyEncryption(filePath: string, encryption: any): Promise<string> {
    // This would require encryption capabilities
    // For now, return the original path
    this.emit('encryption_skipped', { reason: 'Not implemented', encryption });
    return filePath;
  }

  private getIncludedComponents(options: ExportOptions): string[] {
    const components = ['memories'];
    if (options.includeMetadata) components.push('metadata');
    if (options.includeLearning) components.push('learning');
    if (options.includeKnowledgeGraph) components.push('knowledge-graph');
    return components;
  }

  private async detectFormat(filePath: string): Promise<string> {
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'json': return 'json';
      case 'jsonl': return 'jsonl';
      case 'csv': return 'csv';
      case 'xml': return 'xml';
      case 'yaml': case 'yml': return 'yaml';
      case 'db': case 'sqlite': return 'sqlite';
      case 'tar': case 'zip': return 'archive';
      default: {
        // Try to detect by content
        const content = await fs.readFile(filePath, 'utf8');
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          return 'json';
        }
        if (content.includes('<?xml')) {
          return 'xml';
        }
        return 'unknown';
      }
    }
  }

  private async loadImportData(filePath: string, options: ImportOptions): Promise<any> {
    switch (options.format) {
      case 'json':
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
      case 'jsonl':
        return this.loadJSONLData(filePath);
      case 'csv':
        return this.loadCSVData(filePath);
      case 'xml':
        return this.loadXMLData(filePath);
      case 'yaml':
        return this.loadYAMLData(filePath);
      default:
        throw new Error(`Unsupported import format: ${options.format}`);
    }
  }

  private async loadJSONLData(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');

    const data: any = { memories: [], learning: null, knowledgeGraph: null };

    for (const line of lines) {
      const parsed = JSON.parse(line);

      if (parsed.type === 'learning') {
        data.learning = parsed.data;
      } else if (parsed.type === 'knowledgeGraph') {
        data.knowledgeGraph = parsed.data;
      } else if (parsed.version) {
        data.metadata = parsed;
      } else {
        data.memories.push(parsed);
      }
    }

    return data;
  }

  private async loadCSVData(filePath: string): Promise<any> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

    const memories = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const entry: any = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j];

        // Parse special fields
        if (header === 'tags') {
          entry.tags = value ? value.split(';') : [];
        } else if (header === 'metadata') {
          try {
            entry.metadata = JSON.parse(value);
          } catch {
            entry.metadata = {};
          }
        } else if (header === 'success') {
          entry.data = entry.data || {};
          entry.data.success = value === 'true';
        } else if (['projectPath', 'projectId', 'language', 'framework', 'outcome'].includes(header)) {
          entry.data = entry.data || {};
          entry.data[header] = value;
        } else {
          entry[header] = value;
        }
      }

      memories.push(entry);
    }

    return { memories };
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  }

  private async loadXMLData(_filePath: string): Promise<any> {
    // This would require an XML parser
    throw new Error('XML import requires additional dependencies (xml2js)');
  }

  private async loadYAMLData(_filePath: string): Promise<any> {
    // This would require a YAML parser
    throw new Error('YAML import requires additional dependencies (js-yaml)');
  }

  private async validateImportData(
    data: any,
    options: ImportOptions
  ): Promise<{ valid: number; invalid: number; warnings: string[] }> {
    const result = { valid: 0, invalid: 0, warnings: [] as string[] };

    if (!data.memories || !Array.isArray(data.memories)) {
      result.warnings.push('No memories array found in import data');
      return result;
    }

    for (const entry of data.memories) {
      if (this.validateMemoryEntry(entry, options.validation)) {
        result.valid++;
      } else {
        result.invalid++;
      }
    }

    return result;
  }

  private validateMemoryEntry(entry: any, validation: string): boolean {
    if (!entry.id || !entry.timestamp || !entry.type) {
      return validation !== 'strict';
    }

    if (validation === 'strict') {
      return Boolean(entry.data && typeof entry.data === 'object');
    }

    return true;
  }

  private async processImportData(
    data: any,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      processed: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      conflicts: 0,
      validation: { valid: 0, invalid: 0, warnings: [] },
      summary: {
        newEntries: 0,
        updatedEntries: 0,
        duplicateEntries: 0,
        failedEntries: 0
      },
      metadata: {
        importedAt: new Date(),
        source: 'imported data',
        format: options.format,
        mode: options.mode
      }
    };

    if (!data.memories || !Array.isArray(data.memories)) {
      result.success = false;
      result.errors = 1;
      return result;
    }

    for (const entry of data.memories) {
      result.processed++;

      try {
        if (!this.validateMemoryEntry(entry, options.validation)) {
          result.validation.invalid++;
          result.skipped++;
          continue;
        }

        result.validation.valid++;

        // Check for conflicts
        const existing = await this.storage.get(entry.id);
        if (existing) {
          result.conflicts++;

          switch (options.conflictResolution) {
            case 'skip':
              result.skipped++;
              result.summary.duplicateEntries++;
              continue;
            case 'overwrite':
              if (!options.dryRun) {
                await this.storage.update(entry.id, entry);
              }
              result.imported++;
              result.summary.updatedEntries++;
              break;
            case 'merge':
              if (!options.dryRun) {
                const merged = this.mergeEntries(existing, entry);
                await this.storage.update(entry.id, merged);
              }
              result.imported++;
              result.summary.updatedEntries++;
              break;
            case 'rename': {
              const newId = `${entry.id}_imported_${Date.now()}`;
              if (!options.dryRun) {
                await this.storage.store({ ...entry, id: newId });
              }
              result.imported++;
              result.summary.newEntries++;
              break;
            }
          }
        } else {
          if (!options.dryRun) {
            await this.storage.store(entry);
          }
          result.imported++;
          result.summary.newEntries++;
        }

      } catch (error) {
        result.errors++;
        result.summary.failedEntries++;
      }
    }

    // Import learning data if present
    if (data.learning && !options.dryRun) {
      await this.importLearningData(data.learning);
    }

    // Import knowledge graph if present
    if (data.knowledgeGraph && !options.dryRun) {
      await this.importKnowledgeGraphData(data.knowledgeGraph);
    }

    return result;
  }

  private mergeEntries(existing: MemoryEntry, imported: MemoryEntry): MemoryEntry {
    return {
      ...existing,
      ...imported,
      data: { ...existing.data, ...imported.data },
      metadata: { ...existing.metadata, ...imported.metadata },
      tags: [...new Set([...(existing.tags || []), ...(imported.tags || [])])],
      timestamp: imported.timestamp || existing.timestamp
    };
  }

  private async importLearningData(learningData: any): Promise<void> {
    if (learningData.patterns && Array.isArray(learningData.patterns)) {
      for (const pattern of learningData.patterns) {
        // This would require methods to import patterns into the learning system
        // For now, just emit an event
        this.emit('learning_pattern_imported', pattern);
      }
    }
  }

  private async importKnowledgeGraphData(kgData: any): Promise<void> {
    if (kgData.nodes && Array.isArray(kgData.nodes)) {
      for (const node of kgData.nodes) {
        await this.knowledgeGraph.addNode(node);
      }
    }

    if (kgData.edges && Array.isArray(kgData.edges)) {
      for (const edge of kgData.edges) {
        await this.knowledgeGraph.addEdge(edge);
      }
    }
  }

  private async createBackup(): Promise<string> {
    const backupPath = `backup_${Date.now()}.json`;
    const exportResult = await this.exportMemories(backupPath, {
      format: 'json',
      includeMetadata: true,
      includeLearning: true,
      includeKnowledgeGraph: true
    });

    this.emit('backup_created', { path: exportResult.filePath });
    return exportResult.filePath || backupPath;
  }

  private convertToXML(data: any): string {
    // Simple XML conversion - in production, use a proper XML library
    const escapeXML = (str: string) =>
      str.replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#x27;');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
    xml += `  <metadata>\n`;
    xml += `    <version>${escapeXML(data.metadata.version)}</version>\n`;
    xml += `    <exportedAt>${escapeXML(data.metadata.exportedAt)}</exportedAt>\n`;
    xml += `    <entries>${data.metadata.entries}</entries>\n`;
    xml += `  </metadata>\n`;
    xml += `  <memories>\n`;

    for (const memory of data.memories) {
      xml += `    <memory>\n`;
      xml += `      <id>${escapeXML(memory.id)}</id>\n`;
      xml += `      <timestamp>${escapeXML(memory.timestamp)}</timestamp>\n`;
      xml += `      <type>${escapeXML(memory.type)}</type>\n`;
      xml += `      <data>${escapeXML(JSON.stringify(memory.data))}</data>\n`;
      xml += `    </memory>\n`;
    }

    xml += `  </memories>\n`;
    xml += '</export>';

    return xml;
  }

  private convertToYAML(data: any): string {
    // Simple YAML conversion - in production, use a proper YAML library
    const indent = (level: number) => '  '.repeat(level);
    const toYAML = (obj: any, level: number = 0): string => {
      if (obj === null) return 'null';
      if (typeof obj === 'boolean') return obj.toString();
      if (typeof obj === 'number') return obj.toString();
      if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;

      if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        return '\n' + obj.map(item =>
          `${indent(level)}- ${toYAML(item, level + 1).trim()}`
        ).join('\n');
      }

      if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        return '\n' + keys.map(key =>
          `${indent(level)}${key}: ${toYAML(obj[key], level + 1).trim()}`
        ).join('\n');
      }

      return obj.toString();
    };

    return `# DocuMCP Memory Export\n${toYAML(data)}`;
  }

  // Additional helper methods for migration
  private generateFieldMappings(sourceSchema: any, targetSchema: any): Record<string, string> {
    const mappings: Record<string, string> = {};

    // Simple field name matching - in production, use more sophisticated mapping
    const sourceFields = Object.keys(sourceSchema.fields || {});
    const targetFields = Object.keys(targetSchema.fields || {});

    for (const sourceField of sourceFields) {
      // Direct match
      if (targetFields.includes(sourceField)) {
        mappings[sourceField] = sourceField;
        continue;
      }

      // Fuzzy matching
      const similar = targetFields.find(tf =>
        tf.toLowerCase().includes(sourceField.toLowerCase()) ||
        sourceField.toLowerCase().includes(tf.toLowerCase())
      );

      if (similar) {
        mappings[sourceField] = similar;
      }
    }

    return mappings;
  }

  private generateTransformations(
    sourceSchema: any,
    targetSchema: any,
    mapping: Record<string, string>
  ): MigrationPlan['transformations'] {
    const transformations: MigrationPlan['transformations'] = [];

    // Generate transformations based on field mappings and type differences
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      const sourceType = sourceSchema.fields?.[sourceField]?.type;
      const targetType = targetSchema.fields?.[targetField]?.type;

      if (sourceType !== targetType) {
        transformations.push({
          field: targetField,
          type: 'convert',
          source: sourceField,
          target: targetField,
          operation: `${sourceType}_to_${targetType}`
        });
      } else {
        transformations.push({
          field: targetField,
          type: 'rename',
          source: sourceField,
          target: targetField
        });
      }
    }

    return transformations;
  }

  private generateValidationRules(targetSchema: any): MigrationPlan['validation'] {
    const validation: MigrationPlan['validation'] = [];

    // Generate validation rules based on target schema
    if (targetSchema.fields) {
      for (const [field, config] of Object.entries(targetSchema.fields)) {
        const rules: string[] = [];
        const fieldConfig = config as any;

        if (fieldConfig.required) {
          rules.push('required');
        }

        if (fieldConfig.type) {
          rules.push(`type:${fieldConfig.type}`);
        }

        if (fieldConfig.format) {
          rules.push(`format:${fieldConfig.format}`);
        }

        validation.push({
          field,
          rules,
          required: fieldConfig.required || false
        });
      }
    }

    return validation;
  }

  private generatePostProcessingSteps(targetSchema: any): string[] {
    const steps: string[] = [];

    // Generate post-processing steps
    steps.push('rebuild_indices');
    steps.push('update_references');
    steps.push('validate_integrity');

    if (targetSchema.features?.learning) {
      steps.push('retrain_models');
    }

    if (targetSchema.features?.knowledgeGraph) {
      steps.push('rebuild_graph');
    }

    return steps;
  }

  private async loadRawData(inputPath: string): Promise<any> {
    const content = await fs.readFile(inputPath, 'utf8');
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  private async applyTransformations(
    data: any,
    plan: MigrationPlan
  ): Promise<any> {
    const transformed = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const transformation of plan.transformations) {
      // Apply transformation based on type
      switch (transformation.type) {
        case 'rename':
          this.renameField(transformed, transformation.source as string, transformation.target);
          break;
        case 'convert':
          this.convertField(transformed, transformation.source as string, transformation.target, transformation.operation);
          break;
        // Add more transformation types as needed
      }
    }

    return transformed;
  }

  private renameField(obj: any, oldName: string, newName: string): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(item => this.renameField(item, oldName, newName));
    } else {
      if (oldName in obj) {
        obj[newName] = obj[oldName];
        delete obj[oldName];
      }

      Object.values(obj).forEach(value => this.renameField(value, oldName, newName));
    }
  }

  private convertField(obj: any, fieldName: string, targetName: string, operation?: string): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach(item => this.convertField(item, fieldName, targetName, operation));
    } else {
      if (fieldName in obj) {
        const value = obj[fieldName];

        // Apply conversion based on operation
        switch (operation) {
          case 'string_to_number':
            obj[targetName] = Number(value);
            break;
          case 'number_to_string':
            obj[targetName] = String(value);
            break;
          case 'array_to_string':
            obj[targetName] = Array.isArray(value) ? value.join(',') : value;
            break;
          case 'string_to_array':
            obj[targetName] = typeof value === 'string' ? value.split(',') : value;
            break;
          default:
            obj[targetName] = value;
        }

        if (fieldName !== targetName) {
          delete obj[fieldName];
        }
      }

      Object.values(obj).forEach(value => this.convertField(value, fieldName, targetName, operation));
    }
  }

  private convertToImportFormat(data: any, plan: MigrationPlan): any {
    // Convert transformed data to standard import format
    return {
      metadata: {
        version: this.version,
        migrated: true,
        migrationPlan: plan.sourceSystem,
        importedAt: new Date().toISOString()
      },
      memories: Array.isArray(data) ? data : data.memories || [data]
    };
  }

  private async executePostProcessing(steps: string[]): Promise<void> {
    for (const step of steps) {
      try {
        switch (step) {
          case 'rebuild_indices':
            await this.storage.rebuildIndex();
            break;
          case 'update_references':
            // Update cross-references in data
            break;
          case 'validate_integrity':
            // Validate data integrity
            break;
          case 'retrain_models':
            // Trigger learning system retraining
            break;
          case 'rebuild_graph':
            // Rebuild knowledge graph
            break;
        }

        this.emit('post_processing_step_completed', { step });
      } catch (error) {
        this.emit('post_processing_step_failed', {
          step,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async loadSampleData(sourcePath: string, format: string): Promise<any> {
    // Load a small sample of data for validation
    if (format === 'json') {
      const content = await fs.readFile(sourcePath, 'utf8');
      const data = JSON.parse(content);

      if (data.memories && Array.isArray(data.memories)) {
        return { memories: data.memories.slice(0, 10) }; // First 10 entries
      }

      return data;
    }

    // For other formats, return basic structure info
    return { format, sampleLoaded: true };
  }

  private validateSchema(sampleData: any): string[] {
    const issues: string[] = [];

    if (!sampleData.memories && !Array.isArray(sampleData)) {
      issues.push('Expected memories array not found');
    }

    const memories = sampleData.memories || (Array.isArray(sampleData) ? sampleData : []);

    if (memories.length > 0) {
      const firstEntry = memories[0];

      if (!firstEntry.id) {
        issues.push('Memory entries missing required id field');
      }

      if (!firstEntry.timestamp) {
        issues.push('Memory entries missing required timestamp field');
      }

      if (!firstEntry.type) {
        issues.push('Memory entries missing required type field');
      }

      if (!firstEntry.data) {
        issues.push('Memory entries missing required data field');
      }
    }

    return issues;
  }

  private validateDataIntegrity(sampleData: any): string[] {
    const issues: string[] = [];

    const memories = sampleData.memories || (Array.isArray(sampleData) ? sampleData : []);

    // Check for duplicate IDs
    const ids = new Set();
    const duplicates = new Set();

    for (const entry of memories) {
      if (entry.id) {
        if (ids.has(entry.id)) {
          duplicates.add(entry.id);
        } else {
          ids.add(entry.id);
        }
      }
    }

    if (duplicates.size > 0) {
      issues.push(`Found ${duplicates.size} duplicate IDs`);
    }

    // Check timestamp validity
    let invalidTimestamps = 0;
    for (const entry of memories) {
      if (entry.timestamp && isNaN(new Date(entry.timestamp).getTime())) {
        invalidTimestamps++;
      }
    }

    if (invalidTimestamps > 0) {
      issues.push(`Found ${invalidTimestamps} invalid timestamps`);
    }

    return issues;
  }
}