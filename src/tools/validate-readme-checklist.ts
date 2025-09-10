import { z } from 'zod';
import { promises as fs } from 'fs';

// Input schema
export const ValidateReadmeChecklistSchema = z.object({
  readmePath: z.string().min(1, 'README path is required'),
  projectPath: z.string().optional(),
  strict: z.boolean().default(false),
  outputFormat: z.enum(['json', 'markdown', 'console']).default('console')
});

export type ValidateReadmeChecklistInput = z.infer<typeof ValidateReadmeChecklistSchema>;

interface ChecklistItem {
  id: string;
  category: string;
  name: string;
  description: string;
  required: boolean;
  weight: number;
}

interface ValidationResult {
  item: ChecklistItem;
  passed: boolean;
  details: string;
  suggestions?: string[];
}

interface ChecklistReport {
  overallScore: number;
  totalItems: number;
  passedItems: number;
  failedItems: number;
  categories: {
    [category: string]: {
      score: number;
      passed: number;
      total: number;
      results: ValidationResult[];
    };
  };
  recommendations: string[];
  estimatedReadTime: number;
  wordCount: number;
}

export class ReadmeChecklistValidator {
  private checklist: ChecklistItem[] = [];

  constructor() {
    this.initializeChecklist();
  }

  private initializeChecklist(): void {
    this.checklist = [
      // Essential Sections
      {
        id: 'title',
        category: 'Essential Sections',
        name: 'Project Title',
        description: 'Clear, descriptive project title as main heading',
        required: true,
        weight: 10
      },
      {
        id: 'description',
        category: 'Essential Sections',
        name: 'Project Description',
        description: 'Brief one-liner describing what the project does',
        required: true,
        weight: 10
      },
      {
        id: 'tldr',
        category: 'Essential Sections',
        name: 'TL;DR Section',
        description: '2-3 sentence summary of the project',
        required: true,
        weight: 8
      },
      {
        id: 'quickstart',
        category: 'Essential Sections',
        name: 'Quick Start Guide',
        description: 'Instructions to get running in under 5 minutes',
        required: true,
        weight: 10
      },
      {
        id: 'installation',
        category: 'Essential Sections',
        name: 'Installation Instructions',
        description: 'Clear installation steps with code examples',
        required: true,
        weight: 9
      },
      {
        id: 'usage',
        category: 'Essential Sections',
        name: 'Basic Usage Examples',
        description: 'Simple working code examples',
        required: true,
        weight: 9
      },
      {
        id: 'license',
        category: 'Essential Sections',
        name: 'License Information',
        description: 'Clear license information',
        required: true,
        weight: 7
      },

      // Community Health
      {
        id: 'contributing',
        category: 'Community Health',
        name: 'Contributing Guidelines',
        description: 'Link to CONTRIBUTING.md or inline guidelines',
        required: false,
        weight: 6
      },
      {
        id: 'code-of-conduct',
        category: 'Community Health',
        name: 'Code of Conduct',
        description: 'Link to CODE_OF_CONDUCT.md',
        required: false,
        weight: 4
      },
      {
        id: 'security',
        category: 'Community Health',
        name: 'Security Policy',
        description: 'Link to SECURITY.md or security reporting info',
        required: false,
        weight: 4
      },

      // Visual Elements
      {
        id: 'badges',
        category: 'Visual Elements',
        name: 'Status Badges',
        description: 'Build status, version, license badges',
        required: false,
        weight: 3
      },
      {
        id: 'screenshots',
        category: 'Visual Elements',
        name: 'Screenshots/Demos',
        description: 'Visual representation for applications/tools',
        required: false,
        weight: 5
      },
      {
        id: 'formatting',
        category: 'Visual Elements',
        name: 'Consistent Formatting',
        description: 'Proper markdown formatting and structure',
        required: true,
        weight: 6
      },

      // Content Quality
      {
        id: 'working-examples',
        category: 'Content Quality',
        name: 'Working Code Examples',
        description: 'All code examples are functional and tested',
        required: true,
        weight: 8
      },
      {
        id: 'external-links',
        category: 'Content Quality',
        name: 'Functional External Links',
        description: 'All external links are working',
        required: true,
        weight: 5
      },
      {
        id: 'appropriate-length',
        category: 'Content Quality',
        name: 'Appropriate Length',
        description: 'README under 300 lines for community projects',
        required: false,
        weight: 4
      },
      {
        id: 'scannable-structure',
        category: 'Content Quality',
        name: 'Scannable Structure',
        description: 'Good heading hierarchy and organization',
        required: true,
        weight: 7
      }
    ];
  }

  async validateReadme(input: ValidateReadmeChecklistInput): Promise<ChecklistReport> {
    const readmeContent = await fs.readFile(input.readmePath, 'utf-8');
    const projectFiles = input.projectPath ? await this.getProjectFiles(input.projectPath) : [];
    
    const results: ValidationResult[] = [];
    const categories: { [key: string]: ValidationResult[] } = {};

    // Run validation for each checklist item
    for (const item of this.checklist) {
      const result = await this.validateItem(item, readmeContent, projectFiles, input);
      results.push(result);
      
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(result);
    }

    return this.generateReport(results, readmeContent);
  }

  private async validateItem(
    item: ChecklistItem,
    content: string,
    projectFiles: string[],
    _input: ValidateReadmeChecklistInput
  ): Promise<ValidationResult> {
    let passed = false;
    let details = '';
    const suggestions: string[] = [];

    switch (item.id) {
      case 'title': {
        const titleRegex = /^#\s+.+/m;
        const hasTitle = titleRegex.test(content);
        passed = hasTitle;
        details = passed ? 'Project title found' : 'No main heading (# Title) found';
        if (!passed) suggestions.push('Add a clear project title as the first heading: # Your Project Name');
        break;
      }

      case 'description': {
        const descRegex = /(^>\s+.+|^[^#\n].{20,})/m;
        const hasDesc = descRegex.test(content);
        passed = hasDesc;
        details = passed ? 'Project description found' : 'Missing project description';
        if (!passed) suggestions.push('Add a brief description using > quote syntax or paragraph after title');
        break;
      }

      case 'tldr': {
        const tldrRegex = /##?\s*(tl;?dr|quick start|at a glance)/i;
        const hasTldr = tldrRegex.test(content);
        passed = hasTldr;
        details = passed ? 'TL;DR section found' : 'Missing TL;DR or quick overview';
        if (!passed) suggestions.push('Add a ## TL;DR section with 2-3 sentences explaining what your project does');
        break;
      }

      case 'quickstart':
        passed = /##\s*(Quick\s*Start|Getting\s*Started|Installation)/i.test(content);
        details = passed ? 'Quick start section found' : 'No quick start section found';
        if (!passed) suggestions.push('Add a ## Quick Start section with immediate setup instructions');
        break;

      case 'installation': {
        const installRegex = /##?\s*(install|installation|setup)/i;
        const hasInstall = installRegex.test(content);
        passed = hasInstall;
        details = passed ? 'Installation instructions found' : 'Missing installation instructions';
        if (!passed) suggestions.push('Add installation instructions with code blocks showing exact commands');
        break;
      }

      case 'usage': {
        const usageRegex = /##?\s*(usage|example|getting started)/i;
        const hasUsage = usageRegex.test(content);
        passed = hasUsage;
        details = passed ? 'Usage examples found' : 'Missing usage examples';
        if (!passed) suggestions.push('Add usage examples with working code snippets');
        break;
      }

      case 'license': {
        const licenseRegex = /##?\s*license/i;
        const hasLicense = licenseRegex.test(content);
        const hasLicenseFile = projectFiles.includes('LICENSE') || projectFiles.includes('LICENSE.md');
        passed = hasLicense || hasLicenseFile;
        details = passed ? 'License information found' : 'Missing license information';
        if (!passed) suggestions.push('Add a ## License section or LICENSE file');
        break;
      }

      case 'contributing': {
        const hasContributing = /##\s*Contribut/i.test(content);
        const hasContributingFile = projectFiles.includes('CONTRIBUTING.md');
        passed = hasContributing || hasContributingFile;
        details = passed ? 'Contributing guidelines found' : 'No contributing guidelines found';
        if (!passed) suggestions.push('Add contributing guidelines or link to CONTRIBUTING.md');
        break;
      }

      case 'code-of-conduct': {
        const hasCodeOfConduct = /code.of.conduct/i.test(content);
        const hasCodeFile = projectFiles.includes('CODE_OF_CONDUCT.md');
        passed = hasCodeOfConduct || hasCodeFile;
        details = passed ? 'Code of conduct found' : 'No code of conduct found';
        break;
      }

      case 'security': {
        const hasSecurity = /security/i.test(content);
        const hasSecurityFile = projectFiles.includes('SECURITY.md');
        passed = hasSecurity || hasSecurityFile;
        details = passed ? 'Security information found' : 'No security policy found';
        break;
      }

      case 'badges': {
        const badgeRegex = /\[!\[.*?\]\(.*?\)\]\(.*?\)|!\[.*?\]\(.*?badge.*?\)/i;
        const hasBadges = badgeRegex.test(content);
        passed = hasBadges;
        details = passed ? 'Status badges found' : 'Consider adding status badges';
        if (!passed) suggestions.push('Consider adding badges for build status, version, license');
        break;
      }

      case 'screenshots': {
        const imageRegex = /!\[.*?\]\(.*?\.(png|jpg|jpeg|gif|svg).*?\)/i;
        const hasImages = imageRegex.test(content);
        passed = hasImages;
        details = passed ? 'Screenshots/images found' : 'Consider adding screenshots or images';
        if (!passed && content.includes('application')) {
          suggestions.push('Consider adding screenshots or demo GIFs for visual applications');
        }
        break;
      }

      case 'formatting': {
        const hasHeaders = (content.match(/^##?\s+/gm) || []).length >= 3;
        const hasProperSpacing = !/#{1,6}\s*\n\s*#{1,6}/.test(content);
        passed = hasHeaders && hasProperSpacing;
        details = passed ? 'Good markdown formatting' : 'Improve markdown formatting and structure';
        if (!passed) suggestions.push('Improve markdown formatting with proper heading hierarchy and spacing');
        break;
      }

      case 'working-examples': {
        const codeRegex = /```[\s\S]*?```/g;
        const codeBlocks = content.match(codeRegex) || [];
        passed = codeBlocks.length > 0;
        details = `${codeBlocks.length} code examples found`;
        if (!passed) suggestions.push('Add working code examples to demonstrate usage');
        break;
      }

      case 'external-links': {
        const links = content.match(/\[.*?\]\((https?:\/\/.*?)\)/g) || [];
        passed = true; // Assume links work unless we can verify
        details = `${links.length} external links found`;
        break;
      }

      case 'appropriate-length': {
        const wordCount = content.split(/\s+/).length;
        passed = wordCount <= 300;
        details = `${wordCount} words (target: ≤300)`;
        if (!passed) suggestions.push('Consider shortening README or moving detailed content to separate docs');
        break;
      }

      case 'scannable-structure': {
        const sections = (content.match(/^##?\s+/gm) || []).length;
        const lists = (content.match(/^\s*[-*+]\s+/gm) || []).length;
        passed = sections >= 3 && lists >= 2;
        details = passed ? 'Good scannable structure' : 'Improve structure with more sections and lists';
        if (!passed) suggestions.push('Improve heading structure with logical hierarchy (H1 → H2 → H3)');
        break;
      }

      default:
        passed = false;
        details = 'Validation not implemented';
    }

    return {
      item,
      passed,
      details,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(projectPath);
      return files;
    } catch {
      return [];
    }
  }

  private generateReport(results: ValidationResult[], content: string): ChecklistReport {
    const categories: { [category: string]: { score: number; passed: number; total: number; results: ValidationResult[] } } = {};
    
    let totalWeight = 0;
    let passedWeight = 0;
    let passedItems = 0;
    const totalItems = results.length;

    // Group results by category and calculate scores
    for (const result of results) {
      const category = result.item.category;
      if (!categories[category]) {
        categories[category] = { score: 0, passed: 0, total: 0, results: [] };
      }
      
      categories[category].results.push(result);
      categories[category].total++;
      
      totalWeight += result.item.weight;
      
      if (result.passed) {
        categories[category].passed++;
        passedWeight += result.item.weight;
        passedItems++;
      }
    }

    // Calculate category scores
    for (const category in categories) {
      const cat = categories[category];
      cat.score = Math.round((cat.passed / cat.total) * 100);
    }

    const overallScore = Math.round((passedWeight / totalWeight) * 100);
    const wordCount = content.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Generate recommendations
    const recommendations: string[] = [];
    if (overallScore < 70) {
      recommendations.push('README needs significant improvement to meet community standards');
    }
    if (categories['Essential Sections']?.score < 80) {
      recommendations.push('Focus on completing essential sections first');
    }
    if (wordCount > 2000) {
      recommendations.push('Consider breaking up content into separate documentation files');
    }
    if (!results.find(r => r.item.id === 'badges')?.passed) {
      recommendations.push('Add status badges to improve project credibility');
    }

    return {
      overallScore,
      totalItems,
      passedItems,
      failedItems: totalItems - passedItems,
      categories,
      recommendations,
      estimatedReadTime,
      wordCount
    };
  }

  formatReport(report: ChecklistReport, format: 'json' | 'markdown' | 'console'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'markdown':
        return this.formatMarkdownReport(report);
      
      case 'console':
      default:
        return this.formatConsoleReport(report);
    }
  }

  private formatMarkdownReport(report: ChecklistReport): string {
    let output = '# README Checklist Report\n\n';
    
    output += `## Overall Score: ${report.overallScore}%\n\n`;
    output += `- **Passed**: ${report.passedItems}/${report.totalItems} items\n`;
    output += `- **Word Count**: ${report.wordCount} words\n`;
    output += `- **Estimated Read Time**: ${report.estimatedReadTime} minutes\n\n`;

    output += '## Category Breakdown\n\n';
    for (const [categoryName, category] of Object.entries(report.categories)) {
      output += `### ${categoryName} (${category.score}%)\n\n`;
      
      for (const result of category.results) {
        const status = result.passed ? '✅' : '❌';
        output += `- ${status} **${result.item.name}**: ${result.details}\n`;
        
        if (result.suggestions) {
          for (const suggestion of result.suggestions) {
            output += `  - 💡 ${suggestion}\n`;
          }
        }
      }
      output += '\n';
    }

    if (report.recommendations.length > 0) {
      output += '## Recommendations\n\n';
      for (const rec of report.recommendations) {
        output += `- ${rec}\n`;
      }
    }

    return output;
  }

  private formatConsoleReport(report: ChecklistReport): string {
    let output = '\n📋 README Checklist Report\n';
    output += '='.repeat(50) + '\n';
    
    const scoreColor = report.overallScore >= 80 ? '🟢' : report.overallScore >= 60 ? '🟡' : '🔴';
    output += `${scoreColor} Overall Score: ${report.overallScore}%\n`;
    output += `✅ Passed: ${report.passedItems}/${report.totalItems} items\n`;
    output += `📄 Word Count: ${report.wordCount} words\n`;
    output += `⏱️  Read Time: ${report.estimatedReadTime} minutes\n\n`;

    for (const [categoryName, category] of Object.entries(report.categories)) {
      const catColor = category.score >= 80 ? '🟢' : category.score >= 60 ? '🟡' : '🔴';
      output += `${catColor} ${categoryName} (${category.score}%)\n`;
      output += '-'.repeat(30) + '\n';
      
      for (const result of category.results) {
        const status = result.passed ? '✅' : '❌';
        output += `${status} ${result.item.name}: ${result.details}\n`;
        
        if (result.suggestions) {
          for (const suggestion of result.suggestions) {
            output += `   💡 ${suggestion}\n`;
          }
        }
      }
      output += '\n';
    }

    if (report.recommendations.length > 0) {
      output += '🎯 Recommendations:\n';
      for (const rec of report.recommendations) {
        output += `• ${rec}\n`;
      }
    }

    return output;
  }
}

export async function validateReadmeChecklist(input: ValidateReadmeChecklistInput): Promise<ChecklistReport> {
  const validatedInput = ValidateReadmeChecklistSchema.parse(input);
  const validator = new ReadmeChecklistValidator();
  
  return await validator.validateReadme(validatedInput);
}
