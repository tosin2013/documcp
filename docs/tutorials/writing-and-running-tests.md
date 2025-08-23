# Writing and Running Tests

Learn how to write effective tests for your documcp code using Jest.

## Test Structure

Tests should follow the AAA pattern:
- **Arrange**: Set up test data and conditions
- **Act**: Execute the code being tested
- **Assert**: Verify the results

## Writing Your First Test

Create a test file with the `.test.ts` extension:

```typescript
// example.test.ts
describe('Example Module', () => {
  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = exampleFunction(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

## Running Tests

Execute all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

## Test Coverage

Generate a coverage report:
```bash
npm test -- --coverage
```

## Best Practices

1. **Test behavior, not implementation**: Focus on what the code does, not how
2. **Keep tests simple**: Each test should verify one thing
3. **Use descriptive names**: Test names should explain what is being tested
4. **Maintain test independence**: Tests should not depend on each other
