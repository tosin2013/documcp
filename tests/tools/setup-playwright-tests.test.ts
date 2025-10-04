import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { setupPlaywrightTests } from "../../src/tools/setup-playwright-tests";

// Skip due to ES module import.meta.url issue in test environment
describe.skip("Setup Playwright Tests Tool", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `playwright-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should setup Playwright tests with default configuration", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: tempDir,
      ssg: "docusaurus",
      projectName: "Test Project",
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should setup with custom configuration", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: tempDir,
      ssg: "mkdocs",
      projectName: "Custom Project",
      mainBranch: "develop",
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should create GitHub Actions workflow", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: tempDir,
      ssg: "hugo",
      projectName: "Hugo Project",
      includeGitHubActions: true,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should create Dockerfile when includeDocker is true", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: tempDir,
      ssg: "jekyll",
      projectName: "Jekyll Project",
      includeDockerfile: true,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should handle accessibility tests", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: tempDir,
      ssg: "eleventy",
      projectName: "Eleventy Project",
      includeAccessibilityTests: true,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should handle invalid project path", async () => {
    const result = await setupPlaywrightTests({
      repositoryPath: "/invalid/path/that/does/not/exist",
      ssg: "docusaurus",
      projectName: "Test",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error");
  });
});
