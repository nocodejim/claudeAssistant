// Include global constants

// Define constants similar to requirementDetails.js
const messages = {
    PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
    WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
    EMPTY_TEST_CASE: "Claude Assistant: Fatal Error, empty test case retrieved from Spira!",
    NO_RESPONSE: "Claude Assistant: Fatal error, no response received from Claude - please try again!",
    INVALID_CONTENT: "Claude Assistant: Invalid content received from Claude, not able to proceed.",
    INVALID_CONTENT_NO_GENERATE: "Claude Assistant: could not generate {0} from Claude's response - please try again.",
    UNKNOWN_ERROR: "Claude Assistant: Unknown Error, please check the browser console or try again!",
    MISSING_SETTINGS: "Claude Assistant: You need to populate the system settings to use this application!",
    MISSING_SETTING: "Claude Assistant: You need to populate the '{0}' system setting to use this application!",
    ARTIFACT_TEST_STEPS: "test steps"
};

const artifactType = {
    REQUIREMENT: 1,
    TEST_CASE: 2,
    TASK: 6,
    TEST_STEP: 7,
    RISK: 14,
    DOCUMENT: 13
};

let localState = {};

// Register menu entry click events
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateTestSteps", claude_generateTestSteps);

// Verify required settings - similar to the function in requirementDetails.js
function claude_verifyRequiredSettings() {
    console.log("Verifying settings...");
    
    // Check if SpiraAppSettings exists for this app
    if (!SpiraAppSettings[APP_GUID]) {
        console.error("No settings found for APP_GUID:", APP_GUID);
        spiraAppManager.displayErrorMessage(messages.MISSING_SETTINGS);
        return false;
    }
    
    console.log("All settings for this APP_GUID:", SpiraAppSettings[APP_GUID]);
    
    // We don't need to check for API key directly
    // The system will handle the substitution of ${anthropicKey}
    
    return true;
}

// API execution function - similar to the function in requirementDetails.js
function claude_executeApiRequest(systemPrompt, userPrompt, success, failure) {
    console.log("Executing Claude API Request");
    
    // Specify the model
    var model = "claude-3-sonnet-20240229"; // Default model
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].model) {
        model = SpiraAppSettings[APP_GUID].model;
    }

    // Specify the temperature
    var temperature = 0.2; // Default temperature
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].temperature && 
        parseFloat(SpiraAppSettings[APP_GUID].temperature)) {
        temperature = parseFloat(SpiraAppSettings[APP_GUID].temperature);
    }

    console.log("Using model:", model, "with temperature:", temperature);
    
    // Request body
    var body = {
        "model": model,
        "max_tokens": 4096,
        "temperature": temperature,
        "messages": [
            {
                "role": "user",
                "content": userPrompt
            }
        ],
        "system": systemPrompt
    };

    console.log("API Request payload:", body);

    // Headers using template substitution for API key
    var headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-agent": "Spira",
        "anthropic-version": "2023-06-01",
        "x-api-key": "${anthropicKey}"  // Template substitution
    };
    
    console.log("Making API call to Claude");
    
    spiraAppManager.executeRest(
        APP_GUID, 
        'claudeAssistant', 
        'POST', 
        "https://api.anthropic.com/v1/messages", 
        JSON.stringify(body), 
        null, 
        headers, 
        function(response) {
            console.log("API call response received");
            success(response);
        }, 
        function(error) {
            console.error("API call failed:", error);
            failure(error);
        }
    );
}

// Error handling function - similar to the function in requirementDetails.js
function claude_operation_failure(response) {
    localState.running = false;
    if (response.message && response.exceptionType && response.exceptionType != 0) {
        //Error Message from Spira
        var message = response.message;
        var type = response.exceptionType;
        spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + type + ']');
    }
    else if (response.error && response.error.message) {
        //Error Message from Claude
        var message = response.error.message;
        var type = response.error.type;
        var code = response.error.code;
        spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
    }
    else {
        spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
        console.log(response);
    }
}

// Main function to generate test steps
function claude_generateTestSteps() {
    console.log("Starting test steps generation...");
    
    var canCreateTestSteps = spiraAppManager.canCreateArtifactType(artifactType.TEST_STEP);
    console.log("Can create test steps:", canCreateTestSteps);

    // Verify required settings
    if (!claude_verifyRequiredSettings()) {
        return;
    }

    // Make sure call not already running
    if (localState.running) {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_TEST_STEPS));
        return;
    }

    // Clear local storage and specify the action
    localState = {
        "action": "generateTestSteps",
        "running": true
    };

    // Don't let users try and create test steps if they do not have permission to do so
    if (!canCreateTestSteps) {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else {
        // Get the current test case artifact
        var testCaseId = spiraAppManager.artifactId;
        console.log("Retrieving test case data for ID:", testCaseId);
        
        var url = 'projects/' + spiraAppManager.projectId + '/test-cases/' + testCaseId;
        spiraAppManager.executeApi(
            'claudeAssistant', 
            '7.0', 
            'GET', 
            url, 
            null, 
            claude_getTestCaseData_success, 
            claude_operation_failure
        );
    }
}

function claude_getTestCaseData_success(remoteTestCase) {
    console.log("Test case data retrieved:", remoteTestCase);
    
    if (remoteTestCase) {
        // Store for later
        localState.remoteTestCase = remoteTestCase;

        // Create the prompt
        var systemPrompt = "You are a business analyst that only speaks in JSON. Do not generate output that isn't in properly formatted JSON.";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].global_prompt) {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }

        // Add test step prompt
        var testStepPrompt = " Write the test steps for the following test case. For each test step include the description, expected result, and sample data in the following format { \"TestSteps\": [{ \"Description\": [Description of test step], \"ExpectedResult\": [The expected result], \"SampleData\": [Sample data in plain text] }] }";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].teststep_prompt) {
            testStepPrompt = SpiraAppSettings[APP_GUID].teststep_prompt;
        }
        
        systemPrompt += testStepPrompt;
        
        // Specify the user prompt, use the name and optionally the description of the artifact
        var userPrompt = remoteTestCase.Name;
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].artifact_descriptions == 'True') {
            userPrompt += ". " + spiraAppManager.convertHtmlToPlainText(remoteTestCase.Description);
        }

        console.log("Sending to Claude with prompt:", {
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
        });
        
        // Send the Claude request
        claude_executeApiRequest(
            systemPrompt, 
            userPrompt, 
            claude_processTestStepResponse, 
            claude_operation_failure
        );
    }
    else {
        spiraAppManager.displayErrorMessage(messages.EMPTY_TEST_CASE);
        localState.running = false;   
    }
}

function claude_processTestStepResponse(response) {
    console.log("Claude API response received for test steps:", response);
    
    if (!response) {
        spiraAppManager.displayErrorMessage(messages.NO_RESPONSE);
        localState.running = false;
        return;
    }

    // Check for error response
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
            spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
        } else {
            spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
            console.log(response);
        }
        localState.running = false;
        return;
    }

    // Get the response and parse out
    if (!response.content) {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(response);
        localState.running = false;
        return;
    }

    // Need to deserialize the content
    try {
        var content = JSON.parse(response.content);
        console.log("Parsed response content:", content);
        
        if (!content.content) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
            console.log(content);
            localState.running = false;
            return;
        }

        // Get the actual text from Claude response 
        var generation = content.content[0].text;
        console.log("Generated test steps:", generation);

        claude_generateTestStepsFromChoice(generation);
    } catch (e) {
        console.error("Error parsing response:", e);
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        localState.running = false;
    }
}

function claude_generateTestStepsFromChoice(generation) {
    // Parse and validate the JSON
    const parseResult = claude_parseGeneratedJson(
      generation,
      'TestSteps',
      messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_TEST_STEPS),
      localState
    );
    
    // If parsing failed, return early
    if (!parseResult.success) {
      return;
    }
    
    // Process the test steps
    const jsonObj = parseResult.data;
    localState.testStepCount = jsonObj.TestSteps.length;
    
    // Process test steps
    for (let i = 0; i < jsonObj.TestSteps.length; i++) {
      const testStep = jsonObj.TestSteps[i];
      const testCaseId = spiraAppManager.artifactId;
      
      if (testStep.Description && testStep.ExpectedResult) {
        // Create test step in Spira
        const remoteTestStep = {
          ProjectId: spiraAppManager.projectId,
          TestCaseId: testCaseId,
          Description: testStep.Description,
          ExpectedResult: testStep.ExpectedResult,
          SampleData: testStep.SampleData,
          Position: i + 1
        };
        
        const url = 'projects/' + spiraAppManager.projectId + 
                   '/test-cases/' + testCaseId + '/test-steps';
        spiraAppManager.executeApi(
          'claudeAssistant',
          '7.0',
          'POST',
          url,
          JSON.stringify(remoteTestStep),
          generateTestStepsFromChoice_success,
          claude_operation_failure
        );
      }
    }
  }

function claude_generateTestStepsFromChoice_success(remoteTestStep) {
    console.log("Test step created successfully:", remoteTestStep);
    
    // Reset the dialog and force the form manager to reload once all test steps have been created
    localState.testStepCount--;
    if (localState.testStepCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        
        // Reload the test steps grid if it exists
        if (spiraAppManager.gridIds && spiraAppManager.gridIds.testCaseTestSteps) {
            spiraAppManager.reloadGrid(spiraAppManager.gridIds.testCaseTestSteps);
        }
        
        spiraAppManager.displaySuccessMessage('Successfully created test steps from Claude Assistant.');
    }
    localState.running = false;
}

// Helper function to clean up JSON with markdown code blocks
function claude_cleanJSON(wrappedJson) {
    return wrappedJson.replace(/```json\n?|```/g, '');
}

// Log when the script loads
console.log("Claude Assistant test case details script loaded at", new Date().toISOString());
