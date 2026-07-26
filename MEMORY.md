# trmnl-image-agent MEMORY

Updated: 2026-07-26

## Purpose
Generate and serve custom images for TRMNL e-ink displays via GitHub Pages

## Summary
TRMNL Image Agent fetches weather, ski resort, and astronomical data, uses xAI Grok to parse data and generate a dashboard image, processes it for e-ink displays (800x480 1-bit), and deploys via GitHub Pages for TRMNL Image Display plugin to pull.

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
- XAI_API_KEY (required): xAI API key for Grok chat parsing and Grok Imagine image generation

## Secret Refs
- XAI_API_KEY
- GITHUB_TOKEN

## Required CLI Tools
- git (required): Commit and push changes to GitHub for deployment
- jq (required): Parse and manipulate JSON data
- python3 (required): Prompt building and sun/moon helpers
- curl (required): Fetch raw weather data and call xAI APIs
- magick (required): ImageMagick for processing images to 800x480 1-bit format
- node (required): Run local Grok image CLI wrapper
- op (optional): 1Password CLI to fetch secrets from 1Password vault

## Auth Requirements
- xAI / Grok (required): Parse weather data + generate dashboard images [secret refs: XAI_API_KEY | tools: curl, node]
  note: Create key at https://console.x.ai — optional 1Password path: op://Development/xAI API Key/credential
- GitHub (required): Push commits to trigger GitHub Pages deployment [secret refs: GITHUB_TOKEN | tools: git]
  note: Can use SSH keys or git credential helper instead of GITHUB_TOKEN env var
- 1Password (optional): Fetch secrets (XAI_API_KEY) if not set in environment [tools: op]

## Host Integrations
- chrome-driver (optional in ski season): Extract Mohawk Mountain ski resort data from dynamic webpage
- OpenClaw media directory (required): Copy latest.png to allow local-path plugin to access the image [path: ~/.openclaw/media/trmnl]

## Notes
- Images served at: https://the-focus-ai.github.io/trmnl-image-agent/latest.png
- TRMNL Image Display plugin pulls this URL at configured intervals
- Process flow: fetch-all (parallel) → parse-data (Grok chat) → build-prompt → generate-image (Grok Imagine) → process-image (ImageMagick) → git push
- Mohawk Mountain status, weather, sunrise/sunset, moon phase, and maple season data are fetched and displayed
- Output is 800x480 1-bit PNG, within TRMNL 5MB limit
- Defaults: TRMNL_PARSE_MODEL=grok-4.5, TRMNL_IMAGE_MODEL=grok-imagine-image-quality, TRMNL_IMAGE_ASPECT=16:9
