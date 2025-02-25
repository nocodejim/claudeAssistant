//Functions specific to Claude API

//Verify that we have the necessary settings configured
function claude_verifyRequiredSettings()
{
    if (!SpiraAppSettings[APP_GUID])
    {
        spiraAppManager.displayErrorMessage(messages.MISSING_SETTINGS);
        return false;
    }
    if (!SpiraAppSettings[APP_GUID].api_key || SpiraAppSettings[APP_GUID].api_key == '')
    {
        spiraAppManager.displayErrorMessage(messages.MISSING_SETTING.replace("{0}", 'API Key'));
        return false;
    }
    return true;
}

//Executes a prompt against the Claude REST API
function claude_executeApiRequest(systemPrompt, userPrompt, success, failure)
{
    //Specify the model
    var model = claudeConfig.MODEL;
    if (SpiraAppSettings[APP_GUID].model)
    {
        model = SpiraAppSettings[APP_GUID].model;
    }

    //Specify the temperature
    var temperature = claudeConfig.TEMPERATURE;
    if (SpiraAppSettings[APP_GUID].temperature && parseFloat(SpiraAppSettings[APP_GUID].temperature))
    {
        temperature = parseFloat(SpiraAppSettings[APP_GUID].temperature);
    }

    var body = {
        "model": model,
        "temperature": temperature,
        "max_tokens": claudeConfig.MAX_TOKENS,
        "messages": [
            {
            "role": "system",
            "content": systemPrompt
            },
            {
            "role": "user",
            "content": userPrompt
            }
        ]
    };

    //Get the standard headers
    var headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-agent": "Spira",
        "anthropic-version": "2023-06-01",
        "x-api-key": "${api_key}"
    };

    spiraAppManager.executeRest(APP_GUID, 'claudeAssistant', 'POST', "https://api.anthropic.com/v1/messages", JSON.stringify(body), null, headers, success, failure);
}

const claudeConfig = {
    MODEL: 'claude-3-sonnet-20240229',
    TEMPERATURE: 0.2,
    MAX_TOKENS: 4096
}
