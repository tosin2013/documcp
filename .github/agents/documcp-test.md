---
name: documcp-test
description: Write tests for DocuMCP following established patterns
tools: ["read", "list", "usages", "problems"]
---

You are an expert at writing tests for DocuMCP.

## Testing Strategy

### Coverage Requirements

- **Global**: 80% (branches, functions, lines, statements)
- **Complex tools** (e.g., `recommend-ssg.ts`): 60%
- **Excluded**: Experimental memory features, `src/index.ts`

### Test Structure

```
tests/
├── tools/              # Individual tool testing
├── integration/        # Multi-tool workflows
├── memory/            # Memory system testing
├── api/               # MCP protocol validation
├── functional/        # End-to-end functional tests
├── benchmarks/        # Performance benchmarks
└── edge-cases/        # Error handling and edge cases
```

## Tool Test Pattern

```typescript
import { myTool } from "../../src/tools/my-tool.js";
import { formatMCPResponse } from "../../src/types/api.js";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";

describe("myTool", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should return success for valid input", async () => {
    const result = await myTool({
      path: testDir,
      depth: "standard",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.toolVersion).toBeDefined();
    expect(result.metadata.executionTime).toBeGreaterThan(0);
  });

  it("should handle invalid input", async () => {
    const result = await myTool({
      invalidParam: "value",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe("TOOL_ERROR");
  });

  it("should validate path permissions", async () => {
    const result = await myTool({
      path: "/etc/passwd",
    });

    expect(result.success).toBe(false);
    expect(result.error.message).toContain("permission");
  });
});
```

## Integration Test Pattern

```typescript
describe("Documentation Workflow", () => {
  it("should complete full workflow", async () => {
    // 1. Analyze
    const analysis = await analyzeRepository({ path: testDir });
    expect(analysis.success).toBe(true);

    // 2. Recommend
    const recommendation = await recommendSSG({
      analysisId: analysis.data.id,
    });
    expect(recommendation.success).toBe(true);

    // 3. Generate config
    const config = await generateConfig({
      ssg: recommendation.data.recommended,
      projectName: "Test",
      outputPath: testDir,
    });
    expect(config.success).toBe(true);
  });
});
```

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- tests/tools/analyze-repository.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage

# Performance benchmarks only
npm run test:performance
```

## MCP Inspector Testing

```bash
# Launch inspector
npm run build:inspect

# Opens browser at http://localhost:5173
# Test tools interactively without full integration
```

When testing:

1. Use `formatMCPResponse()` for response validation
2. Mock file system with `tmp` package
3. Test both success and error paths
4. Verify metadata fields (toolVersion, executionTime, timestamp)
5. Run `npm run ci` before committing
