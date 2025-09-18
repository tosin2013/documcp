# Troubleshooting Common Issues

This guide helps you diagnose and fix common problems when using DocuMCP for documentation deployment.

## Quick Diagnostic Commands

Use these DocuMCP prompts for immediate diagnosis:

```bash
# General troubleshooting
"diagnose issues with my documentation deployment"

# Specific verification
"verify my GitHub Pages deployment and identify any problems"

# Link validation
"check all my documentation links for broken references"

# Content validation
"validate my documentation content for errors and inconsistencies"
```

## Repository Analysis Issues

### Problem: Analysis Returns Empty or Incomplete Results

**Symptoms:**

- Analysis shows 0 files or minimal structure
- Missing language detection
- No dependency information

**Solutions:**

1. **Check directory permissions:**

```bash
ls -la /path/to/your/repository
# Ensure read permissions exist
```

2. **Verify Git repository:**

```bash
git status
# Must be in a valid Git repository
```

3. **Use deeper analysis:**

```bash
"analyze my repository with deep analysis to get comprehensive results"
```

4. **Check for hidden files:**

```bash
# Include hidden files in analysis
ls -la
# Look for .gitignore excluding important files
```

### Problem: Wrong Project Type Detection

**Symptoms:**

- Library detected as application
- Wrong primary language
- Incorrect team size estimation

**Solutions:**

1. **Provide more context:**

```bash
"analyze my TypeScript library project with focus on API documentation"
```

2. **Check file extensions:**

```bash
# Ensure your main files have correct extensions
find . -name "*.ts" -o -name "*.js" -o -name "*.py" | head -20
```

3. **Update package.json:**

```json
{
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["library", "typescript", "api"]
}
```

## Static Site Generator Recommendation Issues

### Problem: No Recommendations or Low Confidence Scores

**Symptoms:**

- Empty recommendation list
- All SSGs have similar low scores
- Recommendation doesn't match project needs

**Solutions:**

1. **Provide preferences:**

```bash
"recommend SSG for my project with preferences for JavaScript ecosystem and feature-rich capabilities"
```

2. **Re-analyze with specific focus:**

```bash
"analyze my repository focusing on documentation needs and complexity"
```

3. **Check project characteristics:**

- Ensure sufficient code files exist
- Verify dependencies are in package.json/requirements.txt
- Add README with project description

### Problem: Recommended SSG Doesn't Match Expectations

**Symptoms:**

- Hugo recommended for React project
- MkDocs suggested for JavaScript library
- Jekyll proposed for Python project

**Solutions:**

1. **Specify ecosystem preference:**

```bash
"recommend SSG for my project with JavaScript ecosystem preference"
```

2. **Review analysis results:**

```bash
"explain why you recommended Hugo instead of Docusaurus for my React project"
```

3. **Override with specific request:**

```bash
"generate Docusaurus configuration for my project despite the Hugo recommendation"
```

## Configuration Generation Issues

### Problem: Configuration Files Not Created

**Symptoms:**

- No config files generated
- Empty configuration
- Missing dependencies

**Solutions:**

1. **Check output path:**

```bash
# Ensure output path exists and is writable
mkdir -p ./docs
chmod 755 ./docs
```

2. **Specify absolute path:**

```bash
"generate Hugo configuration files at /full/path/to/project"
```

3. **Check project name format:**

```bash
# Avoid special characters in project names
"generate config for project 'My-Simple-Docs' not 'My Project (v2.0)'"
```

### Problem: Invalid Configuration Generated

**Symptoms:**

- Build fails with config errors
- Missing required fields
- Wrong file format

**Solutions:**

1. **Validate generated config:**

```bash
# For Docusaurus
npm run docusaurus --version

# For Hugo
hugo version && hugo config

# For MkDocs
mkdocs --version && mkdocs build --strict
```

2. **Regenerate with project details:**

```bash
"generate detailed Hugo configuration with custom theme and GitHub integration"
```

3. **Fix common issues:**

**Docusaurus baseUrl fix:**

```javascript
// Fix in docusaurus.config.js
const config = {
  baseUrl: '/your-repo-name/', // Must match repository name
  url: 'https://yourusername.github.io',
};
```

**Hugo baseURL fix:**

```yaml
# Fix in config.yml
baseURL: 'https://yourusername.github.io/your-repo-name/'
```

## Documentation Structure Issues

### Problem: Diataxis Structure Not Created

**Symptoms:**

- Missing directories
- Empty folders
- No example content

**Solutions:**

1. **Check path permissions:**

```bash
ls -ld /path/to/docs
# Ensure write permissions
```

2. **Use absolute path:**

```bash
"set up Diataxis structure at /absolute/path/to/docs"
```

3. **Force recreation:**

```bash
"recreate documentation structure with examples for my SSG"
```

### Problem: Content Population Fails

**Symptoms:**

- Empty documentation files
- Generic content only
- Missing project-specific information

**Solutions:**

1. **Provide analysis context:**

```bash
"populate documentation using analysis ID analysis_abc123 with comprehensive content"
```

2. **Specify technology focus:**

```bash
"populate docs focusing on TypeScript, React, and API documentation"
```

3. **Check source code structure:**

```bash
# Ensure code has discoverable patterns
find . -name "*.ts" -exec grep -l "export" {} \;
```

## GitHub Pages Deployment Issues

### Problem: Deployment Workflow Fails

**Symptoms:**

- GitHub Actions shows red X
- Build fails with errors
- Deployment never completes

**Solutions:**

1. **Check workflow logs:**

- Go to Actions tab in GitHub
- Click on failed workflow
- Review step-by-step logs

2. **Common fixes:**

**Node.js version mismatch:**

```yaml
# Fix in .github/workflows/deploy.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20' # Match your local version
```

**Missing dependencies:**

```json
# Ensure all dependencies in package.json
{
  "dependencies": {
    "@docusaurus/core": "^3.0.0",
    "@docusaurus/preset-classic": "^3.0.0"
  }
}
```

**Build command issues:**

```yaml
# Fix build command
- name: Build
  run: npm run build # Ensure this command exists in package.json
```

### Problem: Site Shows 404 Error

**Symptoms:**

- GitHub Pages URL returns 404
- Site deployed but not accessible
- Some pages work, others don't

**Solutions:**

1. **Check GitHub Pages settings:**

- Repository Settings > Pages
- Source should be "GitHub Actions"
- Custom domain configured correctly (if used)

2. **Fix baseURL configuration:**

**Docusaurus:**

```javascript
const config = {
  baseUrl: '/repository-name/', // Must match your repo name exactly
  url: 'https://username.github.io',
};
```

**Hugo:**

```yaml
baseURL: 'https://username.github.io/repository-name/'
```

**MkDocs:**

```yaml
site_url: 'https://username.github.io/repository-name/'
```

3. **Check file naming:**

```bash
# Ensure index.html or index.md exists
ls docs/index.*
```

### Problem: Assets Not Loading (CSS/JS/Images)

**Symptoms:**

- Site loads but no styling
- Images show as broken
- JavaScript functionality missing

**Solutions:**

1. **Check asset paths:**

```javascript
// Use relative paths
<img src="./images/logo.png" />  // Good
<img src="/images/logo.png" />   // May fail
```

2. **Configure public path:**

**Docusaurus:**

```javascript
const config = {
  baseUrl: '/repo-name/',
  staticDirectories: ['static'],
};
```

**Hugo:**

```yaml
# In config.yml
baseURL: 'https://username.github.io/repo-name/'
canonifyURLs: true
```

3. **Verify asset directories:**

```bash
# Check assets exist in build output
ls -la build/assets/  # Docusaurus
ls -la public/css/    # Hugo
ls -la site/css/      # MkDocs
```

## Content Validation Issues

### Problem: Link Validation Shows False Positives

**Symptoms:**

- Valid links reported as broken
- External links fail intermittently
- Anchor links not found

**Solutions:**

1. **Configure link checking:**

```bash
"check documentation links with timeout of 10 seconds and ignore external domains github.com"
```

2. **Check anchor links:**

```markdown
<!-- Ensure anchors exist -->

## My Section

Link to [My Section](#my-section) <!-- Correct -->
Link to [My Section](#my_section) <!-- May fail -->
```

3. **Handle external link timeouts:**

```bash
"validate content with longer timeout for external links and retry failed checks"
```

### Problem: Code Block Validation Fails

**Symptoms:**

- Valid code marked as invalid
- Syntax highlighting not working
- Code examples cause build failures

**Solutions:**

1. **Check language tags:**

````markdown
<!-- Correct -->

```javascript
const example = 'Hello World';
```
````

<!-- Incorrect - missing language -->

```
const example = "Hello World";
```

````

2. **Validate code syntax:**
```bash
# Test code blocks separately
node -e "const example = 'Hello World'; console.log(example);"
````

3. **Configure code validation:**

```bash
"validate content with permissive code validation and syntax checking disabled"
```

## Memory System Issues

### Problem: Memory System Not Initializing

**Symptoms:**

- Memory tools return errors
- No historical data available
- Analysis doesn't include insights

**Solutions:**

1. **Check storage directory:**

```bash
ls -la .documcp/memory/
# Should contain analysis files
```

2. **Initialize manually:**

```bash
"recall all memories to initialize the memory system"
```

3. **Check permissions:**

```bash
chmod -R 755 .documcp/
```

### Problem: Similar Projects Not Found

**Symptoms:**

- No similar projects in results
- Low-quality recommendations
- Missing historical patterns

**Solutions:**

1. **Build memory with more analyses:**

```bash
"analyze multiple repositories to build memory patterns"
```

2. **Export and import memory:**

```bash
"export memories in JSON format for backup"
```

3. **Clean and rebuild:**

```bash
"cleanup old memories and rebuild with recent analyses"
```

## Performance Issues

### Problem: Slow Build Times

**Symptoms:**

- Builds take too long
- GitHub Actions timeout
- Local development is slow

**Solutions:**

1. **Optimize build configuration:**

**Docusaurus:**

```javascript
const config = {
  future: {
    experimental_faster: true,
  },
  webpack: {
    jsLoader: (isServer) => ({
      loader: 'esbuild-loader',
      options: {
        loader: 'tsx',
        target: isServer ? 'node12' : 'es2017',
      },
    }),
  },
};
```

**Hugo:**

```yaml
# config.yml
build:
  writeStats: false
  noJSConfigInAssets: true
```

2. **Enable caching:**

```yaml
# In GitHub Actions
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

3. **Reduce build scope:**

```bash
# Build only changed files
npm run build -- --locale en
```

### Problem: Large Bundle Sizes

**Symptoms:**

- Slow page loads
- High bandwidth usage
- Poor mobile performance

**Solutions:**

1. **Analyze bundle:**

```bash
# Docusaurus
npm run build -- --bundle-analyzer

# Check generated files
ls -lh build/assets/
```

2. **Optimize images:**

```bash
# Convert images to WebP
find docs -name "*.png" -exec cwebp {} -o {}.webp \;
```

3. **Enable code splitting:**

```javascript
// Docusaurus config
const config = {
  webpack: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

## Getting Help

### Diagnostic Information

When reporting issues, include:

1. **DocuMCP version:**

```bash
npm list documcp
```

2. **System information:**

```bash
node --version
npm --version
git --version
```

3. **Error logs:**

```bash
# GitHub Actions logs
# Local build output
# Browser console errors
```

### Support Channels

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/tosin2013/documcp/issues)
- **Documentation**: Check other guides in this documentation
- **Community**: Search existing issues for solutions

### Self-Diagnostic Commands

```bash
# Complete health check
"verify my entire documentation setup and identify all issues"

# Performance analysis
"analyze my documentation build performance and suggest optimizations"

# Security check
"validate my GitHub Pages deployment for security best practices"
```

## Prevention Tips

### Regular Maintenance

1. **Weekly validation:**

```bash
"check all documentation links and validate content quality"
```

2. **Monthly updates:**

```bash
# Update dependencies
npm update
# Regenerate configurations if needed
```

3. **Monitor deployment:**

- Set up GitHub Actions notifications
- Check site accessibility regularly
- Monitor build times and performance

### Best Practices

1. **Always test locally before deploying**
2. **Use DocuMCP validation before committing**
3. **Keep dependencies updated**
4. **Monitor GitHub Actions for failures**
5. **Backup memory and configurations**

## Summary

Common issue categories and solutions:
✅ Repository analysis problems - permissions and context
✅ SSG recommendation issues - preferences and project type
✅ Configuration generation - paths and project details
✅ Deployment failures - workflows and settings
✅ Content validation - links and code blocks
✅ Performance optimization - builds and bundles
✅ Memory system troubleshooting - initialization and data

Most issues can be resolved by providing more context to DocuMCP or fixing configuration details!
