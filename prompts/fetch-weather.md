# Fetch Weather Data

Fetch current weather conditions and forecast for Cornwall, CT area.

> **PRIMARY GOAL:** Find any MAJOR WEATHER EVENTS coming in the next 3-5 days:
> - Big storms (6"+ snow expected)
> - Extreme cold (below 0°F or wind chill below -10°F)
> - Rain events (can ruin ski conditions)
>
> These are the MOST IMPORTANT things skiers need to know!

## Source
https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

## Instructions

Use WebFetch to get weather data from the NWS forecast page.

```
WebFetch URL: https://forecast.weather.gov/MapClick.php?lat=41.8456&lon=-73.3284

Prompt: Extract ALL of the following weather information:

1. CURRENT CONDITIONS:
   - Current temperature (°F)
   - Current conditions (Fair, Sunny, Cloudy, Snow, etc.)
   - Wind speed and direction
   - Wind chill (if present)

2. TODAY'S FORECAST:
   - Today's HIGH temperature
   - Tonight's LOW temperature

3. ACTIVE ALERTS (CRITICAL - check carefully!):
   - Any WINTER STORM WARNING
   - Any WINTER STORM WATCH
   - Any WIND CHILL ADVISORY/WARNING
   - Any COLD WEATHER ADVISORY
   - Any other active alerts
   - Include the timeframe and expected accumulation if mentioned

4. EXTENDED FORECAST (next 3-5 days):
   - For each day: conditions, high, low
   - Note any significant snowfall predictions (how many inches expected)
   - Note any rain events
   - Note any extreme cold or warm temps

Return the data in this YAML format:
```

## Expected Output Format

```yaml
current:
  temperature: 25
  conditions: "Fair"
  wind: "W 10-15 mph"
  wind_chill: 16  # or null if same as temp

today:
  high: 27
  low: 12

alerts:
  - type: "WINTER STORM WATCH"
    timeframe: "Sunday 7AM - Monday 7AM"
    details: "6-10 inches expected"
  # or empty array if no alerts

forecast:
  - day: "Tonight"
    conditions: "Clear"
    low: 12
  - day: "Saturday"
    conditions: "Sunny"
    high: 32
    low: 18
  - day: "Sunday"
    conditions: "Snow"
    high: 30
    low: 22
    snow_inches: 8
  - day: "Monday"
    conditions: "Mostly Cloudy"
    high: 28
    low: 15

notable:
  - "BIG STORM SUNDAY: 8-12 inches expected"
  - "BITTER COLD MONDAY: Low -5°F"
  # List ALL significant weather events coming up!
```

## Key Information to Extract (in priority order)

1. **UPCOMING MAJOR STORMS** - This is #1 priority!
   - When is the storm? (day/time)
   - How much snow expected?
   - How long will it last?

2. **EXTREME COLD** - Important for safety!
   - Low temperatures below 0°F
   - Wind chill below -10°F
   - When does the cold arrive?

3. **Active alerts** - WINTER STORM WARNING, WATCH, etc.

4. **Rain predictions** - Rain ruins ski conditions!

5. **Current conditions** - temp, wind, wind chill

6. **High/Low for today** - planning info

## Notes

- Always check for alerts first - they appear at the top of the NWS page
- Snow predictions are often in the detailed forecast text
- Wind chill is especially important below 20°F
