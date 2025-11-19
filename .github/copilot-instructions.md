# DocuMCP AI Coding Agent Instructions

DocuMCP is an intelligent MCP server for GitHub Pages documentation deployment with 45+ tools, Knowledge Graph memory system, and AST-based code analysis.

## Architecture Essentials

### MCP Server Design (src/index.ts)

- **Stateless operation**: Each tool analyzes current state; no persistent session data
- **Resource storage**: Temporary session context in `resourceStore` Map with URIs like `documcp://analysis/{id}`
- **Response format**: ALL tools MUST use `formatMCPResponse()` from `src/types/api.ts` returning `MCPToolResponse`
- **Memory integration**: Tools auto-store results in JSONL (`.documcp/memory/`) and query historical data

### Tool Implementation Pattern

Every tool follows this structure:

1. Zod schema for input validation (e.g., `inputSchema.parse()`)
2. Business logic with error handling
3. Return via `formatMCPResponse({ success, data, metadata, recommendations?, nextSteps? })`
4. Store result as resource: `storeResourceFromToolResult(result, 'analysis', analysis.id)`

**Example** (see `src/tools/analyze-repository.ts`):

```typescript
const inputSchema = z.object({
  path: z.string(),
  depth: z.enum(["quick", "standard", "deep"]).optional(),
});
export async function analyzeRepository(
  args: unknown,
): Promise<MCPToolResponse> {
  const input = inputSchema.parse(args);
  // ... logic ...
  return formatMCPResponse({
    success: true,
    data: analysis,
    metadata: { toolVersion, executionTime, timestamp },
  });
}
```

### Knowledge Graph Memory (src/memory/)

- **Entities**: Project, User, Configuration, Technology, CodeFile, DocumentationSection (see `src/memory/schemas.ts`)
- **Relationships**: `project_uses_technology`, `project_deployed_with`, `similar_to`, `documents`, etc.
- **Storage**: `.documcp/memory/knowledge-graph-entities.jsonl` and `knowledge-graph-relationships.jsonl`
- **Integration**: Use `createOrUpdateProject()`, `getProjectContext()`, `trackDeployment()` from `src/memory/kg-integration.ts`

**analyze_repository enhancement**: Retrieves project history before analysis, shows previous analysis count, similar projects

## Development Workflows

### Essential Commands

```bash
npm run build              # Compile TypeScript → dist/
npm run dev               # Development watch mode with tsx
npm test                  # Run Jest test suite
npm run test:coverage     # Coverage report (80% threshold)
npm run build:inspect     # Launch MCP Inspector for interactive testing
npm run ci               # Full CI pipeline: typecheck + lint + test + build
make qa                  # Quality assurance: lint + types + test + coverage
```

### Testing Strategy

- **Location**: `tests/` mirroring `src/` structure
- **Coverage**: 80% global (branches/functions/lines), 60% for `recommend-ssg.ts` (complex logic)
- **Excluded**: Experimental memory features, `src/index.ts` entry point
- **Pattern**: Use `formatMCPResponse()` for consistent response validation
- **Integration**: Multi-tool workflow tests in `tests/integration/`

### MCP Inspector Workflow

1. `npm run build:inspect` opens browser at `http://localhost:5173`
2. Click "Connect" to attach to server
3. Test tools with custom parameters interactively
4. Verify resources/prompts without full integration

## Project-Specific Conventions

### ESM Module Requirements

- **ALL imports** must end with `.js` (even for `.ts` files): `import { foo } from './utils.js'`
- Use `import type` for type-only imports: `import type { MyType } from './types.js'`
- File URLs: `fileURLToPath(import.meta.url)` and `dirname()`

### Path & Permission Handling

- **Security**: Use `isPathAllowed(path, allowedRoots)` from `src/utils/permission-checker.ts` before file operations
- **Async FS**: Always use `fs.promises` API, never sync methods
- **Cross-platform**: Use `path` module for joining/resolving

### Git Integration

- Use `simple-git` library for repository operations
- Handle missing `.git` directories gracefully (check `hasGit` flag)
- Always validate repo state before analysis

### Diataxis Framework

Documentation structured as:

- **Tutorials**: Learning-oriented (getting started)
- **How-To Guides**: Problem-solving (specific tasks)
- **Reference**: Information-oriented (API docs)
- **Explanation**: Understanding-oriented (architecture, concepts)

Tools like `setup-structure` and `populate-content` enforce this structure.

## Critical Implementation Details

### Phase 3: AST-Based Code Analysis

- **AST Parser** (`src/utils/ast-analyzer.ts`): Multi-language support via Tree-sitter (TypeScript, Python, Go, Rust, Java, Ruby, Bash)
- **Drift Detection** (`src/utils/drift-detector.ts`): Snapshot-based comparison, categorizes changes (breaking/major/minor/patch)
- **Sync Tool** (`src/tools/sync-code-to-docs.ts`): Modes: detect/preview/apply/auto, confidence threshold (default 0.8)
- **Content Generator** (`src/tools/generate-contextual-content.ts`): Creates Diataxis-compliant docs from actual code structure

**Example drift detection**:

```typescript
// Detects function signature changes, new/removed classes, breaking changes
const drift = await detectDrift({ projectPath, docsPath, snapshotDir });
drift.affectedFiles.forEach((f) => console.log(f.driftType, f.severity));
```

### Error Handling Pattern

```typescript
try {
  // tool logic
  return formatMCPResponse({ success: true, data: result, metadata });
} catch (error) {
  return formatMCPResponse({
    success: false,
    error: {
      code: "TOOL_ERROR",
      message: error.message,
      resolution: "Check inputs and try again",
    },
    metadata,
  });
}
```

### Adding New Tools Checklist

1. Create `src/tools/my-tool.ts` with Zod schema and logic
2. Export tool function returning `MCPToolResponse`
3. Add to `TOOLS` array in `src/index.ts` with name, description, inputSchema
4. Add handler in `CallToolRequestSchema` switch case
5. Store result: `storeResourceFromToolResult(result, 'type', id)`
6. Create tests: `tests/tools/my-tool.test.ts`
7. Run `npm run ci` to validate

## Key Integration Points

### Memory Query Patterns

```typescript
// Query similar projects by analysis results
const similar = await getSimilarProjects(analysisResult, limit);

// Get project insights with historical context
const insights = await getProjectInsights(projectPath);

// Export/import memory for backup
await exportMemories({ outputPath: "./backup.json" });
await importMemories({ inputPath: "./backup.json" });
```

### Resource Storage Pattern

```typescript
// Tools create resources for cross-tool reference
resourceStore.set(`documcp://analysis/${id}`, {
  uri: `documcp://analysis/${id}`,
  name: `Repository Analysis ${id}`,
  mimeType: "application/json",
  text: JSON.stringify(result, null, 2),
});
```

### ADR References

- **ADR-001**: TypeScript MCP SDK chosen over Python/Go for ecosystem maturity
- **ADR-002**: Multi-layered repository analysis (structure + dependencies + documentation)
- **ADR-003**: Algorithmic SSG recommendation with confidence scoring
- **ADR-006**: Consistent tool API design with Zod validation
- **ADR-010**: Resource pattern redesign for session-based storage

Full ADRs: `docs/adrs/`

## Common Pitfalls

- ❌ Forgetting `.js` extension in imports → Module resolution fails
- ❌ Using `formatMCPResponse()` incorrectly → Response validation errors
- ❌ Missing Zod schema validation → Runtime type errors
- ❌ Synchronous file operations → Blocking operations
- ❌ Not checking path permissions → Security vulnerabilities
- ❌ Returning raw objects instead of `MCPToolResponse` → Protocol violations

## Quick Reference

**Node.js**: ≥20.0.0 | **Module**: ESM | **Test Framework**: Jest (ts-jest) | **Storage**: `.documcp/memory/` (JSONL)  
**MCP Inspector**: `npm run build:inspect` | **Full test suite**: `npm run ci` | **Docs**: `docs/` (Docusaurus)
