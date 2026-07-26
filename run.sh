#!/bin/bash
# Run script for TRMNL Image Agent
# Generates image → writes output/latest.png → commits + pushes to GitHub
# GitHub Pages deploys latest.png for the TRMNL Image Display plugin:
#   https://the-focus-ai.github.io/trmnl-image-agent/latest.png
#
# Set PUBLISH_ON_SUCCESS=0 to skip the git commit/push step.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LATEST_PNG="$SCRIPT_DIR/output/latest.png"
PAGES_URL="https://the-focus-ai.github.io/trmnl-image-agent/latest.png"

# Load XAI_API_KEY from env, .env, 1Password, or Grok CLI OAuth session
# shellcheck disable=SC1091
source "$SCRIPT_DIR/bin/load-xai-env"

# Verify required variables
if [ -z "${XAI_API_KEY:-}" ]; then
    echo "Error: XAI_API_KEY not set"
    echo "Set it in .env, run 'grok login', or create a key at https://console.x.ai"
    exit 1
fi

# Run the modular update script (fetch → parse → prompt → generate → process → publish)
# bin/update-display commits output/latest.png and pushes to origin so Pages can serve it.
# Only the last stdout line is the image path (ignore any accidental earlier leaks).
FINAL_IMAGE=$("$SCRIPT_DIR/bin/update-display" | tail -n 1 | tr -d '\r')
# Normalize relative paths against the repo root (this script may be invoked from anywhere)
case "$FINAL_IMAGE" in
    /*) ;;
    "") ;;
    *) FINAL_IMAGE="$SCRIPT_DIR/$FINAL_IMAGE" ;;
esac

if [ -z "$FINAL_IMAGE" ] || [ ! -f "$FINAL_IMAGE" ]; then
    echo "Error: pipeline did not produce a final image" >&2
    exit 1
fi

if [ ! -f "$LATEST_PNG" ]; then
    echo "Error: $LATEST_PNG was not written" >&2
    exit 1
fi

# Confirm local latest matches the processed e-ink image
if ! cmp -s "$FINAL_IMAGE" "$LATEST_PNG"; then
    echo "Error: output/latest.png does not match processed image $FINAL_IMAGE" >&2
    exit 1
fi

# After a successful publish (default), local branch should not be ahead of origin
PUBLISH_ON_SUCCESS="${PUBLISH_ON_SUCCESS:-1}"
if [ "$PUBLISH_ON_SUCCESS" = "1" ]; then
    if git -C "$SCRIPT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        if ! git -C "$SCRIPT_DIR" cat-file -e "HEAD:output/latest.png" 2>/dev/null; then
            echo "Error: output/latest.png is not committed in HEAD" >&2
            exit 1
        fi
        UPSTREAM="$(git -C "$SCRIPT_DIR" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
        if [ -n "$UPSTREAM" ]; then
            AHEAD="$(git -C "$SCRIPT_DIR" rev-list --count "${UPSTREAM}..HEAD" 2>/dev/null || echo 0)"
            if [ "${AHEAD:-0}" -gt 0 ]; then
                echo "Error: $AHEAD local commit(s) not pushed to $UPSTREAM" >&2
                exit 1
            fi
        fi
    fi
fi

# Build the specific GitHub raw URL for this dated image
case "$FINAL_IMAGE" in
    /*) FINAL_REL="${FINAL_IMAGE#"$SCRIPT_DIR"/}" ;;
    *)  FINAL_REL="$FINAL_IMAGE" ;;
esac
SPECIFIC_URL="https://raw.githubusercontent.com/The-Focus-AI/trmnl-image-agent/main/${FINAL_REL}"

echo ""
echo "TRMNL image updated"
echo "  Dated:  $SPECIFIC_URL"
echo "  Latest: $PAGES_URL"
echo "  Local:  $LATEST_PNG"
echo "  OpenClaw: $HOME/.openclaw/media/trmnl/latest.png"
echo ""
echo "Latest file: $(basename "$FINAL_IMAGE")"
