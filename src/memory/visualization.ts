/**
 * Memory Visualization Interface for DocuMCP
 * Generate visual representations of memory data, patterns, and insights
 */

import { EventEmitter } from 'events';
import { MemoryEntry, JSONLStorage } from './storage.js';
import { MemoryManager } from './manager.js';
import { IncrementalLearningSystem } from './learning.js';
import { KnowledgeGraph } from './knowledge-graph.js';
import { TemporalMemoryAnalysis } from './temporal-analysis.js';

export interface VisualizationConfig {
  width: number;
  height: number;
  theme: 'light' | 'dark' | 'auto';
  colorScheme: string[];
  interactive: boolean;
  exportFormat: 'svg' | 'png' | 'json' | 'html';
  responsive: boolean;
}

export interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | 'network' | 'sankey' | 'treemap' | 'timeline';
  title: string;
  description: string;
  data: any;
  config: Partial<VisualizationConfig>;
  metadata: {
    generated: Date;
    dataPoints: number;
    timeRange?: { start: Date; end: Date };
    filters?: Record<string, any>;
  };
}

export interface DashboardData {
  title: string;
  description: string;
  charts: ChartData[];
  summary: {
    totalEntries: number;
    timeRange: { start: Date; end: Date };
    keyInsights: string[];
    healthScore: number;
  };
  generated: Date;
}

export interface NetworkVisualization {
  nodes: Array<{
    id: string;
    label: string;
    group: string;
    size: number;
    color: string;
    metadata: any;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    type: string;
    color: string;
    metadata: any;
  }>;
  layout: 'force' | 'circular' | 'hierarchical' | 'grid';
  clustering: boolean;
}

export interface HeatmapVisualization {
  data: number[][];
  labels: {
    x: string[];
    y: string[];
  };
  colorScale: {
    min: number;
    max: number;
    colors: string[];
  };
  title: string;
  description: string;
}

export interface TimelineVisualization {
  events: Array<{
    id: string;
    timestamp: Date;
    title: string;
    description: string;
    type: string;
    importance: number;
    color: string;
    metadata: any;
  }>;
  timeRange: { start: Date; end: Date };
  granularity: 'hour' | 'day' | 'week' | 'month';
  groupBy?: string;
}

export class MemoryVisualizationSystem extends EventEmitter {
  private storage: JSONLStorage;
  private manager: MemoryManager;
  private learningSystem: IncrementalLearningSystem;
  private knowledgeGraph: KnowledgeGraph;
  private temporalAnalysis: TemporalMemoryAnalysis;
  private defaultConfig: VisualizationConfig;
  private visualizationCache: Map<string, ChartData>;

  constructor(
    storage: JSONLStorage,
    manager: MemoryManager,
    learningSystem: IncrementalLearningSystem,
    knowledgeGraph: KnowledgeGraph,
    temporalAnalysis: TemporalMemoryAnalysis,
  ) {
    super();
    this.storage = storage;
    this.manager = manager;
    this.learningSystem = learningSystem;
    this.knowledgeGraph = knowledgeGraph;
    this.temporalAnalysis = temporalAnalysis;
    this.visualizationCache = new Map();

    this.defaultConfig = {
      width: 800,
      height: 600,
      theme: 'light',
      colorScheme: [
        '#3B82F6', // Blue
        '#10B981', // Green
        '#F59E0B', // Yellow
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#06B6D4', // Cyan
        '#F97316', // Orange
        '#84CC16', // Lime
      ],
      interactive: true,
      exportFormat: 'svg',
      responsive: true,
    };
  }

  /**
   * Generate comprehensive dashboard
   */
  async generateDashboard(options?: {
    timeRange?: { start: Date; end: Date };
    includeCharts?: string[];
    config?: Partial<VisualizationConfig>;
  }): Promise<DashboardData> {
    const timeRange = options?.timeRange || this.getDefaultTimeRange();
    const config = { ...this.defaultConfig, ...options?.config };

    this.emit('dashboard_generation_started', { timeRange });

    try {
      const charts: ChartData[] = [];

      // Activity Timeline
      if (!options?.includeCharts || options.includeCharts.includes('activity')) {
        charts.push(await this.generateActivityTimeline(timeRange, config));
      }

      // Memory Type Distribution
      if (!options?.includeCharts || options.includeCharts.includes('distribution')) {
        charts.push(await this.generateMemoryTypeDistribution(timeRange, config));
      }

      // Success Rate Trends
      if (!options?.includeCharts || options.includeCharts.includes('success')) {
        charts.push(await this.generateSuccessRateTrends(timeRange, config));
      }

      // Knowledge Graph Network
      if (!options?.includeCharts || options.includeCharts.includes('network')) {
        charts.push(await this.generateKnowledgeGraphVisualization(config));
      }

      // Learning Patterns Heatmap
      if (!options?.includeCharts || options.includeCharts.includes('learning')) {
        charts.push(await this.generateLearningPatternsHeatmap(config));
      }

      // Temporal Patterns
      if (!options?.includeCharts || options.includeCharts.includes('temporal')) {
        charts.push(await this.generateTemporalPatternsChart(timeRange, config));
      }

      // Project Correlation Matrix
      if (!options?.includeCharts || options.includeCharts.includes('correlation')) {
        charts.push(await this.generateProjectCorrelationMatrix(timeRange, config));
      }

      // Get summary data
      const entries = await this.getEntriesInTimeRange(timeRange);
      const keyInsights = await this.generateKeyInsights(entries, timeRange);
      const healthScore = await this.calculateSystemHealthScore(entries);

      const dashboard: DashboardData = {
        title: 'DocuMCP Memory System Dashboard',
        description: `Comprehensive overview of memory system activity from ${timeRange.start.toLocaleDateString()} to ${timeRange.end.toLocaleDateString()}`,
        charts,
        summary: {
          totalEntries: entries.length,
          timeRange,
          keyInsights,
          healthScore,
        },
        generated: new Date(),
      };

      this.emit('dashboard_generated', {
        charts: charts.length,
        entries: entries.length,
        timeRange,
      });

      return dashboard;
    } catch (error) {
      this.emit('dashboard_error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate activity timeline chart
   */
  async generateActivityTimeline(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const entries = await this.getEntriesInTimeRange(timeRange);

    // Group entries by day
    const dailyData = new Map<string, number>();
    const successData = new Map<string, number>();

    for (const entry of entries) {
      const day = entry.timestamp.slice(0, 10); // YYYY-MM-DD
      dailyData.set(day, (dailyData.get(day) || 0) + 1);

      if (entry.data.outcome === 'success' || entry.data.success === true) {
        successData.set(day, (successData.get(day) || 0) + 1);
      }
    }

    // Create time series data
    const datasets = [
      {
        label: 'Total Activity',
        data: Array.from(dailyData.entries()).map(([date, count]) => ({
          x: date,
          y: count,
        })),
        borderColor: config.colorScheme?.[0] || '#3B82F6',
        backgroundColor: config.colorScheme?.[0] || '#3B82F6',
        fill: false,
      },
      {
        label: 'Successful Activities',
        data: Array.from(successData.entries()).map(([date, count]) => ({
          x: date,
          y: count,
        })),
        borderColor: config.colorScheme?.[1] || '#10B981',
        backgroundColor: config.colorScheme?.[1] || '#10B981',
        fill: false,
      },
    ];

    return {
      type: 'line',
      title: 'Memory Activity Timeline',
      description: 'Daily memory system activity showing total entries and successful outcomes',
      data: {
        datasets,
        options: {
          responsive: config.responsive,
          plugins: {
            title: {
              display: true,
              text: 'Memory Activity Over Time',
            },
            legend: {
              display: true,
              position: 'top',
            },
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
              },
              title: {
                display: true,
                text: 'Date',
              },
            },
            y: {
              title: {
                display: true,
                text: 'Number of Entries',
              },
            },
          },
        },
      },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: entries.length,
        timeRange,
        filters: { type: 'activity_timeline' },
      },
    };
  }

  /**
   * Generate memory type distribution chart
   */
  async generateMemoryTypeDistribution(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const entries = await this.getEntriesInTimeRange(timeRange);

    // Count entries by type
    const typeCounts = new Map<string, number>();
    for (const entry of entries) {
      typeCounts.set(entry.type, (typeCounts.get(entry.type) || 0) + 1);
    }

    // Sort by count
    const sortedTypes = Array.from(typeCounts.entries()).sort(([, a], [, b]) => b - a);

    const data = {
      labels: sortedTypes.map(([type]) => type),
      datasets: [
        {
          data: sortedTypes.map(([, count]) => count),
          backgroundColor: config.colorScheme || this.defaultConfig.colorScheme,
          borderColor:
            config.colorScheme?.map((c) => this.darkenColor(c)) ||
            this.defaultConfig.colorScheme.map((c) => this.darkenColor(c)),
          borderWidth: 2,
        },
      ],
    };

    return {
      type: 'bar',
      title: 'Memory Type Distribution',
      description: 'Distribution of memory entries by type',
      data: {
        ...data,
        options: {
          responsive: config.responsive,
          plugins: {
            title: {
              display: true,
              text: 'Memory Entry Types',
            },
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Entries',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Memory Type',
              },
            },
          },
        },
      },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: entries.length,
        timeRange,
        filters: { type: 'type_distribution' },
      },
    };
  }

  /**
   * Generate success rate trends chart
   */
  async generateSuccessRateTrends(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const entries = await this.getEntriesInTimeRange(timeRange);

    // Group by week and calculate success rates
    const weeklyData = new Map<string, { total: number; successful: number }>();

    for (const entry of entries) {
      const week = this.getWeekKey(new Date(entry.timestamp));
      const current = weeklyData.get(week) || { total: 0, successful: 0 };

      current.total++;
      if (entry.data.outcome === 'success' || entry.data.success === true) {
        current.successful++;
      }

      weeklyData.set(week, current);
    }

    // Calculate success rates
    const data = Array.from(weeklyData.entries())
      .map(([week, stats]) => ({
        x: week,
        y: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
        total: stats.total,
        successful: stats.successful,
      }))
      .sort((a, b) => a.x.localeCompare(b.x));

    return {
      type: 'line',
      title: 'Success Rate Trends',
      description: 'Weekly success rate trends for memory system operations',
      data: {
        datasets: [
          {
            label: 'Success Rate (%)',
            data: data,
            borderColor: config.colorScheme?.[1] || '#10B981',
            backgroundColor: config.colorScheme?.[1] || '#10B981',
            fill: false,
            tension: 0.1,
          },
        ],
        options: {
          responsive: config.responsive,
          plugins: {
            title: {
              display: true,
              text: 'Success Rate Over Time',
            },
            tooltip: {
              callbacks: {
                afterBody: (context: any) => {
                  const point = data[context[0].dataIndex];
                  return `Total: ${point.total}, Successful: ${point.successful}`;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Week',
              },
            },
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Success Rate (%)',
              },
            },
          },
        },
      },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: data.length,
        timeRange,
        filters: { type: 'success_trends' },
      },
    };
  }

  /**
   * Generate knowledge graph network visualization
   */
  async generateKnowledgeGraphVisualization(
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const allNodes = await this.knowledgeGraph.getAllNodes();
    const allEdges = await this.knowledgeGraph.getAllEdges();

    // Prepare network data
    const networkData: NetworkVisualization = {
      nodes: allNodes.map((node) => ({
        id: node.id,
        label: node.label || node.id.slice(0, 10),
        group: node.type,
        size: Math.max(10, Math.min(30, (node.weight || 1) * 10)),
        color: this.getColorForNodeType(node.type, config.colorScheme),
        metadata: node.properties,
      })),
      edges: allEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        type: edge.type,
        color: this.getColorForEdgeType(edge.type, config.colorScheme),
        metadata: edge.properties,
      })),
      layout: 'force',
      clustering: true,
    };

    return {
      type: 'network',
      title: 'Knowledge Graph Network',
      description: 'Interactive network visualization of memory relationships and connections',
      data: networkData,
      config,
      metadata: {
        generated: new Date(),
        dataPoints: allNodes.length + allEdges.length,
        filters: { type: 'knowledge_graph' },
      },
    };
  }

  /**
   * Generate learning patterns heatmap
   */
  async generateLearningPatternsHeatmap(config: Partial<VisualizationConfig>): Promise<ChartData> {
    const patterns = await this.learningSystem.getPatterns();

    // Create correlation matrix between different pattern dimensions
    const frameworks = [
      ...new Set(
        patterns
          .flatMap((p) => p.metadata.technologies || [])
          .filter(
            (t) =>
              t.includes('framework') ||
              t.includes('js') ||
              t.includes('react') ||
              t.includes('vue'),
          ),
      ),
    ];
    const languages = [
      ...new Set(
        patterns
          .flatMap((p) => p.metadata.technologies || [])
          .filter((t) => !t.includes('framework')),
      ),
    ];

    const heatmapData: number[][] = [];
    const labels = { x: frameworks, y: languages };

    for (const language of languages) {
      const row: number[] = [];
      for (const framework of frameworks) {
        // Calculate correlation/co-occurrence
        const langPatterns = patterns.filter((p) => p.metadata.technologies?.includes(language));
        const frameworkPatterns = patterns.filter(
          (p) => p.metadata.technologies?.includes(framework),
        );
        const bothPatterns = patterns.filter(
          (p) =>
            p.metadata.technologies?.includes(language) &&
            p.metadata.technologies?.includes(framework),
        );

        const correlation =
          langPatterns.length > 0 && frameworkPatterns.length > 0
            ? bothPatterns.length / Math.min(langPatterns.length, frameworkPatterns.length)
            : 0;

        row.push(correlation);
      }
      heatmapData.push(row);
    }

    const heatmap: HeatmapVisualization = {
      data: heatmapData,
      labels,
      colorScale: {
        min: 0,
        max: 1,
        colors: ['#F3F4F6', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E3A8A'],
      },
      title: 'Language-Framework Learning Patterns',
      description:
        'Correlation matrix showing relationships between programming languages and frameworks in learning patterns',
    };

    return {
      type: 'heatmap',
      title: 'Learning Patterns Heatmap',
      description: 'Visualization of learning pattern correlations across languages and frameworks',
      data: heatmap,
      config,
      metadata: {
        generated: new Date(),
        dataPoints: patterns.length,
        filters: { type: 'learning_patterns' },
      },
    };
  }

  /**
   * Generate temporal patterns chart
   */
  async generateTemporalPatternsChart(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const patterns = await this.temporalAnalysis.analyzeTemporalPatterns({
      granularity: 'day',
      aggregation: 'count',
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
        duration: timeRange.end.getTime() - timeRange.start.getTime(),
        label: 'Analysis Period',
      },
    });

    // Prepare data for different pattern types
    const patternData = patterns.map((pattern) => ({
      type: pattern.type,
      confidence: pattern.confidence,
      description: pattern.description,
      dataPoints: pattern.dataPoints?.length || 0,
    }));

    const data = {
      labels: patternData.map((p) => p.type),
      datasets: [
        {
          label: 'Pattern Confidence',
          data: patternData.map((p) => p.confidence * 100),
          backgroundColor: config.colorScheme || this.defaultConfig.colorScheme,
          borderColor:
            config.colorScheme?.map((c) => this.darkenColor(c)) ||
            this.defaultConfig.colorScheme.map((c) => this.darkenColor(c)),
          borderWidth: 2,
        },
      ],
    };

    return {
      type: 'bar',
      title: 'Temporal Patterns Analysis',
      description: 'Confidence levels of detected temporal patterns in memory activity',
      data: {
        ...data,
        options: {
          responsive: config.responsive,
          plugins: {
            title: {
              display: true,
              text: 'Detected Temporal Patterns',
            },
            tooltip: {
              callbacks: {
                afterBody: (context: any) => {
                  const pattern = patternData[context[0].dataIndex];
                  return pattern.description;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Confidence (%)',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Pattern Type',
              },
            },
          },
        },
      },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: patterns.length,
        timeRange,
        filters: { type: 'temporal_patterns' },
      },
    };
  }

  /**
   * Generate project correlation matrix
   */
  async generateProjectCorrelationMatrix(
    timeRange: { start: Date; end: Date },
    config: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const entries = await this.getEntriesInTimeRange(timeRange);

    // Extract unique projects
    const projects = [
      ...new Set(
        entries
          .map((e) => e.data.projectPath || e.data.projectId || 'Unknown')
          .filter((p) => p !== 'Unknown'),
      ),
    ].slice(0, 10); // Limit to top 10

    // Calculate correlation matrix
    const correlationMatrix: number[][] = [];

    for (const project1 of projects) {
      const row: number[] = [];
      for (const project2 of projects) {
        if (project1 === project2) {
          row.push(1.0);
        } else {
          const correlation = this.calculateProjectCorrelation(entries, project1, project2);
          row.push(correlation);
        }
      }
      correlationMatrix.push(row);
    }

    const heatmap: HeatmapVisualization = {
      data: correlationMatrix,
      labels: { x: projects, y: projects },
      colorScale: {
        min: -1,
        max: 1,
        colors: ['#EF4444', '#F59E0B', '#F3F4F6', '#10B981', '#059669'],
      },
      title: 'Project Correlation Matrix',
      description:
        'Correlation matrix showing relationships between different projects based on memory patterns',
    };

    return {
      type: 'heatmap',
      title: 'Project Correlations',
      description: 'Visualization of correlations between different projects in the memory system',
      data: heatmap,
      config,
      metadata: {
        generated: new Date(),
        dataPoints: projects.length * projects.length,
        timeRange,
        filters: { type: 'project_correlation' },
      },
    };
  }

  /**
   * Generate custom visualization
   */
  async generateCustomVisualization(
    type: ChartData['type'],
    query: {
      filters?: Record<string, any>;
      timeRange?: { start: Date; end: Date };
      aggregation?: string;
      groupBy?: string;
    },
    config?: Partial<VisualizationConfig>,
  ): Promise<ChartData> {
    const activeConfig = { ...this.defaultConfig, ...config };
    const timeRange = query.timeRange || this.getDefaultTimeRange();

    let entries = await this.getEntriesInTimeRange(timeRange);

    // Apply filters
    if (query.filters) {
      entries = this.applyFilters(entries, query.filters);
    }

    switch (type) {
      case 'timeline':
        return this.generateTimelineVisualization(entries, query, activeConfig);
      case 'scatter':
        return this.generateScatterPlot(entries, query, activeConfig);
      case 'treemap':
        return this.generateTreemapVisualization(entries, query, activeConfig);
      case 'sankey':
        return this.generateSankeyDiagram(entries, query, activeConfig);
      default:
        throw new Error(`Unsupported visualization type: ${type}`);
    }
  }

  /**
   * Export visualization to specified format
   */
  async exportVisualization(
    chartData: ChartData,
    format: 'svg' | 'png' | 'json' | 'html' = 'json',
    options?: {
      filename?: string;
      quality?: number;
      width?: number;
      height?: number;
    },
  ): Promise<string | Buffer> {
    this.emit('export_started', { type: chartData.type, format });

    try {
      switch (format) {
        case 'json':
          return JSON.stringify(chartData, null, 2);

        case 'html':
          return this.generateHTMLVisualization(chartData, options);

        case 'svg':
          return this.generateSVGVisualization(chartData, options);

        case 'png':
          // This would require a rendering library like Puppeteer
          throw new Error('PNG export requires additional rendering capabilities');

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.emit('export_error', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getEntriesInTimeRange(timeRange: {
    start: Date;
    end: Date;
  }): Promise<MemoryEntry[]> {
    const allEntries = await this.storage.getAll();
    return allEntries.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= timeRange.start && entryDate <= timeRange.end;
    });
  }

  private getDefaultTimeRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { start, end };
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getColorForNodeType(type: string, colorScheme?: string[]): string {
    const colors = colorScheme || this.defaultConfig.colorScheme;
    const index = type.charCodeAt(0) % colors.length;
    return colors[index];
  }

  private getColorForEdgeType(type: string, colorScheme?: string[]): string {
    const colors = colorScheme || this.defaultConfig.colorScheme;
    const typeColors: Record<string, string> = {
      similarity: colors[0],
      dependency: colors[1],
      temporal: colors[2],
      causal: colors[3],
    };
    return typeColors[type] || colors[4];
  }

  private darkenColor(color: string): string {
    // Simple color darkening - in production, use a proper color library
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);
      const r = Math.max(0, (num >> 16) - 40);
      const g = Math.max(0, ((num >> 8) & 0x00ff) - 40);
      const b = Math.max(0, (num & 0x0000ff) - 40);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  private calculateProjectCorrelation(
    entries: MemoryEntry[],
    project1: string,
    project2: string,
  ): number {
    const entries1 = entries.filter(
      (e) => e.data.projectPath?.includes(project1) || e.data.projectId === project1,
    );
    const entries2 = entries.filter(
      (e) => e.data.projectPath?.includes(project2) || e.data.projectId === project2,
    );

    if (entries1.length === 0 || entries2.length === 0) return 0;

    // Simple correlation based on shared characteristics
    let sharedFeatures = 0;
    let totalFeatures = 0;

    // Compare languages
    const lang1 = new Set(entries1.map((e) => e.data.language).filter(Boolean));
    const lang2 = new Set(entries2.map((e) => e.data.language).filter(Boolean));
    const sharedLangs = new Set([...lang1].filter((l) => lang2.has(l)));
    sharedFeatures += sharedLangs.size;
    totalFeatures += new Set([...lang1, ...lang2]).size;

    // Compare frameworks
    const fw1 = new Set(entries1.map((e) => e.data.framework).filter(Boolean));
    const fw2 = new Set(entries2.map((e) => e.data.framework).filter(Boolean));
    const sharedFws = new Set([...fw1].filter((f) => fw2.has(f)));
    sharedFeatures += sharedFws.size;
    totalFeatures += new Set([...fw1, ...fw2]).size;

    return totalFeatures > 0 ? sharedFeatures / totalFeatures : 0;
  }

  private applyFilters(entries: MemoryEntry[], filters: Record<string, any>): MemoryEntry[] {
    return entries.filter((entry) => {
      for (const [key, value] of Object.entries(filters)) {
        switch (key) {
          case 'type':
            if (Array.isArray(value) && !value.includes(entry.type)) return false;
            if (typeof value === 'string' && entry.type !== value) return false;
            break;
          case 'outcome':
            if (entry.data.outcome !== value) return false;
            break;
          case 'language':
            if (entry.data.language !== value) return false;
            break;
          case 'framework':
            if (entry.data.framework !== value) return false;
            break;
          case 'project':
            if (!entry.data.projectPath?.includes(value) && entry.data.projectId !== value) {
              return false;
            }
            break;
          case 'tags':
            if (Array.isArray(value) && !value.some((tag) => entry.tags?.includes(tag))) {
              return false;
            }
            break;
        }
      }
      return true;
    });
  }

  private async generateKeyInsights(
    entries: MemoryEntry[],
    timeRange: { start: Date; end: Date },
  ): Promise<string[]> {
    const insights: string[] = [];

    // Activity insight
    const dailyAverage =
      entries.length /
      Math.max(
        1,
        Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000)),
      );
    insights.push(`Average ${dailyAverage.toFixed(1)} entries per day`);

    // Success rate insight
    const successful = entries.filter(
      (e) => e.data.outcome === 'success' || e.data.success === true,
    ).length;
    const successRate = entries.length > 0 ? (successful / entries.length) * 100 : 0;
    insights.push(`${successRate.toFixed(1)}% success rate`);

    // Most common type
    const typeCounts = new Map<string, number>();
    entries.forEach((e) => typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1));
    const mostCommonType = Array.from(typeCounts.entries()).sort(([, a], [, b]) => b - a)[0];
    if (mostCommonType) {
      insights.push(`Most common activity: ${mostCommonType[0]} (${mostCommonType[1]} entries)`);
    }

    // Growth trend
    const midpoint = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2);
    const firstHalf = entries.filter((e) => new Date(e.timestamp) < midpoint).length;
    const secondHalf = entries.filter((e) => new Date(e.timestamp) >= midpoint).length;
    if (firstHalf > 0) {
      const growthRate = ((secondHalf - firstHalf) / firstHalf) * 100;
      insights.push(
        `Activity ${growthRate >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(
          1,
        )}%`,
      );
    }

    return insights.slice(0, 5); // Return top 5 insights
  }

  private async calculateSystemHealthScore(entries: MemoryEntry[]): Promise<number> {
    let score = 0;

    // Activity level (0-25 points)
    const recentEntries = entries.filter(
      (e) => new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
    score += Math.min(25, recentEntries.length * 2);

    // Success rate (0-25 points)
    const successful = entries.filter(
      (e) => e.data.outcome === 'success' || e.data.success === true,
    ).length;
    const successRate = entries.length > 0 ? successful / entries.length : 0;
    score += successRate * 25;

    // Diversity (0-25 points)
    const uniqueTypes = new Set(entries.map((e) => e.type)).size;
    score += Math.min(25, uniqueTypes * 3);

    // Consistency (0-25 points)
    if (entries.length >= 7) {
      const dailyActivities = new Map<string, number>();
      entries.forEach((e) => {
        const day = e.timestamp.slice(0, 10);
        dailyActivities.set(day, (dailyActivities.get(day) || 0) + 1);
      });

      const values = Array.from(dailyActivities.values());
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const consistency = mean > 0 ? Math.max(0, 1 - Math.sqrt(variance) / mean) : 0;
      score += consistency * 25;
    }

    return Math.round(Math.min(100, score));
  }

  private generateTimelineVisualization(
    entries: MemoryEntry[],
    query: any,
    config: VisualizationConfig,
  ): ChartData {
    const events = entries.map((entry) => ({
      id: entry.id,
      timestamp: new Date(entry.timestamp),
      title: entry.type,
      description: entry.data.description || `${entry.type} entry`,
      type: entry.type,
      importance: entry.data.outcome === 'success' ? 1 : 0.5,
      color: this.getColorForNodeType(entry.type, config.colorScheme),
      metadata: entry.data,
    }));

    const timelineData: TimelineVisualization = {
      events,
      timeRange: {
        start: new Date(Math.min(...events.map((e) => e.timestamp.getTime()))),
        end: new Date(Math.max(...events.map((e) => e.timestamp.getTime()))),
      },
      granularity: 'day',
      groupBy: query.groupBy,
    };

    return {
      type: 'timeline',
      title: 'Memory Activity Timeline',
      description: 'Chronological timeline of memory system activities',
      data: timelineData,
      config,
      metadata: {
        generated: new Date(),
        dataPoints: events.length,
        filters: query.filters,
      },
    };
  }

  private generateScatterPlot(
    entries: MemoryEntry[],
    query: any,
    config: VisualizationConfig,
  ): ChartData {
    // Create scatter plot data based on timestamp vs some metric
    const data = entries.map((entry) => ({
      x: new Date(entry.timestamp).getTime(),
      y: entry.data.duration || entry.data.complexity || Math.random(), // Use available metric
      color: this.getColorForNodeType(entry.type, config.colorScheme),
      metadata: entry,
    }));

    return {
      type: 'scatter',
      title: 'Memory Activity Scatter Plot',
      description: 'Scatter plot visualization of memory activities',
      data: {
        datasets: [
          {
            label: 'Activities',
            data: data,
            backgroundColor: data.map((d) => d.color),
          },
        ],
      },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: data.length,
        filters: query.filters,
      },
    };
  }

  private generateTreemapVisualization(
    entries: MemoryEntry[],
    query: any,
    config: VisualizationConfig,
  ): ChartData {
    // Group entries by type and project for treemap
    const hierarchy = new Map<string, Map<string, number>>();

    for (const entry of entries) {
      const type = entry.type;
      const project = entry.data.projectPath || entry.data.projectId || 'Unknown';

      if (!hierarchy.has(type)) {
        hierarchy.set(type, new Map());
      }
      hierarchy.get(type)!.set(project, (hierarchy.get(type)!.get(project) || 0) + 1);
    }

    // Convert to treemap format
    const treemapData = Array.from(hierarchy.entries()).map(([type, projects]) => ({
      name: type,
      value: Array.from(projects.values()).reduce((sum, val) => sum + val, 0),
      children: Array.from(projects.entries()).map(([project, count]) => ({
        name: project,
        value: count,
      })),
    }));

    return {
      type: 'treemap',
      title: 'Memory Type Hierarchy',
      description: 'Hierarchical treemap of memory entries by type and project',
      data: treemapData,
      config,
      metadata: {
        generated: new Date(),
        dataPoints: entries.length,
        filters: query.filters,
      },
    };
  }

  private generateSankeyDiagram(
    entries: MemoryEntry[],
    query: any,
    config: VisualizationConfig,
  ): ChartData {
    // Create flow data from entry types to outcomes
    const flows = new Map<string, Map<string, number>>();

    for (const entry of entries) {
      const source = entry.type;
      const target = entry.data.outcome || (entry.data.success ? 'success' : 'unknown');

      if (!flows.has(source)) {
        flows.set(source, new Map());
      }
      flows.get(source)!.set(target, (flows.get(source)!.get(target) || 0) + 1);
    }

    // Convert to Sankey format
    const nodes: string[] = [];
    const links: Array<{ source: number; target: number; value: number }> = [];

    // Collect all unique nodes
    const sources = Array.from(flows.keys());
    const targets = new Set<string>();
    flows.forEach((targetMap) => {
      targetMap.forEach((_, target) => targets.add(target));
    });

    nodes.push(...sources, ...Array.from(targets).filter((t) => !sources.includes(t)));

    // Create links
    flows.forEach((targetMap, source) => {
      targetMap.forEach((value, target) => {
        const sourceIndex = nodes.indexOf(source);
        const targetIndex = nodes.indexOf(target);
        if (sourceIndex !== -1 && targetIndex !== -1) {
          links.push({ source: sourceIndex, target: targetIndex, value });
        }
      });
    });

    return {
      type: 'sankey',
      title: 'Memory Flow Diagram',
      description: 'Sankey diagram showing flow from memory types to outcomes',
      data: { nodes, links },
      config,
      metadata: {
        generated: new Date(),
        dataPoints: links.length,
        filters: query.filters,
      },
    };
  }

  private generateHTMLVisualization(chartData: ChartData, _options?: any): string {
    // Generate basic HTML with embedded Chart.js or D3.js
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${chartData.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { width: 100%; height: 400px; }
        .description { margin-bottom: 20px; color: #666; }
    </style>
</head>
<body>
    <h1>${chartData.title}</h1>
    <p class="description">${chartData.description}</p>
    <div class="chart-container">
        <canvas id="chart"></canvas>
    </div>
    <script>
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, ${JSON.stringify(chartData.data)});
    </script>
</body>
</html>`;
  }

  private generateSVGVisualization(chartData: ChartData, options?: any): string {
    // Generate basic SVG - in production, use a proper chart library
    const width = options?.width || 800;
    const height = options?.height || 600;

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="50%" y="30" text-anchor="middle" font-size="18" font-weight="bold">
        ${chartData.title}
    </text>
    <text x="50%" y="50" text-anchor="middle" font-size="14" fill="#666">
        ${chartData.description}
    </text>
    <!-- Chart data would be rendered here -->
    <text x="50%" y="${height / 2}" text-anchor="middle" font-size="12" fill="#999">
        Chart visualization (${chartData.metadata.dataPoints} data points)
    </text>
</svg>`;
  }
}
