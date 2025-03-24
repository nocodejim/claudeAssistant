#!/bin/bash
# Simple build script for Claude Assistant SpiraApp

# Make sure the SpiraAppBundler is available 
if [ ! -d "../spiraapp-tools/spiraapp-package-generator" ]; then
  echo "spiraapp-package-generator not found. Please clone it first:"
  echo "git clone https://github.com/Inflectra/spiraapp-package-generator.git ../spiraapp-tools/spiraapp-package-generator"
  exit 1
fi

# Run the test suite
echo "Running test suite..."
if ! npm test; then
  echo "Tests failed. Aborting build."
  exit 1
fi
echo "Tests passed successfully."

# Create dist directory if it doesn't exist
mkdir -p ../dist

# Run the bundler
node ../spiraapp-tools/spiraapp-package-generator/index.js --input=./ --output=../dist

echo "SpiraApp package built in ../dist"
