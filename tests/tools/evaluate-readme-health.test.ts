import { evaluateReadmeHealth } from '../../src/tools/evaluate-readme-health.js';
import { formatMCPResponse } from '../../src/types/api.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('evaluateReadmeHealth', () => {
  const testDir = join(process.cwd(), 'test-readme-temp');
  
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
    test('should evaluate README health with default parameters', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, `# Test Project

## Description
This is a test project for evaluating README health.

## Installation
\`\`\`bash
npm install test-project
\`\`\`

## Usage
\`\`\`javascript
const test = require('test-project');
\`\`\`

## Contributing
Please read CONTRIBUTING.md for details.

## License
MIT License
`);

      const result = await evaluateReadmeHealth({
        readme_path: readmePath
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBe(false);
      
      // Check that it contains health report data
      const healthData = result.content.find(c => c.text.includes('healthReport'));
      expect(healthData).toBeDefined();
    });

    test('should handle different project types', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Enterprise Tool\n\nA professional enterprise tool.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'enterprise_tool'
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    test('should include repository context when provided', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project with Repo Context');
      
      // Create a simple repository structure
      await writeFile(join(testDir, 'package.json'), '{"name": "test"}');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        repository_path: testDir
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing README file', async () => {
      const result = await evaluateReadmeHealth({
        readme_path: join(testDir, 'nonexistent.md')
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to evaluate README health');
    });

    test('should handle invalid project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'invalid_type' as any
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Health Report Structure', () => {
    test('should include all required health components', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, `# Complete Project

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)

## Description
Comprehensive project description here.

## Installation
Installation instructions.

## Usage
Usage examples.

## Contributing
How to contribute.

## License
MIT
`);

      const result = await evaluateReadmeHealth({
        readme_path: readmePath
      });

      const dataContent = result.content.find(c => c.text.includes('healthReport'));
      expect(dataContent).toBeDefined();
      
      const data = JSON.parse(dataContent!.text);
      expect(data.healthReport).toBeDefined();
      expect(data.healthReport.components).toBeDefined();
      expect(data.healthReport.components.communityHealth).toBeDefined();
      expect(data.healthReport.components.accessibility).toBeDefined();
      expect(data.healthReport.components.onboarding).toBeDefined();
      expect(data.healthReport.components.contentQuality).toBeDefined();
    });

    test('should provide grade and score', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Basic Project\n\nMinimal content.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath
      });

      const dataContent = result.content.find(c => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);
      
      expect(data.healthReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(data.healthReport.overallScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(data.healthReport.grade);
    });

    test('should include recommendations and next steps', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Incomplete Project');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath
      });

      const dataContent = result.content.find(c => c.text.includes('recommendations'));
      expect(dataContent).toBeDefined();
      
      const data = JSON.parse(dataContent!.text);
      expect(data.healthReport.recommendations).toBeDefined();
      expect(Array.isArray(data.healthReport.recommendations)).toBe(true);
      expect(data.nextSteps).toBeDefined();
      expect(Array.isArray(data.nextSteps)).toBe(true);
    });
  });

  describe('Response Format', () => {
    test('should return properly formatted MCP response', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test Project');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Should include execution metadata
      const metadataContent = result.content.find(c => c.text.includes('Execution completed'));
      expect(metadataContent).toBeDefined();
    });
  });
});