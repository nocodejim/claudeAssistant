// Import the module to test
const testCaseDetails = require('../modules/testCaseDetails-module');
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
          text: '{"TestSteps": [{"Description": "Enter username", "ExpectedResult": "Username field accepts input", "SampleData": "testuser"}]}'
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

describe('testCaseDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('generateTestSteps should check permissions before proceeding', () => {
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    testCaseDetails.generateTestSteps();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.PERMISSION_ERROR);
    expect(global.localState.running).toBe(false);
    
    // Test with permission granted
    jest.clearAllMocks();
    global.localState = {};
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    testCaseDetails.generateTestSteps();
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    expect(spiraAppManager.executeApi.mock.calls[0][0]).toBe('claudeAssistant');
    expect(spiraAppManager.executeApi.mock.calls[0][2]).toBe('GET');
  });

  test('generateTestSteps should prevent concurrent operations', () => {
    // Set up localState to simulate a running operation
    global.localState = { running: true };
    
    // Call the function
    testCaseDetails.generateTestSteps();
    
    // Verify warning is displayed
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      constants.messages.WAIT_FOR_OTHER_JOB.replace('{0}', constants.messages.ARTIFACT_TEST_STEPS)
    );
    
    // Verify API is not called
    expect(spiraAppManager.executeApi).not.toHaveBeenCalled();
  });

  test('getTestCaseData_success should handle empty test case', () => {
    // Call the function with null test case
    testCaseDetails.getTestCaseData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.EMPTY_TEST_CASE);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('getTestCaseData_success should proceed with valid test case', () => {
    // Set up state for the test
    global.localState = { action: 'generateTestSteps', running: true };
    
    // Mock test case
    const testCase = {
      TestCaseId: 123,
      Name: 'Test Login',
      Description: '<p>Test the login functionality</p>'
    };
    
    // Call function
    testCaseDetails.getTestCaseData_success(testCase);
    
    // Verify Claude API is called
    expect(claudeAssistant.claude_executeApiRequest).toHaveBeenCalled();
    expect(claudeAssistant.claude_executeApiRequest.mock.calls[0][0]).toContain('Custom global prompt');
    expect(claudeAssistant.claude_executeApiRequest.mock.calls[0][0]).toContain('Custom test step prompt');
    expect(claudeAssistant.claude_executeApiRequest.mock.calls[0][1]).toBe('Test Login. <p>Test the login functionality</p>');
  });

  test('generateTestStepsFromChoice should process valid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateTestSteps', running: true };
    
    // Prepare mock function for claude_cleanJSON
    common.claude_cleanJSON.mockReturnValue('{"TestSteps": [{"Description": "Enter username", "ExpectedResult": "Username accepted", "SampleData": "testuser"}]}');
    
    // Call the function
    testCaseDetails.generateTestStepsFromChoice('{"TestSteps": [...]}');
    
    // Verify test step creation API was called
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    const apiCall = spiraAppManager.executeApi.mock.calls[0];
    expect(apiCall[2]).toBe('POST');
    expect(apiCall[3]).toContain('/test-steps');
    
    // Verify test step data
    const requestBody = JSON.parse(apiCall[4]);
    expect(requestBody.Description).toBe('Enter username');
    expect(requestBody.ExpectedResult).toBe('Username accepted');
    expect(requestBody.SampleData).toBe('testuser');
    expect(requestBody.Position).toBe(1);
  });

  test('generateTestStepsFromChoice should handle invalid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateTestSteps', running: true };
    
    // Prepare mock function for claude_cleanJSON to return invalid JSON
    common.claude_cleanJSON.mockReturnValue('{ invalid json }');
    
    // Call the function
    testCaseDetails.generateTestStepsFromChoice('{ invalid json }');
    
    // Verify error message
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace('{0}', constants.messages.ARTIFACT_TEST_STEPS)
    );
    expect(global.localState.running).toBe(false);
  });

  test('processTestStepResponse correctly calls the test steps generation function', () => {
    // Mock the claude_processApiResponse function
    const originalProcessApi = common.claude_processApiResponse;
    common.claude_processApiResponse = jest.fn((response, successCallback) => {
      // Call the success callback with some test data
      successCallback('{"TestSteps": []}');
    });
    
    // Mock the test steps generation function
    const originalGenerate = testCaseDetails.generateTestStepsFromChoice;
    testCaseDetails.generateTestStepsFromChoice = jest.fn();
    
    // Call the function under test
    testCaseDetails.processTestStepResponse({});
    
    // Verify that the generation function was called
    expect(testCaseDetails.generateTestStepsFromChoice).toHaveBeenCalled();
    
    // Restore original functions
    common.claude_processApiResponse = originalProcessApi;
    testCaseDetails.generateTestStepsFromChoice = originalGenerate;
  });
});
