// Comprehensive tests for all MCP tools to achieve 80% coverage
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository';
import { recommendSSG } from '../../src/tools/recommend-ssg';
import { generateConfig } from '../../src/tools/generate-config';
import { setupStructure } from '../../src/tools/setup-structure';
import { deployPages } from '../../src/tools/deploy-pages';
import { verifyDeployment } from '../../src/tools/verify-deployment';

describe('All MCP Tools Coverage Tests', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'documcp-coverage-tests');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('analyze_repository', () => {
    it('should analyze JavaScript project', async () => {
      const jsRepo = await createJSRepo();
      const result = await analyzeRepository({ path: jsRepo, depth: 'standard' });
      
      expect(result.content).toBeDefined();
      const analysisData = JSON.parse(result.content.find(c => c.text.includes('"ecosystem"'))!.text);
      expect(analysisData.dependencies.ecosystem).toBe('javascript');
    });

    it('should analyze Python project', async () => {
      const pyRepo = await createPythonRepo();
      const result = await analyzeRepository({ path: pyRepo, depth: 'standard' });
      
      expect(result.content).toBeDefined();
      const analysisData = JSON.parse(result.content.find(c => c.text.includes('"ecosystem"'))!.text);
      expect(analysisData.dependencies.ecosystem).toBe('python');
    });

    it('should handle different depths', async () => {
      const repo = await createJSRepo();
      
      const quickResult = await analyzeRepository({ path: repo, depth: 'quick' });
      const deepResult = await analyzeRepository({ path: repo, depth: 'deep' });
      
      expect(quickResult.content).toBeDefined();
      expect(deepResult.content).toBeDefined();
    });

    it('should detect CI/CD workflows', async () => {
      const ciRepo = await createRepoWithCI();
      const result = await analyzeRepository({ path: ciRepo, depth: 'standard' });
      
      const analysisData = JSON.parse(result.content.find(c => c.text.includes('"hasCI"'))!.text);
      expect(analysisData.structure.hasCI).toBe(true);
    });

    it('should handle repository without dependencies', async () => {
      const emptyRepo = await createEmptyRepo();
      const result = await analyzeRepository({ path: emptyRepo, depth: 'standard' });
      
      const analysisData = JSON.parse(result.content.find(c => c.text.includes('"ecosystem"'))!.text);
      expect(analysisData.dependencies.ecosystem).toBe('unknown');
    });
  });

  describe('recommend_ssg', () => {
    it('should provide recommendation with confidence', async () => {
      const result = await recommendSSG({ analysisId: 'test-123' });
      
      expect(result.content).toBeDefined();
      const recData = JSON.parse(result.content.find(c => c.text.includes('"confidence"'))!.text);
      expect(recData.confidence).toBeGreaterThan(0);
      expect(recData.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle preferences', async () => {
      const result = await recommendSSG({
        analysisId: 'test-456',
        preferences: {
          priority: 'simplicity',
          ecosystem: 'javascript'
        }
      });
      
      expect(result.content).toBeDefined();
      const recData = JSON.parse(result.content.find(c => c.text.includes('"recommended"'))!.text);
      expect(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']).toContain(recData.recommended);
    });

    it('should provide alternatives', async () => {
      const result = await recommendSSG({ analysisId: 'test-789' });
      
      const recData = JSON.parse(result.content.find(c => c.text.includes('"alternatives"'))!.text);
      expect(Array.isArray(recData.alternatives)).toBe(true);
      expect(recData.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('generate_config', () => {
    it('should generate Docusaurus config', async () => {
      const outputDir = await createTempDir('docusaurus-config');
      const result = await generateConfig({
        ssg: 'docusaurus',
        projectName: 'Test Docusaurus',
        outputPath: outputDir
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(outputDir, 'docusaurus.config.js'))).toBe(true);
      expect(await fileExists(path.join(outputDir, 'package.json'))).toBe(true);
    });

    it('should generate MkDocs config', async () => {
      const outputDir = await createTempDir('mkdocs-config');
      const result = await generateConfig({
        ssg: 'mkdocs',
        projectName: 'Test MkDocs',
        outputPath: outputDir
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(outputDir, 'mkdocs.yml'))).toBe(true);
      expect(await fileExists(path.join(outputDir, 'requirements.txt'))).toBe(true);
    });

    it('should generate Hugo config', async () => {
      const outputDir = await createTempDir('hugo-config');
      const result = await generateConfig({
        ssg: 'hugo',
        projectName: 'Test Hugo',
        outputPath: outputDir
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(outputDir, 'hugo.toml'))).toBe(true);
    });

    it('should generate Jekyll config', async () => {
      const outputDir = await createTempDir('jekyll-config');
      const result = await generateConfig({
        ssg: 'jekyll',
        projectName: 'Test Jekyll',
        outputPath: outputDir
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(outputDir, '_config.yml'))).toBe(true);
      expect(await fileExists(path.join(outputDir, 'Gemfile'))).toBe(true);
    });

    it('should generate Eleventy config', async () => {
      const outputDir = await createTempDir('eleventy-config');
      const result = await generateConfig({
        ssg: 'eleventy',
        projectName: 'Test Eleventy',
        outputPath: outputDir
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(outputDir, '.eleventy.js'))).toBe(true);
      expect(await fileExists(path.join(outputDir, 'package.json'))).toBe(true);
    });
  });

  describe('setup_structure', () => {
    it('should create Diataxis structure', async () => {
      const docsDir = await createTempDir('diataxis-structure');
      const result = await setupStructure({
        path: docsDir,
        ssg: 'docusaurus',
        includeExamples: true
      });
      
      expect(result.content).toBeDefined();
      
      const categories = ['tutorials', 'how-to', 'reference', 'explanation'];
      for (const category of categories) {
        expect(await fileExists(path.join(docsDir, category, 'index.md'))).toBe(true);
      }
      expect(await fileExists(path.join(docsDir, 'index.md'))).toBe(true);
    });

    it('should create structure without examples', async () => {
      const docsDir = await createTempDir('no-examples');
      const result = await setupStructure({
        path: docsDir,
        ssg: 'mkdocs',
        includeExamples: false
      });
      
      expect(result.content).toBeDefined();
      
      const tutorialsFiles = await fs.readdir(path.join(docsDir, 'tutorials'));
      expect(tutorialsFiles).toEqual(['index.md']); // Only index, no examples
    });

    it('should handle different SSG formats', async () => {
      const docusaurusDir = await createTempDir('docusaurus-format');
      await setupStructure({
        path: docusaurusDir,
        ssg: 'docusaurus',
        includeExamples: true
      });
      
      const content = await fs.readFile(path.join(docusaurusDir, 'tutorials', 'index.md'), 'utf-8');
      expect(content).toContain('id: tutorials-index');
      
      const jekyllDir = await createTempDir('jekyll-format');
      await setupStructure({
        path: jekyllDir,
        ssg: 'jekyll',
        includeExamples: true
      });
      
      const jekyllContent = await fs.readFile(path.join(jekyllDir, 'tutorials', 'index.md'), 'utf-8');
      expect(jekyllContent).toContain('title:');
    });
  });

  describe('deploy_pages', () => {
    it('should create Docusaurus deployment workflow', async () => {
      const repoDir = await createTempDir('docusaurus-deploy');
      const result = await deployPages({
        repository: repoDir,
        ssg: 'docusaurus'
      });
      
      expect(result.content).toBeDefined();
      
      const workflowPath = path.join(repoDir, '.github', 'workflows', 'deploy-docs.yml');
      expect(await fileExists(workflowPath)).toBe(true);
      
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      expect(workflowContent).toContain('Deploy Docusaurus');
      expect(workflowContent).toContain('npm run build');
    });

    it('should create MkDocs deployment workflow', async () => {
      const repoDir = await createTempDir('mkdocs-deploy');
      const result = await deployPages({
        repository: repoDir,
        ssg: 'mkdocs'
      });
      
      const workflowContent = await fs.readFile(
        path.join(repoDir, '.github', 'workflows', 'deploy-docs.yml'),
        'utf-8'
      );
      expect(workflowContent).toContain('mkdocs gh-deploy');
    });

    it('should handle custom domain', async () => {
      const repoDir = await createTempDir('custom-domain');
      const result = await deployPages({
        repository: repoDir,
        ssg: 'docusaurus',
        customDomain: 'docs.example.com'
      });
      
      expect(result.content).toBeDefined();
      expect(await fileExists(path.join(repoDir, 'CNAME'))).toBe(true);
      
      const cnameContent = await fs.readFile(path.join(repoDir, 'CNAME'), 'utf-8');
      expect(cnameContent.trim()).toBe('docs.example.com');
    });

    it('should handle different branches', async () => {
      const repoDir = await createTempDir('custom-branch');
      await deployPages({
        repository: repoDir,
        ssg: 'hugo',
        branch: 'main'
      });
      
      const workflowContent = await fs.readFile(
        path.join(repoDir, '.github', 'workflows', 'deploy-docs.yml'),
        'utf-8'
      );
      expect(workflowContent).toContain('Deploy Hugo');
    });
  });

  describe('verify_deployment', () => {
    it('should verify complete setup', async () => {
      const repoDir = await createCompleteRepo();
      const result = await verifyDeployment({
        repository: repoDir
      });
      
      expect(result.content).toBeDefined();
      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('✅');
    });

    it('should identify missing components', async () => {
      const emptyDir = await createTempDir('empty-verify');
      const result = await verifyDeployment({
        repository: emptyDir
      });
      
      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('❌');
      expect(resultText).toContain('No .github/workflows');
    });

    it('should handle different repository paths', async () => {
      const relativeResult = await verifyDeployment({ repository: '.' });
      expect(relativeResult.content).toBeDefined();
      
      const httpResult = await verifyDeployment({ repository: 'https://github.com/user/repo' });
      expect(httpResult.content).toBeDefined();
    });

    it('should provide recommendations', async () => {
      const incompleteDir = await createTempDir('incomplete');
      await fs.writeFile(path.join(incompleteDir, 'README.md'), '# Test');
      
      const result = await verifyDeployment({
        repository: incompleteDir
      });
      
      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('→');
      expect(resultText).toContain('deploy_pages tool');
    });

    it('should check for different config patterns', async () => {
      const configDir = await createTempDir('config-check');
      await fs.writeFile(path.join(configDir, 'docusaurus.config.js'), 'module.exports = {};');
      
      const result = await verifyDeployment({
        repository: configDir
      });
      
      const resultText = result.content.map(c => c.text).join('\n');
      expect(resultText).toContain('SSG Configuration');
      expect(resultText).toContain('docusaurus.config.js');
    });
  });

  // Helper functions
  async function createJSRepo(): Promise<string> {
    const repoPath = path.join(tempDir, `js-repo-${Date.now()}`);
    await fs.mkdir(repoPath, { recursive: true });
    
    await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify({
      name: 'test-js-project',
      dependencies: { express: '^4.0.0' },
      devDependencies: { jest: '^29.0.0' }
    }, null, 2));
    
    await fs.writeFile(path.join(repoPath, 'index.js'), 'console.log("Hello");');
    await fs.writeFile(path.join(repoPath, 'README.md'), '# JS Project');
    
    return repoPath;
  }

  async function createPythonRepo(): Promise<string> {
    const repoPath = path.join(tempDir, `py-repo-${Date.now()}`);
    await fs.mkdir(repoPath, { recursive: true });
    
    await fs.writeFile(path.join(repoPath, 'requirements.txt'), 'flask>=2.0.0');
    await fs.writeFile(path.join(repoPath, 'main.py'), 'print("Hello")');
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Python Project');
    
    return repoPath;
  }

  async function createRepoWithCI(): Promise<string> {
    const repoPath = path.join(tempDir, `ci-repo-${Date.now()}`);
    await fs.mkdir(path.join(repoPath, '.github', 'workflows'), { recursive: true });
    
    await fs.writeFile(
      path.join(repoPath, '.github', 'workflows', 'ci.yml'),
      'name: CI\non: push'
    );
    await fs.writeFile(path.join(repoPath, 'README.md'), '# CI Project');
    
    return repoPath;
  }

  async function createEmptyRepo(): Promise<string> {
    const repoPath = path.join(tempDir, `empty-repo-${Date.now()}`);
    await fs.mkdir(repoPath, { recursive: true });
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Empty Project');
    
    return repoPath;
  }

  async function createTempDir(suffix: string): Promise<string> {
    const dirPath = path.join(tempDir, `${suffix}-${Date.now()}`);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  async function createCompleteRepo(): Promise<string> {
    const repoPath = await createTempDir('complete-repo');
    
    // Create workflow
    await fs.mkdir(path.join(repoPath, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(
      path.join(repoPath, '.github', 'workflows', 'deploy.yml'),
      'name: Deploy\non: push'
    );
    
    // Create docs
    await fs.mkdir(path.join(repoPath, 'docs'), { recursive: true });
    await fs.writeFile(path.join(repoPath, 'docs', 'index.md'), '# Docs');
    
    // Create config
    await fs.writeFile(path.join(repoPath, 'docusaurus.config.js'), 'module.exports = {};');
    
    // Create build output
    await fs.mkdir(path.join(repoPath, 'build'), { recursive: true });
    await fs.writeFile(path.join(repoPath, 'build', 'index.html'), '<html></html>');
    
    return repoPath;
  }

  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
});