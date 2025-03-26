// Define constants
const messages = {
  PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
  WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
  EMPTY_RISK: "Claude Assistant: Fatal Error, empty risk retrieved from Spira!",
  ARTIFACT_MITIGATIONS: "mitigations"
  // Add other relevant message constants
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

//Register menu entry click events
spiraAppManager.registerEvent_menuEntryClick(APP_GUID, "generateMitigations", claude_generateMitigations);

function claude_generateMitigations() {
    var canModifyRisks = spiraAppManager.canModifyArtifactType(artifactType.RISK);

    //Verify required settings
    if (!claude_verifyRequiredSettings())
    {
        return;
    }
    
    //Make sure call not already running
    if (localState.running)
    {
        spiraAppManager.displayWarningMessage(messages.WAIT_FOR_OTHER_JOB.replace("{0}", messages.ARTIFACT_MITIGATIONS));
        return;
    }

    //Clear local storage and specify the action
    localState = {
        "action": "generateMitigations",
        "running": true
    };

    //Don't let users try and create mitigations (aka modify risks) if they do not have permission to do so
    if (!canModifyRisks)
    {
        spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
        localState.running = false;
    }
    else
    {
        //Get the current risk artifact (we need to get its name)
        var riskId = spiraAppManager.artifactId;
        var url = 'projects/' + spiraAppManager.projectId + '/risks/' + riskId;
        spiraAppManager.executeApi('claudeAssistant', '7.0', 'GET', url, null, claude_getRiskData_success, claude_operation_failure);
    }
}

function claude_getRiskData_success(remoteRisk)
{
    if (remoteRisk)
    {
        //Store for later
        localState.remoteRisk = remoteRisk;

        //Create the prompt based on the action, see if we have a custom one as well
        var systemPrompt;
        if (SpiraAppSettings[APP_GUID].global_prompt)
        {
            systemPrompt = SpiraAppSettings[APP_GUID].global_prompt;
        }
        else
        {
            systemPrompt = prompts.GLOBAL;
        }
    
        if (localState.action == 'generateMitigations')
        {
            if (SpiraAppSettings[APP_GUID].mitigation_prompt)
            {
                systemPrompt += ' ' + SpiraAppSettings[APP_GUID].mitigation_prompt;
            }
            else
            {
                systemPrompt += ' ' + prompts.RISK_GENERATE_MITIGATIONS;
            }
        }
        else
        {
            //Unknown action
            spiraAppManager.displayErrorMessage(messages.UNKNOWN_CLAUDE_ACTION + localState.action);
            localState.running = false;
            return;
        }

        //Specify the user prompt, use the name and optionally the description of the artifact
        var userPrompt = remoteRisk.Name;
        if (SpiraAppSettings[APP_GUID].artifact_descriptions === 'True')
        {
            userPrompt += ". " + spiraAppManager.convertHtmlToPlainText(remoteRisk.Description);
        }

        //Send the Claude API request
        claude_executeApiRequest(systemPrompt, userPrompt, claude_processResponse, claude_operation_failure);
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.EMPTY_RISK);
        localState.running = false;   
    }
}

function claude_processResponse(response) {
    if (!response)
    {
        spiraAppManager.displayErrorMessage(messages.NO_RESPONSE);
        localState.running = false;
        return;
    }

    //Check for error response
    if (response.statusCode != 200)
    {
        //Error Message from Claude
        var message = response.statusDescription;   //Summary message, try and get more detailed one
        if (response.content)
        {
            try {
                var messageObj = JSON.parse(response.content);
                if (messageObj.error && messageObj.error.message)
                {
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
    if (!response.content)
    {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(response);
        localState.running = false;
        return;
    }

    // Parse the content - Claude's API returns a different structure than Azure OpenAI
    try {
        var content = JSON.parse(response.content);
        
        if (!content.content || !content.content[0] || !content.content[0].text) {
            spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
            console.log(content);
            localState.running = false;
            return;
        }
        
        // Process the text from Claude's response
        var generation = content.content[0].text;
        
        // Process based on action type
        if (localState.action == 'generateMitigations') {
            claude_generateMitigationsFromChoice(generation);
        } else {
            localState.running = false;
        }
    } catch (e) {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT);
        console.log(e);
        localState.running = false;
    }
}

function claude_generateMitigationsFromChoice(generation)
{
    //Convert to a JSON string
    var json = claude_cleanJSON(generation);
    
    //We need to convert into a JSON object and verify layout
    var jsonObj = null;
    try
    {
        jsonObj = JSON.parse(json);
    }
    catch (e)
    {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_MITIGATIONS));
        console.log(json);
        console.log(e);
        localState.running = false;
        return;
    }

    if (jsonObj && jsonObj.Mitigations && Array.isArray(jsonObj.Mitigations))
    {
        //Loop through the results and get the mitigations
        localState.mitigationCount = jsonObj.Mitigations.length;
        for (var i = 0; i < jsonObj.Mitigations.length; i++)
        {
            //Now get each group in the match
            var mitigation = jsonObj.Mitigations[i];

            //Get the mitigation description
            var riskMitigationDescription = mitigation.Description;
            var riskId = spiraAppManager.artifactId;

            //Create the new mitigation
            if (riskMitigationDescription)
            {
                var remoteRiskMitigation = {}
                remoteRiskMitigation.RiskId = riskId;
                remoteRiskMitigation.Description = riskMitigationDescription;
                remoteRiskMitigation.CreationDate = new Date().toISOString();

                //Call the API to create the mitigation
                const url = 'projects/' + spiraAppManager.projectId + '/risks/' + riskId + '/mitigations';
                const body = JSON.stringify(remoteRiskMitigation);
                spiraAppManager.executeApi('claudeAssistant', '7.0', 'POST', url, body, claude_generateMitigationsFromChoice_success, claude_operation_failure);    
            }
        }
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.INVALID_CONTENT_NO_GENERATE.replace("{0}", messages.ARTIFACT_MITIGATIONS));
        console.log(json);
        localState.running = false;
        return;
    }
}

function claude_generateMitigationsFromChoice_success()
{
    //Reset the dialog and force the form manager to reload once all mitigations have been created
    localState.mitigationCount--;
    if (localState.mitigationCount == 0) {
        spiraAppManager.hideMessage();
        spiraAppManager.reloadForm();
        spiraAppManager.displaySuccessMessage('Successfully created risk mitigations from Claude Assistant.');
    }
    localState.running = false;
}