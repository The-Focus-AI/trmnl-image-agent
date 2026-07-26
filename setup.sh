#!/bin/bash

# Setup script for TRMNL Image Agent
# Checks for .env file and creates a template if missing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    echo ".env file already exists. Skipping setup."
    echo "To regenerate, delete .env and run this script again."
    exit 0
fi

echo "No .env file found. Creating template..."

# Prefer existing environment value, then 1Password, else empty template
XAI_VALUE="${XAI_API_KEY:-}"
if [ -z "$XAI_VALUE" ] && command -v op >/dev/null 2>&1; then
  XAI_VALUE="$(op read 'op://Development/xAI API Key/credential' 2>/dev/null || true)"
fi

if [ -n "$XAI_VALUE" ]; then
  umask 077
  printf 'XAI_API_KEY=%s\n' "$XAI_VALUE" > "$ENV_FILE"
  echo "Wrote XAI_API_KEY to .env from available credentials."
else
  umask 077
  cat > "$ENV_FILE" <<'EOF'
# Get a key at https://console.x.ai
XAI_API_KEY=
EOF
  echo "Created .env template. Add your XAI_API_KEY, then re-run."
fi

echo "Installing Node dependencies..."
npm install --no-fund --no-audit --prefix "$SCRIPT_DIR"

echo ""
echo "Setup complete."
