#!/bin/bash
# Push an image to TRMNL Webhook Image endpoint

IMAGE_PATH="$1"
WEBHOOK_URL="${2:-$TRMNL_WEBHOOK_URL}"

if [ -z "$IMAGE_PATH" ]; then
    echo "Usage: ./push_to_trmnl.sh <image_path> [webhook_url]"
    echo "Set TRMNL_WEBHOOK_URL env var or pass as second argument"
    exit 1
fi

if [ -z "$WEBHOOK_URL" ]; then
    echo "Error: No webhook URL. Set TRMNL_WEBHOOK_URL or pass as argument"
    exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
    echo "Error: Image not found: $IMAGE_PATH"
    exit 1
fi

# Determine content type
case "${IMAGE_PATH##*.}" in
    png|PNG) CONTENT_TYPE="image/png" ;;
    jpg|jpeg|JPG|JPEG) CONTENT_TYPE="image/jpeg" ;;
    bmp|BMP) CONTENT_TYPE="image/bmp" ;;
    *) CONTENT_TYPE="image/png" ;;
esac

curl -X POST \
    -H "Content-Type: $CONTENT_TYPE" \
    --data-binary "@$IMAGE_PATH" \
    "$WEBHOOK_URL"

echo ""
