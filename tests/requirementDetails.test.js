// Import the module to test
const requirementDetails = require('../modules/requirementDetails-module');
const common = require('../modules/common-module');
const claudeAssistant = require('../modules/claudeAssistant-module');
const constants = require('../modules/constants-module');

// Mock the dependencies
jest.mock('../modules/common-module', () => ({
  claude_cleanJSON: jest.fn(str => str.replace(/```json\n?|```/g, '')),
  claude_operation_failure: jest.fn()
}));

jest.mock('../modules/claudeAssistant-module', () => ({
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
}));

// Setup the global objects needed by the code
global.APP_GUID = 'APP_GUID';
global.localState = {};
global.spiraAppManager = {
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

describe('requirementDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('generateTestCases should check permissions before proceeding', () => {
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    requirementDetails.generateTestCases();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.PERMISSION_ERROR);
    expect(global.localState.running).toBe(false);
    
    // Test with permission granted
    jest.clearAllMocks();
    global.localState = {};
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    requirementDetails.generateTestCases();
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][0]).toBe('claudeAssistant');
    expect(spiraAppManager.executeApi.mock.calls[0][2]).toBe('GET');
  });

  test('generateTestCases should prevent concurrent operations', () => {
    // Set up localState to simulate a running operation
    global.localState = { running: true };
    
    // Call the function
    requirementDetails.generateTestCases();
    
    // Verify warning is displayed
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      constants.messages.WAIT_FOR_OTHER_JOB.replace('{0}', constants.messages.ARTIFACT_TEST_CASES)
    );
    
    // Verify API is not called
    expect(spiraAppManager.executeApi).not.toHaveBeenCalled();
  });

  test('getRequirementData_success should handle empty requirement', () => {
    // Call the function with null requirement
    requirementDetails.getRequirementData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.EMPTY_REQUIREMENT);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('getRequirementData_success should proceed with valid requirement', () => {
    // Set up state for the test
    global.localState = { action: 'generateTestCases', running: true };
    
    // Mock requirement
    const requirement = {
      RequirementId: 123,
      Name: 'Test Requirement',
      Description: '<p>Test Description</p>',
      RequirementTypeId: 1
    };
    
    // Call function
    requirementDetails.getRequirementData_success(requirement);
    
    // Verify API call to get requirement types
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][3]).toContain('requirements/types');
  });

  test('generateTestCasesFromChoice should process valid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateTestCases', running: true };
    
    // Prepare mock function for claude_cleanJSON
    common.claude_cleanJSON.mockReturnValue('{"TestCases": [{"Description": "Login Test", "Input": "Username and password", "ExpectedOutput": "User logged in"}]}');
    
    // Call the function
    requirementDetails.generateTestCasesFromChoice('{"TestCases": [...]}');
    
    // Verify test case creation API was called
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    const apiCall = spiraAppManager.executeApi.mock.calls[0];
    expect(apiCall[2]).toBe('POST');
    expect(apiCall[3]).toContain('/test-cases');
    
    // Verify test case data
    const requestBody = JSON.parse(apiCall[4]);
    expect(requestBody.Name).toBe('Login Test');
    expect(requestBody.TestCaseStatusId).toBe(1);
  });

  test('generateTestCasesFromChoice should handle invalid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateTestCases', running: true };
    
    // Prepare mock function for claude_cleanJSON to return invalid JSON
    common.claude_cleanJSON.mockReturnValue('{ invalid json }');
    
    // Call the function
    requirementDetails.generateTestCasesFromChoice('{ invalid json }');
    
    // Verify error message
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace('{0}', constants.messages.ARTIFACT_TEST_CASES)
    );
    expect(global.localState.running).toBe(false);
  });
});
