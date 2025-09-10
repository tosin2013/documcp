# How to Create Custom MCP Tools

This guide shows you how to develop custom MCP tools for documcp to extend its documentation capabilities.

## Prerequisites

- Node.js 20+ and TypeScript knowledge
- Understanding of MCP protocol basics
- documcp development environment set up
- Familiarity with Zod schema validation

## MCP Tool Architecture

documcp tools follow the MCP (Model Context Protocol) specification:

```typescript
interface MCPTool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  handler: (args: any) => Promise<ToolResult>;
}
```

## Step 1: Plan Your Tool

### Define Tool Purpose

1. **Identify the Documentation Need**:
   - What documentation task will this tool solve?
   - How does it fit into the Diataxis framework?
   - What inputs and outputs are required?

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/tool-your-tool-name
   ```

### Example Tool Concept

Let's create a `validate_markdown_links` tool that checks for broken links in documentation.

## Step 2: Create Tool Structure

### Tool File Structure

Create your tool in `src/tools/`:
```bash
touch src/tools/validate-markdown-links.ts
```

### Basic Tool Template

```typescript
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Input validation schema
const ValidateMarkdownLinksSchema = z.object({
  path: z.string().describe('Path to markdown files or directory'),
  recursive: z.boolean().optional().default(true).describe('Check subdirectories'),
  external: z.boolean().optional().default(false).describe('Validate external URLs'),
  timeout: z.number().optional().default(5000).describe('Timeout for external links (ms)')
});

export type ValidateMarkdownLinksArgs = z.infer<typeof ValidateMarkdownLinksSchema>;

export const validateMarkdownLinks: Tool = {
  name: 'validate_markdown_links',
  description: 'Validate internal and external links in markdown documentation files',
  inputSchema: ValidateMarkdownLinksSchema.describe('Validate markdown links tool parameters'),
  
  async handler(args: ValidateMarkdownLinksArgs) {
    // Implementation goes here
    return {
      content: [
        {
          type: 'text',
          text: 'Link validation results...'
        }
      ]
    };
  }
};
```

## Step 3: Implement Tool Logic

### Core Implementation

```typescript
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export const validateMarkdownLinks: Tool = {
  name: 'validate_markdown_links',
  description: 'Validate internal and external links in markdown documentation files',
  inputSchema: ValidateMarkdownLinksSchema,
  
  async handler(args: ValidateMarkdownLinksArgs) {
    try {
      // Validate input
      const validatedArgs = ValidateMarkdownLinksSchema.parse(args);
      
      // Find markdown files
      const pattern = path.join(validatedArgs.path, validatedArgs.recursive ? '**/*.md' : '*.md');
      const files = await glob(pattern);
      
      const results = {
        totalFiles: files.length,
        brokenLinks: [] as Array<{
          file: string;
          link: string;
          error: string;
        }>,
        validLinks: 0
      };
      
      // Process each file
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const links = extractLinks(content);
        
        for (const link of links) {
          try {
            await validateLink(link, file, validatedArgs);
            results.validLinks++;
          } catch (error) {
            results.brokenLinks.push({
              file: path.relative(process.cwd(), file),
              link,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating links: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }
};

// Helper functions
function extractLinks(content: string): string[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links: string[] = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]);
  }
  
  return links;
}

async function validateLink(link: string, sourceFile: string, args: ValidateMarkdownLinksArgs): Promise<void> {
  if (link.startsWith('http')) {
    if (args.external) {
      // Validate external URL
      const response = await fetch(link, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(args.timeout || 5000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
  } else {
    // Validate internal link
    const targetPath = path.resolve(path.dirname(sourceFile), link);
    try {
      await fs.access(targetPath);
    } catch {
      throw new Error(`File not found: ${link}`);
    }
  }
}
```

## Step 4: Register Your Tool

### Add to Tool Registry

Update `src/index.ts` to include your new tool:

```typescript
import { validateMarkdownLinks } from './tools/validate-markdown-links.js';

// Add to tools array
const tools = [
  analyzeRepository,
  recommendSSG,
  generateConfig,
  setupStructure,
  populateDiataxisContent,
  detectGaps,
  validateContent,
  validateDiataxisContent,
  deployPages,
  testLocalDeployment,
  verifyDeployment,
  validateMarkdownLinks, // Your new tool
];
```

## Step 5: Add Comprehensive Tests

### Create Test File

```typescript
// tests/tools/validate-markdown-links.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { validateMarkdownLinks } from '../../src/tools/validate-markdown-links.js';
import fs from 'fs/promises';
import path from 'path';

describe('validateMarkdownLinks', () => {
  const testDir = path.join(__dirname, 'test-markdown');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should validate internal links correctly', async () => {
    // Create test files
    await fs.writeFile(
      path.join(testDir, 'test.md'),
      '[Link to reference](../reference/api-reference.md)'
    );
    
    const result = await validateMarkdownLinks.handler({
      path: testDir,
      recursive: false,
      external: false
    });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.brokenLinks).toHaveLength(0);
    expect(parsed.validLinks).toBe(1);
  });
  
  it('should detect broken internal links', async () => {
    await fs.writeFile(
      path.join(testDir, 'test.md'),
      '[Valid link](../reference/api-reference.md)'
    );
    
    const result = await validateMarkdownLinks.handler({
      path: testDir,
      recursive: false,
      external: false
    });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.brokenLinks).toHaveLength(1);
    expect(parsed.brokenLinks[0].link).toBe('./nonexistent-file.md');
  });
});
```

### Run Tests

```bash
npm test -- validate-markdown-links
```

## Step 6: Add Documentation

### Tool Documentation

Create documentation in `docs/reference/tools/`:

```markdown
# validate_markdown_links

Validates internal and external links in markdown documentation files.

## Parameters

- `path` (string): Path to markdown files or directory
- `recursive` (boolean, optional): Check subdirectories (default: true)
- `external` (boolean, optional): Validate external URLs (default: false)
- `timeout` (number, optional): Timeout for external links in ms (default: 5000)

## Example Usage

```json
{
  "name": "validate_markdown_links",
  "arguments": {
    "path": "./docs",
    "recursive": true,
    "external": true,
    "timeout": 10000
  }
}
```

## Return Format

Returns JSON with validation results:
- `totalFiles`: Number of files processed
- `brokenLinks`: Array of broken link details
- `validLinks`: Count of valid links found
```

### Update API Reference

Add your tool to `docs/reference/api-reference.md`:

```markdown
### validate_markdown_links

**Purpose**: Validate internal and external links in markdown files

**Use Cases**:
- Documentation quality assurance
- Pre-deployment link validation
- Maintenance of large documentation sites

**Integration**: Works with all SSGs and documentation frameworks
```

## Step 7: Integration Testing

### Test with AI Client

Test your tool with Claude Desktop or other MCP clients:

```
Can you validate all the links in my documentation using the validate_markdown_links tool?
```

### Performance Testing

Test with large documentation sets:

```bash
# Create performance test
DEBUG=documcp:performance npm run dev
```

## Best Practices

### Code Quality

1. **Input Validation**: Always use Zod schemas for type safety
2. **Error Handling**: Provide clear, actionable error messages
3. **Performance**: Consider memory usage for large repositories
4. **Security**: Validate file paths and prevent directory traversal

### Tool Design

1. **Single Responsibility**: Each tool should have one clear purpose
2. **Composability**: Tools should work well together
3. **Consistency**: Follow existing tool patterns and naming
4. **Documentation**: Provide comprehensive usage examples

### Testing Strategy

1. **Unit Tests**: Test core logic in isolation
2. **Integration Tests**: Test with real file systems
3. **Error Cases**: Test all failure scenarios
4. **Performance Tests**: Validate with large datasets

## Advanced Features

### Tool Chaining

Design tools to work together:

```typescript
// Tool that uses results from other tools
export const generateQualityReport: Tool = {
  name: 'generate_quality_report',
  description: 'Generate comprehensive documentation quality report',
  
  async handler(args) {
    // Use multiple tools together
    const gapAnalysis = await detectGaps.handler(args);
    const linkValidation = await validateMarkdownLinks.handler(args);
    const contentValidation = await validateContent.handler(args);
    
    // Combine results
    return combineReports(gapAnalysis, linkValidation, contentValidation);
  }
};
```

### Configuration Support

Add tool-specific configuration:

```typescript
const config = {
  linkValidation: {
    timeout: process.env.LINK_TIMEOUT || 5000,
    retries: process.env.LINK_RETRIES || 3,
    userAgent: process.env.USER_AGENT || 'documcp-validator'
  }
};
```

## Deployment and Distribution

### Build and Test

```bash
npm run build
npm test
npm run lint
```

### Create Pull Request

```bash
git add .
git commit -m "feat: add validate_markdown_links tool

- Validates internal and external markdown links
- Supports recursive directory scanning
- Configurable timeout for external URLs
- Comprehensive test coverage"

git push origin feature/tool-validate-markdown-links
```

## Related Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [Zod Validation Library](https://zod.dev/)
- [documcp Architecture](../explanation/architecture-overview.md)
- [Testing Guide](../tutorials/writing-and-running-tests.md)
