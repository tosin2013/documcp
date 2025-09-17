import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { MCPToolResponse, formatMCPResponse } from '../types/api.js';

const inputSchema = z.object({
  path: z.string(),
  ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
  includeExamples: z.boolean().optional().default(true),
});

// Diataxis structure based on ADR-004
const DIATAXIS_STRUCTURE = {
  tutorials: {
    description: 'Learning-oriented guides for newcomers',
    example: 'getting-started.md',
  },
  'how-to': {
    description: 'Task-oriented guides for specific goals',
    example: 'deploy-to-production.md',
  },
  reference: {
    description: 'Information-oriented technical descriptions',
    example: 'api-documentation.md',
  },
  explanation: {
    description: 'Understanding-oriented conceptual discussions',
    example: 'architecture-overview.md',
  },
};

export async function setupStructure(args: unknown): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { path: docsPath, ssg, includeExamples } = inputSchema.parse(args);

  try {
    const createdDirs: string[] = [];
    const createdFiles: string[] = [];

    // Create base docs directory
    await fs.mkdir(docsPath, { recursive: true });

    // Create Diataxis structure
    for (const [category, info] of Object.entries(DIATAXIS_STRUCTURE)) {
      const categoryPath = path.join(docsPath, category);
      await fs.mkdir(categoryPath, { recursive: true });
      createdDirs.push(categoryPath);

      // Create index file for category
      const indexPath = path.join(categoryPath, 'index.md');
      const indexContent = generateCategoryIndex(category, info.description, ssg, includeExamples);
      await fs.writeFile(indexPath, indexContent);
      createdFiles.push(indexPath);

      // Create example content if requested
      if (includeExamples) {
        const examplePath = path.join(categoryPath, info.example);
        const exampleContent = generateExampleContent(category, info.example, ssg);
        await fs.writeFile(examplePath, exampleContent);
        createdFiles.push(examplePath);
      }
    }

    // Create root index
    const rootIndexPath = path.join(docsPath, 'index.md');
    const rootIndexContent = generateRootIndex(ssg);
    await fs.writeFile(rootIndexPath, rootIndexContent);
    createdFiles.push(rootIndexPath);

    const structureResult = {
      docsPath,
      ssg,
      includeExamples,
      directoriesCreated: createdDirs,
      filesCreated: createdFiles,
      diataxisCategories: Object.keys(DIATAXIS_STRUCTURE),
      totalDirectories: createdDirs.length,
      totalFiles: createdFiles.length,
    };

    const response: MCPToolResponse<typeof structureResult> = {
      success: true,
      data: structureResult,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: 'info',
          title: 'Diataxis Structure Created',
          description: `Successfully created ${createdDirs.length} directories and ${createdFiles.length} files`,
        },
      ],
      nextSteps: [
        {
          action: 'Setup GitHub Pages Deployment',
          toolRequired: 'deploy_pages',
          description: 'Create automated deployment workflow',
          priority: 'medium',
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: 'STRUCTURE_SETUP_FAILED',
        message: `Failed to setup structure: ${error}`,
        resolution: 'Ensure the documentation path is writable and accessible',
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

function generateCategoryIndex(
  category: string,
  description: string,
  ssg: string,
  includeExamples: boolean = true,
): string {
  const title = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');

  let frontmatter = '';
  switch (ssg) {
    case 'docusaurus':
      frontmatter = `---
id: ${category}-index
title: ${title}
sidebar_label: ${title}
---\n\n`;
      break;
    case 'mkdocs':
    case 'jekyll':
    case 'hugo':
      frontmatter = `---
title: ${title}
description: ${description}
---\n\n`;
      break;
  }

  return `${frontmatter}# ${title}

${description}

## Available Guides

This section contains ${category} documentation following the Diataxis framework.

${generateDiataxisExplanation(category)}

## Contents

${
  includeExamples
    ? `- [Example: ${DIATAXIS_STRUCTURE[category as keyof typeof DIATAXIS_STRUCTURE].example}](./${
        DIATAXIS_STRUCTURE[category as keyof typeof DIATAXIS_STRUCTURE].example
      })`
    : '- Coming soon...'
}
`;
}

function generateExampleContent(category: string, filename: string, ssg: string): string {
  const title = filename
    .replace('.md', '')
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  let frontmatter = '';
  switch (ssg) {
    case 'docusaurus':
      frontmatter = `---
id: ${filename.replace('.md', '')}
title: ${title}
sidebar_label: ${title}
---\n\n`;
      break;
    default:
      frontmatter = `---
title: ${title}
---\n\n`;
      break;
  }

  let content = '';
  switch (category) {
    case 'tutorials':
      content = `# ${title}

This tutorial will guide you through the process step by step.

## Prerequisites

Before you begin, ensure you have:
- Requirement 1
- Requirement 2

## Step 1: Initial Setup

Start by...

## Step 2: Configuration

Next, configure...

## Step 3: Verification

Finally, verify...

## Summary

In this tutorial, you learned how to:
- Achievement 1
- Achievement 2
- Achievement 3

## Next Steps

- Explore [How-To Guides](../how-to/)
- Read the [API Reference](../reference/)`;
      break;

    case 'how-to':
      content = `# ${title}

This guide shows you how to accomplish a specific task.

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Steps

### 1. Prepare your environment

\`\`\`bash
# Example command
echo "Setup environment"
\`\`\`

### 2. Execute the task

\`\`\`bash
# Main command
echo "Execute task"
\`\`\`

### 3. Verify results

\`\`\`bash
# Verification command
echo "Verify success"
\`\`\`

## Troubleshooting

If you encounter issues:
- Check condition 1
- Verify setting 2

## Related Guides

- [Another How-To Guide](./another-guide.md)
- [Reference Documentation](../reference/)`;
      break;

    case 'reference':
      content = `# ${title}

Technical reference documentation.

## Overview

This document provides complete reference information for...

## API Endpoints

### GET /api/resource

Retrieves...

**Parameters:**
- \`param1\` (string, required): Description
- \`param2\` (number, optional): Description

**Response:**
\`\`\`json
{
  "field1": "value",
  "field2": 123
}
\`\`\`

### POST /api/resource

Creates...

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| option1 | string | "default" | Description of option1 |
| option2 | boolean | false | Description of option2 |

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| E001 | Error description | How to fix |
| E002 | Error description | How to fix |`;
      break;

    case 'explanation':
      content = `# ${title}

This document explains the concepts and reasoning behind...

## Introduction

Understanding the architecture requires knowledge of...

## Core Concepts

### Concept 1

Explanation of the first core concept...

### Concept 2

Explanation of the second core concept...

## Design Decisions

### Why This Approach?

We chose this approach because...

### Trade-offs

The main trade-offs include:
- Trade-off 1: Benefit vs Cost
- Trade-off 2: Benefit vs Cost

## Comparison with Alternatives

| Approach | Pros | Cons |
|----------|------|------|
| Our Approach | Pro 1, Pro 2 | Con 1 |
| Alternative 1 | Pro 1 | Con 1, Con 2 |
| Alternative 2 | Pro 1, Pro 2 | Con 1 |

## Further Reading

- [Related Tutorial](../tutorials/)
- [Implementation Guide](../how-to/)`;
      break;
  }

  return `${frontmatter}${content}`;
}

function generateRootIndex(ssg: string): string {
  let frontmatter = '';
  switch (ssg) {
    case 'docusaurus':
      frontmatter = `---
id: intro
title: Documentation
sidebar_position: 1
---\n\n`;
      break;
    default:
      frontmatter = `---
title: Documentation
---\n\n`;
      break;
  }

  return `${frontmatter}# Documentation

Welcome to our documentation! This site follows the [Diataxis](https://diataxis.fr/) framework to provide clear, well-organized documentation.

## Documentation Structure

Our documentation is organized into four distinct sections:

### 📚 [Tutorials](./tutorials/)
Learning-oriented guides that take you through a process step by step. Perfect for newcomers who want to get started.

### 🔧 [How-To Guides](./how-to/)
Task-oriented recipes that help you accomplish specific goals. Ideal when you know what you want to do.

### 📖 [Reference](./reference/)
Information-oriented technical descriptions of the system. Essential when you need to look up specific details.

### 💡 [Explanation](./explanation/)
Understanding-oriented discussions that clarify and illuminate topics. Great for deepening your knowledge.

## Quick Start

New to this project? Start with our [Getting Started Tutorial](./tutorials/getting-started.md).

## Contributing

We welcome contributions to our documentation! Please see our [Contributing Guide](./how-to/contribute.md) for details.
`;
}

function generateDiataxisExplanation(category: string): string {
  const explanations: Record<string, string> = {
    tutorials: `
**Tutorials** are learning-oriented and help newcomers get started:
- Take the reader through a process step by step
- Focus on learning by doing
- Ensure the reader succeeds in accomplishing something
- Build confidence through success`,
    'how-to': `
**How-To Guides** are task-oriented and help users accomplish specific goals:
- Solve specific problems
- Assume some knowledge and experience
- Provide a series of steps
- Focus on results`,
    reference: `
**Reference** documentation is information-oriented:
- Describe the machinery
- Be accurate and complete
- Focus on describing, not explaining
- Structure content for finding information`,
    explanation: `
**Explanation** documentation is understanding-oriented:
- Clarify and illuminate a topic
- Provide context and background
- Discuss alternatives and opinions
- Focus on understanding, not instruction`,
  };

  return explanations[category] || '';
}
