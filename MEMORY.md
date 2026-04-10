# trmnl-image-agent MEMORY

Updated: 2026-03-15T18:32:14.337Z

## Purpose
Generate and serve custom images for TRMNL e-ink displays via GitHub Pages

## Summary
TRMNL Image Agent fetches weather, ski resort, and astronomical data, uses AI to generate a dashboard image, processes it for e-ink displays (800x480 1-bit), and deploys via GitHub Pages for TRMNL Image Display plugin to pull.

## Recommended Runtime
host

## Entry Points
- run.sh
- setup.sh
- bin/update-display

## Commands
- setup: bash setup.sh
- run: bash run.sh

## Required Env Vars
- GEMINI_API_KEY (required): Required for AI image generation via nano-banana (Google Gemini)

## Secret Refs
- GEMINI_API_KEY
- GITHUB_TOKEN
- ANTHROPIC_API_KEY

## Required CLI Tools
- git (required): Commit and push changes to GitHub for deployment
- jq (required): Parse and manipulate JSON data in build-prompt script
- python3 (required): Calculate sun/moon times in fetch-sun-moon script
- curl (required): Fetch raw weather data from NWS
- magick (required): ImageMagick for processing images to 800x480 1-bit format
- npx (required): Run nano-banana package for AI image generation
- op (optional): 1Password CLI to fetch secrets from 1Password vault

## Auth Requirements
- Google AI Studio (required): AI image generation via Gemini API through nano-banana plugin [secret refs: GEMINI_API_KEY | tools: npx]
  note: 1Password path: op://Development/Google AI Studio Key/notesPlain
- GitHub (required): Push commits to trigger GitHub Pages deployment [secret refs: GITHUB_TOKEN | tools: git]
  note: Can use SSH keys or git credential helper instead of GITHUB_TOKEN env var
- Anthropic Claude (required): Parse weather and ski data using Claude Haiku model in parse-data [secret refs: ANTHROPIC_API_KEY | tools: claude]
  note: Called as: claude --model haiku -p
- 1Password (optional): Fetch secrets (GEMINI_API_KEY) if not set in environment [tools: op]
  note: Used if GEMINI_API_KEY not in environment or .env file

## Host Integrations
- chrome-driver (required): Extract Mohawk Mountain ski resort data from dynamic webpage [path: ~/.claude/plugins/cache/focus-marketplace/chrome-driver/0.2.0/bin/extract]
- OpenClaw media directory (required): Copy latest.png to allow local-path plugin to access the image [path: ~/.openclaw/media/trmnl]
- Google Chrome (required): Required by chrome-driver for web extraction

## Notes
- Images served at: https://the-focus-ai.github.io/trmnl-image-agent/latest.png
- TRMNL Image Display plugin pulls this URL at configured intervals
- Process flow: fetch-all (parallel) → parse-data (Haiku) → build-prompt → generate-image (nano-banana/Gemini) → process-image (ImageMagick) → git push
- Mohawk Mountain status, weather, sunrise/sunset, moon phase, and maple season data are fetched and displayed
- Chrome is killed before extraction to avoid WebSocket errors
- Output is 800x480 1-bit PNG, within TRMNL 5MB limit
- Claude Code with plugins nano-banana and chrome-driver from Focus.AI marketplace required
