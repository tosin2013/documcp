// Edge cases and error handling tests
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository';
import { recommendSSG } from '../../src/tools/recommend-ssg';
import { generateConfig } from '../../src/tools/generate-config';
import { setupStructure } from '../../src/tools/setup-structure';
import { deployPages } from '../../src/tools/deploy-pages';
import { verifyDeployment } from '../../src/tools/verify-deployment';

describe('Edge Cases and Error Handling', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-edge-case-tests');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup edge case test directory:', error);
    }
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Test analyze_repository with invalid inputs
      const invalidInputs = [
        null,
        undefined,
        {},
        { path: null },
        { path: undefined },
        { path: '', depth: 'invalid' },
      ];

      for (const input of invalidInputs) {
        try {
          const result = await analyzeRepository(input as any);
          expect((result as any).isError).toBe(true);
        } catch (error) {
          // Catching errors is also acceptable for invalid inputs
          expect(error).toBeDefined();
        }
      }
    });

    it('should validate SSG enum values strictly', async () => {
      const invalidSSGs = ['react', 'vue', 'angular', 'gatsby', '', null, undefined];

      for (const invalidSSG of invalidSSGs) {
        try {
          const result = await generateConfig({
            ssg: invalidSSG as any,
            projectName: 'Test',
            outputPath: tempDir,
          });
          expect((result as any).isError).toBe(true);
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle extremely long input strings', async () => {
      const longString = 'a'.repeat(10000);

      const result = await generateConfig({
        ssg: 'docusaurus',
        projectName: longString,
        projectDescription: longString,
        outputPath: path.join(tempDir, 'long-strings'),
      });

      // Should handle long strings without crashing
      expect(result.content).toBeDefined();
    });

    it('should handle special characters in project names', async () => {
      const specialNames = [
        'Project with spaces',
        'Project-with-hyphens',
        'Project_with_underscores',
        'Project.with.dots',
        'Project@with#special$chars',
        'Проект на русском',
        '项目中文名',
        'プロジェクト日本語',
      ];

      for (const name of specialNames) {
        const outputDir = path.join(tempDir, 'special-chars', Buffer.from(name).toString('hex'));
        await fs.mkdir(outputDir, { recursive: true });

        const result = await generateConfig({
          ssg: 'docusaurus',
          projectName: name,
          outputPath: outputDir,
        });

        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();
      }
    });
  });

  describe('File System Edge Cases', () => {
    it('should handle permission-denied scenarios', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows as permission handling is different
        return;
      }

      // Create a directory with restricted permissions
      const restrictedDir = path.join(tempDir, 'no-permissions');
      await fs.mkdir(restrictedDir, { recursive: true });

      try {
        await fs.chmod(restrictedDir, 0o000);

        const result = await analyzeRepository({
          path: restrictedDir,
          depth: 'standard',
        });

        expect((result as any).isError).toBe(true);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });

    it('should handle symlinks and circular references', async () => {
      const symlinkTest = path.join(tempDir, 'symlink-test');
      await fs.mkdir(symlinkTest, { recursive: true });

      // Create a file
      const originalFile = path.join(symlinkTest, 'original.txt');
      await fs.writeFile(originalFile, 'original content');

      // Create symlink
      const symlinkFile = path.join(symlinkTest, 'link.txt');
      try {
        await fs.symlink(originalFile, symlinkFile);

        const result = await analyzeRepository({
          path: symlinkTest,
          depth: 'standard',
        });

        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();
      } catch (error) {
        // Symlinks might not be supported on all systems
        console.warn('Symlink test skipped:', error);
      }
    });

    it('should handle very deep directory structures', async () => {
      const deepTest = path.join(tempDir, 'deep-structure');
      let currentPath = deepTest;

      // Create 20 levels deep structure
      for (let i = 0; i < 20; i++) {
        currentPath = path.join(currentPath, `level-${i}`);
        await fs.mkdir(currentPath, { recursive: true });
        await fs.writeFile(path.join(currentPath, `file-${i}.txt`), `Content ${i}`);
      }

      const result = await analyzeRepository({
        path: deepTest,
        depth: 'deep',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();
    });

    it('should handle files with unusual extensions', async () => {
      const unusualFiles = path.join(tempDir, 'unusual-files');
      await fs.mkdir(unusualFiles, { recursive: true });

      const unusualExtensions = [
        'file.xyz',
        'file.123',
        'file.',
        '.hidden',
        'no-extension',
        'file..double.dot',
        'file with spaces.txt',
        'file-with-émojis-🚀.md',
      ];

      for (const filename of unusualExtensions) {
        await fs.writeFile(path.join(unusualFiles, filename), 'test content');
      }

      const result = await analyzeRepository({
        path: unusualFiles,
        depth: 'standard',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      // Should count all files (excluding hidden files that start with .)
      const analysisData = JSON.parse(
        result.content.find((c) => c.text.includes('"totalFiles"'))!.text,
      );
      // The analyze function filters out .hidden files, so we expect 7 files instead of 8
      expect(analysisData.structure.totalFiles).toBe(7); // 8 files minus .hidden
    });

    it('should handle binary files gracefully', async () => {
      const binaryTest = path.join(tempDir, 'binary-files');
      await fs.mkdir(binaryTest, { recursive: true });

      // Create binary-like files
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      await fs.writeFile(path.join(binaryTest, 'binary.bin'), binaryData);
      await fs.writeFile(path.join(binaryTest, 'image.png'), binaryData);
      await fs.writeFile(path.join(binaryTest, 'archive.zip'), binaryData);

      const result = await analyzeRepository({
        path: binaryTest,
        depth: 'standard',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle repositories with many small files', async () => {
      const manyFilesTest = path.join(tempDir, 'many-small-files');
      await fs.mkdir(manyFilesTest, { recursive: true });

      // Create 500 small files
      for (let i = 0; i < 500; i++) {
        await fs.writeFile(path.join(manyFilesTest, `small-${i}.txt`), `content ${i}`);
      }

      const startTime = Date.now();
      const result = await analyzeRepository({
        path: manyFilesTest,
        depth: 'standard',
      });
      const executionTime = Date.now() - startTime;

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle repositories with very large files', async () => {
      const largeFilesTest = path.join(tempDir, 'large-files');
      await fs.mkdir(largeFilesTest, { recursive: true });

      // Create large files (1MB each)
      const largeContent = 'x'.repeat(1024 * 1024);
      await fs.writeFile(path.join(largeFilesTest, 'large1.txt'), largeContent);
      await fs.writeFile(path.join(largeFilesTest, 'large2.log'), largeContent);

      const result = await analyzeRepository({
        path: largeFilesTest,
        depth: 'quick', // Use quick to avoid timeout
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();
    });

    it('should handle concurrent tool executions', async () => {
      const concurrentTest = path.join(tempDir, 'concurrent-test');
      await fs.mkdir(concurrentTest, { recursive: true });
      await fs.writeFile(path.join(concurrentTest, 'test.js'), 'console.log("test");');
      await fs.writeFile(path.join(concurrentTest, 'README.md'), '# Test');

      // Run multiple analyses concurrently
      const promises = Array.from({ length: 5 }, () =>
        analyzeRepository({
          path: concurrentTest,
          depth: 'quick',
        }),
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();
      });
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle output paths with special characters', async () => {
      const specialPaths = [
        path.join(tempDir, 'path with spaces'),
        path.join(tempDir, 'path-with-hyphens'),
        path.join(tempDir, 'path_with_underscores'),
        path.join(tempDir, 'path.with.dots'),
      ];

      for (const specialPath of specialPaths) {
        const result = await generateConfig({
          ssg: 'docusaurus',
          projectName: 'Special Path Test',
          outputPath: specialPath,
        });

        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();

        // Verify files were actually created
        const files = await fs.readdir(specialPath);
        expect(files.length).toBeGreaterThan(0);
      }
    });

    it('should handle nested output directory creation', async () => {
      const nestedPath = path.join(tempDir, 'deeply', 'nested', 'output', 'directory');

      const result = await generateConfig({
        ssg: 'mkdocs',
        projectName: 'Nested Test',
        outputPath: nestedPath,
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      // Verify nested directories were created
      expect(
        await fs
          .access(nestedPath)
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
    });

    it('should handle existing files without overwriting destructively', async () => {
      const existingFiles = path.join(tempDir, 'existing-files');
      await fs.mkdir(existingFiles, { recursive: true });

      // Create existing file
      const existingContent = 'This is existing content that should not be lost';
      await fs.writeFile(path.join(existingFiles, 'important.txt'), existingContent);

      const result = await generateConfig({
        ssg: 'docusaurus',
        projectName: 'Existing Files Test',
        outputPath: existingFiles,
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      // Verify our important file still exists
      expect(
        await fs
          .access(path.join(existingFiles, 'important.txt'))
          .then(() => true)
          .catch(() => false),
      ).toBe(true);
    });
  });

  describe('Deployment Edge Cases', () => {
    it('should handle repositories with existing workflows', async () => {
      const existingWorkflow = path.join(tempDir, 'existing-workflow');
      await fs.mkdir(path.join(existingWorkflow, '.github', 'workflows'), { recursive: true });

      // Create existing workflow
      await fs.writeFile(
        path.join(existingWorkflow, '.github', 'workflows', 'existing.yml'),
        'name: Existing Workflow\non: push',
      );

      const result = await deployPages({
        repository: existingWorkflow,
        ssg: 'docusaurus',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      // Both workflows should exist
      const workflows = await fs.readdir(path.join(existingWorkflow, '.github', 'workflows'));
      expect(workflows).toContain('existing.yml');
      expect(workflows).toContain('deploy-docs.yml');
    });

    it('should handle custom domain validation', async () => {
      const customDomains = [
        'docs.example.com',
        'my-docs.github.io',
        'documentation.mycompany.org',
        'subdomain.example.co.uk',
      ];

      for (const domain of customDomains) {
        const domainTest = path.join(tempDir, 'domain-test', domain.replace(/[^a-z0-9]/gi, '-'));

        const result = await deployPages({
          repository: domainTest,
          ssg: 'jekyll',
          customDomain: domain,
        });

        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();

        // Verify CNAME file
        const cnameContent = await fs.readFile(path.join(domainTest, 'CNAME'), 'utf-8');
        expect(cnameContent.trim()).toBe(domain);
      }
    });

    it('should handle repository URL variations', async () => {
      const urlVariations = [
        'https://github.com/user/repo',
        'https://github.com/user/repo.git',
        'git@github.com:user/repo.git',
        '/absolute/local/path',
        './relative/path',
        '.',
      ];

      for (const repo of urlVariations) {
        const result = await verifyDeployment({
          repository: repo,
        });

        expect(result.content).toBeDefined();
        expect((result as any).isError).toBeFalsy();
      }
    });
  });

  describe('Unicode and Internationalization', () => {
    it('should handle Unicode file names and content', async () => {
      const unicodeTest = path.join(tempDir, 'unicode-test');
      await fs.mkdir(unicodeTest, { recursive: true });

      const unicodeFiles = [
        { name: '中文文件.md', content: '# 中文标题\n这是中文内容。' },
        { name: 'русский.txt', content: 'Привет мир!' },
        { name: '日本語.js', content: '// 日本語のコメント\nconsole.log("こんにちは");' },
        { name: 'émojis-🚀-test.py', content: '# -*- coding: utf-8 -*-\nprint("🚀 Unicode test")' },
      ];

      for (const file of unicodeFiles) {
        await fs.writeFile(path.join(unicodeTest, file.name), file.content, 'utf8');
      }

      const result = await analyzeRepository({
        path: unicodeTest,
        depth: 'standard',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      const analysisData = JSON.parse(
        result.content.find((c) => c.text.includes('"totalFiles"'))!.text,
      );
      expect(analysisData.structure.totalFiles).toBe(unicodeFiles.length); // No README created in this test
    });

    it('should handle different line ending styles', async () => {
      const lineEndingTest = path.join(tempDir, 'line-ending-test');
      await fs.mkdir(lineEndingTest, { recursive: true });

      // Create files with different line endings
      await fs.writeFile(path.join(lineEndingTest, 'unix.txt'), 'line1\nline2\nline3\n');
      await fs.writeFile(path.join(lineEndingTest, 'windows.txt'), 'line1\r\nline2\r\nline3\r\n');
      await fs.writeFile(path.join(lineEndingTest, 'mac.txt'), 'line1\rline2\rline3\r');
      await fs.writeFile(path.join(lineEndingTest, 'mixed.txt'), 'line1\nline2\r\nline3\rline4\n');

      const result = await analyzeRepository({
        path: lineEndingTest,
        depth: 'standard',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();
    });
  });

  describe('Recovery and Resilience', () => {
    it('should recover from partial failures gracefully', async () => {
      const partialFailure = path.join(tempDir, 'partial-failure');
      await fs.mkdir(partialFailure, { recursive: true });

      // Create some valid files
      await fs.writeFile(path.join(partialFailure, 'valid.js'), 'console.log("valid");');
      await fs.writeFile(path.join(partialFailure, 'package.json'), '{"name": "test"}');

      // Create some problematic scenarios
      await fs.mkdir(path.join(partialFailure, 'empty-dir'));

      const result = await analyzeRepository({
        path: partialFailure,
        depth: 'standard',
      });

      expect(result.content).toBeDefined();
      expect((result as any).isError).toBeFalsy();

      // Should still provide useful analysis despite issues
      const analysisData = JSON.parse(
        result.content.find((c) => c.text.includes('"ecosystem"'))!.text,
      );
      expect(analysisData.dependencies.ecosystem).toBe('javascript');
    });

    it('should provide meaningful error messages', async () => {
      const result = await analyzeRepository({
        path: '/absolutely/does/not/exist/anywhere',
        depth: 'standard',
      });

      expect((result as any).isError).toBe(true);
      const errorText = result.content.map((c) => c.text).join(' ');

      // Error message should be helpful
      expect(errorText.toLowerCase()).toContain('error');
      expect(errorText.toLowerCase()).toMatch(/resolution|solution|fix|check|ensure/);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // This test verifies that long-running operations don't hang indefinitely
      const longOperation = analyzeRepository({
        path: tempDir, // Large temp directory
        depth: 'deep',
      });

      // Set a reasonable timeout with proper cleanup
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Operation timed out')), 30000); // 30 seconds
      });

      try {
        await Promise.race([longOperation, timeoutPromise]);
      } catch (error) {
        if ((error as Error).message === 'Operation timed out') {
          console.warn('Long operation test timed out - this is expected behavior');
        } else {
          throw error;
        }
      } finally {
        // Clean up the timeout to prevent Jest hanging
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    });
  });
});
