# Command Line Interface

Reference for documcp CLI commands.

## Global Options

| Option | Description |
|--------|-------------|
| `--help, -h` | Show help information |
| `--version, -v` | Show version number |
| `--verbose` | Enable verbose output |
| `--quiet` | Suppress non-error output |

## Commands

### start

Start the application.

```bash
documcp start [options]
```

**Options:**
- `--port, -p <port>`: Server port (default: 3000)
- `--host, -h <host>`: Server host (default: localhost)
- `--config, -c <file>`: Configuration file path

### build

Build the application for production.

```bash
documcp build [options]
```

**Options:**
- `--output, -o <dir>`: Output directory (default: dist)
- `--minify`: Minify output
- `--sourcemap`: Generate source maps

### test

Run tests.

```bash
documcp test [options]
```

**Options:**
- `--watch, -w`: Run in watch mode
- `--coverage`: Generate coverage report
- `--bail`: Stop on first test failure

### lint

Run linting checks.

```bash
documcp lint [options]
```

**Options:**
- `--fix`: Automatically fix issues
- `--format <format>`: Output format (stylish, json, compact)

## Examples

### Starting with custom configuration
```bash
documcp start --config production.json --port 8080
```

### Running tests with coverage
```bash
documcp test --coverage --watch
```

### Building for production
```bash
documcp build --minify --output ./production
```
