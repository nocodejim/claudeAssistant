/**
 * Module wrapper for common.js
 * Exports the utility functions for testing
 */

// Common utility functions from common.js
function claude_cleanJSON(wrappedJson) {
  return wrappedJson.replace(/```json\n?|```/g, '');
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

// Export the functions
module.exports = {
  claude_cleanJSON,
  claude_createRegexFromString,
  claude_operation_failure
};
