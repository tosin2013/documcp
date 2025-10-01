import {
  generateTechnicalWriterPrompts,
  analyzeProjectContext,
} from "../../src/prompts/technical-writer-prompts.js";
import { promises as fs } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Technical Writer Diataxis Prompts", () => {
  let testProjectPath: string;

  beforeEach(async () => {
    // Create a temporary test project
    testProjectPath = join(tmpdir(), `test-project-${Date.now()}`);
    await fs.mkdir(testProjectPath, { recursive: true });

    // Create a basic package.json
    const packageJson = {
      name: "test-project",
      version: "1.0.0",
      dependencies: {
        react: "^18.0.0",
        typescript: "^5.0.0",
      },
      scripts: {
        test: "jest",
      },
    };
    await fs.writeFile(
      join(testProjectPath, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );

    // Create a basic README.md
    await fs.writeFile(
      join(testProjectPath, "README.md"),
      "# Test Project\n\nA test project for testing.",
    );

    // Create a test directory
    await fs.mkdir(join(testProjectPath, "tests"), { recursive: true });
    await fs.writeFile(
      join(testProjectPath, "tests", "example.test.js"),
      'test("example", () => { expect(true).toBe(true); });',
    );

    // Create a CI file
    await fs.mkdir(join(testProjectPath, ".github", "workflows"), {
      recursive: true,
    });
    await fs.writeFile(
      join(testProjectPath, ".github", "workflows", "ci.yml"),
      "name: CI\non: [push, pull_request]",
    );
  });

  afterEach(async () => {
    // Clean up test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("generateTechnicalWriterPrompts", () => {
    it("should generate tutorial writer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "tutorial-writer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0]).toHaveProperty("role");
      expect(prompts[0]).toHaveProperty("content");
      expect(prompts[0].content).toHaveProperty("type", "text");
      expect(prompts[0].content).toHaveProperty("text");
      expect(prompts[0].content.text).toContain("tutorial");
      expect(prompts[0].content.text).toContain("Diataxis");
    });

    it("should generate how-to guide writer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "howto-guide-writer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].content.text).toContain("how-to guide");
      expect(prompts[0].content.text).toContain("Problem-oriented");
    });

    it("should generate reference writer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "reference-writer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].content.text).toContain("reference documentation");
      expect(prompts[0].content.text).toContain("Information-oriented");
    });

    it("should generate explanation writer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "explanation-writer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].content.text).toContain("explanation documentation");
      expect(prompts[0].content.text).toContain("Understanding-oriented");
    });

    it("should generate diataxis organizer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "diataxis-organizer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].content.text).toContain("Diataxis framework");
      expect(prompts[0].content.text).toContain("organize");
    });

    it("should generate readme optimizer prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "readme-optimizer",
        testProjectPath,
      );

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].content.text).toContain("README");
      expect(prompts[0].content.text).toContain("Diataxis-aware");
    });

    it("should throw error for unknown prompt type", async () => {
      await expect(
        generateTechnicalWriterPrompts("unknown-type", testProjectPath),
      ).rejects.toThrow("Unknown prompt type: unknown-type");
    });

    it("should include project context in prompts", async () => {
      const prompts = await generateTechnicalWriterPrompts(
        "tutorial-writer",
        testProjectPath,
      );

      const promptText = prompts[0].content.text;
      expect(promptText).toContain("React"); // Should detect React from package.json
      expect(promptText).toContain("TypeScript"); // Should detect TypeScript
    });
  });

  describe("analyzeProjectContext", () => {
    it("should analyze project context correctly", async () => {
      const context = await analyzeProjectContext(testProjectPath);

      expect(context).toHaveProperty("projectType");
      expect(context).toHaveProperty("languages");
      expect(context).toHaveProperty("frameworks");
      expect(context).toHaveProperty("hasTests");
      expect(context).toHaveProperty("hasCI");
      expect(context).toHaveProperty("readmeExists");
      expect(context).toHaveProperty("documentationGaps");

      // Check specific values based on our test setup
      expect(context.projectType).toBe("node_application");
      expect(context.languages).toContain("TypeScript");
      expect(context.frameworks).toContain("React");
      expect(context.hasTests).toBe(true);
      expect(context.hasCI).toBe(true);
      expect(context.readmeExists).toBe(true);
      expect(context.packageManager).toBe("npm");
    });

    it("should detect documentation gaps", async () => {
      const context = await analyzeProjectContext(testProjectPath);

      expect(Array.isArray(context.documentationGaps)).toBe(true);
      // Should detect missing documentation since we only have a basic README
      expect(context.documentationGaps.length).toBeGreaterThan(0);
    });

    it("should handle projects without package.json", async () => {
      // Create a project without package.json
      const simpleProjectPath = join(tmpdir(), `simple-project-${Date.now()}`);
      await fs.mkdir(simpleProjectPath, { recursive: true });

      try {
        const context = await analyzeProjectContext(simpleProjectPath);

        expect(context.projectType).toBe("unknown");
        expect(context.languages).toEqual([]);
        expect(context.frameworks).toEqual([]);
        expect(context.readmeExists).toBe(false);
      } finally {
        await fs.rm(simpleProjectPath, { recursive: true, force: true });
      }
    });

    it("should detect yarn package manager", async () => {
      // Create yarn.lock to simulate yarn project
      await fs.writeFile(join(testProjectPath, "yarn.lock"), "# Yarn lockfile");

      const context = await analyzeProjectContext(testProjectPath);
      expect(context.packageManager).toBe("yarn");
    });

    it("should detect pnpm package manager", async () => {
      // Create pnpm-lock.yaml to simulate pnpm project
      await fs.writeFile(
        join(testProjectPath, "pnpm-lock.yaml"),
        "lockfileVersion: 5.4",
      );

      const context = await analyzeProjectContext(testProjectPath);
      expect(context.packageManager).toBe("pnpm");
    });
  });
});
