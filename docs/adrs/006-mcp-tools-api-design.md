---
id: 006-mcp-tools-api-design
title: 'ADR-006: MCP Tools API Design and Interface Specification'
sidebar_label: 'ADR-006: MCP Tools API Design'
sidebar_position: 6
---

# ADR-006: MCP Tools API Design and Interface Specification

## Status
Accepted

## Context
DocuMCP must expose its functionality through a carefully designed set of MCP tools that provide comprehensive coverage of the documentation deployment workflow while maintaining clear separation of concerns, appropriate granularity, and excellent developer experience for MCP-enabled clients.

The MCP Tools API serves as the primary interface between DocuMCP's intelligence and client applications like GitHub Copilot, Claude Desktop, and other MCP-enabled development environments. This API must balance several competing concerns:

**Functional Requirements:**
- Comprehensive repository analysis capabilities
- Intelligent SSG recommendation with detailed justifications
- Automated configuration generation for multiple SSGs
- Diataxis-compliant documentation structure creation
- GitHub Pages deployment workflow generation
- Git integration for seamless deployment

**Usability Requirements:**
- Intuitive tool names and parameter structures
- Comprehensive input validation with clear error messages
- Consistent response formats across all tools
- Rich metadata for client presentation and user guidance
- Progressive disclosure of complexity (simple to advanced use cases)

**Technical Requirements:**
- Full MCP specification compliance
- Robust error handling and recovery
- Efficient parameter validation and sanitization
- Scalable architecture supporting complex multi-step workflows
- Extensible design for future functionality additions

## Decision
We will implement a comprehensive MCP Tools API consisting of six core tools that cover the complete documentation deployment workflow, with additional utility tools for advanced scenarios and troubleshooting.

### Core MCP Tools Architecture:

#### 1. Repository Analysis Tool (`analyzeRepository`)
**Purpose**: Comprehensive repository analysis and project characterization
**Scope**: Deep analysis of project structure, language ecosystems, existing documentation, and complexity assessment

#### 2. SSG Recommendation Tool (`recommendSSG`)  
**Purpose**: Intelligent static site generator recommendation with detailed justifications
**Scope**: Multi-criteria decision analysis with confidence scoring and alternative options

#### 3. Configuration Generation Tool (`generateConfiguration`)
**Purpose**: Create customized SSG configuration files and directory structures
**Scope**: Template-based generation with project-specific customizations and validation

#### 4. Diataxis Structure Tool (`createDiataxisStructure`)
**Purpose**: Generate comprehensive Diataxis-compliant documentation frameworks
**Scope**: Information architecture generation with content planning and navigation design

#### 5. Deployment Workflow Tool (`generateWorkflow`)
**Purpose**: Create optimized GitHub Actions workflows for automated deployment
**Scope**: SSG-specific workflow generation with security best practices and performance optimization

#### 6. Git Integration Tool (`generateGitCommands`)
**Purpose**: Provide ready-to-execute Git commands for deployment and maintenance
**Scope**: Context-aware command generation with branch management and deployment verification

### Supporting Tools:
- `validateConfiguration`: Validate generated configurations and identify issues
- `troubleshootDeployment`: Analyze deployment failures and provide remediation guidance
- `optimizePerformance`: Analyze and optimize existing documentation site performance
- `migrateDocumentation`: Assist with migration between different SSGs or frameworks

## Alternatives Considered

### Monolithic Single Tool Approach
- **Pros**: Simpler API surface, single entry point, easier client integration
- **Cons**: Complex parameter structures, poor separation of concerns, difficult error handling
- **Decision**: Rejected due to poor usability and maintainability

### Micro-Tool Architecture (15+ Small Tools)
- **Pros**: Maximum granularity, precise control, composable workflows
- **Cons**: Complex orchestration, cognitive overhead, fragmented user experience
- **Decision**: Rejected due to complexity and poor user experience

### Stateful Session-Based API
- **Pros**: Could maintain context across tool calls, simplified parameter passing
- **Cons**: Session management complexity, state synchronization issues, harder client integration
- **Decision**: Rejected to maintain MCP stateless principles

### External API Integration (REST/GraphQL)
- **Pros**: Standard web technologies, extensive tooling ecosystem
- **Cons**: Not MCP-compliant, additional infrastructure requirements, authentication complexity
- **Decision**: Rejected due to MCP specification requirements

## Consequences

### Positive
- **Clear Separation of Concerns**: Each tool has well-defined responsibility and scope
- **Progressive Complexity**: Users can start simple and add sophistication as needed
- **Excellent Error Handling**: Tool-specific validation and error reporting
- **Client-Friendly**: Rich metadata and consistent response formats enhance client UX
- **Extensible Architecture**: Easy to add new tools without breaking existing functionality

### Negative
- **API Surface Complexity**: Six core tools plus supporting tools require comprehensive documentation
- **Inter-Tool Coordination**: Some workflows require multiple tool calls with parameter passing
- **Validation Overhead**: Each tool requires comprehensive input validation and error handling

### Risks and Mitigations
- **API Complexity**: Provide comprehensive documentation and usage examples
- **Parameter Evolution**: Use versioned schemas with backward compatibility
- **Client Integration**: Offer reference implementations and integration guides

## Implementation Details

### Tool Parameter Schemas
```typescript
// Core tool parameter interfaces
interface AnalyzeRepositoryParams {
  repositoryPath: string;
  analysisDepth?: 'basic' | 'comprehensive' | 'deep';
  focusAreas?: ('structure' | 'languages' | 'documentation' | 'complexity')[];
  excludePatterns?: string[];
}

interface RecommendSSGParams {
  projectAnalysis: ProjectAnalysis;
  teamCapabilities?: TeamCapabilities;
  performanceRequirements?: PerformanceRequirements;
  customizationNeeds?: CustomizationNeeds;
  existingConstraints?: ProjectConstraints;
}

interface GenerateConfigurationParams {
  selectedSSG: SSGType;
  projectAnalysis: ProjectAnalysis;
  customizations?: SSGCustomizations;
  deploymentTarget?: DeploymentTarget;
  advancedOptions?: AdvancedConfigOptions;
}

interface CreateDiataxisStructureParams {
  selectedSSG: SSGType;
  projectType: ProjectType;
  existingContent?: ExistingContentAnalysis;
  contentComplexity?: 'minimal' | 'standard' | 'comprehensive';
  navigationPreferences?: NavigationPreferences;
}

interface GenerateWorkflowParams {
  ssgType: SSGType;
  deploymentStrategy: 'github-actions' | 'branch-based' | 'hybrid';
  securityRequirements?: SecurityRequirements;
  performanceOptimizations?: PerformanceOptions;
  environmentConfiguration?: EnvironmentConfig;
}

interface GenerateGitCommandsParams {
  deploymentStrategy: DeploymentStrategy;
  repositoryState: RepositoryState;
  branchConfiguration: BranchConfiguration;
  commitPreferences?: CommitPreferences;
}
```

### Response Format Standardization
```typescript
// Standardized response structure for all tools
interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata: ResponseMetadata;
  recommendations?: Recommendation[];
  nextSteps?: NextStep[];
}

interface ResponseMetadata {
  toolVersion: string;
  executionTime: number;
  confidenceScore?: number;
  analysisDepth: string;
  timestamp: string;
  correlationId: string;
}

interface ErrorDetails {
  code: string;
  message: string;
  details: string;
  resolution?: string;
  documentation?: string;
}

interface Recommendation {
  type: 'optimization' | 'alternative' | 'enhancement';
  priority: 'low' | 'medium' | 'high';
  description: string;
  implementation?: string;
  resources?: string[];
}

interface NextStep {
  action: string;
  description: string;
  toolRequired?: string;
  parameters?: Record<string, any>;
  estimated_time?: string;
}
```

### analyzeRepository Tool Implementation
```typescript
const analyzeRepositoryTool: MCPTool = {
  name: 'analyzeRepository',
  description: 'Comprehensive repository analysis for documentation planning',
  inputSchema: {
    type: 'object',
    properties: {
      repositoryPath: {
        type: 'string',
        description: 'Path to the repository to analyze'
      },
      analysisDepth: {
        type: 'string',
        enum: ['basic', 'comprehensive', 'deep'],
        default: 'comprehensive',
        description: 'Depth of analysis to perform'
      },
      focusAreas: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['structure', 'languages', 'documentation', 'complexity']
        },
        description: 'Specific areas to focus analysis on'
      },
      excludePatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'File patterns to exclude from analysis'
      }
    },
    required: ['repositoryPath']
  }
};

async function handleAnalyzeRepository(params: AnalyzeRepositoryParams): Promise<MCPToolResponse<RepositoryAnalysis>> {
  try {
    const analysis = await repositoryAnalyzer.analyze(params);
    
    return {
      success: true,
      data: analysis,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: analysis.executionTime,
        analysisDepth: params.analysisDepth || 'comprehensive',
        timestamp: new Date().toISOString(),
        correlationId: generateCorrelationId()
      },
      recommendations: generateAnalysisRecommendations(analysis),
      nextSteps: [
        {
          action: 'Get SSG Recommendation',
          description: 'Use analysis results to get intelligent SSG recommendations',
          toolRequired: 'recommendSSG',
          parameters: { projectAnalysis: analysis },
          estimated_time: '< 1 minute'
        }
      ]
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: 'Repository analysis failed',
        details: error.message,
        resolution: 'Verify repository path and permissions',
        documentation: 'https://documcp.dev/troubleshooting#analysis-errors'
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: 0,
        analysisDepth: params.analysisDepth || 'comprehensive',
        timestamp: new Date().toISOString(),
        correlationId: generateCorrelationId()
      }
    };
  }
}
```

### recommendSSG Tool Implementation
```typescript
const recommendSSGTool: MCPTool = {
  name: 'recommendSSG',
  description: 'Intelligent static site generator recommendation with detailed justifications',
  inputSchema: {
    type: 'object',
    properties: {
      projectAnalysis: {
        type: 'object',
        description: 'Repository analysis results from analyzeRepository tool'
      },
      teamCapabilities: {
        type: 'object',
        properties: {
          technicalSkills: { type: 'array', items: { type: 'string' } },
          maintenanceCapacity: { type: 'string', enum: ['minimal', 'moderate', 'extensive'] },
          learningAppetite: { type: 'string', enum: ['low', 'medium', 'high'] }
        }
      },
      performanceRequirements: {
        type: 'object',
        properties: {
          buildTimeImportance: { type: 'string', enum: ['low', 'medium', 'high'] },
          siteSpeedPriority: { type: 'string', enum: ['standard', 'fast', 'ultra-fast'] },
          scalabilityNeeds: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'] }
        }
      }
    },
    required: ['projectAnalysis']
  }
};

async function handleRecommendSSG(params: RecommendSSGParams): Promise<MCPToolResponse<SSGRecommendation>> {
  const recommendation = await ssgRecommendationEngine.analyze(params);
  
  return {
    success: true,
    data: recommendation,
    metadata: {
      toolVersion: '1.0.0',
      executionTime: recommendation.analysisTime,
      confidenceScore: recommendation.confidence,
      analysisDepth: 'comprehensive',
      timestamp: new Date().toISOString(),
      correlationId: generateCorrelationId()
    },
    recommendations: [
      {
        type: 'optimization',
        priority: 'medium',
        description: 'Consider performance optimization strategies',
        implementation: 'Review build caching and incremental build options'
      }
    ],
    nextSteps: [
      {
        action: 'Generate Configuration',
        description: 'Create customized configuration for recommended SSG',
        toolRequired: 'generateConfiguration',
        parameters: { 
          selectedSSG: recommendation.primaryRecommendation.ssg,
          projectAnalysis: params.projectAnalysis 
        },
        estimated_time: '2-3 minutes'
      }
    ]
  };
}
```

### Input Validation System
```typescript
interface ValidationRule {
  field: string;
  validator: (value: any) => ValidationResult;
  required: boolean;
  errorMessage: string;
}

class MCPToolValidator {
  validateParameters<T>(params: T, schema: JSONSchema): ValidationResult {
    const results = this.runSchemaValidation(params, schema);
    const semanticResults = this.runSemanticValidation(params);
    
    return this.combineValidationResults(results, semanticResults);
  }

  private runSemanticValidation(params: any): ValidationResult {
    const issues: ValidationIssue[] = [];
    
    // Repository path validation
    if (params.repositoryPath && !this.isValidRepositoryPath(params.repositoryPath)) {
      issues.push({
        field: 'repositoryPath',
        message: 'Repository path does not exist or is not accessible',
        severity: 'error',
        resolution: 'Verify the path exists and you have read permissions'
      });
    }
    
    // Cross-parameter validation
    if (params.analysisDepth === 'deep' && params.focusAreas?.length > 2) {
      issues.push({
        field: 'analysisDepth',
        message: 'Deep analysis with multiple focus areas may be slow',
        severity: 'warning',
        resolution: 'Consider using comprehensive analysis or fewer focus areas'
      });
    }
    
    return { valid: issues.length === 0, issues };
  }
}
```

## Tool Orchestration Patterns

### Sequential Workflow Pattern
```typescript
// Common workflow: Analysis → Recommendation → Configuration → Deployment
class DocumentationWorkflow {
  async executeCompleteWorkflow(repositoryPath: string): Promise<WorkflowResult> {
    try {
      // Step 1: Analyze repository
      const analysisResult = await this.callTool('analyzeRepository', { repositoryPath });
      if (!analysisResult.success) {
        throw new Error(`Analysis failed: ${analysisResult.error?.message}`);
      }
      
      // Step 2: Get SSG recommendation
      const recommendationResult = await this.callTool('recommendSSG', {
        projectAnalysis: analysisResult.data
      });
      if (!recommendationResult.success) {
        throw new Error(`Recommendation failed: ${recommendationResult.error?.message}`);
      }
      
      // Step 3: Generate configuration
      const configResult = await this.callTool('generateConfiguration', {
        selectedSSG: recommendationResult.data.primaryRecommendation.ssg,
        projectAnalysis: analysisResult.data
      });
      if (!configResult.success) {
        throw new Error(`Configuration generation failed: ${configResult.error?.message}`);
      }
      
      // Step 4: Create Diataxis structure
      const structureResult = await this.callTool('createDiataxisStructure', {
        selectedSSG: recommendationResult.data.primaryRecommendation.ssg,
        projectType: analysisResult.data.projectType
      });
      if (!structureResult.success) {
        console.warn(`Diataxis structure creation failed: ${structureResult.error?.message}`);
      }
      
      // Step 5: Generate deployment workflow
      const workflowResult = await this.callTool('generateWorkflow', {
        ssgType: recommendationResult.data.primaryRecommendation.ssg,
        deploymentStrategy: 'github-actions'
      });
      if (!workflowResult.success) {
        console.warn(`Workflow generation failed: ${workflowResult.error?.message}`);
      }
      
      return this.combineResults([
        analysisResult, recommendationResult, configResult, structureResult, workflowResult
      ]);
    } catch (error) {
      throw new Error(`Complete workflow failed: ${error.message}`);
    }
  }
}
```

## Error Handling and Recovery

### Comprehensive Error Classification
```typescript
enum ErrorCategory {
  VALIDATION = 'validation',
  FILESYSTEM = 'filesystem',
  ANALYSIS = 'analysis',
  GENERATION = 'generation',
  CONFIGURATION = 'configuration',
  DEPLOYMENT = 'deployment',
  NETWORK = 'network',
  PERMISSION = 'permission'
}

interface ErrorContext {
  tool: string;
  operation: string;
  parameters: Record<string, any>;
  environment: EnvironmentInfo;
}

class MCPErrorHandler {
  handleError(error: Error, context: ErrorContext): MCPToolResponse<null> {
    const classification = this.classifyError(error);
    const resolution = this.generateResolution(classification, context);
    
    return {
      success: false,
      error: {
        code: this.generateErrorCode(classification),
        message: this.formatUserMessage(error, classification),
        details: error.message,
        resolution: resolution.guidance,
        documentation: resolution.documentationUrl
      },
      metadata: this.generateErrorMetadata(context),
      nextSteps: resolution.suggestedActions
    };
  }

  private generateResolution(classification: ErrorClassification, context: ErrorContext): ErrorResolution {
    switch (classification.category) {
      case ErrorCategory.FILESYSTEM:
        return {
          guidance: 'Verify file paths and permissions',
          documentationUrl: 'https://documcp.dev/troubleshooting#filesystem-errors',
          suggestedActions: [
            { action: 'Check file exists', description: `Verify ${context.parameters.repositoryPath} exists` },
            { action: 'Check permissions', description: 'Ensure read access to repository directory' }
          ]
        };
      // ... other error categories
    }
  }
}
```

## Performance Optimization

### Response Caching Strategy
```typescript
interface CacheConfiguration {
  analyzeRepository: { ttl: 300, keyFields: ['repositoryPath', 'analysisDepth'] };
  recommendSSG: { ttl: 3600, keyFields: ['projectAnalysis.signature'] };
  generateConfiguration: { ttl: 1800, keyFields: ['selectedSSG', 'projectAnalysis.signature'] };
}

class MCPToolCache {
  async getCachedResponse<T>(
    toolName: string, 
    parameters: any
  ): Promise<MCPToolResponse<T> | null> {
    const cacheKey = this.generateCacheKey(toolName, parameters);
    const cached = await this.cache.get(cacheKey);
    
    if (cached && !this.isExpired(cached)) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true,
          cacheAge: Date.now() - cached.metadata.timestamp
        }
      };
    }
    
    return null;
  }
}
```

## Testing Strategy

### Tool Testing Framework
```typescript
describe('MCP Tools API', () => {
  describe('analyzeRepository', () => {
    it('should analyze JavaScript project correctly');
    it('should handle missing repository gracefully');
    it('should respect analysis depth parameters');
    it('should exclude specified patterns');
  });

  describe('recommendSSG', () => {
    it('should recommend Hugo for large documentation sites');
    it('should recommend Jekyll for GitHub Pages simple sites');
    it('should provide confidence scores for all recommendations');
    it('should handle incomplete project analysis');
  });

  describe('Tool Integration', () => {
    it('should support complete workflow from analysis to deployment');
    it('should maintain parameter consistency across tool calls');
    it('should provide appropriate next steps guidance');
  });
});
```

### Integration Testing
```typescript
class MCPToolIntegrationTests {
  async testCompleteWorkflow(): Promise<void> {
    const testRepo = await this.createTestRepository();
    
    // Test full workflow
    const analysis = await this.callTool('analyzeRepository', { repositoryPath: testRepo });
    expect(analysis.success).toBe(true);
    
    const recommendation = await this.callTool('recommendSSG', { projectAnalysis: analysis.data });
    expect(recommendation.success).toBe(true);
    expect(recommendation.data.primaryRecommendation).toBeDefined();
    
    const config = await this.callTool('generateConfiguration', {
      selectedSSG: recommendation.data.primaryRecommendation.ssg,
      projectAnalysis: analysis.data
    });
    expect(config.success).toBe(true);
    
    // Validate generated configuration
    await this.validateGeneratedFiles(config.data.files);
  }
}
```

## Documentation and Examples

### Tool Usage Examples
```typescript
// Example: Complete documentation setup workflow
const examples = {
  basicSetup: {
    description: 'Basic documentation setup for a JavaScript project',
    steps: [
      {
        tool: 'analyzeRepository',
        parameters: { repositoryPath: './my-project' },
        expectedResult: 'Project analysis with language ecosystem detection'
      },
      {
        tool: 'recommendSSG',
        parameters: { projectAnalysis: '${analysis_result}' },
        expectedResult: 'SSG recommendation with justification'
      }
    ]
  },
  advancedSetup: {
    description: 'Advanced setup with custom requirements',
    steps: [
      // ... detailed workflow steps
    ]
  }
};
```

## Future Enhancements

### Planned Tool Additions
- `analyzeExistingDocs`: Deep analysis of existing documentation quality and structure
- `generateMigrationPlan`: Create migration plans between different documentation systems
- `optimizeContent`: AI-powered content optimization and gap analysis
- `validateAccessibility`: Comprehensive accessibility testing and recommendations

### API Evolution Strategy
- Versioned tool schemas with backward compatibility
- Deprecation notices and migration guidance
- Feature flags for experimental functionality
- Community feedback integration for API improvements

## References
- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [JSON Schema Validation](https://json-schema.org/)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)
