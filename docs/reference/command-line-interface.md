# MCP Protocol Reference

Technical reference for the Model Context Protocol implementation in documcp.

## Overview

documcp implements the MCP (Model Context Protocol) specification for seamless integration with AI clients. This reference covers protocol messages, handshakes, and error handling.

## Protocol Basics

### Transport Layer

documcp uses **stdio transport** for MCP communication:

```json
{
  "transport": "stdio",
  "command": "node",
  "args": ["/path/to/documcp/dist/index.js"]
}
```

### Message Format

All MCP messages follow JSON-RPC 2.0 specification:

```typescript
interface MCPMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: object;
}
```

## Initialization Handshake

### 1. Initialize Request

Client sends initialization request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {}
    },
    "clientInfo": {
      "name": "Claude Desktop",
      "version": "0.7.0"
    }
  }
}
```

### 2. Initialize Response

documcp responds with server capabilities:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "logging": {}
    },
    "serverInfo": {
      "name": "documcp",
      "version": "1.0.0"
    }
  }
}
```

### 3. Initialized Notification

Client confirms initialization:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

## Core Protocol Methods

### tools/list

Lists available MCP tools:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "analyze_repository",
        "description": "Analyze repository structure and documentation needs",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "Repository path to analyze"
            },
            "depth": {
              "type": "string",
              "enum": ["quick", "standard", "deep"],
              "description": "Analysis depth"
            }
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

### tools/call

Executes a specific tool:

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "analyze_repository",
    "arguments": {
      "path": "./my-project",
      "depth": "standard"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Repository analysis results..."
      }
    ]
  }
}
```

## Tool Schema Validation

### Zod Schema Integration

documcp uses Zod for runtime validation:

```typescript
import { z } from 'zod';

const AnalyzeRepositorySchema = z.object({
  path: z.string().min(1).describe('Repository path to analyze'),
  depth: z.enum(['quick', 'standard', 'deep']).optional().default('standard')
});

export type AnalyzeRepositoryArgs = z.infer<typeof AnalyzeRepositorySchema>;
```

### Schema to JSON Schema Conversion

Zod schemas are converted to JSON Schema for MCP:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(AnalyzeRepositorySchema, {
  name: 'AnalyzeRepositorySchema',
  description: 'Parameters for repository analysis'
});
```

## Error Handling

### Standard Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Validation failed for parameter 'path'"
    }
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC request |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Server internal error |
| -32000 | Server error | Tool execution error |

### Tool-Specific Errors

Tools return errors in content format:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: Repository path does not exist"
      }
    ],
    "isError": true
  }
}
```

## Logging and Debugging

### Enable Protocol Logging

```bash
DEBUG=mcp:protocol npm run dev
```

### Message Tracing

Log all MCP messages:

```bash
DEBUG=mcp:* npm run dev
```

### Tool Execution Logging

```bash
DEBUG=documcp:tools npm run dev
```

## Advanced Protocol Features

### Notifications

documcp supports logging notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "info",
    "logger": "documcp",
    "data": "Repository analysis completed"
  }
}
```

### Progress Updates

For long-running operations:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "analysis-123",
    "progress": {
      "kind": "report",
      "message": "Analyzing dependencies...",
      "percentage": 45
    }
  }
}
```

## Client Integration Examples

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "documcp": {
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### VS Code MCP Extension

```json
{
  "mcp.servers": {
    "documcp": {
      "transport": "stdio",
      "command": "node",
      "args": ["/path/to/documcp/dist/index.js"]
    }
  }
}
```

## Protocol Testing

### Manual Testing

Test protocol handshake:

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' | node dist/index.js
```

### Tool Testing

Test specific tool:

```bash
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "analyze_repository",
    "arguments": {"path": "./test-repo"}
  }
}' | node dist/index.js
```

## Performance Considerations

### Message Size Limits

- Maximum message size: 10MB
- Large responses are chunked automatically
- Binary data should be base64 encoded

### Connection Management

- Single stdio connection per client
- Stateless tool execution
- Connection pooling not applicable

### Timeout Handling

- Default tool timeout: 30 seconds
- Configurable via environment variables
- Graceful timeout with partial results

## Security Considerations

### Input Validation

- All parameters validated with Zod schemas
- Path traversal protection
- File system access restrictions

### Sandboxing

- Tools run in isolated context
- Limited file system access
- No network access by default

### Authentication

- No authentication required for stdio transport
- Client identity via initialization handshake
- Optional API key support for future versions
