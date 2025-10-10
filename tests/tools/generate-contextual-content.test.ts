/**
 * Contextual Content Generator Tests (Phase 3)
 */

import { handleGenerateContextualContent } from "../../src/tools/generate-contextual-content.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("generate_contextual_content tool", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "content-gen-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Reference Documentation", () => {
    test("should generate function reference documentation", async () => {
      const sourceCode = `
/**
 * Calculates the sum of two numbers
 * @param a First number
 * @param b Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Multiplies two numbers
 */
export async function multiply(x: number, y: number): Promise<number> {
  return x * y;
}
      `.trim();

      const filePath = join(tempDir, "math.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        includeExamples: true,
        style: "detailed",
        outputFormat: "markdown",
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.sections).toBeDefined();

      const sections = data.data.sections;
      const functionRef = sections.find((s: any) =>
        s.title.includes("Function Reference"),
      );

      expect(functionRef).toBeDefined();
      expect(functionRef.content).toContain("add");
      expect(functionRef.content).toContain("multiply");
      expect(functionRef.category).toBe("reference");
    });

    test("should generate class reference documentation", async () => {
      const sourceCode = `
/**
 * Calculator class for math operations
 */
export class Calculator {
  private value: number = 0;

  /**
   * Adds a number to the current value
   */
  public add(n: number): void {
    this.value += n;
  }

  /**
   * Gets the current value
   */
  public getValue(): number {
    return this.value;
  }
}
      `.trim();

      const filePath = join(tempDir, "calculator.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        style: "detailed",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      const classRef = sections.find((s: any) =>
        s.title.includes("Class Reference"),
      );

      expect(classRef).toBeDefined();
      expect(classRef.content).toContain("Calculator");
      expect(classRef.content).toContain("add");
      expect(classRef.content).toContain("getValue");
    });

    test("should generate interface reference documentation", async () => {
      const sourceCode = `
/**
 * User interface
 */
export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  getProfile(): Promise<Profile>;
}

export interface Profile {
  bio: string;
  avatar: string;
}
      `.trim();

      const filePath = join(tempDir, "user.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        style: "detailed",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      const interfaceRef = sections.find((s: any) =>
        s.title.includes("Interface Reference"),
      );

      expect(interfaceRef).toBeDefined();
      expect(interfaceRef.content).toContain("User");
      expect(interfaceRef.content).toContain("Profile");
    });
  });

  describe("Tutorial Documentation", () => {
    test("should generate getting started tutorial", async () => {
      const sourceCode = `
export function initialize(config: object): void {
  console.log("Initialized with", config);
}

export function process(data: string): string {
  return data.toUpperCase();
}
      `.trim();

      const filePath = join(tempDir, "api.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "tutorial",
        includeExamples: true,
        style: "detailed",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      const tutorial = sections.find((s: any) =>
        s.title.includes("Getting Started"),
      );

      expect(tutorial).toBeDefined();
      expect(tutorial.category).toBe("tutorial");
      expect(tutorial.content).toContain("Installation");
      expect(tutorial.content).toContain("Usage");
    });

    test("should include code examples in tutorials", async () => {
      const sourceCode = `
export function setupDatabase(connectionString: string): void {
  // Setup code
}
      `.trim();

      const filePath = join(tempDir, "db.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "tutorial",
        includeExamples: true,
      });

      const data = JSON.parse(result.content[0].text);
      const tutorial = data.data.sections[0];

      expect(tutorial.content).toContain("```");
      expect(tutorial.content).toContain("setupDatabase");
    });
  });

  describe("How-To Documentation", () => {
    test("should generate async operations how-to", async () => {
      const sourceCode = `
export async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return response.json();
}

export async function saveData(data: any): Promise<void> {
  // Save logic
}
      `.trim();

      const filePath = join(tempDir, "async.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "how-to",
        includeExamples: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      const asyncHowTo = sections.find((s: any) => s.title.includes("Async"));

      expect(asyncHowTo).toBeDefined();
      expect(asyncHowTo.category).toBe("how-to");
      expect(asyncHowTo.content).toContain("async");
    });

    test("should generate class usage how-to", async () => {
      const sourceCode = `
export class DataProcessor {
  public process(input: string): string {
    return input.trim();
  }

  public async asyncProcess(input: string): Promise<string> {
    return this.process(input);
  }
}
      `.trim();

      const filePath = join(tempDir, "processor.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "how-to",
        includeExamples: true,
      });

      const data = JSON.parse(result.content[0].text);
      const sections = data.data.sections;
      const classHowTo = sections.find((s: any) => s.title.includes("Class"));

      expect(classHowTo).toBeDefined();
      expect(classHowTo.content).toContain("DataProcessor");
    });
  });

  describe("Explanation Documentation", () => {
    test("should generate architecture explanation", async () => {
      const sourceCode = `
export class ComplexSystem {
  private state: any = {};

  public initialize(): void {}
  public update(): void {}
  public render(): void {}
}

export function createSystem(): ComplexSystem {
  return new ComplexSystem();
}
      `.trim();

      const filePath = join(tempDir, "system.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "explanation",
        style: "detailed",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      const explanation = sections.find((s: any) =>
        s.title.includes("Architecture"),
      );

      expect(explanation).toBeDefined();
      expect(explanation.category).toBe("explanation");
    });
  });

  describe("All Documentation Types", () => {
    test("should generate all Diataxis categories", async () => {
      const sourceCode = `
export async function apiFunction(param: string): Promise<void> {
  console.log(param);
}
      `.trim();

      const filePath = join(tempDir, "complete.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "all",
        includeExamples: true,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);

      const sections = data.data.sections;
      expect(sections.length).toBeGreaterThan(1);

      const categories = new Set(sections.map((s: any) => s.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe("Output Formats", () => {
    test("should generate markdown format", async () => {
      const sourceCode = `export function test(): void {}`;
      const filePath = join(tempDir, "markdown.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        outputFormat: "markdown",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.sections[0].content).toContain("#");
    });

    test("should support different output formats", async () => {
      const sourceCode = `export function test(): void {}`;
      const filePath = join(tempDir, "formats.ts");
      await fs.writeFile(filePath, sourceCode);

      const formats = ["markdown", "mdx", "html"];

      for (const format of formats) {
        const result = await handleGenerateContextualContent({
          filePath,
          documentationType: "reference",
          outputFormat: format as any,
        });

        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
      }
    });
  });

  describe("Documentation Styles", () => {
    test("should generate concise documentation", async () => {
      const sourceCode = `
export function shortDoc(a: number, b: number): number {
  return a + b;
}
      `.trim();

      const filePath = join(tempDir, "concise.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        style: "concise",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });

    test("should generate detailed documentation", async () => {
      const sourceCode = `
export function detailedDoc(param: string): void {
  console.log(param);
}
      `.trim();

      const filePath = join(tempDir, "detailed.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        style: "detailed",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });

    test("should generate verbose documentation", async () => {
      const sourceCode = `
export function verboseDoc(): void {}
      `.trim();

      const filePath = join(tempDir, "verbose.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        style: "verbose",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });
  });

  describe("Code Examples", () => {
    test("should include code examples when requested", async () => {
      const sourceCode = `
export function exampleFunction(x: number): number {
  return x * 2;
}
      `.trim();

      const filePath = join(tempDir, "examples.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "tutorial",
        includeExamples: true,
      });

      const data = JSON.parse(result.content[0].text);
      const tutorial = data.data.sections[0];

      expect(tutorial.content).toContain("```");
    });

    test("should skip code examples when not requested", async () => {
      const sourceCode = `
export function noExamples(): void {}
      `.trim();

      const filePath = join(tempDir, "no-examples.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
        includeExamples: false,
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
    });
  });

  describe("Metadata and Confidence", () => {
    test("should include metadata about generated content", async () => {
      const sourceCode = `
export function metadataTest(): void {}
export class MetadataClass {}
      `.trim();

      const filePath = join(tempDir, "metadata.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.metadata).toBeDefined();
      expect(data.data.metadata.codeAnalysis).toBeDefined();
      expect(data.data.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(data.data.metadata.confidence).toBeLessThanOrEqual(100);
    });

    test("should track code analysis metrics", async () => {
      const sourceCode = `
export function func1(): void {}
export function func2(): void {}
export class Class1 {}
export interface Interface1 {}
      `.trim();

      const filePath = join(tempDir, "metrics.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
      });

      const data = JSON.parse(result.content[0].text);
      const metrics = data.data.metadata.codeAnalysis;

      expect(metrics.functions).toBe(2);
      expect(metrics.classes).toBe(1);
      expect(metrics.interfaces).toBe(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid file path", async () => {
      const result = await handleGenerateContextualContent({
        filePath: "/nonexistent/file.ts",
        documentationType: "reference",
      });

      expect(result).toBeDefined();
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test("should handle unsupported file types", async () => {
      const filePath = join(tempDir, "unsupported.txt");
      await fs.writeFile(filePath, "Not a code file");

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
      });

      expect(result).toBeDefined();
      const data = JSON.parse(result.content[0].text);

      // Should either fail or return empty results
      expect(data).toBeDefined();
    });

    test("should handle empty files", async () => {
      const filePath = join(tempDir, "empty.ts");
      await fs.writeFile(filePath, "");

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.data.metadata.codeAnalysis.functions).toBe(0);
    });
  });

  describe("Recommendations and Next Steps", () => {
    test("should provide recommendations", async () => {
      const sourceCode = `export function test(): void {}`;
      const filePath = join(tempDir, "recs.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "all",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.recommendations)).toBe(true);
    });

    test("should provide next steps", async () => {
      const sourceCode = `export function test(): void {}`;
      const filePath = join(tempDir, "steps.ts");
      await fs.writeFile(filePath, sourceCode);

      const result = await handleGenerateContextualContent({
        filePath,
        documentationType: "reference",
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.nextSteps).toBeDefined();
      expect(Array.isArray(data.nextSteps)).toBe(true);
      expect(data.nextSteps.length).toBeGreaterThan(0);
    });
  });
});
