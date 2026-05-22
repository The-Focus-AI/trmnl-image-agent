#!/usr/bin/env python3
"""Build the Haiku parsing prompt from raw data.
Reads /tmp/trmnl-data/*, writes prompt text to stdout.
The existing bin/parse-data reads this output and pipes it to Claude Haiku.
"""
import json
import re
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("/tmp/trmnl-data")

def read_file(path, default=""):
    try:
        return path.read_text()
    except (FileNotFoundError, OSError):
        return default

def read_json(path, default=None):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default

def safe_int(val, default=32):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default

def format_forecast():
    forecast = read_json(DATA_DIR / "forecast.json")
    if not forecast:
        return "  (No forecast data)"
    periods = forecast.get("properties", {}).get("periods", [])
    lines = []
    for p in periods:
        name = p.get("name", "")
        temp = p.get("temperature", "")
        precip = p.get("probabilityOfPrecipitation", {}).get("value")
        short = p.get("shortForecast", "")
        detail = p.get("detailedForecast", "") or ""
        precip_str = f"{int(precip)}%" if precip is not None else "N/A"
        lines.append(f"  {name}: {temp}°F, Precip {precip_str}, {short}")
        if detail:
            lines.append(f"    DETAIL: {detail}")
    return "\n".join(lines)

def main():
    now = datetime.now()
    current_date = now.strftime("%a %d %b").upper()
    current_time = now.strftime("%-I:%M %p")

    sun_moon = read_json(DATA_DIR / "sun-moon.json", {})
    sun_moon_str = json.dumps(sun_moon, indent=2) if sun_moon else "{}"

    weather_html = read_file(DATA_DIR / "weather.html")
    weather_snippet = "\n".join(weather_html.splitlines()[:500])
    weather_snippet = re.sub(r'<script[^>]*>.*?</script>', '', weather_snippet, flags=re.DOTALL)
    weather_snippet = re.sub(r'<style[^>]*>.*?</style>', '', weather_snippet, flags=re.DOTALL)

    mohawk = read_file(DATA_DIR / "mohawk.txt", "(Mohawk data unavailable)")

    forecast = format_forecast()

    prompt = f"""Parse the following weather and ski resort data and return ONLY valid JSON (no markdown, no code blocks, no explanation).

CURRENT DATE/TIME: {current_date} at {current_time}

SUN/MOON DATA (already parsed):
{sun_moon_str}

---
WEATHER DATA (from NWS):
{weather_snippet}

---
NWS 7-DAY FORECAST (grid JSON - today's period is key):
{forecast}

---
MOHAWK MOUNTAIN DATA:
{mohawk}

---

Extract and return this exact JSON structure (NO markdown code blocks, just raw JSON):
{{
  "date": "{current_date}",
  "timestamp": "{current_time}",
  "weather": {{
    "temperature": <current temp as number>,
    "conditions": "<current conditions like FAIR, SNOW, CLOUDY>",
    "wind": "<wind description>",
    "wind_chill": <wind chill as number or null>,
    "high": <today's high as number>,
    "low": <tonight's low as number>
  }},
  "alerts": {{
    "weather_alert": "<NWS alert like WINTER STORM WARNING or null>",
    "mountain_alert": "<mountain operational alert or null>"
  }},
  "mohawk": {{
    "status": "<open or closed - check if mountain/resort appears to be open for skiing>",
    "trails_open": <number>,
    "trails_total": 27,
    "lifts_open": <number>,
    "base_depth": <number or 30>,
    "surface": "<POWDER, VARIABLE, GROOMED, etc>",
    "fresh_snow": <inches of fresh snow as number or null>,
    "tubing_closed": <true or false>,
    "night_skiing": <true or false>
  }},
  "maple": {{
    "sap_flowing": <true if today's high > 32 AND tonight's low < 32, false otherwise>,
    "high": <today's high>,
    "low": <tonight's low>,
    "quality": "<ideal if high 40-50 and low 20-28, good if high 33-55 and low < 32, poor otherwise>"
  }},
  "sun_moon": {{
    "sunrise": "<time like 7:15 AM>",
    "sunset": "<time like 5:05 PM>",
    "moon_phase": "<phase name>"
  }},
  "banner": {{
    "type": "<powder_day|storm_warning|cold_advisory|mountain_alert|sap_flowing|normal>",
    "text": "<banner text to display or null for decorative border>"
  }},
  "forecast": {{
    "today_precip_chance": <today's max precipitation probability as number (e.g. 80) or 0>,
    "today_forecast": "<today's short forecast like: Showers And Thunderstorms Likely>",
    "tonight_precip_chance": <tonight's max precip probability or 0>,
    "tonight_forecast": "<tonight's short forecast>",
    "has_thunderstorms": <true if today's or tonight's forecast mentions thunder or storms, false otherwise>,
    "tomorrow_precip_chance": <tomorrow's max precip probability or 0>,
    "tomorrow_forecast": "<tomorrow's short forecast>"
  }}
}}

IMPORTANT RULES:
1. If fresh snow >= 6 inches, set banner type to "powder_day" with text like "❄ POWDER DAY • 20\\" FRESH ❄"
2. If there's a winter storm warning, set banner type to "storm_warning"
3. Count trails by looking for 'Trail Open' markers
4. Look for phrases like '20\\" of fresh snow' or 'brought about 20\\"'
5. For maple: sap_flowing is true when high > 32°F AND low < 32°F. Quality is "ideal" when high is 40-50 and low is 20-28, "good" when high is 33-55 and low < 32, "poor" otherwise.
6. For mohawk status: set to "closed" if the page says closed for season, no trails open, or similar. Set to "open" if skiing appears active.
7. If mohawk is closed AND sap is flowing, set banner type to "sap_flowing" with text like "🍁 SAP IS FLOWING • HIGH <high>° LOW <low>° 🍁"
8. For forecast: extract the short forecast text and precipitation probability from the NWS Gridpoint JSON periods. Today's period (usually named "Today" or "This Afternoon") has today_precip_chance and today_forecast. Tonight's period has tonight_precip_chance and tonight_forecast. Tomorrow's period has tomorrow_precip_chance and tomorrow_forecast. If a period name matches "Wednesday" or similar, use the next daytime period. has_thunderstorms should be true if any of today's/tonight's forecast text contains keywords like thunderstorm, thunder, storms, t-storms.
9. Return ONLY the JSON object, no markdown code blocks, no backticks
"""

    print(prompt)

if __name__ == "__main__":
    main()
