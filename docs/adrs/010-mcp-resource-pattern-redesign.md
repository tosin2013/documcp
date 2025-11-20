---
documcp:
  last_updated: "2025-11-20T00:46:21.944Z"
  last_validated: "2025-11-20T00:46:21.944Z"
  auto_updated: false
  update_frequency: monthly
---

# ADR-010: MCP Resource Pattern Redesign

**Status:** Accepted
**Date:** 2025-10-09
**Deciders:** Development Team
**Context:** MCP Best Practices Review

---

## Context and Problem Statement

During an MCP best practices review (2025-10-09), a critical architectural misalignment was identified: DocuMCP was using MCP resources as a **persistence layer** to store tool execution results, violating the fundamental MCP control pattern philosophy.

**The Problem:**

- Resources were storing tool outputs via `storeResourceFromToolResult()`
- A `resourceStore` Map held dynamic tool results
- Resource URIs were generated at runtime (e.g., `documcp://analysis/{timestamp}-{random}`)
- This violated MCP's core principle that resources should **serve applications**, not store tool results

**Why This Matters:**
According to MCP best practices, the three primitives have distinct control patterns:

- **Tools** = Model-controlled (Claude decides when to execute) → Serve the **model**
- **Resources** = App-controlled (application decides when to fetch) → Serve the **app**
- **Prompts** = User-controlled (user triggers via actions) → Serve **users**

Using resources for tool result storage conflates model operations with app operations, creating architectural confusion and misusing the MCP protocol.

---

## Decision Drivers

### Technical Requirements

- Align with MCP specification and best practices
- Follow proper control pattern separation
- Maintain backward compatibility where possible
- Preserve existing tool functionality

### Architectural Principles

- **Separation of Concerns:** Tools handle execution, resources provide app data
- **Statelessness:** MCP servers should be stateless; persistence belongs elsewhere
- **Clear Purpose:** Each primitive serves its intended audience

### Developer Experience

- Simplify resource implementation
- Make resource purpose obvious
- Enable proper MCP Inspector testing

---

## Considered Options

### Option 1: Keep Current Pattern (Status Quo) ❌

**Description:** Continue using resources to store tool results.

**Pros:**

- No code changes required
- Existing URIs remain functional
- No migration needed

**Cons:**

- ❌ Violates MCP best practices
- ❌ Confuses model operations with app operations
- ❌ Makes MCP Inspector testing unclear
- ❌ Creates unnecessary complexity
- ❌ Misrepresents resource purpose

**Decision:** Rejected due to architectural misalignment

---

### Option 2: Remove All Resources ❌

**Description:** Eliminate resources entirely, return all data via tools only.

**Pros:**

- Simplifies implementation
- Eliminates resource confusion
- Focuses on tools as primary interface

**Cons:**

- ❌ Removes legitimate use cases for app-controlled data
- ❌ Loses template access for UI
- ❌ Prevents SSG list for dropdowns
- ❌ Underutilizes MCP capabilities

**Decision:** Rejected - throws baby out with bathwater

---

### Option 3: Redesign Resources for App Needs ✅ (CHOSEN)

**Description:** Remove tool result storage, create static resources that serve application UI needs.

**Pros:**

- ✅ Aligns with MCP best practices
- ✅ Clear separation: tools execute, resources provide app data
- ✅ Enables proper MCP Inspector testing
- ✅ Provides legitimate value to applications
- ✅ Follows control pattern philosophy

**Cons:**

- Requires code refactoring
- Changes resource URIs (but tools remain compatible)

**Decision:** **ACCEPTED** - Best aligns with MCP architecture

---

## Decision Outcome

**Chosen Option:** Option 3 - Redesign Resources for App Needs

### Implementation Details

#### 1. Remove Tool Result Storage

**Before:**

```typescript
const resourceStore = new Map<string, { content: string; mimeType: string }>();

function storeResourceFromToolResult(
  toolName: string,
  args: any,
  result: any,
  id?: string,
): string {
  const uri = `documcp://analysis/${id}`;
  resourceStore.set(uri, {
    content: JSON.stringify(result),
    mimeType: "application/json",
  });
  return uri;
}

// In tool handler:
const result = await analyzeRepository(args);
const resourceUri = storeResourceFromToolResult(
  "analyze_repository",
  args,
  result,
);
(result as any).resourceUri = resourceUri;
return result;
```

**After:**

```typescript
// No resource storage! Tools return results directly
const result = await analyzeRepository(args);
return wrapToolResult(result, "analyze_repository");
```

#### 2. Create Static App-Serving Resources

**New Resource Categories:**

**A. SSG List Resource** (for UI dropdowns)

```typescript
{
  uri: "documcp://ssgs/available",
  name: "Available Static Site Generators",
  description: "List of supported SSGs with capabilities for UI selection",
  mimeType: "application/json"
}
```

Returns:

```json
{
  "ssgs": [
    {
      "id": "jekyll",
      "name": "Jekyll",
      "description": "Ruby-based SSG, great for GitHub Pages",
      "language": "ruby",
      "complexity": "low",
      "buildSpeed": "medium",
      "ecosystem": "mature",
      "bestFor": ["blogs", "documentation", "simple-sites"]
    }
    // ... 4 more SSGs
  ]
}
```

**B. Configuration Templates** (for SSG setup)

```typescript
{
  uri: "documcp://templates/jekyll-config",
  name: "Jekyll Configuration Template",
  description: "Template for Jekyll _config.yml",
  mimeType: "text/yaml"
}
```

Returns actual YAML template for Jekyll configuration.

**C. Workflow Resources** (for UI workflow display)

```typescript
{
  uri: "documcp://workflows/all",
  name: "All Documentation Workflows",
  description: "Complete list of available documentation workflows",
  mimeType: "application/json"
}
```

#### 3. Resource Handler Implementation

```typescript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Handle SSG list (for UI)
  if (uri === "documcp://ssgs/available") {
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify({ ssgs: [...] })
      }]
    };
  }

  // Handle templates (static content)
  if (uri.startsWith("documcp://templates/")) {
    const templateType = uri.split("/").pop();
    return {
      contents: [{
        uri,
        mimeType: getTemplateMimeType(templateType),
        text: getTemplateContent(templateType)
      }]
    };
  }

  throw new Error(`Resource not found: ${uri}`);
});
```

### Resource Design Principles

1. **Static Content Only:** Resources return pre-defined, static data
2. **App-Controlled:** Applications fetch resources when needed for UI
3. **Predictable URIs:** Fixed URIs (no timestamps or random IDs)
4. **Clear Purpose:** Each resource serves a specific app UI need

---

## Consequences

### Positive Consequences ✅

1. **Architectural Alignment**

   - Resources now properly serve applications
   - Clear separation between tools and resources
   - Follows MCP control pattern philosophy

2. **Improved Developer Experience**

   - Resource purpose is obvious
   - MCP Inspector testing is clear
   - No confusion about resource lifecycle

3. **Better Testability**

   - Resources return predictable content
   - Can test resources independently
   - MCP Inspector works correctly

4. **Simplified Implementation**

   - Removed `resourceStore` Map
   - Removed `storeResourceFromToolResult()` function
   - Removed 50+ lines of resource storage code
   - Tools are simpler (no resource URI tracking)

5. **Legitimate App Value**
   - SSG list enables UI dropdowns
   - Templates provide boilerplate content
   - Workflows guide user actions

### Negative Consequences ⚠️

1. **Breaking Change for Resource URIs**

   - Old dynamic URIs (`documcp://analysis/{timestamp}`) no longer work
   - Applications relying on these URIs need updates
   - **Mitigation:** Tools return data directly; URIs were internal implementation detail

2. **No Tool Result Persistence**

   - Tool results are not stored between executions
   - Applications must handle result storage if needed
   - **Mitigation:** MCP servers should be stateless; persistence is app responsibility

3. **Migration Effort**
   - Required updating all tool handlers
   - Updated resource definitions
   - **Time Cost:** ~4 hours

---

## Implementation Results

### Code Changes

**Files Modified:**

- `src/index.ts` (main server file)
  - Removed `resourceStore` Map (10 lines)
  - Removed `storeResourceFromToolResult()` (50 lines)
  - Redesigned `RESOURCES` array (12 new resources)
  - Updated `ReadResourceRequestSchema` handler (150 lines)
  - Removed resource storage from all tools (30+ locations)

**Lines of Code:**

- **Removed:** ~120 lines (resource storage logic)
- **Added:** ~200 lines (static resource handlers)
- **Net Change:** +80 lines (but much clearer purpose)

### Test Results

**Before Implementation:**

- Tests: 122/122 passing ✅
- TypeScript: Compiles ✅

**After Implementation:**

- Tests: 122/122 passing ✅
- TypeScript: Compiles ✅
- No broken tests
- No regression issues

### Performance Impact

**Before:**

- Resource storage: O(1) Map insertion per tool
- Memory: Growing Map of all tool results

**After:**

- Resource retrieval: O(1) static content lookup
- Memory: Fixed size (no growth)

**Improvement:** Reduced memory usage, no performance degradation

---

## Compliance with MCP Best Practices

### Before Redesign

- **Resource Implementation:** 3/10 ❌
- **Control Patterns:** 4/10 ❌

### After Redesign

- **Resource Implementation:** 9/10 ✅
- **Control Patterns:** 9/10 ✅

---

## Migration Guide

### For Client Applications

**Old Pattern (No Longer Works):**

```javascript
// Execute tool
const result = await callTool("analyze_repository", { path: "./" });

// WRONG: Try to fetch from resource URI
const resourceUri = result.resourceUri;
const resource = await readResource(resourceUri); // ❌ Will fail
```

**New Pattern (Recommended):**

```javascript
// Execute tool - result contains all data
const result = await callTool("analyze_repository", { path: "./" });

// Use result directly (no need for resources)
console.log(result.data); // ✅ All data is here

// Use resources for app UI needs
const ssgList = await readResource("documcp://ssgs/available"); // ✅ For dropdowns
const template = await readResource("documcp://templates/jekyll-config"); // ✅ For setup
```

### For Tool Developers

**Old Pattern:**

```typescript
const result = await analyzeRepository(args);
const resourceUri = storeResourceFromToolResult(
  "analyze_repository",
  args,
  result,
);
(result as any).resourceUri = resourceUri;
return result;
```

**New Pattern:**

```typescript
const result = await analyzeRepository(args);
return wrapToolResult(result, "analyze_repository"); // Standardized wrapper
```

---

## References

- **MCP Specification:** https://modelcontextprotocol.io/docs
- **MCP Best Practices Review:** `MCP_BEST_PRACTICES_REVIEW.md`
- **MCP Inspector Guide:** `docs/development/MCP_INSPECTOR_TESTING.md`
- **Related ADRs:**
  - ADR-006: MCP Tools API Design
  - ADR-007: MCP Prompts and Resources Integration

---

## Notes

### Design Philosophy

The resource redesign embodies a core MCP principle: **each primitive serves its audience**.

- **Tools** answer the question: _"What can Claude do?"_
- **Resources** answer the question: _"What data does my app need?"_
- **Prompts** answer the question: _"What workflows can users trigger?"_

Mixing these purposes creates architectural debt and violates separation of concerns.

### Future Enhancements

**Potential Additional Resources:**

- `documcp://themes/available` - UI theme list
- `documcp://validators/rules` - Validation rule catalog
- `documcp://examples/{category}` - Example content library

These should all follow the same principle: **serve the application's UI needs**, not store execution results.

---

**Last Updated:** 2025-10-09
**Status:** Implemented and Verified ✅
