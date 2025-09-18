# MCP Tools API Reference

DocuMCP provides a comprehensive set of tools via the Model Context Protocol (MCP). These tools enable intelligent documentation deployment through repository analysis, SSG recommendations, and automated GitHub Pages setup.

## Core Documentation Tools

### analyze_repository

**Description**: Analyze repository structure, dependencies, and documentation needs

**Parameters**:

- `path` (string, required): Path to the repository to analyze
- `depth` (enum, optional): Analysis depth level
  - `"quick"`: Fast overview focusing on basic structure
  - `"standard"`: Comprehensive analysis (default)
  - `"deep"`: Detailed analysis with advanced insights

**Returns**: Analysis object containing:

- `id`: Unique analysis identifier for use in other tools
- `timestamp`: Analysis execution time
- `structure`: File counts, languages, and project features
- `dependencies`: Package ecosystem and dependency analysis
- `documentation`: Existing documentation assessment
- `recommendations`: Project classification and team size estimates

**Example**:

```json
{
  "path": "/path/to/repository",
  "depth": "standard"
}
```

### recommend_ssg

**Description**: Recommend the best static site generator based on project analysis

**Parameters**:

- `analysisId` (string, required): ID from previous repository analysis
- `preferences` (object, optional):
  - `priority`: `"simplicity"`, `"features"`, or `"performance"`
  - `ecosystem`: `"javascript"`, `"python"`, `"ruby"`, `"go"`, or `"any"`

**Returns**: Recommendation object with weighted scoring and justifications

**Example**:

```json
{
  "analysisId": "analysis_abc123",
  "preferences": {
    "priority": "simplicity",
    "ecosystem": "javascript"
  }
}
```

### generate_config

**Description**: Generate configuration files for the selected static site generator

**Parameters**:

- `ssg` (enum, required): `"jekyll"`, `"hugo"`, `"docusaurus"`, `"mkdocs"`, or `"eleventy"`
- `projectName` (string, required): Name of the project
- `projectDescription` (string, optional): Brief description
- `outputPath` (string, required): Where to generate config files

**Returns**: Generated configuration files and setup instructions

**Example**:

```json
{
  "ssg": "hugo",
  "projectName": "My Documentation Site",
  "outputPath": "./docs"
}
```

### setup_structure

**Description**: Create Diataxis-compliant documentation structure

**Parameters**:

- `path` (string, required): Root path for documentation
- `ssg` (enum, required): Static site generator type
- `includeExamples` (boolean, optional, default: true): Include example content

**Returns**: Created directory structure following Diataxis framework:

- **tutorials/**: Learning-oriented guides
- **how-to/**: Problem-oriented step-by-step guides
- **reference/**: Information-oriented technical reference
- **explanation/**: Understanding-oriented background material

**Example**:

```json
{
  "path": "./docs",
  "ssg": "mkdocs",
  "includeExamples": true
}
```

### deploy_pages

**Description**: Set up GitHub Pages deployment workflow

**Parameters**:

- `repository` (string, required): Repository path or URL
- `ssg` (enum, required): Static site generator type
- `branch` (string, optional, default: "gh-pages"): Deployment branch
- `customDomain` (string, optional): Custom domain name

**Returns**: GitHub Actions workflow files for automated deployment

**Example**:

```json
{
  "repository": "username/repository",
  "ssg": "docusaurus",
  "customDomain": "docs.example.com"
}
```

### verify_deployment

**Description**: Verify and troubleshoot GitHub Pages deployment

**Parameters**:

- `repository` (string, required): Repository path or URL
- `url` (string, optional): Expected deployment URL

**Returns**: Deployment status and troubleshooting recommendations

**Example**:

```json
{
  "repository": "username/repository",
  "url": "https://username.github.io/repository"
}
```

## Content Management Tools

### populate_diataxis_content

**Description**: Intelligently populate Diataxis documentation with project-specific content

**Parameters**:

- `analysisId` (string, required): Repository analysis ID
- `docsPath` (string, required): Path to documentation directory
- `populationLevel` (enum, optional, default: "comprehensive"): Content generation level
- `includeProjectSpecific` (boolean, optional, default: true): Include project-specific content
- `preserveExisting` (boolean, optional, default: true): Preserve existing content
- `technologyFocus` (array of strings, optional): Specific technologies to emphasize

**Returns**: Populated content metrics and file creation summary

### update_existing_documentation

**Description**: Intelligently analyze and update existing documentation using memory insights

**Parameters**:

- `analysisId` (string, required): Repository analysis ID
- `docsPath` (string, required): Path to existing documentation directory
- `compareMode` (enum, optional, default: "comprehensive"): Comparison mode
- `updateStrategy` (enum, optional, default: "moderate"): Update aggressiveness
- `preserveStyle` (boolean, optional, default: true): Preserve existing style
- `focusAreas` (array of strings, optional): Specific areas to focus on

**Returns**: Update recommendations and gap analysis

### detect_documentation_gaps

**Description**: Analyze repository and existing documentation to identify missing content

**Parameters**:

- `repositoryPath` (string, required): Path to the repository
- `documentationPath` (string, optional): Path to existing documentation
- `analysisId` (string, optional): Optional existing analysis ID to reuse
- `depth` (enum, optional, default: "standard"): Analysis depth

**Returns**: Identified gaps and recommendations for improvement

## Validation Tools

### validate_diataxis_content

**Description**: Validate the accuracy, completeness, and compliance of generated Diataxis documentation

**Parameters**:

- `contentPath` (string, required): Path to documentation directory to validate
- `analysisId` (string, optional): Repository analysis ID for context
- `validationType` (enum, optional, default: "all"): Type of validation
- `includeCodeValidation` (boolean, optional, default: true): Validate code examples
- `confidence` (enum, optional, default: "moderate"): Validation confidence level

**Returns**: Validation results with issues, recommendations, and confidence scores

### validate_content

**Description**: Validate general content quality including links and code syntax

**Parameters**:

- `contentPath` (string, required): Path to content directory
- `validationType` (string, optional, default: "all"): Validation type
- `includeCodeValidation` (boolean, optional, default: true): Validate code blocks
- `followExternalLinks` (boolean, optional, default: false): Check external URLs

**Returns**: Content validation results with broken links and code errors

### check_documentation_links

**Description**: Comprehensive link checking for documentation deployment

**Parameters**:

- `documentation_path` (string, optional, default: "./docs"): Documentation directory
- `check_external_links` (boolean, optional, default: true): Validate external URLs
- `check_internal_links` (boolean, optional, default: true): Validate internal references
- `check_anchor_links` (boolean, optional, default: true): Validate anchor links
- `timeout_ms` (number, optional, default: 5000): Request timeout
- `max_concurrent_checks` (number, optional, default: 5): Concurrent check limit

**Returns**: Comprehensive link validation report

## Testing and Deployment Tools

### test_local_deployment

**Description**: Test documentation build and local server before deploying to GitHub Pages

**Parameters**:

- `repositoryPath` (string, required): Path to the repository
- `ssg` (enum, required): Static site generator type
- `port` (number, optional, default: 3000): Local server port
- `timeout` (number, optional, default: 60): Build timeout in seconds
- `skipBuild` (boolean, optional, default: false): Skip build step

**Returns**: Local testing results and server status

## README Management Tools

### evaluate_readme_health

**Description**: Evaluate README files for community health and onboarding effectiveness

**Parameters**:

- `readme_path` (string, required): Path to README file
- `project_type` (enum, optional, default: "community_library"): Project type
- `repository_path` (string, optional): Repository path for context

**Returns**: Health evaluation with scores and recommendations

### readme_best_practices

**Description**: Analyze README files against best practices checklist

**Parameters**:

- `readme_path` (string, required): Path to README file
- `project_type` (enum, optional, default: "library"): Project type
- `generate_template` (boolean, optional, default: false): Generate templates
- `target_audience` (enum, optional, default: "mixed"): Target audience

**Returns**: Best practices analysis and improvement recommendations

### generate_readme_template

**Description**: Generate standardized README templates for different project types

**Parameters**:

- `projectName` (string, required): Name of the project
- `description` (string, required): Brief project description
- `templateType` (enum, required): Project template type
- `author` (string, optional): Project author/organization
- `license` (string, optional, default: "MIT"): Project license
- `outputPath` (string, optional): Output file path

**Returns**: Generated README template content

### validate_readme_checklist

**Description**: Validate README files against community best practices checklist

**Parameters**:

- `readmePath` (string, required): Path to README file
- `projectPath` (string, optional): Project directory for context
- `strict` (boolean, optional, default: false): Use strict validation
- `outputFormat` (enum, optional, default: "console"): Output format

**Returns**: Validation report with detailed scoring

### analyze_readme

**Description**: Comprehensive README analysis with length assessment and optimization opportunities

**Parameters**:

- `project_path` (string, required): Path to project directory
- `target_audience` (enum, optional, default: "community_contributors"): Target audience
- `optimization_level` (enum, optional, default: "moderate"): Optimization level
- `max_length_target` (number, optional, default: 300): Target max length

**Returns**: README analysis with optimization recommendations

### optimize_readme

**Description**: Optimize README content by restructuring and condensing

**Parameters**:

- `readme_path` (string, required): Path to README file
- `strategy` (enum, optional, default: "community_focused"): Optimization strategy
- `max_length` (number, optional, default: 300): Target maximum length
- `include_tldr` (boolean, optional, default: true): Include TL;DR section
- `create_docs_directory` (boolean, optional, default: true): Create docs directory

**Returns**: Optimized README content and extracted documentation

## Memory System Tools

The memory system provides intelligent learning and pattern recognition across documentation projects.

### memory_recall

**Description**: Recall memories about a project or topic

**Parameters**:

- `query` (string, required): Search query or project ID
- `type` (enum, optional): Memory type to recall
- `limit` (number, optional, default: 10): Maximum results

### memory_insights

**Description**: Get insights and patterns from memory

**Parameters**:

- `projectId` (string, optional): Project ID to analyze
- `timeRange` (object, optional): Time range for analysis

### memory_similar

**Description**: Find similar projects from memory

**Parameters**:

- `analysisId` (string, required): Analysis ID to find similar projects for
- `limit` (number, optional, default: 5): Maximum similar projects

### memory_export

**Description**: Export memories to JSON or CSV

**Parameters**:

- `filter` (object, optional): Filter memories to export
- `format` (enum, optional, default: "json"): Export format

### memory_cleanup

**Description**: Clean up old memories

**Parameters**:

- `daysToKeep` (number, optional, default: 30): Number of days to retain
- `dryRun` (boolean, optional, default: false): Preview without deleting

## Tool Chaining and Workflows

DocuMCP tools are designed to work together in workflows:

1. **Analysis → Recommendation → Implementation**:

   ```
   analyze_repository → recommend_ssg → generate_config → setup_structure → deploy_pages
   ```

2. **Content Management**:

   ```
   analyze_repository → populate_diataxis_content → validate_diataxis_content
   ```

3. **Documentation Maintenance**:
   ```
   detect_documentation_gaps → update_existing_documentation → validate_content
   ```

## Error Handling

All tools return structured responses with error information when failures occur:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error executing tool_name: error_message"
    }
  ],
  "isError": true
}
```

## Resource Storage

Tool results are automatically stored as MCP resources with URIs like:

- `documcp://analysis/{id}`: Analysis results
- `documcp://config/{ssg}/{id}`: Configuration files
- `documcp://deployment/{id}`: Deployment workflows

These resources can be accessed later for reference or further processing.

## Version Information

Current DocuMCP version: **0.3.2**

For the latest updates and detailed changelog, see the project repository.
