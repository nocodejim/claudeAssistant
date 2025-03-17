# Claude Assistant Development Guide

## Build & Run Commands
- **Build**: `npm run build` or `./build.sh` (creates package in ../dist)
- **Dependencies**: Requires spiraapp-package-generator in ../spiraapp-tools

## Code Style Guidelines

### Naming Conventions
- Functions: camelCase with module prefix (`claude_functionName`)
- Variables: camelCase (`localState`, `remoteRequirement`)
- Constants: UPPERCASE (`TEMPERATURE`, `MAX_TOKENS`)
- Object properties: PascalCase (`TestCases`, `Name`, `Description`)

### JavaScript Patterns
- Standard ES5/ES6 JavaScript without TypeScript
- Function declarations over arrow functions
- Consistent error handling through `claude_operation_failure`
- Centralized error messages in a `messages` object
- UI updates through spiraAppManager methods
- State management via `localState` object

### Code Organization
- Modular architecture with functionality separated by domain
- Clear comments describing complex operations
- API interactions encapsulated in dedicated functions
- Form state handling with consistent patterns
- Console logging used for development diagnostics

### Documentation
- Add descriptive comments for complex logic
- Document function parameters and return values
- Update README.md when adding new features