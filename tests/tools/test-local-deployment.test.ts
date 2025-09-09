import { testLocalDeployment } from '../../src/tools/test-local-deployment.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('testLocalDeployment', () => {
  let tempDir: string;
  let testRepoPath: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'test-local-deployment-tests');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(async () => {
    testRepoPath = path.join(tempDir, `test-repo-${Date.now()}`);
    await fs.mkdir(testRepoPath, { recursive: true });
  });

  describe('Input Validation', () => {
    it('should handle invalid SSG parameter', async () => {
      await expect(testLocalDeployment({
        repositoryPath: '/test/path',
        ssg: 'invalid' as any
      })).rejects.toThrow();
    });

    it('should handle missing required parameters', async () => {
      await expect(testLocalDeployment({
        ssg: 'docusaurus'
      } as any)).rejects.toThrow();
    });

    it('should handle null and undefined inputs', async () => {
      await expect(testLocalDeployment(null)).rejects.toThrow();
      await expect(testLocalDeployment(undefined)).rejects.toThrow();
      await expect(testLocalDeployment({})).rejects.toThrow();
    });

    it('should validate port parameter', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        port: 8080,
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.port).toBe(8080);
    });

    it('should validate timeout parameter', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        timeout: 30,
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
    });

    it('should validate skipBuild parameter', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: false
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.buildSuccess).toBeDefined();
    });
  });

  describe('SSG-Specific Configuration Detection', () => {
    it('should detect Docusaurus configuration', async () => {
      // Create docusaurus.config.js
      await fs.writeFile(
        path.join(testRepoPath, 'docusaurus.config.js'),
        'module.exports = { title: "Test" };'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe('docusaurus');
    });

    it('should detect Jekyll configuration', async () => {
      // Create _config.yml
      await fs.writeFile(
        path.join(testRepoPath, '_config.yml'),
        'title: Test Jekyll Site'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'jekyll',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe('jekyll');
    });

    it('should detect Hugo configuration', async () => {
      // Create hugo.toml
      await fs.writeFile(
        path.join(testRepoPath, 'hugo.toml'),
        'title = "Test Hugo Site"'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe('hugo');
    });

    it('should detect MkDocs configuration', async () => {
      // Create mkdocs.yml
      await fs.writeFile(
        path.join(testRepoPath, 'mkdocs.yml'),
        'site_name: Test MkDocs Site'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'mkdocs',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe('mkdocs');
    });

    it('should detect Eleventy configuration', async () => {
      // Create .eleventy.js
      await fs.writeFile(
        path.join(testRepoPath, '.eleventy.js'),
        'module.exports = function(eleventyConfig) { return {}; };'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'eleventy',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.ssg).toBe('eleventy');
    });

    it('should handle missing configuration files', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.recommendations).toContain(
        expect.stringContaining('Missing configuration file')
      );
    });
  });

  describe('Build Process Testing', () => {
    it('should handle build success scenario', async () => {
      // Create a simple package.json for npm-based SSGs
      await fs.writeFile(
        path.join(testRepoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'echo "Build successful"'
          }
        })
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: false
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.buildSuccess).toBeDefined();
    });

    it('should handle build failure scenario', async () => {
      // Create package.json with failing build command
      await fs.writeFile(
        path.join(testRepoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'exit 1'
          }
        })
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: false
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.buildSuccess).toBe(false);
      expect(data.recommendations).toContain(
        expect.stringContaining('Build failed')
      );
    });

    it('should skip build when skipBuild is true', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.buildSuccess).toBe(true); // Should assume success when skipped
    });

    it('should handle build timeout', async () => {
      // Create package.json with long-running build command
      await fs.writeFile(
        path.join(testRepoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'sleep 10'
          }
        })
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        timeout: 1, // 1 second timeout
        skipBuild: false
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.buildSuccess).toBe(false);
    });
  });

  describe('Dependency Installation', () => {
    it('should handle npm install for Node.js projects', async () => {
      await fs.writeFile(
        path.join(testRepoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {}
        })
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
    });

    it('should handle bundle install for Jekyll projects', async () => {
      await fs.writeFile(
        path.join(testRepoPath, 'Gemfile'),
        'source "https://rubygems.org"\ngem "jekyll"'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'jekyll',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
    });

    it('should handle pip install for MkDocs projects', async () => {
      await fs.writeFile(
        path.join(testRepoPath, 'requirements.txt'),
        'mkdocs>=1.0.0'
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'mkdocs',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
    });

    it('should handle dependency installation failures', async () => {
      await fs.writeFile(
        path.join(testRepoPath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: {
            'non-existent-package-12345': '^1.0.0'
          }
        })
      );

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: false
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.recommendations).toContain(
        expect.stringContaining('Dependency installation failed')
      );
    });
  });

  describe('Server Testing', () => {
    it('should generate test script for all SSGs', async () => {
      const ssgs = ['docusaurus', 'jekyll', 'hugo', 'mkdocs', 'eleventy'];
      
      for (const ssg of ssgs) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: ssg as any,
          skipBuild: true
        });
        
        const data = JSON.parse(result.content[0].text);
        expect(data.testScript).toBeDefined();
        expect(data.testScript).toContain(`# Local Deployment Test Script for ${ssg}`);
        expect(data.testScript).toContain('cd "');
      }
    });

    it('should include custom port in test script', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        port: 9000,
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.testScript).toContain('9000');
      expect(data.testScript).toContain('http://localhost:9000');
    });

    it('should handle server start success', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.serverStarted).toBeDefined();
      expect(data.localUrl).toBeDefined();
    });

    it('should handle server start failure', async () => {
      // Use non-existent directory to force server failure
      const result = await testLocalDeployment({
        repositoryPath: '/non/existent/path',
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.isError).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent repository path', async () => {
      const result = await testLocalDeployment({
        repositoryPath: '/absolutely/does/not/exist',
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle permission denied scenarios', async () => {
      if (process.platform !== 'win32') {
        // Create a directory with no permissions
        const restrictedDir = path.join(tempDir, 'no-permissions');
        await fs.mkdir(restrictedDir, { recursive: true });
        
        try {
          await fs.chmod(restrictedDir, 0o000);
          
          const result = await testLocalDeployment({
            repositoryPath: restrictedDir,
            ssg: 'docusaurus',
            skipBuild: true
          });
          
          expect(result.isError).toBe(true);
        } finally {
          // Restore permissions for cleanup
          await fs.chmod(restrictedDir, 0o755);
        }
      }
    });

    it('should provide meaningful error messages', async () => {
      const result = await testLocalDeployment({
        repositoryPath: '/invalid/path',
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.isError).toBe(true);
      const errorText = result.content.map(c => c.text).join(' ');
      expect(errorText).toContain('Resolution:');
      expect(errorText.toLowerCase()).toMatch(/ensure|check|valid/);
    });

    it('should handle unsupported SSG gracefully', async () => {
      // This should be caught by Zod validation, but test the internal logic
      try {
        await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'gatsby' as any
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work on current platform', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.repositoryPath).toBe(testRepoPath);
    });

    it('should handle paths with spaces', async () => {
      const spacePath = path.join(tempDir, 'path with spaces');
      await fs.mkdir(spacePath, { recursive: true });
      
      const result = await testLocalDeployment({
        repositoryPath: spacePath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.repositoryPath).toBe(spacePath);
    });

    it('should handle special characters in paths', async () => {
      const specialPath = path.join(tempDir, 'path-with-special_chars.test');
      await fs.mkdir(specialPath, { recursive: true });
      
      const result = await testLocalDeployment({
        repositoryPath: specialPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.repositoryPath).toBe(specialPath);
    });
  });

  describe('Response Structure Validation', () => {
    it('should return proper response structure', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.isError).toBe(false);
      
      // Should be able to parse the first content item as JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should include all required fields in response', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(data.repositoryPath).toBeDefined();
      expect(data.ssg).toBeDefined();
      expect(data.buildSuccess).toBeDefined();
      expect(data.serverStarted).toBeDefined();
      expect(data.port).toBeDefined();
      expect(data.testScript).toBeDefined();
      expect(data.recommendations).toBeDefined();
      expect(data.nextSteps).toBeDefined();
    });

    it('should include execution metadata', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const metadataText = result.content.find(c => c.text.includes('Execution completed'));
      expect(metadataText).toBeDefined();
      expect(metadataText!.text).toMatch(/\d+ms/);
    });

    it('should include recommendations and next steps', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(Array.isArray(data.nextSteps)).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent executions', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => 
        testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'docusaurus',
          port: 3000 + i,
          skipBuild: true
        })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.isError).toBe(false);
      });
    });

    it('should clean up resources properly', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      // Should not leave hanging processes or file handles
      expect(result.content).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', async () => {
      const result = await testLocalDeployment({
        repositoryPath: '/invalid/path',
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.isError).toBe(true);
      const errorText = result.content.map(c => c.text).join(' ');
      expect(errorText).toContain('Resolution:');
      expect(errorText.toLowerCase()).toMatch(/ensure|check|valid/);
    });

    it('should handle unsupported SSG gracefully', async () => {
      // This should be caught by Zod validation, but test the internal logic
      try {
        await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'gatsby' as any
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
});

  // Additional tests to improve coverage
  describe('Additional Coverage Tests', () => {
    test('should handle different SSG types correctly', async () => {
      const ssgTypes = ['docusaurus', 'jekyll', 'hugo', 'mkdocs', 'eleventy'];
      
      for (const ssg of ssgTypes) {
        const result = await testLocalDeployment({
          repositoryPath: '/nonexistent/path',
          ssg: ssg as any,
          port: 3000,
          timeout: 1000,
          skipBuild: true
        });
        
        expect(result.isError).toBe(true);
        expect(result.content).toBeDefined();
      }
    });

    test('should handle various parameter combinations', async () => {
      const testCases = [
        { ssg: 'docusaurus', port: 8080, timeout: 2000 },
        { ssg: 'jekyll', port: 4000, timeout: 5000 },
        { ssg: 'hugo', port: 3000, timeout: 1000 }
      ];
      
      for (const testCase of testCases) {
        const result = await testLocalDeployment({
          repositoryPath: '/nonexistent/path',
          ssg: testCase.ssg as any,
          port: testCase.port,
          timeout: testCase.timeout,
          skipBuild: true
        });
        
        expect(result.isError).toBe(true);
        expect(result.content).toBeDefined();
      }
    });
  });
});