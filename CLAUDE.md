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

## Seasonal Display Modes

The dashboard automatically selects a display mode:

| Priority | Condition | Mode | Info Board |
|----------|-----------|------|------------|
| 1 | Mohawk open + sap flowing | `blended` | Ski + Maple |
| 2 | Mohawk closed + sap flowing | `maple` | Maple season |
| 3 | Mohawk open | `ski` | Ski conditions |
| 4 | Mar 16 - May 15 | `spring` | Plant This Week |
| 5 | May 16 - Sep 15 | `summer` | Plant This Week |
| 6 | Sep 16 - Nov 30 | `fall` | Plant This Week |
| 7 | Default | `ski` | Ski conditions |

### Planting Calendar
Static data in `prompts/planting-calendar-zone6a.json` — week-by-week Zone 6a planting guide (Mar-Oct). Used by `bin/build-prompt` for the "PLANT THIS WEEK" info board.

### School Calendar
Static data in `prompts/school-calendar.json` — Region 1 school events. Used by `bin/build-prompt` to show upcoming school events (within 3 days) in the banner.

### Frost Risk
Computed deterministically in `bin/parse-data` based on tonight's low temp during growing season (Mar-May, Sep-Oct). Levels: `hard_freeze` (<=28F), `frost` (<=32F), `light_frost` (<=36F).

## Image Processing

The `bin/process-image` script:
1. Resizes to 800x480
2. Converts to 1-bit black/white
3. Copies to `output/latest.png` for GitHub Pages
