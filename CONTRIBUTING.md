# Contributing to DocuMCP

Thank you for your interest in contributing to DocuMCP! This guide helps you find the right path based on what you want to contribute.

## 🎯 Choose Your Contribution Path

Pick the path that matches what you want to do:

### 🐛 [I want to fix a bug](#-fixing-bugs)

Found something broken? Help us fix it! Perfect for first-time contributors.

**Quick start**: Browse [bug issues](https://github.com/tosin2013/documcp/labels/bug) or [good first issues](https://github.com/tosin2013/documcp/labels/good%20first%20issue)

### 🔧 [I want to add an SSG adapter](#-adding-an-ssg-adapter)

Expand DocuMCP's SSG support by adding adapters for new static site generators.

**Quick start**: See [SSG adapter guide](docs/how-to/contributing-an-ssg-adapter.md) | Browse [ssg-adapter issues](https://github.com/tosin2013/documcp/labels/area%2Fssg-adapter)

### 🛠️ [I want to add a new MCP tool](#%EF%B8%8F-adding-a-new-mcp-tool)

Create new MCP tools to extend DocuMCP's capabilities.

**Quick start**: Browse [enhancement issues](https://github.com/tosin2013/documcp/labels/enhancement) | See [how to create custom MCP tools](docs/how-to/how-to-add-a-new-feature.md)

### 📚 [I want to write documentation](#-writing-documentation)

Improve our docs following the Diataxis framework.

**Quick start**: Browse [documentation issues](https://github.com/tosin2013/documcp/labels/documentation) | See [Diataxis framework](https://diataxis.fr/)

### 🧪 [I want to add tests](#-adding-tests)

Improve test coverage and quality.

**Quick start**: Browse [testing issues](https://github.com/tosin2013/documcp/labels/testing)

### 🚀 [I want to improve CI/CD](#-improving-cicd)

Enhance our release pipeline and automation.

**Quick start**: Browse [ci/cd issues](https://github.com/tosin2013/documcp/labels/ci%2Fcd)

---

## 🐛 Fixing Bugs

### Finding Bugs to Fix

1. **Browse open bugs**: [Bug label](https://github.com/tosin2013/documcp/labels/bug)
2. **Start with easy ones**: [Good first issues](https://github.com/tosin2013/documcp/labels/good%20first%20issue)
3. **Check help wanted**: [Help wanted label](https://github.com/tosin2013/documcp/labels/help%20wanted)

### Example Bug Fix PR

See [PR #143](https://github.com/tosin2013/documcp/pull/143) - Skip commitlint validation for Copilot bootstrap commits

### Bug Fix Workflow

1. **Reproduce the bug** locally
2. **Write a failing test** that demonstrates the bug
3. **Fix the bug** with minimal changes
4. **Verify the test passes**
5. **Submit PR** with conventional commit: `fix(scope): description`

### Bug Fix Checklist

- [ ] Bug reproduced locally
- [ ] Regression test added
- [ ] Fix verified with test
- [ ] No breaking changes introduced
- [ ] Commit message: `fix(scope): brief description`

---

## 🔧 Adding an SSG Adapter

SSG adapters allow DocuMCP to support different static site generators. See the dedicated guide:

**📖 [How to Contribute an SSG Adapter](docs/how-to/contributing-an-ssg-adapter.md)**

### Current SSG Adapters

- Docusaurus
- MkDocs
- Jekyll
- Hugo
- Sphinx

### Wanted SSG Adapters

- [Astro](https://github.com/tosin2013/documcp/issues/122)
- [VitePress](https://github.com/tosin2013/documcp/issues/123)
- [Nextra](https://github.com/tosin2013/documcp/labels/area%2Fssg-adapter)

### Example SSG Adapter PR

See existing adapters in `src/tools/recommend-ssg.ts` for reference implementations.

---

## 🛠️ Adding a New MCP Tool

MCP tools are the core of DocuMCP's functionality. Each tool provides a specific capability to AI clients.

### Finding Tool Ideas

1. **Browse enhancement issues**: [Enhancement label](https://github.com/tosin2013/documcp/labels/enhancement)
2. **Check the roadmap**: [Milestones](https://github.com/tosin2013/documcp/milestones)
3. **Propose your own**: Create a new issue with your idea

### Example Tool PR

See [PR #147](https://github.com/tosin2013/documcp/pull/147) - Implement community insights aggregation

### Tool Development Workflow

1. **Create tool file**: `src/tools/your-tool-name.ts`
2. **Define Zod schema**: Input validation with TypeScript types
3. **Implement logic**: Core functionality
4. **Register tool**: Add to `src/index.ts`
5. **Write tests**: Comprehensive test coverage in `tests/tools/`
6. **Update docs**: Add to `docs/reference/api-reference.md`

### Tool Development Checklist

- [ ] Tool file created in `src/tools/`
- [ ] Zod schema defined with proper validation
- [ ] TypeScript types exported
- [ ] Tool registered in `src/index.ts`
- [ ] Comprehensive tests (>85% coverage)
- [ ] Documentation updated
- [ ] Commit message: `feat(tools): add your-tool-name`

### Tool Template

```typescript
import { z } from "zod";

// Input schema
export const YourToolInputSchema = z.object({
  param1: z.string().describe("Description of param1"),
  param2: z.number().optional().describe("Optional param2"),
});

export type YourToolInput = z.infer<typeof YourToolInputSchema>;

// Tool implementation
export async function yourToolName(input: YourToolInput) {
  // Validate input
  const validated = YourToolInputSchema.parse(input);

  // Implement logic
  const result = {
    success: true,
    data: {
      // Your result data
    },
  };

  return result;
}
```

---

## 📚 Writing Documentation

DocuMCP follows the [Diataxis framework](https://diataxis.fr/) for documentation organization.

### Documentation Structure

```
docs/
├── tutorials/      # Learning-oriented (getting started)
├── how-to/         # Problem-oriented (specific tasks)
├── reference/      # Information-oriented (technical specs)
└── explanation/    # Understanding-oriented (concepts)
```

### Finding Documentation Tasks

1. **Browse docs issues**: [Documentation label](https://github.com/tosin2013/documcp/labels/documentation)
2. **Check quality issues**: [Quality label](https://github.com/tosin2013/documcp/labels/quality)
3. **Good first issues**: [Good first issue + docs](https://github.com/tosin2013/documcp/labels/good%20first%20issue)

### Documentation Workflow

1. **Choose the right category**: Tutorial, How-to, Reference, or Explanation
2. **Write clear content**: Follow Diataxis principles
3. **Add code examples**: Test all code snippets
4. **Check links**: Run `npm run docs:check-links`
5. **Validate**: Run `npm run docs:validate`

### Documentation Checklist

- [ ] Content in correct Diataxis category
- [ ] Code examples tested and working
- [ ] Links validated
- [ ] Proper markdown formatting
- [ ] Commit message: `docs(category): description`

---

## 🧪 Adding Tests

We maintain 85%+ test coverage. Help us keep it high!

### Test Types

- **Unit tests**: Test individual functions (`tests/tools/`, `tests/utils/`)
- **Integration tests**: Test tool workflows (`tests/integration/`)
- **Performance tests**: Benchmark critical paths (`tests/benchmarks/`)

### Finding Testing Tasks

1. **Browse testing issues**: [Testing label](https://github.com/tosin2013/documcp/labels/testing)
2. **Check coverage gaps**: Run `npm run test:coverage`
3. **Add missing tests**: Look for uncovered code paths

### Example Test PR

See [PR #145](https://github.com/tosin2013/documcp/pull/145) - Add watcher persistence and integration tests

### Testing Workflow

1. **Identify untested code**: Check coverage report
2. **Write comprehensive tests**: Cover happy path and edge cases
3. **Run tests**: `npm test`
4. **Check coverage**: `npm run test:coverage`
5. **Ensure 85%+ coverage**: Required for PR approval

### Testing Checklist

- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] All tests passing
- [ ] Coverage maintains 85%+
- [ ] Commit message: `test(scope): description`

---

## 🚀 Improving CI/CD

Help us automate and improve our development workflow.

### Finding CI/CD Tasks

1. **Browse ci/cd issues**: [CI/CD label](https://github.com/tosin2013/documcp/labels/ci%2Fcd)
2. **Check workflow files**: `.github/workflows/`
3. **Propose improvements**: Create an issue

### Example CI/CD PR

See [PR #143](https://github.com/tosin2013/documcp/pull/143) - Skip commitlint validation for Copilot commits

### CI/CD Workflow

1. **Identify improvement**: Workflow optimization, new check, automation
2. **Test locally**: Use `act` or similar tools
3. **Update workflow**: Modify `.github/workflows/`
4. **Test in PR**: Verify workflow runs correctly
5. **Document changes**: Update relevant docs

### CI/CD Checklist

- [ ] Workflow tested locally (if possible)
- [ ] Changes don't break existing workflows
- [ ] Documentation updated
- [ ] Commit message: `ci(workflow): description`

---

## 🚀 Getting Started (All Paths)

### Prerequisites

- Node.js 20.x or higher
- npm (comes with Node.js)
- Git

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/documcp.git
   cd documcp
   ```

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Set up git hooks**:
   ```bash
   npm run prepare
   ```

### Development Commands

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck

# Full CI validation
npm run ci

# Development mode with watch
npm run dev
```

---

## 📝 Commit Message Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **test**: Adding or modifying tests
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **ci**: CI/CD configuration changes
- **chore**: Maintenance tasks

### Examples

```bash
# Good
feat(tools): add content validation tool
fix(ssg): resolve MkDocs detection issue
docs(tutorial): add SSG adapter guide
test(integration): add deployment workflow tests

# Bad (will be rejected)
Fix bug
Update docs
WIP
```

### Rules

- Use lowercase for type
- No period at end of subject
- Subject ≤ 50 characters
- Use imperative mood ("add" not "added")
- Body explains "what" and "why", not "how"

---

## 📋 Pull Request Process

1. **Create feature branch**:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make changes** following the relevant path guide above

3. **Write tests** for your changes

4. **Update documentation** if needed

5. **Run validation**:

   ```bash
   npm run ci
   ```

6. **Commit with conventional format**:

   ```bash
   git commit -m "feat(scope): description"
   ```

7. **Push to your fork**:

   ```bash
   git push origin feat/your-feature-name
   ```

8. **Create Pull Request** on GitHub

### PR Requirements

- [ ] All tests pass (`npm test`)
- [ ] Coverage maintains 85%+ (`npm run test:coverage`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Commit messages follow conventional format
- [ ] Documentation updated (if applicable)
- [ ] Breaking changes documented (if applicable)

---

## 🏷️ Issue Labels Reference

Use these labels to find relevant issues:

- [`good first issue`](https://github.com/tosin2013/documcp/labels/good%20first%20issue) - Great for newcomers
- [`help wanted`](https://github.com/tosin2013/documcp/labels/help%20wanted) - Community contributions welcome
- [`bug`](https://github.com/tosin2013/documcp/labels/bug) - Something isn't working
- [`enhancement`](https://github.com/tosin2013/documcp/labels/enhancement) - New features
- [`documentation`](https://github.com/tosin2013/documcp/labels/documentation) - Docs improvements
- [`testing`](https://github.com/tosin2013/documcp/labels/testing) - Test coverage
- [`ci/cd`](https://github.com/tosin2013/documcp/labels/ci%2Fcd) - CI/CD improvements
- [`area/ssg-adapter`](https://github.com/tosin2013/documcp/labels/area%2Fssg-adapter) - SSG adapter work
- [`area/dx`](https://github.com/tosin2013/documcp/labels/area%2Fdx) - Developer experience

---

## 🔒 Security

### Security Guidelines

- Never commit secrets or credentials
- Use secure defaults in configurations
- Follow OWASP security practices
- Run security audits: `npm run security:check`

### Reporting Security Issues

Please report security vulnerabilities privately rather than creating public issues.

---

## 🤝 Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct.

---

## 📞 Getting Help

- **Issues**: [Create a GitHub issue](https://github.com/tosin2013/documcp/issues/new)
- **Discussions**: [GitHub Discussions](https://github.com/tosin2013/documcp/discussions)
- **Documentation**: Check the `docs/` directory

---

## 📄 License

By contributing to DocuMCP, you agree that your contributions will be licensed under the MIT License.
