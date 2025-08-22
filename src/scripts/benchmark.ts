#!/usr/bin/env node
// Performance benchmark CLI script per PERF-001 rules
import { promises as fs } from 'fs';
import path from 'path';
import { createBenchmarker } from '../benchmarks/performance.js';

interface BenchmarkConfig {
  testRepos: Array<{
    path: string;
    name: string;
    expectedSize?: 'small' | 'medium' | 'large';
  }>;
  outputDir?: string;
  verbose?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'run':
      await runBenchmarks(args.slice(1));
      break;
    case 'current':
      await benchmarkCurrentRepo();
      break;
    case 'create-config':
      await createDefaultConfig();
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

async function runBenchmarks(args: string[]) {
  const configPath = args[0] || './benchmark-config.json';
  
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: BenchmarkConfig = JSON.parse(configContent);
    
    console.log('🎯 Performance Benchmarking System (PERF-001 Compliance)');
    console.log('Target Performance:');
    console.log('  • Small repos (<100 files): <1 second');
    console.log('  • Medium repos (100-1000 files): <10 seconds');
    console.log('  • Large repos (1000+ files): <60 seconds\\n');
    
    const benchmarker = createBenchmarker();
    const suite = await benchmarker.runBenchmarkSuite(config.testRepos);
    
    // Print detailed report
    benchmarker.printDetailedReport(suite);
    
    // Export results if output directory specified
    if (config.outputDir) {
      await fs.mkdir(config.outputDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(config.outputDir, `benchmark-${timestamp}.json`);
      
      await benchmarker.exportResults(suite, outputPath);
      console.log(`\\n📄 Results exported to: ${outputPath}`);
    }
    
    // Exit with appropriate code
    process.exit(suite.overallPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    console.error('\\nTry running "npm run benchmark:create-config" to create a default configuration.');
    process.exit(1);
  }
}

async function benchmarkCurrentRepo() {
  console.log('🎯 Benchmarking Current Repository');
  console.log('='.repeat(40));
  
  const currentRepo = process.cwd();
  const repoName = path.basename(currentRepo);
  
  const benchmarker = createBenchmarker();
  
  try {
    console.log(`📊 Analyzing: ${repoName} at ${currentRepo}\\n`);
    
    const result = await benchmarker.benchmarkRepository(currentRepo, 'standard');
    
    // Generate single-repo suite
    const suite = benchmarker.generateSuite(`Current Repository: ${repoName}`, [result]);
    
    // Print results
    benchmarker.printDetailedReport(suite);
    
    // Export to current directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = `./benchmark-current-${timestamp}.json`;
    await benchmarker.exportResults(suite, outputPath);
    
    console.log(`\\n📄 Results saved to: ${outputPath}`);
    
    process.exit(suite.overallPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

async function createDefaultConfig() {
  const defaultConfig: BenchmarkConfig = {
    testRepos: [
      {
        path: ".",
        name: "Current Repository",
        expectedSize: "small"
      },
      // Add more test repositories here
      // {
      //   path: "/path/to/medium/repo",
      //   name: "Medium Test Repo",
      //   expectedSize: "medium"
      // },
      // {
      //   path: "/path/to/large/repo", 
      //   name: "Large Test Repo",
      //   expectedSize: "large"
      // }
    ],
    outputDir: "./benchmark-results",
    verbose: true
  };
  
  const configPath = './benchmark-config.json';
  await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  
  console.log('✅ Created default benchmark configuration:');
  console.log(`   ${configPath}`);
  console.log('');
  console.log('📝 Edit this file to add your test repositories, then run:');
  console.log('   npm run benchmark:run');
}

function printHelp() {
  console.log('🎯 DocuMCP Performance Benchmarking Tool');
  console.log('');
  console.log('USAGE:');
  console.log('  npm run benchmark:run [config-file]     Run full benchmark suite');
  console.log('  npm run benchmark:current               Benchmark current repository only');
  console.log('  npm run benchmark:create-config         Create default configuration');
  console.log('  npm run benchmark:help                  Show this help');
  console.log('');
  console.log('PERFORMANCE TARGETS (PERF-001):');
  console.log('  • Small repositories (<100 files): <1 second');
  console.log('  • Medium repositories (100-1000 files): <10 seconds');
  console.log('  • Large repositories (1000+ files): <60 seconds');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  npm run benchmark:current');
  console.log('  npm run benchmark:create-config');
  console.log('  npm run benchmark:run ./my-config.json');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});