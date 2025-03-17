/**
 * Module wrapper for claudeAssistant.js
 * Exports the Claude API functions for testing
 */

// Functions for interacting with Claude API from claudeAssistant.js
function claude_verifyRequiredSettings() {
  if (!global.SpiraAppSettings || !global.SpiraAppSettings[global.APP_GUID]) {
    if (global.spiraAppManager && global.messages)
      global.spiraAppManager.displayErrorMessage(global.messages.MISSING_SETTINGS);
    return false;
  }
  
  if (!global.SpiraAppSettings[global.APP_GUID].api_key || 
      global.SpiraAppSettings[global.APP_GUID].api_key == '') {
    if (global.spiraAppManager && global.messages)
      global.spiraAppManager.displayErrorMessage(global.messages.MISSING_SETTING.replace("{0}", 'API Key'));
    return false;
  }
  
  return true;
}

function claude_executeApiRequest(systemPrompt, userPrompt, success, failure) {
  // Get model from settings or use default
  const model = global.SpiraAppSettings && 
                global.SpiraAppSettings[global.APP_GUID] && 
                global.SpiraAppSettings[global.APP_GUID].model 
    ? global.SpiraAppSettings[global.APP_GUID].model 
    : 'claude-3-sonnet-20240229';
  
  // Get temperature from settings or use default
  let temperature = 0.2;
  if (global.SpiraAppSettings && 
      global.SpiraAppSettings[global.APP_GUID] && 
      global.SpiraAppSettings[global.APP_GUID].temperature && 
      parseFloat(global.SpiraAppSettings[global.APP_GUID].temperature)) {
    temperature = parseFloat(global.SpiraAppSettings[global.APP_GUID].temperature);
  }
  
  // Create request body
  const body = {
    "model": model,
    "temperature": temperature,
    "max_tokens": 4096,
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
  
  // Create headers
  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-agent": "Spira",
    "anthropic-version": "2023-06-01",
    "x-api-key": "${anthropicKey}"
  };
  
  // Call the API
  if (global.spiraAppManager)
    global.spiraAppManager.executeRest(
      global.APP_GUID, 
      'claudeAssistant', 
      'POST', 
      "https://api.anthropic.com/v1/messages", 
      JSON.stringify(body), 
      null, 
      headers, 
      success, 
      failure
    );
}

// Export the functions
module.exports = {
  claude_verifyRequiredSettings,
  claude_executeApiRequest
};
