// Mock dependencies first, before imports
const mockAnalyzeRepository = jest.fn();
const mockValidateContent = jest.fn();
const mockStat = jest.fn();
const mockReaddir = jest.fn();

jest.mock('../../src/tools/analyze-repository.js', () => ({
  analyzeRepository: mockAnalyzeRepository,
}));

jest.mock('../../src/tools/validate-content.js', () => ({
  handleValidateDiataxisContent: mockValidateContent,
}));

jest.mock('fs', () => ({
  promises: {
    stat: mockStat,
    readdir: mockReaddir,
  },
}));

// Now import the module under test
import { detectDocumentationGaps } from '../../src/tools/detect-gaps.js';

describe('detectDocumentationGaps', () => {
  const mockRepositoryAnalysis = {
    id: 'analysis_123',
    structure: {
      hasTests: true,
      hasCI: true,
      hasDocs: true,
    },
    dependencies: {
      ecosystem: 'javascript',
      packages: ['react', 'express'],
    },
    hasApiEndpoints: true,
    packageManager: 'npm',
    hasDocker: true,
    hasCICD: true,
  };

  const mockValidationResult = {
    success: true,
    confidence: { overall: 85 },
    issues: [{ type: 'warning', description: 'Missing API examples' }],
    validationResults: [
      { status: 'pass', message: 'Good structure' },
      { status: 'fail', message: 'Missing references', recommendation: 'Add API docs' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default successful repository analysis
    mockAnalyzeRepository.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify(mockRepositoryAnalysis),
        },
      ],
    });

    // Default validation result
    mockValidateContent.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ success: true, data: mockValidationResult }),
        },
      ],
    } as any);
  });

  describe('successful gap detection', () => {
    it('should detect gaps in repository without documentation', async () => {
      // Mock no documentation directory
      mockStat.mockRejectedValue(new Error('ENOENT'));

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        depth: 'quick',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      const data = JSON.parse(result.content[0].text);

      expect(data.repositoryPath).toBe('/test/repo');
      expect(data.overallScore).toBe(0);
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: 'general',
          gapType: 'missing_section',
          description: 'No documentation directory found',
          priority: 'critical',
        }),
      );
    });

    it('should detect missing Diataxis sections', async () => {
      // Mock existing docs directory but missing sections
      mockStat.mockImplementation((dirPath: any) => {
        if (String(dirPath).includes('/docs')) {
          return Promise.resolve({ isDirectory: () => true } as any);
        }
        if (String(dirPath).includes('/tutorials') || String(dirPath).includes('/how-to')) {
          return Promise.reject(new Error('ENOENT')); // Missing sections
        }
        return Promise.resolve({ isDirectory: () => true } as any);
      });

      mockReaddir.mockImplementation((dirPath: any) => {
        if (String(dirPath).includes('/docs')) {
          return Promise.resolve(['index.md'] as any);
        }
        return Promise.resolve([] as any);
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
        depth: 'standard',
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: 'tutorials',
          gapType: 'missing_section',
          priority: 'high',
        }),
      );
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: 'how-to',
          gapType: 'missing_section',
          priority: 'medium',
        }),
      );
    });

    it('should detect technology-specific gaps', async () => {
      // Mock existing docs but missing tech-specific content
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockImplementation((dirPath: any) => {
        if (String(dirPath).includes('/tutorials')) {
          return Promise.resolve(['getting-started.md'] as any);
        }
        return Promise.resolve(['index.md'] as any);
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
      });

      const data = JSON.parse(result.content[0].text);

      // Should detect API documentation gap
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: 'reference',
          description: 'API endpoints detected but no API documentation found',
          priority: 'critical',
        }),
      );

      // Should detect Docker documentation gap
      expect(data.gaps).toContainEqual(
        expect.objectContaining({
          category: 'how-to',
          description: 'Docker configuration found but no Docker documentation',
        }),
      );
    });

    it('should identify existing strengths', async () => {
      // Mock well-organized documentation
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockImplementation((dirPath: any) => {
        if (String(dirPath).includes('/docs')) {
          return Promise.resolve([
            'index.md',
            'tutorials',
            'how-to',
            'reference',
            'explanation',
          ] as any);
        }
        return Promise.resolve(['getting-started.md', 'advanced.md'] as any);
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.strengths).toContain('Has main documentation index file');
      expect(data.strengths).toContain(
        'Well-organized sections: tutorials, how-to, reference, explanation',
      );
    });

    it('should calculate accurate coverage scores', async () => {
      // Mock complete documentation structure
      mockStat.mockResolvedValue({ isDirectory: () => true } as any);
      mockReaddir.mockImplementation((dirPath: any) => {
        return Promise.resolve(['content1.md', 'content2.md'] as any);
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.contentCoverage.tutorials).toBe(60);
      expect(data.contentCoverage.howTo).toBe(60);
      expect(data.contentCoverage.reference).toBe(60);
      expect(data.contentCoverage.explanation).toBe(60);
      expect(data.overallScore).toBeGreaterThan(10);
    });

    it('should handle existing analysis ID reuse', async () => {
      const existingAnalysisId = 'existing_analysis_456';

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        analysisId: existingAnalysisId,
      });

      const data = JSON.parse(result.content[0].text);

      expect(data.analysisId).toBe(existingAnalysisId);
      expect(mockAnalyzeRepository).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle repository analysis failure', async () => {
      mockAnalyzeRepository.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: false }),
          },
        ],
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/invalid/repo',
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('GAP_DETECTION_FAILED');
      expect(response.error.message).toContain('Repository analysis failed');
    });

    it('should handle validation errors gracefully', async () => {
      // Ensure analyze repository succeeds
      mockAnalyzeRepository.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockRepositoryAnalysis),
          },
        ],
      });

      mockValidateContent.mockRejectedValue(new Error('Validation failed'));

      // Mock fs operations for analyzeExistingDocumentation
      mockStat.mockImplementation(async (filePath: string) => {
        if (filePath.includes('docs')) {
          return { isDirectory: () => true };
        }
        throw new Error('Not found');
      });

      mockReaddir.mockImplementation(async (dirPath: string) => {
        if (dirPath.includes('docs')) {
          return ['index.md'];
        }
        return [];
      });

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
      });

      // Should still work without validation
      const response = JSON.parse(result.content[0].text);
      expect(response.analysisId).toBe('analysis_123');
      expect(response.gaps).toBeInstanceOf(Array);
      expect(response.gaps.length).toBeGreaterThan(0);
    });

    it('should handle file system errors', async () => {
      mockStat.mockRejectedValue(new Error('Permission denied'));

      const result = await detectDocumentationGaps({
        repositoryPath: '/restricted/repo',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.analysisId).toBe('analysis_123');
      expect(response.gaps).toBeInstanceOf(Array);
      expect(response.gaps.length).toBe(1);
      expect(response.gaps[0].description).toBe('No documentation directory found');
    });
  });

  describe('recommendation generation', () => {
    it('should generate immediate recommendations for critical gaps', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT')); // No docs exist

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.analysisId).toBe('analysis_123');
      expect(response.recommendations.immediate).toContain(
        'Create documentation structure using setup_structure tool',
      );
    });

    it('should prioritize recommendations correctly', async () => {
      // Mock mixed scenario - some docs exist, some missing
      mockStat.mockImplementation((dirPath: any) => {
        if (String(dirPath).includes('/tutorials')) {
          return Promise.reject(new Error('ENOENT'));
        }
        return Promise.resolve({ isDirectory: () => true } as any);
      });

      mockReaddir.mockResolvedValue(['existing.md'] as any);

      const result = await detectDocumentationGaps({
        repositoryPath: '/test/repo',
        documentationPath: '/test/repo/docs',
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.analysisId).toBe('analysis_123');
      expect(response.recommendations).toBeDefined();
      expect(response.recommendations.immediate.length).toBeGreaterThan(0);
      expect(response.gaps.some((gap: any) => gap.priority === 'high')).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should handle invalid depth parameter', async () => {
      await expect(
        detectDocumentationGaps({
          repositoryPath: '/test/repo',
          depth: 'invalid' as any,
        }),
      ).rejects.toThrow();
    });

    it('should require repositoryPath', async () => {
      await expect(
        detectDocumentationGaps({
          documentationPath: '/test/docs',
        } as any),
      ).rejects.toThrow();
    });
  });
});
