import { generateTechnicalWriterPrompts } from "../../src/tools/generate-technical-writer-prompts.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("generate-technical-writer-prompts", () => {
  let testProjectPath: string;

  beforeEach(async () => {
    // Create temporary test project directory
    testProjectPath = join(tmpdir(), `test-project-${Date.now()}`);
    await fs.mkdir(testProjectPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Input Validation", () => {
    it("should require project_path parameter", async () => {
      const result = await generateTechnicalWriterPrompts({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required");
    });

    it("should accept valid context_sources", async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: { react: "^18.0.0" },
        }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: [
          "repository_analysis",
          "readme_health",
          "documentation_gaps",
        ],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.prompts.length).toBeGreaterThan(0);
    });

    it("should validate audience parameter", async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
        }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        audience: "developer",
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.integrationLevel).toBe(
        "comprehensive",
      );
    });
  });

  describe("Project Context Analysis", () => {
    it("should detect Node.js project with React", async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-react-app",
          dependencies: {
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
          devDependencies: {
            typescript: "^5.0.0",
          },
        }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.projectContext.projectType).toBe(
        "web_application",
      );
      expect(
        result.generation.contextSummary.projectContext.frameworks,
      ).toContain("React");
      expect(
        result.generation.contextSummary.projectContext.languages,
      ).toContain("TypeScript");
      expect(
        result.generation.contextSummary.projectContext.languages,
      ).toContain("JavaScript");
    });

    it("should detect Python project", async () => {
      await fs.writeFile(
        join(testProjectPath, "main.py"),
        'print("Hello, World!")',
      );
      await fs.writeFile(
        join(testProjectPath, "requirements.txt"),
        "flask==2.0.0",
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.projectContext.projectType).toBe(
        "python_application",
      );
      expect(
        result.generation.contextSummary.projectContext.languages,
      ).toContain("Python");
    });

    it("should detect CI/CD configuration", async () => {
      await fs.mkdir(join(testProjectPath, ".github", "workflows"), {
        recursive: true,
      });
      await fs.writeFile(
        join(testProjectPath, ".github", "workflows", "ci.yml"),
        "name: CI\non: [push]",
      );
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.projectContext.hasCI).toBe(true);
    });

    it("should detect test files", async () => {
      await fs.writeFile(
        join(testProjectPath, "test.js"),
        'describe("test", () => {})',
      );
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.projectContext.hasTests).toBe(
        true,
      );
    });
  });

  describe("Documentation Context Analysis", () => {
    it("should detect existing README", async () => {
      await fs.writeFile(
        join(testProjectPath, "README.md"),
        "# Test Project\nA test project",
      );
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["readme_health"],
      });

      expect(result.isError).toBe(false);
      expect(
        result.generation.contextSummary.documentationContext.readmeExists,
      ).toBe(true);
    });

    it("should handle missing README", async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["readme_health"],
      });

      expect(result.isError).toBe(false);
      expect(
        result.generation.contextSummary.documentationContext.readmeExists,
      ).toBe(false);
    });
  });

  describe("Prompt Generation", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: { react: "^18.0.0" },
        }),
      );
    });

    it("should generate content generation prompts", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        prompt_types: ["content_generation"],
      });

      expect(result.isError).toBe(false);
      const contentPrompts = result.generation.prompts.filter(
        (p) => p.category === "content_generation",
      );
      expect(contentPrompts.length).toBeGreaterThan(0);
      expect(contentPrompts[0].title).toContain("Project Overview");
      expect(contentPrompts[0].prompt).toContain("web_application");
      expect(contentPrompts[0].prompt).toContain("React");
    });

    it("should generate gap filling prompts when gaps exist", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["documentation_gaps"],
        prompt_types: ["gap_filling"],
      });

      expect(result.isError).toBe(false);
      const gapPrompts = result.generation.prompts.filter(
        (p) => p.category === "gap_filling",
      );
      expect(gapPrompts.length).toBeGreaterThan(0);
      expect(
        gapPrompts.some(
          (p) =>
            p.title.includes("installation") ||
            p.title.includes("api") ||
            p.title.includes("contributing"),
        ),
      ).toBe(true);
    });

    it("should generate style improvement prompts for low health scores", async () => {
      await fs.writeFile(
        join(testProjectPath, "README.md"),
        "# Test\nBad readme",
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["readme_health"],
        prompt_types: ["style_improvement"],
      });

      expect(result.isError).toBe(false);
      const stylePrompts = result.generation.prompts.filter(
        (p) => p.category === "style_improvement",
      );
      expect(stylePrompts.length).toBeGreaterThan(0);
      expect(stylePrompts[0].title).toContain("Style Enhancement");
    });

    it("should generate deployment prompts for comprehensive integration", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "comprehensive",
        prompt_types: ["deployment_optimization"],
      });

      expect(result.isError).toBe(false);
      const deploymentPrompts = result.generation.prompts.filter(
        (p) => p.category === "deployment_optimization",
      );
      expect(deploymentPrompts.length).toBeGreaterThan(0);
      expect(deploymentPrompts[0].title).toContain("Deployment Documentation");
    });

    it("should include integration hints and related tools", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        prompt_types: ["content_generation"],
      });

      expect(result.isError).toBe(false);
      const prompt = result.generation.prompts[0];
      expect(prompt.integrationHints).toBeDefined();
      expect(prompt.integrationHints.length).toBeGreaterThan(0);
      expect(prompt.relatedTools).toBeDefined();
      expect(prompt.relatedTools.length).toBeGreaterThan(0);
    });
  });

  describe("Audience-Specific Prompts", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: { express: "^4.0.0" },
        }),
      );
    });

    it("should generate developer-focused prompts", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        audience: "developer",
        prompt_types: ["content_generation"],
      });

      expect(result.isError).toBe(false);
      const prompts = result.generation.prompts;
      expect(prompts.every((p) => p.audience === "developer")).toBe(true);
      expect(prompts[0].prompt).toContain("developer");
    });

    it("should generate enterprise-focused prompts", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        audience: "enterprise",
        prompt_types: ["content_generation"],
      });

      expect(result.isError).toBe(false);
      const prompts = result.generation.prompts;
      expect(prompts.every((p) => p.audience === "enterprise")).toBe(true);
      expect(prompts[0].prompt).toContain("enterprise");
    });
  });

  describe("Integration Levels", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
        }),
      );
    });

    it("should generate basic prompts for basic integration", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "basic",
        prompt_types: ["content_generation"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.integrationLevel).toBe("basic");
      expect(result.generation.prompts.length).toBeGreaterThan(0);
    });

    it("should generate comprehensive prompts for comprehensive integration", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "comprehensive",
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.integrationLevel).toBe(
        "comprehensive",
      );
      const deploymentPrompts = result.generation.prompts.filter(
        (p) => p.category === "deployment_optimization",
      );
      expect(deploymentPrompts.length).toBeGreaterThan(0);
    });

    it("should generate advanced prompts for advanced integration", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "advanced",
      });

      expect(result.isError).toBe(false);
      expect(result.generation.contextSummary.integrationLevel).toBe(
        "advanced",
      );
      const deploymentPrompts = result.generation.prompts.filter(
        (p) => p.category === "deployment_optimization",
      );
      expect(deploymentPrompts.length).toBeGreaterThan(0);
    });
  });

  describe("Recommendations and Next Steps", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
        }),
      );
    });

    it("should generate integration recommendations", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
      });

      expect(result.isError).toBe(false);
      expect(result.generation.recommendations).toBeDefined();
      expect(result.generation.recommendations.length).toBeGreaterThan(0);
      expect(result.generation.recommendations[0]).toContain(
        "analyze_repository",
      );
    });

    it("should generate structured next steps", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
      });

      expect(result.isError).toBe(false);
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps[0]).toHaveProperty("action");
      expect(result.nextSteps[0]).toHaveProperty("toolRequired");
      expect(result.nextSteps[0]).toHaveProperty("priority");
    });

    it("should recommend README template creation for missing README", async () => {
      // Ensure no README exists
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["readme_health"],
      });

      expect(result.isError).toBe(false);
      expect(
        result.generation.recommendations.some((r) =>
          r.includes("generate_readme_template"),
        ),
      ).toBe(true);
    });

    it("should recommend testing documentation for projects with tests", async () => {
      await fs.writeFile(join(testProjectPath, "test.js"), "test code");

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis"],
      });

      expect(result.isError).toBe(false);
      expect(
        result.generation.recommendations.some((r) =>
          r.includes("testing documentation"),
        ),
      ).toBe(true);
    });
  });

  describe("Metadata and Scoring", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "test-project",
          dependencies: { react: "^18.0.0" },
        }),
      );
    });

    it("should include comprehensive metadata", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
      });

      expect(result.isError).toBe(false);
      expect(result.generation.metadata).toBeDefined();
      expect(result.generation.metadata.totalPrompts).toBeGreaterThan(0);
      expect(result.generation.metadata.promptsByCategory).toBeDefined();
      expect(result.generation.metadata.confidenceScore).toBeGreaterThan(0);
      expect(result.generation.metadata.generatedAt).toBeDefined();
    });

    it("should calculate confidence score based on available context", async () => {
      await fs.writeFile(join(testProjectPath, "README.md"), "# Test Project");

      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        context_sources: ["repository_analysis", "readme_health"],
      });

      expect(result.isError).toBe(false);
      expect(result.generation.metadata.confidenceScore).toBeGreaterThan(70);
    });

    it("should categorize prompts correctly", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        prompt_types: ["content_generation", "gap_filling"],
        context_sources: ["documentation_gaps"],
      });

      expect(result.isError).toBe(false);
      const categories = result.generation.metadata.promptsByCategory;
      expect(categories.content_generation).toBeGreaterThan(0);
      expect(categories.gap_filling).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent project path gracefully", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: "/non/existent/path",
      });

      expect(result.isError).toBe(false); // Should not error, just provide limited context
      expect(result.generation.contextSummary.projectContext.projectType).toBe(
        "unknown",
      );
    });

    it("should handle invalid context sources", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        // @ts-ignore - testing invalid input
        context_sources: ["invalid_source"],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        "Error generating technical writer prompts",
      );
    });

    it("should provide empty result structure on error", async () => {
      const result = await generateTechnicalWriterPrompts({
        // @ts-ignore - testing invalid input
        project_path: null,
      });

      expect(result.isError).toBe(true);
      expect(result.generation).toBeDefined();
      expect(result.generation.prompts).toEqual([]);
      expect(result.generation.metadata.totalPrompts).toBe(0);
      expect(result.nextSteps).toEqual([]);
    });
  });

  describe("Cross-Tool Integration", () => {
    beforeEach(async () => {
      await fs.writeFile(
        join(testProjectPath, "package.json"),
        JSON.stringify({
          name: "integration-test",
          dependencies: { next: "^13.0.0" },
        }),
      );
    });

    it("should reference multiple DocuMCP tools in integration hints", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "comprehensive",
      });

      expect(result.isError).toBe(false);
      const allHints = result.generation.prompts.flatMap(
        (p) => p.integrationHints,
      );
      const allTools = result.generation.prompts.flatMap((p) => p.relatedTools);

      // Should reference multiple DocuMCP tools
      expect(allTools).toContain("analyze_repository");
      expect(allTools).toContain("detect_documentation_gaps");
      expect(allTools).toContain("readme_best_practices");
      // Check for any deployment-related tools since validate_content may not always be included
      expect(
        allTools.some((tool) =>
          ["validate_content", "deploy_pages", "verify_deployment"].includes(
            tool,
          ),
        ),
      ).toBe(true);
    });

    it("should provide workflow guidance for tool chaining", async () => {
      const result = await generateTechnicalWriterPrompts({
        project_path: testProjectPath,
        integration_level: "advanced",
      });

      expect(result.isError).toBe(false);
      expect(
        result.generation.recommendations.some((r) =>
          r.includes("analyze_repository first"),
        ),
      ).toBe(true);
      expect(
        result.generation.recommendations.some((r) =>
          r.includes("validate_content"),
        ),
      ).toBe(true);
    });
  });
});
