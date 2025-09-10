import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { 
  validateReadmeChecklist, 
  ReadmeChecklistValidator,
  ValidateReadmeChecklistSchema 
} from '../../src/tools/validate-readme-checklist';

describe('README Checklist Validator', () => {
  let tempDir: string;
  let validator: ReadmeChecklistValidator;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    validator = new ReadmeChecklistValidator();
  });

  afterEach(async () => {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTestReadme(content: string, filename = 'README.md'): Promise<string> {
    const readmePath = path.join(tempDir, filename);
    await fs.writeFile(readmePath, content, 'utf-8');
    return readmePath;
  }

  async function createProjectFile(filename: string, content = ''): Promise<void> {
    await fs.writeFile(path.join(tempDir, filename), content, 'utf-8');
  }

  describe('Input Validation', () => {
    it('should validate required fields', () => {
      expect(() => ValidateReadmeChecklistSchema.parse({})).toThrow();
      expect(() => ValidateReadmeChecklistSchema.parse({
        readmePath: ''
      })).toThrow();
    });

    it('should accept valid input with defaults', () => {
      const input = ValidateReadmeChecklistSchema.parse({
        readmePath: '/path/to/README.md'
      });

      expect(input.strict).toBe(false);
      expect(input.outputFormat).toBe('console');
    });

    it('should validate output format options', () => {
      const validFormats = ['json', 'markdown', 'console'];
      
      for (const format of validFormats) {
        expect(() => ValidateReadmeChecklistSchema.parse({
          readmePath: '/test/README.md',
          outputFormat: format
        })).not.toThrow();
      }

      expect(() => ValidateReadmeChecklistSchema.parse({
        readmePath: '/test/README.md',
        outputFormat: 'invalid'
      })).toThrow();
    });
  });

  describe('Essential Sections Validation', () => {
    it('should detect project title', async () => {
      const goodReadme = await createTestReadme('# My Project\n\nDescription here');
      const badReadme = await createTestReadme('## Not a main title\n\nNo main heading');

      const input = ValidateReadmeChecklistSchema.parse({ readmePath: goodReadme });
      const result = await validateReadmeChecklist(input);
      const result2 = await validateReadmeChecklist(input);

      const titleCheck = result.categories['Essential Sections'].results.find(r => r.item.id === 'title');
      const badTitleCheck = result2.categories['Essential Sections'].results.find(r => r.item.id === 'title');

      expect(titleCheck?.passed).toBe(true);
      expect(badTitleCheck?.passed).toBe(false);
    });

    it('should detect project description', async () => {
      const withSubtitle = await createTestReadme('# Project\n\n> A great project description');
      const withParagraph = await createTestReadme('# Project\n\nThis is a description paragraph');
      const withoutDesc = await createTestReadme('# Project\n\n## Installation');

      const subtitleResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withSubtitle  }));
      const paragraphResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withParagraph  }));
      const noDescResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withoutDesc  }));

      const getDescCheck = (result: any) => result.categories['Essential Sections'].results.find((r: any) => r.item.id === 'description');

      expect(getDescCheck(subtitleResult)?.passed).toBe(true);
      expect(getDescCheck(paragraphResult)?.passed).toBe(true);
      expect(getDescCheck(noDescResult)?.passed).toBe(false);
    });

    it('should detect TL;DR section', async () => {
      const withTldr = await createTestReadme('# Project\n\n## TL;DR\n\nQuick summary');
      const withSummary = await createTestReadme('# Project\n\n## Summary\n\nQuick summary');
      const withoutTldr = await createTestReadme('# Project\n\n## Installation');

      const input = ValidateReadmeChecklistSchema.parse({ readmePath: withTldr });
      const result = await validateReadmeChecklist(input);
      const result2 = await validateReadmeChecklist(input);
      const result3 = await validateReadmeChecklist(input);

      const getTldrCheck = (result: any) => result.categories['Essential Sections'].results.find((r: any) => r.item.id === 'tldr');

      expect(getTldrCheck(result)?.passed).toBe(true);
      expect(getTldrCheck(result2)?.passed).toBe(true);
      expect(getTldrCheck(result3)?.passed).toBe(true);
      expect(getTldrCheck(result3)?.passed).toBe(true);
    });

    it('should detect installation instructions with code blocks', async () => {
      const goodInstall = await createTestReadme(`
# Project
## Installation
\`\`\`bash
npm install project
\`\`\`
      `);
      
      const noCodeBlocks = await createTestReadme(`
# Project
## Installation
Just install it somehow
      `);

      const noInstallSection = await createTestReadme('# Project\n\nSome content');

      const goodResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: goodInstall  }));
      const noCodeResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: noCodeBlocks  }));
      const noSectionResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: noInstallSection  }));

      const getInstallCheck = (result: any) => result.categories['Essential Sections'].results.find((r: any) => r.item.id === 'installation');

      expect(getInstallCheck(goodResult)?.passed).toBe(true);
      expect(getInstallCheck(noCodeResult)?.passed).toBe(false);
      expect(getInstallCheck(noSectionResult)?.passed).toBe(false);
    });

    it('should detect usage examples', async () => {
      const goodUsage = await createTestReadme(`
# Project
## Usage
\`\`\`javascript
const lib = require('lib');
lib.doSomething();
\`\`\`
      `);

      const noUsage = await createTestReadme('# Project\n\nNo usage section');

      const goodResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: goodUsage  }));
      const noUsageResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: noUsage  }));

      const getUsageCheck = (result: any) => result.categories['Essential Sections'].results.find((r: any) => r.item.id === 'usage');

      expect(getUsageCheck(goodResult)?.passed).toBe(true);
      expect(getUsageCheck(noUsageResult)?.passed).toBe(false);
    });

    it('should detect license information', async () => {
      const readmeWithLicense = await createTestReadme('# Project\n\n## License\n\nMIT');
      const readmeWithoutLicense = await createTestReadme('# Project\n\nNo license info');
      
      // Test with LICENSE file
      await createProjectFile('LICENSE', 'MIT License...');
      const readmeWithLicenseFile = await createTestReadme('# Project\n\nSome content');

      const withLicenseResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readmeWithLicense,
        projectPath: tempDir 
       }));
      const withoutLicenseResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readmeWithoutLicense,
        projectPath: tempDir 
       }));
      const withLicenseFileResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readmeWithLicenseFile,
        projectPath: tempDir 
       }));

      const getLicenseCheck = (result: any) => result.categories['Essential Sections'].results.find((r: any) => r.item.id === 'license');

      expect(getLicenseCheck(withLicenseResult)?.passed).toBe(true);
      expect(getLicenseCheck(withoutLicenseResult)?.passed).toBe(false);
      expect(getLicenseCheck(withLicenseFileResult)?.passed).toBe(true);
    });
  });

  describe('Community Health Validation', () => {
    it('should detect contributing guidelines', async () => {
      const readmeWithContributing = await createTestReadme('# Project\n\n## Contributing\n\nSee CONTRIBUTING.md');
      await createProjectFile('CONTRIBUTING.md', 'Contributing guidelines...');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readmeWithContributing,
        projectPath: tempDir 
       }));

      const contributingCheck = result.categories['Community Health'].results.find(r => r.item.id === 'contributing');
      expect(contributingCheck?.passed).toBe(true);
    });

    it('should detect code of conduct', async () => {
      await createProjectFile('CODE_OF_CONDUCT.md', 'Code of conduct...');
      const readme = await createTestReadme('# Project\n\nSome content');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        projectPath: tempDir 
       }));

      const cocCheck = result.categories['Community Health'].results.find(r => r.item.id === 'code-of-conduct');
      expect(cocCheck?.passed).toBe(true);
    });

    it('should detect security policy', async () => {
      await createProjectFile('SECURITY.md', 'Security policy...');
      const readme = await createTestReadme('# Project\n\nSome content');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        projectPath: tempDir 
       }));

      const securityCheck = result.categories['Community Health'].results.find(r => r.item.id === 'security');
      expect(securityCheck?.passed).toBe(true);
    });
  });

  describe('Visual Elements Validation', () => {
    it('should detect status badges', async () => {
      const withBadges = await createTestReadme(`
# Project
[![Build Status](https://travis-ci.org/user/repo.svg?branch=main)](https://travis-ci.org/user/repo)
[![npm version](https://badge.fury.io/js/package.svg)](https://badge.fury.io/js/package)
      `);

      const withoutBadges = await createTestReadme('# Project\n\nNo badges here');

      const withBadgesResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withBadges  }));
      const withoutBadgesResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withoutBadges  }));

      const getBadgeCheck = (result: any) => result.categories['Visual Elements'].results.find((r: any) => r.item.id === 'badges');

      expect(getBadgeCheck(withBadgesResult)?.passed).toBe(true);
      expect(getBadgeCheck(withoutBadgesResult)?.passed).toBe(false);
    });

    it('should detect screenshots and images', async () => {
      const withScreenshots = await createTestReadme(`
# Project
![Screenshot](screenshot.png)
![Demo](demo.gif)
      `);

      const withoutScreenshots = await createTestReadme('# Project\n\nNo images');

      const withScreenshotsResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withScreenshots  }));
      const withoutScreenshotsResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withoutScreenshots  }));

      const getScreenshotCheck = (result: any) => result.categories['Visual Elements'].results.find((r: any) => r.item.id === 'screenshots');

      expect(getScreenshotCheck(withScreenshotsResult)?.passed).toBe(true);
      expect(getScreenshotCheck(withoutScreenshotsResult)?.passed).toBe(false);
    });

    it('should validate markdown formatting', async () => {
      const goodFormatting = await createTestReadme(`
# Main Title
## Section 1
### Subsection
## Section 2
      `);

      const poorFormatting = await createTestReadme(`
# Title
#Another Title
##Poor Spacing
      `);

      const goodResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: goodFormatting  }));
      const poorResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: poorFormatting  }));

      const getFormattingCheck = (result: any) => result.categories['Visual Elements'].results.find((r: any) => r.item.id === 'formatting');

      expect(getFormattingCheck(goodResult)?.passed).toBe(true);
      expect(getFormattingCheck(poorResult)?.passed).toBe(false);
    });
  });

  describe('Content Quality Validation', () => {
    it('should detect working code examples', async () => {
      const withCodeExamples = await createTestReadme(`
# Project
\`\`\`javascript
const lib = require('lib');
lib.doSomething();
\`\`\`

\`\`\`bash
npm install lib
\`\`\`
      `);

      const withoutCodeExamples = await createTestReadme('# Project\n\nNo code examples');

      const withCodeResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withCodeExamples  }));
      const withoutCodeResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: withoutCodeExamples  }));

      const getCodeCheck = (result: any) => result.categories['Content Quality'].results.find((r: any) => r.item.id === 'working-examples');

      expect(getCodeCheck(withCodeResult)?.passed).toBe(true);
      expect(getCodeCheck(withoutCodeResult)?.passed).toBe(false);
    });

    it('should validate appropriate length', async () => {
      const shortReadme = await createTestReadme('# Project\n\nShort content');
      const longContent = '# Project\n\n' + 'Long line of content.\n'.repeat(350);
      const longReadme = await createTestReadme(longContent);

      const shortResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: shortReadme  }));
      const longResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: longReadme  }));

      const getLengthCheck = (result: any) => result.categories['Content Quality'].results.find((r: any) => r.item.id === 'appropriate-length');

      expect(getLengthCheck(shortResult)?.passed).toBe(true);
      expect(getLengthCheck(longResult)?.passed).toBe(false);
    });

    it('should validate scannable structure', async () => {
      const goodStructure = await createTestReadme(`
# Main Title
## Section 1
### Subsection 1.1
### Subsection 1.2
## Section 2
### Subsection 2.1
      `);

      const poorStructure = await createTestReadme(`
# Title
#### Skipped levels
## Back to level 2
      `);

      const goodResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: goodStructure  }));
      const poorResult = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: poorStructure  }));

      const getStructureCheck = (result: any) => result.categories['Content Quality'].results.find((r: any) => r.item.id === 'scannable-structure');

      expect(getStructureCheck(goodResult)?.passed).toBe(true);
      expect(getStructureCheck(poorResult)?.passed).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report with all categories', async () => {
      const readme = await createTestReadme(`
# Test Project
> A test project description

## TL;DR
Quick summary of the project.

## Quick Start
\`\`\`bash
npm install test-project
\`\`\`

## Usage
\`\`\`javascript
const test = require('test-project');
test.run();
\`\`\`

## License
MIT
      `);

      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme  }));

      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.totalItems).toBeGreaterThan(0);
      expect(result.passedItems).toBeGreaterThan(0);
      expect(result.categories).toHaveProperty('Essential Sections');
      expect(result.categories).toHaveProperty('Community Health');
      expect(result.categories).toHaveProperty('Visual Elements');
      expect(result.categories).toHaveProperty('Content Quality');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.estimatedReadTime).toBeGreaterThan(0);
    });

    it('should calculate scores correctly', async () => {
      const perfectReadme = await createTestReadme(`
# Perfect Project
> An amazing project that does everything right

[![Build Status](https://travis-ci.org/user/repo.svg)](https://travis-ci.org/user/repo)

## TL;DR
This project is perfect and demonstrates all best practices.

## Quick Start
\`\`\`bash
npm install perfect-project
\`\`\`

## Usage
\`\`\`javascript
const perfect = require('perfect-project');
perfect.doSomething();
\`\`\`

## Contributing
See CONTRIBUTING.md for guidelines.

## License
MIT © Author
      `);

      await createProjectFile('CONTRIBUTING.md', 'Guidelines...');
      await createProjectFile('LICENSE', 'MIT License...');

      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: perfectReadme,
        projectPath: tempDir 
       }));

      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.categories['Essential Sections'].score).toBeGreaterThan(80);
    });

    it('should provide helpful recommendations', async () => {
      const poorReadme = await createTestReadme('# Poor Project\n\nMinimal content');

      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: poorReadme  }));

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(50);
    });
  });

  describe('Output Formatting', () => {
    it('should format console output correctly', async () => {
      const readme = await createTestReadme('# Test\n\nContent');
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        outputFormat: 'console' 
       }));

      const formatted = validator.formatReport(result, 'console');
      
      expect(formatted).toContain('📋 README Checklist Report');
      expect(formatted).toContain('Overall Score:');
      expect(formatted).toContain('Essential Sections');
      expect(formatted).toContain('✅');
      expect(formatted).toContain('❌');
    });

    it('should format markdown output correctly', async () => {
      const readme = await createTestReadme('# Test\n\nContent');
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        outputFormat: 'markdown' 
       }));

      const formatted = validator.formatReport(result, 'markdown');
      
      expect(formatted).toContain('# README Checklist Report');
      expect(formatted).toContain('## Overall Score:');
      expect(formatted).toContain('### Essential Sections');
      expect(formatted).toContain('- ✅');
      expect(formatted).toContain('- ❌');
    });

    it('should format JSON output correctly', async () => {
      const readme = await createTestReadme('# Test\n\nContent');
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        outputFormat: 'json' 
       }));

      const formatted = validator.formatReport(result, 'json');
      const parsed = JSON.parse(formatted);
      
      expect(parsed).toHaveProperty('overallScore');
      expect(parsed).toHaveProperty('categories');
      expect(parsed).toHaveProperty('recommendations');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent README file', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.md');
      
      await expect(validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: nonExistentPath 
       }))).rejects.toThrow();
    });

    it('should handle invalid project path gracefully', async () => {
      const readme = await createTestReadme('# Test\n\nContent');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: readme,
        projectPath: '/invalid/path' 
       }));

      // Should still work, just without project file context
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should handle empty README file', async () => {
      const emptyReadme = await createTestReadme('');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: emptyReadme  }));
      
      expect(result.overallScore).toBe(0);
      expect(result.passedItems).toBe(0);
    });
  });

  describe('Suggestions Generation', () => {
    it('should provide specific suggestions for failed checks', async () => {
      const incompleteReadme = await createTestReadme('# Project\n\nMinimal content');
      
      const result = await validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: incompleteReadme  }));
      
      const failedChecks = Object.values(result.categories)
        .flatMap(cat => cat.results)
        .filter(r => !r.passed && r.suggestions);
      
      expect(failedChecks.length).toBeGreaterThan(0);
      
      for (const check of failedChecks) {
        expect(check.suggestions).toBeDefined();
        expect(check.suggestions!.length).toBeGreaterThan(0);
      }
    });
  });
});
