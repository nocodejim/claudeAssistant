// Define constants
const messages = {
    PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
    WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
    EMPTY_TASK: "Claude Assistant: Fatal Error, empty task retrieved from Spira!",
    NO_RESPONSE: "Claude Assistant: Fatal error, no response received from Claude - please try again!",
    INVALID_CONTENT: "Claude Assistant: Invalid content received from Claude, not able to proceed.",
    INVALID_CONTENT_NO_GENERATE: "Claude Assistant: could not generate {0} from Claude's response - please try again.",
    UNKNOWN_ERROR: "Claude Assistant: Unknown Error, please check the browser console or try again!",
    MISSING_SETTINGS: "Claude Assistant: You need to populate the system settings to use this application!",
    MISSING_SETTING: "Claude Assistant: You need to populate the '{0}' system setting to use this application!",
    ARTIFACT_SOURCE_CODE: "source code",
    UNIT_TEST_CODE: "unit test code"
};

const artifactType = {
    REQUIREMENT: 1,
    TEST_CASE: 2,
    TASK: 6,
    TEST_STEP: 7,
    RISK: 14,
    DOCUMENT: 13
};

const selectLists = {
    SOURCE_CODE_LANGUAGES: "C#, Java, NodeJS, Python, Ruby, ReactJS, Angular",
    SOURCE_CODE_LANGUAGES_WITH_TESTS: "C#|NUnit, Java|jUnit, NodeJS|Mocha, Python|PyTest, Ruby|Test::Unit, ReactJS|Cypress, Angular|Cypress"
};

// Define prompts for code generation
const codePrompts = {
    TASK_GENERATE_SOURCE_CODE: 
        "Write sample code in [CODE_LANGUAGE] that implements the following feature. IMPORTANT: Format your response as a single JSON object with string values only (not arrays). Do not include any text, explanation, or markdown formatting before or after the JSON object. Use exactly this format: {\"Filename\": \"filename.ext\", \"Code\": \"full source code as a single string with escaped newlines\"}. Do not wrap your response in code blocks.",
    
    TASK_GENERATE_SOURCE_CODE_TESTS: 
        "Write a sample unit test for the following feature using [CODE_LANGUAGE] and the [TEST_FRAMEWORK] framework. IMPORTANT: Format your response as a single JSON object with string values only (not arrays). Do not include any text, explanation, or markdown formatting before or after the JSON object. Use exactly this format: {\"Filename\": \"test_filename.ext\", \"Code\": \"full test code as a single string with escaped newlines\"}. Do not wrap your response in code blocks."
};

let localState = {};

// Register menu entry click events
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateCode", claude_generateCode);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateCodeWithTests", claude_generateCodeWithTests);

// Verify settings function
function claude_verifyRequiredSettings() {
    console.log("Verifying settings...");
    
    // Check if SpiraAppSettings exists for this app
    if (!SpiraAppSettings[APP_GUID]) {
        console.error("No settings found for APP_GUID:", APP_GUID);
        spiraAppManager.displayErrorMessage(messages.MISSING_SETTINGS);
        return false;
    }
    
    console.log("All settings for this APP_GUID:", SpiraAppSettings[APP_GUID]);
    
    return true;
}

// API execution function
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

// Error handling function
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

// Helper function to clean up JSON
function claude_cleanJSON(wrappedJson) {
    return wrappedJson.replace(/```json\n?|```/g, '');
}

// Function to encode string to base64 - needed for file attachments
function stringToBase64(str) {
    const binString = String.fromCodePoint(...new TextEncoder().encode(str));
    return btoa(binString);
}

function claude_generateCode() {
    var canCreateDocuments = spiraAppManager.canCreateArtifactType(artifactType.DOCUMENT);

    //Verify required settings
    if (!claude_verifyRequiredSettings()) {
        return;
    }
    
    //Make sure call not already running
    if (localState.running) {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_SOURCE_CODE));
        return;
    }

    //Verify permissions
    if (!canCreateDocuments) {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        return;
    }

    var languages = selectLists.SOURCE_CODE_LANGUAGES;
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].code_languages) {
        //Get the name of each option to display in the dialog
        languages = SpiraAppSettings[APP_GUID].code_languages;
    }

    if (languages) {
        const optionsNames = languages.split(/,/);

        //Create dropdown dialog
        spiraAppManager.createComboDialog('Generate Sample Code', 'Please choose the source code language:', 'Create', optionsNames, claude_generateCode_success);
    } else {
        spiraAppManager.displayWarningMessage('No source code languages have been defined for this product!');
    }
}

function claude_generateCode_success(selectedValue) {
    if (selectedValue) {
        //Clear local storage and specify the action/value
        localState = {
            "action": "generateCode",
            "running": true,
            "codingLanguage": selectedValue.trim(),
            "generateTests": false,
            "tokensUse": 0
        };

        //Get the current task artifact (we need to get its name/desc)
        var taskId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/tasks/' + taskId;
        spiraAppManager.executeApi('claudeAssistant', '7.0', 'GET', url, null, claude_getTaskData_success, claude_operation_failure);
    } else {
        spiraAppManager.displayWarningMessage('You need to choose a source code language from the list!');
    }
}

function claude_generateCodeWithTests() {
    var canCreateDocuments = spiraAppManager.canCreateArtifactType(artifactType.DOCUMENT);

    //Verify required settings
    if (!claude_verifyRequiredSettings()) {
        return;
    }
    
    //Make sure call not already running
    if (localState.running) {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_SOURCE_CODE));
        return;
    }

    //Verify permissions
    if (!canCreateDocuments) {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        return;
    }

    var languages = selectLists.SOURCE_CODE_LANGUAGES_WITH_TESTS;
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].unit_test_framework) {
        //Get the name of each option to display in the dialog
        languages = SpiraAppSettings[APP_GUID].unit_test_framework;
    }

    if (languages) {
        const optionsNames = languages.split(/,/).map(option => option.replace('|', ' tested with '));

        //Create dropdown dialog
        spiraAppManager.createComboDialog('Generate Sample Code', 'Please choose the source code language and unit test framework:', 'Create', optionsNames, claude_generateCodeWithTests_success);
    } else {
        spiraAppManager.displayWarningMessage('No source code languages with unit test frameworks have been defined for this product!');
    }
}

function claude_generateCodeWithTests_success(selectedValue) {
    if (selectedValue) {
        //Split the language from the unit test framework
        var items = selectedValue.split('tested with');
        if (items.length >= 2) {
            var codingLanguage = items[0].trim();
            var testFramework = items[1].trim();
            if (codingLanguage && testFramework) {        
                //Clear local storage and specify the action/value
                localState = {
                    "action": "generateCode",
                    "running": true,
                    "codingLanguage": codingLanguage,
                    "testFramework": testFramework,
                    "generateTests": true,
                    "tokensUse": 0
                };

                //Get the current task artifact (we need to get its name/desc)
                var taskId = spiraAppManager.artifactId;
                var url = 'projects/' + spiraAppManager.projectId + '/tasks/' + taskId;
                spiraAppManager.executeApi('claudeAssistant', '7.0', 'GET', url, null, claude_getTaskData_success, claude_operation_failure);
            } else {
                spiraAppManager.displayWarningMessage('You need to choose a valid source code and test framework language from the list!');
            }
        } else {
            spiraAppManager.displayWarningMessage('You need to choose a valid source code and test framework language from the list!');
        }
    } else {
        spiraAppManager.displayWarningMessage('You need to choose a source code and test framework language from the list!');
    }   
}

function claude_getTaskData_success(remoteTask) {
    if (remoteTask) {
        //Store for later
        localState.remoteTask = remoteTask;

        //Create the prompt based on the action
        var systemPrompt = "You are a business analyst that only speaks in JSON. Do not generate output that isn't in properly formatted JSON.";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].global_prompt) {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }

        if (localState.action == 'generateCode') {
            //The code prompts are not settings since they are parameterized
            var codePrompt;
            if (localState.generateTests) {
                codePrompt = codePrompts.TASK_GENERATE_SOURCE_CODE_TESTS.replace(/\[CODE_LANGUAGE\]/g, localState.codingLanguage).replace(/\[TEST_FRAMEWORK\]/g, localState.testFramework);
            } else {
                codePrompt = codePrompts.TASK_GENERATE_SOURCE_CODE.replace(/\[CODE_LANGUAGE\]/g, localState.codingLanguage);
            }
            systemPrompt += ' ' + codePrompt;
        } else {
            //Unknown action
            spiraAppManager.displayErrorMessage("Claude Assistant: Unknown action - " + localState.action);
            localState.running = false;
            return;
        }

        //Specify the user prompt, use the name and optionally the description of the artifact
        var userPrompt = remoteTask.Name;
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].artifact_descriptions == 'True') {
            userPrompt += ". " + spiraAppManager.convertHtmlToPlainText(remoteTask.Description);
        }

        console.log("Sending to Claude with prompt:", {
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            codingLanguage: localState.codingLanguage,
            generateTests: localState.generateTests
        });
        
        //Send the Claude request
        claude_executeApiRequest(
            systemPrompt, 
            userPrompt, 
            claude_processCodeResponse, 
            claude_operation_failure
        );
    } else {
        spiraAppManager.displayErrorMessage(messages.EMPTY_TASK);
        localState.running = false;   
    }
}

function claude_processCodeResponse(response) {
    console.log("Claude API response received for code generation:", response);
    
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
        console.log("Generated code content:", generation);

        if (localState.generateTests) {
            claude_generateCodeFromChoice(generation);
        } else {
            claude_generateCodeFromChoice(generation);
        }
    } catch (e) {
        console.error("Error parsing response:", e);
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        localState.running = false;
    }
}

function claude_generateCodeFromChoice(generation) {
    console.log("Processing code from Claude response");
    
    // Get the message
    if (generation) {
        // Convert to a JSON string
        var json = claude_cleanJSON(generation);
        console.log("Cleaned JSON:", json);

        // We need to convert into a JSON object and verify layout
        var jsonObj = null;
        try {
            jsonObj = JSON.parse(json);
            console.log("Parsed JSON object:", jsonObj);
        }
        catch (e) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_SOURCE_CODE));
            console.log("JSON parse error:", e);
            console.log("Raw JSON:", json);
            return;
        }

        if (jsonObj && jsonObj.Filename && jsonObj.Code) {
            // Create the source code file and attach to the task
            var taskId = spiraAppManager.artifactId;
            var binaryData = stringToBase64(jsonObj.Code);
            var remoteDocument = {
                ProjectId: spiraAppManager.projectId,
                FilenameOrUrl: jsonObj.Filename,
                BinaryData: binaryData,
                AttachedArtifacts: [{ "ArtifactId": taskId, "ArtifactTypeId": artifactType.TASK }],
                Version: '1.0'
            };

            console.log("Creating source code document:", {
                filename: jsonObj.Filename,
                taskId: taskId,
                projectId: spiraAppManager.projectId
            });

            // Call the API to create the source code file
            const url = 'projects/' + spiraAppManager.projectId + '/documents/file';
            const body = JSON.stringify(remoteDocument);
            spiraAppManager.executeApi(
                'claudeAssistant', 
                '7.0', 
                'POST', 
                url, 
                body, 
                claude_generateCodeFromChoice_success, 
                claude_operation_failure
            );    
        } else {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_SOURCE_CODE));
            console.log("Invalid JSON structure - missing Filename or Code:", jsonObj);
            localState.running = false;
            return;
        }
    }
}

function claude_generateCodeFromChoice_success(response) {
    console.log("Source code document created successfully:", response);
    
    // See if we still have to create the tests or if we are done
    if (localState.generateTests) {
        // Call Claude again to generate the matching tests
        localState.action = 'generateTest';
        localState.generateTests = false;
        
        // Create the system prompt for tests
        var systemPrompt = "You are a business analyst that only speaks in JSON. IMPORTANT: Format your response as a single JSON object with string values only (not arrays). Do not include any text, explanation, or markdown formatting before or after the JSON object. Use exactly this format: {\"Filename\": \"filename.ext\", \"Code\": \"full source code as a single string with escaped newlines\"}. Do not wrap your response in code blocks.";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].global_prompt) {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }
        
        var codePrompt = codePrompts.TASK_GENERATE_SOURCE_CODE_TESTS.replace(/\[CODE_LANGUAGE\]/g, localState.codingLanguage).replace(/\[TEST_FRAMEWORK\]/g, localState.testFramework);
        systemPrompt += ' ' + codePrompt;
        
        // User prompt
        var userPrompt = localState.remoteTask.Name;
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].artifact_descriptions == 'True') {
            userPrompt += ". " + spiraAppManager.convertHtmlToPlainText(localState.remoteTask.Description);
        }
        
        console.log("Sending to Claude for test generation:", {
            systemPrompt: systemPrompt,
            userPrompt: userPrompt,
            codingLanguage: localState.codingLanguage,
            testFramework: localState.testFramework
        });
        
        // Send the Claude request for test generation
        claude_executeApiRequest(
            systemPrompt, 
            userPrompt, 
            claude_processTestResponse, 
            claude_operation_failure
        );
    } else {
        // Reset the dialog and force the form manager to reload once the code has been created
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created source code file from Claude Assistant.');
        localState.running = false;
    }
}

function claude_processTestResponse(response) {
    console.log("Claude API response received for test generation:", response);
    
    if (!response) {
        spiraAppManager.displayErrorMessage(messages.NO_RESPONSE);
        localState.running = false;
        return;
    }

    // Check for error response
    if (response.statusCode != 200) {
        // Error handling similar to other response handlers
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
        console.log("Parsed test response content:", content);
        
        if (!content.content) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
            console.log(content);
            localState.running = false;
            return;
        }

        // Get the actual text from Claude response 
        var generation = content.content[0].text;
        console.log("Generated test content:", generation);

        claude_generateTestFromChoice(generation);
    } catch (e) {
        console.error("Error parsing test response:", e);
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        localState.running = false;
    }
}

function claude_generateTestFromChoice(generation) {
    console.log("Processing test code from Claude response");
    
    // Get the message
    if (generation) {
        // Convert to a JSON string
        var json = claude_cleanJSON(generation);
        console.log("Cleaned test JSON:", json);

        // We need to convert into a JSON object and verify layout
        var jsonObj = null;
        try {
            jsonObj = JSON.parse(json);
            console.log("Parsed test JSON object:", jsonObj);
        }
        catch (e) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.UNIT_TEST_CODE));
            console.log("Test JSON parse error:", e);
            console.log("Raw test JSON:", json);
            return;
        }

        if (jsonObj && jsonObj.Filename && jsonObj.Code) {
            // Create the source code file and attach to the task
            var taskId = spiraAppManager.artifactId;
            var binaryData = stringToBase64(jsonObj.Code);
            var remoteDocument = {
                ProjectId: spiraAppManager.projectId,
                FilenameOrUrl: jsonObj.Filename,
                BinaryData: binaryData,
                AttachedArtifacts: [{ "ArtifactId": taskId, "ArtifactTypeId": artifactType.TASK }],
                Version: '1.0'
            };

            console.log("Creating test code document:", {
                filename: jsonObj.Filename,
                taskId: taskId,
                projectId: spiraAppManager.projectId
            });

            // Call the API to create the source code file
            const url = 'projects/' + spiraAppManager.projectId + '/documents/file';
            const body = JSON.stringify(remoteDocument);
            spiraAppManager.executeApi(
                'claudeAssistant', 
                '7.0', 
                'POST', 
                url, 
                body, 
                claude_generateTestFromChoice_success, 
                claude_operation_failure
            );    
        } else {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.UNIT_TEST_CODE));
            console.log("Invalid test JSON structure - missing Filename or Code:", jsonObj);
            localState.running = false;
            return;
        }
    }
}

function claude_generateTestFromChoice_success(response) {
    console.log("Test code document created successfully:", response);
    
    // Reset the dialog and force the form manager to reload
    spiraAppManager.hideMessage();
    spiraAppManager.reloadForm();
    spiraAppManager.displaySuccessMessage('Successfully created source code file and unit test from Claude Assistant.');
    localState.running = false;
}

// Log when the script loads
console.log("Claude Assistant task details script loaded at", new Date().toISOString());