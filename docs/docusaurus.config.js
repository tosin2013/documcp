const packageJson = require('../package.json');

module.exports = {
  title: 'DocuMCP',
  tagline: `Intelligent documentation deployment MCP server v${packageJson.version} with AI-powered repository analysis and Diataxis-compliant content generation`,
  url: 'https://tosin2013.github.io',
  baseUrl: '/documcp/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'tosin2013',
  projectName: 'documcp',

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/tosin2013/documcp/tree/main/docs/',
          routeBasePath: '/',
          path: '.',
          exclude: ['**/node_modules/**', '**/.*', '**/*.{js,jsx,ts,tsx}'],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'DocuMCP',
      items: [
        {
          type: 'doc',
          docId: 'index',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/tosin2013/documcp',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/tutorials/getting-started-with-documcp',
            },
            {
              label: 'API Reference',
              to: '/reference/api-reference',
            },
            {
              label: 'Architecture',
              to: '/adrs/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/tosin2013/documcp/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/tosin2013/documcp/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/tosin2013/documcp',
            },
            {
              label: 'Model Context Protocol',
              href: 'https://modelcontextprotocol.io/',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} DocuMCP. Built with Docusaurus.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml'],
    },
  },
};
