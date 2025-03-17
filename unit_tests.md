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

## Files That Need Testing

Based on the project structure, the following files should be prioritized for testing:

### 1. Core Utility Files
- **common.js**: Contains essential utility functions used throughout the application
- **claudeAssistant.js**: Manages Claude API connections and request formatting
- **constants.js**: Defines constants, messages, and prompts used across the application

### 2. Feature-Specific Files
- **riskDetails.js**: Risk management functionality
- **requirementDetails.js**: Requirements management functionality
- **taskDetails.js**: Task management and code generation features
- **testCaseDetails.js**: Test case management features

### Test Priority Order and Rationale

1. **common.js** (High Priority)
   - Contains core utility functions used by all other modules
   - Functions are small and focused, making them easy to test
   - Key functions to test:
     - `claude_createRegexFromString`: Tests should verify proper regex creation
     - `claude_cleanJSON`: Essential for processing Claude API responses
     - `claude_operation_failure`: Error handling function used throughout the app

2. **claudeAssistant.js** (High Priority)
   - Manages the API connection to Claude
   - Key functions to test:
     - `claude_verifyRequiredSettings`: Critical for ensuring API configuration
     - `claude_executeApiRequest`: Core function for API communication
   - Testing this file provides confidence in the application's primary integration point

3. **constants.js** (Medium Priority)
   - While mostly definitions, testing ensures constants remain as expected
   - Verify that message templates have the expected placeholders
   - Confirm that prompt structures remain consistent

4. **taskDetails.js** (High Priority)
   - Complex functionality for generating code and tests
   - Contains critical business logic for task management
   - Strong candidate for testing due to complex functions:
     - `claude_generateCode`
     - `claude_generateCodeWithTests`
     - `claude_processCodeResponse`

5. **testCaseDetails.js** (Medium Priority)
   - Manages test case generation
   - Key functions to test:
     - `claude_generateTestSteps`
     - `claude_processTestStepResponse`

6. **requirementDetails.js** (Medium Priority)
   - Complex, with multiple feature areas
   - Handles requirements, test cases, tasks, steps, and risks
   - Test prioritization should focus on:
     - `claude_generateTestCases`
     - `claude_generateTasks`
     - `claude_generateSteps`
     - `claude_generateRisks`

## Guidelines for Creating Tests

### Testing Approach for Core Files

When testing the core utility files, focus on:

1. **common.js**:
   - Ensure `claude_cleanJSON` correctly handles different JSON formats (with/without code blocks)
   - Verify `claude_createRegexFromString` creates valid regex objects
   - Test `claude_operation_failure` handles different error scenarios

2. **claudeAssistant.js**:
   - Mock `SpiraAppSettings` with different configurations to test `claude_verifyRequiredSettings`
   - Test `claude_executeApiRequest` formats requests correctly
   - Verify the integration with `spiraAppManager.executeRest`

### Testing Approach for Feature Files

For each feature file, the testing pattern should be:

1. **Setup Mocking**:
   - Mock all dependencies (`common.js`, `claudeAssistant.js`, `constants.js`)
   - Set up global objects (`localState`, `spiraAppManager`, etc.)
   - Create mockable content by removing direct `file://` imports

2. **Test File Structure**:
   - Verify the initial state and imports
   - Test event registrations

3. **Feature-Specific Tests**:
   - Test each major function with various inputs
   - Verify error handling
   - Test API response processing
   - Test UI interactions through mocked `spiraAppManager`

### Example Test Structure for taskDetails.js

```javascript
// Setup globals and mocks
global.localState = {};
global.spiraAppManager = {
  registerEvent_menuEntryClick: jest.fn(),
  displayErrorMessage: jest.fn(),
  displayWarningMessage: jest.fn(),
  displaySuccessMessage: jest.fn(),
  executeApi: jest.fn(),
  executeRest: jest.fn(),
  canCreateArtifactType: jest.fn(),
  createComboDialog: jest.fn(),
  hideMessage: jest.fn(),
  reloadForm: jest.fn()
};
global.SpiraAppSettings = {
  "APP_GUID": {
    model: "claude-3-sonnet-20240229",
    temperature: "0.2",
    code_languages: "JavaScript,Python,Java",
    unit_test_framework: "JavaScript|Jest,Python|PyTest,Java|JUnit"
  }
};
global.artifactType = {
  TASK: 6,
  DOCUMENT: 13
};
global.messages = {
  PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
  WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
  ARTIFACT_SOURCE_CODE: "source code"
};

// Mock dependencies
jest.mock('../common.js', () => ({
  claude_cleanJSON: jest.fn(str => str.replace(/```json\n?|```/g, '')),
  claude_operation_failure: jest.fn()
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({
  claude_verifyRequiredSettings: jest.fn(() => true),
  claude_executeApiRequest: jest.fn()
}), { virtual: true });

// Create test cases for each major function
describe('taskDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and global state
    jest.clearAllMocks();
    global.localState = {};
  });

  test('should register menu entry click events on load', () => {
    // Execute the code
    eval(mockableContent);
    
    // Verify registrations
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      "APP_GUID", 
      "generateCode", 
      expect.any(Function)
    );
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      "APP_GUID", 
      "generateCodeWithTests", 
      expect.any(Function)
    );
  });

  // Test code generation flow
  test('claude_generateCode should display dialog when user has permissions', () => {
    // Setup
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    
    // Execute
    eval(mockableContent);
    global.claude_generateCode();
    
    // Verify
    expect(spiraAppManager.createComboDialog).toHaveBeenCalled();
  });

  // Additional tests for other functions...
});
```

## Writing Robust Tests

### Handling the Custom Import System

Since Claude Assistant uses a custom `file://` import mechanism, tests should:

1. Create a modified version of the source file with imports removed:

```javascript
const mockableContent = sourceFileContent
  .replace(/file:\/\/.*\.js/g, '/* Import removed for testing */');
```

2. Use `eval` carefully to execute the file in the test context:

```javascript
eval(mockableContent);
```

3. Provide mock implementations for all imported functions.

### Testing API Functions

For functions that interact with external APIs:

1. Mock the API call function:

```javascript
jest.mock('../claudeAssistant.js', () => ({
  claude_executeApiRequest: jest.fn((systemPrompt, userPrompt, success, failure) => {
    // Simulate successful API call
    success({
      statusCode: 200,
      content: JSON.stringify({
        content: [{ text: '{"TestCases": [{"Description": "Test case 1"}]}' }]
      })
    });
  })
}), { virtual: true });
```

2. Test different API response scenarios:
   - Success responses with valid data
   - Success responses with invalid data
   - Error responses
   - Network failures

### Testing UI Interactions

Since the application uses `spiraAppManager` for UI operations:

1. Create a complete mock of `spiraAppManager`:

```javascript
global.spiraAppManager = {
  displayErrorMessage: jest.fn(),
  displayWarningMessage: jest.fn(),
  displaySuccessMessage: jest.fn(),
  createComboDialog: jest.fn(),
  // ...other methods as needed
};
```

2. Verify that UI methods are called with the correct arguments:

```javascript
expect(spiraAppManager.displaySuccessMessage).toHaveBeenCalledWith(
  expect.stringContaining('Successfully created')
);
```

## Best Practices

1. **Test Isolation**: Each test should be independent of others
2. **Descriptive Names**: Use clear, descriptive names for your tests
3. **Arrange, Act, Assert**: Structure your tests in this pattern
4. **Small, Focused Tests**: Each test should verify one specific behavior
5. **Mock External Dependencies**: Don't rely on external systems for unit tests
6. **Reset State**: Always reset mocks and global state between tests
7. **Test Error Handling**: Ensure proper handling of error conditions
8. **Test Edge Cases**: Consider boundary conditions and unusual inputs

## Troubleshooting

### Common Issues

1. **Jest not found**: Make sure you've run the setup script and have Jest installed
2. **File not found errors**: Check file paths in your test imports
3. **Mocking issues**: Verify that your mocks correctly implement the behavior needed for your tests
4. **Globals not defined**: Ensure all required global objects are defined in your test setup
5. **File import errors**: The custom `file://` import syntax may cause issues; use the mockable content approach

## Next Steps

1. Implement tests for `common.js` and `claudeAssistant.js` first
2. Add tests for feature files in priority order
3. Set up continuous integration to run tests automatically
4. Expand test coverage to include edge cases and error scenarios

---

This document is a living resource. Feel free to update it as you learn more about testing or as the project evolves.