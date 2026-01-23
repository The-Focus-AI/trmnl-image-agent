---
title: "TRMNL Custom Images: Complete Implementation Guide for Multi-Device Setups"
date: 2026-01-23
topic: trmnl-custom-images
recommendation: Webhook Image Plugin + Private Plugins
version_researched: "Framework v2, Firmware 2025"
use_when:
  - You want to display custom-generated images on TRMNL e-ink displays
  - You have multiple TRMNL devices (3+) requiring unique content feeds
  - You want programmatic control over display content via APIs
  - You're building automated dashboards or dynamic image generation
avoid_when:
  - You only need standard plugins from the TRMNL marketplace
  - You don't need unique content per device (mirroring is sufficient)
  - You're not comfortable with basic API/webhook integrations
project_context:
  language: Python/Node.js
  relevant_dependencies: Pillow, Flask, ImageMagick, requests
---

## Summary

TRMNL is a 7.5" e-ink display device (800x480 pixels) that renders content as 1-bit or 2-bit PNG images[1]. Custom images can be delivered through three primary methods: the **Webhook Image plugin** (experimental), **Private Plugins** with webhook/polling strategies, or a **Bring Your Own Server (BYOS)** setup[2]. For multi-device configurations with unique feeds, each device requires its own API key through either the Developer Edition add-on (for native TRMNL devices) or BYOD licenses (for DIY hardware)[3].

The image format requirements are straightforward: PNG, JPEG, or BMP formats up to 5MB, with optimal dimensions of **800x480 pixels** for standard TRMNL displays[4]. The system supports 16 levels of grayscale through dithering, with 1-bit displays approximating 14 shades and 2-bit displays adding 12 more[5]. For programmatic image generation, Python with Pillow or ImageMagick are the recommended tools, using Floyd-Steinberg dithering to achieve optimal e-ink rendering[6].

To set up 3 devices with unique feeds, you'll need the Developer Edition add-on and will create separate Private Plugin instances, each with its own Plugin UUID and webhook URL. This gives each device independent content control while sharing a single TRMNL account[7].

## Philosophy & Mental Model

TRMNL operates on a **pull-based architecture**: your device periodically wakes from sleep, pings the TRMNL server, receives an image URL, downloads and displays it, then returns to sleep[1]. This is important because you cannot "push" directly to the device—instead, you push content to TRMNL's servers, and the device pulls it on its next refresh cycle.

The core abstraction is the **Plugin**, which is a content source for your display. Plugins can be:
- **Standard** (marketplace plugins like weather, calendar)
- **Private** (your custom content via webhooks or polling)
- **Image Display** (direct URL to an image)
- **Webhook Image** (POST images directly to TRMNL)

Each device has a **Playlist**—an ordered list of enabled plugins that rotate on display. When multiple devices share the same API key, they share the same playlist and auto-advance together, which can cause content synchronization issues[8].

For unique content per device, the mental model shifts to: **One Plugin Instance = One Content Stream**. You create separate Private Plugin instances, each with its own webhook URL/UUID, and assign different instances to different device playlists.

## Setup

### Prerequisites

1. **TRMNL Account** with 3 devices registered
2. **Developer Edition add-on** ($19 one-time)[3]
3. A server/service to generate and deliver images (Cloudflare Workers, PythonAnywhere, GitHub Actions, or self-hosted)

### Step 1: Enable Developer Features

Navigate to your TRMNL account settings and purchase the Developer Edition add-on if you haven't already. This unlocks:
- Private Plugin creation
- API access
- Webhook capabilities

### Step 2: Create Private Plugin Instances (One Per Device)

For each of your 3 devices:

1. Go to **Plugins > Private Plugin > Add New**
2. Name it distinctively (e.g., "Office Display", "Kitchen Display", "Bedroom Display")
3. Select **Strategy: Webhook** (recommended for image pushing)
4. Click **Save**
5. Copy the **Plugin UUID** and **Webhook URL** from the configuration form

You'll have 3 separate webhook URLs:
```
https://usetrmnl.com/api/custom_plugins/UUID-DEVICE-1
https://usetrmnl.com/api/custom_plugins/UUID-DEVICE-2
https://usetrmnl.com/api/custom_plugins/UUID-DEVICE-3
```

### Step 3: Assign Plugins to Device Playlists

1. Switch to each device using the top-right dropdown
2. Go to the **Playlist** tab
3. Enable only the Private Plugin instance for that device
4. Disable or remove other content if you want exclusive display

### Alternative: Webhook Image Plugin (Experimental)

For direct image pushing without templates:

1. Go to **Plugins > Webhook Image**
2. Click **Enable this plugin**
3. Copy the webhook URL
4. POST images directly using:

```bash
curl -X POST \
  -H "Content-Type: image/png" \
  --data-binary @my-image.png \
  "YOUR_WEBHOOK_URL"
```

**Limitations:**
- Maximum 5MB file size[4]
- Rate limit: 12 uploads per hour[4]
- No image processing—must match device specs exactly

## Core Usage Patterns

### Pattern 1: Webhook with Merge Variables (Recommended)

Send structured data to TRMNL and let their templating engine render it. Best for text-heavy content or when using TRMNL's design framework.

```python
import requests
import json

WEBHOOK_URL = "https://usetrmnl.com/api/custom_plugins/YOUR-UUID"

def push_to_trmnl(device_name: str, data: dict):
    """Push merge variables to a specific device's plugin."""
    payload = {
        "merge_variables": {
            "title": data.get("title", "Dashboard"),
            "items": data.get("items", []),
            "updated_at": data.get("timestamp", ""),
            "device_name": device_name
        }
    }

    response = requests.post(WEBHOOK_URL, json=payload)

    if response.status_code == 429:
        print("Rate limited - wait before retry")
    elif response.status_code == 200:
        result = response.json()
        if result.get("message"):
            print(f"Warning: {result['message']}")
        else:
            print("Success!")

    return response

# Example: Push different content to each device
devices = {
    "office": {"url": "https://usetrmnl.com/api/custom_plugins/UUID-1", "content": {"title": "Office Tasks"}},
    "kitchen": {"url": "https://usetrmnl.com/api/custom_plugins/UUID-2", "content": {"title": "Kitchen Timer"}},
    "bedroom": {"url": "https://usetrmnl.com/api/custom_plugins/UUID-3", "content": {"title": "Sleep Schedule"}},
}

for name, config in devices.items():
    push_to_trmnl(name, config["content"])
```

**Rate Limits:**
- Standard: 12 payloads/hour per plugin[2]
- TRMNL+: 30 payloads/hour[2]
- Max payload: 2KB (5KB for TRMNL+)[2]

### Pattern 2: Direct Image Push via Webhook Image

Generate an image locally and POST it directly. Best for complex visualizations, charts, or photos.

```python
from PIL import Image, ImageDraw, ImageFont
import io
import requests

def generate_device_image(device_id: int, content: str) -> bytes:
    """Generate an 800x480 1-bit image for TRMNL."""
    # Create base image
    img = Image.new('RGB', (800, 480), color='white')
    draw = ImageDraw.Draw(img)

    # Add content (customize per device)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
    except:
        font = ImageFont.load_default()

    draw.text((50, 200), content, fill='black', font=font)
    draw.text((50, 50), f"Device {device_id}", fill='black', font=font)

    # Convert to 1-bit with Floyd-Steinberg dithering
    img_1bit = img.convert('1', dither=Image.Dither.FLOYDSTEINBERG)

    # Save to bytes
    buffer = io.BytesIO()
    img_1bit.save(buffer, format='PNG')
    buffer.seek(0)

    return buffer.getvalue()

def push_image_to_device(webhook_url: str, image_bytes: bytes):
    """Push a PNG image to TRMNL Webhook Image plugin."""
    headers = {"Content-Type": "image/png"}
    response = requests.post(webhook_url, data=image_bytes, headers=headers)
    return response

# Generate and push unique images to each device
webhook_urls = [
    "https://usetrmnl.com/webhook-image/DEVICE-1-URL",
    "https://usetrmnl.com/webhook-image/DEVICE-2-URL",
    "https://usetrmnl.com/webhook-image/DEVICE-3-URL",
]

contents = ["Office Dashboard", "Kitchen Status", "Bedroom Clock"]

for i, (url, content) in enumerate(zip(webhook_urls, contents)):
    img = generate_device_image(i + 1, content)
    push_image_to_device(url, img)
```

### Pattern 3: Polling Endpoint (Server-Side)

TRMNL fetches content from your URL at intervals. Best for always-fresh data without managing push timing.

```python
from flask import Flask, jsonify, request
import datetime

app = Flask(__name__)

# Store content per device
device_content = {
    "device-1": {"title": "Office", "data": []},
    "device-2": {"title": "Kitchen", "data": []},
    "device-3": {"title": "Bedroom", "data": []},
}

@app.route('/trmnl/<device_id>', methods=['GET'])
def get_device_content(device_id):
    """Endpoint polled by TRMNL for each device."""
    content = device_content.get(device_id, {})

    return jsonify({
        "title": content.get("title", "Unknown"),
        "items": content.get("data", []),
        "timestamp": datetime.datetime.now().isoformat(),
        "device": device_id
    })

@app.route('/update/<device_id>', methods=['POST'])
def update_device(device_id):
    """Update content for a specific device."""
    if device_id in device_content:
        device_content[device_id]["data"] = request.json.get("data", [])
        return jsonify({"status": "updated"})
    return jsonify({"error": "unknown device"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Configure each Private Plugin to poll a different endpoint:
- Device 1: `https://yourserver.com/trmnl/device-1`
- Device 2: `https://yourserver.com/trmnl/device-2`
- Device 3: `https://yourserver.com/trmnl/device-3`

### Pattern 4: BYOS (Bring Your Own Server)

Run your own image server that TRMNL devices connect to directly, bypassing usetrmnl.com entirely.

```bash
# Clone the official Python BYOS template
git clone https://github.com/usetrmnl/byos_fastapi
cd byos_fastapi

# Setup
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Configure for your devices
export BYOS_DEVICE_MAC="AA:BB:CC:DD:EE:F1,AA:BB:CC:DD:EE:F2,AA:BB:CC:DD:EE:F3"
export BYOS_DEVICE_ACCESS_TOKEN="your-secure-token"

# Run
make serve
```

On each TRMNL device:
1. Hold button 5+ seconds to enter setup
2. Connect phone to TRMNL WiFi
3. Select "Custom server"
4. Enter: `http://your-server-ip:4567`

The BYOS server generates images via Pillow plugins in the `plugins/` directory[9].

### Pattern 5: ImageMagick for Pre-Generated Images

Convert existing images to TRMNL-compatible format:

```bash
# Basic 1-bit conversion with Floyd-Steinberg dithering
convert input.jpg \
  -resize 800x480^ \
  -gravity center \
  -extent 800x480 \
  -dither FloydSteinberg \
  -colors 2 \
  -type bilevel \
  BMP3:output.bmp

# For 2-bit grayscale (4 shades)
convert input.jpg \
  -resize 800x480^ \
  -gravity center \
  -extent 800x480 \
  -dither FloydSteinberg \
  -define dither:diffusion-amount=85% \
  -remap eink-4gray.png \
  BMP3:output.bmp

# For PNG output (TRMNL preferred)
convert input.jpg \
  -resize 800x480^ \
  -gravity center \
  -extent 800x480 \
  -dither FloydSteinberg \
  -colors 2 \
  PNG8:output.png
```

## Anti-Patterns & Pitfalls

### Don't: Share API Keys Across Devices for Unique Content

```python
# BAD: All devices share one webhook
SHARED_WEBHOOK = "https://usetrmnl.com/api/custom_plugins/SHARED-UUID"

for device in devices:
    requests.post(SHARED_WEBHOOK, json={"data": device["content"]})
```

**Why it's wrong:** Each POST overwrites the previous content. When devices fetch, they all get the same (last) content, and playlist auto-advance causes them to show different items in rotation[8].

### Instead: One Plugin Instance Per Device

```python
# GOOD: Each device has its own webhook
device_webhooks = {
    "office": "https://usetrmnl.com/api/custom_plugins/UUID-1",
    "kitchen": "https://usetrmnl.com/api/custom_plugins/UUID-2",
    "bedroom": "https://usetrmnl.com/api/custom_plugins/UUID-3",
}

for device, webhook in device_webhooks.items():
    content = get_content_for(device)
    requests.post(webhook, json={"merge_variables": content})
```

### Don't: Upload Full-Color High-Resolution Images

```python
# BAD: Uploading a 4K photo directly
with open("photo_4k.jpg", "rb") as f:
    requests.post(webhook_url, data=f.read(), headers={"Content-Type": "image/jpeg"})
```

**Why it's wrong:** Large images waste bandwidth and the result looks terrible—e-ink displays can only show 2-16 shades, and TRMNL will resize/dither poorly[5].

### Instead: Pre-Process Images for E-Ink

```python
# GOOD: Optimize for e-ink before upload
from PIL import Image

img = Image.open("photo_4k.jpg")
img = img.resize((800, 480), Image.Resampling.LANCZOS)
img = img.convert('L')  # Grayscale first
img = img.convert('1', dither=Image.Dither.FLOYDSTEINBERG)  # Then 1-bit
img.save("optimized.png", "PNG")
```

### Don't: Exceed Rate Limits Without Backoff

```python
# BAD: Rapid-fire updates
while True:
    requests.post(webhook_url, json=data)
    time.sleep(10)  # Every 10 seconds = 360/hour >> 12 limit
```

**Why it's wrong:** You'll get 429 errors and your content won't update[2].

### Instead: Respect Rate Limits

```python
# GOOD: Respect 12/hour limit (1 per 5 minutes)
import time

RATE_LIMIT_SECONDS = 300  # 5 minutes

def push_with_rate_limit(webhook_url, data):
    response = requests.post(webhook_url, json={"merge_variables": data})

    if response.status_code == 429:
        print("Rate limited, backing off...")
        time.sleep(RATE_LIMIT_SECONDS * 2)
        return push_with_rate_limit(webhook_url, data)

    time.sleep(RATE_LIMIT_SECONDS)
    return response
```

### Don't: Use Dithering for Text-Heavy Content

```python
# BAD: Dithering a text-only image
img = Image.new('L', (800, 480), 255)
draw = ImageDraw.Draw(img)
draw.text((50, 50), "Meeting at 3pm", fill=0)
img = img.convert('1', dither=Image.Dither.FLOYDSTEINBERG)  # Unnecessary dithering
```

**Why it's wrong:** Dithering makes text edges appear rough and less readable[5].

### Instead: Use No Dithering for Text

```python
# GOOD: Sharp text without dithering
img = Image.new('1', (800, 480), 1)  # Create directly in 1-bit mode
draw = ImageDraw.Draw(img)
draw.text((50, 50), "Meeting at 3pm", fill=0)  # Sharp black text
```

## Why This Choice

### Decision Criteria

| Criterion | Weight | How Webhook Image + Private Plugins Scored |
|-----------|--------|-------------------------------------------|
| Multi-device support | High | Excellent - each device gets own plugin instance |
| Image control | High | Full control via direct image upload or templates |
| Ease of setup | Medium | Moderate - requires Developer Edition |
| Cost efficiency | Medium | One-time $19 for unlimited private plugins |
| Flexibility | High | Supports webhooks, polling, templates, or raw images |
| Real-time updates | Low | Limited by 12/hour rate limit |

### Key Factors

- **Per-Device Independence:** Private Plugins with unique UUIDs give each device a dedicated content stream without playlist synchronization issues.
- **Image Format Flexibility:** The Webhook Image plugin accepts PNG/JPEG/BMP up to 5MB, allowing pre-processed images from any pipeline.
- **Template Power:** When using merge variables, Liquid templates provide dynamic rendering with TRMNL's optimized e-ink CSS framework.

## Alternatives Considered

### Image Display Plugin (Static URL)

- **What it is:** Point TRMNL at a URL hosting your image; it fetches and displays it
- **Why not chosen:** Requires managing cache headers (`etag`, `last-modified`) correctly; less control over timing
- **Choose this instead when:**
  - You have a static image hosting setup (S3, Cloudflare R2)
  - Your images rarely change
  - You want zero-code simplicity
- **Key tradeoff:** Simpler setup but requires proper HTTP caching knowledge

### Full BYOS (Bring Your Own Server)

- **What it is:** Run your own server that TRMNL devices connect to directly[9]
- **Why not chosen:** Requires server infrastructure, SSL setup, and ongoing maintenance
- **Choose this instead when:**
  - You need complete control over rendering
  - You want to avoid TRMNL's cloud entirely
  - You have multiple devices and want to avoid per-device licensing
- **Key tradeoff:** Maximum flexibility but significant setup overhead

### Device Mirroring

- **What it is:** Configure one "master" device and have others mirror its playlist[10]
- **Why not chosen:** All devices show the same content; defeats the purpose of unique feeds
- **Choose this instead when:**
  - You want identical content on all devices
  - You want simple management from one device
- **Key tradeoff:** Easy multi-device setup but no content differentiation

### Polling Strategy (Private Plugins)

- **What it is:** TRMNL fetches from your URL instead of you pushing to their webhook[7]
- **Why not chosen:** Requires a publicly accessible server; timeout constraints
- **Choose this instead when:**
  - Your content changes frequently and you want TRMNL to always fetch latest
  - You already have a public API
  - You prefer pull over push architecture
- **Key tradeoff:** Always fresh content but requires server infrastructure

## Caveats & Limitations

- **Rate Limiting:** Standard accounts limited to 12 pushes/hour per plugin; plan your update frequency accordingly[2]
- **Payload Size:** Webhook merge variables capped at 2KB (5KB for TRMNL+); use external URLs for large data[2]
- **Image Processing:** Webhook Image does no processing—your image must be correctly sized and formatted before upload[4]
- **Device Refresh Timing:** Devices poll on their own schedule (configurable per plugin); there's no way to force immediate refresh remotely
- **Experimental Status:** Webhook Image is marked experimental; API may change[4]
- **Developer Edition Required:** Custom plugins require the $19 Developer Edition add-on[3]
- **1-Bit Limitations:** Standard TRMNL displays only 2 colors (black/white); grayscale is simulated via dithering patterns[5]
- **TRMNL X Different Specs:** If you have a TRMNL X, it's 1872x1404 pixels with 4-bit (16 shades) grayscale—adjust image generation accordingly[11]

## Quick Reference: Image Specifications

| Device | Resolution | Color Depth | Recommended Format |
|--------|------------|-------------|-------------------|
| TRMNL OG | 800x480 | 1-bit (2 colors) | PNG, 1-bit |
| TRMNL OG (2-bit mode) | 800x480 | 2-bit (4 shades) | PNG, 2-bit |
| TRMNL X | 1872x1404 | 4-bit (16 shades) | PNG, 4-bit grayscale |

## References

[1] [TRMNL - How it Works](https://docs.usetrmnl.com/go/how-it-works) - Core architecture: device pings server, receives image URL, displays content

[2] [TRMNL Webhooks Documentation](https://docs.usetrmnl.com/go/private-plugins/webhooks) - Rate limits, payload format, merge strategies

[3] [TRMNL BYOD and Dev Edition Add-ons](https://help.usetrmnl.com/en/articles/11629486-calculating-byod-and-dev-edition-add-ons) - Licensing for multi-device unique content

[4] [TRMNL Webhook Image (Experimental)](https://help.usetrmnl.com/en/articles/13213669-webhook-image-experimental) - Direct image POST: 5MB max, 12/hour, PNG/JPEG/BMP

[5] [TRMNL Grayscale Modes](https://help.usetrmnl.com/en/articles/12386214-grayscale-1-bit-2-bit-4-bit-in-framework) - 1-bit/2-bit/4-bit display capabilities and dithering

[6] [Adafruit E-Ink Image Preparation Guide](https://learn.adafruit.com/preparing-graphics-for-e-ink-displays) - Floyd-Steinberg dithering, ImageMagick commands

[7] [TRMNL Private Plugins](https://help.usetrmnl.com/en/articles/9510536-private-plugins) - Webhook, polling, and plugin merge strategies

[8] [TRMNL API Introduction](https://docs.usetrmnl.com/go/private-api/introduction) - API keys per device, playlist auto-advance behavior

[9] [TRMNL BYOS FastAPI Server](https://github.com/usetrmnl/byos_fastapi) - Self-hosted Python server for TRMNL devices

[10] [TRMNL Device Mirroring](https://help.usetrmnl.com/en/articles/10530871-mirroring-a-device) - Master/child device content sharing

[11] [TRMNL X Product Page](https://shop.usetrmnl.com/products/trmnl-x) - 10.3" display, 1872x1404 resolution, 16 grayscale levels

[12] [TRMNL Plugin Boilerplate (Python)](https://github.com/OptimumMeans/TRMNL-Boilerplate) - Flask-based webhook template with display optimization

[13] [TRMNL Node.js BYOS Server](https://github.com/usetrmnl/byos_node_lite) - Official Node.js image server with JSX/Liquid templates

[14] [TRMNL Design Framework](https://usetrmnl.com/framework) - CSS utilities, layouts, and e-ink optimized components

[15] [TRMNL Plugin Tips & Tricks](https://github.com/yunruse/trmnl-tricks) - Widget dimensions, Liquid tips, webhook best practices
