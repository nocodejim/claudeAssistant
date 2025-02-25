/* Common Claude Assistant JS Functions */

//Create a regex object from a regex string
function claude_createRegexFromString(string)
{
    const pattern = string.slice(1, string.lastIndexOf('/'));
    const flags = string.slice(string.lastIndexOf('/') + 1);
    
    const regex = new RegExp(pattern, flags);
    return regex;
}

//Get unwrapped JSON back from a returned completion
function claude_cleanJSON(wrappedJson)
{
    return wrappedJson.replace(/```json\n?|```/g, '');
}

//Generic error handling
function claude_operation_failure(response) {
    localState.running = false;
    if (response.message && response.exceptionType && response.exceptionType != 0)
    {
        //Error Message from Spira
        var message = response.message;
        var type = response.exceptionType;
        spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + type + ']');
    }
    else if (response.error && response.error.message)
    {
        //Error Message from Claude
        var message = response.error.message;
        var type = response.error.type;
        var code = response.error.code;
        spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
    }
    else
    {
        spiraAppManager.displayErrorMessage(messages.UNKNOWN_ERROR);
        console.log(response);
    }
}

