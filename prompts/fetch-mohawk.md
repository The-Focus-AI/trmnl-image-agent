# Fetch Mohawk Mountain Conditions

Fetch current ski conditions from Mohawk Mountain's official snow report.

## Source
https://www.mohawkmtn.com/snow-report/

## Prerequisites

**Kill Chrome before running** to avoid WebSocket errors:
```bash
pkill -f "Google Chrome" || true; sleep 2
```

## Instructions

### Step 1: Extract HTML for accurate trail/lift counts
```bash
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.mohawkmtn.com/snow-report/" --format=html 2>/dev/null > /tmp/mohawk-html.html
```

### Step 2: Count open trails and lifts from HTML
```bash
echo "Trails open: $(grep -c 'alt="Trail Open"' /tmp/mohawk-html.html)/27"
echo "Lifts open: $(grep -c 'alt="Lift Open"' /tmp/mohawk-html.html)/8"
```

### Step 3: Extract text for other details
```bash
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.mohawkmtn.com/snow-report/" --format=text 2>/dev/null
```

## Key Information to Extract

### From text output:
- **Hours**: Look for "OPEN TODAY" banner or "Today's Inside Scoop" section
- **Today's high temperature**: From Inside Scoop text (e.g., "high of 27°")
- **Surface conditions**: From "Secondary Surface" section
- **Night skiing**: From "Night Skiing and Riding" section (trails/lifts numbers)
- **Alerts**: Any banners about closures, early closing, cancellations

### From HTML grep counts:
- **Trails open**: `grep -c 'alt="Trail Open"'` (out of 27)
- **Lifts open**: `grep -c 'alt="Lift Open"'` (out of 8)

## Expected Output Format

```yaml
last_updated: "Friday, January 23, 2026 at 7:31 AM"

status: "Open"  # or "Closed", "Delayed Opening", etc.
hours: "10:00am - 9:30pm"
todays_high: 27

trails:
  open: 26
  total: 27

lifts:
  open: 6
  total: 8

surface: "Variable Conditions"

night_skiing:
  available: true
  trails: 16
  lifts: 6

alerts:
  - "WE WILL BE CLOSING TOMORROW SATURDAY 1/24 AT 4PM"
  - "ALL TUBING SESSIONS ON SUNDAY 1/25 ARE CANCELED"
```

## Alert Keywords to Watch For
- "CLOSED" or "CLOSING EARLY"
- "DELAYED OPENING"
- "NIGHT SKIING CANCELLED"
- "TUBING CANCELLED"
- Any time-specific closures

## Resort Facts (static)
- Total trails: 27
- Total lifts: 8
- Summit elevation: 1,600 ft
- Vertical drop: 650 ft
