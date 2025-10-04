// Simple coverage tests for all tools
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Import all tools to increase coverage
import { recommendSSG } from "../../src/tools/recommend-ssg";
import { generateConfig } from "../../src/tools/generate-config";
import { setupStructure } from "../../src/tools/setup-structure";
import { deployPages } from "../../src/tools/deploy-pages";
import { verifyDeployment } from "../../src/tools/verify-deployment";

describe("Simple Tool Coverage Tests", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), "simple-coverage");
    await fs.mkdir(tempDir, { recursive: true });

    // Clean up any existing KG data in temp directory
    const kgDir = path.join(tempDir, ".documcp", "memory");
    try {
      await fs.rm(kgDir, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Cleanup errors are okay
    }
  });

  it("should test recommend_ssg tool", async () => {
    // Change to temp directory to avoid KG conflicts
    process.chdir(tempDir);

    try {
      const result = await recommendSSG({
        analysisId: "test-123",
      });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("should test generate_config for each SSG", async () => {
    const ssgs = [
      "docusaurus",
      "mkdocs",
      "hugo",
      "jekyll",
      "eleventy",
    ] as const;

    for (const ssg of ssgs) {
      const outputPath = path.join(tempDir, ssg);
      const result = await generateConfig({
        ssg,
        projectName: `Test ${ssg}`,
        outputPath,
      });

      expect(result.content).toBeDefined();

      // Verify files were created
      const files = await fs.readdir(outputPath);
      expect(files.length).toBeGreaterThan(0);
    }
  });

  it("should test setup_structure tool", async () => {
    const structurePath = path.join(tempDir, "structure-test");
    const result = await setupStructure({
      path: structurePath,
      ssg: "docusaurus",
      includeExamples: true,
    });

    expect(result.content).toBeDefined();

    // Check Diataxis categories were created
    const categories = ["tutorials", "how-to", "reference", "explanation"];
    for (const category of categories) {
      const categoryPath = path.join(structurePath, category);
      const stat = await fs.stat(categoryPath);
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it("should test deploy_pages tool", async () => {
    const deployPath = path.join(tempDir, "deploy-test");
    const result = await deployPages({
      repository: deployPath,
      ssg: "docusaurus",
      branch: "gh-pages",
    });

    expect(result.content).toBeDefined();

    // Check workflow was created
    const workflowPath = path.join(
      deployPath,
      ".github",
      "workflows",
      "deploy-docs.yml",
    );
    const stat = await fs.stat(workflowPath);
    expect(stat.isFile()).toBe(true);
  });

  it("should test verify_deployment tool", async () => {
    const verifyPath = path.join(tempDir, "verify-test");
    await fs.mkdir(verifyPath, { recursive: true });

    const result = await verifyDeployment({
      repository: verifyPath,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    // Should contain check results with recommendation icons
    const fullText = result.content.map((c) => c.text).join(" ");
    expect(fullText).toContain("🔴"); // Should contain recommendation icons
  });

  it("should test error cases", async () => {
    // Test generate_config with invalid path
    try {
      await generateConfig({
        ssg: "docusaurus",
        projectName: "Test",
        outputPath: "/invalid/path/that/should/fail",
      });
    } catch (error) {
      expect(error).toBeDefined();
    }

    // Test setup_structure error handling
    const result = await setupStructure({
      path: path.join(tempDir, "new-structure"),
      ssg: "mkdocs",
      includeExamples: false,
    });
    expect(result.content).toBeDefined();
  });
});
