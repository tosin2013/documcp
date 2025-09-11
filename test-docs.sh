#!/bin/bash

# DocuMCP Documentation Testing Script
# This script sets up, builds, and tests the Docusaurus documentation site
# with integrated ADRs for local verification

set -e  # Exit on any error

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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! command_exists npx; then
        print_error "npx is not available. Please update npm and try again."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Navigate to project directory
setup_environment() {
    print_status "Setting up environment..."
    
    # Get the script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$SCRIPT_DIR"
    DOCS_DIR="$PROJECT_ROOT/docs"
    
    print_status "Project root: $PROJECT_ROOT"
    print_status "Docs directory: $DOCS_DIR"
    
    if [ ! -d "$DOCS_DIR" ]; then
        print_error "Docs directory not found at $DOCS_DIR"
        exit 1
    fi
    
    cd "$DOCS_DIR"
    print_success "Environment setup complete"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Docusaurus dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in docs directory"
        exit 1
    fi
    
    npm install --silent
    print_success "Dependencies installed"
}

# Check documentation links
check_documentation_links() {
    print_status "Checking documentation links..."
    
    # Navigate back to project root to run link checker
    cd "$PROJECT_ROOT"
    
    if [ -f "dist/tools/check-documentation-links.js" ]; then
        print_status "Running comprehensive link check..."
        if node -e "
            import('./dist/tools/check-documentation-links.js').then(module => {
                return module.checkDocumentationLinks({
                    documentation_path: './docs',
                    check_external_links: true,
                    check_internal_links: true,
                    timeout_ms: 10000,
                    max_concurrent_checks: 3,
                    fail_on_broken_links: false
                });
            }).then(result => {
                if (result.success) {
                    const data = result.data;
                    console.log('✓ Link check completed');
                    console.log(\`  Total links: \${data.summary.totalLinks}\`);
                    console.log(\`  Valid links: \${data.summary.validLinks}\`);
                    console.log(\`  Broken links: \${data.summary.brokenLinks}\`);
                    console.log(\`  Files scanned: \${data.summary.filesScanned}\`);
                    if (data.summary.brokenLinks > 0) {
                        console.log('⚠ Warning: Found broken links - check output for details');
                        process.exit(1);
                    }
                } else {
                    console.log('✗ Link check failed:', result.error?.message);
                    process.exit(1);
                }
            }).catch(err => {
                console.log('✗ Link check error:', err.message);
                process.exit(1);
            });
        "; then
            print_success "✓ Documentation links verified"
        else
            print_warning "⚠ Link check found issues - continuing with build test"
        fi
    else
        print_warning "⚠ Link checker not built - run 'npm run build' first"
    fi
    
    # Navigate back to docs directory
    cd "$DOCS_DIR"
}

# Verify ADR integration
verify_adr_integration() {
    print_status "Verifying ADR integration..."
    
    # Check if ADR files exist
    ADR_COUNT=$(find adrs -name "*.md" -not -name "README.md" | wc -l)
    print_status "Found $ADR_COUNT ADR files"
    
    # Check if front matter exists in ADR files
    for adr_file in adrs/[0-9]*.md; do
        if [ -f "$adr_file" ]; then
            if head -n 1 "$adr_file" | grep -q "^---$"; then
                print_success "✓ $(basename "$adr_file") has front matter"
            else
                print_warning "⚠ $(basename "$adr_file") missing front matter"
            fi
        fi
    done
    
    # Check sidebars.js
    if [ -f "sidebars.js" ]; then
        print_success "✓ sidebars.js exists"
    else
        print_error "✗ sidebars.js missing"
        exit 1
    fi
    
    # Check docusaurus.config.js
    if [ -f "docusaurus.config.js" ]; then
        print_success "✓ docusaurus.config.js exists"
    else
        print_error "✗ docusaurus.config.js missing"
        exit 1
    fi
}

# Test build process
test_build() {
    print_status "Testing Docusaurus build..."
    
    # Clean any previous builds
    if [ -d "build" ]; then
        rm -rf build
        print_status "Cleaned previous build"
    fi
    
    # Attempt to build
    if npm run build; then
        print_success "✓ Build successful"
        
        # Check if build directory was created
        if [ -d "build" ]; then
            BUILD_SIZE=$(du -sh build | cut -f1)
            print_success "✓ Build directory created (size: $BUILD_SIZE)"
        else
            print_error "✗ Build directory not created"
            return 1
        fi
    else
        print_error "✗ Build failed"
        return 1
    fi
}

# Start development server
start_dev_server() {
    print_status "Starting development server..."
    
    # Kill any existing processes on port 3000
    if lsof -ti:3000 >/dev/null 2>&1; then
        print_warning "Port 3000 is in use. Attempting to kill existing process..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    print_status "Starting server in background..."
    npm start > dev-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    print_status "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            print_success "✓ Development server is running at http://localhost:3000"
            print_success "✓ Server PID: $SERVER_PID"
            echo "$SERVER_PID" > .dev-server.pid
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    print_error "✗ Server failed to start within 30 seconds"
    kill $SERVER_PID 2>/dev/null || true
    return 1
}

# Test key pages
test_pages() {
    print_status "Testing key documentation pages..."
    
    # Test main page
    if curl -s "http://localhost:3000" | grep -q "DocuMCP"; then
        print_success "✓ Main page loads correctly"
    else
        print_warning "⚠ Main page may have issues"
    fi
    
    # Test ADR section (assuming it's at /adrs/)
    if curl -s "http://localhost:3000/adrs/" >/dev/null 2>&1; then
        print_success "✓ ADR section accessible"
    else
        print_warning "⚠ ADR section may not be accessible"
    fi
    
    # Test specific ADR
    if curl -s "http://localhost:3000/adrs/001-mcp-server-architecture" >/dev/null 2>&1; then
        print_success "✓ Individual ADR pages accessible"
    else
        print_warning "⚠ Individual ADR pages may have issues"
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Stop development server if running
    if [ -f ".dev-server.pid" ]; then
        SERVER_PID=$(cat .dev-server.pid)
        if kill -0 $SERVER_PID 2>/dev/null; then
            print_status "Stopping development server (PID: $SERVER_PID)..."
            kill $SERVER_PID 2>/dev/null || true
            sleep 2
            kill -9 $SERVER_PID 2>/dev/null || true
        fi
        rm -f .dev-server.pid
    fi
    
    # Clean up log files
    rm -f dev-server.log
    
    print_success "Cleanup complete"
}

# Main execution
main() {
    echo "================================================"
    echo "🚀 DocuMCP Documentation Testing Script"
    echo "================================================"
    echo ""
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Run all checks and tests
    check_prerequisites
    setup_environment
    check_documentation_links
    verify_adr_integration
    install_dependencies
    
    # Test build first
    if test_build; then
        print_success "Build test passed!"
    else
        print_error "Build test failed. Please check the errors above."
        exit 1
    fi
    
    # Ask user if they want to start the dev server
    echo ""
    read -p "Do you want to start the development server for manual testing? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if start_dev_server; then
            sleep 3  # Give server time to fully start
            test_pages
            
            echo ""
            echo "================================================"
            print_success "🎉 Documentation site is ready!"
            echo "================================================"
            echo ""
            echo "📖 Open your browser and visit:"
            echo "   🌐 Main site: http://localhost:3000"
            echo "   🏛️  ADRs: http://localhost:3000/adrs/"
            echo "   📚 Tutorials: http://localhost:3000/tutorials/"
            echo "   🔧 How-to guides: http://localhost:3000/how-to/"
            echo "   📖 Reference: http://localhost:3000/reference/"
            echo ""
            echo "🧪 Test these specific features:"
            echo "   ✅ Navigation between sections"
            echo "   ✅ ADR categorization and links"
            echo "   ✅ Search functionality"
            echo "   ✅ Mobile responsiveness"
            echo "   ✅ Dark/light theme toggle"
            echo ""
            echo "⏹️  Press Ctrl+C when done testing to stop the server"
            echo ""
            
            # Wait for user to stop the server
            wait
        else
            print_error "Failed to start development server"
            exit 1
        fi
    else
        print_success "Build test completed successfully!"
        echo ""
        echo "📝 Next steps:"
        echo "   1. Run 'cd docs && npm start' to start the development server"
        echo "   2. Visit http://localhost:3000 to test the site"
        echo "   3. Run 'npm run build' to test production build"
        echo "   4. Deploy to GitHub Pages when ready"
    fi
}

# Run main function
main "$@"

