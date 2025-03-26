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

/**
 * Check permissions and prevent concurrent operations
 * @param {string} action - The action being performed
 * @param {Object} localState - The local state object
 * @param {number} artifactTypeId - The artifact type ID to check permissions for
 * @param {Function} canFunction - The permission check function (e.g., canCreateArtifactType)
 * @param {Object} messages - The messages object for error messages
 * @returns {boolean} True if the operation can proceed, false otherwise
 */
function claude_checkPermissionsAndConcurrency(action, localState, artifactTypeId, canFunction, messages) {
    // Verify settings first
    if (!claude_verifyRequiredSettings()) {
      return false;
    }
  
    // Check if an operation is already running
    if (localState.running) {
      let artifactMessage = '';
      
      // Map action to message
      if (action.includes('TestCases')) {
        artifactMessage = messages.ARTIFACT_TEST_CASES;
      } else if (action.includes('Tasks')) {
        artifactMessage = messages.ARTIFACT_TASKS;
      } else if (action.includes('Steps') && action.includes('BDD')) {
        artifactMessage = messages.ARTIFACT_BDD_STEPS;
      } else if (action.includes('Steps')) {
        artifactMessage = messages.ARTIFACT_TEST_STEPS;
      } else if (action.includes('Risks')) {
        artifactMessage = messages.ARTIFACT_RISKS;
      } else if (action.includes('Code')) {
        artifactMessage = messages.ARTIFACT_SOURCE_CODE;
      } else {
        artifactMessage = action;
      }
      
      spiraAppManager.displayWarningMessage(
        messages.WAIT_FOR_OTHER_JOB.replace("{0}", artifactMessage)
      );
      return false;
    }
  
    // Initialize local state for the new operation
    localState.action = action;
    localState.running = true;
  
    // Check if the user has the necessary permissions
    const hasPermission = canFunction(artifactTypeId);
    if (!hasPermission) {
      spiraAppManager.displayErrorMessage(messages.PERMISSION_ERROR);
      localState.running = false;
      return false;
    }
  
    return true;
  }