import { optimizeReadmeLength } from '../../src/tools/optimize-readme-length.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('optimizeReadmeLength', () => {
  let tempDir: string;
  let testReadmePath: string;
  let outputDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-readme-optimization-tests');
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
    outputDir = path.join(tempDir, 'output');
  });

  describe('Input Validation', () => {
    it('should handle invalid README path parameter', async () => {
      const result = await optimizeReadmeLength({
        readme_path: '',
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('README path is required');
    });

    it('should handle missing required parameters', async () => {
      const result = await optimizeReadmeLength({} as any);

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Required');
    });

    it('should validate max_recommended_lines parameter', async () => {
      await createTestReadme('# Test README\n\nBasic content.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        max_recommended_lines: 10,
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Number must be greater than or equal to 50');
    });

    it('should use default values when optional parameters not provided', async () => {
      await createTestReadme('# Test README\n\nBasic content.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.targetAudience).toBe('community');
      expect(data.optimizationReport.analysis.recommendedMaxLines).toBe(250);
    });
  });

  describe('Length Analysis', () => {
    it('should analyze optimal length README', async () => {
      const shortReadme = `
# Project Title

Brief description of the project.

## Installation

\`\`\`bash
npm install project
\`\`\`

## Usage

Basic usage example.
      `;
      await createTestReadme(shortReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        max_recommended_lines: 100,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const analysis = data.optimizationReport.analysis;
      
      expect(analysis.severity).toBe('optimal');
      expect(analysis.mobileReadability).toBe('excellent');
      expect(analysis.reductionNeeded).toBe(0);
    });

    it('should analyze excessively long README', async () => {
      const longReadme = generateLongReadme(400);
      await createTestReadme(longReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        max_recommended_lines: 200,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const analysis = data.optimizationReport.analysis;
      
      expect(analysis.severity).toBe('excessive');
      expect(['poor', 'very-poor']).toContain(analysis.mobileReadability);
      expect(analysis.reductionNeeded).toBeGreaterThan(0);
      expect(analysis.currentLines).toBeGreaterThan(300);
    });

    it('should calculate read time correctly', async () => {
      const mediumReadme = generateReadmeWithWordCount(500);
      await createTestReadme(mediumReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const analysis = data.optimizationReport.analysis;
      
      expect(analysis.estimatedReadTime).toMatch(/\d+ minute/);
      expect(analysis.currentWords).toBeGreaterThan(400);
    });
  });

  describe('Content Segmentation', () => {
    it('should identify essential sections', async () => {
      const readmeWithSections = `
# Project Title

## Installation

How to install the project.

## Quick Start

Getting started guide.

## Usage

Basic usage examples.

## API Reference

Detailed API documentation.

## Contributing

How to contribute to the project.
      `;
      await createTestReadme(readmeWithSections);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const segments = data.optimizationReport.segments;
      
      const essentialSegments = segments.filter((s: any) => s.type === 'essential');
      expect(essentialSegments.length).toBeGreaterThan(0);
      
      const installSection = segments.find((s: any) => s.title.includes('Installation'));
      expect(installSection.type).toBe('essential');
      expect(installSection.priority).toBeLessThan(3);
    });

    it('should identify detailed sections for moving', async () => {
      const readmeWithDetailedSections = `
# Project Title

## API Reference

Detailed API documentation with many endpoints.

## Advanced Configuration

Complex configuration options.

## Troubleshooting

Detailed troubleshooting guide.
      `;
      await createTestReadme(readmeWithDetailedSections);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const segments = data.optimizationReport.segments;
      
      const apiSection = segments.find((s: any) => s.title.includes('API'));
      expect(apiSection.type).toBe('detailed');
      expect(apiSection.suggestedLocation).toContain('API.md');
    });

    it('should identify supplementary sections', async () => {
      const readmeWithSupplementary = `
# Project Title

## Contributing

How to contribute.

## FAQ

Frequently asked questions.

## License

MIT License information.
      `;
      await createTestReadme(readmeWithSupplementary);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const segments = data.optimizationReport.segments;
      
      const contributingSection = segments.find((s: any) => s.title.includes('Contributing'));
      expect(contributingSection.type).toBe('supplementary');
      expect(contributingSection.suggestedLocation).toContain('CONTRIBUTING.md');
      
      const faqSection = segments.find((s: any) => s.title.includes('FAQ'));
      expect(faqSection.type).toBe('supplementary');
    });
  });

  describe('Optimization Suggestions', () => {
    it('should suggest keeping essential content', async () => {
      const essentialReadme = `
# Project Title

## Installation

\`\`\`bash
npm install project
\`\`\`

## Usage

Basic usage example.
      `;
      await createTestReadme(essentialReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const suggestions = data.optimizationReport.suggestions;
      
      const keepSuggestions = suggestions.filter((s: any) => s.action === 'keep');
      expect(keepSuggestions.length).toBeGreaterThan(0);
      
      const installSuggestion = suggestions.find((s: any) => s.section.includes('Installation'));
      expect(installSuggestion.action).toBe('keep');
      expect(installSuggestion.impact).toBe('high');
    });

    it('should suggest moving detailed content', async () => {
      const detailedReadme = `
# Project Title

## API Reference

Very detailed API documentation with many sections and examples.
This section contains extensive information about all endpoints.

### Endpoint 1
Details about endpoint 1.

### Endpoint 2
Details about endpoint 2.

## Advanced Configuration

Complex configuration with many options.
      `;
      await createTestReadme(detailedReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const suggestions = data.optimizationReport.suggestions;
      
      const moveSuggestions = suggestions.filter((s: any) => s.action === 'move');
      expect(moveSuggestions.length).toBeGreaterThan(0);
      
      const apiSuggestion = suggestions.find((s: any) => s.section.includes('API'));
      expect(apiSuggestion.action).toBe('move');
      expect(apiSuggestion.newLocation).toContain('API.md');
    });

    it('should suggest condensing long essential sections', async () => {
      const longEssentialReadme = `
# Project Title

## Installation

This is a very long installation section with many details.
It includes multiple installation methods and extensive explanations.
Line 3 of installation details.
Line 4 of installation details.
Line 5 of installation details.
Line 6 of installation details.
Line 7 of installation details.
Line 8 of installation details.
Line 9 of installation details.
Line 10 of installation details.
Line 11 of installation details.
Line 12 of installation details.
Line 13 of installation details.
Line 14 of installation details.
Line 15 of installation details.
Line 16 of installation details.
Line 17 of installation details.
Line 18 of installation details.
Line 19 of installation details.
Line 20 of installation details.
Line 21 of installation details.
Line 22 of installation details.
      `;
      await createTestReadme(longEssentialReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const suggestions = data.optimizationReport.suggestions;
      
      const condenseSuggestion = suggestions.find((s: any) => s.action === 'condense');
      expect(condenseSuggestion).toBeDefined();
      expect(condenseSuggestion.condensedVersion).toBeDefined();
    });
  });

  describe('Optimized Content Generation', () => {
    it('should create optimized README with links', async () => {
      const complexReadme = `
# Project Title

## Installation

How to install.

## API Reference

Detailed API docs.

## Contributing

How to contribute.
      `;
      await createTestReadme(complexReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const optimizedReadme = data.optimizationReport.optimizedReadme;
      
      expect(optimizedReadme).toContain('# Project Title');
      expect(optimizedReadme).toContain('📖 View');
      expect(optimizedReadme).toContain('📚 Documentation');
    });

    it('should create segmented files', async () => {
      const readmeWithMovableContent = `
# Project Title

## Installation

Basic installation.

## API Reference

Detailed API documentation that should be moved.

## Contributing

Contributing guidelines that should be moved.
      `;
      await createTestReadme(readmeWithMovableContent);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const segmentedFiles = data.optimizationReport.segmentedFiles;
      
      expect(Object.keys(segmentedFiles).length).toBeGreaterThan(0);
      expect(segmentedFiles['docs/API.md'] || segmentedFiles['docs/CONTRIBUTING.md']).toBeDefined();
    });
  });

  describe('File Writing', () => {
    it('should write optimized files when output directory specified', async () => {
      const testReadme = `
# Project Title

## Installation

Basic installation.

## API Reference

Detailed API documentation.
      `;
      await createTestReadme(testReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        output_directory: outputDir,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const filesCreated = data.optimizationReport.summary.filesCreated;
      
      expect(filesCreated).toContain('README.md');
      expect(filesCreated.length).toBeGreaterThan(0);
      
      // Verify files actually exist
      const readmeExists = await fs.access(path.join(outputDir, 'README.md')).then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);
    });

    it('should preserve original README when requested', async () => {
      const testReadme = '# Original README\n\nOriginal content.';
      await createTestReadme(testReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        output_directory: outputDir,
        preserve_original: true,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const filesCreated = data.optimizationReport.summary.filesCreated;
      
      expect(filesCreated).toContain('README.original.md');
      
      // Verify original file exists and has correct content
      const originalContent = await fs.readFile(path.join(outputDir, 'README.original.md'), 'utf-8');
      expect(originalContent).toBe(testReadme);
    });

    it('should create subdirectories for segmented files', async () => {
      const testReadme = `
# Project Title

## API Reference

API documentation.

## Contributing

Contributing guidelines.
      `;
      await createTestReadme(testReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        output_directory: outputDir,
      });

      expect(result.isError).toBe(false);
      
      // Verify docs directory was created
      const docsExists = await fs.access(path.join(outputDir, 'docs')).then(() => true).catch(() => false);
      expect(docsExists).toBe(true);
    });
  });

  describe('Different Target Audiences', () => {
    it('should handle community audience', async () => {
      await createTestReadme('# Community Project\n\nCommunity-focused content.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        target_audience: 'community',
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.targetAudience).toBe('community');
    });

    it('should handle enterprise audience', async () => {
      await createTestReadme('# Enterprise Project\n\nEnterprise-focused content.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        target_audience: 'enterprise',
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.targetAudience).toBe('enterprise');
    });
  });

  describe('Summary and Metrics', () => {
    it('should calculate reduction percentage correctly', async () => {
      const longReadme = generateLongReadme(300);
      await createTestReadme(longReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        max_recommended_lines: 150,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const summary = data.optimizationReport.summary;
      
      expect(summary.originalLines).toBeGreaterThan(200);
      expect(summary.optimizedLines).toBeLessThan(summary.originalLines);
      expect(summary.reductionPercentage).toBeGreaterThan(0);
      expect(summary.estimatedImprovementTime).toMatch(/\d+\s+(minutes|hours|days)/);
    });

    it('should provide actionable recommendations', async () => {
      const excessiveReadme = generateLongReadme(500);
      await createTestReadme(excessiveReadme);

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        max_recommended_lines: 200,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const recommendations = data.recommendations;
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r: string) => r.includes('Critical') || r.includes('Warning'))).toBe(true);
    });

    it('should provide next steps', async () => {
      await createTestReadme('# Test README\n\nContent.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const nextSteps = data.nextSteps;
      
      expect(nextSteps.length).toBeGreaterThan(0);
      expect(nextSteps[0]).toContain('output_directory');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent README file', async () => {
      const result = await optimizeReadmeLength({
        readme_path: '/nonexistent/README.md',
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Failed to optimize README length');
      expect(result.content[1].text).toContain('ENOENT');
    });

    it('should handle invalid output directory permissions', async () => {
      await createTestReadme('# Test README\n\nContent.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
        output_directory: '/root/invalid-permissions',
      });

      expect(result.isError).toBe(true);
      expect(result.content[1].text).toContain('Failed to optimize README length');
    });
  });

  describe('Response Structure Validation', () => {
    it('should return proper response structure', async () => {
      await createTestReadme('# Test README\n\nBasic content for testing.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      const data = JSON.parse(result.content[0].text);
      expect(data.readmePath).toBeDefined();
      expect(data.targetAudience).toBeDefined();
      expect(data.optimizationReport).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should include all required optimization report fields', async () => {
      await createTestReadme('# Test README\n\nBasic content for testing.');

      const result = await optimizeReadmeLength({
        readme_path: testReadmePath,
      });

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      const report = data.optimizationReport;

      expect(report.analysis).toBeDefined();
      expect(report.segments).toBeDefined();
      expect(report.suggestions).toBeDefined();
      expect(report.optimizedReadme).toBeDefined();
      expect(report.segmentedFiles).toBeDefined();
      expect(report.summary).toBeDefined();

      // Check analysis structure
      expect(report.analysis.currentLines).toBeDefined();
      expect(report.analysis.severity).toBeDefined();
      expect(report.analysis.mobileReadability).toBeDefined();

      // Check summary structure
      expect(report.summary.originalLines).toBeDefined();
      expect(report.summary.optimizedLines).toBeDefined();
      expect(report.summary.reductionPercentage).toBeDefined();
    });
  });

  // Helper functions
  async function createTestReadme(content: string): Promise<void> {
    await fs.writeFile(testReadmePath, content);
  }

  function generateLongReadme(targetLines: number): string {
    const sections = [
      '# Project Title',
      '## Description',
      '## Installation',
      '## Usage',
      '## API Reference',
      '## Configuration',
      '## Examples',
      '## Advanced Usage',
      '## Troubleshooting',
      '## Contributing',
      '## License'
    ];

    let content = sections.join('\n\n');
    
    // Add filler content to reach target lines
    while (content.split('\n').length < targetLines) {
      content += '\nAdditional line of content to make the README longer.';
    }
    
    return content;
  }

  function generateReadmeWithWordCount(targetWords: number): string {
    let content = '# Project Title\n\n';
    const words = ['project', 'documentation', 'installation', 'usage', 'configuration', 'example', 'guide', 'reference'];
    
    let wordCount = 2; // "Project Title"
    while (wordCount < targetWords) {
      const word = words[Math.floor(Math.random() * words.length)];
      content += word + ' ';
      wordCount++;
    }
    
    return content;
  }
});
