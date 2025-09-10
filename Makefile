# DocuMCP Makefile
# Provides convenient commands for building, testing, and coverage analysis

.PHONY: help install build test test-watch coverage coverage-html clean lint format check-types dev benchmark

# Default target
help:
	@echo "DocuMCP Development Commands"
	@echo "============================"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  install          Install dependencies"
	@echo "  clean            Clean build artifacts and node_modules"
	@echo ""
	@echo "Development:"
	@echo "  build            Build TypeScript to JavaScript"
	@echo "  dev              Start development mode with watch"
	@echo "  lint             Run ESLint"
	@echo "  format           Format code with Prettier"
	@echo "  check-types      Run TypeScript type checking"
	@echo ""
	@echo "Testing:"
	@echo "  test             Run all tests"
	@echo "  test-watch       Run tests in watch mode"
	@echo "  coverage         Run tests with coverage report"
	@echo "  coverage-html    Generate HTML coverage report"
	@echo "  benchmark        Run performance benchmarks"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  qa               Run full QA suite (lint, types, test, coverage)"
	@echo "  ci               Run CI pipeline locally"

# Installation
install:
	@echo "📦 Installing dependencies..."
	npm install

# Build
build:
	@echo "🔨 Building TypeScript..."
	npm run build

# Development
dev:
	@echo "🚀 Starting development mode..."
	npm run dev

# Linting and formatting
lint:
	@echo "🔍 Running ESLint..."
	npm run lint

format:
	@echo "✨ Formatting code..."
	npm run format

check-types:
	@echo "🔍 Checking TypeScript types..."
	npx tsc --noEmit

# Testing
test:
	@echo "🧪 Running tests..."
	npm test

test-watch:
	@echo "👀 Running tests in watch mode..."
	npm run test:watch

coverage:
	@echo "📊 Running test coverage..."
	npm run test:coverage

coverage-html:
	@echo "📊 Generating HTML coverage report..."
	npm run test:coverage -- --coverageReporters=html
	@echo "📄 Coverage report generated in coverage/lcov-report/index.html"
	@echo "🌐 Open coverage/lcov-report/index.html in your browser"

benchmark:
	@echo "⚡ Running performance benchmarks..."
	npm run benchmark

# Quality Assurance
qa: lint check-types test coverage
	@echo "✅ Quality assurance complete!"

ci: install build qa
	@echo "🎯 CI pipeline complete!"

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	rm -rf node_modules
	rm -rf dist
	rm -rf coverage
	rm -rf .nyc_output
	@echo "✨ Clean complete!"

# Development helpers
quick-test:
	@echo "⚡ Running quick tests (no coverage)..."
	npm test -- --passWithNoTests

test-specific:
	@echo "🎯 Running specific test file..."
	@echo "Usage: make test-specific FILE=path/to/test.ts"
	npm test -- $(FILE)

coverage-specific:
	@echo "📊 Running coverage for specific file..."
	@echo "Usage: make coverage-specific FILE=path/to/test.ts"
	npm run test:coverage -- $(FILE)

# Git helpers
git-status:
	@echo "📋 Git status..."
	git status

git-push: qa
	@echo "🚀 Running QA before push..."
	git push

# Documentation
docs-validate:
	@echo "📚 Validating documentation..."
	npm run test:docs

# Epic #9 Coverage Check
coverage-check:
	@echo "🎯 Checking Epic #9 coverage targets..."
	@echo "Target: 85% across all metrics"
	@echo "Running coverage analysis..."
	npm run test:coverage | grep -E "(All files|% Stmts|% Branch|% Funcs|% Lines)"

# Show current coverage for specific files
coverage-files:
	@echo "📊 Current coverage by file..."
	npm run test:coverage -- --verbose

# Run only failing tests
test-failed:
	@echo "🔥 Running only failed tests..."
	npm test -- --onlyFailures

# Watch mode for specific test file
test-watch-file:
	@echo "👀 Watching specific test file..."
	@echo "Usage: make test-watch-file FILE=path/to/test.ts"
	npm test -- --watch $(FILE)
