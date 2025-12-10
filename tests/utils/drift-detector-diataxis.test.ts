/**
 * Drift Detector Diataxis Type Tracking Tests
 */

import {
  DriftDetector,
  CodeExample,
  DocumentationSection,
} from "../../src/utils/drift-detector.js";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, rm } from "fs/promises";

describe("DriftDetector - Diataxis Type Tracking", () => {
  let detector: DriftDetector;
  let tempDir: string;
  let projectPath: string;
  let docsPath: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "diataxis-test-"));
    projectPath = join(tempDir, "project");
    docsPath = join(tempDir, "docs");

    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(join(projectPath, "src"), { recursive: true });
    await fs.mkdir(docsPath, { recursive: true });

    detector = new DriftDetector(tempDir);
    await detector.initialize();
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("CodeExample Interface Extensions", () => {
    test("should have optional diataxisType field", async () => {
      const doc = `
# Tutorial

\`\`\`typescript
function hello(): void {
  console.log("Hello");
}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "tutorial.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorial.md"),
      );

      expect(docSnapshot).toBeDefined();
      expect(docSnapshot?.sections.length).toBeGreaterThan(0);

      const section = docSnapshot!.sections[0];
      expect(section.codeExamples.length).toBeGreaterThan(0);

      const codeExample = section.codeExamples[0];
      expect(codeExample).toHaveProperty("diataxisType");
    });

    test("should have optional validationHints field", async () => {
      const doc = `
# Reference

API example:

\`\`\`typescript
import express from "express";
const app = express();
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "reference.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "reference.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample).toHaveProperty("validationHints");
      if (codeExample.validationHints) {
        expect(codeExample.validationHints).toHaveProperty("expectedBehavior");
        expect(codeExample.validationHints).toHaveProperty("dependencies");
        expect(codeExample.validationHints).toHaveProperty("contextRequired");
      }
    });
  });

  describe("Diataxis Type Detection from File Path", () => {
    test("should detect tutorial type from /tutorials/ path", async () => {
      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });

      const doc = `
# Getting Started

\`\`\`typescript
console.log("Hello World");
\`\`\`
      `.trim();

      await fs.writeFile(
        join(docsPath, "tutorials", "getting-started.md"),
        doc,
      );

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "getting-started.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("tutorial");
    });

    test("should detect how-to type from /how-to/ path", async () => {
      await fs.mkdir(join(docsPath, "how-to"), { recursive: true });

      const doc = `
# How to Deploy

\`\`\`bash
npm run deploy
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "how-to", "deploy.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "how-to", "deploy.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("how-to");
    });

    test("should detect reference type from /reference/ path", async () => {
      await fs.mkdir(join(docsPath, "reference"), { recursive: true });

      const doc = `
# API Reference

\`\`\`typescript
function calculate(x: number): number
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "reference", "api.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "reference", "api.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("reference");
    });

    test("should detect explanation type from /explanation/ path", async () => {
      await fs.mkdir(join(docsPath, "explanation"), { recursive: true });

      const doc = `
# Architecture Overview

\`\`\`typescript
// Example architecture
class System {}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "explanation", "architecture.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "explanation", "architecture.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("explanation");
    });
  });

  describe("Diataxis Type Detection from Frontmatter", () => {
    test("should detect type from explicit diataxis_type field", async () => {
      const doc = `---
title: My Tutorial
diataxis_type: tutorial
---

# Content

\`\`\`typescript
const x = 1;
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "explicit-type.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "explicit-type.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("tutorial");
    });

    test("should detect type from category field", async () => {
      const doc = `---
title: Deployment Guide
category: how-to
---

# Deploy

\`\`\`bash
deploy.sh
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "category-field.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "category-field.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("how-to");
    });

    test("should prefer frontmatter over path detection", async () => {
      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });

      const doc = `---
diataxis_type: reference
---

# API

\`\`\`typescript
function api(): void {}
\`\`\`
      `.trim();

      await fs.writeFile(
        join(docsPath, "tutorials", "actually-reference.md"),
        doc,
      );

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "actually-reference.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      // Frontmatter should override path
      expect(codeExample.diataxisType).toBe("reference");
    });
  });

  describe("Diataxis Type Inference from Context", () => {
    test("should infer tutorial from learning-oriented keywords", async () => {
      const doc = `
# Introduction to TypeScript

This is a step-by-step learning guide for beginners.

\`\`\`typescript
const greeting = "Hello World";
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "intro.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "intro.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("tutorial");
    });

    test("should infer how-to from problem-solving keywords", async () => {
      const doc = `
# How to Fix Authentication

Here's a solution to the authentication problem.

\`\`\`typescript
function authenticate() {}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "fix-auth.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "fix-auth.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("how-to");
    });

    test("should infer reference from API keywords", async () => {
      const doc = `
# Function Reference

Parameters and return values for the API.

\`\`\`typescript
function apiCall(param: string): boolean
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "func-ref.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "func-ref.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("reference");
    });

    test("should infer explanation from conceptual keywords", async () => {
      const doc = `
# Understanding the Architecture

This explains why we designed the system this way.

\`\`\`typescript
// Architectural concept
class Component {}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "concept.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "concept.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.diataxisType).toBe("explanation");
    });
  });

  describe("Validation Hints Generation", () => {
    test("should generate tutorial validation hints", async () => {
      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });

      const doc = `
# Tutorial

\`\`\`typescript
import express from "express";
const app = express();
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "tutorials", "guide.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "guide.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints).toBeDefined();
      expect(codeExample.validationHints?.expectedBehavior).toBe(
        "Complete step-by-step execution flow",
      );
      expect(codeExample.validationHints?.contextRequired).toBe(false);
      expect(codeExample.validationHints?.dependencies).toContain("express");
    });

    test("should generate how-to validation hints", async () => {
      await fs.mkdir(join(docsPath, "how-to"), { recursive: true });

      const doc = `
# How-to Guide

\`\`\`typescript
import fs from "fs";
fs.writeFileSync("test.txt", "data");
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "how-to", "task.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "how-to", "task.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints).toBeDefined();
      expect(codeExample.validationHints?.expectedBehavior).toBe(
        "Practical outcome achievable",
      );
      expect(codeExample.validationHints?.contextRequired).toBe(true);
      expect(codeExample.validationHints?.dependencies).toContain("fs");
    });

    test("should generate reference validation hints", async () => {
      await fs.mkdir(join(docsPath, "reference"), { recursive: true });

      const doc = `
# API Reference

\`\`\`typescript
function calculate(x: number): number
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "reference", "api-doc.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "reference", "api-doc.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints).toBeDefined();
      expect(codeExample.validationHints?.expectedBehavior).toBe(
        "API signatures match implementation",
      );
      expect(codeExample.validationHints?.contextRequired).toBe(false);
      expect(codeExample.validationHints?.dependencies).toEqual([]);
    });

    test("should generate explanation validation hints", async () => {
      await fs.mkdir(join(docsPath, "explanation"), { recursive: true });

      const doc = `
# Architecture

\`\`\`typescript
class System {
  // conceptual example
}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "explanation", "arch.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "explanation", "arch.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints).toBeDefined();
      expect(codeExample.validationHints?.expectedBehavior).toBe(
        "Concepts align with code behavior",
      );
      expect(codeExample.validationHints?.contextRequired).toBe(true);
      expect(codeExample.validationHints?.dependencies).toEqual([]);
    });
  });

  describe("Dependency Extraction", () => {
    test("should extract TypeScript/JavaScript import dependencies", async () => {
      const doc = `
# Code

\`\`\`typescript
import { foo } from "package-a";
import bar from "package-b";
const baz = require("package-c");
\`\`\`
      `.trim();

      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });
      await fs.writeFile(join(docsPath, "tutorials", "deps.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "deps.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints?.dependencies).toContain("package-a");
      expect(codeExample.validationHints?.dependencies).toContain("package-b");
      expect(codeExample.validationHints?.dependencies).toContain("package-c");
    });

    test("should extract Python import dependencies", async () => {
      const doc = `
# Python Code

\`\`\`python
import numpy
from pandas import DataFrame
import requests
\`\`\`
      `.trim();

      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });
      await fs.writeFile(join(docsPath, "tutorials", "python-deps.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "python-deps.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints?.dependencies).toContain("numpy");
      expect(codeExample.validationHints?.dependencies).toContain("pandas");
      expect(codeExample.validationHints?.dependencies).toContain("requests");
    });

    test("should extract Go import dependencies", async () => {
      const doc = `
# Go Code

\`\`\`go
import "fmt"
import "net/http"
\`\`\`
      `.trim();

      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });
      await fs.writeFile(join(docsPath, "tutorials", "go-deps.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "go-deps.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.validationHints?.dependencies).toContain("fmt");
      expect(codeExample.validationHints?.dependencies).toContain("net/http");
    });
  });

  describe("Backwards Compatibility", () => {
    test("should handle code examples without diataxisType gracefully", async () => {
      const doc = `
# Unknown Type

\`\`\`text
Some plain text code
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "unknown.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "unknown.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      // Should still have the basic fields
      expect(codeExample.language).toBe("text");
      expect(codeExample.code).toBeTruthy();
      expect(codeExample.referencedSymbols).toBeDefined();

      // diataxisType can be undefined
      expect(
        codeExample.diataxisType === undefined ||
          typeof codeExample.diataxisType === "string",
      ).toBe(true);
    });

    test("should maintain all original CodeExample fields", async () => {
      const doc = `
# Test

\`\`\`typescript
function example() {
  return true;
}
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "compat.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "compat.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      // Original fields must be present
      expect(codeExample).toHaveProperty("language");
      expect(codeExample).toHaveProperty("code");
      expect(codeExample).toHaveProperty("description");
      expect(codeExample).toHaveProperty("referencedSymbols");

      // New optional fields
      expect(codeExample).toHaveProperty("diataxisType");
      expect(codeExample).toHaveProperty("validationHints");
    });
  });

  describe("Edge Cases", () => {
    test("should handle multiple code blocks with different types in same doc", async () => {
      await fs.mkdir(join(docsPath, "tutorials"), { recursive: true });

      const doc = `
# Mixed Content

Tutorial example:
\`\`\`typescript
// Tutorial code
const x = 1;
\`\`\`

API Reference:
\`\`\`typescript
function apiCall(): void
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "tutorials", "mixed.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "tutorials", "mixed.md"),
      );

      // Both should get tutorial type from path since sections can't override
      const sections = docSnapshot!.sections;
      expect(sections.length).toBeGreaterThan(0);

      sections.forEach((section) => {
        section.codeExamples.forEach((example) => {
          // Path-based detection applies to all examples in the document
          expect(example.diataxisType).toBe("tutorial");
        });
      });
    });

    test("should handle code blocks without language specification", async () => {
      const doc = `
# Code

\`\`\`
plain code
\`\`\`
      `.trim();

      await fs.mkdir(join(docsPath, "reference"), { recursive: true });
      await fs.writeFile(join(docsPath, "reference", "plain.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "reference", "plain.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.language).toBe("text");
      expect(codeExample.diataxisType).toBe("reference");
    });

    test("should extract description from text before code block", async () => {
      const doc = `
# Example

This is a description of the code.

\`\`\`typescript
const x = 1;
\`\`\`
      `.trim();

      await fs.writeFile(join(docsPath, "desc-test.md"), doc);

      const snapshot = await detector.createSnapshot(projectPath, docsPath);
      const docSnapshot = snapshot.documentation.get(
        join(docsPath, "desc-test.md"),
      );

      const section = docSnapshot!.sections[0];
      const codeExample = section.codeExamples[0];

      expect(codeExample.description).toBe(
        "This is a description of the code.",
      );
    });
  });
});
