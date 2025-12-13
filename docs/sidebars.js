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
        "how-to/drift-priority-scoring",
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
        "adrs/adr-0001-mcp-server-architecture",
        "adrs/adr-0002-repository-analysis-engine",
        "adrs/adr-0003-static-site-generator-recommendation-engine",
        "adrs/adr-0004-diataxis-framework-integration",
        "adrs/adr-0005-github-pages-deployment-automation",
        "adrs/adr-0006-mcp-tools-api-design",
        "adrs/adr-0007-mcp-prompts-and-resources-integration",
        "adrs/adr-0008-intelligent-content-population-engine",
        "adrs/adr-0009-content-accuracy-validation-framework",
        "adrs/adr-0010-mcp-resource-pattern-redesign",
        "adrs/adr-0011-ce-mcp-compatibility",
        "adrs/adr-0012-priority-scoring-system-for-documentation-drift",
        "adrs/adr-0013-release-pipeline-and-package-distribution",
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
