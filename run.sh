#!/bin/bash

# Run script for TRMNL Image Agent
# Uses modular bin scripts for fast updates

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if 1Password CLI is available for secrets
if ! command -v op &> /dev/null; then
    echo "Warning: 1Password CLI not found. Checking for environment variables..."

    # Check required env vars
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "Error: GEMINI_API_KEY not set"
        exit 1
    fi
    if [ -z "$TRMNL_WEBHOOK_URL" ]; then
        echo "Error: TRMNL_WEBHOOK_URL not set"
        exit 1
    fi
fi

# Run the modular update script
"$SCRIPT_DIR/bin/update-display"

echo ""
echo "To update README and commit, run:"
echo "  git add README.md output/ && git commit -m 'Update TRMNL image' && git push"
