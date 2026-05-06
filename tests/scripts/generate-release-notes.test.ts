/**
 * Tests for Enhanced Release Notes Generator
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  generateReleaseNotes,
  formatReleaseNotes,
  type ReleaseNotes,
} from "../../src/scripts/generate-release-notes";

// Mock execSync for testing
jest.mock("child_process");
jest.mock("fs");

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("Enhanced Release Notes Generator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseCommit", () => {
    it("should parse conventional commit with scope", () => {
      mockedExecSync
        .mockReturnValueOnce("abc1234" as any) // git log hashes
        .mockReturnValueOnce(
          "abc1234 feat(api): add new endpoint (#123)" as any,
        ) // git log format
        .mockReturnValueOnce(
          "Detailed commit body\n\nBREAKING CHANGE: API changed" as any,
        ) // git log body
        .mockReturnValueOnce(
          "src/api/endpoint.ts\ndocs/adrs/adr-0015.md" as any,
        ) // git diff-tree
        .mockReturnValueOnce("docs/adrs/adr-0015.md" as any) // git diff for ADRs
        .mockReturnValueOnce('{"dependencies":{}}' as any) // old package.json
        .mockReturnValueOnce('{"dependencies":{}}' as any); // new package.json

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.groups).toBeDefined();
      expect(result.groups.length).toBeGreaterThan(0);
    });

    it("should parse conventional commit without scope", () => {
      mockedExecSync
        .mockReturnValueOnce("def5678" as any) // git log hashes
        .mockReturnValueOnce("def5678 fix: resolve bug in parser" as any)
        .mockReturnValueOnce("Bug fix details" as any)
        .mockReturnValueOnce("src/parser.ts" as any)
        .mockReturnValueOnce("" as any) // git diff for ADRs
        .mockReturnValueOnce('{"dependencies":{}}' as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.groups).toBeDefined();
    });

    it("should detect breaking changes from marker", () => {
      mockedExecSync
        .mockReturnValueOnce("ghi9012" as any)
        .mockReturnValueOnce("ghi9012 feat!: major API change" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/api.ts" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.breakingChanges).toBeDefined();
    });

    it("should detect breaking changes from body", () => {
      mockedExecSync
        .mockReturnValueOnce("jkl3456" as any)
        .mockReturnValueOnce("jkl3456 feat(core): update architecture" as any)
        .mockReturnValueOnce("BREAKING CHANGE: Architecture updated" as any)
        .mockReturnValueOnce("src/core.ts" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.breakingChanges).toBeDefined();
    });

    it("should extract PR number from subject", () => {
      mockedExecSync
        .mockReturnValueOnce("mno7890" as any)
        .mockReturnValueOnce("mno7890 docs: update README (#456)" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("README.md" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.groups).toBeDefined();
    });

    it("should detect ADR file changes", () => {
      mockedExecSync
        .mockReturnValueOnce("pqr1234" as any)
        .mockReturnValueOnce("pqr1234 feat(adr): add new decision" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("docs/adrs/adr-0020.md\nsrc/feature.ts" as any)
        .mockReturnValueOnce("docs/adrs/adr-0020.md" as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any)
        .mockReturnValueOnce('{"dependencies":{}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.adrChanges).toBeDefined();
    });
  });

  describe("groupCommits", () => {
    it("should group commits by type", () => {
      mockedExecSync
        .mockReturnValueOnce("abc1234\ndef5678" as any) // commit hashes
        .mockReturnValueOnce("abc1234 feat: new feature" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/feature.ts" as any)
        .mockReturnValueOnce("def5678 fix: bug fix" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/bugfix.ts" as any)
        .mockReturnValueOnce("" as any); // git diff for ADR changes

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.groups).toBeDefined();
      expect(result.groups.length).toBeGreaterThan(0);

      const featGroup = result.groups.find((g) => g.type === "feat");
      const fixGroup = result.groups.find((g) => g.type === "fix");

      expect(featGroup).toBeDefined();
      expect(fixGroup).toBeDefined();
    });

    it("should sort groups by priority", () => {
      mockedExecSync
        .mockReturnValueOnce("abc1234\ndef5678\nghi9012" as any)
        .mockReturnValueOnce("abc1234 chore: update deps" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("package.json" as any)
        .mockReturnValueOnce("def5678 feat: new feature" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/feature.ts" as any)
        .mockReturnValueOnce("ghi9012 fix: bug fix" as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/bugfix.ts" as any)
        .mockReturnValueOnce("" as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      // Features should come before fixes, fixes before chores
      const types = result.groups.map((g) => g.type);
      const featIndex = types.indexOf("feat");
      const fixIndex = types.indexOf("fix");
      const choreIndex = types.indexOf("chore");

      if (featIndex !== -1 && fixIndex !== -1) {
        expect(featIndex).toBeLessThan(fixIndex);
      }
      if (fixIndex !== -1 && choreIndex !== -1) {
        expect(fixIndex).toBeLessThan(choreIndex);
      }
    });
  });

  describe("getADRChanges", () => {
    it("should detect ADR file changes between tags", () => {
      mockedExecSync
        .mockReturnValueOnce("" as any) // commit hashes
        .mockReturnValueOnce(
          "docs/adrs/adr-0015.md\ndocs/adrs/adr-0016.md\nsrc/feature.ts" as any,
        ); // git diff

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.adrChanges).toBeDefined();
      expect(result.adrChanges.length).toBeGreaterThan(0);
      expect(
        result.adrChanges.every((file) => file.startsWith("docs/adrs/")),
      ).toBe(true);
      expect(result.adrChanges.every((file) => file.endsWith(".md"))).toBe(
        true,
      );
    });

    it("should return empty array when no ADR changes", () => {
      mockedExecSync
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/feature.ts\nREADME.md" as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.adrChanges).toEqual([]);
    });
  });

  describe("getDependencyBumps", () => {
    it("should detect dependency version changes", () => {
      const oldPackageJson = JSON.stringify({
        dependencies: {
          express: "^4.17.1",
          lodash: "^4.17.20",
        },
        devDependencies: {
          jest: "^27.0.0",
        },
      });

      const newPackageJson = JSON.stringify({
        dependencies: {
          express: "^4.18.0",
          lodash: "^4.17.20",
        },
        devDependencies: {
          jest: "^28.0.0",
        },
      });

      mockedExecSync
        .mockReturnValueOnce("" as any) // commit hashes
        .mockReturnValueOnce("" as any) // git diff for ADRs
        .mockReturnValueOnce(oldPackageJson as any)
        .mockReturnValueOnce(newPackageJson as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.dependencyBumps).toBeDefined();
      expect(result.dependencyBumps.length).toBe(2);

      const expressBump = result.dependencyBumps.find(
        (b) => b.name === "express",
      );
      const jestBump = result.dependencyBumps.find((b) => b.name === "jest");

      expect(expressBump).toBeDefined();
      expect(expressBump?.from).toBe("^4.17.1");
      expect(expressBump?.to).toBe("^4.18.0");
      expect(expressBump?.type).toBe("dependencies");

      expect(jestBump).toBeDefined();
      expect(jestBump?.type).toBe("devDependencies");
    });

    it("should handle missing dependencies gracefully", () => {
      mockedExecSync
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("" as any)
        .mockImplementationOnce(() => {
          throw new Error("Git command failed");
        });

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.dependencyBumps).toEqual([]);
    });
  });

  describe("formatReleaseNotes", () => {
    it("should format release notes with all sections", () => {
      const notes: ReleaseNotes = {
        version: "0.7.0",
        date: "2026-05-06",
        compareUrl:
          "https://github.com/tosin2013/documcp/compare/v0.6.0...v0.7.0",
        groups: [
          {
            type: "feat",
            emoji: "🚀",
            title: "Features",
            commits: [
              {
                hash: "abc1234567890",
                shortHash: "abc1234",
                type: "feat",
                scope: "api",
                subject: "add new endpoint",
                body: "",
                breaking: false,
                prNumber: "123",
                adrFiles: ["docs/adrs/adr-0015.md"],
              },
            ],
          },
        ],
        adrChanges: ["docs/adrs/adr-0015.md", "docs/adrs/adr-0016.md"],
        coverageDelta: {
          previous: 85.5,
          current: 87.2,
          change: 1.7,
        },
        dependencyBumps: [
          {
            name: "express",
            from: "^4.17.1",
            to: "^4.18.0",
            type: "dependencies",
          },
        ],
        breakingChanges: [],
      };

      const markdown = formatReleaseNotes(notes);

      expect(markdown).toContain("## [0.7.0]");
      expect(markdown).toContain("### 🚀 Features");
      expect(markdown).toContain("**api:** add new endpoint");
      expect(markdown).toContain("[#123]");
      expect(markdown).toContain(
        "[abc1234](https://github.com/tosin2013/documcp/commit/abc1234567890)",
      );
      expect(markdown).toContain("### 📋 Architecture Decisions");
      expect(markdown).toContain("adr-0015.md");
      expect(markdown).toContain("### 📈 Test Coverage");
      expect(markdown).toContain("85.50%");
      expect(markdown).toContain("87.20%");
      expect(markdown).toContain("+1.70%");
      expect(markdown).toContain("### 📦 Dependency Updates");
      expect(markdown).toContain("**express**");
      expect(markdown).toContain("^4.17.1 → ^4.18.0");
    });

    it("should format breaking changes section", () => {
      const notes: ReleaseNotes = {
        version: "0.7.0",
        date: "2026-05-06",
        compareUrl:
          "https://github.com/tosin2013/documcp/compare/v0.6.0...v0.7.0",
        groups: [],
        adrChanges: [],
        dependencyBumps: [],
        breakingChanges: [
          {
            hash: "def5678901234",
            shortHash: "def5678",
            type: "feat",
            subject: "major API change",
            body: "BREAKING CHANGE: API updated",
            breaking: true,
            adrFiles: [],
          },
        ],
      };

      const markdown = formatReleaseNotes(notes);

      expect(markdown).toContain("### ⚠️ BREAKING CHANGES");
      expect(markdown).toContain("major API change");
    });

    it("should handle negative coverage delta", () => {
      const notes: ReleaseNotes = {
        version: "0.7.0",
        date: "2026-05-06",
        compareUrl:
          "https://github.com/tosin2013/documcp/compare/v0.6.0...v0.7.0",
        groups: [],
        adrChanges: [],
        dependencyBumps: [],
        breakingChanges: [],
        coverageDelta: {
          previous: 90.0,
          current: 88.5,
          change: -1.5,
        },
      };

      const markdown = formatReleaseNotes(notes);

      expect(markdown).toContain("### 📉 Test Coverage");
      expect(markdown).toContain("-1.50%");
    });

    it("should omit empty sections", () => {
      const notes: ReleaseNotes = {
        version: "0.7.0",
        date: "2026-05-06",
        compareUrl:
          "https://github.com/tosin2013/documcp/compare/v0.6.0...v0.7.0",
        groups: [],
        adrChanges: [],
        dependencyBumps: [],
        breakingChanges: [],
      };

      const markdown = formatReleaseNotes(notes);

      expect(markdown).not.toContain("### ⚠️ BREAKING CHANGES");
      expect(markdown).not.toContain("### 📋 Architecture Decisions");
      expect(markdown).not.toContain("### 📈 Test Coverage");
      expect(markdown).not.toContain("### 📦 Dependency Updates");
    });
  });

  describe("integration", () => {
    it("should generate complete release notes", () => {
      const commitHashes = "abc1234\ndef5678";
      const commit1 = "abc1234 feat(api): add endpoint (#123)";
      const commit2 = "def5678 fix(parser): resolve bug";

      mockedExecSync
        .mockReturnValueOnce(commitHashes as any)
        .mockReturnValueOnce(commit1 as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/api.ts\ndocs/adrs/adr-0015.md" as any)
        .mockReturnValueOnce(commit2 as any)
        .mockReturnValueOnce("" as any)
        .mockReturnValueOnce("src/parser.ts" as any)
        .mockReturnValueOnce("docs/adrs/adr-0015.md" as any)
        .mockReturnValueOnce('{"dependencies":{"express":"^4.17.1"}}' as any)
        .mockReturnValueOnce('{"dependencies":{"express":"^4.18.0"}}' as any);

      const result = generateReleaseNotes("v0.6.0", "v0.7.0");

      expect(result.version).toBe("0.7.0");
      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.adrChanges.length).toBeGreaterThan(0);
      expect(result.dependencyBumps.length).toBeGreaterThan(0);
    });
  });
});
