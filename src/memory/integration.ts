/**
 * Memory System Integration for DocuMCP
 * Connects memory capabilities to MCP tools
 */

import { MemoryManager } from './manager.js';
import { MemoryEntry } from './storage.js';

let memoryManager: MemoryManager | null = null;

export async function initializeMemory(): Promise<MemoryManager> {
  if (!memoryManager) {
    memoryManager = new MemoryManager();
    await memoryManager.initialize();

    // Set up event listeners
    memoryManager.on('memory-created', (entry: MemoryEntry) => {
      // eslint-disable-next-line no-console
      console.log(`[Memory] Created: ${entry.id} (${entry.type})`);
    });

    memoryManager.on('memory-updated', (entry: MemoryEntry) => {
      // eslint-disable-next-line no-console
      console.log(`[Memory] Updated: ${entry.id}`);
    });

    memoryManager.on('memory-deleted', (id: string) => {
      // eslint-disable-next-line no-console
      console.log(`[Memory] Deleted: ${id}`);
    });
  }

  return memoryManager;
}

export async function rememberAnalysis(projectPath: string, analysisData: any): Promise<string> {
  const manager = await initializeMemory();

  manager.setContext({
    projectId: analysisData.projectId || projectPath,
    repository: analysisData.repository?.url,
  });

  const entry = await manager.remember('analysis', analysisData, {
    repository: analysisData.repository?.url,
    tags: [
      'analysis',
      analysisData.language?.primary || 'unknown',
      analysisData.framework?.name || 'none',
    ],
  });

  return entry.id;
}

export async function rememberRecommendation(
  analysisId: string,
  recommendation: any,
): Promise<string> {
  const manager = await initializeMemory();

  const entry = await manager.remember('recommendation', recommendation, {
    ssg: recommendation.recommended,
    tags: ['recommendation', recommendation.recommended, 'ssg'],
  });

  // Link to analysis
  const analysis = await manager.recall(analysisId);
  if (analysis) {
    await manager.update(entry.id, {
      metadata: {
        ...entry.metadata,
        projectId: analysis.metadata.projectId,
      },
    });
  }

  return entry.id;
}

export async function rememberDeployment(repository: string, deploymentData: any): Promise<string> {
  const manager = await initializeMemory();

  manager.setContext({
    projectId: repository,
    repository,
  });

  const entry = await manager.remember('deployment', deploymentData, {
    repository,
    ssg: deploymentData.ssg,
    tags: ['deployment', deploymentData.status || 'unknown', deploymentData.ssg],
  });

  return entry.id;
}

export async function rememberConfiguration(
  projectName: string,
  ssg: string,
  configData: any,
): Promise<string> {
  const manager = await initializeMemory();

  manager.setContext({
    projectId: projectName,
  });

  const entry = await manager.remember('configuration', configData, {
    ssg,
    tags: ['configuration', ssg, projectName],
  });

  return entry.id;
}

export async function recallProjectHistory(projectId: string): Promise<any> {
  const manager = await initializeMemory();

  const memories = await manager.search({ projectId }, { sortBy: 'timestamp', groupBy: 'type' });

  return {
    projectId,
    history: memories,
    insights: await getProjectInsights(projectId),
  };
}

export async function getProjectInsights(projectId: string): Promise<string[]> {
  const manager = await initializeMemory();

  const memories = await manager.search({ projectId });
  const insights: string[] = [];

  // Find patterns in SSG choices
  const ssgMemories = memories.filter((m: any) => m.metadata.ssg);
  if (ssgMemories.length > 0) {
    const lastSSG = ssgMemories[ssgMemories.length - 1].metadata.ssg;
    insights.push(`Previously used ${lastSSG} for this project`);
  }

  // Find deployment patterns
  const deployments = memories.filter((m: any) => m.type === 'deployment');
  if (deployments.length > 0) {
    const successful = deployments.filter((d: any) => d.data.status === 'success').length;
    const rate = ((successful / deployments.length) * 100).toFixed(0);
    insights.push(`Deployment success rate: ${rate}%`);
  }

  // Find recent activity
  const lastMemory = memories[memories.length - 1];
  if (lastMemory) {
    const daysAgo = Math.floor(
      (Date.now() - new Date(lastMemory.timestamp).getTime()) / (1000 * 60 * 60 * 24),
    );
    insights.push(`Last activity: ${daysAgo} days ago`);
  }

  return insights;
}

export async function getSimilarProjects(analysisData: any, limit: number = 5): Promise<any[]> {
  const manager = await initializeMemory();

  // Search for projects with similar characteristics
  const similarProjects: any[] = [];

  // Search by language
  if (analysisData.language?.primary) {
    const languageMatches = await manager.search(
      { tags: [analysisData.language.primary] },
      { sortBy: 'timestamp' },
    );
    similarProjects.push(...languageMatches);
  }

  // Search by framework
  if (analysisData.framework?.name) {
    const frameworkMatches = await manager.search(
      { tags: [analysisData.framework.name] },
      { sortBy: 'timestamp' },
    );
    similarProjects.push(...frameworkMatches);
  }

  // Deduplicate and return top matches
  const unique = Array.from(
    new Map(similarProjects.map((p) => [p.metadata.projectId, p])).values(),
  );

  return unique.slice(0, limit).map((project) => ({
    projectId: project.metadata.projectId,
    similarity: calculateSimilarity(analysisData, project.data),
    recommendation: project.metadata.ssg,
    timestamp: project.timestamp,
  }));
}

function calculateSimilarity(data1: any, data2: any): number {
  let score = 0;

  // Language match
  if (data1.language?.primary === data2.language?.primary) score += 0.3;

  // Framework match
  if (data1.framework?.name === data2.framework?.name) score += 0.3;

  // Size similarity
  if (Math.abs((data1.stats?.files || 0) - (data2.stats?.files || 0)) < 100) score += 0.2;

  // Documentation type match
  if (data1.documentation?.type === data2.documentation?.type) score += 0.2;

  return Math.min(score, 1.0);
}

export async function cleanupOldMemories(daysToKeep: number = 30): Promise<number> {
  const manager = await initializeMemory();
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  return await manager.cleanup(cutoffDate);
}

export async function exportMemories(format: 'json' | 'csv' = 'json'): Promise<string> {
  const manager = await initializeMemory();
  return await manager.export(format);
}

export async function importMemories(
  data: string,
  format: 'json' | 'csv' = 'json',
): Promise<number> {
  const manager = await initializeMemory();
  return await manager.import(data, format);
}

export async function getMemoryStatistics(): Promise<any> {
  const manager = await initializeMemory();
  return await manager.analyze();
}

export function getMemoryManager(): MemoryManager | null {
  return memoryManager;
}
