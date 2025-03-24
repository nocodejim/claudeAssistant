/**
 * Module wrapper for taskDetails.js
 * Exports key functions for testing
 */

// Import dependencies
const common = require('./common-module');
const claudeAssistant = require('./claudeAssistant-module');
const constants = require('./constants-module');

// Code prompt templates
const codePrompts = {
  TASK_GENERATE_SOURCE_CODE: 
    "You are a programmer working in the [CODE_LANGUAGE] programming language. Write sample code that implements the following feature in the following format { \"Filename\": [filename for source code], \"Code\": [source code in plain text] }",
  
  TASK_GENERATE_SOURCE_CODE_TESTS: 
    "You are a programmer working in the [CODE_LANGUAGE] programming language. Could you write a sample unit test for the following feature using [CODE_LANGUAGE] and the [TEST_FRAMEWORK] framework in the following format { \"Filename\": [filename for source code], \"Code\": [source code in plain text] }"
};

// String to base64 utility
function stringToBase64(str) {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment (for tests)
    return Buffer.from(str).toString('base64');
  } else {
    // Browser environment
    const binString = String.fromCodePoint(...new TextEncoder().encode(str));
    return btoa(binString);
  }
}

// Main functions from taskDetails.js
function generateCode() {
  if (!global.spiraAppManager) return;
  
  var canCreateDocuments = global.spiraAppManager.canCreateArtifactType(constants.artifactType.DOCUMENT);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_SOURCE_CODE)
    );
    return;
  }

  // Verify permissions
  if (!canCreateDocuments) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    return;
  }

  // Get language options
  var languages = global.selectLists ? global.selectLists.SOURCE_CODE_LANGUAGES : 
    "C#, Java, NodeJS, Python, Ruby, ReactJS, Angular";
    
  if (global.SpiraAppSettings && 
      global.SpiraAppSettings[global.APP_GUID] && 
      global.SpiraAppSettings[global.APP_GUID].code_languages) {
    languages = global.SpiraAppSettings[global.APP_GUID].code_languages;
  }

  if (languages) {
    const optionsNames = languages.split(/,/).map(lang => lang.trim());
    
    // Display dialog to select language
    global.spiraAppManager.createComboDialog(
      'Generate Sample Code', 
      'Please choose the source code language:', 
      'Create', 
      optionsNames, 
      generateCode_success
    );
  } else {
    global.spiraAppManager.displayWarningMessage('No source code languages have been defined for this product!');
  }
}

function generateCode_success(selectedValue) {
  if (!selectedValue) {
    global.spiraAppManager.displayWarningMessage('You need to choose a source code language from the list!');
    return;
  }
  
  // Clear local storage and specify the action/value
  global.localState = {
    "action": "generateCode",
    "running": true,
    "codingLanguage": selectedValue.trim(),
    "generateTests": false,
    "tokensUse": 0
  };

  // Get the current task artifact
  var taskId = global.spiraAppManager.artifactId;
  var url = 'projects/' + global.spiraAppManager.projectId + '/tasks/' + taskId;
  global.spiraAppManager.executeApi(
    'claudeAssistant', 
    '7.0', 
    'GET', 
    url, 
    null, 
    getTaskData_success, 
    common.claude_operation_failure
  );
}

function generateCodeWithTests() {
  if (!global.spiraAppManager) return;
  
  var canCreateDocuments = global.spiraAppManager.canCreateArtifactType(constants.artifactType.DOCUMENT);

  // Verify required settings
  if (!claudeAssistant.claude_verifyRequiredSettings()) {
    return;
  }

  // Make sure call not already running
  if (global.localState && global.localState.running) {
    global.spiraAppManager.displayWarningMessage(
      constants.messages.WAIT_FOR_OTHER_JOB.replace("{0}", constants.messages.ARTIFACT_SOURCE_CODE)
    );
    return;
  }

  // Verify permissions
  if (!canCreateDocuments) {
    global.spiraAppManager.displayErrorMessage(constants.messages.PERMISSION_ERROR);
    return;
  }

  // Get language/framework options
  var languages = global.selectLists ? global.selectLists.SOURCE_CODE_LANGUAGES_WITH_TESTS : 
    "C#|NUnit, Java|jUnit, NodeJS|Mocha, Python|PyTest, Ruby|Test::Unit";
    
  if (global.SpiraAppSettings && 
      global.SpiraAppSettings[global.APP_GUID] && 
      global.SpiraAppSettings[global.APP_GUID].unit_test_framework) {
    languages = global.SpiraAppSettings[global.APP_GUID].unit_test_framework;
  }

  if (languages) {
    const optionsNames = languages.split(/,/).map(option => option.replace('|', ' tested with ').trim());
    
    // Display dialog to select language/framework
    global.spiraAppManager.createComboDialog(
      'Generate Sample Code', 
      'Please choose the source code language and unit test framework:', 
      'Create', 
      optionsNames, 
      generateCodeWithTests_success
    );
  } else {
    global.spiraAppManager.displayWarningMessage('No source code languages with unit test frameworks have been defined for this product!');
  }
}

function generateCodeWithTests_success(selectedValue) {
  if (!selectedValue) {
    global.spiraAppManager.displayWarningMessage('You need to choose a source code and test framework language from the list!');
    return;
  }
  
  // Split the language from the unit test framework
  var items = selectedValue.split('tested with');
  if (items.length < 2) {
    global.spiraAppManager.displayWarningMessage('You need to choose a valid source code and test framework language from the list!');
    return;
  }
  
  var codingLanguage = items[0].trim();
  var testFramework = items[1].trim();
  
  if (!codingLanguage || !testFramework) {
    global.spiraAppManager.displayWarningMessage('You need to choose a valid source code and test framework language from the list!');
    return;
  }
  
  // Clear local storage and specify the action/value
  global.localState = {
    "action": "generateCode",
    "running": true,
    "codingLanguage": codingLanguage,
    "testFramework": testFramework,
    "generateTests": true,
    "tokensUse": 0
  };

  // Get the current task artifact
  var taskId = global.spiraAppManager.artifactId;
  var url = 'projects/' + global.spiraAppManager.projectId + '/tasks/' + taskId;
  global.spiraAppManager.executeApi(
    'claudeAssistant', 
    '7.0', 
    'GET', 
    url, 
    null, 
    getTaskData_success, 
    common.claude_operation_failure
  );
}

function getTaskData_success(remoteTask) {
  if (!remoteTask) {
    global.spiraAppManager.displayErrorMessage(constants.messages.EMPTY_TASK);
    global.localState.running = false;
    return;
  }
  
  // Store for later
  global.localState.remoteTask = remoteTask;

  // Create the prompt
  var systemPrompt = constants.prompts.GLOBAL;
  if (global.SpiraAppSettings && 
      global.SpiraAppSettings[global.APP_GUID] && 
      global.SpiraAppSettings[global.APP_GUID].global_prompt) {
    systemPrompt = global.SpiraAppSettings[global.APP_GUID].global_prompt;
  }

  var codePrompt;
  if (global.localState.action === 'generateCode') {
    if (global.localState.generateTests) {
      codePrompt = codePrompts.TASK_GENERATE_SOURCE_CODE_TESTS
        .replace(/\[CODE_LANGUAGE\]/g, global.localState.codingLanguage)
        .replace(/\[TEST_FRAMEWORK\]/g, global.localState.testFramework);
    } else {
      codePrompt = codePrompts.TASK_GENERATE_SOURCE_CODE
        .replace(/\[CODE_LANGUAGE\]/g, global.localState.codingLanguage);
    }
    systemPrompt += ' ' + codePrompt;
  } else {
    global.spiraAppManager.displayErrorMessage("Claude Assistant: Unknown action - " + global.localState.action);
    global.localState.running = false;
    return;
  }
  
  // Specify the user prompt
  var userPrompt = remoteTask.Name;
  if (global.SpiraAppSettings && 
      global.SpiraAppSettings[global.APP_GUID] && 
      global.SpiraAppSettings[global.APP_GUID].artifact_descriptions === 'True') {
    userPrompt += ". " + global.spiraAppManager.convertHtmlToPlainText(remoteTask.Description);
  }

  // Send the Claude request
  claudeAssistant.claude_executeApiRequest(
    systemPrompt, 
    userPrompt, 
    processCodeResponse, 
    common.claude_operation_failure
  );
}

function processCodeResponse(response) {
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
    
    // Process code generation
    const generation = content.content[0].text;
    
    if (global.localState.generateTests) {
      generateCodeFromChoice(generation);
    } else {
      generateCodeFromChoice(generation);
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(constants.messages.INVALID_CONTENT);
    global.localState.running = false;
  }
}

function generateCodeFromChoice(generation) {
  // Implementation simplified for testing purposes
  try {
    const json = common.claude_cleanJSON(generation);
    const jsonObj = JSON.parse(json);
    
    if (jsonObj && jsonObj.Filename && jsonObj.Code) {
      // Create the source code file
      const taskId = global.spiraAppManager.artifactId;
      const binaryData = stringToBase64(jsonObj.Code);
      
      const remoteDocument = {
        ProjectId: global.spiraAppManager.projectId,
        FilenameOrUrl: jsonObj.Filename,
        BinaryData: binaryData,
        AttachedArtifacts: [{ "ArtifactId": taskId, "ArtifactTypeId": constants.artifactType.TASK }],
        Version: '1.0'
      };

      // API call to create file
      const url = 'projects/' + global.spiraAppManager.projectId + '/documents/file';
      global.spiraAppManager.executeApi(
        'claudeAssistant',
        '7.0',
        'POST',
        url,
        JSON.stringify(remoteDocument),
        generateCodeFromChoice_success,
        common.claude_operation_failure
      );
    } else {
      global.spiraAppManager.displayErrorMessage(
        constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_SOURCE_CODE)
      );
      global.localState.running = false;
    }
  } catch (e) {
    global.spiraAppManager.displayErrorMessage(
      constants.messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", constants.messages.ARTIFACT_SOURCE_CODE)
    );
    global.localState.running = false;
  }
}

function generateCodeFromChoice_success() {
  // Check if we need to generate tests
  if (global.localState.generateTests) {
    // Generate test code
    global.localState.action = 'generateTest';
    global.localState.generateTests = false;
    
    // Call function again to generate test
    getTaskData_success(global.localState.remoteTask);
  } else {
    // Done - show success message
    global.spiraAppManager.hideMessage();
    global.spiraAppManager.reloadForm();
    global.spiraAppManager.displaySuccessMessage(
      'Successfully created source code file from Claude Assistant.'
    );
    global.localState.running = false;
  }
}

function generateTestFromChoice_success() {
  // Done with both code and tests
  global.spiraAppManager.hideMessage();
  global.spiraAppManager.reloadForm();
  global.spiraAppManager.displaySuccessMessage(
    'Successfully created source code file and unit test from Claude Assistant.'
  );
  global.localState.running = false;
}

// Export the functions
module.exports = {
  generateCode,
  generateCode_success,
  generateCodeWithTests,
  generateCodeWithTests_success,
  getTaskData_success,
  processCodeResponse,
  generateCodeFromChoice,
  generateCodeFromChoice_success,
  generateTestFromChoice_success,
  stringToBase64
};
