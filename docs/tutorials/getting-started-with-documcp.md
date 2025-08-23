# Getting Started with DocuMCP

Welcome to DocuMCP! This tutorial will guide you through setting up and using the intelligent documentation deployment MCP server for your projects.

## What is DocuMCP?

DocuMCP is a Model Context Protocol (MCP) server that provides AI-powered tools for:
- 🔍 **Repository Analysis** - Deep analysis of your project structure and documentation needs
- 📚 **Intelligent Documentation** - Automated creation of Diataxis-compliant documentation
- 🚀 **Deployment Automation** - GitHub Pages setup with optimized workflows
- ✅ **Quality Validation** - Content accuracy and completeness verification

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **An MCP-compatible client** (Claude Desktop, Cursor, VS Code with MCP extension)

## Installation & Setup

### 1. Install DocuMCP

```bash
# Clone the repository
git clone https://github.com/your-org/documcp.git
cd documcp

# Install dependencies
npm install

# Build the MCP server
npm run build
```

### 2. Configure MCP Client

#### For Claude Desktop

Add to your Claude Desktop configuration file (`~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {}
    }
  }
}
```

#### For Cursor IDE

1. Install the MCP extension in Cursor
2. Add to your MCP configuration (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {}
    }
  }
}
```

#### For VS Code

1. Install the MCP extension from the marketplace
2. Configure in `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### 3. Verify Installation

Test the MCP server directly:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js
```

You should see 10 available tools listed.

## Using DocuMCP: Step-by-Step Workflows

### Workflow 1: Complete Documentation Setup (New Project)

**Prompt Example:**
```
I need to set up comprehensive documentation for my TypeScript project. 
Can you analyze my repository and create a complete documentation structure 
with deployment to GitHub Pages?
```

**Expected AI Response:**
```
I'll help you set up comprehensive documentation using DocuMCP. Let me start by analyzing your repository structure.

1. First, I'll analyze your project:
```

The AI will then use DocuMCP tools in this sequence:
1. `analyze_repository` - Analyze project structure and dependencies
2. `recommend_ssg` - Get intelligent SSG recommendation
3. `generate_config` - Create configuration files
4. `setup_structure` - Build Diataxis documentation structure
5. `populate_diataxis_content` - Generate project-specific content
6. `deploy_pages` - Set up GitHub Pages workflow

### Workflow 2: Documentation Gap Analysis

**Prompt Example:**
```
I have existing documentation but I'm not sure what's missing. 
Can you analyze gaps in my documentation and suggest improvements?
```

**Expected AI Response:**
```
I'll analyze your existing documentation to identify gaps and suggest improvements.
```

The AI will use:
1. `detect_documentation_gaps` - Identify missing content and structure issues
2. `validate_diataxis_content` - Check quality and compliance
3. `populate_diataxis_content` - Fill identified gaps

### Workflow 3: Local Testing Before Deployment

**Prompt Example:**
```
Before deploying to GitHub Pages, I want to test my documentation build locally. 
Can you help me test and validate everything works?
```

**Expected AI Response:**
```
I'll help you test your documentation locally before deployment to ensure everything works correctly.
```

The AI will use:
1. `test_local_deployment` - Build and test local server
2. `verify_deployment` - Check configuration and requirements

## Available MCP Tools Reference

### Core Analysis Tools
- **`analyze_repository`** - Deep repository analysis and project profiling
- **`detect_documentation_gaps`** - Identify missing documentation content
- **`validate_diataxis_content`** - Validate documentation quality and compliance

### Setup & Configuration Tools  
- **`recommend_ssg`** - Get intelligent static site generator recommendations
- **`generate_config`** - Create SSG-specific configuration files
- **`setup_structure`** - Build Diataxis-compliant documentation structure

### Content & Deployment Tools
- **`populate_diataxis_content`** - Generate intelligent project-specific content
- **`test_local_deployment`** - Test build and local server before deployment
- **`deploy_pages`** - Set up GitHub Pages deployment workflow
- **`verify_deployment`** - Validate and troubleshoot deployment

## MCP Prompts (Guided Workflows)

DocuMCP provides guided prompts for common scenarios:

### 1. `analyze-and-recommend`
Complete repository analysis and SSG recommendation workflow
```
Use the analyze-and-recommend prompt with my project at /path/to/project
```

### 2. `setup-documentation` 
Create comprehensive documentation structure
```
Use the setup-documentation prompt to create docs for MyProject using Docusaurus
```

### 3. `troubleshoot-deployment`
Diagnose and fix GitHub Pages deployment issues
```
Use the troubleshoot-deployment prompt for my repository that's failing to deploy
```

## Example Usage Sessions

### Session 1: New Project Documentation

**User:** "I have a new React library and need complete documentation setup"

**AI Response:**
```
I'll help you set up comprehensive documentation for your React library. 
Let me analyze your project first.

[Uses analyze_repository tool]

I found a React TypeScript library with hooks and components. Based on the analysis, 
I recommend Docusaurus for its excellent React integration and TypeScript support.

[Uses recommend_ssg tool]

Now I'll generate the Docusaurus configuration and create a Diataxis-compliant structure:

[Uses generate_config and setup_structure tools]

Perfect! I've created:
- docs/ directory with tutorials, how-to, reference, and explanation sections
- Docusaurus configuration optimized for React libraries
- Example content including API documentation and component guides

Would you like me to populate the documentation with project-specific content and 
set up GitHub Pages deployment?
```

### Session 2: Documentation Audit

**User:** "My documentation feels incomplete. Can you analyze what's missing?"

**AI Response:**
```
I'll perform a comprehensive documentation gap analysis for your project.

[Uses detect_documentation_gaps tool]

Analysis complete! I found several areas for improvement:

**Missing Content (Priority: High)**
- Installation guide for end users
- API reference documentation  
- Docker deployment instructions

**Existing Strengths:**
- Well-organized Diataxis structure
- Good tutorial content
- Clear README

**Recommendations:**
- Add API reference using your OpenAPI spec
- Create Docker deployment guide (I detected docker-compose.yml)
- Enhance how-to guides for advanced use cases

Shall I populate these missing sections for you?
```

## Troubleshooting

### Common Issues

**MCP Server Not Found**
- Verify the path in your MCP configuration is correct
- Ensure `npm run build` completed successfully
- Check Node.js version compatibility

**Tools Not Available**
- Restart your MCP client after configuration changes
- Verify JSON syntax in MCP configuration files
- Check server logs for errors

**Build Failures**
- Ensure all dependencies are installed: `npm install`
- Clear and rebuild: `npm run clean && npm run build`
- Check for TypeScript compilation errors

### Getting Help

- Check the [How-To Guides](../how-to/) for specific tasks
- Review the [API Reference](../reference/) for tool documentation
- See [Architecture Overview](../explanation/) for deeper understanding

## Next Steps

Now that you have DocuMCP set up:

1. **Try a Quick Analysis**: Ask your AI to analyze a test project
2. **Explore Workflows**: Use the guided prompts for common tasks
3. **Customize Settings**: Adjust MCP configuration for your workflow
4. **Integrate with CI/CD**: Set up automated documentation updates

Happy documenting! 🚀
