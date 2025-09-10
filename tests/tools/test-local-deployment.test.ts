import { testLocalDeployment } from '../../src/tools/test-local-deployment.js';
import * as childProcess from 'child_process';
import * as fs from 'fs';

// Create simpler mocking approach

describe('testLocalDeployment', () => {
  const testRepoPath = process.cwd();
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Input validation', () => {
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

    it('should handle unsupported SSG gracefully', async () => {
      // This should throw a ZodError due to input validation
      await expect(testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'gatsby' as any
      })).rejects.toThrow('Invalid enum value');
    });
  });

  describe('Basic functionality', () => {
    it('should return proper response structure', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should use default port when not specified', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.port).toBe(3000);
    });

    it('should use custom port when specified', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        port: 4000,
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.port).toBe(4000);
    });

    it('should use custom timeout when specified', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        timeout: 120,
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBeDefined();
    });
  });

  describe('SSG support', () => {
    it('should handle all supported SSG types', async () => {
      const ssgs = ['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'];
      
      for (const ssg of ssgs) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: ssg as any,
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.ssg).toBe(ssg);
        expect(parsedResult.buildSuccess).toBeDefined();
      }
    });

    it('should generate test script for all SSG types', async () => {
      const ssgs = ['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy'];
      
      for (const ssg of ssgs) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: ssg as any,
          skipBuild: true,
          port: 4000
        });

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.testScript).toContain(`# Local Deployment Test Script for ${ssg}`);
        expect(parsedResult.testScript).toContain('http://localhost:4000');
      }
    });

    it('should include install commands for Node.js-based SSGs', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.testScript).toContain('npm install');
    });

    it('should not include install commands for non-Node.js SSGs', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.testScript).not.toContain('npm install');
    });
  });

  describe('Configuration handling', () => {
    it('should provide recommendations when configuration is missing', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'jekyll', // Jekyll config unlikely to exist in this repo
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing configuration file')
        ])
      );
    });

    it('should provide next steps for missing configuration', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'jekyll',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringContaining('generate_config')
        ])
      );
    });
  });

  describe('Error handling', () => {
    it('should handle general errors gracefully', async () => {
      jest.spyOn(process, 'chdir').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo'
      });

      // The tool returns an error response structure instead of throwing
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error.code).toBe('LOCAL_TEST_FAILED');
      expect(parsedResult.error.message).toContain('Permission denied');
    });

    it('should handle non-existent repository path', async () => {
      const result = await testLocalDeployment({
        repositoryPath: '/non/existent/path',
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      // Should still work with skipBuild, but may have warnings
      expect(parsedResult.ssg).toBe('hugo');
      expect(parsedResult.buildSuccess).toBe(true); // skipBuild = true means assumed success
    });
  });

  describe('Response structure validation', () => {
    it('should include all required response fields', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty('buildSuccess');
      expect(parsedResult).toHaveProperty('ssg');
      expect(parsedResult).toHaveProperty('port');
      expect(parsedResult).toHaveProperty('testScript');
      expect(parsedResult).toHaveProperty('recommendations');
      expect(parsedResult).toHaveProperty('nextSteps');
    });

    it('should include tool recommendations in next steps', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsedResult.nextSteps)).toBe(true);
      expect(parsedResult.nextSteps.length).toBeGreaterThan(0);
    });

    it('should validate test script content structure', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        port: 8080,
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const testScript = parsedResult.testScript;
      
      expect(testScript).toContain('# Local Deployment Test Script for hugo');
      expect(testScript).toContain('http://localhost:8080');
      expect(testScript).toContain('hugo server');
      expect(testScript).toContain('--port 8080');
    });

    it('should handle different timeout values', async () => {
      const timeouts = [30, 60, 120, 300];
      
      for (const timeout of timeouts) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'hugo',
          timeout,
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.buildSuccess).toBeDefined();
        // Timeout is not directly returned in response, but test should pass
      }
    });

    it('should provide appropriate recommendations for each SSG type', async () => {
      const ssgConfigs = {
        'jekyll': '_config.yml',
        'hugo': 'config.toml',
        'docusaurus': 'docusaurus.config.js',
        'mkdocs': 'mkdocs.yml',
        'eleventy': '.eleventy.js'
      };

      for (const [ssg, configFile] of Object.entries(ssgConfigs)) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: ssg as any,
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.recommendations).toEqual(
          expect.arrayContaining([
            expect.stringContaining(configFile)
          ])
        );
      }
    });

    it('should include comprehensive next steps', async () => {
      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'jekyll', // Missing config will trigger recommendations
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      const nextSteps = parsedResult.nextSteps;
      
      expect(Array.isArray(nextSteps)).toBe(true);
      expect(nextSteps.length).toBeGreaterThan(0);
      
      // Should include generate_config step for missing config
      expect(nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringContaining('generate_config')
        ])
      );
    });

    it('should handle edge case with empty repository path', async () => {
      const result = await testLocalDeployment({
        repositoryPath: '',
        ssg: 'hugo',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      // Should handle gracefully and provide recommendations
      expect(parsedResult.ssg).toBe('hugo');
      expect(parsedResult.buildSuccess).toBe(true); // skipBuild = true means assumed success
      expect(parsedResult.recommendations).toBeDefined();
    });

    it('should validate port range handling', async () => {
      const ports = [1000, 3000, 8080, 9000, 65535];
      
      for (const port of ports) {
        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'hugo',
          port,
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        expect(parsedResult.port).toBe(port);
        expect(parsedResult.testScript).toContain(`http://localhost:${port}`);
      }
    });
  });

  describe('Advanced coverage scenarios', () => {
    beforeEach(() => {
      jest.spyOn(process, 'chdir').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('Configuration file scenarios', () => {
      it('should detect existing configuration file for hugo', async () => {
        // Mock fs.access to succeed for hugo config file
        const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);

        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'hugo',
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        // Should not recommend missing config since file exists
        expect(parsedResult.recommendations).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining('Missing configuration file')
          ])
        );

        mockFsAccess.mockRestore();
      });

      it('should detect existing configuration file for jekyll', async () => {
        // Mock fs.access to succeed for jekyll config file
        const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);

        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'jekyll',
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        // Should not recommend missing config since file exists
        expect(parsedResult.recommendations).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining('Missing configuration file')
          ])
        );

        mockFsAccess.mockRestore();
      });

      it('should detect existing configuration file for docusaurus', async () => {
        // Mock fs.access to succeed for docusaurus config file
        const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);

        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'docusaurus',
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        // Should not recommend missing config since file exists
        expect(parsedResult.recommendations).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining('Missing configuration file')
          ])
        );

        mockFsAccess.mockRestore();
      });

      it('should detect existing configuration file for mkdocs', async () => {
        // Mock fs.access to succeed for mkdocs config file
        const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);

        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'mkdocs',
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        // Should not recommend missing config since file exists
        expect(parsedResult.recommendations).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining('Missing configuration file')
          ])
        );

        mockFsAccess.mockRestore();
      });

      it('should detect existing configuration file for eleventy', async () => {
        // Mock fs.access to succeed for eleventy config file
        const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);

        const result = await testLocalDeployment({
          repositoryPath: testRepoPath,
          ssg: 'eleventy',
          skipBuild: true
        });

        const parsedResult = JSON.parse(result.content[0].text);
        // Should not recommend missing config since file exists
        expect(parsedResult.recommendations).not.toEqual(
          expect.arrayContaining([
            expect.stringContaining('Missing configuration file')
          ])
        );

        mockFsAccess.mockRestore();
      });
    });
  });
});