---
documcp:
  last_updated: "2025-11-20T00:46:21.957Z"
  last_validated: "2025-11-20T00:46:21.957Z"
  auto_updated: false
  update_frequency: monthly
---

# DocuMCP Usage Examples

This guide provides comprehensive usage examples for DocuMCP functions, organized by common use cases and scenarios.

## 🎯 Repository Analysis Examples

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

### Enterprise SSG Recommendation

```typescript
// Enterprise-focused recommendation
const enterprise = await recommendSSG({
  analysisId: "analysis_abc123_def456",
  userId: "enterprise_user",
  preferences: {
    priority: "simplicity",
    ecosystem: "any",
  },
});

// Check historical data
if (recommendation.data.historicalData) {
  const { similarProjectCount, successRates } =
    recommendation.data.historicalData;
  console.log(`Based on ${similarProjectCount} similar projects`);
  console.log(`Success rates: ${JSON.stringify(successRates, null, 2)}`);
}
```

## 📁 Documentation Structure Examples

### Basic Structure Setup

```typescript
import { setupStructure } from "./dist/tools/setup-structure.js";

// Set up Docusaurus structure with Diataxis framework
const structure = await setupStructure({
  path: "./docs",
  ssg: "docusaurus",
  includeExamples: true,
});

console.log(`Created ${structure.data.directoriesCreated.length} directories`);
console.log(`Created ${structure.data.filesCreated.length} files`);
console.log(
  `Diataxis structure: ${Object.keys(structure.data.diataxisStructure).join(
    ", ",
  )}`,
);
```

### Minimal Structure Setup

```typescript
// Minimal structure for existing projects
const minimal = await setupStructure({
  path: "./site",
  ssg: "hugo",
  includeExamples: false,
});

// Check what was created
minimal.data.directoriesCreated.forEach((dir) => {
  console.log(`Created directory: ${dir}`);
});
```

### Custom Structure Setup

```typescript
// Custom structure with specific categories
const custom = await setupStructure({
  path: "./custom-docs",
  ssg: "mkdocs",
  includeExamples: true,
});

// Access structure details
const { diataxisStructure, ssgSpecificFiles } = custom.data;
console.log(
  `Diataxis categories: ${Object.keys(diataxisStructure).join(", ")}`,
);
```

## ⚙️ Configuration Generation Examples

### Docusaurus Configuration

```typescript
import { generateConfig } from "documcp";

// Generate Docusaurus configuration
const config = await generateConfig({
  ssg: "docusaurus",
  projectName: "My Awesome Project",
  projectDescription: "A comprehensive documentation project",
  outputPath: "./docs",
});

console.log(`Generated ${config.data.filesCreated.length} configuration files`);
config.data.filesCreated.forEach((file) => {
  console.log(`Created: ${file}`);
});
```

### Hugo Configuration

```typescript
// Generate Hugo configuration
const hugoConfig = await generateConfig({
  ssg: "hugo",
  projectName: "My Hugo Site",
  outputPath: "./site",
});

// Check configuration details
const { ssg, projectName, filesCreated } = hugoConfig.data;
console.log(`Generated ${ssg} configuration for ${projectName}`);
```

### Multi-SSG Configuration

```typescript
// Generate configurations for multiple SSGs
const ssgs = ["docusaurus", "hugo", "mkdocs"];

for (const ssg of ssgs) {
  const config = await generateConfig({
    ssg: ssg as any,
    projectName: "Multi-SSG Project",
    outputPath: `./docs-${ssg}`,
  });

  console.log(
    `Generated ${ssg} configuration: ${config.data.filesCreated.length} files`,
  );
}
```

## 📝 Content Population Examples

### Basic Content Population

```typescript
import { handlePopulateDiataxisContent } from "documcp";

// Populate documentation content
const population = await handlePopulateDiataxisContent({
  analysisId: "analysis_abc123_def456",
  docsPath: "./docs",
  populationLevel: "comprehensive",
});

console.log(
  `Generated ${population.data.contentGenerated.length} content files`,
);
console.log(
  `Extracted ${population.data.contentExtracted.length} content pieces`,
);
```

### Focused Content Population

```typescript
// Populate with specific focus areas
const focused = await handlePopulateDiataxisContent({
  analysisId: "analysis_abc123_def456",
  docsPath: "./docs",
  populationLevel: "intelligent",
  focusAreas: ["api", "examples", "tutorials"],
});

// Check what was generated
focused.data.contentGenerated.forEach((content) => {
  console.log(`Generated: ${content.category}/${content.filename}`);
});
```

### Technology-Focused Population

```typescript
// Populate with technology focus
const techFocused = await handlePopulateDiataxisContent({
  analysisId: "analysis_abc123_def456",
  docsPath: "./docs",
  technologyFocus: ["React", "TypeScript", "Node.js"],
});

// Access generated content
techFocused.data.contentGenerated.forEach((content) => {
  if (content.technology) {
    console.log(
      `Technology-specific content: ${content.filename} (${content.technology})`,
    );
  }
});
```

## 🚀 Deployment Examples

### Basic GitHub Pages Deployment

```typescript
import { handleDeployPages } from "documcp";

// Deploy to GitHub Pages
const deployment = await handleDeployPages({
  repository: "user/repository",
  ssg: "docusaurus",
});

console.log(`Deployment URL: ${deployment.data.url}`);
console.log(`Status: ${deployment.data.status}`);
```

### Custom Domain Deployment

```typescript
// Deploy with custom domain
const customDomain = await handleDeployPages({
  repository: "user/repository",
  ssg: "docusaurus",
  customDomain: "docs.example.com",
});

// Check deployment details
const { url, status, configuration } = customDomain.data;
console.log(`Deployed to: ${url}`);
console.log(`Custom domain: ${configuration.customDomain}`);
```

### Branch-Specific Deployment

```typescript
// Deploy to specific branch
const branchDeployment = await handleDeployPages({
  repository: "user/repository",
  ssg: "docusaurus",
  branch: "gh-pages",
});

// Monitor deployment
if (branchDeployment.data.status === "success") {
  console.log(`Successfully deployed to ${branchDeployment.data.branch}`);
} else {
  console.log(`Deployment failed: ${branchDeployment.data.error}`);
}
```

## 🧠 Memory System Examples

### Memory Initialization

```typescript
import { initializeMemory } from "documcp/memory";

// Initialize memory system
const memory = await initializeMemory("./custom-memory-storage");

console.log("Memory system initialized");
console.log(`Storage directory: ${memory.storageDir}`);
```

### Storing Analysis Data

```typescript
import { rememberAnalysis } from "documcp/memory";

// Store analysis data
const memoryId = await rememberAnalysis("/path/to/project", {
  id: "analysis_123",
  structure: { totalFiles: 150, languages: { ".ts": 100 } },
  dependencies: { ecosystem: "javascript", packages: ["react"] },
});

console.log(`Stored analysis with ID: ${memoryId}`);
```

### Retrieving Project Insights

```typescript
import { getProjectInsights } from "documcp/memory";

// Get project insights
const insights = await getProjectInsights("project_abc123");

insights.forEach((insight) => {
  console.log(`💡 ${insight}`);
});
```

### Finding Similar Projects

```typescript
import { getSimilarProjects } from "documcp/memory";

// Find similar projects
const similar = await getSimilarProjects(analysisData, 5);

console.log(`Found ${similar.length} similar projects:`);
similar.forEach((project) => {
  console.log(
    `- ${project.metadata.projectId} (${project.similarity}% similar)`,
  );
});
```

## 📊 README Analysis Examples

### Basic README Analysis

```typescript
import { analyzeReadme } from "documcp";

// Analyze README
const analysis = await analyzeReadme({
  project_path: "/path/to/project",
});

const { analysis: readmeAnalysis } = analysis.data;
console.log(`README Score: ${readmeAnalysis.overallScore}/100`);
console.log(
  `Current length: ${readmeAnalysis.lengthAnalysis.currentLines} lines`,
);
console.log(
  `Target length: ${readmeAnalysis.lengthAnalysis.targetLines} lines`,
);
```

### Community-Focused Analysis

```typescript
// Analyze for community contributors
const communityAnalysis = await analyzeReadme({
  project_path: "/path/to/project",
  target_audience: "community_contributors",
  optimization_level: "moderate",
});

const { communityReadiness } = communityAnalysis.data.analysis;
console.log(`Has contributing guide: ${communityReadiness.hasContributing}`);
console.log(`Has code of conduct: ${communityReadiness.hasCodeOfConduct}`);
console.log(`Badge count: ${communityReadiness.badgeCount}`);
```

### Enterprise README Analysis

```typescript
// Analyze for enterprise users
const enterpriseAnalysis = await analyzeReadme({
  project_path: "/path/to/project",
  target_audience: "enterprise_users",
  optimization_level: "aggressive",
  max_length_target: 200,
});

const { optimizationOpportunities } = enterpriseAnalysis.data.analysis;
optimizationOpportunities.forEach((opportunity) => {
  console.log(
    `${opportunity.type}: ${opportunity.description} (${opportunity.priority})`,
  );
});
```

## 🔧 README Optimization Examples

### Basic README Optimization

```typescript
import { optimizeReadme } from "documcp";

// Optimize README
const optimization = await optimizeReadme({
  readme_path: "./README.md",
  strategy: "community_focused",
});

const { optimization: result } = optimization.data;
console.log(
  `Reduced from ${result.originalLength} to ${result.optimizedLength} lines`,
);
console.log(`Reduction: ${result.reductionPercentage}%`);
```

### Enterprise README Optimization

```typescript
// Optimize for enterprise
const enterpriseOptimization = await optimizeReadme({
  readme_path: "./README.md",
  strategy: "enterprise_focused",
  max_length: 200,
  preserve_existing: true,
});

// Check restructuring changes
enterpriseOptimization.data.optimization.restructuringChanges.forEach(
  (change) => {
    console.log(`${change.type}: ${change.section} - ${change.description}`);
  },
);
```

### README Template Generation

```typescript
import { generateReadmeTemplate } from "documcp";

// Generate README template
const template = await generateReadmeTemplate({
  projectName: "MyAwesomeProject",
  description: "A powerful utility library",
  templateType: "library",
  author: "Your Name",
  license: "MIT",
  includeBadges: true,
  outputPath: "./README.md",
});

console.log(`Generated ${template.metadata.estimatedLength} line README`);
console.log(`Sections included: ${template.metadata.sectionsIncluded}`);
```

## 🔗 Link Checking Examples

### Basic Link Checking

```typescript
import { checkDocumentationLinks } from "documcp";

// Check documentation links
const linkCheck = await checkDocumentationLinks({
  documentation_path: "./docs",
  check_external_links: true,
  check_internal_links: true,
  check_anchor_links: true,
});

console.log(`Total links checked: ${linkCheck.data.totalLinks}`);
console.log(`Broken links: ${linkCheck.data.brokenLinks}`);
console.log(`Success rate: ${linkCheck.data.successRate}%`);
```

### Comprehensive Link Checking

```typescript
// Comprehensive link checking
const comprehensive = await checkDocumentationLinks({
  documentation_path: "./docs",
  check_external_links: true,
  check_internal_links: true,
  check_anchor_links: true,
  timeout_ms: 10000,
  max_concurrent_checks: 10,
  fail_on_broken_links: false,
});

// Check specific link types
comprehensive.data.linkTypes.forEach((linkType) => {
  console.log(
    `${linkType.type}: ${linkType.total} total, ${linkType.broken} broken`,
  );
});
```

## 🧪 Local Testing Examples

### Local Documentation Testing

```typescript
import { handleTestLocalDeployment } from "documcp";

// Test local deployment
const test = await handleTestLocalDeployment({
  repositoryPath: "/path/to/project",
  ssg: "docusaurus",
  port: 3000,
  timeout: 60,
});

console.log(`Test status: ${test.data.status}`);
console.log(`Local URL: ${test.data.localUrl}`);
console.log(`Build time: ${test.data.buildTime}ms`);
```

### Docker Testing

```typescript
// Test with Docker
const dockerTest = await handleTestLocalDeployment({
  repositoryPath: "/path/to/project",
  ssg: "hugo",
  port: 8080,
  timeout: 120,
});

if (dockerTest.data.status === "success") {
  console.log(`Docker test successful: ${dockerTest.data.localUrl}`);
} else {
  console.log(`Docker test failed: ${dockerTest.data.error}`);
}
```

## 🔄 Workflow Examples

### Complete Documentation Workflow

```typescript
// Complete workflow from analysis to deployment
async function completeDocumentationWorkflow(projectPath: string) {
  try {
    // 1. Analyze repository
    const analysis = await analyzeRepository({
      path: projectPath,
      depth: "standard",
    });

    const analysisId = analysis.data.id;
    console.log(`Analysis complete: ${analysisId}`);

    // 2. Get SSG recommendation
    const recommendation = await recommendSSG({
      analysisId: analysisId,
      userId: "developer123",
    });

    const ssg = recommendation.data.recommended;
    console.log(`Recommended SSG: ${ssg}`);

    // 3. Set up structure
    const structure = await setupStructure({
      path: "./docs",
      ssg: ssg,
      includeExamples: true,
    });

    console.log(
      `Structure created: ${structure.data.directoriesCreated.length} directories`,
    );

    // 4. Generate configuration
    const config = await generateConfig({
      ssg: ssg,
      projectName: "My Project",
      outputPath: "./docs",
    });

    console.log(
      `Configuration generated: ${config.data.filesCreated.length} files`,
    );

    // 5. Populate content
    const content = await handlePopulateDiataxisContent({
      analysisId: analysisId,
      docsPath: "./docs",
      populationLevel: "comprehensive",
    });

    console.log(
      `Content populated: ${content.data.contentGenerated.length} files`,
    );

    // 6. Deploy to GitHub Pages
    const deployment = await handleDeployPages({
      repository: "user/repository",
      ssg: ssg,
    });

    console.log(`Deployed to: ${deployment.data.url}`);

    return {
      analysisId,
      ssg,
      deploymentUrl: deployment.data.url,
    };
  } catch (error) {
    console.error("Workflow failed:", error);
    throw error;
  }
}

// Usage
completeDocumentationWorkflow("/path/to/project")
  .then((result) => {
    console.log("Workflow completed successfully:", result);
  })
  .catch((error) => {
    console.error("Workflow failed:", error);
  });
```

### Batch Processing Example

```typescript
// Process multiple repositories
async function batchProcessRepositories(repositories: string[]) {
  const results = [];

  for (const repoPath of repositories) {
    try {
      console.log(`Processing: ${repoPath}`);

      const analysis = await analyzeRepository({
        path: repoPath,
        depth: "quick",
      });

      const recommendation = await recommendSSG({
        analysisId: analysis.data.id,
      });

      results.push({
        path: repoPath,
        analysisId: analysis.data.id,
        recommendedSSG: recommendation.data.recommended,
        confidence: recommendation.data.confidence,
      });
    } catch (error) {
      console.error(`Failed to process ${repoPath}:`, error);
      results.push({
        path: repoPath,
        error: error.message,
      });
    }
  }

  return results;
}

// Usage
const repositories = [
  "/path/to/project1",
  "/path/to/project2",
  "/path/to/project3",
];

batchProcessRepositories(repositories).then((results) => {
  console.log("Batch processing complete:", results);
});
```

## 🎯 Error Handling Examples

### Comprehensive Error Handling

```typescript
async function robustAnalysis(projectPath: string) {
  try {
    const analysis = await analyzeRepository({
      path: projectPath,
      depth: "standard",
    });

    if (analysis.success) {
      return analysis.data;
    } else {
      throw new Error(analysis.error.message);
    }
  } catch (error) {
    if (error.code === "EACCES") {
      console.error("Permission denied. Check file permissions.");
    } else if (error.code === "ENOENT") {
      console.error("Directory not found. Check the path.");
    } else if (error.message.includes("analysis failed")) {
      console.error("Analysis failed. Check repository structure.");
    } else {
      console.error("Unexpected error:", error);
    }

    throw error;
  }
}
```

### Retry Logic Example

```typescript
async function retryAnalysis(projectPath: string, maxRetries: number = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${maxRetries}`);

      const analysis = await analyzeRepository({
        path: projectPath,
        depth: "standard",
      });

      return analysis.data;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Analysis failed after ${maxRetries} attempts: ${lastError.message}`,
  );
}
```

## 🔌 MCP Integration Examples

### Complete MCP Workflow

```typescript
// Real-world example: Complete documentation deployment via MCP
import { analyzeRepository } from "./dist/tools/analyze-repository.js";
import { recommendSSG } from "./dist/tools/recommend-ssg.js";
import { generateConfig } from "./dist/tools/generate-config.js";
import { setupStructure } from "./dist/tools/setup-structure.js";
import { deployPages } from "./dist/tools/deploy-pages.js";

async function completeMCPWorkflow(projectPath: string, githubRepo: string) {
  console.log("🔍 Starting DocuMCP workflow...");

  // Step 1: Analyze repository
  const analysis = await analyzeRepository({
    path: projectPath,
    depth: "comprehensive",
  });

  console.log(
    `📊 Analysis complete: ${analysis.data.structure.totalFiles} files analyzed`,
  );
  console.log(`🏗️ Project type: ${analysis.data.recommendations.projectType}`);
  console.log(
    `💻 Primary language: ${analysis.data.recommendations.primaryLanguage}`,
  );

  // Step 2: Get SSG recommendation
  const ssgRecommendation = await recommendSSG({
    analysisId: analysis.id,
    preferences: {
      ecosystem: "javascript",
      priority: "features",
    },
  });

  console.log(`🎯 Recommended SSG: ${ssgRecommendation.data.recommended}`);
  console.log(
    `✅ Confidence: ${Math.round(ssgRecommendation.data.confidence * 100)}%`,
  );

  // Step 3: Generate configuration
  const config = await generateConfig({
    ssg: ssgRecommendation.data.recommended,
    projectName: analysis.data.structure.projectName,
    outputPath: "./docs",
  });

  console.log(
    `⚙️ Configuration generated: ${config.data.filesGenerated.length} files`,
  );

  // Step 4: Setup Diataxis structure
  const structure = await setupStructure({
    path: "./docs",
    ssg: ssgRecommendation.data.recommended,
    includeExamples: true,
  });

  console.log(
    `📁 Structure created: ${structure.data.directoriesCreated.length} directories`,
  );
  console.log(`📄 Files created: ${structure.data.filesCreated.length} files`);

  // Step 5: Deploy to GitHub Pages
  const deployment = await deployPages({
    repository: githubRepo,
    ssg: ssgRecommendation.data.recommended,
    projectPath: projectPath,
  });

  console.log(`🚀 Deployment initiated: ${deployment.data.workflowUrl}`);
  console.log(`🌐 Site URL: ${deployment.data.siteUrl}`);

  return {
    analysis: analysis.data,
    recommendation: ssgRecommendation.data,
    deployment: deployment.data,
  };
}

// Usage
completeMCPWorkflow("/path/to/your/project", "username/repository-name")
  .then((result) => {
    console.log("🎉 DocuMCP workflow completed successfully!");
    console.log(`📊 Final result:`, result);
  })
  .catch((error) => {
    console.error("❌ Workflow failed:", error.message);
  });
```

### MCP Memory Integration

```typescript
// Example showing DocuMCP's memory system for learning user preferences
import { analyzeRepository } from "./dist/tools/analyze-repository.js";
import { recommendSSG } from "./dist/tools/recommend-ssg.js";

async function intelligentRecommendation(projectPath: string, userId: string) {
  // DocuMCP automatically learns from previous successful deployments
  const analysis = await analyzeRepository({
    path: projectPath,
    depth: "standard",
  });

  // Memory system provides personalized recommendations
  const recommendation = await recommendSSG({
    analysisId: analysis.id,
    userId: userId, // Memory system tracks user preferences
  });

  console.log(
    `🧠 Memory-enhanced recommendation: ${recommendation.data.recommended}`,
  );
  console.log(
    `📈 Based on ${
      recommendation.data.memoryInsights?.similarProjects || 0
    } similar projects`,
  );
  console.log(
    `🎯 Success rate: ${Math.round(
      (recommendation.data.memoryInsights?.successRate || 0) * 100,
    )}%`,
  );

  return recommendation;
}
```

These examples demonstrate the comprehensive capabilities of DocuMCP and provide practical patterns for common use cases. Use them as starting points and adapt them to your specific needs.
