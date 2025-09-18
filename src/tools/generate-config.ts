import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { MCPToolResponse, formatMCPResponse } from '../types/api.js';

const inputSchema = z.object({
  ssg: z.enum(['jekyll', 'hugo', 'docusaurus', 'mkdocs', 'eleventy']),
  projectName: z.string(),
  projectDescription: z.string().optional(),
  outputPath: z.string(),
});

export async function generateConfig(args: unknown): Promise<{ content: any[] }> {
  const startTime = Date.now();
  const { ssg, projectName, projectDescription, outputPath } = inputSchema.parse(args);

  try {
    // Ensure output directory exists
    await fs.mkdir(outputPath, { recursive: true });

    let configFiles: Array<{ path: string; content: string }> = [];

    switch (ssg) {
      case 'docusaurus':
        configFiles = await generateDocusaurusConfig(projectName, projectDescription || '');
        break;
      case 'mkdocs':
        configFiles = await generateMkDocsConfig(projectName, projectDescription || '');
        break;
      case 'hugo':
        configFiles = await generateHugoConfig(projectName, projectDescription || '');
        break;
      case 'jekyll':
        configFiles = await generateJekyllConfig(projectName, projectDescription || '');
        break;
      case 'eleventy':
        configFiles = await generateEleventyConfig(projectName, projectDescription || '');
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
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: 'info',
          title: 'Configuration Complete',
          description: `Generated ${configFiles.length} configuration files for ${ssg}`,
        },
      ],
      nextSteps: [
        {
          action: 'Setup Documentation Structure',
          toolRequired: 'setup_structure',
          description: `Create Diataxis-compliant documentation structure`,
          priority: 'high',
        },
      ],
    };

    return formatMCPResponse(response);
  } catch (error) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: 'CONFIG_GENERATION_FAILED',
        message: `Failed to generate config: ${error}`,
        resolution: 'Ensure output path is writable and SSG type is supported',
      },
      metadata: {
        toolVersion: '1.0.0',
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
      path: 'docusaurus.config.js',
      content: `module.exports = {
  title: '${projectName}',
  tagline: '${projectDescription}',
  url: 'https://your-domain.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'your-org',
  projectName: '${projectName.toLowerCase().replace(/\\s+/g, '-')}',

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-org/your-repo/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: '${projectName}',
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
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
      path: 'package.json',
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\\s+/g, '-'),
          version: '0.0.0',
          private: true,
          scripts: {
            docusaurus: 'docusaurus',
            start: 'docusaurus start',
            build: 'docusaurus build',
            swizzle: 'docusaurus swizzle',
            deploy: 'docusaurus deploy',
            clear: 'docusaurus clear',
            serve: 'docusaurus serve',
          },
          dependencies: {
            '@docusaurus/core': '^3.0.0',
            '@docusaurus/preset-classic': '^3.0.0',
            '@mdx-js/react': '^3.0.0',
            clsx: '^2.0.0',
            'prism-react-renderer': '^2.1.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
          devDependencies: {
            '@docusaurus/types': '^3.0.0',
          },
        },
        null,
        2,
      ),
    },
  ];
}

async function generateMkDocsConfig(
  projectName: string,
  projectDescription: string,
): Promise<Array<{ path: string; content: string }>> {
  return [
    {
      path: 'mkdocs.yml',
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
      path: 'requirements.txt',
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
      path: 'hugo.toml',
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
      path: '_config.yml',
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
      path: 'Gemfile',
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
      path: '.eleventy.js',
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
      path: 'package.json',
      content: JSON.stringify(
        {
          name: projectName.toLowerCase().replace(/\\s+/g, '-'),
          version: '1.0.0',
          description: projectDescription,
          scripts: {
            build: 'eleventy',
            serve: 'eleventy --serve',
            debug: 'DEBUG=* eleventy',
          },
          devDependencies: {
            '@11ty/eleventy': '^2.0.0',
          },
        },
        null,
        2,
      ),
    },
  ];
}
