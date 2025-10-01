import { promises as fs } from "fs";
import { join } from "path";

export interface ProjectContext {
  projectType: string;
  languages: string[];
  frameworks: string[];
  hasTests: boolean;
  hasCI: boolean;
  readmeExists: boolean;
  packageManager?: string;
  documentationGaps: string[];
}

export interface PromptMessage {
  role: "user" | "assistant" | "system";
  content: {
    type: "text";
    text: string;
  };
}

export async function analyzeProjectContext(
  projectPath: string,
): Promise<ProjectContext> {
  const context: ProjectContext = {
    projectType: "unknown",
    languages: [],
    frameworks: [],
    hasTests: false,
    hasCI: false,
    readmeExists: false,
    documentationGaps: [],
  };

  // Check for README
  context.readmeExists = await fileExists(join(projectPath, "README.md"));

  // Analyze package.json for Node.js projects
  const packageJsonPath = join(projectPath, "package.json");
  if (await fileExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, "utf-8"),
      );
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      context.projectType = "node_application";
      context.languages.push("JavaScript");

      // Detect frameworks
      if (deps["react"]) context.frameworks.push("React");
      if (deps["vue"]) context.frameworks.push("Vue");
      if (deps["angular"]) context.frameworks.push("Angular");
      if (deps["express"]) context.frameworks.push("Express");
      if (deps["next"]) context.frameworks.push("Next.js");
      if (deps["nuxt"]) context.frameworks.push("Nuxt.js");
      if (deps["svelte"]) context.frameworks.push("Svelte");
      if (deps["typescript"]) context.languages.push("TypeScript");

      // Detect package manager
      if (await fileExists(join(projectPath, "yarn.lock"))) {
        context.packageManager = "yarn";
      } else if (await fileExists(join(projectPath, "pnpm-lock.yaml"))) {
        context.packageManager = "pnpm";
      } else {
        context.packageManager = "npm";
      }
    } catch (error) {
      // If package.json exists but can't be parsed, continue with other detections
      console.warn("Failed to parse package.json:", error);
    }
  }

  // Check for Python projects
  if (
    (await fileExists(join(projectPath, "requirements.txt"))) ||
    (await fileExists(join(projectPath, "pyproject.toml"))) ||
    (await fileExists(join(projectPath, "setup.py")))
  ) {
    context.projectType = "python_application";
    context.languages.push("Python");
  }

  // Check for Go projects
  if (await fileExists(join(projectPath, "go.mod"))) {
    context.projectType = "go_application";
    context.languages.push("Go");
  }

  // Check for Rust projects
  if (await fileExists(join(projectPath, "Cargo.toml"))) {
    context.projectType = "rust_application";
    context.languages.push("Rust");
  }

  // Check for tests
  context.hasTests = await hasTestFiles(projectPath);

  // Check for CI/CD
  context.hasCI = await hasCIConfig(projectPath);

  // Identify documentation gaps
  context.documentationGaps = await identifyDocumentationGaps(
    projectPath,
    context,
  );

  return context;
}

export async function generateTechnicalWriterPrompts(
  promptType: string,
  projectPath: string,
  args: Record<string, any> = {},
): Promise<PromptMessage[]> {
  const context = await analyzeProjectContext(projectPath);

  switch (promptType) {
    case "tutorial-writer":
      return generateTutorialWriterPrompt(context, args);
    case "howto-guide-writer":
      return generateHowToGuideWriterPrompt(context, args);
    case "reference-writer":
      return generateReferenceWriterPrompt(context, args);
    case "explanation-writer":
      return generateExplanationWriterPrompt(context, args);
    case "diataxis-organizer":
      return generateDiataxisOrganizerPrompt(context, args);
    case "readme-optimizer":
      return generateReadmeOptimizerPrompt(context, args);
    case "analyze-and-recommend":
      return generateAnalyzeAndRecommendPrompt(context, args);
    case "setup-documentation":
      return generateSetupDocumentationPrompt(context, args);
    case "troubleshoot-deployment":
      return generateTroubleshootDeploymentPrompt(context, args);
    default:
      throw new Error(`Unknown prompt type: ${promptType}`);
  }
}

function generateTutorialWriterPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const targetAudience = args.target_audience || "beginners";
  const learningGoal = args.learning_goal || "get started with the project";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create a comprehensive tutorial for a ${
          context.projectType
        } project following Diataxis framework principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Package Manager: ${context.packageManager || "N/A"}
- Target Audience: ${targetAudience}
- Learning Goal: ${learningGoal}

**Diataxis Tutorial Requirements:**
1. Learning-oriented: Focus on helping users learn by doing
2. Step-by-step progression from simple to complex
3. Practical exercises with clear outcomes
4. Safe-to-fail environment for experimentation
5. Minimal explanation - focus on action

**Tutorial Structure:**
1. Prerequisites and setup
2. Step-by-step guided exercises
3. What you'll build/learn
4. Hands-on activities with immediate feedback
5. Next steps for continued learning

**Integration Hints:**
- Use analyze_repository for project structure insights
- Reference setup_development_environment for environment setup
- Consider validate_tutorial_steps for step verification

Please create a tutorial that teaches through guided practice:`,
      },
    },
  ];
}

function generateHowToGuideWriterPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const problemToSolve = args.problem || "common development task";
  const userExperience = args.user_experience || "intermediate";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create a practical how-to guide for a ${
          context.projectType
        } project following Diataxis framework principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Problem to Solve: ${problemToSolve}
- User Experience Level: ${userExperience}

**Diataxis How-to Guide Requirements:**
1. Problem-oriented: Address specific real-world problems
2. Goal-focused: Clear objective and success criteria
3. Action-oriented: Direct, actionable steps
4. Assume prior knowledge appropriate to user level
5. Practical and immediately applicable

**How-to Guide Structure:**
1. Problem statement and context
2. Prerequisites and assumptions
3. Step-by-step solution
4. Verification and testing
5. Troubleshooting common issues
6. Related tasks and variations

**Integration Hints:**
- Use analyze_codebase for understanding current implementation
- Reference best_practices for recommended approaches
- Consider validate_solution for testing guidance

Please create a how-to guide that solves real problems:`,
      },
    },
  ];
}

function generateReferenceWriterPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const referenceType = args.reference_type || "API";
  const completeness = args.completeness || "comprehensive";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create comprehensive reference documentation for a ${
          context.projectType
        } project following Diataxis framework principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Reference Type: ${referenceType}
- Completeness Level: ${completeness}

**Diataxis Reference Requirements:**
1. Information-oriented: Provide complete, accurate information
2. Structured and consistent organization
3. Comprehensive coverage of all features/APIs
4. Neutral tone - describe what is, not how to use
5. Easy to scan and search

**Reference Structure:**
1. Overview and organization
2. Complete feature/API listings
3. Parameters, return values, examples
4. Technical specifications
5. Cross-references and relationships
6. Version compatibility information

**Integration Hints:**
- Use analyze_api_endpoints for API documentation
- Reference code_analysis for implementation details
- Consider validate_completeness for coverage verification

Please create reference documentation that serves as the authoritative source:`,
      },
    },
  ];
}

function generateExplanationWriterPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const conceptToExplain = args.concept || "system architecture";
  const depth = args.depth || "detailed";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create in-depth explanation documentation for a ${
          context.projectType
        } project following Diataxis framework principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Concept to Explain: ${conceptToExplain}
- Depth Level: ${depth}

**Diataxis Explanation Requirements:**
1. Understanding-oriented: Help users understand concepts
2. Theoretical and conceptual focus
3. Provide context and background
4. Explain why things work the way they do
5. Connect ideas and show relationships

**Explanation Structure:**
1. Introduction and context
2. Core concepts and principles
3. How components relate and interact
4. Design decisions and trade-offs
5. Historical context and evolution
6. Implications and consequences

**Integration Hints:**
- Use analyze_architecture for system understanding
- Reference design_patterns for architectural insights
- Consider validate_understanding for comprehension checks

Please create explanatory content that builds deep understanding:`,
      },
    },
  ];
}

function generateDiataxisOrganizerPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const currentDocs = args.current_docs || "mixed documentation";
  const priority = args.priority || "user needs";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Organize existing documentation for a ${
          context.projectType
        } project using Diataxis framework principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Current Documentation: ${currentDocs}
- Organization Priority: ${priority}

**Diataxis Organization Requirements:**
1. Categorize content into four types: Tutorials, How-to guides, Reference, Explanation
2. Ensure each piece serves its intended purpose
3. Create clear navigation between content types
4. Identify gaps and overlaps
5. Establish content relationships and cross-references

**Organization Structure:**
1. Content audit and classification
2. Diataxis quadrant mapping
3. Navigation and information architecture
4. Content gap analysis
5. Cross-reference strategy
6. Migration and improvement plan

**Integration Hints:**
- Use analyze_existing_docs for current state assessment
- Reference content_classification for categorization
- Consider validate_organization for structure verification

Please organize documentation according to Diataxis principles:`,
      },
    },
  ];
}

function generateReadmeOptimizerPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const optimizationFocus = args.optimization_focus || "general";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Optimize existing README content for a ${
          context.projectType
        } project using Diataxis-aware principles.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- README Exists: ${context.readmeExists}
- Documentation Gaps: ${
          context.documentationGaps.join(", ") || "None identified"
        }
- Optimization Focus: ${optimizationFocus}

**Diataxis-Aware README Requirements:**
1. Clear content type identification (tutorial, how-to, reference, explanation)
2. Appropriate depth for each content type
3. Logical flow from learning to doing to understanding
4. Clear navigation to detailed documentation
5. Audience-appropriate entry points

**README Structure (Diataxis-organized):**
1. Quick start (tutorial-style for beginners)
2. Common tasks (how-to style for users)
3. API/feature overview (reference-style for developers)
4. Architecture overview (explanation-style for understanding)
5. Links to detailed Diataxis-organized documentation

**Integration Hints:**
- Use analyze_readme for current content analysis
- Reference diataxis_principles for content organization
- Consider validate_readme_structure for optimization verification

Please optimize the README with Diataxis awareness:`,
      },
    },
  ];
}

// Helper functions
async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasTestFiles(projectPath: string): Promise<boolean> {
  try {
    const files = await fs.readdir(projectPath, { recursive: true });
    return files.some(
      (file) =>
        typeof file === "string" &&
        (file.includes("test") ||
          file.includes("spec") ||
          file.endsWith(".test.js") ||
          file.endsWith(".test.ts") ||
          file.endsWith(".spec.js") ||
          file.endsWith(".spec.ts")),
    );
  } catch {
    return false;
  }
}

async function hasCIConfig(projectPath: string): Promise<boolean> {
  const ciFiles = [
    ".github/workflows",
    ".gitlab-ci.yml",
    "circle.yml",
    ".circleci/config.yml",
    "travis.yml",
    ".travis.yml",
  ];

  for (const file of ciFiles) {
    if (await fileExists(join(projectPath, file))) {
      return true;
    }
  }
  return false;
}

async function identifyDocumentationGaps(
  projectPath: string,
  context: ProjectContext,
): Promise<string[]> {
  const gaps: string[] = [];

  if (!context.readmeExists) {
    gaps.push("readme");
  }

  // Check for common documentation files
  const docFiles = [
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    "LICENSE",
    "docs/api.md",
    "docs/tutorial.md",
    "docs/installation.md",
  ];

  for (const docFile of docFiles) {
    if (!(await fileExists(join(projectPath, docFile)))) {
      gaps.push(docFile.toLowerCase().replace(".md", "").replace("docs/", ""));
    }
  }

  return gaps;
}

// Guided workflow prompt generators (ADR-007)

function generateAnalyzeAndRecommendPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const analysisDepth = args.analysis_depth || "standard";
  const preferences =
    args.preferences || "balanced approach with good community support";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Execute a complete repository analysis and SSG recommendation workflow for this project.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Package Manager: ${context.packageManager || "N/A"}
- Has Tests: ${context.hasTests}
- Has CI: ${context.hasCI}
- Documentation Gaps: ${context.documentationGaps.join(", ")}

**Workflow Parameters:**
- Analysis Depth: ${analysisDepth}
- Preferences: ${preferences}

**Expected Workflow:**
1. **Repository Analysis**: Analyze project structure, dependencies, and complexity
2. **SSG Recommendation**: Recommend the best static site generator based on project characteristics
3. **Implementation Guidance**: Provide step-by-step setup instructions
4. **Best Practices**: Include security, performance, and maintenance recommendations

**Required Output Format:**
- Executive summary with key findings
- Detailed analysis results with metrics
- SSG recommendation with justification
- Implementation roadmap with priorities
- Resource requirements and timeline estimates

Please execute this workflow systematically and provide actionable recommendations.`,
      },
    },
  ];
}

function generateSetupDocumentationPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const ssgType = args.ssg_type || "recommended based on project analysis";
  const includeExamples = args.include_examples !== false;

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Create a comprehensive documentation structure with best practices for this project.

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Frameworks: ${context.frameworks.join(", ")}
- Current Documentation Gaps: ${context.documentationGaps.join(", ")}

**Setup Parameters:**
- SSG Type: ${ssgType}
- Include Examples: ${includeExamples}

**Documentation Structure Requirements:**
1. **Diataxis Framework Implementation**:
   - Tutorials: Learning-oriented content
   - How-to Guides: Problem-solving content
   - Reference: Information-oriented content
   - Explanations: Understanding-oriented content

2. **Configuration Setup**:
   - SSG configuration files
   - GitHub Pages deployment
   - Automated workflows
   - Security best practices

3. **Content Guidelines**:
   - Writing style guide
   - Contribution guidelines
   - Review processes
   - Maintenance procedures

4. **Development Integration**:
   - Build pipeline integration
   - Automated testing for docs
   - Performance monitoring
   - Analytics setup

**Required Deliverables:**
- Complete directory structure
- Configuration files with comments
- Sample content ${includeExamples ? "with examples" : "templates"}
- Deployment automation
- Maintenance runbook

Please create a production-ready documentation system that scales with the project.`,
      },
    },
  ];
}

function generateTroubleshootDeploymentPrompt(
  context: ProjectContext,
  args: Record<string, any>,
): PromptMessage[] {
  const repository = args.repository;
  const deploymentUrl = args.deployment_url || "GitHub Pages URL";
  const issueDescription =
    args.issue_description || "deployment not working as expected";

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: `Diagnose and fix GitHub Pages deployment issues for this documentation project.

**Repository Information:**
- Repository: ${repository}
- Expected URL: ${deploymentUrl}
- Issue Description: ${issueDescription}

**Project Context:**
- Type: ${context.projectType}
- Languages: ${context.languages.join(", ")}
- Has CI: ${context.hasCI}

**Troubleshooting Checklist:**

1. **Repository Settings**:
   - GitHub Pages source configuration
   - Branch and folder settings
   - Custom domain setup (if applicable)
   - Repository visibility and permissions

2. **Build Configuration**:
   - GitHub Actions workflow validation
   - Build dependencies and versions
   - Output directory configuration
   - Asset and link path issues

3. **Content Issues**:
   - Markdown syntax validation
   - Link and image path verification
   - YAML frontmatter validation
   - Special character handling

4. **Deployment Workflow**:
   - Action permissions and secrets
   - Deployment job configuration
   - Artifact handling
   - Cache and dependency issues

5. **Performance and Security**:
   - Build time optimization
   - Security policy compliance
   - CDN and caching configuration
   - SSL certificate validation

**Diagnostic Approach:**
1. **Immediate Assessment**: Check current status and error messages
2. **Systematic Testing**: Validate each component step-by-step
3. **Fix Implementation**: Apply targeted solutions with validation
4. **Prevention Setup**: Implement monitoring and automated checks

**Required Output:**
- Root cause analysis
- Step-by-step fix instructions
- Validation procedures
- Prevention recommendations
- Monitoring setup guide

Please provide a comprehensive troubleshooting guide with specific, actionable solutions.`,
      },
    },
  ];
}
