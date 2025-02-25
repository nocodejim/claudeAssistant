// Modified requirementDetails.js with corrected settings and API call
// ---- Constants ----
const messages = {
    PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
    WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
    EMPTY_REQUIREMENT: "Claude Assistant: Fatal Error, empty requirement retrieved from Spira!",
    NO_RESPONSE: "Claude Assistant: Fatal error, no response received from Claude - please try again!",
    INVALID_CONTENT: "Claude Assistant: Invalid content received from Claude, not able to proceed.",
    INVALID_CONTENT_NO_GENERATE: "Claude Assistant: could not generate {0} from Claude's response - please try again.",
    UNKNOWN_ERROR: "Claude Assistant: Unknown Error, please check the browser console or try again!",
    MISSING_SETTINGS: "Claude Assistant: You need to populate the system settings to use this application!",
    MISSING_SETTING: "Claude Assistant: You need to populate the '{0}' system setting to use this application!",
    ARTIFACT_TEST_CASES: "test cases"
};

const artifactType = {
    REQUIREMENT: 1,
    TEST_CASE: 2,
    TASK: 6,
    TEST_STEP: 7,
    RISK: 14,
    DOCUMENT: 13
};

// ---- Utility Functions ----
function claude_cleanJSON(wrappedJson) {
    return wrappedJson.replace(/```json\n?|```/g, '');
}

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

// ---- API Functions ----
function claude_verifyRequiredSettings() {
    console.log("Verifying settings...");
    
    // Check if SpiraAppSettings exists for this app
    if (!SpiraAppSettings[APP_GUID]) {
        console.error("No settings found for APP_GUID:", APP_GUID);
        spiraAppManager.displayErrorMessage(messages.MISSING_SETTINGS);
        return false;
    }
    
    console.log("All settings for this APP_GUID:", SpiraAppSettings[APP_GUID]);
    
    // We don't need to check for API key directly anymore
    // The system will handle the substitution of ${anthropicKey}
    
    return true;
}

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
        "x-api-key": "${anthropicKey}"  // Template substitution - Spira will replace this with the actual key
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

// ---- Test Connection Function ----
function testClaudeConnection() {
    console.log("Testing Claude API connection...");
    
    // Simple test prompt
    var testPrompt = "You are Claude AI. Reply with the text 'Connection successful' and nothing else.";
    var userPrompt = "Test connection";
    
    claude_executeApiRequest(
        testPrompt, 
        userPrompt, 
        function(response) {
            console.log("Claude API response:", response);
            if (response && response.content) {
                spiraAppManager.displaySuccessMessage("Claude API connection successful!");
            } else {
                spiraAppManager.displayErrorMessage("Incomplete response from Claude API");
            }
        }, 
        function(error) {
            console.error("Claude API connection failed:", error);
            spiraAppManager.displayErrorMessage("Claude API connection failed: " + error);
        }
    );
}

// ---- Test Case Generation ----
let localState = {};

function claude_generateTestCases() {
    console.log("Starting test case generation...");
    
    var canCreateTestCases = spiraAppManager.canCreateArtifactType(artifactType.TEST_CASE);
    console.log("Can create test cases:", canCreateTestCases);

    //Verify required settings
    if (!claude_verifyRequiredSettings()) {
        return;
    }

    //Make sure call not already running
    if (localState.running) {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_TEST_CASES));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateTestCases",
        "running": true
    };

    //Don't let users try and create test cases if they do not have permission to do so
    if (!canCreateTestCases) {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else {
        //Get the current requirement artifact (we need to get its name)
        var requirementId = spiraAppManager.artifactId;
        console.log("Retrieving requirement data for ID:", requirementId);
        
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/' + requirementId;
        spiraAppManager.executeApi(
            'claudeAssistant', 
            '7.0', 
            'GET', 
            url, 
            null, 
            claude_getRequirementData_success, 
            claude_operation_failure
        );
    }
}

function claude_getRequirementData_success(remoteRequirement) {
    console.log("Requirement data retrieved:", remoteRequirement);
    
    if (remoteRequirement) {
        //Store for later
        localState.remoteRequirement = remoteRequirement;

        //Create the prompt
        var systemPrompt = "You are a business analyst that only speaks in JSON. Do not generate output that isn't in properly formatted JSON.";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].global_prompt) {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }

        var testCasePrompt = " Write the test cases for the following software requirement. For each test case include the description, input and expected output in the following format { \"TestCases\": [{ \"Description\": [Description of test case], \"Input\": [Sample input in plain text], \"ExpectedOutput\": [Expected output in plain text] }] }";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].testcase_prompt) {
            testCasePrompt = SpiraAppSettings[APP_GUID].testcase_prompt;
        }
        
        systemPrompt += testCasePrompt;
        
        //Specify the user prompt, use the name and optionally the description of the artifact
        var userPrompt = remoteRequirement.Name;
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].artifact_descriptions) {
            userPrompt += ". " + spiraAppManager.convertHtmlToPlainText(remoteRequirement.Description);
        }

        console.log("Sending to Claude with prompt:", {
            systemPrompt: systemPrompt,
            userPrompt: userPrompt
        });
        
        //Send the Claude request
        claude_executeApiRequest(
            systemPrompt, 
            userPrompt, 
            claude_processResponse, 
            claude_operation_failure
        );
    }
    else {
        spiraAppManager.displayErrorMessage(messages.EMPTY_REQUIREMENT);
        localState.running = false;   
    }
}

function claude_processResponse(response) {
    console.log("Claude API response received:", response);
    
    if (!response) {
        spiraAppManager.displayErrorMessage(messages.NO_RESPONSE);
        localState.running = false;
        return;
    }

    //Check for error response
    if (response.statusCode != 200) {
        //Error Message from Claude
        var message = response.statusDescription;   //Summary message, try and get more detailed one
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

    //Get the response and parse out
    if (!response.content) {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(response);
        localState.running = false;
        return;
    }

    //Need to deserialize the content
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
        console.log("Generated content:", generation);

        //See what action we had and call the appropriate parsing function
        if (localState.action == 'generateTestCases') {
            claude_generateTestCasesFromChoice(generation);
        }
        else {
            localState.running = false;
        }
    } catch (e) {
        console.error("Error parsing response:", e);
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        localState.running = false;
    }
}

function claude_generateTestCasesFromChoice(generation) {
    console.log("Processing test cases from Claude response");
    
    //Get the message
    if (generation) {
        //Convert to a JSON string
        var json = claude_cleanJSON(generation);
        console.log("Cleaned JSON:", json);

        //We need to convert into a JSON object and verify layout
        var jsonObj = null;
        try {
            jsonObj = JSON.parse(json);
            console.log("Parsed JSON object:", jsonObj);
        }
        catch (e) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_TEST_CASES));
            console.log("JSON parse error:", e);
            console.log("Raw JSON:", json);
            return;
        }
        if (jsonObj && jsonObj.TestCases && Array.isArray(jsonObj.TestCases)) {
            console.log("Found test cases array:", jsonObj.TestCases);
            
            //Loop through the results and get the test cases
            localState.testCaseCount = jsonObj.TestCases.length;
            for (var i = 0; i < jsonObj.TestCases.length; i++) {
                //Now get each group in the match
                var testCase = jsonObj.TestCases[i];
                console.log("Processing test case:", testCase);

                //Get the 3 provided fields
                var testCaseDescription = testCase.Description;
                var testCaseSampleData = testCase.Input;
                var expectedOutput = testCase.ExpectedOutput;

                //Store the input/expectedOutput for use later
                var context = {
                    description: testCaseDescription,
                    input: testCaseSampleData,
                    expectedOutput: expectedOutput
                };
                localState[testCaseDescription] = context;

                //Create the new test case
                if (testCaseDescription) {
                    var remoteTestCase = {}
                    remoteTestCase.Name = testCaseDescription;
                    remoteTestCase.TestCaseStatusId = /* Draft */1;
                    remoteTestCase.TestCaseTypeId = null;   //Default

                    console.log("Creating test case:", remoteTestCase);

                    //Call the API to create
                    const url = 'projects/' + spiraAppManager.projectId + '/test-cases';
                    const body = JSON.stringify(remoteTestCase);
                    spiraAppManager.executeApi(
                        'claudeAssistant', 
                        '7.0', 
                        'POST', 
                        url, 
                        body, 
                        claude_generateTestCasesFromChoice_success, 
                        claude_operation_failure
                    );    
                }
            }
        }
        else {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_TEST_CASES));
            console.log("Invalid JSON structure - missing TestCases array:", jsonObj);
            return;
        }
    }
}

function claude_generateTestCasesFromChoice_success(remoteTestCase) {
    console.log("Test case created successfully:", remoteTestCase);
    
    //Add the test case to the requirement
    if (remoteTestCase) {
        var requirementId = spiraAppManager.artifactId;
        var remoteReqTestCaseMapping = {
            RequirementId: requirementId,
            TestCaseId: remoteTestCase.TestCaseId
        };
        
        console.log("Creating requirement-test case mapping:", remoteReqTestCaseMapping);
        
        var url = 'projects/' + spiraAppManager.projectId + '/requirements/test-cases';
        var body = JSON.stringify(remoteReqTestCaseMapping);
        spiraAppManager.executeApi(
            'claudeAssistant', 
            '7.0', 
            'POST', 
            url, 
            body, 
            claude_generateTestCasesFromChoice_success2, 
            claude_operation_failure
        );

        //See if we have any stored steps for this test case
        if (localState[remoteTestCase.Name]) {
            var context = localState[remoteTestCase.Name];

            //Create a default test step
            var remoteTestStep = {
                ProjectId: spiraAppManager.projectId,
                TestCaseId: remoteTestCase.TestCaseId,
                Description: context.description,
                ExpectedResult: context.expectedOutput,
                SampleData: context.input
            };

            console.log("Creating test step:", remoteTestStep);

            var url = 'projects/' + spiraAppManager.projectId + '/test-cases/' + remoteTestCase.TestCaseId + '/test-steps';
            var body = JSON.stringify(remoteTestStep);
            spiraAppManager.executeApi(
                'claudeAssistant', 
                '7.0', 
                'POST', 
                url, 
                body, 
                claude_generateTestCasesFromChoice_success3, 
                claude_operation_failure
            );
        }
    }
}

function claude_generateTestCasesFromChoice_success2() {
    console.log("Requirement-test case mapping created successfully");
    
    //Reset the dialog and force the form manager to reload once all test cases have been created
    localState.testCaseCount--;
    if (localState.testCaseCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created test cases from Claude Assistant.');
    }
    localState.running = false;
}

function claude_generateTestCasesFromChoice_success3(remoteTestStep) {
    console.log("Test step created successfully:", remoteTestStep);
    //Do nothing except clear running flag
    localState.running = false;
}

// Register event handlers for menu clicks
console.log("Registering menu click events for APP_GUID:", APP_GUID);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateTestCases", claude_generateTestCases);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "testConnection", testClaudeConnection);

// Log when the script loads
console.log("Claude Assistant requirement details script loaded at", new Date().toISOString());