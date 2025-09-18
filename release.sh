#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[RELEASE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_error "Must be on main branch to release. Current branch: $current_branch"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    print_error "Working directory is not clean. Please commit or stash changes first."
    git status
    exit 1
fi

# Get version type
VERSION_TYPE=${1:-patch}
if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    print_error "Invalid version type: $VERSION_TYPE"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

print_status "Starting release process with version bump: $VERSION_TYPE"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
major=${version_parts[0]}
minor=${version_parts[1]}
patch=${version_parts[2]}

case $VERSION_TYPE in
    major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
    minor)
        minor=$((minor + 1))
        patch=0
        ;;
    patch)
        patch=$((patch + 1))
        ;;
esac

NEW_VERSION="$major.$minor.$patch"
TAG_NAME="v$NEW_VERSION"

print_status "New version will be: $NEW_VERSION"
print_status "Tag will be: $TAG_NAME"

# Confirm release
echo
read -p "Continue with release? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    print_status "Release cancelled"
    exit 0
fi

print_status "Updating package.json version..."
# Update package.json version
npm version $VERSION_TYPE --no-git-tag-version

print_status "Running pre-release checks..."
# Run tests and linting
npm run ci

print_status "Creating git commit..."
# Commit the version change
git add package.json package-lock.json
git commit -m "chore(release): bump version to $NEW_VERSION

🤖 Generated with [Claude Code](https://claude.ai/code)

Authored-By: TOSIN AKINOSHO <tosinakinosho@gmail.com>
Co-Authored-By: Claude <noreply@anthropic.com>"

print_status "Creating git tag: $TAG_NAME"
# Create annotated tag
git tag -a "$TAG_NAME" -m "Release $NEW_VERSION

DocuMCP v$NEW_VERSION - Intelligent MCP server for documentation deployment

Features:
- Repository analysis and SSG recommendations
- Automated GitHub Pages deployment workflows
- Diataxis framework integration
- Enhanced TODO management system

🤖 Generated with [Claude Code](https://claude.ai/code)

Authored-By: TOSIN AKINOSHO <tosinakinosho@gmail.com>
Co-Authored-By: Claude <noreply@anthropic.com>"

print_status "Pushing changes and tag to origin..."
# Push commit and tag
git push origin main
git push origin "$TAG_NAME"

print_status "Release complete! 🎉"
print_status "Tag $TAG_NAME has been pushed and will trigger the release workflow"
print_status "Check GitHub Actions for release progress: https://github.com/tosin2013/documcp/actions"
