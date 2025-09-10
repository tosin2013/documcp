import { PerformanceBenchmarker } from '../../src/benchmarks/performance';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Performance Benchmarking System', () => {
  let benchmarker: PerformanceBenchmarker;
  let tempDir: string;

  beforeEach(async () => {
    benchmarker = new PerformanceBenchmarker();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Helper function to create test repositories
  async function createTestRepo(name: string, fileCount: number): Promise<string> {
    const repoPath = path.join(tempDir, name);
    await fs.mkdir(repoPath, { recursive: true });
    
    // Create package.json to make it look like a real project
    await fs.writeFile(
      path.join(repoPath, 'package.json'),
      JSON.stringify({ name, version: '1.0.0' }, null, 2)
    );
    
    // Create additional files to reach the target count
    for (let i = 1; i < fileCount; i++) {
      const fileName = `file${i}.js`;
      await fs.writeFile(
        path.join(repoPath, fileName),
        `// Test file ${i}\nconsole.log('Hello from file ${i}');\n`
      );
    }
    
    return repoPath;
  }

  describe('Repository Size Categorization', () => {
    it('should categorize small repositories correctly', async () => {
      const smallRepoPath = await createTestRepo('small-repo', 25);
      const result = await benchmarker.benchmarkRepository(smallRepoPath);
      
      expect(result.repoSize).toBe('small');
      expect(result.fileCount).toBe(25);
    });

    it('should categorize medium repositories correctly', async () => {
      const mediumRepoPath = await createTestRepo('medium-repo', 250);
      const result = await benchmarker.benchmarkRepository(mediumRepoPath);
      
      expect(result.repoSize).toBe('medium');
      expect(result.fileCount).toBe(250);
    });

    it('should categorize large repositories correctly', async () => {
      const largeRepoPath = await createTestRepo('large-repo', 1200);
      const result = await benchmarker.benchmarkRepository(largeRepoPath);
      
      expect(result.repoSize).toBe('large');
      expect(result.fileCount).toBe(1200);
    });
  });

  describe('Performance Measurement', () => {
    it('should measure execution time accurately', async () => {
      const testRepoPath = await createTestRepo('timing-test', 10);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should calculate performance ratios correctly', async () => {
      const testRepoPath = await createTestRepo('ratio-test', 50);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.performanceRatio).toBeGreaterThanOrEqual(0);
      expect(result.performanceRatio).toBeLessThanOrEqual(100);
    });

    it('should track memory usage', async () => {
      const testRepoPath = await createTestRepo('memory-test', 30);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.details.memoryUsage).toBeDefined();
      expect(result.details.memoryUsage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('PERF-001 Compliance', () => {
    it('should pass for small repositories under 1 second', async () => {
      const testRepoPath = await createTestRepo('perf-test', 10);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.passed).toBe(true);
      expect(result.executionTime).toBeLessThan(1000);
    });

    it('should have correct performance targets', async () => {
      const smallRepo = await createTestRepo('small-perf', 50);
      const mediumRepo = await createTestRepo('medium-perf', 500);
      const largeRepo = await createTestRepo('large-perf', 1500);
      
      const smallResult = await benchmarker.benchmarkRepository(smallRepo);
      const mediumResult = await benchmarker.benchmarkRepository(mediumRepo);
      const largeResult = await benchmarker.benchmarkRepository(largeRepo);
      
      expect(smallResult.targetTime).toBe(1000); // 1 second for small
      expect(mediumResult.targetTime).toBe(10000); // 10 seconds for medium
      expect(largeResult.targetTime).toBe(60000); // 60 seconds for large
    });
  });

  describe('Benchmark Suite', () => {
    it('should run multiple repository benchmarks', async () => {
      const testRepos = [
        { path: await createTestRepo('suite-test-1', 25), name: 'Suite Test 1' },
        { path: await createTestRepo('suite-test-2', 75), name: 'Suite Test 2' }
      ];
      
      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      
      expect(suite.results.length).toBe(2);
      expect(suite.testName).toBeDefined();
      expect(suite.overallPassed).toBeDefined();
    });

    it('should generate accurate summaries', async () => {
      const testRepos = [
        { path: await createTestRepo('small-repo', 25), name: 'Small Repo' },
        { path: await createTestRepo('medium-repo', 250), name: 'Medium Repo' }
      ];
      
      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      
      expect(suite.summary).toBeDefined();
      const totalRepos = suite.summary.smallRepos.count + suite.summary.mediumRepos.count + suite.summary.largeRepos.count;
      expect(totalRepos).toBe(2);
      const totalPassed = suite.summary.smallRepos.passed + suite.summary.mediumRepos.passed + suite.summary.largeRepos.passed;
      expect(totalPassed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Result Export', () => {
    it('should export benchmark results to JSON', async () => {
      const testRepos = [
        { path: await createTestRepo('export-test', 20), name: 'Export Test' }
      ];
      
      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      const exportPath = path.join(tempDir, 'benchmark-results.json');
      
      await benchmarker.exportResults(suite, exportPath);
      
      const exportedContent = await fs.readFile(exportPath, 'utf-8');
      const exportedData = JSON.parse(exportedContent);
      
      expect(exportedData.suite).toBeDefined();
      expect(exportedData.systemInfo).toBeDefined();
      expect(exportedData.performanceTargets).toBeDefined();
      expect(exportedData.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent repository paths gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      
      const result = await benchmarker.benchmarkRepository(nonExistentPath);
      
      // Should handle gracefully with 0 files
      expect(result.fileCount).toBe(0);
      expect(result.repoSize).toBe('small');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.passed).toBe(true); // Fast execution passes performance target
    });

    it('should handle permission denied scenarios gracefully', async () => {
      if (process.platform === 'win32') {
        // Skip on Windows as permission handling is different
        return;
      }

      const restrictedPath = path.join(tempDir, 'restricted');
      await fs.mkdir(restrictedPath, { recursive: true });
      
      try {
        await fs.chmod(restrictedPath, 0o000);
        
        const result = await benchmarker.benchmarkRepository(restrictedPath);
        
        // Should handle gracefully with 0 files
        expect(result.fileCount).toBe(0);
        expect(result.repoSize).toBe('small');
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      } finally {
        // Restore permissions for cleanup
        await fs.chmod(restrictedPath, 0o755);
      }
    });

    it('should handle empty repositories', async () => {
      const emptyRepoPath = path.join(tempDir, 'empty-repo');
      await fs.mkdir(emptyRepoPath, { recursive: true });
      
      const result = await benchmarker.benchmarkRepository(emptyRepoPath);
      
      expect(result.fileCount).toBe(0);
      expect(result.repoSize).toBe('small');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle suite with all valid repositories', async () => {
      const validRepo1 = await createTestRepo('valid-repo-1', 10);
      const validRepo2 = await createTestRepo('valid-repo-2', 20);
      
      const testRepos = [
        { path: validRepo1, name: 'Valid Repo 1' },
        { path: validRepo2, name: 'Valid Repo 2' }
      ];

      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      
      expect(suite.results.length).toBe(2);
      expect(suite.overallPassed).toBeDefined();
      expect(typeof suite.averagePerformance).toBe('number');
    });

    it('should handle benchmark execution errors in try-catch', async () => {
      // Test the error handling path by mocking analyzeRepository to throw
      const originalAnalyze = require('../../src/tools/analyze-repository').analyzeRepository;
      const mockAnalyze = jest.fn().mockRejectedValue(new Error('Mock error'));
      
      // Replace the function temporarily
      require('../../src/tools/analyze-repository').analyzeRepository = mockAnalyze;
      
      try {
        const testRepoPath = await createTestRepo('error-test', 10);
        
        await expect(benchmarker.benchmarkRepository(testRepoPath)).rejects.toThrow('Mock error');
        
        // Should still record the failed benchmark
        const results = benchmarker.getResults();
        expect(results.length).toBe(1);
        expect(results[0].passed).toBe(false);
      } finally {
        // Restore original function
        require('../../src/tools/analyze-repository').analyzeRepository = originalAnalyze;
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

    it('should return copy of results array', async () => {
      const testRepoPath = await createTestRepo('copy-test', 15);
      await benchmarker.benchmarkRepository(testRepoPath);
      
      const results1 = benchmarker.getResults();
      const results2 = benchmarker.getResults();
      
      expect(results1).toEqual(results2);
      expect(results1).not.toBe(results2); // Different array instances
    });

    it('should handle different analysis depths', async () => {
      const testRepoPath = await createTestRepo('depth-test', 20);
      
      // Test with quick analysis
      const quickResult = await benchmarker.benchmarkRepository(testRepoPath, 'quick');
      expect(quickResult.executionTime).toBeGreaterThanOrEqual(0);
      
      // Test with deep analysis
      const deepResult = await benchmarker.benchmarkRepository(testRepoPath, 'deep');
      expect(deepResult.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate detailed reports without errors', async () => {
      const testRepos = [
        await createTestRepo('report-small', 25),
        await createTestRepo('report-medium', 250),
        await createTestRepo('report-large', 1200)
      ];
      
      const results: any[] = [];
      for (const repoPath of testRepos) {
        const result = await benchmarker.benchmarkRepository(repoPath);
        results.push(result);
      }
      
      const suite = benchmarker.generateSuite('Report Test', results);
      
      // Capture console output
      const originalLog = console.log;
      const logOutput: string[] = [];
      console.log = (...args) => {
        logOutput.push(args.join(' '));
      };
      
      try {
        benchmarker.printDetailedReport(suite);
        
        expect(logOutput.length).toBeGreaterThan(0);
        expect(logOutput.some(line => line.includes('Performance Benchmark Report'))).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle empty suite reports', async () => {
      const emptySuite = benchmarker.generateSuite('Empty Suite', []);
      
      // Should not throw when generating report for empty suite
      expect(() => benchmarker.printDetailedReport(emptySuite)).not.toThrow();
    });

    it('should calculate correct averages for mixed results', async () => {
      const repo1 = await createTestRepo('avg-test-1', 10);
      const repo2 = await createTestRepo('avg-test-2', 20);
      const repo3 = await createTestRepo('avg-test-3', 30);
      
      const results = [
        await benchmarker.benchmarkRepository(repo1),
        await benchmarker.benchmarkRepository(repo2),
        await benchmarker.benchmarkRepository(repo3)
      ];
      
      const suite = benchmarker.generateSuite('Average Test', results);
      
      expect(suite.averagePerformance).toBeGreaterThanOrEqual(0);
      expect(suite.averagePerformance).toBeLessThanOrEqual(100);
      expect(typeof suite.averagePerformance).toBe('number');
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage differences', async () => {
      const testRepoPath = await createTestRepo('memory-tracking', 100);
      const result = await benchmarker.benchmarkRepository(testRepoPath);
      
      expect(result.details.memoryUsage).toBeDefined();
      expect(result.details.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(result.details.memoryUsage.heapTotal).toBeGreaterThanOrEqual(0);
      expect(result.details.memoryUsage.rss).toBeGreaterThanOrEqual(0);
    });

    it('should handle memory tracking in error scenarios', async () => {
      const emptyRepoPath = path.join(tempDir, 'empty-memory-test');
      await fs.mkdir(emptyRepoPath, { recursive: true });
      
      const result = await benchmarker.benchmarkRepository(emptyRepoPath);
      
      // Even in error scenarios, memory tracking should work
      expect(result.details.memoryUsage).toBeDefined();
      expect(typeof result.details.memoryUsage.heapUsed).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle repositories with special characters in paths', async () => {
      const specialCharRepo = path.join(tempDir, 'repo with spaces & symbols!');
      await fs.mkdir(specialCharRepo, { recursive: true });
      await fs.writeFile(path.join(specialCharRepo, 'test.js'), 'console.log("test");');
      
      const result = await benchmarker.benchmarkRepository(specialCharRepo);
      
      expect(result.fileCount).toBe(1);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle very deep directory structures', async () => {
      const deepRepoPath = path.join(tempDir, 'deep-repo');
      let currentPath = deepRepoPath;
      
      // Create a deep directory structure
      for (let i = 0; i < 10; i++) {
        currentPath = path.join(currentPath, `level-${i}`);
        await fs.mkdir(currentPath, { recursive: true });
        await fs.writeFile(path.join(currentPath, `file-${i}.js`), `// Level ${i}`);
      }
      
      const result = await benchmarker.benchmarkRepository(deepRepoPath);
      
      expect(result.fileCount).toBe(10);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent benchmarking', async () => {
      const repo1 = await createTestRepo('concurrent-1', 15);
      const repo2 = await createTestRepo('concurrent-2', 25);
      const repo3 = await createTestRepo('concurrent-3', 35);
      
      // Run benchmarks concurrently
      const promises = [
        benchmarker.benchmarkRepository(repo1),
        benchmarker.benchmarkRepository(repo2),
        benchmarker.benchmarkRepository(repo3)
      ];
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
        expect(result.fileCount).toBeGreaterThan(0);
      });
    });

    it('should handle extremely deep recursion limit', async () => {
      const deepRepoPath = path.join(tempDir, 'extremely-deep');
      let currentPath = deepRepoPath;
      
      // Create a structure deeper than the 10-level limit
      for (let i = 0; i < 15; i++) {
        currentPath = path.join(currentPath, `level-${i}`);
        await fs.mkdir(currentPath, { recursive: true });
        await fs.writeFile(path.join(currentPath, `file-${i}.js`), `// Level ${i}`);
      }
      
      const result = await benchmarker.benchmarkRepository(deepRepoPath);
      
      // Should stop at recursion limit, so fewer than 15 files
      expect(result.fileCount).toBeLessThanOrEqual(10);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should skip node_modules and vendor directories', async () => {
      const repoPath = await createTestRepo('skip-dirs', 5);
      
      // Add node_modules and vendor directories
      const nodeModulesPath = path.join(repoPath, 'node_modules');
      const vendorPath = path.join(repoPath, 'vendor');
      
      await fs.mkdir(nodeModulesPath, { recursive: true });
      await fs.mkdir(vendorPath, { recursive: true });
      
      // Add files that should be skipped
      await fs.writeFile(path.join(nodeModulesPath, 'package.js'), 'module.exports = {};');
      await fs.writeFile(path.join(vendorPath, 'library.js'), 'var lib = {};');
      
      const result = await benchmarker.benchmarkRepository(repoPath);
      
      // Should only count the original 5 files, not the ones in node_modules/vendor
      expect(result.fileCount).toBe(5);
    });

    it('should skip hidden files except .github', async () => {
      const repoPath = await createTestRepo('hidden-files', 3);
      
      // Add hidden files and .github directory
      await fs.writeFile(path.join(repoPath, '.hidden'), 'hidden content');
      await fs.writeFile(path.join(repoPath, '.env'), 'SECRET=value');
      
      const githubPath = path.join(repoPath, '.github');
      await fs.mkdir(githubPath, { recursive: true });
      await fs.writeFile(path.join(githubPath, 'workflow.yml'), 'name: CI');
      
      const result = await benchmarker.benchmarkRepository(repoPath);
      
      // Should count original 3 files + 1 .github file, but not other hidden files
      expect(result.fileCount).toBe(4);
    });
  });

  describe('Factory Function', () => {
    it('should create benchmarker instance via factory', () => {
      const { createBenchmarker } = require('../../src/benchmarks/performance');
      const factoryBenchmarker = createBenchmarker();
      
      expect(factoryBenchmarker).toBeInstanceOf(PerformanceBenchmarker);
      expect(factoryBenchmarker.getResults()).toEqual([]);
    });
  });

  describe('Export Results Error Handling', () => {
    it('should handle export to invalid path gracefully', async () => {
      const testRepos = [
        { path: await createTestRepo('export-error-test', 10), name: 'Export Error Test' }
      ];
      
      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      const invalidPath = path.join('/invalid/nonexistent/path', 'results.json');
      
      await expect(benchmarker.exportResults(suite, invalidPath)).rejects.toThrow();
    });

    it('should export complete system information', async () => {
      const testRepos = [
        { path: await createTestRepo('system-info-test', 5), name: 'System Info Test' }
      ];
      
      const suite = await benchmarker.runBenchmarkSuite(testRepos);
      const exportPath = path.join(tempDir, 'system-info-results.json');
      
      await benchmarker.exportResults(suite, exportPath);
      
      const exportedContent = await fs.readFile(exportPath, 'utf-8');
      const exportedData = JSON.parse(exportedContent);
      
      expect(exportedData.systemInfo.node).toBe(process.version);
      expect(exportedData.systemInfo.platform).toBe(process.platform);
      expect(exportedData.systemInfo.arch).toBe(process.arch);
      expect(exportedData.systemInfo.memoryUsage).toBeDefined();
      expect(exportedData.performanceTargets).toEqual({
        small: 1000,
        medium: 10000,
        large: 60000
      });
    });
  });

  describe('Detailed Report Coverage', () => {
    it('should print detailed reports with all categories', async () => {
      // Create repos of all sizes to test all report sections
      const smallRepo = await createTestRepo('report-small', 25);
      const mediumRepo = await createTestRepo('report-medium', 250);
      const largeRepo = await createTestRepo('report-large', 1200);
      
      const results = [
        await benchmarker.benchmarkRepository(smallRepo),
        await benchmarker.benchmarkRepository(mediumRepo),
        await benchmarker.benchmarkRepository(largeRepo)
      ];
      
      const suite = benchmarker.generateSuite('Complete Report Test', results);
      
      // Capture console output
      const originalLog = console.log;
      const logOutput: string[] = [];
      console.log = (...args) => {
        logOutput.push(args.join(' '));
      };
      
      try {
        benchmarker.printDetailedReport(suite);
        
        // Verify all report sections are present
        const fullOutput = logOutput.join('\n');
        expect(fullOutput).toContain('Performance Benchmark Report');
        expect(fullOutput).toContain('Overall Status:');
        expect(fullOutput).toContain('Average Performance:');
        expect(fullOutput).toContain('Small (<100 files)');
        expect(fullOutput).toContain('Medium (100-1000 files)');
        expect(fullOutput).toContain('Large (1000+ files)');
        expect(fullOutput).toContain('Detailed Results:');
        expect(fullOutput).toContain('Memory:');
      } finally {
        console.log = originalLog;
      }
    });

    it('should handle report generation with no results in some categories', async () => {
      // Only create small repos to test empty category handling
      const results = [
        await benchmarker.benchmarkRepository(await createTestRepo('small-only-1', 10)),
        await benchmarker.benchmarkRepository(await createTestRepo('small-only-2', 20))
      ];
      
      const suite = benchmarker.generateSuite('Small Only Test', results);
      
      const originalLog = console.log;
      const logOutput: string[] = [];
      console.log = (...args) => {
        logOutput.push(args.join(' '));
      };
      
      try {
        benchmarker.printDetailedReport(suite);
        
        const fullOutput = logOutput.join('\n');
        expect(fullOutput).toContain('Small (<100 files)');
        // Medium and Large categories should not appear since count is 0
        expect(fullOutput).not.toContain('Medium (100-1000 files):');
        expect(fullOutput).not.toContain('Large (1000+ files):');
      } finally {
        console.log = originalLog;
      }
    });
  });
});
