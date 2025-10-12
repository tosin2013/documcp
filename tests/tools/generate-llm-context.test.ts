import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  generateLLMContext,
  setToolDefinitions,
  GenerateLLMContextInputSchema,
} from "../../src/tools/generate-llm-context.js";
import { z } from "zod";

describe("generate_llm_context", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "generate-llm-context-"));

    // Set up mock tool definitions
    const mockTools = [
      {
        name: "analyze_repository",
        description: "Analyze repository structure and dependencies",
        inputSchema: z.object({
          path: z.string(),
          depth: z.enum(["quick", "standard", "deep"]).optional(),
        }),
      },
      {
        name: "recommend_ssg",
        description: "Recommend static site generator",
        inputSchema: z.object({
          analysisId: z.string(),
          userId: z.string().optional(),
        }),
      },
      {
        name: "sync_code_to_docs",
        description: "Synchronize code with documentation",
        inputSchema: z.object({
          projectPath: z.string(),
          docsPath: z.string(),
          mode: z.enum(["detect", "preview", "apply", "auto"]).optional(),
        }),
      },
    ];
    setToolDefinitions(mockTools);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("Basic Generation", () => {
    it("should generate LLM context file with default options", async () => {
      const result = await generateLLMContext({
        projectPath: tmpDir,
      });

      // Check result structure
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain("path");

      // Check file exists
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Check file content
      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("# DocuMCP LLM Context Reference");
      expect(content).toContain("analyze_repository");
      expect(content).toContain("recommend_ssg");
      expect(content).toContain("sync_code_to_docs");
    });

    it("should include examples when requested", async () => {
      await generateLLMContext({
        projectPath: tmpDir,
        includeExamples: true,
      });

      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("**Example**:");
      expect(content).toContain("```typescript");
    });

    it("should generate concise format", async () => {
      await generateLLMContext({
        projectPath: tmpDir,
        format: "concise",
        includeExamples: false,
      });

      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("# DocuMCP LLM Context Reference");
      expect(content).not.toContain("**Parameters**:");
    });

    it("should generate detailed format with parameters", async () => {
      await generateLLMContext({
        projectPath: tmpDir,
        format: "detailed",
      });

      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("# DocuMCP LLM Context Reference");
      expect(content).toContain("**Parameters**:");
    });
  });

  describe("Content Sections", () => {
    it("should include overview section", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("## Overview");
      expect(content).toContain("DocuMCP is an intelligent MCP server");
    });

    it("should include core tools section", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("## Core Documentation Tools");
    });

    it("should include Phase 3 tools section", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain(
        "## Phase 3: Code-to-Docs Synchronization Tools",
      );
      expect(content).toContain("sync_code_to_docs");
    });

    it("should include memory system section", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("## Memory Knowledge Graph System");
      expect(content).toContain("### Entity Types");
      expect(content).toContain("### Relationship Types");
    });

    it("should include workflows section", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("## Common Workflows");
      expect(content).toContain("### 1. New Documentation Site Setup");
    });

    it("should include quick reference table", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("## Quick Reference Table");
      expect(content).toContain("| Tool | Primary Use |");
    });
  });

  describe("Input Validation", () => {
    it("should validate input schema", () => {
      expect(() => {
        GenerateLLMContextInputSchema.parse({
          projectPath: "/test/path",
          includeExamples: true,
          format: "detailed",
        });
      }).not.toThrow();
    });

    it("should use default values for optional fields", () => {
      const result = GenerateLLMContextInputSchema.parse({
        projectPath: "/test/path",
      });
      expect(result.projectPath).toBe("/test/path");
      expect(result.includeExamples).toBe(true);
      expect(result.format).toBe("detailed");
    });

    it("should require projectPath", () => {
      expect(() => {
        GenerateLLMContextInputSchema.parse({});
      }).toThrow();
    });

    it("should reject invalid format", () => {
      expect(() => {
        GenerateLLMContextInputSchema.parse({
          projectPath: "/test/path",
          format: "invalid",
        });
      }).toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle write errors gracefully", async () => {
      const invalidPath = "/invalid/path/that/does/not/exist";
      const result = await generateLLMContext({
        projectPath: invalidPath,
      });

      expect(result.content[0].text).toContain("GENERATION_ERROR");
      expect(result.isError).toBe(true);
    });
  });

  describe("File Output", () => {
    it("should create LLM_CONTEXT.md in project root", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const fileExists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it("should overwrite existing file", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");

      // Write first time
      await generateLLMContext({ projectPath: tmpDir });
      const firstContent = await fs.readFile(outputPath, "utf-8");

      // Wait a moment to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Write second time
      await generateLLMContext({ projectPath: tmpDir });
      const secondContent = await fs.readFile(outputPath, "utf-8");

      // Content should be different (timestamp changed)
      expect(firstContent).not.toEqual(secondContent);
    });

    it("should report correct file stats", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      const result = await generateLLMContext({ projectPath: tmpDir });

      const data = JSON.parse(result.content[0].text);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalTools).toBe(3);
      expect(data.stats.fileSize).toBeGreaterThan(0);
      expect(data.stats.sections).toBeInstanceOf(Array);
    });
  });

  describe("Tool Extraction", () => {
    it("should extract tool names correctly", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("`analyze_repository`");
      expect(content).toContain("`recommend_ssg`");
      expect(content).toContain("`sync_code_to_docs`");
    });

    it("should extract tool descriptions", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir });

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain(
        "Analyze repository structure and dependencies",
      );
      expect(content).toContain("Recommend static site generator");
    });

    it("should handle tools with no examples", async () => {
      const outputPath = path.join(tmpDir, "LLM_CONTEXT.md");
      await generateLLMContext({ projectPath: tmpDir, includeExamples: true });

      const content = await fs.readFile(outputPath, "utf-8");
      // recommend_ssg doesn't have an example defined
      const ssgSection = content.match(
        /### `recommend_ssg`[\s\S]*?(?=###|$)/,
      )?.[0];
      expect(ssgSection).toBeDefined();
    });
  });
});
