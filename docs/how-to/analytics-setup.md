---
documcp:
  last_updated: "2025-11-20T00:46:21.949Z"
  last_validated: "2025-11-20T00:46:21.949Z"
  auto_updated: false
  update_frequency: monthly
---

# How to Use DocuMCP Deployment Analytics

This guide shows you how to access and use DocuMCP's built-in deployment analytics to track your documentation deployment success and patterns.

## Quick Setup

```bash
# Analyze deployment patterns:
"analyze my deployment history and provide insights"
```

## Analytics Overview

DocuMCP provides comprehensive **deployment analytics** to help you understand and optimize your documentation deployment process:

### Analytics Types

- **Deployment Success Tracking**: Monitor deployment success/failure rates
- **SSG Performance Analytics**: Compare static site generator effectiveness
- **Build Time Metrics**: Track deployment speed and optimization opportunities
- **Project Pattern Analysis**: Understand which configurations work best

### Built-in Analytics Features

- **Deployment Health Scoring**: 0-100 health score for your deployment pipeline
- **SSG Comparison**: Compare success rates across different static site generators
- **Trend Analysis**: Track deployment patterns over time
- **Knowledge Graph Integration**: Learn from deployment history for better recommendations

## Using Deployment Analytics

### Method 1: Generate Full Analytics Report

```bash
# Get comprehensive deployment analytics:
"analyze my deployments and provide a full report"
```

This will provide:

1. Overall deployment success rates
2. SSG performance comparison
3. Build time analysis
4. Project pattern insights
5. Recommendations for optimization

### Method 2: Specific Analytics Queries

#### Get SSG Statistics

```bash
# Analyze specific SSG performance:
"show me statistics for Docusaurus deployments"
```

#### Compare SSG Performance

```bash
# Compare multiple SSGs:
"compare deployment success rates between Hugo and Jekyll"
```

#### Get Deployment Health Score

```bash
# Check deployment pipeline health:
"what is my deployment health score?"
```

#### Analyze Deployment Trends

```bash
# View deployment trends over time:
"show me deployment trends for the last 30 days"
```

## Deployment Analytics Examples

### Sample Analytics Report

```typescript
// Example deployment analytics report structure
{
  "summary": {
    "totalProjects": 15,
    "totalDeployments": 42,
    "overallSuccessRate": 0.85,
    "mostUsedSSG": "docusaurus",
    "mostSuccessfulSSG": "hugo"
  },
  "patterns": [
    {
      "ssg": "docusaurus",
      "totalDeployments": 18,
      "successfulDeployments": 16,
      "failedDeployments": 2,
      "successRate": 0.89,
      "averageBuildTime": 45000,
      "projectCount": 8
    }
  ],
  "insights": [
    {
      "type": "success",
      "title": "High Success Rate",
      "description": "Excellent! 85% of deployments succeed"
    }
  ]
}
```

### Health Score Breakdown

```typescript
// Example health score analysis
{
  "score": 78,
  "factors": [
    {
      "name": "Overall Success Rate",
      "impact": 34,
      "status": "good"
    },
    {
      "name": "Active Projects",
      "impact": 20,
      "status": "good"
    },
    {
      "name": "Deployment Activity",
      "impact": 15,
      "status": "warning"
    },
    {
      "name": "SSG Diversity",
      "impact": 9,
      "status": "warning"
    }
  ]
}
```

### MCP Tool Integration

```typescript
// Using the analyze_deployments MCP tool directly
import { analyzeDeployments } from "./dist/tools/analyze-deployments.js";

// Get full analytics report
const report = await analyzeDeployments({
  analysisType: "full_report",
});

// Get specific SSG statistics
const docusaurusStats = await analyzeDeployments({
  analysisType: "ssg_stats",
  ssg: "docusaurus",
});

// Compare multiple SSGs
const comparison = await analyzeDeployments({
  analysisType: "compare",
  ssgs: ["hugo", "jekyll", "docusaurus"],
});

// Get deployment health score
const health = await analyzeDeployments({
  analysisType: "health",
});
```

## Advanced Deployment Analytics

### Deployment Pattern Analysis

```bash
# Analyze deployment patterns by technology:
"show me deployment success patterns for TypeScript projects"

# Analyze by project size:
"compare deployment success rates for small vs large projects"

# Analyze by team size:
"show deployment patterns for different team sizes"
```

### Knowledge Graph Insights

```bash
# Get insights from deployment history:
"what SSG works best for React projects based on deployment history?"

# Learn from similar projects:
"recommend deployment strategy based on similar successful projects"

# Analyze failure patterns:
"what are the common causes of deployment failures?"
```

### Trend Analysis

```bash
# Analyze deployment trends:
"show me deployment success trends over the last 6 months"

# Compare time periods:
"compare deployment performance between Q3 and Q4"

# Identify improvement opportunities:
"what deployment metrics have improved recently?"
```

## Troubleshooting

### Common Issues

**Problem**: No deployment data available
**Solution**: Deploy at least one project to start collecting analytics data

**Problem**: Analytics tool returns empty results
**Solution**: Ensure knowledge graph storage directory exists and has proper permissions

**Problem**: Health score seems low
**Solution**: Review deployment failures and optimize SSG configurations

**Problem**: Missing deployment history
**Solution**: Check that deployment tracking is enabled in knowledge graph

### Analytics Debugging

```bash
# Debug deployment analytics issues:
"check my deployment analytics configuration and data availability"
```

## Best Practices

### Deployment Analytics Guidelines

1. **Regular Deployments**: Deploy frequently to build meaningful analytics data
2. **Track Failures**: Learn from deployment failures to improve success rates
3. **Monitor Trends**: Review analytics weekly to identify patterns
4. **Compare SSGs**: Use analytics to choose the best SSG for each project type
5. **Health Monitoring**: Keep deployment health score above 70

### Data Quality

1. **Consistent Tracking**: Ensure all deployments are tracked in knowledge graph
2. **Clean Data**: Review and clean up failed deployment records periodically
3. **Regular Analysis**: Run analytics reports monthly to identify trends
4. **Documentation**: Document deployment patterns and insights
5. **Team Sharing**: Share analytics insights with your development team

## Deployment Analytics Tools

### Built-in DocuMCP Analytics

- **Deployment success tracking**: Monitor success/failure rates
- **SSG performance analysis**: Compare static site generator effectiveness
- **Build time metrics**: Track deployment speed and optimization opportunities
- **Knowledge graph insights**: Learn from deployment history patterns

### MCP Tools Available

- `analyze_deployments`: Generate comprehensive deployment analytics
- `deploy_pages`: Track deployment attempts and outcomes
- `recommend_ssg`: Get SSG recommendations based on analytics

## Next Steps

- [Deploy Pages](../reference/mcp-tools.md#deploy_pages)
- [SSG Recommendations](../reference/mcp-tools.md#recommend_ssg)
- [Knowledge Graph](../knowledge-graph.md)
- [Troubleshooting](troubleshooting.md)
