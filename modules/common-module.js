/**
 * Module wrapper for common.js
 * Exports the utility functions for testing
 */

// Common utility functions from common.js
function claude_cleanJSON(wrappedJson) {
  if (!wrappedJson) return '';
  // Replace all code block markers, not just JSON ones
  return wrappedJson.replace(/```(?:json)?\n?|```/g, '');
}

function claude_createRegexFromString(string) {
  const pattern = string.slice(1, string.lastIndexOf('/'));
  const flags = string.slice(string.lastIndexOf('/') + 1);
  
  const regex = new RegExp(pattern, flags);
  return regex;
}

function claude_operation_failure(response) {
  // Access globals from the test context
  if (global.localState) global.localState.running = false;
  
  if (response.message && response.exceptionType && response.exceptionType != 0) {
    //Error Message from Spira
    var message = response.message;
    var type = response.exceptionType;
    if (global.spiraAppManager) 
      global.spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + type + ']');
  }
  else if (response.error && response.error.message) {
    //Error Message from Claude
    var message = response.error.message;
    var type = response.error.type;
    var code = response.error.code;
    if (global.spiraAppManager) 
      global.spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
  }
  else {
    if (global.spiraAppManager) 
      global.spiraAppManager.displayErrorMessage(global.messages ? global.messages.UNKNOWN_ERROR : 'Unknown error');
    console.log(response);
  }
}

/**
 * Process a Claude API response with consistent error handling
 * @param {Object} response - The API response object
 * @param {Function} successCallback - Function to call with the generated text on success
 * @param {Object} localState - The local state object for tracking operation state
 * @param {string} [customMessage] - Optional custom error message
 */
function claude_processApiResponse(response, successCallback, localState, customMessage) {
  if (!response) {
    if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage(global.messages.NO_RESPONSE);
    if (localState) localState.running = false;
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
      if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage('Claude Assistant: ' + message + ' [' + code + ']');
    } else {
      if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage(global.messages.UNKNOWN_ERROR);
      console.log(response);
    }
    if (localState) localState.running = false;
    return;
  }

  // Get the response content
  if (!response.content) {
    if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage(customMessage || global.messages.INVALID_CONTENT);
    console.log(response);
    if (localState) localState.running = false;
    return;
  }

  try {
    // Parse the response
    const content = JSON.parse(response.content);
    
    if (!content.content || !content.content[0] || !content.content[0].text) {
      if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage(customMessage || global.messages.INVALID_CONTENT);
      console.log(content);
      if (localState) localState.running = false;
      return;
    }
    
    // Store token usage if available
    if (content.usage && content.usage.total_tokens) {
      if (localState) localState.tokensUse = (localState.tokensUse || 0) + content.usage.total_tokens;
    }
    
    // Process the generation content
    const generation = content.content[0].text;
    
    // Call the success callback with the generation text
    successCallback(generation);
  } catch (e) {
    console.error("Error processing API response:", e);
    if (global.spiraAppManager) global.spiraAppManager.displayErrorMessage(customMessage || global.messages.INVALID_CONTENT);
    if (localState) localState.running = false;
  }
}

// Export the functions
module.exports = {
  claude_cleanJSON,
  claude_createRegexFromString,
  claude_operation_failure,
  claude_processApiResponse
};