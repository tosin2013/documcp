import { generateTechnicalWriterPrompts } from "../../src/prompts/technical-writer-prompts.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Guided Workflow Prompts", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `test-prompts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });

    // Create a test project structure
    await fs.writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: { react: "^18.0.0" },
        scripts: { test: "jest", build: "webpack" },
      }),
    );
    await fs.writeFile(
      join(tempDir, "README.md"),
      "# Test Project\n\nThis is a test project.",
    );
    await fs.mkdir(join(tempDir, "src"));
    await fs.writeFile(join(tempDir, "src/index.js"), 'console.log("hello");');
    await fs.mkdir(join(tempDir, "tests"));
    await fs.writeFile(
      join(tempDir, "tests/index.test.js"),
      'test("basic", () => {});',
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("analyze-and-recommend prompt", () => {
    it("should generate comprehensive analysis and recommendation prompt", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "analyze-and-recommend",
        tempDir,
        {
          analysis_depth: "standard",
          preferences: "performance and ease of use",
        },
      );

      expect(messages).toHaveLength(1);
      expect(messages[0]).toHaveProperty("role", "user");
      expect(messages[0]).toHaveProperty("content");
      expect(messages[0].content).toHaveProperty("type", "text");
      expect(messages[0].content.text).toContain(
        "Execute a complete repository analysis",
      );
      expect(messages[0].content.text).toContain("SSG recommendation workflow");
      expect(messages[0].content.text).toContain("Analysis Depth: standard");
      expect(messages[0].content.text).toContain(
        "Preferences: performance and ease of use",
      );
      expect(messages[0].content.text).toContain("Repository Analysis");
      expect(messages[0].content.text).toContain("Implementation Guidance");
      expect(messages[0].content.text).toContain("Best Practices");
    });

    it("should use default values when optional parameters are not provided", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "analyze-and-recommend",
        tempDir,
        {},
      );

      expect(messages[0].content.text).toContain("Analysis Depth: standard");
      expect(messages[0].content.text).toContain(
        "balanced approach with good community support",
      );
    });

    it("should include project context information", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "analyze-and-recommend",
        tempDir,
        {
          analysis_depth: "deep",
        },
      );

      expect(messages[0].content.text).toContain("Type: node_application");
      expect(messages[0].content.text).toContain("Has Tests: true");
      expect(messages[0].content.text).toContain("Package Manager: npm");
    });
  });

  describe("setup-documentation prompt", () => {
    it("should generate comprehensive documentation setup prompt", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "setup-documentation",
        tempDir,
        {
          ssg_type: "docusaurus",
          include_examples: true,
        },
      );

      expect(messages).toHaveLength(1);
      expect(messages[0]).toHaveProperty("role", "user");
      expect(messages[0].content.text).toContain(
        "Create a comprehensive documentation structure",
      );
      expect(messages[0].content.text).toContain("SSG Type: docusaurus");
      expect(messages[0].content.text).toContain("Include Examples: true");
      expect(messages[0].content.text).toContain(
        "Diataxis Framework Implementation",
      );
      expect(messages[0].content.text).toContain(
        "Tutorials: Learning-oriented content",
      );
      expect(messages[0].content.text).toContain(
        "How-to Guides: Problem-solving content",
      );
      expect(messages[0].content.text).toContain(
        "Reference: Information-oriented content",
      );
      expect(messages[0].content.text).toContain(
        "Explanations: Understanding-oriented content",
      );
      expect(messages[0].content.text).toContain("Configuration Setup");
      expect(messages[0].content.text).toContain("GitHub Pages deployment");
      expect(messages[0].content.text).toContain("with examples");
    });

    it("should handle minimal configuration", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "setup-documentation",
        tempDir,
        {
          include_examples: false,
        },
      );

      expect(messages[0].content.text).toContain(
        "SSG Type: recommended based on project analysis",
      );
      expect(messages[0].content.text).toContain("Include Examples: false");
      expect(messages[0].content.text).toContain("templates");
      expect(messages[0].content.text).not.toContain("with examples");
    });

    it("should include current documentation gaps", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "setup-documentation",
        tempDir,
        {},
      );

      expect(messages[0].content.text).toContain("Current Documentation Gaps:");
      expect(messages[0].content.text).toContain("Development Integration");
      expect(messages[0].content.text).toContain(
        "production-ready documentation system",
      );
    });
  });

  describe("troubleshoot-deployment prompt", () => {
    it("should generate comprehensive troubleshooting prompt", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "troubleshoot-deployment",
        tempDir,
        {
          repository: "owner/repo",
          deployment_url: "https://owner.github.io/repo",
          issue_description: "build failing on GitHub Actions",
        },
      );

      expect(messages).toHaveLength(1);
      expect(messages[0]).toHaveProperty("role", "user");
      expect(messages[0].content.text).toContain(
        "Diagnose and fix GitHub Pages deployment issues",
      );
      expect(messages[0].content.text).toContain("Repository: owner/repo");
      expect(messages[0].content.text).toContain(
        "Expected URL: https://owner.github.io/repo",
      );
      expect(messages[0].content.text).toContain(
        "Issue Description: build failing on GitHub Actions",
      );
      expect(messages[0].content.text).toContain("Troubleshooting Checklist");
      expect(messages[0].content.text).toContain("Repository Settings");
      expect(messages[0].content.text).toContain("Build Configuration");
      expect(messages[0].content.text).toContain("Content Issues");
      expect(messages[0].content.text).toContain("Deployment Workflow");
      expect(messages[0].content.text).toContain("Performance and Security");
      expect(messages[0].content.text).toContain("Root cause analysis");
      expect(messages[0].content.text).toContain("Systematic Testing");
    });

    it("should use default values for optional parameters", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "troubleshoot-deployment",
        tempDir,
        {
          repository: "test/repo",
        },
      );

      expect(messages[0].content.text).toContain(
        "Expected URL: GitHub Pages URL",
      );
      expect(messages[0].content.text).toContain(
        "Issue Description: deployment not working as expected",
      );
    });

    it("should include project context for troubleshooting", async () => {
      const messages = await generateTechnicalWriterPrompts(
        "troubleshoot-deployment",
        tempDir,
        {
          repository: "test/repo",
        },
      );

      expect(messages[0].content.text).toContain("Project Context");
      expect(messages[0].content.text).toContain("Type: node_application");
      expect(messages[0].content.text).toContain("Diagnostic Approach");
      expect(messages[0].content.text).toContain("Systematic Testing");
    });
  });

  describe("Error handling", () => {
    it("should throw error for unknown prompt type", async () => {
      await expect(
        generateTechnicalWriterPrompts("unknown-prompt-type", tempDir, {}),
      ).rejects.toThrow("Unknown prompt type: unknown-prompt-type");
    });

    it("should handle missing project directory gracefully", async () => {
      const nonExistentDir = join(tmpdir(), "non-existent-dir");

      // Should not throw, but may have reduced context
      const messages = await generateTechnicalWriterPrompts(
        "analyze-and-recommend",
        nonExistentDir,
        {},
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].content.text).toContain("repository analysis");
    });

    it("should handle malformed package.json gracefully", async () => {
      await fs.writeFile(join(tempDir, "package.json"), "invalid json content");

      const messages = await generateTechnicalWriterPrompts(
        "setup-documentation",
        tempDir,
        {},
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].content.text).toContain("documentation structure");
    });
  });

  describe("Prompt content validation", () => {
    it("should generate prompts with consistent structure", async () => {
      const promptTypes = [
        "analyze-and-recommend",
        "setup-documentation",
        "troubleshoot-deployment",
      ];

      for (const promptType of promptTypes) {
        const args =
          promptType === "troubleshoot-deployment"
            ? { repository: "test/repo" }
            : {};

        const messages = await generateTechnicalWriterPrompts(
          promptType,
          tempDir,
          args,
        );

        expect(messages).toHaveLength(1);
        expect(messages[0]).toHaveProperty("role", "user");
        expect(messages[0]).toHaveProperty("content");
        expect(messages[0].content).toHaveProperty("type", "text");
        expect(messages[0].content.text).toBeTruthy();
        expect(messages[0].content.text.length).toBeGreaterThan(100);
      }
    });

    it("should include project-specific information in all prompts", async () => {
      const promptTypes = ["analyze-and-recommend", "setup-documentation"];

      for (const promptType of promptTypes) {
        const messages = await generateTechnicalWriterPrompts(
          promptType,
          tempDir,
          {},
        );

        expect(messages[0].content.text).toContain("Project Context");
        expect(messages[0].content.text).toContain("Type:");
        expect(messages[0].content.text).toContain("Languages:");
      }
    });
  });
});
