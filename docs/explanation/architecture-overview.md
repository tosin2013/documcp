# Architecture Overview

Understanding the MCP server architecture of documcp.

## System Architecture

documcp is a Model Context Protocol (MCP) server that provides intelligent documentation deployment tools for AI assistants like Claude Desktop and GitHub Copilot.

### Core Components

1. **MCP Server Foundation**: TypeScript-based MCP protocol implementation
2. **Repository Analysis Engine**: Multi-layered project analysis and characterization
3. **SSG Recommendation Engine**: Intelligent static site generator selection
4. **Configuration Generation System**: Template-based SSG configuration creation
5. **Deployment Orchestration**: GitHub Pages workflow automation
6. **Content Intelligence**: Diataxis-compliant documentation structure generation

## MCP Protocol Integration

### Tool-Based Architecture

documcp exposes functionality through MCP tools:
- **analyzeRepository**: Comprehensive project analysis
- **recommendSSG**: Intelligent SSG recommendations
- **generateConfiguration**: SSG-specific configuration creation
- **createDiataxisStructure**: Documentation framework generation
- **generateWorkflow**: GitHub Actions deployment workflows
- **generateGitCommands**: Git integration commands

### Stateless Design

Each tool call is independent and idempotent:
- No session state maintained between calls
- Analysis results passed between tools via parameters
- Consistent behavior across different AI clients

## Directory Structure

```
documcp/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── tools/             # MCP tool implementations
│   │   ├── analyze-repository.ts
│   │   ├── recommend-ssg.ts
│   │   ├── generate-config.ts
│   │   └── ...
│   ├── types/             # TypeScript type definitions
│   └── scripts/           # Utility scripts
├── tests/                 # Jest test suites
├── docs/                  # Documentation (Diataxis structure)
└── mcp.json              # MCP server configuration
```

## Tool Execution Flow

1. **Tool Invocation**: AI client calls MCP tool with parameters
2. **Parameter Validation**: Zod schema validation and sanitization
3. **Analysis/Processing**: Tool-specific logic execution
4. **Result Generation**: Structured response with metadata
5. **Resource Storage**: Generated files stored as MCP resources
6. **Response Return**: JSON response with next steps guidance

## Intelligence Architecture

### Repository Analysis Engine

Multi-dimensional project analysis:
- **Language Ecosystem Detection**: Primary languages and frameworks
- **Project Complexity Assessment**: Size, structure, and sophistication metrics
- **Documentation State Analysis**: Existing docs, gaps, and quality
- **Deployment Context**: GitHub integration, Pages compatibility

### SSG Recommendation Engine

Decision framework based on:
- **Project Characteristics**: Language, size, complexity
- **Team Capabilities**: Technical skills, maintenance capacity
- **Performance Requirements**: Build speed, site performance needs
- **Integration Needs**: GitHub Pages, existing tooling compatibility

### Content Intelligence

Automated documentation structure:
- **Diataxis Framework Compliance**: Tutorials, How-To, Reference, Explanation
- **Project-Specific Content**: Tailored to detected technologies
- **Navigation Generation**: Logical information architecture
- **Template Population**: SSG-specific content formatting

## Performance Considerations

### Efficient Analysis

- **Streaming File Processing**: Memory-efficient large repository handling
- **Parallel Processing**: Concurrent analysis of multiple components
- **Intelligent Caching**: Result memoization for repeated operations
- **Incremental Analysis**: Focus on changed components when possible

### Resource Management

- **Memory Optimization**: Streaming and chunked processing
- **File System Efficiency**: Minimal disk I/O operations
- **Network Optimization**: Efficient GitHub API usage
- **Process Isolation**: Clean separation between tool executions

## Integration Architecture

### GitHub Integration

- **Repository Analysis**: Direct filesystem and Git history access
- **Pages Configuration**: Automated repository settings management
- **Workflow Generation**: GitHub Actions YAML creation
- **Deployment Verification**: Post-deployment health checks

### AI Assistant Integration

- **Natural Language Interface**: Intent understanding and tool orchestration
- **Context Preservation**: Analysis results flow between tool calls
- **Error Recovery**: Intelligent failure handling and retry logic
- **Workflow Guidance**: Next steps recommendations and user guidance
