/**
 * Module wrapper for testCaseDetails.js
 * Exports key functions for testing
 */

// Import dependencies
const common = require('./common-module');
const claudeAssistant = require('./claudeAssistant-module');
const constants = require('./constants-module');

// Main functions from testCaseDetails.js
function generateTestSteps() {
  if (!global.spiraAppManager) return;
  
  var canCreateTestSteps = global.spiraAppManager.canCreateArtifactType(constants.artifactType.TEST_STEP);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_TEST_STEPS)
    );
    return;
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateTestSteps",
    "running": true
  };

  // Don't let users try and create test steps if they do not have permission to do so
  if (!canCreateTestSteps) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current test case artifact
    var testCaseId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/test-cases/' + testCaseId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getTestCaseData_success, 
      common.claude_operation_failure
    );
  }
}

function getTestCaseData_success(remoteTestCase) {
  if (remoteTestCase) {
    // Store for later
    global.localState.remoteTestCase = remoteTestCase;

    // Create the prompt
    var systemPrompt = constants.prompts.GLOBAL;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].global_prompt) {
      systemPrompt = global.SpiraAppSettings[global.APP_GUID].global_prompt;
    }

    var testStepPrompt = constants.prompts.TEST_CASE_GENERATE_STEPS;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].teststep_prompt) {
      testStepPrompt = global.SpiraAppSettings[global.APP_GUID].teststep_prompt;
    }
    
    systemPrompt += ' ' + testStepPrompt;
    
    // Specify the user prompt, use the name and optionally the description
    var userPrompt = remoteTestCase.Name;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].artifact_descriptions === 'True') {
      userPrompt += ". " + global.spiraAppManager.convertHtmlToPlainText(remoteTestCase.Description);
    }

    // Send the Claude request
    claudeAssistant.claude_executeApiRequest(
      systemPrompt, 
      userPrompt, 
      processTestStepResponse, 
      common.claude_operation_failure
    );
  }
  else {
    global.spiraAppManager.displayErrorMessage(constants.messages.EMPTY_TEST_CASE);
    global.localState.running = false;   
  }
}

function processTestStepResponse(response) {
  // Process API response
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
    
    // Process the test steps
    const generation = content.content[0].text;
    generateTestStepsFromChoice(generation);
    
    // Record token usage if available
    if (content.usage && content.usage.total_tokens) {
      global.localState.tokensUse = (global.localState.tokensUse || 0) + content.usage.total_tokens;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
    global.localState.running = false;
  }
}

function generateTestStepsFromChoice(generation) {
  // Implementation simplified for testing purposes
  try {
    const json = common.claude_cleanJSON(generation);
    const jsonObj = JSON.parse(json);
    
    if (jsonObj && jsonObj.TestSteps && Array.isArray(jsonObj.TestSteps)) {
      global.localState.testStepCount = jsonObj.TestSteps.length;
      
      // Process test steps
      for (let i = 0; i < jsonObj.TestSteps.length; i++) {
        const testStep = jsonObj.TestSteps[i];
        const testCaseId = global.spiraAppManager.artifactId;
        
        if (testStep.Description && testStep.ExpectedResult) {
          // Create test step in Spira
          const remoteTestStep = {
            ProjectId: global.spiraAppManager.projectId,
            TestCaseId: testCaseId,
            Description: testStep.Description,
            ExpectedResult: testStep.ExpectedResult,
            SampleData: testStep.SampleData,
            Position: i + 1
          };
          
          const url = 'projects/' + global.spiraAppManager.projectId + 
                     '/test-cases/' + testCaseId + '/test-steps';
          global.spiraAppManager.executeApi(
            'claudeAssistant',
            '7.0',
            'POST',
            url,
            JSON.stringify(remoteTestStep),
            generateTestStepsFromChoice_success,
            common.claude_operation_failure
          );
        }
      }
    } else {
      global.spiraAppManager.displayErrorMessage(
        constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_TEST_STEPS)
      );
      global.localState.running = false;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_TEST_STEPS)
    );
    global.localState.running = false;
  }
}

function generateTestStepsFromChoice_success(remoteTestStep) {
  // Decrement counter and check if we're done
  global.localState.testStepCount--;
  if (global.localState.testStepCount === 0) {
    global.spiraAppManager.hideMessage();
    global.spiraAppManager.reloadForm();
    if (global.spiraAppManager.gridIds && global.spiraAppManager.gridIds.testCaseTestSteps) {
      global.spiraAppManager.reloadGrid(global.spiraAppManager.gridIds.testCaseTestSteps);
    }
    global.spiraAppManager.displaySuccessMessage('Successfully created test steps from Claude Assistant.');
    global.localState.running = false;
  }
}

// Export the functions
module.exports = {
  generateTestSteps,
  getTestCaseData_success,
  processTestStepResponse,
  generateTestStepsFromChoice,
  generateTestStepsFromChoice_success
};