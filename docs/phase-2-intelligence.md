---
documcp:
  last_updated: "2025-11-20T00:46:21.959Z"
  last_validated: "2025-12-09T19:41:38.589Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# Phase 2: Intelligence & Learning System

DocuMCP Phase 2 introduces a comprehensive intelligence and learning system that makes the MCP server continuously smarter with each deployment. The system learns from historical data, user preferences, and deployment outcomes to provide increasingly accurate recommendations and insights.

## Overview

Phase 2 consists of four major components:

1. **Historical Deployment Intelligence** (Phase 2.1)
2. **User Preference Management** (Phase 2.2)
3. **Deployment Outcome Tracking** (Phase 2.3)
4. **Deployment Analytics & Insights** (Phase 2.4)

Together, these components create a self-improving feedback loop where deployment outcomes continuously inform and improve future recommendations.

## Phase 2.1: Historical Deployment Intelligence

### Overview

The `recommend_ssg` tool now integrates with the Knowledge Graph to access historical deployment data from similar projects, providing data-driven recommendations based on real success patterns.

### Key Features

- **Similar Project Detection**: Finds projects with similar technologies and stack
- **Success Rate Analysis**: Calculates SSG-specific success rates from historical deployments
- **Intelligent Scoring**: Boosts confidence scores for SSGs with proven success rates
- **Context-Aware Recommendations**: Considers both current project and historical patterns

### Usage Example

```typescript
// Recommendation with historical data
const result = await recommendSSG({
  repository: "/path/to/project",
  primaryLanguage: "typescript",
  frameworks: ["react"],
  hasTests: true,
  hasCI: true
});

// Response includes historical data
{
  recommended: "docusaurus",
  confidence: 0.95,
  reasoning: [
    "docusaurus has 100% success rate in similar projects",
    "5 deployment(s) across 2 similar project(s)",
    "React framework detected - excellent match for Docusaurus"
  ],
  historicalData: {
    similarProjectCount: 2,
    successRates: {
      docusaurus: { rate: 1.0, deployments: 5, projects: 2 }
    },
    topPerformer: { ssg: "docusaurus", rate: 1.0, deployments: 5 }
  }
}
```

### Intelligence Features

1. **Confidence Boosting**: SSGs with >90% success rate get +0.2 confidence boost
2. **Performance Switching**: Automatically switches to top performer if 20% better
3. **Alternative Suggestions**: Mentions high-performing alternatives in reasoning
4. **Statistical Context**: Includes deployment counts and project counts in recommendations

## Phase 2.2: User Preference Management

### Overview

A comprehensive user preference system that personalizes recommendations based on individual user patterns and explicit preferences.

### User Preference Schema

```typescript
interface UserPreferences {
  preferredSSGs: string[]; // Favorite SSGs
  documentationStyle: "minimal" | "comprehensive" | "tutorial-heavy";
  expertiseLevel: "beginner" | "intermediate" | "advanced";
  preferredTechnologies: string[]; // Favorite techs/frameworks
  preferredDiataxisCategories: (
    | "tutorials"
    | "how-to"
    | "reference"
    | "explanation"
  )[];
  autoApplyPreferences: boolean;
}
```

### SSG Usage History

The system automatically tracks SSG usage patterns:

```typescript
interface SSGUsageHistory {
  ssg: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed: string;
  projectTypes: string[];
}
```

### Usage with manage_preferences Tool

```bash
# Get current preferences
manage_preferences({ action: "get", userId: "user123" })

# Update preferences
manage_preferences({
  action: "update",
  userId: "user123",
  preferences: {
    preferredSSGs: ["docusaurus", "hugo"],
    documentationStyle: "comprehensive",
    expertiseLevel: "intermediate",
    autoApplyPreferences: true
  }
})

# Get personalized SSG recommendations
manage_preferences({
  action: "recommendations",
  userId: "user123"
})

# Export preferences (backup)
manage_preferences({ action: "export", userId: "user123" })

# Import preferences (restore)
manage_preferences({
  action: "import",
  userId: "user123",
  json: "<exported-json-string>"
})

# Reset to defaults
manage_preferences({ action: "reset", userId: "user123" })
```

### Preference Scoring Algorithm

The system scores SSGs based on:

1. **Usage History** (40%): Frequency and success rate
2. **Explicit Preferences** (30%): User's preferred SSG list
3. **Project Compatibility** (30%): Match with project technologies

### Integration Points

User preferences are automatically integrated into:

- `recommend_ssg` - Personalized SSG recommendations
- `populate_content` - Content style adaptation
- `generate_config` - Configuration customization

## Phase 2.3: Deployment Outcome Tracking

### Overview

The `deploy_pages` tool now tracks deployment outcomes in the Knowledge Graph, creating a feedback loop for continuous improvement.

### Enhanced deploy_pages Tool

```typescript
// Deployment with tracking
const result = await deployPages({
  repository: "/path/to/repo",
  ssg: "docusaurus",
  branch: "gh-pages",

  // New tracking parameters
  projectPath: "/path/to/repo",
  projectName: "My Awesome Project",
  analysisId: "analysis_123", // Link to analysis
  userId: "user123", // Link to user preferences
});
```

### What Gets Tracked

1. **Project Metadata**

   - Project structure and languages
   - Technologies detected
   - CI/CD status

2. **Deployment Details**

   - SSG used
   - Success/failure status
   - Build time (milliseconds)
   - Error messages (if failed)
   - Timestamp

3. **User Association**
   - Links deployment to user
   - Updates user's SSG usage history
   - Feeds into preference learning

### Knowledge Graph Structure

```
Project Node
  ├─→ [project_deployed_with] → Configuration Node (SSG)
  │                              Properties: ssg, successRate, usageCount
  │
  └─→ [project_uses_technology] → Technology Nodes
```

### Deployment Edges

Each deployment creates an edge with properties:

```typescript
{
  type: "project_deployed_with",
  properties: {
    success: boolean,
    timestamp: string,
    buildTime?: number,
    errorMessage?: string
  }
}
```

### Graceful Degradation

Tracking failures don't affect deployment:

- Deployment continues even if tracking fails
- Warnings logged but not propagated
- No impact on user workflow

## Phase 2.4: Deployment Analytics & Insights

### Overview

Comprehensive analytics engine that identifies patterns, generates insights, and provides actionable recommendations based on deployment history.

### analyze_deployments Tool

The tool supports 5 analysis types:

#### 1. Full Report

```typescript
analyzeDeployments({ analysisType: "full_report" });
```

Returns comprehensive analytics:

```typescript
{
  summary: {
    totalProjects: number,
    totalDeployments: number,
    overallSuccessRate: number,
    mostUsedSSG: string,
    mostSuccessfulSSG: string
  },
  patterns: DeploymentPattern[],
  insights: DeploymentInsight[],
  recommendations: string[]
}
```

#### 2. SSG Statistics

```typescript
analyzeDeployments({
  analysisType: "ssg_stats",
  ssg: "docusaurus",
});
```

Returns detailed statistics for specific SSG:

```typescript
{
  ssg: "docusaurus",
  totalDeployments: 15,
  successfulDeployments: 14,
  failedDeployments: 1,
  successRate: 0.93,
  averageBuildTime: 24500,
  commonTechnologies: ["typescript", "react"],
  projectCount: 8
}
```

#### 3. SSG Comparison

```typescript
analyzeDeployments({
  analysisType: "compare",
  ssgs: ["docusaurus", "hugo", "mkdocs"],
});
```

Returns sorted comparison by success rate:

```typescript
[
  { ssg: "hugo", pattern: { successRate: 1.0, ... } },
  { ssg: "docusaurus", pattern: { successRate: 0.93, ... } },
  { ssg: "mkdocs", pattern: { successRate: 0.75, ... } }
]
```

#### 4. Health Score

```typescript
analyzeDeployments({ analysisType: "health" });
```

Returns 0-100 health score with factors:

```typescript
{
  score: 78,
  factors: [
    {
      name: "Overall Success Rate",
      impact: 36,
      status: "good"
    },
    {
      name: "Active Projects",
      impact: 16,
      status: "good"
    },
    {
      name: "Deployment Activity",
      impact: 18,
      status: "good"
    },
    {
      name: "SSG Diversity",
      impact: 8,
      status: "warning"
    }
  ]
}
```

**Health Score Algorithm:**

- Overall Success Rate: 40 points (0-40)
- Active Projects: 20 points (0-20)
- Deployment Activity: 20 points (0-20)
- SSG Diversity: 20 points (0-20)

**Status Thresholds:**

- **Success Rate**: good >80%, warning >50%, critical ≤50%
- **Projects**: good >5, warning >2, critical ≤2
- **Deployments**: good >10, warning >5, critical ≤5
- **Diversity**: good >3 SSGs, warning >1, critical ≤1

#### 5. Trend Analysis

```typescript
analyzeDeployments({
  analysisType: "trends",
  periodDays: 30, // Default: 30 days
});
```

Returns deployment trends over time:

```typescript
[
  {
    period: "0 periods ago",
    deployments: 12,
    successRate: 0.92,
    topSSG: "docusaurus",
  },
  {
    period: "1 periods ago",
    deployments: 8,
    successRate: 0.88,
    topSSG: "hugo",
  },
];
```

### Insight Generation

The analytics engine automatically generates insights:

**Success Insights:**

- High success rates (>80%)
- Perfect track records (100% with ≥3 deployments)
- Fast builds (&lt;30s average)

**Warning Insights:**

- Low success rates (&lt;50%)
- Struggling SSGs (&lt;50% success, ≥2 deployments)
- Slow builds (&gt;120s average)

### Smart Recommendations

The system generates actionable recommendations:

1. **Best SSG Suggestion**: Recommends SSGs with &gt;80% success rate
2. **Problem Identification**: Flags SSGs with &lt;50% success and ≥3 failures
3. **Diversity Advice**: Suggests experimenting with different SSGs
4. **Activity Recommendations**: Encourages more deployments for better data
5. **Multi-Issue Alerts**: Warns when multiple deployment issues detected

### Usage Examples

**Example 1: Get deployment overview**

```bash
"Analyze my deployment history"
# → Uses analyze_deployments with full_report
```

**Example 2: Compare SSG performance**

```bash
"Compare the success rates of Docusaurus and Hugo"
# → Uses analyze_deployments with compare type
```

**Example 3: Check deployment health**

```bash
"What's the health score of my deployments?"
# → Uses analyze_deployments with health type
```

**Example 4: Identify trends**

```bash
"Show me deployment trends over the last 60 days"
# → Uses analyze_deployments with trends, periodDays: 60
```

## The Feedback Loop

Phase 2 creates a continuous improvement cycle:

```
1. User deploys documentation (deploy_pages)
   ↓
2. Deployment outcome tracked (Phase 2.3)
   ↓
3. User preferences updated (Phase 2.2)
   ↓
4. Analytics identify patterns (Phase 2.4)
   ↓
5. Historical data enriched (Phase 2.1)
   ↓
6. Future recommendations improved
   ↓
[Cycle continues with each deployment]
```

## Data Storage

All Phase 2 data is stored in the Knowledge Graph:

**Storage Location:**

- Default: `~/.documcp/knowledge-graph.jsonl`
- Custom: Set `DOCUMCP_STORAGE_DIR` environment variable

**Data Format:**

- JSONL (JSON Lines) format
- One record per line
- Efficient for append operations
- Human-readable for debugging

**Data Privacy:**

- All data stored locally
- No external transmission
- User-specific via userId
- Can be exported/imported

## Best Practices

### For Users

1. **Provide User ID**: Include `userId` in deploy_pages for personalized learning
2. **Link Deployments**: Use `analysisId` to connect analysis → deployment
3. **Review Analytics**: Periodically check `analyze_deployments` for insights
4. **Set Preferences**: Configure preferences early for better recommendations
5. **Track Projects**: Always provide `projectPath` and `projectName` for tracking

### For Developers

1. **Graceful Degradation**: Don't fail operations if tracking fails
2. **Efficient Queries**: Use Knowledge Graph indexes for performance
3. **Data Validation**: Validate all inputs before storage
4. **Privacy First**: Keep all data local, respect user boundaries
5. **Clear Errors**: Provide helpful error messages and resolutions

## Performance Considerations

**Query Optimization:**

- Knowledge Graph queries are O(n) where n = relevant nodes/edges
- Use type filters to reduce search space
- Cache frequently accessed data in UserPreferenceManager

**Storage Growth:**

- Each deployment adds ~2 nodes and 2 edges
- JSONL format appends efficiently
- Periodic pruning recommended for large datasets

**Memory Usage:**

- Knowledge Graph loaded into memory
- Singleton pattern prevents multiple instances
- UserPreferenceManager caches per user

## Future Enhancements

Planned improvements for Phase 2:

1. **Machine Learning Integration**: Train models on deployment patterns
2. **Cross-User Insights**: Aggregate anonymous patterns (opt-in)
3. **Predictive Analytics**: Predict deployment success before execution
4. **Automated Optimization**: Auto-tune SSG configurations
5. **Advanced Visualizations**: Charts and graphs for analytics
6. **Export/Import**: Backup and restore full deployment history
7. **Multi-Tenancy**: Better isolation for team environments

## API Reference

### recommend_ssg (Enhanced)

Now includes historical data integration.

**Input:**

```typescript
{
  repository: string,
  primaryLanguage?: string,
  frameworks?: string[],
  hasTests?: boolean,
  hasCI?: boolean,
  userId?: string  // New: for preference integration
}
```

**Output:**

```typescript
{
  recommended: string,
  confidence: number,
  reasoning: string[],
  historicalData?: {
    similarProjectCount: number,
    successRates: Record<string, { rate: number, deployments: number, projects: number }>,
    topPerformer?: { ssg: string, rate: number, deployments: number }
  },
  alternatives: Array<{ ssg: string, confidence: number }>
}
```

### manage_preferences

Manage user preferences and get personalized recommendations.

**Actions:**

- `get`: Retrieve current preferences
- `update`: Update preferences
- `reset`: Reset to defaults
- `export`: Export as JSON
- `import`: Import from JSON
- `recommendations`: Get SSG recommendations based on preferences

**Input:**

```typescript
{
  action: "get" | "update" | "reset" | "export" | "import" | "recommendations",
  userId?: string,  // Default: "default"
  preferences?: UserPreferences,  // For update
  json?: string  // For import
}
```

### deploy_pages (Enhanced)

Now tracks deployment outcomes.

**New Parameters:**

```typescript
{
  // Existing parameters
  repository: string,
  ssg: string,
  branch?: string,
  customDomain?: string,

  // New tracking parameters
  projectPath?: string,      // Required for tracking
  projectName?: string,      // Required for tracking
  analysisId?: string,       // Link to analysis
  userId?: string            // Default: "default"
}
```

### analyze_deployments

Analyze deployment patterns and generate insights.

**Input:**

```typescript
{
  analysisType?: "full_report" | "ssg_stats" | "compare" | "health" | "trends",
  ssg?: string,              // Required for ssg_stats
  ssgs?: string[],           // Required for compare (min 2)
  periodDays?: number        // For trends (default: 30)
}
```

## Testing

Phase 2 includes comprehensive test coverage:

- **Phase 2.1**: Historical integration tests (recommend-ssg-historical.test.ts)
- **Phase 2.2**: User preference tests (manage-preferences.test.ts)
- **Phase 2.3**: Deployment tracking tests (deploy-pages-tracking.test.ts)
- **Phase 2.4**: Analytics tests (analyze-deployments.test.ts)

**Run Phase 2 Tests:**

```bash
npm test -- tests/tools/recommend-ssg-historical.test.ts
npm test -- tests/tools/deploy-pages-tracking.test.ts
npm test -- tests/tools/analyze-deployments.test.ts
```

## Troubleshooting

### Issue: Historical data not showing in recommendations

**Solution:**

- Ensure deployments are being tracked (check Knowledge Graph file)
- Verify `projectPath` and `projectName` provided in deploy_pages
- Check that similar projects exist in the graph

### Issue: User preferences not applying

**Solution:**

- Confirm `autoApplyPreferences: true` in preferences
- Ensure `userId` matches between deploy_pages and manage_preferences
- Verify preferences are saved (use `action: "get"`)

### Issue: Analytics showing no data

**Solution:**

- Check that deployments were tracked (look for project_deployed_with edges)
- Verify Knowledge Graph file exists and is readable
- Ensure DOCUMCP_STORAGE_DIR is set correctly

### Issue: Health score seems low

**Solution:**

- Review the 4 health factors individually
- Check for failed deployments reducing success rate
- Increase deployment activity for better scores
- Try deploying with different SSGs for diversity

## Summary

Phase 2 transforms DocuMCP from a stateless tool into an intelligent, learning system that continuously improves with use. By tracking deployments, learning user preferences, and analyzing patterns, DocuMCP provides increasingly accurate and personalized recommendations that help users make better documentation decisions.

The self-improving feedback loop ensures that every deployment makes the system smarter, creating a virtuous cycle of continuous improvement that benefits all users.
