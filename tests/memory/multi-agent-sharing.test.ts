/**
 * Test suite for Multi-Agent Memory Sharing System
 */

import { jest } from '@jest/globals';
import { MultiAgentSharingManager } from '../../src/memory/multi-agent-sharing.js';
import { MemoryManager } from '../../src/memory/manager.js';
import { MemoryEntry } from '../../src/memory/storage.js';
import { AgentIdentity, SharedMemory, SyncRequest } from '../../src/memory/multi-agent-sharing.js';

// Mock the MemoryManager
jest.mock('../../src/memory/manager.js');

describe('MultiAgentSharingManager', () => {
  let sharingManager: MultiAgentSharingManager;
  let mockMemoryManager: jest.Mocked<MemoryManager>;

  const mockAgentIdentity: AgentIdentity = {
    id: 'test-agent-1',
    name: 'Test Agent',
    version: '1.0.0',
    capabilities: ['analysis', 'recommendation'],
    lastSeen: new Date().toISOString(),
    trustLevel: 'medium',
    specializations: ['documentation', 'testing'],
  };

  const mockMemoryEntry: MemoryEntry = {
    id: 'test-entry-1',
    content: 'Test memory content',
    metadata: {
      type: 'analysis',
      tags: ['test'],
      timestamp: new Date().toISOString(),
      context: { project: 'test' },
    },
    importance: 0.8,
    lastAccessed: new Date().toISOString(),
    accessCount: 1,
  };

  beforeEach(() => {
    mockMemoryManager = new MemoryManager('test-dir') as jest.Mocked<MemoryManager>;
    sharingManager = new MultiAgentSharingManager(mockMemoryManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Management', () => {
    it('should register a new agent', async () => {
      await sharingManager.registerAgent(mockAgentIdentity);
      const agents = await sharingManager.getRegisteredAgents();
      expect(agents).toContain(mockAgentIdentity.id);
    });

    it('should update agent last seen on registration', async () => {
      const initialTime = mockAgentIdentity.lastSeen;
      await new Promise((resolve) => setTimeout(resolve, 10));

      await sharingManager.registerAgent({
        ...mockAgentIdentity,
        lastSeen: new Date().toISOString(),
      });

      const agent = await sharingManager.getAgentInfo(mockAgentIdentity.id);
      expect(agent?.lastSeen).not.toBe(initialTime);
    });

    it('should handle agent trust level updates', async () => {
      await sharingManager.registerAgent(mockAgentIdentity);
      await sharingManager.updateAgentTrust(mockAgentIdentity.id, 'high');

      const agent = await sharingManager.getAgentInfo(mockAgentIdentity.id);
      expect(agent?.trustLevel).toBe('high');
    });
  });

  describe('Memory Sharing', () => {
    beforeEach(async () => {
      await sharingManager.registerAgent(mockAgentIdentity);
    });

    it('should share memory entry successfully', async () => {
      const result = await sharingManager.shareMemory(mockMemoryEntry, mockAgentIdentity.id, [
        'test-agent-2',
      ]);

      expect(result.success).toBe(true);
      expect(result.sharedMemoryId).toBeDefined();
    });

    it('should apply transformations when sharing', async () => {
      const result = await sharingManager.shareMemory(
        mockMemoryEntry,
        mockAgentIdentity.id,
        ['test-agent-2'],
        { applyAnonymization: true },
      );

      expect(result.success).toBe(true);
      expect(result.transformations).toContain('anonymization');
    });

    it('should validate trust levels before sharing', async () => {
      const untrustedAgent: AgentIdentity = {
        ...mockAgentIdentity,
        id: 'untrusted-agent',
        trustLevel: 'untrusted',
      };

      await sharingManager.registerAgent(untrustedAgent);

      const result = await sharingManager.shareMemory(mockMemoryEntry, untrustedAgent.id, [
        'test-agent-2',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('trust level');
    });
  });

  describe('Synchronization', () => {
    const mockSyncRequest: SyncRequest = {
      id: 'sync-1',
      fromAgent: mockAgentIdentity.id,
      toAgent: 'test-agent-2',
      requestType: 'incremental',
      criteria: {
        types: ['analysis'],
        timeRange: {
          start: new Date(Date.now() - 86400000).toISOString(),
          end: new Date().toISOString(),
        },
      },
    };

    beforeEach(async () => {
      await sharingManager.registerAgent(mockAgentIdentity);
    });

    it('should process sync request successfully', async () => {
      const result = await sharingManager.processSyncRequest(mockSyncRequest);
      expect(result.success).toBe(true);
      expect(result.syncId).toBe(mockSyncRequest.id);
    });

    it('should handle incremental sync', async () => {
      const result = await sharingManager.processSyncRequest(mockSyncRequest);
      expect(result.syncType).toBe('incremental');
      expect(result.entriesCount).toBeGreaterThanOrEqual(0);
    });

    it('should validate sync request parameters', async () => {
      const invalidRequest = {
        ...mockSyncRequest,
        fromAgent: 'non-existent-agent',
      };

      const result = await sharingManager.processSyncRequest(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await sharingManager.registerAgent(mockAgentIdentity);
    });

    it('should detect memory conflicts', async () => {
      const conflictingEntry = {
        ...mockMemoryEntry,
        id: 'conflict-entry',
        content: 'Conflicting content',
      };

      await sharingManager.shareMemory(mockMemoryEntry, mockAgentIdentity.id, ['test-agent-2']);

      const conflicts = await sharingManager.detectConflicts(conflictingEntry, 'test-agent-2');
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should resolve conflicts using voting mechanism', async () => {
      const resolution = await sharingManager.resolveConflict('conflict-1', 'voting', {
        threshold: 0.6,
      });

      expect(resolution.method).toBe('voting');
      expect(resolution.success).toBeDefined();
    });
  });

  describe('Security and Validation', () => {
    it('should validate agent signatures', async () => {
      const isValid = await sharingManager.validateAgentSignature(
        mockAgentIdentity.id,
        'test-data',
        'mock-signature',
      );

      expect(typeof isValid).toBe('boolean');
    });

    it('should encrypt sensitive memory data', async () => {
      const sensitiveEntry = {
        ...mockMemoryEntry,
        metadata: {
          ...mockMemoryEntry.metadata,
          sensitivity: 'high',
        },
      };

      const encrypted = await sharingManager.encryptMemoryEntry(sensitiveEntry);
      expect(encrypted.encrypted).toBe(true);
      expect(encrypted.content).not.toBe(sensitiveEntry.content);
    });

    it('should audit memory access', async () => {
      await sharingManager.shareMemory(mockMemoryEntry, mockAgentIdentity.id, ['test-agent-2']);

      const auditLog = await sharingManager.getAuditLog(mockMemoryEntry.id);
      expect(Array.isArray(auditLog)).toBe(true);
      expect(auditLog.length).toBeGreaterThan(0);
    });
  });

  describe('Network Topology', () => {
    it('should discover peer agents', async () => {
      const peers = await sharingManager.discoverPeers();
      expect(Array.isArray(peers)).toBe(true);
    });

    it('should maintain network health metrics', async () => {
      const health = await sharingManager.getNetworkHealth();
      expect(health.connectedAgents).toBeDefined();
      expect(health.syncLatency).toBeDefined();
      expect(health.trustNetworkScore).toBeDefined();
    });

    it('should handle network partitions gracefully', async () => {
      const result = await sharingManager.handleNetworkPartition(['test-agent-2']);
      expect(result.strategy).toBeDefined();
      expect(result.actions).toBeDefined();
    });
  });

  describe('Event Handling', () => {
    it('should emit events on agent registration', (done) => {
      sharingManager.on('agentRegistered', (agentId) => {
        expect(agentId).toBe(mockAgentIdentity.id);
        done();
      });

      sharingManager.registerAgent(mockAgentIdentity);
    });

    it('should emit events on memory sharing', (done) => {
      sharingManager.on('memoryShared', (data) => {
        expect(data.entryId).toBe(mockMemoryEntry.id);
        expect(data.sourceAgent).toBe(mockAgentIdentity.id);
        done();
      });

      sharingManager.registerAgent(mockAgentIdentity).then(() => {
        sharingManager.shareMemory(mockMemoryEntry, mockAgentIdentity.id, ['test-agent-2']);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large sync operations efficiently', async () => {
      const startTime = Date.now();

      const largeSyncRequest = {
        ...mockSyncRequest,
        requestType: 'full_sync' as const,
      };

      await sharingManager.processSyncRequest(largeSyncRequest);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should implement rate limiting', async () => {
      const requests = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...mockSyncRequest,
          id: `sync-${i}`,
        }));

      const results = await Promise.all(
        requests.map((req) => sharingManager.processSyncRequest(req)),
      );

      const rateLimited = results.filter((r) => r.error?.includes('rate limit'));
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid agent IDs gracefully', async () => {
      const result = await sharingManager.shareMemory(mockMemoryEntry, 'invalid-agent-id', [
        'test-agent-2',
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not registered');
    });

    it('should handle network errors during sync', async () => {
      const result = await sharingManager.processSyncRequest({
        ...mockSyncRequest,
        toAgent: 'unreachable-agent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should recover from partial sync failures', async () => {
      const recovery = await sharingManager.recoverFromSyncFailure('failed-sync-1');
      expect(recovery.strategy).toBeDefined();
      expect(recovery.retryCount).toBeDefined();
    });
  });
});
