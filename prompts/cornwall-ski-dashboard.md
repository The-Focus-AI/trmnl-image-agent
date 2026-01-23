# Cornwall CT / Mohawk Mountain TRMNL Dashboard

> **PURPOSE:** This dashboard helps skiers plan their trips to Mohawk Mountain. The most important information is **upcoming weather events** - storms, extreme cold, rain - that affect skiing conditions and safety.

---

## ⚠️ CRITICAL: Always Do These First!

### Step 0a: Kill Chrome Browser (if needed)

Before using chrome-driver to fetch ski conditions, kill any existing Chrome instances to avoid WebSocket errors:

```bash
pkill -f "Google Chrome" || true; sleep 2
```

### Step 0b: Get Current Date & Time (ALWAYS DO THIS FIRST!)

**Run this command to get the current date and time:**
```bash
date "+%a %d %b %Y %I:%M %p"
```

This gives you the exact values for:
- `date`: Format as "DAY DD MON" (e.g., "THU 23 JAN")
- `timestamp`: Format as "HH:MM AM/PM" (e.g., "2:45 PM")

**Example output:** `Thu 23 Jan 2026 02:45 PM`
- Use `THU 23 JAN` for the date sign
- Use `2:45 PM` for the timestamp

> ⚠️ **NEVER use hardcoded or example dates!** Always fetch the real current time.

---

## Step 1: Fetch Data (Run as Parallel Subagents)

> **Run these two data fetches in parallel as subagents for faster results.**

### 1A. Fetch Weather Data (Subagent 1) — NWS ALERTS

**Prompt file:** `prompts/fetch-weather.md`

Use WebFetch to get data from NWS:
- Current temperature, conditions, wind, wind chill
- Today's HIGH and LOW temperatures
- **Active NWS alerts** (WINTER STORM WARNING, COLD ADVISORY, etc.) ← These are **WEATHER ALERTS**
- Extended forecast (next 3-5 days)
- Snow predictions (especially important!)

**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

### 1B. Fetch Mohawk Conditions (Subagent 2) — MOUNTAIN ALERTS

**Prompt file:** `prompts/fetch-mohawk.md`

Use chrome-driver to get data from Mohawk (requires killing Chrome first):
- Trails open (X of 27)
- Lifts open (X of 8)
- Surface conditions
- **Mountain alerts** (closures, early closings, tubing cancellations) ← These are **MOUNTAIN ALERTS**
- Hours of operation

**Source:** https://www.mohawkmtn.com/snow-report/

```bash
# Kill Chrome first!
pkill -f "Google Chrome" || true; sleep 2
```

### 1C. Sun/Moon (Quick lookup)

> WebSearch query: `Cornwall CT sunrise sunset today moon phase`

**Approximate for Cornwall CT (January):**
- Sunrise: ~7:08-7:12 AM
- Sunset: ~4:55-5:10 PM (increases ~1 min/day in late Jan)

---

## Alert Types — IMPORTANT DISTINCTION

There are TWO types of alerts that come from DIFFERENT sources:

### Weather Alerts (from NWS)
These are official National Weather Service advisories/warnings:
- `WINTER STORM WARNING` - Significant snow expected
- `WINTER STORM WATCH` - Potential for significant snow
- `COLD WEATHER ADVISORY` - Dangerous cold/wind chill
- `WIND ADVISORY` - High winds expected
- `BLIZZARD WARNING` - Snow + high winds

**Display on:** Left signpost as warning triangle sign

### Mountain Alerts (from Mohawk)
These are operational alerts from the ski resort:
- `CLOSES SAT 4PM` - Early closing
- `MOUNTAIN CLOSED` - Not operating
- `DELAYED OPENING` - Late start
- `TUBING CANCELLED` - Tubing not available
- `NIGHT SKIING CANCELLED` - No evening operations

**Display on:** Bottom banner (combined with weather if both exist)

---

## Banner Decision Logic

Based on the data from subagents, determine what to show in the bottom banner.

> **IMPORTANT:** The banner is the MOST VISIBLE part of the display. Use it to communicate the MOST IMPORTANT information - especially upcoming storms, extreme cold, or operational changes.

### Priority Order for Banner Content

| Priority | Condition | Source | Banner Text Example |
|----------|-----------|--------|---------------------|
| 1 | Active NWS warning + Mountain alert | Both | `⚠ STORM WARNING SUN 5-9" • CLOSES SAT 4PM` |
| 2 | Active NWS warning alone | NWS | `⚠ WINTER STORM WARNING • 8-12" EXPECTED` |
| 3 | Mountain closure/early close | Mohawk | `⚠ MOUNTAIN CLOSES SAT 4PM` |
| 4 | Major snowstorm coming | NWS | `BIG STORM SUN • 8-12" EXPECTED` |
| 5 | Extreme cold coming | NWS | `BITTER COLD SAT • LOW -5°F • WIND CHILL -15°F` |
| 6 | Storm + Cold combo | NWS | `STORM SUN 8" • THEN BITTER COLD MON` |
| 7 | Significant snow | NWS | `SNOW SUN • 6" EXPECTED` |
| 8 | Rain event | NWS | `⚠ RAIN SUN - ICY CONDITIONS LIKELY` |
| 9 | Powder day | Conditions | `❄ POWDER DAY • 6" FRESH ❄` |
| 10 | Perfect day | Conditions | `BLUEBIRD DAY • PERFECT CONDITIONS` |
| 11 | None | — | Decorative pine branch border |

### Combining Weather + Mountain Alerts

When BOTH a weather event AND a mountain alert exist, **combine them in the banner**:

```
⚠ STORM WARNING SUN 5-9" • CLOSES SAT 4PM
```

The bullet (•) separates weather info from mountain info. This tells skiers:
1. What weather is coming (storm Sunday, 5-9 inches)
2. What the mountain is doing about it (closing early Saturday)

---

## Step 2: Fill In Current Data

**KEY INFORMATION TO DISPLAY (in priority order):**

> **The display should answer: "What do I need to know before going skiing?"**

1. **UPCOMING MAJOR WEATHER** (most important!)
   - Big storms coming (when? how much snow?)
   - Extreme cold/wind chill warnings
   - Rain events that could affect conditions
2. **MOUNTAIN OPERATIONAL CHANGES** (closures, early closings)
3. Current temperature + conditions + wind chill
4. High/Low temperatures for today
5. Active weather advisories (on left signpost)
6. Sunrise and sunset times
7. Trail/lift status from Mohawk

**If a major storm is coming AND the mountain is closing early, BOTH should be in the banner!**

```yaml
# Date/Time (FROM STEP 0 - use actual current time!)
date: "THU 23 JAN"        # From: date "+%a %d %b" | tr '[:lower:]' '[:upper:]'
timestamp: "2:45 PM"      # From: date "+%I:%M %p"

# WEATHER ALERTS (from NWS - display on left signpost)
weather_advisory: "COLD ADVISORY"           # Active NWS advisory, or empty
nws_warning: "WINTER STORM WARNING"         # Active NWS warning, or empty
storm_forecast: "SUN 5-9\""                 # Expected snow, or empty

# MOUNTAIN ALERTS (from Mohawk - combine with weather in banner)
mountain_alert: "CLOSES SAT 4PM"            # e.g., early closing, closure, etc.
tubing_status: "CANCELLED SUN"              # If tubing affected

# Weather - Current
temperature: "25"
conditions: "FAIR"
wind_chill: "16"                            # or same as temp if no chill
wind: "W 10-15 mph"
high: "27"
low: "-2"

# Weather - Upcoming (next 3 days) - USE THIS FOR BANNER
forecast:
  - day: "FRI"
    conditions: "PARTLY CLOUDY"
    high: "28"
    low: "12"
    snow_inches: 0
  - day: "SAT"
    conditions: "CLOUDY"
    high: "32"
    low: "22"
    snow_inches: 0
  - day: "SUN"
    conditions: "SNOW"
    high: "30"
    low: "18"
    snow_inches: 8                          # BIG STORM COMING!

# Derived: What to show in bottom banner
# Combine weather warning + mountain alert:
banner_text: "⚠ STORM WARNING SUN 5-9\" • CLOSES SAT 4PM"

# Mohawk Mountain
trails_open: "26"
trails_total: "27"
base_depth: "20"
surface: "VARIABLE"
lifts_open: "6"

# Sun/Moon
sunrise: "7:10 AM"
sunset: "5:07 PM"
moon_phase: "waxing crescent"
```

---

## Step 3: Build the Prompt

### Base Scene (always the same)
```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (black line hatching for tree details, white for snow), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, mountains with black cross-hatching for depth.
```

### Left Side Signpost (varies based on WEATHER alerts)

**If there IS a weather advisory (from NWS):**
```
LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- '{{DATE}}' (top sign, arrow style pointing right)
- '{{TEMPERATURE}}°F {{CONDITIONS}}' (middle sign)
- 'HIGH {{HIGH}}°F / LOW {{LOW}}°F' (next sign)
- 'WIND CHILL {{WIND_CHILL}}°F' (lower sign, only if wind chill differs from temp by 5°F+)
- Warning triangle sign with '⚠ {{WEATHER_ADVISORY}}'
```

**If there is NO weather advisory:**
```
LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- '{{DATE}}' (top sign, arrow style pointing right)
- '{{TEMPERATURE}}°F {{CONDITIONS}}' (middle sign)
- 'HIGH {{HIGH}}°F / LOW {{LOW}}°F' (lower sign)
```

> **Always include HIGH/LOW temperatures** - this is key information for skiers planning their day!

### Top Right Icons (always the same structure)
```
TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '{{SUNRISE}}'
- Moon phase icon showing {{MOON_PHASE}} moon
- Sunset icon with '{{SUNSET}}'
```

### Bottom Right Ski Board (always the same structure)
```
BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '{{TRAILS_OPEN}}/{{TRAILS_TOTAL}} TRAILS'
- '{{BASE_DEPTH}}" BASE'
- '{{SURFACE}}'
```

### Bottom Center Banner (combines WEATHER + MOUNTAIN alerts)

Use the `banner_text` field from Step 2, which combines weather and mountain info.

**If there's weather AND mountain alerts:**
```
BOTTOM CENTER - Large prominent banner ribbon with '⚠ STORM WARNING SUN 5-9" • CLOSES SAT 4PM'
```

**If there's only weather alert:**
```
BOTTOM CENTER - Large prominent banner ribbon with '⚠ WINTER STORM WARNING • 8-12" EXPECTED'
```

**If there's only mountain alert:**
```
BOTTOM CENTER - Banner ribbon with '⚠ MOUNTAIN CLOSES SAT 4PM'
```

**If `banner_text` is empty (no notable weather or mountain alerts):**
```
BOTTOM CENTER - Decorative pine branch border with small snowflakes
```

### Bottom Left Timestamp (always)
```
BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated {{TIMESTAMP}}'
```

### Style Instructions (always the same)
```
Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

---

## Step 4: Complete Prompt Examples

### Example A: Weather Warning + Mountain Alert (Combined)

This is the most common scenario during a storm - NWS has issued a warning AND the mountain is adjusting hours.

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (black line hatching for tree details, white for snow), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky with some ominous clouds suggested by dense hatching on the horizon indicating incoming storm.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'FRI 23 JAN' (top sign, arrow style pointing right)
- '33°F FAIR' (middle sign)
- 'HIGH 27°F / LOW -2°F' (next sign)
- 'WIND CHILL 24°F' (lower sign)
- Warning triangle sign with '⚠ COLD ADVISORY'

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:16 AM'
- Moon phase icon showing waxing crescent moon
- Sunset icon with '5:07 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '26/27 TRAILS'
- '20" BASE'
- 'VARIABLE'

BOTTOM CENTER - Large prominent banner ribbon with '⚠ STORM WARNING SUN 5-9" • CLOSES SAT 4PM'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 4:15 PM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

> **Key point:** The banner combines BOTH the NWS storm warning (5-9" Sunday) AND the mountain alert (closing Saturday at 4PM). The left signpost shows the COLD ADVISORY separately.

### Example B: No Alerts (nice day)

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (black line work for details, white for snow), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, mountains with black hatching.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'SAT 25 JAN' (top sign, arrow style pointing right)
- '32°F SUNNY' (middle sign)
- 'HIGH 35°F / LOW 20°F' (lower sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:08 AM'
- Moon phase icon showing waxing gibbous moon
- Sunset icon with '5:02 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '27/27 TRAILS'
- '28" BASE'
- 'POWDER'

BOTTOM CENTER - Decorative pine branch border with small snowflakes

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 8:30 AM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

### Example C: Active Winter Storm Warning (Weather only)

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky with black stippled snowflakes scattered across scene to suggest heavy snowfall.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'SUN 26 JAN' (top sign, arrow style pointing right)
- '28°F SNOW' (middle sign)
- 'HIGH 30°F / LOW 22°F' (next sign)
- 'WIND CHILL 15°F' (lower sign)
- Warning triangle sign with '⚠ WINTER STORM WARNING'

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:08 AM'
- Moon phase icon showing waxing gibbous moon
- Sunset icon with '5:02 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '20/27 TRAILS'
- '32" BASE'
- 'POWDER'

BOTTOM CENTER - Large banner ribbon with '⚠ BLIZZARD CONDITIONS • 18" FALLING'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 11:45 AM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

### Example D: Mountain Alert Only (no weather warning)

When the mountain has operational changes but no NWS weather warning is active.

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, mountains with black hatching.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'SAT 25 JAN' (top sign, arrow style pointing right)
- '35°F CLOUDY' (middle sign)
- 'HIGH 38°F / LOW 28°F' (lower sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:07 AM'
- Moon phase icon showing first quarter moon
- Sunset icon with '5:04 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '25/27 TRAILS'
- '24" BASE'
- 'GROOMED'

BOTTOM CENTER - Banner ribbon with '⚠ NIGHT SKIING CANCELLED TONIGHT'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 3:30 PM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

### Example E: Powder Day (day after storm)

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees heavily laden with fresh snow (black line details, white snow), ski lift chairs visible, and a skier spraying powder while carving down an ungroomed trail. Brilliant sunshine suggested by white radiating lines from sun. Rocky outcrops and rolling hills of the Berkshires in background with black hatching.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'MON 27 JAN' (top sign, arrow style pointing right)
- '22°F SUNNY' (middle sign)
- 'HIGH 28°F / LOW 12°F' (lower sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:07 AM'
- Moon phase icon showing waxing gibbous moon
- Sunset icon with '5:04 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '27/27 TRAILS'
- '45" BASE'
- 'POWDER'

BOTTOM CENTER - Celebratory banner ribbon with '❄ POWDER DAY • 15" FRESH ❄'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 7:30 AM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

---

## Step 5: Generate Image with nano-banana

> ⚠️ **IMPORTANT:** The nano-banana CLI does NOT support `--width` and `--height` flags reliably. Always generate at default size and resize afterward.

### Method: Use --prompt-file flag

Save your prompt to a temporary file and use `--prompt-file`:

```bash
export GEMINI_API_KEY=$(op read "op://Development/Google AI Studio Key/notesPlain")

mkdir -p output/$(date +%Y-%m)

# Write prompt to temp file
cat > /tmp/trmnl-prompt.txt << 'EOF'
YOUR_COMPLETE_PROMPT_HERE
EOF

# Generate image using --prompt-file
npx @the-focus-ai/nano-banana --prompt-file /tmp/trmnl-prompt.txt \
  --output output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png
```

> ⚠️ **DO NOT pass the prompt as a command-line argument** - long prompts with special characters will be parsed incorrectly. Always use `--prompt-file`.

---

## Step 6: Resize and Convert to 1-Bit for TRMNL

The generated image will likely be larger than 800x480. **Always resize** to exact TRMNL dimensions:

```bash
magick output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png \
  -resize 800x480! \
  -colorspace Gray \
  -threshold 50% \
  -colors 2 \
  -depth 1 \
  PNG8:output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M).png
```

**Flags explained:**
- `-resize 800x480!` - Force exact 800x480 dimensions (the `!` ignores aspect ratio)
- `-threshold 50%` - Convert to pure black/white (adjust if needed: higher = more white)
- `-colors 2 -depth 1` - Ensure 1-bit color depth
- `PNG8:` - Output as 8-bit PNG (compatible with TRMNL)

---

## Step 7: Push to TRMNL

```bash
export TRMNL_WEBHOOK_URL=$(op read "op://Personal/Market TRMNL Webhook/notesPlain")

./push_to_trmnl.sh output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M).png
```

**Limits:** 800x480 pixels max, PNG/JPEG/BMP, max 5MB, 12 uploads/hour

---

## Step 8: Update README (ALWAYS DO THIS!)

After generating a new image, **always update README.md** to show the latest image:

1. **Update the image path in README.md:**
   - Find the line: `![Latest TRMNL Image](output/...)`
   - Replace with the path to your new TRMNL-ready image (the resized one, not the -full.png)

2. **Example:**
   ```markdown
   ![Latest TRMNL Image](output/2026-01/2026-01-23-16-15.png)
   ```

> ⚠️ **GitHub doesn't follow symlinks**, so the README must point to the actual file path

---

## Output File Structure

```
output/
├── 2026-01/
│   ├── 2026-01-23-09-52-full.png    # Original from nano-banana (larger)
│   ├── 2026-01-23-09-52.png         # TRMNL-ready (800x480, 1-bit B&W)
│   ├── 2026-01-23-16-15-full.png
│   ├── 2026-01-23-16-15.png
│   └── ...
├── 2026-02/
│   └── ...
```

---

## Data Sources Quick Reference

| Data | Subagent Prompt | Method | Alert Type |
|------|-----------------|--------|------------|
| Weather + NWS Alerts | `prompts/fetch-weather.md` | WebFetch | **Weather Alerts** |
| Mohawk Conditions + Mountain Alerts | `prompts/fetch-mohawk.md` | chrome-driver | **Mountain Alerts** |

**Backup sources (if primary fails):**
- Ski conditions: https://www.onthesnow.com/connecticut/mohawk-mountain/skireport (WebFetch)
- Snow forecast: https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report (WebFetch)

---

## Resort Facts (static - no need to fetch)

| Fact | Value |
|------|-------|
| Total trails | 27 |
| Total lifts | 8 |
| Summit elevation | 1,600 ft |
| Vertical drop | 650 ft |
| Skiable terrain | 107 acres |
| Night skiing trails | 12 |
| Snowmaking coverage | 95% |
| Founded | 1947 (CT's oldest ski area) |
