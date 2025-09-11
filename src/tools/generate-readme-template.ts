import { z } from 'zod';

// Template types
export const TemplateType = z.enum(['library', 'application', 'cli-tool', 'api', 'documentation']);
export type TemplateType = z.infer<typeof TemplateType>;

// Input schema
export const GenerateReadmeTemplateSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Project description is required'),
  templateType: TemplateType,
  author: z.string().optional(),
  license: z.string().default('MIT'),
  includeScreenshots: z.boolean().default(false),
  includeBadges: z.boolean().default(true),
  includeContributing: z.boolean().default(true),
  outputPath: z.string().optional()
});

export type GenerateReadmeTemplateInput = z.infer<typeof GenerateReadmeTemplateSchema>;

interface TemplateSection {
  title: string;
  content: string;
  required: boolean;
}

interface ReadmeTemplate {
  sections: TemplateSection[];
  badges: string[];
  metadata: {
    type: TemplateType;
    estimatedLength: number;
  };
}

export class ReadmeTemplateGenerator {
  private templates: Map<TemplateType, ReadmeTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Library/Package Template
    this.templates.set('library', {
      sections: [
        {
          title: 'Header',
          content: '# {{projectName}}\n\n> {{description}}',
          required: true
        },
        {
          title: 'Badges',
          content: '{{badges}}',
          required: false
        },
        {
          title: 'TL;DR',
          content: '## TL;DR\n\nWhat it does in 2-3 sentences. Who should use it.\n\n- ✅ Perfect for X use cases\n- ✅ Solves Y problems\n- ❌ Not suitable for Z (consider [alternative] instead)',
          required: true
        },
        {
          title: 'Quick Start',
          content: '## Quick Start\n\n### Install\n\n```bash\nnpm install {{projectName}}\n```\n\n### Use\n\n```javascript\nconst {{camelCaseName}} = require(\'{{projectName}}\');\n\n// Basic usage example\nconst result = {{camelCaseName}}.doSomething();\nconsole.log(result);\n```',
          required: true
        },
        {
          title: 'API Documentation',
          content: '## API Documentation\n\n[Link to full API documentation]\n\n### Core Methods\n\n#### `methodName(param)`\n\n- **param** `{Type}` - Description\n- **Returns** `{Type}` - Description\n\nExample:\n```javascript\n// Example usage\n```',
          required: true
        },
        {
          title: 'Contributing',
          content: '## Contributing\n\nWe welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.\n\n### Development Setup\n\n```bash\ngit clone https://github.com/{{author}}/{{projectName}}.git\ncd {{projectName}}\nnpm install\nnpm test\n```',
          required: false
        },
        {
          title: 'License',
          content: '## License\n\n{{license}} © {{author}}',
          required: true
        }
      ],
      badges: [
        '[![npm version](https://badge.fury.io/js/{{projectName}}.svg)](https://badge.fury.io/js/{{projectName}})',
        '[![Build Status](https://travis-ci.org/{{author}}/{{projectName}}.svg?branch=main)](https://travis-ci.org/{{author}}/{{projectName}})',
        '[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})'
      ],
      metadata: {
        type: 'library',
        estimatedLength: 150
      }
    });

    // Application Template
    this.templates.set('application', {
      sections: [
        {
          title: 'Header',
          content: '# {{projectName}}\n\n> {{description}}',
          required: true
        },
        {
          title: 'Screenshot',
          content: '{{screenshot}}',
          required: false
        },
        {
          title: 'What This Does',
          content: '## What This Does\n\n{{projectName}} helps you:\n\n- 🎯 **Feature 1** - Brief explanation\n- ⚡ **Feature 2** - Brief explanation\n- 🔧 **Feature 3** - Brief explanation',
          required: true
        },
        {
          title: 'Quick Start',
          content: '## Quick Start\n\n### Prerequisites\n\n- Node.js 18+ \n- npm or yarn\n- [Additional requirements]\n\n### Install & Run\n\n```bash\ngit clone https://github.com/{{author}}/{{projectName}}.git\ncd {{projectName}}\nnpm install\nnpm start\n```\n\nOpen http://localhost:3000 in your browser.',
          required: true
        },
        {
          title: 'Configuration',
          content: '## Configuration\n\nCreate a `.env` file in the root directory:\n\n```env\n# Required settings\nPORT=3000\nNODE_ENV=development\n\n# Optional settings\nDATABASE_URL=your_database_url\nAPI_KEY=your_api_key\n```\n\nSee [Configuration Guide](docs/configuration.md) for all options.',
          required: true
        },
        {
          title: 'Usage',
          content: '## Usage\n\n### Basic Operations\n\n1. **Step 1** - Description\n2. **Step 2** - Description\n3. **Step 3** - Description\n\n### Advanced Features\n\n[Link to advanced documentation]',
          required: true
        },
        {
          title: 'Contributing',
          content: '## Contributing\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.',
          required: false
        },
        {
          title: 'License',
          content: '## License\n\n{{license}} © {{author}}',
          required: true
        }
      ],
      badges: [
        '[![Build Status](https://github.com/{{author}}/{{projectName}}/workflows/CI/badge.svg)](https://github.com/{{author}}/{{projectName}}/actions)',
        '[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-blue.svg)](LICENSE)'
      ],
      metadata: {
        type: 'application',
        estimatedLength: 200
      }
    });

    // CLI Tool Template
    this.templates.set('cli-tool', {
      sections: [
        {
          title: 'Header',
          content: '# {{projectName}}\n\n> {{description}}',
          required: true
        },
        {
          title: 'Installation',
          content: '## Installation\n\n```bash\n# Global installation\nnpm install -g {{projectName}}\n\n# Or use with npx\nnpx {{projectName}} --help\n```',
          required: true
        },
        {
          title: 'Usage',
          content: '## Usage\n\n### Basic Commands\n\n```bash\n# Basic usage\n{{projectName}} [options] [arguments]\n\n# Show help\n{{projectName}} --help\n\n# Show version\n{{projectName}} --version\n```\n\n### Examples\n\n```bash\n# Example 1\n{{projectName}} command --option value\n\n# Example 2\n{{projectName}} another-command file.txt\n```',
          required: true
        },
        {
          title: 'Options',
          content: '## Options\n\n| Option | Description | Default |\n|--------|-------------|----------|\n| `-h, --help` | Show help | |\n| `-v, --version` | Show version | |\n| `--config <path>` | Config file path | `./config.json` |\n| `--verbose` | Verbose output | `false` |',
          required: true
        },
        {
          title: 'Configuration',
          content: '## Configuration\n\nCreate a config file:\n\n```json\n{\n  "setting1": "value1",\n  "setting2": "value2"\n}\n```',
          required: false
        },
        {
          title: 'Contributing',
          content: '## Contributing\n\nSee [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.',
          required: false
        },
        {
          title: 'License',
          content: '## License\n\n{{license}} © {{author}}',
          required: true
        }
      ],
      badges: [
        '[![npm version](https://badge.fury.io/js/{{projectName}}.svg)](https://www.npmjs.com/package/{{projectName}})',
        '[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-green.svg)](LICENSE)'
      ],
      metadata: {
        type: 'cli-tool',
        estimatedLength: 180
      }
    });
  }

  generateTemplate(input: GenerateReadmeTemplateInput): string {
    const template = this.templates.get(input.templateType);
    if (!template) {
      throw new Error(`Template type "${input.templateType}" not supported`);
    }

    let readme = '';
    const camelCaseName = this.toCamelCase(input.projectName);

    // Process each section
    for (const section of template.sections) {
      if (section.title === 'Badges' && input.includeBadges) {
        readme += this.processBadges(template.badges, input) + '\n\n';
      } else if (section.title === 'Screenshot' && input.includeScreenshots) {
        readme += this.processScreenshot(input) + '\n\n';
      } else if (section.title === 'Contributing' && !input.includeContributing) {
        continue;
      } else {
        readme += this.processSection(section.content, input, camelCaseName) + '\n\n';
      }
    }

    return readme.trim();
  }

  private processBadges(badges: string[], input: GenerateReadmeTemplateInput): string {
    return badges
      .map(badge => this.replaceVariables(badge, input))
      .join('\n');
  }

  private processScreenshot(input: GenerateReadmeTemplateInput): string {
    return `![${input.projectName} Screenshot](docs/screenshot.png)\n\n*Add a screenshot or demo GIF here*`;
  }

  private processSection(content: string, input: GenerateReadmeTemplateInput, camelCaseName: string): string {
    let processed = this.replaceVariables(content, input);
    processed = processed.replace(/\{\{camelCaseName\}\}/g, camelCaseName);
    return processed;
  }

  private replaceVariables(content: string, input: GenerateReadmeTemplateInput): string {
    return content
      .replace(/\{\{projectName\}\}/g, input.projectName)
      .replace(/\{\{description\}\}/g, input.description)
      .replace(/\{\{author\}\}/g, input.author || 'your-username')
      .replace(/\{\{license\}\}/g, input.license);
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^./, c => c.toLowerCase());
  }

  getAvailableTemplates(): TemplateType[] {
    return Array.from(this.templates.keys());
  }

  getTemplateInfo(type: TemplateType): ReadmeTemplate['metadata'] | null {
    const template = this.templates.get(type);
    return template ? template.metadata : null;
  }
}

export async function generateReadmeTemplate(input: GenerateReadmeTemplateInput): Promise<{
  content: string;
  metadata: {
    templateType: TemplateType;
    estimatedLength: number;
    sectionsIncluded: number;
  };
}> {
  const validatedInput = GenerateReadmeTemplateSchema.parse(input);
  const generator = new ReadmeTemplateGenerator();
  
  const content = generator.generateTemplate(validatedInput);
  const templateInfo = generator.getTemplateInfo(validatedInput.templateType);
  
  if (!templateInfo) {
    throw new Error(`Template type "${validatedInput.templateType}" not found`);
  }

  // Write to file if output path specified
  if (validatedInput.outputPath) {
    const fs = await import('fs/promises');
    await fs.writeFile(validatedInput.outputPath, content, 'utf-8');
  }

  return {
    content,
    metadata: {
      templateType: validatedInput.templateType,
      estimatedLength: templateInfo.estimatedLength,
      sectionsIncluded: content.split('##').length - 1
    }
  };
}
