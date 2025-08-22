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