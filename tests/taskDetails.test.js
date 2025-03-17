// Import the module to test
const taskDetails = require('../modules/taskDetails-module');
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
          text: '{"Filename": "app.js", "Code": "console.log(\'Hello World\');"}'
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
global.selectLists = {
  SOURCE_CODE_LANGUAGES: "C#, Java, NodeJS, Python, Ruby, ReactJS, Angular",
  SOURCE_CODE_LANGUAGES_WITH_TESTS: "C#|NUnit, Java|jUnit, NodeJS|Mocha, Python|PyTest, Ruby|Test::Unit, ReactJS|Cypress, Angular|Cypress"
};

describe('taskDetails.js', () => {
  beforeEach(() => {
    // Reset mocks and reset localState
    jest.clearAllMocks();
    global.localState = {};
  });

  test('generateCode should check permissions before proceeding', () => {
    // Test with permission denied
    spiraAppManager.canCreateArtifactType.mockReturnValue(false);
    taskDetails.generateCode();
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.PERMISSION_ERROR);
    
    // Test with permission granted
    jest.clearAllMocks();
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    taskDetails.generateCode();
    expect(spiraAppManager.createComboDialog).toHaveBeenCalled();
    expect(spiraAppManager.createComboDialog.mock.calls[0][0]).toBe('Generate Sample Code');
  });

  test('generateCode should use default languages when none are configured', () => {
    // Mock permissions
    spiraAppManager.canCreateArtifactType.mockReturnValue(true);
    
    // Remove configured languages
    const savedSettings = {...global.SpiraAppSettings};
    delete global.SpiraAppSettings.APP_GUID.code_languages;
    
    // Call function
    taskDetails.generateCode();
    
    // Verify default languages are used
    const expectedLanguages = global.selectLists.SOURCE_CODE_LANGUAGES.split(/,/).map(lang => lang.trim());
    expect(spiraAppManager.createComboDialog.mock.calls[0][3]).toEqual(expectedLanguages);
    
    // Restore settings
    global.SpiraAppSettings = savedSettings;
  });

  test('generateCode_success should handle selection correctly', () => {
    // Test with no selection
    taskDetails.generateCode_success(null);
    expect(spiraAppManager.displayWarningMessage).toHaveBeenCalledWith(
      'You need to choose a source code language from the list!'
    );
    
    // Test with valid selection
    jest.clearAllMocks();
    taskDetails.generateCode_success('JavaScript');
    
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

  test('getTaskData_success should handle empty task', () => {
    // Call the function with null task
    taskDetails.getTaskData_success(null);
    
    // Verify error is displayed
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(constants.messages.EMPTY_TASK);
    
    // Verify running flag is set to false
    expect(global.localState.running).toBe(false);
  });

  test('getTaskData_success should proceed with valid task', () => {
    // Setup
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
    taskDetails.getTaskData_success(task);
    
    // Verify Claude API is called
    expect(claudeAssistant.claude_executeApiRequest).toHaveBeenCalled();
    expect(claudeAssistant.claude_executeApiRequest.mock.calls[0][0]).toContain('JavaScript');
    expect(claudeAssistant.claude_executeApiRequest.mock.calls[0][1]).toBe('Implement Login. <p>Create a login form with validation</p>');
  });

  test('generateCodeFromChoice should process valid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateCode', running: true };
    
    // Prepare mock function for claude_cleanJSON
    common.claude_cleanJSON.mockReturnValue('{"Filename": "app.js", "Code": "console.log(\'Hello World\');"}');
    
    // Call the function
    taskDetails.generateCodeFromChoice('{"Filename": "app.js", "Code": "console.log(\'Hello World\');"}');
    
    // Verify document creation API was called
    expect(spiraAppManager.executeApi).toHaveBeenCalled();
    const apiCall = spiraAppManager.executeApi.mock.calls[0];
    expect(apiCall[2]).toBe('POST');
    expect(apiCall[3]).toContain('/documents/file');
    
    // Verify document data
    const requestBody = JSON.parse(apiCall[4]);
    expect(requestBody.FilenameOrUrl).toBe('app.js');
    expect(requestBody.BinaryData).toBeDefined();
    expect(requestBody.AttachedArtifacts[0].ArtifactId).toBe(123);
    expect(requestBody.AttachedArtifacts[0].ArtifactTypeId).toBe(constants.artifactType.TASK);
  });

  test('generateCodeFromChoice should handle invalid JSON', () => {
    // Setup localState
    global.localState = { action: 'generateCode', running: true };
    
    // Prepare mock function for claude_cleanJSON to return invalid JSON
    common.claude_cleanJSON.mockReturnValue('{ invalid json }');
    
    // Call the function
    taskDetails.generateCodeFromChoice('{ invalid json }');
    
    // Verify error message
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace('{0}', constants.messages.ARTIFACT_SOURCE_CODE)
    );
    expect(global.localState.running).toBe(false);
  });

  test('stringToBase64 should encode strings correctly', () => {
    // Test basic encoding
    expect(taskDetails.stringToBase64('Hello')).toBe('SGVsbG8=');
    
    // Test encoding special characters
    expect(taskDetails.stringToBase64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
  });
});
