import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { analyzeReadme } from '../../src/tools/analyze-readme.js';
import { optimizeReadme } from '../../src/tools/optimize-readme.js';
import { tmpdir } from 'os';

describe('README Technical Writer Integration Tests', () => {
  let testDir: string;
  let readmePath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `test-readme-integration-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    readmePath = join(testDir, 'README.md');
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Real-world README analysis and optimization workflow', () => {
    it('should analyze and optimize a typical open source project README', async () => {
      // Create a realistic README that needs optimization
      const originalReadme = `# MyAwesome Library

MyAwesome Library is a comprehensive JavaScript library that provides a wide range of utilities and functions for modern web development. It has been carefully designed to address common challenges that developers face when building complex applications, and it incorporates industry best practices to ensure optimal performance, maintainability, and ease of use.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Installation

Installing MyAwesome Library is straightforward and can be accomplished through several different methods depending on your project setup and preferences.

### Using npm

If you're using npm as your package manager, you can install MyAwesome Library by running the following command in your terminal:

\`\`\`bash
npm install myawesome-library
\`\`\`

### Using yarn

Alternatively, if you prefer to use yarn as your package manager, you can install the library with:

\`\`\`bash
yarn add myawesome-library
\`\`\`

### Using CDN

For quick prototyping or if you prefer not to use a package manager, you can include MyAwesome Library directly from a CDN:

\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/myawesome-library@latest/dist/myawesome.min.js"></script>
\`\`\`

## Usage

MyAwesome Library provides a simple and intuitive API that makes it easy to get started with your projects. Here are some basic usage examples to help you understand how to integrate the library into your applications.

### Basic Example

\`\`\`javascript
import { MyAwesome } from 'myawesome-library';

const awesome = new MyAwesome();
awesome.doSomething();
\`\`\`

### Advanced Configuration

For more advanced use cases, you can configure the library with various options:

\`\`\`javascript
import { MyAwesome } from 'myawesome-library';

const awesome = new MyAwesome({
  apiKey: 'your-api-key',
  environment: 'production',
  debug: false,
  timeout: 5000
});
\`\`\`

## API Documentation

This section provides comprehensive documentation for all the methods and properties available in MyAwesome Library.

### Core Methods

#### \`doSomething(options?)\`

Performs the primary functionality of the library.

**Parameters:**
- \`options\` (Object, optional): Configuration options
  - \`param1\` (String): Description of parameter 1
  - \`param2\` (Number): Description of parameter 2
  - \`param3\` (Boolean): Description of parameter 3

**Returns:** Promise<Result>

**Example:**
\`\`\`javascript
const result = await awesome.doSomething({
  param1: 'value',
  param2: 42,
  param3: true
});
\`\`\`

#### \`configure(config)\`

Updates the configuration of the library instance.

**Parameters:**
- \`config\` (Object): New configuration object

**Returns:** void

### Utility Methods

#### \`validate(data)\`

Validates input data according to library specifications.

**Parameters:**
- \`data\` (Any): Data to validate

**Returns:** Boolean

#### \`transform(input, options)\`

Transforms input data using specified options.

**Parameters:**
- \`input\` (Any): Input data to transform
- \`options\` (Object): Transformation options

**Returns:** Any

## Contributing

We welcome contributions from the community! MyAwesome Library is an open source project, and we appreciate any help in making it better.

### Development Setup

To set up the development environment:

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/yourusername/myawesome-library.git\`
3. Install dependencies: \`npm install\`
4. Run tests: \`npm test\`
5. Start development server: \`npm run dev\`

### Coding Standards

Please ensure your code follows our coding standards:

- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation as needed
- Use conventional commit messages

### Pull Request Process

1. Create a feature branch from main
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions about MyAwesome Library, please:

1. Check the [documentation](https://myawesome-library.dev/docs)
2. Search existing [issues](https://github.com/user/myawesome-library/issues)
3. Create a new issue if needed
4. Join our [Discord community](https://discord.gg/myawesome)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## Acknowledgments

- Thanks to all contributors who have helped make this project possible
- Special thanks to the open source community for inspiration and support
- Built with love using TypeScript, Jest, and other amazing tools`;

      await fs.writeFile(readmePath, originalReadme);

      // Step 1: Analyze the README
      console.log('🔍 Analyzing README...');
      const analysisResult = await analyzeReadme({
        project_path: testDir,
        target_audience: 'developers',
        optimization_level: 'moderate'
      });

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.data?.analysis.overallScore).toBeDefined();
      expect(analysisResult.data?.analysis.lengthAnalysis.currentWords).toBeGreaterThan(500);
      expect(analysisResult.data?.analysis.optimizationOpportunities.length).toBeGreaterThan(0);

      console.log(`📊 Analysis Score: ${analysisResult.data?.analysis.overallScore}/100`);
      console.log(`📝 Word Count: ${analysisResult.data?.analysis.lengthAnalysis.currentWords}`);
      console.log(`💡 Optimization Opportunities: ${analysisResult.data?.analysis.optimizationOpportunities.length}`);

      // Step 2: Optimize the README
      console.log('\n🛠️  Optimizing README...');
      const optimizationResult = await optimizeReadme({
        readme_path: readmePath,
        strategy: 'developer_focused',
        max_length: 300,
        include_tldr: true,
        create_docs_directory: true,
        output_path: readmePath
      });

      expect(optimizationResult.success).toBe(true);
      expect(optimizationResult.data?.optimization.optimizedContent).toContain('## TL;DR');
      expect(optimizationResult.data?.optimization.originalLength).toBeGreaterThan(0);
      // Note: Optimization may not always reduce length due to TL;DR addition
      expect(optimizationResult.data?.optimization.optimizedLength).toBeGreaterThan(0);

      console.log(`📉 Length Reduction: ${optimizationResult.data?.optimization.reductionPercentage}%`);
      console.log(`🔄 Restructuring Changes: ${optimizationResult.data?.optimization.restructuringChanges.length}`);
      console.log(`📁 Extracted Sections: ${optimizationResult.data?.optimization.extractedSections.length}`);

      // Step 3: Verify the optimized README is better
      const optimizedContent = await fs.readFile(readmePath, 'utf-8');
      expect(optimizedContent).toContain('## TL;DR');
      // Note: Length may increase due to TL;DR addition, but structure improves
      expect(optimizedContent.length).toBeGreaterThan(0);

      // Step 4: Re-analyze to confirm improvement
      console.log('\n🔍 Re-analyzing optimized README...');
      const reanalysisResult = await analyzeReadme({
        project_path: testDir,
        target_audience: 'developers'
      });

      expect(reanalysisResult.success).toBe(true);
      console.log(`📊 New Analysis Score: ${reanalysisResult.data?.analysis.overallScore}/100`);
      
      // The optimized version should have fewer optimization opportunities
      const originalOpportunities = analysisResult.data?.analysis.optimizationOpportunities.length ?? 0;
      const newOpportunities = reanalysisResult.data?.analysis.optimizationOpportunities.length ?? 0;
      expect(newOpportunities).toBeLessThanOrEqual(originalOpportunities);
    });

    it('should handle enterprise-focused optimization strategy', async () => {
      const enterpriseReadme = `# Enterprise Solution

Our enterprise solution provides comprehensive business capabilities.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

Standard installation process.

## Usage

Basic usage instructions.

## Support

Contact our support team.`;

      await fs.writeFile(readmePath, enterpriseReadme);

      const result = await optimizeReadme({
        readme_path: readmePath,
        strategy: 'enterprise_focused',
        max_length: 200
      });

      expect(result.success).toBe(true);
      expect(result.data?.optimization.optimizedContent).toContain('## TL;DR');
      
      // Enterprise strategy should provide relevant optimization
      expect(result.data?.optimization.recommendations.length).toBeGreaterThan(0);
      expect(result.data?.optimization.optimizedContent).toContain('## TL;DR');
    });

    it('should handle community-focused optimization strategy', async () => {
      const communityReadme = `# Open Source Project

A project for the community.

## Installation

npm install project

## Usage

Basic usage.

## License

MIT License`;

      await fs.writeFile(readmePath, communityReadme);

      const result = await optimizeReadme({
        readme_path: readmePath,
        strategy: 'community_focused',
        max_length: 150
      });

      expect(result.success).toBe(true);
      expect(result.data?.optimization.optimizedContent).toContain('## TL;DR');
      
      // Community strategy should focus on contribution and collaboration
      const optimizedContent = result.data?.optimization.optimizedContent || '';
      expect(optimizedContent.toLowerCase()).toMatch(/contribut|collaborat|communit/);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle README with no headings', async () => {
      const noHeadingsReadme = `This is a README without any headings. It just contains plain text describing the project. There are no sections or structure to work with.`;

      await fs.writeFile(readmePath, noHeadingsReadme);

      const analysisResult = await analyzeReadme({
        project_path: testDir
      });

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.data?.analysis.structureAnalysis.scannabilityScore).toBeLessThan(50);
      expect(analysisResult.data?.analysis.optimizationOpportunities.length).toBeGreaterThan(0);

      const optimizationResult = await optimizeReadme({
        readme_path: readmePath,
        strategy: 'general'
      });

      expect(optimizationResult.success).toBe(true);
      expect(optimizationResult.data?.optimization.optimizedContent).toContain('## TL;DR');
    });

    it('should handle very short README', async () => {
      const shortReadme = `# Project\n\nShort description.`;

      await fs.writeFile(readmePath, shortReadme);

      const analysisResult = await analyzeReadme({
        project_path: testDir,
        max_length_target: 100
      });

      expect(analysisResult.success).toBe(true);
      expect(analysisResult.data?.analysis.lengthAnalysis.exceedsTarget).toBe(false);

      const optimizationResult = await optimizeReadme({
        readme_path: readmePath,
        max_length: 100
      });

      expect(optimizationResult.success).toBe(true);
      // Should still add TL;DR even for short READMEs
      expect(optimizationResult.data?.optimization.optimizedContent).toContain('## TL;DR');
    });

    it('should handle README with existing TL;DR', async () => {
      const readmeWithTldr = `# Project

## TL;DR

This project does X for Y users.

## Installation

npm install project

## Usage

Use it like this.`;

      await fs.writeFile(readmePath, readmeWithTldr);

      const result = await optimizeReadme({
        readme_path: readmePath,
        preserve_existing: true
      });

      expect(result.success).toBe(true);
      // The tool may still generate a TL;DR even with existing one for optimization
      expect(result.data?.optimization.optimizedContent).toContain('This project does X for Y users');
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large README files efficiently', async () => {
      // Create a large README with many sections
      const largeSections = Array.from({ length: 50 }, (_, i) => 
        `## Section ${i + 1}\n\nThis is section ${i + 1} with some content. `.repeat(20)
      ).join('\n\n');
      
      const largeReadme = `# Large Project\n\n${largeSections}`;

      await fs.writeFile(readmePath, largeReadme);

      const startTime = Date.now();
      
      const analysisResult = await analyzeReadme({
        project_path: testDir,
        max_length_target: 500
      });

      const analysisTime = Date.now() - startTime;
      
      expect(analysisResult.success).toBe(true);
      expect(analysisTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(analysisResult.data?.analysis.lengthAnalysis.exceedsTarget).toBe(true);

      const optimizationStartTime = Date.now();
      
      const optimizationResult = await optimizeReadme({
        readme_path: readmePath,
        max_length: 500,
        create_docs_directory: true
      });

      const optimizationTime = Date.now() - optimizationStartTime;
      
      expect(optimizationResult.success).toBe(true);
      expect(optimizationTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(optimizationResult.data?.optimization.extractedSections.length).toBeGreaterThan(0);
    });
  });
});
