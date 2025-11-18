# Configuration Options

This reference guide covers all configuration options available in DocuMCP and the static site generators it supports.

## DocuMCP Configuration

### Environment Variables

DocuMCP supports the following environment variables:

| Variable              | Default           | Description                         |
| --------------------- | ----------------- | ----------------------------------- |
| `DOCUMCP_STORAGE_DIR` | `.documcp/memory` | Directory for memory system storage |
| `DEBUG`               | `false`           | Enable debug logging                |
| `NODE_ENV`            | `development`     | Node.js environment                 |

### Memory System Configuration

The memory system stores analysis results and learning patterns:

```bash
# Default storage location (relative to project)
.documcp/memory/
├── analysis/           # Repository analysis results
├── recommendations/    # SSG recommendations
├── patterns/          # Learning patterns
└── metadata.json      # System metadata
```

#### Memory Cleanup Options

```javascript
// Cleanup configuration
{
  "daysToKeep": 30,        // Days to retain memories
  "maxEntries": 1000,      // Maximum memory entries
  "compressionEnabled": true
}
```

## Static Site Generator Configurations

### Jekyll Configuration

**\_config.yml:**

```yaml
title: "Your Documentation Site"
description: "Project documentation"
baseurl: "/repository-name"
url: "https://username.github.io"

markdown: kramdown
highlighter: rouge
theme: minima

plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

collections:
  tutorials:
    output: true
    permalink: /:collection/:name/
  how-to-guides:
    output: true
    permalink: /:collection/:name/

defaults:
  - scope:
      path: ""
    values:
      layout: "default"
  - scope:
      path: "_tutorials"
    values:
      layout: "tutorial"
```

**Gemfile:**

```ruby
source 'https://rubygems.org'

gem 'jekyll', '~> 4.3.0'
gem 'jekyll-feed', '~> 0.17'
gem 'jekyll-sitemap', '~> 1.4'
gem 'jekyll-seo-tag', '~> 2.8'
gem 'minima', '~> 2.5'

group :jekyll_plugins do
  gem 'jekyll-timeago', '~> 0.13.1'
end
```

### Hugo Configuration

**config.yml:**

```yaml
baseURL: "https://username.github.io/repository-name"
languageCode: "en-us"
title: "Documentation Site"
theme: "docsy"

params:
  github_repo: "https://github.com/username/repository"
  github_branch: "main"
  edit_page: true
  search:
    enabled: true

menu:
  main:
    - name: "Tutorials"
      url: "/tutorials/"
      weight: 10
    - name: "How-to Guides"
      url: "/how-to/"
      weight: 20
    - name: "Reference"
      url: "/reference/"
      weight: 30
    - name: "Explanation"
      url: "/explanation/"
      weight: 40

markup:
  goldmark:
    renderer:
      unsafe: true
  highlight:
    style: github
    lineNos: true
    codeFences: true

security:
  funcs:
    getenv:
      - ^HUGO_
      - ^CI$
```

**go.mod:**

```go
module github.com/username/repository

go 1.19

require (
    github.com/google/docsy v0.6.0 // indirect
    github.com/google/docsy/dependencies v0.6.0 // indirect
)
```

### Docusaurus Configuration

**docusaurus.config.js:**

For GitHub Pages deployment, ensure you configure `organizationName`, `projectName`, and `deploymentBranch`:

```javascript
const config = {
  title: "Documentation Site",
  tagline: "Comprehensive project documentation",
  url: "https://yourusername.github.io", // Your GitHub Pages URL
  baseUrl: "/repository-name/", // Repository name (or "/" for user/organization pages)
  organizationName: "yourusername", // GitHub username or organization
  projectName: "repository-name", // Repository name
  deploymentBranch: "gh-pages", // Branch for deployment (default: gh-pages)
  trailingSlash: false, // Set to true if using trailing slashes

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/username/repository/tree/main/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        gtag: {
          trackingID: "G-XXXXXXXXXX",
          anonymizeIP: true,
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Documentation",
      items: [
        {
          type: "doc",
          docId: "tutorials/index",
          position: "left",
          label: "Tutorials",
        },
        {
          type: "doc",
          docId: "how-to/index",
          position: "left",
          label: "How-to",
        },
        {
          type: "doc",
          docId: "reference/index",
          position: "left",
          label: "Reference",
        },
        {
          href: "https://github.com/username/repository",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      copyright: `Copyright © ${new Date().getFullYear()} Your Project Name.`,
    },
    prism: {
      theme: require("prism-react-renderer/themes/github"),
      darkTheme: require("prism-react-renderer/themes/dracula"),
    },
  },
};

module.exports = config;
```

**sidebars.js:**

```javascript
const sidebars = {
  tutorialSidebar: [
    "index",
    {
      type: "category",
      label: "Tutorials",
      items: [
        "tutorials/getting-started",
        "tutorials/first-deployment",
        "tutorials/development-setup",
      ],
    },
    {
      type: "category",
      label: "How-to Guides",
      items: [
        "how-to/prompting-guide",
        "how-to/repository-analysis",
        "how-to/github-pages-deployment",
        "how-to/troubleshooting",
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        "reference/mcp-tools",
        "reference/configuration",
        "reference/cli",
      ],
    },
  ],
};

module.exports = sidebars;
```

### MkDocs Configuration

**mkdocs.yml:**

```yaml
site_name: Documentation Site
site_url: https://username.github.io/repository-name
site_description: Comprehensive project documentation

repo_name: username/repository
repo_url: https://github.com/username/repository
edit_uri: edit/main/docs/

theme:
  name: material
  palette:
    - scheme: default
      primary: blue
      accent: blue
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      primary: blue
      accent: blue
      toggle:
        icon: material/brightness-4
        name: Switch to light mode
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.highlight
    - content.code.copy

nav:
  - Home: index.md
  - Tutorials:
      - tutorials/index.md
      - Getting Started: tutorials/getting-started.md
      - First Deployment: tutorials/first-deployment.md
  - How-to Guides:
      - how-to/index.md
      - Prompting Guide: how-to/prompting-guide.md
      - Repository Analysis: how-to/repository-analysis.md
  - Reference:
      - reference/index.md
      - MCP Tools: reference/mcp-tools.md
      - Configuration: reference/configuration.md
  - Explanation:
      - explanation/index.md
      - Architecture: explanation/architecture.md

plugins:
  - search
  - git-revision-date-localized:
      enable_creation_date: true

markdown_extensions:
  - pymdownx.highlight:
      anchor_linenums: true
  - pymdownx.inlinehilite
  - pymdownx.snippets
  - pymdownx.superfences
  - admonition
  - pymdownx.details
  - pymdownx.tabbed:
      alternate_style: true
  - attr_list
  - md_in_html

extra:
  social:
    - icon: fontawesome/brands/github
      link: https://github.com/username/repository
```

**requirements.txt:**

```txt
mkdocs>=1.5.0
mkdocs-material>=9.0.0
mkdocs-git-revision-date-localized-plugin>=1.2.0
```

### Eleventy Configuration

**.eleventy.js:**

```javascript
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

module.exports = function (eleventyConfig) {
  // Add plugins
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);

  // Configure Markdown
  let markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true,
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "direct-link",
      symbol: "#",
    }),
    level: [1, 2, 3, 4],
    slugify: eleventyConfig.getFilter("slug"),
  });

  eleventyConfig.setLibrary("md", markdownLibrary);

  // Copy static files
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");

  // Collections for Diataxis structure
  eleventyConfig.addCollection("tutorials", function (collection) {
    return collection.getFilteredByGlob("src/tutorials/*.md");
  });

  eleventyConfig.addCollection("howto", function (collection) {
    return collection.getFilteredByGlob("src/how-to/*.md");
  });

  eleventyConfig.addCollection("reference", function (collection) {
    return collection.getFilteredByGlob("src/reference/*.md");
  });

  eleventyConfig.addCollection("explanation", function (collection) {
    return collection.getFilteredByGlob("src/explanation/*.md");
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    pathPrefix: "/repository-name/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
```

**package.json additions:**

```json
{
  "scripts": {
    "build": "eleventy",
    "serve": "eleventy --serve",
    "debug": "DEBUG=Eleventy* eleventy"
  },
  "devDependencies": {
    "@11ty/eleventy": "^2.0.0",
    "markdown-it": "^13.0.0",
    "markdown-it-anchor": "^8.6.0"
  }
}
```

## GitHub Actions Configuration

### Common Workflow Settings

All generated workflows include these optimizations:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

environment:
  name: github-pages
  url: ${{ steps.deployment.outputs.page_url }}
```

### Caching Configuration

Node.js dependencies:

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

Ruby dependencies (Jekyll):

```yaml
- name: Cache gems
  uses: actions/cache@v4
  with:
    path: vendor/bundle
    key: ${{ runner.os }}-gems-${{ hashFiles('**/Gemfile.lock') }}
    restore-keys: |
      ${{ runner.os }}-gems-
```

## Performance Configuration

### Build Optimization

**Docusaurus:**

```javascript
const config = {
  future: {
    experimental_faster: true,
  },
  webpack: {
    jsLoader: (isServer) => ({
      loader: "esbuild-loader",
      options: {
        loader: "tsx",
        target: isServer ? "node12" : "es2017",
      },
    }),
  },
};
```

**Hugo:**

```yaml
build:
  writeStats: true
  noJSConfigInAssets: true

caches:
  getjson:
    maxAge: "1m"
  getcsv:
    maxAge: "1m"
```

### SEO Configuration

All SSGs include:

- Meta tags for social sharing
- Structured data markup
- XML sitemaps
- RSS feeds
- Canonical URLs
- Open Graph tags

## Security Configuration

### Content Security Policy

Generated sites include CSP headers:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://www.google-analytics.com;
"
/>
```

### HTTPS Enforcement

All deployments force HTTPS and include HSTS headers.

## Troubleshooting Configuration Issues

### Common Problems

**BaseURL Mismatch:**

```bash
# Check your configuration matches repository name
baseURL: "https://username.github.io/repository-name/"  # Must match exactly
```

**Build Failures:**

```bash
# Verify Node.js version in workflows
node-version: '20'  # Must match your local version
```

**Asset Loading Issues:**

```bash
# Ensure relative paths
<img src="./images/logo.png" />  # Good
<img src="/images/logo.png" />   # May fail
```

For more troubleshooting help, see the [Troubleshooting Guide](../how-to/troubleshooting.md).
