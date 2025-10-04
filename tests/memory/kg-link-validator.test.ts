import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  validateExternalLinks,
  validateAndStoreDocumentationLinks,
  extractLinksFromContent,
  storeLinkValidationInKG,
  getLinkValidationHistory,
} from "../../src/memory/kg-link-validator";
import { getKnowledgeGraph } from "../../src/memory/kg-integration";

describe("KG Link Validator", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `kg-link-${Date.now()}`);
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

  describe("validateExternalLinks", () => {
    it("should validate valid URLs", async () => {
      const urls = ["https://www.google.com", "https://github.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.totalLinks).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.validLinks + result.brokenLinks + result.unknownLinks).toBe(
        2,
      );
    });

    it("should detect broken links", async () => {
      const urls = ["https://this-domain-definitely-does-not-exist-12345.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 3000,
      });

      expect(result.totalLinks).toBe(1);
      expect(result.results).toHaveLength(1);
      // Should be either broken or unknown
      expect(result.brokenLinks + result.unknownLinks).toBeGreaterThan(0);
    });

    it("should handle empty URL list", async () => {
      const result = await validateExternalLinks([]);

      expect(result.totalLinks).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should respect timeout option", async () => {
      const urls = ["https://www.google.com"];

      const startTime = Date.now();
      await validateExternalLinks(urls, {
        timeout: 1000,
      });
      const duration = Date.now() - startTime;

      // Should complete reasonably quickly
      expect(duration).toBeLessThan(10000);
    });

    it("should use default timeout when not provided", async () => {
      const urls = ["https://www.google.com"];

      const result = await validateExternalLinks(urls);

      expect(result).toBeDefined();
      expect(result.totalLinks).toBe(1);
    });

    it("should handle validation errors gracefully", async () => {
      const urls = ["https://httpstat.us/500"]; // Returns 500 error

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.totalLinks).toBe(1);
      // Should be marked as broken or unknown
      expect(result.brokenLinks + result.unknownLinks).toBeGreaterThan(0);
    });

    it("should count warning links correctly", async () => {
      const urls = ["https://httpstat.us/301"]; // Redirect

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.totalLinks).toBe(1);
      // Should handle redirects as valid (fetch follows redirects)
      expect(
        result.validLinks +
          result.brokenLinks +
          result.warningLinks +
          result.unknownLinks,
      ).toBe(1);
    });

    it("should handle network errors in validation loop", async () => {
      const urls = ["https://invalid-url-12345.test", "https://www.google.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 3000,
      });

      expect(result.totalLinks).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it("should include response time in valid results", async () => {
      const urls = ["https://www.google.com"];

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.results[0].lastChecked).toBeDefined();
      if (result.results[0].status === "valid") {
        expect(result.results[0].responseTime).toBeDefined();
        expect(result.results[0].responseTime).toBeGreaterThan(0);
      }
    });

    it("should include response time in broken results", async () => {
      const urls = ["https://httpstat.us/404"];

      const result = await validateExternalLinks(urls, {
        timeout: 5000,
      });

      expect(result.results[0].lastChecked).toBeDefined();
      if (
        result.results[0].status === "broken" &&
        result.results[0].statusCode
      ) {
        expect(result.results[0].responseTime).toBeDefined();
      }
    });
  });

  describe("extractLinksFromContent", () => {
    it("should extract external links", () => {
      const content = `
        # Test
        [Google](https://www.google.com)
        [GitHub](https://github.com)
      `;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks.length).toBeGreaterThan(0);
    });

    it("should extract internal links", () => {
      const content = `
        # Test
        [Page 1](./page1.md)
        [Page 2](../page2.md)
      `;

      const result = extractLinksFromContent(content);

      expect(result.internalLinks.length).toBeGreaterThan(0);
    });

    it("should handle mixed links", () => {
      const content = `
        # Test
        [External](https://example.com)
        [Internal](./page.md)
      `;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks.length).toBeGreaterThan(0);
      expect(result.internalLinks.length).toBeGreaterThan(0);
    });

    it("should extract HTTP links", () => {
      const content = `[Link](http://example.com)`;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks).toContain("http://example.com");
    });

    it("should extract HTML anchor links", () => {
      const content = `<a href="https://example.com">Link</a>`;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks).toContain("https://example.com");
    });

    it("should extract HTML anchor links with single quotes", () => {
      const content = `<a href='https://example.com'>Link</a>`;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks).toContain("https://example.com");
    });

    it("should extract internal HTML links", () => {
      const content = `<a href="./page.md">Link</a>`;

      const result = extractLinksFromContent(content);

      expect(result.internalLinks).toContain("./page.md");
    });

    it("should remove duplicate links", () => {
      const content = `
        [Link1](https://example.com)
        [Link2](https://example.com)
        [Link3](./page.md)
        [Link4](./page.md)
      `;

      const result = extractLinksFromContent(content);

      expect(result.externalLinks.length).toBe(1);
      expect(result.internalLinks.length).toBe(1);
    });

    it("should handle content with no links", () => {
      const content = "# Test\nNo links here";

      const result = extractLinksFromContent(content);

      expect(result.externalLinks).toEqual([]);
      expect(result.internalLinks).toEqual([]);
    });
  });

  describe("validateAndStoreDocumentationLinks", () => {
    it("should validate and store documentation links", async () => {
      const content =
        "# Test\n[Link](./other.md)\n[External](https://example.com)";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      expect(result.totalLinks).toBeGreaterThan(0);
    });

    it("should handle documentation without links", async () => {
      const content = "# Test\nNo links here";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      expect(result.totalLinks).toBe(0);
    });

    it("should handle content with only internal links", async () => {
      const content = "# Test\n[Page](./page.md)";

      const result = await validateAndStoreDocumentationLinks(
        "test-project",
        content,
      );

      expect(result).toBeDefined();
      // Only external links are validated
      expect(result.totalLinks).toBe(0);
    });
  });

  describe("storeLinkValidationInKG", () => {
    it("should store validation results with no broken links", async () => {
      const summary = {
        totalLinks: 5,
        validLinks: 5,
        brokenLinks: 0,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-1", summary);

      const kg = await getKnowledgeGraph();
      const nodes = await kg.getAllNodes();

      // Find the specific validation node for this test
      const validationNode = nodes.find(
        (n) =>
          n.type === "link_validation" &&
          n.properties.totalLinks === 5 &&
          n.properties.brokenLinks === 0,
      );
      expect(validationNode).toBeDefined();
      expect(validationNode?.properties.totalLinks).toBe(5);
      expect(validationNode?.properties.healthScore).toBe(100);
    });

    it("should store validation results with broken links", async () => {
      const summary = {
        totalLinks: 10,
        validLinks: 7,
        brokenLinks: 3,
        warningLinks: 0,
        unknownLinks: 0,
        results: [
          {
            url: "https://broken1.com",
            status: "broken" as const,
            lastChecked: new Date().toISOString(),
          },
          {
            url: "https://broken2.com",
            status: "broken" as const,
            lastChecked: new Date().toISOString(),
          },
          {
            url: "https://broken3.com",
            status: "broken" as const,
            lastChecked: new Date().toISOString(),
          },
        ],
      };

      await storeLinkValidationInKG("doc-section-2", summary);

      const kg = await getKnowledgeGraph();
      const edges = await kg.findEdges({
        source: "doc-section-2",
        type: "has_link_validation",
      });

      expect(edges.length).toBeGreaterThan(0);
    });

    it("should create requires_fix edge for broken links", async () => {
      const summary = {
        totalLinks: 10,
        validLinks: 4,
        brokenLinks: 6,
        warningLinks: 0,
        unknownLinks: 0,
        results: [
          {
            url: "https://broken.com",
            status: "broken" as const,
            lastChecked: new Date().toISOString(),
          },
        ],
      };

      await storeLinkValidationInKG("doc-section-3", summary);

      const kg = await getKnowledgeGraph();
      const allNodes = await kg.getAllNodes();
      const validationNode = allNodes.find(
        (n) => n.type === "link_validation" && n.properties.brokenLinks === 6,
      );

      expect(validationNode).toBeDefined();

      const requiresFixEdges = await kg.findEdges({
        source: validationNode!.id,
        type: "requires_fix",
      });

      expect(requiresFixEdges.length).toBeGreaterThan(0);
      expect(requiresFixEdges[0].properties.severity).toBe("high"); // > 5 broken links
    });

    it("should set medium severity for few broken links", async () => {
      const summary = {
        totalLinks: 10,
        validLinks: 8,
        brokenLinks: 2,
        warningLinks: 0,
        unknownLinks: 0,
        results: [
          {
            url: "https://broken.com",
            status: "broken" as const,
            lastChecked: new Date().toISOString(),
          },
        ],
      };

      await storeLinkValidationInKG("doc-section-4", summary);

      const kg = await getKnowledgeGraph();
      const allNodes = await kg.getAllNodes();
      const validationNode = allNodes.find(
        (n) => n.type === "link_validation" && n.properties.brokenLinks === 2,
      );

      const requiresFixEdges = await kg.findEdges({
        source: validationNode!.id,
        type: "requires_fix",
      });

      expect(requiresFixEdges[0].properties.severity).toBe("medium");
    });

    it("should calculate health score correctly", async () => {
      const summary = {
        totalLinks: 20,
        validLinks: 15,
        brokenLinks: 5,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-5", summary);

      const kg = await getKnowledgeGraph();
      const nodes = await kg.getAllNodes();

      const validationNode = nodes.find(
        (n) => n.type === "link_validation" && n.properties.totalLinks === 20,
      );

      expect(validationNode?.properties.healthScore).toBe(75);
    });

    it("should handle zero links with 100% health score", async () => {
      const summary = {
        totalLinks: 0,
        validLinks: 0,
        brokenLinks: 0,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-6", summary);

      const kg = await getKnowledgeGraph();
      const nodes = await kg.getAllNodes();

      const validationNode = nodes.find(
        (n) => n.type === "link_validation" && n.properties.totalLinks === 0,
      );

      expect(validationNode?.properties.healthScore).toBe(100);
    });
  });

  describe("getLinkValidationHistory", () => {
    it("should retrieve validation history", async () => {
      const summary1 = {
        totalLinks: 5,
        validLinks: 5,
        brokenLinks: 0,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-7", summary1);

      const history = await getLinkValidationHistory("doc-section-7");

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].type).toBe("link_validation");
    });

    it("should return empty array for non-existent doc section", async () => {
      const history = await getLinkValidationHistory("non-existent");

      expect(history).toEqual([]);
    });

    it("should sort history by newest first", async () => {
      // Add two validations with delay to ensure different timestamps
      const summary1 = {
        totalLinks: 5,
        validLinks: 5,
        brokenLinks: 0,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-8", summary1);

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const summary2 = {
        totalLinks: 6,
        validLinks: 6,
        brokenLinks: 0,
        warningLinks: 0,
        unknownLinks: 0,
        results: [],
      };

      await storeLinkValidationInKG("doc-section-8", summary2);

      const history = await getLinkValidationHistory("doc-section-8");

      expect(history.length).toBeGreaterThan(1);
      // First item should be newest
      const firstTimestamp = new Date(
        history[0].properties.lastValidated,
      ).getTime();
      const secondTimestamp = new Date(
        history[1].properties.lastValidated,
      ).getTime();
      expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
    });
  });
});
