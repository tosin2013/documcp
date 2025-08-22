# Performance Benchmarking System (PERF-001 Compliance)

This document describes DocuMCP's performance benchmarking system, implemented according to PERF-001 development rules.

## Overview

The performance benchmarking system ensures that repository analysis operations meet strict performance targets based on repository size:

- **Small repositories** (<100 files): **<1 second**
- **Medium repositories** (100-1000 files): **<10 seconds**  
- **Large repositories** (1000+ files): **<60 seconds**

## Quick Start

### Benchmark Current Repository
```bash
npm run benchmark:current
```

### Create Configuration File
```bash
npm run benchmark:create-config
```

### Run Full Benchmark Suite
```bash
npm run benchmark:run [config-file]
```

### Get Help
```bash
npm run benchmark:help
```

## Architecture

### Core Components

#### `PerformanceBenchmarker` Class
- **Location**: `src/benchmarks/performance.ts`
- **Purpose**: Main benchmarking engine
- **Features**:
  - Repository size categorization (small/medium/large)
  - Performance ratio calculations
  - Memory usage tracking
  - Detailed reporting and export

#### Benchmark CLI Script
- **Location**: `src/scripts/benchmark.ts`
- **Purpose**: Command-line interface for benchmarking
- **Commands**:
  - `run`: Execute benchmark suite
  - `current`: Benchmark current repository only
  - `create-config`: Generate default configuration
  - `help`: Display usage information

### Performance Optimizations in Core Tools

The repository analysis tool (`analyze-repository.ts`) includes PERF-001 optimizations:

```typescript
// Adaptive depth limiting based on repository size
function getMaxDepthForRepo(estimatedFiles: number): number {
  if (estimatedFiles < 100) return 10;   // Small repo: allow deeper analysis
  if (estimatedFiles < 1000) return 8;   // Medium repo: moderate depth
  return 6;                              // Large repo: shallow depth for speed
}
```

## Configuration

### Benchmark Configuration File (`benchmark-config.json`)

```json
{
  "testRepos": [
    {
      "path": ".",
      "name": "Current Repository", 
      "expectedSize": "small"
    },
    {
      "path": "/path/to/medium/repo",
      "name": "Medium Test Repo",
      "expectedSize": "medium"
    }
  ],
  "outputDir": "./benchmark-results",
  "verbose": true
}
```

### Configuration Options

- **`testRepos`**: Array of repositories to benchmark
  - `path`: Repository directory path
  - `name`: Human-readable name for reports
  - `expectedSize`**: Optional size hint (small/medium/large)
- **`outputDir`**: Directory for JSON result exports
- **`verbose`**: Enable detailed console output

## Result Analysis

### Benchmark Results Structure

```typescript
interface BenchmarkResult {
  repoSize: 'small' | 'medium' | 'large';
  fileCount: number;
  executionTime: number;        // Milliseconds
  targetTime: number;           // Target performance threshold
  passed: boolean;              // Met performance target
  performanceRatio: number;     // executionTime / targetTime
  details: {
    startTime: number;
    endTime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}
```

### Performance Metrics

#### Pass/Fail Criteria
- **✅ PASS**: Execution time ≤ target time
- **❌ FAIL**: Execution time > target time

#### Performance Ratio
- **< 1.0**: Better than target (e.g., 0.5 = 50% of target time)
- **= 1.0**: Exactly at target performance
- **> 1.0**: Slower than target (e.g., 1.5 = 150% of target time)

## Integration with Testing

### Performance Tests
```bash
npm run test:performance
```

The performance test suite validates:
- Repository size categorization accuracy
- Execution time measurement precision
- Performance ratio calculations
- Memory usage tracking
- PERF-001 compliance verification

### Test Coverage
- **Repository Size Categories**: Tests with 50, 500, and 1500 files
- **Performance Measurement**: Timing accuracy validation
- **Memory Tracking**: Heap usage monitoring
- **Benchmark Suite**: Multi-repository testing
- **Result Export**: JSON output validation

## Continuous Integration

### GitHub Actions Integration

Add performance benchmarking to your CI pipeline:

```yaml
name: Performance Benchmarks

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run benchmark:current
      - name: Upload benchmark results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-*.json
```

### Performance Regression Detection

Set up automated alerts for performance regressions:

```bash
# Fail CI if benchmark doesn't pass
npm run benchmark:current || exit 1
```

## Troubleshooting

### Common Issues

#### "No such file or directory" Error
- **Cause**: Invalid repository path in configuration
- **Solution**: Verify all paths in `benchmark-config.json` exist

#### "Module not found" Error  
- **Cause**: Missing dependencies or incorrect imports
- **Solution**: Run `npm install` and `npm run build`

#### Performance Targets Not Met
- **Cause**: Repository analysis is slower than expected
- **Solution**: 
  1. Check system resources (CPU, memory)
  2. Optimize repository structure (remove large irrelevant files)
  3. Use 'quick' depth analysis for initial benchmarking

### Debugging Performance Issues

Enable verbose logging:
```bash
DEBUG=* npm run benchmark:current
```

Export detailed results:
```bash
npm run benchmark:run
# Check benchmark-results/ directory for detailed JSON reports
```

## API Reference

### Core Functions

#### `createBenchmarker()`
Creates a new `PerformanceBenchmarker` instance.

```typescript
const benchmarker = createBenchmarker();
```

#### `benchmarkRepository(repoPath, depth?)`
Benchmarks a single repository.

```typescript
const result = await benchmarker.benchmarkRepository('/path/to/repo', 'standard');
```

#### `runBenchmarkSuite(testRepos)`
Runs benchmarks on multiple repositories.

```typescript
const suite = await benchmarker.runBenchmarkSuite([
  { path: './repo1', name: 'Test Repo 1' },
  { path: './repo2', name: 'Test Repo 2' }
]);
```

#### `exportResults(suite, outputPath)`
Exports benchmark results to JSON file.

```typescript
await benchmarker.exportResults(suite, './results.json');
```

### Utility Functions

#### `getMaxDepthForRepo(fileCount)`
Returns optimal analysis depth based on repository size.

#### `categorizeRepoSize(fileCount)`
Categorizes repository as small/medium/large.

## Performance Targets Rationale

The PERF-001 targets are based on:

1. **User Experience**: Analysis should feel instantaneous for small projects
2. **CI/CD Integration**: Must not significantly slow down build pipelines  
3. **Large Repository Support**: Must handle enterprise-scale repositories
4. **Memory Efficiency**: Analysis should use <100MB additional memory

## Future Enhancements

### Planned Features

1. **Progressive Analysis**: Stream results for very large repositories
2. **Parallel Processing**: Multi-threaded analysis for faster processing
3. **Caching Layer**: Cache analysis results to avoid re-processing
4. **Custom Metrics**: User-defined performance targets
5. **Performance Trends**: Historical performance tracking

### Contributing Performance Improvements

When optimizing performance:

1. Run benchmarks before and after changes
2. Ensure all performance tests pass
3. Update performance targets if justified
4. Document optimization techniques used

## Related Documentation

- [DEVELOPMENT_RULES.md](../DEVELOPMENT_RULES.md) - PERF-001 specification
- [RULES_QUICK_REFERENCE.md](../RULES_QUICK_REFERENCE.md) - Performance guidelines
- [docs/adrs/](./adrs/) - Architecture decisions affecting performance