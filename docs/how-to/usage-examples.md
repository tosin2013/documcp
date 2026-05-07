---
documcp:
last_updated: "2025-11-20T00:46:21.957Z"
last_validated: "2025-12-09T19:41:38.587Z"
auto_updated: false
update_frequency: monthly
validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# DocuMCP Usage Examples

This guide provides comprehensive usage examples for DocuMCP functions, organized by common use cases and scenarios.

## 📚 Related Documentation

- [Prompting Guide](./prompting-guide.md)
- [Repository Analysis Guide](./repository-analysis.md)
- [GitHub Markdown Guide](https://www.markdownguide.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## 🎯 Repository Analysis Examples

For detailed repository analysis concepts, see the [Repository Analysis Guide](./repository-analysis.md).

### Basic Repository Analysis

```typescript
import { analyzeRepository } from "./dist/tools/analyze-repository.js";

// Analyze a simple project
const analysis = await analyzeRepository({
  path: "/path/to/my-project",
  depth: "standard",
});

console.log(`Found ${analysis.data.structure.totalFiles} files`);
console.log(
  `Primary language: ${analysis.data.recommendations.primaryLanguage}`,
);
```

### Advanced Repository Analysis

```typescript
// Deep analysis with historical context
const deepAnalysis = await analyzeRepository({
  path: "/path/to/complex-project",
  depth: "deep",
});

// Access detailed information
const { structure, dependencies, documentation } = deepAnalysis.data;

console.log(`Languages: ${Object.keys(structure.languages).join(", ")}`);
console.log(`Has tests: ${structure.hasTests}`);
console.log(`Has CI: ${structure.hasCI}`);
console.log(`Documentation complexity: ${documentation.estimatedComplexity}`);
```

## 🔧 SSG Recommendation Examples

Learn more about prompting and recommendations in the [Prompting Guide](./prompting-guide.md).

### Basic SSG Recommendation

```typescript
import { recommendSSG } from "./dist/tools/recommend-ssg.js";

// Get recommendation based on analysis
const recommendation = await recommendSSG({
  analysisId: "analysis_abc123_def456",
  userId: "developer123",
});

console.log(`Recommended SSG: ${recommendation.data.recommended}`);
console.log(`Confidence: ${recommendation.data.confidence * 100}%`);
console.log(`Reasoning: ${recommendation.data.reasoning.join(", ")}`);
```

### Personalized SSG Recommendation

```typescript
// With user preferences
const personalized = await recommendSSG({
  analysisId: "analysis_abc123_def456",
  userId: "developer123",
  preferences: {
    priority: "performance",
    ecosystem: "javascript",
  },
});

// Compare alternatives
recommendation.data.alternatives.forEach((alt) => {
  console.log(`${alt.name}: ${alt.score} (${alt.pros.join(", ")})`);
});
```

## 🚀 Deployment Examples

### Deploy to GitHub Pages

```typescript
import { deployPages } from "./dist/tools/deploy-pages.js";

const result = await deployPages({
  repository: "/path/to/project",
  ssg: "docusaurus",
  target: "github-pages",
});
```

### Deploy to Vercel

See the [Deploy to Vercel guide](./deploy-to-vercel.md) for the full workflow including secrets setup.

```typescript
const result = await deployPages({
  repository: "/path/to/project",
  ssg: "docusaurus",
  target: "vercel",
});
```

## Related

- [Prompting Guide](./prompting-guide.md) — how to phrase prompts effectively
- [Repository Analysis Guide](./repository-analysis.md) — understanding analysis results
- [Deploy to Vercel](./deploy-to-vercel.md) — full Vercel deployment walkthrough
- [Tutorials: First Deployment](../tutorials/first-deployment.md) — step-by-step guide
- [API Reference](../reference/api-overview.md) — complete tool documentation
- [Model Context Protocol](https://modelcontextprotocol.io/) — MCP specification
