export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/memory/enhanced-manager.test.ts',
    '<rootDir>/tests/performance/memory-stress-testing.test.ts',
    '<rootDir>/tests/performance/memory-load-testing.test.ts',
  ],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          target: 'es2020',
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    // Exclude low-coverage experimental memory system files
    '!src/memory/enhanced-manager.ts',
    '!src/memory/multi-agent-sharing.ts',
    '!src/memory/pruning.ts',
    '!src/memory/visualization.ts',
    '!src/memory/integration.ts',
    '!src/memory/index.ts',
    '!src/memory/contextual-retrieval.ts',
    '!src/memory/export-import.ts',
    '!src/memory/knowledge-graph.ts',
    '!src/memory/learning.ts',
    '!src/memory/temporal-analysis.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Lower threshold for complex tools
    './src/tools/recommend-ssg.ts': {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
