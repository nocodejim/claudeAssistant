// Import the module to test
const claudeAssistant = require('../modules/claudeAssistant-module');

// Setup the global objects needed by the code
global.APP_GUID = 'APP_GUID';
global.SpiraAppSettings = {
  APP_GUID: {
    api_key: 'test-api-key',
    model: 'claude-3-sonnet-20240229',
    temperature: '0.2'
  }
};
global.spiraAppManager = {
  displayErrorMessage: jest.fn(),
  executeRest: jest.fn()
};
global.messages = {
  MISSING_SETTINGS: 'Claude Assistant: You need to populate the system settings to use this application!',
  MISSING_SETTING: 'Claude Assistant: You need to populate the \'{0}\' system setting to use this application!'
};

describe('claudeAssistant.js', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('claude_verifyRequiredSettings should validate required settings', () => {
    // Test with valid settings
    expect(claudeAssistant.claude_verifyRequiredSettings()).toBe(true);
    
    // Test with missing settings object
    const savedSettings = global.SpiraAppSettings;
    global.SpiraAppSettings = {};
    expect(claudeAssistant.claude_verifyRequiredSettings()).toBe(false);
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.MISSING_SETTINGS);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Test with missing API key
    global.SpiraAppSettings = {
      APP_GUID: {
        model: 'claude-3-sonnet-20240229'
      }
    };
    expect(claudeAssistant.claude_verifyRequiredSettings()).toBe(false);
    expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(messages.MISSING_SETTING.replace('{0}', 'API Key'));
    
    // Restore settings
    global.SpiraAppSettings = savedSettings;
  });

  test('claude_executeApiRequest should format and send API requests correctly', () => {
    // Setup test data
    const systemPrompt = 'You are an AI assistant';
    const userPrompt = 'Hello, Claude!';
    const successCallback = jest.fn();
    const failureCallback = jest.fn();
    
    // Call the function
    claudeAssistant.claude_executeApiRequest(systemPrompt, userPrompt, successCallback, failureCallback);
    
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
    expect(headers['x-api-key']).toBe('${anthropicKey}');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    
    // Verify callbacks are passed
    expect(callArgs[7]).toBe(successCallback);
    expect(callArgs[8]).toBe(failureCallback);
  });

  test('claude_executeApiRequest should use custom model and temperature when provided', () => {
    // Setup custom settings
    const savedSettings = global.SpiraAppSettings;
    global.SpiraAppSettings = {
      APP_GUID: {
        api_key: 'test-api-key',
        model: 'claude-3-opus-20240229',
        temperature: '0.7'
      }
    };
    
    // Call the function
    claudeAssistant.claude_executeApiRequest('prompt', 'user', jest.fn(), jest.fn());
    
    // Extract the request body
    const requestBody = JSON.parse(spiraAppManager.executeRest.mock.calls[0][4]);
    
    // Verify custom settings were used
    expect(requestBody.model).toBe('claude-3-opus-20240229');
    expect(requestBody.temperature).toBe(0.7);
    
    // Restore settings
    global.SpiraAppSettings = savedSettings;
  });
});
