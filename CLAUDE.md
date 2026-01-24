# TRMNL Image Agent

Project for generating custom images for TRMNL e-ink displays.

## Environment Variables

For each variable, first check if it's already set in the environment. If not set, fetch from 1Password using the `op read` command.

| Variable | 1Password Path |
|----------|----------------|
| GEMINI_API_KEY | `op://Development/Google AI Studio Key/notesPlain` |
| TRMNL_WEBHOOK_URL | `op://Personal/Market TRMNL Webhook/notesPlain` |
| TRMNL_HOME_WEBHOOK_URL | `op://Personal/Home TRMNL Webhook/notesPlain` |

## TRMNL Image Limits

800x480 pixels, PNG/JPEG/BMP, max 5MB, 12 uploads/hour
