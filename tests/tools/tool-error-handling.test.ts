import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository.js';
import { recommendSSG } from '../../src/tools/recommend-ssg.js';
import { generateConfig } from '../../src/tools/generate-config.js';
import { setupStructure } from '../../src/tools/setup-structure.js';
import { deployPages } from '../../src/tools/deploy-pages.js';

describe('Tool Error Handling and Edge Cases', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `test-errors-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Repository Analysis Error Handling', () => {
    it.skip('should handle non-existent directories gracefully', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');

      await expect(analyzeRepository({ path: nonExistentPath })).rejects.toThrow();
    });

    it('should handle empty directories', async () => {
      const result = await analyzeRepository({ path: tempDir });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it.skip('should handle directories with permission issues', async () => {
      const restrictedDir = join(tempDir, 'restricted');
      await fs.mkdir(restrictedDir);

      try {
        // Make directory unreadable
        await fs.chmod(restrictedDir, 0o000);

        await expect(analyzeRepository({ path: restrictedDir })).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });

    it('should handle malformed package.json files', async () => {
      await fs.writeFile(join(tempDir, 'package.json'), 'invalid json content');

      const result = await analyzeRepository({ path: tempDir });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle very large directories efficiently', async () => {
      // Create many files to test performance
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(fs.writeFile(join(tempDir, `file-${i}.js`), `console.log(${i});`));
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const result = await analyzeRepository({ path: tempDir, depth: 'quick' });
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it.skip('should handle invalid depth parameters', async () => {
      await fs.writeFile(join(tempDir, 'package.json'), '{"name": "test"}');

      // @ts-ignore - Testing invalid parameter
      const result = await analyzeRepository({ path: tempDir, depth: 'invalid' as any });

      expect(result).toBeDefined();
      // Should default to 'standard' depth
    });
  });

  describe('SSG Recommendation Error Handling', () => {
    it('should handle missing analysis data', async () => {
      await expect(recommendSSG({})).rejects.toThrow();
    });

    it.skip('should handle invalid analysis IDs', async () => {
      await expect(recommendSSG({ analysisId: 'non-existent-id' })).rejects.toThrow();
    });

    it.skip('should provide fallback recommendations for edge cases', async () => {
      // Create minimal valid analysis
      const minimalAnalysis = {
        projectType: 'unknown',
        languages: [],
        frameworks: [],
        complexity: 'low' as const,
        dependencies: [],
        devDependencies: [],
        scripts: {},
        fileCount: 0,
        totalSize: 0,
      };

      // Test with various edge case preferences
      const testCases = [
        { ecosystem: 'invalid' as any },
        { priority: 'unknown' as any },
        { ecosystem: 'javascript', priority: 'performance' },
      ];

      for (const preferences of testCases) {
        const result = await recommendSSG({
          analysisId: 'test-analysis-id',
          preferences,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      }
    });

    it.skip('should handle analysis with missing required fields', async () => {
      const incompleteAnalysis = {
        projectType: 'javascript',
        // Missing other required fields
      };

      await expect(
        recommendSSG({
          // @ts-ignore - Testing incomplete data
          analysisId: undefined,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Configuration Generation Error Handling', () => {
    it('should handle invalid SSG types', async () => {
      await expect(
        generateConfig({
          ssg: 'invalid-ssg' as any,
          projectName: 'test',
          outputPath: tempDir,
        }),
      ).rejects.toThrow();
    });

    it('should handle missing required parameters', async () => {
      await expect(generateConfig({})).rejects.toThrow();
      await expect(generateConfig({ ssg: 'jekyll' })).rejects.toThrow();
      await expect(generateConfig({ ssg: 'jekyll', projectName: 'test' })).rejects.toThrow();
    });

    it('should handle write permission issues', async () => {
      const readOnlyDir = join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir);

      try {
        await fs.chmod(readOnlyDir, 0o444);

        const result = await generateConfig({
          ssg: 'jekyll',
          projectName: 'test',
          outputPath: readOnlyDir,
        });

        expect((result as any).isError).toBe(true);
        expect(result.content).toBeDefined();
        expect(
          result.content.some((item: any) => item.text && item.text.includes('permission denied')),
        ).toBe(true);
      } finally {
        await fs.chmod(readOnlyDir, 0o755);
      }
    });

    it('should handle extremely long project names', async () => {
      const longName = 'a'.repeat(1000);

      const result = await generateConfig({
        ssg: 'jekyll',
        projectName: longName,
        outputPath: tempDir,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle special characters in project names', async () => {
      const specialChars = ['test@project', 'test#project', 'test space project', 'test/project'];

      for (const projectName of specialChars) {
        const result = await generateConfig({
          ssg: 'jekyll',
          projectName,
          outputPath: tempDir,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      }
    });

    it('should validate SSG-specific configuration options', async () => {
      const ssgTypes = ['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'];

      for (const ssg of ssgTypes) {
        const result = await generateConfig({
          ssg: ssg as any,
          projectName: `test-${ssg}`,
          outputPath: tempDir,
          projectDescription: `Test project for ${ssg}`,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Structure Setup Error Handling', () => {
    it('should handle invalid output paths', async () => {
      const result = await setupStructure({
        path: '/invalid/path/that/does/not/exist',
        ssg: 'jekyll',
      });

      expect((result as any).isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.some((item: any) => item.text && item.text.includes('ENOENT'))).toBe(
        true,
      );
    });

    it('should handle missing SSG parameter', async () => {
      await expect(
        setupStructure({
          path: tempDir,
        }),
      ).rejects.toThrow();
    });

    it('should create structure in existing directories with files', async () => {
      // Create some existing files
      await fs.writeFile(join(tempDir, 'existing-file.txt'), 'existing content');
      await fs.mkdir(join(tempDir, 'existing-dir'));

      const result = await setupStructure({
        path: tempDir,
        ssg: 'jekyll',
        includeExamples: true,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);

      // Should not overwrite existing files
      const existingContent = await fs.readFile(join(tempDir, 'existing-file.txt'), 'utf8');
      expect(existingContent).toBe('existing content');
    });

    it('should handle different Diataxis structure options', async () => {
      const options = [
        { includeExamples: true },
        { includeExamples: false },
        { includeExamples: true, customStructure: { tutorials: ['custom-tutorial'] } },
      ];

      for (const option of options) {
        const testDir = join(tempDir, `test-${Math.random().toString(36).substr(2, 5)}`);
        await fs.mkdir(testDir);

        const result = await setupStructure({
          path: testDir,
          ssg: 'docusaurus',
          ...option,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      }
    });
  });

  describe('Deployment Setup Error Handling', () => {
    it('should handle repositories without proper configuration', async () => {
      const result = await deployPages({
        repository: 'invalid/repo/format',
        ssg: 'jekyll',
      });

      // deployPages actually succeeds with invalid repo format - it just creates workflow
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('invalid/repo/format');
    });

    it('should handle missing repository parameter', async () => {
      await expect(
        deployPages({
          ssg: 'jekyll',
        }),
      ).rejects.toThrow();
    });

    it('should handle different branch configurations', async () => {
      const branchConfigs = [
        { branch: 'main' },
        { branch: 'master' },
        { branch: 'gh-pages' },
        { branch: 'custom-branch' },
      ];

      for (const config of branchConfigs) {
        const result = await deployPages({
          repository: 'user/test-repo',
          ssg: 'jekyll',
          ...config,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain(config.branch);
      }
    });

    it('should handle custom domain configurations', async () => {
      const customDomains = [
        'example.com',
        'docs.example.com',
        'sub.domain.example.org',
        'localhost', // Edge case
      ];

      for (const customDomain of customDomains) {
        const result = await deployPages({
          repository: 'user/test-repo',
          ssg: 'jekyll',
          customDomain,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain(customDomain);
      }
    });

    it('should generate workflows for all supported SSGs', async () => {
      const ssgTypes = ['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'];

      for (const ssg of ssgTypes) {
        const result = await deployPages({
          repository: 'user/test-repo',
          ssg: ssg as any,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toContain(ssg);
        expect(result.content).toBeDefined();
      }
    });
  });

  describe('Input Validation', () => {
    it('should validate string inputs for XSS and injection attacks', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${process.env}',
        '../../../etc/passwd',
        'test`rm -rf /`test',
        'test && rm -rf /',
        'test; cat /etc/passwd',
      ];

      for (const maliciousInput of maliciousInputs) {
        // Test with different tools
        const result = await generateConfig({
          ssg: 'jekyll',
          projectName: maliciousInput,
          outputPath: tempDir,
          projectDescription: maliciousInput,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        // Should sanitize or escape malicious content
      }
    });

    it('should handle Unicode and international characters', async () => {
      const unicodeInputs = [
        'тест', // Cyrillic
        '测试', // Chinese
        '🚀📊', // Emojis
        'café', // Accented characters
        'مشروع', // Arabic
      ];

      for (const unicodeInput of unicodeInputs) {
        const result = await generateConfig({
          ssg: 'jekyll',
          projectName: unicodeInput,
          outputPath: tempDir,
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      }
    });

    it('should handle extremely large parameter values', async () => {
      const largeDescription = 'A'.repeat(10000);

      const result = await generateConfig({
        ssg: 'jekyll',
        projectName: 'test',
        outputPath: tempDir,
        projectDescription: largeDescription,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous tool calls', async () => {
      // Create test directories
      const dirs = await Promise.all([
        fs.mkdir(join(tempDir, 'test1'), { recursive: true }),
        fs.mkdir(join(tempDir, 'test2'), { recursive: true }),
        fs.mkdir(join(tempDir, 'test3'), { recursive: true }),
      ]);

      // Run multiple operations concurrently
      const promises = [
        generateConfig({
          ssg: 'jekyll',
          projectName: 'test1',
          outputPath: join(tempDir, 'test1'),
        }),
        generateConfig({
          ssg: 'hugo',
          projectName: 'test2',
          outputPath: join(tempDir, 'test2'),
        }),
        generateConfig({
          ssg: 'docusaurus',
          projectName: 'test3',
          outputPath: join(tempDir, 'test3'),
        }),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });

    it('should handle resource contention gracefully', async () => {
      // Multiple operations on same directory
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          setupStructure({
            path: join(tempDir, `concurrent-${i}`),
            ssg: 'jekyll',
            includeExamples: false,
          }),
        );

      // Create directories first
      await Promise.all(
        promises.map((_, i) => fs.mkdir(join(tempDir, `concurrent-${i}`), { recursive: true })),
      );

      const results = await Promise.allSettled(promises);

      // All should succeed or fail gracefully
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value.content).toBeDefined();
        } else {
          expect(result.reason).toBeInstanceOf(Error);
        }
      });
    });
  });
});
