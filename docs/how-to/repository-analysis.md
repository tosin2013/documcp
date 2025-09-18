# How to Analyze Your Repository with DocuMCP

This guide walks you through using DocuMCP's repository analysis capabilities to understand your project's documentation needs.

## What Repository Analysis Provides

DocuMCP's analysis examines your project from multiple perspectives:

- **Project Structure**: File organization, language distribution, directory structure
- **Dependencies**: Package ecosystems, frameworks, and libraries in use
- **Documentation Status**: Existing documentation files, README quality, coverage gaps
- **Complexity Assessment**: Project size, team size estimates, maintenance requirements
- **Recommendations**: Tailored suggestions based on your project characteristics

## Basic Analysis

### Simple Analysis Request

```
analyze my repository
```

This performs a standard-depth analysis covering all key aspects of your project.

### Specify Analysis Depth

```
analyze my repository with deep analysis
```

Available depth levels:

- **quick**: Fast overview focusing on basic structure and languages
- **standard**: Comprehensive analysis including dependencies and documentation (recommended)
- **deep**: Detailed analysis with advanced insights and recommendations

## Understanding Analysis Results

### Project Structure Section

```json
{
  "structure": {
    "totalFiles": 2034,
    "totalDirectories": 87,
    "languages": {
      ".ts": 86,
      ".js": 13,
      ".css": 3,
      ".html": 37
    },
    "hasTests": true,
    "hasCI": true,
    "hasDocs": true
  }
}
```

This tells you:

- Scale of your project (file/directory count)
- Primary programming languages
- Presence of tests, CI/CD, and existing documentation

### Dependencies Analysis

```json
{
  "dependencies": {
    "ecosystem": "javascript",
    "packages": ["@modelcontextprotocol/sdk", "zod", "typescript"],
    "devPackages": ["jest", "@types/node", "eslint"]
  }
}
```

This reveals:

- Primary package ecosystem (npm, pip, cargo, etc.)
- Key runtime dependencies
- Development and tooling dependencies

### Documentation Assessment

```json
{
  "documentation": {
    "hasReadme": true,
    "hasContributing": true,
    "hasLicense": true,
    "existingDocs": ["README.md", "docs/api.md"],
    "estimatedComplexity": "complex"
  }
}
```

This shows:

- Presence of essential documentation files
- Existing documentation structure
- Complexity level for documentation planning

## Advanced Analysis Techniques

### Target Specific Directories

```
analyze the src directory for API documentation needs
```

### Focus on Documentation Gaps

```
what documentation is missing from my project?
```

### Analyze for Specific Use Cases

```
analyze my repository to determine if it needs user guides or developer documentation
```

## Using Analysis Results

### For SSG Selection

After analysis, use the results to get targeted recommendations:

```
based on the analysis, what static site generator works best for my TypeScript project?
```

### For Documentation Planning

Use analysis insights to plan your documentation structure:

```
given my project complexity, how should I organize my documentation?
```

### For Deployment Strategy

Let analysis guide your deployment approach:

```
considering my project setup, what's the best way to deploy documentation?
```

## Analysis-Driven Workflows

### Complete Documentation Setup

1. **Analyze**: `analyze my repository for documentation needs`
2. **Plan**: Use analysis results to understand project characteristics
3. **Recommend**: `recommend documentation tools based on the analysis`
4. **Implement**: `set up documentation based on the recommendations`

### Documentation Audit

1. **Current State**: `analyze my existing documentation structure`
2. **Gap Analysis**: `what documentation gaps exist in my project?`
3. **Improvement Plan**: `how can I improve my current documentation?`

### Migration Planning

1. **Legacy Analysis**: `analyze my project's current documentation approach`
2. **Modern Approach**: `what modern documentation tools would work better?`
3. **Migration Strategy**: `how should I migrate from my current setup?`

## Interpreting Recommendations

### Project Type Classification

Analysis categorizes your project as:

- **library**: Reusable code packages requiring API documentation
- **application**: End-user software needing user guides and tutorials
- **tool**: Command-line or developer tools requiring usage documentation

### Team Size Estimation

- **small**: 1-3 developers, favor simple solutions
- **medium**: 4-10 developers, need collaborative features
- **large**: 10+ developers, require enterprise-grade solutions

### Complexity Assessment

- **simple**: Basic projects with minimal documentation needs
- **moderate**: Standard projects requiring structured documentation
- **complex**: Large projects needing comprehensive documentation strategies

## Common Analysis Patterns

### JavaScript/TypeScript Projects

Analysis typically reveals:

- npm ecosystem with extensive dev dependencies
- Need for API documentation (if library)
- Integration with existing build tools
- Recommendation: Often Docusaurus or VuePress

### Python Projects

Analysis usually shows:

- pip/poetry ecosystem
- Sphinx-compatible documentation needs
- Strong preference for MkDocs
- Integration with Python documentation standards

### Multi-Language Projects

Analysis identifies:

- Mixed ecosystems and dependencies
- Need for language-agnostic solutions
- Recommendation: Usually Hugo or Jekyll for flexibility

## Troubleshooting Analysis

### Incomplete Results

If analysis seems incomplete:

```
run deep analysis on my repository to get more detailed insights
```

### Focus on Specific Areas

If you need more details about certain aspects:

```
analyze my project's dependencies in detail
```

### Re-analyze After Changes

After making significant changes:

```
re-analyze my repository to see updated recommendations
```

## Analysis Memory and Caching

DocuMCP stores analysis results for reference in future operations:

- Analysis IDs are provided for referencing specific analyses
- Results remain accessible throughout your session
- Memory system learns from successful documentation deployments

Use analysis IDs in follow-up requests:

```
using analysis analysis_abc123, set up the recommended documentation structure
```

## Best Practices

1. **Start Fresh**: Begin new documentation projects with analysis
2. **Regular Reviews**: Re-analyze periodically as projects evolve
3. **Deep Dive When Needed**: Use deep analysis for complex projects
4. **Combine with Expertise**: Use analysis as a starting point, not final decision
5. **Iterate**: Refine based on analysis feedback and results

Analysis is the foundation of effective documentation planning with DocuMCP. Use it to make informed decisions about tools, structure, and deployment strategies.
