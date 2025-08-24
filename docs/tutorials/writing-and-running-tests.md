# Writing and Running Tests for DocuMCP

Learn how to write effective tests for DocuMCP's MCP server, tools, and documentation generation features using Jest and TypeScript.

## Test Structure

Tests should follow the AAA pattern:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the code being tested
- **Assert**: Verify the results

## DocuMCP Test Structure

DocuMCP tests are organized into categories:
- **`tests/api/`**: MCP protocol and tool integration tests
- **`tests/functional/`**: End-to-end tool functionality tests
- **`tests/benchmarks/`**: Performance and compliance tests
- **`tests/edge-cases/`**: Error handling and edge case tests

## Writing Your First DocuMCP Test

Create a test file for MCP tools with the `.test.ts` extension:

```typescript
// tests/functional/analyze-repository.test.ts
import { analyzeRepository } from '../../src/tools/analyze-repository.js';

describe('Repository Analysis Tool', () => {
  it('should analyze a TypeScript project correctly', async () => {
    // Arrange
    const testRepoPath = './test-fixtures/typescript-project';
    const analysisArgs = { 
      path: testRepoPath, 
      depth: 'standard' as const 
    };
    
    // Act
    const result = await analyzeRepository(analysisArgs);
    
    // Assert
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('TypeScript');
    expect(result.content[0].text).toContain('analysis completed');
  });

  it('should handle invalid repository paths gracefully', async () => {
    // Arrange
    const invalidPath = './non-existent-repo';
    
    // Act & Assert
    await expect(analyzeRepository({ path: invalidPath }))
      .rejects.toThrow('Repository path does not exist');
  });
});
```

## Running DocuMCP Tests

Execute all tests:
```bash
npm test
```

Run specific test categories:
```bash
# Run only functional tests
npm test tests/functional/

# Run MCP protocol tests
npm test tests/api/

# Run performance benchmarks
npm test tests/benchmarks/
```

Run tests in watch mode during development:
```bash
npm test -- --watch
```

## Test Coverage Requirements

DocuMCP maintains 80% test coverage for release compliance:

```bash
# Generate coverage report
npm run test:coverage

# Check coverage meets 80% threshold
npm run test:coverage:check
```

## Testing MCP Tools

### Testing Repository Analysis
```typescript
// Test with different project types
describe('Repository Analysis', () => {
  it('should detect React projects', async () => {
    const result = await analyzeRepository({ 
      path: './fixtures/react-project' 
    });
    expect(result.content[0].text).toContain('React');
  });
});
```

### Testing SSG Recommendations
```typescript
// Test recommendation logic
describe('SSG Recommendation Engine', () => {
  it('should recommend Docusaurus for React projects', async () => {
    const result = await recommendSSG({ 
      analysisId: 'react-analysis-123' 
    });
    expect(result.content[0].text).toContain('Docusaurus');
  });
});
```

### Testing Documentation Generation
```typescript
// Test content population
describe('Content Population', () => {
  it('should generate project-specific tutorials', async () => {
    const result = await handlePopulateDiataxisContent({
      analysisId: 'test-analysis',
      docsPath: './test-output'
    });
    expect(result.filesCreated).toBeGreaterThan(0);
  });
});
```

## Performance Testing

DocuMCP includes performance benchmarks:

```bash
# Run performance tests
npm run test:performance

# Create benchmark configuration
npm run benchmark:create-config

# Run current repository benchmark
npm run benchmark:current
```

## Best Practices for DocuMCP Tests

1. **Test MCP protocol compliance**: Ensure tools return proper MCP response format
2. **Mock file system operations**: Use test fixtures instead of real file operations
3. **Test error handling**: Verify graceful handling of invalid inputs
4. **Validate performance**: Ensure tools meet PERF-001 compliance standards
5. **Test with real projects**: Include integration tests with actual repository structures
