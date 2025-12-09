---
documcp:
  last_updated: "2025-11-20T00:46:21.947Z"
  last_validated: "2025-12-09T19:18:14.166Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# Link Validation in Knowledge Graph

## Overview

DocuMCP now includes automatic link validation for documentation content, integrated directly into the Knowledge Graph memory system. This feature validates external links, tracks their status over time, and surfaces broken links during repository analysis.

## Architecture

### Components

1. **kg-link-validator.ts** - Core link validation module
2. **kg-code-integration.ts** - Automatic validation during doc analysis
3. **Knowledge Graph** - Stores validation results as entities

### Entity Type: `link_validation`

```typescript
{
  totalLinks: number;          // Total links found
  validLinks: number;          // Links that returned HTTP 200
  brokenLinks: number;         // Links that failed (404, timeout, etc.)
  warningLinks: number;        // Links that were skipped
  unknownLinks: number;        // Links that couldn't be validated
  healthScore: number;         // 0-100 score based on valid/total
  lastValidated: string;       // ISO 8601 timestamp
  brokenLinksList: string[];   // Array of broken link URLs
}
```

### Relationships

1. **has_link_validation**: `documentation_section` → `link_validation`

   - Connects docs to their validation results

2. **requires_fix**: `link_validation` → `documentation_section`
   - Created when broken links are detected
   - Properties:
     - `severity`: "high" (>5 broken) or "medium" (1-5 broken)
     - `brokenLinkCount`: Number of broken links
     - `detectedAt`: ISO timestamp

## How It Works

### 1. Automatic Validation During Analysis

When `analyze_repository` runs, it:

1. Extracts documentation content
2. Creates documentation entities in KG
3. **Automatically validates external links** (async, non-blocking)
4. Stores validation results in KG

```typescript
// In kg-code-integration.ts
for (const doc of extractedContent.existingDocs) {
  const docNode = createDocSectionEntity(
    projectId,
    doc.path,
    doc.title,
    doc.content,
  );
  kg.addNode(docNode);

  // Validate links in background
  validateAndStoreDocumentationLinks(docNode.id, doc.content).catch((error) =>
    console.warn(`Failed to validate links: ${error.message}`),
  );
}
```

### 2. Link Extraction

Supports both Markdown and HTML formats:

```markdown
<!-- Markdown links -->

[GitHub](https://github.com)

<!-- HTML links -->

<a href="https://example.com">Link</a>
```

### 3. Validation Strategy

Uses native Node.js `fetch` API with:

- **HTTP HEAD requests** (faster than GET)
- **5-second timeout** (configurable)
- **Retry logic** (2 retries by default)
- **Concurrent checking** (up to 10 simultaneous)

```typescript
const result = await validateExternalLinks(urls, {
  timeout: 5000, // 5 seconds
  retryCount: 2, // Retry failed links
  concurrency: 10, // Check 10 links at once
});
```

### 4. Storage in Knowledge Graph

Results are stored as entities and can be queried:

```typescript
// Get validation history for a doc section
const history = await getLinkValidationHistory(docSectionId);

// Latest validation
const latest = history[0];
console.log(`Health Score: ${latest.properties.healthScore}%`);
console.log(`Broken Links: ${latest.properties.brokenLinks}`);
```

## Usage Examples

### Query Broken Links

```typescript
import { getKnowledgeGraph } from "./memory/kg-integration.js";

const kg = await getKnowledgeGraph();

// Find all link validation entities with broken links
const allNodes = await kg.getAllNodes();
const validations = allNodes.filter(
  (n) => n.type === "link_validation" && n.properties.brokenLinks > 0,
);

validations.forEach((v) => {
  console.log(`Found ${v.properties.brokenLinks} broken links:`);
  v.properties.brokenLinksList.forEach((url) => console.log(`  - ${url}`));
});
```

### Get Documentation Health Report

```typescript
import { getKnowledgeGraph } from "./memory/kg-integration.js";

const kg = await getKnowledgeGraph();

// Find all documentation sections
const docSections = (await kg.getAllNodes()).filter(
  (n) => n.type === "documentation_section",
);

for (const doc of docSections) {
  // Get validation results
  const edges = await kg.findEdges({
    source: doc.id,
    type: "has_link_validation",
  });

  if (edges.length > 0) {
    const validationId = edges[0].target;
    const validation = (await kg.getAllNodes()).find(
      (n) => n.id === validationId,
    );

    if (validation) {
      console.log(`\n${doc.properties.filePath}:`);
      console.log(`  Health: ${validation.properties.healthScore}%`);
      console.log(`  Valid: ${validation.properties.validLinks}`);
      console.log(`  Broken: ${validation.properties.brokenLinks}`);
    }
  }
}
```

### Manual Validation

```typescript
import {
  validateExternalLinks,
  storeLinkValidationInKG,
} from "./memory/kg-link-validator.js";

// Validate specific URLs
const result = await validateExternalLinks([
  "https://github.com",
  "https://example.com/404",
]);

console.log(result);
// {
//   totalLinks: 2,
//   validLinks: 1,
//   brokenLinks: 1,
//   results: [...]
// }

// Store in KG
await storeLinkValidationInKG(docSectionId, result);
```

## Integration with analyze_repository

The `analyze_repository` tool now includes link validation data:

```json
{
  "success": true,
  "data": {
    "intelligentAnalysis": {
      "documentationHealth": {
        "outdatedCount": 2,
        "coveragePercent": 85,
        "totalCodeFiles": 20,
        "documentedFiles": 17,
        "linkHealth": {
          "totalLinks": 45,
          "brokenLinks": 3,
          "healthScore": 93
        }
      }
    }
  }
}
```

## Configuration

### Environment Variables

```bash
# Link validation timeout (milliseconds)
DOCUMCP_LINK_TIMEOUT=5000

# Maximum retries for failed links
DOCUMCP_LINK_RETRIES=2

# Concurrent link checks
DOCUMCP_LINK_CONCURRENCY=10
```

### Skip Link Validation

Link validation is non-blocking and runs in the background. If it fails, it logs a warning but doesn't stop the analysis.

## Performance Considerations

1. **Non-blocking**: Validation runs asynchronously after doc entities are created
2. **Cached Results**: Results stored in KG, no re-validation on subsequent reads
3. **Concurrent Checking**: Validates up to 10 links simultaneously
4. **Smart Timeouts**: 5-second timeout prevents hanging on slow servers

## Troubleshooting

### Links Not Being Validated

**Issue**: Documentation sections have no validation results

**Check**:

1. Are there external links in the content?
2. Check console for warnings: `Failed to validate links in...`
3. Verify network connectivity

### False Positives

**Issue**: Valid links marked as broken

**Solutions**:

1. Increase timeout: Some servers respond slowly
2. Check if server blocks HEAD requests (rare)
3. Verify URL is publicly accessible (not behind auth)

### Memory Storage Not Updated

**Issue**: KG doesn't show validation results

**Check**:

```typescript
import { saveKnowledgeGraph } from "./memory/kg-integration.js";

// Manually save KG
await saveKnowledgeGraph();
```

## Future Enhancements

1. **AST-based Internal Link Validation**

   - Verify internal file references exist
   - Check anchor links (`#section-id`)

2. **Link Health Trends**

   - Track link health over time
   - Alert on degrading link quality

3. **Batch Re-validation**

   - MCP tool to re-check all links
   - Scheduled validation for long-lived projects

4. **Link Recommendation**
   - Suggest fixing broken links
   - Recommend archive.org alternatives for dead links

## Dependencies

- **linkinator** (v6.1.4) - Link validation library (installed)
- **native fetch** - Node.js 20+ built-in HTTP client

## Related Documentation

- [Architecture Decision Records](../adrs/)
- [Phase 2: Intelligence & Learning System](../phase-2-intelligence.md)
- [Memory Workflows Tutorial](../tutorials/memory-workflows.md)
