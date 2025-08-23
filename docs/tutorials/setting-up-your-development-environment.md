# Setting Up Your Development Environment

This guide will help you configure a complete Node.js and TypeScript development environment.

## Installing Node.js

### Using Node Version Manager (nvm)

1. Install nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. Install and use the correct Node.js version:
   ```bash
   nvm install 18
   nvm use 18
   ```

## TypeScript Setup

1. Install TypeScript globally:
   ```bash
   npm install -g typescript
   ```

2. Initialize TypeScript configuration:
   ```bash
   npx tsc --init
   ```

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens

### Debugging Configuration

Create a `.vscode/launch.json` file:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```
