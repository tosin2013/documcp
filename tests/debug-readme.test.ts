import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { 
  validateReadmeChecklist, 
  ReadmeChecklistValidator,
  ValidateReadmeChecklistSchema 
} from '../src/tools/validate-readme-checklist';

describe('Debug README Checklist', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
  });

  afterEach(async () => {
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTestReadme(content: string, filename = 'README.md'): Promise<string> {
    const readmePath = path.join(tempDir, filename);
    await fs.writeFile(readmePath, content, 'utf-8');
    return readmePath;
  }

  it('should debug title validation', async () => {
    const goodContent = '# My Project\n\nDescription here';
    const badContent = '## Not a main title\n\nNo main heading';
    
    const goodReadme = await createTestReadme(goodContent, 'good-README.md');
    const badReadme = await createTestReadme(badContent, 'bad-README.md');

    console.log('Created files:');
    console.log('Good README path:', goodReadme);
    console.log('Bad README path:', badReadme);
    
    // Read back the files to verify content
    const readGoodContent = await fs.readFile(goodReadme, 'utf-8');
    const readBadContent = await fs.readFile(badReadme, 'utf-8');
    console.log('Good file content:', JSON.stringify(readGoodContent));
    console.log('Bad file content:', JSON.stringify(readBadContent));
    
    // Test regex directly
    const titleRegex = /^#\s+.+/m;
    console.log('Good content regex test:', titleRegex.test(readGoodContent));
    console.log('Bad content regex test:', titleRegex.test(readBadContent));

    const goodInput = ValidateReadmeChecklistSchema.parse({ readmePath: goodReadme });
    const badInput = ValidateReadmeChecklistSchema.parse({ readmePath: badReadme });
    
    const goodResult = await validateReadmeChecklist(goodInput);
    const badResult = await validateReadmeChecklist(badInput);

    const goodTitleCheck = goodResult.categories['Essential Sections'].results.find((r: any) => r.item.id === 'title');
    const badTitleCheck = badResult.categories['Essential Sections'].results.find((r: any) => r.item.id === 'title');

    console.log('Good title check:', goodTitleCheck);
    console.log('Bad title check:', badTitleCheck);

    expect(goodTitleCheck?.passed).toBe(true);
    expect(badTitleCheck?.passed).toBe(false);
  });
});