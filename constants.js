/* Common Claude Assistant constants */

//Default prompts
const prompts = {
    GLOBAL: "You are a business analyst that only speaks in JSON. Do not generate output that isn't in properly formatted JSON.",
    REQUIREMENT_GENERATE_TEST_CASES: "Write the test cases for the following software requirement. For each test case include the description, input and expected output in the following format { \"TestCases\": [{ \"Description\": [Description of test case], \"Input\": [Sample input in plain text], \"ExpectedOutput\": [Expected output in plain text] }] }",
    REQUIREMENT_GENERATE_TASKS: "Write the development tasks for the following software requirement. For each task include the name and description in the following format { \"Tasks\": [{ \"Name\": [name in plain text], \"Description\": [description in plain text] }] }",
    REQUIREMENT_GENERATE_SCENARIOS: "Write the BDD scenarios for the following software requirement. For each scenario use the following Gherkin format { \"Scenarios\": [{ \"Name\": [The name of the scenario], \"Given\": [single setup in plain text], \"When\": [single action in plain text], \"Then\": [single assertion in plain text] }] }",
    REQUIREMENT_GENERATE_RISKS: "Identify the possible business and technical risks for the following software requirement. For each risk include the name and description in the following format { \"Risks\": [{ \"Name\": [name in plain text], \"Description\": [description in plain text] }] }",
    RISK_GENERATE_MITIGATIONS: "Write the possible mitigations for the following risk. For each mitigation include the description in the following format { \"Mitigations\": [{ \"Description\": [description in plain text] }] }",
    TEST_CASE_GENERATE_STEPS: "Write the test steps for the following test case. For each test step include the description, expected result, and sample data in the following format { \"TestSteps\": [{ \"Description\": [Description of test step], \"ExpectedResult\": [The expected result], \"SampleData\": [Sample data in plain text] }] }",
    TEST_CASE_GENERATE_REQUIREMENTS: "Write the requirements for the following test case. For each requirement include the name and description in the following format { \"Requirements\": [{ \"Name\": [name in plain text], \"Description\": [description in plain text] }] }"
}

const artifactType = {
    REQUIREMENT: 1,
    TEST_CASE: 2,
    TASK: 6,
    TEST_STEP: 7,
    RISK: 14,
    DOCUMENT: 13
}

const messages = {
    PERMISSION_ERROR: "Claude Assistant: Sorry, you are not permitted to perform this action",
    WAIT_FOR_OTHER_JOB: "Claude Assistant: Cannot generate {0} as another job is running. Please wait for it to finish!",
    EMPTY_REQUIREMENT: "Claude Assistant: Fatal Error, empty requirement retrieved from Spira!",
    EMPTY_TEST_CASE: "Claude Assistant: Fatal Error, empty test case retrieved from Spira!",
    EMPTY_RISK: "Claude Assistant: Fatal Error, empty risk retrieved from Spira!",
    EMPTY_TASK: "Claude Assistant: Fatal Error, empty task retrieved from Spira!",
    REQUIREMENT_NOT_STEPS: "Claude Assistant: The current requirement is of a type that does not support BDD steps. Please change the requirement type and try again!",
    UNKNOWN_CLAUDE_ACTION: "Claude Assistant: Sorry, an unknown Claude action was attempted: ",
    NO_REQUIREMENT_TYPES: "Claude Assistant: Fatal error, could not get any requirement types from Spira - please try again!",
    NO_RESPONSE: "Claude Assistant: Fatal error, no response received from Claude - please try again!",
    INVALID_CONTENT: "Claude Assistant: Invalid content received from Claude, not able to proceed.",
    INVALID_CONTENT_NO_GENERATE: "Claude Assistant: could not generate {0} from Claude's response - please try again.",
    UNKNOWN_ERROR: "Claude Assistant: Unknown Error, please check the browser console or try again!",
    NO_API_KEY_SPECIFIED: "You need to enter a Claude API Key in System Settings to use this SpiraApp!",
    NO_TEST_CASE_ID: "No test case ID was passed in as context, please try using the plugin without detailed test steps enabled!",
    MISSING_SETTINGS: "Claude Assistant: You need to populate the system settings to use this application!",
    MISSING_SETTING: "Claude Assistant: You need to populate the '{0}' system setting to use this application!",

    ARTIFACT_TEST_CASES: "test cases",
    ARTIFACT_TASKS: "tasks",
    ARTIFACT_BDD_STEPS: "BDD steps",
    ARTIFACT_RISKS: "risks",
    ARTIFACT_TEST_STEPS: "test steps",
    ARTIFACT_REQUIREMENTS: "requirements",
    ARTIFACT_MITIGATIONS: "mitigations",
    ARTIFACT_SOURCE_CODE: "source code"
}

