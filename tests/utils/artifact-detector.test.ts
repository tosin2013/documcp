import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  ArtifactDetector,
  detectArtifacts,
  DEFAULT_CONFIG,
} from "../../src/utils/artifact-detector.js";

describe("ArtifactDetector", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `artifact-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("File Pattern Detection", () => {
    it("should detect TODO.md files", async () => {
      const todoPath = path.join(testDir, "TODO.md");
      await fs.writeFile(todoPath, "# TODO\n- Task 1\n- Task 2");

      const result = await detectArtifacts(testDir);

      expect(result.artifacts.length).toBeGreaterThan(0);
      const todoArtifact = result.artifacts.find((a) =>
        a.path.includes("TODO.md"),
      );
      expect(todoArtifact).toBeDefined();
      expect(todoArtifact?.type).toBe("file");
      expect(todoArtifact?.category).toBe("planning");
      expect(todoArtifact?.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("should detect PLAN.md files", async () => {
      const planPath = path.join(testDir, "PLAN.md");
      await fs.writeFile(planPath, "# Implementation Plan\nStep 1: ...");

      const result = await detectArtifacts(testDir);

      const planArtifact = result.artifacts.find((a) =>
        a.path.includes("PLAN.md"),
      );
      expect(planArtifact).toBeDefined();
      expect(planArtifact?.category).toBe("planning");
    });

    it("should detect NOTES.md files", async () => {
      const notesPath = path.join(testDir, "NOTES.md");
      await fs.writeFile(notesPath, "# Notes\nSome notes here");

      const result = await detectArtifacts(testDir);

      const notesArtifact = result.artifacts.find((a) =>
        a.path.includes("NOTES.md"),
      );
      expect(notesArtifact).toBeDefined();
      expect(notesArtifact?.category).toBe("documentation");
    });

    it("should detect SCRATCH.md files", async () => {
      const scratchPath = path.join(testDir, "SCRATCH.md");
      await fs.writeFile(scratchPath, "# Scratch\nScratch work here");

      const result = await detectArtifacts(testDir);

      const scratchArtifact = result.artifacts.find((a) =>
        a.path.includes("SCRATCH.md"),
      );
      expect(scratchArtifact).toBeDefined();
      expect(scratchArtifact?.category).toBe("planning");
    });

    it("should detect AGENT-*.md pattern files", async () => {
      const agentPath = path.join(testDir, "AGENT-TEMP.md");
      await fs.writeFile(agentPath, "# Agent temp file");

      const result = await detectArtifacts(testDir);

      const agentArtifact = result.artifacts.find((a) =>
        a.path.includes("AGENT-TEMP.md"),
      );
      expect(agentArtifact).toBeDefined();
    });

    it("should detect *.agent.md pattern files", async () => {
      const agentPath = path.join(testDir, "notes.agent.md");
      await fs.writeFile(agentPath, "# Agent notes");

      const result = await detectArtifacts(testDir);

      const agentArtifact = result.artifacts.find((a) =>
        a.path.includes("notes.agent.md"),
      );
      expect(agentArtifact).toBeDefined();
    });

    it("should not detect regular files", async () => {
      const readmePath = path.join(testDir, "README.md");
      await fs.writeFile(readmePath, "# Regular README");

      const result = await detectArtifacts(testDir);

      const readmeArtifact = result.artifacts.find((a) =>
        a.path.includes("README.md"),
      );
      expect(readmeArtifact).toBeUndefined();
    });
  });

  describe("Directory Detection", () => {
    it("should detect .claude directory", async () => {
      const claudeDir = path.join(testDir, ".claude");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, "state.json"), "{}");

      const result = await detectArtifacts(testDir);

      const claudeArtifact = result.artifacts.find((a) =>
        a.path.includes(".claude"),
      );
      expect(claudeArtifact).toBeDefined();
      expect(claudeArtifact?.type).toBe("directory");
      expect(claudeArtifact?.category).toBe("state");
      expect(claudeArtifact?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should detect .cursor directory", async () => {
      const cursorDir = path.join(testDir, ".cursor");
      await fs.mkdir(cursorDir, { recursive: true });

      const result = await detectArtifacts(testDir);

      const cursorArtifact = result.artifacts.find((a) =>
        a.path.includes(".cursor"),
      );
      expect(cursorArtifact).toBeDefined();
      expect(cursorArtifact?.category).toBe("state");
    });

    it("should detect .aider directory", async () => {
      const aiderDir = path.join(testDir, ".aider");
      await fs.mkdir(aiderDir, { recursive: true });

      const result = await detectArtifacts(testDir);

      const aiderArtifact = result.artifacts.find((a) =>
        a.path.includes(".aider"),
      );
      expect(aiderArtifact).toBeDefined();
      expect(aiderArtifact?.category).toBe("state");
    });

    it("should detect multiple agent directories", async () => {
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });
      await fs.mkdir(path.join(testDir, ".cursor"), { recursive: true });
      await fs.mkdir(path.join(testDir, ".copilot"), { recursive: true });

      const result = await detectArtifacts(testDir);

      const dirArtifacts = result.artifacts.filter((a) => a.type === "directory");
      expect(dirArtifacts.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Inline Marker Detection", () => {
    it("should detect // @agent-temp markers", async () => {
      const filePath = path.join(testDir, "test.ts");
      const content = `
function test() {
  // @agent-temp
  console.log("Temporary debug");
}
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const inlineArtifact = result.artifacts.find(
        (a) => a.type === "inline-comment",
      );
      expect(inlineArtifact).toBeDefined();
      expect(inlineArtifact?.confidence).toBeGreaterThanOrEqual(0.8);
      expect(inlineArtifact?.context).toContain("@agent-temp");
    });

    it("should detect // TODO(agent): markers", async () => {
      const filePath = path.join(testDir, "test.js");
      const content = `
function process() {
  // TODO(agent): Fix this later
  return null;
}
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const todoArtifact = result.artifacts.find((a) =>
        a.detectedBy.includes("TODO(agent)"),
      );
      expect(todoArtifact).toBeDefined();
      expect(todoArtifact?.category).toBe("planning");
    });

    it("should detect # AGENT-NOTE: markers in Python", async () => {
      const filePath = path.join(testDir, "test.py");
      const content = `
def process():
    # AGENT-NOTE: This needs review
    return None
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const noteArtifact = result.artifacts.find((a) =>
        a.detectedBy.includes("AGENT-NOTE"),
      );
      expect(noteArtifact).toBeDefined();
    });

    it("should detect <!-- agent:ephemeral --> in HTML", async () => {
      const filePath = path.join(testDir, "test.html");
      const content = `
<div>
  <!-- agent:ephemeral -->
  <p>Temporary content</p>
</div>
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const htmlArtifact = result.artifacts.find((a) =>
        a.detectedBy.includes("agent:ephemeral"),
      );
      expect(htmlArtifact).toBeDefined();
    });

    it("should provide context for inline markers", async () => {
      const filePath = path.join(testDir, "test.ts");
      const content = `
function beforeLine() {
  return 1;
}
// TODO(agent): Fix this
function markedFunction() {
  return 2;
}
function afterLine() {
  return 3;
}
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find(
        (a) => a.type === "inline-comment",
      );
      expect(artifact?.context).toBeTruthy();
      // Should include context lines
      expect(artifact?.context).toContain("TODO(agent)");
    });
  });

  describe("Block Pattern Detection", () => {
    it("should detect /* AGENT-START */ block patterns", async () => {
      const filePath = path.join(testDir, "test.js");
      const content = `
function test() {
  /* AGENT-START
   * Temporary block
   * AGENT-END */
  console.log("code");
}
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const blockArtifact = result.artifacts.find(
        (a) => a.type === "block-comment",
      );
      expect(blockArtifact).toBeDefined();
      expect(blockArtifact?.category).toBe("temporary");
      expect(blockArtifact?.recommendation).toBe("delete");
    });

    it("should detect // @agent-temp-start block patterns", async () => {
      const filePath = path.join(testDir, "test.ts");
      const content = `
function test() {
  // @agent-temp-start
  console.log("temp code");
  // @agent-temp-end
}
`;
      await fs.writeFile(filePath, content);

      const result = await detectArtifacts(testDir);

      const blockArtifact = result.artifacts.find(
        (a) => a.type === "block-comment",
      );
      expect(blockArtifact).toBeDefined();
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign high confidence to exact matches", async () => {
      const todoPath = path.join(testDir, "TODO.md");
      await fs.writeFile(todoPath, "# TODO");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find((a) =>
        a.path.includes("TODO.md"),
      );
      expect(artifact?.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should assign medium confidence to inline markers", async () => {
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// TODO(agent): Fix\nfunction test() {}");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find(
        (a) => a.type === "inline-comment",
      );
      expect(artifact?.confidence).toBeGreaterThanOrEqual(0.7);
      expect(artifact?.confidence).toBeLessThan(0.95);
    });
  });

  describe("Recommendation Logic", () => {
    it("should recommend delete for high-confidence temporary artifacts", async () => {
      const detector = new ArtifactDetector(testDir, {
        autoDeleteThreshold: 0.9,
      });

      const scratchPath = path.join(testDir, "SCRATCH.md");
      await fs.writeFile(scratchPath, "# Scratch");

      const result = await detector.scan();

      const artifact = result.artifacts.find((a) =>
        a.path.includes("SCRATCH.md"),
      );
      expect(artifact?.confidence).toBeGreaterThanOrEqual(0.9);
      // Should recommend delete or archive based on category
      expect(["delete", "archive"]).toContain(artifact?.recommendation);
    });

    it("should recommend review for medium-confidence artifacts", async () => {
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// TODO(agent): Fix\ncode();");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find(
        (a) => a.type === "inline-comment",
      );
      expect(artifact?.recommendation).toBe("review");
    });
  });

  describe("Summary Generation", () => {
    it("should generate accurate summary statistics", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.writeFile(path.join(testDir, "PLAN.md"), "# Plan");
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });

      const result = await detectArtifacts(testDir);

      expect(result.summary.totalArtifacts).toBeGreaterThanOrEqual(3);
      expect(result.summary.byCategory).toBeDefined();
      expect(result.summary.byRecommendation).toBeDefined();
    });

    it("should count artifacts by category", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      await fs.writeFile(path.join(testDir, "NOTES.md"), "# Notes");
      await fs.mkdir(path.join(testDir, ".claude"), { recursive: true });

      const result = await detectArtifacts(testDir);

      expect(result.summary.byCategory["planning"]).toBeGreaterThan(0);
      expect(result.summary.byCategory["state"]).toBeGreaterThan(0);
    });

    it("should count artifacts by recommendation", async () => {
      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// TODO(agent): Fix");

      const result = await detectArtifacts(testDir);

      expect(result.summary.byRecommendation).toBeDefined();
      const totalRecs = Object.values(result.summary.byRecommendation).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalRecs).toBe(result.summary.totalArtifacts);
    });
  });

  describe("Custom Configuration", () => {
    it("should respect custom file patterns", async () => {
      const customPath = path.join(testDir, "CUSTOM.md");
      await fs.writeFile(customPath, "# Custom");

      const config = {
        patterns: {
          ...DEFAULT_CONFIG.patterns,
          files: [...DEFAULT_CONFIG.patterns.files, "CUSTOM.md"],
        },
      };

      const result = await detectArtifacts(testDir, config);

      const artifact = result.artifacts.find((a) =>
        a.path.includes("CUSTOM.md"),
      );
      expect(artifact).toBeDefined();
    });

    it("should respect custom directory patterns", async () => {
      const customDir = path.join(testDir, ".custom-agent");
      await fs.mkdir(customDir, { recursive: true });

      const config = {
        patterns: {
          ...DEFAULT_CONFIG.patterns,
          directories: [...DEFAULT_CONFIG.patterns.directories, ".custom-agent"],
        },
      };

      const result = await detectArtifacts(testDir, config);

      const artifact = result.artifacts.find((a) =>
        a.path.includes(".custom-agent"),
      );
      expect(artifact).toBeDefined();
    });

    it("should respect custom inline markers", async () => {
      const filePath = path.join(testDir, "test.ts");
      await fs.writeFile(filePath, "// CUSTOM-MARKER: test");

      const config = {
        patterns: {
          ...DEFAULT_CONFIG.patterns,
          inlineMarkers: [
            ...DEFAULT_CONFIG.patterns.inlineMarkers,
            "// CUSTOM-MARKER:",
          ],
        },
      };

      const result = await detectArtifacts(testDir, config);

      const artifact = result.artifacts.find((a) =>
        a.detectedBy.includes("CUSTOM-MARKER"),
      );
      expect(artifact).toBeDefined();
    });

    it("should respect autoDeleteThreshold", async () => {
      const detector = new ArtifactDetector(testDir, {
        autoDeleteThreshold: 0.95,
      });

      await fs.writeFile(path.join(testDir, "TODO.md"), "# TODO");

      const result = await detector.scan();

      // With high threshold, fewer artifacts should be recommended for deletion
      expect(result).toBeDefined();
    });
  });

  describe("Exclusion Patterns", () => {
    it("should exclude node_modules by default", async () => {
      const nodeModules = path.join(testDir, "node_modules");
      await fs.mkdir(nodeModules, { recursive: true });
      await fs.writeFile(path.join(nodeModules, "TODO.md"), "# TODO");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find((a) =>
        a.path.includes("node_modules"),
      );
      expect(artifact).toBeUndefined();
    });

    it("should exclude .git by default", async () => {
      const gitDir = path.join(testDir, ".git");
      await fs.mkdir(gitDir, { recursive: true });
      await fs.writeFile(path.join(gitDir, "TODO.md"), "# TODO");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find((a) => a.path.includes(".git"));
      expect(artifact).toBeUndefined();
    });

    it("should exclude dist by default", async () => {
      const distDir = path.join(testDir, "dist");
      await fs.mkdir(distDir, { recursive: true });
      await fs.writeFile(path.join(distDir, "TODO.md"), "# TODO");

      const result = await detectArtifacts(testDir);

      const artifact = result.artifacts.find((a) => a.path.includes("dist"));
      expect(artifact).toBeUndefined();
    });
  });

  describe("Scanned Files Count", () => {
    it("should count scanned files", async () => {
      await fs.writeFile(path.join(testDir, "test1.ts"), "code();");
      await fs.writeFile(path.join(testDir, "test2.js"), "code();");
      await fs.writeFile(path.join(testDir, "test3.py"), "code()");

      const result = await detectArtifacts(testDir);

      expect(result.scannedFiles).toBeGreaterThan(0);
    });
  });
});
