#!/bin/bash
# Run script for TRMNL Image Agent
# Generates image, copies to latest.png, commits and pushes
# GitHub Pages serves latest.png for TRMNL Image Display plugin

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env file if it exists
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Verify required variables
if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY not set"
    echo "Set it in .env or environment"
    exit 1
fi

# Run the modular update script and capture the final image path
FINAL_IMAGE=$("$SCRIPT_DIR/bin/update-display" | tail -1)

# Also copy the latest image into OpenClaw's state media dir so local-path sends work
# (OpenClaw allowlists ~/.openclaw/media by default.)
OPENCLAW_MEDIA_DIR="$HOME/.openclaw/media/trmnl"

# Commit and push changes (latest.png is already created by process-image)
if [ -n "$FINAL_IMAGE" ] && [ -f "$FINAL_IMAGE" ]; then
    mkdir -p "$OPENCLAW_MEDIA_DIR"
    cp -f "$FINAL_IMAGE" "$OPENCLAW_MEDIA_DIR/latest.png"

    cd "$SCRIPT_DIR"
    git add output/
    git commit -m "Update TRMNL image

Co-Authored-By: Claude <agent@anthropic.com>"
    git push
    
    # Build the specific GitHub raw URL for this dated image
    SPECIFIC_URL="https://raw.githubusercontent.com/The-Focus-AI/trmnl-image-agent/main/${FINAL_IMAGE}"

    echo ""
    echo "Changes committed and pushed"
    echo "TRMNL image updated — $SPECIFIC_URL hosted on GitHub"
    echo "GitHub Pages latest: https://the-focus-ai.github.io/trmnl-image-agent/latest.png"
    echo "Copied to: $OPENCLAW_MEDIA_DIR/latest.png"
fi

echo ""
echo "Latest file: $(basename "$FINAL_IMAGE")"
