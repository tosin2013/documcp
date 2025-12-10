---
id: llm-integration
title: LLM Integration for Semantic Code Analysis
sidebar_label: LLM Integration
sidebar_position: 10
---

# LLM Integration for Semantic Code Analysis

DocuMCP now includes an optional LLM integration layer that enables semantic analysis of code changes beyond AST-based syntax comparison. This feature supports the DocuMCP Orchestrator's requirements for intelligent documentation synchronization.

## Overview

The LLM integration provides:

- **Semantic code change analysis**: Detect behavioral changes within the same function signature
- **Code execution simulation**: Validate documentation examples without running code
- **Intelligent documentation suggestions**: Generate context-aware update recommendations
- **Multi-provider support**: DeepSeek, OpenAI, Anthropic, and Ollama
- **Graceful fallback**: Automatic fallback to AST-only analysis when LLM is unavailable

## Configuration

### Environment Variables

Configure the LLM integration using environment variables:

```bash
# Required: API key for your chosen provider
export DOCUMCP_LLM_API_KEY="your-api-key-here"

# Optional: Provider selection (default: deepseek)
export DOCUMCP_LLM_PROVIDER="deepseek"  # or "openai", "anthropic", "ollama"

# Optional: Model name (default: deepseek-chat)
export DOCUMCP_LLM_MODEL="deepseek-chat"

# Optional: Custom base URL (for self-hosted or alternative endpoints)
export DOCUMCP_LLM_BASE_URL="https://api.deepseek.com/v1"
```

### Supported Providers

#### DeepSeek (Default)
```bash
export DOCUMCP_LLM_PROVIDER="deepseek"
export DOCUMCP_LLM_API_KEY="sk-..."
export DOCUMCP_LLM_MODEL="deepseek-chat"
```

#### OpenAI
```bash
export DOCUMCP_LLM_PROVIDER="openai"
export DOCUMCP_LLM_API_KEY="sk-..."
export DOCUMCP_LLM_MODEL="gpt-4"
```

#### Anthropic
```bash
export DOCUMCP_LLM_PROVIDER="anthropic"
export DOCUMCP_LLM_API_KEY="sk-ant-..."
export DOCUMCP_LLM_MODEL="claude-3-opus-20240229"
```

#### Ollama (Local)
```bash
export DOCUMCP_LLM_PROVIDER="ollama"
export DOCUMCP_LLM_BASE_URL="http://localhost:11434/v1"
export DOCUMCP_LLM_MODEL="codellama"
# No API key needed for local Ollama
```

## Usage

### Semantic Code Analysis

```typescript
import { SemanticAnalyzer } from './utils/semantic-analyzer.js';

// Create analyzer with default configuration
const analyzer = new SemanticAnalyzer();
await analyzer.initialize();

// Analyze semantic impact of code changes
const codeBefore = `
function multiply(a: number, b: number): number {
  return a * b;
}
`;

const codeAfter = `
function multiply(a: number, b: number): number {
  return a + b;  // Bug: changed to addition!
}
`;

const analysis = await analyzer.analyzeSemanticImpact(
  codeBefore,
  codeAfter,
  'multiply'
);

console.log('Analysis mode:', analysis.analysisMode);  // 'llm', 'ast', or 'hybrid'
console.log('Behavioral change:', analysis.hasBehavioralChange);  // true
console.log('Breaking for examples:', analysis.breakingForExamples);  // true
console.log('Description:', analysis.changeDescription);
console.log('Confidence:', analysis.confidence);
console.log('Affected sections:', analysis.affectedDocSections);
```

### Validating Documentation Examples

```typescript
// Validate that documentation examples work with current implementation
const examples = [
  'const result = multiply(6, 7);  // Should return 42',
  'const doubled = multiply(21, 2);  // Should return 42',
];

const implementation = `
function multiply(a: number, b: number): number {
  return a * b;
}
`;

const validation = await analyzer.validateExamples(examples, implementation);

console.log('Valid:', validation.isValid);
console.log('Confidence:', validation.overallConfidence);
console.log('Manual review needed:', validation.requiresManualReview);

// Check individual examples
validation.examples.forEach((ex, i) => {
  console.log(`Example ${i + 1}:`);
  console.log('  Valid:', ex.isValid);
  console.log('  Issues:', ex.issues);
});
```

### Batch Analysis

```typescript
const changes = [
  {
    before: 'function add(x: number, y: number) { return x + y; }',
    after: 'function add(x: number, y: number) { return x - y; }',
    name: 'add',
  },
  {
    before: 'function greet(name: string) { return `Hello ${name}`; }',
    after: 'function greet(name: string) { return `Hi ${name}!`; }',
    name: 'greet',
  },
];

const results = await analyzer.analyzeBatch(changes);
results.forEach((result, i) => {
  console.log(`Change ${i + 1}:`, result.changeDescription);
});
```

### Custom Configuration

```typescript
import { SemanticAnalyzer, createSemanticAnalyzer } from './utils/semantic-analyzer.js';

// Disable LLM (AST-only mode)
const astOnlyAnalyzer = createSemanticAnalyzer({
  useLLM: false,
});

// Custom confidence threshold for hybrid mode
const strictAnalyzer = createSemanticAnalyzer({
  confidenceThreshold: 0.9,  // Higher threshold = more likely to use hybrid mode
});

// Custom LLM configuration
const customAnalyzer = createSemanticAnalyzer({
  llmConfig: {
    provider: 'openai',
    apiKey: 'custom-key',
    model: 'gpt-4',
  },
});
```

## Analysis Modes

The semantic analyzer operates in three modes:

### LLM Mode
- **When**: LLM is available and confidence is above threshold (default: 0.7)
- **Advantages**: Deep semantic understanding, detects behavioral changes
- **Use case**: Critical code changes affecting public APIs

### AST Mode
- **When**: LLM is unavailable or disabled
- **Advantages**: Fast, reliable, no external dependencies
- **Use case**: Quick syntax checks, CI/CD environments without LLM access

### Hybrid Mode
- **When**: LLM confidence is below threshold
- **Advantages**: Combines LLM insights with AST verification
- **Use case**: Complex changes requiring both semantic and structural analysis

## Rate Limiting

The LLM client includes built-in rate limiting to prevent API quota exhaustion:

- Default: 10 requests per minute
- Automatic backoff when limit is reached
- Configurable per-instance

## Error Handling

The integration is designed to fail gracefully:

```typescript
// If LLM fails, analyzer falls back to AST mode
const analyzer = new SemanticAnalyzer();
const result = await analyzer.analyzeSemanticImpact(before, after);

// Check which mode was used
if (result.analysisMode === 'ast' && !result.llmAvailable) {
  console.warn('LLM unavailable, using AST analysis only');
}

// Low confidence analysis
if (result.confidence < 0.5) {
  console.warn('Low confidence analysis - manual review recommended');
}
```

## Best Practices

### 1. Set Appropriate Thresholds
```typescript
// For critical code paths
const criticalAnalyzer = createSemanticAnalyzer({
  confidenceThreshold: 0.9,  // High threshold
});

// For routine changes
const routineAnalyzer = createSemanticAnalyzer({
  confidenceThreshold: 0.6,  // Lower threshold
});
```

### 2. Check Availability Before Relying on LLM
```typescript
if (!analyzer.isLLMAvailable()) {
  console.warn('LLM not configured - using AST analysis only');
}
```

### 3. Handle Low Confidence Results
```typescript
const result = await analyzer.analyzeSemanticImpact(before, after);

if (result.confidence < 0.7) {
  // Trigger manual review workflow
  console.log('Manual review required for:', result.changeDescription);
}
```

### 4. Use Batch Analysis for Multiple Changes
```typescript
// More efficient than individual calls
const results = await analyzer.analyzeBatch(changes);
```

### 5. Validate Examples Before Publishing
```typescript
const validation = await analyzer.validateExamples(examples, implementation);

if (!validation.isValid) {
  console.error('Some examples may be invalid:');
  validation.suggestions.forEach(s => console.error('  -', s));
  
  // Don't publish until examples are fixed
  throw new Error('Invalid documentation examples detected');
}
```

## Integration with DocuMCP Orchestrator

This LLM integration layer is designed to support the [DocuMCP Orchestrator](https://github.com/tosin2013/documcp-orchestrator) requirements:

- **ADR-009**: Content Accuracy Validation Framework
- **ADR-010**: LLM-Validated Documentation Examples

The orchestrator uses these capabilities to:
1. Detect when code changes require documentation updates
2. Validate that documentation examples match code behavior
3. Generate intelligent update suggestions
4. Maintain documentation accuracy over time

## Troubleshooting

### LLM Not Available

**Symptom**: `analyzer.isLLMAvailable()` returns `false`

**Solutions**:
- Check that `DOCUMCP_LLM_API_KEY` is set
- Verify API key is valid
- For Ollama: ensure server is running at specified base URL

### Low Confidence Results

**Symptom**: `result.confidence < 0.7`

**Solutions**:
- Review the change manually
- Use hybrid mode by setting lower threshold
- Check if code change is particularly complex

### Rate Limit Errors

**Symptom**: Requests timing out or failing

**Solutions**:
- Reduce number of concurrent requests
- Increase rate limit window
- Use batch analysis for multiple changes

### Timeout Errors

**Symptom**: "LLM request timed out"

**Solutions**:
- Increase timeout in configuration
- Check network connectivity to LLM provider
- Consider using a faster model

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **Code Privacy**: Be aware that code is sent to external LLM providers
3. **Rate Limits**: Monitor API usage to avoid unexpected costs
4. **Fallback**: System works without LLM for sensitive environments

## Performance

- **LLM Analysis**: ~2-5 seconds per code change
- **AST Analysis**: ~50-100ms per code change
- **Hybrid Analysis**: ~2-5 seconds (LLM) + ~100ms (AST)
- **Rate Limit**: 10 requests/minute (default)

## Future Enhancements

Planned improvements:

- Caching of LLM responses for identical code changes
- Support for additional LLM providers
- Fine-tuned models for specific languages
- Streaming responses for large code bases
- Confidence calibration based on historical accuracy

## Related Documentation

- [AST-based Code Analysis](../reference/ast-analyzer.md)
- [Drift Detection](../reference/drift-detector.md)
- [DocuMCP Orchestrator](https://github.com/tosin2013/documcp-orchestrator)
- [ADR-009: Content Accuracy Validation](../adrs/009-content-accuracy-validation-framework.md)
