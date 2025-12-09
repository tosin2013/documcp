---
documcp:
  last_updated: "2025-11-20T00:46:21.963Z"
  last_validated: "2025-12-09T19:41:38.593Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# Prompt Templates

DocuMCP provides a comprehensive set of prompt templates to help you interact effectively with the system. These templates are designed to get optimal results from DocuMCP's AI-powered documentation tools.

## Quick Reference

### Complete Workflow Templates

**Full Documentation Deployment:**

```
analyze my repository, recommend the best static site generator, set up Diataxis documentation structure, and deploy to GitHub Pages
```

**Documentation Audit:**

```
analyze my existing documentation for gaps, validate content accuracy, and provide recommendations for improvement
```

**Quick Setup:**

```
analyze my [LANGUAGE] project and set up documentation with the most suitable static site generator
```

## Repository Analysis Templates

### Basic Analysis

```
analyze my repository for documentation needs
```

### Specific Project Types

```
analyze my TypeScript library for API documentation requirements
analyze my Python package for comprehensive documentation needs
analyze my React application for user guide documentation
analyze my CLI tool for usage documentation
```

### Deep Analysis

```
perform deep analysis of my repository including dependency analysis, complexity assessment, and team collaboration patterns
```

### Focused Analysis

```
analyze my repository focusing on [SPECIFIC_AREA]
# Examples:
# - API documentation opportunities
# - user onboarding needs
# - developer experience gaps
# - deployment documentation requirements
```

## SSG Recommendation Templates

### Basic Recommendation

```
recommend the best static site generator for my project based on the analysis
```

### Preference-Based Recommendations

```
recommend a static site generator for my project with preferences for [ECOSYSTEM] and [PRIORITY]
# Ecosystem options: javascript, python, ruby, go, any
# Priority options: simplicity, features, performance
```

### Comparison Requests

```
compare static site generators for my [PROJECT_TYPE] with focus on [CRITERIA]
# Project types: library, application, tool, documentation
# Criteria: ease of use, customization, performance, community support
```

### Specific Requirements

```
recommend SSG for my project that supports:
- TypeScript integration
- API documentation generation
- Search functionality
- Custom theming
- Multi-language support
```

## Configuration Generation Templates

### Basic Configuration

```
generate [SSG_NAME] configuration for my project
# Examples:
# - generate Docusaurus configuration for my project
# - generate Hugo configuration for my project
# - generate MkDocs configuration for my project
```

### Detailed Configuration

```
generate comprehensive [SSG_NAME] configuration with:
- GitHub integration
- Custom domain setup
- Analytics integration
- SEO optimization
- Performance optimizations
```

### Production-Ready Setup

```
generate production-ready [SSG_NAME] configuration with security best practices and performance optimization
```

## Documentation Structure Templates

### Basic Structure

```
set up Diataxis documentation structure for my project
```

### SSG-Specific Structure

```
create [SSG_NAME] documentation structure following Diataxis principles with example content
```

### Content Population

```
set up documentation structure and populate it with project-specific content based on my code analysis
```

### Advanced Structure

```
create comprehensive documentation structure with:
- Diataxis organization
- Project-specific content
- Code examples from my repository
- API documentation templates
- Deployment guides
```

## Deployment Templates

### Basic GitHub Pages Deployment

```
deploy my documentation to GitHub Pages
```

### Complete Deployment Workflow

```
set up automated GitHub Pages deployment with:
- Build optimization
- Security best practices
- Performance monitoring
- Deployment verification
```

### Custom Domain Deployment

```
deploy to GitHub Pages with custom domain [DOMAIN_NAME] and SSL certificate
```

### Multi-Environment Deployment

```
set up documentation deployment with staging and production environments
```

## Content Management Templates

### Content Validation

```
validate all my documentation content for accuracy, broken links, and completeness
```

### Gap Analysis

```
analyze my documentation for missing content and provide recommendations for improvement
```

### Content Updates

```
update my existing documentation based on recent code changes and current best practices
```

### Quality Assurance

```
perform comprehensive quality check on my documentation including:
- Link validation
- Code example testing
- Content accuracy verification
- SEO optimization assessment
```

## Troubleshooting Templates

### General Troubleshooting

```
diagnose and fix issues with my documentation deployment
```

### Specific Problem Solving

```
troubleshoot [SPECIFIC_ISSUE] with my documentation setup
# Examples:
# - GitHub Pages deployment failures
# - build errors with my static site generator
# - broken links in my documentation
# - performance issues with my documentation site
```

### Verification and Testing

```
verify my documentation deployment is working correctly and identify any issues
```

## Memory and Learning Templates

### Memory Recall

```
show me insights from similar projects and successful documentation patterns
```

### Learning from History

```
based on previous analyses, what are the best practices for my type of project?
```

### Pattern Recognition

```
analyze patterns in my documentation workflow and suggest optimizations
```

## Advanced Workflow Templates

### Multi-Step Workflows

**Research and Planning:**

```
1. analyze my repository comprehensively
2. research best practices for my project type
3. recommend optimal documentation strategy
4. create implementation plan
```

**Implementation and Validation:**

```
1. set up recommended documentation structure
2. populate with project-specific content
3. validate all content and links
4. deploy to GitHub Pages
5. verify deployment success
```

**Maintenance and Optimization:**

```
1. audit existing documentation for gaps
2. update content based on code changes
3. optimize for performance and SEO
4. monitor deployment health
```

### Conditional Workflows

```
if my project is a [TYPE], then:
- focus on [SPECIFIC_DOCUMENTATION_NEEDS]
- use [RECOMMENDED_SSG]
- emphasize [CONTENT_PRIORITIES]
```

## Context-Aware Templates

### Project-Specific Context

```
for my [PROJECT_TYPE] written in [LANGUAGE] with [FRAMEWORK]:
- analyze documentation needs
- recommend appropriate tools
- create tailored content structure
```

### Team-Based Context

```
for a [TEAM_SIZE] team working on [PROJECT_DESCRIPTION]:
- set up collaborative documentation workflow
- implement review and approval processes
- create contribution guidelines
```

### Audience-Specific Context

```
create documentation targeting [AUDIENCE]:
- developers (API docs, technical guides)
- end users (tutorials, how-to guides)
- contributors (development setup, guidelines)
- administrators (deployment, configuration)
```

## Template Customization

### Variables and Placeholders

Use these placeholders in templates:

| Placeholder      | Description           | Examples                          |
| ---------------- | --------------------- | --------------------------------- |
| `[PROJECT_TYPE]` | Type of project       | library, application, tool        |
| `[LANGUAGE]`     | Programming language  | TypeScript, Python, Go            |
| `[SSG_NAME]`     | Static site generator | Docusaurus, Hugo, MkDocs          |
| `[DOMAIN_NAME]`  | Custom domain         | docs.example.com                  |
| `[FRAMEWORK]`    | Framework used        | React, Vue, Django                |
| `[TEAM_SIZE]`    | Team size             | small, medium, large              |
| `[ECOSYSTEM]`    | Package ecosystem     | javascript, python, ruby          |
| `[PRIORITY]`     | Priority focus        | simplicity, features, performance |

### Creating Custom Templates

```
create custom template for [SPECIFIC_USE_CASE]:
- define requirements
- specify desired outcomes
- include success criteria
- provide examples
```

## Best Practices for Prompting

### Effective Prompt Structure

1. **Be Specific:** Include relevant details about your project
2. **Set Context:** Mention your experience level and constraints
3. **Define Success:** Explain what a good outcome looks like
4. **Ask for Explanation:** Request reasoning behind recommendations

### Example of Well-Structured Prompt

```
I have a TypeScript library for data visualization with 50+ contributors.
I need comprehensive documentation that includes:
- API reference for all public methods
- Interactive examples with code samples
- Getting started guide for developers
- Contribution guidelines for the community

Please analyze my repository, recommend the best approach, and set up a
documentation system that can handle our scale and complexity.
```

### Common Pitfalls to Avoid

- **Too vague:** "help with documentation"
- **Missing context:** Not mentioning project type or requirements
- **No constraints:** Not specifying limitations or preferences
- **Single-step thinking:** Not considering the full workflow

## Integration with Development Workflow

### Git Hooks Integration

```
set up pre-commit hooks to:
- validate documentation changes
- check for broken links
- ensure content quality
- update generated content
```

### CI/CD Integration

```
create GitHub Actions workflow that:
- validates documentation on every PR
- deploys docs on main branch updates
- runs quality checks automatically
- notifies team of issues
```

### IDE Integration

```
configure development environment for:
- live documentation preview
- automated link checking
- content validation
- template generation
```

## Troubleshooting Prompts

### When Things Don't Work

**Analysis Issues:**

```
my repository analysis returned incomplete results, please retry with deep analysis and explain what might have caused the issue
```

**Recommendation Problems:**

```
the SSG recommendation doesn't match my needs because [REASON], please provide alternative recommendations with different priorities
```

**Deployment Failures:**

```
my GitHub Pages deployment failed with [ERROR_MESSAGE], please diagnose the issue and provide a fix
```

**Content Issues:**

```
my generated documentation has [PROBLEM], please update the content and ensure it meets [REQUIREMENTS]
```

For more troubleshooting help, see the [Troubleshooting Guide](../how-to/troubleshooting.md).

## Template Categories Summary

| Category            | Purpose                | Key Templates                      |
| ------------------- | ---------------------- | ---------------------------------- |
| **Analysis**        | Understanding projects | Repository analysis, gap detection |
| **Recommendation**  | Tool selection         | SSG comparison, feature matching   |
| **Configuration**   | Setup and config       | Production configs, optimization   |
| **Structure**       | Content organization   | Diataxis setup, content population |
| **Deployment**      | Going live             | GitHub Pages, custom domains       |
| **Validation**      | Quality assurance      | Link checking, content validation  |
| **Troubleshooting** | Problem solving        | Diagnosis, issue resolution        |
| **Workflow**        | Process automation     | Multi-step procedures, CI/CD       |

These templates provide a solid foundation for effective interaction with DocuMCP. Customize them based on your specific needs and project requirements.
