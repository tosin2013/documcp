#!/bin/bash

# Setup script for DocuMCP pre-commit hooks
# Based on: https://gist.githubusercontent.com/tosin2013/15b1d7bffafe17dff6374edf1530469b/raw/324c60dffb93ddd62c007effc1dbf3918c6483e8/install-precommit-tools.sh

set -e

echo "🚀 Setting up DocuMCP pre-commit hooks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "This is not a git repository!"
    exit 1
fi

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version 20 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js version: $(node --version) ✓"

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing npm dependencies..."
    npm install
else
    print_status "npm dependencies already installed ✓"
fi

# Install pre-commit
print_status "Installing pre-commit..."

if command -v brew &> /dev/null; then
    # macOS with Homebrew
    if ! command -v pre-commit &> /dev/null; then
        print_status "Installing pre-commit via Homebrew..."
        brew install pre-commit
    else
        print_status "pre-commit already installed ✓"
    fi
elif command -v pip3 &> /dev/null; then
    # Linux/WSL with pip3
    if ! command -v pre-commit &> /dev/null; then
        print_status "Installing pre-commit via pip3..."
        pip3 install --user pre-commit
        # Add to PATH if needed
        if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
            print_warning "Adding ~/.local/bin to PATH"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
            export PATH="$HOME/.local/bin:$PATH"
        fi
    else
        print_status "pre-commit already installed ✓"
    fi
elif command -v pipx &> /dev/null; then
    # Alternative installation via pipx
    if ! command -v pre-commit &> /dev/null; then
        print_status "Installing pre-commit via pipx..."
        pipx install pre-commit
    else
        print_status "pre-commit already installed ✓"
    fi
else
    print_error "Cannot install pre-commit. Please install either:"
    print_error "  - Homebrew (macOS): brew install pre-commit"
    print_error "  - pip3: pip3 install --user pre-commit"
    print_error "  - pipx: pipx install pre-commit"
    exit 1
fi

# Verify pre-commit installation
if ! command -v pre-commit &> /dev/null; then
    print_error "pre-commit installation failed!"
    exit 1
fi

print_success "pre-commit installed: $(pre-commit --version)"

# Install pre-commit hooks
print_status "Installing pre-commit hooks..."
pre-commit install-hooks

# Update Husky pre-commit hook to use pre-commit
if [ -f ".husky/pre-commit" ]; then
    if ! grep -q "pre-commit run" .husky/pre-commit; then
        print_status "Updating Husky pre-commit hook..."
        echo "pre-commit run --all-files" > .husky/pre-commit
        chmod +x .husky/pre-commit
    else
        print_status "Husky pre-commit hook already configured ✓"
    fi
else
    print_warning "Husky pre-commit hook not found. Creating..."
    mkdir -p .husky
    echo "pre-commit run --all-files" > .husky/pre-commit
    chmod +x .husky/pre-commit
fi

# Test the setup
print_status "Testing pre-commit setup..."
if pre-commit run --all-files > /dev/null 2>&1; then
    print_success "Pre-commit hooks are working!"
else
    print_warning "Pre-commit hooks encountered some issues (this is normal for first run)"
    print_status "Running pre-commit with output for diagnosis..."
    pre-commit run --all-files || true
fi

print_success "🎉 Pre-commit setup complete!"
echo
echo "📋 Summary of installed hooks:"
echo "  ✅ File integrity checks (trailing whitespace, end-of-file, etc.)"
echo "  ✅ YAML/JSON validation"
echo "  ✅ Security checks (private keys, large files)"
echo "  ✅ ESLint code linting with auto-fix"
echo "  ✅ Prettier code formatting"
echo "  ✅ TypeScript type checking"
echo "  ✅ npm security audit"
echo "  ✅ Core Jest tests (stable tests only)"
echo "  ✅ Documentation link checking"
echo "  ✅ Package.json validation"
echo "  ✅ Build verification"
echo
echo "🔧 Usage:"
echo "  • Hooks run automatically on every commit"
echo "  • Run manually: pre-commit run --all-files"
echo "  • Update hooks: pre-commit autoupdate"
echo "  • Skip hooks (emergency): git commit --no-verify"
echo
echo "📖 For team members:"
echo "  • New team members should run: ./setup-precommit.sh"
echo "  • All hooks are configured to match existing npm scripts"
echo "  • Hooks focus on code quality without blocking development"
echo
print_success "Happy coding! 🚀"
