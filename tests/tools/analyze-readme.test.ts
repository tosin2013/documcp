import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { analyzeReadme } from '../../src/tools/analyze-readme.js';
import { tmpdir } from 'os';

describe('analyze_readme', () => {
  let testDir: string;
  let readmePath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `test-readme-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    readmePath = join(testDir, 'README.md');
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('input validation', () => {
    it('should require project_path parameter', async () => {
      const result = await analyzeReadme({});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ANALYSIS_FAILED');
    });

    it('should handle non-existent project directory', async () => {
      const result = await analyzeReadme({
        project_path: '/non/existent/path',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('README_NOT_FOUND');
    });
  });

  describe('README detection', () => {
    it('should find README.md file', async () => {
      const readmeContent = `# Test Project\n\n> A simple test project\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\nExample usage here.`;
      await fs.writeFile(readmePath, readmeContent);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis).toBeDefined();
    });

    it('should find alternative README file names', async () => {
      const readmeContent = `# Test Project\n\nBasic content`;
      await fs.writeFile(join(testDir, 'readme.md'), readmeContent);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('length analysis', () => {
    it('should analyze README length correctly', async () => {
      const longReadme = Array(400).fill('# Section\n\nContent here.\n').join('\n');
      await fs.writeFile(readmePath, longReadme);

      const result = await analyzeReadme({
        project_path: testDir,
        max_length_target: 300,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.lengthAnalysis.exceedsTarget).toBe(true);
      expect(result.data?.analysis.lengthAnalysis.reductionNeeded).toBeGreaterThan(0);
    });

    it('should handle README within target length', async () => {
      const shortReadme = `# Project\n\n## Quick Start\n\nInstall and use.`;
      await fs.writeFile(readmePath, shortReadme);

      const result = await analyzeReadme({
        project_path: testDir,
        max_length_target: 300,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.lengthAnalysis.exceedsTarget).toBe(false);
      expect(result.data?.analysis.lengthAnalysis.reductionNeeded).toBe(0);
    });
  });

  describe('structure analysis', () => {
    it('should evaluate scannability score', async () => {
      const wellStructuredReadme = `# Project Title

> Clear description

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

- Feature 1
- Feature 2
- Feature 3

### Advanced Usage

More details here.

## Contributing

Guidelines here.`;

      await fs.writeFile(readmePath, wellStructuredReadme);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.structureAnalysis.scannabilityScore).toBeGreaterThan(50);
      expect(result.data?.analysis.structureAnalysis.headingHierarchy.length).toBeGreaterThan(0);
    });

    it('should detect poor structure', async () => {
      const poorStructure = `ProjectTitle\nSome text without proper headings or spacing.More text.Even more text without breaks.`;
      await fs.writeFile(readmePath, poorStructure);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.structureAnalysis.scannabilityScore).toBeLessThan(50);
    });
  });

  describe('content analysis', () => {
    it('should detect TL;DR section', async () => {
      const readmeWithTldr = `# Project\n\n## TL;DR\n\nQuick overview here.\n\n## Details\n\nMore info.`;
      await fs.writeFile(readmePath, readmeWithTldr);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.contentAnalysis.hasTldr).toBe(true);
    });

    it('should detect quick start section', async () => {
      const readmeWithQuickStart = `# Project\n\n## Quick Start\n\nGet started quickly.\n\n## Installation\n\nDetailed setup.`;
      await fs.writeFile(readmePath, readmeWithQuickStart);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.contentAnalysis.hasQuickStart).toBe(true);
    });

    it('should count code blocks and links', async () => {
      const readmeWithCodeAndLinks = `# Project

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const lib = require('lib');
\`\`\`

See [documentation](https://example.com) and [API reference](https://api.example.com).`;

      await fs.writeFile(readmePath, readmeWithCodeAndLinks);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.contentAnalysis.codeBlockCount).toBe(2);
      expect(result.data?.analysis.contentAnalysis.linkCount).toBe(2);
    });
  });

  describe('community readiness', () => {
    it('should detect community files', async () => {
      const readmeContent = `# Project\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).`;
      await fs.writeFile(readmePath, readmeContent);
      await fs.writeFile(join(testDir, 'CONTRIBUTING.md'), 'Contributing guidelines');
      await fs.writeFile(join(testDir, 'CODE_OF_CONDUCT.md'), 'Code of conduct');

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.communityReadiness.hasContributing).toBe(true);
      expect(result.data?.analysis.communityReadiness.hasCodeOfConduct).toBe(true);
    });

    it('should count badges', async () => {
      const readmeWithBadges = `# Project

[![Build Status](https://travis-ci.org/user/repo.svg?branch=main)](https://travis-ci.org/user/repo)
[![npm version](https://badge.fury.io/js/package.svg)](https://badge.fury.io/js/package)

Description here.`;

      await fs.writeFile(readmePath, readmeWithBadges);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.communityReadiness.badgeCount).toBe(2);
    });
  });

  describe('optimization opportunities', () => {
    it('should identify length reduction opportunities', async () => {
      const longReadme = Array(500)
        .fill('# Section\n\nLong content here that exceeds target length.\n')
        .join('\n');
      await fs.writeFile(readmePath, longReadme);

      const result = await analyzeReadme({
        project_path: testDir,
        max_length_target: 200,
        optimization_level: 'aggressive',
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.optimizationOpportunities.length).toBeGreaterThan(0);
      expect(
        result.data?.analysis.optimizationOpportunities.some(
          (op) => op.type === 'length_reduction',
        ),
      ).toBe(true);
    });

    it('should identify content enhancement opportunities', async () => {
      const basicReadme = `# Project\n\nBasic description.\n\n## Installation\n\nnpm install`;
      await fs.writeFile(readmePath, basicReadme);

      const result = await analyzeReadme({
        project_path: testDir,
        target_audience: 'community_contributors',
      });

      expect(result.success).toBe(true);
      expect(
        result.data?.analysis.optimizationOpportunities.some(
          (op) => op.type === 'content_enhancement',
        ),
      ).toBe(true);
    });
  });

  describe('scoring system', () => {
    it('should calculate overall score', async () => {
      const goodReadme = `# Excellent Project

> Clear, concise description of what this project does

[![Build Status](https://travis-ci.org/user/repo.svg)](https://travis-ci.org/user/repo)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## TL;DR

This project solves X problem for Y users. Perfect for Z use cases.

## Quick Start

\`\`\`bash
npm install excellent-project
\`\`\`

\`\`\`javascript
const project = require('excellent-project');
project.doSomething();
\`\`\`

## Prerequisites

- Node.js 16+
- npm or yarn

## Usage

Detailed usage examples here.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Author`;

      await fs.writeFile(readmePath, goodReadme);
      await fs.writeFile(join(testDir, 'CONTRIBUTING.md'), 'Guidelines');

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.overallScore).toBeGreaterThan(70);
    });

    it('should provide lower score for poor README', async () => {
      const poorReadme = `ProjectName\nSome description\nInstall it\nUse it`;
      await fs.writeFile(readmePath, poorReadme);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.overallScore).toBeLessThan(50);
    });
  });

  describe('recommendations and next steps', () => {
    it('should provide relevant recommendations', async () => {
      const basicReadme = `# Project\n\nDescription`;
      await fs.writeFile(readmePath, basicReadme);

      const result = await analyzeReadme({
        project_path: testDir,
        target_audience: 'community_contributors',
        optimization_level: 'moderate',
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis.recommendations.length).toBeGreaterThan(0);
      expect(result.data?.nextSteps.length).toBeGreaterThan(0);
    });

    it('should tailor recommendations to target audience', async () => {
      const readmeContent = `# Enterprise Tool\n\nBasic description`;
      await fs.writeFile(readmePath, readmeContent);

      const result = await analyzeReadme({
        project_path: testDir,
        target_audience: 'enterprise_users',
      });

      expect(result.success).toBe(true);
      expect(
        result.data?.analysis.recommendations.some(
          (rec) =>
            rec.includes('enterprise') || rec.includes('security') || rec.includes('support'),
        ),
      ).toBe(true);
    });
  });

  describe('project context detection', () => {
    it('should detect JavaScript project', async () => {
      const readmeContent = `# JS Project\n\nA JavaScript project`;
      await fs.writeFile(readmePath, readmeContent);
      await fs.writeFile(join(testDir, 'package.json'), '{"name": "test"}');

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      // Should analyze successfully with project context
      expect(result.data?.analysis).toBeDefined();
    });

    it('should handle projects without specific type indicators', async () => {
      const readmeContent = `# Generic Project\n\nSome project`;
      await fs.writeFile(readmePath, readmeContent);

      const result = await analyzeReadme({
        project_path: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.data?.analysis).toBeDefined();
    });
  });
});
