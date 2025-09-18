const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const docusaurusDeps = ['@docusaurus/core', '@docusaurus/preset-classic', '@mdx-js/react', 'react', 'react-dom'];
const foundDeps = docusaurusDeps.filter(dep => pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]);

if (foundDeps.length > 0) {
  console.error('ERROR: Root package.json contains Docusaurus dependencies:', foundDeps);
  console.error('Docusaurus dependencies should only be in docs/package.json');
  process.exit(1);
}

if (pkg.name !== 'documcp') {
  console.error('ERROR: Root package.json name should be documcp, not', pkg.name);
  process.exit(1);
}

console.log('✓ Package.json structure is correct - MCP server only');
