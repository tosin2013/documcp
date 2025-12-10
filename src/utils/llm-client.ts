/**
 * LLM Client for Semantic Code Analysis
 * 
 * Provides a unified interface for multiple LLM providers (DeepSeek, OpenAI, Anthropic, Ollama)
 * with rate limiting, error handling, and fallback mechanisms.
 */

export interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'anthropic' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  timeout?: number;
}

export interface SemanticAnalysis {
  hasBehavioralChange: boolean;
  breakingForExamples: boolean;
  changeDescription: string;
  affectedDocSections: string[];
  confidence: number;
}

export interface SimulationResult {
  success: boolean;
  expectedOutput: string;
  actualOutput: string;
  matches: boolean;
  differences: string[];
  confidence: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClient {
  complete(prompt: string): Promise<string>;
  analyzeCodeChange(before: string, after: string): Promise<SemanticAnalysis>;
  simulateExecution(example: string, implementation: string): Promise<SimulationResult>;
}

/**
 * Rate limiter for API requests
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

/**
 * DeepSeek LLM Client (OpenAI-compatible API)
 */
export class DeepSeekClient implements LLMClient {
  private config: LLMConfig;
  private rateLimiter: RateLimiter;
  private available: boolean = true;

  constructor(config: LLMConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.deepseek.com/v1',
      maxTokens: config.maxTokens || 4000,
      timeout: config.timeout || 30000,
      ...config,
    };
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  /**
   * Check if the LLM service is available
   */
  isAvailable(): boolean {
    return this.available && !!this.config.apiKey;
  }

  /**
   * Generic completion method
   */
  async complete(prompt: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('LLM client is not available. Check API key configuration.');
    }

    await this.rateLimiter.acquire();

    const requestBody = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.7,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM request timed out');
      }
      throw error;
    }
  }

  /**
   * Analyze semantic impact of code changes
   */
  async analyzeCodeChange(before: string, after: string): Promise<SemanticAnalysis> {
    const prompt = `You are a code analysis expert. Compare these two code versions and analyze the semantic differences.

**Before:**
\`\`\`
${before}
\`\`\`

**After:**
\`\`\`
${after}
\`\`\`

Analyze and respond in JSON format with the following structure:
{
  "hasBehavioralChange": boolean (true if behavior changed, not just syntax),
  "breakingForExamples": boolean (true if existing examples would break),
  "changeDescription": string (brief description of the change),
  "affectedDocSections": string[] (list of documentation sections that need updates),
  "confidence": number (0-1 score indicating analysis confidence)
}

Focus on:
1. Changes in function behavior (not just signature)
2. Changes in return values or side effects
3. Changes that would break existing usage examples
4. Changes that affect API contracts
5. Changes in error handling or edge cases`;

    try {
      const response = await this.complete(prompt);
      
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const analysis = JSON.parse(jsonStr) as SemanticAnalysis;
      
      // Validate and normalize the response
      return {
        hasBehavioralChange: Boolean(analysis.hasBehavioralChange),
        breakingForExamples: Boolean(analysis.breakingForExamples),
        changeDescription: analysis.changeDescription || 'Code change detected',
        affectedDocSections: Array.isArray(analysis.affectedDocSections) ? analysis.affectedDocSections : [],
        confidence: typeof analysis.confidence === 'number' ? Math.max(0, Math.min(1, analysis.confidence)) : 0.5,
      };
    } catch (error) {
      // Return low-confidence fallback result on error
      return {
        hasBehavioralChange: false,
        breakingForExamples: false,
        changeDescription: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        affectedDocSections: [],
        confidence: 0,
      };
    }
  }

  /**
   * Simulate execution of code to validate examples
   */
  async simulateExecution(example: string, implementation: string): Promise<SimulationResult> {
    const prompt = `You are a code execution simulator. Given a code example and its implementation, predict the execution result.

**Example Usage:**
\`\`\`
${example}
\`\`\`

**Implementation:**
\`\`\`
${implementation}
\`\`\`

Analyze the code flow without actually executing it. Respond in JSON format:
{
  "success": boolean (would the example execute successfully?),
  "expectedOutput": string (what the example expects),
  "actualOutput": string (what the implementation would produce),
  "matches": boolean (do they match?),
  "differences": string[] (list of differences if any),
  "confidence": number (0-1 score for prediction confidence)
}

Consider:
1. Function signatures and parameters
2. Return types and values
3. Error handling
4. Side effects
5. Dependencies and imports`;

    try {
      const response = await this.complete(prompt);
      
      // Extract JSON from response
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const result = JSON.parse(jsonStr) as SimulationResult;
      
      // Validate and normalize
      return {
        success: Boolean(result.success),
        expectedOutput: result.expectedOutput || '',
        actualOutput: result.actualOutput || '',
        matches: Boolean(result.matches),
        differences: Array.isArray(result.differences) ? result.differences : [],
        confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      };
    } catch (error) {
      // Return low-confidence failure result on error
      return {
        success: false,
        expectedOutput: 'Unable to determine',
        actualOutput: 'Unable to determine',
        matches: false,
        differences: [`Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        confidence: 0,
      };
    }
  }
}

/**
 * Factory function to create LLM client based on configuration
 */
export function createLLMClient(config?: Partial<LLMConfig>): LLMClient | null {
  // Check environment variables for configuration
  const provider = (config?.provider || process.env.DOCUMCP_LLM_PROVIDER || 'deepseek') as LLMConfig['provider'];
  const apiKey = config?.apiKey || process.env.DOCUMCP_LLM_API_KEY;
  const baseUrl = config?.baseUrl || process.env.DOCUMCP_LLM_BASE_URL;
  const model = config?.model || process.env.DOCUMCP_LLM_MODEL || 'deepseek-chat';

  // If no API key, return null to indicate LLM is unavailable
  if (!apiKey) {
    return null;
  }

  const fullConfig: LLMConfig = {
    provider,
    apiKey,
    baseUrl,
    model,
    maxTokens: config?.maxTokens,
    timeout: config?.timeout,
  };

  switch (provider) {
    case 'deepseek':
    case 'openai':
    case 'anthropic':
    case 'ollama':
      // For now, all use OpenAI-compatible API (DeepSeekClient)
      // Future: implement provider-specific clients
      return new DeepSeekClient(fullConfig);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Check if LLM is available based on environment configuration
 */
export function isLLMAvailable(): boolean {
  return !!(process.env.DOCUMCP_LLM_API_KEY || process.env.OPENAI_API_KEY);
}
