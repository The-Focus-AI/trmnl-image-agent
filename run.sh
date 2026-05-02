#!/bin/bash
# Run script for TRMNL Image Agent
# Generates image, copies to latest.png, commits and pushes
# GitHub Pages serves latest.png for TRMNL Image Display plugin

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$SCRIPT_DIR/.env"
    set +a
fi

# Verify required variables
if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "Error: GEMINI_API_KEY not set"
    echo "Set it in .env, environment, or make sure 1Password CLI is available to bin/generate-image"
    exit 1
fi

# Run the modular update script and capture the final image path
FINAL_IMAGE=$("$SCRIPT_DIR/bin/update-display")

if [ -n "$FINAL_IMAGE" ] && [ -f "$FINAL_IMAGE" ]; then
    # Build the specific GitHub raw URL for this dated image
    SPECIFIC_URL="https://raw.githubusercontent.com/The-Focus-AI/trmnl-image-agent/main/${FINAL_IMAGE}"

    echo ""
    echo "TRMNL image updated — $SPECIFIC_URL hosted on GitHub"
    echo "GitHub Pages latest: https://the-focus-ai.github.io/trmnl-image-agent/latest.png"
    echo "Copied to: $HOME/.openclaw/media/trmnl/latest.png"
fi

echo ""
echo "Latest file: $(basename "$FINAL_IMAGE")"
