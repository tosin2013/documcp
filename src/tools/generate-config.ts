import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { MCPToolResponse, formatMCPResponse } from "../types/api.js";

const inputSchema = z.object({
  ssg: z.enum(["jekyll", "hugo", "docusaurus", "mkdocs", "eleventy"]),
  projectName: z.string(),
  projectDescription: z.string().optional(),
  outputPath: z.string(),
});

export async function generateConfig(
  args: unknown,
): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { ssg, projectName, projectDescription, outputPath } =
    inputSchema.parse(args);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    let configFiles: Array<{ path: string; content: string }> = [];

    switch (ssg) {
      case "docusaurus":
        configFiles = await generateDocusaurusConfig(
          projectName,
          projectDescription || "",
        );
        break;
      case "mkdocs":
        configFiles = await generateMkDocsConfig(
          projectName,
          projectDescription || "",
        );
        break;
      case "hugo":
        configFiles = await generateHugoConfig(
          projectName,
          projectDescription || "",
        );
        break;
      case "jekyll":
        configFiles = await generateJekyllConfig(
          projectName,
          projectDescription || "",
        );
        break;
      case "eleventy":
        configFiles = await generateEleventyConfig(
          projectName,
          projectDescription || "",
        );
        break;
    }

    // Write all config files
    for (const file of configFiles) {
      const filePath = path.join(outputPath, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }

    const configResult = {
      ssg,
      projectName,
      projectDescription,
      outputPath,
      filesCreated: configFiles.map((f) => f.path),
      totalFiles: configFiles.length,
    };

    const response: MCPToolResponse<typeof configResult> = {
      success: true,
      data: configResult,
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Configuration Complete",
          description: `Generated ${configFiles.length} configuration files for ${ssg}`,
        },
      ],
      nextSteps: [
        {
          action: "Setup Documentation Structure",
          toolRequired: "setup_structure",
          description: `Create Diataxis-compliant documentation structure`,
          priority: "high",
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "CONFIG_GENERATION_FAILED",
        message: `Failed to generate config: ${error}`,
        resolution: "Ensure output path is writable and SSG type is supported",
      },
      metadata: {
        toolVersion: "1.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    return formatMCPResponse(errorResponse);
  }
}

async function generateDocusaurusConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: "docusaurus.config.js",
      content: `module.exports = {
  title: '${projectName}',
  tagline: '${projectDescription}',
  url: 'https://your-domain.com',
  baseUrl: '/your-repo/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'your-org',
  projectName: '${projectName.toLowerCase().replace(/\\s+/g, "-")}',

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/your-repo/tree/main/docs/',
          path: '../docs',
          routeBasePath: '/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        blog: false,
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: '${projectName}',
      items: [
        {
          type: 'doc',
          docId: 'index',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/your-org/your-repo',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
  },
};`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: `${projectName.toLowerCase().replace(/\\s+/g, "-")}-docs`,
          version: "0.0.0",
          private: true,
          scripts: {
            docusaurus: "docusaurus",
            start: "docusaurus start",
            build: "docusaurus build",
            swizzle: "docusaurus swizzle",
            deploy: "docusaurus deploy",
            clear: "docusaurus clear",
            serve: "docusaurus serve --port 3001",
          },
          dependencies: {
            "@docusaurus/core": "^3.0.0",
            "@docusaurus/preset-classic": "^3.0.0",
            "@mdx-js/react": "^3.0.0",
            clsx: "^2.0.0",
            "prism-react-renderer": "^2.1.0",
            react: "^18.0.0",
            "react-dom": "^18.0.0",
          },
          devDependencies: {
            "@docusaurus/types": "^3.0.0",
          },
        },
        null,
        2,
      ),
    },
    {
      path: "sidebars.js",
      content: `/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  docs: [
    'index',
    {
      type: 'category',
      label: 'Tutorials',
      items: [
        'tutorials/getting-started',
      ],
    },
    {
      type: 'category',
      label: 'How-to Guides',
      items: [
        'how-to/prompting-guide',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/mcp-tools',
      ],
    },
    {
      type: 'category',
      label: 'Explanation',
      items: [
        'explanation/architecture',
      ],
    },
  ],
};

module.exports = sidebars;`,
    },
    {
      path: "src/css/custom.css",
      content: `/**
 * Any CSS included here will be global. The classic template
 * bundles Infima by default. Infima is a CSS framework designed to
 * work well for content-centric websites.
 */

/* You can override the default Infima variables here. */
:root {
  --ifm-color-primary: #2e8555;
  --ifm-color-primary-dark: #29784c;
  --ifm-color-primary-darker: #277148;
  --ifm-color-primary-darkest: #205d3b;
  --ifm-color-primary-light: #33925d;
  --ifm-color-primary-lighter: #359962;
  --ifm-color-primary-lightest: #3cad6e;
  --ifm-code-font-size: 95%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

/* For readability concerns, you should choose a lighter palette in dark mode. */
[data-theme='dark'] {
  --ifm-color-primary: #25c2a0;
  --ifm-color-primary-dark: #21af90;
  --ifm-color-primary-darker: #1fa588;
  --ifm-color-primary-darkest: #1a8870;
  --ifm-color-primary-light: #29d5b0;
  --ifm-color-primary-lighter: #32d8b4;
  --ifm-color-primary-lightest: #4fddbf;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}`,
    },
    {
      path: "Dockerfile.docs",
      content: `# Documentation testing container
# Generated by DocuMCP
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY docs-site/package*.json ./docs-site/
COPY docs-site/docusaurus.config.js ./docs-site/
COPY docs-site/sidebars.js ./docs-site/
COPY docs-site/src ./docs-site/src/

# Copy documentation source
COPY docs ./docs/

# Install dependencies
RUN cd docs-site && npm install

# Build documentation
RUN cd docs-site && npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3001/ || exit 1

# Start server
CMD ["sh", "-c", "cd docs-site && npm run serve"]`,
    },
    {
      path: "test-docs-local.sh",
      content: `#!/bin/bash
# Containerized documentation testing script
# Generated by DocuMCP

set -e

# Detect container runtime
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
else
    echo "❌ Neither Podman nor Docker found. Please install one of them."
    echo "📖 Podman: https://podman.io/getting-started/installation"
    echo "📖 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "🔧 Using $CONTAINER_CMD for containerized documentation testing..."

# Build the documentation container
echo "📦 Building documentation container..."
$CONTAINER_CMD build -f Dockerfile.docs -t documcp-docs .

if [ $? -ne 0 ]; then
    echo "❌ Container build failed!"
    exit 1
fi

echo "✅ Container build successful!"

# Run link checking outside container (faster)
echo "🔗 Checking for broken links..."
if command -v markdown-link-check &> /dev/null; then
    find docs -name "*.md" -exec markdown-link-check {} \\;
else
    echo "⚠️  markdown-link-check not found. Install with: npm install -g markdown-link-check"
fi

# Start the container
echo ""
echo "🚀 Starting documentation server in container..."
echo "📖 Documentation will be available at: http://localhost:3001"
echo "💡 Press Ctrl+C to stop the server"
echo ""

# Run container with port mapping and cleanup
$CONTAINER_CMD run --rm -p 3001:3001 --name documcp-docs-test documcp-docs`,
    },
    {
      path: "docker-compose.docs.yml",
      content: `# Docker Compose for documentation testing
# Generated by DocuMCP
version: '3.8'

services:
  docs:
    build:
      context: .
      dockerfile: Dockerfile.docs
    ports:
      - "3001:3001"
    container_name: documcp-docs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      # Mount docs directory for live editing (optional)
      - ./docs:/app/docs:ro
    environment:
      - NODE_ENV=production`,
    },
    {
      path: ".dockerignore",
      content: `# Documentation container ignore file
# Generated by DocuMCP

# Node modules (will be installed in container)
node_modules/
docs-site/node_modules/
docs-site/.docusaurus/
docs-site/build/

# Git files
.git/
.gitignore

# Development files
.env*
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Build artifacts
dist/
build/
*.tgz

# Test files
coverage/
.nyc_output/

# Documentation build (will be generated)
docs-site/build/`,
    },
  ];
}

async function generateMkDocsConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: "mkdocs.yml",
      content: `site_name: ${projectName}
site_description: ${projectDescription}
site_url: https://your-domain.com

theme:
  name: material
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
  palette:
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-7
        name: Switch to dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/brightness-4
        name: Switch to light mode

plugins:
  - search
  - mermaid2

markdown_extensions:
  - pymdownx.highlight
  - pymdownx.superfences
  - pymdownx.tabbed
  - pymdownx.details
  - admonition
  - toc:
      permalink: true

nav:
  - Home: index.md
  - Tutorials:
    - Getting Started: tutorials/getting-started.md
  - How-To Guides:
    - Installation: how-to/installation.md
  - Reference:
    - API: reference/api.md
  - Explanation:
    - Architecture: explanation/architecture.md`,
    },
    {
      path: "requirements.txt",
      content: `mkdocs>=1.5.0
mkdocs-material>=9.0.0
mkdocs-mermaid2-plugin>=1.0.0`,
    },
  ];
}

async function generateHugoConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: "hugo.toml",
      content: `baseURL = 'https://your-domain.com/'
languageCode = 'en-us'
title = '${projectName}'

[params]
  description = '${projectDescription}'

[[menu.main]]
  name = 'Tutorials'
  url = '/tutorials/'
  weight = 10

[[menu.main]]
  name = 'How-To'
  url = '/how-to/'
  weight = 20

[[menu.main]]
  name = 'Reference'
  url = '/reference/'
  weight = 30

[[menu.main]]
  name = 'Explanation'
  url = '/explanation/'
  weight = 40`,
    },
  ];
}

async function generateJekyllConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: "_config.yml",
      content: `title: ${projectName}
description: ${projectDescription}
baseurl: ""
url: "https://your-domain.com"

theme: minima

plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap

collections:
  tutorials:
    output: true
    permalink: /tutorials/:name
  how-to:
    output: true
    permalink: /how-to/:name
  reference:
    output: true
    permalink: /reference/:name
  explanation:
    output: true
    permalink: /explanation/:name`,
    },
    {
      path: "Gemfile",
      content: `source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "minima", "~> 2.5"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag", "~> 2.8"
  gem "jekyll-sitemap", "~> 1.4"
end`,
    },
  ];
}

async function generateEleventyConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: ".eleventy.js",
      content: `module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\\s+/g, "-"),
          version: "1.0.0",
          description: projectDescription,
          scripts: {
            build: "eleventy",
            serve: "eleventy --serve",
            debug: "DEBUG=* eleventy",
          },
          devDependencies: {
            "@11ty/eleventy": "^2.0.0",
          },
        },
        null,
        2,
      ),
    },
  ];
}
