---
documcp:
  last_updated: "2025-11-20T00:46:21.971Z"
  last_validated: "2025-12-09T19:18:14.188Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 49831ed0b8915c53bc03eff44e7cb8b82dfac6a3
---

# DocuMCP Environment Setup Guide

This guide will help you set up DocuMCP in your own environment, from basic installation to advanced configuration for team collaboration.

## 🚀 Quick Setup

### Prerequisites Check

Before installing DocuMCP, ensure you have the required software:

```bash
# Check Node.js version (requires 20.0.0+)
node --version

# Check npm version (requires 8.0.0+)
npm --version

# Check Git version
git --version

# Check GitHub CLI (optional but recommended)
gh --version
```

### Installation Methods

#### Method 1: Global Installation (Recommended)

```bash
# Install DocuMCP globally
npm install -g documcp

# Verify installation
documcp --version
# Should output: DocuMCP v0.5.0
```

#### Method 2: Local Project Installation

```bash
# Navigate to your project directory
cd /path/to/your/project

# Install DocuMCP as a dev dependency
npm install documcp --save-dev

# Add to package.json scripts
npm pkg set scripts.docs="documcp"
npm pkg set scripts.docs:analyze="documcp analyze-repository --path ."
npm pkg set scripts.docs:deploy="documcp deploy-pages --repository $(git remote get-url origin | sed 's/.*github.com[:/]\([^.]*\).*/\1/')"
```

#### Method 3: Docker Installation

```bash
# Pull the official DocuMCP Docker image
docker pull documcp/documcp:latest

# Run DocuMCP in a container
docker run -it --rm -v $(pwd):/workspace documcp/documcp:latest
```

## 🔧 Basic Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# DocuMCP Configuration
export DOCUMCP_STORAGE_DIR="./.documcp"
export DOCUMCP_LOG_LEVEL="info"
export DOCUMCP_CACHE_ENABLED="true"

# GitHub Integration
export GITHUB_TOKEN="your_github_token_here"
export GITHUB_USERNAME="your_username"

# Optional: Custom configuration
export DOCUMCP_DEFAULT_SSG="docusaurus"
export DOCUMCP_DEFAULT_DEPTH="standard"
```

### Configuration File

Create a `documcp.config.json` file:

```json
{
  "storage": {
    "directory": "./.documcp",
    "enableCache": true,
    "maxCacheSize": "100MB"
  },
  "github": {
    "token": "${GITHUB_TOKEN}",
    "username": "${GITHUB_USERNAME}",
    "defaultBranch": "main"
  },
  "defaults": {
    "ssg": "docusaurus",
    "analysisDepth": "standard",
    "includeExamples": true,
    "targetAudience": "community_contributors"
  },
  "memory": {
    "enableLearning": true,
    "retentionDays": 90,
    "enableAnalytics": true
  }
}
```

## 🏗️ Project Structure Setup

### Recommended Project Structure

```
your-project/
├── .documcp/                 # DocuMCP storage and cache
│   ├── memory/              # Memory system data
│   ├── cache/               # Analysis cache
│   └── config/              # Local configuration
├── docs/                    # Generated documentation
│   ├── api/                 # API documentation
│   ├── tutorials/           # Tutorial content
│   ├── how-to/              # How-to guides
│   ├── reference/           # Reference documentation
│   └── explanation/         # Explanatory content
├── src/                     # Source code
├── README.md                # Project README
├── documcp.config.json      # DocuMCP configuration
├── .env                     # Environment variables
└── package.json             # Node.js dependencies
```

### Initialize DocuMCP in Your Project

```bash
# Initialize DocuMCP in your project
documcp init

# This creates:
# - .documcp/ directory
# - documcp.config.json
# - .env template
# - .gitignore entries
```

## 🔐 GitHub Integration Setup

### GitHub Token Setup

1. **Create a GitHub Personal Access Token:**

   Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

   Required permissions:

   - `repo` (Full control of private repositories)
   - `pages` (Write access to GitHub Pages)
   - `workflow` (Update GitHub Action workflows)
   - `read:org` (Read organization membership)

2. **Set the token in your environment:**

   ```bash
   # Add to your shell profile (.bashrc, .zshrc, etc.)
   export GITHUB_TOKEN="ghp_your_token_here"

   # Or add to .env file
   echo "GITHUB_TOKEN=ghp_your_token_here" >> .env
   ```

3. **Verify GitHub integration:**

   ```bash
   # Test GitHub connection
   documcp github test

   # Should output: ✅ GitHub connection successful
   ```

### GitHub Pages Setup

1. **Enable GitHub Pages in your repository:**

   Go to your repository → Settings → Pages

   - Source: GitHub Actions
   - Branch: main (or your preferred branch)

2. **Configure deployment:**

   ```bash
   # Configure GitHub Pages deployment
   documcp github configure-pages --repository "username/repository"
   ```

## 🧠 Memory System Setup

### Initialize Memory System

```bash
# Initialize memory system with custom storage
documcp memory init --storage-dir ./.documcp/memory

# Initialize with specific configuration
documcp memory init --storage-dir ./.documcp/memory --enable-learning --retention-days 90
```

### Memory System Configuration

Create a memory configuration file:

```json
{
  "storage": {
    "directory": "./.documcp/memory",
    "enableCompression": true,
    "maxSize": "500MB"
  },
  "learning": {
    "enabled": true,
    "retentionDays": 90,
    "enableAnalytics": true,
    "enablePatternRecognition": true
  },
  "userPreferences": {
    "enablePersonalization": true,
    "defaultUserId": "developer123"
  }
}
```

### Memory System Testing

```bash
# Test memory system
documcp memory test

# Check memory statistics
documcp memory stats

# Export memories for backup
documcp memory export --format json --output ./documcp-memories-backup.json
```

## 🔧 Advanced Configuration

### Custom SSG Configuration

```bash
# Configure custom SSG settings
documcp config set --key "ssg.docusaurus.theme" --value "classic"
documcp config set --key "ssg.hugo.baseURL" --value "https://docs.example.com"
documcp config set --key "ssg.mkdocs.theme" --value "material"
```

### User Preferences Setup

```bash
# Set user preferences
documcp preferences set --user-id "developer123" --priority performance --ecosystem javascript

# Set team preferences
documcp preferences set --user-id "team" --priority simplicity --ecosystem any

# Export preferences
documcp preferences export --user-id "developer123" --output ./preferences.json
```

### Cache Configuration

```bash
# Configure caching
documcp cache config --enable --max-size "200MB" --ttl "24h"

# Clear cache
documcp cache clear

# Cache statistics
documcp cache stats
```

## 🐳 Docker Setup

### Docker Compose Configuration

Create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  documcp:
    image: documcp/documcp:latest
    container_name: documcp
    volumes:
      - ./:/workspace
      - ./documcp-data:/app/.documcp
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - DOCUMCP_STORAGE_DIR=/app/.documcp
    working_dir: /workspace
    command: ["documcp", "serve", "--port", "3000", "--host", "0.0.0.0"]
    ports:
      - "3000:3000"
```

### Docker Usage

```bash
# Start DocuMCP with Docker Compose
docker-compose up -d

# Run specific commands
docker-compose exec documcp documcp analyze-repository --path .

# Stop services
docker-compose down
```

## 🔄 CI/CD Integration

### GitHub Actions Setup

Create `.github/workflows/docs.yml`:

```yaml
name: Documentation Deployment

on:
  push:
    branches: [main]
    paths: ["docs/**", "src/**", "README.md"]
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install DocuMCP
        run: npm install -g documcp

      - name: Analyze Repository
        run: |
          ANALYSIS_ID=$(documcp analyze-repository --path . --depth standard | jq -r '.data.id')
          echo "analysis_id=$ANALYSIS_ID" >> $GITHUB_OUTPUT
        id: analyze

      - name: Validate Documentation
        run: |
          documcp validate-content --docs-path ./docs

  deploy:
    needs: analyze
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install DocuMCP
        run: npm install -g documcp

      - name: Deploy Documentation
        run: |
          documcp deploy-pages --repository ${{ github.repository }} --ssg docusaurus
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitLab CI Setup

Create `.gitlab-ci.yml`:

```yaml
stages:
  - analyze
  - deploy

variables:
  NODE_VERSION: "20"

analyze:
  stage: analyze
  image: node:${NODE_VERSION}-alpine
  before_script:
    - npm install -g documcp
  script:
    - documcp analyze-repository --path . --depth standard
    - documcp validate-content --docs-path ./docs
  artifacts:
    reports:
      junit: documcp-results.xml
    paths:
      - .documcp/
    expire_in: 1 hour

deploy:
  stage: deploy
  image: node:${NODE_VERSION}-alpine
  before_script:
    - npm install -g documcp
  script:
    - documcp deploy-pages --repository $CI_PROJECT_PATH --ssg docusaurus
  only:
    - main
  environment:
    name: production
    url: https://$CI_PROJECT_NAMESPACE.gitlab.io/$CI_PROJECT_NAME
```

## 🔍 Development Setup

### Local Development

```bash
# Clone DocuMCP repository
git clone https://github.com/tosin2013/documcp.git
cd documcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### IDE Configuration

#### VS Code Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.mcp": "json"
  }
}
```

#### VS Code Extensions

Recommended extensions:

- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- REST Client (for testing API endpoints)

## 🧪 Testing Setup

### Unit Testing

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest

# Create jest.config.js
cat > jest.config.js << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
EOF

# Run tests
npm test
```

### Integration Testing

```bash
# Create test repository
mkdir test-repo
cd test-repo
git init
echo "# Test Repository" > README.md
git add README.md
git commit -m "Initial commit"

# Test DocuMCP with test repository
cd ..
documcp analyze-repository --path ./test-repo --depth quick
```

### Performance Testing

```bash
# Run performance benchmarks
documcp benchmark run --repository ./test-repo --iterations 10

# Check performance metrics
documcp benchmark current
```

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Permission Denied

**Problem:** `Permission denied: Cannot read directory`

**Solution:**

```bash
# Check permissions
ls -la /path/to/repository

# Fix permissions
chmod -R 755 /path/to/repository

# Or run with sudo (not recommended for production)
sudo documcp analyze-repository --path /path/to/repository
```

#### Issue 2: GitHub Token Invalid

**Problem:** `GitHub authentication failed`

**Solution:**

```bash
# Check token validity
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Regenerate token with correct permissions
# Go to GitHub → Settings → Developer settings → Personal access tokens

# Update environment variable
export GITHUB_TOKEN="new_token_here"
```

#### Issue 3: Memory System Errors

**Problem:** `Memory system initialization failed`

**Solution:**

```bash
# Clear memory storage
rm -rf ./.documcp/memory

# Reinitialize memory system
documcp memory init --storage-dir ./.documcp/memory

# Check memory system status
documcp memory status
```

#### Issue 4: Build Failures

**Problem:** `Documentation build failed`

**Solution:**

```bash
# Check for syntax errors
documcp validate-content --docs-path ./docs

# Test local build
documcp test-local --docs-path ./docs --ssg docusaurus

# Check SSG configuration
cat ./docs/docusaurus.config.js
```

### Debug Mode

```bash
# Enable debug logging
export DOCUMCP_LOG_LEVEL="debug"

# Run with verbose output
documcp analyze-repository --path . --depth standard --verbose

# Check logs
tail -f ./.documcp/logs/documcp.log
```

### Health Check

```bash
# Run comprehensive health check
documcp health-check

# Should output:
# ✅ Node.js version: v20.0.0
# ✅ npm version: 8.0.0
# ✅ Git version: 2.30.0
# ✅ GitHub token: valid
# ✅ Memory system: healthy
# ✅ Cache system: healthy
```

## 📚 Next Steps

After completing the environment setup:

1. **Read the [User Onboarding Guide](./user-onboarding.md)** for usage patterns
2. **Explore [Usage Examples](../how-to/usage-examples.md)** for practical examples
3. **Check the [API Reference](../api/)** for complete function documentation
4. **Join the [GitHub Issues](https://github.com/tosin2013/documcp/issues)** for community support and feature requests

## 🆘 Getting Help

- **Documentation**: Check the comprehensive documentation
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Community**: Join the DocuMCP community for support

Your DocuMCP environment is now ready! 🎉
