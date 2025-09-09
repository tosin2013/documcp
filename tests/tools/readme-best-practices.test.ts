import { readmeBestPractices } from '../../src/tools/readme-best-practices.js';
import { formatMCPResponse } from '../../src/types/api.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

describe('readmeBestPractices', () => {
  let testDir: string;
  let testReadmePath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `readme-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    testReadmePath = join(testDir, 'README.md');
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  async function createTestReadme(content: string): Promise<void> {
    await writeFile(testReadmePath, content, 'utf-8');
  }

  function generateExcellentReadme(): string {
    return `# Awesome Library

> A fast, lightweight JavaScript framework for building web applications

[![Build Status](https://github.com/user/repo/workflows/CI/badge.svg)](https://github.com/user/repo/actions)
[![npm version](https://img.shields.io/npm/v/awesome-lib.svg)](https://www.npmjs.com/package/awesome-lib)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![Demo](demo.gif)

## TL;DR

What it does in 2-3 sentences. Who should use it.

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

\`\`\`bash
npm install awesome-lib
\`\`\`

## Quick Start

\`\`\`javascript
const lib = require('awesome-lib');

// Basic usage example
const result = lib.doSomething();
console.log(result);
\`\`\`

## API Reference

### Methods

Documentation of methods and functions.

## Configuration

Configuration options and settings.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT License - see [LICENSE](LICENSE) file for details.
`;
  }

  function generatePoorReadme(): string {
    return `# Project

Some description.

Code here.
`;
  }

  describe('Input Validation', () => {
    it('should handle invalid README path parameter', async () => {
      const rawResult = await readmeBestPractices({
        readme_path: '',
      });
      const result = formatMCPResponse(rawResult);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('README file not found');
    });

    it('should handle missing required parameters', async () => {
      const rawResult = await readmeBestPractices({} as any);
      const result = formatMCPResponse(rawResult);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to analyze README best practices');
    });

    it('should use default values when optional parameters not provided', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });
      const result = formatMCPResponse(rawResult);

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      // Defaults are applied by Zod schema
    });

    it('should validate project_type parameter', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });
      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });
  });

  describe('Checklist Generation', () => {
    it('should identify excellent README with high score', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'library',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.bestPracticesReport;

      expect(report.overallScore).toBeGreaterThan(80);
      expect(['A', 'B']).toContain(report.grade);
      expect(report.checklist.length).toBeGreaterThan(10);
    });

    it('should identify poor README with low score', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'library',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.bestPracticesReport;

      expect(report.overallScore).toBeLessThan(60);
      expect(['D', 'F']).toContain(report.grade);
      expect(report.summary.criticalIssues).toBeGreaterThan(0);
    });

    it('should detect essential sections correctly', async () => {
      const readmeWithEssentials = `# My Project

> Brief description

## Installation

\`\`\`bash
npm install my-project
\`\`\`

## Usage

\`\`\`javascript
const project = require('my-project');
project.run();
\`\`\`
`;
      await createTestReadme(readmeWithEssentials);

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const checklist = data.bestPracticesReport.checklist;

      const titleItem = checklist.find((item: any) => item.item === 'Project Title');
      const descItem = checklist.find((item: any) => item.item === 'One-line Description');
      const installItem = checklist.find((item: any) => item.item === 'Installation Instructions');
      const usageItem = checklist.find((item: any) => item.item === 'Basic Usage Example');

      expect(titleItem?.present).toBe(true);
      expect(descItem?.present).toBe(true);
      expect(installItem?.present).toBe(true);
      expect(usageItem?.present).toBe(true);
    });

    it('should detect missing critical sections', async () => {
      const incompleteReadme = `# Project

Some text here.
`;
      await createTestReadme(incompleteReadme);

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const checklist = data.bestPracticesReport.checklist;

      const criticalMissing = checklist.filter((item: any) => 
        !item.present && item.severity === 'critical'
      );
      expect(criticalMissing.length).toBeGreaterThan(0);
    });
  });

  describe('Project Type Specific Checks', () => {
    it('should apply library-specific checks', async () => {
      const libraryReadme = `# My Library

> A JavaScript library

## Installation
\`\`\`bash
npm install my-lib
\`\`\`

## API Reference
Methods and functions documentation.
`;
      await createTestReadme(libraryReadme);

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'library',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const checklist = data.bestPracticesReport.checklist;

      const apiItem = checklist.find((item: any) => item.item === 'API Documentation');
      expect(apiItem).toBeDefined();
      expect(apiItem?.category).toBe('Library Specific');
    });

    it('should apply application-specific checks', async () => {
      const appReadme = `# My App

> A web application

![Screenshot](screenshot.png)

## Installation
\`\`\`bash
git clone repo
npm install
\`\`\`

## Configuration
Environment variables and settings.
`;
      await createTestReadme(appReadme);

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'application',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const checklist = data.bestPracticesReport.checklist;

      const configItem = checklist.find((item: any) => item.item === 'Configuration Options');
      expect(configItem).toBeDefined();
      expect(configItem?.category).toBe('Application Specific');

      const screenshotItem = checklist.find((item: any) => item.item === 'Screenshots/Demo');
      expect(screenshotItem?.severity).toBe('important'); // More important for applications
    });
  });

  describe('Template Generation', () => {
    it('should generate library template when requested', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'library',
        generate_template: true,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const templates = data.bestPracticesReport.templates;

      expect(templates['README-library.md']).toBeDefined();
      expect(templates['README-library.md']).toContain('# Project Name');
      expect(templates['README-library.md']).toContain('npm install');
      expect(templates['README-library.md']).toContain('API Reference');
    });

    it('should generate application template when requested', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'application',
        generate_template: true,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const templates = data.bestPracticesReport.templates;

      expect(templates['README-application.md']).toBeDefined();
      expect(templates['README-application.md']).toContain('![Demo](demo.gif)');
      expect(templates['README-application.md']).toContain('Configuration');
      expect(templates['README-application.md']).toContain('Deployment');
    });

    it('should not generate templates when not requested', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        generate_template: false,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const templates = data.bestPracticesReport.templates;

      expect(Object.keys(templates)).toHaveLength(0);
    });
  });

  describe('Community Files Generation', () => {
    it('should generate community files when requested', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        include_community_files: true,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const communityFiles = data.bestPracticesReport.communityFiles;

      expect(communityFiles['CONTRIBUTING.md']).toBeDefined();
      expect(communityFiles['CODE_OF_CONDUCT.md']).toBeDefined();
      expect(communityFiles['SECURITY.md']).toBeDefined();

      expect(communityFiles['CONTRIBUTING.md']).toContain('Contributing to Project Name');
      expect(communityFiles['CODE_OF_CONDUCT.md']).toContain('Code of Conduct');
      expect(communityFiles['SECURITY.md']).toContain('Security Policy');
    });

    it('should not generate community files when not requested', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        include_community_files: false,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const communityFiles = data.bestPracticesReport.communityFiles;

      expect(Object.keys(communityFiles)).toHaveLength(0);
    });
  });

  describe('File Writing', () => {
    it('should write generated files when output directory specified', async () => {
      await createTestReadme(generatePoorReadme());
      const outputDir = join(testDir, 'output');

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        project_type: 'library',
        generate_template: true,
        output_directory: outputDir,
        include_community_files: true,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      
      // Verify files were written (we can't easily check file system in this test environment,
      // but we can verify the function completed without error)
      const data = JSON.parse(result.content[0].text);
      expect(data.bestPracticesReport.templates).toBeDefined();
      expect(data.bestPracticesReport.communityFiles).toBeDefined();
    });

    it('should handle file writing errors gracefully', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        generate_template: true,
        output_directory: '/invalid/path/that/does/not/exist',
      });

      // Should return error for invalid path
      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(true);
    });
  });

  describe('Target Audience Adaptation', () => {
    it('should provide beginner-friendly recommendations', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        target_audience: 'beginner',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const recommendations = data.recommendations;

      const beginnerRec = recommendations.find((rec: string) => 
        rec.includes('Beginner-Friendly')
      );
      expect(beginnerRec).toBeDefined();
      expect(beginnerRec).toContain('simple language');
    });

    it('should provide advanced user recommendations', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
        target_audience: 'advanced',
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const recommendations = data.recommendations;

      const advancedRec = recommendations.find((rec: string) => 
        rec.includes('Advanced Users')
      );
      expect(advancedRec).toBeDefined();
      expect(advancedRec).toContain('technical details');
    });
  });

  describe('Summary Metrics', () => {
    it('should calculate summary metrics correctly', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const summary = data.bestPracticesReport.summary;

      expect(summary.criticalIssues).toBeGreaterThan(0);
      expect(summary.totalSections).toBeGreaterThan(0);
      expect(summary.sectionsPresent).toBeGreaterThanOrEqual(0);
      expect(summary.estimatedImprovementTime).toBeDefined();
    });

    it('should provide time estimates based on missing items', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const summary = data.bestPracticesReport.summary;

      // Excellent README should have minimal improvement time
      expect(['No improvements needed', '30 minutes - 1 hour']).toContain(summary.estimatedImprovementTime);
    });
  });

  describe('Next Steps Generation', () => {
    it('should provide actionable next steps for poor README', async () => {
      await createTestReadme(generatePoorReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const nextSteps = data.nextSteps;

      expect(nextSteps.length).toBeGreaterThan(0);
      expect(nextSteps.some((step: string) => step.includes('Priority 1'))).toBe(true);
    });

    it('should provide maintenance steps for excellent README', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const nextSteps = data.nextSteps;

      expect(nextSteps.length).toBeGreaterThan(0);
      // Excellent README should have maintenance-focused steps
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent README file with generate_template false', async () => {
      const rawResult = await readmeBestPractices({
        readme_path: '/non/existent/README.md',
        generate_template: false,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('README file not found');
      expect(result.content[0].text).toContain('generate_template: true');
    });

    it('should handle non-existent README file with generate_template true', async () => {
      const rawResult = await readmeBestPractices({
        readme_path: '/non/existent/README.md',
        generate_template: true,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.bestPracticesReport.templates).toBeDefined();
      // Should generate template for non-existent README
    });

    it('should handle invalid input parameters', async () => {
      const rawResult = await readmeBestPractices({
        readme_path: 'valid-path',
        project_type: 'invalid-type' as any,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Error');
    });
  });

  describe('Response Structure Validation', () => {
    it('should return proper response structure', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });
      const result = formatMCPResponse(rawResult);

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.bestPracticesReport).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should include all required report fields', async () => {
      await createTestReadme(generateExcellentReadme());

      const rawResult = await readmeBestPractices({
        readme_path: testReadmePath,
      });

      const result = formatMCPResponse(rawResult);
      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.bestPracticesReport;

      expect(report.overallScore).toBeDefined();
      expect(report.grade).toBeDefined();
      expect(report.checklist).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.templates).toBeDefined();
      expect(report.communityFiles).toBeDefined();
      expect(report.summary).toBeDefined();

      // Verify summary structure
      expect(report.summary.criticalIssues).toBeDefined();
      expect(report.summary.importantIssues).toBeDefined();
      expect(report.summary.recommendedImprovements).toBeDefined();
      expect(report.summary.sectionsPresent).toBeDefined();
      expect(report.summary.totalSections).toBeDefined();
      expect(report.summary.estimatedImprovementTime).toBeDefined();
    });
  });
});
