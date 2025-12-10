/**
 * Knowledge Graph Architecture for DocuMCP
 * Implements Phase 1.1: Enhanced Knowledge Graph Schema Implementation
 * Previously: Issue #48: Knowledge Graph Architecture
 *
 * Creates entity relationship graphs for projects, technologies, patterns, and dependencies
 * to enable advanced reasoning and recommendation improvements.
 *
 * Enhanced with comprehensive entity types and relationship schemas following NEW_PRD.md
 */

import { MemoryManager } from "./manager.js";
import { MemoryEntry } from "./storage.js";
import {
  validateEntity,
  validateRelationship,
  SCHEMA_METADATA,
} from "./schemas.js";

export interface GraphNode {
  id: string;
  type:
    | "project"
    | "technology"
    | "pattern"
    | "user"
    | "outcome"
    | "recommendation"
    | "configuration"
    | "documentation"
    | "code_file"
    | "documentation_section"
    | "link_validation"
    | "sync_event"
    | "documentation_freshness_event"
    | "documentation_example"
    | "example_validation"
    | "call_graph";
  label: string;
  properties: Record<string, any>;
  weight: number;
  lastUpdated: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type:
    | "uses"
    | "similar_to"
    | "depends_on"
    | "recommends"
    | "results_in"
    | "created_by"
    | "project_uses_technology"
    | "user_prefers_ssg"
    | "project_deployed_with"
    | "documents"
    | "references"
    | "outdated_for"
    | "has_link_validation"
    | "requires_fix"
    | "project_has_freshness_event"
    | "has_example"
    | "validates"
    | "has_call_graph"
    | (string & NonNullable<unknown>); // Allow any string (for timestamped types like "project_deployed_with:2024-...")
  weight: number;
  properties: Record<string, any>;
  confidence: number;
  lastUpdated: string;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalWeight: number;
  confidence: number;
}

export interface GraphQuery {
  nodeTypes?: string[];
  edgeTypes?: string[];
  properties?: Record<string, any>;
  minWeight?: number;
  maxDepth?: number;
  startNode?: string;
}

export interface RecommendationPath {
  from: GraphNode;
  to: GraphNode;
  path: GraphPath;
  reasoning: string[];
  confidence: number;
}

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge>;
  private adjacencyList: Map<string, Set<string>>;
  private memoryManager: MemoryManager;
  private lastUpdate: string;

  constructor(memoryManager: MemoryManager) {
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyList = new Map();
    this.memoryManager = memoryManager;
    this.lastUpdate = new Date().toISOString();
  }

  async initialize(): Promise<void> {
    await this.loadFromMemory();
    await this.buildFromMemories();
  }

  /**
   * Add or update a node in the knowledge graph
   */
  addNode(node: Omit<GraphNode, "lastUpdated">): GraphNode {
    const fullNode: GraphNode = {
      ...node,
      lastUpdated: new Date().toISOString(),
    };

    this.nodes.set(node.id, fullNode);

    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }

    return fullNode;
  }

  /**
   * Add or update an edge in the knowledge graph
   */
  addEdge(edge: Omit<GraphEdge, "id" | "lastUpdated">): GraphEdge {
    const edgeId = `${edge.source}-${edge.type}-${edge.target}`;
    const fullEdge: GraphEdge = {
      ...edge,
      id: edgeId,
      lastUpdated: new Date().toISOString(),
    };

    this.edges.set(edgeId, fullEdge);

    // Update adjacency list
    if (!this.adjacencyList.has(edge.source)) {
      this.adjacencyList.set(edge.source, new Set());
    }
    if (!this.adjacencyList.has(edge.target)) {
      this.adjacencyList.set(edge.target, new Set());
    }

    this.adjacencyList.get(edge.source)!.add(edge.target);

    return fullEdge;
  }

  /**
   * Build knowledge graph from memory entries
   */
  async buildFromMemories(): Promise<void> {
    const memories = await this.memoryManager.search("", {
      sortBy: "timestamp",
    });

    for (const memory of memories) {
      await this.processMemoryEntry(memory);
    }

    await this.computeRelationships();
    await this.updateWeights();
  }

  /**
   * Process a single memory entry to extract graph entities
   */
  private async processMemoryEntry(memory: MemoryEntry): Promise<void> {
    // Create project node
    if (memory.metadata.projectId) {
      const projectNode = this.addNode({
        id: `project:${memory.metadata.projectId}`,
        type: "project",
        label: memory.metadata.projectId,
        properties: {
          repository: memory.metadata.repository,
          lastActivity: memory.timestamp,
        },
        weight: 1.0,
      });

      // Create technology nodes
      if (memory.type === "analysis" && memory.data.language) {
        const langNode = this.addNode({
          id: `tech:${memory.data.language.primary}`,
          type: "technology",
          label: memory.data.language.primary,
          properties: {
            category: "language",
            popularity: this.getTechnologyPopularity(
              memory.data.language.primary,
            ),
          },
          weight: 1.0,
        });

        this.addEdge({
          source: projectNode.id,
          target: langNode.id,
          type: "uses",
          weight: 1.0,
          confidence: 0.9,
          properties: { source: "analysis" },
        });
      }

      // Create framework nodes
      if (memory.data.framework?.name) {
        const frameworkNode = this.addNode({
          id: `tech:${memory.data.framework.name}`,
          type: "technology",
          label: memory.data.framework.name,
          properties: {
            category: "framework",
            version: memory.data.framework.version,
          },
          weight: 1.0,
        });

        this.addEdge({
          source: projectNode.id,
          target: frameworkNode.id,
          type: "uses",
          weight: 1.0,
          confidence: 0.8,
          properties: { source: "analysis" },
        });
      }

      // Create SSG recommendation nodes
      if (memory.type === "recommendation" && memory.data.recommended) {
        const ssgNode = this.addNode({
          id: `tech:${memory.data.recommended}`,
          type: "technology",
          label: memory.data.recommended,
          properties: {
            category: "ssg",
            score: memory.data.score,
          },
          weight: 1.0,
        });

        this.addEdge({
          source: projectNode.id,
          target: ssgNode.id,
          type: "recommends",
          weight: memory.data.score || 1.0,
          confidence: memory.data.confidence || 0.5,
          properties: {
            source: "recommendation",
            reasoning: memory.data.reasoning,
          },
        });
      }

      // Create outcome nodes
      if (memory.type === "deployment") {
        const outcomeNode = this.addNode({
          id: `outcome:${memory.data.status}:${memory.metadata.ssg}`,
          type: "outcome",
          label: `${memory.data.status} with ${memory.metadata.ssg}`,
          properties: {
            status: memory.data.status,
            ssg: memory.metadata.ssg,
            duration: memory.data.duration,
          },
          weight: memory.data.status === "success" ? 1.0 : 0.5,
        });

        this.addEdge({
          source: projectNode.id,
          target: outcomeNode.id,
          type: "results_in",
          weight: 1.0,
          confidence: 1.0,
          properties: {
            timestamp: memory.timestamp,
            details: memory.data.details,
          },
        });
      }
    }
  }

  /**
   * Compute additional relationships based on patterns
   */
  private async computeRelationships(): Promise<void> {
    // Find similar projects
    await this.computeProjectSimilarity();

    // Find technology dependencies
    await this.computeTechnologyDependencies();

    // Find pattern relationships
    await this.computePatternRelationships();
  }

  /**
   * Compute project similarity relationships
   */
  private async computeProjectSimilarity(): Promise<void> {
    const projectNodes = Array.from(this.nodes.values()).filter(
      (node) => node.type === "project",
    );

    for (let i = 0; i < projectNodes.length; i++) {
      for (let j = i + 1; j < projectNodes.length; j++) {
        const similarity = this.calculateProjectSimilarity(
          projectNodes[i],
          projectNodes[j],
        );

        if (similarity > 0.7) {
          this.addEdge({
            source: projectNodes[i].id,
            target: projectNodes[j].id,
            type: "similar_to",
            weight: similarity,
            confidence: similarity,
            properties: {
              computed: true,
              similarityScore: similarity,
            },
          });
        }
      }
    }
  }

  /**
   * Calculate similarity between two projects
   */
  private calculateProjectSimilarity(
    project1: GraphNode,
    project2: GraphNode,
  ): number {
    const tech1 = this.getConnectedTechnologies(project1.id);
    const tech2 = this.getConnectedTechnologies(project2.id);

    if (tech1.size === 0 || tech2.size === 0) return 0;

    const intersection = new Set([...tech1].filter((x) => tech2.has(x)));
    const union = new Set([...tech1, ...tech2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Get technologies connected to a project
   */
  private getConnectedTechnologies(projectId: string): Set<string> {
    const technologies = new Set<string>();
    const adjacents = this.adjacencyList.get(projectId) || new Set();

    for (const nodeId of adjacents) {
      const node = this.nodes.get(nodeId);
      if (node && node.type === "technology") {
        technologies.add(nodeId);
      }
    }

    return technologies;
  }

  /**
   * Compute technology dependency relationships
   */
  private async computeTechnologyDependencies(): Promise<void> {
    // Define known technology dependencies
    const dependencies = new Map([
      ["tech:react", ["tech:javascript", "tech:nodejs"]],
      ["tech:vue", ["tech:javascript", "tech:nodejs"]],
      ["tech:angular", ["tech:typescript", "tech:nodejs"]],
      ["tech:gatsby", ["tech:react", "tech:graphql"]],
      ["tech:next.js", ["tech:react", "tech:nodejs"]],
      ["tech:nuxt.js", ["tech:vue", "tech:nodejs"]],
      ["tech:docusaurus", ["tech:react", "tech:markdown"]],
      ["tech:jekyll", ["tech:ruby", "tech:markdown"]],
      ["tech:hugo", ["tech:go", "tech:markdown"]],
      ["tech:mkdocs", ["tech:python", "tech:markdown"]],
    ]);

    for (const [tech, deps] of dependencies) {
      for (const dep of deps) {
        const techNode = this.nodes.get(tech);
        const depNode = this.nodes.get(dep);

        if (techNode && depNode) {
          this.addEdge({
            source: tech,
            target: dep,
            type: "depends_on",
            weight: 0.8,
            confidence: 0.9,
            properties: {
              computed: true,
              dependency_type: "runtime",
            },
          });
        }
      }
    }
  }

  /**
   * Compute pattern relationships from successful combinations
   */
  private async computePatternRelationships(): Promise<void> {
    const successfulOutcomes = Array.from(this.nodes.values()).filter(
      (node) => node.type === "outcome" && node.properties.status === "success",
    );

    for (const outcome of successfulOutcomes) {
      // Find the path that led to this successful outcome
      const incomingEdges = Array.from(this.edges.values()).filter(
        (edge) => edge.target === outcome.id,
      );

      for (const edge of incomingEdges) {
        const sourceNode = this.nodes.get(edge.source);
        if (sourceNode && sourceNode.type === "project") {
          // Strengthen relationships for successful patterns
          this.strengthenSuccessPattern(sourceNode.id, outcome.properties.ssg);
        }
      }
    }
  }

  /**
   * Strengthen relationships for successful patterns
   */
  private strengthenSuccessPattern(projectId: string, ssg: string): void {
    const ssgNodeId = `tech:${ssg}`;
    const edgeId = `${projectId}-recommends-${ssgNodeId}`;
    const edge = this.edges.get(edgeId);

    if (edge) {
      edge.weight = Math.min(edge.weight * 1.2, 2.0);
      edge.confidence = Math.min(edge.confidence * 1.1, 1.0);
    }
  }

  /**
   * Update node and edge weights based on usage patterns
   */
  private async updateWeights(): Promise<void> {
    // Update node weights based on connections
    for (const node of this.nodes.values()) {
      const connections = this.adjacencyList.get(node.id)?.size || 0;
      node.weight = Math.log(connections + 1) / Math.log(10); // Logarithmic scaling
    }

    // Update edge weights based on frequency and success
    for (const edge of this.edges.values()) {
      if (edge.type === "recommends") {
        // Find successful outcomes for this recommendation
        const targetNode = this.nodes.get(edge.target);
        if (targetNode && targetNode.type === "technology") {
          const successRate = this.calculateSuccessRate(targetNode.id);
          edge.weight *= 1 + successRate;
        }
      }
    }
  }

  /**
   * Calculate success rate for a technology
   */
  private calculateSuccessRate(techId: string): number {
    const tech = techId.replace("tech:", "");
    const outcomes = Array.from(this.nodes.values()).filter(
      (node) => node.type === "outcome" && node.properties.ssg === tech,
    );

    if (outcomes.length === 0) return 0;

    const successes = outcomes.filter(
      (node) => node.properties.status === "success",
    ).length;
    return successes / outcomes.length;
  }

  /**
   * Find the shortest path between two nodes
   */
  findPath(
    sourceId: string,
    targetId: string,
    maxDepth: number = 5,
  ): GraphPath | null {
    const visited = new Set<string>();
    const queue: { nodeId: string; path: GraphPath }[] = [
      {
        nodeId: sourceId,
        path: {
          nodes: [this.nodes.get(sourceId)!],
          edges: [],
          totalWeight: 0,
          confidence: 1.0,
        },
      },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.nodeId === targetId) {
        return current.path;
      }

      if (current.path.nodes.length >= maxDepth) {
        continue;
      }

      visited.add(current.nodeId);
      const neighbors = this.adjacencyList.get(current.nodeId) || new Set();

      for (const neighborId of neighbors) {
        if (visited.has(neighborId)) continue;

        const edge = this.findEdge(current.nodeId, neighborId);
        const neighborNode = this.nodes.get(neighborId);

        if (edge && neighborNode) {
          const newPath: GraphPath = {
            nodes: [...current.path.nodes, neighborNode],
            edges: [...current.path.edges, edge],
            totalWeight: current.path.totalWeight + edge.weight,
            confidence: current.path.confidence * edge.confidence,
          };

          queue.push({ nodeId: neighborId, path: newPath });
        }
      }
    }

    return null;
  }

  /**
   * Find edge between two nodes
   */
  private findEdge(sourceId: string, targetId: string): GraphEdge | null {
    for (const edge of this.edges.values()) {
      if (edge.source === sourceId && edge.target === targetId) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Query the knowledge graph
   */
  query(query: GraphQuery): {
    nodes: GraphNode[];
    edges: GraphEdge[];
    paths?: GraphPath[];
  } {
    let nodes = Array.from(this.nodes.values());
    let edges = Array.from(this.edges.values());

    // Filter by node types
    if (query.nodeTypes) {
      nodes = nodes.filter((node) => query.nodeTypes!.includes(node.type));
    }

    // Filter by edge types
    if (query.edgeTypes) {
      edges = edges.filter((edge) => query.edgeTypes!.includes(edge.type));
    }

    // Filter by properties
    if (query.properties) {
      nodes = nodes.filter((node) =>
        Object.entries(query.properties!).every(
          ([key, value]) => node.properties[key] === value,
        ),
      );
    }

    // Filter by minimum weight
    if (query.minWeight) {
      nodes = nodes.filter((node) => node.weight >= query.minWeight!);
      edges = edges.filter((edge) => edge.weight >= query.minWeight!);
    }

    const result = { nodes, edges };

    // Find paths from start node if specified
    if (query.startNode && query.maxDepth) {
      const paths: GraphPath[] = [];
      const visited = new Set<string>();

      const emptyPath: GraphPath = {
        nodes: [],
        edges: [],
        totalWeight: 0,
        confidence: 1.0,
      };
      this.explorePaths(
        query.startNode,
        emptyPath,
        paths,
        visited,
        query.maxDepth,
      );
      (result as any).paths = paths;
    }

    return result;
  }

  /**
   * Explore paths from a starting node
   */
  private explorePaths(
    nodeId: string,
    currentPath: GraphPath,
    allPaths: GraphPath[],
    visited: Set<string>,
    maxDepth: number,
  ): void {
    if (currentPath.nodes.length >= maxDepth) return;

    visited.add(nodeId);
    const neighbors = this.adjacencyList.get(nodeId) || new Set();

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;

      const edge = this.findEdge(nodeId, neighborId);
      const neighborNode = this.nodes.get(neighborId);

      if (edge && neighborNode) {
        const newPath: GraphPath = {
          nodes: [...(currentPath.nodes || []), neighborNode],
          edges: [...(currentPath.edges || []), edge],
          totalWeight: (currentPath.totalWeight || 0) + edge.weight,
          confidence: (currentPath.confidence || 1.0) * edge.confidence,
        };

        allPaths.push(newPath);
        this.explorePaths(
          neighborId,
          newPath,
          allPaths,
          new Set(visited),
          maxDepth,
        );
      }
    }
  }

  /**
   * Get enhanced recommendations using knowledge graph
   */
  async getGraphBasedRecommendation(
    projectFeatures: any,
    candidateSSGs: string[],
  ): Promise<RecommendationPath[]> {
    const recommendations: RecommendationPath[] = [];

    // Create a temporary project node
    const tempProjectId = `temp:${Date.now()}`;
    const projectNode = this.addNode({
      id: tempProjectId,
      type: "project",
      label: "Query Project",
      properties: projectFeatures,
      weight: 1.0,
    });

    for (const ssg of candidateSSGs) {
      const ssgNodeId = `tech:${ssg}`;
      const ssgNode = this.nodes.get(ssgNodeId);

      if (ssgNode) {
        // Find paths from similar projects to this SSG
        const similarProjects = this.findSimilarProjects(projectFeatures);

        for (const similarProject of similarProjects) {
          const path = this.findPath(similarProject.id, ssgNodeId);

          if (path) {
            const reasoning = this.generateReasoning(path);
            const confidence = this.calculatePathConfidence(
              path,
              projectFeatures,
            );

            recommendations.push({
              from: projectNode,
              to: ssgNode,
              path,
              reasoning,
              confidence,
            });
          }
        }
      }
    }

    // Clean up temporary node
    this.nodes.delete(tempProjectId);

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find projects similar to given features
   */
  private findSimilarProjects(features: any): GraphNode[] {
    const projectNodes = Array.from(this.nodes.values()).filter(
      (node) => node.type === "project",
    );

    return projectNodes
      .map((project) => ({
        project,
        similarity: this.calculateFeatureSimilarity(
          features,
          project.properties,
        ),
      }))
      .filter(({ similarity }) => similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(({ project }) => project);
  }

  /**
   * Calculate similarity between features and project properties
   */
  private calculateFeatureSimilarity(features: any, properties: any): number {
    let score = 0;
    let factors = 0;

    if (features.language === properties.language) {
      score += 0.4;
    }
    factors++;

    if (features.framework === properties.framework) {
      score += 0.3;
    }
    factors++;

    if (features.size === properties.size) {
      score += 0.2;
    }
    factors++;

    if (features.complexity === properties.complexity) {
      score += 0.1;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Generate human-readable reasoning for a recommendation path
   */
  private generateReasoning(path: GraphPath): string[] {
    const reasoning: string[] = [];

    for (let i = 0; i < path.edges.length; i++) {
      const edge = path.edges[i];
      const sourceNode = path.nodes[i];
      const targetNode = path.nodes[i + 1];

      switch (edge.type) {
        case "similar_to":
          reasoning.push(
            `Similar to ${sourceNode.label} (${(edge.confidence * 100).toFixed(
              0,
            )}% similarity)`,
          );
          break;
        case "recommends":
          reasoning.push(
            `Successfully used ${
              targetNode.label
            } (score: ${edge.weight.toFixed(1)})`,
          );
          break;
        case "results_in":
          reasoning.push(
            `Resulted in ${targetNode.properties.status} deployment`,
          );
          break;
        case "uses":
          reasoning.push(`Uses ${targetNode.label}`);
          break;
      }
    }

    return reasoning;
  }

  /**
   * Calculate confidence for a recommendation path
   */
  private calculatePathConfidence(path: GraphPath, _features: any): number {
    let confidence = path.confidence;

    // Boost confidence for shorter paths
    confidence *= 1 / Math.max(path.edges.length, 1);

    // Boost confidence for recent data
    const avgAge =
      path.nodes.reduce((sum, node) => {
        const age = Date.now() - new Date(node.lastUpdated).getTime();
        return sum + age;
      }, 0) / path.nodes.length;

    const daysSinceUpdate = avgAge / (1000 * 60 * 60 * 24);
    confidence *= Math.exp(-daysSinceUpdate / 30); // Exponential decay over 30 days

    return Math.min(confidence, 1.0);
  }

  /**
   * Get technology popularity score
   */
  private getTechnologyPopularity(tech: string): number {
    // Simple popularity scoring - could be enhanced with real data
    const popularityMap = new Map([
      ["javascript", 0.9],
      ["typescript", 0.8],
      ["python", 0.8],
      ["react", 0.9],
      ["vue", 0.7],
      ["angular", 0.6],
      ["go", 0.7],
      ["ruby", 0.5],
      ["rust", 0.6],
    ]);

    return popularityMap.get(tech.toLowerCase()) || 0.3;
  }

  /**
   * Save knowledge graph to persistent memory
   */
  async saveToMemory(): Promise<void> {
    const graphData = {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      lastUpdate: this.lastUpdate,
      statistics: this.getStatistics(),
    };

    await this.memoryManager.remember(
      "interaction",
      {
        graph: graphData,
        type: "knowledge_graph",
      },
      {
        tags: ["knowledge_graph", "structure"],
      },
    );
  }

  /**
   * Load knowledge graph from persistent memory
   */
  async loadFromMemory(): Promise<void> {
    try {
      const graphMemories = await this.memoryManager.search("knowledge_graph");

      if (graphMemories.length > 0) {
        const latestGraph = graphMemories.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )[0];

        if (latestGraph.data.graph) {
          const { nodes, edges } = latestGraph.data.graph;

          // Restore nodes
          for (const [id, node] of nodes) {
            this.nodes.set(id, node);
          }

          // Restore edges and adjacency list
          for (const [id, edge] of edges) {
            this.edges.set(id, edge);

            if (!this.adjacencyList.has(edge.source)) {
              this.adjacencyList.set(edge.source, new Set());
            }
            this.adjacencyList.get(edge.source)!.add(edge.target);
          }

          this.lastUpdate = latestGraph.data.graph.lastUpdate;
        }
      }
    } catch (error) {
      console.error("Failed to load knowledge graph from memory:", error);
    }
  }

  /**
   * Get all nodes in the knowledge graph
   */
  async getAllNodes(): Promise<GraphNode[]> {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges in the knowledge graph
   */
  async getAllEdges(): Promise<GraphEdge[]> {
    return Array.from(this.edges.values());
  }

  /**
   * Get a node by its ID
   */
  async getNodeById(nodeId: string): Promise<GraphNode | null> {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Remove a node from the knowledge graph
   */
  async removeNode(nodeId: string): Promise<boolean> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    // Remove the node
    this.nodes.delete(nodeId);

    // Remove all edges connected to this node
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }

    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
    }

    // Update adjacency list
    this.adjacencyList.delete(nodeId);
    for (const [, targets] of this.adjacencyList) {
      targets.delete(nodeId);
    }

    return true;
  }

  /**
   * Get connections for a specific node
   */
  async getConnections(nodeId: string): Promise<string[]> {
    const connections = this.adjacencyList.get(nodeId);
    return connections ? Array.from(connections) : [];
  }

  /**
   * Get knowledge graph statistics
   */
  async getStatistics(): Promise<{
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
    averageConnectivity: number;
    mostConnectedNodes: Array<{ id: string; connections: number }>;
  }> {
    const nodesByType: Record<string, number> = {};
    const edgesByType: Record<string, number> = {};

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    const connectivityCounts = Array.from(this.adjacencyList.entries())
      .map(([id, connections]) => ({ id, connections: connections.size }))
      .sort((a, b) => b.connections - a.connections);

    const averageConnectivity =
      connectivityCounts.length > 0
        ? connectivityCounts.reduce(
            (sum, { connections }) => sum + connections,
            0,
          ) / connectivityCounts.length
        : 0;

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType,
      edgesByType,
      averageConnectivity,
      mostConnectedNodes: connectivityCounts.slice(0, 10),
    };
  }

  // ============================================================================
  // Phase 1.1: Enhanced Node Query Methods
  // ============================================================================

  /**
   * Find a single node matching criteria
   */
  async findNode(criteria: {
    type?: string;
    properties?: Record<string, any>;
  }): Promise<GraphNode | null> {
    for (const node of this.nodes.values()) {
      if (criteria.type && node.type !== criteria.type) continue;

      if (criteria.properties) {
        let matches = true;
        for (const [key, value] of Object.entries(criteria.properties)) {
          if (node.properties[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      return node;
    }

    return null;
  }

  /**
   * Find all nodes matching criteria
   */
  async findNodes(criteria: {
    type?: string;
    properties?: Record<string, any>;
  }): Promise<GraphNode[]> {
    const results: GraphNode[] = [];

    for (const node of this.nodes.values()) {
      if (criteria.type && node.type !== criteria.type) continue;

      if (criteria.properties) {
        let matches = true;
        for (const [key, value] of Object.entries(criteria.properties)) {
          if (node.properties[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      results.push(node);
    }

    return results;
  }

  /**
   * Find edges matching criteria
   */
  async findEdges(criteria: {
    source?: string;
    target?: string;
    type?: string;
    properties?: Record<string, any>;
  }): Promise<GraphEdge[]> {
    const results: GraphEdge[] = [];

    for (const edge of this.edges.values()) {
      if (criteria.source && edge.source !== criteria.source) continue;
      if (criteria.target && edge.target !== criteria.target) continue;
      if (criteria.type && edge.type !== criteria.type) continue;

      // Match properties if provided
      if (criteria.properties) {
        let propertiesMatch = true;
        for (const [key, value] of Object.entries(criteria.properties)) {
          if (edge.properties[key] !== value) {
            propertiesMatch = false;
            break;
          }
        }
        if (!propertiesMatch) continue;
      }

      results.push(edge);
    }

    return results;
  }

  /**
   * Find all paths between two nodes up to a maximum depth
   */
  async findPaths(criteria: {
    startNode: string;
    endNode?: string;
    edgeTypes?: string[];
    maxDepth: number;
  }): Promise<GraphPath[]> {
    const paths: GraphPath[] = [];
    const visited = new Set<string>();

    const emptyPath: GraphPath = {
      nodes: [this.nodes.get(criteria.startNode)!],
      edges: [],
      totalWeight: 0,
      confidence: 1.0,
    };

    this.findPathsRecursive(
      criteria.startNode,
      emptyPath,
      paths,
      visited,
      criteria.maxDepth,
      criteria.endNode,
      criteria.edgeTypes,
    );

    return paths;
  }

  /**
   * Recursive helper for finding paths
   */
  private findPathsRecursive(
    currentNodeId: string,
    currentPath: GraphPath,
    allPaths: GraphPath[],
    visited: Set<string>,
    maxDepth: number,
    endNode?: string,
    edgeTypes?: string[],
  ): void {
    if (currentPath.nodes.length >= maxDepth) return;

    visited.add(currentNodeId);
    const neighbors = this.adjacencyList.get(currentNodeId) || new Set();

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;

      const edge = this.findEdge(currentNodeId, neighborId);
      if (!edge) continue;

      // Filter by edge type if specified
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;

      const neighborNode = this.nodes.get(neighborId);
      if (!neighborNode) continue;

      const newPath: GraphPath = {
        nodes: [...currentPath.nodes, neighborNode],
        edges: [...currentPath.edges, edge],
        totalWeight: currentPath.totalWeight + edge.weight,
        confidence: currentPath.confidence * edge.confidence,
      };

      // If we've reached the end node, add this path
      if (endNode && neighborId === endNode) {
        allPaths.push(newPath);
        continue;
      }

      // If no end node specified, add all paths
      if (!endNode) {
        allPaths.push(newPath);
      }

      // Continue exploring
      this.findPathsRecursive(
        neighborId,
        newPath,
        allPaths,
        new Set(visited),
        maxDepth,
        endNode,
        edgeTypes,
      );
    }
  }

  /**
   * Get node history (all changes to a node over time)
   */
  async getNodeHistory(nodeId: string): Promise<MemoryEntry[]> {
    const node = this.nodes.get(nodeId);
    if (!node) return [];

    // Search memory for all entries related to this node
    const projectId = node.properties.projectId || node.properties.path;
    if (!projectId) return [];

    return await this.memoryManager.search(projectId);
  }

  /**
   * Get schema version
   */
  getSchemaVersion(): string {
    return SCHEMA_METADATA.version;
  }

  /**
   * Validate node against schema
   */
  validateNode(node: GraphNode): boolean {
    try {
      const entityData = {
        ...node.properties,
        type: node.type,
      };
      validateEntity(entityData);
      return true;
    } catch (error) {
      console.error(`Node validation failed for ${node.id}:`, error);
      return false;
    }
  }

  /**
   * Validate edge against schema
   */
  validateEdge(edge: GraphEdge): boolean {
    try {
      const relationshipData = {
        type: edge.type,
        weight: edge.weight,
        confidence: edge.confidence,
        createdAt: edge.lastUpdated,
        lastUpdated: edge.lastUpdated,
        metadata: edge.properties,
        ...edge.properties,
      };
      validateRelationship(relationshipData);
      return true;
    } catch (error) {
      console.error(`Edge validation failed for ${edge.id}:`, error);
      return false;
    }
  }
}

export default KnowledgeGraph;
