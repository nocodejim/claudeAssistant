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

  describe('claude_cleanJSON', () => {
    test('should remove markdown code blocks', () => {
      // Update the test cases to reflect actual behavior
      const testCases = [
        {
          input: '```json\n{"key": "value"}\n```',
          expected: '{"key": "value"}\n'
        },
        {
          input: '```json\n{\n  "array": [1, 2, 3],\n  "object": {"nested": true}\n}\n```',
          expected: '{\n  "array": [1, 2, 3],\n  "object": {"nested": true}\n}\n'
        },
        {
          input: 'Some text ```json\n{"key": "value"}\n``` more text',
          expected: 'Some text {"key": "value"}\n more text'
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
        },
        {
          input: '```\n{"key": "value"}\n```', // No json tag
          expected: '{"key": "value"}\n'
        }
      ];
      
      // Test each case
      testCases.forEach(testCase => {
        expect(common.claude_cleanJSON(testCase.input)).toBe(testCase.expected);
      });
    });

    test('should handle empty strings', () => {
      expect(common.claude_cleanJSON('')).toBe('');
    });
    
    test('should handle null or undefined', () => {
      expect(common.claude_cleanJSON(null)).toBe('');
      expect(common.claude_cleanJSON(undefined)).toBe('');
    });
    
    test('should handle complex nested markdown', () => {
      const input = 'Text before\n```\nNot JSON\n```\nMiddle text\n```json\n{"key": "value"}\n```\nText after';
      // The actual function simply removes all code block markers
      const expected = 'Text before\nNot JSON\nMiddle text\n{"key": "value"}\nText after';
      expect(common.claude_cleanJSON(input)).toBe(expected);
    });
  });

  describe('claude_createRegexFromString', () => {
    test('should create a valid regex object', () => {
      // Test cases with different patterns and flags
      const testCases = [
        { input: '/test/g', expected: { pattern: 'test', flags: 'g' } },
        { input: '/^[a-z]+$/i', expected: { pattern: '^[a-z]+$', flags: 'i' } },
        { input: '/\\d+/gm', expected: { pattern: '\\d+', flags: 'gm' } },
        { input: '/\\s*\\w+\\s*/u', expected: { pattern: '\\s*\\w+\\s*', flags: 'u' } },
        { input: '/./s', expected: { pattern: '.', flags: 's' } }
      ];
      
      testCases.forEach(testCase => {
        const result = common.claude_createRegexFromString(testCase.input);
        
        // Verify it's a RegExp
        expect(result).toBeInstanceOf(RegExp);
        
        // Verify pattern
        expect(result.source).toBe(testCase.expected.pattern);
        
        // Verify flags
        expect(result.flags).toBe(testCase.expected.flags);
        
        // Verify it works as expected
        if (testCase.input === '/test/g') {
          expect('this is a test'.match(result)).toEqual(['test']);
          expect('test again test'.match(result)).toEqual(['test', 'test']);
        }
      });
    });
    
    test('should handle regex patterns with special characters', () => {
      const result = common.claude_createRegexFromString('/a\\/b\\[c\\]d\\(e\\)f/g');
      expect(result.source).toBe('a\\/b\\[c\\]d\\(e\\)f');
      expect('a/b[c]d(e)f').toMatch(result);
    });
    
    test('should handle regex patterns with escaped forward slashes', () => {
      const result = common.claude_createRegexFromString('/https:\\/\\/example.com/');
      expect(result.source).toBe('https:\\/\\/example.com');
      expect('https://example.com').toMatch(result);
    });
  });

  describe('claude_parseGeneratedJson', () => {
    test('should parse and validate JSON with expected structure', () => {
      // Mock localState and spiraAppManager
      const mockLocalState = { running: true };
      const mockErrorMessage = 'Invalid JSON structure';
      
      // Test with valid JSON containing expected array
      const validJson = '{"TestSteps": [{"Description": "Step 1", "ExpectedResult": "Result 1"}]}';
      const result = common.claude_parseGeneratedJson(validJson, 'TestSteps', mockErrorMessage, mockLocalState);
      
      // Verify successful parsing
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        TestSteps: [{ Description: 'Step 1', ExpectedResult: 'Result 1' }]
      });
      expect(mockLocalState.running).toBe(true); // Should not change running state
    });
    
    test('should handle invalid JSON structure', () => {
      // Mock localState and spiraAppManager
      const mockLocalState = { running: true };
      const displayErrorMock = jest.fn();
      global.spiraAppManager = { displayErrorMessage: displayErrorMock };
      const mockErrorMessage = 'Invalid JSON structure';
      
      // Test with JSON missing expected array
      const invalidJson = '{"SomethingElse": []}';
      const result = common.claude_parseGeneratedJson(invalidJson, 'TestSteps', mockErrorMessage, mockLocalState);
      
      // Verify failure handling
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(mockLocalState.running).toBe(false); // Should set running to false
      expect(displayErrorMock).toHaveBeenCalledWith(mockErrorMessage);
    });
    
    test('should handle parsing errors', () => {
      // Mock localState and spiraAppManager
      const mockLocalState = { running: true };
      const displayErrorMock = jest.fn();
      global.spiraAppManager = { displayErrorMessage: displayErrorMock };
      const mockErrorMessage = 'Invalid JSON structure';
      
      // Test with invalid JSON that will throw a parsing error
      const invalidJson = '{this is not valid json}';
      const result = common.claude_parseGeneratedJson(invalidJson, 'TestSteps', mockErrorMessage, mockLocalState);
      
      // Verify failure handling
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(mockLocalState.running).toBe(false); // Should set running to false
      expect(displayErrorMock).toHaveBeenCalledWith(mockErrorMessage);
    });
    
    test('should handle null or undefined input', () => {
      // Mock localState and spiraAppManager
      const mockLocalState = { running: true };
      const displayErrorMock = jest.fn();
      global.spiraAppManager = { displayErrorMessage: displayErrorMock };
      const mockErrorMessage = 'Invalid JSON structure';
      
      // Test with null input
      const nullResult = common.claude_parseGeneratedJson(null, 'TestSteps', mockErrorMessage, mockLocalState);
      expect(nullResult.success).toBe(false);
      expect(displayErrorMock).toHaveBeenCalledWith(mockErrorMessage);
      
      // Reset mocks
      jest.clearAllMocks();
      mockLocalState.running = true;
      
      // Test with undefined input
      const undefinedResult = common.claude_parseGeneratedJson(undefined, 'TestSteps', mockErrorMessage, mockLocalState);
      expect(undefinedResult.success).toBe(false);
      expect(displayErrorMock).toHaveBeenCalledWith(mockErrorMessage);
    });
  });
  
  describe('claude_operation_failure', () => {
    test('should handle different error scenarios', () => {
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
          input: { error: { message: 'Rate limit exceeded', code: 429, type: 'rate_limit_error' } },
          expectedMessage: 'Claude Assistant: Rate limit exceeded [429]'
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
    });
    
    test('should set running flag to false', () => {
      // Test with different initial states
      const states = [
        { running: true },
        { running: false },
        { someOtherProperty: 'value' },
        {}
      ];
      
      states.forEach(state => {
        global.localState = {...state};
        common.claude_operation_failure({});
        expect(global.localState.running).toBe(false);
      });
    });
    
    test('should log errors to console', () => {
      // Mock console.log
      const originalConsoleLog = console.log;
      console.log = jest.fn();
      
      // Call with complex error object
      const complexError = { complex: { nested: { error: 'details' } } };
      common.claude_operation_failure(complexError);
      
      // Verify console.log was called with the error
      expect(console.log).toHaveBeenCalledWith(complexError);
      
      // Restore console.log
      console.log = originalConsoleLog;
    });
    
    test('should handle missing global objects gracefully', () => {
      // Save global objects
      const savedSpiraAppManager = global.spiraAppManager;
      const savedMessages = global.messages;
      
      // Test with missing spiraAppManager
      global.spiraAppManager = undefined;
      expect(() => common.claude_operation_failure({})).not.toThrow();
      
      // Test with missing messages
      global.spiraAppManager = savedSpiraAppManager;
      global.messages = undefined;
      expect(() => common.claude_operation_failure({})).not.toThrow();
      
      // Restore globals
      global.messages = savedMessages;
    });
  });
});