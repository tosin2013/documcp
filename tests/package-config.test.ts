import { readFile } from 'fs/promises';
import path from 'path';

describe('Package Configuration', () => {
  it('should have a bin field pointing to the correct executable', async () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin.documcp).toBe('dist/index.js');
  });

  it('should have the main field pointing to the same file as bin', async () => {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    expect(packageJson.main).toBe('dist/index.js');
    expect(packageJson.bin.documcp).toBe(packageJson.main);
  });
});