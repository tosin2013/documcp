---
documcp:
  last_updated: "2025-11-20T00:46:21.950Z"
  last_validated: "2025-11-20T00:46:21.950Z"
  auto_updated: false
  update_frequency: monthly
---

# How to Track Documentation Freshness

This guide shows you how to use DocuMCP's documentation freshness tracking system to monitor and maintain up-to-date documentation.

## Quick Start

```bash
# Initialize freshness tracking:
"validate documentation freshness for my docs directory"

# Check freshness status:
"track documentation freshness"
```

## Overview

Documentation freshness tracking helps you:

- **Identify stale documentation**: Find files that haven't been updated recently
- **Maintain quality**: Ensure documentation stays current with code changes
- **Track history**: Monitor documentation updates over time via knowledge graph integration
- **Automate maintenance**: Set up workflows for regular freshness checks

## Initial Setup

### Step 1: Initialize Freshness Metadata

Before tracking freshness, you need to initialize metadata for your documentation files:

```json
{
  "docsPath": "/path/to/docs",
  "projectPath": "/path/to/project",
  "initializeMissing": true,
  "validateAgainstGit": true
}
```

This will:

- Create freshness metadata for all documentation files
- Set initial timestamps based on file modification dates
- Link metadata to git history (if available)

### Step 2: Verify Initialization

Check that metadata was created successfully:

```bash
# Track freshness to see initialized files:
"track documentation freshness for my docs"
```

You should see all files marked as "fresh" initially.

## Regular Freshness Checks

### Basic Tracking

Run regular freshness checks to monitor documentation staleness:

```json
{
  "docsPath": "/path/to/docs",
  "includeFileList": true
}
```

### Using Presets

DocuMCP provides convenient presets for different update frequencies:

- **realtime**: For documentation that changes frequently (minutes/hours)
- **active**: For actively maintained docs (days)
- **recent**: For recently updated docs (weeks)
- **weekly**: For weekly review cycles
- **monthly**: For monthly maintenance (default)
- **quarterly**: For quarterly reviews

```json
{
  "docsPath": "/path/to/docs",
  "preset": "monthly"
}
```

### Custom Thresholds

Define your own staleness thresholds:

```json
{
  "docsPath": "/path/to/docs",
  "warningThreshold": {
    "value": 7,
    "unit": "days"
  },
  "staleThreshold": {
    "value": 30,
    "unit": "days"
  },
  "criticalThreshold": {
    "value": 90,
    "unit": "days"
  }
}
```

## Understanding Freshness Levels

### Fresh ✅

Files updated within the warning threshold (default: 7 days)

### Warning 🟡

Files older than warning threshold but newer than stale threshold (7-30 days)

### Stale 🟠

Files older than stale threshold but newer than critical threshold (30-90 days)

### Critical 🔴

Files older than critical threshold (90+ days)

### Unknown ❓

Files without freshness metadata (need initialization)

## Workflow Examples

### Weekly Documentation Review

```bash
# 1. Check freshness status
"track documentation freshness with preset weekly"

# 2. Review stale files and update as needed
# (manually update documentation)

# 3. Validate freshness after updates
"validate documentation freshness and update existing metadata"
```

### After Major Code Changes

```bash
# 1. Update documentation to reflect code changes
# (manually update files)

# 2. Validate freshness against git
"validate documentation freshness with git validation"

# 3. Track updated status
"track documentation freshness"
```

### Automated CI/CD Integration

Add freshness checks to your CI/CD pipeline:

```yaml
# .github/workflows/docs-freshness.yml
- name: Check Documentation Freshness
  run: |
    documcp track_documentation_freshness \
      --docsPath ./docs \
      --preset monthly \
      --failOnStale true
```

## Advanced Usage

### Knowledge Graph Integration

Freshness tracking events are automatically stored in the knowledge graph:

```json
{
  "docsPath": "/path/to/docs",
  "projectPath": "/path/to/project",
  "storeInKG": true
}
```

This enables:

- Historical analysis of documentation updates
- Pattern recognition across projects
- Intelligent recommendations based on past behavior

### Sorting and Filtering

Customize how files are displayed:

```json
{
  "docsPath": "/path/to/docs",
  "sortBy": "staleness", // Options: "age", "path", "staleness"
  "includeFileList": true
}
```

### Git Integration

Validate freshness against git history:

```json
{
  "docsPath": "/path/to/docs",
  "projectPath": "/path/to/project",
  "validateAgainstGit": true
}
```

This compares file modification times with git commit history for more accurate staleness detection.

## Best Practices

### 1. Initialize Early

Set up freshness tracking when you first create documentation:

```bash
"initialize freshness tracking for my new documentation"
```

### 2. Regular Checks

Schedule regular freshness checks:

- Weekly for active projects
- Monthly for stable projects
- Quarterly for archived documentation

### 3. Update Thresholds

Adjust thresholds based on your project's update frequency:

- Active projects: 7/30/90 days
- Stable projects: 30/90/180 days
- Archived docs: 90/180/365 days

### 4. Integrate with Workflows

Combine freshness tracking with other DocuMCP tools:

```bash
# Check freshness → Update stale docs → Validate → Deploy
"track documentation freshness, then update stale files, validate, and deploy"
```

### 5. Monitor Trends

Use knowledge graph insights to identify patterns:

```bash
# Get freshness insights from knowledge graph
"get insights about documentation freshness trends"
```

## Troubleshooting

### Problem: All files show as "unknown"

**Solution**: Run `validate_documentation_freshness` with `initializeMissing: true`

### Problem: Freshness not updating after file changes

**Solution**: Run `validate_documentation_freshness` with `updateExisting: true`

### Problem: Git validation failing

**Solution**: Ensure `projectPath` points to git repository root and git is initialized

### Problem: Thresholds not working as expected

**Solution**: Check that threshold values are positive numbers and units match your needs

## Integration with Other Tools

### With Sitemap Management

```bash
# Track freshness → Generate sitemap → Deploy
"track documentation freshness, then generate sitemap and deploy"
```

### With Content Validation

```bash
# Validate freshness → Validate content → Check links
"validate documentation freshness, then validate content and check links"
```

### With Gap Detection

```bash
# Detect gaps → Track freshness → Update documentation
"detect documentation gaps, track freshness, and update stale files"
```

## Next Steps

- [Site Monitoring](site-monitoring.md) - Monitor your documentation site health
- [SEO Optimization](seo-optimization.md) - Improve search engine visibility
- [Performance Optimization](performance-optimization.md) - Optimize documentation performance
- [MCP Tools Reference](../reference/mcp-tools.md#documentation-freshness-tracking-tools) - Complete API reference
