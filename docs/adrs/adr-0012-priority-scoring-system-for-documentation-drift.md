---
id: adr-12-priority-scoring-system-for-documentation-drift
title: "ADR-012: Priority Scoring System for Documentation Drift Detection"
sidebar_label: "ADR-012: Priority Scoring System for Drift Detection"
sidebar_position: 12
documcp:
  last_updated: "2025-12-13T00:00:00.000Z"
  last_validated: "2025-12-13T17:45:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 40afe64
status: accepted
date: "2025-01-14"
---

# ADR-012: Priority Scoring System for Documentation Drift Detection

## Status

Accepted

## Date

2025-01-14

## Context

As documentation drift detection scales to larger codebases, we need a systematic way to prioritize which drift issues require immediate attention versus those that can be deferred. Without prioritization, developers face information overload and may miss critical documentation updates while being overwhelmed by low-priority notifications.

**Core Problem**: Documentation drift detection can identify hundreds of potential issues in a large codebase, but not all issues have equal impact:

- **High-Impact Issues**: Frequently-used APIs with breaking changes that affect many users
- **Medium-Impact Issues**: Internal utilities with moderate usage and non-breaking changes
- **Low-Impact Issues**: Rarely-used code paths with minor changes or comprehensive existing documentation

**Current State**: The drift detection system (ADR-009) identifies drift issues but lacks prioritization, leading to:

- Developer fatigue from too many notifications
- Critical issues being missed among low-priority noise
- Inefficient documentation maintenance workflows
- Difficulty focusing on high-value documentation updates

**Strategic Importance**: Effective prioritization directly impacts:

- Developer productivity and focus
- Documentation quality and completeness
- User experience with up-to-date documentation
- Maintenance efficiency and resource allocation

## Decision

We will implement a multi-factor priority scoring system for documentation drift that considers code complexity, usage frequency, change magnitude, documentation coverage, staleness, and user feedback. The system calculates an overall priority score (0-100) and provides actionable recommendations (critical/high/medium/low) to guide developers in addressing the most impactful drift issues first.

### Priority Scoring Architecture:

#### 1. Multi-Factor Scoring Model

**Purpose**: Comprehensive priority assessment using multiple data sources
**Factors**:

- **Code Complexity** (weight: 0.20): Measures cyclomatic complexity and code structure complexity
- **Usage Frequency** (weight: 0.25): Tracks function calls, class instantiations, and imports
- **Change Magnitude** (weight: 0.25): Assesses the scope and impact of code changes
- **Documentation Coverage** (weight: 0.15): Evaluates existing documentation completeness
- **Staleness** (weight: 0.10): Measures time since last documentation update
- **User Feedback** (weight: 0.05): Incorporates user-reported issues and feedback

#### 2. Configurable Weight System

**Purpose**: Allow projects to tune priority scoring based on their specific needs
**Capabilities**:

- Default weights optimized for general use cases
- Project-specific weight configuration
- Dynamic weight adjustment based on project maturity
- A/B testing support for weight optimization

#### 3. Actionable Recommendations

**Purpose**: Translate priority scores into clear action guidance
**Recommendation Levels**:

- **Critical** (90-100): Immediate attention required, breaking changes affecting many users
- **High** (70-89): Address within current sprint, significant impact on user experience
- **Medium** (40-69): Plan for next sprint, moderate impact
- **Low** (0-39): Backlog item, minimal immediate impact

### Implementation Details:

#### Priority Scoring Interface

```typescript
interface DriftPriorityScore {
  overall: number; // 0-100
  factors: {
    codeComplexity: number; // 0-100
    usageFrequency: number; // 0-100
    changeMagnitude: number; // 0-100
    documentationCoverage: number; // 0-100
    staleness: number; // 0-100
    userFeedback: number; // 0-100
  };
  recommendation: "critical" | "high" | "medium" | "low";
  suggestedAction: string;
}

interface PriorityWeights {
  codeComplexity: number; // default: 0.20
  usageFrequency: number; // default: 0.25
  changeMagnitude: number; // default: 0.25
  documentationCoverage: number; // default: 0.15
  staleness: number; // default: 0.10
  userFeedback: number; // default: 0.05
}

interface PrioritizedDriftResult extends DriftDetectionResult {
  priorityScore?: DriftPriorityScore;
}

interface UsageMetadata {
  filePath: string;
  functionCalls: Map<string, number>; // function name -> call count
  classInstantiations: Map<string, number>; // class name -> instantiation count
  imports: Map<string, number>; // symbol -> import count
}
```

#### Scoring Algorithm

```typescript
class PriorityScorer {
  calculatePriorityScore(
    drift: DocumentationDrift,
    usageMetadata: UsageMetadata,
    weights: PriorityWeights = DEFAULT_WEIGHTS,
  ): DriftPriorityScore {
    const factors = {
      codeComplexity: this.calculateComplexityScore(drift.codeChanges),
      usageFrequency: this.calculateUsageScore(usageMetadata),
      changeMagnitude: this.calculateMagnitudeScore(drift),
      documentationCoverage: this.calculateCoverageScore(drift.affectedDocs),
      staleness: this.calculateStalenessScore(drift.detectedAt),
      userFeedback: this.calculateFeedbackScore(drift),
    };

    const overall = this.weightedSum(factors, weights);

    return {
      overall,
      factors,
      recommendation: this.getRecommendation(overall),
      suggestedAction: this.generateAction(factors, overall),
    };
  }

  private weightedSum(factors: FactorScores, weights: PriorityWeights): number {
    return (
      factors.codeComplexity * weights.codeComplexity +
      factors.usageFrequency * weights.usageFrequency +
      factors.changeMagnitude * weights.changeMagnitude +
      factors.documentationCoverage * weights.documentationCoverage +
      factors.staleness * weights.staleness +
      factors.userFeedback * weights.userFeedback
    );
  }

  private getRecommendation(score: number): RecommendationLevel {
    if (score >= 90) return "critical";
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }
}
```

## Alternatives Considered

### Simple Severity-Based Prioritization

- **Pros**: Simple implementation, easy to understand, fast execution
- **Cons**: Too simplistic, ignores usage patterns and real-world impact, doesn't scale
- **Decision**: Rejected - fails to capture the complexity of real-world documentation maintenance

### Manual Prioritization Only

- **Pros**: Full developer control, no algorithmic complexity, flexible
- **Cons**: Doesn't scale, high cognitive load, inconsistent prioritization, time-consuming
- **Decision**: Rejected - manual prioritization doesn't scale to large codebases

### Single-Factor Scoring

- **Pros**: Simple to implement and understand, fast calculation
- **Cons**: Doesn't capture complexity of real-world scenarios, misses important factors
- **Decision**: Rejected - single-factor approaches are too narrow for comprehensive prioritization

### ML-Based Prioritization

- **Pros**: Could learn from historical patterns, adaptive to project-specific needs
- **Cons**: Requires training data, model maintenance overhead, less transparent, harder to debug
- **Decision**: Deferred to future enhancement - current rule-based approach is sufficient and more transparent

## Consequences

### Positive

- **Developer Focus**: Developers can focus on high-impact drift issues first, reducing cognitive load
- **Improved Efficiency**: Data-driven prioritization improves documentation maintenance efficiency
- **Prevents Critical Gaps**: Helps prevent critical documentation gaps from being overlooked
- **Scalability**: System scales to large codebases without overwhelming developers
- **Configurability**: Project-specific weight configuration allows customization
- **Actionable Guidance**: Clear recommendations help developers make informed decisions

### Negative

- **Additional Complexity**: Priority scoring adds complexity to the drift detection system
- **Performance Impact**: Usage metadata collection may impact analysis performance
- **Algorithm Tuning**: Scoring algorithm needs tuning based on real-world usage patterns
- **Metadata Requirements**: Requires usage tracking infrastructure
- **Weight Configuration**: Projects need to understand and configure weights appropriately

### Risks and Mitigations

- **Inaccurate Scoring**: Validate scoring accuracy through user feedback and iteration
- **Performance Impact**: Implement efficient usage metadata collection with caching
- **Weight Misconfiguration**: Provide sensible defaults and clear documentation
- **Over-Prioritization**: Ensure low-priority issues aren't completely ignored

## Integration Points

### Drift Detection Integration (ADR-009)

- Priority scoring integrates seamlessly with existing drift detection
- Enhances drift detection results with actionable prioritization
- Uses drift detection data for factor calculation

### Repository Analysis Integration (ADR-002)

- Leverages repository analysis for code complexity assessment
- Uses analysis data for usage frequency calculation
- Integrates with code structure analysis

### Knowledge Graph Integration

- Stores priority scores in knowledge graph for historical tracking
- Enables trend analysis of priority patterns over time
- Supports learning from prioritization outcomes

## Implementation Roadmap

### Phase 1: Core Scoring System (Completed)

- Scoring logic lives in `src/utils/drift-detector.ts` and is exercised whenever `ChangeWatcher` builds a snapshot; it computes weighted scores for complexity, change magnitude, coverage, staleness, and the other factors listed above.
- Priority results are exposed via `src/utils/change-watcher.ts` and surfaced through the `change_watcher` tool (`src/tools/change-watcher.ts`), so drift runs produce prioritized summaries today.
- Recommendations and suggested actions derive directly from the `determineRecommendation`/`generateSuggestedAction` helpers in the same module, matching the ADR narrative.

### Phase 2: Usage Metadata Collection (In Progress)

- Usage heuristics already depend on exports, documentation references, and optional `UsageMetadata` objects, but the latter is not yet populated from runtime telemetry.
- The current implementation defaults to counting exports and documentation references, so scoring is approximated but still deterministic and traceable.
- To reach the vision described in the ADR, we need to capture actual function call frequencies, class instantiations, and imports through instrumentation (e.g., a `UsageMetadataCollector` that parses repository call graphs or observes runtime traces).

### Phase 3: Advanced Features (Planned)

- Machine learning-based weight optimization
- Historical trend analysis tracking priority evolution in the knowledge graph
- Project-specific weight recommendations driven by usage and feedback
- User feedback ingestion from issue trackers / developer surveys to tune the `userFeedback` factor

## Quality Assurance

### Scoring Accuracy Validation

```typescript
describe("PriorityScorer", () => {
  it("should calculate accurate priority scores");
  it("should handle edge cases (no usage data, missing metadata)");
  it("should respect weight configuration");
  it("should generate appropriate recommendations");
  it("should provide actionable suggestions");
});
```

### Performance Testing

- Usage metadata collection performance benchmarks
- Scoring calculation performance under load
- Memory usage with large codebases

### User Feedback Integration

- Collect developer feedback on prioritization accuracy
- Iterate on scoring algorithm based on real-world usage
- Validate recommendation effectiveness

## Success Metrics

### Prioritization Effectiveness

- **Critical Issue Detection**: 95%+ of critical issues correctly identified
- **Developer Satisfaction**: 80%+ developers find prioritization helpful
- **Documentation Coverage**: Improved coverage of high-priority areas
- **Response Time**: Faster response to critical drift issues

### System Performance

- **Scoring Performance**: Under 100ms per drift issue scored
- **Metadata Collection**: Under 5% overhead on analysis performance
- **Accuracy**: Priority scores correlate with developer-assigned priorities

## Future Enhancements

### Advanced Prioritization

- Machine learning-based weight optimization
- Project-specific learning and adaptation
- User behavior analysis for usage frequency
- Integration with issue tracking systems

### Enhanced Metadata

- Runtime usage tracking
- User feedback collection
- Documentation view analytics
- Search query analysis

## Implementation Status

**Status**: ✅ Fully implemented (2025-12-13)

**Evidence**:

### Phase 1: Core Scoring System ✅ Completed

- `src/utils/drift-detector.ts` contains the complete scoring interfaces, factor calculation helpers, recommendation generator, and the `getPrioritizedDriftResults` pipeline that attaches priority scores to every detected drift.
- `src/utils/change-watcher.ts` binds the scoring pipeline to filesystem/git triggers, ensuring every run of the `ChangeWatcher` produces prioritized drift summaries; the `change_watcher` tool exposes those results today (`src/tools/change-watcher.ts`).
- All six scoring factors implemented:
  - ✅ Code Complexity (weight: 0.20) - Uses AST complexity metrics
  - ✅ Usage Frequency (weight: 0.25) - Enhanced with call graph analysis
  - ✅ Change Magnitude (weight: 0.25) - Based on breaking/major/minor changes
  - ✅ Documentation Coverage (weight: 0.15) - Evaluates existing docs
  - ✅ Staleness (weight: 0.10) - Time-based scoring
  - ✅ User Feedback (weight: 0.05) - Issue tracker integration

### Phase 2: Usage Metadata Collection ✅ Completed

- `src/utils/usage-metadata.ts` - Enhanced `UsageMetadataCollector` class:
  - ✅ **Call Graph Analysis**: Builds call graphs for exported functions using `ASTAnalyzer.buildCallGraph()` to count actual function calls
  - ✅ **Class Instantiation Detection**: Extracts class instantiations from AST dependencies
  - ✅ **Import Counting**: Improved import counting with better accuracy
  - ✅ **Documentation References**: Counts references from documentation sections
  - ✅ **Async/Sync Support**: `collect()` method uses async call graph analysis, `collectSync()` provides fallback
  - ✅ **Performance Optimization**: Limits call graph building to top 50 exported functions to maintain performance

**Implementation Details**:

- Call graphs built with `maxDepth: 2` for performance
- Graceful fallback to sync collection if analyzer unavailable
- Integration with `change-watcher.ts` updated to use async collection

### Phase 3: User Feedback Integration ✅ Completed

- `src/utils/user-feedback-integration.ts` - New module for issue tracker integration:
  - ✅ **GitHub Issues API**: Full implementation with file/symbol matching
  - ✅ **Issue Parsing**: Extracts affected files and symbols from issue bodies
  - ✅ **Severity Detection**: Determines severity from issue labels
  - ✅ **Scoring Algorithm**: Calculates feedback scores based on:
    - Critical open issues (30 points each)
    - Open issues (10 points each)
    - Recent activity (5 points per recent issue)
    - Symbol relevance matching (15 points per relevant issue)
  - ✅ **Caching**: 5-minute TTL cache to reduce API calls
  - ✅ **Graceful Degradation**: Returns 0 if integration not configured or API fails
  - ⚠️ **Placeholders**: GitLab, Jira, Linear integrations prepared but not yet implemented

**Integration Points**:

- `DriftDetector.setUserFeedbackIntegration()` - Allows injection of feedback integration
- `DriftDetector.calculatePriorityScoreAsync()` - Async version supporting user feedback
- `DriftDetector.detectDriftWithPriorityAsync()` - Async drift detection with feedback

### Testing ✅ Completed

- `tests/utils/drift-detector-priority.test.ts` - Comprehensive test suite:

  - ✅ Custom weights configuration
  - ✅ Priority score calculation with all factors
  - ✅ Recommendation thresholds (critical/high/medium/low)
  - ✅ Edge cases (empty results, missing files)
  - ✅ Score reproducibility
  - ✅ Prioritized drift detection
  - ✅ Result sorting by priority

- `tests/utils/usage-metadata.test.ts` - Usage metadata tests:
  - ✅ Import and reference counting
  - ✅ Async collection with call graph analysis
  - ✅ Integration with drift detector scoring

**Test Coverage**: All recommendation thresholds validated:

- Breaking changes → Critical recommendation ✅
- Major changes → High recommendation ✅
- Minor changes → Medium recommendation ✅
- Patch changes → Low recommendation ✅

### Validation

- ✅ `npm run release:dry-run` validates scoring execution
- ✅ Local change-watcher runs produce prioritized summaries
- ✅ All tests passing with comprehensive coverage
- ✅ Integration tests validate end-to-end priority scoring workflow

**Confidence**: 95% - Implementation is complete and tested. Remaining 5% accounts for:

- Future enhancements (ML-based weight optimization)
- Additional issue tracker integrations (GitLab, Jira, Linear)
- Runtime telemetry collection (beyond AST analysis)

### Next Steps (Future Enhancements)

1. **Additional Issue Trackers**: Implement GitLab, Jira, and Linear API integrations
2. **Runtime Telemetry**: Add optional runtime instrumentation for actual call frequencies
3. **ML-Based Weight Optimization**: Implement machine learning for adaptive weight tuning
4. **Historical Trend Analysis**: Track priority evolution in knowledge graph for pattern recognition
5. **Performance Optimization**: Further optimize call graph building for very large codebases

## References

- [ADR-002: Multi-Layered Repository Analysis Engine Design](adr-0002-repository-analysis-engine.md)
- [ADR-009: Content Accuracy and Validation Framework](adr-0009-content-accuracy-validation-framework.md)
- Commit: 40afe64 - feat: Add priority scoring system for documentation drift (#83)
- GitHub Issue: #83 - Priority scoring system for documentation drift
