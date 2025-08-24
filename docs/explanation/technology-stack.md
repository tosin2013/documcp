# Technology Stack

Complete overview of technologies used in documcp MCP server.

## Core Technologies

### Runtime & Language
- **Node.js 20+**: JavaScript runtime environment
- **TypeScript 5.3+**: Primary development language with strict type safety
- **ES Modules**: Modern module system for clean imports/exports

### MCP Foundation
- **@modelcontextprotocol/sdk**: Official MCP TypeScript SDK for protocol implementation
- **JSON-RPC 2.0**: Communication protocol for MCP tool calls
- **Zod**: Runtime type validation and schema definition
- **zod-to-json-schema**: Automatic JSON schema generation from Zod types

## Development Tools

### Build & Compilation
- **TypeScript Compiler (tsc)**: Direct TypeScript to JavaScript compilation
- **tsx**: TypeScript execution and hot reloading for development
- **ES2022 Target**: Modern JavaScript features with broad compatibility

### Code Quality
- **ESLint**: TypeScript-aware linting with strict rules
- **Prettier**: Consistent code formatting
- **@typescript-eslint/parser**: TypeScript AST parsing for ESLint
- **@typescript-eslint/eslint-plugin**: TypeScript-specific linting rules

### Testing Framework
- **Jest 29+**: Primary testing framework
- **ts-jest**: TypeScript integration for Jest
- **@types/jest**: TypeScript definitions for Jest APIs
- **Coverage reporting**: Built-in Jest coverage analysis

## Infrastructure

### Version Control & CI/CD
- **Git**: Source control with conventional commits
- **GitHub**: Repository hosting and collaboration
- **GitHub Actions**: Automated testing and deployment pipelines

### Package Management
- **npm**: Package management with lock file for reproducible builds
- **Node 20+ engines**: Enforced minimum Node.js version requirement

## Core Dependencies

### Production Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^0.6.0",
  "zod": "^3.22.4", 
  "zod-to-json-schema": "^3.24.6"
}
```

### Development Dependencies
```json
{
  "@types/jest": "^29.5.11",
  "@types/node": "^20.11.0",
  "@typescript-eslint/eslint-plugin": "^6.19.0",
  "@typescript-eslint/parser": "^6.19.0",
  "eslint": "^8.56.0",
  "jest": "^29.7.0",
  "prettier": "^3.2.4",
  "ts-jest": "^29.1.1",
  "tsx": "^4.7.0",
  "typescript": "^5.3.3"
}
```

## MCP Architecture Technologies

### Tool Implementation
- **Zod Schemas**: Runtime parameter validation for all MCP tools
- **TypeScript Interfaces**: Compile-time type safety for tool responses
- **JSON Schema Generation**: Automatic schema creation for MCP tool definitions
- **Error Handling**: Structured error responses with actionable guidance

### Resource Management
- **File System Operations**: Direct filesystem access for repository analysis
- **Stream Processing**: Memory-efficient handling of large files
- **Async/Await**: Modern asynchronous programming patterns

## Static Site Generator Integration

### Supported SSGs
- **Jekyll**: Ruby-based, GitHub Pages native
- **Hugo**: Go-based, extremely fast builds
- **Docusaurus**: React-based, feature-rich documentation
- **MkDocs**: Python-based, clean and simple
- **Eleventy**: JavaScript-based, flexible templating

### Template Systems
- **YAML Configuration**: SSG configuration file generation
- **Markdown Content**: Documentation content creation
- **GitHub Actions Workflows**: Automated deployment pipeline generation

## Development Environment

### Recommended Setup
- **VS Code**: Primary IDE with TypeScript support
- **Node Version Manager (nvm)**: Node.js version management
- **GitHub CLI**: Repository and workflow management

### Essential VS Code Extensions
- **TypeScript and JavaScript Language Features**: Built-in TypeScript support
- **ESLint**: Real-time linting feedback
- **Prettier**: Automatic code formatting
- **Jest**: Test runner integration

### Development Scripts
```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "test": "jest",
  "test:coverage": "jest --coverage",
  "lint": "eslint . --ext .ts",
  "typecheck": "tsc --noEmit"
}
```

## Security & Quality

### Type Safety
- **Strict TypeScript**: Enabled strict mode for maximum type safety
- **Runtime Validation**: Zod schemas validate all external inputs
- **No `any` Types**: Explicit typing throughout codebase

### Dependency Security
- **npm audit**: Regular dependency vulnerability scanning
- **Minimal Dependencies**: Small, focused dependency tree
- **Trusted Sources**: Only well-maintained, popular packages

### Code Quality
- **100% TypeScript**: No JavaScript files in source code
- **Comprehensive Testing**: Unit tests for all core functionality
- **Linting Rules**: Strict ESLint configuration with TypeScript rules

## Performance Considerations

### Memory Efficiency
- **Streaming Processing**: Large file handling without memory bloat
- **Lazy Loading**: On-demand module loading
- **Garbage Collection**: Proper cleanup of temporary objects

### Build Performance
- **Incremental Compilation**: TypeScript incremental builds
- **Fast Test Execution**: Jest with optimized configuration
- **Parallel Processing**: Multi-core utilization where possible

## Future Technology Considerations

### MCP Protocol Evolution
- **Protocol Updates**: Ready for MCP specification changes
- **SDK Upgrades**: Tracking @modelcontextprotocol/sdk releases
- **Backward Compatibility**: Maintaining compatibility with existing clients

### Performance Enhancements
- **WebAssembly**: Potential for compute-intensive operations
- **Worker Threads**: Parallel processing for large repositories
- **Caching Strategies**: Intelligent result caching and reuse
