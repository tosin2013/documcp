/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  docsSidebar: [
    "index",
    {
      type: "category",
      label: "📚 Tutorials",
      items: [
        "tutorials/getting-started",
        "tutorials/development-setup",
        "tutorials/environment-setup",
        "tutorials/first-deployment",
        "tutorials/user-onboarding",
        "tutorials/memory-workflows",
      ],
    },
    {
      type: "category",
      label: "🔧 How-To Guides",
      items: [
        "how-to/repository-analysis",
        "how-to/github-pages-deployment",
        "how-to/local-testing",
        "how-to/prompting-guide",
        "how-to/usage-examples",
        "how-to/analytics-setup",
        "how-to/custom-domains",
        "how-to/performance-optimization",
        "how-to/seo-optimization",
        "how-to/site-monitoring",
        "how-to/troubleshooting",
      ],
    },
    {
      type: "category",
      label: "📖 Reference",
      items: [
        "reference/api-overview",
        "reference/cli",
        "reference/mcp-tools",
        "reference/deploy-pages",
        "reference/configuration",
        "reference/prompt-templates",
      ],
    },
    {
      type: "category",
      label: "💡 Explanation",
      items: [
        "explanation/architecture",
        "phase-2-intelligence",
        "knowledge-graph",
      ],
    },
    {
      type: "category",
      label: "🔬 Research",
      link: {
        type: "doc",
        id: "research/README",
      },
      items: [
        "research/research-questions-2025-01-14",
        "research/research-integration-summary-2025-01-14",
        "research/research-progress-template",
        "research/domain-1-mcp-architecture/mcp-performance-research",
        "research/domain-3-ssg-recommendation/ssg-performance-analysis",
        "research/domain-5-github-deployment/github-pages-security-analysis",
      ],
    },
    {
      type: "category",
      label: "🏛️ Architecture Decisions",
      link: {
        type: "doc",
        id: "adrs/README",
      },
      items: [
        "adrs/001-mcp-server-architecture",
        "adrs/002-repository-analysis-engine",
        "adrs/003-static-site-generator-recommendation-engine",
        "adrs/004-diataxis-framework-integration",
        "adrs/005-github-pages-deployment-automation",
        "adrs/006-mcp-tools-api-design",
        "adrs/007-mcp-prompts-and-resources-integration",
        "adrs/008-intelligent-content-population-engine",
        "adrs/009-content-accuracy-validation-framework",
      ],
    },
    {
      type: "category",
      label: "🛠️ Development",
      items: ["development/MCP_INSPECTOR_TESTING"],
    },
    {
      type: "category",
      label: "📘 Guides",
      items: [
        "guides/link-validation",
        "guides/playwright-integration",
        "guides/playwright-testing-workflow",
      ],
    },
  ],
};

module.exports = sidebars;
