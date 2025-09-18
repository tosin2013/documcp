/**
 * Test suite for Memory Visualization Interface
 */

import { jest } from '@jest/globals';
import { MemoryVisualizationSystem } from '../../src/memory/visualization.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { MemoryEntry } from '../../src/memory/storage.js';
import { VisualizationConfig, ChartData, DashboardData } from '../../src/memory/visualization.js';
import * as tmp from 'tmp';

// Mock the MemoryManager
jest.mock('../../src/memory/manager.js');

describe('MemoryVisualizationSystem', () => {
  let visualizationEngine: MemoryVisualizationSystem;
  let mockMemoryManager: jest.Mocked<MemoryManager>;
  let tempDir: tmp.DirResult;

  const defaultConfig: VisualizationConfig = {
    width: 800,
    height: 600,
    theme: 'light',
    colorScheme: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
    interactive: true,
    exportFormat: 'svg',
    responsive: true,
  };

  const sampleMemoryEntries: MemoryEntry[] = [
    {
      id: 'entry-1',
      timestamp: new Date('2025-01-01').toISOString(),
      type: 'analysis',
      data: { content: 'Analysis of React components' },
      metadata: {
        tags: ['react', 'components'],
        projectId: 'web-app',
      },
    },
    {
      id: 'entry-2',
      timestamp: new Date('2025-01-02').toISOString(),
      type: 'interaction',
      data: { content: 'Documentation best practices' },
      metadata: {
        tags: ['best-practices', 'writing'],
        projectId: 'docs',
      },
    },
    {
      id: 'entry-3',
      timestamp: new Date('2025-01-03').toISOString(),
      type: 'configuration',
      data: { content: 'Testing strategies' },
      metadata: {
        tags: ['unit-tests', 'integration'],
        projectId: 'web-app',
      },
    },
  ];

  beforeAll(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterAll(() => {
    tempDir.removeCallback();
  });

  beforeEach(() => {
    mockMemoryManager = new MemoryManager(tempDir.name) as jest.Mocked<MemoryManager>;
    visualizationEngine = new MemoryVisualizationSystem(mockMemoryManager, defaultConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const engine = new MemoryVisualizationSystem(mockMemoryManager);
      expect(engine).toBeDefined();
      expect(engine.getConfig()).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: VisualizationConfig = {
        ...defaultConfig,
        theme: 'dark',
        width: 1200,
      };

      const engine = new MemoryVisualizationSystem(mockMemoryManager, customConfig);
      expect(engine.getConfig().theme).toBe('dark');
      expect(engine.getConfig().width).toBe(1200);
    });

    it('should update configuration dynamically', () => {
      const updates: Partial<VisualizationConfig> = {
        theme: 'dark',
        interactive: false,
      };

      visualizationEngine.updateConfig(updates);
      const config = visualizationEngine.getConfig();

      expect(config.theme).toBe('dark');
      expect(config.interactive).toBe(false);
      expect(config.width).toBe(defaultConfig.width); // Should preserve other values
    });
  });

  describe('Data Preparation', () => {
    beforeEach(() => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
    });

    it('should prepare time series data', async () => {
      const timeSeriesData = await visualizationEngine.prepareTimeSeriesData();

      expect(timeSeriesData.datasets).toBeDefined();
      expect(timeSeriesData.labels.length).toBeGreaterThan(0);
      expect(timeSeriesData.timeRange.start).toBeInstanceOf(Date);
      expect(timeSeriesData.timeRange.end).toBeInstanceOf(Date);
    });

    it('should aggregate data by type', async () => {
      const aggregatedData = await visualizationEngine.aggregateByType();

      expect(aggregatedData.analysis).toBe(1);
      expect(aggregatedData.documentation).toBe(1);
      expect(aggregatedData.testing).toBe(1);
    });

    it('should prepare tag distribution data', async () => {
      const tagData = await visualizationEngine.prepareTagDistribution();

      expect(tagData.labels).toContain('react');
      expect(tagData.labels).toContain('best-practices');
      expect(tagData.values.length).toBe(tagData.labels.length);
    });

    it('should handle empty datasets gracefully', async () => {
      mockMemoryManager.getAllEntries.mockResolvedValue([]);

      const timeSeriesData = await visualizationEngine.prepareTimeSeriesData();
      expect(timeSeriesData.datasets.length).toBe(0);
      expect(timeSeriesData.labels.length).toBe(0);
    });
  });

  describe('Chart Generation', () => {
    beforeEach(() => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
    });

    it('should generate memory usage over time chart', async () => {
      const chart = await visualizationEngine.generateMemoryUsageChart();

      expect(chart.type).toBe('line');
      expect(chart.title).toContain('Memory Usage');
      expect(chart.data).toBeDefined();
      expect(chart.metadata.dataPoints).toBeGreaterThan(0);
    });

    it('should generate entry type distribution chart', async () => {
      const chart = await visualizationEngine.generateTypeDistributionChart();

      expect(chart.type).toBe('bar');
      expect(chart.title).toContain('Distribution');
      expect(chart.data.labels).toContain('analysis');
      expect(chart.data.values.length).toBe(chart.data.labels.length);
    });

    it('should generate importance heatmap', async () => {
      const chart = await visualizationEngine.generateImportanceHeatmap();

      expect(chart.type).toBe('heatmap');
      expect(chart.title).toContain('Importance');
      expect(chart.data.matrix).toBeDefined();
      expect(chart.metadata.dataPoints).toBeGreaterThan(0);
    });

    it('should generate access pattern timeline', async () => {
      const chart = await visualizationEngine.generateAccessPatternTimeline();

      expect(chart.type).toBe('timeline');
      expect(chart.title).toContain('Access Pattern');
      expect(chart.data.events).toBeDefined();
    });
  });

  describe('Network Visualizations', () => {
    beforeEach(() => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
    });

    it('should generate knowledge graph visualization', async () => {
      const networkViz = await visualizationEngine.generateKnowledgeGraphViz();

      expect(networkViz.nodes.length).toBeGreaterThan(0);
      expect(networkViz.edges.length).toBeGreaterThanOrEqual(0);
      expect(networkViz.layout).toBeDefined();
    });

    it('should generate tag relationship network', async () => {
      const tagNetwork = await visualizationEngine.generateTagRelationshipNetwork();

      expect(tagNetwork.nodes.length).toBeGreaterThan(0);
      expect(tagNetwork.clusteringCoefficient).toBeGreaterThanOrEqual(0);
    });

    it('should apply force-directed layout', async () => {
      const networkViz = await visualizationEngine.generateKnowledgeGraphViz({
        layout: 'force-directed',
      });

      expect(networkViz.layout.type).toBe('force-directed');
      expect(networkViz.layout.iterations).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Generation', () => {
    beforeEach(() => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
    });

    it('should generate comprehensive dashboard', async () => {
      const dashboard = await visualizationEngine.generateDashboard();

      expect(dashboard.title).toContain('Memory Dashboard');
      expect(dashboard.charts.length).toBeGreaterThan(0);
      expect(dashboard.summary.totalEntries).toBe(3);
      expect(dashboard.summary.keyInsights.length).toBeGreaterThan(0);
      expect(dashboard.summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.summary.healthScore).toBeLessThanOrEqual(100);
    });

    it('should generate dashboard with custom time range', async () => {
      const timeRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-03'),
      };

      const dashboard = await visualizationEngine.generateDashboard({ timeRange });

      expect(dashboard.summary.timeRange.start).toEqual(timeRange.start);
      expect(dashboard.summary.timeRange.end).toEqual(timeRange.end);
    });

    it('should filter dashboard data by tags', async () => {
      const dashboard = await visualizationEngine.generateDashboard({
        filters: { tags: ['react'] },
      });

      expect(dashboard.summary.totalEntries).toBe(1);
    });
  });

  describe('Export Functionality', () => {
    let sampleChart: ChartData;

    beforeEach(async () => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
      sampleChart = await visualizationEngine.generateMemoryUsageChart();
    });

    it('should export chart as SVG', async () => {
      const svgData = await visualizationEngine.exportChart(sampleChart, 'svg');

      expect(svgData).toContain('<svg');
      expect(svgData).toContain('</svg>');
    });

    it('should export chart as JSON', async () => {
      const jsonData = await visualizationEngine.exportChart(sampleChart, 'json');

      const parsed = JSON.parse(jsonData);
      expect(parsed.type).toBe(sampleChart.type);
      expect(parsed.title).toBe(sampleChart.title);
    });

    it('should export dashboard as HTML', async () => {
      const dashboard = await visualizationEngine.generateDashboard();
      const htmlData = await visualizationEngine.exportDashboard(dashboard, 'html');

      expect(htmlData).toContain('<!DOCTYPE html>');
      expect(htmlData).toContain('<title>');
      expect(htmlData).toContain(dashboard.title);
    });

    it('should handle export errors gracefully', async () => {
      const invalidChart: ChartData = {
        ...sampleChart,
        data: undefined,
      };

      const result = await visualizationEngine.exportChart(invalidChart, 'svg');
      expect(result).toContain('error');
    });
  });

  describe('Interactive Features', () => {
    beforeEach(() => {
      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
    });

    it('should generate drill-down capabilities', async () => {
      const chart = await visualizationEngine.generateTypeDistributionChart({
        interactive: true,
        drillDown: true,
      });

      expect(chart.config.interactive).toBe(true);
      expect(chart.data.drillDownData).toBeDefined();
    });

    it('should add zoom and pan controls', async () => {
      const chart = await visualizationEngine.generateMemoryUsageChart({
        interactive: true,
        controls: ['zoom', 'pan'],
      });

      expect(chart.config.interactive).toBe(true);
      expect(chart.data.controls).toContain('zoom');
      expect(chart.data.controls).toContain('pan');
    });

    it('should generate tooltip information', async () => {
      const chart = await visualizationEngine.generateImportanceHeatmap({
        interactive: true,
        tooltips: true,
      });

      expect(chart.data.tooltips).toBeDefined();
      expect(chart.data.tooltips.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000)
        .fill(null)
        .map((_, i) => ({
          ...sampleMemoryEntries[0],
          id: `entry-${i}`,
          metadata: {
            ...sampleMemoryEntries[0].metadata,
            timestamp: new Date(Date.now() - i * 86400000).toISOString(),
          },
        }));

      mockMemoryManager.getAllEntries.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const chart = await visualizationEngine.generateMemoryUsageChart();
      const duration = Date.now() - startTime;

      expect(chart).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should implement data sampling for large datasets', async () => {
      const largeDataset = Array(10000)
        .fill(null)
        .map((_, i) => ({
          ...sampleMemoryEntries[0],
          id: `entry-${i}`,
        }));

      mockMemoryManager.getAllEntries.mockResolvedValue(largeDataset);

      const chart = await visualizationEngine.generateMemoryUsageChart({
        sampling: { enabled: true, maxPoints: 1000 },
      });

      expect(chart.data.samplingApplied).toBe(true);
      expect(chart.metadata.dataPoints).toBeLessThanOrEqual(1000);
    });

    it('should cache visualization data', async () => {
      await visualizationEngine.generateMemoryUsageChart();

      const startTime = Date.now();
      await visualizationEngine.generateMemoryUsageChart(); // Should use cache
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be much faster with cache
    });
  });

  describe('Theme and Styling', () => {
    it('should apply dark theme correctly', async () => {
      visualizationEngine.updateConfig({ theme: 'dark' });
      const chart = await visualizationEngine.generateMemoryUsageChart();

      expect(chart.config.theme).toBe('dark');
      expect(chart.data.backgroundColor).toBe('#1a1a1a');
    });

    it('should use custom color schemes', async () => {
      const customColors = ['#ff0000', '#00ff00', '#0000ff'];
      visualizationEngine.updateConfig({ colorScheme: customColors });

      const chart = await visualizationEngine.generateTypeDistributionChart();

      expect(chart.data.colors).toEqual(customColors);
    });

    it('should adapt to responsive layouts', async () => {
      visualizationEngine.updateConfig({ responsive: true, width: 1200 });

      const chart = await visualizationEngine.generateMemoryUsageChart();

      expect(chart.config.responsive).toBe(true);
      expect(chart.data.responsiveBreakpoints).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', async () => {
      mockMemoryManager.getAllEntries.mockResolvedValue([]);

      const chart = await visualizationEngine.generateMemoryUsageChart();

      expect(chart.type).toBe('line');
      expect(chart.data.datasets.length).toBe(0);
      expect(chart.metadata.dataPoints).toBe(0);
    });

    it('should handle invalid data formats', async () => {
      const invalidEntries = [{ ...sampleMemoryEntries[0], metadata: null }] as any;

      mockMemoryManager.getAllEntries.mockResolvedValue(invalidEntries);

      const chart = await visualizationEngine.generateTypeDistributionChart();

      expect(chart).toBeDefined();
      expect(chart.data.errors).toBeDefined();
    });

    it('should handle memory manager errors', async () => {
      mockMemoryManager.getAllEntries.mockRejectedValue(new Error('Storage error'));

      const chart = await visualizationEngine.generateMemoryUsageChart();

      expect(chart.data.error).toBeDefined();
      expect(chart.data.error).toContain('Storage error');
    });
  });

  describe('Event Handling', () => {
    it('should emit events during chart generation', (done) => {
      visualizationEngine.on('chartGenerated', (data) => {
        expect(data.chartType).toBeDefined();
        expect(data.duration).toBeGreaterThan(0);
        done();
      });

      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
      visualizationEngine.generateMemoryUsageChart();
    });

    it('should emit events during dashboard generation', (done) => {
      visualizationEngine.on('dashboardGenerated', (data) => {
        expect(data.chartsCount).toBeGreaterThan(0);
        done();
      });

      mockMemoryManager.getAllEntries.mockResolvedValue(sampleMemoryEntries);
      visualizationEngine.generateDashboard();
    });
  });
});
