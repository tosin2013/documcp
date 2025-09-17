/**
 * JSONL-based persistent storage for DocuMCP memory system
 * Implements Issue #45: Persistent JSONL Storage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createHash } from 'crypto';

export interface MemoryEntry {
  id: string;
  timestamp: string;
  type: 'analysis' | 'recommendation' | 'deployment' | 'configuration' | 'interaction';
  data: Record<string, any>;
  metadata: {
    projectId?: string;
    repository?: string;
    ssg?: string;
    tags?: string[];
    version?: string;
    compressed?: boolean;
    compressionType?: string;
    compressedAt?: string;
    originalSize?: number;
    merged?: boolean;
    mergedCount?: number;
    mergedAt?: string;
  };
  tags?: string[]; // Convenience field for direct access
  embeddings?: number[];
  checksum?: string;
}

export class JSONLStorage {
  private readonly storageDir: string;
  private readonly indexFile: string;
  private index: Map<string, { file: string; line: number; size: number }>;
  private lineCounters: Map<string, number>; // Track line count per file

  constructor(baseDir?: string) {
    this.storageDir = baseDir || path.join(process.env.HOME || '', '.documcp', 'memory');
    this.indexFile = path.join(this.storageDir, '.index.json');
    this.index = new Map();
    this.lineCounters = new Map();
  }

  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.storageDir, { recursive: true });
    await this.loadIndex();
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexData = await fs.promises.readFile(this.indexFile, 'utf-8');
      const data = JSON.parse(indexData);

      // Handle both old format (just entries) and new format (with line counters)
      if (Array.isArray(data)) {
        this.index = new Map(data);
        // Rebuild line counters for existing data
        await this.rebuildLineCounters();
      } else {
        this.index = new Map(data.entries || []);
        this.lineCounters = new Map(Object.entries(data.lineCounters || {}));
      }
    } catch (error) {
      this.index = new Map();
      this.lineCounters = new Map();
    }
  }

  private async saveIndex(): Promise<void> {
    const data = {
      entries: Array.from(this.index.entries()),
      lineCounters: Object.fromEntries(this.lineCounters.entries()),
    };
    await fs.promises.writeFile(this.indexFile, JSON.stringify(data, null, 2));
  }

  private getFileName(type: MemoryEntry['type'], timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${type}_${year}_${month}.jsonl`;
  }

  private generateId(entry: Omit<MemoryEntry, 'id' | 'checksum'>): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify({ type: entry.type, data: entry.data }));
    return hash.digest('hex').substring(0, 16);
  }

  private generateChecksum(data: any): string {
    const hash = createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  async append(entry: Omit<MemoryEntry, 'id' | 'checksum'>): Promise<MemoryEntry> {
    const id = this.generateId(entry);
    const checksum = this.generateChecksum(entry.data);
    const completeEntry: MemoryEntry = {
      ...entry,
      id,
      checksum,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const fileName = this.getFileName(completeEntry.type, completeEntry.timestamp);
    const filePath = path.join(this.storageDir, fileName);

    const line = JSON.stringify(completeEntry);
    await fs.promises.appendFile(filePath, line + '\n');

    // Efficiently track line numbers using a counter
    const currentLineCount = this.lineCounters.get(fileName) || 0;
    const lineNumber = currentLineCount + 1;
    this.lineCounters.set(fileName, lineNumber);

    this.index.set(id, {
      file: fileName,
      line: lineNumber,
      size: Buffer.byteLength(line),
    });

    await this.saveIndex();
    return completeEntry;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const location = this.index.get(id);
    if (!location) return null;

    const filePath = path.join(this.storageDir, location.file);
    const stream = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    for await (const line of stream) {
      lineNumber++;
      if (lineNumber === location.line) {
        stream.close();
        return JSON.parse(line);
      }
    }

    return null;
  }

  async query(filter: {
    type?: MemoryEntry['type'];
    projectId?: string;
    repository?: string;
    ssg?: string;
    tags?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<MemoryEntry[]> {
    const results: MemoryEntry[] = [];
    const files = await this.getRelevantFiles(filter);

    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      const stream = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      for await (const line of stream) {
        const entry: MemoryEntry = JSON.parse(line);

        if (this.matchesFilter(entry, filter)) {
          results.push(entry);
          if (filter.limit && results.length >= filter.limit) {
            stream.close();
            return results;
          }
        }
      }
    }

    return results;
  }

  private async getRelevantFiles(filter: any): Promise<string[]> {
    const files = await fs.promises.readdir(this.storageDir);
    return files
      .filter((f) => f.endsWith('.jsonl'))
      .filter((file) => {
        if (!filter.type) return true;
        return file.startsWith(filter.type);
      });
  }

  private matchesFilter(entry: MemoryEntry, filter: any): boolean {
    if (filter.type && entry.type !== filter.type) return false;
    if (filter.projectId && entry.metadata.projectId !== filter.projectId) return false;
    if (filter.repository && entry.metadata.repository !== filter.repository) return false;
    if (filter.ssg && entry.metadata.ssg !== filter.ssg) return false;

    if (filter.tags && filter.tags.length > 0) {
      const entryTags = entry.metadata.tags || [];
      if (!filter.tags.some((tag: any) => entryTags.includes(tag))) return false;
    }

    if (filter.startDate && entry.timestamp < filter.startDate) return false;
    if (filter.endDate && entry.timestamp > filter.endDate) return false;

    return true;
  }

  async delete(id: string): Promise<boolean> {
    const location = this.index.get(id);
    if (!location) return false;

    this.index.delete(id);
    await this.saveIndex();
    return true;
  }

  async compact(type?: MemoryEntry['type']): Promise<void> {
    const files = await this.getRelevantFiles({ type });

    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      const tempPath = filePath + '.tmp';
      const validEntries: string[] = [];

      const stream = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      for await (const line of stream) {
        try {
          const entry: MemoryEntry = JSON.parse(line);
          if (this.index.has(entry.id)) {
            validEntries.push(line);
          }
        } catch (error) {
          // Skip invalid lines
        }
      }

      await fs.promises.writeFile(tempPath, validEntries.join('\n') + '\n');
      await fs.promises.rename(tempPath, filePath);
    }
  }

  private async countLines(filePath: string): Promise<number> {
    const stream = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of stream) {
      count++;
    }
    return count;
  }

  async getStatistics(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    byMonth: Record<string, number>;
    totalSize: number;
  }> {
    const stats = {
      totalEntries: this.index.size,
      byType: {} as Record<string, number>,
      byMonth: {} as Record<string, number>,
      totalSize: 0,
    };

    const files = await fs.promises.readdir(this.storageDir);
    for (const file of files.filter((f) => f.endsWith('.jsonl'))) {
      const filePath = path.join(this.storageDir, file);
      const fileStats = await fs.promises.stat(filePath);
      stats.totalSize += fileStats.size;

      const match = file.match(/^(\w+)_(\d{4})_(\d{2})\.jsonl$/);
      if (match) {
        const [, type, year, month] = match;
        const monthKey = `${year}-${month}`;

        stats.byType[type] = (stats.byType[type] || 0) + 1;
        stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Get all memory entries
   */
  async getAll(): Promise<MemoryEntry[]> {
    const entries: MemoryEntry[] = [];

    for (const [id] of this.index) {
      const entry = await this.get(id);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Update an existing memory entry
   */
  async update(id: string, updatedEntry: MemoryEntry): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    // Delete the old entry and store the updated one
    await this.delete(id);
    const newEntry = await this.append(updatedEntry);
    return newEntry.id === id;
  }

  /**
   * Store a new memory entry (preserves ID if provided)
   */
  async store(entry: MemoryEntry): Promise<MemoryEntry> {
    const entryToStore = {
      ...entry,
      tags: entry.tags || entry.metadata?.tags || [],
    };

    // If the entry already has an ID, use it directly instead of generating a new one
    if (entry.id) {
      const checksum = this.generateChecksum(entry.data);
      const completeEntry: MemoryEntry = {
        ...entryToStore,
        checksum,
        timestamp: entry.timestamp || new Date().toISOString(),
      };

      const fileName = this.getFileName(completeEntry.type, completeEntry.timestamp);
      const filePath = path.join(this.storageDir, fileName);

      const line = JSON.stringify(completeEntry);
      await fs.promises.appendFile(filePath, line + '\n');

      // Efficiently track line numbers using a counter
      const currentLineCount = this.lineCounters.get(fileName) || 0;
      const lineNumber = currentLineCount + 1;
      this.lineCounters.set(fileName, lineNumber);

      this.index.set(entry.id, {
        file: fileName,
        line: lineNumber,
        size: Buffer.byteLength(line),
      });

      await this.saveIndex();
      return completeEntry;
    }

    return this.append(entryToStore);
  }

  /**
   * Rebuild the index from all storage files
   */
  async rebuildIndex(): Promise<void> {
    this.index.clear();

    const files = await fs.promises.readdir(this.storageDir);
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    for (const file of jsonlFiles) {
      const filePath = path.join(this.storageDir, file);
      const stream = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      let lineNumber = 0;
      for await (const line of stream) {
        try {
          const entry: MemoryEntry = JSON.parse(line);
          const size = Buffer.byteLength(line, 'utf8');

          this.index.set(entry.id, {
            file,
            line: lineNumber,
            size,
          });

          lineNumber++;
        } catch (error) {
          // Skip invalid lines
          lineNumber++;
        }
      }
    }

    await this.saveIndex();
  }

  private async rebuildLineCounters(): Promise<void> {
    this.lineCounters.clear();

    // Get all unique file names from the index
    const fileNames = new Set<string>();
    for (const [, location] of this.index) {
      fileNames.add(location.file);
    }

    // Count lines for each file
    for (const fileName of fileNames) {
      const filePath = path.join(this.storageDir, fileName);
      try {
        const lineCount = await this.countLines(filePath);
        this.lineCounters.set(fileName, lineCount);
      } catch (error) {
        // File might not exist, set to 0
        this.lineCounters.set(fileName, 0);
      }
    }
  }

  async close(): Promise<void> {
    // Clear the index and line counters to free memory
    this.index.clear();
    this.lineCounters.clear();
  }
}

export default JSONLStorage;
