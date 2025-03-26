// Import the module to test
const constants = require('../modules/constants-module');

describe('constants.js', () => {
  describe('prompts', () => {
    test('should have all required prompt constants defined', () => {
      // Verify all prompt properties exist
      expect(constants.prompts).toBeDefined();
      expect(constants.prompts.GLOBAL).toBeDefined();
      expect(constants.prompts.REQUIREMENT_GENERATE_TEST_CASES).toBeDefined();
      expect(constants.prompts.REQUIREMENT_GENERATE_TASKS).toBeDefined();
      expect(constants.prompts.REQUIREMENT_GENERATE_SCENARIOS).toBeDefined();
      expect(constants.prompts.REQUIREMENT_GENERATE_RISKS).toBeDefined();
      expect(constants.prompts.RISK_GENERATE_MITIGATIONS).toBeDefined();
      expect(constants.prompts.TEST_CASE_GENERATE_STEPS).toBeDefined();
      expect(constants.prompts.TEST_CASE_GENERATE_REQUIREMENTS).toBeDefined();
    });
    
    test('should have valid global prompt format', () => {
      expect(constants.prompts.GLOBAL).toContain('JSON');
      expect(constants.prompts.GLOBAL).toEqual(expect.stringContaining('business analyst'));
    });
    
    test('should have valid prompt templates with JSON placeholders', () => {
      // Check that JSON formats in prompts follow the expected pattern
      const promptsWithJson = [
        constants.prompts.REQUIREMENT_GENERATE_TEST_CASES,
        constants.prompts.REQUIREMENT_GENERATE_TASKS,
        constants.prompts.REQUIREMENT_GENERATE_SCENARIOS,
        constants.prompts.REQUIREMENT_GENERATE_RISKS,
        constants.prompts.RISK_GENERATE_MITIGATIONS,
        constants.prompts.TEST_CASE_GENERATE_STEPS,
        constants.prompts.TEST_CASE_GENERATE_REQUIREMENTS
      ];
      
      // Each prompt should have JSON template structure
      promptsWithJson.forEach(prompt => {
        // Should have opening and closing braces
        expect(prompt).toContain('{');
        expect(prompt).toContain('}');
        
        // Should have at least one JSON field definition with quotes
        // Regex modified to match escaped quotes in the prompt string
        expect(prompt).toMatch(/\\\"\w+\\\":/);
        
        // Should specify output format
        expect(prompt).toContain('following format');
        
        // Should have escaped quotes for JSON structure
        expect(prompt).toContain('\\"');
      });
    });
    
    test('all prompts should have correct array structure in JSON templates', () => {
      // The prompts that should have array structures
      const arrayPrompts = [
        constants.prompts.REQUIREMENT_GENERATE_TEST_CASES,
        constants.prompts.REQUIREMENT_GENERATE_TASKS,
        constants.prompts.REQUIREMENT_GENERATE_SCENARIOS,
        constants.prompts.REQUIREMENT_GENERATE_RISKS,
        constants.prompts.RISK_GENERATE_MITIGATIONS,
        constants.prompts.TEST_CASE_GENERATE_STEPS,
        constants.prompts.TEST_CASE_GENERATE_REQUIREMENTS
      ];
      
      arrayPrompts.forEach(prompt => {
        // Should contain array notation
        expect(prompt).toMatch(/\[\{|\}\]/);
      });
    });
  });

  describe('artifactType', () => {
    test('should have all artifact types defined with correct values', () => {
      // Verify artifactType object exists
      expect(constants.artifactType).toBeDefined();
      
      // Verify all artifact types have the correct IDs
      expect(constants.artifactType.REQUIREMENT).toBe(1);
      expect(constants.artifactType.TEST_CASE).toBe(2);
      expect(constants.artifactType.TASK).toBe(6);
      expect(constants.artifactType.TEST_STEP).toBe(7);
      expect(constants.artifactType.RISK).toBe(14);
      expect(constants.artifactType.DOCUMENT).toBe(13);
    });
  });

  describe('messages', () => {
    test('should have all message constants defined', () => {
      // Verify messages object exists
      expect(constants.messages).toBeDefined();
      
      // Verify error messages exist
      expect(constants.messages.PERMISSION_ERROR).toBeDefined();
      expect(constants.messages.WAIT_FOR_OTHER_JOB).toBeDefined();
      expect(constants.messages.EMPTY_REQUIREMENT).toBeDefined();
      expect(constants.messages.EMPTY_TEST_CASE).toBeDefined();
      expect(constants.messages.EMPTY_RISK).toBeDefined();
      expect(constants.messages.EMPTY_TASK).toBeDefined();
      expect(constants.messages.REQUIREMENT_NOT_STEPS).toBeDefined();
      expect(constants.messages.UNKNOWN_CLAUDE_ACTION).toBeDefined();
      expect(constants.messages.NO_REQUIREMENT_TYPES).toBeDefined();
      expect(constants.messages.NO_RESPONSE).toBeDefined();
      expect(constants.messages.INVALID_CONTENT).toBeDefined();
      expect(constants.messages.INVALID_CONTENT_NO_GENERATE).toBeDefined();
      expect(constants.messages.UNKNOWN_ERROR).toBeDefined();
      expect(constants.messages.NO_API_KEY_SPECIFIED).toBeDefined();
      expect(constants.messages.NO_TEST_CASE_ID).toBeDefined();
      expect(constants.messages.MISSING_SETTINGS).toBeDefined();
      expect(constants.messages.MISSING_SETTING).toBeDefined();
    });
    
    test('should have template placeholders in appropriate messages', () => {
      // Verify messages with placeholders have {0} in them
      expect(constants.messages.WAIT_FOR_OTHER_JOB).toContain('{0}');
      expect(constants.messages.INVALID_CONTENT_NO_GENERATE).toContain('{0}');
      expect(constants.messages.MISSING_SETTING).toContain('{0}');
    });
    
    test('should have all artifact type names defined in messages', () => {
      // Verify all artifact type names exist in messages
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
        expect(constants.messages[name]).toBeDefined();
        expect(typeof constants.messages[name]).toBe('string');
        expect(constants.messages[name].length).toBeGreaterThan(0);
      });
    });
    
    test('messages should have consistent error message format', () => {
      // All error messages should start with "Claude Assistant: "
      const errorMessages = Object.values(constants.messages).filter(
        msg => msg.startsWith('Claude Assistant:')
      );
      
      // Should be a significant number of error messages
      expect(errorMessages.length).toBeGreaterThan(10);
    });
  });
});