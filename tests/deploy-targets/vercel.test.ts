import { describe, it, expect } from "@jest/globals";
import { VercelAdapter } from "../../src/deploy-targets/vercel/index.js";
import type { DeployOptions } from "../../src/deploy-targets/types.js";

const baseOpts = (
  ssg: string,
  overrides: Partial<DeployOptions> = {},
): DeployOptions => ({
  ssg,
  branch: "main",
  buildConfig: {
    workingDirectory: null,
    buildCommand: "npm run build",
    outputPath: "./build",
    packageManager: "npm",
    nodeVersion: "20",
  },
  ...overrides,
});

describe("VercelAdapter", () => {
  const adapter = new VercelAdapter();

  describe("metadata", () => {
    it("has the correct slug", () => {
      expect(adapter.metadata.slug).toBe("vercel");
    });

    it("supports docusaurus", () => {
      expect(adapter.metadata.supportedSSGs).toContain("docusaurus");
    });

    it("supports all expected SSGs", () => {
      const expected = ["docusaurus", "hugo", "jekyll", "mkdocs", "eleventy"];
      for (const ssg of expected) {
        expect(adapter.metadata.supportedSSGs).toContain(ssg);
      }
    });
  });

  describe("generateDeploymentArtifact", () => {
    it("returns vercel.json, a workflow file, and VERCEL_SETUP.md", () => {
      const files = adapter.generateDeploymentArtifact(
        "docusaurus",
        baseOpts("docusaurus"),
      );
      const paths = files.map((f) => f.path);
      expect(paths).toContain("vercel.json");
      expect(paths).toContain(".github/workflows/deploy-vercel.yml");
      expect(paths).toContain("VERCEL_SETUP.md");
    });

    describe("vercel.json content", () => {
      it("sets correct outputDirectory for docusaurus", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus"),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.outputDirectory).toBe("build");
        expect(config.framework).toBe("docusaurus2");
      });

      it("sets correct outputDirectory for hugo", () => {
        const files = adapter.generateDeploymentArtifact(
          "hugo",
          baseOpts("hugo", {
            buildConfig: {
              workingDirectory: null,
              buildCommand: "hugo --minify",
              outputPath: "./public",
              packageManager: "npm",
            },
          }),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.outputDirectory).toBe("public");
        expect(config.framework).toBeUndefined();
      });

      it("sets correct outputDirectory for mkdocs", () => {
        const files = adapter.generateDeploymentArtifact(
          "mkdocs",
          baseOpts("mkdocs", {
            buildConfig: {
              workingDirectory: null,
              buildCommand: "mkdocs build",
              outputPath: "./site",
              packageManager: "npm",
            },
          }),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.outputDirectory).toBe("site");
      });

      it("includes rootDirectory when workingDirectory is set", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus", {
            buildConfig: {
              workingDirectory: "docs",
              buildCommand: "npm run build",
              outputPath: "./build",
              packageManager: "npm",
            },
          }),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.rootDirectory).toBe("docs");
      });

      it("includes alias when customDomain is set", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus", {
            customDomain: "docs.example.com",
          }),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.alias).toContain("docs.example.com");
      });

      it("uses yarn install command when packageManager is yarn", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus", {
            buildConfig: {
              workingDirectory: null,
              buildCommand: "yarn build",
              outputPath: "./build",
              packageManager: "yarn",
            },
          }),
        );
        const vFile = files.find((f) => f.path === "vercel.json")!;
        const config = JSON.parse(vFile.content);
        expect(config.installCommand).toContain("yarn");
      });
    });

    describe("GitHub Actions workflow content", () => {
      it("references VERCEL_TOKEN secret", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus"),
        );
        const wf = files.find(
          (f) => f.path === ".github/workflows/deploy-vercel.yml",
        )!;
        expect(wf.content).toContain("VERCEL_TOKEN");
      });

      it("deploys to production on push to main", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus"),
        );
        const wf = files.find(
          (f) => f.path === ".github/workflows/deploy-vercel.yml",
        )!;
        expect(wf.content).toContain("--prod");
        expect(wf.content).toContain("branches: [main]");
      });

      it("includes pull_request trigger for preview deployments", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus"),
        );
        const wf = files.find(
          (f) => f.path === ".github/workflows/deploy-vercel.yml",
        )!;
        expect(wf.content).toContain("pull_request");
      });

      it("generates a hugo workflow with hugo setup step", () => {
        const files = adapter.generateDeploymentArtifact(
          "hugo",
          baseOpts("hugo", {
            buildConfig: {
              workingDirectory: null,
              buildCommand: "hugo --minify",
              outputPath: "./public",
              packageManager: "npm",
            },
          }),
        );
        const wf = files.find(
          (f) => f.path === ".github/workflows/deploy-vercel.yml",
        )!;
        expect(wf.content).toContain("actions-hugo");
      });

      it("generates a python-based workflow for mkdocs", () => {
        const files = adapter.generateDeploymentArtifact(
          "mkdocs",
          baseOpts("mkdocs", {
            buildConfig: {
              workingDirectory: null,
              buildCommand: "mkdocs build",
              outputPath: "./site",
              packageManager: "npm",
            },
          }),
        );
        const wf = files.find(
          (f) => f.path === ".github/workflows/deploy-vercel.yml",
        )!;
        expect(wf.content).toContain("setup-python");
      });

      it("includes VERCEL_SETUP.md with vercel link instructions", () => {
        const files = adapter.generateDeploymentArtifact(
          "docusaurus",
          baseOpts("docusaurus"),
        );
        const setup = files.find((f) => f.path === "VERCEL_SETUP.md")!;
        expect(setup).toBeDefined();
        expect(setup.content).toContain("vercel link");
        expect(setup.content).toContain("VERCEL_TOKEN");
        expect(setup.content).toContain("VERCEL_ORG_ID");
        expect(setup.content).toContain("VERCEL_PROJECT_ID");
      });
    });
  });

  describe("optionalCliCommand", () => {
    it("returns null when invokeCliCommand is false", () => {
      const cmd = adapter.optionalCliCommand(
        baseOpts("docusaurus", { invokeCliCommand: false }),
      );
      expect(cmd).toBeNull();
    });

    it("returns vercel deploy --prod when invokeCliCommand is true", () => {
      const cmd = adapter.optionalCliCommand(
        baseOpts("docusaurus", { invokeCliCommand: true }),
      );
      expect(cmd).toContain("vercel deploy --prod");
    });

    it("includes custom domain in CLI command when set", () => {
      const cmd = adapter.optionalCliCommand(
        baseOpts("docusaurus", {
          invokeCliCommand: true,
          customDomain: "docs.example.com",
        }),
      );
      expect(cmd).toContain("docs.example.com");
    });
  });
});
