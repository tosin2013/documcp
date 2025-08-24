# API Reference

Complete reference for documcp APIs.

## Core APIs

### initialize(options)

Initialize the application with the given options.

**Parameters:**
- `options` (Object): Configuration options
  - `port` (number): Server port (default: 3000)
  - `host` (string): Server host (default: 'localhost')
  - `debug` (boolean): Enable debug mode (default: false)

**Returns:**
- `Application`: Application instance

**Example:**
```typescript
const app = initialize({
  port: 8080,
  debug: true
});
```

### start()

Start the application server.

**Returns:**
- `Promise<void>`: Resolves when server is running

**Example:**
```typescript
await app.start();
console.log('Server running');
```

### stop()

Stop the application server.

**Returns:**
- `Promise<void>`: Resolves when server is stopped

**Example:**
```typescript
await app.stop();
console.log('Server stopped');
```

## Events

### 'ready'

Emitted when the application is ready to accept connections.

```typescript
app.on('ready', () => {
  console.log('Application ready');
});
```

### 'error'

Emitted when an error occurs.

```typescript
app.on('error', (error) => {
  console.error('Application error:', error);
});
```

## Error Codes

| Code | Description |
|------|-------------|
| ERR_INVALID_CONFIG | Invalid configuration provided |
| ERR_PORT_IN_USE | Specified port is already in use |
| ERR_STARTUP_FAILED | Application failed to start |
