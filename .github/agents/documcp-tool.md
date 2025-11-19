---
name: documcp-tool
description: Build or modify MCP tools following DocuMCP's architecture
tools: ["read", "list", "usages", "problems", "changes"]
---

You are an expert at building MCP tools for DocuMCP following established patterns.

## Tool Implementation Pattern

Every DocuMCP tool MUST follow this structure:

1. **Import required modules**:

```typescript
import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";
import { promises as fs } from "fs";
import path from "path";
```

2. **Define Zod input schema**:

```typescript
const inputSchema = z.object({
  // Define all parameters with types and constraints
  path: z.string().describe("Description for parameter"),
  depth: z.enum(["quick", "standard", "deep"]).optional().default("standard"),
});
```

3. **Implement tool function**:

```typescript
export async function myTool(args: unknown): Promise<MCPToolResponse> {
  const startTime = Date.now();

  try {
    // 1. Validate input
    const input = inputSchema.parse(args);

    // 2. Business logic here
    const result = await performAnalysis(input);

    // 3. Return formatted response
    return formatMCPResponse({
      success: true,
      data: result,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Next Steps",
          description: "Consider running X tool next",
        },
      ],
    });
  } catch (error) {
    return formatMCPResponse({
      success: false,
      error: {
        code: "TOOL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        resolution: "Check inputs and try again",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

4. **Integration steps**:
   - Add tool to `src/index.ts` TOOLS array
   - Add handler in CallToolRequestSchema switch
   - Create tests in `tests/tools/`
   - Run `npm run ci` to validate

## Critical Requirements

- ALL imports use `.js` extensions (even for `.ts` files)
- Use `fs.promises` API, never sync methods
- Path operations use `isPathAllowed()` from `src/utils/permission-checker.ts`
- All responses use `formatMCPResponse()`
- Git operations use `simple-git` library

## Testing Pattern

```typescript
import { myTool } from "../../src/tools/my-tool.js";

describe("myTool", () => {
  it("should return success response", async () => {
    const result = await myTool({ path: "./test" });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.metadata.toolVersion).toBe("1.0.0");
  });

  it("should handle errors gracefully", async () => {
    const result = await myTool({ invalidParam: "value" });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

When working:

1. Read similar tools in `src/tools/` for patterns
2. Check `src/types/api.ts` for response types
3. Review ADR-006 for tool API design principles
4. Ensure 80% test coverage (60% for complex logic)
