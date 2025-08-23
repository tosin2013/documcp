// Functional tests for all MCP tools with real repository scenarios
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository';
import { recommendSSG } from '../../src/tools/recommend-ssg';
import { generateConfig } from '../../src/tools/generate-config';
import { setupStructure } from '../../src/tools/setup-structure';
import { deployPages } from '../../src/tools/deploy-pages';
import { verifyDeployment } from '../../src/tools/verify-deployment';

describe('Functional Testing - MCP Tools', () => {
  let tempDir: string;
  let testRepos: {
    javascript: string;
    python: string;
    ruby: string;
    go: string;
    mixed: string;
    large: string;
    empty: string;
  };

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-functional-tests');
    await fs.mkdir(tempDir, { recursive: true });
    
    testRepos = {
      javascript: await createJavaScriptRepo(),
      python: await createPythonRepo(),
      ruby: await createRubyRepo(),
      go: await createGoRepo(),
      mixed: await createMixedLanguageRepo(),
      large: await createLargeRepo(),
      empty: await createEmptyRepo(),
    };
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('analyze_repository Tool', () => {
    it('should analyze JavaScript/TypeScript repository correctly', async () => {
      const result = await analyzeRepository({
        path: testRepos.javascript,
        depth: 'standard'
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      // Parse the JSON response to validate structure
      const analysisText = result.content.find(c => c.text.includes('"id"'));
      expect(analysisText).toBeDefined();
      
      const analysis = JSON.parse(analysisText!.text);
      expect(analysis.dependencies.ecosystem).toBe('javascript');
      expect(analysis.structure.languages['.js']).toBeGreaterThan(0);
      expect(analysis.documentation.hasReadme).toBe(true);
      expect(analysis.recommendations.primaryLanguage).toBe('javascript');
    });

    it('should analyze Python repository correctly', async () => {
      const result = await analyzeRepository({
        path: testRepos.python,
        depth: 'standard'
      });

      const analysisText = result.content.find(c => c.text.includes('"ecosystem"'));
      const analysis = JSON.parse(analysisText!.text);
      
      expect(analysis.dependencies.ecosystem).toBe('python');
      expect(analysis.structure.languages['.py']).toBeGreaterThan(0);
      expect(analysis.dependencies.packages.length).toBeGreaterThan(0);
    });

    it('should analyze Ruby repository correctly', async () => {
      const result = await analyzeRepository({
        path: testRepos.ruby,
        depth: 'standard'
      });

      const analysisText = result.content.find(c => c.text.includes('"ecosystem"'));
      const analysis = JSON.parse(analysisText!.text);
      
      expect(analysis.dependencies.ecosystem).toBe('ruby');
      expect(analysis.structure.languages['.rb']).toBeGreaterThan(0);
    });

    it('should analyze Go repository correctly', async () => {
      const result = await analyzeRepository({
        path: testRepos.go,
        depth: 'standard'
      });

      const analysisText = result.content.find(c => c.text.includes('"ecosystem"'));
      const analysis = JSON.parse(analysisText!.text);
      
      expect(analysis.dependencies.ecosystem).toBe('go');
      expect(analysis.structure.languages['.go']).toBeGreaterThan(0);
    });

    it('should handle different analysis depths', async () => {
      const quickResult = await analyzeRepository({
        path: testRepos.javascript,
        depth: 'quick'
      });
      
      const deepResult = await analyzeRepository({
        path: testRepos.javascript,
        depth: 'deep'
      });

      expect(quickResult.content).toBeDefined();
      expect(deepResult.content).toBeDefined();
      
      // Both should return valid results but potentially different detail levels
      const quickAnalysis = JSON.parse(quickResult.content.find(c => c.text.includes('"id"'))!.text);
      const deepAnalysis = JSON.parse(deepResult.content.find(c => c.text.includes('"id"'))!.text);
      
      expect(quickAnalysis.id).toBeDefined();
      expect(deepAnalysis.id).toBeDefined();
    });

    it('should handle empty repository gracefully', async () => {
      const result = await analyzeRepository({
        path: testRepos.empty,
        depth: 'standard'
      });

      const analysisText = result.content.find(c => c.text.includes('"totalFiles"'));
      const analysis = JSON.parse(analysisText!.text);
      
      expect(analysis.structure.totalFiles).toBe(1); // Only README.md
      expect(analysis.dependencies.ecosystem).toBe('unknown');
    });

    it('should handle non-existent repository path', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      
      const result = await analyzeRepository({
        path: nonExistentPath,
        depth: 'standard'
      });

      expect((result as any).isError).toBe(true);
      expect(result.content[0].text).toContain('Error:');
    });
  });

  describe('recommend_ssg Tool', () => {
    it('should recommend SSG based on analysis', async () => {
      const result = await recommendSSG({
        analysisId: 'test-analysis-123'
      });

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      
      // Should contain recommendation data
      const recommendationText = result.content.find(c => c.text.includes('"recommended"'));
      expect(recommendationText).toBeDefined();
      
      const recommendation = JSON.parse(recommendationText!.text);
      expect(recommendation.recommended).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.reasoning).toBeDefined();
      expect(recommendation.alternatives).toBeDefined();
    });

    it('should handle preferences parameter', async () => {
      const result = await recommendSSG({
        analysisId: 'test-analysis-456',
        preferences: {
          priority: 'simplicity',
          ecosystem: 'javascript'
        }
      });

      expect(result.content).toBeDefined();
      const recommendationText = result.content.find(c => c.text.includes('"recommended"'));
      const recommendation = JSON.parse(recommendationText!.text);
      
      expect(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']).toContain(recommendation.recommended);
    });
  });

  describe('generate_config Tool', () => {
    let configOutputDir: string;

    beforeEach(async () => {
      configOutputDir = path.join(tempDir, 'config-output', Date.now().toString());
      await fs.mkdir(configOutputDir, { recursive: true });
    });

    it('should generate Docusaurus configuration', async () => {
      const result = await generateConfig({
        ssg: 'docusaurus',
        projectName: 'Test Docusaurus Project',
        projectDescription: 'A test project for Docusaurus',
        outputPath: configOutputDir
      });

      expect(result.content).toBeDefined();
      
      // Verify files were created
      const docusaurusConfig = path.join(configOutputDir, 'docusaurus.config.js');
      const packageJson = path.join(configOutputDir, 'package.json');
      
      expect(await fs.access(docusaurusConfig).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(packageJson).then(() => true).catch(() => false)).toBe(true);
      
      // Verify file contents
      const configContent = await fs.readFile(docusaurusConfig, 'utf-8');
      expect(configContent).toContain('Test Docusaurus Project');
      expect(configContent).toContain('@docusaurus/core');
    });

    it('should generate MkDocs configuration', async () => {
      const result = await generateConfig({
        ssg: 'mkdocs',
        projectName: 'Test MkDocs Project',
        outputPath: configOutputDir
      });

      expect(result.content).toBeDefined();
      
      const mkdocsConfig = path.join(configOutputDir, 'mkdocs.yml');
      const requirements = path.join(configOutputDir, 'requirements.txt');
      
      expect(await fs.access(mkdocsConfig).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(requirements).then(() => true).catch(() => false)).toBe(true);
      
      const configContent = await fs.readFile(mkdocsConfig, 'utf-8');
      expect(configContent).toContain('Test MkDocs Project');
      expect(configContent).toContain('material');
    });

    it('should generate Hugo configuration', async () => {
      const result = await generateConfig({
        ssg: 'hugo',
        projectName: 'Test Hugo Project',
        outputPath: configOutputDir
      });

      const hugoConfig = path.join(configOutputDir, 'hugo.toml');
      expect(await fs.access(hugoConfig).then(() => true).catch(() => false)).toBe(true);
      
      const configContent = await fs.readFile(hugoConfig, 'utf-8');
      expect(configContent).toContain('Test Hugo Project');
    });

    it('should generate Jekyll configuration', async () => {
      const result = await generateConfig({
        ssg: 'jekyll',
        projectName: 'Test Jekyll Project',
        outputPath: configOutputDir
      });

      const jekyllConfig = path.join(configOutputDir, '_config.yml');
      const gemfile = path.join(configOutputDir, 'Gemfile');
      
      expect(await fs.access(jekyllConfig).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(gemfile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should generate Eleventy configuration', async () => {
      const result = await generateConfig({
        ssg: 'eleventy',
        projectName: 'Test Eleventy Project',
        outputPath: configOutputDir
      });

      const eleventyConfig = path.join(configOutputDir, '.eleventy.js');
      const packageJson = path.join(configOutputDir, 'package.json');
      
      expect(await fs.access(eleventyConfig).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(packageJson).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('setup_structure Tool', () => {
    let structureOutputDir: string;

    beforeEach(async () => {
      structureOutputDir = path.join(tempDir, 'structure-output', Date.now().toString());
    });

    it('should create Diataxis structure with examples', async () => {
      const result = await setupStructure({
        path: structureOutputDir,
        ssg: 'docusaurus',
        includeExamples: true
      });

      expect(result.content).toBeDefined();
      
      // Verify directory structure
      const categories = ['tutorials', 'how-to', 'reference', 'explanation'];
      for (const category of categories) {
        const categoryDir = path.join(structureOutputDir, category);
        expect(await fs.access(categoryDir).then(() => true).catch(() => false)).toBe(true);
        
        // Check for index.md
        const indexFile = path.join(categoryDir, 'index.md');
        expect(await fs.access(indexFile).then(() => true).catch(() => false)).toBe(true);
        
        // Check for example file
        const files = await fs.readdir(categoryDir);
        expect(files.length).toBeGreaterThan(1); // index.md + example file
      }
      
      // Check root index
      const rootIndex = path.join(structureOutputDir, 'index.md');
      expect(await fs.access(rootIndex).then(() => true).catch(() => false)).toBe(true);
      
      const rootContent = await fs.readFile(rootIndex, 'utf-8');
      expect(rootContent).toContain('Diataxis');
      expect(rootContent).toContain('Tutorials');
      expect(rootContent).toContain('How-To Guides');
    });

    it('should create structure without examples', async () => {
      const result = await setupStructure({
        path: structureOutputDir,
        ssg: 'mkdocs',
        includeExamples: false
      });

      expect(result.content).toBeDefined();
      
      // Verify only index files exist (no examples)
      const tutorialsDir = path.join(structureOutputDir, 'tutorials');
      const files = await fs.readdir(tutorialsDir);
      expect(files).toEqual(['index.md']); // Only index, no example
    });

    it('should handle different SSG formats correctly', async () => {
      // Test Docusaurus format
      await setupStructure({
        path: path.join(structureOutputDir, 'docusaurus'),
        ssg: 'docusaurus',
        includeExamples: true
      });

      const docusaurusFile = path.join(structureOutputDir, 'docusaurus', 'tutorials', 'index.md');
      const docusaurusContent = await fs.readFile(docusaurusFile, 'utf-8');
      expect(docusaurusContent).toContain('id: tutorials-index');
      expect(docusaurusContent).toContain('sidebar_label:');
      
      // Test Jekyll format
      await setupStructure({
        path: path.join(structureOutputDir, 'jekyll'),
        ssg: 'jekyll',
        includeExamples: true
      });

      const jekyllFile = path.join(structureOutputDir, 'jekyll', 'tutorials', 'index.md');
      const jekyllContent = await fs.readFile(jekyllFile, 'utf-8');
      expect(jekyllContent).toContain('title:');
      expect(jekyllContent).toContain('description:');
    });
  });

  describe('deploy_pages Tool', () => {
    let deploymentRepoDir: string;

    beforeEach(async () => {
      deploymentRepoDir = path.join(tempDir, 'deployment-repo', Date.now().toString());
      await fs.mkdir(deploymentRepoDir, { recursive: true });
    });

    it('should create GitHub Actions workflow for Docusaurus', async () => {
      const result = await deployPages({
        repository: deploymentRepoDir,
        ssg: 'docusaurus',
        branch: 'gh-pages'
      });

      expect(result.content).toBeDefined();
      
      const workflowPath = path.join(deploymentRepoDir, '.github', 'workflows', 'deploy-docs.yml');
      expect(await fs.access(workflowPath).then(() => true).catch(() => false)).toBe(true);
      
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      expect(workflowContent).toContain('Deploy Docusaurus');
      expect(workflowContent).toContain('npm run build');
      expect(workflowContent).toContain('actions/upload-pages-artifact');
      expect(workflowContent).toContain('actions/deploy-pages');
      
      // Verify security compliance (OIDC tokens)
      expect(workflowContent).toContain('id-token: write');
      expect(workflowContent).toContain('pages: write');
      expect(workflowContent).not.toContain('GITHUB_TOKEN: ${{ secrets.');
    });

    it('should create workflow for MkDocs', async () => {
      const result = await deployPages({
        repository: deploymentRepoDir,
        ssg: 'mkdocs'
      });

      const workflowPath = path.join(deploymentRepoDir, '.github', 'workflows', 'deploy-docs.yml');
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      
      expect(workflowContent).toContain('Deploy MkDocs');
      expect(workflowContent).toContain('mkdocs gh-deploy');
      expect(workflowContent).toContain('python');
    });

    it('should create workflow for Hugo', async () => {
      const result = await deployPages({
        repository: deploymentRepoDir,
        ssg: 'hugo'
      });

      const workflowContent = await fs.readFile(
        path.join(deploymentRepoDir, '.github', 'workflows', 'deploy-docs.yml'),
        'utf-8'
      );
      
      expect(workflowContent).toContain('Deploy Hugo');
      expect(workflowContent).toContain('peaceiris/actions-hugo');
      expect(workflowContent).toContain('hugo --minify');
    });

    it('should handle custom domain configuration', async () => {
      const result = await deployPages({
        repository: deploymentRepoDir,
        ssg: 'jekyll',
        customDomain: 'docs.example.com'
      });

      // Check CNAME file creation
      const cnamePath = path.join(deploymentRepoDir, 'CNAME');
      expect(await fs.access(cnamePath).then(() => true).catch(() => false)).toBe(true);
      
      const cnameContent = await fs.readFile(cnamePath, 'utf-8');
      expect(cnameContent.trim()).toBe('docs.example.com');
      
      // Verify result indicates custom domain was configured
      const resultText = result.content.map(c => c.text).join(' ');
      expect(resultText).toContain('docs.example.com');
    });
  });

  describe('verify_deployment Tool', () => {
    let verificationRepoDir: string;

    beforeEach(async () => {
      verificationRepoDir = path.join(tempDir, 'verification-repo', Date.now().toString());
      await fs.mkdir(verificationRepoDir, { recursive: true });
    });

    it('should verify complete deployment setup', async () => {
      // Set up a complete deployment scenario
      await fs.mkdir(path.join(verificationRepoDir, '.github', 'workflows'), { recursive: true });
      await fs.mkdir(path.join(verificationRepoDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(verificationRepoDir, 'build'), { recursive: true });
      
      // Create workflow file
      await fs.writeFile(
        path.join(verificationRepoDir, '.github', 'workflows', 'deploy-docs.yml'),
        'name: Deploy Docs\non: push\njobs:\n  deploy:\n    runs-on: ubuntu-latest'
      );
      
      // Create documentation files
      await fs.writeFile(path.join(verificationRepoDir, 'docs', 'index.md'), '# Documentation');
      await fs.writeFile(path.join(verificationRepoDir, 'docs', 'guide.md'), '# Guide');
      
      // Create config file
      await fs.writeFile(
        path.join(verificationRepoDir, 'docusaurus.config.js'),
        'module.exports = { title: "Test" };'
      );
      
      // Create build directory
      await fs.writeFile(path.join(verificationRepoDir, 'build', 'index.html'), '<h1>Built Site</h1>');

      const result = await verifyDeployment({
        repository: verificationRepoDir,
        url: 'https://example.github.io/test-repo'
      });

      expect(result.content).toBeDefined();
      
      // Parse the verification result
      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('✅'); // Should have passing checks
      expect(resultText).toContain('deployment workflow');
      expect(resultText).toContain('documentation files');
      expect(resultText).toContain('configuration');
      expect(resultText).toContain('build output');
    });

    it('should identify missing components', async () => {
      // Create minimal repo without deployment setup
      await fs.writeFile(path.join(verificationRepoDir, 'README.md'), '# Test Repo');

      const result = await verifyDeployment({
        repository: verificationRepoDir
      });

      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('❌'); // Should have failing checks
      expect(resultText).toContain('No .github/workflows');
      expect(resultText).toContain('No documentation files');
      expect(resultText).toContain('No static site generator configuration');
    });

    it('should provide actionable recommendations', async () => {
      const result = await verifyDeployment({
        repository: verificationRepoDir
      });

      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('→'); // Should contain recommendation arrows
      expect(resultText).toContain('deploy_pages tool');
      expect(resultText).toContain('setup_structure tool');
      expect(resultText).toContain('generate_config tool');
    });

    it('should handle repository path variations', async () => {
      // Test with relative path
      const relativeResult = await verifyDeployment({
        repository: '.'
      });
      expect(relativeResult.content).toBeDefined();
      
      // Test with absolute path
      const absoluteResult = await verifyDeployment({
        repository: verificationRepoDir
      });
      expect(absoluteResult.content).toBeDefined();
      
      // Test with HTTP URL (should default to current directory)
      const urlResult = await verifyDeployment({
        repository: 'https://github.com/user/repo'
      });
      expect(urlResult.content).toBeDefined();
    });
  });

  // Helper functions to create test repositories
  async function createJavaScriptRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'javascript-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // package.json
    const packageJson = {
      name: 'test-js-project',
      version: '1.0.0',
      description: 'Test JavaScript project',
      scripts: {
        start: 'node index.js',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.0',
        lodash: '^4.17.21'
      },
      devDependencies: {
        jest: '^29.0.0',
        '@types/node': '^20.0.0'
      }
    };
    await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Source files
    await fs.writeFile(path.join(repoPath, 'index.js'), 'console.log("Hello World");');
    await fs.writeFile(path.join(repoPath, 'utils.js'), 'module.exports = { helper: () => {} };');
    await fs.writeFile(path.join(repoPath, 'app.ts'), 'const app: string = "TypeScript";');
    
    // Test directory
    await fs.mkdir(path.join(repoPath, 'test'), { recursive: true });
    await fs.writeFile(path.join(repoPath, 'test', 'app.test.js'), 'test("example", () => {});');
    
    // Documentation
    await fs.writeFile(path.join(repoPath, 'README.md'), '# JavaScript Test Project\nA test project for JavaScript analysis.');
    await fs.writeFile(path.join(repoPath, 'CONTRIBUTING.md'), '# Contributing\nHow to contribute.');
    await fs.writeFile(path.join(repoPath, 'LICENSE'), 'MIT License');
    
    // CI/CD
    await fs.mkdir(path.join(repoPath, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(repoPath, '.github', 'workflows', 'ci.yml'),
      'name: CI\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest'
    );
    
    return repoPath;
  }

  async function createPythonRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'python-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // requirements.txt
    await fs.writeFile(path.join(repoPath, 'requirements.txt'), 'flask>=2.0.0\nrequests>=2.25.0\nnumpy>=1.21.0');
    
    // Python files
    await fs.writeFile(path.join(repoPath, 'main.py'), 'import flask\napp = flask.Flask(__name__)');
    await fs.writeFile(path.join(repoPath, 'utils.py'), 'def helper():\n    pass');
    
    // Tests
    await fs.mkdir(path.join(repoPath, 'tests'), { recursive: true });
    await fs.writeFile(path.join(repoPath, 'tests', 'test_main.py'), 'def test_app():\n    assert True');
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Python Test Project');
    
    return repoPath;
  }

  async function createRubyRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'ruby-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // Gemfile
    await fs.writeFile(path.join(repoPath, 'Gemfile'), 'source "https://rubygems.org"\ngem "rails"');
    
    // Ruby files
    await fs.writeFile(path.join(repoPath, 'app.rb'), 'class App\nend');
    await fs.writeFile(path.join(repoPath, 'helper.rb'), 'module Helper\nend');
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Ruby Test Project');
    
    return repoPath;
  }

  async function createGoRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'go-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // go.mod
    await fs.writeFile(path.join(repoPath, 'go.mod'), 'module test-go-project\ngo 1.19');
    
    // Go files
    await fs.writeFile(path.join(repoPath, 'main.go'), 'package main\nfunc main() {}');
    await fs.writeFile(path.join(repoPath, 'utils.go'), 'package main\nfunc helper() {}');
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Go Test Project');
    
    return repoPath;
  }

  async function createMixedLanguageRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'mixed-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // Multiple language files
    await fs.writeFile(path.join(repoPath, 'package.json'), '{"name": "mixed-project"}');
    await fs.writeFile(path.join(repoPath, 'requirements.txt'), 'flask>=2.0.0');
    await fs.writeFile(path.join(repoPath, 'Gemfile'), 'gem "rails"');
    
    await fs.writeFile(path.join(repoPath, 'app.js'), 'console.log("JS");');
    await fs.writeFile(path.join(repoPath, 'script.py'), 'print("Python")');
    await fs.writeFile(path.join(repoPath, 'server.rb'), 'puts "Ruby"');
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Mixed Language Project');
    
    return repoPath;
  }

  async function createLargeRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'large-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // Create many files to simulate a large repository
    for (let i = 0; i < 150; i++) {
      const fileName = `file-${i.toString().padStart(3, '0')}.js`;
      await fs.writeFile(path.join(repoPath, fileName), `// File ${i}\nconsole.log(${i});`);
    }
    
    // Create nested directories
    for (let i = 0; i < 10; i++) {
      const dirPath = path.join(repoPath, `dir-${i}`);
      await fs.mkdir(dirPath, { recursive: true });
      
      for (let j = 0; j < 20; j++) {
        const fileName = `nested-${j}.js`;
        await fs.writeFile(path.join(dirPath, fileName), `// Nested file ${i}-${j}`);
      }
    }
    
    await fs.writeFile(path.join(repoPath, 'package.json'), '{"name": "large-project"}');
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Large Test Project');
    
    return repoPath;
  }

  async function createEmptyRepo(): Promise<string> {
    const repoPath = path.join(tempDir, 'empty-repo');
    await fs.mkdir(repoPath, { recursive: true });
    
    // Only a README file
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Empty Project\nMinimal repository for testing.');
    
    return repoPath;
  }
});