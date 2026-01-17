/**
 * Temporal Memory Analysis System for DocuMCP
 * Time-based analysis of memory patterns, trends, and predictions
 */

import { EventEmitter } from "events";
import { MemoryEntry, JSONLStorage } from "./storage.js";
import { MemoryManager } from "./manager.js";
import { IncrementalLearningSystem } from "./learning.js";
import { KnowledgeGraph } from "./knowledge-graph.js";

export interface TimeWindow {
  start: Date;
  end: Date;
  duration: number; // in milliseconds
  label: string;
}

export interface TemporalPattern {
  type: "periodic" | "trending" | "seasonal" | "burst" | "decay";
  confidence: number;
  period?: number; // For periodic patterns (in milliseconds)
  trend?: "increasing" | "decreasing" | "stable";
  seasonality?: "daily" | "weekly" | "monthly" | "yearly";
  description: string;
  dataPoints: Array<{ timestamp: Date; value: number; metadata?: any }>;
}

export interface TemporalMetrics {
  activityLevel: number; // 0-1 scale
  growthRate: number; // percentage change
  peakActivity: { timestamp: Date; count: number };
  averageInterval: number; // average time between entries
  consistency: number; // 0-1 scale of temporal consistency
  cyclicalStrength: number; // 0-1 scale of cyclical patterns
}

export interface PredictionResult {
  nextActivity: {
    probability: number;
    timeRange: TimeWindow;
    expectedCount: number;
    confidence: number;
  };
  trends: {
    shortTerm: TemporalPattern[];
    longTerm: TemporalPattern[];
  };
  anomalies: Array<{
    timestamp: Date;
    type: "spike" | "drought" | "shift";
    severity: number;
    description: string;
  }>;
  recommendations: string[];
}

export interface TemporalQuery {
  timeRange?: TimeWindow;
  granularity: "hour" | "day" | "week" | "month" | "year";
  aggregation: "count" | "success_rate" | "activity_level" | "diversity";
  filters?: {
    types?: string[];
    projects?: string[];
    outcomes?: string[];
    tags?: string[];
  };
  smoothing?: {
    enabled: boolean;
    method: "moving_average" | "exponential" | "savitzky_golay";
    window: number;
  };
}

export interface TemporalInsight {
  type: "pattern" | "anomaly" | "trend" | "prediction";
  title: string;
  description: string;
  confidence: number;
  timeframe: TimeWindow;
  actionable: boolean;
  recommendations?: string[];
  visualData?: any;
}

export class TemporalMemoryAnalysis extends EventEmitter {
  private storage: JSONLStorage;
  private manager: MemoryManager;
  private learningSystem: IncrementalLearningSystem;
  private knowledgeGraph: KnowledgeGraph;
  private patternCache: Map<string, TemporalPattern[]>;
  private metricsCache: Map<string, TemporalMetrics>;
  private predictionCache: Map<string, PredictionResult>;

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
    this.patternCache = new Map();
    this.metricsCache = new Map();
    this.predictionCache = new Map();

    this.setupPeriodicAnalysis();
  }

  /**
   * Analyze temporal patterns in memory data
   */
  async analyzeTemporalPatterns(
    query?: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const defaultQuery: TemporalQuery = {
      granularity: "day",
      aggregation: "count",
      timeRange: this.getDefaultTimeRange(),
      smoothing: {
        enabled: true,
        method: "moving_average",
        window: 7,
      },
    };

    const activeQuery = { ...defaultQuery, ...query };
    const cacheKey = this.generateCacheKey("patterns", activeQuery);

    // Check cache first
    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    try {
      // Get time series data
      const timeSeries = await this.buildTimeSeries(activeQuery);

      // Detect different types of patterns
      const patterns: TemporalPattern[] = [];

      // Periodic patterns
      patterns.push(
        ...(await this.detectPeriodicPatterns(timeSeries, activeQuery)),
      );

      // Trend patterns
      patterns.push(
        ...(await this.detectTrendPatterns(timeSeries, activeQuery)),
      );

      // Seasonal patterns
      patterns.push(
        ...(await this.detectSeasonalPatterns(timeSeries, activeQuery)),
      );

      // Burst patterns
      patterns.push(
        ...(await this.detectBurstPatterns(timeSeries, activeQuery)),
      );

      // Decay patterns
      patterns.push(
        ...(await this.detectDecayPatterns(timeSeries, activeQuery)),
      );

      // Sort by confidence
      patterns.sort((a, b) => b.confidence - a.confidence);

      // Cache results
      this.patternCache.set(cacheKey, patterns);

      this.emit("patterns_analyzed", {
        query: activeQuery,
        patterns: patterns.length,
        highConfidence: patterns.filter((p) => p.confidence > 0.7).length,
      });

      return patterns;
    } catch (error) {
      this.emit("analysis_error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get temporal metrics for a time range
   */
  async getTemporalMetrics(query?: TemporalQuery): Promise<TemporalMetrics> {
    const defaultQuery: TemporalQuery = {
      granularity: "day",
      aggregation: "count",
      timeRange: this.getDefaultTimeRange(),
    };

    const activeQuery = { ...defaultQuery, ...query };
    const cacheKey = this.generateCacheKey("metrics", activeQuery);

    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }

    const timeSeries = await this.buildTimeSeries(activeQuery);

    // Calculate activity level
    const totalActivity = timeSeries.reduce(
      (sum, point) => sum + point.value,
      0,
    );
    const maxPossibleActivity =
      timeSeries.length * Math.max(...timeSeries.map((p) => p.value));
    const activityLevel =
      maxPossibleActivity > 0 ? totalActivity / maxPossibleActivity : 0;

    // Calculate growth rate
    const firstHalf = timeSeries.slice(0, Math.floor(timeSeries.length / 2));
    const secondHalf = timeSeries.slice(Math.floor(timeSeries.length / 2));
    const firstHalfAvg =
      firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;
    const growthRate =
      firstHalfAvg > 0
        ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
        : 0;

    // Find peak activity
    const peakPoint = timeSeries.reduce((max, point) =>
      point.value > max.value ? point : max,
    );
    const peakActivity = {
      timestamp: peakPoint.timestamp,
      count: peakPoint.value,
    };

    // Calculate average interval
    const intervals = [];
    for (let i = 1; i < timeSeries.length; i++) {
      intervals.push(
        timeSeries[i].timestamp.getTime() -
          timeSeries[i - 1].timestamp.getTime(),
      );
    }
    const averageInterval =
      intervals.length > 0
        ? intervals.reduce((sum, interval) => sum + interval, 0) /
          intervals.length
        : 0;

    // Calculate consistency (inverse of coefficient of variation)
    const values = timeSeries.map((p) => p.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    const consistency = mean > 0 ? Math.max(0, 1 - stdDev / mean) : 0;

    // Calculate cyclical strength using autocorrelation
    const cyclicalStrength = this.calculateCyclicalStrength(values);

    const metrics: TemporalMetrics = {
      activityLevel,
      growthRate,
      peakActivity,
      averageInterval,
      consistency,
      cyclicalStrength,
    };

    this.metricsCache.set(cacheKey, metrics);
    return metrics;
  }

  /**
   * Make predictions based on temporal patterns
   */
  async predictFutureActivity(
    query?: TemporalQuery,
  ): Promise<PredictionResult> {
    const defaultQuery: TemporalQuery = {
      granularity: "day",
      aggregation: "count",
      timeRange: this.getDefaultTimeRange(),
    };

    const activeQuery = { ...defaultQuery, ...query };
    const cacheKey = this.generateCacheKey("predictions", activeQuery);

    if (this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey)!;
    }

    // Get historical patterns and metrics
    const patterns = await this.analyzeTemporalPatterns(activeQuery);
    const metrics = await this.getTemporalMetrics(activeQuery);
    const timeSeries = await this.buildTimeSeries(activeQuery);

    // Predict next activity window
    const nextActivity = await this.predictNextActivity(
      timeSeries,
      patterns,
      metrics,
    );

    // Categorize trends
    const shortTermPatterns = patterns.filter((p) =>
      this.isShortTerm(p, activeQuery),
    );
    const longTermPatterns = patterns.filter((p) =>
      this.isLongTerm(p, activeQuery),
    );

    // Detect anomalies
    const anomalies = await this.detectAnomalies(timeSeries, patterns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      patterns,
      metrics,
      anomalies,
    );

    const result: PredictionResult = {
      nextActivity,
      trends: {
        shortTerm: shortTermPatterns,
        longTerm: longTermPatterns,
      },
      anomalies,
      recommendations,
    };

    this.predictionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Get temporal insights and actionable recommendations
   */
  async getTemporalInsights(query?: TemporalQuery): Promise<TemporalInsight[]> {
    const patterns = await this.analyzeTemporalPatterns(query);
    const metrics = await this.getTemporalMetrics(query);
    const predictions = await this.predictFutureActivity(query);

    const insights: TemporalInsight[] = [];

    // Pattern-based insights
    for (const pattern of patterns.filter((p) => p.confidence > 0.6)) {
      insights.push({
        type: "pattern",
        title: `${
          pattern.type.charAt(0).toUpperCase() + pattern.type.slice(1)
        } Pattern Detected`,
        description: pattern.description,
        confidence: pattern.confidence,
        timeframe: this.getPatternTimeframe(pattern),
        actionable: this.isActionablePattern(pattern),
        recommendations: this.getPatternRecommendations(pattern),
      });
    }

    // Trend insights
    if (metrics.growthRate > 20) {
      insights.push({
        type: "trend",
        title: "Increasing Activity Trend",
        description: `Memory activity has increased by ${metrics.growthRate.toFixed(
          1,
        )}% over the analysis period`,
        confidence: 0.8,
        timeframe: query?.timeRange || this.getDefaultTimeRange(),
        actionable: true,
        recommendations: [
          "Consider optimizing memory storage for increased load",
          "Monitor system performance as activity grows",
          "Evaluate current pruning policies",
        ],
      });
    }

    // Anomaly insights
    for (const anomaly of predictions.anomalies.filter(
      (a) => a.severity > 0.7,
    )) {
      insights.push({
        type: "anomaly",
        title: `${
          anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)
        } Anomaly`,
        description: anomaly.description,
        confidence: anomaly.severity,
        timeframe: {
          start: anomaly.timestamp,
          end: anomaly.timestamp,
          duration: 0,
          label: "Point Anomaly",
        },
        actionable: true,
        recommendations: this.getAnomalyRecommendations(anomaly),
      });
    }

    // Prediction insights
    if (predictions.nextActivity.probability > 0.7) {
      insights.push({
        type: "prediction",
        title: "High Probability Activity Window",
        description: `${(predictions.nextActivity.probability * 100).toFixed(
          1,
        )}% chance of ${predictions.nextActivity.expectedCount} activities`,
        confidence: predictions.nextActivity.confidence,
        timeframe: predictions.nextActivity.timeRange,
        actionable: true,
        recommendations: [
          "Prepare system for predicted activity surge",
          "Consider pre-emptive optimization",
          "Monitor resource utilization during predicted window",
        ],
      });
    }

    // Sort by confidence and actionability
    insights.sort((a, b) => {
      if (a.actionable !== b.actionable) {
        return a.actionable ? -1 : 1;
      }
      return b.confidence - a.confidence;
    });

    return insights;
  }

  /**
   * Build time series data from memory entries
   */
  private async buildTimeSeries(
    query: TemporalQuery,
  ): Promise<Array<{ timestamp: Date; value: number; metadata?: any }>> {
    const entries = await this.getFilteredEntries(query);
    const timeRange = query.timeRange || this.getDefaultTimeRange();

    // Create time buckets based on granularity
    const buckets = this.createTimeBuckets(timeRange, query.granularity);
    const timeSeries: Array<{
      timestamp: Date;
      value: number;
      metadata?: any;
    }> = [];

    for (const bucket of buckets) {
      const bucketEntries = entries.filter((entry) => {
        const entryTime = new Date(entry.timestamp);
        return entryTime >= bucket.start && entryTime < bucket.end;
      });

      let value = 0;
      const metadata: any = {};

      switch (query.aggregation) {
        case "count":
          value = bucketEntries.length;
          break;
        case "success_rate": {
          const successful = bucketEntries.filter(
            (e) => e.data.outcome === "success" || e.data.success === true,
          ).length;
          value =
            bucketEntries.length > 0 ? successful / bucketEntries.length : 0;
          break;
        }
        case "activity_level":
          // Custom metric based on entry types and interactions
          value = this.calculateActivityLevel(bucketEntries);
          break;
        case "diversity": {
          const uniqueTypes = new Set(bucketEntries.map((e) => e.type));
          value = uniqueTypes.size;
          break;
        }
      }

      // Add metadata
      metadata.entryCount = bucketEntries.length;
      metadata.types = [...new Set(bucketEntries.map((e) => e.type))];

      timeSeries.push({
        timestamp: bucket.start,
        value,
        metadata,
      });
    }

    // Apply smoothing if requested
    if (query.smoothing?.enabled) {
      return this.applySmoothingToTimeSeries(timeSeries, query.smoothing);
    }

    return timeSeries;
  }

  /**
   * Get filtered entries based on query
   */
  private async getFilteredEntries(
    query: TemporalQuery,
  ): Promise<MemoryEntry[]> {
    let entries = await this.storage.getAll();

    // Apply time range filter
    if (query.timeRange) {
      entries = entries.filter((entry) => {
        const entryTime = new Date(entry.timestamp);
        return (
          entryTime >= query.timeRange!.start &&
          entryTime <= query.timeRange!.end
        );
      });
    }

    // Apply filters
    if (query.filters) {
      if (query.filters.types) {
        entries = entries.filter((entry) =>
          query.filters!.types!.includes(entry.type),
        );
      }

      if (query.filters.projects) {
        entries = entries.filter((entry) =>
          query.filters!.projects!.some(
            (project) =>
              entry.data.projectPath?.includes(project) ||
              entry.data.projectId === project,
          ),
        );
      }

      if (query.filters.outcomes) {
        entries = entries.filter(
          (entry) =>
            query.filters!.outcomes!.includes(entry.data.outcome) ||
            (entry.data.success === true &&
              query.filters!.outcomes!.includes("success")) ||
            (entry.data.success === false &&
              query.filters!.outcomes!.includes("failure")),
        );
      }

      if (query.filters.tags) {
        entries = entries.filter((entry) =>
          entry.tags?.some((tag) => query.filters!.tags!.includes(tag)),
        );
      }
    }

    return entries;
  }

  /**
   * Create time buckets for analysis
   */
  private createTimeBuckets(
    timeRange: TimeWindow,
    granularity: string,
  ): TimeWindow[] {
    const buckets: TimeWindow[] = [];
    let current = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    while (current < end) {
      const bucketStart = new Date(current);
      let bucketEnd: Date;

      switch (granularity) {
        case "hour":
          bucketEnd = new Date(current.getTime() + 60 * 60 * 1000);
          break;
        case "day":
          bucketEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "week":
          bucketEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          bucketEnd = new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            1,
          );
          break;
        case "year":
          bucketEnd = new Date(current.getFullYear() + 1, 0, 1);
          break;
        default:
          bucketEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
      }

      if (bucketEnd > end) {
        bucketEnd = new Date(end);
      }

      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        duration: bucketEnd.getTime() - bucketStart.getTime(),
        label: this.formatTimeLabel(bucketStart, granularity),
      });

      current = bucketEnd;
    }

    return buckets;
  }

  /**
   * Detect periodic patterns in time series
   */
  private async detectPeriodicPatterns(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    query: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];
    const values = timeSeries.map((p) => p.value);

    // Check for different periods (daily, weekly, monthly cycles)
    const periods = [1, 7, 30, 365]; // days

    for (const period of periods) {
      const adjustedPeriod = this.adjustPeriodForGranularity(
        period,
        query.granularity,
      );
      if (adjustedPeriod >= values.length / 3) continue; // Need at least 3 cycles

      const correlation = this.calculateAutocorrelation(values, adjustedPeriod);

      if (correlation > 0.6) {
        patterns.push({
          type: "periodic",
          confidence: correlation,
          period: period * 24 * 60 * 60 * 1000, // Convert to milliseconds
          description: `${period}-${query.granularity} cycle detected with ${(
            correlation * 100
          ).toFixed(1)}% correlation`,
          dataPoints: timeSeries,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect trend patterns
   */
  private async detectTrendPatterns(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    _query: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];
    const values = timeSeries.map((p) => p.value);

    if (values.length < 5) return patterns;

    // Calculate linear regression
    const { slope, rSquared } = this.calculateLinearRegression(values);

    if (rSquared > 0.5) {
      // Good fit
      const trend =
        slope > 0.01 ? "increasing" : slope < -0.01 ? "decreasing" : "stable";

      if (trend !== "stable") {
        patterns.push({
          type: "trending",
          confidence: rSquared,
          trend,
          description: `${trend} trend detected with R² = ${rSquared.toFixed(
            3,
          )}`,
          dataPoints: timeSeries,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect seasonal patterns
   */
  private async detectSeasonalPatterns(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    query: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];

    // Check for daily patterns (hour of day)
    if (query.granularity === "hour") {
      const hourlyPattern = this.analyzeHourlyPattern(timeSeries);
      if (hourlyPattern.confidence > 0.6) {
        patterns.push({
          type: "seasonal",
          confidence: hourlyPattern.confidence,
          seasonality: "daily",
          description: `Daily pattern: peak activity at ${hourlyPattern.peakHour}:00`,
          dataPoints: timeSeries,
        });
      }
    }

    // Check for weekly patterns (day of week)
    if (["hour", "day"].includes(query.granularity)) {
      const weeklyPattern = this.analyzeWeeklyPattern(timeSeries);
      if (weeklyPattern.confidence > 0.6) {
        patterns.push({
          type: "seasonal",
          confidence: weeklyPattern.confidence,
          seasonality: "weekly",
          description: `Weekly pattern: peak activity on ${weeklyPattern.peakDay}`,
          dataPoints: timeSeries,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect burst patterns (sudden spikes)
   */
  private async detectBurstPatterns(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    _query: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];
    const values = timeSeries.map((p) => p.value);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length,
    );

    const threshold = mean + 2 * stdDev; // 2 standard deviations above mean

    const bursts = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] > threshold) {
        bursts.push(i);
      }
    }

    if (bursts.length > 0 && bursts.length < values.length * 0.1) {
      // Bursts are rare
      const confidence = Math.min(0.9, bursts.length / (values.length * 0.05));

      patterns.push({
        type: "burst",
        confidence,
        description: `${bursts.length} burst events detected (${(
          threshold / mean
        ).toFixed(1)}x normal activity)`,
        dataPoints: bursts.map((i) => timeSeries[i]),
      });
    }

    return patterns;
  }

  /**
   * Detect decay patterns (gradual decline)
   */
  private async detectDecayPatterns(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    _query: TemporalQuery,
  ): Promise<TemporalPattern[]> {
    const patterns: TemporalPattern[] = [];
    const values = timeSeries.map((p) => p.value);

    if (values.length < 10) return patterns;

    // Look for exponential decay pattern
    const logValues = values.map((v) => Math.log(Math.max(v, 0.1))); // Avoid log(0)
    const { slope, rSquared } = this.calculateLinearRegression(logValues);

    if (slope < -0.05 && rSquared > 0.7) {
      // Significant decay with good fit
      patterns.push({
        type: "decay",
        confidence: rSquared,
        description: `Exponential decay detected (half-life ≈ ${(
          -0.693 / slope
        ).toFixed(1)} periods)`,
        dataPoints: timeSeries,
      });
    }

    return patterns;
  }

  /**
   * Calculate activity level for a set of entries
   */
  private calculateActivityLevel(entries: MemoryEntry[]): number {
    if (entries.length === 0) return 0;

    let score = 0;

    // Base score from count
    score += Math.min(1, entries.length / 10); // Cap at 10 entries = 1.0

    // Bonus for diversity
    const uniqueTypes = new Set(entries.map((e) => e.type));
    score += uniqueTypes.size * 0.1;

    // Bonus for successful outcomes
    const successful = entries.filter(
      (e) => e.data.outcome === "success" || e.data.success === true,
    ).length;
    score += (successful / entries.length) * 0.3;

    return Math.min(1, score);
  }

  /**
   * Apply smoothing to time series data
   */
  private applySmoothingToTimeSeries(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    smoothing: { method: string; window: number },
  ): Array<{ timestamp: Date; value: number; metadata?: any }> {
    const values = timeSeries.map((p) => p.value);
    let smoothedValues: number[];

    switch (smoothing.method) {
      case "moving_average":
        smoothedValues = this.applyMovingAverage(values, smoothing.window);
        break;
      case "exponential":
        smoothedValues = this.applyExponentialSmoothing(values, 0.3);
        break;
      default:
        smoothedValues = values;
    }

    return timeSeries.map((point, i) => ({
      ...point,
      value: smoothedValues[i],
    }));
  }

  /**
   * Apply moving average smoothing
   */
  private applyMovingAverage(values: number[], window: number): number[] {
    const smoothed: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.ceil(window / 2));
      const windowValues = values.slice(start, end);
      const average =
        windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
      smoothed.push(average);
    }

    return smoothed;
  }

  /**
   * Apply exponential smoothing
   */
  private applyExponentialSmoothing(values: number[], alpha: number): number[] {
    const smoothed: number[] = [values[0]];

    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    return smoothed;
  }

  /**
   * Calculate autocorrelation for periodic pattern detection
   */
  private calculateAutocorrelation(values: number[], lag: number): number {
    if (lag >= values.length) return 0;

    const n = values.length - lag;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate cyclical strength using autocorrelation
   */
  private calculateCyclicalStrength(values: number[]): number {
    const maxLag = Math.min(values.length / 3, 30);
    let maxCorrelation = 0;

    for (let lag = 1; lag < maxLag; lag++) {
      const correlation = Math.abs(this.calculateAutocorrelation(values, lag));
      maxCorrelation = Math.max(maxCorrelation, correlation);
    }

    return maxCorrelation;
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(values: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = values.reduce(
      (sum, val) => sum + Math.pow(val - meanY, 2),
      0,
    );
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    return { slope, intercept, rSquared };
  }

  /**
   * Predict next activity window
   */
  private async predictNextActivity(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    patterns: TemporalPattern[],
    _metrics: TemporalMetrics,
  ): Promise<PredictionResult["nextActivity"]> {
    const lastPoint = timeSeries[timeSeries.length - 1];
    const averageValue =
      timeSeries.reduce((sum, p) => sum + p.value, 0) / timeSeries.length;

    // Base prediction on recent trend
    let expectedCount = averageValue;
    let probability = 0.5;

    // Adjust based on trends
    const trendPattern = patterns.find((p) => p.type === "trending");
    if (trendPattern && trendPattern.trend === "increasing") {
      expectedCount *= 1.2;
      probability += 0.2;
    } else if (trendPattern && trendPattern.trend === "decreasing") {
      expectedCount *= 0.8;
      probability -= 0.1;
    }

    // Adjust based on periodic patterns
    const periodicPattern = patterns.find(
      (p) => p.type === "periodic" && p.confidence > 0.7,
    );
    if (periodicPattern) {
      probability += 0.3;
    }

    // Determine time range for next activity (next period based on granularity)
    const nextStart = new Date(
      lastPoint.timestamp.getTime() + 24 * 60 * 60 * 1000,
    ); // Next day
    const nextEnd = new Date(nextStart.getTime() + 24 * 60 * 60 * 1000);

    return {
      probability: Math.min(0.95, Math.max(0.05, probability)),
      timeRange: {
        start: nextStart,
        end: nextEnd,
        duration: 24 * 60 * 60 * 1000,
        label: "Next 24 hours",
      },
      expectedCount: Math.round(expectedCount),
      confidence: Math.min(
        0.9,
        patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
      ),
    };
  }

  /**
   * Detect anomalies in time series
   */
  private async detectAnomalies(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
    _patterns: TemporalPattern[],
  ): Promise<PredictionResult["anomalies"]> {
    const anomalies: PredictionResult["anomalies"] = [];
    const values = timeSeries.map((p) => p.value);

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length,
    );

    for (let i = 0; i < timeSeries.length; i++) {
      const point = timeSeries[i];
      const value = point.value;

      // Spike detection
      if (value > mean + 3 * stdDev) {
        anomalies.push({
          timestamp: point.timestamp,
          type: "spike",
          severity: Math.min(1, (value - mean) / (3 * stdDev)),
          description: `Activity spike: ${value} (${(
            (value / mean - 1) *
            100
          ).toFixed(0)}% above normal)`,
        });
      }

      // Drought detection
      if (value < mean - 2 * stdDev && mean > 1) {
        anomalies.push({
          timestamp: point.timestamp,
          type: "drought",
          severity: Math.min(1, (mean - value) / (2 * stdDev)),
          description: `Activity drought: ${value} (${(
            (1 - value / mean) *
            100
          ).toFixed(0)}% below normal)`,
        });
      }
    }

    // Detect regime shifts (significant changes in mean)
    const shifts = this.detectRegimeShifts(timeSeries);
    anomalies.push(...shifts);

    return anomalies.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Detect regime shifts in time series
   */
  private detectRegimeShifts(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
  ): Array<{
    timestamp: Date;
    type: "shift";
    severity: number;
    description: string;
  }> {
    const shifts: Array<{
      timestamp: Date;
      type: "shift";
      severity: number;
      description: string;
    }> = [];
    const values = timeSeries.map((p) => p.value);

    if (values.length < 20) return shifts; // Need sufficient data

    const windowSize = Math.floor(values.length / 4);

    for (let i = windowSize; i < values.length - windowSize; i++) {
      const before = values.slice(i - windowSize, i);
      const after = values.slice(i, i + windowSize);

      const meanBefore =
        before.reduce((sum, val) => sum + val, 0) / before.length;
      const meanAfter = after.reduce((sum, val) => sum + val, 0) / after.length;

      const changeMagnitude = Math.abs(meanAfter - meanBefore);
      const relativeChange = meanBefore > 0 ? changeMagnitude / meanBefore : 0;

      if (relativeChange > 0.5) {
        // 50% change
        shifts.push({
          timestamp: timeSeries[i].timestamp,
          type: "shift",
          severity: Math.min(1, relativeChange),
          description: `Regime shift: ${meanBefore.toFixed(
            1,
          )} → ${meanAfter.toFixed(1)} (${(relativeChange * 100).toFixed(
            0,
          )}% change)`,
        });
      }
    }

    return shifts;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    patterns: TemporalPattern[],
    metrics: TemporalMetrics,
    anomalies: PredictionResult["anomalies"],
  ): string[] {
    const recommendations: string[] = [];

    // Pattern-based recommendations
    const periodicPattern = patterns.find(
      (p) => p.type === "periodic" && p.confidence > 0.7,
    );
    if (periodicPattern) {
      recommendations.push(
        "Schedule maintenance and optimizations during low-activity periods based on detected cycles",
      );
    }

    const trendPattern = patterns.find((p) => p.type === "trending");
    if (trendPattern?.trend === "increasing") {
      recommendations.push(
        "Plan for increased storage and processing capacity based on growing activity trend",
      );
    } else if (trendPattern?.trend === "decreasing") {
      recommendations.push(
        "Investigate causes of declining activity and consider engagement strategies",
      );
    }

    // Metrics-based recommendations
    if (metrics.consistency < 0.5) {
      recommendations.push(
        "High variability detected - consider implementing activity smoothing mechanisms",
      );
    }

    if (metrics.growthRate > 50) {
      recommendations.push(
        "Rapid growth detected - implement proactive scaling measures",
      );
    }

    // Anomaly-based recommendations
    const spikes = anomalies.filter(
      (a) => a.type === "spike" && a.severity > 0.7,
    );
    if (spikes.length > 0) {
      recommendations.push(
        "Implement burst handling to manage activity spikes effectively",
      );
    }

    const droughts = anomalies.filter(
      (a) => a.type === "drought" && a.severity > 0.7,
    );
    if (droughts.length > 0) {
      recommendations.push(
        "Investigate causes of activity droughts and implement retention strategies",
      );
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private getDefaultTimeRange(): TimeWindow {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return {
      start,
      end,
      duration: end.getTime() - start.getTime(),
      label: "Last 30 days",
    };
  }

  private generateCacheKey(type: string, query: TemporalQuery): string {
    return `${type}_${JSON.stringify(query)}`;
  }

  private adjustPeriodForGranularity(
    period: number,
    granularity: string,
  ): number {
    switch (granularity) {
      case "hour":
        return period * 24;
      case "day":
        return period;
      case "week":
        return Math.ceil(period / 7);
      case "month":
        return Math.ceil(period / 30);
      case "year":
        return Math.ceil(period / 365);
      default:
        return period;
    }
  }

  private formatTimeLabel(date: Date, granularity: string): string {
    switch (granularity) {
      case "hour":
        return date.toISOString().slice(0, 13) + ":00";
      case "day":
        return date.toISOString().slice(0, 10);
      case "week":
        return `Week of ${date.toISOString().slice(0, 10)}`;
      case "month":
        return `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      case "year":
        return date.getFullYear().toString();
      default:
        return date.toISOString().slice(0, 10);
    }
  }

  private isShortTerm(
    pattern: TemporalPattern,
    _query: TemporalQuery,
  ): boolean {
    if (pattern.period) {
      const days = pattern.period / (24 * 60 * 60 * 1000);
      return days <= 7;
    }
    return true;
  }

  private isLongTerm(pattern: TemporalPattern, _query: TemporalQuery): boolean {
    if (pattern.period) {
      const days = pattern.period / (24 * 60 * 60 * 1000);
      return days > 30;
    }
    return false;
  }

  private getPatternTimeframe(pattern: TemporalPattern): TimeWindow {
    if (pattern.dataPoints.length > 0) {
      const start = pattern.dataPoints[0].timestamp;
      const end = pattern.dataPoints[pattern.dataPoints.length - 1].timestamp;
      return {
        start,
        end,
        duration: end.getTime() - start.getTime(),
        label: `${start.toISOString().slice(0, 10)} to ${end
          .toISOString()
          .slice(0, 10)}`,
      };
    }
    return this.getDefaultTimeRange();
  }

  private isActionablePattern(pattern: TemporalPattern): boolean {
    return (
      pattern.confidence > 0.7 &&
      ["periodic", "trending", "seasonal"].includes(pattern.type)
    );
  }

  private getPatternRecommendations(pattern: TemporalPattern): string[] {
    const recommendations: string[] = [];

    switch (pattern.type) {
      case "periodic":
        recommendations.push(
          "Schedule regular maintenance during low-activity periods",
        );
        recommendations.push(
          "Optimize resource allocation based on predictable cycles",
        );
        break;
      case "trending":
        if (pattern.trend === "increasing") {
          recommendations.push("Plan for capacity expansion");
          recommendations.push("Implement proactive monitoring");
        } else if (pattern.trend === "decreasing") {
          recommendations.push("Investigate root causes of decline");
          recommendations.push("Consider engagement interventions");
        }
        break;
      case "seasonal":
        recommendations.push(
          "Adjust system configuration for seasonal patterns",
        );
        recommendations.push(
          "Plan marketing and engagement around peak periods",
        );
        break;
    }

    return recommendations;
  }

  private getAnomalyRecommendations(anomaly: {
    type: string;
    severity: number;
  }): string[] {
    const recommendations: string[] = [];

    switch (anomaly.type) {
      case "spike":
        recommendations.push("Implement burst protection mechanisms");
        recommendations.push("Investigate spike triggers for prevention");
        recommendations.push("Consider auto-scaling capabilities");
        break;
      case "drought":
        recommendations.push("Implement activity monitoring alerts");
        recommendations.push("Investigate user engagement issues");
        recommendations.push("Consider proactive outreach strategies");
        break;
      case "shift":
        recommendations.push("Investigate underlying system changes");
        recommendations.push("Update baseline metrics and thresholds");
        recommendations.push("Review configuration changes during this period");
        break;
    }

    return recommendations;
  }

  private analyzeHourlyPattern(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
  ): { confidence: number; peakHour: number } {
    const hourlyActivity = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    for (const point of timeSeries) {
      const hour = point.timestamp.getHours();
      hourlyActivity[hour] += point.value;
      hourlyCounts[hour]++;
    }

    // Calculate average activity per hour
    const hourlyAverages = hourlyActivity.map((total, i) =>
      hourlyCounts[i] > 0 ? total / hourlyCounts[i] : 0,
    );

    // Find peak hour
    const peakHour = hourlyAverages.indexOf(Math.max(...hourlyAverages));

    // Calculate confidence based on variance
    const mean = hourlyAverages.reduce((sum, val) => sum + val, 0) / 24;
    const variance =
      hourlyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      24;
    const stdDev = Math.sqrt(variance);
    const confidence = mean > 0 ? Math.min(0.9, stdDev / mean) : 0;

    return { confidence, peakHour };
  }

  private analyzeWeeklyPattern(
    timeSeries: Array<{ timestamp: Date; value: number; metadata?: any }>,
  ): { confidence: number; peakDay: string } {
    const weeklyActivity = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (const point of timeSeries) {
      const day = point.timestamp.getDay();
      weeklyActivity[day] += point.value;
      weeklyCounts[day]++;
    }

    // Calculate average activity per day
    const weeklyAverages = weeklyActivity.map((total, i) =>
      weeklyCounts[i] > 0 ? total / weeklyCounts[i] : 0,
    );

    // Find peak day
    const peakDayIndex = weeklyAverages.indexOf(Math.max(...weeklyAverages));
    const peakDay = dayNames[peakDayIndex];

    // Calculate confidence
    const mean = weeklyAverages.reduce((sum, val) => sum + val, 0) / 7;
    const variance =
      weeklyAverages.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / 7;
    const stdDev = Math.sqrt(variance);
    const confidence = mean > 0 ? Math.min(0.9, stdDev / mean) : 0;

    return { confidence, peakDay };
  }

  /**
   * Setup periodic analysis
   */
  private setupPeriodicAnalysis(): void {
    // Run analysis every 6 hours
    setInterval(
      async () => {
        try {
          const insights = await this.getTemporalInsights();
          this.emit("periodic_analysis_completed", {
            insights: insights.length,
          });
        } catch (error) {
          this.emit("periodic_analysis_error", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      6 * 60 * 60 * 1000,
    );
  }
}
