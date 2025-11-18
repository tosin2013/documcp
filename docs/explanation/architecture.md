# DocuMCP Architecture Overview

This document explains the architectural design of DocuMCP, providing insight into how the system works and why key design decisions were made.

## High-Level Architecture

DocuMCP follows a modular, stateless architecture built on the Model Context Protocol (MCP) standard, designed to provide intelligent documentation deployment capabilities through AI assistant integration.

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Assistant Layer                       │
│           (Claude, GPT, Gemini, etc.)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
┌─────────────────────▼───────────────────────────────────────┐
│                DocuMCP MCP Server                           │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │   Tools     │ │   Prompts    │ │     Resources       │  │
│  │   Layer     │ │   Layer      │ │     Layer           │  │
│  └─────────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Core Engine Layer                          │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Repository  │ │ SSG Recommendation│ │ Memory System   │  │
│  │ Analysis    │ │ Engine           │ │                 │  │
│  └─────────────┘ └──────────────┘ └─────────────────────┘  │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ Content     │ │ Deployment   │ │ Validation         │  │
│  │ Generation  │ │ Automation   │ │ Engine             │  │
│  └─────────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              External Integrations Layer                    │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │  GitHub     │ │   Static     │ │   File System      │  │
│  │   API       │ │   Site       │ │   Operations       │  │
│  │             │ │ Generators   │ │                    │  │
│  └─────────────┘ └──────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Stateless Operation

DocuMCP operates as a stateless service where each tool invocation is independent:

- **No persistent server state** between requests
- **Self-contained analysis** for each repository
- **Reproducible results** given the same inputs
- **Horizontal scalability** without coordination

**Benefits:**

- Reliability and consistency
- Easy debugging and testing
- No complex state management
- Simple deployment model

### 2. Modular Architecture

Each component has a single, well-defined responsibility:

```typescript
// Tool interface definition
interface MCPTool {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  handler: (args: ToolArgs) => Promise<ToolResult>;
}

// Example tool implementation
export async function analyzeRepository(
  args: AnalysisArgs,
): Promise<AnalysisResult> {
  // Isolated business logic
  return performAnalysis(args);
}
```

**Benefits:**

- Easy to test and maintain
- Clear separation of concerns
- Extensible without breaking changes
- Independent component evolution

### 3. Progressive Complexity

Users can start simple and add sophistication as needed:

1. **Basic:** Simple repository analysis
2. **Intermediate:** SSG recommendations and configuration
3. **Advanced:** Full deployment automation with optimization
4. **Expert:** Memory-enhanced workflows with pattern learning

### 4. Security-First Design

All operations follow security best practices:

- **Minimal permissions** in generated workflows
- **OIDC authentication** for GitHub Actions
- **Input validation** using Zod schemas
- **No secret exposure** in logs or outputs

## Component Architecture

### MCP Server Core

The main server (`src/index.ts`) implements the MCP protocol specification using the low-level `Server` class from `@modelcontextprotocol/sdk/server/index.js`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  // ... other schemas
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "documcp",
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {}, // 30+ documentation tools
      prompts: {
        listChanged: true, // Guided workflow prompts
      },
      resources: {
        subscribe: true, // Generated content resources
        listChanged: true,
      },
      roots: {
        listChanged: true, // Path permission management
      },
    },
  },
);

// Tool registration using request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS.map(/* transform to MCP format */) };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Route to appropriate tool handler based on request.params.name
});

// Connect via stdio transport for process-based communication
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Key Features:**

- **Low-Level Server Implementation:** Uses the foundational `Server` class for maximum control and flexibility
- **Stdio Transport:** Communicates via standard input/output streams for process-based integration with MCP clients
- **Manual Tool Registration:** Tools registered using `setRequestHandler` with `CallToolRequestSchema` and `ListToolsRequestSchema`
- **Schema Validation:** Zod-based input/output validation with `zodToJsonSchema` conversion for MCP compatibility
- **Resource Management:** Automatic resource creation and storage with URI-based access patterns
- **Error Handling:** Comprehensive error management with structured MCP error responses
- **Path Security:** Root-based permission checking via `--root` arguments to restrict file system access

### Repository Analysis Engine

The analysis engine examines projects from multiple perspectives:

```typescript
interface RepositoryAnalysis {
  structure: ProjectStructure; // Files, languages, organization
  dependencies: DependencyAnalysis; // Package ecosystems, frameworks
  documentation: DocuAnalysis; // Existing docs, quality assessment
  recommendations: ProjectProfile; // Type, complexity, team size
}
```

**Analysis Layers:**

1. **File System Analysis:** Language detection, structure mapping
2. **Dependency Analysis:** Package manager integration, framework detection
3. **Documentation Assessment:** README quality, existing docs evaluation
4. **Complexity Scoring:** Project size, team collaboration patterns

**Performance Characteristics:**

- **Sub-second analysis** for typical repositories
- **Memory efficient** with streaming file processing
- **Extensible** language and framework detection

### SSG Recommendation Engine

A data-driven system for selecting optimal static site generators:

```typescript
interface SSGRecommendation {
  recommended: SSGType;
  confidence: number; // 0-1 confidence score
  reasoning: string[]; // Human-readable justifications
  alternatives: Alternative[]; // Other viable options
  scoring: ScoringBreakdown; // Detailed scoring matrix
}
```

**Scoring Factors:**

- **Ecosystem Alignment:** Language/framework compatibility
- **Feature Requirements:** Search, theming, plugins
- **Complexity Match:** Project size and team capacity
- **Performance Needs:** Build speed, site performance
- **Maintenance Overhead:** Learning curve, ongoing effort

**Supported SSGs:**

- **Jekyll:** Ruby-based, GitHub Pages native
- **Hugo:** Go-based, fast builds, extensive themes
- **Docusaurus:** React-based, modern features
- **MkDocs:** Python-based, simple and effective
- **Eleventy:** JavaScript-based, flexible and fast

### Memory System Architecture

An intelligent learning system that improves recommendations over time:

```typescript
interface MemorySystem {
  storage: ProjectLocalStorage; // .documcp/memory/
  patterns: PatternRecognition; // Success pattern learning
  similarity: ProjectSimilarity; // Project comparison engine
  insights: HistoricalInsights; // Usage patterns and outcomes
}
```

**Storage Architecture:**

```
.documcp/memory/
├── analysis/           # Repository analysis results
│   ├── analysis_*.jsonl
│   └── metadata.json
├── recommendations/    # SSG recommendations
│   ├── recommendations_*.jsonl
│   └── patterns.json
├── deployments/       # Deployment outcomes
│   ├── deployments_*.jsonl
│   └── success_rates.json
└── system/           # System metadata
    ├── config.json
    └── statistics.json
```

**Learning Mechanisms:**

- **Pattern Recognition:** Successful project-SSG combinations
- **Similarity Matching:** Find projects with similar characteristics
- **Outcome Tracking:** Monitor deployment success rates
- **Feedback Integration:** Learn from user choices and outcomes

### Content Generation System

Automated content creation following the Diataxis framework:

```
Diataxis Framework Implementation:
┌─────────────────┐  ┌─────────────────┐
│   Tutorials     │  │  How-to Guides  │
│  (Learning)     │  │  (Problem-      │
│                 │  │   solving)      │
└─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│   Reference     │  │  Explanation    │
│ (Information)   │  │ (Understanding) │
└─────────────────┘  └─────────────────┘
```

**Content Types Generated (Diataxis Framework):**

- **Tutorials:** Learning-oriented guides for skill acquisition (study context)
- **How-to Guides:** Problem-solving guides for specific tasks (work context)
- **Reference:** Information-oriented content for lookup and verification (information context)
- **Explanation:** Understanding-oriented content for context and background (understanding context)

### Deployment Automation

Automated GitHub Pages deployment with SSG-specific optimizations:

```yaml
# Generated workflow characteristics
Security:
  - OIDC authentication (no long-lived tokens)
  - Minimal permissions (contents:read, pages:write)
  - Secret masking and secure handling

Performance:
  - Dependency caching (npm, gems, pip)
  - Parallel builds where possible
  - Optimized Docker images

Reliability:
  - Build verification before deployment
  - Rollback capabilities
  - Health monitoring
```

### Validation Engine

Multi-layered validation for content quality assurance:

```typescript
interface ValidationEngine {
  linkChecker: LinkValidation; // Internal/external link verification
  contentValidator: ContentValidation; // Diataxis compliance, accuracy
  codeValidator: CodeValidation; // Syntax checking, example testing
  seoValidator: SEOValidation; // Meta tags, performance, accessibility
}
```

**Validation Levels:**

- **Syntax:** Markdown, code block syntax
- **Structure:** Diataxis compliance, navigation
- **Content:** Accuracy, completeness, consistency
- **Performance:** Loading speed, mobile optimization
- **SEO:** Meta tags, structured data, accessibility

## Data Flow Architecture

### Request Processing Flow

```
1. MCP Client Request
   ↓
2. Schema Validation (Zod)
   ↓
3. Tool Handler Routing
   ↓
4. Business Logic Execution
   ↓
5. Result Processing
   ↓
6. Resource Storage
   ↓
7. Response Formatting
   ↓
8. MCP Protocol Response
```

### Memory System Flow

```
1. Tool Execution
   ↓
2. Result Analysis
   ↓
3. Pattern Extraction
   ↓
4. Similarity Matching
   ↓
5. Storage Update
   ↓
6. Learning Integration
   ↓
7. Future Recommendations Enhancement
```

## Performance Architecture

### Performance Characteristics

**Analysis Performance:**

- **Small repos** (&lt;100 files): &lt;500ms
- **Medium repos** (100-1000 files): &lt;2s
- **Large repos** (1000+ files): &lt;10s

**Memory Efficiency:**

- **Streaming processing** for large repositories
- **Lazy loading** of analysis components
- **Garbage collection optimization**

**Scalability:**

- **Stateless design** enables horizontal scaling
- **No database dependencies** for core functionality
- **Process isolation** for security and reliability

### Optimization Strategies

1. **Caching:**

   - File system metadata caching
   - Analysis result memoization
   - Pattern matching optimization

2. **Lazy Loading:**

   - On-demand tool loading
   - Progressive analysis depth
   - Conditional feature activation

3. **Parallel Processing:**
   - Concurrent file analysis
   - Parallel validation checks
   - Asynchronous resource generation

## Error Handling Architecture

### Error Categories

```typescript
enum ErrorCategory {
  VALIDATION = "validation", // Input validation failures
  FILESYSTEM = "filesystem", // File system access issues
  NETWORK = "network", // GitHub API, external requests
  PROCESSING = "processing", // Business logic errors
  CONFIGURATION = "configuration", // Setup and config issues
}
```

### Error Recovery Strategies

1. **Graceful Degradation:** Partial results when possible
2. **Retry Logic:** Exponential backoff for transient failures
3. **Fallback Options:** Alternative approaches when primary fails
4. **User Guidance:** Actionable error messages and solutions

## Security Architecture

### Threat Model

**Protected Assets:**

- User repository contents
- Generated configuration files
- Deployment credentials
- Memory system data

**Threat Vectors:**

- Malicious repository content
- Compromised dependencies
- Network interception
- Privilege escalation

### Security Measures

1. **Input Validation:**

   - Zod schema validation for all inputs
   - Path traversal prevention
   - Content sanitization

2. **Execution Environment:**

   - No arbitrary code execution
   - Sandboxed file operations
   - Limited network access

3. **Secrets Management:**

   - OIDC token-based authentication
   - No long-lived credential storage
   - Environment variable isolation

4. **Generated Security:**
   - Minimal permission workflows
   - Security header configuration
   - HTTPS enforcement

## Extension Architecture

### Adding New Tools

```typescript
// 1. Implement tool function
export async function newTool(args: NewToolArgs): Promise<NewToolResult> {
  // Business logic
}

// 2. Define schema
const newToolSchema = z.object({
  // Input validation
});

// 3. Register in server
const TOOLS = [
  // ... existing tools
  {
    name: 'new_tool',
    description: 'Tool description',
    inputSchema: newToolSchema,
  }
];

// 4. Add handler in CallToolRequestSchema
case 'new_tool': {
  const result = await newTool(args);
  return result;
}
```

### Adding New SSG Support

```typescript
// 1. Extend SSG enum
type SSGType =
  | "jekyll"
  | "hugo"
  | "docusaurus"
  | "mkdocs"
  | "eleventy"
  | "new-ssg";

// 2. Add scoring logic
function scoreNewSSG(analysis: Analysis): number {
  // Scoring implementation
}

// 3. Add configuration generator
function generateNewSSGConfig(args: ConfigArgs): ConfigResult {
  // Configuration generation
}

// 4. Add deployment workflow
function createNewSSGWorkflow(args: DeployArgs): WorkflowResult {
  // GitHub Actions workflow
}
```

## Future Architecture Considerations

### Planned Enhancements

1. **Distributed Memory:** Shared learning across installations
2. **Plugin System:** Third-party tool integration
3. **Real-time Monitoring:** Live deployment health tracking
4. **Advanced Analytics:** Usage patterns and optimization insights

### Scalability Roadmap

1. **Phase 1:** Current stateless design (✅ Complete)
2. **Phase 2:** Memory system optimization (🔄 In Progress)
3. **Phase 3:** Distributed processing capabilities
4. **Phase 4:** Cloud-native deployment options

This architecture provides a solid foundation for intelligent documentation deployment while maintaining simplicity, security, and extensibility.
