import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs/promises";
import * as path from "path";
import { deployPages } from "../../src/tools/deploy-pages.js";

/**
 * formatMCPResponse flattens success responses:
 *   content[0].text = JSON.stringify(response.data)
 * Error responses include the full MCPToolResponse:
 *   content[0].text = JSON.stringify({ success: false, error: { ... } })
 */
function parseSuccess(result: { content: any[] }) {
  return JSON.parse(result.content[0].text);
}

function parseError(result: { content: any[] }) {
  return JSON.parse(result.content[0].text);
}

function allText(result: { content: any[] }): string {
  return result.content.map((c: any) => c.text ?? "").join("\n");
}

describe("deploy_site (deployPages with target param)", () => {
  const testTempDir = path.join(__dirname, "../../.tmp/test-deploy-site");

  beforeEach(async () => {
    await fs.mkdir(testTempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testTempDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  describe("target=github-pages (default)", () => {
    it("defaults to github-pages when target is not specified", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
      });
      const data = parseSuccess(result);
      expect(data.target).toBe("github-pages");
    });

    it("generates the GH Pages workflow file", async () => {
      await deployPages({ repository: testTempDir, ssg: "docusaurus" });
      const workflowPath = path.join(
        testTempDir,
        ".github/workflows/deploy-docs.yml",
      );
      const content = await fs.readFile(workflowPath, "utf-8");
      expect(content).toContain("actions/deploy-pages");
      expect(content).not.toContain("VERCEL_TOKEN");
    });

    it("lists the workflow path in generatedFiles", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "jekyll",
      });
      const data = parseSuccess(result);
      expect(data.generatedFiles).toContain(
        ".github/workflows/deploy-docs.yml",
      );
    });

    it("creates CNAME file when customDomain is provided", async () => {
      await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        customDomain: "docs.example.com",
      });
      const cname = await fs.readFile(path.join(testTempDir, "CNAME"), "utf-8");
      expect(cname).toBe("docs.example.com");
    });
  });

  describe("target=vercel", () => {
    it("generates vercel.json when target=vercel", async () => {
      await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        target: "vercel",
      });
      const content = await fs.readFile(
        path.join(testTempDir, "vercel.json"),
        "utf-8",
      );
      const config = JSON.parse(content);
      expect(config.outputDirectory).toBe("build");
      expect(config.framework).toBe("docusaurus2");
    });

    it("generates a Vercel workflow file when target=vercel", async () => {
      await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        target: "vercel",
      });
      const workflowPath = path.join(
        testTempDir,
        ".github/workflows/deploy-docs.yml",
      );
      const content = await fs.readFile(workflowPath, "utf-8");
      expect(content).toContain("VERCEL_TOKEN");
      expect(content).not.toContain("actions/deploy-pages");
    });

    it("sets target=vercel in response data", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        target: "vercel",
      });
      const data = parseSuccess(result);
      expect(data.target).toBe("vercel");
    });

    it("lists both vercel.json and workflow in generatedFiles", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        target: "vercel",
      });
      const data = parseSuccess(result);
      expect(data.generatedFiles).toContain("vercel.json");
      expect(data.generatedFiles).toContain(
        ".github/workflows/deploy-docs.yml",
      );
    });

    it("includes Vercel secrets setup in next steps output", async () => {
      const result = await deployPages({
        repository: testTempDir,
        ssg: "docusaurus",
        target: "vercel",
      });
      // nextSteps are rendered as a separate text block in the content array
      const fullText = allText(result);
      expect(fullText).toContain("VERCEL_TOKEN");
    });

    it("works with hugo SSG", async () => {
      await deployPages({
        repository: testTempDir,
        ssg: "hugo",
        target: "vercel",
      });
      const content = await fs.readFile(
        path.join(testTempDir, "vercel.json"),
        "utf-8",
      );
      const config = JSON.parse(content);
      expect(config.outputDirectory).toBe("public");
    });
  });

  describe("input validation", () => {
    it("rejects invalid target values", async () => {
      await expect(
        deployPages({
          repository: testTempDir,
          ssg: "docusaurus",
          target: "netlify",
        }),
      ).rejects.toThrow();
    });

    it("rejects missing repository", async () => {
      await expect(deployPages({ ssg: "docusaurus" })).rejects.toThrow();
    });

    it("returns error when ssg not provided and no analysisId", async () => {
      const result = await deployPages({ repository: testTempDir });
      const err = parseError(result);
      expect(err.success).toBe(false);
      expect(err.error.code).toBe("SSG_NOT_SPECIFIED");
    });
  });
});
