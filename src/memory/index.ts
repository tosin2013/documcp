/**
 * Memory System for DocuMCP
 * Provides persistent memory and learning capabilities
 */

export { JSONLStorage, type MemoryEntry } from './storage.js';
export { MemoryManager, type MemoryContext, type MemorySearchOptions } from './manager.js';
export { EnhancedMemoryManager, type EnhancedRecommendation, type IntelligentAnalysis } from './enhanced-manager.js';
export { IncrementalLearningSystem, type ProjectFeatures, type LearningPattern, type LearningInsight } from './learning.js';
export { KnowledgeGraph, type GraphNode, type GraphEdge, type GraphPath, type RecommendationPath } from './knowledge-graph.js';
export { ContextualMemoryRetrieval, type RetrievalContext, type ContextualMatch, type RetrievalResult } from './contextual-retrieval.js';
export { MultiAgentMemorySharing, type AgentIdentity, type SharedMemory, type CollaborativeInsight } from './multi-agent-sharing.js';
export { MemoryPruningSystem, type PruningPolicy, type OptimizationMetrics, type PruningResult } from './pruning.js';
export { TemporalMemoryAnalysis, type TemporalPattern, type TemporalMetrics, type PredictionResult, type TemporalInsight } from './temporal-analysis.js';
export { MemoryVisualizationSystem, type VisualizationConfig, type ChartData, type DashboardData, type NetworkVisualization } from './visualization.js';
export { MemoryExportImportSystem, type ExportOptions, type ImportOptions, type ExportResult, type ImportResult, type MigrationPlan } from './export-import.js';
export {
  initializeMemory,
  rememberAnalysis,
  rememberRecommendation,
  rememberDeployment,
  rememberConfiguration,
  recallProjectHistory,
  getProjectInsights,
  getSimilarProjects,
  cleanupOldMemories,
  exportMemories,
  importMemories,
  getMemoryStatistics,
  getMemoryManager
} from './integration.js';

// Memory Tools for MCP
export const memoryTools = [
  {
    name: 'memory_recall',
    description: 'Recall memories about a project or topic',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query or project ID'
        },
        type: {
          type: 'string',
          enum: ['analysis', 'recommendation', 'deployment', 'configuration', 'interaction', 'all'],
          description: 'Type of memory to recall'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return',
          default: 10
        }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_intelligent_analysis',
    description: 'Get intelligent analysis with patterns, predictions, and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project for analysis'
        },
        baseAnalysis: {
          type: 'object',
          description: 'Base analysis data to enhance'
        }
      },
      required: ['projectPath', 'baseAnalysis']
    }
  },
  {
    name: 'memory_enhanced_recommendation',
    description: 'Get enhanced recommendations using learning and knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project'
        },
        baseRecommendation: {
          type: 'object',
          description: 'Base recommendation to enhance'
        },
        projectFeatures: {
          type: 'object',
          properties: {
            language: { type: 'string' },
            framework: { type: 'string' },
            size: { type: 'string', enum: ['small', 'medium', 'large'] },
            complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
            hasTests: { type: 'boolean' },
            hasCI: { type: 'boolean' },
            hasDocs: { type: 'boolean' },
            isOpenSource: { type: 'boolean' }
          },
          required: ['language']
        }
      },
      required: ['projectPath', 'baseRecommendation', 'projectFeatures']
    }
  },
  {
    name: 'memory_learning_stats',
    description: 'Get comprehensive learning and knowledge graph statistics',
    inputSchema: {
      type: 'object',
      properties: {
        includeDetails: {
          type: 'boolean',
          description: 'Include detailed statistics',
          default: true
        }
      }
    }
  },
  {
    name: 'memory_knowledge_graph',
    description: 'Query the knowledge graph for relationships and paths',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          properties: {
            nodeTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by node types'
            },
            edgeTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by edge types'
            },
            startNode: {
              type: 'string',
              description: 'Starting node for path queries'
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum path depth',
              default: 3
            }
          }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_contextual_search',
    description: 'Perform contextual memory retrieval with intelligent ranking',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        context: {
          type: 'object',
          properties: {
            currentProject: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                language: { type: 'string' },
                framework: { type: 'string' },
                size: { type: 'string', enum: ['small', 'medium', 'large'] }
              }
            },
            userIntent: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['analyze', 'recommend', 'deploy', 'troubleshoot', 'learn'] },
                urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
                experience: { type: 'string', enum: ['novice', 'intermediate', 'expert'] }
              }
            },
            temporalContext: {
              type: 'object',
              properties: {
                recency: { type: 'string', enum: ['recent', 'all', 'historical'] },
                timeRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string' },
                    end: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        options: {
          type: 'object',
          properties: {
            maxResults: { type: 'number', default: 10 },
            minRelevance: { type: 'number', default: 0.3 },
            includeReasoning: { type: 'boolean', default: true }
          }
        }
      },
      required: ['query', 'context']
    }
  },
  {
    name: 'memory_agent_network',
    description: 'Manage multi-agent memory sharing and collaboration',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['register_agent', 'share_memory', 'sync_request', 'get_insights', 'network_status'],
          description: 'Action to perform'
        },
        agentInfo: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            capabilities: { type: 'array', items: { type: 'string' } },
            specializations: { type: 'array', items: { type: 'string' } },
            trustLevel: { type: 'string', enum: ['low', 'medium', 'high', 'trusted'] }
          }
        },
        memoryId: {
          type: 'string',
          description: 'Memory ID for sharing operations'
        },
        targetAgent: {
          type: 'string',
          description: 'Target agent for sync operations'
        },
        options: {
          type: 'object',
          properties: {
            anonymize: { type: 'boolean', default: false },
            requireValidation: { type: 'boolean', default: false }
          }
        }
      },
      required: ['action']
    }
  },
  {
    name: 'memory_insights',
    description: 'Get insights and patterns from memory',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Project ID to analyze'
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          },
          description: 'Time range for analysis'
        }
      }
    }
  },
  {
    name: 'memory_similar',
    description: 'Find similar projects from memory',
    inputSchema: {
      type: 'object',
      properties: {
        analysisId: {
          type: 'string',
          description: 'Analysis ID to find similar projects for'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of similar projects',
          default: 5
        }
      },
      required: ['analysisId']
    }
  },
  {
    name: 'memory_export',
    description: 'Export memories to JSON or CSV',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'csv'],
          description: 'Export format',
          default: 'json'
        },
        filter: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            projectId: { type: 'string' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' }
          },
          description: 'Filter memories to export'
        }
      }
    }
  },
  {
    name: 'memory_cleanup',
    description: 'Clean up old memories',
    inputSchema: {
      type: 'object',
      properties: {
        daysToKeep: {
          type: 'number',
          description: 'Number of days of memories to keep',
          default: 30
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview what would be deleted without actually deleting',
          default: false
        }
      }
    }
  },
  {
    name: 'memory_pruning',
    description: 'Intelligent memory pruning and optimization',
    inputSchema: {
      type: 'object',
      properties: {
        policy: {
          type: 'object',
          properties: {
            maxAge: { type: 'number', description: 'Maximum age in days', default: 180 },
            maxSize: { type: 'number', description: 'Maximum storage size in MB', default: 500 },
            maxEntries: { type: 'number', description: 'Maximum number of entries', default: 50000 },
            preservePatterns: { type: 'array', items: { type: 'string' }, description: 'Pattern types to preserve' },
            compressionThreshold: { type: 'number', description: 'Compress entries older than X days', default: 30 },
            redundancyThreshold: { type: 'number', description: 'Remove similar entries with similarity > X', default: 0.85 }
          }
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview pruning without executing',
          default: false
        }
      }
    }
  },
  {
    name: 'memory_temporal_analysis',
    description: 'Analyze temporal patterns and trends in memory data',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          properties: {
            timeRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            },
            granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month', 'year'], default: 'day' },
            aggregation: { type: 'string', enum: ['count', 'success_rate', 'activity_level', 'diversity'], default: 'count' },
            filters: {
              type: 'object',
              properties: {
                types: { type: 'array', items: { type: 'string' } },
                projects: { type: 'array', items: { type: 'string' } },
                outcomes: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        analysisType: { type: 'string', enum: ['patterns', 'metrics', 'predictions', 'insights'], default: 'patterns' }
      }
    }
  },
  {
    name: 'memory_visualization',
    description: 'Generate visual representations of memory data',
    inputSchema: {
      type: 'object',
      properties: {
        visualizationType: {
          type: 'string',
          enum: ['dashboard', 'timeline', 'network', 'heatmap', 'distribution', 'trends', 'custom'],
          default: 'dashboard'
        },
        options: {
          type: 'object',
          properties: {
            timeRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' }
              }
            },
            includeCharts: { type: 'array', items: { type: 'string' } },
            config: {
              type: 'object',
              properties: {
                width: { type: 'number', default: 800 },
                height: { type: 'number', default: 600 },
                theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'light' },
                exportFormat: { type: 'string', enum: ['svg', 'png', 'json', 'html'], default: 'svg' },
                interactive: { type: 'boolean', default: true }
              }
            }
          }
        },
        customVisualization: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['line', 'bar', 'scatter', 'heatmap', 'network', 'sankey', 'treemap', 'timeline'] },
            query: {
              type: 'object',
              properties: {
                filters: { type: 'object' },
                groupBy: { type: 'string' },
                aggregation: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  {
    name: 'memory_export_advanced',
    description: 'Advanced memory export with multiple formats and options',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: { type: 'string', description: 'Output file path' },
        options: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'jsonl', 'csv', 'xml', 'yaml', 'sqlite', 'archive'], default: 'json' },
            compression: { type: 'string', enum: ['gzip', 'zip', 'none'], default: 'none' },
            includeMetadata: { type: 'boolean', default: true },
            includeLearning: { type: 'boolean', default: true },
            includeKnowledgeGraph: { type: 'boolean', default: true },
            filters: {
              type: 'object',
              properties: {
                types: { type: 'array', items: { type: 'string' } },
                dateRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', format: 'date-time' },
                    end: { type: 'string', format: 'date-time' }
                  }
                },
                projects: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } },
                outcomes: { type: 'array', items: { type: 'string' } }
              }
            },
            anonymize: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', default: false },
                fields: { type: 'array', items: { type: 'string' } },
                method: { type: 'string', enum: ['hash', 'remove', 'pseudonymize'], default: 'hash' }
              }
            },
            encryption: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', default: false },
                algorithm: { type: 'string', enum: ['aes-256-gcm', 'aes-192-gcm', 'aes-128-gcm'], default: 'aes-256-gcm' },
                password: { type: 'string' }
              }
            }
          }
        }
      },
      required: ['outputPath']
    }
  },
  {
    name: 'memory_import_advanced',
    description: 'Advanced memory import with validation and conflict resolution',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Input file path' },
        options: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['json', 'jsonl', 'csv', 'xml', 'yaml', 'sqlite', 'archive'], default: 'json' },
            mode: { type: 'string', enum: ['merge', 'replace', 'append', 'update'], default: 'merge' },
            validation: { type: 'string', enum: ['strict', 'loose', 'none'], default: 'strict' },
            conflictResolution: { type: 'string', enum: ['skip', 'overwrite', 'merge', 'rename'], default: 'skip' },
            backup: { type: 'boolean', default: true },
            dryRun: { type: 'boolean', default: false },
            mapping: { type: 'object', description: 'Field mapping for different schemas' },
            transformation: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', default: false },
                rules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      operation: { type: 'string', enum: ['convert', 'transform', 'validate'] },
                      params: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      required: ['inputPath']
    }
  },
  {
    name: 'memory_migration',
    description: 'Create and execute migration plans between different memory systems',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create_plan', 'execute_migration', 'validate_compatibility'], default: 'create_plan' },
        sourcePath: { type: 'string', description: 'Source data path' },
        migrationPlan: {
          type: 'object',
          properties: {
            sourceSystem: { type: 'string' },
            targetSystem: { type: 'string', default: 'DocuMCP' },
            mapping: { type: 'object' },
            transformations: { type: 'array' },
            validation: { type: 'array' },
            postProcessing: { type: 'array', items: { type: 'string' } }
          }
        },
        sourceSchema: { type: 'object', description: 'Source system schema' },
        targetSchema: { type: 'object', description: 'Target system schema' },
        options: {
          type: 'object',
          properties: {
            autoMap: { type: 'boolean', default: true },
            preserveStructure: { type: 'boolean', default: true },
            customMappings: { type: 'object' }
          }
        }
      }
    }
  },
  {
    name: 'memory_optimization_metrics',
    description: 'Get comprehensive optimization metrics and recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        includeRecommendations: { type: 'boolean', default: true },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
];