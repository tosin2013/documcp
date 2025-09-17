/**
 * Memory Management Module for DocuMCP
 * Implements Issue #46: Memory Management Module
 */

import { JSONLStorage, MemoryEntry } from './storage.js';
import { EventEmitter } from 'events';

export interface MemoryContext {
  projectId: string;
  repository?: string;
  branch?: string;
  user?: string;
  session?: string;
}

export interface MemorySearchOptions {
  semantic?: boolean;
  fuzzy?: boolean;
  sortBy?: 'relevance' | 'timestamp' | 'type';
  groupBy?: 'type' | 'project' | 'date';
}

export class MemoryManager extends EventEmitter {
  private storage: JSONLStorage;
  private context: MemoryContext | null = null;
  private cache: Map<string, MemoryEntry>;
  private readonly maxCacheSize = 200; // Reduced cache size for better memory efficiency

  constructor(storageDir?: string) {
    super();
    this.storage = new JSONLStorage(storageDir);
    this.cache = new Map();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    this.emit('initialized');
  }

  setContext(context: MemoryContext): void {
    this.context = context;
    this.emit('context-changed', context);
  }

  async remember(
    type: MemoryEntry['type'],
    data: Record<string, any>,
    metadata?: Partial<MemoryEntry['metadata']>,
  ): Promise<MemoryEntry> {
    const entry = await this.storage.append({
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        ...metadata,
        projectId: this.context?.projectId,
        repository: this.context?.repository || metadata?.repository,
      },
    });

    this.addToCache(entry);
    this.emit('memory-created', entry);

    return entry;
  }

  async recall(id: string): Promise<MemoryEntry | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const entry = await this.storage.get(id);
    if (entry) {
      this.addToCache(entry);
    }

    return entry;
  }

  async search(
    query: string | Partial<MemoryEntry['metadata']>,
    options?: MemorySearchOptions,
  ): Promise<MemoryEntry[]> {
    let filter: any = {};

    if (typeof query === 'string') {
      // Text-based search - search in multiple fields
      // Try to match projectId first, then tags
      const results: MemoryEntry[] = [];

      // Search by projectId
      const projectResults = await this.storage.query({ projectId: query });
      results.push(...projectResults);

      // Search by tags (excluding already found entries)
      const tagResults = await this.storage.query({ tags: [query] });
      const existingIds = new Set(results.map((r) => r.id));
      results.push(...tagResults.filter((r) => !existingIds.has(r.id)));

      // Apply sorting and grouping if requested
      let finalResults = results;
      if (options?.sortBy) {
        finalResults = this.sortResults(finalResults, options.sortBy);
      }

      if (options?.groupBy) {
        return this.groupResults(finalResults, options.groupBy);
      }

      return finalResults;
    } else {
      filter = { ...query };
    }

    if (this.context) {
      filter.projectId = filter.projectId || this.context.projectId;
      filter.repository = filter.repository || this.context.repository;
    }

    let results = await this.storage.query(filter);

    if (options?.sortBy) {
      results = this.sortResults(results, options.sortBy);
    }

    if (options?.groupBy) {
      return this.groupResults(results, options.groupBy);
    }

    return results;
  }

  async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
    const existing = await this.recall(id);
    if (!existing) return null;

    const updated: MemoryEntry = {
      ...existing,
      ...updates,
      id: existing.id,
      timestamp: new Date().toISOString(),
    };

    await this.storage.delete(id);
    const newEntry = await this.storage.append(updated);

    this.cache.delete(id);
    this.addToCache(newEntry);

    this.emit('memory-updated', newEntry);
    return newEntry;
  }

  async forget(id: string): Promise<boolean> {
    const result = await this.storage.delete(id);
    if (result) {
      this.cache.delete(id);
      this.emit('memory-deleted', id);
    }
    return result;
  }

  async getRelated(entry: MemoryEntry, limit: number = 10): Promise<MemoryEntry[]> {
    const related: MemoryEntry[] = [];

    // Find by same project
    if (entry.metadata.projectId) {
      const projectMemories = await this.search({ projectId: entry.metadata.projectId });
      related.push(...projectMemories.filter((m: any) => m.id !== entry.id));
    }

    // Find by same type
    const typeMemories = await this.storage.query({
      type: entry.type,
      limit: limit * 2,
    });
    related.push(...typeMemories.filter((m: any) => m.id !== entry.id));

    // Find by overlapping tags
    if (entry.metadata.tags && entry.metadata.tags.length > 0) {
      const tagMemories = await this.storage.query({
        tags: entry.metadata.tags,
        limit: limit * 2,
      });
      related.push(...tagMemories.filter((m: any) => m.id !== entry.id));
    }

    // Deduplicate and limit
    const uniqueRelated = Array.from(new Map(related.map((m: any) => [m.id, m])).values()).slice(
      0,
      limit,
    );

    return uniqueRelated;
  }

  async analyze(timeRange?: { start: string; end: string }): Promise<{
    patterns: Record<string, any>;
    insights: string[];
    statistics: any;
  }> {
    const stats = await this.storage.getStatistics();
    const memories = await this.storage.query({
      startDate: timeRange?.start,
      endDate: timeRange?.end,
    });

    const patterns = this.extractPatterns(memories);
    const insights = this.generateInsights(patterns, stats);

    return {
      patterns,
      insights,
      statistics: stats,
    };
  }

  private extractPatterns(memories: MemoryEntry[]): Record<string, any> {
    const patterns: Record<string, any> = {
      mostCommonSSG: {},
      projectTypes: {},
      deploymentSuccess: { success: 0, failed: 0 },
      timeDistribution: {},
    };

    for (const memory of memories) {
      // SSG patterns
      if (memory.metadata.ssg) {
        patterns.mostCommonSSG[memory.metadata.ssg] =
          (patterns.mostCommonSSG[memory.metadata.ssg] || 0) + 1;
      }

      // Deployment patterns
      if (memory.type === 'deployment') {
        if (memory.data.status === 'success') {
          patterns.deploymentSuccess.success++;
        } else if (memory.data.status === 'failed') {
          patterns.deploymentSuccess.failed++;
        }
      }

      // Time patterns
      const hour = new Date(memory.timestamp).getHours();
      patterns.timeDistribution[hour] = (patterns.timeDistribution[hour] || 0) + 1;
    }

    return patterns;
  }

  private generateInsights(patterns: any, stats: any): string[] {
    const insights: string[] = [];

    // SSG preference insight
    if (Object.keys(patterns.mostCommonSSG).length > 0) {
      const topSSG = Object.entries(patterns.mostCommonSSG).sort(
        ([, a]: any, [, b]: any) => b - a,
      )[0];
      insights.push(`Most frequently used SSG: ${topSSG[0]} (${topSSG[1]} projects)`);
    }

    // Deployment success rate
    const total = patterns.deploymentSuccess.success + patterns.deploymentSuccess.failed;
    if (total > 0) {
      const successRate = ((patterns.deploymentSuccess.success / total) * 100).toFixed(1);
      insights.push(`Deployment success rate: ${successRate}%`);
    }

    // Activity patterns
    if (Object.keys(patterns.timeDistribution).length > 0) {
      const peakHour = Object.entries(patterns.timeDistribution).sort(
        ([, a]: any, [, b]: any) => b - a,
      )[0];
      insights.push(`Peak activity hour: ${peakHour[0]}:00`);
    }

    // Storage insights
    const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    insights.push(`Total memory storage: ${sizeMB} MB across ${stats.totalEntries} entries`);

    return insights;
  }

  private sortResults(
    results: MemoryEntry[],
    sortBy: 'relevance' | 'timestamp' | 'type',
  ): MemoryEntry[] {
    switch (sortBy) {
      case 'timestamp':
        return results.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      case 'type':
        return results.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return results;
    }
  }

  private groupResults(results: MemoryEntry[], groupBy: 'type' | 'project' | 'date'): any {
    const grouped: Record<string, MemoryEntry[]> = {};

    for (const entry of results) {
      let key: string;
      switch (groupBy) {
        case 'type':
          key = entry.type;
          break;
        case 'project':
          key = entry.metadata.projectId || 'unknown';
          break;
        case 'date':
          key = entry.timestamp.split('T')[0];
          break;
        default:
          key = 'all';
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    }

    return grouped;
  }

  private addToCache(entry: MemoryEntry): void {
    // More aggressive cache eviction to prevent memory growth
    while (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Store a shallow copy to avoid retaining large objects
    const cacheEntry = {
      id: entry.id,
      timestamp: entry.timestamp,
      type: entry.type,
      data: entry.data,
      metadata: entry.metadata,
      tags: entry.tags,
    };

    this.cache.set(entry.id, cacheEntry as MemoryEntry);
  }

  async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    const allMemories = await this.storage.query({});

    if (format === 'json') {
      return JSON.stringify(allMemories, null, 2);
    } else {
      // CSV export
      const headers = ['id', 'timestamp', 'type', 'projectId', 'repository', 'ssg'];
      const rows = allMemories.map((m: any) => [
        m.id,
        m.timestamp,
        m.type,
        m.metadata?.projectId || '',
        m.metadata?.repository || '',
        m.metadata?.ssg || '',
      ]);

      return [headers, ...rows].map((r: any) => r.join(',')).join('\n');
    }
  }

  async import(data: string, format: 'json' | 'csv' = 'json'): Promise<number> {
    let entries: MemoryEntry[] = [];

    if (format === 'json') {
      entries = JSON.parse(data);
    } else {
      // CSV import - simplified for now
      const lines = data.split('\n');
      const headers = lines[0].split(',');

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length === headers.length) {
          entries.push({
            id: values[0],
            timestamp: values[1],
            type: values[2] as MemoryEntry['type'],
            data: {},
            metadata: {
              projectId: values[3],
              repository: values[4],
              ssg: values[5],
            },
          });
        }
      }
    }

    let imported = 0;
    for (const entry of entries) {
      await this.storage.append(entry);
      imported++;
    }

    this.emit('import-complete', imported);
    return imported;
  }

  async cleanup(olderThan?: Date): Promise<number> {
    const cutoff = olderThan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    const oldMemories = await this.storage.query({
      endDate: cutoff.toISOString(),
    });

    let deleted = 0;
    for (const memory of oldMemories) {
      if (await this.storage.delete(memory.id)) {
        deleted++;
      }
    }

    await this.storage.compact();
    this.emit('cleanup-complete', deleted);
    return deleted;
  }

  async close(): Promise<void> {
    await this.storage.close();
    this.cache.clear();
    this.emit('closed');
  }

  /**
   * Get the storage instance for use with other systems
   */
  getStorage(): JSONLStorage {
    return this.storage;
  }
}

export default MemoryManager;
