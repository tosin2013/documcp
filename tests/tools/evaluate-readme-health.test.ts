import { evaluateReadmeHealth } from '../../src/tools/evaluate-readme-health.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('evaluateReadmeHealth', () => {
  let tempDir: string;
  let testReadmePath: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-readme-health-tests');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    testReadmePath = path.join(tempDir, 'README.md');
  });

  describe('Input Validation', () => {
    it('should handle invalid README path parameter', async () => {
      const result = await evaluateReadmeHealth({
        readme_path: '',
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('README path is required');
    });

    it('should handle missing required parameters', async () => {
      const result = await evaluateReadmeHealth({} as any);

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Required');
    });

    it('should handle null and undefined inputs', async () => {
      const result1 = await evaluateReadmeHealth(null as any);
      const result2 = await evaluateReadmeHealth(undefined as any);

      expect(result1.isError).toBe(true);
      expect(result2.isError).toBe(true);
    });

    it('should validate project_type parameter', async () => {
      await createTestReadme('# Test README\n\nBasic content.');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
        project_type: 'invalid_type' as any,
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Invalid enum value');
    });

    it('should use default project_type when not provided', async () => {
      await createTestReadme('# Test README\n\nBasic content.');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.projectType).toBe('community_library');
    });
  });

  describe('Community Health Evaluation', () => {
    it('should detect Code of Conduct links', async () => {
      const readmeContent = `
# Project

Please see our [Code of Conduct](CODE_OF_CONDUCT.md) for community guidelines.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const communityHealth = data.healthReport.components.communityHealth;
      
      const conductCheck = communityHealth.details.find((d: any) => d.check.includes('Code of Conduct'));
      expect(conductCheck.passed).toBe(true);
      expect(conductCheck.points).toBe(5);
    });

    it('should detect Contributing guidelines', async () => {
      const readmeContent = `
# Project

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const communityHealth = data.healthReport.components.communityHealth;
      
      const contributingCheck = communityHealth.details.find((d: any) => d.check.includes('Contributing'));
      expect(contributingCheck.passed).toBe(true);
      expect(contributingCheck.points).toBe(5);
    });

    it('should detect support channels', async () => {
      const readmeContent = `
# Project

## Support

Join our Discord community for help and discussions.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const communityHealth = data.healthReport.components.communityHealth;
      
      const supportCheck = communityHealth.details.find((d: any) => d.check.includes('Support channels'));
      expect(supportCheck.passed).toBe(true);
      expect(supportCheck.points).toBe(5);
    });
  });

  describe('Accessibility Evaluation', () => {
    it('should evaluate scannable structure', async () => {
      const readmeContent = `
# Project

This is a well-structured README with proper spacing.

## Installation

Step-by-step installation guide.

## Usage

How to use the project.

## Contributing

Guidelines for contributors.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const accessibility = data.healthReport.components.accessibility;
      
      const structureCheck = accessibility.details.find((d: any) => d.check.includes('Scannable structure'));
      expect(structureCheck.passed).toBe(true);
      expect(structureCheck.points).toBe(5);
    });

    it('should evaluate heading hierarchy', async () => {
      const readmeContent = `
# Main Title

## Section 1

### Subsection 1.1

## Section 2

### Subsection 2.1
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const accessibility = data.healthReport.components.accessibility;
      
      const hierarchyCheck = accessibility.details.find((d: any) => d.check.includes('heading hierarchy'));
      expect(hierarchyCheck.passed).toBe(true);
      expect(hierarchyCheck.points).toBe(5);
    });

    it('should check for inclusive language', async () => {
      const readmeContent = `
# Project

This project welcomes all team members and contributors.
Use allowlist and blocklist for access control.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const accessibility = data.healthReport.components.accessibility;
      
      const languageCheck = accessibility.details.find((d: any) => d.check.includes('Inclusive language'));
      expect(languageCheck.passed).toBe(true);
      expect(languageCheck.points).toBe(5);
    });

    it('should detect non-inclusive language', async () => {
      const readmeContent = `
# Project

Hey guys, this project uses a master branch and blacklist approach.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const accessibility = data.healthReport.components.accessibility;
      
      const languageCheck = accessibility.details.find((d: any) => d.check.includes('Inclusive language'));
      expect(languageCheck.passed).toBe(false);
      expect(languageCheck.points).toBe(0);
    });
  });

  describe('Onboarding Evaluation', () => {
    it('should detect quick start sections', async () => {
      const readmeContent = `
# Project

## Quick Start

1. Install dependencies
2. Run the application
3. Open browser
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const onboarding = data.healthReport.components.onboarding;
      
      const quickStartCheck = onboarding.details.find((d: any) => d.check.includes('Quick start'));
      expect(quickStartCheck.passed).toBe(true);
      expect(quickStartCheck.points).toBe(5);
    });

    it('should detect prerequisites', async () => {
      const readmeContent = `
# Project

## Prerequisites

- Node.js 18+
- npm or yarn
- Git
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const onboarding = data.healthReport.components.onboarding;
      
      const prereqCheck = onboarding.details.find((d: any) => d.check.includes('Prerequisites'));
      expect(prereqCheck.passed).toBe(true);
      expect(prereqCheck.points).toBe(5);
    });

    it('should detect first contribution guidance', async () => {
      const readmeContent = `
# Project

## For New Contributors

Welcome! This section is for first-time contributors to get started.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const onboarding = data.healthReport.components.onboarding;
      
      const firstContribCheck = onboarding.details.find((d: any) => d.check.includes('First contribution'));
      expect(firstContribCheck.passed).toBe(true);
      expect(firstContribCheck.points).toBe(5);
    });
  });

  describe('Content Quality Evaluation', () => {
    it('should evaluate content length', async () => {
      const readmeContent = `
# Project

This is a comprehensive README with adequate content length. It provides detailed information about the project, installation instructions, usage examples, and contribution guidelines. The content is well-structured and informative, helping users understand the project quickly and effectively. This README demonstrates good practices for documentation and community engagement.

## Installation

Detailed installation steps go here.

## Usage

Usage examples and code snippets.

## Contributing

Guidelines for contributors.
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const contentQuality = data.healthReport.components.contentQuality;
      
      const lengthCheck = contentQuality.details.find((d: any) => d.check.includes('content length'));
      expect(lengthCheck.passed).toBe(true);
      expect(lengthCheck.points).toBe(5);
    });

    it('should detect code examples', async () => {
      const readmeContent = `
# Project

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Usage

\`\`\`javascript
const project = require('project-name');
project.run();
\`\`\`
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const contentQuality = data.healthReport.components.contentQuality;
      
      const codeCheck = contentQuality.details.find((d: any) => d.check.includes('Code examples'));
      expect(codeCheck.passed).toBe(true);
      expect(codeCheck.points).toBe(5);
    });

    it('should detect external links', async () => {
      const readmeContent = `
# Project

Check out our [documentation](https://docs.example.com), 
[demo](https://demo.example.com), and 
[related project](https://github.com/example/related).
      `;
      await createTestReadme(readmeContent);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const contentQuality = data.healthReport.components.contentQuality;
      
      const linksCheck = contentQuality.details.find((d: any) => d.check.includes('External links'));
      expect(linksCheck.passed).toBe(true);
      expect(linksCheck.points).toBe(5);
    });
  });

  describe('Overall Health Score', () => {
    it('should calculate correct overall score and grade', async () => {
      const excellentReadme = `
# Excellent Project

This is a comprehensive project with excellent community health practices.

## Quick Start

1. Install: \`npm install\`
2. Run: \`npm start\`

## Prerequisites

- Node.js 18+
- npm

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
New contributors welcome! Check out good first issues.

## Support

Join our Discord community for help.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md) for security policy.

## Links

- [Documentation](https://docs.example.com)
- [Demo](https://demo.example.com)
- [GitHub Issues](https://github.com/example/issues)
      `;
      await createTestReadme(excellentReadme);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.healthReport;
      
      expect(report.overallScore).toBeGreaterThan(80);
      expect(['A', 'B']).toContain(report.grade);
      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeLessThan(10);
    });

    it('should identify critical issues in poor README', async () => {
      const poorReadme = `
# Bad Project

This is bad.
      `;
      await createTestReadme(poorReadme);

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.healthReport;
      
      expect(report.overallScore).toBeLessThan(50);
      expect(['D', 'F']).toContain(report.grade);
      expect(report.criticalIssues.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(5);
    });
  });

  describe('Repository Context Analysis', () => {
    it('should analyze repository context when path provided', async () => {
      await createTestReadme('# Test README');
      
      // Create a mock repository structure
      const repoPath = path.join(tempDir, 'test-repo');
      await fs.mkdir(repoPath, { recursive: true });
      await fs.writeFile(path.join(repoPath, 'CODE_OF_CONDUCT.md'), '# Code of Conduct');
      await fs.writeFile(path.join(repoPath, 'CONTRIBUTING.md'), '# Contributing');
      await fs.writeFile(path.join(repoPath, 'package.json'), '{}');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
        repository_path: repoPath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.healthReport).toBeDefined();
    });

    it('should handle invalid repository path gracefully', async () => {
      await createTestReadme('# Test README');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
        repository_path: '/nonexistent/path',
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.healthReport).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent README file', async () => {
      const result = await evaluateReadmeHealth({
        readme_path: '/nonexistent/README.md',
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Failed to evaluate README health');
      expect(result.content[1].text).toContain('ENOENT');
    });

    it('should handle permission denied scenarios', async () => {
      // Create a file with restricted permissions
      const restrictedPath = path.join(tempDir, 'restricted.md');
      await fs.writeFile(restrictedPath, '# Restricted');
      
      try {
        await fs.chmod(restrictedPath, 0o000);
        
        const result = await evaluateReadmeHealth({
          readme_path: restrictedPath,
        });

        expect(result.isError).toBe(true);
        expect(result.content[1].text).toContain('Failed to evaluate README health');
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedPath, 0o644);
      }
    });
  });

  describe('Response Structure Validation', () => {
    it('should return proper response structure', async () => {
      await createTestReadme('# Test README\n\nBasic content for testing.');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);

      const data = JSON.parse(result.content[0].text);
      expect(data.readmePath).toBeDefined();
      expect(data.projectType).toBeDefined();
      expect(data.healthReport).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should include all required health report fields', async () => {
      await createTestReadme('# Test README\n\nBasic content for testing.');

      const result = await evaluateReadmeHealth({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.healthReport;

      expect(report.overallScore).toBeDefined();
      expect(report.maxScore).toBe(100);
      expect(report.grade).toBeDefined();
      expect(report.components).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.strengths).toBeDefined();
      expect(report.criticalIssues).toBeDefined();
      expect(report.estimatedImprovementTime).toBeDefined();

      // Check component structure
      expect(report.components.communityHealth).toBeDefined();
      expect(report.components.accessibility).toBeDefined();
      expect(report.components.onboarding).toBeDefined();
      expect(report.components.contentQuality).toBeDefined();
    });
  });

  describe('Project Type Variations', () => {
    it('should handle different project types', async () => {
      await createTestReadme('# Test README\n\nProject content.');

      const projectTypes = ['community_library', 'enterprise_tool', 'personal_project', 'documentation'];

      for (const projectType of projectTypes) {
        const result = await evaluateReadmeHealth({
          readme_path: testReadmePath,
          project_type: projectType as any,
        });

        expect(result.isError).toBe(false);
        const data = JSON.parse(result.content[0].text);
        expect(data.projectType).toBe(projectType);
        expect(data.healthReport).toBeDefined();
      }
    });
  });

  // Helper function to create test README files
  async function createTestReadme(content: string): Promise<void> {
    await fs.writeFile(testReadmePath, content);
  }
});
