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
  docs: [
    'index',
    {
      type: 'category',
      label: 'Tutorials',
      items: ['tutorials/getting-started'],
    },
    {
      type: 'category',
      label: 'How-to Guides',
      items: ['how-to/prompting-guide'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: ['reference/mcp-tools'],
    },
    {
      type: 'category',
      label: 'Explanation',
      items: ['explanation/architecture'],
    },
  ],
};

module.exports = sidebars;
