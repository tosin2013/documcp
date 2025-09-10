import { testLocalDeployment } from '../../src/tools/test-local-deployment.js';
import * as childProcess from 'child_process';
import * as fs from 'fs';

describe('testLocalDeployment - Extended Coverage', () => {
  const testRepoPath = process.cwd();
  
  beforeEach(() => {
    jest.spyOn(process, 'chdir').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Build process with mocked dependencies', () => {
    it('should handle successful build with build output checking', async () => {
      // Mock fs.access to succeed for config file check
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      // Mock exec to simulate successful build
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Build completed successfully', '');
        }
        return {} as any;
      });

      // Mock fs.stat and readdir for build output checking - successful case
      const mockFsStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => true } as any);
      const mockFsReaddir = jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['index.html', 'style.css'] as any);

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(true);
      expect(parsedResult.buildOutput).toBe('Build completed successfully');

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
      mockFsStat.mockRestore();
      mockFsReaddir.mockRestore();
    });

    it('should handle build with stderr warnings and error detection', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Build completed', 'Warning: deprecated Error detected in file.css');
        }
        return {} as any;
      });

      const mockFsStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => true } as any);
      const mockFsReaddir = jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['index.html'] as any);

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(true);
      expect(parsedResult.buildErrors).toBe('Warning: deprecated Error detected in file.css');
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build completed with errors - review build output')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
      mockFsStat.mockRestore();
      mockFsReaddir.mockRestore();
    });

    it('should handle build failure scenarios', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('Build command failed'), '', '');
        }
        return {} as any;
      });

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(false);
      expect(parsedResult.buildErrors).toBe('Build command failed');
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build failed - fix build errors before deployment')
        ])
      );
      expect(parsedResult.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Review build configuration and resolve errors')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
    });

    it('should handle missing build directory after build', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Build successful', '');
        }
        return {} as any;
      });

      // Mock fs.stat to fail (directory doesn't exist)
      const mockFsStat = jest.spyOn(fs.promises, 'stat').mockRejectedValue(new Error('Directory not found'));

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(true);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build directory public was not created')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
      mockFsStat.mockRestore();
    });

    it('should handle empty build directory', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Build successful', '');
        }
        return {} as any;
      });

      const mockFsStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => true } as any);
      const mockFsReaddir = jest.spyOn(fs.promises, 'readdir').mockResolvedValue([] as any); // Empty directory

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(true);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build directory public was not created')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
      mockFsStat.mockRestore();
      mockFsReaddir.mockRestore();
    });

    it('should handle build directory that is not a directory', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'Build successful', '');
        }
        return {} as any;
      });

      const mockFsStat = jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => false } as any);

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'hugo',
        skipBuild: false
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.buildSuccess).toBe(true);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Build directory public was not created')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
      mockFsStat.mockRestore();
    });
  });

  describe('Dependency installation scenarios', () => {
    it('should handle dependency installation warnings for docusaurus', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, '', 'Some dependency warning message');
        }
        return {} as any;
      });

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Dependency installation warnings detected')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
    });

    it('should handle dependency installation failure for docusaurus', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(new Error('npm install failed'), '', '');
        }
        return {} as any;
      });

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Dependency installation failed: npm install failed')
        ])
      );
      expect(parsedResult.nextSteps).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Fix dependency installation issues before testing deployment')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
    });

    it('should not warn on npm WARN messages during dependency installation', async () => {
      const mockFsAccess = jest.spyOn(fs.promises, 'access').mockResolvedValueOnce(undefined);
      
      const mockExec = jest.spyOn(childProcess, 'exec');
      mockExec.mockImplementationOnce((cmd, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, '', 'npm WARN deprecated package@1.0.0: This package is deprecated');
        }
        return {} as any;
      });

      const result = await testLocalDeployment({
        repositoryPath: testRepoPath,
        ssg: 'docusaurus',
        skipBuild: true
      });

      const parsedResult = JSON.parse(result.content[0].text);
      // Should NOT have warning recommendation for npm WARN messages
      expect(parsedResult.recommendations).not.toEqual(
        expect.arrayContaining([
          expect.stringContaining('Dependency installation warnings detected')
        ])
      );

      mockFsAccess.mockRestore();
      mockExec.mockRestore();
    });
  });
});