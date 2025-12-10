# Prioritizing Documentation Drift Updates

This guide explains how to use the priority scoring system to identify and triage documentation drift based on importance and urgency.

## Overview

The priority scoring system ranks documentation drift issues by importance, helping teams focus on the most critical documentation updates first. Each drift detection result receives a comprehensive priority score based on multiple factors.

## Priority Levels

| Level | Score Range | SLA | Description |
|-------|-------------|-----|-------------|
| **Critical** | 80-100 | Update immediately | Breaking changes in heavily-used APIs with complex code |
| **High** | 60-79 | Update within 1 day | Major changes affecting documented features |
| **Medium** | 40-59 | Update within 1 week | Multiple minor changes or stale documentation |
| **Low** | 0-39 | Update when convenient | Patch-level changes or well-documented code |

## Scoring Factors

The priority score (0-100) is calculated using six weighted factors:

### 1. Code Complexity (20% weight)

Measures how complex the changed code is:
- Uses AST analysis complexity metrics
- Higher complexity = higher priority
- Adjusted by drift severity (critical/high/medium/low)

**Example**: A complex algorithm change scores higher than a simple utility function change.

### 2. Usage Frequency (25% weight)

Estimates how often the code is used:
- Based on export count (public APIs)
- Documentation references
- Optional: Actual usage metrics (function calls, imports)

**Example**: A widely-imported authentication function scores higher than an internal helper.

### 3. Change Magnitude (25% weight)

Evaluates the size and impact of changes:
- Breaking changes: 100 (maximum priority)
- Major changes: 20 points each
- Minor changes: 8 points each

**Example**: Changing a function signature (breaking) scores 100, while adding a parameter with default (major) scores 20.

### 4. Documentation Coverage (15% weight)

Inverted scoring - lower coverage = higher priority:
- Missing documentation: 90
- Partially documented: 40-80 (based on coverage ratio)
- Well documented: 0-40

**Example**: Undocumented new features score higher than changes to well-documented APIs.

### 5. Staleness (10% weight)

Based on how long since documentation was last updated:
- 90+ days old: 100
- 30-90 days: 80
- 14-30 days: 60
- 7-14 days: 40
- <7 days: 20

**Example**: Documentation untouched for 3 months scores higher than recently updated docs.

### 6. User Feedback (5% weight)

Future integration with issue tracking:
- Currently returns 0 (placeholder)
- Will incorporate reported documentation issues
- User complaints increase priority

## Basic Usage

### Detect Drift with Priority Scores

```typescript
import { DriftDetector } from "./utils/drift-detector.js";

const detector = new DriftDetector(projectPath);
await detector.initialize();

// Create snapshots
const oldSnapshot = await detector.loadLatestSnapshot();
const newSnapshot = await detector.createSnapshot(projectPath, docsPath);

// Detect drift with priority scoring
const results = await detector.detectDriftWithPriority(
  oldSnapshot,
  newSnapshot
);

for (const result of results) {
  console.log(`File: ${result.filePath}`);
  console.log(`Priority: ${result.priorityScore.recommendation}`);
  console.log(`Score: ${result.priorityScore.overall}/100`);
  console.log(`Action: ${result.priorityScore.suggestedAction}`);
}
```

### Get Prioritized Results

Results sorted by priority (highest first):

```typescript
const prioritizedResults = await detector.getPrioritizedDriftResults(
  oldSnapshot,
  newSnapshot
);

// Handle critical issues first
const critical = prioritizedResults.filter(
  r => r.priorityScore?.recommendation === "critical"
);

for (const result of critical) {
  console.log(`URGENT: ${result.filePath}`);
  console.log(`Breaking changes: ${result.impactAnalysis.breakingChanges}`);
}
```

## Advanced Configuration

### Custom Weights

Adjust scoring weights based on your team's priorities:

```typescript
const detector = new DriftDetector(projectPath);

// Emphasize change magnitude and usage frequency
detector.setCustomWeights({
  changeMagnitude: 0.35,    // Increased from 0.25
  usageFrequency: 0.30,     // Increased from 0.25
  codeComplexity: 0.15,     // Decreased from 0.20
  documentationCoverage: 0.10,
  staleness: 0.08,
  userFeedback: 0.02,
});
```

**Note**: Weights are applied as-is in the weighted sum calculation. The default weights sum to 1.0, but custom weights don't need to. Partial updates merge with defaults.

### Usage Metadata

Provide actual usage metrics for more accurate scoring:

```typescript
import { UsageMetadata } from "./utils/drift-detector.js";

const usageMetadata: UsageMetadata = {
  filePath: "/src/api/auth.ts",
  functionCalls: new Map([
    ["authenticate", 1500],  // Called 1500 times
    ["validateToken", 800],
  ]),
  classInstantiations: new Map([
    ["AuthManager", 50],
  ]),
  imports: new Map([
    ["authenticate", 25],    // Imported by 25 files
  ]),
};

const results = await detector.detectDriftWithPriority(
  oldSnapshot,
  newSnapshot,
  usageMetadata
);
```

## Integration Examples

### CI/CD Pipeline

Fail builds for critical drift:

```typescript
const results = await detector.getPrioritizedDriftResults(
  oldSnapshot,
  newSnapshot
);

const criticalCount = results.filter(
  r => r.priorityScore?.recommendation === "critical"
).length;

if (criticalCount > 0) {
  console.error(`❌ ${criticalCount} critical documentation drift issues`);
  process.exit(1);
}
```

### Task Management Integration

Export to GitHub Issues or Jira:

```typescript
for (const result of prioritizedResults) {
  const score = result.priorityScore;
  
  await createIssue({
    title: `[${score.recommendation.toUpperCase()}] Update docs for ${result.filePath}`,
    body: `
## Priority Score: ${score.overall}/100

${score.suggestedAction}

### Factors:
- Code Complexity: ${score.factors.codeComplexity}
- Usage Frequency: ${score.factors.usageFrequency}
- Change Magnitude: ${score.factors.changeMagnitude}
- Coverage: ${score.factors.documentationCoverage}
- Staleness: ${score.factors.staleness}

### Impact:
- Breaking: ${result.impactAnalysis.breakingChanges}
- Major: ${result.impactAnalysis.majorChanges}
- Minor: ${result.impactAnalysis.minorChanges}
    `.trim(),
    labels: [score.recommendation, "documentation", "drift"],
    priority: score.recommendation,
  });
}
```

### Dashboard Visualization

Group by priority level:

```typescript
const byPriority = {
  critical: results.filter(r => r.priorityScore?.recommendation === "critical"),
  high: results.filter(r => r.priorityScore?.recommendation === "high"),
  medium: results.filter(r => r.priorityScore?.recommendation === "medium"),
  low: results.filter(r => r.priorityScore?.recommendation === "low"),
};

console.log(`
📊 Documentation Drift Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Critical: ${byPriority.critical.length} (update immediately)
🟠 High:     ${byPriority.high.length} (update within 1 day)
🟡 Medium:   ${byPriority.medium.length} (update within 1 week)
🟢 Low:      ${byPriority.low.length} (update when convenient)
`);
```

## Best Practices

### 1. Regular Scanning

Run drift detection regularly to catch issues early:

```bash
# Daily CI job
npm run drift:detect --priority-threshold=high
```

### 2. Triage Workflow

1. **Critical (immediate)**: Assign to on-call developer
2. **High (1 day)**: Add to current sprint
3. **Medium (1 week)**: Add to backlog
4. **Low (when convenient)**: Batch with other low-priority updates

### 3. Custom Weights by Project

Different projects have different priorities:

**API Library**:
- High weight on usage frequency (30%)
- High weight on breaking changes (30%)

**Internal Tool**:
- Lower weight on usage frequency (15%)
- Higher weight on complexity (25%)

### 4. Monitor Trends

Track priority scores over time:

```typescript
// Store scores in time series database
const metrics = {
  timestamp: new Date(),
  criticalCount: byPriority.critical.length,
  averageScore: results.reduce((sum, r) => sum + r.priorityScore.overall, 0) / results.length,
  totalDrift: results.length,
};

await metricsDB.insert(metrics);
```

## Troubleshooting

### Scores Seem Too High/Low

**Problem**: All drift scores high priority, or all low priority.

**Solutions**:
1. Adjust custom weights for your context
2. Verify snapshot data is accurate
3. Check if usage metadata is available
4. Review complexity calculations

### Missing Documentation Dominates

**Problem**: Missing docs always score 90, drowning out other issues.

**Solutions**:
1. Lower documentationCoverage weight
2. Focus on documented code first
3. Use filters: `results.filter(r => r.impactAnalysis.affectedDocFiles.length > 0)`

### Breaking Changes Not Prioritized

**Problem**: Breaking changes should be critical but aren't.

**Solutions**:
1. Increase changeMagnitude weight
2. Verify impact analysis is detecting breaking changes correctly
3. Check if other factors (low complexity, no docs) are pulling down score

## Related Documentation

- [Drift Detection System](./repository-analysis.md#drift-detection)
- [AST-Based Analysis](../explanation/ast-analysis.md)
- [CI/CD Integration](./github-pages-deployment.md)

## API Reference

See [DriftDetector API Reference](../reference/drift-detector.md) for complete method documentation.
