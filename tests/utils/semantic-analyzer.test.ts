/**
 * Tests for Semantic Analyzer
 */

import {
  SemanticAnalyzer,
  createSemanticAnalyzer,
  type SemanticAnalysisOptions,
  type EnhancedSemanticAnalysis,
} from '../../src/utils/semantic-analyzer.js';
import { createLLMClient } from '../../src/utils/llm-client.js';

// Mock the LLM client module
jest.mock('../../src/utils/llm-client.js', () => {
  const actual = jest.requireActual('../../src/utils/llm-client.js');
  return {
    ...actual,
    createLLMClient: jest.fn(),
  };
});

const mockCreateLLMClient = createLLMClient as jest.MockedFunction<typeof createLLMClient>;

describe('SemanticAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSemanticAnalyzer', () => {
    test('should create analyzer with default options', () => {
      const analyzer = createSemanticAnalyzer();
      expect(analyzer).toBeInstanceOf(SemanticAnalyzer);
    });

    test('should create analyzer with custom options', () => {
      const analyzer = createSemanticAnalyzer({
        confidenceThreshold: 0.8,
        useLLM: false,
      });
      expect(analyzer).toBeInstanceOf(SemanticAnalyzer);
    });
  });

  describe('SemanticAnalyzer without LLM', () => {
    let analyzer: SemanticAnalyzer;

    beforeEach(async () => {
      mockCreateLLMClient.mockReturnValue(null);
      analyzer = new SemanticAnalyzer({ useLLM: false });
      await analyzer.initialize();
    });

    test('should initialize successfully', async () => {
      expect(analyzer).toBeDefined();
    });

    test('should report LLM as unavailable', () => {
      expect(analyzer.isLLMAvailable()).toBe(false);
    });

    describe('analyzeSemanticImpact - AST mode', () => {
      test('should detect no changes when code is identical', async () => {
        const code = 'function test(x: number) { return x * 2; }';
        const result = await analyzer.analyzeSemanticImpact(code, code);

        expect(result.analysisMode).toBe('ast');
        expect(result.hasBehavioralChange).toBe(false);
        expect(result.llmAvailable).toBe(false);
        expect(result.timestamp).toBeDefined();
      });

      test('should detect parameter changes', async () => {
        const before = 'function test(x: number) { return x * 2; }';
        const after = 'function test(x: number, y: string) { return x * 2; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.hasBehavioralChange).toBe(true);
        expect(result.breakingForExamples).toBe(true);
        expect(result.changeDescription).toContain('Breaking changes');
        expect(result.astDiffs).toBeDefined();
        expect(result.astDiffs!.length).toBeGreaterThan(0);
      });

      test('should detect async modifier changes', async () => {
        const before = 'function test() { return 42; }';
        const after = 'async function test() { return 42; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.hasBehavioralChange).toBe(true);
        expect(result.astDiffs).toBeDefined();
        expect(result.astDiffs!.some(d => d.details.includes('Async'))).toBe(true);
      });

      test('should detect return type changes', async () => {
        const before = 'function test(): number { return 42; }';
        const after = 'function test(): string { return "42"; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.hasBehavioralChange).toBe(true);
        expect(result.breakingForExamples).toBe(true);
        expect(result.astDiffs).toBeDefined();
      });

      test('should detect implementation changes', async () => {
        const before = 'function test(x: number) { return x * 2; }';
        const after = 'function test(x: number) { return x * 3; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.hasBehavioralChange).toBe(true);
        expect(result.astDiffs).toBeDefined();
      });

      test('should identify affected documentation sections', async () => {
        const before = 'function test(x: number): number { return x; }';
        const after = 'function test(x: string): number { return 0; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.affectedDocSections).toContain('API Reference');
      });

      test('should have moderate confidence for AST analysis', async () => {
        const before = 'function test(x: number) { return x * 2; }';
        const after = 'function test(x: number) { return x * 3; }';

        const result = await analyzer.analyzeSemanticImpact(before, after);

        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('validateExamples - without LLM', () => {
      test('should require manual review when LLM unavailable', async () => {
        const examples = ['const x = test(5);'];
        const implementation = 'function test(n) { return n * 2; }';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.requiresManualReview).toBe(true);
        expect(result.overallConfidence).toBe(0);
        expect(result.suggestions).toContain('LLM not available - manual validation required');
      });
    });

    describe('analyzeBatch', () => {
      test('should analyze multiple changes', async () => {
        const changes = [
          {
            before: 'function a(x: number) { return x; }',
            after: 'function a(x: string) { return x; }',
            name: 'a',
          },
          {
            before: 'function b() { return 1; }',
            after: 'async function b() { return 1; }',
            name: 'b',
          },
        ];

        const results = await analyzer.analyzeBatch(changes);

        expect(results).toHaveLength(2);
        expect(results[0].analysisMode).toBe('ast');
        expect(results[1].analysisMode).toBe('ast');
      });
    });
  });

  describe('SemanticAnalyzer with LLM', () => {
    let analyzer: SemanticAnalyzer;
    let mockLLMClient: any;

    beforeEach(async () => {
      mockLLMClient = {
        complete: jest.fn(),
        analyzeCodeChange: jest.fn(),
        simulateExecution: jest.fn(),
      };

      mockCreateLLMClient.mockReturnValue(mockLLMClient);
      analyzer = new SemanticAnalyzer({ useLLM: true });
      await analyzer.initialize();
    });

    test('should report LLM as available', () => {
      expect(analyzer.isLLMAvailable()).toBe(true);
    });

    describe('analyzeSemanticImpact - LLM mode', () => {
      test('should use LLM analysis with high confidence', async () => {
        const mockAnalysis = {
          hasBehavioralChange: true,
          breakingForExamples: false,
          changeDescription: 'Implementation optimized',
          affectedDocSections: ['Performance'],
          confidence: 0.9,
        };

        mockLLMClient.analyzeCodeChange.mockResolvedValue(mockAnalysis);

        const before = 'function test(x) { return x * 2; }';
        const after = 'function test(x) { return x << 1; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.analysisMode).toBe('llm');
        expect(result.hasBehavioralChange).toBe(true);
        expect(result.confidence).toBe(0.9);
        expect(result.llmAvailable).toBe(true);
        expect(mockLLMClient.analyzeCodeChange).toHaveBeenCalledWith(before, after);
      });

      test('should use hybrid mode with low LLM confidence', async () => {
        const mockAnalysis = {
          hasBehavioralChange: true,
          breakingForExamples: false,
          changeDescription: 'Unclear change',
          affectedDocSections: [],
          confidence: 0.3, // Below threshold
        };

        mockLLMClient.analyzeCodeChange.mockResolvedValue(mockAnalysis);

        const before = 'function test(x: number) { return x * 2; }';
        const after = 'function test(x: number) { return x * 3; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.analysisMode).toBe('hybrid');
        expect(result.astDiffs).toBeDefined();
        expect(result.llmAvailable).toBe(true);
      });

      test('should fallback to AST when LLM fails', async () => {
        mockLLMClient.analyzeCodeChange.mockRejectedValue(new Error('LLM error'));

        const before = 'function test(x: number) { return x; }';
        const after = 'function test(x: string) { return x; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.analysisMode).toBe('ast');
        expect(result.llmAvailable).toBe(false);
      });

      test('should combine LLM and AST results in hybrid mode', async () => {
        const mockAnalysis = {
          hasBehavioralChange: false,
          breakingForExamples: false,
          changeDescription: 'Minor refactoring',
          affectedDocSections: ['Code Style'],
          confidence: 0.5,
        };

        mockLLMClient.analyzeCodeChange.mockResolvedValue(mockAnalysis);

        const before = 'function test(x: number): number { return x; }';
        const after = 'function test(x: string): string { return x; }';

        const result = await analyzer.analyzeSemanticImpact(before, after, 'test');

        expect(result.analysisMode).toBe('hybrid');
        expect(result.hasBehavioralChange).toBe(true); // AST detected breaking change
        expect(result.affectedDocSections.length).toBeGreaterThan(0);
        expect(result.changeDescription).toContain('Minor refactoring');
        expect(result.changeDescription).toContain('AST analysis');
      });
    });

    describe('validateExamples - with LLM', () => {
      test('should validate examples successfully', async () => {
        const mockSimulation = {
          success: true,
          expectedOutput: '10',
          actualOutput: '10',
          matches: true,
          differences: [],
          confidence: 0.95,
        };

        mockLLMClient.simulateExecution.mockResolvedValue(mockSimulation);

        const examples = ['const result = multiply(2, 5);'];
        const implementation = 'function multiply(a, b) { return a * b; }';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.isValid).toBe(true);
        expect(result.examples).toHaveLength(1);
        expect(result.examples[0].isValid).toBe(true);
        expect(result.overallConfidence).toBeGreaterThan(0.9);
        expect(result.requiresManualReview).toBe(false);
      });

      test('should detect invalid examples', async () => {
        const mockSimulation = {
          success: true,
          expectedOutput: '10',
          actualOutput: '5',
          matches: false,
          differences: ['Output mismatch'],
          confidence: 0.85,
        };

        mockLLMClient.simulateExecution.mockResolvedValue(mockSimulation);

        const examples = ['const result = multiply(2, 5);'];
        const implementation = 'function multiply(a, b) { return a + b; }';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.isValid).toBe(false);
        expect(result.examples[0].isValid).toBe(false);
        expect(result.examples[0].issues.length).toBeGreaterThan(0);
        expect(result.suggestions).toContain('1 example(s) may be invalid');
      });

      test('should handle validation errors gracefully', async () => {
        mockLLMClient.simulateExecution.mockRejectedValue(new Error('Simulation failed'));

        const examples = ['const result = test();'];
        const implementation = 'function test() {}';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.isValid).toBe(false);
        expect(result.examples[0].isValid).toBe(false);
        expect(result.examples[0].issues).toContain('Validation failed');
      });

      test('should recommend manual review for low confidence', async () => {
        const mockSimulation = {
          success: true,
          expectedOutput: 'unknown',
          actualOutput: 'unknown',
          matches: true,
          differences: [],
          confidence: 0.4, // Below threshold
        };

        mockLLMClient.simulateExecution.mockResolvedValue(mockSimulation);

        const examples = ['test();'];
        const implementation = 'function test() {}';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.requiresManualReview).toBe(true);
        expect(result.suggestions).toContain('Low confidence - manual review recommended');
      });

      test('should validate multiple examples', async () => {
        mockLLMClient.simulateExecution
          .mockResolvedValueOnce({
            success: true,
            expectedOutput: '10',
            actualOutput: '10',
            matches: true,
            differences: [],
            confidence: 0.9,
          })
          .mockResolvedValueOnce({
            success: true,
            expectedOutput: '20',
            actualOutput: '20',
            matches: true,
            differences: [],
            confidence: 0.85,
          });

        const examples = [
          'const a = multiply(2, 5);',
          'const b = multiply(4, 5);',
        ];
        const implementation = 'function multiply(a, b) { return a * b; }';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.isValid).toBe(true);
        expect(result.examples).toHaveLength(2);
        expect(result.overallConfidence).toBeCloseTo(0.875, 2);
      });
    });

    describe('analyzeBatch - with LLM', () => {
      test('should analyze multiple changes with LLM', async () => {
        mockLLMClient.analyzeCodeChange
          .mockResolvedValueOnce({
            hasBehavioralChange: true,
            breakingForExamples: false,
            changeDescription: 'First change',
            affectedDocSections: ['API'],
            confidence: 0.9,
          })
          .mockResolvedValueOnce({
            hasBehavioralChange: false,
            breakingForExamples: false,
            changeDescription: 'Second change',
            affectedDocSections: [],
            confidence: 0.8,
          });

        const changes = [
          { before: 'code1', after: 'code2', name: 'func1' },
          { before: 'code3', after: 'code4', name: 'func2' },
        ];

        const results = await analyzer.analyzeBatch(changes);

        expect(results).toHaveLength(2);
        expect(results[0].analysisMode).toBe('llm');
        expect(results[1].analysisMode).toBe('llm');
        expect(mockLLMClient.analyzeCodeChange).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Custom confidence threshold', () => {
    test('should use custom threshold for hybrid mode decision', async () => {
      const mockLLMClient = {
        complete: jest.fn(),
        analyzeCodeChange: jest.fn().mockResolvedValue({
          hasBehavioralChange: true,
          breakingForExamples: false,
          changeDescription: 'Change',
          affectedDocSections: [],
          confidence: 0.75,
        }),
        simulateExecution: jest.fn(),
      };

      mockCreateLLMClient.mockReturnValue(mockLLMClient);

      const analyzer = new SemanticAnalyzer({
        useLLM: true,
        confidenceThreshold: 0.8, // Higher than LLM confidence
      });
      await analyzer.initialize();

      const result = await analyzer.analyzeSemanticImpact('code1', 'code2');

      // Should use hybrid mode because confidence (0.75) < threshold (0.8)
      expect(result.analysisMode).toBe('hybrid');
    });
  });
});
