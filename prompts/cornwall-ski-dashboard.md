# Cornwall CT / Mohawk Mountain TRMNL Dashboard

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

## Step 1: Fetch Data (in this order of priority)

### 1A. Weather Alerts (HIGHEST PRIORITY)
**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

> WebFetch prompt: `Extract any active weather alerts, watches, or warnings. Include the alert type, timeframe, and expected accumulation if mentioned.`

Look for these alerts in order of severity:
- **WINTER STORM WARNING** - Blizzard, ice storm, heavy snow imminent
- **WINTER STORM WATCH** - Significant snow expected (note: extract expected inches)
- **WIND CHILL ADVISORY/WARNING** - Dangerously cold
- **COLD WEATHER ADVISORY** - Very cold temps
- **WIND ADVISORY** - High winds
- **FREEZE WARNING** - Below freezing temps

Extract the timeframe (e.g., "SAT 7AM - SUN 7PM") and expected accumulation if mentioned.

### 1B. Mohawk Mountain Alerts (HIGH PRIORITY)
**Source:** https://www.mohawkmtn.com/snow-report/ (use chrome-driver)

> ⚠️ **Note:** Use chrome-driver to fetch from the official site. Kill Chrome first if needed.

```bash
pkill -f "Google Chrome" || true; sleep 2
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.mohawkmtn.com/snow-report/" --format=text
```

Look for in "Today's Inside Scoop" section:
- Mountain closures or delayed openings
- Lift closures
- Trail closures due to conditions
- Any special notices
- Today's high temperature (shown in the conditions text)

### 1C. Current Weather
**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

> WebFetch prompt: `Extract current temperature, conditions, wind speed and direction, wind chill if any, today's high temperature, tonight's low temperature, and the forecast for the next 2 days with their high and low temperatures.`

Extract:
- Current temperature (°F)
- Conditions (Fair, Sunny, Cloudy, Snow, Rain, etc.)
- Wind chill (if different from temp)
- Wind speed and direction
- **Today's HIGH temperature** (°F)
- **Tonight's LOW temperature** (°F)

### 1D. Ski Conditions
**Source:** https://www.mohawkmtn.com/snow-report/ (official site - requires chrome-driver)

> ⚠️ **Note:** The official mohawkmtn.com site loads data via JavaScript. Use chrome-driver to fetch this data:

```bash
# Kill any existing Chrome first
pkill -f "Google Chrome" || true; sleep 2

# Extract the page content using chrome-driver
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.mohawkmtn.com/snow-report/" --format=text
```

Or take a screenshot and read visually:
```bash
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/screenshot "https://www.mohawkmtn.com/snow-report/" /tmp/mohawk-snow-report.png --full-page
```

Extract:
- Trails open (X of 27)
- Base depth (inches)
- Surface conditions (Groomed, Hard Pack, Powder, Variable)
- Lifts operating (X of 8)
- Recent snowfall
- Today's high/low temperature from the page
- Hours of operation

### 1E. Sun/Moon
**Source:** https://www.timeanddate.com/sun/usa/cornwall-ct or WebSearch

> WebSearch query: `Cornwall CT sunrise sunset today moon phase`

**Approximate for Cornwall CT (January):**
- Sunrise: ~7:08-7:12 AM
- Sunset: ~4:55-5:10 PM (increases ~1 min/day in late Jan)
- Moon phase: Check current phase (new, waxing crescent, first quarter, waxing gibbous, full, waning gibbous, last quarter, waning crescent)

### 1F. Upcoming Weather / Notable Events (CHECK THIS!)
**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284 + https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report

> WebFetch prompt: `Extract the extended forecast for the next 3-5 days. Look for any notable weather: significant snowfall (6"+), extreme cold (below 0°F), warming trends (above 40°F), rain events, or high winds (25+ mph).`

**Notable conditions to highlight (in priority order):**

| Condition | Threshold | Banner Text Example |
|-----------|-----------|---------------------|
| Major snowstorm | 12"+ expected | `MAJOR STORM SAT • 13" EXPECTED` |
| Significant snow | 6-12" expected | `SNOW SAT-SUN • 8" EXPECTED` |
| Extreme cold | Below -10°F wind chill | `EXTREME COLD FRI • -15°F` |
| Powder day | Fresh snow + cold temps | `POWDER DAY • 6" FRESH` |
| Warm spell | Above 40°F (melt risk) | `WARM SAT • 45°F - SPRING CONDITIONS` |
| Rain event | Rain in forecast | `⚠️ RAIN SUN - ICY CONDITIONS LIKELY` |
| High winds | 30+ mph sustained | `HIGH WINDS SAT • POSSIBLE LIFT DELAYS` |
| Perfect ski day | Sunny, 20-32°F, fresh grooming | `BLUEBIRD DAY • PERFECT CONDITIONS` |

**Decision logic for banner:**
1. If there's an active NWS alert → show the alert
2. Else if major storm (12"+) coming in next 48h → show storm forecast
3. Else if significant snow (6"+) coming → show snow forecast
4. Else if extreme cold/wind chill → show cold warning
5. Else if rain coming → show rain warning (skiers want to know!)
6. Else if it's a powder day (fresh snow overnight) → celebrate it!
7. Else if perfect conditions → show "bluebird day"
8. Else → show decorative pine branch (no notable weather)

---

## Step 2: Fill In Current Data

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
forecast:
  - day: "SAT"
    conditions: "SNOW"
    high: "30"
    low: "22"
    snow_inches: 13                         # expected accumulation
    notable: "MAJOR STORM"                  # or empty
  - day: "SUN"
    conditions: "SNOW"
    high: "28"
    low: "18"
    snow_inches: 2
    notable: ""
  - day: "MON"
    conditions: "SUNNY"
    high: "25"
    low: "10"
    snow_inches: 0
    notable: "POWDER DAY"                   # fresh snow from storm!

# Derived: What to show in bottom banner (based on decision logic in 1F)
banner_text: "MAJOR STORM SAT • 13\" EXPECTED"  # or empty for decorative border

# Mohawk Mountain
trails_open: "25"
trails_total: "27"
base_depth: "20"
surface: "GROOMED"
lifts_open: "6"

# Sun/Moon
sunrise: "7:10 AM"
sunset: "4:58 PM"
moon_phase: "waning crescent"
```

---

## Step 3: Build the Prompt

### Base Scene (always the same)
```
Illustration in woodcut/linocut style optimized for 4-gray e-ink display. Wide 16:9 landscape format. Use exactly 4 tones: white, light gray, dark gray, black.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (use light gray for snow-covered areas, dark gray for tree shadows), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. Sky in pure white, distant mountains in light gray, foreground elements with dark gray shadows.
```

### Left Side Signpost (varies based on alerts)

**If there IS a weather advisory:**
```
LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- '{{DATE}}' (top sign, arrow style pointing right)
- '{{TEMPERATURE}}°F {{CONDITIONS}}' (middle sign)
- 'WIND CHILL {{WIND_CHILL}}°F' (lower sign)
- Warning triangle sign with '⚠ {{WEATHER_ADVISORY}}'
```

**If there is NO weather advisory:**
```
LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- '{{DATE}}' (top sign, arrow style pointing right)
- '{{TEMPERATURE}}°F {{CONDITIONS}}' (middle sign)
- 'HIGH {{HIGH}}°F / LOW {{LOW}}°F' (lower sign)
```

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
Style: Illustration optimized for 4-gray e-ink display. Use exactly 4 tones: pure white, light gray, dark gray, and pure black. No gradients or smooth transitions - use flat areas of each tone. Woodcut/linocut aesthetic with bold shapes. Dark gray for shadows and depth, light gray for mid-tones and snow texture. Pure black for outlines, text, and darkest elements. Pure white for sky and highlights. All text must be clearly legible in pure black on white or light gray backgrounds. Vintage ski poster aesthetic.
```

---

## Step 4: Complete Prompt Examples

### Example A: With Cold Advisory + Storm Watch (current conditions)

```
Illustration in woodcut/linocut style for 4-gray e-ink display. Wide 16:9 landscape format. Use exactly 4 tones: white, light gray, dark gray, black.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (light gray for snow, dark gray for shadows), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, light gray distant mountains, dark gray shadows.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'FRI 23 JAN' (top sign, arrow style pointing right)
- '25°F FAIR' (middle sign)
- 'WIND CHILL 16°F' (lower sign)
- Warning triangle sign with '⚠ COLD ADVISORY'

TOP RIGHT - Three framed icons in decorative vintage borders:
- Sunrise icon with '7:10 AM'
- Moon phase icon showing waning crescent moon
- Sunset icon with '4:58 PM'

BOTTOM RIGHT - Wooden ski conditions board showing:
- 'MOHAWK MTN' as header
- '25/27 TRAILS'
- '20" BASE'
- 'GROOMED'

BOTTOM CENTER - Banner ribbon with 'STORM WATCH SAT-SUN • 13" EXPECTED'

BOTTOM LEFT CORNER - Small text in a simple frame reading 'Updated 10:15 AM'

Style: 4-gray e-ink optimized. Use exactly 4 flat tones: white, light gray, dark gray, black. No gradients. Woodcut/linocut aesthetic with bold shapes. Text in pure black on white/light gray. Vintage ski poster style.
```

### Example B: No Alerts (nice day)

```
Illustration in woodcut/linocut style for 4-gray e-ink display. Wide 16:9 landscape format. Use exactly 4 tones: white, light gray, dark gray, black.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (light gray for snow, dark gray for shadows), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky, light gray distant mountains, dark gray shadows.

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

Style: 4-gray e-ink optimized. Use exactly 4 flat tones: white, light gray, dark gray, black. No gradients. Woodcut/linocut aesthetic with bold shapes. Text in pure black on white/light gray. Vintage ski poster style.
```

### Example C: Winter Storm Warning (severe weather)

```
Illustration in woodcut/linocut style for 4-gray e-ink display. Wide 16:9 landscape format. Use exactly 4 tones: white, light gray, dark gray, black.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (light gray for snow, dark gray for shadows), ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. White sky with light gray snowflakes scattered across scene to suggest heavy snowfall, dark gray shadows.

LEFT SIDE - Rustic wooden signpost with multiple signs showing:
- 'SUN 26 JAN' (top sign, arrow style pointing right)
- '28°F SNOW' (middle sign)
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

Style: 4-gray e-ink optimized. Use exactly 4 flat tones: white, light gray, dark gray, black. No gradients. Woodcut/linocut aesthetic with bold shapes. Text in pure black on white/light gray. Vintage ski poster style.
```

### Example D: Powder Day (day after storm)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees heavily laden with fresh snow (bright white snow, light gray tree shadows), ski lift chairs visible, and a skier spraying powder while carving down an ungroomed trail. Brilliant sunshine suggested by white radiating lines on light gray sky. Rocky outcrops (dark gray) and rolling hills of the Berkshires in background (light gray).

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

Style: 4-gray e-ink optimized. Use exactly 4 flat tones: white, light gray, dark gray, black. No gradients. Woodcut/linocut aesthetic with bold shapes. Text in pure black on white/light gray. Vintage ski poster style.
```

### Example E: Rain Warning (important for skiers!)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow (light gray snow, dark gray shadows), ski lift chairs visible. Overcast sky in light gray (darker than usual to suggest clouds). Rocky outcrops (dark gray) and rolling hills of the Berkshires in background. Muted, flat lighting with less contrast to suggest dreary weather.

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

Style: 4-gray e-ink optimized. Use exactly 4 flat tones: white, light gray, dark gray, black. No gradients. Woodcut/linocut aesthetic with bold shapes. Text in pure black on white/light gray. Vintage ski poster style.
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

## Step 6: Convert to 4-Gray Palette for TRMNL

```bash
magick output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png \
  -colorspace Gray \
  -colors 4 \
  -depth 8 \
  PNG8:output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M).png
```

**Note:** Since we generated at exact 800x480, no resizing is needed. This just converts to the 4-color grayscale palette optimized for TRMNL's e-ink display.

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
│   ├── 2026-01-23-09-52.png         # TRMNL-ready (800x480, 1-bit)
│   ├── 2026-01-23-14-30-full.png
│   ├── 2026-01-23-14-30.png
│   └── ...
├── 2026-02/
│   └── ...
└── latest.png -> 2026-01/2026-01-23-14-30.png
```

---

## Data Sources Quick Reference

| Data | URL | Method | Status |
|------|-----|--------|--------|
| Weather + Alerts | https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284 | WebFetch | ✅ Works |
| Ski Conditions (Primary) | https://www.mohawkmtn.com/snow-report/ | chrome-driver | ✅ Works (kill Chrome first) |
| Ski Conditions (Backup) | https://www.onthesnow.com/connecticut/mohawk-mountain/skireport | WebFetch | ✅ Works |
| Snow Forecast | https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report | WebFetch | ✅ Works |
| Trail Map | https://www.onthesnow.com/connecticut/mohawk-mountain/trailmap | WebFetch | ✅ Works |

---

## Data Fetching Notes

### What Works

**Mohawk Official Site (RECOMMENDED for ski conditions - use chrome-driver)**
- URL: `https://www.mohawkmtn.com/snow-report/`
- Method: chrome-driver (NOT WebFetch - page loads via JavaScript)
- Returns: trails open, lifts open, base depth, surface conditions, hours, high/low temps
- **Important:** Kill Chrome before fetching to avoid WebSocket errors:
  ```bash
  pkill -f "Google Chrome" || true; sleep 2
  /Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.mohawkmtn.com/snow-report/" --format=text
  ```
- Or take a screenshot: `/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/screenshot "https://www.mohawkmtn.com/snow-report/" /tmp/mohawk.png --full-page`

**NWS Weather (RECOMMENDED for weather + alerts)**
- URL: `https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284`
- Returns: current temp, conditions, wind, alerts (winter storm watch/warning, etc.)
- WebFetch prompt: `Extract current temperature, conditions, wind, any active weather alerts or warnings, and the forecast for the next 2 days including high and low temperatures.`

**OnTheSnow (BACKUP for ski conditions)**
- URL: `https://www.onthesnow.com/connecticut/mohawk-mountain/skireport`
- Returns: trails open (X of 27), lifts open (X of 8), base depth, hours, forecast
- WebFetch prompt: `Extract all current conditions: trails open, lifts open, base depth, new snow, snowmaking status, hours, and any alerts.`

**Snow-Forecast.com (good for predictions)**
- URL: `https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report`
- Returns: snow forecasts, expected accumulation
- WebFetch prompt: `Extract current snow depth, weather conditions, and snow forecast for the next few days including expected accumulation.`

### Sample Data (January 2026)

From mohawkmtn.com on 2026-01-23 (via chrome-driver):
```yaml
status: "Open"
last_updated: "Friday, January 23, 2026 at 7:31 AM"
todays_high: 27  # from "Today's Inside Scoop"
trails_open: 16
trails_total: 27
lifts_open: 4
lifts_total: 8
surface: "Variable Conditions (machine groomed)"
hours: "10:00am - 8:30pm"
night_skiing: "Available on multiple trails"
tubing: "Open 10AM to post-sunset"
```

From NWS forecast.weather.gov:
```yaml
current_temp: 25
conditions: "Fair"
wind_chill: 16
wind: "W 10-15 mph"
today_high: 27
tonight_low: -2
```

### Resort Facts (static)
- Summit elevation: 1,600 ft
- Vertical drop: 650 ft
- Skiable terrain: 107 acres
- Total trails: 27 (use 27 as trails_total)
- Total lifts: 8 (use 8 as lifts_total)
- Night skiing: 12 trails
- Snowmaking: 95% terrain coverage
- Founded: 1947 (CT's oldest ski area)
