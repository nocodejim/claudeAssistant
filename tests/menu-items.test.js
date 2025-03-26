// Import all relevant module wrappers
const requirementDetails = require('../modules/requirementDetails-module');
const testCaseDetails = require('../modules/testCaseDetails-module');
const taskDetails = require('../modules/taskDetails-module');
const riskDetails = require('../modules/riskDetails-module');

describe('Menu Item Activation Test', () => {
  test('all menu handlers should be exported from their respective modules', () => {
    // Check requirement details functions
    expect(typeof requirementDetails.generateTestCases).toBe('function');
    expect(typeof requirementDetails.generateTasks).toBe('function');
    expect(typeof requirementDetails.generateSteps).toBe('function');
    expect(typeof requirementDetails.generateRisks).toBe('function');
    
    // Check test case details functions
    expect(typeof testCaseDetails.generateTestSteps).toBe('function');
    
    // Check task details functions
    expect(typeof taskDetails.generateCode).toBe('function');
    expect(typeof taskDetails.generateCodeWithTests).toBe('function');
    
    // Check risk details functions
    expect(typeof riskDetails.generateMitigations).toBe('function');
  });
  
  test('all function handlers should have proper implementation', () => {
    // Setup global objects needed for testing
    global.spiraAppManager = {
      displayErrorMessage: jest.fn(),
      displayWarningMessage: jest.fn()
    };
    global.localState = { running: true };
    
    // Test that running handlers trigger warning about concurrent operations
    requirementDetails.generateTestCases();
    expect(global.spiraAppManager.displayWarningMessage).toHaveBeenCalled();
    
    jest.clearAllMocks();
    testCaseDetails.generateTestSteps();
    expect(global.spiraAppManager.displayWarningMessage).toHaveBeenCalled();
    
    jest.clearAllMocks();
    taskDetails.generateCode();
    expect(global.spiraAppManager.displayWarningMessage).toHaveBeenCalled();
    
    jest.clearAllMocks();
    riskDetails.generateMitigations();
    expect(global.spiraAppManager.displayWarningMessage).toHaveBeenCalled();
  });
});