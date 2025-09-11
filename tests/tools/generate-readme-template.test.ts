import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { 
  generateReadmeTemplate, 
  ReadmeTemplateGenerator,
  GenerateReadmeTemplateSchema,
  TemplateType 
} from '../../src/tools/generate-readme-template';

describe('README Template Generator', () => {
  let tempDir: string;
  let generator: ReadmeTemplateGenerator;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    generator = new ReadmeTemplateGenerator();
  });

  afterEach(async () => {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      expect(() => GenerateReadmeTemplateSchema.parse({})).toThrow();
      expect(() => GenerateReadmeTemplateSchema.parse({
        projectName: '',
        description: 'test'
      })).toThrow();
      expect(() => GenerateReadmeTemplateSchema.parse({
        projectName: 'test',
        description: ''
      })).toThrow();
    });

    it('should accept valid input with defaults', () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'test-project',
        description: 'A test project',
        templateType: 'library'
      });

      expect(input.license).toBe('MIT');
      expect(input.includeScreenshots).toBe(false);
      expect(input.includeBadges).toBe(true);
      expect(input.includeContributing).toBe(true);
    });

    it('should validate template types', () => {
      expect(() => GenerateReadmeTemplateSchema.parse({
        projectName: 'test',
        description: 'test',
        templateType: 'invalid-type'
      })).toThrow();

      const validTypes: TemplateType[] = ['library', 'application', 'cli-tool', 'api', 'documentation'];
      for (const type of validTypes) {
        expect(() => GenerateReadmeTemplateSchema.parse({
          projectName: 'test',
          description: 'test',
          templateType: type
        })).not.toThrow();
      }
    });
  });

  describe('Template Generation', () => {
    it('should generate library template correctly', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'awesome-lib',
        description: 'An awesome JavaScript library',
        templateType: 'library',
        author: 'john-doe'
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('# awesome-lib');
      expect(result.content).toContain('> An awesome JavaScript library');
      expect(result.content).toContain('npm install awesome-lib');
      expect(result.content).toContain('const awesomeLib = require(\'awesome-lib\')');
      expect(result.content).toContain('## TL;DR');
      expect(result.content).toContain('## Quick Start');
      expect(result.content).toContain('## API Documentation');
      expect(result.content).toContain('MIT © john-doe');
      expect(result.metadata.templateType).toBe('library');
      expect(result.metadata.estimatedLength).toBe(150);
    });

    it('should generate application template correctly', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'my-app',
        description: 'A web application',
        templateType: 'application',
        author: 'jane-doe',
        includeScreenshots: true
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('# my-app');
      expect(result.content).toContain('> A web application');
      expect(result.content).toContain('## What This Does');
      expect(result.content).toContain('git clone https://github.com/jane-doe/my-app.git');
      expect(result.content).toContain('npm start');
      expect(result.content).toContain('## Configuration');
      expect(result.content).toContain('![my-app Screenshot]');
      expect(result.metadata.templateType).toBe('application');
    });

    it('should generate CLI tool template correctly', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'my-cli',
        description: 'A command line tool',
        templateType: 'cli-tool',
        author: 'dev-user'
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('# my-cli');
      expect(result.content).toContain('npm install -g my-cli');
      expect(result.content).toContain('npx my-cli --help');
      expect(result.content).toContain('## Usage');
      expect(result.content).toContain('## Options');
      expect(result.content).toContain('| Option | Description | Default |');
      expect(result.metadata.templateType).toBe('cli-tool');
    });

    it('should handle camelCase conversion correctly', () => {
      const testCases = [
        { input: 'my-awesome-lib', expected: 'myAwesomeLib' },
        { input: 'simple_package', expected: 'simplePackage' },
        { input: 'Mixed-Case_Name', expected: 'mixedCaseName' },
        { input: 'single', expected: 'single' }
      ];

      for (const testCase of testCases) {
        const generator = new ReadmeTemplateGenerator();
        const input = GenerateReadmeTemplateSchema.parse({
          projectName: testCase.input,
          description: 'test',
          templateType: 'library'
        });
        const result = generator.generateTemplate(input);
        
        expect(result).toContain(`const ${testCase.expected} = require('${testCase.input}')`);
      }
    });
  });

  describe('Badge Generation', () => {
    it('should include badges when enabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'badge-lib',
        description: 'Library with badges',
        templateType: 'library',
        author: 'dev',
        includeBadges: true
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('[![npm version]');
      expect(result.content).toContain('[![Build Status]');
      expect(result.content).toContain('[![License: MIT]');
      expect(result.content).toContain('dev/badge-lib');
    });

    it('should exclude badges when disabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'no-badge-lib',
        description: 'Library without badges',
        templateType: 'library',
        includeBadges: false
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).not.toContain('[![');
    });

    it('should customize badge URLs with author', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'app-with-badges',
        description: 'App with custom badges',
        templateType: 'application',
        author: 'dev',
        includeBadges: true
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('dev/app-with-badges');
    });
  });

  describe('Screenshot Handling', () => {
    it('should include screenshot placeholder when enabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'screenshot-app',
        description: 'App with screenshots',
        templateType: 'application',
        includeScreenshots: true
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('![screenshot-app Screenshot](docs/screenshot.png)');
      expect(result.content).toContain('*Add a screenshot or demo GIF here*');
    });

    it('should exclude screenshots when disabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'no-screenshot-app',
        description: 'App without screenshots',
        templateType: 'application',
        includeScreenshots: false
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).not.toContain('![visual-app Screenshot]');
    });
  });

  describe('Contributing Section', () => {
    it('should include contributing section when enabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'contrib-lib',
        description: 'Library with contributing section',
        templateType: 'library',
        includeContributing: true
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('## Contributing');
      expect(result.content).toContain('CONTRIBUTING.md');
    });

    it('should exclude contributing section when disabled', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'no-contrib-lib',
        description: 'Library without contributing section',
        templateType: 'library',
        includeContributing: false
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).not.toContain('## Contributing');
    });
  });

  describe('File Output', () => {
    it('should write to file when outputPath is specified', async () => {
      const outputPath = path.join(tempDir, 'README.md');
      
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'output-lib',
        description: 'Library with file output',
        templateType: 'library',
        outputPath: outputPath
      });
      const result = await generateReadmeTemplate(input);

      await expect(fs.access(outputPath)).resolves.toBeUndefined();
      const fileContent = await fs.readFile(outputPath, 'utf-8');
      expect(fileContent).toBe(result.content);
      expect(fileContent).toContain('# output-lib');
    });

    it('should not write file when outputPath is not specified', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'no-file-test',
        description: 'Library without file output',
        templateType: 'library'
      });
      await generateReadmeTemplate(input);

      const possiblePath = path.join(tempDir, 'README.md');
      await expect(fs.access(possiblePath)).rejects.toThrow();
    });
  });

  describe('Template Metadata', () => {
    it('should return correct metadata for each template type', () => {
      const templateTypes: TemplateType[] = ['library', 'application', 'cli-tool'];
      
      for (const type of templateTypes) {
        const info = generator.getTemplateInfo(type);
        expect(info).toBeDefined();
        expect(info!.type).toBe(type);
        expect(info!.estimatedLength).toBeGreaterThan(0);
      }
    });

    it('should return null for invalid template type', () => {
      const info = generator.getTemplateInfo('invalid' as TemplateType);
      expect(info).toBeNull();
    });

    it('should count sections correctly', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'error-lib',
        description: 'Library that causes error',
        templateType: 'library'
      });
      const result = await generateReadmeTemplate(input);

      const sectionCount = (result.content.match(/^##\s/gm) || []).length;
      expect(result.metadata.sectionsIncluded).toBeGreaterThanOrEqual(sectionCount);
      expect(result.metadata.sectionsIncluded).toBeGreaterThan(3);
    });
  });

  describe('Available Templates', () => {
    it('should return list of available template types', () => {
      const availableTypes = generator.getAvailableTemplates();
      expect(availableTypes).toContain('library');
      expect(availableTypes).toContain('application');
      expect(availableTypes).toContain('cli-tool');
      expect(availableTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported template type', async () => {
      const generator = new ReadmeTemplateGenerator();
      expect(() => generator.generateTemplate({
        projectName: 'test',
        description: 'test',
        templateType: 'unsupported' as TemplateType,
        license: 'MIT',
        includeScreenshots: false,
        includeBadges: true,
        includeContributing: true
      })).toThrow('Template type "unsupported" not supported');
    });

    it('should handle file write errors gracefully', async () => {
      const invalidPath = '/invalid/nonexistent/path/README.md';
      
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'error-test',
        description: 'test error handling',
        templateType: 'library',
        outputPath: invalidPath
      });
      await expect(generateReadmeTemplate(input)).rejects.toThrow();
    });
  });

  describe('Variable Replacement', () => {
    it('should replace all template variables correctly', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'license-lib',
        description: 'Library with custom license',
        templateType: 'library',
        author: 'dev',
        license: 'Apache-2.0'
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).not.toContain('{{projectName}}');
      expect(result.content).not.toContain('{{description}}');
      expect(result.content).not.toContain('{{author}}');
      expect(result.content).not.toContain('{{license}}');
      expect(result.content).toContain('license-lib');
      expect(result.content).toContain('Library with custom license');
      expect(result.content).toContain('dev');
      expect(result.content).toContain('Apache-2.0');
    });

    it('should use default values for missing optional fields', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'time-lib',
        description: 'Library with timing',
        templateType: 'library'
      });
      const result = await generateReadmeTemplate(input);

      expect(result.content).toContain('your-username');
      expect(result.content).toContain('MIT');
    });
  });

  describe('Template Structure Validation', () => {
    it('should generate valid markdown structure', async () => {
      const input = GenerateReadmeTemplateSchema.parse({
        projectName: 'structure-test',
        description: 'test structure',
        templateType: 'library'
      });
      const result = await generateReadmeTemplate(input);

      // Check for proper heading hierarchy
      const lines = result.content.split('\n');
      const headings = lines.filter(line => line.startsWith('#'));
      
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0]).toMatch(/^#\s+/); // Main title
      
      // Check for code blocks
      expect(result.content).toMatch(/```[\s\S]*?```/);
      
      // Check for proper spacing
      expect(result.content).not.toMatch(/#{1,6}\s*\n\s*#{1,6}/);
    });

    it('should maintain consistent formatting across templates', async () => {
      const templateTypes: TemplateType[] = ['library', 'application', 'cli-tool'];
      
      for (const type of templateTypes) {
        const input = GenerateReadmeTemplateSchema.parse({
          projectName: 'format-test',
          description: 'test format',
          templateType: type
        });
        const result = await generateReadmeTemplate(input);

        // All templates should have main title
        expect(result.content).toMatch(/^#\s+format-test/m);
        
        // All templates should have license section
        expect(result.content).toContain('## License');
        
        // All templates should end with license info
        expect(result.content.trim()).toMatch(/MIT © your-username$/);
      }
    });
  });
});
