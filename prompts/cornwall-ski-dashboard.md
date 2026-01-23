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

### 1A. Fetch Weather Data (Subagent 1)

**Prompt file:** `prompts/fetch-weather.md`

Use WebFetch to get data from NWS:
- Current temperature, conditions, wind, wind chill
- Today's HIGH and LOW temperatures
- Active alerts (WINTER STORM WARNING, WATCH, etc.)
- Extended forecast (next 3-5 days)
- Snow predictions (especially important!)

**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

### 1B. Fetch Mohawk Conditions (Subagent 2)

**Prompt file:** `prompts/fetch-mohawk.md`

Use chrome-driver to get data from Mohawk (requires killing Chrome first):
- Trails open (X of 27)
- Lifts open (X of 8)
- Surface conditions
- Mountain alerts (closures, delayed openings)
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

## Banner Decision Logic

Based on the data from subagents, determine what to show in the bottom banner.

> **IMPORTANT:** The banner is the MOST VISIBLE part of the display. Use it to communicate the MOST IMPORTANT weather information - especially upcoming storms, extreme cold, or hazardous conditions.

| Priority | Condition | Threshold | Banner Text Example |
|----------|-----------|-----------|---------------------|
| 1 | Active NWS alert | Any active | `⚠ WINTER STORM WARNING IN EFFECT` |
| 2 | Mountain alert | Closure/delay | `MOUNTAIN CLOSED` or `OPENS 12PM` |
| 3 | Major snowstorm coming | 8"+ expected in next 48h | `BIG STORM SUN • 8-12" EXPECTED` |
| 4 | Extreme cold coming | Below 0°F or -10°F wind chill | `BITTER COLD SAT • LOW -5°F` |
| 5 | Storm + Cold combo | Both in forecast | `STORM SUN + FRIGID MON • BUNDLE UP!` |
| 6 | Significant snow | 4-8" expected | `SNOW SUN • 6" EXPECTED` |
| 7 | Rain event | Rain in forecast | `⚠ RAIN SUN - ICY CONDITIONS LIKELY` |
| 8 | Powder day | Fresh snow + cold temps | `POWDER DAY • 6" FRESH` |
| 9 | Perfect day | Sunny, 20-32°F | `BLUEBIRD DAY • PERFECT CONDITIONS` |
| 10 | None | No notable weather | Decorative pine branch border |

### Combining Multiple Weather Events

When multiple significant events are coming, combine them in the banner:
- Storm + Cold: `STORM SUN 8" • THEN BITTER COLD MON`
- Cold + Wind: `EXTREME COLD SAT • WIND CHILL -15°F`
- Storm timing: `HEAVY SNOW SUN PM - MON AM • 10" TOTAL`

---

## Step 2: Fill In Current Data

**KEY INFORMATION TO DISPLAY (in priority order):**

> **The display should answer: "What do I need to know before going skiing?"**

1. **UPCOMING MAJOR WEATHER** (most important!)
   - Big storms coming (when? how much snow?)
   - Extreme cold/wind chill warnings
   - Rain events that could affect conditions
2. Current temperature + conditions + wind chill
3. High/Low temperatures for today
4. Active weather advisories (WINTER STORM WARNING, etc.)
5. Mountain alerts (closures, delayed openings)
6. Sunrise and sunset times
7. Trail/lift status from Mohawk

**If a major storm is coming this weekend, THAT should be the main message!**

```yaml
# Date/Time (FROM STEP 0 - use actual current time!)
date: "THU 23 JAN"        # From: date "+%a %d %b" | tr '[:lower:]' '[:upper:]'
timestamp: "2:45 PM"      # From: date "+%I:%M %p"

# ALERTS (Priority 1 - these drive the visual)
weather_advisory: "COLD ADVISORY"           # or empty if none
storm_alert: "STORM WATCH SAT-SUN • 13\" EXPECTED"  # or empty
mountain_alert: ""                          # e.g., "MOUNTAIN CLOSED" or "OPENS 12PM"

# Weather - Current
temperature: "25"
conditions: "FAIR"
wind_chill: "16"                            # or same as temp if no chill
wind: "W 10-15 mph"
high: "27"
low: "-2"

# Weather - Upcoming (next 3 days) - USE THIS FOR BANNER
# LOOK FOR: storms, extreme cold, rain - these are what skiers need to know!
forecast:
  - day: "FRI"
    conditions: "PARTLY CLOUDY"
    high: "28"
    low: "12"
    snow_inches: 0
    notable: ""
  - day: "SAT"
    conditions: "CLOUDY"
    high: "32"
    low: "22"
    snow_inches: 0
    notable: ""
  - day: "SUN"
    conditions: "SNOW"
    high: "30"
    low: "18"
    snow_inches: 10                         # BIG STORM COMING!
    notable: "MAJOR STORM"
  - day: "MON"
    conditions: "PARTLY CLOUDY"
    high: "15"
    low: "-5"                               # VERY COLD after storm!
    snow_inches: 2
    notable: "BITTER COLD"

# Derived: What to show in bottom banner
# Since there's a big storm Sunday AND bitter cold Monday, combine them:
banner_text: "BIG STORM SUN • 10\" SNOW • THEN BITTER COLD MON"

# Mohawk Mountain
trails_open: "16"           # Count from chrome-driver screenshot
trails_total: "27"
base_depth: "20"
surface: "VARIABLE"         # From "Secondary Surface" on snow report
lifts_open: "4"             # Count from Lifts section

# Sun/Moon
sunrise: "7:10 AM"
sunset: "4:58 PM"
moon_phase: "waning crescent"
```

---

## Step 3: Build the Prompt

### Base Scene (always the same)
```
Black and white 1-bit line drawing illustration in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays, no gradients, no halftones.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (use black line work for tree details, white for snow), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. Sky in pure white, mountains rendered with black line hatching on white. All shading done with cross-hatching or stippling patterns, never solid gray.
```

### Left Side Signpost (varies based on alerts)

**If there IS a weather advisory:**
```
LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- '{{DATE}}' (top sign, arrow style pointing right)
- '{{TEMPERATURE}}°F {{CONDITIONS}}' (middle sign)
- 'HIGH {{HIGH}}°F / LOW {{LOW}}°F' (next sign)
- 'WIND CHILL {{WIND_CHILL}}°F' (lower sign, only if wind chill differs from temp)
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

### Bottom Center Banner (varies based on alerts/forecast)

Use the `banner_text` field from Step 2, which is determined by the decision logic in section 1F.

**If `banner_text` is set (alert or notable weather):**
```
BOTTOM CENTER - Banner ribbon with '{{BANNER_TEXT}}'
```

**If `banner_text` is empty (no notable weather):**
```
BOTTOM CENTER - Decorative pine branch border with small snowflakes
```

**Priority order for banner_text:**
1. Active NWS alert (WINTER STORM WARNING, etc.)
2. Mountain alert (CLOSED, DELAYED OPENING)
3. Upcoming major storm (12"+)
4. Upcoming significant snow (6"+)
5. Extreme cold warning
6. Rain warning
7. Powder day celebration
8. Bluebird/perfect day
9. Empty (use decorative border)

### Bottom Left Timestamp (always)
```
BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated {{TIMESTAMP}}'
```

### Style Instructions (always the same)
```
Style: 1-bit black and white line drawing for e-ink display. Use ONLY pure black and pure white - absolutely no gray tones. Woodcut/linocut etching aesthetic with bold black lines on white background. All shading must be done with hatching, cross-hatching, or stippling patterns - never solid gray fills. Text must be crisp black on white backgrounds. High contrast vintage ski poster aesthetic. Think classic woodblock print or pen and ink illustration.
```

---

## Step 4: Complete Prompt Examples

### Example A: Big Storm Coming This Weekend + Very Cold

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (black line hatching for tree details, white for snow), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, mountains with black cross-hatching for depth.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'THU 23 JAN' (top sign, arrow style pointing right)
- '25°F FAIR' (middle sign)
- 'HIGH 27°F / LOW 8°F' (next sign)
- 'WIND CHILL 16°F' (lower sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:10 AM'
- Moon phase icon showing waning crescent moon
- Sunset icon with '5:01 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '26/27 TRAILS'
- '20" BASE'
- 'VARIABLE'

BOTTOM CENTER - Large banner ribbon with 'BIG STORM SUN • 8-12" SNOW • THEN BITTER COLD'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 10:15 AM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

> **Key point:** The banner prominently displays that a big storm is coming Sunday with 8-12" of snow, followed by bitter cold. This is the most important information for someone planning their weekend skiing!

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

### Example C: Weekend Storm Approaching (Friday view)

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible. Ominous clouds suggested by dense black hatching on the horizon. Rocky outcrops and rolling hills of the Berkshires in background.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'FRI 24 JAN' (top sign, arrow style pointing right)
- '30°F CLOUDY' (middle sign)
- 'HIGH 32°F / LOW 20°F' (next sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:09 AM'
- Moon phase icon showing waning crescent moon
- Sunset icon with '5:03 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '26/27 TRAILS'
- '22" BASE'
- 'GROOMED'

BOTTOM CENTER - Large prominent banner ribbon with '⚠ MAJOR STORM SUN-MON • 10-14" EXPECTED'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 7:30 AM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

> **Key point:** Even though today (Friday) is nice, the banner warns about the major storm coming Sunday-Monday. Skiers need to know this to plan their weekend!

### Example D: Active Winter Storm Warning

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

### Example F: Rain Warning (important for skiers!)

```
Black and white 1-bit line drawing in woodcut/linocut etching style for e-ink display. Wide 16:9 landscape format. Use ONLY pure black and pure white - no grays.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible. Overcast sky suggested by dense black hatching across top. Rocky outcrops and rolling hills of the Berkshires in background with cross-hatching.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'THU 30 JAN' (top sign, arrow style pointing right)
- '38°F CLOUDY' (middle sign)
- 'HIGH 42°F / LOW 34°F' (lower sign)

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:04 AM'
- Moon phase icon showing new moon
- Sunset icon with '5:08 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '20/27 TRAILS'
- '38" BASE'
- 'VARIABLE'

BOTTOM CENTER - Warning banner ribbon with '⚠ RAIN TONIGHT • ICY CONDITIONS FRI AM'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 2:15 PM'

Style: 1-bit black and white line drawing. Use ONLY pure black and pure white - no gray tones. All shading with hatching/cross-hatching. Woodcut/linocut etching aesthetic. Crisp black text on white. Vintage ski poster style.
```

---

## Step 5: Generate Image (Exact Size for TRMNL)

> ⚠️ **IMPORTANT:** Generate the image at exactly 800x480 pixels to avoid cropping/resizing issues. Use the `--width` and `--height` flags.

```bash
export GEMINI_API_KEY=$(op read "op://Development/Google AI Studio Key/notesPlain")

mkdir -p output/$(date +%Y-%m)

npx @the-focus-ai/nano-banana "YOUR_COMPLETE_PROMPT_HERE" \
  --width 800 \
  --height 480 \
  --output output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png
```

## Step 6: Convert to 1-Bit Black & White for TRMNL

```bash
magick output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png \
  -colorspace Gray \
  -threshold 50% \
  -colors 2 \
  -depth 1 \
  PNG8:output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M).png
```

**Note:** Since we generated at exact 800x480, no resizing is needed. The `-threshold 50%` converts all pixels to pure black or pure white (1-bit) for crisp e-ink display. Adjust threshold percentage if needed (higher = more white, lower = more black).

## Step 7: Update README (ALWAYS DO THIS!)

After generating a new image, **always update README.md** to show the latest image:

1. **Update the image path in README.md:**
   - Find the line: `![Latest TRMNL Image](output/...)`
   - Replace with the path to your new TRMNL-ready image (the resized one, not the -full.png)

2. **Example:**
   ```markdown
   ![Latest TRMNL Image](output/2026-01/2026-01-23-14-45.png)
   ```

3. **Update the symlink (optional but helpful locally):**
   ```bash
   ln -sf 2026-01/2026-01-23-14-45.png output/latest.png
   ```

> ⚠️ **GitHub doesn't follow symlinks**, so the README must point to the actual file path, not `output/latest.png`

---

## Output File Structure

```
output/
├── 2026-01/
│   ├── 2026-01-23-09-52-full.png    # Original from nano-banana
│   ├── 2026-01-23-09-52.png         # TRMNL-ready (800x480, 1-bit B&W)
│   ├── 2026-01-23-14-30-full.png
│   ├── 2026-01-23-14-30.png
│   └── ...
├── 2026-02/
│   └── ...
└── latest.png -> 2026-01/2026-01-23-14-30.png
```

---

## Data Sources Quick Reference

| Data | Subagent Prompt | Method |
|------|-----------------|--------|
| Weather + Alerts + Forecast | `prompts/fetch-weather.md` | WebFetch |
| Mohawk Conditions | `prompts/fetch-mohawk.md` | chrome-driver |

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
