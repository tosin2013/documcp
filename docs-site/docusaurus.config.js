module.exports = {
  title: 'DocuMCP',
  tagline: 'Intelligent MCP server for GitHub Pages documentation deployment',
  url: 'https://tosin2013.github.io',
  baseUrl: process.env.DOCUSAURUS_BASE_URL || '/documcp/',
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
          path: '../docs',
          routeBasePath: '/',
          exclude: [
            '**/node_modules/**',
            '**/.docusaurus/**',
            '**/build/**',
            '**/package.json',
            '**/package-lock.json',
          ],
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
  },
};
