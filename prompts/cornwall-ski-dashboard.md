# Cornwall CT / Mohawk Mountain TRMNL Dashboard

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
**Source:** https://www.onthesnow.com/connecticut/mohawk-mountain/skireport (primary) or https://www.skicentral.com/mohawkmountain-skireport.html (backup)

> ⚠️ **Note:** The official mohawkmtn.com site loads data via JavaScript and doesn't work with WebFetch. Use OnTheSnow instead.

Look for:
- Mountain closures or delayed openings
- Lift closures
- Trail closures due to conditions
- Any special notices

### 1C. Current Weather
**Source:** https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

> WebFetch prompt: `Extract current temperature, conditions, wind speed and direction, wind chill if any, today's high/low, and the forecast for the next 2 days.`

Extract:
- Current temperature (°F)
- Conditions (Fair, Sunny, Cloudy, Snow, Rain, etc.)
- Wind chill (if different from temp)
- Wind speed and direction
- Today's high/low

### 1D. Ski Conditions
**Source:** https://www.onthesnow.com/connecticut/mohawk-mountain/skireport (recommended)

> WebFetch prompt: `Extract all current conditions: trails open, lifts open, base depth, new snow, snowmaking status, hours, and any alerts.`

Extract:
- Trails open (X of 27)
- Base depth (inches)
- Surface conditions (Groomed, Hard Pack, Powder, Variable)
- Lifts operating (X of 8)
- Recent snowfall

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
# Date/Time (auto from system)
date: "FRI 23 JAN"
timestamp: "10:15 AM"

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
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background.
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
Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

---

## Step 4: Complete Prompt Examples

### Example A: With Cold Advisory + Storm Watch (current conditions)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background.

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

Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

### Example B: No Alerts (nice day)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background.

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

Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

### Example C: Winter Storm Warning (severe weather)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible, and a skier carving down a groomed trail. Rocky outcrops and rolling hills of the Berkshires in background. Heavy snowfall in the air.

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

Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

### Example D: Powder Day (day after storm)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees heavily laden with fresh snow, ski lift chairs visible, and a skier spraying powder while carving down an ungroomed trail. Brilliant sunshine suggested by radiating lines. Rocky outcrops and rolling hills of the Berkshires in background.

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

Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

### Example E: Rain Warning (important for skiers!)

```
Black and white pen and ink illustration in woodcut etching style for an e-ink display. Wide 16:9 landscape format.

SCENE: Snowy New England ski mountain landscape with ski slopes, pine trees covered in snow, ski lift chairs visible. Overcast sky suggested by horizontal line work. Rocky outcrops and rolling hills of the Berkshires in background.

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

Style: Detailed crosshatching and line work for shading. Pure black ink on white background, no gray tones, no gradients. High contrast suitable for 1-bit e-ink display. Vintage ski poster aesthetic mixed with woodcut illustration style. All text must be clearly legible.
```

---

## Step 5: Generate Image

```bash
export GEMINI_API_KEY=$(op read "op://Development/Google AI Studio Key/notesPlain")

npx @the-focus-ai/nano-banana "YOUR_COMPLETE_PROMPT_HERE" \
  --output output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png
```

## Step 6: Resize for TRMNL

```bash
mkdir -p output/$(date +%Y-%m)

magick output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M)-full.png \
  -resize 800x480^ \
  -gravity center \
  -extent 800x480 \
  -threshold 50% \
  -type bilevel \
  output/$(date +%Y-%m)/$(date +%Y-%m-%d-%H-%M).png
```

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

| Data | URL | Status |
|------|-----|--------|
| Weather + Alerts | https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284 | ✅ Works |
| Ski Conditions (Primary) | https://www.onthesnow.com/connecticut/mohawk-mountain/skireport | ✅ Works best |
| Ski Conditions (Backup) | https://www.skicentral.com/mohawkmountain-skireport.html | ✅ Works |
| Snow Forecast | https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report | ✅ Works |
| Trail Map | https://www.onthesnow.com/connecticut/mohawk-mountain/trailmap | ✅ Works |
| Mohawk Official | https://www.mohawkmtn.com/snow-report/ | ⚠️ JS-loaded, unreliable |

---

## Data Fetching Notes

### What Works

**OnTheSnow (RECOMMENDED for ski conditions)**
- URL: `https://www.onthesnow.com/connecticut/mohawk-mountain/skireport`
- Returns: trails open (X of 27), lifts open (X of 8), base depth, hours, forecast
- WebFetch prompt: `Extract all current conditions: trails open, lifts open, base depth, new snow, snowmaking status, hours, and any alerts.`

**NWS Weather (RECOMMENDED for weather + alerts)**
- URL: `https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284`
- Returns: current temp, conditions, wind, alerts (winter storm watch/warning, etc.)
- WebFetch prompt: `Extract current temperature, conditions, wind, any active weather alerts or warnings, and the forecast for the next 2 days.`

**Snow-Forecast.com (good for predictions)**
- URL: `https://www.snow-forecast.com/resorts/Mohawk-Mountain/snow-report`
- Returns: snow forecasts, expected accumulation
- WebFetch prompt: `Extract current snow depth, weather conditions, and snow forecast for the next few days including expected accumulation.`

### What Doesn't Work

**Mohawk Official Site (mohawkmtn.com)**
- The `/snow-report/` page loads conditions via JavaScript
- WebFetch returns empty HTML structure with no actual data
- Use OnTheSnow or SkiCentral instead

### Sample Data (January 2026)

From OnTheSnow on 2026-01-23:
```yaml
status: "Open"
trails_open: 16
trails_total: 27
lifts_open: 6
lifts_total: 8
base_depth: 20  # inches mid-mountain
hours:
  mon_thu: "10am-8pm"
  friday: "10am-10pm"
  saturday: "8:30am-10pm"
  sunday: "8:30am-4pm"
night_skiing: "12 trails, 4pm start"
forecast_snow:
  - date: "Jan 25"
    inches: 13
  - date: "Jan 26"
    inches: 2
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
