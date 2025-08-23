// Additional tests to improve analyze-repository coverage
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { analyzeRepository } from '../../src/tools/analyze-repository';

describe('Analyze Repository Additional Coverage', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), 'analyze-coverage');
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Cleanup errors are okay
    }
  });

  describe('Different Repository Types', () => {
    it('should analyze Ruby project', async () => {
      const rubyDir = path.join(tempDir, 'ruby-project');
      await fs.mkdir(rubyDir, { recursive: true });
      
      await fs.writeFile(path.join(rubyDir, 'Gemfile'), `
source 'https://rubygems.org'
gem 'rails', '~> 7.0'
gem 'puma'
gem 'redis'
      `);
      
      await fs.writeFile(path.join(rubyDir, 'app.rb'), 'puts "Hello Ruby"');
      await fs.writeFile(path.join(rubyDir, 'README.md'), '# Ruby Project');
      
      const result = await analyzeRepository({ path: rubyDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('ecosystem'))!.text);
      expect(analysis.dependencies.ecosystem).toBe('ruby');
    });

    it('should analyze Go project', async () => {
      const goDir = path.join(tempDir, 'go-project');
      await fs.mkdir(goDir, { recursive: true });
      
      await fs.writeFile(path.join(goDir, 'go.mod'), `
module example.com/myapp
go 1.21
require (
  github.com/gin-gonic/gin v1.9.0
  github.com/stretchr/testify v1.8.0
)
      `);
      
      await fs.writeFile(path.join(goDir, 'main.go'), 'package main');
      await fs.writeFile(path.join(goDir, 'README.md'), '# Go Project');
      
      const result = await analyzeRepository({ path: goDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('ecosystem'))!.text);
      expect(analysis.dependencies.ecosystem).toBe('go');
    });

    it('should analyze Java project', async () => {
      const javaDir = path.join(tempDir, 'java-project');
      await fs.mkdir(javaDir, { recursive: true });
      
      await fs.writeFile(path.join(javaDir, 'pom.xml'), `
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>myapp</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter</artifactId>
    </dependency>
  </dependencies>
</project>
      `);
      
      await fs.writeFile(path.join(javaDir, 'App.java'), 'public class App {}');
      
      const result = await analyzeRepository({ path: javaDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('ecosystem'))!.text);
      expect(analysis.dependencies.ecosystem).toBe('java');
    });

    it('should analyze project with Docker', async () => {
      const dockerDir = path.join(tempDir, 'docker-project');
      await fs.mkdir(dockerDir, { recursive: true });
      
      await fs.writeFile(path.join(dockerDir, 'Dockerfile'), `
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
      `);
      
      await fs.writeFile(path.join(dockerDir, 'docker-compose.yml'), `
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
      `);
      
      await fs.writeFile(path.join(dockerDir, 'package.json'), '{"name": "docker-app"}');
      
      const result = await analyzeRepository({ path: dockerDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('hasDocker'))!.text);
      expect(analysis.structure.hasDocker).toBe(true);
    });

    it('should analyze project with existing docs', async () => {
      const docsDir = path.join(tempDir, 'docs-project');
      await fs.mkdir(path.join(docsDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(docsDir, 'documentation'), { recursive: true });
      
      await fs.writeFile(path.join(docsDir, 'docs', 'index.md'), '# Documentation');
      await fs.writeFile(path.join(docsDir, 'docs', 'api.md'), '# API Reference');
      await fs.writeFile(path.join(docsDir, 'documentation', 'guide.md'), '# User Guide');
      await fs.writeFile(path.join(docsDir, 'README.md'), '# Project with Docs');
      
      const result = await analyzeRepository({ path: docsDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('hasDocs'))!.text);
      expect(analysis.structure.hasDocs).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty repository', async () => {
      const emptyDir = path.join(tempDir, 'empty-repo');
      await fs.mkdir(emptyDir, { recursive: true });
      
      const result = await analyzeRepository({ path: emptyDir, depth: 'quick' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('ecosystem'))!.text);
      expect(analysis.dependencies.ecosystem).toBe('unknown');
    });

    it('should handle repository with only config files', async () => {
      const configDir = path.join(tempDir, 'config-only');
      await fs.mkdir(configDir, { recursive: true });
      
      await fs.writeFile(path.join(configDir, '.gitignore'), 'node_modules/');
      await fs.writeFile(path.join(configDir, '.editorconfig'), 'indent_style = space');
      await fs.writeFile(path.join(configDir, 'LICENSE'), 'MIT License');
      
      const result = await analyzeRepository({ path: configDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should handle deep analysis depth', async () => {
      const deepDir = path.join(tempDir, 'deep-analysis');
      await fs.mkdir(deepDir, { recursive: true });
      
      // Create nested structure
      await fs.mkdir(path.join(deepDir, 'src', 'components', 'ui'), { recursive: true });
      await fs.mkdir(path.join(deepDir, 'src', 'utils', 'helpers'), { recursive: true });
      await fs.mkdir(path.join(deepDir, 'tests', 'unit'), { recursive: true });
      
      await fs.writeFile(path.join(deepDir, 'package.json'), JSON.stringify({
        name: 'deep-project',
        scripts: {
          test: 'jest',
          build: 'webpack',
          lint: 'eslint .'
        }
      }));
      
      await fs.writeFile(path.join(deepDir, 'src', 'index.js'), 'console.log("app");');
      await fs.writeFile(path.join(deepDir, 'src', 'components', 'ui', 'Button.js'), 'export default Button;');
      await fs.writeFile(path.join(deepDir, 'tests', 'unit', 'test.js'), 'test("sample", () => {});');
      
      const result = await analyzeRepository({ path: deepDir, depth: 'deep' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('hasTests'))!.text);
      expect(analysis.structure.hasTests).toBe(true);
    });

    it('should analyze repository with multiple ecosystems', async () => {
      const multiDir = path.join(tempDir, 'multi-ecosystem');
      await fs.mkdir(multiDir, { recursive: true });
      
      // JavaScript
      await fs.writeFile(path.join(multiDir, 'package.json'), '{"name": "frontend"}');
      
      // Python
      await fs.writeFile(path.join(multiDir, 'requirements.txt'), 'flask==2.0.0');
      
      // Ruby
      await fs.writeFile(path.join(multiDir, 'Gemfile'), 'gem "rails"');
      
      const result = await analyzeRepository({ path: multiDir, depth: 'standard' });
      expect(result.content).toBeDefined();
      // Should detect the primary ecosystem (usually the one with most files/config)
      const analysis = JSON.parse(result.content.find(c => c.text.includes('ecosystem'))!.text);
      expect(['javascript', 'python', 'ruby']).toContain(analysis.dependencies.ecosystem);
    });
  });

  describe('Repository Complexity Analysis', () => {
    it('should calculate complexity metrics', async () => {
      const complexDir = path.join(tempDir, 'complex-repo');
      await fs.mkdir(path.join(complexDir, '.github', 'workflows'), { recursive: true });
      
      // Create various files to test complexity
      await fs.writeFile(path.join(complexDir, 'package.json'), JSON.stringify({
        name: 'complex-app',
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.0.0',
          'webpack': '^5.0.0'
        },
        devDependencies: {
          'jest': '^29.0.0',
          'eslint': '^8.0.0'
        }
      }));
      
      await fs.writeFile(path.join(complexDir, '.github', 'workflows', 'ci.yml'), `
name: CI
on: push
jobs:
  test:
    runs-on: ubuntu-latest
      `);
      
      await fs.writeFile(path.join(complexDir, 'README.md'), '# Complex Project\n\nWith detailed documentation');
      await fs.writeFile(path.join(complexDir, 'CONTRIBUTING.md'), '# Contributing Guide');
      
      const result = await analyzeRepository({ path: complexDir, depth: 'deep' });
      expect(result.content).toBeDefined();
      const analysis = JSON.parse(result.content.find(c => c.text.includes('hasCI'))!.text);
      expect(analysis.structure.hasCI).toBe(true);
      expect(analysis.structure.hasReadme).toBe(true);
    });
  });
});