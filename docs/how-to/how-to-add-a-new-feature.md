# How to Develop Custom MCP Tools

This guide explains how to extend DocuMCP with custom MCP tools for specialized documentation workflows.

## Understanding MCP Tool Architecture

DocuMCP follows the [Model Context Protocol](https://modelcontextprotocol.io/) specification. Each tool is a self-contained function that processes structured input and returns structured output.

### MCP Tool Structure

```typescript
// Basic MCP tool structure
{
  name: 'tool_name',
  description: 'What this tool does',
  inputSchema: zodSchema,  // Input validation
  handler: async (args) => { /* implementation */ }
}
```

## Planning Your Custom Tool

### 1. Define the Use Case

Ask yourself:
- **What documentation task** does this tool solve?
- **What inputs** does it need from the user?
- **What outputs** should it provide?
- **How does it fit** into the existing DocuMCP workflow?

### 2. Design the Tool Interface

**Example Planning Document:**
```markdown
## Tool: `analyze_dependencies`

**Purpose**: Analyze project dependencies for security vulnerabilities

**Inputs**:
- `projectPath` (string): Path to project
- `severity` (enum): 'low' | 'medium' | 'high' | 'critical'
- `includeDevDeps` (boolean): Include dev dependencies

**Outputs**:
- `vulnerabilities`: Array of security issues
- `recommendations`: Suggested fixes
- `summary`: Overall security score
```

## Implementation Steps

### 1. Create the Tool Definition

Add your tool to `src/index.ts`:

```typescript
// Add to TOOLS array
{
  name: 'analyze_dependencies',
  description: 'Analyze project dependencies for security vulnerabilities',
  inputSchema: z.object({
    projectPath: z.string().describe('Path to the project to analyze'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
    includeDevDeps: z.boolean().optional().default(true),
  }),
},
```

### 2. Create the Tool Implementation

Create `src/tools/analyze-dependencies.ts`:

```typescript
import { z } from 'zod';

// Define input schema
const AnalyzeDependenciesArgsSchema = z.object({
  projectPath: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  includeDevDeps: z.boolean().optional().default(true),
});

type AnalyzeDependenciesArgs = z.infer<typeof AnalyzeDependenciesArgsSchema>;

// Define output type
interface DependencyAnalysisResult {
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  summary: {
    totalDependencies: number;
    vulnerablePackages: number;
    securityScore: number;
  };
}

interface Vulnerability {
  package: string;
  version: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  fixedIn?: string;
  cve?: string;
}

export async function analyzeDependencies(
  args: unknown
): Promise<DependencyAnalysisResult> {
  // Validate inputs
  const validatedArgs = AnalyzeDependenciesArgsSchema.parse(args);
  const { projectPath, severity, includeDevDeps } = validatedArgs;

  try {
    // Implementation logic
    const packageJsonPath = `${projectPath}/package.json`;
    
    // 1. Read package.json
    const packageJson = await readPackageJson(packageJsonPath);
    
    // 2. Analyze dependencies
    const vulnerabilities = await scanForVulnerabilities(
      packageJson,
      includeDevDeps,
      severity
    );
    
    // 3. Generate recommendations
    const recommendations = generateSecurityRecommendations(vulnerabilities);
    
    // 4. Calculate summary
    const summary = calculateSecuritySummary(packageJson, vulnerabilities);

    return {
      vulnerabilities,
      recommendations,
      summary,
    };
  } catch (error) {
    throw new Error(`Failed to analyze dependencies: ${error.message}`);
  }
}

// Helper functions
async function readPackageJson(path: string) {
  // Implementation
}

async function scanForVulnerabilities(packageJson: any, includeDevDeps: boolean, severity: string) {
  // Implementation using npm audit or similar
}

function generateSecurityRecommendations(vulnerabilities: Vulnerability[]): string[] {
  // Generate actionable recommendations
}

function calculateSecuritySummary(packageJson: any, vulnerabilities: Vulnerability[]) {
  // Calculate security metrics
}
```

### 3. Register the Tool Handler

Add the handler to `src/index.ts`:

```typescript
// In the CallToolRequestSchema handler
case 'analyze_dependencies': {
  const result = await analyzeDependencies(args);
  
  // Store result as resource
  const analysisId = `security-analysis-${Date.now()}`;
  storeResource(
    `documcp://analysis/${analysisId}`,
    JSON.stringify(result, null, 2),
    'application/json'
  );
  
  return {
    content: [
      {
        type: 'text',
        text: `Security analysis complete. Found ${result.vulnerabilities.length} vulnerabilities.`,
      },
      {
        type: 'text',
        text: `Security Score: ${result.summary.securityScore}/100`,
      },
      {
        type: 'text',
        text: `Recommendations:\n${result.recommendations.slice(0, 5).map(r => `- ${r}`).join('\n')}`,
      },
    ],
  };
}
```

### 4. Write Comprehensive Tests

Create `tests/tools/analyze-dependencies.test.ts`:

```typescript
import { analyzeDependencies } from '../../src/tools/analyze-dependencies';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('analyzeDependencies', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should analyze project dependencies successfully', async () => {
    const args = {
      projectPath: './test-fixtures/sample-project',
      severity: 'medium',
      includeDevDeps: true,
    };

    const result = await analyzeDependencies(args);

    expect(result).toMatchObject({
      vulnerabilities: expect.any(Array),
      recommendations: expect.any(Array),
      summary: expect.objectContaining({
        totalDependencies: expect.any(Number),
        vulnerablePackages: expect.any(Number),
        securityScore: expect.any(Number),
      }),
    });
  });

  it('should filter by severity level', async () => {
    const args = {
      projectPath: './test-fixtures/vulnerable-project',
      severity: 'high',
      includeDevDeps: false,
    };

    const result = await analyzeDependencies(args);
    
    // All vulnerabilities should be high or critical
    result.vulnerabilities.forEach(vuln => {
      expect(['high', 'critical']).toContain(vuln.severity);
    });
  });

  it('should handle missing package.json gracefully', async () => {
    const args = {
      projectPath: './non-existent-project',
    };

    await expect(analyzeDependencies(args)).rejects.toThrow(
      'Failed to analyze dependencies'
    );
  });
});
```

### 5. Add Integration Tests

Create `tests/integration/custom-tools.test.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('Custom Tools Integration', () => {
  it('should execute analyze_dependencies tool through MCP', async () => {
    // Test MCP tool execution
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'analyze_dependencies',
        arguments: {
          projectPath: './test-fixtures/sample-project',
        },
      },
    };

    // Test the tool through the MCP server
    const response = await callMCPTool(request);
    expect(response.result).toBeDefined();
  });
});
```

## Advanced Tool Development

### Error Handling Best Practices

```typescript
export async function myCustomTool(args: unknown): Promise<MyResult> {
  try {
    const validatedArgs = MyArgsSchema.parse(args);
    
    // Implementation with specific error types
    if (!validatedArgs.path) {
      throw new ValidationError('Path is required');
    }
    
    const result = await processData(validatedArgs);
    return result;
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new Error(`Invalid input: ${error.message}`);
    }
    
    if (error instanceof NetworkError) {
      throw new Error(`Network issue: ${error.message}`);
    }
    
    // Generic fallback
    throw new Error(`Tool execution failed: ${error.message}`);
  }
}
```

### Resource Storage Integration

```typescript
// Store tool results for later retrieval
export function storeToolResult(toolName: string, result: any): string {
  const resourceId = `${toolName}-${Date.now()}`;
  const uri = `documcp://${toolName}/${resourceId}`;
  
  storeResource(uri, JSON.stringify(result, null, 2), 'application/json');
  
  return resourceId;
}
```

### Performance Optimization

```typescript
// Add timeout and progress tracking
export async function longRunningTool(args: MyArgs): Promise<MyResult> {
  const timeout = args.timeout || 30000; // 30 seconds default
  
  return Promise.race([
    performAnalysis(args),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
    ),
  ]);
}
```

## Testing Your Custom Tool

### Unit Testing
```bash
# Test specific tool
npm test -- --testPathPattern=analyze-dependencies

# Test with coverage
npm run test:coverage
```

### Manual MCP Testing
```bash
# Build and test tool directly
npm run build

# Test tool through MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"analyze_dependencies","arguments":{"projectPath":"."}}}' | node dist/index.js
```

### Integration Testing
```bash
# Test in MCP client (Claude Desktop)
# Add tool to your MCP configuration and test in Claude
```

## Documentation Requirements

### 1. Add to API Reference
Update `docs/reference/api-reference.md` with your tool documentation.

### 2. Create Usage Examples
Add examples to `docs/how-to/` showing real-world usage.

### 3. Update Tool Listings
Add your tool to the main tool list in documentation.

## Contributing Your Tool

### 1. Follow Code Standards
```bash
# Lint your code
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

### 2. Create Pull Request
- Describe the tool's purpose and use cases
- Include test coverage reports
- Add documentation examples
- Reference any related issues

### 3. Tool Review Checklist
- [ ] Follows MCP protocol specifications
- [ ] Includes comprehensive error handling
- [ ] Has &gt;90% test coverage
- [ ] Documentation is complete
- [ ] Integrates with existing DocuMCP workflows
- [ ] Performance is acceptable
- [ ] Security considerations addressed

## Common Tool Patterns

### File System Tools
```typescript
// Pattern for tools that work with files
import { promises as fs } from 'fs';
import { join } from 'path';

export async function fileSystemTool(args: FileSystemArgs) {
  // Always validate paths for security
  const safePath = validateAndSanitizePath(args.path);
  
  // Check permissions
  await fs.access(safePath, fs.constants.R_OK);
  
  // Process files
  const result = await processFiles(safePath);
  return result;
}
```

### Network Tools
```typescript
// Pattern for tools that make HTTP requests
export async function networkTool(args: NetworkArgs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(args.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DocuMCP/1.0' },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

### Analysis Tools
```typescript
// Pattern for tools that analyze code/content
export async function analysisTool(args: AnalysisArgs) {
  const metrics = {
    linesProcessed: 0,
    issuesFound: 0,
    executionTime: 0,
  };
  
  const startTime = Date.now();
  
  try {
    const analysis = await performAnalysis(args, (progress) => {
      metrics.linesProcessed = progress.lines;
    });
    
    metrics.executionTime = Date.now() - startTime;
    
    return {
      ...analysis,
      metadata: metrics,
    };
  } catch (error) {
    metrics.executionTime = Date.now() - startTime;
    throw new Error(`Analysis failed after ${metrics.executionTime}ms: ${error.message}`);
  }
}
```

Your custom MCP tool should seamlessly integrate with DocuMCP's existing documentation workflow while adding specialized functionality for your specific use case.