// Include common functions
file://common.js

// Include plugin-specific functions
file://claudeAssistant.js

// Include constants
file://constants.js

let localState = {};

//Register menu entry click events for code generation
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateCode", claude_generateCode);
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateCodeWithTests", claude_generateCodeWithTests);

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

    // Use a simple array of coding languages if not configured in settings
    var languages = "C#, Java, NodeJS, Python, Ruby, ReactJS, Angular";
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].code_languages) {
        languages = SpiraAppSettings[APP_GUID].code_languages;
    }

    if (languages) {
        const optionsNames = languages.split(/,/).map(lang => lang.trim());

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
            "codingLanguage": selectedValue,
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

    // Use simple test frameworks if not configured in settings
    var frameworks = "C#|NUnit, Java|jUnit, NodeJS|Mocha, Python|PyTest, Ruby|Test::Unit, ReactJS|Cypress, Angular|Cypress";
    if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].unit_test_framework) {
        frameworks = SpiraAppSettings[APP_GUID].unit_test_framework;
    }

    if (frameworks) {
        const optionsNames = frameworks.split(/,/).map(option => option.replace('|', ' tested with ').trim());

        //Create dropdown dialog
        spiraAppManager.createComboDialog('Generate Sample Code', 'Please choose the source code language and unit test framework:', 'Create', optionsNames, claude_generateCodeWithTests_success);
    } else {
        spiraAppManager.displayWarningMessage('No source code languages with unit test frameworks have been defined for this product!');
    }
}

function claude_generateCodeWithTests_success(selectedValue) {
    if (selectedValue) {
        //Split the language from the unit test framework
        var items = selectedValue.split('tested with').map(part => part.trim());
        if (items.length >= 2) {
            var codingLanguage = items[0];
            var testFramework = items[1];
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
    console.log("Task data retrieved:", remoteTask);
    
    if (remoteTask) {
        //Store for later
        localState.remoteTask = remoteTask;

        //Create the prompt
        var systemPrompt = "You are a business analyst that only speaks in JSON. Do not generate output that isn't in properly formatted JSON.";
        if (SpiraAppSettings[APP_GUID] && SpiraAppSettings[APP_GUID].global_prompt) {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }

        //The code prompts are not settings since they are parameterized
        var codePrompt;
        if (localState.generateTests) {
            codePrompt = " You are a programmer working in the " + localState.codingLanguage + " programming language. Could you write a sample unit test for the following feature using " + localState.codingLanguage + " and the " + localState.testFramework + " framework in the following format { \"Filename\": [filename for source code], \"Code\": [source code in plain text] }";
        } else {
            codePrompt = " You are a programmer working in the " + localState.codingLanguage + " programming language. Write sample code that implements the following feature in the following format { \"Filename\": [filename for source code], \"Code\": [source code in plain text] }";
        }
        
        systemPrompt += codePrompt;

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
        claude_executeApiRequest(systemPrompt, userPrompt, claude_processCodeResponse, claude_operation_failure);
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

    //Check for error response
    if (response.statusCode != 200) {
        //Error Message from Claude
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

    //Parse the content
    try {
        var content = JSON.parse(response.content);
        console.log("Parsed response content:", content);
        
        if (!content.content) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
            console.log(content);
            localState.running = false;
            return;
        }

        //Get the actual text from Claude response
        var generation = content.content[0].text;
        console.log("Generated code content:", generation);

        //Process the code
        claude_generateCodeFromChoice(generation);
    } catch (e) {
        console.error("Error parsing response:", e);
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        localState.running = false;
    }
}

function claude_generateCodeFromChoice(generation) {
    console.log("Processing code from Claude response");
    
    //Get the message
    if (generation) {
        //Convert to a JSON string - this removes any markdown code formatting that might be present
        var json = claude_cleanJSON(generation);
        console.log("Cleaned JSON:", json);

        /* 
         * Since code often contains special characters, quotes and newlines that
         * break standard JSON parsing, we need to handle it differently.
         * This is a robust approach to extract the filename and code content
         * without relying on JSON.parse which fails on the special characters.
         */
        
        try {
            // First attempt normal JSON parsing (for well-formed responses)
            var jsonObj = JSON.parse(json);
            processCodeObject(jsonObj);
        }
        catch (e) {
            console.log("JSON parse error:", e);
            console.log("Raw JSON:", json);
            
            // Fallback to regex-based extraction
            try {
                // Extract filename
                var filenameMatch = /"Filename"\s*:\s*"([^"]+)"/.exec(json);
                var filename = filenameMatch ? filenameMatch[1] : null;
                
                // Extract code by finding everything between "Code": " and the last "
                var codeStart = json.indexOf('"Code": "');
                var codeContent = null;
                
                if (codeStart !== -1) {
                    codeStart += 9; // Move past '"Code": "'
                    
                    // Find the last " that's part of the JSON structure, not the code
                    // This is tricky, so we'll go with a simpler approach
                    var codeSection = json.substring(codeStart);
                    
                    // Remove the final " and any trailing JSON syntax
                    codeContent = codeSection;
                    if (codeContent.endsWith('"}')) {
                        codeContent = codeContent.substring(0, codeContent.length - 2);
                    }
                    
                    // Unescape the content
                    codeContent = codeContent.replace(/\\"/g, '"')
                                            .replace(/\\n/g, '\n')
                                            .replace(/\\\\/g, '\\');
                }
                
                if (filename && codeContent) {
                    var extractedObj = {
                        Filename: filename,
                        Code: codeContent
                    };
                    processCodeObject(extractedObj);
                } else {
                    throw new Error("Could not extract filename and code");
                }
            } catch (extractError) {
                console.error("Error extracting code:", extractError);
                spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_SOURCE_CODE));
                localState.running = false;
                return;
            }
        }
    }
    
    function processCodeObject(jsonObj) {
        if (jsonObj && jsonObj.Filename && jsonObj.Code) {
            //Create the source code file and attach to the task
            var taskId = spiraAppManager.artifactId;
            var binaryData = stringToBase64(jsonObj.Code);
            var remoteDocument = {
                ProjectId: spiraAppManager.projectId,
                FilenameOrUrl: jsonObj.Filename,
                BinaryData: binaryData,
                AttachedArtifacts: [{ "ArtifactId": taskId, "ArtifactTypeId": artifactType.TASK }],
                Version: '1.0'
            };

            //Call the API to create the source code file
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
            console.log("Invalid code structure - missing Filename or Code:", jsonObj);
            localState.running = false;
            return;
        }
    }
}

function claude_generateCodeFromChoice_success() {
    console.log("Source code file created successfully");
    
    //See if we still have to create the tests or if we are done
    if (localState.generateTests) {
        //Call Claude again to generate the matching test code
        localState.action = 'generateTest';
        claude_getTaskData_success(localState.remoteTask);
    } else {
        //Reset the dialog and force the form manager to reload
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created source code file using Claude Assistant.');
        localState.running = false;
    }
}

function claude_generateTestFromChoice_success() {
    console.log("Test code file created successfully");
    
    //Reset the dialog and force the form manager to reload
    spiraAppManager.hideMessage();
    spiraAppManager.reloadForm();
    spiraAppManager.displaySuccessMessage('Successfully created source code and test files using Claude Assistant.');
    localState.running = false;
}

// Helper function to convert string to base64
function stringToBase64(str) {
    // Use TextEncoder to handle UTF-8 correctly
    const binString = String.fromCodePoint(...new TextEncoder().encode(str));
    return btoa(binString);
}

// Log when the script is loaded
console.log("Claude Assistant task details script loaded at", new Date().toISOString());