---
id: 002-repository-analysis-engine
title: "ADR-002: Repository Analysis Engine Design"
sidebar_label: "ADR-002: Repository Analysis Engine Design"
sidebar_position: 2
documcp:
  last_updated: "2025-01-14T00:00:00.000Z"
  last_validated: "2025-01-14T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 577a312
---

# ADR-002: Multi-Layered Repository Analysis Engine Design

## Status

Accepted

## Context

DocuMCP needs to understand repository characteristics to make intelligent recommendations about static site generators and documentation structure. The analysis must go beyond simple file counting to provide deep insights into project complexity, language ecosystems, existing documentation patterns, and development practices.

Key requirements:

- Comprehensive project characterization
- Language ecosystem detection
- Documentation quality assessment
- Project complexity evaluation
- Performance optimization for large repositories
- Extensible architecture for new analysis types

## Decision

We will implement a multi-layered repository analysis engine that examines repositories from multiple perspectives to build comprehensive project profiles.

### Analysis Layers:

#### 1. File System Analysis Layer

- **Recursive directory traversal** with intelligent filtering
- **File categorization** by extension and content patterns
- **Metrics calculation**: file counts, lines of code, directory depth, size distributions
- **Ignore pattern handling**: .gitignore, common build artifacts, node_modules

#### 2. Language Ecosystem Analysis Layer

- **Package manager detection**: package.json, requirements.txt, Cargo.toml, go.mod, etc.
- **Dependency analysis**: direct and transitive dependencies
- **Build tool identification**: webpack, vite, gradle, maven, cargo, etc.
- **Version constraint analysis**: compatibility requirements

#### 3. Content Analysis Layer

- **Documentation quality assessment**: README analysis, existing docs
- **Code comment analysis**: inline documentation patterns
- **API surface detection**: public interfaces, exported functions
- **Content gap identification**: missing documentation areas

#### 4. Project Metadata Analysis Layer

- **Git history patterns**: commit frequency, contributor activity
- **Release management**: tagging patterns, version schemes
- **Issue tracking**: GitHub issues, project management indicators
- **Community engagement**: contributor count, activity patterns

#### 5. Complexity Assessment Layer

- **Architectural complexity**: microservices, modular design patterns
- **Technical complexity**: multi-language projects, advanced configurations
- **Maintenance indicators**: test coverage, CI/CD presence, code quality metrics
- **Documentation sophistication needs**: API complexity, user journey complexity

## Alternatives Considered

### Single-Pass Analysis

- **Pros**: Simpler implementation, faster for small repositories
- **Cons**: Limited depth, cannot build sophisticated project profiles
- **Decision**: Rejected due to insufficient intelligence for quality recommendations

### External Tool Integration (e.g., GitHub API, CodeClimate)

- **Pros**: Rich metadata, established metrics
- **Cons**: External dependencies, rate limiting, requires authentication
- **Decision**: Rejected for core analysis; may integrate as optional enhancement

### Machine Learning-Based Analysis

- **Pros**: Could learn patterns from successful documentation projects
- **Cons**: Training data requirements, model maintenance, unpredictable results
- **Decision**: Deferred to future versions; start with rule-based analysis

### Database-Backed Caching

- **Pros**: Faster repeat analysis, could store learning patterns
- **Cons**: Deployment complexity, staleness issues, synchronization problems
- **Decision**: Rejected for initial version; implement in-memory caching only

## Consequences

### Positive

- **Intelligent Recommendations**: Deep analysis enables sophisticated SSG matching
- **Extensible Architecture**: Easy to add new analysis dimensions
- **Performance Optimization**: Layered approach allows selective analysis depth
- **Quality Assessment**: Can identify and improve existing documentation
- **Future-Proof**: Architecture supports ML integration and advanced analytics

### Negative

- **Analysis Time**: Comprehensive analysis may be slower for large repositories
- **Complexity**: Multi-layered architecture requires careful coordination
- **Memory Usage**: Full repository analysis requires significant memory for large projects

### Risks and Mitigations

- **Performance**: Implement streaming analysis and configurable depth limits
- **Accuracy**: Validate analysis results against known project types
- **Maintenance**: Regular testing against diverse repository types

## Implementation Details

### Analysis Engine Structure

```typescript
interface RepositoryAnalysis {
  fileSystem: FileSystemAnalysis;
  languageEcosystem: LanguageEcosystemAnalysis;
  content: ContentAnalysis;
  metadata: ProjectMetadataAnalysis;
  complexity: ComplexityAssessment;
}

interface AnalysisLayer {
  analyze(repositoryPath: string): Promise<LayerResult>;
  getMetrics(): AnalysisMetrics;
  validate(): ValidationResult;
}
```

### Performance Optimizations

- **Parallel Analysis**: Independent layers run concurrently
- **Intelligent Filtering**: Skip irrelevant files and directories early
- **Progressive Analysis**: Start with lightweight analysis, deepen as needed
- **Caching Strategy**: Cache analysis results within session scope
- **Size Limits**: Configurable limits for very large repositories

### File Pattern Recognition

```typescript
const FILE_PATTERNS = {
  documentation: [".md", ".rst", ".adoc", "docs/", "documentation/"],
  configuration: ["config/", ".config/", "*.json", "*.yaml", "*.toml"],
  source: ["src/", "lib/", "*.js", "*.ts", "*.py", "*.go", "*.rs"],
  tests: ["test/", "tests/", "__tests__/", "*.test.*", "*.spec.*"],
  build: ["build/", "dist/", "target/", "bin/", "*.lock"],
};
```

### Language Ecosystem Detection

```typescript
const ECOSYSTEM_INDICATORS = {
  javascript: ["package.json", "node_modules/", "yarn.lock", "pnpm-lock.yaml"],
  python: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile"],
  rust: ["Cargo.toml", "Cargo.lock", "src/main.rs"],
  go: ["go.mod", "go.sum", "main.go"],
  java: ["pom.xml", "build.gradle", "gradlew"],
};
```

### Complexity Scoring Algorithm

```typescript
interface ComplexityFactors {
  fileCount: number;
  languageCount: number;
  dependencyCount: number;
  directoryDepth: number;
  contributorCount: number;
  apiSurfaceSize: number;
}

function calculateComplexityScore(factors: ComplexityFactors): ComplexityScore {
  // Weighted scoring algorithm balancing multiple factors
  // Returns: 'simple' | 'moderate' | 'complex' | 'enterprise'
}
```

## Quality Assurance

### Testing Strategy

- **Unit Tests**: Each analysis layer tested independently
- **Integration Tests**: Full analysis pipeline validation
- **Repository Fixtures**: Test suite with diverse project types
- **Performance Tests**: Analysis time benchmarks for various repository sizes
- **Accuracy Validation**: Manual verification against known project characteristics

### Monitoring and Metrics

- Analysis execution time by repository size
- Accuracy of complexity assessments
- Cache hit rates and memory usage
- Error rates and failure modes

## Future Enhancements

### Machine Learning Integration

- Pattern recognition for project types
- Automated documentation quality scoring
- Predictive analysis for maintenance needs

### Advanced Analytics

- Historical trend analysis
- Comparative analysis across similar projects
- Community best practice identification

### Performance Optimizations

- WebAssembly modules for intensive analysis
- Distributed analysis for very large repositories
- Incremental analysis for updated repositories

## Security Considerations

- **File System Access**: Restricted to repository boundaries
- **Content Scanning**: No sensitive data extraction or storage
- **Resource Limits**: Prevent resource exhaustion attacks
- **Input Validation**: Sanitize all repository paths and content

## Implementation Status

**Status**: ✅ Implemented (2025-12-12)

**Implementation Files**:

- `src/tools/analyze-repository.ts` - Main repository analysis tool
- `src/utils/code-scanner.ts` - Code scanning and analysis utilities
- `src/memory/knowledge-graph.ts` - Knowledge graph integration for storing analysis results

**Key Features Implemented**:

- ✅ Multi-layered analysis (file system, language ecosystem, content, metadata, complexity)
- ✅ Dependency detection and analysis
- ✅ Documentation quality assessment
- ✅ Project complexity evaluation
- ✅ Knowledge graph integration for historical tracking
- ✅ Progress reporting and context-aware analysis

**Validation**: The implementation has been validated against the architectural design and is actively used by other tools (SSG recommendation, content population, drift detection).

## References

- [Git Repository Analysis Best Practices](https://git-scm.com/docs)
- [Static Analysis Tools Comparison](https://analysis-tools.dev/)
- [Repository Metrics Standards](https://chaoss.community/)
- Commit: 577a312 - feat: Extend knowledge graph with documentation example entities (#78)
- GitHub Issue: #77 - Knowledge graph extensions (referenced in commit)
- GitHub Issue: #78 - Extend knowledge graph with documentation example entities
