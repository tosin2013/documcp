/**
 * Tests for Knowledge Graph Code Integration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import {
  createCodeFileEntities,
  createDocumentationEntities,
  linkCodeToDocs,
} from "../../src/memory/kg-code-integration.js";
import { ExtractedContent } from "../../src/utils/content-extractor.js";
import {
  initializeKnowledgeGraph,
  getKnowledgeGraph,
} from "../../src/memory/kg-integration.js";

describe("KG Code Integration", () => {
  let testDir: string;
  let projectId: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    testDir = path.join(tmpdir(), `documcp-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    projectId = `project:test_${Date.now()}`;

    // Initialize KG with test storage
    const storageDir = path.join(testDir, ".documcp/memory");
    await initializeKnowledgeGraph(storageDir);
  });

  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createCodeFileEntities", () => {
    it("should create code file entities from TypeScript files", async () => {
      // Create a test TypeScript file
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });

      const tsContent = `
export class UserService {
  async getUser(id: string) {
    return { id, name: "Test User" };
  }

  async createUser(data: any) {
    return { ...data, id: "123" };
  }
}

export async function validateUser(user: any) {
  return user.name && user.id;
}
`;

      await fs.writeFile(path.join(srcDir, "user.ts"), tsContent, "utf-8");

      // Create entities
      const entities = await createCodeFileEntities(projectId, testDir);

      // Assertions
      expect(entities.length).toBe(1);
      expect(entities[0].type).toBe("code_file");
      expect(entities[0].properties.language).toBe("typescript");
      expect(entities[0].properties.path).toBe("src/user.ts");
      expect(entities[0].properties.classes).toContain("UserService");
      expect(entities[0].properties.functions).toContain("validateUser");
      expect(entities[0].properties.contentHash).toBeDefined();
      expect(entities[0].properties.linesOfCode).toBeGreaterThan(0);
    });

    it("should create code file entities from Python files", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });

      const pyContent = `
class Database:
    def connect(self):
        pass

    def query(self, sql):
        return []

def initialize_db():
    return Database()
`;

      await fs.writeFile(path.join(srcDir, "database.py"), pyContent, "utf-8");

      const entities = await createCodeFileEntities(projectId, testDir);

      expect(entities.length).toBe(1);
      expect(entities[0].properties.language).toBe("python");
      expect(entities[0].properties.classes).toContain("Database");
      expect(entities[0].properties.functions).toContain("initialize_db");
    });

    it("should handle nested directories", async () => {
      const nestedDir = path.join(testDir, "src", "services", "auth");
      await fs.mkdir(nestedDir, { recursive: true });

      await fs.writeFile(
        path.join(nestedDir, "login.ts"),
        "export function login() {}",
        "utf-8",
      );

      const entities = await createCodeFileEntities(projectId, testDir);

      expect(entities.length).toBe(1);
      expect(entities[0].properties.path).toBe("src/services/auth/login.ts");
    });

    it("should skip non-code files", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });

      await fs.writeFile(path.join(srcDir, "README.md"), "# Readme", "utf-8");
      await fs.writeFile(path.join(srcDir, "config.json"), "{}", "utf-8");

      const entities = await createCodeFileEntities(projectId, testDir);

      expect(entities.length).toBe(0);
    });

    it("should estimate complexity correctly", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });

      // Small file - low complexity
      const smallFile = "export function simple() { return 1; }";
      await fs.writeFile(path.join(srcDir, "small.ts"), smallFile, "utf-8");

      // Large file - high complexity
      const largeFile = Array(200)
        .fill("function test() { return 1; }")
        .join("\n");
      await fs.writeFile(path.join(srcDir, "large.ts"), largeFile, "utf-8");

      const entities = await createCodeFileEntities(projectId, testDir);

      const smallEntity = entities.find((e) =>
        e.properties.path.includes("small.ts"),
      );
      const largeEntity = entities.find((e) =>
        e.properties.path.includes("large.ts"),
      );

      expect(smallEntity?.properties.complexity).toBe("low");
      expect(largeEntity?.properties.complexity).toBe("high");
    });

    it("should create relationships with project", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "test.ts"),
        "export function test() {}",
        "utf-8",
      );

      await createCodeFileEntities(projectId, testDir);

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({ source: projectId });

      expect(edges.some((e) => e.type === "depends_on")).toBe(true);
    });
  });

  describe("createDocumentationEntities", () => {
    it("should create documentation section entities from README", async () => {
      const extractedContent: ExtractedContent = {
        readme: {
          content: "# My Project\n\nThis is a test project.",
          sections: [
            {
              title: "My Project",
              content: "This is a test project.",
              level: 1,
            },
            { title: "Installation", content: "npm install", level: 2 },
          ],
        },
        existingDocs: [],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const entities = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      expect(entities.length).toBe(2);
      expect(entities[0].type).toBe("documentation_section");
      expect(entities[0].properties.sectionTitle).toBe("My Project");
      expect(entities[0].properties.contentHash).toBeDefined();
      expect(entities[0].properties.category).toBe("reference");
    });

    it("should categorize documentation correctly", async () => {
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/tutorials/getting-started.md",
            title: "Getting Started",
            content: "# Tutorial",
            category: "tutorial",
          },
          {
            path: "docs/how-to/deploy.md",
            title: "Deploy Guide",
            content: "# How to Deploy",
            category: "how-to",
          },
          {
            path: "docs/api/reference.md",
            title: "API Reference",
            content: "# API",
            category: "reference",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const entities = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      expect(entities.length).toBe(3);
      expect(
        entities.find((e) => e.properties.category === "tutorial"),
      ).toBeDefined();
      expect(
        entities.find((e) => e.properties.category === "how-to"),
      ).toBeDefined();
      expect(
        entities.find((e) => e.properties.category === "reference"),
      ).toBeDefined();
    });

    it("should extract code references from content", async () => {
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/guide.md",
            title: "Guide",
            content:
              "Call `getUserById()` from `src/user.ts` using `UserService` class",
            category: "how-to",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const entities = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      expect(entities[0].properties.referencedCodeFiles).toContain(
        "src/user.ts",
      );
      expect(entities[0].properties.referencedFunctions).toContain(
        "getUserById",
      );
      expect(entities[0].properties.referencedClasses).toContain("UserService");
    });

    it("should detect code examples in documentation", async () => {
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/example.md",
            title: "Example",
            content: "# Example\n\n```typescript\nconst x = 1;\n```",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const entities = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      expect(entities[0].properties.hasCodeExamples).toBe(true);
      expect(entities[0].properties.effectivenessScore).toBeGreaterThan(0.5);
    });

    it("should process ADRs as explanation category", async () => {
      const extractedContent: ExtractedContent = {
        existingDocs: [],
        adrs: [
          {
            number: "001",
            title: "Use TypeScript",
            status: "Accepted",
            content: "We will use TypeScript for type safety",
            decision: "Use TypeScript",
            consequences: "Better IDE support",
          },
        ],
        codeExamples: [],
        apiDocs: [],
      };

      const entities = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      expect(entities.length).toBe(1);
      expect(entities[0].properties.category).toBe("explanation");
      expect(entities[0].properties.sectionTitle).toBe("Use TypeScript");
    });
  });

  describe("linkCodeToDocs", () => {
    it("should create references edges when docs reference code", async () => {
      // Create code entity
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "user.ts"),
        "export function getUser() {}",
        "utf-8",
      );

      const codeFiles = await createCodeFileEntities(projectId, testDir);

      // Create doc entity that references the code
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/api.md",
            title: "API",
            content: "Use `getUser()` from `src/user.ts`",
            category: "reference",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const docSections = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      // Link them
      const edges = await linkCodeToDocs(codeFiles, docSections);

      // Should create references edge (doc -> code)
      const referencesEdge = edges.find((e) => e.type === "references");
      expect(referencesEdge).toBeDefined();
      expect(referencesEdge?.source).toBe(docSections[0].id);
      expect(referencesEdge?.target).toBe(codeFiles[0].id);
      expect(referencesEdge?.properties.referenceType).toBe("api-reference");

      // Should create documents edge (code -> doc)
      const documentsEdge = edges.find((e) => e.type === "documents");
      expect(documentsEdge).toBeDefined();
      expect(documentsEdge?.source).toBe(codeFiles[0].id);
      expect(documentsEdge?.target).toBe(docSections[0].id);
    });

    it("should detect outdated documentation", async () => {
      // Create code entity with recent modification
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "user.ts"),
        "export function getUser() {}",
        "utf-8",
      );

      const codeFiles = await createCodeFileEntities(projectId, testDir);

      // Simulate old documentation (modify lastUpdated)
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/api.md",
            title: "API",
            content: "Use `getUser()` from `src/user.ts`",
            category: "reference",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const docSections = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      // Manually set old timestamp on doc
      docSections[0].properties.lastUpdated = new Date(
        Date.now() - 86400000,
      ).toISOString();

      const edges = await linkCodeToDocs(codeFiles, docSections);

      // Should create outdated_for edge
      const outdatedEdge = edges.find((e) => e.type === "outdated_for");
      expect(outdatedEdge).toBeDefined();
      expect(outdatedEdge?.properties.severity).toBe("medium");
    });

    it("should determine coverage based on referenced functions", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });

      // Code with 3 functions
      await fs.writeFile(
        path.join(srcDir, "user.ts"),
        `
export function getUser() {}
export function createUser() {}
export function deleteUser() {}
      `,
        "utf-8",
      );

      const codeFiles = await createCodeFileEntities(projectId, testDir);

      // Doc that only references 2 functions (66% coverage)
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/api.md",
            title: "API",
            content: "Use `getUser()` and `createUser()` from `src/user.ts`",
            category: "reference",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const docSections = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      const edges = await linkCodeToDocs(codeFiles, docSections);

      const documentsEdge = edges.find((e) => e.type === "documents");
      expect(documentsEdge?.properties.coverage).toBe("complete"); // >= 50%
    });

    it("should handle documentation with no code references", async () => {
      const srcDir = path.join(testDir, "src");
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, "user.ts"),
        "export function getUser() {}",
        "utf-8",
      );

      const codeFiles = await createCodeFileEntities(projectId, testDir);

      // Doc with no code references
      const extractedContent: ExtractedContent = {
        existingDocs: [
          {
            path: "docs/guide.md",
            title: "Guide",
            content: "This is a general guide with no code references",
            category: "tutorial",
          },
        ],
        adrs: [],
        codeExamples: [],
        apiDocs: [],
      };

      const docSections = await createDocumentationEntities(
        projectId,
        extractedContent,
      );

      const edges = await linkCodeToDocs(codeFiles, docSections);

      // Should not create edges between unrelated code and docs
      expect(edges.length).toBe(0);
    });
  });
});
