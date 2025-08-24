import { testLocalDeployment } from '../../src/tools/test-local-deployment.js';

describe('testLocalDeployment', () => {
  describe('Basic functionality', () => {
    it('should handle invalid SSG parameter', async () => {
      await expect(testLocalDeployment({
        repositoryPath: '/test/path',
        ssg: 'invalid' as any
      })).rejects.toThrow();
    });

    it('should handle missing required parameters', async () => {
      await expect(testLocalDeployment({
        ssg: 'docusaurus'
      } as any)).rejects.toThrow();
    });

    it('should return proper response structure for basic call', async () => {
      // Use current directory which should exist
      const result = await testLocalDeployment({
        repositoryPath: process.cwd(),
        ssg: 'docusaurus',
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      // Should be able to parse the first content item as JSON
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });

    it('should validate SSG enum values', async () => {
      const validSSGs = ['docusaurus', 'jekyll', 'hugo', 'mkdocs', 'eleventy'];
      
      // Test one valid SSG to ensure it works
      const result = await testLocalDeployment({
        repositoryPath: process.cwd(),
        ssg: 'hugo' as any,
        skipBuild: true
      });
      
      expect(result.content).toBeDefined();
      expect(() => JSON.parse(result.content[0].text)).not.toThrow();
    });
  });
});