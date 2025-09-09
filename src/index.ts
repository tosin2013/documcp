#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { analyzeRepository } from './tools/analyze-repository.js';
import { recommendSSG } from './tools/recommend-ssg.js';
import { generateConfig } from './tools/generate-config.js';
import { setupStructure } from './tools/setup-structure.js';
import { deployPages } from './tools/deploy-pages.js';
import { verifyDeployment } from './tools/verify-deployment.js';
import { handlePopulateDiataxisContent } from './tools/populate-content.js';
import { handleValidateDiataxisContent, validateGeneralContent } from './tools/validate-content.js';
import { detectDocumentationGaps } from './tools/detect-gaps.js';
import { testLocalDeployment } from './tools/test-local-deployment.js';
import { evaluateReadmeHealth } from './tools/evaluate-readme-health.js';
import { optimizeReadmeLength } from './tools/optimize-readme-length.js';
import { readmeBestPractices } from './tools/readme-best-practices.js';
import { formatMCPResponse } from './types/api.js';
import { DOCUMENTATION_WORKFLOWS, WORKFLOW_EXECUTION_GUIDANCE, WORKFLOW_METADATA } from './workflows/documentation-workflow.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const server = new Server(
  {
    name: 'documcp',
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  },
);

// Tool definitions following ADR-006
const TOOLS = [
  {
    name: 'analyze_repository',
    description: 'Analyze repository structure, dependencies, and documentation needs',
    inputSchema: z.object({
      path: z.string().describe('Path to the repository to analyze'),
      depth: z.enum(['quick', 'standard', 'deep']).optional().default('standard'),
    }),
  },
  {
    name: 'recommend_ssg',
    description: 'Recommend the best static site generator based on project analysis',
    inputSchema: z.object({
      analysisId: z.string().describe('ID from previous repository analysis'),
      preferences: z.object({
        priority: z.enum(['simplicity', 'features', 'performance']).optional(),
        ecosystem: z.enum(['javascript', 'python', 'ruby', 'go', 'any']).optional(),
      }).optional(),
    }),
  },
  {
    name: 'generate_config',
    description: 'Generate configuration files for the selected static site generator',
    inputSchema: z.object({
      ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
      projectName: z.string(),
      projectDescription: z.string().optional(),
      outputPath: z.string().describe('Where to generate config files'),
    }),
  },
  {
    name: 'setup_structure',
    description: 'Create Diataxis-compliant documentation structure',
    inputSchema: z.object({
      path: z.string().describe('Root path for documentation'),
      ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
      includeExamples: z.boolean().optional().default(true),
    }),
  },
  {
    name: 'deploy_pages',
    description: 'Set up GitHub Pages deployment workflow',
    inputSchema: z.object({
      repository: z.string().describe('Repository path or URL'),
      ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
      branch: z.string().optional().default('gh-pages'),
      customDomain: z.string().optional(),
    }),
  },
  {
    name: 'verify_deployment',
    description: 'Verify and troubleshoot GitHub Pages deployment',
    inputSchema: z.object({
      repository: z.string().describe('Repository path or URL'),
      url: z.string().optional().describe('Expected deployment URL'),
    }),
  },
  {
    name: 'populate_diataxis_content',
    description: 'Intelligently populate Diataxis documentation with project-specific content',
    inputSchema: z.object({
      analysisId: z.string().describe('Repository analysis ID from analyze_repository tool'),
      docsPath: z.string().describe('Path to documentation directory'),
      populationLevel: z.enum(['basic', 'comprehensive', 'intelligent']).optional().default('comprehensive'),
      includeProjectSpecific: z.boolean().optional().default(true),
      preserveExisting: z.boolean().optional().default(true),
      technologyFocus: z.array(z.string()).optional().describe('Specific technologies to emphasize'),
    }),
  },
  {
    name: 'validate_diataxis_content',
    description: 'Validate the accuracy, completeness, and compliance of generated Diataxis documentation',
    inputSchema: z.object({
      contentPath: z.string().describe('Path to the documentation directory to validate'),
      analysisId: z.string().optional().describe('Optional repository analysis ID for context-aware validation'),
      validationType: z.string().optional().default('all').describe('Type of validation: accuracy, completeness, compliance, or all'),
      includeCodeValidation: z.boolean().optional().default(true).describe('Whether to validate code examples'),
      confidence: z.string().optional().default('moderate').describe('Validation confidence level: strict, moderate, or permissive'),
    }),
  },
  {
    name: 'validate_content',
    description: 'Validate general content quality: broken links, code syntax, references, and basic accuracy',
    inputSchema: z.object({
      contentPath: z.string().describe('Path to the content directory to validate'),
      validationType: z.string().optional().default('all').describe('Type of validation: links, code, references, or all'),
      includeCodeValidation: z.boolean().optional().default(true).describe('Whether to validate code blocks'),
      followExternalLinks: z.boolean().optional().default(false).describe('Whether to validate external URLs (slower)'),
    }),
  },
  {
    name: 'detect_documentation_gaps',
    description: 'Analyze repository and existing documentation to identify missing content and gaps',
    inputSchema: z.object({
      repositoryPath: z.string().describe('Path to the repository to analyze'),
      documentationPath: z.string().optional().describe('Path to existing documentation (if any)'),
      analysisId: z.string().optional().describe('Optional existing analysis ID to reuse'),
      depth: z.enum(['quick', 'standard', 'comprehensive']).optional().default('standard'),
    }),
  },
  {
    name: 'test_local_deployment',
    description: 'Test documentation build and local server before deploying to GitHub Pages',
    inputSchema: z.object({
      repositoryPath: z.string().describe('Path to the repository'),
      ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
      port: z.number().optional().default(3000).describe('Port for local server'),
      timeout: z.number().optional().default(60).describe('Timeout in seconds for build process'),
      skipBuild: z.boolean().optional().default(false).describe('Skip build step and only start server'),
    }),
  },
  {
    name: 'evaluate_readme_health',
    description: 'Evaluate README files for community health, accessibility, and onboarding effectiveness',
    inputSchema: z.object({
      readme_path: z.string().describe('Path to the README file to evaluate'),
      project_type: z.enum(['community_library', 'enterprise_tool', 'personal_project', 'documentation']).optional().default('community_library').describe('Type of project for tailored evaluation'),
      repository_path: z.string().optional().describe('Optional path to repository for additional context'),
    }),
  },
  {
    name: 'optimize_readme_length',
    description: 'Analyze and optimize README length by segmenting content and creating progressive disclosure',
    inputSchema: z.object({
      readme_path: z.string().describe('Path to the README file to optimize'),
      target_audience: z.enum(['community', 'enterprise', 'internal', 'academic']).optional().default('community').describe('Target audience for optimization strategy'),
      max_recommended_lines: z.number().min(50).max(1000).optional().default(250).describe('Maximum recommended lines for the README'),
      output_directory: z.string().optional().describe('Directory to create optimized README and segmented documentation files'),
      preserve_original: z.boolean().optional().default(true).describe('Keep original README as backup'),
    }),
  },
  {
    name: 'readme_best_practices',
    description: 'Analyze README files against best practices checklist and generate templates for improvement',
    inputSchema: z.object({
      readme_path: z.string().describe('Path to the README file to analyze'),
      project_type: z.enum(['library', 'application', 'tool', 'documentation', 'framework']).optional().default('library').describe('Type of project for tailored analysis'),
      generate_template: z.boolean().optional().default(false).describe('Generate README templates and community files'),
      output_directory: z.string().optional().describe('Directory to write generated templates and community files'),
      include_community_files: z.boolean().optional().default(true).describe('Generate community health files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.)'),
      target_audience: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).optional().default('mixed').describe('Target audience for recommendations'),
    }),
  },
];

// Prompt definitions following ADR-007
const PROMPTS = [
  {
    name: 'analyze-and-recommend',
    description: 'Complete repository analysis and SSG recommendation workflow',
    arguments: [
      {
        name: 'repository_path',
        description: 'Path to the repository to analyze',
        required: true,
      },
      {
        name: 'analysis_depth',
        description: 'Analysis depth: quick, standard, or deep',
        required: false,
      },
      {
        name: 'ssg_preferences',
        description: 'Preferences for SSG selection (priority: simplicity/features/performance, ecosystem: javascript/python/ruby/go/any)',
        required: false,
      },
    ],
  },
  {
    name: 'setup-documentation',
    description: 'Create comprehensive documentation structure with best practices',
    arguments: [
      {
        name: 'project_name',
        description: 'Name of the project',
        required: true,
      },
      {
        name: 'ssg_type',
        description: 'Static site generator: jekyll, hugo, docusaurus, mkdocs, or eleventy',
        required: true,
      },
      {
        name: 'documentation_path',
        description: 'Path where documentation should be created',
        required: true,
      },
      {
        name: 'include_examples',
        description: 'Whether to include example content',
        required: false,
      },
    ],
  },
  {
    name: 'troubleshoot-deployment',
    description: 'Diagnose and fix GitHub Pages deployment issues',
    arguments: [
      {
        name: 'repository',
        description: 'Repository path or URL',
        required: true,
      },
      {
        name: 'expected_url',
        description: 'Expected deployment URL',
        required: false,
      },
      {
        name: 'error_description',
        description: 'Description of the deployment issue',
        required: false,
      },
    ],
  },
  {
    name: 'validate-content-quality',
    description: 'Comprehensive content validation workflow for both application code and documentation',
    arguments: [
      {
        name: 'content_path',
        description: 'Path to validate (project root, src directory, or docs directory)',
        required: true,
      },
      {
        name: 'validation_scope',
        description: 'Scope: application-code, documentation, or both',
        required: false,
      },
      {
        name: 'validation_level',
        description: 'Validation level: quick, standard, or comprehensive',
        required: false,
      },
      {
        name: 'focus_areas',
        description: 'Specific focus areas: accuracy, completeness, compliance, code-quality, links',
        required: false,
      },
    ],
  },
];

// In-memory storage for resources
const resourceStore = new Map<string, { content: string; mimeType: string }>();

// Resource definitions following ADR-007
const RESOURCES = [
  {
    uri: 'documcp://analysis/',
    name: 'Repository Analysis Results',
    description: 'Results from repository analysis operations',
    mimeType: 'application/json',
  },
  {
    uri: 'documcp://config/',
    name: 'Generated Configuration Files',
    description: 'Generated SSG configuration files',
    mimeType: 'text/plain',
  },
  {
    uri: 'documcp://structure/',
    name: 'Documentation Structure Templates',
    description: 'Diataxis-compliant documentation structures',
    mimeType: 'application/json',
  },
  {
    uri: 'documcp://deployment/',
    name: 'GitHub Actions Workflows',
    description: 'Generated deployment workflows',
    mimeType: 'text/yaml',
  },
  {
    uri: 'documcp://templates/',
    name: 'Reusable Templates',
    description: 'Template files for documentation setup',
    mimeType: 'text/plain',
  },
  {
    uri: 'documcp://workflows/',
    name: 'Documentation Workflows',
    description: 'Guided workflows for different documentation scenarios',
    mimeType: 'application/json',
  },
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  })),
}));

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

// Get specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyze-and-recommend':
      return {
        description: 'Complete repository analysis and SSG recommendation workflow',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to analyze a repository and get SSG recommendations. Here are the parameters:
              
Repository Path: ${args?.repository_path || '[REQUIRED]'}
Analysis Depth: ${args?.analysis_depth || 'standard'}
SSG Preferences: ${args?.ssg_preferences || 'none specified'}

Please:
1. First run analyze_repository with the provided path and depth
2. Then run recommend_ssg with the analysis results
3. Provide a comprehensive summary with justifications
4. Suggest next steps for documentation setup`,
            },
          },
        ],
      };

    case 'setup-documentation':
      return {
        description: 'Create comprehensive documentation structure with best practices',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to set up documentation for my project. Here are the parameters:

Project Name: ${args?.project_name || '[REQUIRED]'}
SSG Type: ${args?.ssg_type || '[REQUIRED]'}
Documentation Path: ${args?.documentation_path || '[REQUIRED]'}
Include Examples: ${args?.include_examples || 'true'}

Please:
1. Run generate_config to create the SSG configuration files
2. Run setup_structure to create the Diataxis-compliant documentation structure
3. Provide guidance on best practices for the chosen SSG
4. Suggest deployment setup steps`,
            },
          },
        ],
      };

    case 'troubleshoot-deployment':
      return {
        description: 'Diagnose and fix GitHub Pages deployment issues',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need help troubleshooting a GitHub Pages deployment. Here are the details:

Repository: ${args?.repository || '[REQUIRED]'}
Expected URL: ${args?.expected_url || 'not specified'}
Error Description: ${args?.error_description || 'not specified'}

Please:
1. Run verify_deployment to check the current deployment status
2. Analyze any errors or issues found
3. Provide specific troubleshooting steps
4. If needed, suggest deployment workflow fixes`,
            },
          },
        ],
      };

    case 'validate-content-quality': {
      const validationScope = args?.validation_scope || 'both';
      const validationLevel = args?.validation_level || 'standard';
      const focusAreas = args?.focus_areas || 'all';
      
      return {
        description: 'Comprehensive content validation workflow',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to validate the quality of my content. Here are the parameters:

Content Path: ${args?.content_path || '[REQUIRED]'}
Validation Scope: ${validationScope} (application-code, documentation, or both)
Validation Level: ${validationLevel} (quick, standard, or comprehensive)  
Focus Areas: ${focusAreas} (accuracy, completeness, compliance, code-quality, links, or all)

Please:
1. First, determine if the path contains application code, documentation, or both
2. Run validate_diataxis_content for comprehensive Diataxis framework validation
3. Run validate_content for general link and syntax validation
4. Compare results and identify the most critical issues
5. Provide actionable recommendations prioritized by impact
6. Suggest specific next steps for improvement

If validation scope is 'both', validate both the source code structure and any documentation directories found.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}));

// Read specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  // Check if resource exists in store
  const resource = resourceStore.get(uri);
  if (resource) {
    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: resource.content,
        },
      ],
    };
  }

  // Handle template resources (static content)
  if (uri.startsWith('documcp://templates/')) {
    const templateType = uri.split('/').pop();
    
    switch (templateType) {
      case 'jekyll-config':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/yaml',
              text: `# Jekyll Configuration Template
title: "Documentation Site"
description: "Project documentation"
baseurl: ""
url: ""

markdown: kramdown
highlighter: rouge
theme: minima

plugins:
  - jekyll-feed
  - jekyll-sitemap

exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor
`,
            },
          ],
        };

      case 'hugo-config':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/yaml',
              text: `# Hugo Configuration Template
baseURL: "https://username.github.io/repository"
languageCode: "en-us"
title: "Documentation Site"
theme: "docsy"

params:
  github_repo: "https://github.com/username/repository"
  github_branch: "main"

markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    style: github
    lineNos: true
`,
            },
          ],
        };

      case 'diataxis-structure':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                "structure": {
                  "tutorials": {
                    "description": "Learning-oriented guides",
                    "files": ["getting-started.md", "your-first-project.md"]
                  },
                  "how-to-guides": {
                    "description": "Problem-oriented step-by-step guides",
                    "files": ["common-tasks.md", "troubleshooting.md"]
                  },
                  "reference": {
                    "description": "Information-oriented technical reference",
                    "files": ["api-reference.md", "configuration.md"]
                  },
                  "explanation": {
                    "description": "Understanding-oriented background material",
                    "files": ["architecture.md", "design-decisions.md"]
                  }
                }
              }, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown template: ${templateType}`);
    }
  }

  // Handle workflow resources
  if (uri.startsWith('documcp://workflows/')) {
    const workflowType = uri.split('/').pop();
    
    switch (workflowType) {
      case 'all':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                workflows: DOCUMENTATION_WORKFLOWS,
                executionGuidance: WORKFLOW_EXECUTION_GUIDANCE,
                metadata: WORKFLOW_METADATA
              }, null, 2),
            },
          ],
        };

      case 'quick-setup':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(DOCUMENTATION_WORKFLOWS['quick-documentation-setup'], null, 2),
            },
          ],
        };

      case 'full-setup':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(DOCUMENTATION_WORKFLOWS['full-documentation-setup'], null, 2),
            },
          ],
        };

      case 'guidance':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                executionGuidance: WORKFLOW_EXECUTION_GUIDANCE,
                recommendationEngine: "Use recommendWorkflow() function with project status and requirements"
              }, null, 2),
            },
          ],
        };

      default: {
        // Try to find specific workflow
        const workflow = DOCUMENTATION_WORKFLOWS[workflowType || ''];
        if (workflow) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(workflow, null, 2),
              },
            ],
          };
        }
        throw new Error(`Unknown workflow: ${workflowType}`);
      }
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// Helper function to store resources
function storeResource(uri: string, content: string, mimeType: string): void {
  resourceStore.set(uri, { content, mimeType });
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_repository': {
        const result = await analyzeRepository(args);
        // Store analysis result as resource
        const analysisId = `analysis-${Date.now()}`;
        storeResource(
          `documcp://analysis/${analysisId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'recommend_ssg': {
        const result = await recommendSSG(args);
        // Store recommendation as resource
        const recommendationId = `recommendation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${recommendationId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'generate_config': {
        const result = await generateConfig(args);
        // Store generated config as resource
        const configId = `config-${args?.ssg || 'unknown'}-${Date.now()}`;
        storeResource(
          `documcp://config/${configId}`,
          JSON.stringify(result, null, 2),
          'text/plain'
        );
        return result;
      }
      
      case 'setup_structure': {
        const result = await setupStructure(args);
        // Store structure as resource
        const structureId = `structure-${Date.now()}`;
        storeResource(
          `documcp://structure/${structureId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'deploy_pages': {
        const result = await deployPages(args);
        // Store deployment workflow as resource
        const workflowId = `workflow-${args?.ssg || 'unknown'}-${Date.now()}`;
        storeResource(
          `documcp://deployment/${workflowId}`,
          JSON.stringify(result, null, 2),
          'text/yaml'
        );
        return result;
      }
      
      case 'verify_deployment':
        return await verifyDeployment(args);
      
      case 'populate_diataxis_content': {
        const result = await handlePopulateDiataxisContent(args);
        // Store populated content info as resource
        const populationId = `population-${Date.now()}`;
        storeResource(
          `documcp://structure/${populationId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return {
          content: [
            {
              type: 'text',
              text: `Content population completed successfully. Generated ${result.filesCreated} files with ${Math.round(result.populationMetrics.coverage)}% coverage.`,
            },
            {
              type: 'text',
              text: `Population metrics: Coverage: ${result.populationMetrics.coverage}%, Completeness: ${result.populationMetrics.completeness}%, Project Specificity: ${result.populationMetrics.projectSpecificity}%`,
            },
            {
              type: 'text', 
              text: `Next steps:\n${result.nextSteps.map(step => `- ${step}`).join('\n')}`,
            },
          ],
        };
      }
      
      case 'validate_diataxis_content': {
        const result = await handleValidateDiataxisContent(args);
        // Store validation results as resource
        const validationId = `validation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${validationId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        
        // Return structured validation results as JSON
        const validationSummary = {
          status: result.success ? 'PASSED' : 'ISSUES FOUND',
          confidence: `${result.confidence.overall}%`,
          issuesFound: result.issues.length,
          breakdown: {
            errors: result.issues.filter(i => i.type === 'error').length,
            warnings: result.issues.filter(i => i.type === 'warning').length,
            info: result.issues.filter(i => i.type === 'info').length
          },
          topIssues: result.issues.slice(0, 5).map(issue => ({
            type: issue.type.toUpperCase(),
            category: issue.category,
            file: issue.location.file,
            description: issue.description
          })),
          recommendations: result.recommendations,
          nextSteps: result.nextSteps,
          confidenceBreakdown: result.confidence.breakdown,
          resourceId: validationId
        };

        return {
          content: [
            {
              type: 'text',
              text: `Content validation ${result.success ? 'passed' : 'found issues'}. Overall confidence: ${result.confidence.overall}%.`,
            },
            {
              type: 'text',
              text: `Issues found: ${result.issues.length} (${result.issues.filter(i => i.type === 'error').length} errors, ${result.issues.filter(i => i.type === 'warning').length} warnings)`,
            },
            {
              type: 'text',
              text: JSON.stringify(validationSummary, null, 2),
            },
          ],
        };
      }
      
      case 'validate_content': {
        const result = await validateGeneralContent(args);
        // Store validation results as resource
        const validationId = `content-validation-${Date.now()}`;
        storeResource(
          `documcp://analysis/${validationId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );

        // Return structured validation results as JSON
        const contentSummary = {
          status: result.success ? 'PASSED' : 'ISSUES FOUND',
          summary: result.summary,
          linksChecked: result.linksChecked || 0,
          codeBlocksValidated: result.codeBlocksValidated || 0,
          brokenLinks: result.brokenLinks || [],
          codeErrors: (result.codeErrors || []).slice(0, 10), // Limit to first 10 errors
          recommendations: result.recommendations || [],
          resourceId: validationId
        };

        return {
          content: [
            {
              type: 'text',
              text: `Content validation completed. Status: ${result.success ? 'PASSED' : 'ISSUES FOUND'}`,
            },
            {
              type: 'text',
              text: `Results: ${result.linksChecked || 0} links checked, ${result.codeBlocksValidated || 0} code blocks validated`,
            },
            {
              type: 'text',
              text: JSON.stringify(contentSummary, null, 2),
            },
          ],
        };
      }
      
      case 'detect_documentation_gaps': {
        const result = await detectDocumentationGaps(args);
        // Store gap analysis as resource
        const gapAnalysisId = `gaps-${Date.now()}`;
        storeResource(
          `documcp://analysis/${gapAnalysisId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'test_local_deployment': {
        const result = await testLocalDeployment(args);
        // Store test results as resource
        const testId = `test-${args?.ssg || 'unknown'}-${Date.now()}`;
        storeResource(
          `documcp://deployment/${testId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'evaluate_readme_health': {
        const result = await evaluateReadmeHealth(args as any);
        // Store health evaluation as resource
        const healthId = `readme-health-${Date.now()}`;
        storeResource(
          `documcp://analysis/${healthId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'optimize_readme_length': {
        const result = await optimizeReadmeLength(args as any);
        // Store optimization results as resource
        const optimizationId = `readme-optimization-${Date.now()}`;
        storeResource(
          `documcp://analysis/${optimizationId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return result;
      }
      
      case 'readme_best_practices': {
        const result = await readmeBestPractices(args as any);
        // Store best practices analysis as resource
        const analysisId = `readme-best-practices-${Date.now()}`;
        storeResource(
          `documcp://analysis/${analysisId}`,
          JSON.stringify(result, null, 2),
          'application/json'
        );
        return formatMCPResponse(result);
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DocuMCP server started successfully');
}

main().catch((error) => {
  console.error('Failed to start DocuMCP server:', error);
  process.exit(1);
});