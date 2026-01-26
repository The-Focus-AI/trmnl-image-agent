#!/bin/bash

# Run script for TRMNL Image Agent
# Uses modular bin scripts for fast updates

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env file
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
else
    echo "Error: .env file not found"
    echo "Create .env with GEMINI_API_KEY, TRMNL_WEBHOOK_URL, TRMNL_HOME_WEBHOOK_URL"
    exit 1
fi

# Verify required variables
if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY not set in .env"
    exit 1
fi
if [ -z "$TRMNL_WEBHOOK_URL" ]; then
    echo "Error: TRMNL_WEBHOOK_URL not set in .env"
    exit 1
fi

# Run the modular update script
"$SCRIPT_DIR/bin/update-display"

echo ""
echo "To update README and commit, run:"
echo "  git add README.md output/ && git commit -m 'Update TRMNL image' && git push"
