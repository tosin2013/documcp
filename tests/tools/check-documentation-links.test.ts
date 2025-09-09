import { checkDocumentationLinks } from '../../src/tools/check-documentation-links.js';
import { formatMCPResponse } from '../../src/types/api.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('checkDocumentationLinks', () => {
  const testDir = join(process.cwd(), 'test-docs-temp');
  
  beforeEach(async () => {
    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'guides'), { recursive: true });
    await mkdir(join(testDir, 'api'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Input Validation', () => {
    test('should use default values for optional parameters', async () => {
      await writeFile(join(testDir, 'README.md'), '# Test\n[Link](./guides/test.md)');
      await writeFile(join(testDir, 'guides', 'test.md'), '# Guide');

      const result = await checkDocumentationLinks({
        documentation_path: testDir
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"totalLinks": 1');
    });

    test('should validate timeout_ms parameter', async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        timeout_ms: 500 // Below minimum
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('Number must be greater than or equal to 1000');
    });

    test('should validate max_concurrent_checks parameter', async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        max_concurrent_checks: 25 // Above maximum
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('Number must be less than or equal to 20');
    });
  });

  describe('File Scanning', () => {
    test('should find markdown files in nested directories', async () => {
      await writeFile(join(testDir, 'README.md'), '# Root');
      await writeFile(join(testDir, 'guides', 'guide1.md'), '# Guide 1');
      await writeFile(join(testDir, 'api', 'reference.mdx'), '# API Reference');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"filesScanned": 3');
    });

    test('should handle empty documentation directory', async () => {
      const result = await checkDocumentationLinks({
        documentation_path: testDir
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('No documentation files found');
    });

    test('should handle non-existent directory', async () => {
      const result = await checkDocumentationLinks({
        documentation_path: '/non/existent/path'
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
    });
  });

  describe('Link Extraction', () => {
    test('should extract markdown links', async () => {
      const content = `# Test Document
[Internal Link](./guides/test.md)
[External Link](https://example.com)
`;
      await writeFile(join(testDir, 'test.md'), content);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"totalLinks": 1');
    });

    test('should extract HTML links', async () => {
      const content = `# Test Document
<a href="./guides/test.md">Internal Link</a>
<a href="https://example.com">External Link</a>
`;
      await writeFile(join(testDir, 'test.md'), content);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test('should skip mailto and tel links', async () => {
      const content = `# Contact
[Email](mailto:test@example.com)
[Phone](tel:+1234567890)
[Valid Link](./test.md)
`;
      await writeFile(join(testDir, 'contact.md'), content);
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check the valid link, not mailto/tel
    });
  });

  describe('Internal Link Checking', () => {
    test('should validate existing internal links', async () => {
      await writeFile(join(testDir, 'README.md'), '[Valid](./guides/test.md)');
      await mkdir(join(testDir, 'guides'), { recursive: true });
      await writeFile(join(testDir, 'guides', 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"status": "valid"');
    });

    test('should detect broken internal links', async () => {
      await writeFile(join(testDir, 'README.md'), '[Broken](./missing.md)');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
        fail_on_broken_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"status": "broken"');
    });

    test('should handle relative path navigation', async () => {
      await writeFile(join(testDir, 'guides', 'guide1.md'), '[Back](../README.md)');
      await writeFile(join(testDir, 'README.md'), '# Root');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"status": "valid"');
    });

    test('should handle anchor links in internal files', async () => {
      await writeFile(join(testDir, 'README.md'), '[Section](./guide.md#section)');
      await writeFile(join(testDir, 'guide.md'), '# Guide\n## Section');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });
  });

  describe('External Link Checking', () => {
    test('should skip external links when disabled', async () => {
      await writeFile(join(testDir, 'README.md'), '[External](https://example.com)');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should have 0 links checked since external checking is disabled
    });

    test('should respect allowed domains', async () => {
      await writeFile(join(testDir, 'README.md'), `
[Allowed](https://github.com/test)
[Not Allowed](https://example.com)
`);

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        allowed_domains: ['github.com']
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });

    test('should handle timeout for slow external links', async () => {
      await writeFile(join(testDir, 'README.md'), '[Slow](https://httpstat.us/200?sleep=10000)');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: true,
        timeout_ms: 1000
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should timeout and mark as warning
    });
  });

  describe('Link Filtering', () => {
    test('should ignore links matching ignore patterns', async () => {
      await writeFile(join(testDir, 'README.md'), `
[Ignored](./temp/file.md)
[Valid](./guides/test.md)
`);
      await writeFile(join(testDir, 'guides', 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        ignore_patterns: ['temp/']
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check the valid link, ignore the temp/ link
    });

    test('should filter by link types', async () => {
      await writeFile(join(testDir, 'README.md'), `
[Internal](./test.md)
[External](https://example.com)
[Anchor](#section)
`);
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        check_internal_links: true,
        check_anchor_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should only check internal links
    });
  });

  describe('Failure Modes', () => {
    test('should fail when fail_on_broken_links is true and links are broken', async () => {
      await writeFile(join(testDir, 'README.md'), '[Broken](./missing.md)');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: true
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(true);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('Found 1 broken links');
    });

    test('should not fail when fail_on_broken_links is false', async () => {
      await writeFile(join(testDir, 'README.md'), '[Broken](./missing.md)');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive report with summary', async () => {
      await writeFile(join(testDir, 'README.md'), `
[Valid Internal](./test.md)
[Broken Internal](./missing.md)
`);
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        fail_on_broken_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"summary"');
      expect(contentText).toContain('"results"');
      expect(contentText).toContain('"recommendations"');
      expect(contentText).toContain('"totalLinks": 2');
    });

    test('should include execution metrics', async () => {
      await writeFile(join(testDir, 'README.md'), '[Test](./test.md)');
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"executionTime"');
      expect(contentText).toContain('"filesScanned"');
    });

    test('should provide recommendations based on results', async () => {
      await writeFile(join(testDir, 'README.md'), '[Valid](./test.md)');
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('All links are valid - excellent documentation quality!');
    });
  });

  describe('Concurrency Control', () => {
    test('should respect max_concurrent_checks limit', async () => {
      // Create multiple files with links
      for (let i = 0; i < 10; i++) {
        await writeFile(join(testDir, `file${i}.md`), `[Link](./target${i}.md)`);
        await writeFile(join(testDir, `target${i}.md`), `# Target ${i}`);
      }

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false,
        max_concurrent_checks: 2
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should complete successfully with concurrency control
    });
  });

  describe('Edge Cases', () => {
    test('should handle files with no links', async () => {
      await writeFile(join(testDir, 'README.md'), '# No Links Here\nJust plain text.');

      const result = await checkDocumentationLinks({
        documentation_path: testDir
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      const contentText = formatted.content.map(c => c.text).join(' ');
      expect(contentText).toContain('"totalLinks": 0');
    });

    test('should handle malformed markdown', async () => {
      await writeFile(join(testDir, 'README.md'), `
# Malformed
[Incomplete link](
[Missing closing](test.md
[Valid](./test.md)
`);
      await writeFile(join(testDir, 'test.md'), '# Test');

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should handle malformed links gracefully
    });

    test('should handle binary files gracefully', async () => {
      await writeFile(join(testDir, 'README.md'), '[Test](./test.md)');
      await writeFile(join(testDir, 'test.md'), '# Test');
      // Create a binary file that should be ignored
      await writeFile(join(testDir, 'image.png'), Buffer.from([0x89, 0x50, 0x4E, 0x47]));

      const result = await checkDocumentationLinks({
        documentation_path: testDir,
        check_external_links: false
      });

      const formatted = formatMCPResponse(result);
      expect(formatted.isError).toBe(false);
      // Should ignore binary files and process markdown files
    });
  });
});
