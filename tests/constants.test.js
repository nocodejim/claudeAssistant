// Import the module to test
const constants = require('../modules/constants-module');

describe('constants.js', () => {
  test('constants should have the expected structure', () => {
    // Test prompts object
    expect(constants.prompts).toBeDefined();
    expect(constants.prompts.GLOBAL).toBeDefined();
    expect(constants.prompts.REQUIREMENT_GENERATE_TEST_CASES).toBeDefined();
    expect(constants.prompts.REQUIREMENT_GENERATE_TASKS).toBeDefined();
    expect(constants.prompts.REQUIREMENT_GENERATE_SCENARIOS).toBeDefined();
    expect(constants.prompts.REQUIREMENT_GENERATE_RISKS).toBeDefined();
    expect(constants.prompts.RISK_GENERATE_MITIGATIONS).toBeDefined();
    expect(constants.prompts.TEST_CASE_GENERATE_STEPS).toBeDefined();
    expect(constants.prompts.TEST_CASE_GENERATE_REQUIREMENTS).toBeDefined();
    
    // Test artifactType object
    expect(constants.artifactType).toBeDefined();
    expect(constants.artifactType.REQUIREMENT).toBe(1);
    expect(constants.artifactType.TEST_CASE).toBe(2);
    expect(constants.artifactType.TASK).toBe(6);
    expect(constants.artifactType.TEST_STEP).toBe(7);
    expect(constants.artifactType.RISK).toBe(14);
    expect(constants.artifactType.DOCUMENT).toBe(13);
    
    // Test messages object
    expect(constants.messages).toBeDefined();
    // Test specific message strings for placeholders
    expect(constants.messages.WAIT_FOR_OTHER_JOB).toContain('{0}');
    expect(constants.messages.MISSING_SETTING).toContain('{0}');
        expect(constants.messages.WAIT_FOR_OTHER_JOB).toContain('{0}');
    expect(constants.messages.MISSING_SETTING).toContain('{0}');
    
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
      expect(constants.messages[name]).toBeDefined();
    });
  });
  
  test('prompt templates should have valid JSON placeholders', () => {
    // Check that JSON formats in prompts are valid
    const promptsWithJson = [
      constants.prompts.REQUIREMENT_GENERATE_TEST_CASES,
      constants.prompts.REQUIREMENT_GENERATE_TASKS,
      constants.prompts.REQUIREMENT_GENERATE_SCENARIOS,
      constants.prompts.REQUIREMENT_GENERATE_RISKS,
      constants.prompts.RISK_GENERATE_MITIGATIONS,
      constants.prompts.TEST_CASE_GENERATE_STEPS,
      constants.prompts.TEST_CASE_GENERATE_REQUIREMENTS
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
