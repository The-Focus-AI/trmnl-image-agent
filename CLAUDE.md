# TRMNL Image Agent

Project for generating custom images for TRMNL e-ink displays.

## Environment Variables

Get Gemini API key from 1Password:

```bash
export GEMINI_API_KEY=$(op item get "gm5b2ksnsffccmjslpdtj2sw5y" --format json | jq -r '.fields[] | select(.label == "notesPlain") | .value')
```

Or use this shortcut:
```bash
export GEMINI_API_KEY=$(op read "op://Development/Google AI Studio Key/notesPlain")
```

## TRMNL Webhook

Get TRMNL Webhook URL from 1Password:

```bash
export TRMNL_WEBHOOK_URL=$(op read "op://Personal/Market TRMNL Webhook/notesPlain")
```

## Push Images to TRMNL

```bash
./push_to_trmnl.sh output/my-image.png
```

**Limits:** 800x480 pixels, PNG/JPEG/BMP, max 5MB, 12 uploads/hour
