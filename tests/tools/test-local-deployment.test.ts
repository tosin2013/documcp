import { testLocalDeployment } from '../../src/tools/test-local-deployment.js';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
  }
}));

jest.mock('child_process');
jest.mock('util', () => ({
  promisify: jest.fn()
}));

const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;
const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
const mockPromisify = promisify as jest.MockedFunction<typeof promisify>;
const mockExecAsync = jest.fn();

describe('testLocalDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPromisify.mockReturnValue(mockExecAsync);
    
    // Mock successful process.chdir
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful local deployment testing', () => {
    it('should test Docusaurus project successfully', async () => {
      // Mock configuration file exists
      mockAccess.mockResolvedValueOnce(undefined); // docusaurus.config.js exists
      
      // Mock successful dependency installation
      mockExecAsync.mockImplementationOnce(() => 
        Promise.resolve({ stdout: 'Dependencies installed', stderr: '' })
      );
      
      // Mock successful build
      mockExecAsync.mockImplementationOnce(() => 
        Promise.resolve({ stdout: 'Build complete', stderr: '' })
      );

      // Mock build directory exists with files
      mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValueOnce(['index.html', 'assets'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus',
        port: 3000,
        timeout: 30
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.ssg).toBe('docusaurus');
      expect(response.data.buildSuccess).toBe(true);
      expect(response.data.port).toBe(3000);
      expect(response.data.testScript).toContain('npm install');
      expect(response.data.testScript).toContain('npm run build');
      expect(response.data.testScript).toContain('npm run serve');
    });

    it('should test Jekyll project with custom port', async () => {
      // Mock Gemfile and _config.yml exist
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT')) // No docusaurus config
        .mockRejectedValueOnce(new Error('ENOENT')) // No mkdocs config  
        .mockRejectedValueOnce(new Error('ENOENT')) // No hugo config
        .mockResolvedValueOnce(undefined); // _config.yml exists

      mockExecAsync.mockImplementation(() => 
        Promise.resolve({ stdout: 'Success', stderr: '' })
      );

      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/jekyll-site',
        ssg: 'jekyll',
        port: 4000
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.ssg).toBe('jekyll');
      expect(response.data.port).toBe(4000);
      expect(response.data.testScript).toContain('bundle install');
      expect(response.data.testScript).toContain('bundle exec jekyll build');
      expect(response.data.testScript).toContain('bundle exec jekyll serve --port 4000');
    });

    it('should handle Hugo project', async () => {
      // Mock hugo.toml exists
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT')) 
        .mockResolvedValueOnce(undefined); // hugo.toml exists

      mockExecAsync.mockResolvedValue({ stdout: 'Hugo build complete', stderr: '' });
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/hugo-site',
        ssg: 'hugo'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.testScript).toContain('hugo');
      expect(response.data.testScript).toContain('hugo server --port 3000');
    });

    it('should test MkDocs project', async () => {
      // Mock mkdocs.yml exists
      mockAccess
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined); // mkdocs.yml exists

      mockExecAsync.mockImplementation(() => 
        Promise.resolve({ stdout: 'MkDocs build successful', stderr: '' })
      );

      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/mkdocs-site',
        ssg: 'mkdocs'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.testScript).toContain('pip install -r requirements.txt');
      expect(response.data.testScript).toContain('mkdocs build');
      expect(response.data.testScript).toContain('mkdocs serve --dev-addr localhost:3000');
    });

    it('should test Eleventy project', async () => {
      // Mock .eleventy.js exists
      mockAccess.mockResolvedValueOnce(undefined);

      mockExecAsync.mockResolvedValue({ stdout: 'Eleventy build done', stderr: '' });
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/eleventy-site',
        ssg: 'eleventy'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.testScript).toContain('npm install');
      expect(response.data.testScript).toContain('npx @11ty/eleventy');
      expect(response.data.testScript).toContain('npx @11ty/eleventy --serve --port 3000');
    });

    it('should skip build when requested', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus',
        skipBuild: true
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.buildSuccess).toBe(true); // Should assume success when skipped
      expect(mockExecAsync).not.toHaveBeenCalled();
    });
  });

  describe('error handling and recommendations', () => {
    it('should detect missing configuration files', async () => {
      // Mock all config files missing
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus',
        skipBuild: true
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.recommendations).toContain(
        'Missing configuration file. Expected one of: docusaurus.config.js, docusaurus.config.ts'
      );
      expect(response.data.nextSteps).toContain('Run generate_config tool to create configuration');
    });

    it('should handle dependency installation failure', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockExecAsync.mockRejectedValueOnce(new Error('npm install failed'));

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.recommendations).toContain('Dependency installation failed: npm install failed');
      expect(response.data.nextSteps).toContain('Fix dependency installation issues before testing deployment');
    });

    it('should handle build failures', async () => {
      mockAccess.mockResolvedValue(undefined);
      
      // Successful install, failed build
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'Install ok', stderr: '' })
        .mockRejectedValueOnce(new Error('Build failed'));

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo', 
        ssg: 'docusaurus'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.buildSuccess).toBe(false);
      expect(response.data.buildErrors).toContain('Build failed');
      expect(response.data.recommendations).toContain('Build failed - fix build errors before deployment');
    });

    it('should detect missing build output', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValue({ stdout: 'Build complete', stderr: '' });
      
      // Build directory doesn't exist
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.recommendations).toContain('Build directory build was not created');
    });

    it('should handle build warnings appropriately', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValue({ 
        stdout: 'Build complete', 
        stderr: 'Warning: deprecated feature used' 
      });
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.buildSuccess).toBe(true);
      expect(response.data.buildErrors).toContain('Warning: deprecated feature used');
      expect(response.data.recommendations).toContain('Build completed with errors - review build output');
    });

    it('should handle timeout errors', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockExecAsync.mockRejectedValue(new Error('Command timed out'));

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'hugo',
        timeout: 1 // Very short timeout
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.buildSuccess).toBe(false);
      expect(response.data.recommendations).toContain('Build failed - fix build errors before deployment');
    });
  });

  describe('test script generation', () => {
    it('should generate proper test script with timestamps', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/my/project',
        ssg: 'docusaurus',
        port: 8080,
        skipBuild: true
      });

      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.testScript).toContain('# Local Deployment Test Script for docusaurus');
      expect(response.data.testScript).toContain('cd "/my/project"');
      expect(response.data.testScript).toContain('# Install dependencies');
      expect(response.data.testScript).toContain('npm install');
      expect(response.data.testScript).toContain('# Build the site');
      expect(response.data.testScript).toContain('npm run build');
      expect(response.data.testScript).toContain('# Start local server');
      expect(response.data.testScript).toContain('npm run serve');
      expect(response.data.testScript).toContain('# Open in browser:');
      expect(response.data.testScript).toContain('# http://localhost:8080');
    });

    it('should generate appropriate recommendations for successful builds', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValue({ stdout: 'Success', stderr: '' });
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'jekyll'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.recommendations).toContain('Could not automatically start local server - run manually using the provided script');
      expect(response.data.nextSteps).toContain('Run deploy_pages tool to set up GitHub Actions workflow');
    });
  });

  describe('input validation', () => {
    it('should handle unsupported SSG', async () => {
      // Test input validation at the schema level
      await expect(async () => {
        await testLocalDeployment({
          repositoryPath: '/test/repo',
          ssg: 'unsupported' as any
        });
      }).rejects.toThrow();
    });

    it('should require repositoryPath', async () => {
      await expect(testLocalDeployment({
        ssg: 'docusaurus'
      } as any)).rejects.toThrow();
    });

    it('should use default values for optional parameters', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'hugo'
      });

      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.data.port).toBe(3000); // Default port
      expect(response.data.testScript).toContain('http://localhost:3000');
    });
  });

  describe('performance and resource management', () => {
    it('should respect timeout settings', async () => {
      mockAccess.mockResolvedValue(undefined);
      
      // Mock a slow operation that should timeout
      mockExecAsync.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Command timed out')), 100);
        })
      );

      const start = Date.now();
      const result = await testLocalDeployment({
        repositoryPath: '/test/repo',
        ssg: 'docusaurus',
        timeout: 1 // 1 second timeout
      });
      const duration = Date.now() - start;

      // Should fail relatively quickly due to timeout
      expect(duration).toBeLessThan(5000);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.data.buildSuccess).toBe(false);
    });
  });
});