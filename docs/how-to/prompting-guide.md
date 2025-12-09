---
documcp:
  last_updated: "2025-11-20T00:46:21.953Z"
  last_validated: "2025-12-09T19:41:38.585Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# How to Prompt DocuMCP Effectively

This guide shows you how to interact with DocuMCP using effective prompts to get the best results from the system.

## 🎯 Pro Tip: Use @LLM_CONTEXT.md

When using DocuMCP in your AI assistant (Claude, ChatGPT, etc.), **reference the LLM_CONTEXT.md file** for instant context about all 45 available tools:

```
@LLM_CONTEXT.md analyze my repository and recommend the best deployment strategy
```

The `LLM_CONTEXT.md` file provides:

- Complete tool descriptions and parameters
- Usage examples for all 45 tools
- Common workflow patterns
- Memory system documentation
- Phase 3 code-to-docs sync capabilities

**Location**: `/LLM_CONTEXT.md` in the root of your project

This ensures your AI assistant has full context about DocuMCP's capabilities and can provide more accurate recommendations.

## Quick Start

DocuMCP responds to natural language prompts. Here are the most common patterns:

### Basic Analysis

```
analyze my repository for documentation needs
```

### Get Recommendations

```
what static site generator should I use for my project?
```

### Deploy Documentation

```
set up GitHub Pages deployment for my docs
```

## Available Tools

DocuMCP provides several tools you can invoke through natural prompts:

### 1. Repository Analysis

**Purpose**: Analyze your project structure, dependencies, and documentation needs.

**Example Prompts**:

- "Analyze my repository structure"
- "What documentation gaps do I have?"
- "Examine my project for documentation opportunities"

**What it returns**: Project analysis with language detection, dependency mapping, and complexity assessment.

### 2. SSG Recommendations

**Purpose**: Get intelligent static site generator recommendations based on your project.

**Example Prompts**:

- "Recommend a static site generator for my TypeScript project"
- "Which SSG works best with my Python documentation?"
- "Compare documentation tools for my project"

**What it returns**: Weighted recommendations with justifications for Jekyll, Hugo, Docusaurus, MkDocs, or Eleventy.

### 3. Configuration Generation

**Purpose**: Generate SSG-specific configuration files.

**Example Prompts**:

- "Generate a Hugo config for my project"
- "Create MkDocs configuration files"
- "Set up Docusaurus for my documentation"

**What it returns**: Ready-to-use configuration files optimized for your project.

### 4. Documentation Structure

**Purpose**: Create Diataxis-compliant documentation structure.

**Example Prompts**:

- "Set up documentation structure following Diataxis"
- "Create organized docs folders for my project"
- "Build a comprehensive documentation layout"

**What it returns**: Organized folder structure with templates following documentation best practices.

### 5. GitHub Pages Deployment

**Purpose**: Automate GitHub Pages deployment workflows.

**Example Prompts**:

- "Deploy my docs to GitHub Pages"
- "Set up automated documentation deployment"
- "Create GitHub Actions for my documentation site"

**What it returns**: GitHub Actions workflows configured for your chosen SSG.

### 6. Deployment Verification

**Purpose**: Verify and troubleshoot GitHub Pages deployments.

**Example Prompts**:

- "Check if my GitHub Pages deployment is working"
- "Troubleshoot my documentation deployment"
- "Verify my docs site is live"

**What it returns**: Deployment status and troubleshooting recommendations.

## Advanced Prompting Techniques

### Chained Operations

You can chain multiple operations in a single conversation:

```
1. First analyze my repository
2. Then recommend the best SSG
3. Finally set up the deployment workflow
```

### Specific Requirements

Be specific about your needs:

```
I need a documentation site that:
- Works with TypeScript
- Supports API documentation
- Has good search functionality
- Deploys automatically on commits
```

### Context-Aware Requests

Reference previous analysis:

```
Based on the analysis you just did, create the documentation structure and deploy it to GitHub Pages
```

## Best Practices

### 1. Start with Analysis

Always begin with repository analysis to get tailored recommendations:

```
analyze my project for documentation needs
```

### 2. Be Specific About Goals

Tell DocuMCP what you're trying to achieve:

- "I need developer documentation for my API"
- "I want user guides for my application"
- "I need project documentation for contributors"

### 3. Specify Constraints

Mention any limitations or preferences:

- "I prefer minimal setup"
- "I need something that works with our CI/CD pipeline"
- "I want to use our existing design system"

### 4. Ask for Explanations

Request reasoning behind recommendations:

```
why did you recommend Hugo over Jekyll for my project?
```

### 5. Iterate and Refine

Use follow-up prompts to refine results:

```
can you modify the GitHub Actions workflow to also run tests?
```

## Common Workflows

### Complete Documentation Setup

```
1. "Analyze my repository for documentation needs"
2. "Recommend the best static site generator for my project"
3. "Generate configuration files for the recommended SSG"
4. "Set up Diataxis-compliant documentation structure"
5. "Deploy everything to GitHub Pages"
```

### Documentation Audit

```
1. "Analyze my existing documentation"
2. "What gaps do you see in my current docs?"
3. "How can I improve my documentation structure?"
```

### Deployment Troubleshooting

```
1. "My GitHub Pages site isn't working"
2. "Check my deployment configuration"
3. "Help me fix the build errors"
```

## Memory and Context

DocuMCP remembers context within a conversation, so you can:

- Reference previous analysis results
- Build on earlier recommendations
- Chain operations together seamlessly

Example conversation flow:

```
User: "analyze my repository"
DocuMCP: [provides analysis]
User: "based on that analysis, what SSG do you recommend?"
DocuMCP: [provides recommendation using analysis context]
User: "set it up with that recommendation"
DocuMCP: [configures the recommended SSG]
```

## Troubleshooting Prompts

If you're not getting the results you expect, try:

### More Specific Prompts

Instead of: "help with docs"
Try: "analyze my TypeScript project and recommend documentation tools"

### Context Setting

Instead of: "set up deployment"
Try: "set up GitHub Pages deployment for the MkDocs site we just configured"

### Direct Tool Requests

If you know exactly what you want:

- "use the analyze_repository tool on my current directory"
- "run the recommend_ssg tool with my project data"

## Getting Help

If you need assistance with prompting:

- Ask DocuMCP to explain available tools: "what can you help me with?"
- Request examples: "show me example prompts for documentation setup"
- Ask for clarification: "I don't understand the recommendation, can you explain?"

Remember: DocuMCP is designed to understand natural language, so don't hesitate to ask questions in your own words!
