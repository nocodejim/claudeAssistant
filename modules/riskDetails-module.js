/**
 * Module wrapper for riskDetails.js
 * Exports key functions for testing
 */

// Import dependencies
const common = require('./common-module');
const claudeAssistant = require('./claudeAssistant-module');
const constants = require('./constants-module');

// Main functions from riskDetails.js
function generateMitigations() {
  if (!global.spiraAppManager) return;
  
  var canModifyRisks = global.spiraAppManager.canModifyArtifactType(constants.artifactType.RISK);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_MITIGATIONS)
    );
    return;
  }

  // Clear local storage and specify the action
  global.localState = {
    "action": "generateMitigations",
    "running": true
  };

  // Don't let users try and create mitigations if they do not have permission to do so
  if (!canModifyRisks) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    global.localState.running = false;
  }
  else {
    // Get the current risk artifact (we need to get its name)
    var riskId = global.spiraAppManager.artifactId;
    var url = 'projects/' + global.spiraAppManager.projectId + '/risks/' + riskId;
    global.spiraAppManager.executeApi(
      'claudeAssistant', 
      '7.0', 
      'GET', 
      url, 
      null, 
      getRiskData_success, 
      common.claude_operation_failure
    );
  }
}

function getRiskData_success(remoteRisk) {
  if (remoteRisk) {
    // Store for later
    global.localState.remoteRisk = remoteRisk;

    // Create the prompt
    var systemPrompt = constants.prompts.GLOBAL;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].global_prompt) {
      systemPrompt = global.SpiraAppSettings[global.APP_GUID].global_prompt;
    }

    if (global.localState.action == 'generateMitigations') {
      if (global.SpiraAppSettings && 
          global.SpiraAppSettings[global.APP_GUID] && 
          global.SpiraAppSettings[global.APP_GUID].mitigation_prompt) {
        systemPrompt += ' ' + global.SpiraAppSettings[global.APP_GUID].mitigation_prompt;
      } else {
        systemPrompt += ' ' + constants.prompts.RISK_GENERATE_MITIGATIONS;
      }
    } else {
      // Unknown action
      global.spiraAppManager.displayErrorMessage(constants.messages.UNKNOWN_CLAUDE_ACTION + global.localState.action);
      global.localState.running = false;
      return;
    }
    
    // Specify the user prompt
    var userPrompt = remoteRisk.Name;
    if (global.SpiraAppSettings && 
        global.SpiraAppSettings[global.APP_GUID] && 
        global.SpiraAppSettings[global.APP_GUID].artifact_descriptions === 'True') {
      userPrompt += ". " + global.spiraAppManager.convertHtmlToPlainText(remoteRisk.Description);
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
    global.spiraAppManager.displayErrorMessage(constants.messages.EMPTY_RISK);
    global.localState.running = false;   
  }
}

function processResponse(response) {
  if (!response) {
    global.spiraAppManager.displayErrorMessage(constants.messages.NO_RESPONSE);
    global.localState.running = false;
    return;
  }

  // Handle error responses
  if (response.statusCode != 200) {
    // Error Message from Claude
    var message = response.statusDescription;
    if (response.content) {
      try {
        var messageObj = JSON.parse(response.content);
        if (messageObj.error && messageObj.error.message) {
          message = messageObj.error.message;
        }
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
    }
    var code = response.statusCode;
    if (message && code != 0) {
      global.spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
    } else {
      global.spiraAppManager.displayErrorMessage(constants.messages.UNKNOWN_ERROR);
      console.log(response);
    }
    global.localState.running = false;
    return;
  }

  // Get the response and parse it
  if (!response.content) {
    global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
    console.log(response);
    global.localState.running = false;
    return;
  }

  // Process the Claude API response
  try {
    var content = JSON.parse(response.content);
    
    if (!content.content || !content.content[0] || !content.content[0].text) {
      global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
      console.log(content);
      global.localState.running = false;
      return;
    }
    
    // Get the generation text
    var generation = content.content[0].text;
    
    // Process based on action
    if (global.localState.action == 'generateMitigations') {
      generateMitigationsFromChoice(generation);
    } else {
      global.localState.running = false;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
    console.log(e);
    global.localState.running = false;
  }
}

function generateMitigationsFromChoice(generation) {
  // Clean and parse the JSON
  var json = common.claude_cleanJSON(generation);
  
  var jsonObj = null;
  try {
    jsonObj = JSON.parse(json);
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_MITIGATIONS)
    );
    console.log(json);
    console.log(e);
    global.localState.running = false;
    return;
  }

  if (jsonObj && jsonObj.Mitigations && Array.isArray(jsonObj.Mitigations)) {
    // Loop through the results and get the mitigations
    global.localState.mitigationCount = jsonObj.Mitigations.length;
    
    for (var i = 0; i < jsonObj.Mitigations.length; i++) {
      // Process each mitigation
      var mitigation = jsonObj.Mitigations[i];
      
      // Get description
      var riskMitigationDescription = mitigation.Description;
      var riskId = global.spiraAppManager.artifactId;
      
      // Create the new mitigation
      if (riskMitigationDescription) {
        var remoteRiskMitigation = {
          RiskId: riskId,
          Description: riskMitigationDescription,
          CreationDate: new Date().toISOString()
        };
        
        // Call API to create mitigation
        const url = 'projects/' + global.spiraAppManager.projectId + '/risks/' + riskId + '/mitigations';
        global.spiraAppManager.executeApi(
          'claudeAssistant',
          '7.0',
          'POST',
          url,
          JSON.stringify(remoteRiskMitigation),
          generateMitigationsFromChoice_success,
          common.claude_operation_failure
        );
      }
    }
  } else {
    global.spiraAppManager.displayErrorMessage(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_MITIGATIONS)
    );
    console.log(json);
    global.localState.running = false;
  }
}

function generateMitigationsFromChoice_success() {
  // Update counter
  global.localState.mitigationCount--;
  
  // Check if all mitigations are created
  if (global.localState.mitigationCount == 0) {
    global.spiraAppManager.hideMessage();
    global.spiraAppManager.reloadForm();
    global.spiraAppManager.displaySuccessMessage('Successfully created risk mitigations from Claude Assistant.');
  }
  
  global.localState.running = false;
}

// Export the functions
module.exports = {
  generateMitigations,
  getRiskData_success,
  processResponse,
  generateMitigationsFromChoice,
  generateMitigationsFromChoice_success
};