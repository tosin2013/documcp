/**
 * Tests for LLM Client
 */

import {
  createLLMClient,
  DeepSeekClient,
  isLLMAvailable,
  type LLMConfig,
  type SemanticAnalysis,
  type SimulationResult,
} from '../../src/utils/llm-client.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('LLM Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.DOCUMCP_LLM_API_KEY;
    delete process.env.DOCUMCP_LLM_PROVIDER;
    delete process.env.DOCUMCP_LLM_MODEL;
  });

  describe('createLLMClient', () => {
    test('should return null when no API key is provided', () => {
      const client = createLLMClient();
      expect(client).toBeNull();
    });

    test('should create client with environment variables', () => {
      process.env.DOCUMCP_LLM_API_KEY = 'test-key';
      const client = createLLMClient();
      expect(client).not.toBeNull();
      expect(client).toBeInstanceOf(DeepSeekClient);
    });

    test('should create client with config parameter', () => {
      const client = createLLMClient({
        provider: 'deepseek',
        apiKey: 'test-key',
        model: 'deepseek-chat',
      });
      expect(client).not.toBeNull();
      expect(client).toBeInstanceOf(DeepSeekClient);
    });

    test('should use default provider and model', () => {
      process.env.DOCUMCP_LLM_API_KEY = 'test-key';
      const client = createLLMClient();
      expect(client).not.toBeNull();
    });

    test('should support multiple providers', () => {
      const providers = ['deepseek', 'openai', 'anthropic', 'ollama'] as const;
      
      for (const provider of providers) {
        const client = createLLMClient({
          provider,
          apiKey: 'test-key',
          model: 'test-model',
        });
        expect(client).not.toBeNull();
      }
    });
  });

  describe('isLLMAvailable', () => {
    test('should return false when no API key is set', () => {
      expect(isLLMAvailable()).toBe(false);
    });

    test('should return true when DOCUMCP_LLM_API_KEY is set', () => {
      process.env.DOCUMCP_LLM_API_KEY = 'test-key';
      expect(isLLMAvailable()).toBe(true);
    });

    test('should return true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(isLLMAvailable()).toBe(true);
    });
  });

  describe('DeepSeekClient', () => {
    let client: DeepSeekClient;
    const config: LLMConfig = {
      provider: 'deepseek',
      apiKey: 'test-api-key',
      model: 'deepseek-chat',
      maxTokens: 1000,
      timeout: 5000,
    };

    beforeEach(() => {
      client = new DeepSeekClient(config);
    });

    describe('isAvailable', () => {
      test('should return true when API key is present', () => {
        expect(client.isAvailable()).toBe(true);
      });

      test('should return false when API key is missing', () => {
        const noKeyClient = new DeepSeekClient({ ...config, apiKey: undefined });
        expect(noKeyClient.isAvailable()).toBe(false);
      });
    });

    describe('complete', () => {
      test('should throw error when client is not available', async () => {
        const noKeyClient = new DeepSeekClient({ ...config, apiKey: undefined });
        await expect(noKeyClient.complete('test prompt')).rejects.toThrow(
          'LLM client is not available'
        );
      });

      test('should make successful API request', async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: 'Test response',
              },
            },
          ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const response = await client.complete('Test prompt');
        expect(response).toBe('Test response');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/chat/completions'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key',
            }),
          })
        );
      });

      test('should handle API errors', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal server error',
        });

        await expect(client.complete('Test prompt')).rejects.toThrow(
          'LLM API error: 500'
        );
      });

      test('should handle timeout', async () => {
        const shortTimeoutClient = new DeepSeekClient({ ...config, timeout: 100 });
        
        (global.fetch as jest.Mock).mockImplementationOnce(() => 
          new Promise((resolve) => setTimeout(resolve, 1000))
        );

        await expect(shortTimeoutClient.complete('Test prompt')).rejects.toThrow();
      });

      test('should handle network errors', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        await expect(client.complete('Test prompt')).rejects.toThrow('Network error');
      });
    });

    describe('analyzeCodeChange', () => {
      test('should analyze code changes successfully', async () => {
        const mockAnalysis: SemanticAnalysis = {
          hasBehavioralChange: true,
          breakingForExamples: false,
          changeDescription: 'Function parameter type changed',
          affectedDocSections: ['API Reference'],
          confidence: 0.9,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockAnalysis),
                },
              },
            ],
          }),
        });

        const codeBefore = 'function test(x: number) { return x * 2; }';
        const codeAfter = 'function test(x: string) { return x.repeat(2); }';

        const result = await client.analyzeCodeChange(codeBefore, codeAfter);

        expect(result.hasBehavioralChange).toBe(true);
        expect(result.breakingForExamples).toBe(false);
        expect(result.confidence).toBe(0.9);
        expect(result.affectedDocSections).toContain('API Reference');
      });

      test('should handle JSON in markdown code blocks', async () => {
        const mockAnalysis: SemanticAnalysis = {
          hasBehavioralChange: true,
          breakingForExamples: true,
          changeDescription: 'Breaking change',
          affectedDocSections: ['Examples'],
          confidence: 0.85,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '```json\n' + JSON.stringify(mockAnalysis) + '\n```',
                },
              },
            ],
          }),
        });

        const result = await client.analyzeCodeChange('code1', 'code2');
        expect(result.hasBehavioralChange).toBe(true);
        expect(result.confidence).toBe(0.85);
      });

      test('should return fallback result on parse error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: 'Invalid JSON response',
                },
              },
            ],
          }),
        });

        const result = await client.analyzeCodeChange('code1', 'code2');
        expect(result.confidence).toBe(0);
        expect(result.hasBehavioralChange).toBe(false);
        expect(result.changeDescription).toContain('Analysis failed');
      });

      test('should normalize confidence values', async () => {
        const mockAnalysis = {
          hasBehavioralChange: true,
          breakingForExamples: false,
          changeDescription: 'Test',
          affectedDocSections: [],
          confidence: 1.5, // Invalid: > 1
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockAnalysis),
                },
              },
            ],
          }),
        });

        const result = await client.analyzeCodeChange('code1', 'code2');
        expect(result.confidence).toBe(1); // Should be clamped to 1
      });
    });

    describe('simulateExecution', () => {
      test('should simulate execution successfully', async () => {
        const mockSimulation: SimulationResult = {
          success: true,
          expectedOutput: '42',
          actualOutput: '42',
          matches: true,
          differences: [],
          confidence: 0.95,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockSimulation),
                },
              },
            ],
          }),
        });

        const example = 'const result = multiply(6, 7);';
        const implementation = 'function multiply(a, b) { return a * b; }';

        const result = await client.simulateExecution(example, implementation);

        expect(result.success).toBe(true);
        expect(result.matches).toBe(true);
        expect(result.confidence).toBe(0.95);
        expect(result.differences).toHaveLength(0);
      });

      test('should detect mismatches', async () => {
        const mockSimulation: SimulationResult = {
          success: true,
          expectedOutput: '42',
          actualOutput: '43',
          matches: false,
          differences: ['Output mismatch: expected 42, got 43'],
          confidence: 0.8,
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockSimulation),
                },
              },
            ],
          }),
        });

        const result = await client.simulateExecution('example', 'impl');

        expect(result.matches).toBe(false);
        expect(result.differences.length).toBeGreaterThan(0);
      });

      test('should return fallback result on error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await client.simulateExecution('example', 'impl');

        expect(result.success).toBe(false);
        expect(result.matches).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.differences.length).toBeGreaterThan(0);
      });
    });

    describe('rate limiting', () => {
      test('should respect rate limits', async () => {
        const mockResponse = {
          choices: [{ message: { content: 'Response' } }],
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        // Make multiple requests quickly
        const promises = Array(5).fill(null).map(() => 
          client.complete('test')
        );

        const results = await Promise.all(promises);
        expect(results).toHaveLength(5);
        expect(global.fetch).toHaveBeenCalledTimes(5);
      });
    });
  });
});
