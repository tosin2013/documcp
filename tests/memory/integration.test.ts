/**
 * Test suite for Memory Integration System
 */

import { jest } from '@jest/globals';
import { MemoryIntegrationSystem } from '../../src/memory/integration.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { MemoryEntry } from '../../src/memory/storage.js';
import * as tmp from 'tmp';

// Mock the MemoryManager
jest.mock('../../src/memory/manager.js');

describe('MemoryIntegrationSystem', () => {
  let integrationSystem: MemoryIntegrationSystem;
  let mockMemoryManager: jest.Mocked<MemoryManager>;
  let tempDir: tmp.DirResult;

  const sampleMemoryEntry: MemoryEntry = {
    id: 'test-entry-1',
    content: 'Sample memory content for integration testing',
    metadata: {
      type: 'analysis',
      tags: ['test', 'integration'],
      timestamp: new Date().toISOString(),
      context: { project: 'test-project' },
    },
    importance: 0.8,
    lastAccessed: new Date().toISOString(),
    accessCount: 1,
  };

  beforeAll(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterAll(() => {
    tempDir.removeCallback();
  });

  beforeEach(() => {
    mockMemoryManager = new MemoryManager(tempDir.name) as jest.Mocked<MemoryManager>;
    integrationSystem = new MemoryIntegrationSystem(mockMemoryManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with memory manager', () => {
      expect(integrationSystem).toBeDefined();
      expect(integrationSystem.isInitialized()).toBe(true);
    });

    it('should initialize subsystems', async () => {
      await integrationSystem.initializeSubsystems();

      const status = integrationSystem.getSystemStatus();
      expect(status.knowledgeGraph).toBe('initialized');
      expect(status.learningSystem).toBe('initialized');
      expect(status.temporalAnalysis).toBe('initialized');
    });

    it('should handle initialization errors gracefully', async () => {
      mockMemoryManager.isInitialized.mockReturnValue(false);

      const result = await integrationSystem.initializeSubsystems();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Memory Operations Integration', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should store memory with integrated processing', async () => {
      mockMemoryManager.storeMemory.mockResolvedValue(sampleMemoryEntry);

      const result = await integrationSystem.storeMemoryWithIntegration(
        sampleMemoryEntry.content,
        sampleMemoryEntry.metadata,
      );

      expect(result.success).toBe(true);
      expect(result.entryId).toBeDefined();
      expect(result.integrationResults.knowledgeGraphUpdated).toBe(true);
      expect(result.integrationResults.learningApplied).toBe(true);
    });

    it('should retrieve memory with enhanced context', async () => {
      mockMemoryManager.getEntry.mockResolvedValue(sampleMemoryEntry);

      const result = await integrationSystem.retrieveMemoryWithContext(sampleMemoryEntry.id);

      expect(result.entry).toEqual(sampleMemoryEntry);
      expect(result.enhancedContext).toBeDefined();
      expect(result.relatedEntries).toBeDefined();
      expect(result.temporalContext).toBeDefined();
    });

    it('should search memory with intelligent ranking', async () => {
      const searchResults = [sampleMemoryEntry];
      mockMemoryManager.searchMemories.mockResolvedValue(searchResults);

      const result = await integrationSystem.searchMemoryWithIntelligentRanking('test query', {
        useSemanticSearch: true,
        maxResults: 10,
      });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.rankingApplied).toBe(true);
      expect(result.semanticScores).toBeDefined();
    });
  });

  describe('Cross-System Communication', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should synchronize knowledge graph with learning system', async () => {
      const syncResult = await integrationSystem.synchronizeKnowledgeAndLearning();

      expect(syncResult.success).toBe(true);
      expect(syncResult.conceptsUpdated).toBeGreaterThanOrEqual(0);
      expect(syncResult.learningPatternsApplied).toBeGreaterThanOrEqual(0);
    });

    it('should update temporal patterns from knowledge insights', async () => {
      const updateResult = await integrationSystem.updateTemporalFromKnowledge();

      expect(updateResult.success).toBe(true);
      expect(updateResult.patternsIdentified).toBeGreaterThanOrEqual(0);
    });

    it('should propagate learning insights to knowledge graph', async () => {
      const propagationResult = await integrationSystem.propagateLearningToKnowledge();

      expect(propagationResult.success).toBe(true);
      expect(propagationResult.nodesUpdated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Workflow Integration', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should execute integrated analysis workflow', async () => {
      mockMemoryManager.getAllEntries.mockResolvedValue([sampleMemoryEntry]);

      const workflow = await integrationSystem.executeAnalysisWorkflow({
        analyzeKnowledge: true,
        applyLearning: true,
        updateTemporal: true,
      });

      expect(workflow.success).toBe(true);
      expect(workflow.steps.completed).toBeGreaterThan(0);
      expect(workflow.insights).toBeDefined();
    });

    it('should handle workflow step failures', async () => {
      mockMemoryManager.getAllEntries.mockRejectedValue(new Error('Storage error'));

      const workflow = await integrationSystem.executeAnalysisWorkflow({
        analyzeKnowledge: true,
      });

      expect(workflow.success).toBe(false);
      expect(workflow.errors.length).toBeGreaterThan(0);
      expect(workflow.partialResults).toBeDefined();
    });

    it('should optimize memory based on integrated insights', async () => {
      const optimization = await integrationSystem.executeOptimizationWorkflow();

      expect(optimization.success).toBe(true);
      expect(optimization.optimizations.applied).toBeGreaterThanOrEqual(0);
      expect(optimization.performanceImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Coordination', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should coordinate events across subsystems', (done) => {
      let eventsReceived = 0;
      const expectedEvents = 3;

      integrationSystem.on('integratedEvent', (event) => {
        expect(event.source).toBeDefined();
        expect(event.type).toBeDefined();

        eventsReceived++;
        if (eventsReceived === expectedEvents) {
          done();
        }
      });

      // Simulate events from different subsystems
      integrationSystem.emitIntegratedEvent('knowledgeGraph', 'nodeAdded', { nodeId: 'test' });
      integrationSystem.emitIntegratedEvent('learningSystem', 'patternLearned', {
        pattern: 'test',
      });
      integrationSystem.emitIntegratedEvent('temporalAnalysis', 'trendDetected', { trend: 'test' });
    });

    it('should handle event processing errors', async () => {
      const invalidEvent = {
        source: 'invalid',
        type: 'unknown',
        data: null,
      };

      const result = await integrationSystem.processEvent(invalidEvent);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should track integration performance metrics', async () => {
      await integrationSystem.storeMemoryWithIntegration(
        sampleMemoryEntry.content,
        sampleMemoryEntry.metadata,
      );

      const metrics = integrationSystem.getPerformanceMetrics();

      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.systemHealth).toBeGreaterThanOrEqual(0);
      expect(metrics.systemHealth).toBeLessThanOrEqual(100);
    });

    it('should detect performance bottlenecks', async () => {
      const bottlenecks = await integrationSystem.identifyBottlenecks();

      expect(Array.isArray(bottlenecks)).toBe(true);
      expect(bottlenecks.every((b) => b.component && b.metric && b.severity)).toBe(true);
    });

    it('should optimize based on performance data', async () => {
      const optimization = await integrationSystem.optimizeBasedOnMetrics();

      expect(optimization.optimizationsApplied).toBeGreaterThanOrEqual(0);
      expect(optimization.expectedImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Consistency', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should maintain data consistency across subsystems', async () => {
      const consistencyCheck = await integrationSystem.validateDataConsistency();

      expect(consistencyCheck.isConsistent).toBe(true);
      expect(consistencyCheck.subsystemsChecked).toBeGreaterThan(0);
    });

    it('should detect and repair inconsistencies', async () => {
      const repairResult = await integrationSystem.repairInconsistencies();

      expect(repairResult.inconsistenciesFound).toBeGreaterThanOrEqual(0);
      expect(repairResult.repairActions).toBeGreaterThanOrEqual(0);
      expect(repairResult.success).toBe(true);
    });

    it('should backup data before major operations', async () => {
      const backupResult = await integrationSystem.createIntegratedBackup();

      expect(backupResult.success).toBe(true);
      expect(backupResult.backupId).toBeDefined();
      expect(backupResult.subsystemsBackedUp.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should manage integrated configuration', () => {
      const config = {
        knowledgeGraph: { maxNodes: 1000 },
        learningSystem: { learningRate: 0.01 },
        temporalAnalysis: { windowSize: 7 },
      };

      integrationSystem.updateConfiguration(config);
      const currentConfig = integrationSystem.getConfiguration();

      expect(currentConfig.knowledgeGraph.maxNodes).toBe(1000);
      expect(currentConfig.learningSystem.learningRate).toBe(0.01);
      expect(currentConfig.temporalAnalysis.windowSize).toBe(7);
    });

    it('should validate configuration changes', () => {
      const invalidConfig = {
        knowledgeGraph: { maxNodes: -1 },
      };

      expect(() => {
        integrationSystem.updateConfiguration(invalidConfig);
      }).toThrow();
    });

    it('should apply configuration hot-reloading', async () => {
      const newConfig = {
        learningSystem: { learningRate: 0.05 },
      };

      const result = await integrationSystem.hotReloadConfiguration(newConfig);

      expect(result.success).toBe(true);
      expect(result.subsystemsReloaded.includes('learningSystem')).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should monitor overall system health', async () => {
      const health = await integrationSystem.getSystemHealth();

      expect(health.overall).toBeGreaterThanOrEqual(0);
      expect(health.overall).toBeLessThanOrEqual(100);
      expect(health.subsystems.knowledgeGraph).toBeDefined();
      expect(health.subsystems.learningSystem).toBeDefined();
      expect(health.subsystems.temporalAnalysis).toBeDefined();
    });

    it('should detect system degradation', async () => {
      const degradation = await integrationSystem.detectDegradation();

      expect(degradation.detected).toBeDefined();
      expect(degradation.severity).toBeDefined();
      expect(degradation.affectedSystems).toBeDefined();
    });

    it('should provide recovery recommendations', async () => {
      const recommendations = await integrationSystem.getRecoveryRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.every((r) => r.action && r.priority && r.description)).toBe(true);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      await integrationSystem.initializeSubsystems();
    });

    it('should shutdown subsystems gracefully', async () => {
      const shutdownResult = await integrationSystem.gracefulShutdown();

      expect(shutdownResult.success).toBe(true);
      expect(shutdownResult.subsystemsShutdown.length).toBeGreaterThan(0);
      expect(shutdownResult.dataIntegrityMaintained).toBe(true);
    });

    it('should handle partial shutdown failures', async () => {
      // Mock a subsystem that fails to shutdown
      jest
        .spyOn(integrationSystem, 'shutdownSubsystem')
        .mockRejectedValueOnce(new Error('Shutdown error'));

      const shutdownResult = await integrationSystem.gracefulShutdown();

      expect(shutdownResult.success).toBe(false);
      expect(shutdownResult.errors.length).toBeGreaterThan(0);
      expect(shutdownResult.partialSuccess).toBe(true);
    });

    it('should save state before shutdown', async () => {
      const saveResult = await integrationSystem.saveStateBeforeShutdown();

      expect(saveResult.success).toBe(true);
      expect(saveResult.stateSaved).toBe(true);
      expect(saveResult.stateFile).toBeDefined();
    });
  });
});
