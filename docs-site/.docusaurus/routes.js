import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/documcp/',
    component: ComponentCreator('/documcp/', '93c'),
    routes: [
      {
        path: '/documcp/',
        component: ComponentCreator('/documcp/', '329'),
        routes: [
          {
            path: '/documcp/',
            component: ComponentCreator('/documcp/', 'f84'),
            routes: [
              {
                path: '/documcp/adrs/',
                component: ComponentCreator('/documcp/adrs/', '71e'),
                exact: true,
              },
              {
                path: '/documcp/adrs/001-mcp-server-architecture',
                component: ComponentCreator('/documcp/adrs/001-mcp-server-architecture', '067'),
                exact: true,
              },
              {
                path: '/documcp/adrs/002-repository-analysis-engine',
                component: ComponentCreator('/documcp/adrs/002-repository-analysis-engine', '451'),
                exact: true,
              },
              {
                path: '/documcp/adrs/003-static-site-generator-recommendation-engine',
                component: ComponentCreator(
                  '/documcp/adrs/003-static-site-generator-recommendation-engine',
                  'd91',
                ),
                exact: true,
              },
              {
                path: '/documcp/adrs/004-diataxis-framework-integration',
                component: ComponentCreator(
                  '/documcp/adrs/004-diataxis-framework-integration',
                  'c49',
                ),
                exact: true,
              },
              {
                path: '/documcp/adrs/005-github-pages-deployment-automation',
                component: ComponentCreator(
                  '/documcp/adrs/005-github-pages-deployment-automation',
                  'ece',
                ),
                exact: true,
              },
              {
                path: '/documcp/adrs/006-mcp-tools-api-design',
                component: ComponentCreator('/documcp/adrs/006-mcp-tools-api-design', '3af'),
                exact: true,
              },
              {
                path: '/documcp/adrs/007-mcp-prompts-and-resources-integration',
                component: ComponentCreator(
                  '/documcp/adrs/007-mcp-prompts-and-resources-integration',
                  '4dc',
                ),
                exact: true,
              },
              {
                path: '/documcp/adrs/008-intelligent-content-population-engine',
                component: ComponentCreator(
                  '/documcp/adrs/008-intelligent-content-population-engine',
                  '975',
                ),
                exact: true,
              },
              {
                path: '/documcp/adrs/009-content-accuracy-validation-framework',
                component: ComponentCreator(
                  '/documcp/adrs/009-content-accuracy-validation-framework',
                  'c7e',
                ),
                exact: true,
              },
              {
                path: '/documcp/explanation/architecture',
                component: ComponentCreator('/documcp/explanation/architecture', 'd30'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/documcp/how-to/github-pages-deployment',
                component: ComponentCreator('/documcp/how-to/github-pages-deployment', '609'),
                exact: true,
              },
              {
                path: '/documcp/how-to/local-testing',
                component: ComponentCreator('/documcp/how-to/local-testing', 'd85'),
                exact: true,
              },
              {
                path: '/documcp/how-to/prompting-guide',
                component: ComponentCreator('/documcp/how-to/prompting-guide', '00c'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/documcp/how-to/repository-analysis',
                component: ComponentCreator('/documcp/how-to/repository-analysis', '9b6'),
                exact: true,
              },
              {
                path: '/documcp/how-to/troubleshooting',
                component: ComponentCreator('/documcp/how-to/troubleshooting', 'efd'),
                exact: true,
              },
              {
                path: '/documcp/reference/cli',
                component: ComponentCreator('/documcp/reference/cli', 'ea2'),
                exact: true,
              },
              {
                path: '/documcp/reference/configuration',
                component: ComponentCreator('/documcp/reference/configuration', 'fa1'),
                exact: true,
              },
              {
                path: '/documcp/reference/mcp-tools',
                component: ComponentCreator('/documcp/reference/mcp-tools', 'bbd'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/documcp/reference/prompt-templates',
                component: ComponentCreator('/documcp/reference/prompt-templates', '28a'),
                exact: true,
              },
              {
                path: '/documcp/research/',
                component: ComponentCreator('/documcp/research/', '38e'),
                exact: true,
              },
              {
                path: '/documcp/research/domain-1-mcp-architecture/mcp-performance-research',
                component: ComponentCreator(
                  '/documcp/research/domain-1-mcp-architecture/mcp-performance-research',
                  'ae7',
                ),
                exact: true,
              },
              {
                path: '/documcp/research/domain-3-ssg-recommendation/ssg-performance-analysis',
                component: ComponentCreator(
                  '/documcp/research/domain-3-ssg-recommendation/ssg-performance-analysis',
                  '626',
                ),
                exact: true,
              },
              {
                path: '/documcp/research/domain-5-github-deployment/github-pages-security-analysis',
                component: ComponentCreator(
                  '/documcp/research/domain-5-github-deployment/github-pages-security-analysis',
                  '820',
                ),
                exact: true,
              },
              {
                path: '/documcp/research/research-integration-summary-2025-01-14',
                component: ComponentCreator(
                  '/documcp/research/research-integration-summary-2025-01-14',
                  '8e8',
                ),
                exact: true,
              },
              {
                path: '/documcp/research/research-progress-template',
                component: ComponentCreator('/documcp/research/research-progress-template', '6bf'),
                exact: true,
              },
              {
                path: '/documcp/research/research-questions-2025-01-14',
                component: ComponentCreator(
                  '/documcp/research/research-questions-2025-01-14',
                  '10d',
                ),
                exact: true,
              },
              {
                path: '/documcp/tutorials/development-setup',
                component: ComponentCreator('/documcp/tutorials/development-setup', '747'),
                exact: true,
              },
              {
                path: '/documcp/tutorials/first-deployment',
                component: ComponentCreator('/documcp/tutorials/first-deployment', 'aae'),
                exact: true,
              },
              {
                path: '/documcp/tutorials/getting-started',
                component: ComponentCreator('/documcp/tutorials/getting-started', 'd35'),
                exact: true,
                sidebar: 'docs',
              },
              {
                path: '/documcp/',
                component: ComponentCreator('/documcp/', 'fe7'),
                exact: true,
                sidebar: 'docs',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
