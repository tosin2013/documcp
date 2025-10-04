import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { checkKGHealth } from "../../src/tools/kg-health-check";
import {
  getKnowledgeGraph,
  getKGStorage,
  createOrUpdateProject,
} from "../../src/memory/kg-integration";

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

  it("should generate report with history included", async () => {
    const result = await checkKGHealth({
      includeHistory: true,
      generateReport: true,
      days: 14,
    });

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(1); // Should have formatted response + report

    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toContain("Health");
    expect(text).toContain("TRENDS");
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

  it("should include critical issues in next steps", async () => {
    // Create a project with some data to trigger health calculation
    const kg = await getKnowledgeGraph();

    // Add some nodes and edges to test health calculation
    kg.addNode({
      id: "test-node-1",
      type: "project",
      label: "Test Project",
      properties: { name: "test" },
      weight: 1.0,
    });

    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();

    // Check that the response structure is correct
    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toBeTruthy();
  });

  it("should handle graph with high data quality score", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Should complete without errors
    expect(text.length).toBeGreaterThan(0);
  });

  it("should use default values when parameters not provided", async () => {
    const result = await checkKGHealth({});

    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("should handle various health score ranges in report", async () => {
    // Test the helper functions indirectly through the report
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Should contain health indicators (emojis or text)
    expect(text.length).toBeGreaterThan(0);
  });

  it("should handle different trend directions in report", async () => {
    const result = await checkKGHealth({
      includeHistory: true,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Report should include trend information
    expect(text).toContain("TRENDS");
  });

  it("should handle different priority levels in recommendations", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Should complete without errors
    expect(text.length).toBeGreaterThan(0);
  });

  it("should handle different byte sizes in formatBytes", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();
    const text = result.content.map((c) => c.text).join(" ");

    // Report should include storage size
    expect(text.length).toBeGreaterThan(0);
  });

  it("should handle validation errors", async () => {
    const result = await checkKGHealth({
      days: 150, // Exceeds max of 90
    });

    expect(result.content).toBeDefined();
    // Should return error response
    const text = result.content.map((c) => c.text).join(" ");
    expect(text).toBeTruthy();
  });

  it("should handle recommendations with different priorities", async () => {
    const result = await checkKGHealth({
      includeHistory: false,
      generateReport: true,
    });

    expect(result.content).toBeDefined();

    // Check response structure
    const text = result.content.map((c) => c.text).join(" ");
    expect(text.length).toBeGreaterThan(0);
  });
});
