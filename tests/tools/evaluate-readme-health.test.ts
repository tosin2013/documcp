import { evaluateReadmeHealth } from '../../src/tools/evaluate-readme-health.js';
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
      await writeFile(
        readmePath,
        `# Test Project

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
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBe(false);

      // Check that it contains health report data
      const healthData = result.content.find((c) => c.text.includes('healthReport'));
      expect(healthData).toBeDefined();
    });

    test('should handle different project types', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Enterprise Tool\n\nA professional enterprise tool.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'enterprise_tool',
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
        repository_path: testDir,
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing README file', async () => {
      const result = await evaluateReadmeHealth({
        readme_path: join(testDir, 'nonexistent.md'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to evaluate README health');
    });

    test('should handle invalid project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Test');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'invalid_type' as any,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Health Report Structure', () => {
    test('should include all required health components', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Complete Project

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
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
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
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      expect(data.healthReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(data.healthReport.overallScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(data.healthReport.grade);
    });

    test('should include recommendations and next steps', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Incomplete Project');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('recommendations'));
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
        readme_path: readmePath,
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      // Should include execution metadata
      const metadataContent = result.content.find((c) => c.text.includes('Execution completed'));
      expect(metadataContent).toBeDefined();
    });
  });

  describe('Repository Context Analysis', () => {
    test('should analyze repository context when path is provided', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project with Context');

      // Create repository files
      await writeFile(join(testDir, 'CODE_OF_CONDUCT.md'), '# Code of Conduct');
      await writeFile(join(testDir, 'CONTRIBUTING.md'), '# Contributing');
      await writeFile(join(testDir, 'SECURITY.md'), '# Security Policy');
      await mkdir(join(testDir, '.github'), { recursive: true });
      await writeFile(join(testDir, 'package.json'), '{"name": "test"}');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        repository_path: testDir,
      });

      expect(result.isError).toBe(false);
      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      expect(dataContent).toBeDefined();
    });

    test('should handle repository context analysis errors gracefully', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        repository_path: '/nonexistent/path',
      });

      expect(result.isError).toBe(false); // Should not fail, just return null context
    });
  });

  describe('Community Health Evaluation', () => {
    test('should detect code of conduct references', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const conductCheck = data.healthReport.components.communityHealth.details.find(
        (d: any) => d.check === 'Code of Conduct linked',
      );
      expect(conductCheck.passed).toBe(true);
      expect(conductCheck.points).toBe(5);
    });

    test('should detect contributing guidelines', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const contributingCheck = data.healthReport.components.communityHealth.details.find(
        (d: any) => d.check === 'Contributing guidelines visible',
      );
      expect(contributingCheck.passed).toBe(true);
    });

    test('should detect security policy references', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Report security issues via our [Security Policy](SECURITY.md).
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const securityCheck = data.healthReport.components.communityHealth.details.find(
        (d: any) => d.check === 'Security policy linked',
      );
      expect(securityCheck.passed).toBe(true);
    });

    test('should detect support channels', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Join our Discord community for support and discussions.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const supportCheck = data.healthReport.components.communityHealth.details.find(
        (d: any) => d.check === 'Support channels provided',
      );
      expect(supportCheck.passed).toBe(true);
    });
  });

  describe('Accessibility Evaluation', () => {
    test('should detect proper spacing and structure', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## Description

This is a well-structured README with proper spacing.

## Installation

Instructions here.

## Usage

Usage examples here.

## Contributing

Contributing guidelines.

## License

MIT License
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const spacingCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Scannable structure with proper spacing',
      );
      expect(spacingCheck.passed).toBe(true);
    });

    test('should detect heading hierarchy', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Main Title

## Section 1

### Subsection 1.1

## Section 2

### Subsection 2.1
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const headingCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Clear heading hierarchy',
      );
      expect(headingCheck.passed).toBe(true);
    });

    test('should detect images with alt text', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

![Project Logo](logo.png)
![Build Status](https://img.shields.io/badge/build-passing-green)
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const altTextCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Alt text for images',
      );
      expect(altTextCheck.passed).toBe(true);
    });

    test('should detect images without alt text', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

![](logo.png)
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const altTextCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Alt text for images',
      );
      expect(altTextCheck.passed).toBe(false);
    });

    test('should detect inclusive language violations', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Hey guys, this project uses a master branch and maintains a whitelist of contributors.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const inclusiveCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Inclusive language',
      );
      expect(inclusiveCheck.passed).toBe(false);
    });

    test('should pass inclusive language check with good content', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Welcome team! This project uses the main branch and maintains an allowlist of contributors.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const inclusiveCheck = data.healthReport.components.accessibility.details.find(
        (d: any) => d.check === 'Inclusive language',
      );
      expect(inclusiveCheck.passed).toBe(true);
    });
  });

  describe('Onboarding Evaluation', () => {
    test('should detect quick start sections', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## Quick Start

Get up and running in minutes!
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const quickStartCheck = data.healthReport.components.onboarding.details.find(
        (d: any) => d.check === 'Quick start section',
      );
      expect(quickStartCheck.passed).toBe(true);
    });

    test('should detect prerequisites', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## Prerequisites

- Node.js 16+
- npm or yarn
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const prereqCheck = data.healthReport.components.onboarding.details.find(
        (d: any) => d.check === 'Prerequisites clearly listed',
      );
      expect(prereqCheck.passed).toBe(true);
    });

    test('should detect first contribution guidance', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## For New Contributors

Welcome first-time contributors! Here's how to get started.
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const firstContribCheck = data.healthReport.components.onboarding.details.find(
        (d: any) => d.check === 'First contribution guide',
      );
      expect(firstContribCheck.passed).toBe(true);
    });

    test('should detect good first issues', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Check out our good first issues for beginners!
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const goodFirstCheck = data.healthReport.components.onboarding.details.find(
        (d: any) => d.check === 'Good first issues mentioned',
      );
      expect(goodFirstCheck.passed).toBe(true);
    });
  });

  describe('Content Quality Evaluation', () => {
    test('should evaluate adequate content length', async () => {
      const readmePath = join(testDir, 'README.md');
      const content =
        '# Project\n\n' + 'This is a well-sized README with adequate content. '.repeat(20);
      await writeFile(readmePath, content);

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const lengthCheck = data.healthReport.components.contentQuality.details.find(
        (d: any) => d.check === 'Adequate content length',
      );
      expect(lengthCheck.passed).toBe(true);
    });

    test('should detect insufficient content length', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project\n\nToo short.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const lengthCheck = data.healthReport.components.contentQuality.details.find(
        (d: any) => d.check === 'Adequate content length',
      );
      expect(lengthCheck.passed).toBe(false);
    });

    test('should detect code examples', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## Installation

\`\`\`bash
npm install project
\`\`\`

## Usage

\`\`\`javascript
const project = require('project');
project.run();
\`\`\`
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const codeCheck = data.healthReport.components.contentQuality.details.find(
        (d: any) => d.check === 'Code examples provided',
      );
      expect(codeCheck.passed).toBe(true);
    });

    test('should detect external links', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

Check out our [documentation](https://docs.example.com),
[demo](https://demo.example.com), and [related project](https://github.com/example/related).
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const linksCheck = data.healthReport.components.contentQuality.details.find(
        (d: any) => d.check === 'External links present',
      );
      expect(linksCheck.passed).toBe(true);
    });

    test('should evaluate project description clarity', async () => {
      const readmePath = join(testDir, 'README.md');
      const longContent = `# Project

## Description

This is a comprehensive project description that provides detailed information about what the project does, how it works, and why it's useful. The description is long enough and well-structured to meet the clarity requirements. This content needs to be over 500 characters to pass the clarity check, so I'm adding more detailed information about the project features, installation process, usage examples, and comprehensive documentation that explains all aspects of the project in great detail.

## Features

- Feature 1: Advanced functionality
- Feature 2: Enhanced performance
- Feature 3: User-friendly interface

## Installation

Detailed installation instructions here with step-by-step guidance.

## Usage

Comprehensive usage examples and documentation with code samples.
`;
      await writeFile(readmePath, longContent);

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      const clarityCheck = data.healthReport.components.contentQuality.details.find(
        (d: any) => d.check === 'Project description clarity',
      );
      expect(clarityCheck.passed).toBe(true);
    });
  });

  describe('Grade Calculation', () => {
    test('should assign grade A for 90%+ score', async () => {
      const readmePath = join(testDir, 'README.md');
      // Create comprehensive README that should score high
      await writeFile(
        readmePath,
        `# Excellent Project

## Table of Contents
- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)

## Description

This is a comprehensive project with excellent documentation. It includes all necessary sections and follows best practices for community health, accessibility, onboarding, and content quality.

## Quick Start

Get started in minutes with our simple installation process.

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

\`\`\`bash
npm install excellent-project
\`\`\`

## Usage

\`\`\`javascript
const project = require('excellent-project');
project.start();
\`\`\`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## First Contribution

New contributors welcome! Check out our good first issues for beginners.

## Support

Join our Discord community for help and discussions.

## Security

Report security issues via our [Security Policy](SECURITY.md).

## Links

- [Documentation](https://docs.example.com)
- [Demo](https://demo.example.com)
- [API Reference](https://api.example.com)
- [GitHub Issues](https://github.com/example/issues)

## License

MIT License
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      expect(data.healthReport.overallScore).toBeGreaterThanOrEqual(90);
      expect(data.healthReport.grade).toBe('A');
    });

    test('should assign grade F for very low scores', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Bad\n\nMinimal.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      expect(data.healthReport.overallScore).toBeLessThan(60);
      expect(data.healthReport.grade).toBe('F');
    });
  });

  describe('Recommendations and Critical Issues', () => {
    test('should identify critical issues for low-scoring components', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Minimal Project\n\nVery basic content.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      expect(data.healthReport.criticalIssues.length).toBeGreaterThan(0);
      expect(
        data.healthReport.criticalIssues.some((issue: string) => issue.includes('Critical:')),
      ).toBe(true);
    });

    test('should generate appropriate recommendations', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        '# Project\n\nBasic project with minimal content that will fail most health checks.',
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      // Should have recommendations since most checks will fail with minimal content
      expect(data.healthReport.recommendations.length).toBeGreaterThan(0);
      expect(data.healthReport.recommendations.length).toBeLessThanOrEqual(10);
    });

    test('should identify strengths in well-structured components', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Project

## Description

This project has good content quality with proper structure and adequate length.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const app = require('./app');
app.start();
\`\`\`

## Links

- [Docs](https://example.com)
- [Demo](https://demo.com)
- [API](https://api.com)
- [Support](https://support.com)
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      expect(data.healthReport.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('Time Estimation', () => {
    test('should estimate time in minutes for quick fixes', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(
        readmePath,
        `# Excellent Project

## Table of Contents
- [Description](#description)
- [Installation](#installation)

## Description
This is a comprehensive project with excellent documentation. It includes all necessary sections and follows best practices for community health, accessibility, onboarding, and content quality.

## Quick Start
Get started in minutes with our simple installation process.

## Prerequisites
- Node.js 16+
- npm or yarn

## Installation
\`\`\`bash
npm install excellent-project
\`\`\`

## Usage
\`\`\`javascript
const project = require('excellent-project');
project.start();
\`\`\`

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## First Contribution
New contributors welcome! Check out our good first issues for beginners.

## Support
Join our Discord community for help and discussions.

## Security
Report security issues via our [Security Policy](SECURITY.md).

## Links
- [Documentation](https://docs.example.com)
- [Demo](https://demo.example.com)
- [API Reference](https://api.example.com)

## License
MIT License
`,
      );

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      // Should have very few recommendations, resulting in minutes
      expect(data.healthReport.estimatedImprovementTime).toMatch(/\d+ minutes/);
    });

    test('should estimate time in hours for moderate improvements', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project\n\nBasic project needing improvements.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('healthReport'));
      const data = JSON.parse(dataContent!.text);

      // Should have enough recommendations to warrant hours
      expect(data.healthReport.estimatedImprovementTime).toMatch(/\d+ hours?/);
    });
  });

  describe('Next Steps Generation', () => {
    test('should prioritize critical issues in next steps', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Minimal\n\nBad.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('nextSteps'));
      const data = JSON.parse(dataContent!.text);

      expect(data.nextSteps.some((step: string) => step.includes('critical issues'))).toBe(true);
    });

    test('should suggest targeting 85+ score for low-scoring READMEs', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Project\n\nNeeds improvement.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('nextSteps'));
      const data = JSON.parse(dataContent!.text);

      expect(data.nextSteps.some((step: string) => step.includes('85+ health score'))).toBe(true);
    });

    test('should always include re-evaluation step', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Any Project');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
      });

      const dataContent = result.content.find((c) => c.text.includes('nextSteps'));
      const data = JSON.parse(dataContent!.text);

      expect(data.nextSteps.some((step: string) => step.includes('Re-evaluate'))).toBe(true);
    });
  });

  describe('Project Type Variations', () => {
    test('should handle enterprise_tool project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Enterprise Tool\n\nProfessional enterprise solution.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'enterprise_tool',
      });

      expect(result.isError).toBe(false);
      const dataContent = result.content.find((c) => c.text.includes('projectType'));
      const data = JSON.parse(dataContent!.text);
      expect(data.projectType).toBe('enterprise_tool');
    });

    test('should handle personal_project project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Personal Project\n\nMy personal coding project.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'personal_project',
      });

      expect(result.isError).toBe(false);
      const dataContent = result.content.find((c) => c.text.includes('projectType'));
      const data = JSON.parse(dataContent!.text);
      expect(data.projectType).toBe('personal_project');
    });

    test('should handle documentation project type', async () => {
      const readmePath = join(testDir, 'README.md');
      await writeFile(readmePath, '# Documentation Project\n\nComprehensive documentation.');

      const result = await evaluateReadmeHealth({
        readme_path: readmePath,
        project_type: 'documentation',
      });

      expect(result.isError).toBe(false);
      const dataContent = result.content.find((c) => c.text.includes('projectType'));
      const data = JSON.parse(dataContent!.text);
      expect(data.projectType).toBe('documentation');
    });
  });
});
