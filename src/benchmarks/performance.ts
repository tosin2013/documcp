// Performance benchmarking system per PERF-001 rules
import { promises as fs } from 'fs';
import path from 'path';
import { analyzeRepository } from '../tools/analyze-repository.js';

export interface BenchmarkResult {
  repoSize: 'small' | 'medium' | 'large';
  fileCount: number;
  executionTime: number;
  targetTime: number;
  passed: boolean;
  performanceRatio: number;
  details: {
    startTime: number;
    endTime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

export interface BenchmarkSuite {
  testName: string;
  results: BenchmarkResult[];
  overallPassed: boolean;
  averagePerformance: number;
  summary: {
    smallRepos: { count: number; avgTime: number; passed: number };
    mediumRepos: { count: number; avgTime: number; passed: number };
    largeRepos: { count: number; avgTime: number; passed: number };
  };
}

// PERF-001 performance targets
const PERFORMANCE_TARGETS = {
  small: 1000, // <1 second for <100 files
  medium: 10000, // <10 seconds for 100-1000 files
  large: 60000, // <60 seconds for 1000+ files
} as const;

export class PerformanceBenchmarker {
  private results: BenchmarkResult[] = [];

  async benchmarkRepository(
    repoPath: string,
    depth: 'quick' | 'standard' | 'deep' = 'standard',
  ): Promise<BenchmarkResult> {
    const fileCount = await this.getFileCount(repoPath);
    const repoSize = this.categorizeRepoSize(fileCount);
    const targetTime = PERFORMANCE_TARGETS[repoSize];

    // Capture initial memory state
    const initialMemory = process.memoryUsage();

    const startTime = Date.now();

    try {
      // Run the actual analysis
      await analyzeRepository({ path: repoPath, depth });

      const endTime = Date.now();
      const executionTime = endTime - startTime;
      const finalMemory = process.memoryUsage();

      const performanceRatio = executionTime / targetTime;
      const passed = executionTime <= targetTime;

      const result: BenchmarkResult = {
        repoSize,
        fileCount,
        executionTime,
        targetTime,
        passed,
        performanceRatio,
        details: {
          startTime,
          endTime,
          memoryUsage: {
            rss: finalMemory.rss - initialMemory.rss,
            heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
            heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
            external: finalMemory.external - initialMemory.external,
            arrayBuffers: finalMemory.arrayBuffers - initialMemory.arrayBuffers,
          },
        },
      };

      this.results.push(result);
      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Even failed executions should be benchmarked
      const result: BenchmarkResult = {
        repoSize,
        fileCount,
        executionTime,
        targetTime,
        passed: false, // Failed execution = failed performance
        performanceRatio: executionTime / targetTime,
        details: {
          startTime,
          endTime,
          memoryUsage: process.memoryUsage(),
        },
      };

      this.results.push(result);
      throw error;
    }
  }

  async runBenchmarkSuite(
    testRepos: Array<{ path: string; name: string }>,
  ): Promise<BenchmarkSuite> {
    console.log('🚀 Starting performance benchmark suite...\n');

    const results: BenchmarkResult[] = [];

    for (const repo of testRepos) {
      console.log(`📊 Benchmarking: ${repo.name}`);

      try {
        const result = await this.benchmarkRepository(repo.path);
        results.push(result);

        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const ratio = (result.performanceRatio * 100).toFixed(1);

        console.log(
          `   ${status} ${result.executionTime}ms (${ratio}% of target) - ${result.repoSize} repo with ${result.fileCount} files`,
        );
      } catch (error) {
        console.log(`   ❌ ERROR: ${error}`);
      }
    }

    console.log('\n📈 Generating performance summary...\n');

    return this.generateSuite('Full Benchmark Suite', results);
  }

  generateSuite(testName: string, results: BenchmarkResult[]): BenchmarkSuite {
    const overallPassed = results.every((r) => r.passed);
    const averagePerformance =
      results.reduce((sum, r) => sum + r.performanceRatio, 0) / results.length;

    // Categorize results
    const smallRepos = results.filter((r) => r.repoSize === 'small');
    const mediumRepos = results.filter((r) => r.repoSize === 'medium');
    const largeRepos = results.filter((r) => r.repoSize === 'large');

    const suite: BenchmarkSuite = {
      testName,
      results,
      overallPassed,
      averagePerformance,
      summary: {
        smallRepos: {
          count: smallRepos.length,
          avgTime: smallRepos.reduce((sum, r) => sum + r.executionTime, 0) / smallRepos.length || 0,
          passed: smallRepos.filter((r) => r.passed).length,
        },
        mediumRepos: {
          count: mediumRepos.length,
          avgTime:
            mediumRepos.reduce((sum, r) => sum + r.executionTime, 0) / mediumRepos.length || 0,
          passed: mediumRepos.filter((r) => r.passed).length,
        },
        largeRepos: {
          count: largeRepos.length,
          avgTime: largeRepos.reduce((sum, r) => sum + r.executionTime, 0) / largeRepos.length || 0,
          passed: largeRepos.filter((r) => r.passed).length,
        },
      },
    };

    return suite;
  }

  printDetailedReport(suite: BenchmarkSuite): void {
    console.log(`📋 Performance Benchmark Report: ${suite.testName}`);
    console.log('='.repeat(60));
    console.log(`Overall Status: ${suite.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Average Performance: ${(suite.averagePerformance * 100).toFixed(1)}% of target`);
    console.log(`Total Tests: ${suite.results.length}\n`);

    // Summary by repo size
    console.log('📊 Performance by Repository Size:');
    console.log('-'.repeat(40));

    const categories = [
      {
        name: 'Small (<100 files)',
        data: suite.summary.smallRepos,
        target: PERFORMANCE_TARGETS.small,
      },
      {
        name: 'Medium (100-1000 files)',
        data: suite.summary.mediumRepos,
        target: PERFORMANCE_TARGETS.medium,
      },
      {
        name: 'Large (1000+ files)',
        data: suite.summary.largeRepos,
        target: PERFORMANCE_TARGETS.large,
      },
    ];

    categories.forEach((cat) => {
      if (cat.data.count > 0) {
        const passRate = ((cat.data.passed / cat.data.count) * 100).toFixed(1);
        const avgTime = cat.data.avgTime.toFixed(0);
        const targetTime = (cat.target / 1000).toFixed(1);

        console.log(`${cat.name}:`);
        console.log(
          `  Tests: ${cat.data.count} | Passed: ${cat.data.passed}/${cat.data.count} (${passRate}%)`,
        );
        console.log(`  Avg Time: ${avgTime}ms | Target: <${targetTime}s`);
        console.log('');
      }
    });

    // Detailed results
    console.log('🔍 Detailed Results:');
    console.log('-'.repeat(40));

    suite.results.forEach((result, i) => {
      const status = result.passed ? '✅' : '❌';
      const ratio = (result.performanceRatio * 100).toFixed(1);
      const memoryMB = (result.details.memoryUsage.heapUsed / 1024 / 1024).toFixed(1);

      console.log(`${status} Test ${i + 1}: ${result.executionTime}ms (${ratio}% of target)`);
      console.log(
        `   Size: ${result.repoSize} (${result.fileCount} files) | Memory: ${memoryMB}MB heap`,
      );
    });

    console.log('\n' + '='.repeat(60));
  }

  exportResults(suite: BenchmarkSuite, outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      suite,
      systemInfo: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
      },
      performanceTargets: PERFORMANCE_TARGETS,
    };

    return fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  }

  private async getFileCount(repoPath: string): Promise<number> {
    let fileCount = 0;

    async function countFiles(dir: string, level = 0): Promise<void> {
      if (level > 10) return; // Prevent infinite recursion

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.github') continue;
          if (entry.name === 'node_modules' || entry.name === 'vendor') continue;

          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            await countFiles(fullPath, level + 1);
          } else {
            fileCount++;
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    }

    await countFiles(repoPath);
    return fileCount;
  }

  private categorizeRepoSize(fileCount: number): 'small' | 'medium' | 'large' {
    if (fileCount < 100) return 'small';
    if (fileCount < 1000) return 'medium';
    return 'large';
  }

  // Utility method to clear results for fresh benchmarking
  reset(): void {
    this.results = [];
  }

  // Get current benchmark results
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }
}

// Factory function for easy usage
export function createBenchmarker(): PerformanceBenchmarker {
  return new PerformanceBenchmarker();
}
