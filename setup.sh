#!/bin/bash

# Setup script for TRMNL Image Agent
# Checks for .env file and creates one if missing using Claude

set -e

ENV_FILE=".env"

if [ -f "$ENV_FILE" ]; then
    echo ".env file already exists. Skipping setup."
    echo "To regenerate, delete .env and run this script again."
    exit 0
fi

echo "No .env file found. Running Claude to generate environment configuration..."
echo ""

claude --model sonnet --verbose -p --output-format=stream-json --dangerously-skip-permissions \
  "Read CLAUDE.md to find the required environment variables and their 1Password paths. For each variable, first check if it's already set in the environment. If set, use that value. If not set, fetch from 1Password using the op command. Write all variables to a .env file."

echo ""
echo "Setup complete. Please verify the .env file was created correctly."
