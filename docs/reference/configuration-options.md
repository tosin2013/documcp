# Configuration Reference

Complete guide to configuring documcp.

## Configuration File

Configuration can be provided via:
1. Environment variables
2. Configuration file (config.json)
3. Command-line arguments

## Configuration Options

### Server Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `server.port` | number | 3000 | Server port |
| `server.host` | string | 'localhost' | Server host |
| `server.timeout` | number | 30000 | Request timeout (ms) |

### Database Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database.host` | string | 'localhost' | Database host |
| `database.port` | number | 5432 | Database port |
| `database.name` | string | 'myapp' | Database name |
| `database.pool.min` | number | 2 | Minimum pool connections |
| `database.pool.max` | number | 10 | Maximum pool connections |

### Logging Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logging.level` | string | 'info' | Log level (debug, info, warn, error) |
| `logging.format` | string | 'json' | Log format (json, text) |
| `logging.destination` | string | 'stdout' | Log destination |

## Environment Variables

All configuration options can be set via environment variables:

```bash
# Server
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Logging
LOG_LEVEL=debug
```

## Configuration File Example

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```
