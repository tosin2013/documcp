---
documcp:
  last_updated: "2025-11-20T00:46:21.958Z"
  last_validated: "2025-12-09T19:18:14.177Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# Knowledge Graph Documentation

## Overview

The DocuMCP Knowledge Graph is an intelligent semantic network that captures relationships between projects, technologies, deployments, user preferences, and documentation patterns. It enables smart recommendations, deployment tracking, preference learning, and context-aware documentation generation.

## Architecture

### Core Components

- **Graph Database**: In-memory graph with persistent storage
- **Node Types**: Projects, technologies, configurations, deployments, users
- **Edge Types**: Relationships, dependencies, recommendations, usage patterns
- **Intelligence Layer**: Pattern recognition, recommendation engine, drift detection

### Node Types

#### Project Nodes

```typescript
interface ProjectNode {
  id: string;
  type: "project";
  properties: {
    name: string;
    path: string;
    primaryLanguage: string;
    framework?: string;
    lastAnalyzed: string;
    structure: {
      totalFiles: number;
      languages: Record<string, number>;
      hasTests: boolean;
      hasCI: boolean;
      hasDocs: boolean;
    };
  };
}
```

#### Technology Nodes

```typescript
interface TechnologyNode {
  id: string;
  type: "technology";
  properties: {
    name: string;
    category: "language" | "framework" | "tool" | "platform";
    version?: string;
    ecosystem: string;
    popularity: number;
    stability: number;
  };
}
```

#### Configuration Nodes

```typescript
interface ConfigurationNode {
  id: string;
  type: "configuration";
  properties: {
    ssg: string;
    settings: Record<string, any>;
    optimizations: string[];
    lastUsed: string;
    successRate: number;
  };
}
```

#### User Nodes

```typescript
interface UserNode {
  id: string;
  type: "user";
  properties: {
    userId: string;
    preferences: {
      preferredSSGs: string[];
      expertise: "beginner" | "intermediate" | "advanced";
      technologies: string[];
    };
    activity: {
      totalDeployments: number;
      successfulDeployments: number;
      lastActive: string;
    };
  };
}
```

### Edge Types

#### Project Relationships

- `depends_on`: Project dependencies and technology usage
- `similar_to`: Projects with similar characteristics
- `derived_from`: Project templates and forks

#### Deployment Tracking

- `deployed_with`: Project deployed using specific SSG/configuration
- `succeeded_at`: Successful deployment timestamp and metrics
- `failed_at`: Failed deployment with error analysis

#### User Patterns

- `prefers`: User SSG and technology preferences
- `succeeded_with`: User's successful deployment patterns
- `learned_from`: Preference updates based on experience

#### Recommendation Flows

- `recommends`: SSG recommendations with confidence scores
- `optimizes_for`: Configuration optimizations for specific scenarios
- `suggests`: Next-step suggestions based on current state

## Knowledge Graph Integration

### Initialization

```typescript
import { initializeKnowledgeGraph, getKnowledgeGraph } from "./kg-integration";

// Initialize with storage directory
await initializeKnowledgeGraph("/path/to/storage");

// Get graph instance
const kg = await getKnowledgeGraph();
```

### Project Management

#### Creating Projects

```typescript
import { createOrUpdateProject } from "./kg-integration";

const project = await createOrUpdateProject({
  id: "my-project-123",
  timestamp: new Date().toISOString(),
  path: "/path/to/project",
  projectName: "My Documentation Site",
  structure: {
    totalFiles: 150,
    languages: {
      typescript: 80,
      javascript: 45,
      markdown: 25,
    },
    hasTests: true,
    hasCI: true,
    hasDocs: true,
  },
});
```

#### Querying Projects

```typescript
// Find project by ID
const project = await kg.findNode({
  type: "project",
  properties: { id: "my-project-123" },
});

// Find similar projects
const similarProjects = await kg.findNodes({
  type: "project",
  properties: {
    "structure.primaryLanguage": "typescript",
  },
});
```

### Deployment Tracking

#### Recording Deployments

```typescript
import { trackDeployment } from "./kg-integration";

// Successful deployment
await trackDeployment("project-123", "docusaurus", true, {
  buildTime: 45000,
  branch: "main",
  customDomain: "docs.example.com",
});

// Failed deployment
await trackDeployment("project-123", "hugo", false, {
  errorMessage: "Build failed: missing dependencies",
  failureStage: "build",
  buildTime: 15000,
});
```

#### Querying Deployment History

```typescript
// Get all deployments for a project
const deployments = await kg.findEdges({
  source: "project:my-project-123",
  type: "deployed_with",
});

// Get successful deployments only
const successfulDeployments = deployments.filter(
  (edge) => edge.properties.success === true,
);
```

### Recommendation Engine

#### SSG Recommendations

```typescript
import { getDeploymentRecommendations } from "./kg-integration";

const recommendations = await getDeploymentRecommendations("project-123");

// Returns sorted by confidence
recommendations.forEach((rec) => {
  console.log(`${rec.ssg}: ${rec.confidence}% confidence`);
  console.log(`Reason: ${rec.reason}`);
});
```

#### Technology Compatibility

```typescript
// Find compatible technologies
const compatibleSSGs = await kg.findEdges({
  source: "technology:react",
  type: "compatible_with",
});

const recommendations = compatibleSSGs
  .filter((edge) => edge.target.startsWith("ssg:"))
  .sort((a, b) => b.confidence - a.confidence);
```

### User Preference Learning

#### Preference Management

```typescript
import { getUserPreferenceManager } from "./user-preferences";

const manager = await getUserPreferenceManager("user-123");

// Track SSG usage
await manager.trackSSGUsage({
  ssg: "docusaurus",
  success: true,
  timestamp: new Date().toISOString(),
  projectType: "javascript-library",
});

// Get personalized recommendations
const personalizedRecs = await manager.getSSGRecommendations();
```

#### Learning Patterns

```typescript
// Update preferences based on deployment success
await manager.updatePreferences({
  preferredSSGs: ["docusaurus", "hugo"],
  expertise: "intermediate",
  technologies: ["react", "typescript", "node"],
});

// Get usage statistics
const stats = await manager.getUsageStatistics();
console.log(`Total deployments: ${stats.totalDeployments}`);
console.log(`Success rate: ${stats.successRate}%`);
```

## Code Integration (Phase 1.2)

### Code File Entities

```typescript
import { createCodeFileEntities } from "./kg-code-integration";

// Create code file nodes with AST analysis
const codeFiles = await createCodeFileEntities(
  "project-123",
  "/path/to/repository",
);

// Each code file includes:
// - Functions and classes (via AST parsing)
// - Dependencies and imports
// - Complexity metrics
// - Change detection (content hash)
```

### Documentation Linking

```typescript
import {
  createDocumentationEntities,
  linkCodeToDocs,
} from "./kg-code-integration";

// Create documentation section nodes
const docSections = await createDocumentationEntities(
  "project-123",
  extractedContent,
);

// Link code files to documentation
const relationships = await linkCodeToDocs(codeFiles, docSections);

// Detect outdated documentation
const outdatedLinks = relationships.filter(
  (edge) => edge.type === "outdated_for",
);
```

## Query Patterns

### Basic Queries

#### Node Queries

```typescript
// Find all projects using React
const reactProjects = await kg.findNodes({
  type: "project",
  properties: {
    "structure.technologies": { contains: "react" },
  },
});

// Find high-success configurations
const reliableConfigs = await kg.findNodes({
  type: "configuration",
  properties: {
    successRate: { gte: 0.9 },
  },
});
```

#### Edge Queries

```typescript
// Find all deployment relationships
const deployments = await kg.findEdges({
  type: "deployed_with",
});

// Find user preferences
const userPrefs = await kg.findEdges({
  source: "user:developer-123",
  type: "prefers",
});
```

### Complex Queries

#### Multi-hop Traversal

```typescript
// Find recommended SSGs for similar projects
const recommendations = await kg.query(`
  MATCH (p1:project {id: 'my-project'})
  MATCH (p2:project)-[:similar_to]-(p1)
  MATCH (p2)-[:deployed_with]->(config:configuration)
  WHERE config.successRate > 0.8
  RETURN config.ssg, AVG(config.successRate) as avgSuccess
  ORDER BY avgSuccess DESC
`);
```

#### Aggregation Queries

```typescript
// Get deployment statistics by SSG
const ssgStats = await kg.aggregate({
  groupBy: "ssg",
  metrics: ["successRate", "buildTime", "userSatisfaction"],
  filters: {
    timestamp: { gte: "2024-01-01" },
  },
});
```

### Pattern Detection

#### Success Patterns

```typescript
// Identify high-success patterns
const successPatterns = await kg.findPatterns({
  nodeType: "project",
  edgeType: "deployed_with",
  threshold: 0.9,
  minOccurrences: 5,
});

// Example pattern: TypeScript + Docusaurus = 95% success rate
```

#### Failure Analysis

```typescript
// Analyze failure patterns
const failurePatterns = await kg.findPatterns({
  nodeType: "project",
  edgeType: "failed_at",
  groupBy: ["technology", "ssg", "errorType"],
});
```

## Memory Management

### Storage and Persistence

```typescript
// Configure storage directory
const storage = new KnowledgeGraphStorage({
  directory: "/path/to/kg-storage",
  format: "jsonl", // or "sqlite", "json"
  compression: true,
  backupInterval: "daily",
});

// Initialize with storage
await initializeKnowledgeGraph(storage);
```

### Memory Cleanup

```typescript
import { memoryCleanup } from "./memory-management";

// Clean old memories (default: 30 days)
await memoryCleanup({
  daysToKeep: 30,
  dryRun: false, // Set true to preview
});
```

### Memory Export/Import

```typescript
import { memoryExport, memoryImportAdvanced } from "./memory-management";

// Export knowledge graph
await memoryExport({
  format: "json",
  outputPath: "/backup/kg-export.json",
  filter: {
    nodeTypes: ["project", "configuration"],
    dateRange: { since: "2024-01-01" },
  },
});

// Import knowledge graph
await memoryImportAdvanced({
  inputPath: "/backup/kg-export.json",
  options: {
    mergeStrategy: "update",
    validateSchema: true,
    conflictResolution: "newer-wins",
  },
});
```

## Analytics and Insights

### Memory Insights

```typescript
import { memoryInsights } from "./memory-management";

const insights = await memoryInsights({
  projectId: "my-project",
  timeRange: {
    from: "2024-01-01",
    to: "2024-12-31",
  },
});

console.log(`Deployment success rate: ${insights.deploymentSuccessRate}`);
console.log(`Most successful SSG: ${insights.mostSuccessfulSSG}`);
console.log(`Optimization opportunities: ${insights.optimizations.length}`);
```

### Temporal Analysis

```typescript
import { memoryTemporalAnalysis } from "./memory-management";

const trends = await memoryTemporalAnalysis({
  analysisType: "patterns",
  query: {
    nodeType: "project",
    edgeType: "deployed_with",
    timeWindow: "monthly",
  },
});

// Analyze deployment trends over time
trends.patterns.forEach((pattern) => {
  console.log(`${pattern.month}: ${pattern.successRate}% success`);
});
```

### Intelligent Analysis

```typescript
import { memoryIntelligentAnalysis } from "./memory-management";

const analysis = await memoryIntelligentAnalysis({
  projectPath: "/path/to/project",
  baseAnalysis: repositoryAnalysis,
});

console.log(`Predicted success rate: ${analysis.predictions.successRate}`);
console.log(`Recommendations: ${analysis.recommendations.length}`);
console.log(`Risk factors: ${analysis.riskFactors.length}`);
```

## Visualization

### Network Visualization

```typescript
import { memoryVisualization } from "./memory-management";

// Generate network diagram
const networkViz = await memoryVisualization({
  visualizationType: "network",
  options: {
    layout: "force-directed",
    nodeSize: "degree",
    colorBy: "nodeType",
    filterEdges: ["deployed_with", "recommends"],
  },
});

// Export as SVG or interactive HTML
await networkViz.export("/output/knowledge-graph.svg");
```

### Timeline Dashboard

```typescript
// Generate deployment timeline
const timeline = await memoryVisualization({
  visualizationType: "timeline",
  options: {
    timeRange: "last-6-months",
    groupBy: "project",
    metrics: ["success-rate", "build-time"],
    interactive: true,
  },
});
```

## Best Practices

### Performance Optimization

- Use indexed queries for frequent lookups
- Implement query result caching for repeated patterns
- Periodically clean up outdated relationships
- Use batch operations for bulk updates

### Data Quality

- Validate node properties before insertion
- Implement schema versioning for compatibility
- Use unique constraints to prevent duplicates
- Regular integrity checks and repair

### Security and Privacy

- Encrypt sensitive preference data
- Implement access controls for user data
- Audit log for data access and modifications
- GDPR compliance for user preference management

### Monitoring and Maintenance

- Monitor query performance and optimization
- Track knowledge graph growth and memory usage
- Automated backup and disaster recovery
- Version control for schema changes

## Troubleshooting

### Common Issues

**Memory Growth**

- Implement periodic cleanup of old deployment records
- Archive historical data beyond retention period
- Monitor node/edge count growth patterns

**Query Performance**

- Add indexes for frequently queried properties
- Optimize complex traversal queries
- Use query result caching for expensive operations

**Data Consistency**

- Validate relationships before creation
- Implement transaction-like operations for atomic updates
- Regular consistency checks and repair tools

### Debug Tools

**Graph Inspector**

```typescript
import { graphInspector } from "./debug-tools";

const stats = await graphInspector.getStatistics();
console.log(`Nodes: ${stats.nodeCount}, Edges: ${stats.edgeCount}`);
console.log(`Storage size: ${stats.storageSize}MB`);

const orphanedNodes = await graphInspector.findOrphanedNodes();
console.log(`Orphaned nodes: ${orphanedNodes.length}`);
```

**Query Profiler**

```typescript
const profiler = await graphInspector.profileQuery(complexQuery);
console.log(`Execution time: ${profiler.executionTime}ms`);
console.log(`Nodes traversed: ${profiler.nodesTraversed}`);
console.log(`Optimization suggestions: ${profiler.suggestions}`);
```

## Related Documentation

- [Memory System](./tutorials/memory-workflows.md) - Overall memory architecture and patterns
- [User Preferences](./reference/mcp-tools.md#manage_preferences) - Preference learning and management
- [Deployment Automation](./explanation/architecture.md#deployment-automation) - Deployment automation and tracking
- [Repository Analysis](./how-to/repository-analysis.md) - Project analysis and indexing
