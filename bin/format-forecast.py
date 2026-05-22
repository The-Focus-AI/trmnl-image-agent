#!/usr/bin/env python3
"""Format NWS grid forecast for the Haiku prompt.
Reads /tmp/trmnl-data/forecast.json, writes formatted text to stdout."""
import json
import sys

path = "/tmp/trmnl-data/forecast.json"
try:
    with open(path) as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    print("  (No forecast data available)")
    sys.exit(0)

periods = data.get("properties", {}).get("periods", [])
for p in periods:
    name = p.get("name", "")
    temp = p.get("temperature", "")
    precip = p.get("probabilityOfPrecipitation", {}).get("value")
    short = p.get("shortForecast", "")
    detail = p.get("detailedForecast", "") or ""
    precip_str = f"{int(precip)}%" if precip is not None else "N/A"
    print(f"  {name}: {temp}°F, Precip {precip_str}, {short}")
    if detail:
        print(f"    DETAIL: {detail}")
