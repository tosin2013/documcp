import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { handleValidateDiataxisContent, validateGeneralContent } from '../../src/tools/validate-content.js';
import { ValidationResult } from '../../src/tools/validate-content.js';

describe('Content Validation Tool', () => {
  const testTempDir = path.join(__dirname, '../../.tmp/test-validation');
  
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testTempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testTempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Application Code Validation', () => {
    it('should detect application code path correctly', async () => {
      // Create mock application structure
      const appDir = path.join(testTempDir, 'mock-app');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "test-app"}');
      
      // Create TypeScript file without documentation
      const tsFile = path.join(appDir, 'src', 'index.ts');
      await fs.writeFile(tsFile, `
export function undocumentedFunction(param: string): string {
  return param.toUpperCase();
}

export const anotherFunction = (value: number) => {
  if (value < 0) {
    throw new Error('Invalid value');
  }
  return value * 2;
};
      `.trim());

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'compliance',
        includeCodeValidation: true
      });

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      
      // Should find issues with undocumented exported functions
      const undocumentedIssues = result.issues.filter(issue => 
        issue.description.includes('lacks documentation')
      );
      expect(undocumentedIssues.length).toBeGreaterThan(0);

      // Should find issues with undocumented error throwing
      const errorDocIssues = result.issues.filter(issue => 
        issue.description.includes('Error throwing code found without error documentation')
      );
      expect(errorDocIssues.length).toBeGreaterThan(0);
    });

    it('should validate application architecture structure', async () => {
      // Create mock application with missing directories
      const appDir = path.join(testTempDir, 'incomplete-app');
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "incomplete-app"}');
      
      // Missing tools and types directories
      await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(appDir, 'src', 'index.ts'), 'export const app = "test";');

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'compliance',
        includeCodeValidation: false
      });

      const structureIssues = result.issues.filter(issue => 
        issue.location.file === 'application structure'
      );
      expect(structureIssues.length).toBeGreaterThan(0);
      
      // Should suggest missing tools directory
      const toolsIssue = structureIssues.find(issue => 
        issue.description.includes('tools directory')
      );
      expect(toolsIssue).toBeDefined();
    });

    it('should validate README structure', async () => {
      const appDir = path.join(testTempDir, 'readme-test');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "readme-test"}');
      await fs.writeFile(path.join(appDir, 'src', 'index.ts'), 'export const app = "test";');
      
      // Create README with missing sections
      await fs.writeFile(path.join(appDir, 'README.md'), `
This is a project without proper structure.
Some description here.
      `.trim());

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'compliance',
        includeCodeValidation: false
      });

      // Application validation should find issues

      const readmeIssues = result.issues.filter(issue => 
        issue.location.file === 'README.md'
      );
      expect(readmeIssues.length).toBeGreaterThan(0);
      
      // Should find issues with README structure
      const structureIssue = readmeIssues.find(issue => 
        issue.description.includes('lacks essential sections')
      );
      expect(structureIssue).toBeDefined();
    });

    it('should detect properly documented functions', async () => {
      const appDir = path.join(testTempDir, 'documented-app');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "documented-app"}');
      
      // Create well-documented TypeScript file
      const tsFile = path.join(appDir, 'src', 'documented.ts');
      await fs.writeFile(tsFile, `
/**
 * Converts a string to uppercase
 * @param param - The input string
 * @returns The uppercase string
 */
export function documentedFunction(param: string): string {
  return param.toUpperCase();
}

/**
 * Doubles a positive number
 * @param value - The input number (must be positive)
 * @returns The doubled value
 * @throws {Error} When value is negative
 */
export const wellDocumentedFunction = (value: number) => {
  if (value < 0) {
    throw new Error('Invalid value');
  }
  return value * 2;
};
      `.trim());

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'compliance',
        includeCodeValidation: true
      });

      // Should have no undocumented issues since functions are properly documented
      const undocumentedIssues = result.issues.filter(issue => 
        issue.description.includes('lacks documentation')
      );
      expect(undocumentedIssues.length).toBe(0);

      // Should not complain about error documentation
      const errorDocIssues = result.issues.filter(issue => 
        issue.description.includes('Error throwing code found without error documentation')
      );
      expect(errorDocIssues.length).toBe(0);
    });
  });

  describe('Documentation Validation', () => {
    it('should detect documentation directory correctly', async () => {
      // Create mock documentation structure
      const docsDir = path.join(testTempDir, 'docs');
      await fs.mkdir(docsDir, { recursive: true });
      await fs.mkdir(path.join(docsDir, 'tutorials'), { recursive: true });
      
      await fs.writeFile(path.join(docsDir, 'tutorials', 'tutorial1.md'), `
# Tutorial 1

This is a tutorial without prerequisites section.

\`\`\`javascript
console.log("hello")
\`\`\`
      `.trim());

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: 'compliance',
        includeCodeValidation: true
      });

      expect(result).toBeDefined();
      
      // Should find Diataxis compliance issues
      const complianceIssues = result.issues.filter(issue => 
        issue.category === 'compliance'
      );
      expect(complianceIssues.length).toBeGreaterThan(0);

      // Should find missing prerequisites in tutorial
      const prereqIssue = complianceIssues.find(issue => 
        issue.description.includes('prerequisites')
      );
      expect(prereqIssue).toBeDefined();
    });

    it('should validate link integrity', async () => {
      const docsDir = path.join(testTempDir, 'docs-links');
      await fs.mkdir(docsDir, { recursive: true });
      
      // Create file with broken internal link
      await fs.writeFile(path.join(docsDir, 'index.md'), `
# Documentation

[Broken Link](./nonexistent.md)
[Another Link](./other.md)
      `.trim());
      
      // Create the referenced file
      await fs.writeFile(path.join(docsDir, 'other.md'), '# Other Page');

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: 'accuracy',
        includeCodeValidation: false
      });

      const linkIssues = result.issues.filter(issue => 
        issue.description.includes('Broken internal link')
      );
      expect(linkIssues.length).toBe(1);
      
      const brokenLink = linkIssues[0];
      expect(brokenLink.description).toContain('nonexistent.md');
    });

    it('should validate code blocks in documentation', async () => {
      const docsDir = path.join(testTempDir, 'docs-code');
      await fs.mkdir(docsDir, { recursive: true });
      
      await fs.writeFile(path.join(docsDir, 'guide.md'), `
# Code Examples

\`\`\`javascript
// Missing semicolon
console.log("test")
\`\`\`

\`\`\`json
{ "valid": "json" }
\`\`\`

\`\`\`json
{ "invalid": json }
\`\`\`
      `.trim());

      const result = await handleValidateDiataxisContent({
        contentPath: docsDir,
        validationType: 'all',
        includeCodeValidation: true
      });

      expect(result.codeValidation).toBeDefined();
      expect(result.codeValidation!.exampleResults.length).toBeGreaterThan(0);
      
      // Should find JSON syntax error
      const jsonErrors = result.codeValidation!.exampleResults.filter(ex => 
        ex.issues.some(issue => issue.description.includes('Invalid JSON'))
      );
      expect(jsonErrors.length).toBeGreaterThan(0);
    });
  });

  describe('General Content Validation', () => {
    it('should validate general content with link checking', async () => {
      const contentDir = path.join(testTempDir, 'general-content');
      await fs.mkdir(contentDir, { recursive: true });
      
      await fs.writeFile(path.join(contentDir, 'page.md'), `
# Test Page

[Good Link](./existing.md)
[Bad Link](./missing.md)

\`\`\`js
console.log("missing semicolon")
\`\`\`
      `.trim());
      
      await fs.writeFile(path.join(contentDir, 'existing.md'), '# Existing Page');

      const result = await validateGeneralContent({
        contentPath: contentDir,
        validationType: 'all',
        includeCodeValidation: true
      });

      expect(result.success).toBe(false);
      expect(result.brokenLinks.length).toBe(1);
      expect(result.brokenLinks[0]).toContain('missing.md');
      expect(result.codeBlocksValidated).toBeGreaterThan(0);
      expect(result.codeErrors.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should pass validation for clean content', async () => {
      const contentDir = path.join(testTempDir, 'clean-content');
      await fs.mkdir(contentDir, { recursive: true });
      
      await fs.writeFile(path.join(contentDir, 'clean.md'), `
# Clean Page

[Good Link](./other.md)

\`\`\`json
{ "valid": "json" }
\`\`\`
      `.trim());
      
      await fs.writeFile(path.join(contentDir, 'other.md'), '# Other Page');

      const result = await validateGeneralContent({
        contentPath: contentDir,
        validationType: 'all',
        includeCodeValidation: true
      });

      expect(result.success).toBe(true);
      expect(result.brokenLinks.length).toBe(0);
      expect(result.recommendations).toContain('Content validation passed - no critical issues found');
    });
  });

  describe('Confidence Metrics', () => {
    it('should calculate confidence metrics correctly', async () => {
      const appDir = path.join(testTempDir, 'confidence-test');
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "confidence-test"}');
      await fs.writeFile(path.join(appDir, 'src', 'index.ts'), 'export const test = "value";');

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'all',
        includeCodeValidation: true
      });

      expect(result.confidence).toBeDefined();
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(100);
      
      expect(result.confidence.breakdown).toBeDefined();
      expect(result.confidence.breakdown.technologyDetection).toBeDefined();
      expect(result.confidence.breakdown.codeExampleRelevance).toBeDefined();
      expect(result.confidence.breakdown.architecturalAssumptions).toBeDefined();
    });

    it('should provide recommendations based on confidence', async () => {
      const appDir = path.join(testTempDir, 'recommendations-test');
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(path.join(appDir, 'package.json'), '{"name": "recommendations-test"}');
      
      // Create content that will generate issues
      await fs.writeFile(path.join(appDir, 'README.md'), 'No proper structure');

      const result = await handleValidateDiataxisContent({
        contentPath: appDir,
        validationType: 'all',
        includeCodeValidation: false
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      
      if (result.confidence.overall < 70) {
        expect(result.recommendations.some(rec => 
          rec.includes('comprehensive review')
        )).toBe(true);
      }
    });
  });
});