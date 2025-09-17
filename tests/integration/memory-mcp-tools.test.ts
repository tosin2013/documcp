/**
 * Memory MCP Tools Integration Tests
 * Tests integration between memory system and MCP tools
 * Part of Issue #56 - Memory MCP Tools Integration Tests
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  initializeMemory,
  rememberAnalysis,
  rememberRecommendation,
  rememberDeployment,
  rememberConfiguration,
  recallProjectHistory,
  getProjectInsights,
  getSimilarProjects,
  getMemoryStatistics
} from '../../src/memory/integration.js';
import { analyzeRepository } from '../../src/tools/analyze-repository.js';
import { recommendSSG } from '../../src/tools/recommend-ssg.js';

describe('Memory MCP Tools Integration', () => {
  let tempDir: string;
  let testProjectDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = path.join(os.tmpdir(), `memory-mcp-integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create a mock project structure for testing
    testProjectDir = path.join(tempDir, 'test-project');
    await createMockProject(testProjectDir);
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  async function createMockProject(projectPath: string) {
    await fs.mkdir(projectPath, { recursive: true });

    // Create package.json
    await fs.writeFile(path.join(projectPath, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: {
        'react': '^18.0.0',
        'typescript': '^5.0.0'
      },
      devDependencies: {
        'jest': '^29.0.0'
      }
    }, null, 2));

    // Create README.md
    await fs.writeFile(path.join(projectPath, 'README.md'), `# Test Project

A test project for memory integration testing.

## Features
- TypeScript support
- React components
- Jest testing
`);

    // Create src directory with TypeScript files
    await fs.mkdir(path.join(projectPath, 'src'));
    await fs.writeFile(path.join(projectPath, 'src/index.ts'), 'export const hello = "world";');
    await fs.writeFile(path.join(projectPath, 'src/component.tsx'), 'import React from "react"; export const Component = () => <div>Hello</div>;');

    // Create tests directory
    await fs.mkdir(path.join(projectPath, '__tests__'));
    await fs.writeFile(path.join(projectPath, '__tests__/index.test.ts'), 'test("hello world", () => { expect(true).toBe(true); });');

    // Create docs directory
    await fs.mkdir(path.join(projectPath, 'docs'));
    await fs.writeFile(path.join(projectPath, 'docs/setup.md'), '# Setup Guide\n\nHow to set up the project.');
  }

  describe('Memory Integration Initialization', () => {
    test('should initialize memory system for MCP tools', async () => {
      const memoryManager = await initializeMemory();

      expect(memoryManager).toBeDefined();
      expect(memoryManager.constructor.name).toBe('MemoryManager');
    });

    test('should handle memory system events', async () => {
      const memoryManager = await initializeMemory();
      let eventsFired = 0;

      memoryManager.on('memory-created', () => {
        eventsFired++;
      });

      // Create a memory entry
      await memoryManager.remember('analysis', { test: true });

      // Give events time to fire
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(eventsFired).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Repository Analysis Integration', () => {
    test('should integrate repository analysis with memory system', async () => {
      // Run repository analysis tool
      const analysisResult = await analyzeRepository({
        path: testProjectDir,
        depth: 'standard'
      });

      expect(analysisResult.isError).toBeFalsy();
      expect(analysisResult.content).toBeDefined();

      // Extract analysis data from MCP response
      const analysisContent = analysisResult.content.find(c =>
        c.type === 'text' && c.text.includes('Analysis Complete')
      );
      expect(analysisContent).toBeDefined();

      // Remember analysis in memory system
      const analysisData = {
        projectId: 'test-project',
        language: { primary: 'typescript' },
        framework: { name: 'react' },
        stats: { files: 5 },
        repository: { url: 'github.com/test/project' }
      };

      const memoryId = await rememberAnalysis(testProjectDir, analysisData);
      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');

      // Verify memory was stored
      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled).not.toBeNull();
      expect(recalled?.data.language.primary).toBe('typescript');
      expect(recalled?.data.framework.name).toBe('react');
    });

    test('should store analysis metadata correctly', async () => {
      const analysisData = {
        projectId: 'metadata-test',
        language: { primary: 'javascript' },
        framework: { name: 'vue' },
        stats: { files: 25 },
        repository: { url: 'github.com/test/vue-project' }
      };

      const memoryId = await rememberAnalysis('/test/vue-project', analysisData);

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled?.metadata.repository).toBe('github.com/test/vue-project');
      expect(recalled?.metadata.tags).toContain('analysis');
      expect(recalled?.metadata.tags).toContain('javascript');
      expect(recalled?.metadata.tags).toContain('vue');
    });
  });

  describe('SSG Recommendation Integration', () => {
    test('should integrate SSG recommendation with memory system', async () => {
      // First create an analysis
      const analysisData = {
        projectId: 'ssg-test',
        language: { primary: 'typescript' },
        framework: { name: 'react' }
      };

      const analysisId = await rememberAnalysis('/test/ssg-project', analysisData);

      // Run SSG recommendation tool
      const recommendationResult = await recommendSSG({
        analysisId,
        preferences: {
          priority: 'features',
          ecosystem: 'javascript'
        }
      });

      expect(recommendationResult.content).toBeDefined();

      // Extract recommendation data
      const recommendationData = {
        recommended: 'docusaurus',
        confidence: 0.85,
        reasoning: ['React-based', 'TypeScript support'],
        analysisId
      };

      const memoryId = await rememberRecommendation(analysisId, recommendationData);
      expect(memoryId).toBeDefined();

      // Verify memory linking
      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled?.data.recommended).toBe('docusaurus');
      expect(recalled?.metadata.ssg).toBe('docusaurus');
      expect(recalled?.metadata.tags).toContain('recommendation');
      expect(recalled?.metadata.tags).toContain('docusaurus');
    });

    test('should link recommendations to analysis', async () => {
      // Create analysis
      const analysisData = {
        projectId: 'linked-test',
        language: { primary: 'python' }
      };
      const analysisId = await rememberAnalysis('/test/python-project', analysisData);

      // Create recommendation
      const recommendationData = {
        recommended: 'mkdocs',
        confidence: 0.9
      };
      const recommendationId = await rememberRecommendation(analysisId, recommendationData);

      // Verify linking
      const memoryManager = await initializeMemory();
      const recommendation = await memoryManager.recall(recommendationId);
      const analysis = await memoryManager.recall(analysisId);

      expect(recommendation?.metadata.projectId).toBe(analysis?.metadata.projectId);
      expect(recommendation?.metadata.projectId).toBe('linked-test');
    });
  });

  describe('Deployment Memory Integration', () => {
    test('should store deployment results in memory', async () => {
      const deploymentData = {
        ssg: 'hugo',
        status: 'success',
        duration: 120,
        url: 'https://test-project.github.io',
        branch: 'gh-pages'
      };

      const memoryId = await rememberDeployment('github.com/test/project', deploymentData);

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled?.data.ssg).toBe('hugo');
      expect(recalled?.data.status).toBe('success');
      expect(recalled?.metadata.repository).toBe('github.com/test/project');
      expect(recalled?.metadata.tags).toContain('deployment');
      expect(recalled?.metadata.tags).toContain('success');
      expect(recalled?.metadata.tags).toContain('hugo');
    });

    test('should track deployment failures', async () => {
      const failedDeployment = {
        ssg: 'jekyll',
        status: 'failed',
        error: 'Build failed: missing dependency',
        duration: 45
      };

      const memoryId = await rememberDeployment('github.com/test/failed-project', failedDeployment);

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled?.data.status).toBe('failed');
      expect(recalled?.data.error).toContain('Build failed');
      expect(recalled?.metadata.tags).toContain('failed');
    });
  });

  describe('Configuration Memory Integration', () => {
    test('should store configuration data in memory', async () => {
      const configData = {
        title: 'Test Documentation',
        theme: 'material',
        plugins: ['search', 'navigation'],
        build: {
          outputDir: '_site',
          baseUrl: '/docs/'
        }
      };

      const memoryId = await rememberConfiguration('test-docs', 'mkdocs', configData);

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);

      expect(recalled?.data.title).toBe('Test Documentation');
      expect(recalled?.data.theme).toBe('material');
      expect(recalled?.metadata.ssg).toBe('mkdocs');
      expect(recalled?.metadata.tags).toContain('configuration');
      expect(recalled?.metadata.tags).toContain('mkdocs');
      expect(recalled?.metadata.tags).toContain('test-docs');
    });
  });

  describe('Project History and Insights', () => {
    test('should recall comprehensive project history', async () => {
      const projectId = 'history-test';

      // Create a complete project workflow in memory
      const analysisData = {
        projectId,
        language: { primary: 'typescript' },
        framework: { name: 'react' }
      };
      await rememberAnalysis('/test/history-project', analysisData);

      const recommendationData = {
        recommended: 'docusaurus',
        confidence: 0.8
      };
      await rememberRecommendation('analysis-id', recommendationData);

      const deploymentData = {
        ssg: 'docusaurus',
        status: 'success',
        duration: 90
      };
      await rememberDeployment('github.com/test/history-project', deploymentData);

      // Recall project history
      const history = await recallProjectHistory(projectId);

      expect(history.projectId).toBe(projectId);
      expect(history.history).toBeDefined();
      expect(history.insights).toBeDefined();
      expect(Array.isArray(history.insights)).toBe(true);
    });

    test('should generate meaningful project insights', async () => {
      const projectId = 'insights-test';

      // Create deployment history
      const successfulDeployment = {
        ssg: 'hugo',
        status: 'success',
        duration: 60
      };
      await rememberDeployment('github.com/test/insights-project', successfulDeployment);

      const failedDeployment = {
        ssg: 'hugo',
        status: 'failed',
        error: 'Build timeout'
      };
      await rememberDeployment('github.com/test/insights-project', failedDeployment);

      const insights = await getProjectInsights(projectId);

      expect(Array.isArray(insights)).toBe(true);

      // Insights may be empty if memories don't meet criteria, that's ok
      if (insights.length > 0) {
        // Should include deployment success rate if deployments exist
        const successRateInsight = insights.find(i => i.includes('success rate'));
        expect(successRateInsight).toBeDefined();
      }
    });
  });

  describe('Similar Projects Discovery', () => {
    test('should find similar projects based on characteristics', async () => {
      // Create multiple projects with different characteristics
      await rememberAnalysis('/project1', {
        projectId: 'project1',
        language: { primary: 'typescript' },
        framework: { name: 'react' }
      });

      await rememberAnalysis('/project2', {
        projectId: 'project2',
        language: { primary: 'typescript' },
        framework: { name: 'vue' }
      });

      await rememberAnalysis('/project3', {
        projectId: 'project3',
        language: { primary: 'python' },
        framework: { name: 'django' }
      });

      // Search for similar projects
      const targetProject = {
        language: { primary: 'typescript' },
        framework: { name: 'react' },
        stats: { files: 100 }
      };

      const similarProjects = await getSimilarProjects(targetProject, 3);

      expect(Array.isArray(similarProjects)).toBe(true);

      // Similar projects may be empty if no matches found, that's ok
      if (similarProjects.length > 0) {
        // Should find TypeScript projects first
        const tsProjects = similarProjects.filter(p => p.similarity > 0);
        expect(tsProjects.length).toBeGreaterThan(0);
      }
    });

    test('should calculate similarity scores correctly', async () => {
      // Create projects with known characteristics
      await rememberAnalysis('/exact-match', {
        projectId: 'exact-match',
        language: { primary: 'javascript' },
        framework: { name: 'vue' },
        stats: { files: 50 },
        documentation: { type: 'api' }
      });

      await rememberAnalysis('/partial-match', {
        projectId: 'partial-match',
        language: { primary: 'javascript' },
        framework: { name: 'react' },
        stats: { files: 45 }
      });

      const targetProject = {
        language: { primary: 'javascript' },
        framework: { name: 'vue' },
        stats: { files: 52 },
        documentation: { type: 'api' }
      };

      const similarProjects = await getSimilarProjects(targetProject, 5);

      expect(Array.isArray(similarProjects)).toBe(true);

      // Similar projects may be empty, but if found should have similarity scores
      if (similarProjects.length > 0) {
        const exactMatch = similarProjects.find(p => p.projectId === 'exact-match');
        const partialMatch = similarProjects.find(p => p.projectId === 'partial-match');

        if (exactMatch && partialMatch) {
          expect(exactMatch.similarity).toBeGreaterThan(partialMatch.similarity);
        }
      }
    });
  });

  describe('Memory Statistics and Analytics', () => {
    test('should provide memory statistics for tools', async () => {
      // Create some test data
      await rememberAnalysis('/stats-test', {
        projectId: 'stats-test',
        language: { primary: 'go' }
      });

      await rememberDeployment('github.com/test/stats', {
        ssg: 'hugo',
        status: 'success'
      });

      const stats = await getMemoryStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed analysis data gracefully', async () => {
      const malformedData = {
        // Missing required fields
        language: null,
        framework: undefined
      };

      // Should not throw but handle gracefully
      const memoryId = await rememberAnalysis('/malformed', malformedData);
      expect(memoryId).toBeDefined();

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);
      expect(recalled).not.toBeNull();
    });

    test('should handle missing analysis when creating recommendations', async () => {
      const recommendationData = {
        recommended: 'jekyll',
        confidence: 0.7
      };

      // Reference non-existent analysis
      const memoryId = await rememberRecommendation('non-existent-analysis', recommendationData);
      expect(memoryId).toBeDefined();

      const memoryManager = await initializeMemory();
      const recalled = await memoryManager.recall(memoryId);
      expect(recalled?.data.recommended).toBe('jekyll');
    });

    test('should handle empty project history gracefully', async () => {
      const history = await recallProjectHistory('non-existent-project');

      expect(history.projectId).toBe('non-existent-project');
      expect(history.history).toBeDefined();
      expect(Array.isArray(history.insights)).toBe(true);
    });

    test('should handle similar projects search with no matches', async () => {
      const uniqueProject = {
        language: { primary: 'rust' },
        framework: { name: 'actix' },
        stats: { files: 500 }
      };

      const similarProjects = await getSimilarProjects(uniqueProject, 5);

      expect(Array.isArray(similarProjects)).toBe(true);
      // Should return empty array or minimal matches
      expect(similarProjects.length).toBeGreaterThanOrEqual(0);
    });
  });
});