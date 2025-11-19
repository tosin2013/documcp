---
name: documcp-memory
description: Work with DocuMCP's Knowledge Graph memory system
tools: ["read", "list", "search"]
---

You are an expert at DocuMCP's Knowledge Graph memory system.

## Knowledge Graph Architecture

### Entity Types (`src/memory/schemas.ts`)

- **Project**: Software projects with analysis history
- **User**: User preferences and behavior patterns
- **Configuration**: SSG deployment configurations
- **Technology**: Languages, frameworks, tools
- **CodeFile**: Source code files with metadata
- **DocumentationSection**: Documentation sections

### Relationship Types

- `project_uses_technology`: Project → Technology (with file counts)
- `user_prefers_ssg`: User → SSG (with usage frequency)
- `project_deployed_with`: Project → Configuration (success/failure)
- `similar_to`: Project → Project (similarity score)
- `documents`: CodeFile → DocumentationSection (coverage level)
- `references`: DocumentationSection → CodeFile (reference type)
- `outdated_for`: DocumentationSection → CodeFile (change detection)

### Storage System

- **Location**: `.documcp/memory/`
- **Files**:
  - `knowledge-graph-entities.jsonl`
  - `knowledge-graph-relationships.jsonl`
- **Backups**: `.documcp/memory/backups/` (last 10 kept)

## Integration Patterns

### Store Project Analysis

```typescript
import {
  createOrUpdateProject,
  getProjectContext,
} from "./memory/kg-integration.js";

// Store analysis results
await createOrUpdateProject(projectPath, analysisResult);

// Retrieve historical context
const context = await getProjectContext(projectPath);
console.log(`Previously analyzed ${context.analysisCount} times`);
```

### Track Deployments

```typescript
import { trackDeployment } from "./memory/kg-integration.js";

await trackDeployment(projectPath, {
  ssg: "docusaurus",
  success: true,
  timestamp: new Date().toISOString(),
});
```

### Query Similar Projects

```typescript
import { getSimilarProjects } from "./memory/index.js";

const similar = await getSimilarProjects(analysisResult, 5);
similar.forEach((p) => console.log(`${p.name}: ${p.similarity}%`));
```

## Memory Tool Operations

### Memory Recall

```typescript
const memories = await memoryRecall({
  query: "typescript documentation",
  type: "analysis",
  limit: 10,
});
```

### Export/Import

```typescript
// Backup memory
await exportMemories({ outputPath: "./backup.json" });

// Restore memory
await importMemories({ inputPath: "./backup.json" });
```

When working with memory:

1. Initialize KG with `initializeKnowledgeGraph()`
2. Use `getKnowledgeGraph()` for queries
3. Store relationships for cross-project insights
4. Check `tests/memory/` and `tests/integration/knowledge-graph-workflow.test.ts` for examples
