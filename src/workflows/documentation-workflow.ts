// Documentation Workflow Guide for LLMs using DocuMCP MCP Server

export interface WorkflowStep {
  tool: string;
  description: string;
  requiredInputs: string[];
  outputs: string[];
  optional: boolean;
  alternatives?: string[];
}

export interface DocumentationWorkflow {
  name: string;
  description: string;
  useCase: string;
  steps: WorkflowStep[];
  estimatedTime: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

// Primary Documentation Creation Workflows
export const DOCUMENTATION_WORKFLOWS: Record<string, DocumentationWorkflow> = {
  // Complete end-to-end documentation setup
  'full-documentation-setup': {
    name: 'Complete Documentation Setup',
    description:
      'Analyze repository, recommend SSG, create structure, populate content, and deploy',
    useCase: 'Starting from scratch with a new project that needs comprehensive documentation',
    complexity: 'complex',
    estimatedTime: '5-10 minutes',
    steps: [
      {
        tool: 'analyze_repository',
        description: 'Analyze the repository structure, dependencies, and documentation needs',
        requiredInputs: ['path'],
        outputs: ['analysisId', 'projectMetadata', 'technologyStack'],
        optional: false,
      },
      {
        tool: 'recommend_ssg',
        description: 'Get intelligent SSG recommendation based on project analysis',
        requiredInputs: ['analysisId'],
        outputs: ['recommendedSSG', 'justification', 'alternatives'],
        optional: false,
      },
      {
        tool: 'generate_config',
        description: 'Generate configuration files for the recommended SSG',
        requiredInputs: ['ssg', 'projectName', 'outputPath'],
        outputs: ['configFiles', 'setupInstructions'],
        optional: false,
      },
      {
        tool: 'setup_structure',
        description: 'Create Diataxis-compliant documentation structure',
        requiredInputs: ['path', 'ssg'],
        outputs: ['directoryStructure', 'templateFiles'],
        optional: false,
      },
      {
        tool: 'populate_diataxis_content',
        description: 'Intelligently populate content based on project analysis',
        requiredInputs: ['analysisId', 'docsPath'],
        outputs: ['generatedContent', 'populationMetrics'],
        optional: false,
      },
      {
        tool: 'validate_diataxis_content',
        description: 'Validate generated content for accuracy and compliance',
        requiredInputs: ['contentPath'],
        outputs: ['validationResults', 'recommendations'],
        optional: true,
      },
      {
        tool: 'deploy_pages',
        description: 'Set up GitHub Pages deployment workflow',
        requiredInputs: ['repository', 'ssg'],
        outputs: ['deploymentWorkflow', 'deploymentInstructions'],
        optional: true,
      },
    ],
  },

  // Quick documentation setup for existing projects
  'quick-documentation-setup': {
    name: 'Quick Documentation Setup',
    description: 'Rapid documentation creation using intelligent defaults',
    useCase: 'Existing project needs documentation quickly with minimal customization',
    complexity: 'simple',
    estimatedTime: '2-3 minutes',
    steps: [
      {
        tool: 'analyze_repository',
        description: 'Quick analysis of repository',
        requiredInputs: ['path'],
        outputs: ['analysisId'],
        optional: false,
      },
      {
        tool: 'setup_structure',
        description: 'Create documentation structure with intelligent SSG selection',
        requiredInputs: ['path'],
        outputs: ['directoryStructure'],
        optional: false,
        alternatives: ['Use analyze_repository output to auto-select SSG'],
      },
      {
        tool: 'populate_diataxis_content',
        description: 'Auto-populate with project-specific content',
        requiredInputs: ['analysisId', 'docsPath'],
        outputs: ['generatedContent'],
        optional: false,
      },
    ],
  },

  // Content-focused workflow for existing documentation
  'enhance-existing-documentation': {
    name: 'Enhance Existing Documentation',
    description: 'Improve and populate existing documentation structure',
    useCase: 'Project already has basic documentation that needs content and validation',
    complexity: 'moderate',
    estimatedTime: '3-5 minutes',
    steps: [
      {
        tool: 'analyze_repository',
        description: 'Analyze repository and existing documentation',
        requiredInputs: ['path'],
        outputs: ['analysisId', 'existingDocsAnalysis'],
        optional: false,
      },
      {
        tool: 'validate_diataxis_content',
        description: 'Validate existing content and identify gaps',
        requiredInputs: ['contentPath', 'analysisId'],
        outputs: ['validationResults', 'contentGaps'],
        optional: false,
      },
      {
        tool: 'populate_diataxis_content',
        description: 'Fill content gaps with intelligent population',
        requiredInputs: ['analysisId', 'docsPath', 'preserveExisting: true'],
        outputs: ['enhancedContent'],
        optional: false,
      },
      {
        tool: 'validate_diataxis_content',
        description: 'Final validation of enhanced content',
        requiredInputs: ['contentPath'],
        outputs: ['finalValidation'],
        optional: true,
      },
    ],
  },

  // Deployment-focused workflow
  'deployment-only': {
    name: 'Documentation Deployment Setup',
    description: 'Set up deployment for existing documentation',
    useCase: 'Documentation exists but needs automated deployment setup',
    complexity: 'simple',
    estimatedTime: '1-2 minutes',
    steps: [
      {
        tool: 'analyze_repository',
        description: 'Analyze repository structure for deployment configuration',
        requiredInputs: ['path'],
        outputs: ['deploymentContext'],
        optional: true,
      },
      {
        tool: 'deploy_pages',
        description: 'Set up GitHub Pages deployment workflow',
        requiredInputs: ['repository', 'ssg'],
        outputs: ['deploymentWorkflow'],
        optional: false,
      },
      {
        tool: 'verify_deployment',
        description: 'Verify deployment configuration and test',
        requiredInputs: ['repository'],
        outputs: ['deploymentStatus', 'troubleshootingInfo'],
        optional: true,
      },
    ],
  },

  // Validation and quality assurance workflow
  'documentation-audit': {
    name: 'Documentation Quality Audit',
    description: 'Comprehensive validation and quality assessment',
    useCase: 'Existing documentation needs quality assessment and improvement recommendations',
    complexity: 'moderate',
    estimatedTime: '2-3 minutes',
    steps: [
      {
        tool: 'analyze_repository',
        description: 'Analyze repository for context-aware validation',
        requiredInputs: ['path'],
        outputs: ['analysisId', 'projectContext'],
        optional: false,
      },
      {
        tool: 'validate_diataxis_content',
        description: 'Comprehensive content validation with all checks',
        requiredInputs: ['contentPath', 'analysisId', 'validationType: all', 'confidence: strict'],
        outputs: ['detailedValidation', 'improvementPlan'],
        optional: false,
      },
      {
        tool: 'verify_deployment',
        description: 'Validate deployment if applicable',
        requiredInputs: ['repository'],
        outputs: ['deploymentHealth'],
        optional: true,
      },
    ],
  },
};

// Workflow Decision Helper
export interface WorkflowRecommendation {
  recommendedWorkflow: string;
  reason: string;
  alternativeWorkflows: string[];
  customizationSuggestions: string[];
}

export function recommendWorkflow(
  projectStatus: 'new' | 'existing-no-docs' | 'existing-basic-docs' | 'existing-full-docs',
  requirements: {
    needsDeployment?: boolean;
    timeConstraint?: 'minimal' | 'moderate' | 'comprehensive';
    qualityFocus?: boolean;
    customization?: 'minimal' | 'moderate' | 'high';
  },
): WorkflowRecommendation {
  // New project or no documentation
  if (projectStatus === 'new' || projectStatus === 'existing-no-docs') {
    if (requirements.timeConstraint === 'minimal') {
      return {
        recommendedWorkflow: 'quick-documentation-setup',
        reason: 'Fast setup with intelligent defaults for time-constrained scenario',
        alternativeWorkflows: ['full-documentation-setup'],
        customizationSuggestions: [
          'Consider full-documentation-setup if time allows for better customization',
          'Add deployment-only workflow later if needed',
        ],
      };
    } else {
      return {
        recommendedWorkflow: 'full-documentation-setup',
        reason: 'Comprehensive setup provides best foundation for new documentation',
        alternativeWorkflows: ['quick-documentation-setup'],
        customizationSuggestions: [
          'Skip deploy_pages step if deployment not needed immediately',
          'Use validate_diataxis_content for quality assurance',
        ],
      };
    }
  }

  // Existing documentation that needs enhancement
  if (projectStatus === 'existing-basic-docs') {
    if (requirements.qualityFocus) {
      return {
        recommendedWorkflow: 'documentation-audit',
        reason: 'Quality-focused validation and improvement recommendations',
        alternativeWorkflows: ['enhance-existing-documentation'],
        customizationSuggestions: [
          'Follow up with enhance-existing-documentation based on audit results',
          'Consider deployment-only if deployment setup is needed',
        ],
      };
    } else {
      return {
        recommendedWorkflow: 'enhance-existing-documentation',
        reason: 'Improve and expand existing documentation content',
        alternativeWorkflows: ['documentation-audit'],
        customizationSuggestions: [
          'Run documentation-audit first if quality is uncertain',
          'Set preserveExisting: true in populate_diataxis_content',
        ],
      };
    }
  }

  // Full documentation that needs deployment or validation
  if (projectStatus === 'existing-full-docs') {
    if (requirements.needsDeployment) {
      return {
        recommendedWorkflow: 'deployment-only',
        reason: 'Focus on deployment setup for complete documentation',
        alternativeWorkflows: ['documentation-audit'],
        customizationSuggestions: [
          'Run documentation-audit if quality validation is also needed',
          'Consider verify_deployment for troubleshooting',
        ],
      };
    } else {
      return {
        recommendedWorkflow: 'documentation-audit',
        reason: 'Quality assurance and validation for existing complete documentation',
        alternativeWorkflows: ['deployment-only'],
        customizationSuggestions: [
          'Focus on validation aspects most relevant to your concerns',
          'Use strict confidence level for thorough quality checking',
        ],
      };
    }
  }

  // Fallback
  return {
    recommendedWorkflow: 'full-documentation-setup',
    reason: 'Default comprehensive workflow for unclear requirements',
    alternativeWorkflows: ['quick-documentation-setup', 'documentation-audit'],
    customizationSuggestions: [
      'Analyze your specific needs to choose a more targeted workflow',
      'Consider running analyze_repository first to understand your project better',
    ],
  };
}

// Workflow execution guidance for LLMs
export const WORKFLOW_EXECUTION_GUIDANCE = {
  description: 'How LLMs should execute DocuMCP workflows',
  principles: [
    'Each tool can be called independently - workflows are guidance, not rigid requirements',
    'Always check tool outputs before proceeding to next step',
    'Adapt workflows based on user feedback and tool results',
    'Skip optional steps if user has time constraints or different priorities',
    'Use tool outputs (like analysisId) as inputs for subsequent tools',
    'Validate critical assumptions before proceeding with deployment steps',
  ],
  errorHandling: [
    'If a tool fails, provide clear error information to user',
    'Suggest alternative approaches or simplified workflows',
    "Don't abandon the entire workflow - adapt and continue with available information",
    'Use verify_deployment and validate_diataxis_content for troubleshooting',
  ],
  customization: [
    'Ask users about their priorities (speed vs quality, deployment needs, etc.)',
    'Adapt tool parameters based on project analysis results',
    'Suggest workflow modifications based on repository characteristics',
    'Allow users to skip or modify steps based on their specific needs',
  ],
};

// Export workflow metadata for MCP resource exposure
export const WORKFLOW_METADATA = {
  totalWorkflows: Object.keys(DOCUMENTATION_WORKFLOWS).length,
  workflowNames: Object.keys(DOCUMENTATION_WORKFLOWS),
  complexityLevels: ['simple', 'moderate', 'complex'],
  estimatedTimeRange: '1-10 minutes depending on workflow and project size',
  toolsUsed: [
    'analyze_repository',
    'recommend_ssg',
    'generate_config',
    'setup_structure',
    'populate_diataxis_content',
    'validate_diataxis_content',
    'deploy_pages',
    'verify_deployment',
  ],
};
