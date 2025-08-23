// Test environment setup for ESM compatibility

// Mock import.meta for test environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      url: 'file:///test/mock.js'
    }
  },
  configurable: true
});

// Increase timeout for integration tests
jest.setTimeout(30000);