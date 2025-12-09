---
documcp:
  last_updated: "2025-11-20T00:46:21.955Z"
  last_validated: "2025-12-09T19:41:38.586Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# How to Manage Documentation SEO

This guide shows you how to use DocuMCP's sitemap management tools to improve your documentation's search engine visibility.

## Quick Setup

```bash
# Generate sitemap for your documentation:
"generate sitemap for my documentation"
```

## SEO Overview

DocuMCP provides basic SEO support through sitemap management:

### Available SEO Features

- **XML Sitemap Generation**: Automatic sitemap creation for documentation
- **Sitemap Validation**: Verify sitemap structure and URLs
- **Link Discovery**: Automatic detection of documentation pages
- **GitHub Pages Integration**: Optimized for GitHub Pages deployment

### SEO Benefits

- **Search Engine Discovery**: Help search engines find your documentation
- **Crawling Efficiency**: Provide structured navigation for crawlers
- **URL Organization**: Maintain clean URL structure
- **Update Tracking**: Track when pages were last modified

## Setup Methods

### Method 1: Automatic Sitemap Generation

```bash
# Generate sitemap for your documentation:
"generate sitemap for my documentation"
```

This will:

1. Scan your documentation directory
2. Discover all markdown and HTML files
3. Generate XML sitemap with proper URLs
4. Include last modified dates from git history
5. Validate sitemap structure

### Method 2: Manual Sitemap Management

#### Step 1: Generate Sitemap

```bash
# Create XML sitemap:
"create sitemap for my documentation with base URL https://mydocs.com"
```

#### Step 2: Validate Sitemap

```bash
# Validate existing sitemap:
"validate my documentation sitemap"
```

#### Step 3: Update Sitemap

```bash
# Update sitemap with new content:
"update my documentation sitemap"
```

## Sitemap Management

### Using MCP Tools

```typescript
// Generate sitemap using MCP tools
import { manageSitemap } from "./dist/tools/manage-sitemap.js";

// Generate new sitemap
const sitemap = await manageSitemap({
  action: "generate",
  docsPath: "./docs",
  baseUrl: "https://mydocs.github.io/repo",
});

// Validate existing sitemap
const validation = await manageSitemap({
  action: "validate",
  docsPath: "./docs",
});

// Update sitemap with new content
const update = await manageSitemap({
  action: "update",
  docsPath: "./docs",
  baseUrl: "https://mydocs.github.io/repo",
});
```

### Sitemap Configuration

```yaml
# Sitemap generation settings
sitemap:
  base_url: "https://mydocs.github.io/repo"
  include_patterns:
    - "**/*.md"
    - "**/*.html"
  exclude_patterns:
    - "node_modules/**"
    - ".git/**"
  update_frequency: "weekly"
  use_git_history: true
```

## Best Practices

### Sitemap Management

1. **Regular Updates**: Regenerate sitemap when adding new content
2. **Proper URLs**: Ensure all URLs in sitemap are accessible
3. **Git Integration**: Use git history for accurate last modified dates
4. **Validation**: Always validate sitemap after generation
5. **Submit to Search Engines**: Submit sitemap to Google Search Console

### URL Structure

- Use clean, descriptive URLs
- Maintain consistent URL patterns
- Avoid deep nesting when possible
- Include keywords in URLs naturally

### Content Organization

- Structure content logically
- Use clear headings and navigation
- Maintain consistent documentation patterns
- Link related content appropriately

## Troubleshooting

### Common Issues

**Problem**: Sitemap not generating
**Solution**: Check documentation directory permissions and file patterns

**Problem**: Invalid URLs in sitemap
**Solution**: Verify base URL configuration and file paths

**Problem**: Sitemap not updating
**Solution**: Ensure git history is accessible for last modified dates

**Problem**: Search engines not finding pages
**Solution**: Submit sitemap to Google Search Console and verify accessibility

### Sitemap Debugging

```bash
# Debug sitemap issues:
"validate my sitemap and check for errors"
```

## Sitemap Tools

### Built-in DocuMCP Tools

- **Sitemap Generation**: Create XML sitemaps automatically
- **Sitemap Validation**: Verify sitemap structure and URLs
- **Link Discovery**: Find all documentation pages
- **Git Integration**: Use git history for modification dates

### MCP Tools Available

- `manage_sitemap`: Generate, validate, and update sitemaps
- `check_documentation_links`: Verify all links work correctly
- `validate_content`: Check documentation accuracy

## Next Steps

- [Deploy Pages](../reference/mcp-tools.md#deploy_pages)
- [Site Monitoring](site-monitoring.md)
- [Custom Domains](custom-domains.md)
- [Troubleshooting](troubleshooting.md)
