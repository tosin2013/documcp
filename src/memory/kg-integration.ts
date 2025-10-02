/**
 * Knowledge Graph Integration Helper
 * Implements Phase 1.2: Context-Aware Repository Analysis Integration
 *
 * Provides helper functions for integrating the Knowledge Graph
 * with DocuMCP tools and workflows.
 */

import KnowledgeGraph, { GraphNode } from "./knowledge-graph.js";
import { KGStorage } from "./kg-storage.js";
import { MemoryManager } from "./manager.js";

let globalKnowledgeGraph: KnowledgeGraph | null = null;
let globalKGStorage: KGStorage | null = null;
let globalMemoryManager: MemoryManager | null = null;
let currentStorageDir: string | null = null;

/**
 * Initialize the global Knowledge Graph instance
 */
export async function initializeKnowledgeGraph(
  storageDir?: string,
): Promise<KnowledgeGraph> {
  const dir =
    storageDir ||
    process.env.DOCUMCP_STORAGE_DIR ||
    `${process.cwd()}/.documcp/memory`;

  // Reinitialize if storage directory changed
  if (currentStorageDir !== dir) {
    globalKnowledgeGraph = null;
    globalKGStorage = null;
    globalMemoryManager = null;
    currentStorageDir = dir;
  }

  if (!globalKnowledgeGraph) {
    // Initialize memory manager
    globalMemoryManager = new MemoryManager(dir);
    await globalMemoryManager.initialize();

    // Initialize KG storage
    globalKGStorage = new KGStorage({ storageDir: dir });
    await globalKGStorage.initialize();

    // Initialize knowledge graph
    globalKnowledgeGraph = new KnowledgeGraph(globalMemoryManager);
    await globalKnowledgeGraph.initialize();

    // Load existing graph data if available
    const { entities, relationships } = await globalKGStorage.loadGraph();
    for (const entity of entities) {
      globalKnowledgeGraph.addNode(entity);
    }
    for (const relationship of relationships) {
      globalKnowledgeGraph.addEdge(relationship);
    }
  }

  return globalKnowledgeGraph;
}

/**
 * Get the global Knowledge Graph instance
 */
export async function getKnowledgeGraph(): Promise<KnowledgeGraph> {
  if (!globalKnowledgeGraph) {
    return await initializeKnowledgeGraph();
  }
  return globalKnowledgeGraph;
}

/**
 * Get the global KG Storage instance
 */
export async function getKGStorage(): Promise<KGStorage> {
  if (!globalKGStorage) {
    await initializeKnowledgeGraph();
  }
  return globalKGStorage!;
}

/**
 * Get the global Memory Manager instance
 */
export async function getMemoryManager(): Promise<MemoryManager> {
  if (!globalMemoryManager) {
    await initializeKnowledgeGraph();
  }
  return globalMemoryManager!;
}

/**
 * Save the Knowledge Graph to persistent storage
 */
export async function saveKnowledgeGraph(): Promise<void> {
  if (!globalKnowledgeGraph || !globalKGStorage) {
    throw new Error("Knowledge Graph not initialized");
  }

  const entities = await globalKnowledgeGraph.getAllNodes();
  const edges = await globalKnowledgeGraph.getAllEdges();

  await globalKGStorage.saveGraph(entities, edges);
}

/**
 * Create or update a Project entity in the Knowledge Graph
 */
export async function createOrUpdateProject(analysis: any): Promise<GraphNode> {
  const kg = await getKnowledgeGraph();

  // Check for existing project
  const projectId = `project:${analysis.id}`;
  const existingProject = await kg.findNode({
    type: "project",
    properties: { path: analysis.path },
  });

  // Categorize project size
  const size =
    analysis.structure.totalFiles < 50
      ? "small"
      : analysis.structure.totalFiles < 500
        ? "medium"
        : "large";

  // Determine primary language
  const languages = analysis.structure.languages || {};
  const primaryLanguage = Object.keys(languages).reduce(
    (a, b) => (languages[a] > languages[b] ? a : b),
    Object.keys(languages)[0] || "unknown",
  );

  // Create/update project node
  const projectNode = kg.addNode({
    id: existingProject?.id || projectId,
    type: "project",
    label: analysis.projectName || "Unnamed Project",
    properties: {
      name: analysis.projectName,
      path: analysis.path,
      technologies: Object.keys(languages),
      size,
      primaryLanguage,
      hasTests: analysis.structure.hasTests || false,
      hasCI: analysis.structure.hasCI || false,
      hasDocs: analysis.structure.hasDocs || false,
      totalFiles: analysis.structure.totalFiles,
      lastAnalyzed: analysis.timestamp,
      analysisCount: existingProject
        ? (existingProject.properties.analysisCount || 0) + 1
        : 1,
    },
    weight: 1.0,
  });

  // Create technology nodes and relationships
  for (const [tech, fileCount] of Object.entries(languages) as [
    string,
    number,
  ][]) {
    const techNodeId = `technology:${tech.toLowerCase()}`;

    // Create technology node if it doesn't exist
    const existingTech = await kg.findNode({
      type: "technology",
      properties: { name: tech },
    });

    const techNode = kg.addNode({
      id: existingTech?.id || techNodeId,
      type: "technology",
      label: tech,
      properties: {
        name: tech,
        category: "language",
        usageCount: existingTech
          ? (existingTech.properties.usageCount || 0) + 1
          : 1,
      },
      weight: 1.0,
    });

    // Create relationship
    kg.addEdge({
      source: projectNode.id,
      target: techNode.id,
      type: "project_uses_technology",
      weight: fileCount / analysis.structure.totalFiles,
      confidence: 1.0,
      properties: {
        fileCount,
        percentage: (fileCount / analysis.structure.totalFiles) * 100,
        isPrimary: tech === primaryLanguage,
      },
    });
  }

  // Save to persistent storage
  await saveKnowledgeGraph();

  return projectNode;
}

/**
 * Get historical context for a project
 */
export async function getProjectContext(projectPath: string): Promise<{
  previousAnalyses: number;
  lastAnalyzed: string | null;
  knownTechnologies: string[];
  similarProjects: GraphNode[];
}> {
  const kg = await getKnowledgeGraph();

  // Find project node
  const projectNode = await kg.findNode({
    type: "project",
    properties: { path: projectPath },
  });

  if (!projectNode) {
    return {
      previousAnalyses: 0,
      lastAnalyzed: null,
      knownTechnologies: [],
      similarProjects: [],
    };
  }

  // Get project's technologies
  const techEdges = await kg.findEdges({
    source: projectNode.id,
    type: "project_uses_technology",
  });

  const technologies: string[] = [];
  for (const edge of techEdges) {
    const techNode = (await kg.getAllNodes()).find((n) => n.id === edge.target);
    if (techNode) {
      technologies.push(techNode.properties.name);
    }
  }

  // Find similar projects
  const allProjects = await kg.findNodes({ type: "project" });
  const similarProjects: GraphNode[] = [];

  for (const otherProject of allProjects) {
    if (otherProject.id === projectNode.id) continue;

    // Check for similarity based on shared technologies
    const otherTechEdges = await kg.findEdges({
      source: otherProject.id,
      type: "project_uses_technology",
    });

    const otherTechs = new Set(otherTechEdges.map((e) => e.target));
    const sharedTechs = techEdges.filter((e) => otherTechs.has(e.target));

    if (sharedTechs.length > 0) {
      similarProjects.push(otherProject);
    }
  }

  // Sort by similarity (shared tech count)
  similarProjects.sort((a, b) => {
    const aShared = techEdges.filter(async (e) => {
      const aEdges = await kg.findEdges({ source: a.id });
      return aEdges.some((ae) => ae.target === e.target);
    }).length;
    const bShared = techEdges.filter(async (e) => {
      const bEdges = await kg.findEdges({ source: b.id });
      return bEdges.some((be) => be.target === e.target);
    }).length;
    return bShared - aShared;
  });

  return {
    previousAnalyses: projectNode.properties.analysisCount || 0,
    lastAnalyzed: projectNode.properties.lastAnalyzed || null,
    knownTechnologies: technologies,
    similarProjects: similarProjects.slice(0, 5),
  };
}

// Counter to ensure unique deployment IDs even when timestamps collide
let deploymentCounter = 0;

/**
 * Track a deployment outcome in the Knowledge Graph
 */
export async function trackDeployment(
  projectNodeId: string,
  ssg: string,
  success: boolean,
  metadata?: {
    buildTime?: number;
    errorMessage?: string;
    deploymentUrl?: string;
  },
): Promise<void> {
  const kg = await getKnowledgeGraph();

  // Find project node by ID
  const allNodes = await kg.getAllNodes();
  const projectNode = allNodes.find((n) => n.id === projectNodeId);

  if (!projectNode) {
    throw new Error(`Project not found: ${projectNodeId}`);
  }

  // Find or create configuration node
  const configNodeId = `configuration:${ssg}`;
  let configNode = await kg.findNode({
    type: "configuration",
    properties: { ssg },
  });

  if (!configNode) {
    configNode = kg.addNode({
      id: configNodeId,
      type: "configuration",
      label: `${ssg} configuration`,
      properties: {
        ssg,
        settings: {},
        deploymentSuccessRate: success ? 1.0 : 0.0,
        usageCount: 1,
        lastUsed: new Date().toISOString(),
      },
      weight: 1.0,
    });
  } else {
    // Update success rate
    const currentRate = configNode.properties.deploymentSuccessRate || 0.5;
    const currentCount = configNode.properties.usageCount || 1;
    const newRate =
      (currentRate * currentCount + (success ? 1.0 : 0.0)) / (currentCount + 1);

    configNode.properties.deploymentSuccessRate = newRate;
    configNode.properties.usageCount = currentCount + 1;
    configNode.properties.lastUsed = new Date().toISOString();

    if (metadata?.buildTime) {
      const currentAvg = configNode.properties.buildTimeAverage || 0;
      configNode.properties.buildTimeAverage =
        (currentAvg * currentCount + metadata.buildTime) / (currentCount + 1);
    }

    // Re-add the node to update it in the knowledge graph
    kg.addNode(configNode);
  }

  // Create deployment relationship with unique timestamp+counter to allow multiple deployments
  const timestamp = new Date().toISOString();
  const uniqueId = `${timestamp}:${deploymentCounter++}`;
  kg.addEdge({
    source: projectNode.id,
    target: configNode.id,
    type: `project_deployed_with:${uniqueId}`,
    weight: success ? 1.0 : 0.5,
    confidence: 1.0,
    properties: {
      success,
      timestamp,
      buildTime: metadata?.buildTime,
      errorMessage: metadata?.errorMessage,
      deploymentUrl: metadata?.deploymentUrl,
      // Store the base type for filtering
      baseType: "project_deployed_with",
    },
  });

  await saveKnowledgeGraph();
}

/**
 * Get deployment recommendations based on historical data
 */
export async function getDeploymentRecommendations(projectId: string): Promise<
  Array<{
    ssg: string;
    confidence: number;
    reasoning: string[];
    successRate: number;
  }>
> {
  const kg = await getKnowledgeGraph();

  // Find project
  const projectNode = await kg.findNode({
    type: "project",
    properties: { id: projectId },
  });

  if (!projectNode) {
    return [];
  }

  // Find similar projects
  const similarProjects = await kg.findNodes({
    type: "project",
  });

  const recommendations = new Map<
    string,
    {
      ssg: string;
      totalWeight: number;
      count: number;
      successRate: number;
      reasoning: string[];
    }
  >();

  // Analyze deployments from similar projects
  for (const similar of similarProjects) {
    if (similar.id === projectNode.id) continue;

    const deployments = await kg.findEdges({
      source: similar.id,
      type: "project_deployed_with",
    });

    for (const deployment of deployments) {
      const configNode = (await kg.getAllNodes()).find(
        (n) => n.id === deployment.target,
      );
      if (!configNode) continue;

      const ssg = configNode.properties.ssg;
      const existing = recommendations.get(ssg) || {
        ssg,
        totalWeight: 0,
        count: 0,
        successRate: 0,
        reasoning: [] as string[],
      };

      existing.totalWeight += deployment.weight;
      existing.count += 1;
      existing.successRate = configNode.properties.deploymentSuccessRate || 0;

      if (deployment.properties.success) {
        existing.reasoning.push(
          `Successfully used by similar project ${similar.label}`,
        );
      }

      recommendations.set(ssg, existing);
    }
  }

  // Convert to array and calculate confidence
  return Array.from(recommendations.values())
    .map((rec) => ({
      ssg: rec.ssg,
      confidence: (rec.totalWeight / rec.count) * rec.successRate,
      reasoning: rec.reasoning.slice(0, 3), // Top 3 reasons
      successRate: rec.successRate,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get Knowledge Graph statistics
 */
export async function getKGStatistics(): Promise<{
  nodeCount: number;
  edgeCount: number;
  projectCount: number;
  technologyCount: number;
  configurationCount: number;
  storageStats: any;
}> {
  const kg = await getKnowledgeGraph();
  const storage = await getKGStorage();

  const stats = await kg.getStatistics();
  const storageStats = await storage.getStatistics();

  return {
    nodeCount: stats.nodeCount,
    edgeCount: stats.edgeCount,
    projectCount: stats.nodesByType["project"] || 0,
    technologyCount: stats.nodesByType["technology"] || 0,
    configurationCount: stats.nodesByType["configuration"] || 0,
    storageStats,
  };
}
