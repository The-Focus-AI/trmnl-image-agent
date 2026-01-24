#!/bin/bash

# Run script for TRMNL Image Agent
# Checks for required environment variables and runs Claude to update the display

set -e

ENV_FILE=".env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found."
    echo "Run ./setup.sh first to create the environment configuration."
    exit 1
fi

# Required environment variables
REQUIRED_VARS=(
    "GEMINI_API_KEY"
    "TRMNL_WEBHOOK_URL"
    "TRMNL_HOME_WEBHOOK_URL"
)

# Check if dotenvx is installed
if ! command -v dotenvx &> /dev/null; then
    echo "Error: dotenvx is not installed."
    echo "Install it with: npm install -g @dotenvx/dotenvx"
    exit 1
fi

# Load .env and check for required variables
echo "Checking required environment variables..."
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    # Use dotenvx to check if variable is set in .env
    value=$(dotenvx get "$var" 2>/dev/null || echo "")
    if [ -z "$value" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "Error: Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Please update your .env file with the missing values."
    exit 1
fi

echo "All required environment variables are set."
echo "Running Claude to update the display..."
echo ""

dotenvx run -- claude --model sonnet --verbose -p --output-format=stream-json --dangerously-skip-permissions \
  "update the image and push it to the display, then update the readme and commit and push everything"

echo ""
echo "Done."
