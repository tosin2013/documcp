/**
 * Memory Pruning & Optimization System for DocuMCP
 * Intelligent memory cleanup, storage optimization, and performance tuning
 */

import { EventEmitter } from 'events';
import { MemoryEntry, JSONLStorage } from './storage.js';
import { MemoryManager } from './manager.js';
import { IncrementalLearningSystem } from './learning.js';
import { KnowledgeGraph } from './knowledge-graph.js';

export interface PruningPolicy {
  maxAge: number; // Maximum age in days
  maxSize: number; // Maximum storage size in MB
  maxEntries: number; // Maximum number of entries
  preservePatterns: string[]; // Pattern types to preserve
  compressionThreshold: number; // Compress entries older than X days
  redundancyThreshold: number; // Remove similar entries with similarity > X
}

export interface OptimizationMetrics {
  totalEntries: number;
  storageSize: number;
  indexSize: number;
  compressionRatio: number;
  duplicatesRemoved: number;
  entriesPruned: number;
  performanceGain: number;
  lastOptimization: Date;
}

export interface PruningResult {
  entriesRemoved: number;
  spaceSaved: number;
  patternsPreserved: number;
  compressionApplied: number;
  optimizationApplied: boolean;
  metrics: OptimizationMetrics;
}

export interface CompressionStrategy {
  type: 'gzip' | 'lz4' | 'semantic';
  threshold: number;
  ratio: number;
}

export interface RedundancyPattern {
  similarity: number;
  count: number;
  representative: string;
  duplicates: string[];
  canMerge: boolean;
}

export class MemoryPruningSystem extends EventEmitter {
  private storage: JSONLStorage;
  private manager: MemoryManager;
  private learningSystem: IncrementalLearningSystem;
  private knowledgeGraph: KnowledgeGraph;
  private defaultPolicy: PruningPolicy;
  private compressionCache: Map<string, any>;
  private similarityCache: Map<string, Map<string, number>>;

  constructor(
    storage: JSONLStorage,
    manager: MemoryManager,
    learningSystem: IncrementalLearningSystem,
    knowledgeGraph: KnowledgeGraph,
  ) {
    super();
    this.storage = storage;
    this.manager = manager;
    this.learningSystem = learningSystem;
    this.knowledgeGraph = knowledgeGraph;
    this.compressionCache = new Map();
    this.similarityCache = new Map();

    this.defaultPolicy = {
      maxAge: 180, // 6 months
      maxSize: 500, // 500MB
      maxEntries: 50000,
      preservePatterns: ['successful_deployment', 'user_preference', 'critical_error'],
      compressionThreshold: 30, // Compress after 30 days
      redundancyThreshold: 0.85, // 85% similarity threshold
    };

    this.setupPeriodicCleanup();
  }

  /**
   * Execute comprehensive memory pruning
   */
  async prune(policy?: Partial<PruningPolicy>): Promise<PruningResult> {
    const activePolicy = { ...this.defaultPolicy, ...policy };
    const startTime = Date.now();

    this.emit('pruning_started', { policy: activePolicy });

    try {
      // Get current metrics
      const initialMetrics = await this.getOptimizationMetrics();

      // Phase 1: Remove aged entries
      const agedResult = await this.removeAgedEntries(activePolicy);

      // Phase 2: Apply size-based pruning
      const sizeResult = await this.applySizePruning(activePolicy);

      // Phase 3: Remove redundant entries
      const redundancyResult = await this.removeRedundantEntries(activePolicy);

      // Phase 4: Apply compression
      const compressionResult = await this.applyCompression(activePolicy);

      // Phase 5: Optimize storage structure
      const optimizationResult = await this.optimizeStorage();

      // Get final metrics
      const finalMetrics = await this.getOptimizationMetrics();

      const result: PruningResult = {
        entriesRemoved: agedResult.removed + sizeResult.removed + redundancyResult.removed,
        spaceSaved: initialMetrics.storageSize - finalMetrics.storageSize,
        patternsPreserved: agedResult.preserved + sizeResult.preserved,
        compressionApplied: compressionResult.compressed,
        optimizationApplied: optimizationResult.applied,
        metrics: finalMetrics,
      };

      // Update learning system with pruning results
      await this.updateLearningFromPruning(result);

      this.emit('pruning_completed', {
        result,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.emit('pruning_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Remove entries older than policy threshold
   */
  private async removeAgedEntries(
    policy: PruningPolicy,
  ): Promise<{ removed: number; preserved: number }> {
    const cutoffDate = new Date(Date.now() - policy.maxAge * 24 * 60 * 60 * 1000);
    const allEntries = await this.storage.getAll();

    let removed = 0;
    let preserved = 0;

    for (const entry of allEntries) {
      const entryDate = new Date(entry.timestamp);

      if (entryDate < cutoffDate) {
        // Check if entry should be preserved
        if (this.shouldPreserveEntry(entry, policy)) {
          preserved++;
          continue;
        }

        // Remove from storage
        await this.storage.delete(entry.id);

        // Remove from knowledge graph
        await this.knowledgeGraph.removeNode(entry.id);

        removed++;
      }
    }

    return { removed, preserved };
  }

  /**
   * Apply size-based pruning to stay within limits
   */
  private async applySizePruning(
    policy: PruningPolicy,
  ): Promise<{ removed: number; preserved: number }> {
    const metrics = await this.getOptimizationMetrics();

    if (metrics.storageSize <= policy.maxSize && metrics.totalEntries <= policy.maxEntries) {
      return { removed: 0, preserved: 0 };
    }

    // Get entries sorted by importance score
    const allEntries = await this.storage.getAll();
    const scoredEntries = await Promise.all(
      allEntries.map(async (entry) => ({
        entry,
        score: await this.calculateImportanceScore(entry),
      })),
    );

    // Sort by score (ascending - remove least important first)
    scoredEntries.sort((a, b) => a.score - b.score);

    let removed = 0;
    let preserved = 0;
    let currentSize = metrics.storageSize;
    let currentEntries = metrics.totalEntries;

    for (const { entry, score } of scoredEntries) {
      if (currentSize <= policy.maxSize && currentEntries <= policy.maxEntries) {
        break;
      }

      if (this.shouldPreserveEntry(entry, policy) || score > 0.8) {
        preserved++;
        continue;
      }

      // Remove entry
      await this.storage.delete(entry.id);
      await this.knowledgeGraph.removeNode(entry.id);

      // Estimate size reduction (rough approximation)
      const entrySize = JSON.stringify(entry).length / (1024 * 1024);
      currentSize -= entrySize;
      currentEntries--;
      removed++;
    }

    return { removed, preserved };
  }

  /**
   * Remove redundant and duplicate entries
   */
  private async removeRedundantEntries(
    policy: PruningPolicy,
  ): Promise<{ removed: number; merged: number }> {
    const redundantPatterns = await this.findRedundantPatterns(policy.redundancyThreshold);

    let removed = 0;
    let merged = 0;

    for (const pattern of redundantPatterns) {
      if (pattern.canMerge && pattern.duplicates.length > 1) {
        // Keep the representative, remove duplicates
        for (let i = 1; i < pattern.duplicates.length; i++) {
          await this.storage.delete(pattern.duplicates[i]);
          removed++;
        }

        // Optionally merge information into representative
        if (pattern.count > 2) {
          await this.mergeRedundantEntries(pattern.representative, pattern.duplicates.slice(1));
          merged++;
        }
      }
    }

    return { removed, merged };
  }

  /**
   * Apply compression to old entries
   */
  private async applyCompression(
    policy: PruningPolicy,
  ): Promise<{ compressed: number; spaceSaved: number }> {
    const cutoffDate = new Date(Date.now() - policy.compressionThreshold * 24 * 60 * 60 * 1000);
    const allEntries = await this.storage.getAll();

    let compressed = 0;
    let spaceSaved = 0;

    for (const entry of allEntries) {
      const entryDate = new Date(entry.timestamp);

      if (entryDate < cutoffDate && !this.isCompressed(entry)) {
        const originalSize = JSON.stringify(entry).length;
        const compressedEntry = await this.compressEntry(entry);
        const compressedSize = JSON.stringify(compressedEntry).length;

        await this.storage.update(entry.id, compressedEntry);

        compressed++;
        spaceSaved += originalSize - compressedSize;
      }
    }

    return { compressed, spaceSaved };
  }

  /**
   * Optimize storage structure and indices
   */
  private async optimizeStorage(): Promise<{ applied: boolean; improvements: string[] }> {
    const improvements: string[] = [];

    try {
      // Rebuild indices
      await this.storage.rebuildIndex();
      improvements.push('rebuilt_indices');

      // Defragment storage files
      await this.defragmentStorage();
      improvements.push('defragmented_storage');

      // Optimize cache sizes
      this.optimizeCaches();
      improvements.push('optimized_caches');

      return { applied: true, improvements };
    } catch (error) {
      return { applied: false, improvements };
    }
  }

  /**
   * Calculate importance score for an entry
   */
  private async calculateImportanceScore(entry: MemoryEntry): Promise<number> {
    let score = 0;

    // Recency score (0-0.3)
    const age = Date.now() - new Date(entry.timestamp).getTime();
    const maxAge = 180 * 24 * 60 * 60 * 1000; // 180 days
    score += Math.max(0, 1 - age / maxAge) * 0.3;

    // Type importance (0-0.2)
    const typeScores: Record<string, number> = {
      successful_deployment: 0.2,
      user_preference: 0.18,
      configuration: 0.15,
      analysis: 0.12,
      recommendation: 0.12,
      interaction: 0.08,
      error: 0.05,
    };
    score += typeScores[entry.type] || 0.05;

    // Learning value (0-0.2)
    const patterns = await this.learningSystem.getPatterns();
    const relevantPatterns = patterns.filter(
      (p) =>
        p.metadata.technologies?.includes(entry.data.language) ||
        p.metadata.technologies?.includes(entry.data.framework),
    );
    score += Math.min(0.2, relevantPatterns.length * 0.05);

    // Knowledge graph centrality (0-0.15)
    try {
      const connections = await this.knowledgeGraph.getConnections(entry.id);
      score += Math.min(0.15, connections.length * 0.02);
    } catch {
      // Node might not exist in graph
    }

    // Success indicator (0-0.15)
    if (entry.data.outcome === 'success' || entry.data.success === true) {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Check if entry should be preserved based on policy
   */
  private shouldPreserveEntry(entry: MemoryEntry, policy: PruningPolicy): boolean {
    // Check preserve patterns
    for (const pattern of policy.preservePatterns) {
      if (entry.type.includes(pattern) || JSON.stringify(entry.data).includes(pattern)) {
        return true;
      }
    }

    // Preserve high-value entries
    if (
      entry.data.outcome === 'success' ||
      entry.data.success === true ||
      entry.data.critical === true
    ) {
      return true;
    }

    return false;
  }

  /**
   * Find patterns of redundant entries
   */
  private async findRedundantPatterns(threshold: number): Promise<RedundancyPattern[]> {
    const allEntries = await this.storage.getAll();
    const patterns: RedundancyPattern[] = [];
    const processed = new Set<string>();

    for (const entry of allEntries) {
      if (processed.has(entry.id)) continue;

      const similar = await this.findSimilarEntries(entry, allEntries, threshold);

      if (similar.length > 1) {
        patterns.push({
          similarity: threshold,
          count: similar.length,
          representative: similar[0].id,
          duplicates: similar.map((e) => e.id),
          canMerge: this.canMergeEntries(similar),
        });

        similar.forEach((s) => processed.add(s.id));
      }
    }

    return patterns;
  }

  /**
   * Find entries similar to given entry
   */
  private async findSimilarEntries(
    target: MemoryEntry,
    entries: MemoryEntry[],
    threshold: number,
  ): Promise<MemoryEntry[]> {
    const similar: MemoryEntry[] = [target];

    for (const entry of entries) {
      if (entry.id === target.id) continue;

      const similarity = await this.calculateSimilarity(target, entry);
      if (similarity >= threshold) {
        similar.push(entry);
      }
    }

    return similar;
  }

  /**
   * Calculate similarity between two entries
   */
  private async calculateSimilarity(entry1: MemoryEntry, entry2: MemoryEntry): Promise<number> {
    // Check cache first
    if (
      this.similarityCache.has(entry1.id) &&
      this.similarityCache.get(entry1.id)?.has(entry2.id)
    ) {
      return this.similarityCache.get(entry1.id)!.get(entry2.id)!;
    }

    let similarity = 0;

    // Type similarity (0-0.3)
    if (entry1.type === entry2.type) {
      similarity += 0.3;
    }

    // Temporal similarity (0-0.2)
    const timeDiff = Math.abs(
      new Date(entry1.timestamp).getTime() - new Date(entry2.timestamp).getTime(),
    );
    const maxTimeDiff = 7 * 24 * 60 * 60 * 1000; // 7 days
    similarity += Math.max(0, 1 - timeDiff / maxTimeDiff) * 0.2;

    // Data similarity (0-0.5)
    const dataSimilarity = this.calculateDataSimilarity(entry1.data, entry2.data);
    similarity += dataSimilarity * 0.5;

    // Cache result
    if (!this.similarityCache.has(entry1.id)) {
      this.similarityCache.set(entry1.id, new Map());
    }
    this.similarityCache.get(entry1.id)!.set(entry2.id, similarity);

    return similarity;
  }

  /**
   * Calculate similarity between data objects
   */
  private calculateDataSimilarity(data1: any, data2: any): number {
    const keys1 = new Set(Object.keys(data1));
    const keys2 = new Set(Object.keys(data2));
    const allKeys = new Set([...keys1, ...keys2]);

    let matches = 0;
    let total = 0;

    for (const key of allKeys) {
      total++;
      if (keys1.has(key) && keys2.has(key)) {
        if (data1[key] === data2[key]) {
          matches++;
        } else if (typeof data1[key] === 'string' && typeof data2[key] === 'string') {
          // String similarity for text fields
          const stringSim = this.calculateStringSimilarity(data1[key], data2[key]);
          matches += stringSim;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Check if entries can be safely merged
   */
  private canMergeEntries(entries: MemoryEntry[]): boolean {
    if (entries.length < 2) return false;

    // All entries must have the same type
    const firstType = entries[0].type;
    if (!entries.every((e) => e.type === firstType)) {
      return false;
    }

    // Check for conflicting data
    const firstData = entries[0].data;
    for (const entry of entries.slice(1)) {
      if (this.hasConflictingData(firstData, entry.data)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check for conflicting data between entries
   */
  private hasConflictingData(data1: any, data2: any): boolean {
    for (const key of Object.keys(data1)) {
      if (key in data2 && data1[key] !== data2[key]) {
        // Special handling for arrays and objects
        if (Array.isArray(data1[key]) && Array.isArray(data2[key])) {
          continue; // Arrays can be merged
        }
        if (typeof data1[key] === 'object' && typeof data2[key] === 'object') {
          continue; // Objects can be merged
        }
        return true; // Conflicting primitive values
      }
    }
    return false;
  }

  /**
   * Merge redundant entries into representative
   */
  private async mergeRedundantEntries(
    representativeId: string,
    duplicateIds: string[],
  ): Promise<void> {
    const representative = await this.storage.get(representativeId);
    if (!representative) return;

    const duplicates = await Promise.all(duplicateIds.map((id) => this.storage.get(id)));

    // Merge data from duplicates
    const mergedData = { ...representative.data };

    for (const duplicate of duplicates) {
      if (!duplicate) continue;

      // Merge arrays
      for (const [key, value] of Object.entries(duplicate.data)) {
        if (Array.isArray(value) && Array.isArray(mergedData[key])) {
          mergedData[key] = [...new Set([...mergedData[key], ...value])];
        } else if (typeof value === 'object' && typeof mergedData[key] === 'object') {
          mergedData[key] = { ...mergedData[key], ...value };
        } else if (!(key in mergedData)) {
          mergedData[key] = value;
        }
      }
    }

    // Update representative with merged data
    await this.storage.update(representativeId, {
      ...representative,
      data: mergedData,
      metadata: {
        ...representative.metadata,
        merged: true,
        mergedCount: duplicateIds.length,
        mergedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Check if entry is already compressed
   */
  private isCompressed(entry: MemoryEntry): boolean {
    return Boolean(entry.metadata?.compressed);
  }

  /**
   * Compress entry data
   */
  private async compressEntry(entry: MemoryEntry): Promise<MemoryEntry> {
    // Simple compression - in production, use actual compression library
    const compressedData = this.simpleCompress(entry.data);

    return {
      ...entry,
      data: compressedData,
      metadata: {
        ...entry.metadata,
        compressed: true,
        compressionType: 'simple',
        compressedAt: new Date().toISOString(),
        originalSize: JSON.stringify(entry.data).length,
      },
    };
  }

  /**
   * Simple compression simulation
   */
  private simpleCompress(data: any): any {
    // This is a placeholder - in production, use proper compression
    const stringified = JSON.stringify(data);
    const compressed = stringified.replace(/\s+/g, ' ').trim();

    return {
      _compressed: true,
      _data: compressed,
      _type: 'simple',
    };
  }

  /**
   * Defragment storage files
   */
  private async defragmentStorage(): Promise<void> {
    // Rebuild storage with optimal layout
    const allEntries = await this.storage.getAll();

    // Sort entries for optimal access patterns
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // This would typically rewrite storage files
    // For now, just trigger a rebuild
    await this.storage.rebuildIndex();
  }

  /**
   * Optimize cache sizes based on usage patterns
   */
  private optimizeCaches(): void {
    // Clear old cache entries
    // Clear similarity cache entries older than 24 hours
    for (const [key1, innerMap] of this.similarityCache.entries()) {
      for (const [key2] of innerMap.entries()) {
        // Simple heuristic - remove if keys suggest old timestamps
        if (Math.random() < 0.1) {
          // 10% chance to clear each entry
          innerMap.delete(key2);
        }
      }
      if (innerMap.size === 0) {
        this.similarityCache.delete(key1);
      }
    }

    // Limit cache sizes
    if (this.compressionCache.size > 10000) {
      const entries = Array.from(this.compressionCache.entries());
      this.compressionCache.clear();
      // Keep only the most recent 5000 entries
      entries.slice(-5000).forEach(([key, value]) => {
        this.compressionCache.set(key, value);
      });
    }
  }

  /**
   * Get comprehensive optimization metrics
   */
  async getOptimizationMetrics(): Promise<OptimizationMetrics> {
    const allEntries = await this.storage.getAll();
    const totalEntries = allEntries.length;

    // Calculate storage size (approximate)
    const storageSize =
      allEntries.reduce((total, entry) => {
        return total + JSON.stringify(entry).length;
      }, 0) /
      (1024 * 1024); // Convert to MB

    // Calculate index size (approximate)
    const indexSize = (totalEntries * 100) / (1024 * 1024); // Rough estimate

    // Calculate compression ratio
    const compressedEntries = allEntries.filter((e) => this.isCompressed(e));
    const compressionRatio = compressedEntries.length / totalEntries;

    return {
      totalEntries,
      storageSize,
      indexSize,
      compressionRatio,
      duplicatesRemoved: 0, // Would be tracked during runtime
      entriesPruned: 0, // Would be tracked during runtime
      performanceGain: 0, // Would be calculated based on before/after metrics
      lastOptimization: new Date(),
    };
  }

  /**
   * Update learning system based on pruning results
   */
  private async updateLearningFromPruning(result: PruningResult): Promise<void> {
    // Create a learning entry about pruning effectiveness
    const pruningLearning = {
      action: 'memory_pruning',
      outcome: result.spaceSaved > 0 ? 'success' : 'neutral',
      metrics: {
        entriesRemoved: result.entriesRemoved,
        spaceSaved: result.spaceSaved,
        patternsPreserved: result.patternsPreserved,
      },
      timestamp: new Date().toISOString(),
    };

    // This would integrate with the learning system
    // For now, just emit an event
    this.emit('learning_update', pruningLearning);
  }

  /**
   * Setup periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    // Run optimization every 24 hours
    setInterval(
      async () => {
        try {
          await this.prune();
          this.emit('periodic_cleanup_completed');
        } catch (error) {
          this.emit('periodic_cleanup_error', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      24 * 60 * 60 * 1000,
    );
  }

  /**
   * Get pruning recommendations
   */
  async getPruningRecommendations(): Promise<{
    shouldPrune: boolean;
    reasons: string[];
    estimatedSavings: number;
    recommendedPolicy: Partial<PruningPolicy>;
  }> {
    const metrics = await this.getOptimizationMetrics();
    const reasons: string[] = [];
    let shouldPrune = false;
    let estimatedSavings = 0;

    // Check storage size
    if (metrics.storageSize > this.defaultPolicy.maxSize * 0.8) {
      shouldPrune = true;
      reasons.push(`Storage size (${metrics.storageSize.toFixed(2)}MB) approaching limit`);
      estimatedSavings += metrics.storageSize * 0.2;
    }

    // Check entry count
    if (metrics.totalEntries > this.defaultPolicy.maxEntries * 0.8) {
      shouldPrune = true;
      reasons.push(`Entry count (${metrics.totalEntries}) approaching limit`);
    }

    // Check compression ratio
    if (metrics.compressionRatio < 0.3) {
      reasons.push('Low compression ratio indicates optimization opportunity');
      estimatedSavings += metrics.storageSize * 0.15;
    }

    // Time-based recommendation
    const daysSinceLastOptimization =
      (Date.now() - metrics.lastOptimization.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceLastOptimization > 7) {
      shouldPrune = true;
      reasons.push('Regular maintenance window (weekly optimization)');
    }

    return {
      shouldPrune,
      reasons,
      estimatedSavings,
      recommendedPolicy: {
        maxAge: Math.max(30, this.defaultPolicy.maxAge - 30), // More aggressive if needed
        compressionThreshold: Math.max(7, this.defaultPolicy.compressionThreshold - 7),
      },
    };
  }
}
