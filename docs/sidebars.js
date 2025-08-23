/**
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
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: '📚 Tutorials',
      link: {
        type: 'doc',
        id: 'tutorials/index',
      },
      items: [
        'tutorials/getting-started-with-documcp',
        'tutorials/setting-up-your-development-environment',
        'tutorials/writing-and-running-tests',
      ],
    },
    {
      type: 'category',
      label: '🔧 How-To Guides',
      link: {
        type: 'doc',
        id: 'how-to/index',
      },
      items: [
        'how-to/how-to-debug-common-issues',
        'how-to/how-to-add-a-new-feature',
        'how-to/how-to-deploy-your-application',
        'how-to/deploy-to-production',
      ],
    },
    {
      type: 'category',
      label: '📖 Reference',
      link: {
        type: 'doc',
        id: 'reference/index',
      },
      items: [
        'reference/api-reference',
        'reference/api-documentation',
        'reference/configuration-options',
        'reference/command-line-interface',
      ],
    },
    {
      type: 'category',
      label: '💡 Explanation',
      link: {
        type: 'doc',
        id: 'explanation/index',
      },
      items: [
        'explanation/architecture-overview',
        'explanation/design-decisions',
        'explanation/technology-stack',
      ],
    },
    {
      type: 'category',
      label: '🏛️ Architecture Decisions',
      link: {
        type: 'doc',
        id: 'adrs/README',
      },
      items: [
        {
          type: 'category',
          label: '🏗️ Foundation Architecture',
          items: [
            'adrs/001-mcp-server-architecture',
            'adrs/002-repository-analysis-engine',
          ],
        },
        {
          type: 'category', 
          label: '🧠 Intelligence & Recommendation',
          items: [
            'adrs/003-static-site-generator-recommendation-engine',
          ],
        },
        {
          type: 'category',
          label: '📝 Content & Structure', 
          items: [
            'adrs/004-diataxis-framework-integration',
            'adrs/008-intelligent-content-population-engine',
            'adrs/009-content-accuracy-validation-framework',
          ],
        },
        {
          type: 'category',
          label: '🚀 Deployment & Integration',
          items: [
            'adrs/005-github-pages-deployment-automation',
            'adrs/006-mcp-tools-api-design',
          ],
        },
        {
          type: 'category',
          label: '🤖 AI & Assistance',
          items: [
            'adrs/007-mcp-prompts-and-resources-integration',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '🔬 Research',
      link: {
        type: 'doc',
        id: 'research/README',
      },
      items: [
        'research/research-questions-2025-01-14',
        'research/research-integration-summary-2025-01-14',
        {
          type: 'category',
          label: 'Domain Research',
          items: [
            'research/domain-1-mcp-architecture/mcp-performance-research',
            'research/domain-3-ssg-recommendation/ssg-performance-analysis',
            'research/domain-5-github-deployment/github-pages-security-analysis',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
