#!/bin/bash

# Script to create unit tests for Claude Assistant SpiraApp
echo "Creating unit tests for Claude Assistant SpiraApp..."

# Create tests directory if it doesn't exist
mkdir -p tests

# Function to create a test file for common.js
create_common_test() {
  echo "Creating test for common.js..."
  
  cat > tests/common.test.js << 'EOL'
// Setup the global objects needed by the code
global.spiraAppManager = {
  displayErrorMessage: jest.fn()
};
global.messages = {
  UNKNOWN_ERROR: 'Claude Assistant: Unknown Error, please check the browser console or try again!'
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the common.js file content
const commonContent = fs.readFileSync(path.resolve(__dirname, '../common.js'), 'utf8');

// Create a mockable version we can eval without the file:// imports
const mockableContent = commonContent;

describe('common.js', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('claude_cleanJSON should remove markdown code blocks', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test the function
    const testCases = [
      {
        input: '```json\n{"key": "value"}\n```',
        expected: '{"key": "value"}'
      },
      {
        input: 'Some text ```json\n{"key": "value"}\n``` more text',
        expected: 'Some text {"key": "value"} more text'
      },
      {
        input: '```json\n{"key": "value"}',
        expected: '{"key": "value"}'
      },
      {
        input: '{"key": "value"}```',
        expected: '{"key": "value"}'
      },
      {
        input: '{"key": "value"}',
        expected: '{"key": "value"}'
      }
    ];
    
    // Test each case
    testCases.forEach(testCase => {
      expect(global.claude_cleanJSON(testCase.input)).toBe(testCase.expected);
    });
  });

  test('claude_createRegexFromString should create a valid regex object', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test the function
    const regexStr = '/test/g';
    const result = global.claude_createRegexFromString(regexStr);
    
    // Verify it's a RegExp
    expect(result).toBeInstanceOf(RegExp);
    // Verify it has the correct pattern
    expect(result.source).toBe('test');
    // Verify it has the correct flags
    expect(result.flags).toBe('g');
    
    // Test with a more complex regex
    const complexRegex = '/^[a-z]+$/i';
    const complexResult = global.claude_createRegexFromString(complexRegex);
    expect(complexResult).toBeInstanceOf(RegExp);
    expect(complexResult.source).toBe('^[a-z]+$');
    expect(complexResult.flags).toBe('i');
  });

  test('claude_operation_failure should handle different error scenarios', () => {
    // Execute the code
    eval(mockableContent);
    
    // Prepare test scenarios
    const scenarios = [
      {
        input: { message: 'API Error', exceptionType: 500 },
        expectedMessage: 'Claude Assistant: API Error [500]'
      },
      {
        input: { error: { message: 'Invalid request', code: 400 } },
        expectedMessage: 'Claude Assistant: Invalid request [400]'
      },
      {
        input: { someOtherFormat: true },
        expectedMessage: messages.UNKNOWN_ERROR
      }
    ];
    
    // Create a local state variable that's used by the function
    global.localState = { running: true };
    
    // Test each scenario
    scenarios.forEach(scenario => {
      global.claude_operation_failure(scenario.input);
      expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(scenario.expectedMessage);
      
      // Reset mocks for next scenario
      jest.clearAllMocks();
    });
    
    // Verify running flag is set to false
    global.claude_operation_failure({});
    expect(global.localState.running).toBe(false);
  });
});
EOL
  echo "Created tests/common.test.js"
}

# Function to create a test file for claudeAssistant.js
create_claudeAssistant_test() {
  echo "Creating test for claudeAssistant.js..."
  
  cat > tests/claudeAssistant.test.js << 'EOL'
// Setup the global objects needed by the code
global.SpiraAppSettings = {
  APP_GUID: {
    api_key: 'test-api-key',
    model: 'claude-3-sonnet-20240229',
    temperature: '0.2'
  }
};
global.APP_GUID = 'APP_GUID';
global.spiraAppManager = {
  displayErrorMessage: jest.fn(),
  executeRest: jest.fn()
};
global.messages = {
  MISSING_SETTINGS: 'Claude Assistant: You need to populate the system settings to use this application!',
  MISSING_SETTING: 'Claude Assistant: You need to populate the \'{0}\' system setting to use this application!'
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the claudeAssistant.js file content
const claudeAssistantContent = fs.readFileSync(path.resolve(__dirname, '../claudeAssistant.js'), 'utf8');

describe('claudeAssistant.js', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('claude_verifyRequiredSettings should validate required settings', () => {
    // Execute the code
    eval(claudeAssistantContent);
    
    // Test with valid settings
    expect(global.claude_verifyRequiredSettings()).toBe(true);
    
    // Test with missing settings object
    global.SpiraAppSettings = {};
    expect(global.claude_verifyRequiredSettings()).toBe(false);
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.MISSING_SETTINGS);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Test with missing API key
    global.SpiraAppSettings = {
      APP_GUID: {
        model: 'claude-3-sonnet-20240229'
      }
    };
    expect(global.claude_verifyRequiredSettings()).toBe(false);
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.MISSING_SETTING.replace('{0}', 'API Key'));
  });

  test('claude_executeApiRequest should format and send API requests correctly', () => {
    // Execute the code
    eval(claudeAssistantContent);
    
    // Setup test data
    const systemPrompt = 'You are an AI assistant';
    const userPrompt = 'Hello, Claude!';
    const successCallback = jest.fn();
    const failureCallback = jest.fn();
    
    // Call the function
    global.claude_executeApiRequest(systemPrompt, userPrompt, successCallback, failureCallback);
    
    // Verify executeRest was called with correct parameters
    expect(spiraAppManager.executeRest).toHaveBeenCalled();
    
    // Extract the call arguments
    const callArgs = spiraAppManager.executeRest.mock.calls[0];
    
    // Verify APP_GUID was passed
    expect(callArgs[0]).toBe(APP_GUID);
    
    // Verify method is POST
    expect(callArgs[2]).toBe('POST');
    
    // Verify URL is correct
    expect(callArgs[3]).toBe('https://api.anthropic.com/v1/messages');
    
    // Parse the request body and verify it's correctly formatted
    const requestBody = JSON.parse(callArgs[4]);
    expect(requestBody.model).toBe('claude-3-sonnet-20240229');
    expect(requestBody.temperature).toBe(0.2);
    expect(requestBody.messages[0].role).toBe('system');
    expect(requestBody.messages[0].content).toBe(systemPrompt);
    expect(requestBody.messages[1].role).toBe('user');
    expect(requestBody.messages[1].content).toBe(userPrompt);
    
    // Verify headers contain API key placeholder
    const headers = callArgs[6];
    expect(headers['x-api-key']).toBe('${api_key}');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    
    // Verify callbacks are passed
    expect(callArgs[7]).toBe(successCallback);
    expect(callArgs[8]).toBe(failureCallback);
  });

  test('claude_executeApiRequest should use custom model and temperature when provided', () => {
    // Execute the code
    eval(claudeAssistantContent);
    
    // Setup custom settings
    global.SpiraAppSettings = {
      APP_GUID: {
        api_key: 'test-api-key',
        model: 'claude-3-opus-20240229',
        temperature: '0.7'
      }
    };
    
    // Call the function
    global.claude_executeApiRequest('prompt', 'user', jest.fn(), jest.fn());
    
    // Extract the request body
    const requestBody = JSON.parse(spiraAppManager.executeRest.mock.calls[0][4]);
    
    // Verify custom settings were used
    expect(requestBody.model).toBe('claude-3-opus-20240229');
    expect(requestBody.temperature).toBe(0.7);
  });
});
EOL
  echo "Created tests/claudeAssistant.test.js"
}

# Function to create a test file for constants.js
create_constants_test() {
  echo "Creating test for constants.js..."
  
  cat > tests/constants.test.js << 'EOL'
// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the constants.js file content
const constantsContent = fs.readFileSync(path.resolve(__dirname, '../constants.js'), 'utf8');

describe('constants.js', () => {
  test('constants should have the expected structure', () => {
    // Execute the code in this context
    eval(constantsContent);
    
    // Test prompts object
    expect(global.prompts).toBeDefined();
    expect(global.prompts.GLOBAL).toBeDefined();
    expect(global.prompts.REQUIREMENT_GENERATE_TEST_CASES).toBeDefined();
    expect(global.prompts.REQUIREMENT_GENERATE_TASKS).toBeDefined();
    expect(global.prompts.REQUIREMENT_GENERATE_SCENARIOS).toBeDefined();
    expect(global.prompts.REQUIREMENT_GENERATE_RISKS).toBeDefined();
    expect(global.prompts.RISK_GENERATE_MITIGATIONS).toBeDefined();
    expect(global.prompts.TEST_CASE_GENERATE_STEPS).toBeDefined();
    expect(global.prompts.TEST_CASE_GENERATE_REQUIREMENTS).toBeDefined();
    
    // Test artifactType object
    expect(global.artifactType).toBeDefined();
    expect(global.artifactType.REQUIREMENT).toBe(1);
    expect(global.artifactType.TEST_CASE).toBe(2);
    expect(global.artifactType.TASK).toBe(6);
    expect(global.artifactType.TEST_STEP).toBe(7);
    expect(global.artifactType.RISK).toBe(14);
    expect(global.artifactType.DOCUMENT).toBe(13);
    
    // Test messages object
    expect(global.messages).toBeDefined();
    // Test specific message strings for placeholders
    expect(global.messages.WAIT_FOR_OTHER_JOB).toContain('{0}');
    expect(global.messages.MISSING_SETTING).toContain('{0}');
    
    // Test that all artifact type names are defined
    const artifactNames = [
      'ARTIFACT_TEST_CASES',
      'ARTIFACT_TASKS',
      'ARTIFACT_BDD_STEPS',
      'ARTIFACT_RISKS',
      'ARTIFACT_TEST_STEPS',
      'ARTIFACT_REQUIREMENTS',
      'ARTIFACT_MITIGATIONS',
      'ARTIFACT_SOURCE_CODE'
    ];
    artifactNames.forEach(name => {
      expect(global.messages[name]).toBeDefined();
    });
  });
  
  test('prompt templates should have valid JSON placeholders', () => {
    // Execute the code in this context
    eval(constantsContent);
    
    // Check that JSON formats in prompts are valid
    const promptsWithJson = [
      global.prompts.REQUIREMENT_GENERATE_TEST_CASES,
      global.prompts.REQUIREMENT_GENERATE_TASKS,
      global.prompts.REQUIREMENT_GENERATE_SCENARIOS,
      global.prompts.REQUIREMENT_GENERATE_RISKS,
      global.prompts.RISK_GENERATE_MITIGATIONS,
      global.prompts.TEST_CASE_GENERATE_STEPS,
      global.prompts.TEST_CASE_GENERATE_REQUIREMENTS
    ];
    
    // Each prompt should have a valid JSON template structure
    promptsWithJson.forEach(prompt => {
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      // Should have at least one field definition
      expect(prompt).toMatch(/\"\w+\":/);
    });
  });
});
EOL
  echo "Created tests/constants.test.js"
}

# Function to create a test file for requirementDetails.js
create_requirementDetails_test() {
  echo "Creating test for requirementDetails.js..."
  
  cat > tests/requirementDetails.test.js << 'EOL'
// Setup the global objects needed by the code
global.localState = {};
global.APP_GUID = 'APP_GUID';
global.spiraAppManager = {
  registerEvent_menuEntryClick: jest.fn(),
  displayErrorMessage: jest.fn(),
  displayWarningMessage: jest.fn(),
  displaySuccessMessage: jest.fn(),
  executeApi: jest.fn(),
  canCreateArtifactType: jest.fn(),
  canModifyArtifactType: jest.fn(),
  hideMessage: jest.fn(),
  reloadForm: jest.fn(),
  convertHtmlToPlainText: jest.fn(text => text),
  reloadGrid: jest.fn(),
  artifactId: 123,
  projectId: 456,
  projectTemplateId: 789,
  gridIds: {
    requirementSteps: 'steps-grid-id'
  }
};
global.SpiraAppSettings = {
  APP_GUID: {
    global_prompt: 'Custom global prompt',
    testcase_prompt: 'Custom test case prompt',
    task_prompt: 'Custom task prompt',
    bdd_prompt: 'Custom BDD prompt',
    risk_prompt: 'Custom risk prompt',
    artifact_descriptions: 'True'
  }
};
global.artifactType = {
  REQUIREMENT: 1,
  TEST_CASE: 2,
  TASK: 6,
  TEST_STEP: 7,
  RISK: 14,
  DOCUMENT: 13
};
global.messages = {
  PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
  WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
  EMPTY_REQUIREMENT: "Claude Assistant: Fatal Error, empty requirement retrieved from Spira!",
  REQUIREMENT_NOT_STEPS: "Claude Assistant: The current requirement is of a type that does not support BDD steps. Please change the requirement type and try again!",
  NO_REQUIREMENT_TYPES: "Claude Assistant: Fatal error, could not get any requirement types from Spira - please try again!",
  ARTIFACT_TEST_CASES: "test cases",
  ARTIFACT_TASKS: "tasks",
  ARTIFACT_BDD_STEPS: "BDD steps",
  ARTIFACT_RISKS: "risks"
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the requirementDetails.js file content
const requirementDetailsContent = fs.readFileSync(path.resolve(__dirname, '../requirementDetails.js'), 'utf8');

// Create a mockable version we can eval without the file:// imports
const mockableContent = requirementDetailsContent
  .replace(/file:\/\/.*\.js/g, '/* Import removed for testing */');

// Mock imported functions
jest.mock('../common.js', () => ({
  claude_cleanJSON: jest.fn(str => str.replace(/```json\n?|```/g, '')),
  claude_operation_failure: jest.fn()
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({
  claude_verifyRequiredSettings: jest.fn(() => true),
  claude_executeApiRequest: jest.fn((systemPrompt, userPrompt, success, failure) => {
    // Mock a successful response
    success({
      statusCode: 200,
      content: JSON.stringify({
        content: [{ 
          text: '{"TestCases": [{"Description": "Test Login", "Input": "Valid credentials", "ExpectedOutput": "User is logged in"}]}'
        }]
      })
    });
  })
}), { virtual: true });

jest.mock('../constants.js', () => ({
  prompts: {
    GLOBAL: "Default global prompt",
    REQUIREMENT_GENERATE_TEST_CASES: "Default test case prompt",
    REQUIREMENT_GENERATE_TASKS: "Default task prompt",
    REQUIREMENT_GENERATE_SCENARIOS: "Default BDD prompt",
    REQUIREMENT_GENERATE_RISKS: "Default risk prompt"
  }
}), { virtual: true });

describe('requirementDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('should register menu entry click handlers on load', () => {
    // Execute the code
    eval(mockableContent);
    
    // Verify the menu entry click handlers are registered
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateTestCases', expect.any(Function)
    );
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateTasks', expect.any(Function)
    );
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateSteps', expect.any(Function)
    );
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateRisks', expect.any(Function)
    );
  });

  test('claude_generateTestCases should check permissions before proceeding', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    global.claude_generateTestCases();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.PERMISSION_ERROR);
    
    // Test with permission granted
    jest.clearAllMocks();
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    global.claude_generateTestCases();
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][0]).toBe('claudeAssistant');
    expect(spiraAppManager.executeApi.mock.calls[0][2]).toBe('GET');
  });

  test('claude_generateTestCases should prevent concurrent operations', () => {
    // Execute the code
    eval(mockableContent);
    
    // Set up localState to simulate a running operation
    global.localState = { running: true };
    
    // Call the function
    global.claude_generateTestCases();
    
    // Verify warning is displayed
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      messages.WAIT_FOR_OTHER_JOB.replace('{0}', messages.ARTIFACT_TEST_CASES)
    );
    
    // Verify API is not called
    expect(spiraAppManager.executeApi).not.toHaveBeenCalled();
  });

  test('claude_getRequirementData_success should handle empty requirement', () => {
    // Execute the code
    eval(mockableContent);
    
    // Call the function with null requirement
    global.claude_getRequirementData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.EMPTY_REQUIREMENT);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('claude_getRequirementData_success should proceed with valid requirement', () => {
    // Execute the code
    eval(mockableContent);
    
    // Setup
    const { claude_executeApiRequest } = require('../claudeAssistant.js');
    global.localState = { action: 'generateTestCases', running: true };
    
    // Mock requirement
    const requirement = {
      RequirementId: 123,
      Name: 'Test Requirement',
      Description: '<p>Test Description</p>'
    };
    
    // Call function
    global.claude_getRequirementData_success(requirement);
    
    // Verify API call to get requirement types
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][3]).toContain('requirements/types');
  });

  // Additional tests would follow the same pattern for other functions
});
EOL
  echo "Created tests/requirementDetails.test.js"
}

# Function to create a test file for testCaseDetails.js
create_testCaseDetails_test() {
  echo "Creating test for testCaseDetails.js..."
  
  cat > tests/testCaseDetails.test.js << 'EOL'
// Setup the global objects needed by the code
global.localState = {};
global.APP_GUID = 'APP_GUID';
global.spiraAppManager = {
  registerEvent_menuEntryClick: jest.fn(),
  displayErrorMessage: jest.fn(),
  displayWarningMessage: jest.fn(),
  displaySuccessMessage: jest.fn(),
  executeApi: jest.fn(),
  canCreateArtifactType: jest.fn(),
  hideMessage: jest.fn(),
  reloadForm: jest.fn(),
  convertHtmlToPlainText: jest.fn(text => text),
  reloadGrid: jest.fn(),
  artifactId: 123,
  projectId: 456,
  gridIds: {
    testCaseTestSteps: 'test-steps-grid-id'
  }
};
global.SpiraAppSettings = {
  APP_GUID: {
    global_prompt: 'Custom global prompt',
    teststep_prompt: 'Custom test step prompt',
    artifact_descriptions: 'True'
  }
};
global.artifactType = {
  REQUIREMENT: 1,
  TEST_CASE: 2,
  TASK: 6,
  TEST_STEP: 7,
  RISK: 14,
  DOCUMENT: 13
};
global.messages = {
  PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
  WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
  EMPTY_TEST_CASE: "Claude Assistant: Fatal Error, empty test case retrieved from Spira!",
  ARTIFACT_TEST_STEPS: "test steps"
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the testCaseDetails.js file content
const testCaseDetailsContent = fs.readFileSync(path.resolve(__dirname, '../testCaseDetails.js'), 'utf8');

// Create a mockable version we can eval without the file:// imports
const mockableContent = testCaseDetailsContent;

// Mock imported functions
jest.mock('../common.js', () => ({
  claude_cleanJSON: jest.fn(str => str.replace(/```json\n?|```/g, '')),
  claude_operation_failure: jest.fn()
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({
  claude_verifyRequiredSettings: jest.fn(() => true),
  claude_executeApiRequest: jest.fn((systemPrompt, userPrompt, success, failure) => {
    // Mock a successful response
    success({
      statusCode: 200,
      content: JSON.stringify({
        content: [{ 
          text: '{"TestSteps": [{"Description": "Enter username", "ExpectedResult": "Username field accepts input", "SampleData": "testuser"}]}'
        }]
      })
    });
  })
}), { virtual: true });

describe('testCaseDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('should register menu entry click handlers on load', () => {
    // Execute the code
    eval(mockableContent);
    
    // Verify the menu entry click handlers are registered
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateTestSteps', expect.any(Function)
    );
  });

  test('claude_generateTestSteps should check permissions before proceeding', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    global.claude_generateTestSteps();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.PERMISSION_ERROR);
    
    // Test with permission granted
    jest.clearAllMocks();
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    global.claude_generateTestSteps();
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][0]).toBe('claudeAssistant');
    expect(spiraAppManager.executeApi.mock.calls[0][2]).toBe('GET');
  });

  test('claude_generateTestSteps should prevent concurrent operations', () => {
    // Execute the code
    eval(mockableContent);
    
    // Set up localState to simulate a running operation
    global.localState = { running: true };
    
    // Call the function
    global.claude_generateTestSteps();
    
    // Verify warning is displayed
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      messages.WAIT_FOR_OTHER_JOB.replace('{0}', messages.ARTIFACT_TEST_STEPS)
    );
    
    // Verify API is not called
    expect(spiraAppManager.executeApi).not.toHaveBeenCalled();
  });

  test('claude_getTestCaseData_success should handle empty test case', () => {
    // Execute the code
    eval(mockableContent);
    
    // Call the function with null test case
    global.claude_getTestCaseData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.EMPTY_TEST_CASE);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('claude_getTestCaseData_success should proceed with valid test case', () => {
    // Execute the code
    eval(mockableContent);
    
    // Setup
    const { claude_executeApiRequest } = require('../claudeAssistant.js');
    global.localState = { action: 'generateTestSteps', running: true };
    
    // Mock test case
    const testCase = {
      TestCaseId: 123,
      Name: 'Test Login',
      Description: '<p>Test the login functionality</p>'
    };
    
    // Call function
    global.claude_getTestCaseData_success(testCase);
    
    // Verify Claude API is called
    expect(claude_executeApiRequest).toHaveBeenCalled();
    expect(claude_executeApiRequest.mock.calls[0][0]).toContain('Custom global prompt');
    expect(claude_executeApiRequest.mock.calls[0][0]).toContain('Custom test step prompt');
    expect(claude_executeApiRequest.mock.calls[0][1]).toBe('Test Login. <p>Test the login functionality</p>');
  });

  // Additional tests would follow the same pattern for other functions
});
EOL
  echo "Created tests/testCaseDetails.test.js"
}

# Function to create a test file for taskDetails.js
create_taskDetails_test() {
  echo "Creating test for taskDetails.js..."
  
  cat > tests/taskDetails.test.js << 'EOL'
// Setup the global objects needed by the code
global.localState = {};
global.APP_GUID = 'APP_GUID';
global.spiraAppManager = {
  registerEvent_menuEntryClick: jest.fn(),
  displayErrorMessage: jest.fn(),
  displayWarningMessage: jest.fn(),
  displaySuccessMessage: jest.fn(),
  executeApi: jest.fn(),
  canCreateArtifactType: jest.fn(),
  createComboDialog: jest.fn(),
  hideMessage: jest.fn(),
  reloadForm: jest.fn(),
  convertHtmlToPlainText: jest.fn(text => text),
  artifactId: 123,
  projectId: 456
};
global.SpiraAppSettings = {
  APP_GUID: {
    global_prompt: 'Custom global prompt',
    code_languages: 'JavaScript, Python, Java',
    unit_test_framework: 'JavaScript|Jest, Python|PyTest, Java|JUnit',
    artifact_descriptions: 'True'
  }
};
global.artifactType = {
  REQUIREMENT: 1,
  TEST_CASE: 2,
  TASK: 6,
  TEST_STEP: 7,
  RISK: 14,
  DOCUMENT: 13
};
global.messages = {
  PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
  WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
  EMPTY_TASK: "Claude Assistant: Fatal Error, empty task retrieved from Spira!",
  ARTIFACT_SOURCE_CODE: "source code",
  UNIT_TEST_CODE: "unit test code"
};
global.selectLists = {
  SOURCE_CODE_LANGUAGES: "C#, Java, NodeJS, Python, Ruby, ReactJS, Angular",
  SOURCE_CODE_LANGUAGES_WITH_TESTS: "C#|NUnit, Java|jUnit, NodeJS|Mocha, Python|PyTest, Ruby|Test::Unit, ReactJS|Cypress, Angular|Cypress"
};

// Import functions to test
const fs = require('fs');
const path = require('path');

// Read the taskDetails.js file content
const taskDetailsContent = fs.readFileSync(path.resolve(__dirname, '../taskDetails.js'), 'utf8');

// Create a mockable version we can eval without the file:// imports
const mockableContent = taskDetailsContent;

// Mock global stringToBase64 function
global.stringToBase64 = jest.fn(str => Buffer.from(str).toString('base64'));

// Mock imported functions
jest.mock('../common.js', () => ({
  claude_cleanJSON: jest.fn(str => str.replace(/```json\n?|```/g, '')),
  claude_operation_failure: jest.fn()
}), { virtual: true });

jest.mock('../claudeAssistant.js', () => ({
  claude_verifyRequiredSettings: jest.fn(() => true),
  claude_executeApiRequest: jest.fn((systemPrompt, userPrompt, success, failure) => {
    // Mock a successful response
    success({
      statusCode: 200,
      content: JSON.stringify({
        content: [{ 
          text: '{"Filename": "app.js", "Code": "console.log(\'Hello World\');"}'
        }]
      })
    });
  })
}), { virtual: true });

describe('taskDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('should register menu entry click handlers on load', () => {
    // Execute the code
    eval(mockableContent);
    
    // Verify the menu entry click handlers are registered
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateCode', expect.any(Function)
    );
    expect(spiraAppManager.registerEvent_menuEntryClick).toHaveBeenCalledWith(
      APP_GUID, 'generateCodeWithTests', expect.any(Function)
    );
  });

  test('claude_generateCode should check permissions before proceeding', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    global.claude_generateCode();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.PERMISSION_ERROR);
    
    // Test with permission granted
    jest.clearAllMocks();
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    global.claude_generateCode();
    expect(spiraAppManager.createComboDialog).toHaveBeenCalled();
    expect(spiraAppManager.createComboDialog.mock.calls[0][0]).toBe('Generate Sample Code');
  });

  test('claude_generateCode should use default languages when none are configured', () => {
    // Execute the code
    eval(mockableContent);
    
    // Mock permissions
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    
    // Remove configured languages
    const savedSettings = {...global.SpiraAppSettings};
    delete global.SpiraAppSettings.APP_GUID.code_languages;
    
    // Call function
    global.claude_generateCode();
    
    // Verify default languages are used
    expect(spiraAppManager.createComboDialog.mock.calls[0][3]).toEqual(
      selectLists.SOURCE_CODE_LANGUAGES.split(/,/)
    );
    
    // Restore settings
    global.SpiraAppSettings = savedSettings;
  });

  test('claude_generateCode_success should handle selection correctly', () => {
    // Execute the code
    eval(mockableContent);
    
    // Test with no selection
    global.claude_generateCode_success(null);
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      'You need to choose a source code language from the list!'
    );
    
    // Test with valid selection
    jest.clearAllMocks();
    global.claude_generateCode_success('JavaScript');
    
    // Verify localState is set correctly
    expect(global.localState).toEqual({
      action: 'generateCode',
      running: true,
      codingLanguage: 'JavaScript',
      generateTests: false,
      tokensUse: 0
    });
    
    // Verify API call to get task data
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][3]).toContain('tasks/123');
  });

  test('claude_getTaskData_success should handle empty task', () => {
    // Execute the code
    eval(mockableContent);
    
    // Call the function with null task
    global.claude_getTaskData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.EMPTY_TASK);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('claude_getTaskData_success should proceed with valid task', () => {
    // Execute the code
    eval(mockableContent);
    
    // Setup
    const { claude_executeApiRequest } = require('../claudeAssistant.js');
    global.localState = {
      action: 'generateCode',
      running: true,
      codingLanguage: 'JavaScript',
      generateTests: false,
      tokensUse: 0
    };
    
    // Mock task
    const task = {
      TaskId: 123,
      Name: 'Implement Login',
      Description: '<p>Create a login form with validation</p>'
    };
    
    // Call function
    global.claude_getTaskData_success(task);
    
    // Verify Claude API is called
    expect(claude_executeApiRequest).toHaveBeenCalled();
    expect(claude_executeApiRequest.mock.calls[0][0]).toContain('JavaScript');
    expect(claude_executeApiRequest.mock.calls[0][1]).toBe('Implement Login. <p>Create a login form with validation</p>');
  });

  // Additional tests would follow the same pattern for other functions
});
EOL
  echo "Created tests/taskDetails.test.js"
}

# Main execution
create_common_test
create_claudeAssistant_test
create_constants_test
create_requirementDetails_test
create_testCaseDetails_test
create_taskDetails_test

echo "All unit tests have been created successfully!"
echo "You can now run the tests with 'npm test'"
