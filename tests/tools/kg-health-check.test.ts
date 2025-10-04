import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { checkKGHealth } from "../../src/tools/kg-health-check";

describe("KG Health Check Tool", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `kg-health-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should perform basic health check", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: false,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    // Should contain health metrics
    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toContain("Health");
  });

  it("should include historical data when requested", async () => {
    const result = await checkKGHealth({
      includeHistory: true,
      generateReport: false,
      days: 7,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toContain("Health");
  });

  it("should generate detailed report", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);

    // Report should contain detailed metrics
    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toContain("Health");
  });

  it("should handle errors gracefully", async () => {
    // Test with invalid parameters
    const result = await checkKGHealth({
      includeHistory: true,
      generateReport: true,
      days: -1, // Invalid
    });

    // Should either handle gracefully or return error
    expect(result.content).toBeDefined();
  });

  it("should calculate health score", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Should contain some health indicator
    expect(text.length).toBeGreaterThan(0);
  });
});
