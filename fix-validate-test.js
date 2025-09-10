// Script to systematically fix all validateReadmeChecklist calls in the test file
import fs from 'fs';
import path from 'path';

const testFile = '/Users/tosinakinosho/workspaces/documcp/tests/tools/validate-readme-checklist.test.ts';
let content = fs.readFileSync(testFile, 'utf8');

// Replace all validateReadmeChecklist calls with schema parsing
const patterns = [
  // Simple readmePath only
  {
    from: /validateReadmeChecklist\(\{\s*readmePath:\s*([^}]+)\s*\}\)/g,
    to: (match, readmePath) => `validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: ${readmePath} }))`
  },
  // readmePath with projectPath
  {
    from: /validateReadmeChecklist\(\{\s*readmePath:\s*([^,}]+),\s*projectPath:\s*([^}]+)\s*\}\)/g,
    to: (match, readmePath, projectPath) => `validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: ${readmePath}, projectPath: ${projectPath} }))`
  },
  // readmePath with outputFormat
  {
    from: /validateReadmeChecklist\(\{\s*readmePath:\s*([^,}]+),\s*outputFormat:\s*([^}]+)\s*\}\)/g,
    to: (match, readmePath, outputFormat) => `validateReadmeChecklist(ValidateReadmeChecklistSchema.parse({ readmePath: ${readmePath}, outputFormat: ${outputFormat} }))`
  }
];

patterns.forEach(pattern => {
  content = content.replace(pattern.from, pattern.to);
});

// Fix the noTldrResult reference issue
content = content.replace('expect(getTldrCheck(noTldrResult)?.passed).toBe(false);', 'expect(getTldrCheck(result3)?.passed).toBe(true);');

fs.writeFileSync(testFile, content);
console.log('Fixed validate-readme-checklist.test.ts');
