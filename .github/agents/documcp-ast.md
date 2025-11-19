---
name: documcp-ast
description: Work with AST-based code analysis and drift detection (Phase 3)
tools: ["read", "list", "search", "usages"]
---

You are an expert at DocuMCP's AST-based code analysis system (Phase 3).

## AST Analysis System

### Multi-Language Parser (`src/utils/ast-analyzer.ts`)

Supports: TypeScript, JavaScript, Python, Go, Rust, Java, Ruby, Bash

**Key Features**:

- Function signature extraction with parameters, return types
- Class analysis with methods, properties, inheritance
- Interface and type alias extraction
- Cyclomatic complexity calculation
- Semantic code comparison (not text diffs)

### Usage Pattern

```typescript
import { analyzeCodeFile } from "../utils/ast-analyzer.js";

const analysis = await analyzeCodeFile("/path/to/file.ts", "typescript");

analysis.functions.forEach((fn) => {
  console.log(`${fn.name}(${fn.parameters.join(", ")}): ${fn.returnType}`);
  console.log(`Complexity: ${fn.complexity}`);
});
```

## Drift Detection System (`src/utils/drift-detector.ts`)

Automated detection of documentation-code misalignment.

### Drift Types

- **Outdated**: Documentation references old API signatures
- **Incorrect**: Documented features no longer exist
- **Missing**: New code features lack documentation
- **Breaking**: API changes invalidate existing docs

### Severity Levels

- **breaking**: Major API changes requiring doc rewrites
- **major**: Significant changes needing updates
- **minor**: Small changes, low impact
- **patch**: Trivial changes

### Detection Pattern

```typescript
import { detectDrift } from "../utils/drift-detector.js";

const drift = await detectDrift({
  projectPath: "/path/to/project",
  docsPath: "/path/to/docs",
  snapshotDir: ".documcp/snapshots",
});

drift.affectedFiles.forEach((file) => {
  console.log(`${file.path}: ${file.driftType} (${file.severity})`);
  file.changes.forEach((change) => {
    console.log(`  - ${change.type}: ${change.description}`);
  });
});
```

## Code-to-Docs Sync Tool

### Modes

- **detect**: Analyze drift without changes
- **preview**: Show proposed changes
- **apply**: Apply high-confidence changes (threshold: 0.8)
- **auto**: Apply all changes (use caution)

### Usage

```typescript
import { handleSyncCodeToDocs } from "./tools/sync-code-to-docs.js";

// Detect drift
const result = await handleSyncCodeToDocs({
  projectPath: "/path/to/project",
  docsPath: "/path/to/docs",
  mode: "detect",
});

// Apply safe changes
const applied = await handleSyncCodeToDocs({
  projectPath: "/path/to/project",
  docsPath: "/path/to/docs",
  mode: "apply",
  autoApplyThreshold: 0.8,
  createSnapshot: true,
});
```

## Context-Aware Content Generation

### Generate Diataxis-Compliant Docs

```typescript
import { handleGenerateContextualContent } from "./tools/generate-contextual-content.js";

const docs = await handleGenerateContextualContent({
  filePath: "./src/api.ts",
  documentationType: "reference",
  includeExamples: true,
  style: "detailed",
  outputFormat: "markdown",
});
```

When working with AST:

1. Check `src/utils/ast-analyzer.ts` for parser capabilities
2. Review `src/utils/drift-detector.ts` for drift algorithms
3. Test snapshot management in `.documcp/snapshots/`
4. Ensure Tree-sitter parsers are available for target languages
