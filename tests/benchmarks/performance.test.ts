import { createBenchmarker, PerformanceBenchmarker } from '../../src/benchmarks/performance';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Performance Benchmarking System', () => {
  let benchmarker: PerformanceBenchmarker;
  let tempDir: string;

  beforeEach(() => {
    benchmarker = createBenchmarker();
  });

  beforeAll(async () => {
    // Create temporary directory for test repos
    tempDir = path.join(os.tmpdir(), 'documcp-benchmark-tests');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Repository Size Categorization', () => {
    it('should categorize small repositories correctly', async () => {
      const smallRepoPath = await createTestRepo('small', 50);
      const result = await benchmarker.benchmarkRepository(smallRepoPath);
      
      expect(result.repoSize).toBe('small');
      expect(result.fileCount).toBeLessThan(100);
      expect(result.targetTime).toBe(1000); // 1 second
    });

    it('should categorize medium repositories correctly', async () => {
      const mediumRepoPath = await createTestRepo('medium', 500);
      const result = await benchmarker.benchmarkRepository(mediumRepoPath);
      
      expect(result.repoSize).toBe('medium');
      expect(result.fileCount).toBeGreaterThanOrEqual(100);
      expect(result.fileCount).toBeLessThan(1000);
      expect(result.targetTime).toBe(10000); // 10 seconds
    });

    it('should categorize large repositories correctly', async () => {
      const largeRepoPath = await createTestRepo('large', 1500);
      const result = await benchmarker.benchmarkRepository(largeRepoPath);
      
      expect(result.repoSize).toBe('large');
      expect(result.fileCount).toBeGreaterThanOrEqual(1000);
      expect(result.targetTime).toBe(60000); // 60 seconds
    });
  });

  describe('Performance Measurement', () => {
    it('should measure execution time accurately', async () => {
      const testRepoPath = await createTestRepo('timing-test', 10);
      const startTime = Date.now();
      
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      const measuredTime = Date.now() - startTime;
      
      // Allow for some variance in timing measurement - can be 0 for very fast operations
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(measuredTime + 100);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should calculate performance ratios correctly', async () => {
      const testRepoPath = await createTestRepo('ratio-test', 10);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.performanceRatio).toBe(result.executionTime / result.targetTime);
      expect(result.performanceRatio).toBeGreaterThanOrEqual(0); // Can be 0 for very fast operations
      expect(typeof result.performanceRatio).toBe('number');
    });

    it('should track memory usage', async () => {
      const testRepoPath = await createTestRepo('memory-test', 10);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.details.memoryUsage).toBeDefined();
      expect(typeof result.details.memoryUsage.heapUsed).toBe('number');
      expect(typeof result.details.memoryUsage.rss).toBe('number');
    });
  });

  describe('PERF-001 Compliance', () => {
    it('should pass for small repositories under 1 second', async () => {
      const smallRepoPath = await createTestRepo('perf-small', 20);
      const result = await benchmarker.benchmarkRepository(smallRepoPath);
      
      // Small repos should generally pass (this is a fast operation)
      if (result.executionTime <= 1000) {
        expect(result.passed).toBe(true);
      }
      
      expect(result.targetTime).toBe(1000);
    });

    it('should have correct performance targets', async () => {
      const configs = [
        { files: 50, expectedTarget: 1000 },    // small
        { files: 500, expectedTarget: 10000 },  // medium  
        { files: 1500, expectedTarget: 60000 }  // large
      ];

      for (const config of configs) {
        const repoPath = await createTestRepo(`target-${config.files}`, config.files);
        const result = await benchmarker.benchmarkRepository(repoPath);
        
        expect(result.targetTime).toBe(config.expectedTarget);
      }
    });
  });

  describe('Benchmark Suite', () => {
    it('should run multiple repository benchmarks', async () => {
      const repo1 = await createTestRepo('suite-1', 25);
      const repo2 = await createTestRepo('suite-2', 75);
      
      const testRepos = [
        { path: repo1, name: 'Suite Test 1' },
        { path: repo2, name: 'Suite Test 2' }
      ];

      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      
      expect(suite.results).toHaveLength(2);
      expect(suite.testName).toBe('Full Benchmark Suite');
      expect(typeof suite.overallPassed).toBe('boolean');
      expect(typeof suite.averagePerformance).toBe('number');
    });

    it('should generate accurate summaries', async () => {
      const smallRepo = await createTestRepo('summary-small', 25);
      const mediumRepo = await createTestRepo('summary-medium', 250);
      
      const testRepos = [
        { path: smallRepo, name: 'Small Repo' },
        { path: mediumRepo, name: 'Medium Repo' }
      ];

      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      
      expect(suite.summary.smallRepos.count).toBe(1);
      expect(suite.summary.mediumRepos.count).toBe(1);
      expect(suite.summary.largeRepos.count).toBe(0);
    });
  });

  describe('Result Export', () => {
    it('should export benchmark results to JSON', async () => {
      const testRepoPath = await createTestRepo('export-test', 15);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      const suite = benchmarker.generateSuite('Export Test', [result]);
      
      const outputPath = path.join(tempDir, 'test-export.json');
      await benchmarker.exportResults(suite, outputPath);
      
      // Verify file was created
      const exportedContent = await fs.readFile(outputPath, 'utf-8');
      const exportedData = JSON.parse(exportedContent);
      
      expect(exportedData.suite).toBeDefined();
      expect(exportedData.systemInfo).toBeDefined();
      expect(exportedData.performanceTargets).toBeDefined();
      expect(exportedData.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle repository analysis failures gracefully', async () => {
      // Mock analyzeRepository to throw an error
      const originalAnalyzeRepository = require('../../src/tools/analyze-repository.js').analyzeRepository;
      const mockAnalyzeRepository = jest.fn().mockRejectedValue(new Error('Analysis failed'));
      require('../../src/tools/analyze-repository.js').analyzeRepository = mockAnalyzeRepository;
      
      try {
        const testRepoPath = await createTestRepo('error-test', 10);
        await expect(benchmarker.benchmarkRepository(testRepoPath)).rejects.toThrow('Analysis failed');
        
        // Verify that failed results are still recorded
        const results = benchmarker.getResults();
        expect(results.length).toBe(1);
        expect(results[0].passed).toBe(false);
        expect(results[0].executionTime).toBeGreaterThanOrEqual(0);
      } finally {
        // Restore original function
        require('../../src/tools/analyze-repository.js').analyzeRepository = originalAnalyzeRepository;
      }
    });

    it('should handle errors in benchmark suite gracefully', async () => {
      // Use a fresh benchmarker to avoid interference from previous tests
      const freshBenchmarker = createBenchmarker();
      
      const validRepo = await createTestRepo('valid-repo-suite', 10);
      
      // Mock analyzeRepository to fail for the second call
      const originalAnalyzeRepository = require('../../src/tools/analyze-repository.js').analyzeRepository;
      let callCount = 0;
      const mockAnalyzeRepository = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Second analysis failed');
        }
        return Promise.resolve({ success: true });
      });
      require('../../src/tools/analyze-repository.js').analyzeRepository = mockAnalyzeRepository;
      
      const testRepos = [
        { path: validRepo, name: 'Valid Repo' },
        { path: validRepo, name: 'Failing Repo' } // Same path but will fail on second call
      ];

      // Capture console.log to verify error logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        const suite = await freshBenchmarker.runBenchmarkSuite(testRepos);
        
        // Should have results only from valid repo (first call)
        expect(suite.results.length).toBe(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ ERROR:'));
      } finally {
        consoleSpy.mockRestore();
        require('../../src/tools/analyze-repository.js').analyzeRepository = originalAnalyzeRepository;
      }
    });

    it('should handle inaccessible directories in file counting', async () => {
      // Create a test repo with restricted permissions
      const restrictedRepoPath = path.join(tempDir, 'restricted-repo');
      await fs.mkdir(restrictedRepoPath, { recursive: true });
      
      // Create a subdirectory with restricted permissions
      const restrictedDir = path.join(restrictedRepoPath, 'restricted');
      await fs.mkdir(restrictedDir, { recursive: true });
      
      try {
        await fs.chmod(restrictedDir, 0o000); // No permissions
        
        const result = await benchmarker.benchmarkRepository(restrictedRepoPath);
        expect(result.fileCount).toBeGreaterThanOrEqual(0);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      }
    });
  });

  describe('Utility Methods', () => {
    it('should reset benchmark results', async () => {
      const testRepoPath = await createTestRepo('reset-test', 10);
      await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(benchmarker.getResults().length).toBe(1);
      
      benchmarker.reset();
      expect(benchmarker.getResults().length).toBe(0);
    });

    it('should return copy of results to prevent mutation', async () => {
      const testRepoPath = await createTestRepo('mutation-test', 10);
      await benchmarker.benchmarkRepository(testRepoPath);
      
      const results1 = benchmarker.getResults();
      const results2 = benchmarker.getResults();
      
      expect(results1).not.toBe(results2); // Different array instances
      expect(results1).toEqual(results2); // Same content
    });
  });

  describe('Report Generation', () => {
    it('should generate detailed performance reports', async () => {
      const smallRepo = await createTestRepo('report-small', 25);
      const mediumRepo = await createTestRepo('report-medium', 250);
      const largeRepo = await createTestRepo('report-large', 1200);
      
      const results = [
        await benchmarker.benchmarkRepository(smallRepo),
        await benchmarker.benchmarkRepository(mediumRepo),
        await benchmarker.benchmarkRepository(largeRepo)
      ];
      
      const suite = benchmarker.generateSuite('Detailed Report Test', results);
      
      // Capture console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      benchmarker.printDetailedReport(suite);
      
      // Verify report sections were printed
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Benchmark Report'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Overall Status:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance by Repository Size:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Detailed Results:'));
      
      consoleSpy.mockRestore();
    });

    it('should handle empty results in generateSuite', async () => {
      const suite = benchmarker.generateSuite('Empty Test', []);
      
      expect(suite.results).toHaveLength(0);
      expect(suite.overallPassed).toBe(true); // Empty array should pass
      expect(suite.averagePerformance).toBeNaN(); // Division by zero
      expect(suite.summary.smallRepos.avgTime).toBe(0);
      expect(suite.summary.mediumRepos.avgTime).toBe(0);
      expect(suite.summary.largeRepos.avgTime).toBe(0);
    });

    it('should handle mixed pass/fail results in reports', async () => {
      // Create a scenario with mixed results by mocking analyzeRepository to sometimes fail
      const mockAnalyzeRepository = jest.fn()
        .mockResolvedValueOnce({ success: true }) // First call succeeds
        .mockRejectedValueOnce(new Error('Analysis failed')); // Second call fails

      // Temporarily replace the import
      const originalModule = require('../../src/tools/analyze-repository.js');
      originalModule.analyzeRepository = mockAnalyzeRepository;

      const repo1 = await createTestRepo('mixed-1', 10);
      const repo2 = await createTestRepo('mixed-2', 10);

      try {
        await benchmarker.benchmarkRepository(repo1); // Should succeed
      } catch (error) {
        // Expected to succeed
      }

      try {
        await benchmarker.benchmarkRepository(repo2); // Should fail
      } catch (error) {
        // Expected to fail
      }

      const results = benchmarker.getResults();
      const suite = benchmarker.generateSuite('Mixed Results Test', results);
      
      expect(suite.overallPassed).toBe(false); // Should fail overall
      expect(suite.results.some(r => r.passed)).toBe(true); // Some passed
      expect(suite.results.some(r => !r.passed)).toBe(true); // Some failed
    });
  });

  describe('Edge Cases and Branch Coverage', () => {
    it('should handle deep directory structures without infinite recursion', async () => {
      const deepRepoPath = path.join(tempDir, 'deep-repo');
      await fs.mkdir(deepRepoPath, { recursive: true });
      
      // Create a deep directory structure (12 levels deep to test recursion limit)
      let currentPath = deepRepoPath;
      for (let i = 0; i < 12; i++) {
        currentPath = path.join(currentPath, `level-${i}`);
        await fs.mkdir(currentPath, { recursive: true });
        await fs.writeFile(path.join(currentPath, `file-${i}.txt`), `Content at level ${i}`);
      }
      
      const result = await benchmarker.benchmarkRepository(deepRepoPath);
      expect(result.fileCount).toBeGreaterThan(0);
      expect(result.fileCount).toBeLessThan(50); // Should stop at recursion limit
    });

    it('should skip hidden directories and node_modules', async () => {
      const skipTestRepoPath = path.join(tempDir, 'skip-test-repo');
      await fs.mkdir(skipTestRepoPath, { recursive: true });
      
      // Create directories that should be skipped
      const hiddenDir = path.join(skipTestRepoPath, '.hidden');
      const nodeModulesDir = path.join(skipTestRepoPath, 'node_modules');
      const vendorDir = path.join(skipTestRepoPath, 'vendor');
      const githubDir = path.join(skipTestRepoPath, '.github'); // Should NOT be skipped
      
      await fs.mkdir(hiddenDir, { recursive: true });
      await fs.mkdir(nodeModulesDir, { recursive: true });
      await fs.mkdir(vendorDir, { recursive: true });
      await fs.mkdir(githubDir, { recursive: true });
      
      // Add files to each directory
      await fs.writeFile(path.join(hiddenDir, 'hidden.txt'), 'hidden');
      await fs.writeFile(path.join(nodeModulesDir, 'module.js'), 'module');
      await fs.writeFile(path.join(vendorDir, 'vendor.rb'), 'vendor');
      await fs.writeFile(path.join(githubDir, 'workflow.yml'), 'workflow');
      await fs.writeFile(path.join(skipTestRepoPath, 'main.js'), 'main');
      
      const result = await benchmarker.benchmarkRepository(skipTestRepoPath);
      
      // Should only count main.js and workflow.yml (2 files)
      expect(result.fileCount).toBe(2);
    });

    it('should handle different depth parameters', async () => {
      const depthTestRepo = await createTestRepo('depth-test', 10);
      
      const quickResult = await benchmarker.benchmarkRepository(depthTestRepo, 'quick');
      const standardResult = await benchmarker.benchmarkRepository(depthTestRepo, 'standard');
      const deepResult = await benchmarker.benchmarkRepository(depthTestRepo, 'deep');
      
      expect(quickResult.fileCount).toBe(10);
      expect(standardResult.fileCount).toBe(10);
      expect(deepResult.fileCount).toBe(10);
      
      // All should have valid execution times
      expect(quickResult.executionTime).toBeGreaterThanOrEqual(0);
      expect(standardResult.executionTime).toBeGreaterThanOrEqual(0);
      expect(deepResult.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  // Helper function to create test repositories
  async function createTestRepo(name: string, fileCount: number): Promise<string> {
    const repoPath = path.join(tempDir, name);
    await fs.mkdir(repoPath, { recursive: true });
    
    // Create package.json to make it look like a real project
    const packageJson = {
      name: name,
      version: '1.0.0',
      description: `Test repository with ${fileCount} files`
    };
    await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Create the requested number of files
    for (let i = 0; i < fileCount - 1; i++) { // -1 for package.json
      const fileName = `file-${i.toString().padStart(3, '0')}.md`;
      const content = `# Test File ${i}\n\nThis is test content for file ${i}.`;
      await fs.writeFile(path.join(repoPath, fileName), content);
    }
    
    return repoPath;
  }
});