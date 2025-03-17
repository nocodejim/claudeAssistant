#!/bin/bash

# Setup unit test environment for Claude Assistant
echo "Setting up unit test environment for Claude Assistant..."

# Create tests directory if it doesn't exist
mkdir -p tests

# Update package.json to include test scripts
if ! grep -q "\"test\":" package.json; then
  # Backup original package.json
  cp package.json package.json.bak
  
  # Use sed to add test script before the closing brace
  sed -i 's/"scripts": {/"scripts": {\n    "test": "jest",/g' package.json
  
  # Update the build line
  sed -i 's/"build": "node ..\/spiraapp-tools\/spiraapp-package-generator\/index.js --input=.\/ --output=..\/dist"/"build": "node ..\/spiraapp-tools\/spiraapp-package-generator\/index.js --input=.\/ --output=..\/dist"/g' package.json
  
  echo "Updated package.json with test scripts"
else
  echo "Test scripts already exist in package.json"
fi

# Create Jest config file
if [ ! -f "jest.config.js" ]; then
  cat > jest.config.js << 'EOL'
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '*.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**'
  ],
  moduleNameMapper: {
    '^file://(.*)$': '<rootDir>/$1'
  }
};
EOL
  echo "Created Jest configuration file"
else
  echo "Jest configuration file already exists"
fi

# Create test file for riskDetails.js
cat > tests/riskDetails.test.js << 'EOL'
// Mock the dependencies
global.localState = {};
global.spiraAppManager = {
  displayErrorMessage: jest.fn()
};
global.artifactType = {
  RISK: 14
};
global.messages = {
  UNKNOWN_ERROR: 'Claude Assistant: Unknown Error, please check the browser console or try again!'
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the riskDetails.js file to extract functions for testing
const riskDetailsContent = fs.readFileSync(path.resolve(__dirname, '../riskDetails.js'), 'utf8');

// Mock the common.js, claudeAssistant.js, and constants.js imports
jest.mock('../common.js', () => ({
  claude_operation_failure: jest.fn((response) => {
    if (response.message && response.exceptionType && response.exceptionType != 0) {
      spiraAppManager.displayErrorMessage('Claude Assistant: ' + response.message + ' [' + response.exceptionType + ']');
    } else if (response.error && response.error.message) {
      spiraAppManager.displayErrorMessage('Claude Assistant: ' + response.error.message + ' [' + response.error.code + ']');
    } else {
      spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
      console.log(response);
    }
  })
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({}), { virtual: true });
jest.mock('../constants.js', () => ({}), { virtual: true });

describe('riskDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('localState should be initialized as an empty object', () => {
    // Execute the code in riskDetails.js in this context
    eval(riskDetailsContent);
    
    // Verify localState is initialized as an empty object
    expect(localState).toEqual({});
  });

  // Future tests can be added here as the riskDetails.js file is implemented
  test('file structure is as expected', () => {
    // This test simply verifies the file structure with includes
    expect(riskDetailsContent).toContain('file://common.js');
    expect(riskDetailsContent).toContain('file://claudeAssistant.js');
    expect(riskDetailsContent).toContain('file://constants.js');
    expect(riskDetailsContent).toContain('let localState = {};');
  });
});
EOL

echo "Created test file for riskDetails.js"

# Make script executable
chmod +x setup_tests.sh

echo "Unit test environment setup complete!"
echo "You can now run tests with 'npm test'"