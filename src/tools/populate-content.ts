import { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PopulationOptions {
  analysisId: string;
  docsPath: string;
  populationLevel: 'basic' | 'comprehensive' | 'intelligent';
  includeProjectSpecific: boolean;
  preserveExisting: boolean;
  technologyFocus?: string[];
}

interface TutorialContent {
  title: string;
  description: string;
  content: string;
  codeExamples?: string[];
}

interface ContentPlan {
  tutorials: TutorialContent[];
  howToGuides: any[];
  reference: any[];
  explanation: any[];
}

// ProjectContext interface - currently unused but kept for future enhancements
// interface ProjectContext {
//   primaryLanguage: string;
//   frameworks: any[];
//   testingFrameworks: any[];
//   dependencies: any;
//   devopsTools?: DevOpsToolProfile;
// }

interface DevOpsToolProfile {
  containerization: ContainerTechnology[];
  orchestration: OrchestrationTechnology[];
  cicd: CICDTechnology[];
  configuration: ConfigManagementTechnology[];
  monitoring: MonitoringTechnology[];
  security: SecurityTechnology[];
}

interface ContainerTechnology {
  name: string;
  version?: string;
  configFiles: string[];
  usage: string;
}

interface OrchestrationTechnology {
  name: string;
  manifests?: string[];
  resources?: string[];
  namespaces?: string[];
}

interface CICDTechnology {
  name: string;
  pipelines?: string[];
  tasks?: string[];
  triggers?: string[];
}

interface ConfigManagementTechnology {
  name: string;
  playbooks?: string[];
  roles?: string[];
  inventory?: string[];
  vaultFiles?: string[];
}

interface MonitoringTechnology {
  name: string;
}

interface SecurityTechnology {
  name: string;
}

// Interfaces for future extensibility
// interface LanguageContentGenerator {
//   detectFrameworks(analysis: any): any[];
//   generateContent(frameworks: any[], context: ProjectContext): any;
// }

// interface DevOpsContentGenerator {
//   detectDevOpsTools(analysis: any): DevOpsToolProfile;
//   generateDevOpsContent(tools: DevOpsToolProfile, context: ProjectContext): any;
// }

interface PopulationResult {
  success: boolean;
  filesCreated: number;
  contentPlan: ContentPlan;
  populationMetrics: {
    coverage: number;
    completeness: number;
    projectSpecificity: number;
  };
  nextSteps: string[];
}

class ContentPopulationEngine {
  // private analysisCache: Map<string, any> = new Map();  // For future caching
  // private devopsGenerator: DevOpsContentGenerator;  // For future extensibility

  async populateContent(options: PopulationOptions): Promise<PopulationResult> {
    // 1. Retrieve and validate repository analysis
    const analysis = await this.getRepositoryAnalysis(options.analysisId);

    // 2. Generate content plan based on project characteristics
    const contentPlan = await this.generateContentPlan(analysis, options.populationLevel);

    // 3. Generate content for each Diataxis category
    const tutorials = await this.generateTutorialContent(contentPlan.tutorials, analysis);
    const howTos = await this.generateHowToContent(contentPlan.howToGuides, analysis);
    const reference = await this.generateReferenceContent(contentPlan.reference, analysis);
    const explanation = await this.generateExplanationContent(contentPlan.explanation, analysis);

    // 4. Write content to documentation structure
    const filesCreated = await this.writeContentToStructure(
      options.docsPath,
      { tutorials, howTos, reference, explanation },
      options.preserveExisting,
    );

    // 5. Generate cross-references and navigation updates
    await this.updateNavigationAndCrossReferences(options.docsPath, contentPlan);

    return {
      success: true,
      filesCreated,
      contentPlan,
      populationMetrics: this.calculatePopulationMetrics(filesCreated, contentPlan),
      nextSteps: this.generateNextSteps(analysis, contentPlan),
    };
  }

  private async getRepositoryAnalysis(analysisId: string): Promise<any> {
    // In a real implementation, this would retrieve from a persistent store
    // For now, we'll read from a cached analysis file if it exists
    const analysisPath = path.join('.documcp', 'analyses', `${analysisId}.json`);

    try {
      const content = await fs.readFile(analysisPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Return a mock analysis for development
      return this.getMockAnalysis();
    }
  }

  private getMockAnalysis(): any {
    return {
      metadata: {
        projectName: 'documcp',
        primaryLanguage: 'TypeScript',
        ecosystem: 'Node.js',
      },
      technologies: {
        runtime: 'Node.js',
        framework: null,
        testing: ['Jest'],
        database: null,
        deployment: ['GitHub Actions'],
      },
      dependencies: {
        packages: ['@modelcontextprotocol/sdk', 'typescript', 'jest'],
        ecosystem: 'npm',
      },
      structure: {
        hasTests: true,
        hasDocs: true,
        hasCI: true,
      },
    };
  }

  private async generateContentPlan(analysis: any, level: string): Promise<ContentPlan> {
    const plan: ContentPlan = {
      tutorials: [],
      howToGuides: [],
      reference: [],
      explanation: [],
    };

    // Generate tutorials based on project type
    plan.tutorials = this.generateTutorialPlan(analysis, level);

    // Generate how-to guides for common tasks
    plan.howToGuides = this.generateHowToPlan(analysis, level);

    // Generate reference documentation
    plan.reference = this.generateReferencePlan(analysis, level);

    // Generate explanation content
    plan.explanation = this.generateExplanationPlan(analysis, level);

    return plan;
  }

  private generateTutorialPlan(analysis: any, _level: string): TutorialContent[] {
    const tutorials: TutorialContent[] = [];

    // Always include getting started
    tutorials.push({
      title: `Getting Started with ${analysis.metadata.projectName}`,
      description: `Learn ${analysis.metadata.primaryLanguage} development with ${analysis.metadata.projectName}`,
      content: this.generateGettingStartedContent(analysis),
      codeExamples: this.generateGettingStartedExamples(analysis),
    });

    // Add technology-specific tutorials
    if (analysis.metadata.ecosystem === 'Node.js') {
      tutorials.push({
        title: 'Setting Up Your Development Environment',
        description: 'Configure Node.js and TypeScript for development',
        content: this.generateNodeSetupContent(analysis),
        codeExamples: this.generateNodeSetupExamples(),
      });
    }

    // Add testing tutorial if tests detected
    if (analysis.structure.hasTests) {
      tutorials.push({
        title: 'Writing and Running Tests',
        description: 'Learn how to test your code effectively',
        content: this.generateTestingTutorialContent(analysis),
        codeExamples: this.generateTestingExamples(analysis),
      });
    }

    // Add DevOps tutorials based on detected tools
    const devopsTools = this.detectDevOpsTools(analysis);
    if (devopsTools.containerization.length > 0) {
      const containerTech = devopsTools.containerization[0];
      tutorials.push({
        title: `Containerizing ${analysis.metadata.projectName} with ${containerTech.name}`,
        description: `Learn how to containerize your application using ${containerTech.name}`,
        content: this.generateContainerTutorialContent(analysis, containerTech),
        codeExamples: this.generateContainerExamples(analysis, containerTech),
      });
    }

    if (devopsTools.orchestration.length > 0) {
      const orchestrationTech = devopsTools.orchestration[0];
      tutorials.push({
        title: `Deploying to ${orchestrationTech.name}`,
        description: `Deploy your application to ${orchestrationTech.name}`,
        content: this.generateOrchestrationTutorialContent(analysis, orchestrationTech),
        codeExamples: this.generateOrchestrationExamples(analysis, orchestrationTech),
      });
    }

    // Python-specific tutorials
    if (analysis.metadata.primaryLanguage === 'Python') {
      tutorials.push({
        title: 'Python Virtual Environment Setup',
        description: 'Set up isolated Python development environment',
        content: this.generatePythonEnvironmentContent(analysis),
        codeExamples: this.generatePythonEnvironmentExamples(),
      });

      // Python framework-specific tutorials
      const pythonFrameworks = this.detectPythonFrameworks(analysis);
      pythonFrameworks.forEach((framework) => {
        tutorials.push({
          title: `Building Applications with ${framework.name}`,
          description: `Complete guide to ${framework.name} development`,
          content: this.generatePythonFrameworkTutorialContent(analysis, framework),
          codeExamples: this.generatePythonFrameworkExamples(framework),
        });
      });
    }

    return tutorials;
  }

  private generateHowToPlan(analysis: any, _level: string): any[] {
    const howTos: any[] = [];

    // Common development tasks
    howTos.push({
      title: 'How to Add a New Feature',
      content: this.generateFeatureGuideContent(analysis),
    });

    howTos.push({
      title: 'How to Debug Common Issues',
      content: this.generateDebuggingGuideContent(analysis),
    });

    // Deployment guides if CI detected
    if (analysis.structure.hasCI) {
      howTos.push({
        title: 'How to Deploy Your Application',
        content: this.generateDeploymentGuideContent(analysis),
      });
    }

    return howTos;
  }

  private generateReferencePlan(analysis: any, _level: string): any[] {
    const reference: any[] = [];

    // API reference
    reference.push({
      title: 'API Reference',
      content: this.generateAPIReference(analysis),
    });

    // Configuration reference
    reference.push({
      title: 'Configuration Options',
      content: this.generateConfigReference(analysis),
    });

    // CLI reference if applicable
    reference.push({
      title: 'Command Line Interface',
      content: this.generateCLIReference(analysis),
    });

    return reference;
  }

  private generateExplanationPlan(analysis: any, _level: string): any[] {
    const explanations: any[] = [];

    // Architecture overview
    explanations.push({
      title: 'Architecture Overview',
      content: this.generateArchitectureContent(analysis),
    });

    // Design decisions
    explanations.push({
      title: 'Design Decisions',
      content: this.generateDesignDecisionsContent(analysis),
    });

    // Technology choices
    explanations.push({
      title: 'Technology Stack',
      content: this.generateTechnologyStackContent(analysis),
    });

    return explanations;
  }

  // Content generation methods
  private generateGettingStartedContent(_analysis: any): string {
    return `# Getting Started with ${_analysis.metadata.projectName}

Welcome to ${_analysis.metadata.projectName}! This tutorial will guide you through setting up and running the project for the first time.

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (version 18 or higher)
- npm or yarn package manager
- Git for version control

## Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd ${_analysis.metadata.projectName}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

## Running the Project

Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Verifying Your Setup

Run the test suite to ensure everything is working:
\`\`\`bash
npm test
\`\`\`

## Next Steps

- Explore the [Architecture Overview](../explanation/architecture.md)
- Learn about [Adding New Features](../how-to/add-feature.md)
- Check the [API Reference](../reference/api.md)
`;
  }

  private generateGettingStartedExamples(_analysis: any): string[] {
    return [
      `// Example: Basic usage
import { initialize } from './${_analysis.metadata.projectName}';

const app = initialize({
  // Configuration options
});

app.start();`,

      `// Example: TypeScript configuration
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}`,
    ];
  }

  private generateNodeSetupContent(_analysis: any): string {
    return `# Setting Up Your Development Environment

This guide will help you configure a complete Node.js and TypeScript development environment.

## Installing Node.js

### Using Node Version Manager (nvm)

1. Install nvm:
   \`\`\`bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   \`\`\`

2. Install and use the correct Node.js version:
   \`\`\`bash
   nvm install 18
   nvm use 18
   \`\`\`

## TypeScript Setup

1. Install TypeScript globally:
   \`\`\`bash
   npm install -g typescript
   \`\`\`

2. Initialize TypeScript configuration:
   \`\`\`bash
   npx tsc --init
   \`\`\`

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens

### Debugging Configuration

Create a \`.vscode/launch.json\` file:
\`\`\`json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "skipFiles": ["<node_internals>/**"],
      "program": "\${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["\${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
\`\`\`
`;
  }

  private generateNodeSetupExamples(): string[] {
    return [
      `// package.json scripts
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  }
}`,
    ];
  }

  private generateTestingTutorialContent(_analysis: any): string {
    const testFramework = _analysis.technologies.testing?.[0] || 'Jest';

    return `# Writing and Running Tests

Learn how to write effective tests for your ${_analysis.metadata.projectName} code using ${testFramework}.

## Test Structure

Tests should follow the AAA pattern:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the code being tested
- **Assert**: Verify the results

## Writing Your First Test

Create a test file with the \`.test.ts\` extension:

\`\`\`typescript
// example.test.ts
describe('Example Module', () => {
  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = exampleFunction(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
\`\`\`

## Running Tests

Execute all tests:
\`\`\`bash
npm test
\`\`\`

Run tests in watch mode:
\`\`\`bash
npm test -- --watch
\`\`\`

## Test Coverage

Generate a coverage report:
\`\`\`bash
npm test -- --coverage
\`\`\`

## Best Practices

1. **Test behavior, not implementation**: Focus on what the code does, not how
2. **Keep tests simple**: Each test should verify one thing
3. **Use descriptive names**: Test names should explain what is being tested
4. **Maintain test independence**: Tests should not depend on each other
`;
  }

  private generateTestingExamples(_analysis: any): string[] {
    return [
      `// Unit test example
import { calculateTotal } from './calculator';

describe('Calculator', () => {
  describe('calculateTotal', () => {
    it('should sum all numbers correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const result = calculateTotal(numbers);
      expect(result).toBe(15);
    });

    it('should handle empty arrays', () => {
      const result = calculateTotal([]);
      expect(result).toBe(0);
    });

    it('should handle negative numbers', () => {
      const numbers = [-1, -2, 3];
      const result = calculateTotal(numbers);
      expect(result).toBe(0);
    });
  });
});`,

      `// Integration test example
import request from 'supertest';
import { app } from './app';

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });
  });
});`,
    ];
  }

  private generateFeatureGuideContent(_analysis: any): string {
    return `# How to Add a New Feature

This guide walks you through the process of adding a new feature to ${_analysis.metadata.projectName}.

## Step 1: Plan Your Feature

Before writing code:
1. Define the feature requirements
2. Consider the impact on existing functionality
3. Plan the implementation approach

## Step 2: Create a Feature Branch

\`\`\`bash
git checkout -b feature/your-feature-name
\`\`\`

## Step 3: Implement the Feature

1. Write the core functionality
2. Add appropriate error handling
3. Include logging for debugging

## Step 4: Write Tests

Create tests for your new feature:
- Unit tests for individual functions
- Integration tests for feature workflows
- Edge case testing

## Step 5: Update Documentation

- Add API documentation if applicable
- Update user guides
- Include code examples

## Step 6: Submit for Review

1. Push your branch:
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`

2. Create a pull request
3. Address review feedback

## Best Practices

- Keep changes focused and atomic
- Follow existing code patterns
- Maintain backward compatibility
- Consider performance implications
`;
  }

  private generateDebuggingGuideContent(_analysis: any): string {
    return `# How to Debug Common Issues

This guide helps you troubleshoot and debug common issues in ${_analysis.metadata.projectName}.

## Debugging Tools

### Using the Built-in Debugger

1. Set breakpoints in your code
2. Run with debugging enabled:
   \`\`\`bash
   node --inspect src/index.js
   \`\`\`
3. Connect your debugger (VS Code, Chrome DevTools, etc.)

### Logging

Enable verbose logging:
\`\`\`bash
DEBUG=* npm start
\`\`\`

## Common Issues and Solutions

### Issue: Module Not Found

**Symptoms**: Error message "Cannot find module"

**Solutions**:
1. Check if dependencies are installed: \`npm install\`
2. Verify import paths are correct
3. Check TypeScript path mappings in tsconfig.json

### Issue: Type Errors

**Symptoms**: TypeScript compilation errors

**Solutions**:
1. Run type checking: \`npm run typecheck\`
2. Update type definitions: \`npm install @types/package-name\`
3. Check for version mismatches

### Issue: Test Failures

**Symptoms**: Tests failing unexpectedly

**Solutions**:
1. Run tests in isolation
2. Check for race conditions
3. Verify test data setup

## Performance Debugging

### Memory Leaks

Use heap snapshots:
\`\`\`bash
node --expose-gc --inspect src/index.js
\`\`\`

### Slow Performance

Profile your application:
\`\`\`bash
node --prof src/index.js
\`\`\`

## Getting Help

If you're still stuck:
1. Check the [FAQ](../reference/faq.md)
2. Search existing issues on GitHub
3. Ask in the community forum
`;
  }

  private generateDeploymentGuideContent(_analysis: any): string {
    return `# How to Deploy Your Application

This guide covers deployment options and best practices for ${_analysis.metadata.projectName}.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Production dependencies installed
- [ ] Build process successful
- [ ] Security vulnerabilities addressed

## Deployment Options

### Option 1: GitHub Pages (Static Sites)

1. Build your application:
   \`\`\`bash
   npm run build
   \`\`\`

2. Deploy to GitHub Pages:
   \`\`\`bash
   npm run deploy
   \`\`\`

### Option 2: Cloud Platforms

#### Vercel
\`\`\`bash
vercel --prod
\`\`\`

#### Netlify
\`\`\`bash
netlify deploy --prod
\`\`\`

#### Heroku
\`\`\`bash
git push heroku main
\`\`\`

### Option 3: Docker Container

1. Build the Docker image:
   \`\`\`bash
   docker build -t ${_analysis.metadata.projectName} .
   \`\`\`

2. Run the container:
   \`\`\`bash
   docker run -p 3000:3000 ${_analysis.metadata.projectName}
   \`\`\`

## Continuous Deployment

### GitHub Actions

Create \`.github/workflows/deploy.yml\`:
\`\`\`yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
\`\`\`

## Post-Deployment

1. Verify deployment success
2. Run smoke tests
3. Monitor application logs
4. Check performance metrics
`;
  }

  private generateAPIReference(analysis: any): string {
    return `# API Reference

Complete reference for ${analysis.metadata.projectName} APIs.

## Core APIs

### initialize(options)

Initialize the application with the given options.

**Parameters:**
- \`options\` (Object): Configuration options
  - \`port\` (number): Server port (default: 3000)
  - \`host\` (string): Server host (default: 'localhost')
  - \`debug\` (boolean): Enable debug mode (default: false)

**Returns:**
- \`Application\`: Application instance

**Example:**
\`\`\`typescript
const app = initialize({
  port: 8080,
  debug: true
});
\`\`\`

### start()

Start the application server.

**Returns:**
- \`Promise<void>\`: Resolves when server is running

**Example:**
\`\`\`typescript
await app.start();
console.log('Server running');
\`\`\`

### stop()

Stop the application server.

**Returns:**
- \`Promise<void>\`: Resolves when server is stopped

**Example:**
\`\`\`typescript
await app.stop();
console.log('Server stopped');
\`\`\`

## Events

### 'ready'

Emitted when the application is ready to accept connections.

\`\`\`typescript
app.on('ready', () => {
  console.log('Application ready');
});
\`\`\`

### 'error'

Emitted when an error occurs.

\`\`\`typescript
app.on('error', (error) => {
  console.error('Application error:', error);
});
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| ERR_INVALID_CONFIG | Invalid configuration provided |
| ERR_PORT_IN_USE | Specified port is already in use |
| ERR_STARTUP_FAILED | Application failed to start |
`;
  }

  private generateConfigReference(analysis: any): string {
    return `# Configuration Reference

Complete guide to configuring ${analysis.metadata.projectName}.

## Configuration File

Configuration can be provided via:
1. Environment variables
2. Configuration file (config.json)
3. Command-line arguments

## Configuration Options

### Server Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`server.port\` | number | 3000 | Server port |
| \`server.host\` | string | 'localhost' | Server host |
| \`server.timeout\` | number | 30000 | Request timeout (ms) |

### Database Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`database.host\` | string | 'localhost' | Database host |
| \`database.port\` | number | 5432 | Database port |
| \`database.name\` | string | 'myapp' | Database name |
| \`database.pool.min\` | number | 2 | Minimum pool connections |
| \`database.pool.max\` | number | 10 | Maximum pool connections |

### Logging Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`logging.level\` | string | 'info' | Log level (debug, info, warn, error) |
| \`logging.format\` | string | 'json' | Log format (json, text) |
| \`logging.destination\` | string | 'stdout' | Log destination |

## Environment Variables

All configuration options can be set via environment variables:

\`\`\`bash
# Server
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Logging
LOG_LEVEL=debug
\`\`\`

## Configuration File Example

\`\`\`json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
\`\`\`
`;
  }

  private generateCLIReference(analysis: any): string {
    return `# Command Line Interface

Reference for ${analysis.metadata.projectName} CLI commands.

## Global Options

| Option | Description |
|--------|-------------|
| \`--help, -h\` | Show help information |
| \`--version, -v\` | Show version number |
| \`--verbose\` | Enable verbose output |
| \`--quiet\` | Suppress non-error output |

## Commands

### start

Start the application.

\`\`\`bash
${analysis.metadata.projectName} start [options]
\`\`\`

**Options:**
- \`--port, -p <port>\`: Server port (default: 3000)
- \`--host, -h <host>\`: Server host (default: localhost)
- \`--config, -c <file>\`: Configuration file path

### build

Build the application for production.

\`\`\`bash
${analysis.metadata.projectName} build [options]
\`\`\`

**Options:**
- \`--output, -o <dir>\`: Output directory (default: dist)
- \`--minify\`: Minify output
- \`--sourcemap\`: Generate source maps

### test

Run tests.

\`\`\`bash
${analysis.metadata.projectName} test [options]
\`\`\`

**Options:**
- \`--watch, -w\`: Run in watch mode
- \`--coverage\`: Generate coverage report
- \`--bail\`: Stop on first test failure

### lint

Run linting checks.

\`\`\`bash
${analysis.metadata.projectName} lint [options]
\`\`\`

**Options:**
- \`--fix\`: Automatically fix issues
- \`--format <format>\`: Output format (stylish, json, compact)

## Examples

### Starting with custom configuration
\`\`\`bash
${analysis.metadata.projectName} start --config production.json --port 8080
\`\`\`

### Running tests with coverage
\`\`\`bash
${analysis.metadata.projectName} test --coverage --watch
\`\`\`

### Building for production
\`\`\`bash
${analysis.metadata.projectName} build --minify --output ./production
\`\`\`
`;
  }

  private generateArchitectureContent(_analysis: any): string {
    return `# Architecture Overview

Understanding the architecture of ${_analysis.metadata.projectName}.

## System Architecture

${_analysis.metadata.projectName} follows a modular architecture designed for scalability and maintainability.

### Core Components

1. **Core Engine**: The main processing engine that handles all operations
2. **Plugin System**: Extensible plugin architecture for custom functionality
3. **API Layer**: RESTful API for external integrations
4. **Data Layer**: Abstracted data access layer

## Design Principles

### Separation of Concerns

Each module has a single, well-defined responsibility:
- Business logic is separated from presentation
- Data access is abstracted from business logic
- External dependencies are isolated

### Dependency Injection

Dependencies are injected rather than hard-coded:
- Improves testability
- Enables easier mocking
- Supports multiple implementations

### Event-Driven Architecture

Components communicate through events:
- Loose coupling between modules
- Asynchronous processing capabilities
- Scalable message handling

## Directory Structure

\`\`\`
${_analysis.metadata.projectName}/
├── src/
│   ├── core/           # Core functionality
│   ├── plugins/        # Plugin implementations
│   ├── api/           # API endpoints
│   ├── services/      # Business services
│   ├── models/        # Data models
│   └── utils/         # Utility functions
├── tests/             # Test files
├── docs/              # Documentation
└── config/            # Configuration files
\`\`\`

## Data Flow

1. **Request Reception**: API receives incoming requests
2. **Validation**: Input validation and sanitization
3. **Processing**: Business logic execution
4. **Data Access**: Database operations if needed
5. **Response Generation**: Format and return response

## Scalability Considerations

### Horizontal Scaling

The application supports horizontal scaling through:
- Stateless design
- Load balancer compatibility
- Distributed caching support

### Performance Optimization

- Lazy loading of modules
- Caching strategies
- Database connection pooling
- Asynchronous operations

## Security Architecture

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- API key management

### Data Protection

- Encryption at rest and in transit
- Input validation and sanitization
- SQL injection prevention
- XSS protection
`;
  }

  private generateDesignDecisionsContent(_analysis: any): string {
    return `# Design Decisions

Key architectural and design decisions made in ${_analysis.metadata.projectName}.

## Technology Stack

### Why ${_analysis.metadata.primaryLanguage}?

We chose ${_analysis.metadata.primaryLanguage} for:
- Strong type safety
- Excellent tooling support
- Large ecosystem of libraries
- Good performance characteristics
- Team familiarity

### Framework Selection

After evaluating multiple options, we selected our current stack based on:
- Community support and documentation
- Performance benchmarks
- Learning curve for new developers
- Long-term maintenance considerations

## Architectural Patterns

### Repository Pattern

We implement the repository pattern for data access:
- **Benefit**: Abstracts data source details
- **Trade-off**: Additional abstraction layer
- **Rationale**: Enables easy switching between data sources

### Service Layer

Business logic is encapsulated in services:
- **Benefit**: Reusable business logic
- **Trade-off**: More files and complexity
- **Rationale**: Clear separation of concerns

### Dependency Injection

We use dependency injection throughout:
- **Benefit**: Improved testability and flexibility
- **Trade-off**: Initial setup complexity
- **Rationale**: Essential for large-scale applications

## API Design

### RESTful vs GraphQL

We chose REST because:
- Simpler to implement and understand
- Better caching strategies
- Fits our use case well
- Lower operational complexity

### Versioning Strategy

API versioning through URL paths:
- **Format**: /api/v1/resource
- **Benefit**: Clear version boundaries
- **Trade-off**: URL complexity
- **Rationale**: Industry standard approach

## Database Decisions

### SQL vs NoSQL

We use SQL for:
- ACID compliance requirements
- Complex relational data
- Mature tooling and expertise
- Predictable performance

### Migration Strategy

Database migrations are managed through:
- Version-controlled migration files
- Automated migration on deployment
- Rollback capabilities
- Data validation steps

## Testing Strategy

### Test Pyramid

Our testing approach follows the test pyramid:
- Many unit tests (fast, isolated)
- Some integration tests (component interaction)
- Few E2E tests (full system validation)

### Coverage Goals

- Unit test coverage: 80% minimum
- Critical path coverage: 100%
- Integration test coverage: Key workflows

## Performance Decisions

### Caching Strategy

Multi-level caching approach:
- Application-level caching
- Database query caching
- CDN for static assets
- Redis for session data

### Async Processing

Background jobs for:
- Email sending
- Report generation
- Data processing
- Third-party integrations

## Security Decisions

### Authentication Method

JWT tokens because:
- Stateless authentication
- Scalable across services
- Standard implementation
- Good library support

### Data Encryption

- Passwords: bcrypt with salt rounds
- Sensitive data: AES-256 encryption
- Communications: TLS 1.3
- Secrets: Environment variables

## Future Considerations

### Microservices

Currently monolithic, but designed for potential splitting:
- Clear module boundaries
- Service-oriented architecture
- Database per service capability
- API gateway ready

### Cloud Native

Prepared for cloud deployment:
- 12-factor app principles
- Container-ready architecture
- Environment-based configuration
- Stateless design
`;
  }

  private generateTechnologyStackContent(_analysis: any): string {
    return `# Technology Stack

Complete overview of technologies used in ${_analysis.metadata.projectName}.

## Core Technologies

### Runtime & Language
- **${_analysis.metadata.primaryLanguage}**: Primary development language
- **${_analysis.metadata.ecosystem}**: Runtime environment
- **TypeScript**: Type-safe JavaScript development

### Package Management
- **npm/yarn**: Dependency management
- **npx**: Package execution
- **nvm**: Node version management

## Development Tools

### Build Tools
- **TypeScript Compiler**: Transpilation to JavaScript
- **Webpack/Rollup**: Module bundling
- **Babel**: JavaScript transformation

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit checks

### Testing
${
  _analysis.technologies.testing?.map((t: string) => `- **${t}**: Testing framework`).join('\\n') ||
  '- **Jest**: Testing framework'
}
- **Supertest**: API testing
- **Coverage tools**: Code coverage reporting

## Infrastructure

### Version Control
- **Git**: Source control
- **GitHub**: Repository hosting
- **GitHub Actions**: CI/CD pipelines

### Deployment
${
  _analysis.technologies.deployment
    ?.map((t: string) => `- **${t}**: Deployment platform`)
    .join('\\n') || '- **Docker**: Containerization'
}
- **GitHub Pages**: Documentation hosting

### Monitoring
- **Application logs**: Custom logging
- **Error tracking**: Error monitoring
- **Performance monitoring**: APM tools

## Dependencies

### Core Dependencies
\`\`\`json
${JSON.stringify(_analysis.dependencies.packages?.slice(0, 5) || [], null, 2)}
\`\`\`

### Development Dependencies
- Testing frameworks
- Build tools
- Linting tools
- Type definitions

## Database & Storage

${
  _analysis.technologies.database
    ? `### Database
- **${_analysis.technologies.database}**: Primary database
- **Migration tools**: Database versioning
- **ORMs/Query builders**: Data access layer`
    : `### Storage
- File system for local development
- Cloud storage for production
- Caching layers for performance`
}

## External Services

### Third-party APIs
- Authentication services
- Payment processing
- Email services
- Analytics

### Cloud Services
- Hosting platforms
- CDN services
- Backup solutions
- Monitoring services

## Security Tools

### Development Security
- **Dependency scanning**: npm audit
- **Secret management**: Environment variables
- **Security headers**: Helmet.js
- **Input validation**: Sanitization libraries

### Production Security
- **TLS/SSL**: Encrypted communications
- **WAF**: Web application firewall
- **DDoS protection**: Rate limiting
- **Access control**: Authentication/authorization

## Documentation Tools

### Documentation Generation
- **Markdown**: Documentation format
- **Static site generators**: Documentation hosting
- **API documentation**: OpenAPI/Swagger
- **Code documentation**: JSDoc/TypeDoc

## Development Environment

### Recommended IDE
- **VS Code**: Primary development environment
- **Extensions**: Language support, debugging
- **Configuration**: Shared team settings

### Local Development
- **Hot reloading**: Development server
- **Debugging tools**: Chrome DevTools, VS Code debugger
- **Database tools**: Local database management
- **API testing**: Postman/Insomnia

## Upgrade Path

### Version Management
- Regular dependency updates
- Security patch monitoring
- Breaking change management
- Deprecation handling

### Future Technologies
- Considering adoption of:
  - New framework versions
  - Performance improvements
  - Developer experience enhancements
  - Security improvements
`;
  }

  private async generateTutorialContent(tutorials: any[], _analysis: any): Promise<any[]> {
    // Transform tutorial plans into actual content
    return tutorials;
  }

  private async generateHowToContent(howTos: any[], _analysis: any): Promise<any[]> {
    return howTos;
  }

  private async generateReferenceContent(reference: any[], _analysis: any): Promise<any[]> {
    return reference;
  }

  private async generateExplanationContent(explanation: any[], _analysis: any): Promise<any[]> {
    return explanation;
  }

  private async writeContentToStructure(
    docsPath: string,
    content: any,
    preserveExisting: boolean,
  ): Promise<number> {
    let filesCreated = 0;

    // Create directory structure if it doesn't exist
    const dirs = ['tutorials', 'how-to', 'reference', 'explanation'];
    for (const dir of dirs) {
      const dirPath = path.join(docsPath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Write tutorial content
    for (const tutorial of content.tutorials) {
      const fileName = this.slugify(tutorial.title) + '.md';
      const filePath = path.join(docsPath, 'tutorials', fileName);

      if (preserveExisting) {
        try {
          await fs.access(filePath);
          continue; // Skip if file exists
        } catch {
          // File doesn't exist, proceed to write
        }
      }

      await fs.writeFile(filePath, tutorial.content, 'utf-8');
      filesCreated++;
    }

    // Write how-to guides
    for (const howTo of content.howTos) {
      const fileName = this.slugify(howTo.title) + '.md';
      const filePath = path.join(docsPath, 'how-to', fileName);

      if (preserveExisting) {
        try {
          await fs.access(filePath);
          continue;
        } catch {
          // File doesn't exist, proceed with creation
        }
      }

      await fs.writeFile(filePath, howTo.content, 'utf-8');
      filesCreated++;
    }

    // Write reference documentation
    for (const ref of content.reference) {
      const fileName = this.slugify(ref.title) + '.md';
      const filePath = path.join(docsPath, 'reference', fileName);

      if (preserveExisting) {
        try {
          await fs.access(filePath);
          continue;
        } catch {
          // File doesn't exist, proceed with creation
        }
      }

      await fs.writeFile(filePath, ref.content, 'utf-8');
      filesCreated++;
    }

    // Write explanation content
    for (const exp of content.explanation) {
      const fileName = this.slugify(exp.title) + '.md';
      const filePath = path.join(docsPath, 'explanation', fileName);

      if (preserveExisting) {
        try {
          await fs.access(filePath);
          continue;
        } catch {
          // File doesn't exist, proceed with creation
        }
      }

      await fs.writeFile(filePath, exp.content, 'utf-8');
      filesCreated++;
    }

    return filesCreated;
  }

  private async updateNavigationAndCrossReferences(
    docsPath: string,
    contentPlan: ContentPlan,
  ): Promise<void> {
    // Create main index file with navigation
    const indexContent = `# Documentation

Welcome to the documentation! This comprehensive guide is organized following the Diataxis framework.

## 📚 Learning-Oriented: Tutorials

Start here if you're new to the project:
${contentPlan.tutorials
  .map((t) => `- [${t.title}](tutorials/${this.slugify(t.title)}.md)`)
  .join('\\n')}

## 🔧 Task-Oriented: How-To Guides

Practical guides for specific tasks:
${contentPlan.howToGuides
  .map((h) => `- [${h.title}](how-to/${this.slugify(h.title)}.md)`)
  .join('\\n')}

## 📖 Information-Oriented: Reference

Detailed technical reference:
${contentPlan.reference
  .map((r) => `- [${r.title}](reference/${this.slugify(r.title)}.md)`)
  .join('\\n')}

## 💡 Understanding-Oriented: Explanation

Conceptual documentation and background:
${contentPlan.explanation
  .map((e) => `- [${e.title}](explanation/${this.slugify(e.title)}.md)`)
  .join('\\n')}
`;

    await fs.writeFile(path.join(docsPath, 'index.md'), indexContent, 'utf-8');
  }

  private calculatePopulationMetrics(filesCreated: number, contentPlan: ContentPlan): any {
    const totalPlanned =
      contentPlan.tutorials.length +
      contentPlan.howToGuides.length +
      contentPlan.reference.length +
      contentPlan.explanation.length;

    return {
      coverage: (filesCreated / totalPlanned) * 100,
      completeness: 85, // Example metric
      projectSpecificity: 75, // Example metric
    };
  }

  private generateNextSteps(_analysis: any, _contentPlan: ContentPlan): string[] {
    return [
      'Review and customize the generated content',
      'Add project-specific examples and use cases',
      'Validate technical accuracy of code examples',
      'Add screenshots and diagrams where helpful',
      'Test all commands and code snippets',
      'Set up automated documentation deployment',
    ];
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }

  // DevOps Detection Methods
  private detectDevOpsTools(analysis: any): DevOpsToolProfile {
    return {
      containerization: this.detectContainerization(analysis),
      orchestration: this.detectOrchestration(analysis),
      cicd: this.detectCICD(analysis),
      configuration: this.detectConfigManagement(analysis),
      monitoring: this.detectMonitoring(analysis),
      security: this.detectSecurity(analysis),
    };
  }

  private detectContainerization(analysis: any): ContainerTechnology[] {
    const detected: ContainerTechnology[] = [];
    const files = analysis.files || [];

    // Docker detection
    if (
      files.some((f: any) => f.name === 'Dockerfile') ||
      files.some((f: any) => f.name === 'docker-compose.yml') ||
      files.some((f: any) => f.name === 'docker-compose.yaml')
    ) {
      detected.push({
        name: 'docker',
        version: this.extractDockerVersion(analysis),
        configFiles: this.getDockerFiles(analysis),
        usage: 'containerization',
      });
    }

    // Podman detection
    if (
      files.some((f: any) => f.name === 'Containerfile') ||
      files.some((f: any) => f.name === 'podman-compose.yml')
    ) {
      detected.push({
        name: 'podman',
        configFiles: this.getPodmanFiles(analysis),
        usage: 'containerization',
      });
    }

    return detected;
  }

  private detectOrchestration(analysis: any): OrchestrationTechnology[] {
    const detected: OrchestrationTechnology[] = [];
    const files = analysis.files || [];

    // Kubernetes detection
    if (files.some((f: any) => f.path?.includes('k8s/') || f.path?.includes('kubernetes/'))) {
      detected.push({
        name: 'kubernetes',
        manifests: this.getKubernetesManifests(analysis),
        resources: this.analyzeKubernetesResources(analysis),
        namespaces: this.extractNamespaces(analysis),
      });
    }

    // OpenShift detection
    if (
      files.some((f: any) => f.path?.includes('.s2i/')) ||
      this.hasFileContent(analysis, 'kind: DeploymentConfig')
    ) {
      detected.push({
        name: 'openshift',
      });
    }

    return detected;
  }

  private detectCICD(analysis: any): CICDTechnology[] {
    const detected: CICDTechnology[] = [];
    const files = analysis.files || [];

    // GitHub Actions detection
    if (files.some((f: any) => f.path?.includes('.github/workflows/'))) {
      detected.push({
        name: 'github-actions',
      });
    }

    // Tekton detection
    if (
      files.some((f: any) => f.path?.includes('.tekton/')) ||
      this.hasFileContent(analysis, 'apiVersion: tekton.dev')
    ) {
      detected.push({
        name: 'tekton',
      });
    }

    return detected;
  }

  private detectConfigManagement(analysis: any): ConfigManagementTechnology[] {
    const detected: ConfigManagementTechnology[] = [];
    const files = analysis.files || [];

    // Ansible detection
    if (
      files.some((f: any) => f.name === 'ansible.cfg') ||
      files.some((f: any) => f.path?.includes('playbooks/')) ||
      files.some((f: any) => f.path?.includes('roles/'))
    ) {
      detected.push({
        name: 'ansible',
        playbooks: this.getAnsiblePlaybooks(analysis),
        roles: this.getAnsibleRoles(analysis),
      });
    }

    // Terraform detection
    if (files.some((f: any) => f.name?.endsWith('.tf'))) {
      detected.push({
        name: 'terraform',
      });
    }

    return detected;
  }

  private detectMonitoring(analysis: any): MonitoringTechnology[] {
    const detected: MonitoringTechnology[] = [];

    if (this.hasFileContent(analysis, 'prometheus')) {
      detected.push({ name: 'prometheus' });
    }

    if (this.hasFileContent(analysis, 'grafana')) {
      detected.push({ name: 'grafana' });
    }

    return detected;
  }

  private detectSecurity(analysis: any): SecurityTechnology[] {
    const detected: SecurityTechnology[] = [];

    if (this.hasFileContent(analysis, 'falco')) {
      detected.push({ name: 'falco' });
    }

    return detected;
  }

  // Python Framework Detection
  private detectPythonFrameworks(analysis: any): any[] {
    const frameworks: any[] = [];
    const dependencies = analysis.dependencies?.packages || [];

    if (dependencies.includes('django')) {
      frameworks.push({ name: 'django', type: 'web-framework' });
    }

    if (dependencies.includes('fastapi')) {
      frameworks.push({ name: 'fastapi', type: 'web-framework' });
    }

    if (dependencies.includes('flask')) {
      frameworks.push({ name: 'flask', type: 'web-framework' });
    }

    return frameworks;
  }

  // Helper methods for file detection
  private hasFileContent(analysis: any, content: string): boolean {
    const files = analysis.files || [];
    return files.some((f: any) => f.content?.includes(content));
  }

  private extractDockerVersion(_analysis: any): string | undefined {
    return undefined; // Could be implemented to parse Dockerfile
  }

  private getDockerFiles(analysis: any): string[] {
    const files = analysis.files || [];
    return files
      .filter((f: any) => f.name === 'Dockerfile' || f.name.includes('docker-compose'))
      .map((f: any) => f.name);
  }

  private getPodmanFiles(analysis: any): string[] {
    const files = analysis.files || [];
    return files
      .filter((f: any) => f.name === 'Containerfile' || f.name.includes('podman-compose'))
      .map((f: any) => f.name);
  }

  private getKubernetesManifests(analysis: any): string[] {
    const files = analysis.files || [];
    return files
      .filter((f: any) => f.path?.includes('k8s/') || f.path?.includes('kubernetes/'))
      .map((f: any) => f.name);
  }

  private analyzeKubernetesResources(_analysis: any): string[] {
    return ['Deployment', 'Service', 'ConfigMap']; // Simplified
  }

  private extractNamespaces(_analysis: any): string[] {
    return ['default']; // Simplified
  }

  private getAnsiblePlaybooks(analysis: any): string[] {
    const files = analysis.files || [];
    return files
      .filter((f: any) => f.path?.includes('playbooks/') && f.name?.endsWith('.yml'))
      .map((f: any) => f.name);
  }

  private getAnsibleRoles(analysis: any): string[] {
    const files = analysis.files || [];
    return files.filter((f: any) => f.path?.includes('roles/')).map((f: any) => f.name);
  }

  // Content generation methods for new features
  private generateContainerTutorialContent(
    _analysis: any,
    _containerTech: ContainerTechnology,
  ): string {
    return `# Containerizing ${_analysis.metadata.projectName} with ${_containerTech.name}

Learn how to package your ${
      _analysis.metadata.primaryLanguage
    } application into a container for consistent deployment across environments.

## Prerequisites

- ${_containerTech.name} installed on your system
- Basic understanding of containerization concepts
- Your application running locally

## Understanding Containerization

Containers provide a lightweight, portable way to package applications with all their dependencies. This ensures your application runs consistently across different environments.

## Creating a ${_containerTech.name === 'docker' ? 'Dockerfile' : 'Containerfile'}

1. Create a ${
      _containerTech.name === 'docker' ? 'Dockerfile' : 'Containerfile'
    } in your project root:

\`\`\`dockerfile
${this.generateContainerFileContent(_analysis, _containerTech)}
\`\`\`

## Building Your Container Image

\`\`\`bash
${_containerTech.name} build -t ${_analysis.metadata.projectName}:latest .
\`\`\`

## Running Your Container

\`\`\`bash
${_containerTech.name} run -p 3000:3000 ${_analysis.metadata.projectName}:latest
\`\`\`

## Best Practices

- Use multi-stage builds to reduce image size
- Don't run containers as root user
- Use .dockerignore to exclude unnecessary files
- Pin base image versions for reproducibility

## Next Steps

- Learn about container orchestration with Kubernetes
- Set up automated builds in CI/CD pipeline
- Implement health checks for production deployments
`;
  }

  private generateOrchestrationTutorialContent(
    _analysis: any,
    _orchestrationTech: OrchestrationTechnology,
  ): string {
    return `# Deploying ${_analysis.metadata.projectName} to ${_orchestrationTech.name}

Deploy your containerized application to ${
      _orchestrationTech.name
    } for scalable, production-ready hosting.

## Prerequisites

- ${_orchestrationTech.name} cluster access
- kubectl CLI tool installed
- Container image built and pushed to registry

## Understanding ${_orchestrationTech.name}

${
  _orchestrationTech.name
} is a container orchestration platform that automates deployment, scaling, and management of containerized applications.

## Creating Deployment Manifests

1. Create a deployment configuration:

\`\`\`yaml
${this.generateKubernetesManifest(_analysis, 'deployment')}
\`\`\`

2. Create a service configuration:

\`\`\`yaml
${this.generateKubernetesManifest(_analysis, 'service')}
\`\`\`

## Deploying to ${_orchestrationTech.name}

\`\`\`bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
\`\`\`

## Monitoring Your Deployment

\`\`\`bash
kubectl get pods
kubectl get services
kubectl logs -f deployment/${_analysis.metadata.projectName}
\`\`\`

## Scaling Your Application

\`\`\`bash
kubectl scale deployment ${_analysis.metadata.projectName} --replicas=3
\`\`\`

## Next Steps

- Set up ingress for external access
- Configure persistent storage
- Implement monitoring and logging
`;
  }

  private generatePythonEnvironmentContent(_analysis: any): string {
    return `# Python Virtual Environment Setup

Set up an isolated Python development environment for ${_analysis.metadata.projectName}.

## Why Virtual Environments?

Virtual environments isolate project dependencies, preventing conflicts between different projects and ensuring reproducible builds.

## Creating a Virtual Environment

### Using venv (Python 3.3+)

\`\`\`bash
python -m venv venv
\`\`\`

### Using virtualenv

\`\`\`bash
pip install virtualenv
virtualenv venv
\`\`\`

### Using conda

\`\`\`bash
conda create --name ${_analysis.metadata.projectName} python=3.11
\`\`\`

## Activating the Environment

### Linux/macOS

\`\`\`bash
source venv/bin/activate
\`\`\`

### Windows

\`\`\`bash
venv\\Scripts\\activate
\`\`\`

### Conda

\`\`\`bash
conda activate ${_analysis.metadata.projectName}
\`\`\`

## Installing Dependencies

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Development Tools

Install useful development tools:

\`\`\`bash
pip install black flake8 pytest mypy
\`\`\`

## Deactivating the Environment

\`\`\`bash
deactivate
\`\`\`

## Best Practices

- Always use virtual environments for Python projects
- Keep requirements.txt updated
- Use requirements-dev.txt for development dependencies
- Consider using poetry or pipenv for advanced dependency management
`;
  }

  private generatePythonFrameworkTutorialContent(_analysis: any, framework: any): string {
    if (framework.name === 'django') {
      return this.generateDjangoTutorialContent(_analysis);
    } else if (framework.name === 'fastapi') {
      return this.generateFastAPITutorialContent(_analysis);
    } else if (framework.name === 'flask') {
      return this.generateFlaskTutorialContent(_analysis);
    }

    return `# Building Applications with ${framework.name}

Learn how to build applications using ${framework.name}.

## Getting Started

Install ${framework.name}:

\`\`\`bash
pip install ${framework.name}
\`\`\`

## Basic Application Structure

Create your first ${framework.name} application and explore the framework's core concepts.
`;
  }

  private generateDjangoTutorialContent(_analysis: any): string {
    return `# Building Applications with Django

Create robust web applications using Django's Model-View-Template architecture.

## Project Setup

1. Install Django:

\`\`\`bash
pip install django
\`\`\`

2. Create a new Django project:

\`\`\`bash
django-admin startproject ${_analysis.metadata.projectName}
cd ${_analysis.metadata.projectName}
\`\`\`

3. Create your first app:

\`\`\`bash
python manage.py startapp core
\`\`\`

## Understanding Django Architecture

Django follows the MTV (Model-View-Template) pattern:
- **Models**: Define your data structure
- **Views**: Handle business logic and user interactions
- **Templates**: Control presentation layer

## Creating Your First Model

\`\`\`python
# core/models.py
from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
\`\`\`

## Running Migrations

\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

## Creating Views

\`\`\`python
# core/views.py
from django.shortcuts import render
from .models import Item

def item_list(request):
    items = Item.objects.all()
    return render(request, 'core/item_list.html', {'items': items})
\`\`\`

## URL Configuration

\`\`\`python
# core/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.item_list, name='item_list'),
]
\`\`\`

## Running the Development Server

\`\`\`bash
python manage.py runserver
\`\`\`

## Next Steps

- Learn about Django REST Framework for API development
- Explore Django's admin interface
- Implement user authentication
- Deploy with Gunicorn and PostgreSQL
`;
  }

  private generateFastAPITutorialContent(_analysis: any): string {
    return `# Building APIs with FastAPI

Create modern, fast APIs with automatic documentation using FastAPI.

## Installation

\`\`\`bash
pip install fastapi uvicorn
\`\`\`

## Basic Application

\`\`\`python
# main.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    description: str = None
    price: float
    tax: float = None

@app.get("/")
async def read_root():
    return {"Hello": "World"}

@app.post("/items/")
async def create_item(item: Item):
    return item

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}
\`\`\`

## Running the Server

\`\`\`bash
uvicorn main:app --reload
\`\`\`

## Interactive Documentation

FastAPI automatically generates interactive API documentation:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Key Features

- **Type Hints**: Python type hints for automatic validation
- **Async Support**: Native async/await support
- **Dependency Injection**: Powerful dependency injection system
- **Security**: Built-in security utilities

## Next Steps

- Add database integration with SQLAlchemy
- Implement authentication with JWT
- Add background tasks
- Deploy with Docker
`;
  }

  private generateFlaskTutorialContent(_analysis: any): string {
    return `# Building Applications with Flask

Create lightweight web applications and APIs using Flask's minimalist approach.

## Installation

\`\`\`bash
pip install flask
\`\`\`

## Basic Application

\`\`\`python
# app.py
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/api/items', methods=['GET', 'POST'])
def handle_items():
    if request.method == 'POST':
        data = request.get_json()
        return jsonify(data), 201
    else:
        return jsonify([{"name": "item1"}, {"name": "item2"}])

if __name__ == '__main__':
    app.run(debug=True)
\`\`\`

## Running the Application

\`\`\`bash
python app.py
\`\`\`

## Application Factory Pattern

For larger applications, use the application factory pattern:

\`\`\`python
# app/__init__.py
from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    from app.main import bp as main_bp
    app.register_blueprint(main_bp)

    return app
\`\`\`

## Flask Extensions

Popular Flask extensions:
- **Flask-SQLAlchemy**: Database ORM
- **Flask-Login**: User session management
- **Flask-WTF**: Form handling and validation
- **Flask-Migrate**: Database migrations

## Next Steps

- Structure larger applications with Blueprints
- Add database integration
- Implement user authentication
- Deploy with Gunicorn
`;
  }

  // Helper methods for container content generation
  private generateContainerFileContent(
    _analysis: any,
    _containerTech: ContainerTechnology,
  ): string {
    const language = _analysis.metadata.primaryLanguage?.toLowerCase();

    if (language === 'python') {
      return `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`;
    } else if (language === 'javascript' || language === 'typescript') {
      return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]`;
    } else {
      return `FROM ubuntu:22.04

WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["./start.sh"]`;
    }
  }

  private generateKubernetesManifest(analysis: any, type: string): string {
    if (type === 'deployment') {
      return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${analysis.metadata.projectName}
  labels:
    app: ${analysis.metadata.projectName}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${analysis.metadata.projectName}
  template:
    metadata:
      labels:
        app: ${analysis.metadata.projectName}
    spec:
      containers:
      - name: ${analysis.metadata.projectName}
        image: ${analysis.metadata.projectName}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"`;
    } else if (type === 'service') {
      return `apiVersion: v1
kind: Service
metadata:
  name: ${analysis.metadata.projectName}-service
spec:
  selector:
    app: ${analysis.metadata.projectName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer`;
    }

    return '';
  }

  private generateContainerExamples(_analysis: any, _containerTech: ContainerTechnology): string[] {
    return [
      `# Build the container image
${_containerTech.name} build -t ${_analysis.metadata.projectName}:latest .`,

      `# Run the container locally
${_containerTech.name} run -p 3000:3000 -d ${_analysis.metadata.projectName}:latest`,

      `# View running containers
${_containerTech.name} ps`,
    ];
  }

  private generateOrchestrationExamples(
    _analysis: any,
    _orchestrationTech: OrchestrationTechnology,
  ): string[] {
    return [
      `# Deploy the application
kubectl apply -f k8s/`,

      `# Check deployment status
kubectl get deployments`,

      `# View application logs
kubectl logs -f deployment/${_analysis.metadata.projectName}`,
    ];
  }

  private generatePythonEnvironmentExamples(): string[] {
    return [
      `# Create virtual environment
python -m venv venv`,

      `# Activate environment (Linux/macOS)
source venv/bin/activate`,

      `# Install dependencies
pip install -r requirements.txt`,
    ];
  }

  private generatePythonFrameworkExamples(framework: any): string[] {
    if (framework.name === 'django') {
      return [
        `# Create Django project
django-admin startproject myproject`,

        `# Run development server
python manage.py runserver`,

        `# Create superuser
python manage.py createsuperuser`,
      ];
    }

    return [];
  }
}

// Export the tool implementation
export const populateDiataxisContent: Tool = {
  name: 'populate_diataxis_content',
  description: 'Intelligently populate Diataxis documentation with project-specific content',
  inputSchema: {
    type: 'object',
    properties: {
      analysisId: {
        type: 'string',
        description: 'Repository analysis ID from analyze_repository tool',
      },
      docsPath: {
        type: 'string',
        description: 'Path to documentation directory',
      },
      populationLevel: {
        type: 'string',
        enum: ['basic', 'comprehensive', 'intelligent'],
        default: 'comprehensive',
        description: 'Level of content generation detail',
      },
      includeProjectSpecific: {
        type: 'boolean',
        default: true,
        description: 'Generate project-specific examples and code',
      },
      preserveExisting: {
        type: 'boolean',
        default: true,
        description: 'Preserve any existing content',
      },
      technologyFocus: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific technologies to emphasize in content',
      },
    },
    required: ['analysisId', 'docsPath'],
  },
};

export async function handlePopulateDiataxisContent(args: any): Promise<PopulationResult> {
  const engine = new ContentPopulationEngine();
  return await engine.populateContent(args);
}
