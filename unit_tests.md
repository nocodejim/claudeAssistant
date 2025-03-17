# Unit Testing Documentation for Claude Assistant

This document provides instructions on how to set up, run, and maintain unit tests for the Claude Assistant project.

## Overview

Unit testing is a software testing method where individual units of source code are tested to determine whether they are fit for use. For Claude Assistant, we've implemented a testing framework using Jest, a popular JavaScript testing framework.

## Why Unit Testing?

- **Catch bugs early**: Tests help identify issues before they reach production
- **Improve code quality**: Writing testable code often leads to better design
- **Documentation**: Tests serve as living documentation of how your code should work
- **Refactoring confidence**: Tests ensure that changes don't break existing functionality
- **Collaboration**: Tests help team members understand how your code works

## Getting Started

### Setup

To set up the unit testing environment, run the provided setup script:

```bash
# Navigate to the project directory
cd /path/to/claudeAssistant

# Make the script executable (if it's not already)
chmod +x setup_tests.sh

# Run the setup script
./setup_tests.sh
```

The setup script does the following:
1. Creates a `tests` directory
2. Updates the `package.json` to include test scripts
3. Creates a Jest configuration file
4. Creates an initial test file for `riskDetails.js`

### Running Tests

To run all tests:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- tests/riskDetails.test.js
```

To run tests with coverage report:

```bash
npm test -- --coverage
```

## Test File Structure

The tests are organized by feature with a one-to-one correspondence between source files and test files. For example:

- `riskDetails.js` is tested by `tests/riskDetails.test.js`

### Test File Naming Convention

All test files should follow the naming pattern:

```
[filename].test.js
```

## Writing Tests

### Basic Test Structure

```javascript
// Import or require the module you're testing
// For our custom file includes, we use mocks

// Describe block groups related tests
describe('Module or Function Name', () => {
  // Setup that runs before each test
  beforeEach(() => {
    // Initialize or reset variables, mocks, etc.
  });

  // Individual test case
  test('should do something specific', () => {
    // Arrange - set up test data
    
    // Act - perform the action to test
    
    // Assert - verify the result
    expect(actual).toEqual(expected);
  });
});
```

### Mocking Dependencies

Since Claude Assistant uses a custom `file://` include mechanism instead of standard imports, we use Jest's mocking capabilities to handle dependencies.

For example, in our `riskDetails.test.js`:

```javascript
// Mock the common.js, claudeAssistant.js, and constants.js imports
jest.mock('../common.js', () => ({
  claude_operation_failure: jest.fn(/* implementation */)
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({}), { virtual: true });
jest.mock('../constants.js', () => ({}), { virtual: true });
```

### Testing Global Variables and Objects

For functions that rely on global variables or objects (like `localState`), we define these in the global scope of our test file:

```javascript
global.localState = {};
global.spiraAppManager = {
  displayErrorMessage: jest.fn()
};
```

## Special Considerations for Claude Assistant

1. **File Includes**: Claude Assistant uses a custom file include mechanism with `file://` URLs. Our Jest configuration includes a `moduleNameMapper` to handle this.

2. **Global State**: Many functions rely on a global `localState` object. Make sure to reset this between tests.

3. **External Services**: For functions that call the Claude API or other external services, create mock implementations.

## Adding New Tests

As you add more functionality to files like `riskDetails.js`, expand the test file with additional tests. For example:

```javascript
// Add more tests as the file is developed
test('should handle risk mitigations correctly', () => {
  // Setup
  // ...
  
  // Call the function
  // ...
  
  // Assert the results
  // ...
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent of others
2. **Descriptive Names**: Use clear, descriptive names for your tests
3. **Arrange, Act, Assert**: Structure your tests in this pattern
4. **Small, Focused Tests**: Each test should verify one specific behavior
5. **Mock External Dependencies**: Don't rely on external systems for unit tests

## Troubleshooting

### Common Issues

1. **Jest not found**: Make sure you've run the setup script and have Jest installed
2. **File not found errors**: Check file paths in your test imports
3. **Mocking issues**: Verify that your mocks correctly implement the behavior needed for your tests

## Next Steps

1. Add more tests for existing functionality
2. Set up continuous integration to run tests automatically
3. Implement integration tests for cross-module functionality

---

This document is a living resource. Feel free to update it as you learn more about testing or as the project evolves.