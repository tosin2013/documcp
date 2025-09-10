import { readmeBestPractices } from '../../src/tools/readme-best-practices.js';
import { formatMCPResponse } from '../../src/types/api.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('readmeBestPractices', () => {
  const testDir = join(process.cwd(), 'test-readme-best-practices-temp');
  
  beforeEach(async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Functionality', () => {
    test('should analyze README best practices with default parameters', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, `# Test Library

## Description
This is a test library for analyzing best practices.

## Installation
\`\`\`bash
npm install test-library
\`\`\`

## Usage
\`\`\`javascript
const lib = require('test-library');
\`\`\`

## API Reference
Function documentation here.

## Contributing
Please read CONTRIBUTING.md.

## License
MIT License
`);

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.bestPracticesReport).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should handle different project types', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Application\n\nA web application.');

      const result = await readmeBestPractices({
        readme_path: readmePath,
        project_type: 'application'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should generate templates when requested', async () => {
      const outputDir = join(testDir, 'output');
      await mkdir(outputDir, { recursive: true });

      const result = await readmeBestPractices({
        readme_path: join(testDir, 'nonexistent.md'),
        generate_template: true,
        output_directory: outputDir,
        project_type: 'library'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should handle different target audiences', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Advanced Tool\n\nFor expert users.');

      const result = await readmeBestPractices({
        readme_path: readmePath,
        target_audience: 'advanced'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing README file without template generation', async () => {
      const result = await readmeBestPractices({
        readme_path: join(testDir, 'nonexistent.md'),
        generate_template: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('README_NOT_FOUND');
    });

    test('should handle invalid project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test');

      const result = await readmeBestPractices({
        readme_path: readmePath,
        project_type: 'invalid_type' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle invalid target audience', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test');

      const result = await readmeBestPractices({
        readme_path: readmePath,
        target_audience: 'invalid_audience' as any
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Best Practices Analysis', () => {
    test('should evaluate checklist items', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, `# Complete Library

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)

## Description
Detailed description of the library.

## Installation
Installation instructions here.

## Usage
Usage examples here.

## API Reference
API documentation.

## Examples
Code examples.

## Contributing
Contributing guidelines.

## License
MIT License

## Support
Support information.
`);

      const result = await readmeBestPractices({
        readme_path: readmePath,
        project_type: 'library'
      });

      expect(result.success).toBe(true);
      expect(result.data!.bestPracticesReport.checklist).toBeDefined();
      expect(Array.isArray(result.data!.bestPracticesReport.checklist)).toBe(true);
      expect(result.data!.bestPracticesReport.checklist.length).toBeGreaterThan(0);
    });

    test('should calculate overall score and grade', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Basic Project\n\nMinimal content.');

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      expect(result.success).toBe(true);
      expect(result.data!.bestPracticesReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.data!.bestPracticesReport.overallScore).toBeLessThanOrEqual(100);
      expect(result.data!.bestPracticesReport.grade).toBeDefined();
    });

    test('should provide recommendations', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Incomplete Project');

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      expect(result.success).toBe(true);
      expect(result.data!.recommendations).toBeDefined();
      expect(Array.isArray(result.data!.recommendations)).toBe(true);
      expect(result.data!.nextSteps).toBeDefined();
      expect(Array.isArray(result.data!.nextSteps)).toBe(true);
    });

    test('should provide summary metrics', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, `# Project

## Description
Basic description.

## Installation
Install steps.
`);

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      expect(result.success).toBe(true);
      expect(result.data!.bestPracticesReport.summary).toBeDefined();
      expect(result.data!.bestPracticesReport.summary.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(result.data!.bestPracticesReport.summary.importantIssues).toBeGreaterThanOrEqual(0);
      expect(result.data!.bestPracticesReport.summary.sectionsPresent).toBeGreaterThanOrEqual(0);
      expect(result.data!.bestPracticesReport.summary.totalSections).toBeGreaterThan(0);
    });
  });

  describe('Template Generation', () => {
    test('should generate README template when file is missing', async () => {
      const outputDir = join(testDir, 'template-output');
      await mkdir(outputDir, { recursive: true });

      const result = await readmeBestPractices({
        readme_path: join(testDir, 'missing.md'),
        generate_template: true,
        output_directory: outputDir,
        project_type: 'tool',
        include_community_files: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should handle template generation without community files', async () => {
      const outputDir = join(testDir, 'no-community-output');
      await mkdir(outputDir, { recursive: true });

      const result = await readmeBestPractices({
        readme_path: join(testDir, 'missing.md'),
        generate_template: true,
        output_directory: outputDir,
        include_community_files: false
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Response Format', () => {
    test('should return MCPToolResponse structure', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test Project');

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      expect(result.success).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.toolVersion).toBe('1.0.0');
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.analysisId).toBeDefined();
    });

    test('should format properly with formatMCPResponse', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test Project');

      const result = await readmeBestPractices({
        readme_path: readmePath
      });

      // Test that the result can be formatted without errors
      const formatted = formatMCPResponse(result);
      expect(formatted.content).toBeDefined();
      expect(Array.isArray(formatted.content)).toBe(true);
      expect(formatted.content.length).toBeGreaterThan(0);
      expect(formatted.isError).toBe(false);
    });
  });
});