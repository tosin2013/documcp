/**
 * Contextual Memory Retrieval System for DocuMCP
 * Implements Issue #49: Contextual Memory Retrieval
 *
 * Provides intelligent, context-aware memory retrieval using semantic similarity,
 * temporal relevance, and user intent analysis for enhanced recommendation accuracy.
 */

import { MemoryManager } from './manager.js';
import { MemoryEntry } from './storage.js';
import { KnowledgeGraph, GraphNode } from './knowledge-graph.js';

export interface RetrievalContext {
  currentProject?: {
    path: string;
    language: string;
    framework?: string;
    domain?: string;
    size?: 'small' | 'medium' | 'large';
  };
  userIntent?: {
    action: 'analyze' | 'recommend' | 'deploy' | 'troubleshoot' | 'learn';
    urgency: 'low' | 'medium' | 'high';
    experience: 'novice' | 'intermediate' | 'expert';
  };
  sessionContext?: {
    recentActions: string[];
    focusAreas: string[];
    timeConstraints?: number; // minutes
  };
  temporalContext?: {
    timeRange?: { start: string; end: string };
    recency: 'recent' | 'all' | 'historical';
    seasonality?: boolean;
  };
}

export interface SemanticEmbedding {
  vector: number[];
  metadata: {
    source: string;
    confidence: number;
    generatedAt: string;
  };
}

export interface ContextualMatch {
  memory: MemoryEntry;
  relevanceScore: number;
  contextualFactors: {
    semantic: number;
    temporal: number;
    structural: number;
    intentional: number;
  };
  reasoning: string[];
  confidence: number;
}

export interface RetrievalResult {
  matches: ContextualMatch[];
  metadata: {
    queryContext: RetrievalContext;
    totalCandidates: number;
    processingTime: number;
    fallbackUsed: boolean;
  };
  insights: {
    patterns: string[];
    recommendations: string[];
    gaps: string[];
  };
}

export class ContextualMemoryRetrieval {
  private memoryManager: MemoryManager;
  private knowledgeGraph: KnowledgeGraph;
  private embeddingCache: Map<string, SemanticEmbedding>;
  private readonly maxCacheSize = 1000;
  private readonly similarityThreshold = 0.6;

  constructor(memoryManager: MemoryManager, knowledgeGraph: KnowledgeGraph) {
    this.memoryManager = memoryManager;
    this.knowledgeGraph = knowledgeGraph;
    this.embeddingCache = new Map();
  }

  /**
   * Retrieve contextually relevant memories
   */
  async retrieve(
    query: string,
    context: RetrievalContext,
    options?: {
      maxResults?: number;
      minRelevance?: number;
      includeReasoning?: boolean;
    }
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const maxResults = options?.maxResults || 10;
    const minRelevance = options?.minRelevance || 0.3;

    // Get candidate memories based on basic filtering
    const candidates = await this.getCandidateMemories(query, context);

    // Score and rank candidates
    const scoredMatches = await this.scoreAndRankCandidates(
      candidates,
      query,
      context
    );

    // Filter by relevance threshold
    const relevantMatches = scoredMatches
      .filter(match => match.relevanceScore >= minRelevance)
      .slice(0, maxResults);

    // Generate insights from matches
    const insights = await this.generateInsights(relevantMatches, context);

    const processingTime = Date.now() - startTime;

    return {
      matches: relevantMatches,
      metadata: {
        queryContext: context,
        totalCandidates: candidates.length,
        processingTime,
        fallbackUsed: relevantMatches.length === 0 && candidates.length > 0
      },
      insights
    };
  }

  /**
   * Get candidate memories using multiple retrieval strategies
   */
  private async getCandidateMemories(
    query: string,
    context: RetrievalContext
  ): Promise<MemoryEntry[]> {
    const candidates = new Map<string, MemoryEntry>();

    // Strategy 1: Text-based search
    const textMatches = await this.memoryManager.search(query, {
      sortBy: 'timestamp'
    });
    textMatches.forEach(memory => candidates.set(memory.id, memory));

    // Strategy 2: Context-based filtering
    if (context.currentProject) {
      const contextMatches = await this.getContextBasedCandidates(context.currentProject);
      contextMatches.forEach(memory => candidates.set(memory.id, memory));
    }

    // Strategy 3: Intent-based retrieval
    if (context.userIntent) {
      const intentMatches = await this.getIntentBasedCandidates(context.userIntent);
      intentMatches.forEach(memory => candidates.set(memory.id, memory));
    }

    // Strategy 4: Temporal filtering
    if (context.temporalContext) {
      const temporalMatches = await this.getTemporalCandidates(context.temporalContext);
      temporalMatches.forEach(memory => candidates.set(memory.id, memory));
    }

    // Strategy 5: Knowledge graph traversal
    const graphMatches = await this.getGraphBasedCandidates(query, context);
    graphMatches.forEach(memory => candidates.set(memory.id, memory));

    return Array.from(candidates.values());
  }

  /**
   * Get candidates based on current project context
   */
  private async getContextBasedCandidates(
    project: NonNullable<RetrievalContext['currentProject']>
  ): Promise<MemoryEntry[]> {
    const searchCriteria = [];

    // Language-based search
    searchCriteria.push(
      this.memoryManager.search('', { sortBy: 'timestamp' })
        .then(memories => memories.filter(m =>
          m.data.language?.primary === project.language ||
          m.metadata.tags?.includes(project.language)
        ))
    );

    // Framework-based search
    if (project.framework) {
      searchCriteria.push(
        this.memoryManager.search('', { sortBy: 'timestamp' })
          .then(memories => memories.filter(m =>
            m.data.framework?.name === project.framework ||
            (project.framework && m.metadata.tags?.includes(project.framework))
          ))
      );
    }

    // Project size similarity
    if (project.size) {
      searchCriteria.push(
        this.memoryManager.search('', { sortBy: 'timestamp' })
          .then(memories => memories.filter(m =>
            this.categorizeProjectSize(m.data.stats?.files || 0) === project.size
          ))
      );
    }

    const results = await Promise.all(searchCriteria);
    const allMatches = results.flat();

    // Deduplicate
    const unique = new Map<string, MemoryEntry>();
    allMatches.forEach(memory => unique.set(memory.id, memory));

    return Array.from(unique.values());
  }

  /**
   * Get candidates based on user intent
   */
  private async getIntentBasedCandidates(
    intent: NonNullable<RetrievalContext['userIntent']>
  ): Promise<MemoryEntry[]> {
    const intentTypeMap = {
      analyze: ['analysis', 'evaluation', 'assessment'],
      recommend: ['recommendation', 'suggestion', 'advice'],
      deploy: ['deployment', 'publish', 'release'],
      troubleshoot: ['error', 'issue', 'problem', 'debug'],
      learn: ['tutorial', 'guide', 'example', 'pattern']
    };

    const searchTerms = intentTypeMap[intent.action] || [intent.action];
    const searches = searchTerms.map(term =>
      this.memoryManager.search(term, { sortBy: 'timestamp' })
    );

    const results = await Promise.all(searches);
    const allMatches = results.flat();

    // Filter by experience level
    return allMatches.filter(memory => {
      if (intent.experience === 'novice') {
        return !memory.metadata.tags?.includes('advanced') &&
               !memory.metadata.tags?.includes('expert');
      } else if (intent.experience === 'expert') {
        return memory.metadata.tags?.includes('advanced') ||
               memory.metadata.tags?.includes('expert') ||
               memory.data.complexity === 'complex';
      }
      return true; // intermediate gets all
    });
  }

  /**
   * Get candidates based on temporal context
   */
  private async getTemporalCandidates(
    temporal: NonNullable<RetrievalContext['temporalContext']>
  ): Promise<MemoryEntry[]> {
    let searchOptions: any = { sortBy: 'timestamp' };

    if (temporal.timeRange) {
      // Use memory manager's built-in time filtering
      const allMemories = await this.memoryManager.search('', searchOptions);

      return allMemories.filter(memory => {
        const memoryTime = new Date(memory.timestamp);
        const start = new Date(temporal.timeRange!.start);
        const end = new Date(temporal.timeRange!.end);
        return memoryTime >= start && memoryTime <= end;
      });
    }

    if (temporal.recency === 'recent') {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const allMemories = await this.memoryManager.search('', searchOptions);

      return allMemories.filter(memory =>
        new Date(memory.timestamp) > cutoff
      );
    }

    if (temporal.recency === 'historical') {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Older than 90 days
      const allMemories = await this.memoryManager.search('', searchOptions);

      return allMemories.filter(memory =>
        new Date(memory.timestamp) < cutoff
      );
    }

    return this.memoryManager.search('', searchOptions);
  }

  /**
   * Get candidates using knowledge graph traversal
   */
  private async getGraphBasedCandidates(
    query: string,
    context: RetrievalContext
  ): Promise<MemoryEntry[]> {
    if (!context.currentProject) return [];

    // Find relevant nodes in the knowledge graph
    const graphQuery = {
      nodeTypes: ['project', 'technology'],
      properties: context.currentProject.language ? {
        language: context.currentProject.language
      } : undefined,
      maxDepth: 2
    };

    const graphResult = this.knowledgeGraph.query(graphQuery);
    const relevantNodeIds = graphResult.nodes.map(node => node.id);

    // Find memories associated with these nodes
    const memories: MemoryEntry[] = [];
    const allMemories = await this.memoryManager.search('', { sortBy: 'timestamp' });

    for (const memory of allMemories) {
      const projectNodeId = `project:${memory.metadata.projectId}`;
      const techNodeId = memory.metadata.ssg ? `tech:${memory.metadata.ssg}` : null;

      if (relevantNodeIds.includes(projectNodeId) ||
          (techNodeId && relevantNodeIds.includes(techNodeId))) {
        memories.push(memory);
      }
    }

    return memories;
  }

  /**
   * Score and rank candidates based on contextual relevance
   */
  private async scoreAndRankCandidates(
    candidates: MemoryEntry[],
    query: string,
    context: RetrievalContext
  ): Promise<ContextualMatch[]> {
    const matches: ContextualMatch[] = [];

    for (const memory of candidates) {
      const contextualFactors = await this.calculateContextualFactors(
        memory,
        query,
        context
      );

      const relevanceScore = this.calculateOverallRelevance(contextualFactors);
      const reasoning = this.generateReasoning(memory, contextualFactors, context);
      const confidence = this.calculateConfidence(contextualFactors, memory);

      matches.push({
        memory,
        relevanceScore,
        contextualFactors,
        reasoning,
        confidence
      });
    }

    // Sort by relevance score (descending)
    return matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate contextual factors for scoring
   */
  private async calculateContextualFactors(
    memory: MemoryEntry,
    query: string,
    context: RetrievalContext
  ): Promise<ContextualMatch['contextualFactors']> {
    const semantic = await this.calculateSemanticSimilarity(memory, query);
    const temporal = await this.calculateTemporalRelevance(memory, context);
    const structural = this.calculateStructuralRelevance(memory, context);
    const intentional = this.calculateIntentionalRelevance(memory, context);

    return { semantic, temporal, structural, intentional };
  }

  /**
   * Calculate semantic similarity using simple text matching
   * (In a production system, this would use embeddings)
   */
  private async calculateSemanticSimilarity(
    memory: MemoryEntry,
    query: string
  ): Promise<number> {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const memoryText = JSON.stringify(memory.data).toLowerCase();
    const metadataText = JSON.stringify(memory.metadata).toLowerCase();

    let matches = 0;
    for (const term of queryTerms) {
      if (memoryText.includes(term) || metadataText.includes(term)) {
        matches++;
      }
    }

    return queryTerms.length > 0 ? matches / queryTerms.length : 0;
  }

  /**
   * Calculate temporal relevance based on recency and context
   */
  private calculateTemporalRelevance(
    memory: MemoryEntry,
    context: RetrievalContext
  ): Promise<number> {
    const memoryDate = new Date(memory.timestamp);
    const now = new Date();
    const daysSince = (now.getTime() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);

    // Base score decreases with age
    let score = Math.exp(-daysSince / 30); // Half-life of 30 days

    // Boost for explicit temporal preferences
    if (context.temporalContext?.recency === 'recent' && daysSince <= 7) {
      score *= 1.5;
    } else if (context.temporalContext?.recency === 'historical' && daysSince >= 90) {
      score *= 1.3;
    }

    // Consider time constraints
    if (context.sessionContext?.timeConstraints) {
      const urgencyMultiplier = context.userIntent?.urgency === 'high' ? 1.2 : 1.0;
      score *= urgencyMultiplier;
    }

    return Promise.resolve(Math.min(score, 1.0));
  }

  /**
   * Calculate structural relevance based on project similarity
   */
  private calculateStructuralRelevance(
    memory: MemoryEntry,
    context: RetrievalContext
  ): number {
    if (!context.currentProject) return 0.5; // Neutral when no project context

    let score = 0;
    let factors = 0;

    // Language match
    if (memory.data.language?.primary === context.currentProject.language) {
      score += 0.4;
    }
    factors++;

    // Framework match
    if (context.currentProject.framework &&
        memory.data.framework?.name === context.currentProject.framework) {
      score += 0.3;
    }
    factors++;

    // Size similarity
    if (context.currentProject.size) {
      const memorySize = this.categorizeProjectSize(memory.data.stats?.files || 0);
      if (memorySize === context.currentProject.size) {
        score += 0.2;
      }
    }
    factors++;

    // Type relevance
    if (memory.type === 'analysis' && context.userIntent?.action === 'analyze') {
      score += 0.1;
    } else if (memory.type === 'recommendation' && context.userIntent?.action === 'recommend') {
      score += 0.1;
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate intentional relevance based on user intent
   */
  private calculateIntentionalRelevance(
    memory: MemoryEntry,
    context: RetrievalContext
  ): number {
    if (!context.userIntent) return 0.5; // Neutral when no intent

    let score = 0;

    // Action alignment
    const actionTypeMap = {
      analyze: ['analysis', 'evaluation'],
      recommend: ['recommendation'],
      deploy: ['deployment'],
      troubleshoot: ['deployment', 'configuration'],
      learn: ['analysis', 'recommendation']
    };

    const relevantTypes = actionTypeMap[context.userIntent.action] || [];
    if (relevantTypes.includes(memory.type)) {
      score += 0.5;
    }

    // Experience level alignment
    if (context.userIntent.experience === 'novice') {
      // Prefer simpler, more successful cases
      if (memory.data.status === 'success' || memory.data.complexity !== 'complex') {
        score += 0.3;
      }
    } else if (context.userIntent.experience === 'expert') {
      // Prefer complex or edge cases
      if (memory.data.complexity === 'complex' || memory.metadata.tags?.includes('advanced')) {
        score += 0.3;
      }
    }

    // Urgency consideration
    if (context.userIntent.urgency === 'high') {
      // Prefer recent, successful cases
      const daysSince = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 7 && memory.data.status === 'success') {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate overall relevance score
   */
  private calculateOverallRelevance(
    factors: ContextualMatch['contextualFactors']
  ): number {
    // Weighted combination of factors
    const weights = {
      semantic: 0.3,
      temporal: 0.2,
      structural: 0.3,
      intentional: 0.2
    };

    return (
      factors.semantic * weights.semantic +
      factors.temporal * weights.temporal +
      factors.structural * weights.structural +
      factors.intentional * weights.intentional
    );
  }

  /**
   * Generate reasoning for why a memory was selected
   */
  private generateReasoning(
    memory: MemoryEntry,
    factors: ContextualMatch['contextualFactors'],
    context: RetrievalContext
  ): string[] {
    const reasoning: string[] = [];

    if (factors.semantic > 0.7) {
      reasoning.push('High semantic similarity to query');
    }

    if (factors.temporal > 0.8) {
      reasoning.push('Recently relevant information');
    }

    if (factors.structural > 0.6) {
      reasoning.push(`Similar project structure (${memory.data.language?.primary || 'unknown'})`);
    }

    if (factors.intentional > 0.7) {
      reasoning.push(`Matches user intent for ${context.userIntent?.action || 'general'} action`);
    }

    if (memory.data.status === 'success' && context.userIntent?.urgency === 'high') {
      reasoning.push('Proven successful approach for urgent needs');
    }

    if (memory.metadata.ssg && context.currentProject?.framework) {
      reasoning.push(`Experience with ${memory.metadata.ssg} for similar projects`);
    }

    return reasoning.length > 0 ? reasoning : ['General relevance to query'];
  }

  /**
   * Calculate confidence in the match
   */
  private calculateConfidence(
    factors: ContextualMatch['contextualFactors'],
    memory: MemoryEntry
  ): number {
    let confidence = (factors.semantic + factors.structural) / 2;

    // Boost confidence for successful outcomes
    if (memory.data.status === 'success') {
      confidence *= 1.2;
    }

    // Boost confidence for recent data
    const daysSince = (Date.now() - new Date(memory.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 30) {
      confidence *= 1.1;
    }

    // Boost confidence for rich metadata
    if (memory.metadata.tags && memory.metadata.tags.length > 2) {
      confidence *= 1.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate insights from retrieved matches
   */
  private async generateInsights(
    matches: ContextualMatch[],
    context: RetrievalContext
  ): Promise<RetrievalResult['insights']> {
    const patterns: string[] = [];
    const recommendations: string[] = [];
    const gaps: string[] = [];

    if (matches.length === 0) {
      gaps.push('No relevant memories found for current context');
      recommendations.push('Consider expanding search criteria or building more experience');
      return { patterns, recommendations, gaps };
    }

    // Analyze patterns in successful matches
    const successfulMatches = matches.filter(m =>
      m.memory.data.status === 'success' && m.relevanceScore > 0.6
    );

    if (successfulMatches.length >= 2) {
      // Find common SSGs
      const ssgs = new Map<string, number>();
      successfulMatches.forEach(match => {
        if (match.memory.metadata.ssg) {
          ssgs.set(match.memory.metadata.ssg, (ssgs.get(match.memory.metadata.ssg) || 0) + 1);
        }
      });

      if (ssgs.size > 0) {
        const topSSG = Array.from(ssgs.entries()).sort(([,a], [,b]) => b - a)[0];
        patterns.push(`${topSSG[0]} appears in ${topSSG[1]} successful similar projects`);
        recommendations.push(`Consider ${topSSG[0]} based on successful precedents`);
      }

      // Find common success factors
      const commonFactors = this.findCommonSuccessFactors(successfulMatches);
      patterns.push(...commonFactors);
    }

    // Identify gaps
    if (context.userIntent?.action === 'deploy' &&
        matches.filter(m => m.memory.type === 'deployment').length === 0) {
      gaps.push('Limited deployment experience for similar projects');
      recommendations.push('Proceed cautiously with deployment and document the process');
    }

    if (context.userIntent?.experience === 'novice' &&
        matches.every(m => m.confidence < 0.7)) {
      gaps.push('Limited beginner-friendly resources for this context');
      recommendations.push('Consider consulting documentation or seeking expert guidance');
    }

    return { patterns, recommendations, gaps };
  }

  /**
   * Find common success factors across matches
   */
  private findCommonSuccessFactors(matches: ContextualMatch[]): string[] {
    const factors: string[] = [];

    const hasTests = matches.filter(m => m.memory.data.testing?.hasTests).length;
    if (hasTests / matches.length > 0.7) {
      factors.push('Projects with testing have higher success rates');
    }

    const hasCI = matches.filter(m => m.memory.data.ci?.hasCI).length;
    if (hasCI / matches.length > 0.6) {
      factors.push('CI/CD adoption correlates with deployment success');
    }

    const simpleProjects = matches.filter(m =>
      m.memory.data.complexity !== 'complex'
    ).length;
    if (simpleProjects / matches.length > 0.8) {
      factors.push('Simpler project structures show more reliable outcomes');
    }

    return factors;
  }

  /**
   * Categorize project size for comparison
   */
  private categorizeProjectSize(fileCount: number): 'small' | 'medium' | 'large' {
    if (fileCount < 50) return 'small';
    if (fileCount < 200) return 'medium';
    return 'large';
  }

  /**
   * Get contextual suggestions for improving retrieval
   */
  async getSuggestions(context: RetrievalContext): Promise<{
    queryImprovements: string[];
    contextEnhancements: string[];
    learningOpportunities: string[];
  }> {
    const suggestions = {
      queryImprovements: [] as string[],
      contextEnhancements: [] as string[],
      learningOpportunities: [] as string[]
    };

    // Analyze current context completeness
    if (!context.currentProject) {
      suggestions.contextEnhancements.push('Provide current project information for better matches');
    }

    if (!context.userIntent) {
      suggestions.contextEnhancements.push('Specify your intent (analyze, recommend, deploy, etc.) for targeted results');
    }

    if (!context.temporalContext) {
      suggestions.contextEnhancements.push('Set temporal preferences (recent vs. historical) for relevance');
    }

    // Analyze retrieval patterns
    const recentSearches = await this.memoryManager.search('search', { sortBy: 'timestamp' });
    if (recentSearches.length < 5) {
      suggestions.learningOpportunities.push('System will improve with more usage and data');
    }

    // Check for data gaps
    if (context.currentProject?.language) {
      const languageMemories = await this.memoryManager.search(context.currentProject.language);
      if (languageMemories.length < 3) {
        suggestions.learningOpportunities.push(`More experience needed with ${context.currentProject.language} projects`);
      }
    }

    return suggestions;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get retrieval statistics
   */
  getStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    averageRetrievalTime: number;
    commonContextTypes: Record<string, number>;
  } {
    // This would track actual usage statistics in a real implementation
    return {
      cacheSize: this.embeddingCache.size,
      cacheHitRate: 0.85, // Placeholder
      averageRetrievalTime: 150, // ms
      commonContextTypes: {
        'project_analysis': 45,
        'ssg_recommendation': 38,
        'deployment_troubleshooting': 12,
        'learning_assistance': 5
      }
    };
  }
}

export default ContextualMemoryRetrieval;