/**
 * Tests for Semantic Analyzer (AST-only mode since v0.6.0)
 */

import {
  SemanticAnalyzer,
  createSemanticAnalyzer,
  type SemanticAnalysisOptions,
  type EnhancedSemanticAnalysis,
} from '../../src/utils/semantic-analyzer.js';

describe('SemanticAnalyzer', () => {
  describe('createSemanticAnalyzer', () => {
    test('should create analyzer with default options', () => {
      const analyzer = createSemanticAnalyzer();
      expect(analyzer).toBeInstanceOf(SemanticAnalyzer);
    });

    test('should create analyzer with custom options', () => {
      const analyzer = createSemanticAnalyzer({
        confidenceThreshold: 0.8,
        useLLM: false, // deprecated but still accepted
      });
      expect(analyzer).toBeInstanceOf(SemanticAnalyzer);
    });
  });

  describe('SemanticAnalyzer (AST-only)', () => {
    let analyzer: SemanticAnalyzer;

    beforeEach(async () => {
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

      test('always uses ast analysis mode', async () => {
        const before = 'function test(x: number) { return x * 2; }';
        const after = 'function test(x: string) { return x; }';

        const result = await analyzer.analyzeSemanticImpact(before, after);

        expect(result.analysisMode).toBe('ast');
      });
    });

    describe('validateExamples - always requires manual review', () => {
      test('should require manual review (LLM removed)', async () => {
        const examples = ['const x = test(5);'];
        const implementation = 'function test(n) { return n * 2; }';

        const result = await analyzer.validateExamples(examples, implementation);

        expect(result.requiresManualReview).toBe(true);
        expect(result.overallConfidence).toBe(0);
        expect(result.suggestions).toContain('LLM not available - manual validation required');
      });

      test('should return isValid true with empty examples array', async () => {
        const result = await analyzer.validateExamples([], 'function test() {}');
        expect(result.isValid).toBe(true);
        expect(result.examples).toHaveLength(0);
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

  describe('Deprecated options are silently ignored', () => {
    test('useLLM: true is accepted without error', async () => {
      // useLLM is deprecated; even if set to true, analysis is AST-only
      const analyzer = new SemanticAnalyzer({ useLLM: true, confidenceThreshold: 0.8 });
      await analyzer.initialize();
      expect(analyzer.isLLMAvailable()).toBe(false);

      const result = await analyzer.analyzeSemanticImpact('code1', 'code2');
      expect(result.analysisMode).toBe('ast');
    });
  });
});
