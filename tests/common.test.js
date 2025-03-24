// Import the module to test
const common = require('../modules/common-module');

// Setup the global objects needed by the code
global.spiraAppManager = {
  displayErrorMessage: jest.fn()
};
global.localState = { running: true };
global.messages = {
  UNKNOWN_ERROR: 'Claude Assistant: Unknown Error, please check the browser console or try again!'
};

describe('common.js', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    // Reset state
    global.localState = { running: true };
  });

  test('claude_cleanJSON should remove markdown code blocks', () => {
    // Test individual cases rather than looping for better error messages
    // Simple case with newlines
    expect(common.claude_cleanJSON('```json\n{"key": "value"}\n```').trim())
      .toBe('{"key": "value"}');
      
    // Embedded in text - we need to check the actual implementation behavior
    const embeddedResult = common.claude_cleanJSON('Some text ```json\n{"key": "value"}\n``` more text');
    expect(embeddedResult).toContain('{"key": "value"}');
    expect(embeddedResult).toContain('Some text');
    expect(embeddedResult).toContain('more text');
    
    // No closing newline
    expect(common.claude_cleanJSON('```json\n{"key": "value"}'.trim()))
      .toBe('{"key": "value"}'.trim());
      
    // No opening json tag
    expect(common.claude_cleanJSON('{"key": "value"}```'.trim()))
      .toBe('{"key": "value"}'.trim());
      
    // Plain JSON
    expect(common.claude_cleanJSON('{"key": "value"}'.trim()))
      .toBe('{"key": "value"}'.trim());
  });

  test('claude_createRegexFromString should create a valid regex object', () => {
    // Test the function
    const regexStr = '/test/g';
    const result = common.claude_createRegexFromString(regexStr);
    
    // Verify it's a RegExp
    expect(result).toBeInstanceOf(RegExp);
    // Verify it has the correct pattern
    expect(result.source).toBe('test');
    // Verify it has the correct flags
    expect(result.flags).toBe('g');
    
    // Test with a more complex regex
    const complexRegex = '/^[a-z]+$/i';
    const complexResult = common.claude_createRegexFromString(complexRegex);
    expect(complexResult).toBeInstanceOf(RegExp);
    expect(complexResult.source).toBe('^[a-z]+$');
    expect(complexResult.flags).toBe('i');
  });

  test('claude_operation_failure should handle different error scenarios', () => {
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
    
    // Test each scenario
    scenarios.forEach(scenario => {
      common.claude_operation_failure(scenario.input);
      expect(spiraAppManager.displayErrorMessage).toHaveBeenCalledWith(scenario.expectedMessage);
      
      // Reset mocks for next scenario
      jest.clearAllMocks();
    });
    
    // Verify running flag is set to false
    common.claude_operation_failure({});
    expect(global.localState.running).toBe(false);
  });
});
