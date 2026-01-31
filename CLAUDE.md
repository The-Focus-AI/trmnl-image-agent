# TRMNL Image Agent

Project for generating custom images for TRMNL e-ink displays.

## How It Works

Images are served via **GitHub Pages** using the **Image Display plugin**:

1. Generate image → process for e-ink → copy to `output/latest.png`
2. Commit and push to GitHub
3. GitHub Pages deploys automatically
4. TRMNL pulls from `https://the-focus-ai.github.io/trmnl-image-agent/latest.png`

## Environment Variables

For each variable, first check if it's already set in the environment. If not set, fetch from 1Password using the `op read` command.

| Variable | 1Password Path |
|----------|----------------|
| GEMINI_API_KEY | `op://Development/Google AI Studio Key/notesPlain` |

## TRMNL Image Limits

800x480 pixels, PNG/JPEG/BMP, max 5MB

## Image Processing

The `bin/process-image` script:
1. Resizes to 800x480
2. Converts to 1-bit black/white
3. Copies to `output/latest.png` for GitHub Pages
