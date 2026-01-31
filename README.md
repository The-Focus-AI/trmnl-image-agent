# TRMNL Image Agent

Generate and push custom images to TRMNL e-ink displays.

## Current Image

![Latest TRMNL Image](output/latest.png)

## How It Works

This project generates dashboard images and serves them via **GitHub Pages**. Your TRMNL device uses the **Image Display plugin** to pull the latest image from:

```
https://the-focus-ai.github.io/trmnl-image-agent/latest.png
```

## Prerequisites

- A TRMNL device
- Claude Code with the following plugins:
  - **nano-banana** - AI image generation using Google Gemini
  - **chrome-driver** - Browser automation for screenshots

### Install Claude Code Plugins

```bash
# Add the Focus.AI marketplace (one-time)
/plugin marketplace add The-Focus-AI/claude-marketplace

# Install required plugins
/plugin install nano-banana@focus-marketplace
/plugin install chrome-driver@focus-marketplace
```

Then restart Claude Code.

## TRMNL Setup (Image Display Plugin)

1. Log in to your TRMNL account at [usetrmnl.com](https://usetrmnl.com)
2. Go to **Plugins** > **Image Display**
3. Click **Add to my plugins**
4. Enter the image URL:
   ```
   https://the-focus-ai.github.io/trmnl-image-agent/latest.png
   ```
5. Set a refresh interval (e.g., 15-30 minutes)
6. Save and add to your device's playlist

That's it! TRMNL will now pull the latest image whenever the display refreshes.

## Usage

Run the agent to generate a new image:

```bash
claude --verbose -p --output-format=stream-json --dangerously-skip-permissions \
  "update the image, then commit and push everything"
```

This will:
1. Generate a new dashboard image using AI
2. Process it for e-ink (800x480, 1-bit)
3. Copy it to `output/latest.png`
4. Commit and push to GitHub
5. GitHub Pages automatically deploys the new image

## Image Requirements

| Spec | Value |
|------|-------|
| Resolution | 800x480 pixels |
| Format | PNG, JPEG, or BMP |
| Max size | 5MB |
| Color | 1-bit (black/white) works best |

### Tips for Best Results

- Use **Floyd-Steinberg dithering** for photos
- Avoid dithering for text-heavy images (keeps text sharp)
- Convert to 1-bit before uploading for predictable results

### Convert with ImageMagick

```bash
convert input.jpg \
  -resize 800x480^ \
  -gravity center \
  -extent 800x480 \
  -dither FloydSteinberg \
  -colors 2 \
  PNG8:output.png
```

## GitHub Pages Setup (One-Time)

To enable GitHub Pages for your fork:

1. Go to your repo's **Settings** > **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy when you push to `main`

The image will be available at:
```
https://<your-username>.github.io/<repo-name>/latest.png
```

## Resources

- [TRMNL Image Display Plugin](https://help.usetrmnl.com/en/articles/11479051-image-display)
- [TRMNL Design Framework](https://usetrmnl.com/framework)
- [E-Ink Image Preparation Guide](https://learn.adafruit.com/preparing-graphics-for-e-ink-displays)
