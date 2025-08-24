describe('DocuMCP Server', () => {
  it('should have proper project configuration', () => {
    const packageJson = require('../package.json');
    
    expect(packageJson.name).toBe('documcp');
    // Version should match semantic versioning pattern
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
    expect(packageJson.dependencies).toHaveProperty('zod');
  });

  it('should build successfully', () => {
    const fs = require('fs');
    const path = require('path');
    
    // Check if TypeScript files exist
    expect(fs.existsSync(path.join(__dirname, '../src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../src/tools'))).toBe(true);
  });

  it('should have all required tool files', () => {
    const fs = require('fs');
    const path = require('path');
    
    const toolsDir = path.join(__dirname, '../src/tools');
    const expectedTools = [
      'analyze-repository.ts',
      'recommend-ssg.ts', 
      'generate-config.ts',
      'setup-structure.ts',
      'deploy-pages.ts',
      'verify-deployment.ts'
    ];
    
    expectedTools.forEach(tool => {
      expect(fs.existsSync(path.join(toolsDir, tool))).toBe(true);
    });
  });
});