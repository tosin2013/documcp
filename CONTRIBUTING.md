# Contributing to DocuMCP

Thank you for your interest in contributing to DocuMCP! This guide will help you get started with contributing to the project.

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/documcp.git
   cd documcp
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up git hooks:
   ```bash
   npm run prepare
   ```

## 📝 Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. All commit messages must follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **test**: Adding or modifying tests
- **chore**: Maintenance tasks, dependency updates
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes
- **build**: Build system changes
- **revert**: Reverting previous commits

### Examples

```bash
# Good commit messages
feat: add SSG recommendation scoring algorithm
fix: resolve memory leak in repository analysis
docs: update installation instructions
test: add integration tests for deployment workflow
chore: update dependencies to latest versions

# Bad commit messages (will be rejected)
Fix bug
Update docs
WIP
asdf
```

### Commit Message Rules

- Use lowercase for type
- No period at the end of the subject line
- Subject line should be 50 characters or less
- Use imperative mood ("add" not "added" or "adds")
- Body should explain "what" and "why", not "how"

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance

# Run CI validation (recommended before submitting PR)
npm run ci
```

### Test Coverage Requirements

- Minimum 85% statement coverage (currently at 93.42%)
- All new features must include tests
- Bug fixes should include regression tests

## 🔍 Code Quality

### Linting and Formatting

```bash
# Check code style
npm run lint

# Auto-fix code style issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run typecheck
```

### Pre-commit Hooks

The repository uses Husky to run pre-commit hooks that will:
- Validate commit messages
- Run linting
- Check formatting
- Run basic tests

## 📋 Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Write tests** for your changes

4. **Update documentation** if needed

5. **Commit your changes** using conventional commit format:
   ```bash
   git commit -m "feat: add new MCP tool for content validation"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

### PR Requirements

- [ ] All tests pass
- [ ] Code coverage maintains 85%+
- [ ] Linting passes
- [ ] Commit messages follow conventional format
- [ ] Documentation updated (if applicable)
- [ ] Changes are backwards compatible (or breaking changes documented)

## 🏗️ Development Workflow

### Project Structure

```
documcp/
├── src/
│   ├── tools/          # MCP tool implementations
│   ├── types/          # TypeScript type definitions
│   ├── prompts/        # MCP prompt implementations
│   └── index.ts        # Main MCP server
├── tests/              # Test suites
├── docs/               # Documentation
└── dist/               # Compiled output
```

### Adding New Features

1. **Create MCP tool** in `src/tools/`
2. **Add TypeScript types** in `src/types/`
3. **Register tool** in `src/index.ts`
4. **Write comprehensive tests**
5. **Update documentation**

### Debugging

```bash
# Run in development mode with watch
npm run dev

# Debug with Node.js inspector
node --inspect dist/index.js

# Verbose logging
DEBUG=* npm start
```

## 📚 Documentation

### Updating Documentation

- Update relevant markdown files in `docs/`
- Follow the [Diataxis framework](https://diataxis.fr/)
- Check links with `npm run docs:check-links`
- Validate structure with `npm run docs:validate`

### Architecture Decision Records (ADRs)

Significant architectural changes should be documented as ADRs in `docs/adrs/`.

## 🔒 Security

### Security Guidelines

- Never commit secrets or credentials
- Use secure defaults in all configurations
- Follow OWASP security practices
- Run security audits: `npm run security:check`

### Reporting Security Issues

Please report security vulnerabilities to [security email] rather than creating public issues.

## 🤝 Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. Please read and follow it.

## 📞 Getting Help

- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the `docs/` directory

## 🏷️ Release Process

Releases are automated using conventional commits:

1. Commits determine version bump (feat = minor, fix = patch, BREAKING CHANGE = major)
2. Changelog is automatically generated
3. GitHub release is created
4. npm package is published

## 📄 License

By contributing to DocuMCP, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DocuMCP! 🎉