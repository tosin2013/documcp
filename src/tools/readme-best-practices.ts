import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { MCPToolResponse } from '../types/api.js';

// Input validation schema
const ReadmeBestPracticesInputSchema = z.object({
  readme_path: z.string().describe('Path to the README file to analyze'),
  project_type: z.enum(['library', 'application', 'tool', 'documentation', 'framework']).optional().default('library').describe('Type of project for tailored analysis'),
  generate_template: z.boolean().optional().default(false).describe('Generate README templates and community files'),
  output_directory: z.string().optional().describe('Directory to write generated templates and community files'),
  include_community_files: z.boolean().optional().default(true).describe('Generate community health files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.)'),
  target_audience: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).optional().default('mixed').describe('Target audience for recommendations'),
});

type ReadmeBestPracticesInput = z.infer<typeof ReadmeBestPracticesInputSchema>;

interface ChecklistItem {
  category: string;
  item: string;
  present: boolean;
  severity: 'critical' | 'important' | 'recommended';
  description: string;
  example?: string;
}

interface BestPracticesReport {
  overallScore: number;
  grade: string;
  checklist: ChecklistItem[];
  recommendations: string[];
  templates: Record<string, string>;
  communityFiles: Record<string, string>;
  summary: {
    criticalIssues: number;
    importantIssues: number;
    recommendedImprovements: number;
    sectionsPresent: number;
    totalSections: number;
    estimatedImprovementTime: string;
  };
}

export async function readmeBestPractices(input: Partial<ReadmeBestPracticesInput>): Promise<MCPToolResponse<{ bestPracticesReport: BestPracticesReport; recommendations: string[]; nextSteps: string[] }>> {
  const startTime = Date.now();
  
  try {
    // Validate input with defaults
    const validatedInput = ReadmeBestPracticesInputSchema.parse(input);
    const { readme_path, project_type, generate_template, output_directory, include_community_files, target_audience } = validatedInput;

    // Read README content
    let readmeContent = '';
    let readmeExists = true;
    try {
      readmeContent = await readFile(readme_path, 'utf-8');
    } catch (error) {
      // readmeExists = false;
      if (!generate_template) {
        return {
          success: false,
          error: {
            code: 'README_NOT_FOUND',
            message: 'README file not found. Use generate_template: true to create a new README.',
            details: error instanceof Error ? error.message : 'Unknown error',
            resolution: 'Set generate_template: true to create a new README from template'
          },
          metadata: {
            toolVersion: '1.0.0',
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    // Generate checklist based on project type and content
    const checklist = generateChecklist(readmeContent, project_type, target_audience);
    
    // Calculate overall score
    const { score, grade } = calculateOverallScore(checklist);
    
    // Generate recommendations
    const recommendations = generateRecommendations(checklist, project_type, target_audience);
    
    // Generate templates if requested
    const templates = generate_template ? generateTemplates(project_type, generate_template) : {};
    
    // Generate community files if requested
    const communityFiles = include_community_files ? generateCommunityFiles(project_type) : {};
    
    // Calculate summary metrics
    const summary = calculateSummaryMetrics(checklist);
    
    // Write files if output directory specified
    if (output_directory && generate_template) {
      await writeGeneratedFiles(templates, communityFiles, output_directory, readme_path);
    }
    
    const report: BestPracticesReport = {
      overallScore: score,
      grade,
      checklist,
      recommendations,
      templates,
      communityFiles,
      summary
    };

    const nextSteps = generateNextSteps(report.checklist, true, output_directory);

    return {
      success: true,
      data: {
        bestPracticesReport: report,
        recommendations,
        nextSteps
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        analysisId: `readme-best-practices-${Date.now()}`
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: 'Failed to analyze README best practices',
        details: error instanceof Error ? error.message : 'Unknown error',
        resolution: 'Check README file path and permissions, ensure valid project type'
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }
}

function generateChecklist(content: string, projectType: string, _targetAudience: string): ChecklistItem[] {
  const checklist: ChecklistItem[] = [];
  const lines = content.split('\n');
  const lowerContent = content.toLowerCase();

  // Essential Sections
  checklist.push({
    category: 'Essential Sections',
    item: 'Project Title',
    present: /^#\s+.+/m.test(content),
    severity: 'critical',
    description: 'Clear, descriptive project title as main heading',
    example: '# My Awesome Project'
  });

  checklist.push({
    category: 'Essential Sections',
    item: 'One-line Description',
    present: />\s*.+/.test(content) || lines.some(line => line.trim().length > 20 && line.trim().length < 100 && !line.startsWith('#')),
    severity: 'critical',
    description: 'Brief one-line description of what the project does',
    example: '> A fast, lightweight JavaScript framework for building web applications'
  });

  checklist.push({
    category: 'Essential Sections',
    item: 'Installation Instructions',
    present: /install/i.test(lowerContent) && (/npm|yarn|pip|cargo|go get|git clone/i.test(lowerContent)),
    severity: 'critical',
    description: 'Clear installation or setup instructions',
    example: '```bash\nnpm install package-name\n```'
  });

  checklist.push({
    category: 'Essential Sections',
    item: 'Basic Usage Example',
    present: /usage|example|quick start|getting started/i.test(lowerContent) && /```/.test(content),
    severity: 'critical',
    description: 'Working code example showing basic usage',
    example: '```javascript\nconst lib = require("package-name");\nlib.doSomething();\n```'
  });

  // Important Sections
  checklist.push({
    category: 'Important Sections',
    item: 'Prerequisites/Requirements',
    present: /prerequisite|requirement|dependencies|node|python|java|version/i.test(lowerContent),
    severity: 'important',
    description: 'Clear system requirements and dependencies',
    example: '- Node.js 16+\n- Docker (optional)'
  });

  checklist.push({
    category: 'Important Sections',
    item: 'License Information',
    present: /license/i.test(lowerContent) || /mit|apache|gpl|bsd/i.test(lowerContent),
    severity: 'important',
    description: 'Clear license information',
    example: '## License\n\nMIT License - see [LICENSE](LICENSE) file'
  });

  checklist.push({
    category: 'Important Sections',
    item: 'Contributing Guidelines',
    present: /contribut/i.test(lowerContent),
    severity: 'important',
    description: 'Information on how to contribute to the project',
    example: 'See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines'
  });

  // Community Health
  checklist.push({
    category: 'Community Health',
    item: 'Code of Conduct',
    present: /code of conduct/i.test(lowerContent),
    severity: 'recommended',
    description: 'Link to code of conduct for community projects',
    example: 'Please read our [Code of Conduct](CODE_OF_CONDUCT.md)'
  });

  checklist.push({
    category: 'Community Health',
    item: 'Issue Templates',
    present: /issue template|bug report|feature request/i.test(lowerContent),
    severity: 'recommended',
    description: 'Reference to issue templates for better bug reports',
    example: 'Use our [issue templates](.github/ISSUE_TEMPLATE/) when reporting bugs'
  });

  // Visual Elements
  checklist.push({
    category: 'Visual Elements',
    item: 'Badges',
    present: /\[!\[.*\]\(.*\)\]\(.*\)/.test(content) || /badge/i.test(lowerContent),
    severity: 'recommended',
    description: 'Status badges for build, version, license, etc.',
    example: '[![Build Status](badge-url)](link-url)'
  });

  checklist.push({
    category: 'Visual Elements',
    item: 'Screenshots/Demo',
    present: /!\[.*\]\(.*\.(png|jpg|jpeg|gif|webp)\)/i.test(content) || /screenshot|demo|gif/i.test(lowerContent),
    severity: projectType === 'application' || projectType === 'tool' ? 'important' : 'recommended',
    description: 'Visual demonstration of the project (especially for applications)',
    example: '![Demo](demo.gif)'
  });

  // Content Quality
  checklist.push({
    category: 'Content Quality',
    item: 'Appropriate Length',
    present: lines.length >= 20 && lines.length <= 300,
    severity: 'important',
    description: 'README length appropriate for project complexity (20-300 lines)',
    example: 'Keep main README focused, link to detailed docs'
  });

  checklist.push({
    category: 'Content Quality',
    item: 'Clear Section Headers',
    present: (content.match(/^##\s+/gm) || []).length >= 3,
    severity: 'important',
    description: 'Well-organized content with clear section headers',
    example: '## Installation\n## Usage\n## Contributing'
  });

  checklist.push({
    category: 'Content Quality',
    item: 'Working Links',
    present: !/\[.*\]\(\)/.test(content) && !/\[.*\]\(#\)/.test(content),
    severity: 'important',
    description: 'All links should be functional (no empty or placeholder links)',
    example: '[Documentation](https://example.com/docs)'
  });

  // Project-specific checks
  if (projectType === 'library' || projectType === 'framework') {
    checklist.push({
      category: 'Library Specific',
      item: 'API Documentation',
      present: /api|methods|functions|reference/i.test(lowerContent),
      severity: 'important',
      description: 'API documentation or link to detailed API reference',
      example: 'See [API Documentation](docs/api.md) for detailed method reference'
    });
  }

  if (projectType === 'application' || projectType === 'tool') {
    checklist.push({
      category: 'Application Specific',
      item: 'Configuration Options',
      present: /config|settings|options|environment/i.test(lowerContent),
      severity: 'important',
      description: 'Configuration and customization options',
      example: 'See [Configuration Guide](docs/configuration.md)'
    });
  }

  return checklist;
}

function calculateOverallScore(checklist: ChecklistItem[]): { score: number; grade: string } {
  const weights = { critical: 3, important: 2, recommended: 1 };
  let totalScore = 0;
  let maxScore = 0;

  checklist.forEach(item => {
    const weight = weights[item.severity];
    maxScore += weight;
    if (item.present) {
      totalScore += weight;
    }
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  let grade: string;
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';
  else grade = 'F';

  return { score: percentage, grade };
}

function generateRecommendations(checklist: ChecklistItem[], projectType: string, targetAudience: string): string[] {
  const recommendations: string[] = [];
  const missing = checklist.filter(item => !item.present);
  
  // Critical issues first
  const critical = missing.filter(item => item.severity === 'critical');
  if (critical.length > 0) {
    recommendations.push(`🚨 Critical: Fix ${critical.length} essential sections: ${critical.map(item => item.item).join(', ')}`);
  }

  // Important issues
  const important = missing.filter(item => item.severity === 'important');
  if (important.length > 0) {
    recommendations.push(`⚠️ Important: Add ${important.length} key sections: ${important.map(item => item.item).join(', ')}`);
  }

  // Project-specific recommendations
  if (projectType === 'library') {
    recommendations.push('📚 Library Focus: Emphasize installation, basic usage, and API documentation');
  } else if (projectType === 'application') {
    recommendations.push('🖥️ Application Focus: Include screenshots, configuration options, and deployment guides');
  }

  // Target audience specific recommendations
  if (targetAudience === 'beginner') {
    recommendations.push('👶 Beginner-Friendly: Use simple language, provide detailed examples, include troubleshooting');
  } else if (targetAudience === 'advanced') {
    recommendations.push('🎯 Advanced Users: Focus on technical details, performance notes, and extensibility');
  }

  // General improvements
  const recommended = missing.filter(item => item.severity === 'recommended');
  if (recommended.length > 0) {
    recommendations.push(`✨ Enhancement: Consider adding ${recommended.map(item => item.item).join(', ')}`);
  }

  return recommendations;
}

function generateTemplates(projectType: string, _generateTemplate: boolean): Record<string, string> {
  const templates: Record<string, string> = {};

  if (projectType === 'library') {
    templates['README-library.md'] = `# Project Name

> One-line description of what this library does

[![Build Status][build-badge]][build-link]
[![npm version][npm-badge]][npm-link]
[![License][license-badge]][license-link]

## TL;DR

What it does in 2-3 sentences. Who should use it.

## Quick Start

### Install
\`\`\`bash
npm install package-name
\`\`\`

### Use
\`\`\`javascript
const lib = require('package-name');

// Basic usage example
const result = lib.doSomething();
console.log(result);
\`\`\`

## When to Use This

- ✅ When you need X functionality
- ✅ When you want Y capability
- ❌ When you need Z (use [alternative] instead)

## API Reference

### \`doSomething(options)\`

Description of the main method.

**Parameters:**
- \`options\` (Object): Configuration options
  - \`param1\` (string): Description of parameter
  - \`param2\` (boolean, optional): Description of optional parameter

**Returns:** Description of return value

**Example:**
\`\`\`javascript
const result = lib.doSomething({
  param1: 'value',
  param2: true
});
\`\`\`

## Full Documentation

[Link to full documentation](docs/)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

[build-badge]: https://github.com/username/repo/workflows/CI/badge.svg
[build-link]: https://github.com/username/repo/actions
[npm-badge]: https://img.shields.io/npm/v/package-name.svg
[npm-link]: https://www.npmjs.com/package/package-name
[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license-link]: LICENSE
`;
  }

  if (projectType === 'application' || projectType === 'tool') {
    templates['README-application.md'] = `# Project Name

> One-line description of what this application does

![Demo](demo.gif)

## What This Does

Brief explanation of the application's purpose and key features:

- 🚀 Feature 1: Description
- 📊 Feature 2: Description  
- 🔧 Feature 3: Description

## Quick Start

### Prerequisites
- Node.js 16+
- Docker (optional)
- Other requirements

### Install & Run
\`\`\`bash
git clone https://github.com/username/repo.git
cd project-name
npm install
npm start
\`\`\`

Visit \`http://localhost:3000\` to see the application.

## Configuration

### Environment Variables
\`\`\`bash
# Copy example config
cp .env.example .env

# Edit configuration
nano .env
\`\`\`

### Key Settings
- \`PORT\`: Server port (default: 3000)
- \`DATABASE_URL\`: Database connection string
- \`API_KEY\`: External service API key

## Usage Examples

### Basic Usage
\`\`\`bash
npm run command -- --option value
\`\`\`

### Advanced Usage
\`\`\`bash
npm run command -- --config custom.json --verbose
\`\`\`

## Deployment

See [Deployment Guide](docs/deployment.md) for production setup.

## Troubleshooting

### Common Issues

**Issue 1: Error message**
- Solution: Steps to resolve

**Issue 2: Another error**
- Solution: Steps to resolve

See [FAQ](docs/FAQ.md) for more help.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.
`;
  }

  return templates;
}

function generateCommunityFiles(_projectType: string): Record<string, string> {
  const files: Record<string, string> = {};

  files['CONTRIBUTING.md'] = `# Contributing to Project Name

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/yourusername/repo.git\`
3. Create a feature branch: \`git checkout -b feature-name\`
4. Make your changes
5. Test your changes: \`npm test\`
6. Commit your changes: \`git commit -m "Description of changes"\`
7. Push to your fork: \`git push origin feature-name\`
8. Create a Pull Request

## Development Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Code Style

- Use TypeScript for new code
- Follow existing code formatting
- Run \`npm run lint\` before committing
- Add tests for new features

## Pull Request Guidelines

- Keep PRs focused and small
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes
- Link to relevant issues

## Reporting Issues

Use our [issue templates](.github/ISSUE_TEMPLATE/) when reporting bugs or requesting features.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).
`;

  files['CODE_OF_CONDUCT.md'] = `# Code of Conduct

## Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior include:

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## Enforcement

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org/), version 1.4.
`;

  files['SECURITY.md'] = `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

1. **Do not** create a public issue
2. Email security@example.com with details
3. Include steps to reproduce if possible
4. We will respond within 48 hours

## Security Best Practices

When using this project:

- Keep dependencies updated
- Use environment variables for secrets
- Follow principle of least privilege
- Regularly audit your setup

Thank you for helping keep our project secure!
`;

  return files;
}

async function writeGeneratedFiles(templates: Record<string, string>, communityFiles: Record<string, string>, outputDirectory: string, _originalReadmePath: string): Promise<void> {
  try {
    // Create output directory
    await mkdir(outputDirectory, { recursive: true });

    // Write templates
    for (const [filename, content] of Object.entries(templates)) {
      const filePath = join(outputDirectory, filename);
      await writeFile(filePath, content, 'utf-8');
    }

    // Write community files
    for (const [filename, content] of Object.entries(communityFiles)) {
      const filePath = join(outputDirectory, filename);
      await writeFile(filePath, content, 'utf-8');
    }

    // Create .github directory structure
    const githubDir = join(outputDirectory, '.github');
    await mkdir(githubDir, { recursive: true });
    
    const issueTemplateDir = join(githubDir, 'ISSUE_TEMPLATE');
    await mkdir(issueTemplateDir, { recursive: true });

    // Bug report template
    const bugReportTemplate = `---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
`;

    await writeFile(join(issueTemplateDir, 'bug_report.yml'), bugReportTemplate, 'utf-8');

    // Feature request template
    const featureRequestTemplate = `---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
`;

    await writeFile(join(issueTemplateDir, 'feature_request.yml'), featureRequestTemplate, 'utf-8');

    // Pull request template
    const prTemplate = `## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
`;

    await writeFile(join(githubDir, 'PULL_REQUEST_TEMPLATE.md'), prTemplate, 'utf-8');

  } catch (error) {
    throw new Error(`Failed to write generated files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateSummaryMetrics(checklist: ChecklistItem[]) {
  const criticalIssues = checklist.filter(item => !item.present && item.severity === 'critical').length;
  const importantIssues = checklist.filter(item => !item.present && item.severity === 'important').length;
  const recommendedImprovements = checklist.filter(item => !item.present && item.severity === 'recommended').length;
  const sectionsPresent = checklist.filter(item => item.present).length;
  const totalSections = checklist.length;

  // Estimate improvement time based on missing items
  const totalMissing = criticalIssues + importantIssues + recommendedImprovements;
  let estimatedTime = '';
  if (totalMissing === 0) {
    estimatedTime = 'No improvements needed';
  } else if (totalMissing <= 3) {
    estimatedTime = '30 minutes - 1 hour';
  } else if (totalMissing <= 6) {
    estimatedTime = '1-2 hours';
  } else if (totalMissing <= 10) {
    estimatedTime = '2-4 hours';
  } else {
    estimatedTime = '4+ hours (consider phased approach)';
  }

  return {
    criticalIssues,
    importantIssues,
    recommendedImprovements,
    sectionsPresent,
    totalSections,
    estimatedImprovementTime: estimatedTime
  };
}

function generateNextSteps(checklist: ChecklistItem[], generateTemplate: boolean, outputDirectory?: string): string[] {
  const nextSteps: string[] = [];
  const missing = checklist.filter(item => !item.present);

  if (missing.length === 0) {
    nextSteps.push('✅ README follows all best practices - no immediate action needed');
    nextSteps.push('📊 Consider periodic reviews to maintain quality as project evolves');
    return nextSteps;
  }

  // Critical issues first
  const critical = missing.filter(item => item.severity === 'critical');
  if (critical.length > 0) {
    nextSteps.push(`🚨 Priority 1: Address ${critical.length} critical issues immediately`);
    critical.forEach(item => {
      nextSteps.push(`   • Add ${item.item}: ${item.description}`);
    });
  }

  // Important issues
  const important = missing.filter(item => item.severity === 'important');
  if (important.length > 0) {
    nextSteps.push(`⚠️ Priority 2: Address ${important.length} important sections within 1 week`);
  }

  // Template usage
  if (generateTemplate && outputDirectory) {
    nextSteps.push(`📝 Review generated templates in ${outputDirectory}/`);
    nextSteps.push('🔄 Customize templates to match your project specifics');
    nextSteps.push('📋 Use community files (.github templates, CONTRIBUTING.md) to improve project health');
  }

  // General improvements
  nextSteps.push('🔍 Run this analysis periodically to maintain README quality');
  nextSteps.push('👥 Consider getting feedback from new users on README clarity');

  return nextSteps;
}
