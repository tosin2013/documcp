// Integration tests for complete documentation workflows
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository';
import { recommendSSG } from '../../src/tools/recommend-ssg';
import { generateConfig } from '../../src/tools/generate-config';
import { setupStructure } from '../../src/tools/setup-structure';
import { deployPages } from '../../src/tools/deploy-pages';
import { verifyDeployment } from '../../src/tools/verify-deployment';

describe('Integration Testing - Complete Workflows', () => {
  let tempDir: string;
  let testProject: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-integration-tests');
    await fs.mkdir(tempDir, { recursive: true });
    
    testProject = await createRealisticProject();
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup integration test directory:', error);
    }
  });

  describe('End-to-End Documentation Workflow', () => {
    it('should complete full documentation setup workflow', async () => {
      const workflowDir = path.join(tempDir, 'e2e-workflow');
      await fs.mkdir(workflowDir, { recursive: true });
      
      // Step 1: Analyze Repository
      console.log('Step 1: Analyzing repository...');
      const analysisResult = await analyzeRepository({
        path: testProject,
        depth: 'standard'
      });
      
      expect(analysisResult.content).toBeDefined();
      expect((analysisResult as any).isError).toBeFalsy();
      
      // Extract analysis ID for next step
      const analysisText = analysisResult.content.find(c => c.text.includes('"id"'));
      const analysis = JSON.parse(analysisText!.text);
      const analysisId = analysis.id;
      
      expect(analysisId).toBeDefined();
      expect(analysis.dependencies.ecosystem).toBe('javascript');
      
      // Step 2: Get SSG Recommendation
      console.log('Step 2: Getting SSG recommendation...');
      const recommendationResult = await recommendSSG({
        analysisId: analysisId,
        preferences: {
          priority: 'features',
          ecosystem: 'javascript'
        }
      });
      
      expect(recommendationResult.content).toBeDefined();
      const recommendationText = recommendationResult.content.find(c => c.text.includes('"recommended"'));
      const recommendation = JSON.parse(recommendationText!.text);
      
      expect(recommendation.recommended).toBeDefined();
      expect(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']).toContain(recommendation.recommended);
      
      // Step 3: Generate Configuration
      console.log('Step 3: Generating configuration...');
      const configResult = await generateConfig({
        ssg: recommendation.recommended,
        projectName: 'Integration Test Project',
        projectDescription: 'End-to-end integration test',
        outputPath: workflowDir
      });
      
      expect(configResult.content).toBeDefined();
      expect((configResult as any).isError).toBeFalsy();
      
      // Verify config files were created
      const files = await fs.readdir(workflowDir);
      expect(files.length).toBeGreaterThan(0);
      
      // Step 4: Setup Documentation Structure
      console.log('Step 4: Setting up documentation structure...');
      const docsDir = path.join(workflowDir, 'docs');
      const structureResult = await setupStructure({
        path: docsDir,
        ssg: recommendation.recommended,
        includeExamples: true
      });
      
      expect(structureResult.content).toBeDefined();
      expect((structureResult as any).isError).toBeFalsy();
      
      // Verify Diataxis structure was created
      const diataxisCategories = ['tutorials', 'how-to', 'reference', 'explanation'];
      for (const category of diataxisCategories) {
        const categoryPath = path.join(docsDir, category);
        expect(await fs.access(categoryPath).then(() => true).catch(() => false)).toBe(true);
      }
      
      // Step 5: Setup Deployment
      console.log('Step 5: Setting up deployment...');
      const deploymentResult = await deployPages({
        repository: workflowDir,
        ssg: recommendation.recommended,
        branch: 'gh-pages',
        customDomain: 'docs.example.com'
      });
      
      expect(deploymentResult.content).toBeDefined();
      expect((deploymentResult as any).isError).toBeFalsy();
      
      // Verify workflow and CNAME were created
      const workflowPath = path.join(workflowDir, '.github', 'workflows', 'deploy-docs.yml');
      const cnamePath = path.join(workflowDir, 'CNAME');
      
      expect(await fs.access(workflowPath).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(cnamePath).then(() => true).catch(() => false)).toBe(true);
      
      // Step 6: Verify Deployment Setup
      console.log('Step 6: Verifying deployment setup...');
      const verificationResult = await verifyDeployment({
        repository: workflowDir,
        url: 'https://docs.example.com'
      });
      
      expect(verificationResult.content).toBeDefined();
      const verificationText = verificationResult.content.map(c => c.text).join('\n');
      
      // Should have mostly passing checks
      const passCount = (verificationText.match(/✅/g) || []).length;
      const failCount = (verificationText.match(/❌/g) || []).length;
      
      expect(passCount).toBeGreaterThan(failCount);
      
      console.log('✅ End-to-end workflow completed successfully!');
    }, 30000); // 30 second timeout for full workflow
  });

  describe('Workflow Variations', () => {
    it('should handle Python project workflow', async () => {
      const pythonProject = await createPythonProject();
      
      // Analyze Python project
      const analysis = await analyzeRepository({ path: pythonProject, depth: 'standard' });
      const analysisData = JSON.parse(analysis.content.find(c => c.text.includes('"ecosystem"'))!.text);
      
      expect(analysisData.dependencies.ecosystem).toBe('python');
      
      // Get recommendation (likely MkDocs for Python)
      const recommendation = await recommendSSG({ analysisId: analysisData.id });
      // const recData = JSON.parse(recommendation.content.find(c => c.text.includes('"recommended"'))!.text);
      
      // Generate MkDocs config
      const configDir = path.join(tempDir, 'python-workflow');
      await fs.mkdir(configDir, { recursive: true });
      
      const config = await generateConfig({
        ssg: 'mkdocs',
        projectName: 'Python Test Project',
        outputPath: configDir
      });
      
      // Verify MkDocs-specific files
      expect(await fs.access(path.join(configDir, 'mkdocs.yml')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(configDir, 'requirements.txt')).then(() => true).catch(() => false)).toBe(true);
    });

    it('should handle different SSG preferences', async () => {
      const analysisId = 'test-preferences-123';
      
      // Test simplicity preference
      const simplicityRec = await recommendSSG({
        analysisId,
        preferences: { priority: 'simplicity' }
      });
      
      // Test performance preference
      const performanceRec = await recommendSSG({
        analysisId,
        preferences: { priority: 'performance' }
      });
      
      // Test features preference
      const featuresRec = await recommendSSG({
        analysisId,
        preferences: { priority: 'features' }
      });
      
      // All should provide valid recommendations
      [simplicityRec, performanceRec, featuresRec].forEach(result => {
        expect(result.content).toBeDefined();
        const rec = JSON.parse(result.content.find(c => c.text.includes('"recommended"'))!.text);
        expect(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']).toContain(rec.recommended);
      });
    });

    it('should handle deployment workflow variations', async () => {
      const deploymentDir = path.join(tempDir, 'deployment-variations');
      await fs.mkdir(deploymentDir, { recursive: true });
      
      // Test different SSGs
      const ssgs = ['docusaurus', 'mkdocs', 'hugo', 'jekyll', 'eleventy'] as const;
      
      for (const ssg of ssgs) {
        const ssgDir = path.join(deploymentDir, ssg);
        await fs.mkdir(ssgDir, { recursive: true });
        
        const result = await deployPages({
          repository: ssgDir,
          ssg: ssg,
          branch: 'main'
        });
        
        expect(result.content).toBeDefined();
        
        const workflowPath = path.join(ssgDir, '.github', 'workflows', 'deploy-docs.yml');
        expect(await fs.access(workflowPath).then(() => true).catch(() => false)).toBe(true);
        
        const workflowContent = await fs.readFile(workflowPath, 'utf-8');
        expect(workflowContent).toContain(`Deploy ${ssg.charAt(0).toUpperCase() + ssg.slice(1)}`);
        
        // Verify SSG-specific workflow content
        switch (ssg) {
          case 'docusaurus':
            expect(workflowContent).toContain('npm run build');
            expect(workflowContent).toContain('id-token: write'); // OIDC compliance
            break;
          case 'mkdocs':
            expect(workflowContent).toContain('mkdocs gh-deploy');
            expect(workflowContent).toContain('python');
            break;
          case 'hugo':
            expect(workflowContent).toContain('peaceiris/actions-hugo');
            expect(workflowContent).toContain('hugo --minify');
            break;
          case 'jekyll':
            expect(workflowContent).toContain('bundle exec jekyll build');
            expect(workflowContent).toContain('ruby');
            break;
          case 'eleventy':
            expect(workflowContent).toContain('npm run build');
            break;
        }
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing repository gracefully', async () => {
      const result = await analyzeRepository({
        path: '/non/existent/path',
        depth: 'standard'
      });
      
      expect((result as any).isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle invalid configuration gracefully', async () => {
      const invalidDir = '/invalid/write/path/that/should/fail';
      
      const result = await generateConfig({
        ssg: 'docusaurus',
        projectName: 'Test',
        outputPath: invalidDir
      });
      
      expect((result as any).isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });

    it('should handle structure setup in non-existent directory', async () => {
      // This should actually work because setupStructure creates directories
      const result = await setupStructure({
        path: path.join(tempDir, 'new-structure-dir'),
        ssg: 'docusaurus',
        includeExamples: false
      });
      
      expect((result as any).isError).toBeFalsy();
      expect(result.content).toBeDefined();
    });

    it('should provide helpful error messages and resolutions', async () => {
      const errorResult = await analyzeRepository({
        path: '/definitely/does/not/exist',
        depth: 'standard'
      });
      
      expect((errorResult as any).isError).toBe(true);
      const errorText = errorResult.content.map(c => c.text).join(' ');
      expect(errorText).toContain('Resolution:');
      expect(errorText.toLowerCase()).toContain('ensure');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large repository analysis within performance bounds', async () => {
      const largeRepo = await createLargeRepository();
      
      const startTime = Date.now();
      const result = await analyzeRepository({
        path: largeRepo,
        depth: 'standard'
      });
      const executionTime = Date.now() - startTime;
      
      // Should complete within reasonable time (large repo target is 60s)
      expect(executionTime).toBeLessThan(60000);
      expect(result.content).toBeDefined();
      
      const analysisData = JSON.parse(result.content.find(c => c.text.includes('"totalFiles"'))!.text);
      expect(analysisData.structure.totalFiles).toBeGreaterThan(1000);
    }, 65000); // 65s timeout for large repo test

    it('should clean up resources properly', async () => {
      const tempWorkflowDir = path.join(tempDir, 'resource-cleanup');
      
      // Run multiple operations
      await generateConfig({
        ssg: 'docusaurus',
        projectName: 'Cleanup Test',
        outputPath: tempWorkflowDir
      });
      
      await setupStructure({
        path: path.join(tempWorkflowDir, 'docs'),
        ssg: 'docusaurus',
        includeExamples: true
      });
      
      // Verify files were created
      const files = await fs.readdir(tempWorkflowDir);
      expect(files.length).toBeGreaterThan(0);
      
      // Cleanup should work
      await fs.rm(tempWorkflowDir, { recursive: true, force: true });
      expect(await fs.access(tempWorkflowDir).then(() => false).catch(() => true)).toBe(true);
    });
  });

  // Helper functions
  async function createRealisticProject(): Promise<string> {
    const projectPath = path.join(tempDir, 'realistic-project');
    await fs.mkdir(projectPath, { recursive: true });
    
    // package.json with realistic dependencies
    const packageJson = {
      name: 'realistic-test-project',
      version: '2.1.0',
      description: 'A realistic Node.js project for testing DocuMCP',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest',
        build: 'webpack --mode production',
        lint: 'eslint src/',
        docs: 'jsdoc src/ -d docs/'
      },
      dependencies: {
        express: '^4.18.2',
        lodash: '^4.17.21',
        axios: '^1.4.0',
        moment: '^2.29.4',
        'body-parser': '^1.20.2'
      },
      devDependencies: {
        jest: '^29.5.0',
        nodemon: '^2.0.22',
        eslint: '^8.42.0',
        webpack: '^5.86.0',
        jsdoc: '^4.0.2'
      },
      keywords: ['node', 'express', 'api', 'web'],
      author: 'Test Author',
      license: 'MIT'
    };
    
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Source directory structure
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'controllers'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'models'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'routes'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'src', 'utils'), { recursive: true });
    
    // Main application files
    await fs.writeFile(
      path.join(projectPath, 'src', 'index.js'),
      `const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');

const app = express();
app.use(bodyParser.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'routes', 'index.js'),
      `const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'controllers', 'userController.js'),
      `const { getUserById, createUser } = require('../models/user');

async function getUser(req, res) {
  const user = await getUserById(req.params.id);
  res.json(user);
}

module.exports = { getUser };`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'models', 'user.js'),
      `const users = [];

function getUserById(id) {
  return users.find(user => user.id === id);
}

function createUser(userData) {
  const user = { id: Date.now(), ...userData };
  users.push(user);
  return user;
}

module.exports = { getUserById, createUser };`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'src', 'utils', 'helpers.js'),
      `const _ = require('lodash');
const moment = require('moment');

function formatDate(date) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
}

function validateEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

module.exports = { formatDate, validateEmail };`
    );
    
    // Test directory
    await fs.mkdir(path.join(projectPath, 'tests'), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'tests', 'app.test.js'),
      `const { formatDate, validateEmail } = require('../src/utils/helpers');

describe('Helper Functions', () => {
  test('formatDate should format date correctly', () => {
    const date = new Date('2023-01-01');
    expect(formatDate(date)).toMatch(/\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}/);
  });

  test('validateEmail should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});`
    );
    
    // Configuration files
    await fs.writeFile(
      path.join(projectPath, '.eslintrc.js'),
      `module.exports = {
  env: { node: true, es2021: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 12, sourceType: 'module' },
  rules: { 'no-unused-vars': 'warn' }
};`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'jest.config.js'),
      `module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.js'],
  testMatch: ['**/tests/**/*.test.js']
};`
    );
    
    // Documentation
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      `# Realistic Test Project

A comprehensive Node.js application for testing DocuMCP functionality.

## Features

- Express.js web server
- RESTful API endpoints
- User management system
- Comprehensive test suite
- ESLint code quality
- JSDoc documentation

## Getting Started

1. Install dependencies: \`npm install\`
2. Start development server: \`npm run dev\`
3. Run tests: \`npm test\`

## API Endpoints

- \`GET /api/health\` - Health check endpoint
- \`GET /api/users/:id\` - Get user by ID

## Contributing

Please read CONTRIBUTING.md for contribution guidelines.`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'CONTRIBUTING.md'),
      `# Contributing to Realistic Test Project

## Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies
4. Create a feature branch
5. Make changes and test
6. Submit a pull request

## Code Style

- Follow ESLint configuration
- Write tests for new features
- Update documentation as needed`
    );
    
    await fs.writeFile(path.join(projectPath, 'LICENSE'), 'MIT License\n\nCopyright (c) 2023 Test Author');
    
    // CI/CD workflow
    await fs.mkdir(path.join(projectPath, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, '.github', 'workflows', 'ci.yml'),
      `name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build`
    );
    
    return projectPath;
  }

  async function createPythonProject(): Promise<string> {
    const projectPath = path.join(tempDir, 'python-project');
    await fs.mkdir(projectPath, { recursive: true });
    
    // Python project structure
    await fs.writeFile(
      path.join(projectPath, 'requirements.txt'),
      `flask==2.3.2
requests==2.31.0
pytest==7.4.0
black==23.3.0
flake8==6.0.0`
    );
    
    await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'src', 'app.py'),
      `from flask import Flask, jsonify
import requests

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'OK'})

if __name__ == '__main__':
    app.run(debug=True)`
    );
    
    await fs.mkdir(path.join(projectPath, 'tests'), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'tests', 'test_app.py'),
      `import pytest
from src.app import app

def test_health():
    client = app.test_client()
    response = client.get('/health')
    assert response.status_code == 200`
    );
    
    await fs.writeFile(
      path.join(projectPath, 'README.md'),
      '# Python Test Project\n\nA Flask application for testing Python project analysis.'
    );
    
    return projectPath;
  }

  async function createLargeRepository(): Promise<string> {
    const repoPath = path.join(tempDir, 'large-repository');
    await fs.mkdir(repoPath, { recursive: true });
    
    // Create a repository with 1200+ files to trigger large repo categorization
    await fs.writeFile(path.join(repoPath, 'package.json'), '{"name": "large-repo"}');
    
    for (let i = 0; i < 30; i++) {
      const dirPath = path.join(repoPath, `module-${i}`);
      await fs.mkdir(dirPath, { recursive: true });
      
      for (let j = 0; j < 40; j++) {
        const fileName = `component-${j}.js`;
        const content = `// Component ${i}-${j}
export default function Component${i}${j}() {
  return <div>Component ${i}-${j}</div>;
}`;
        await fs.writeFile(path.join(dirPath, fileName), content);
      }
    }
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Large Repository\n\nThis repository has 1200+ files for performance testing.');
    
    return repoPath;
  }
});