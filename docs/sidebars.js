/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  docsSidebar: [
    'index',
    {
      type: 'category',
      label: '📚 Tutorials',
      items: [
        'tutorials/getting-started-with-documcp',
        'tutorials/setting-up-your-development-environment', 
        'tutorials/writing-and-running-tests',
      ],
    },
    {
      type: 'category',
      label: '🔧 How-To Guides',
      items: [
        'how-to/how-to-debug-common-issues',
        'how-to/how-to-add-a-new-feature',
        'how-to/how-to-deploy-your-application',
        'how-to/deploy-to-production',
        'how-to/how-to-release',
      ],
    },
    {
      type: 'category',
      label: '📖 Reference',
      items: [
        'reference/api-reference',
        'reference/mcp-tools-reference',
        'reference/command-line-interface',
        'reference/configuration-options',
        'reference/release-workflow-reference',
      ],
    },
    {
      type: 'category',
      label: '💡 Explanation',
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
        'adrs/001-mcp-server-architecture',
        'adrs/002-repository-analysis-engine',
        'adrs/003-static-site-generator-recommendation-engine',
        'adrs/004-diataxis-framework-integration',
        'adrs/005-github-pages-deployment-automation',
        'adrs/006-mcp-tools-api-design',
        'adrs/007-mcp-prompts-and-resources-integration',
        'adrs/008-intelligent-content-population-engine',
        'adrs/009-content-accuracy-validation-framework',
      ],
    },
  ],
};

module.exports = sidebars;
