/**
 * Module wrapper for requirementDetails.js
 * Exports key functions for testing
 */

// Import dependencies
const common = require('./common-module');
const claudeAssistant = require('./claudeAssistant-module');
const constants = require('./constants-module');

// Main functions from requirementDetails.js
function generateTestCases() {
  if (!global.spiraAppManager) return;
  
  var canCreateTestCases = global.spiraAppManager.canCreateArtifactType(constants.artifactType.TEST_CASE);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  // IMPORTANT FIX: Direct check of global.localState.running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
    );
    return; // Early return after showing warning
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateTestCases",
    "running": true
  };

  // Don't let users try and create test cases if they do not have permission to do so
  if (!canCreateTestCases) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current requirement artifact (we need to get its name)
    var requirementId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/requirements/' + requirementId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRequirementData_success, 
      common.claude_operation_failure
    );
  }
}

function getRequirementData_success(remoteRequirement) {
  if (remoteRequirement) {
    // Store for later
    global.localState.remoteRequirement = remoteRequirement;

    // Get requirement types to verify the requirement type supports steps
    const url = 'project-templates/' + global.spiraAppManager.projectTemplateId + '/requirements/types';
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRequirementTypes_success, 
      common.claude_operation_failure
    );
  }
  else {
    global.spiraAppManager.displayErrorMessage(constants.messages.EMPTY_REQUIREMENT);
    global.localState.running = false;   
  }
}

function getRequirementTypes_success(remoteRequirementTypes) {
  const remoteRequirement = global.localState.remoteRequirement;
  
  if (remoteRequirementTypes && remoteRequirement) {
    // Create the prompt based on the action
    var systemPrompt = constants.prompts.GLOBAL;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].global_prompt) {
      systemPrompt = global.SpiraAppSettings[global.APP_GUID].global_prompt;
    }

    var actionPrompt = "";
    if (global.localState.action === 'generateTestCases') {
      if (global.SpiraAppSettings && 
          global.SpiraAppSettings[global.APP_GUID] && 
          global.SpiraAppSettings[global.APP_GUID].testcase_prompt) {
        actionPrompt = global.SpiraAppSettings[global.APP_GUID].testcase_prompt;
      } else {
        actionPrompt = constants.prompts.REQUIREMENT_GENERATE_TEST_CASES;
      }
    } else if (global.localState.action === 'generateTasks') {
      // Similar logic for tasks
    } else if (global.localState.action === 'generateSteps') {
      // Check if requirement type supports steps
      var supportsSteps = false;
      for (var i = 0; i < remoteRequirementTypes.length; i++) {
        if (remoteRequirementTypes[i].RequirementTypeId === remoteRequirement.RequirementTypeId) {
          if (remoteRequirementTypes[i].IsSteps) {
            supportsSteps = true;
          }
          break;
        }
      }
      
      if (!supportsSteps) {
        global.spiraAppManager.displayErrorMessage(constants.messages.REQUIREMENT_NOT_STEPS);
        global.localState.running = false;
        return;
      }
      
      if (global.SpiraAppSettings && 
          global.SpiraAppSettings[global.APP_GUID] && 
          global.SpiraAppSettings[global.APP_GUID].bdd_prompt) {
        actionPrompt = global.SpiraAppSettings[global.APP_GUID].bdd_prompt;
      } else {
        actionPrompt = constants.prompts.REQUIREMENT_GENERATE_SCENARIOS;
      }
    } else if (global.localState.action === 'generateRisks') {
      // Add risks prompt
    }
    
    systemPrompt += ' ' + actionPrompt;
    
    // Specify the user prompt, use the name and optionally the description of the artifact
    var userPrompt = remoteRequirement.Name;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].artifact_descriptions === 'True') {
      userPrompt += ". " + global.spiraAppManager.convertHtmlToPlainText(remoteRequirement.Description);
    }

    // Send the Claude request
    claudeAssistant.claude_executeApiRequest(
      systemPrompt, 
      userPrompt, 
      processResponse, 
      common.claude_operation_failure
    );
  }
  else {
    global.spiraAppManager.displayErrorMessage(constants.messages.NO_REQUIREMENT_TYPES);
    global.localState.running = false;
  }
}

function processResponse(response) {
  // Process API response
  // (simplified implementation)
  if (!response) {
    global.spiraAppManager.displayErrorMessage(constants.messages.NO_RESPONSE);
    global.localState.running = false;
    return;
  }

  try {
    // Parse the response
    const content = JSON.parse(response.content);
    
    if (!content.content || !content.content[0] || !content.content[0].text) {
      global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
      global.localState.running = false;
      return;
    }
    
    // Process based on action
    const generation = content.content[0].text;
    
    if (global.localState.action === 'generateTestCases') {
      generateTestCasesFromChoice(generation);
    } else if (global.localState.action === 'generateTasks') {
      // Process tasks
    } else if (global.localState.action === 'generateSteps') {
      // Process steps
    } else if (global.localState.action === 'generateRisks') {
      // Process risks
    } else {
      global.localState.running = false;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
    global.localState.running = false;
  }
}

function generateTestCasesFromChoice(generation) {
  // Implementation simplified for testing purposes
  try {
    const json = common.claude_cleanJSON(generation);
    const jsonObj = JSON.parse(json);
    
    if (jsonObj && jsonObj.TestCases && Array.isArray(jsonObj.TestCases)) {
      global.localState.testCaseCount = jsonObj.TestCases.length;
      
      // Process test cases
      for (let i = 0; i < jsonObj.TestCases.length; i++) {
        const testCase = jsonObj.TestCases[i];
        
        if (testCase.Description) {
          // Store test case details
          global.localState[testCase.Description] = {
            description: testCase.Description,
            input: testCase.Input,
            expectedOutput: testCase.ExpectedOutput
          };
          
          // Create test case in Spira
          const remoteTestCase = {
            Name: testCase.Description,
            TestCaseStatusId: 1,
            TestCaseTypeId: null
          };
          
          const url = 'projects/' + global.spiraAppManager.projectId + '/test-cases';
          global.spiraAppManager.executeApi(
            'claudeAssistant',
            '7.0',
            'POST',
            url,
            JSON.stringify(remoteTestCase),
            generateTestCasesFromChoice_success,
            common.claude_operation_failure
          );
        }
      }
    } else {
      global.spiraAppManager.displayErrorMessage(
        constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
      );
      global.localState.running = false;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
    );
    global.localState.running = false;
  }
}

function generateTestCasesFromChoice_success(remoteTestCase) {
  // Link test case to requirement
  if (remoteTestCase) {
    const requirementId = global.spiraAppManager.artifactId;
    const mapping = {
      RequirementId: requirementId,
      TestCaseId: remoteTestCase.TestCaseId
    };
    
    const url = 'projects/' + global.spiraAppManager.projectId + '/requirements/test-cases';
    global.spiraAppManager.executeApi(
      'claudeAssistant',
      '7.0',
      'POST',
      url,
      JSON.stringify(mapping),
      generateTestCasesFromChoice_success2,
      common.claude_operation_failure
    );
    
    // Create test step if we have stored context
    if (global.localState[remoteTestCase.Name]) {
      const context = global.localState[remoteTestCase.Name];
      
      const testStep = {
        ProjectId: global.spiraAppManager.projectId,
        TestCaseId: remoteTestCase.TestCaseId,
        Description: context.description,
        ExpectedResult: context.expectedOutput,
        SampleData: context.input
      };
      
      const stepUrl = 'projects/' + global.spiraAppManager.projectId + 
                     '/test-cases/' + remoteTestCase.TestCaseId + '/test-steps';
      global.spiraAppManager.executeApi(
        'claudeAssistant',
        '7.0',
        'POST',
        stepUrl,
        JSON.stringify(testStep),
        generateTestCasesFromChoice_success3,
        common.claude_operation_failure
      );
    }
  }
}

function generateTestCasesFromChoice_success2() {
  // Decrement counter and check if we're done
  global.localState.testCaseCount--;
  if (global.localState.testCaseCount === 0) {
    global.spiraAppManager.hideMessage();
    global.spiraAppManager.reloadForm();
    global.spiraAppManager.displaySuccessMessage('Successfully created test cases from Claude Assistant.');
  }
  global.localState.running = false;
}

function generateTestCasesFromChoice_success3(remoteTestStep) {
  // Test step created
  global.localState.running = false;
}
// Add these three functions before the module.exports section

function generateTasks() {
  if (!global.spiraAppManager) return;
  
  var canCreateTestCases = global.spiraAppManager.canCreateArtifactType(constants.artifactType.TEST_CASE);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  // IMPORTANT FIX: Direct check of global.localState.running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
    );
    return; // Early return after showing warning
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateTasks",
    "running": true
  };

  // Don't let users try and create tasks if they do not have permission to do so
  if (!canCreateTasks) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current requirement artifact (we need to get its name)
    var requirementId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/requirements/' + requirementId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRequirementData_success, 
      common.claude_operation_failure
    );
  }
}

function generateSteps() {
  if (!global.spiraAppManager) return;
  
  var canCreateTestCases = global.spiraAppManager.canCreateArtifactType(constants.artifactType.TEST_CASE);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  // IMPORTANT FIX: Direct check of global.localState.running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
    );
    return; // Early return after showing warning
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateSteps",
    "running": true
  };

  // Don't let users try and create requirement steps if they do not have permission to do so
  if (!canModifyRequirements) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current requirement artifact (we need to get its name)
    var requirementId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/requirements/' + requirementId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRequirementData_success, 
      common.claude_operation_failure
    );
  }
}

function generateRisks() {
  if (!global.spiraAppManager) return;
  
  var canCreateTestCases = global.spiraAppManager.canCreateArtifactType(constants.artifactType.TEST_CASE);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  // IMPORTANT FIX: Direct check of global.localState.running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_TEST_CASES)
    );
    return; // Early return after showing warning
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateRisks",
    "running": true
  };

  // Don't let users try and create risks if they do not have permission to do so
  if (!canCreateRisks || !canModifyRequirements) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current requirement artifact (we need to get its name)
    var requirementId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/requirements/' + requirementId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRequirementData_success, 
      common.claude_operation_failure
    );
  }
}

// Updated exports
module.exports = {
  generateTestCases,
  generateTasks,         // Added
  generateSteps,         // Added 
  generateRisks,         // Added
  getRequirementData_success,
  getRequirementTypes_success,
  processResponse,
  generateTestCasesFromChoice,
  generateTestCasesFromChoice_success,
  generateTestCasesFromChoice_success2,
  generateTestCasesFromChoice_success3
};
