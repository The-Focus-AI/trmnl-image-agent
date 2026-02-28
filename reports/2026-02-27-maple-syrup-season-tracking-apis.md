# Maple Syrup Season Tracking: APIs, Data Sources, and Sap Flow Prediction Tools

**Date:** February 27, 2026
**Author:** Research Report

---

## Abstract

This report investigates available APIs, data sources, and tools for programmatically tracking maple syrup season conditions. Maple sap flows when overnight temperatures drop below freezing (32F/0C) and daytime temperatures rise above freezing -- the freeze-thaw cycle that typically occurs from late February through April in the northeastern United States and southeastern Canada. The research identifies four categories of resources: (1) maple-specific sap flow prediction services such as Sapcast, MapleForecast, SapTapApps, and Maple Syrup Time; (2) general weather APIs including Open-Meteo, the National Weather Service API, OpenWeatherMap, and Visual Crossing that provide the temperature data needed to implement custom freeze-thaw detection; (3) institutional data sources from Cornell's Maple Climate Network, UVM's Proctor Maple Research Center, and the Vermont Maple Bulletin; and (4) the scientific basis for sap flow prediction algorithms. The most practical approach for programmatic access combines a free weather API (especially Open-Meteo or the NWS API) with a simple freeze-thaw scoring algorithm, as no dedicated maple-specific public API currently exists.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Maple-Specific Sap Flow Prediction Services](#maple-specific-sap-flow-prediction-services)
3. [Weather APIs for Freeze-Thaw Detection](#weather-apis-for-freeze-thaw-detection)
4. [Institutional and Research Data Sources](#institutional-and-research-data-sources)
5. [The Science of Sap Flow Prediction](#the-science-of-sap-flow-prediction)
6. [Building a Custom Sap Flow Predictor](#building-a-custom-sap-flow-predictor)
7. [Comparative Summary](#comparative-summary)
8. [Conclusion](#conclusion)
9. [References](#references)

---

## Introduction

Maple syrup production depends entirely on weather. The fundamental mechanism is straightforward: when nighttime temperatures drop below 32F (0C), gases inside the maple tree contract, creating negative pressure that draws water up from the roots. When daytime temperatures rise above freezing, those gases expand, generating positive pressure that pushes sap out through tap holes. This freeze-thaw cycle is the engine of the entire sugaring season, according to research from the [University of Vermont Proctor Maple Research Center](https://www.uvm.edu/cals/proctor-maple-research-center) and [Cornell University Maple Program](https://blogs.cornell.edu/cornellmaple/).

This report surveys available tools and data sources for programmatically determining whether sap is flowing or likely to flow at a given location, with a focus on API access and free or low-cost options suitable for automated monitoring.

### Scope and Methodology

Research was conducted via web searches targeting maple-specific prediction tools, weather APIs, agricultural extension services, and published scientific models. Over 15 distinct sources were consulted, spanning commercial apps, open-source APIs, government services, university research programs, and scientific publications.

---

## Maple-Specific Sap Flow Prediction Services

### Sapcast (sapcast.ca)

[Sapcast](https://sapcast.ca/) is a free, web-based maple sap tapping forecast that analyzes 7-day freeze-thaw cycles using location-specific weather data. It is the most transparent of the maple-specific tools about its methodology.

**How it works:** Sapcast rates each day on a four-tier scale based on temperature ranges:

| Rating | Overnight Low | Daytime High |
|--------|--------------|--------------|
| Excellent | -7C to -2C (19F to 28F) | 4C to 10C (39F to 50F) |
| Good | Freezes overnight | Thaws above 2C (36F) |
| Fair | Marginal freeze-thaw | Outside ideal ranges |
| Poor | No freeze-thaw cycle | No freeze-thaw cycle |

The system emphasizes that consecutive days of freeze-thaw matter significantly -- a single good day produces less sap than a 5-day run. The "Best Tapping Window" feature highlights the longest stretch of good-or-better conditions in the forecast.

**Data source:** Weather data comes from [Pirate Weather](https://pirate-weather.apiable.io/), a free Dark Sky-compatible API.

**API access:** Sapcast has internal API endpoints (`/api/geocode` for postal code lookup, `/api/forecast` for forecasts by latitude/longitude), though these are not officially documented as a public API. The site notes it is "a new project" still tuning its forecast model.

**Cost:** Free.

### MapleForecast (Maple Authority)

[MapleForecast](https://mapleauthority.com/maple-forecast) by Maple Authority is a weather-based sap flow prediction system that aggregates forecasts from 8+ weather providers and calculates a daily 0-100 Sap Flow Score. A dedicated forecast interface is available at [sap-fi.mapleauthority.com](https://sap-fi.mapleauthority.com/).

**How it works:** The system aggregates multiple weather forecast sources and computes a composite sap flow index. Details of the scoring algorithm are not publicly documented.

**API access:** No public API documented. The service appears to be a JavaScript-rendered web application, making scraping difficult.

**Cost:** Free to use via web interface.

### SapTapApps - Sap Flowcaster

[SapTapApps Sap Flowcaster](https://www.saptapapps.com/flowcast/) retrieves local weather forecasts and reformats them specifically for maple producers, displaying "previous night low followed by daily high." It uses historical data from its "Maple Logs" program to calibrate sap flow predictions.

**How it works:** The app determines location via device geolocation, retrieves weather forecasts from an external provider, and applies a prediction model trained on production data collected from users.

**API access:** No public API. Progressive web app (PWA) only.

**Cost:** Free one-week trial, then $1.99/year subscription.

### Maple Syrup Time (SapCast)

[Maple Syrup Time](https://www.maplesyruptime.com/) uses a proprietary algorithm called SapCast that analyzes "location, pressure, temperature, seasonal averages and more" to produce a graphical sap flow rating. It also features a "First Tap Forecast" that tracks seasonal patterns to project when sap will first flow at a given location.

**How it works:** The app uses machine learning on 9 environmental variables including temperature, barometric pressure, latitude/longitude, and seasonal averages. It claims to incorporate "thousands of collection data points."

**API access:** No public API. Native iOS and Android apps only (no web version).

**Cost:** Free tier available; premium features via subscription.

---

## Weather APIs for Freeze-Thaw Detection

Since no maple-specific API provides fully open programmatic access, the most practical approach is to use a general weather API to get daily high/low temperatures and apply freeze-thaw logic. The following APIs are evaluated for this use case.

### Open-Meteo (Recommended - Best Free Option)

[Open-Meteo](https://open-meteo.com/) is a free, open-source weather API that requires no API key for non-commercial use.

**Key features for maple season tracking:**
- Daily `temperature_2m_max` and `temperature_2m_min` -- exactly what is needed for freeze-thaw detection
- Up to 16-day forecast
- Historical data back to 1940 via the `/v1/archive` endpoint
- "Past days" parameter on the forecast endpoint to get recent actuals alongside forecasts
- Temperature unit selection (Celsius or Fahrenheit)
- No API key required for non-commercial use
- No strict rate limits documented (fair use policy)

**Example API call for maple season monitoring (Burlington, VT):**
```
https://api.open-meteo.com/v1/forecast?latitude=44.4759&longitude=-73.2121&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=16&past_days=7
```

**Example response structure:**
```json
{
  "daily": {
    "time": ["2026-02-20", "2026-02-21", ...],
    "temperature_2m_max": [35.2, 28.1, ...],
    "temperature_2m_min": [18.5, 12.3, ...]
  }
}
```

**Why this is the top recommendation:** No API key, no registration, no cost, generous rate limits, the exact data fields needed (daily min/max temperature), long forecast window (16 days), and historical data access. The open-source codebase is available on [GitHub](https://github.com/open-meteo/open-meteo).

### National Weather Service (NWS) API

The [NWS API](https://www.weather.gov/documentation/services-web-api) provides free, open-data weather forecasts for US locations.

**Key features:**
- No API key required (only a `User-Agent` header identifying your application)
- 7-day forecast with daily high/low temperatures
- Hourly forecast available
- Completely free, no rate limits documented
- Government data -- always available, no commercial restrictions

**Access pattern (two-step process):**
1. Get the forecast URL for your coordinates:
   ```
   GET https://api.weather.gov/points/44.4759,-73.2121
   ```
2. Retrieve the forecast from the returned URL:
   ```
   GET https://api.weather.gov/gridpoints/BTV/33,43/forecast
   ```

**Limitations:** Only covers US locations. The two-step lookup process adds complexity. Forecast periods are 12-hour blocks (day/night) rather than daily min/max, requiring some parsing logic. Only 4 decimal places of coordinate precision accepted.

**Documentation:** [weather-gov.github.io/api](https://weather-gov.github.io/api/)

### OpenWeatherMap One Call API 3.0

[OpenWeatherMap](https://openweathermap.org/api) is one of the most widely used weather APIs.

**Key features:**
- Daily min/max temperatures (`daily.temp.min`, `daily.temp.max`)
- 8-day daily forecast
- Current conditions + 48-hour hourly forecast
- Free tier: 1,000 calls/day

**Limitations:** Requires API key registration. Free tier requires credit card on file (though not charged within limits). Shorter forecast window than Open-Meteo (8 vs 16 days).

**Cost:** Free up to 1,000 calls/day. Paid plans start at $0.0015/call beyond free tier.

### WeatherAPI.com

[WeatherAPI.com](https://www.weatherapi.com/) offers a generous free tier.

**Key features:**
- Daily max/min temperatures in forecast response
- 1 million free calls per month
- No rate limiting on free tier
- 3-day forecast on free plan

**Limitations:** Only 3-day forecast on free tier (shorter than other options). Requires API key.

**Cost:** Free up to 1M calls/month. Extended forecasts require paid plans.

### Visual Crossing

[Visual Crossing](https://www.visualcrossing.com/weather-api/) provides historical and forecast weather data.

**Key features:**
- `tempmin` and `tempmax` in daily data
- Up to 15-day forecast
- Historical data access
- 1,000 free records/day
- JSON and CSV output formats

**Cost:** Free up to 1,000 records/day. Plans start at $0.0001/record beyond free tier.

### Pirate Weather

[Pirate Weather](https://pirate-weather.apiable.io/) is a free, open-source Dark Sky-compatible API -- notably the same data source used by Sapcast.

**Key features:**
- Dark Sky API-compatible response format
- Daily high/low temperatures
- 7-day forecast
- Free: 10,000 calls/month (20,000 with $2/month donation)
- Open source on [GitHub](https://github.com/Pirate-Weather/pirateweather)

**Cost:** Free up to 10,000 calls/month.

### NOAA Climate Data Online (CDO) API

[NOAA CDO](https://www.ncei.noaa.gov/cdo-web/) provides access to the Global Historical Climatology Network daily (GHCNd) data -- primarily useful for historical analysis rather than forecasting.

**Key features:**
- TMAX and TMIN daily data from 100,000+ stations worldwide
- Historical data back decades
- Free with API token
- Rate limit: 5 requests/second, 10,000/day

**Example API call:**
```
https://www.ncei.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&datatypeid=TMAX,TMIN&locationid=ZIP:05401&startdate=2026-02-01&enddate=2026-02-27
```

**Best use case:** Analyzing historical maple seasons, determining average season start dates for a location, building long-term sap flow models.

---

## Institutional and Research Data Sources

### Cornell Maple Climate Network (cornellsaprun.com)

The [Cornell Maple Program](https://blogs.cornell.edu/cornellmaple/) operates the Maple Climate Network v2.0, a system of sensors collecting real-time maple production and climate data. Data is viewable at [cornellsaprun.com](http://www.cornellsaprun.com).

**Data collected:**
- Sap flow under vacuum (from individual trees)
- Soil moisture and temperature
- Tree internal pressure and temperature
- Atmospheric pressure
- Precipitation
- Daily sap sweetness readings

**Coverage:** Sensor stations in New York (two Cornell research forests), Ohio, Maine, Quebec, and Wisconsin.

**API access:** No documented public API. Data is displayed on a web dashboard. According to [The Maple News](https://www.themaplenews.com/story/maple-climate-program-monitoring-sugar-bushes-/517/), the program plans to make data "more accessible and interactive" in the future.

**Value:** This is the closest thing to real-time, ground-truth sap flow data from instrumented trees. Even without an API, the dashboard could potentially be scraped for actual sap flow observations.

### UVM Proctor Maple Research Center

The [UVM Proctor Maple Research Center](https://www.uvm.edu/cals/proctor-maple-research-center) conducts fundamental research on sap flow mechanisms and offers real-time streaming of sap flow data during the sugaring season. The center has been researching maple since 1946.

**Data available:** Real-time sap flow streaming during season, research publications on weather-sap relationships.

**API access:** No public API documented. Data access through web interface only.

### Vermont Maple Bulletin

The [Vermont Maple Bulletin](https://vermontmaplebulletin.wordpress.com/) publishes weekly reports during the sugaring season (approximately January through April/May) with producer reports from across Vermont counties plus bordering regions of New Hampshire and Quebec.

**Data included:** Sap flow observations (qualitative), sugar content measurements (1.0-2.5% range), syrup grades, production progress, and local temperature conditions.

**Format:** Blog post narratives only -- no structured data, API, or CSV exports. Data would need to be manually parsed from narrative text.

**Coverage:** Vermont counties (Bennington, Orange, Windsor, Addison, Rutland, Chittenden, Lamoille, Orleans, Franklin, Essex, Windham) plus NH and Quebec border regions.

### Ohio State Maple Program

[Ohio State Maple](https://u.osu.edu/ohiomaple/category/season-updates/) publishes season updates tracking sap flow conditions, weather patterns, and production data. Ohio State also hosts a sensor for Cornell's Maple Climate Network.

### Maple Research (mapleresearch.org)

[Maple Research](https://mapleresearch.org/keys/weather/) aggregates research publications on weather and sap flow from multiple institutions. The site includes educational content on weather forecasting for producers and links to published research on climate impacts.

---

## The Science of Sap Flow Prediction

### The Freeze-Thaw Mechanism

According to research published in the [Journal of the Royal Society Interface](https://royalsocietypublishing.org/doi/10.1098/rsif.2015.0665), the sap flow mechanism involves:

1. **Freezing phase:** Gas bubbles in xylem vessels contract, creating negative pressure. Water is drawn up from roots due to osmotic effects and freezing point depression from dissolved sugars.
2. **Thawing phase:** Gases expand as the tree warms, generating positive stem pressure that pushes sap through tap holes.

A [2D heat transfer model](https://www.sciencedirect.com/science/article/abs/pii/S0168192320302410) developed for predicting freeze-thaw events in sugar maple trees accounts for bulk thermal diffusion, convection, infrared radiation, and solar radiation.

### Temperature Thresholds for Sap Flow

Based on research from multiple sources, the practical temperature thresholds are:

| Condition | Overnight Low (F) | Daytime High (F) | Expected Flow |
|-----------|--------------------|-------------------|---------------|
| Excellent | 20-28 | 40-50 | Heavy, sustained runs |
| Good | 28-32 | 35-45 | Moderate flow |
| Fair/Marginal | Near 32 | 33-38 | Light or intermittent |
| Poor | Above 32 | Any | No flow (no freeze) |
| Poor | Below 10 | Below 32 | No flow (no thaw) |

Key insights from experienced producers on [MapleTrader](https://mapletrader.com/community/archive/index.php/t-25687.html) and [Dragonfly Sugarworks](https://dragonflysugarworks.com/reading-the-trees-your-maple-sap-flow-temperature-chart-with-free-download/):

- **The ideal is 25-29F at night and 38-45F during the day** -- cold enough to freeze thoroughly but not so cold the tree cannot thaw by mid-morning.
- **Consecutive freeze-thaw days matter more than individual days.** A 5-day run of good conditions significantly outproduces 5 isolated good days.
- **Extended warm spells end the season.** Once nights consistently stay above freezing, sap flow diminishes and off-flavors develop.
- **The swing matters.** A larger temperature differential between low and high correlates with stronger sap runs.

### Degree-Day Approach

According to [Dragonfly Sugarworks](https://dragonflysugarworks.com/reading-the-trees-your-maple-sap-flow-temperature-chart-with-free-download/), a cumulative degree-day model can predict season progression:

**Formula:** `Degree Days = ((High + Low) / 2) - 32`

- First strong runs typically appear around 30-50 cumulative degree days
- Peak flow period: 50-150 cumulative degree days
- Season end approaches beyond 150 cumulative degree days

---

## Building a Custom Sap Flow Predictor

Given that no public maple-specific API exists, here is a practical approach for building a custom sap flow indicator using available APIs.

### Recommended Architecture

```
Open-Meteo API  -->  Daily Min/Max Temps  -->  Freeze-Thaw Scoring  -->  Sap Flow Rating
(free, no key)      (16-day forecast +        (custom algorithm)        (display/alert)
                     7 past days)
```

### Simple Sap Flow Scoring Algorithm

Based on the research compiled above, a straightforward scoring algorithm:

```python
def score_sap_flow(low_f, high_f):
    """
    Score a day's sap flow potential based on overnight low
    and daytime high temperatures (Fahrenheit).
    Returns a score from 0 (no flow) to 100 (excellent flow).
    """
    # No freeze = no flow
    if low_f > 32:
        return 0

    # No thaw = no flow
    if high_f < 33:
        return 0

    # Score the overnight low (ideal: 20-28F)
    if 20 <= low_f <= 28:
        low_score = 100
    elif 15 <= low_f < 20:
        low_score = 60
    elif 28 < low_f <= 32:
        low_score = 70
    elif 10 <= low_f < 15:
        low_score = 30
    else:  # below 10F
        low_score = 10

    # Score the daytime high (ideal: 40-50F)
    if 40 <= high_f <= 50:
        high_score = 100
    elif 35 <= high_f < 40:
        high_score = 70
    elif 50 < high_f <= 55:
        high_score = 60
    elif 33 <= high_f < 35:
        high_score = 40
    elif high_f > 55:
        high_score = 30
    else:
        high_score = 0

    # Combined score (weighted average)
    return int(low_score * 0.4 + high_score * 0.6)


def score_run(daily_scores):
    """
    Apply a consecutive-day bonus. Multi-day runs produce
    disproportionately more sap than isolated good days.
    """
    boosted = []
    for i, score in enumerate(daily_scores):
        if score == 0:
            boosted.append(0)
            continue
        # Count consecutive preceding flow days
        streak = 0
        for j in range(i - 1, -1, -1):
            if daily_scores[j] > 0:
                streak += 1
            else:
                break
        # Bonus: up to 20% boost for 3+ day runs
        bonus = min(streak * 7, 20)
        boosted.append(min(100, score + bonus))
    return boosted
```

### Example Open-Meteo Integration

```python
import requests

def get_maple_forecast(lat, lon):
    """Fetch 16-day forecast and score sap flow potential."""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=temperature_2m_max,temperature_2m_min"
        f"&temperature_unit=fahrenheit"
        f"&timezone=auto"
        f"&forecast_days=16"
        f"&past_days=3"
    )
    resp = requests.get(url)
    data = resp.json()

    days = data["daily"]["time"]
    highs = data["daily"]["temperature_2m_max"]
    lows = data["daily"]["temperature_2m_min"]

    daily_scores = []
    for day, high, low in zip(days, highs, lows):
        score = score_sap_flow(low, high)
        daily_scores.append(score)

    # Apply consecutive-day bonuses
    boosted_scores = score_run(daily_scores)

    results = []
    for day, high, low, score in zip(days, highs, lows, boosted_scores):
        label = "EXCELLENT" if score >= 80 else \
                "GOOD" if score >= 60 else \
                "FAIR" if score >= 30 else \
                "POOR"
        results.append({
            "date": day,
            "low": low,
            "high": high,
            "score": score,
            "rating": label
        })
    return results

# Example: Burlington, Vermont
forecast = get_maple_forecast(44.4759, -73.2121)
for day in forecast:
    print(f"{day['date']}: {day['low']:.0f}F / {day['high']:.0f}F "
          f"-> {day['rating']} ({day['score']})")
```

### Alternative: NWS API Integration

```python
import requests

def get_nws_forecast(lat, lon):
    """Get 7-day forecast from NWS API (US only, free, no key)."""
    headers = {"User-Agent": "maple-sap-tracker contact@example.com"}

    # Step 1: Get forecast URL for coordinates
    points_url = f"https://api.weather.gov/points/{lat},{lon}"
    points = requests.get(points_url, headers=headers).json()
    forecast_url = points["properties"]["forecast"]

    # Step 2: Get the forecast
    forecast = requests.get(forecast_url, headers=headers).json()

    # Parse 12-hour periods into daily high/low
    periods = forecast["properties"]["periods"]
    daily = {}
    for period in periods:
        # NWS provides day/night periods
        date = period["startTime"][:10]
        temp = period["temperature"]
        if period["isDaytime"]:
            daily.setdefault(date, {})["high"] = temp
        else:
            daily.setdefault(date, {})["low"] = temp

    return daily
```

---

## Comparative Summary

### Maple-Specific Services

| Service | API Access | Cost | Forecast Range | Data Source |
|---------|-----------|------|---------------|-------------|
| [Sapcast](https://sapcast.ca/) | Undocumented endpoints | Free | 7 days | Pirate Weather |
| [MapleForecast](https://mapleauthority.com/maple-forecast) | None | Free | Varies | 8+ weather providers |
| [SapTapApps](https://www.saptapapps.com/flowcast/) | None | $1.99/yr | Varies | External weather provider |
| [Maple Syrup Time](https://www.maplesyruptime.com/) | None | Free/Premium | 7+ days | Multiple + ML model |

### Weather APIs (for DIY approach)

| API | API Key | Free Tier | Forecast Days | Best Feature |
|-----|---------|-----------|---------------|-------------|
| [Open-Meteo](https://open-meteo.com/) | None needed | Unlimited (non-commercial) | 16 | No auth, longest forecast, historical data |
| [NWS API](https://www.weather.gov/documentation/services-web-api) | None (User-Agent only) | Unlimited | 7 | US government data, always free |
| [OpenWeatherMap](https://openweathermap.org/api) | Required | 1,000 calls/day | 8 | Wide adoption, good docs |
| [WeatherAPI.com](https://www.weatherapi.com/) | Required | 1M calls/month | 3 (free) | Generous call limits |
| [Visual Crossing](https://www.visualcrossing.com/) | Required | 1,000 records/day | 15 | Historical + forecast |
| [Pirate Weather](https://pirate-weather.apiable.io/) | Required | 10,000 calls/month | 7 | Dark Sky compatible |
| [NOAA CDO](https://www.ncei.noaa.gov/cdo-web/) | Required | 10,000 calls/day | Historical only | 80+ years of data |

### Research/Institutional Sources

| Source | Data Type | API | Update Frequency |
|--------|----------|-----|-----------------|
| [Cornell Sap Run](http://www.cornellsaprun.com) | Real-time sap flow sensors | No (dashboard) | Real-time during season |
| [UVM Proctor Center](https://www.uvm.edu/cals/proctor-maple-research-center) | Sap flow research data | No | During season |
| [Vermont Maple Bulletin](https://vermontmaplebulletin.wordpress.com/) | Producer reports | No (blog) | Weekly during season |
| [Ohio State Maple](https://u.osu.edu/ohiomaple/) | Season updates | No (blog) | Periodic during season |

---

## Conclusion

### Key Findings

1. **No dedicated maple sap flow API exists** for public programmatic access. All maple-specific services (Sapcast, MapleForecast, SapTapApps, Maple Syrup Time) are consumer-facing web/mobile apps without documented public APIs.

2. **Open-Meteo is the best weather API for this use case.** It requires no API key, provides daily min/max temperatures (the exact data points needed), offers a 16-day forecast window, includes historical data access, and supports Fahrenheit output. It is free for non-commercial use.

3. **The NWS API is the best backup option** for US-only coverage -- completely free with no restrictions, though it requires a two-step lookup and returns 12-hour periods rather than daily min/max.

4. **The sap flow prediction algorithm is straightforward.** The core logic is: overnight low below 32F AND daytime high above 32F = sap flowing. Refining this with optimal temperature ranges (lows of 20-28F, highs of 40-50F) and consecutive-day bonuses produces a practical scoring system.

5. **Cornell's Maple Climate Network is the most promising institutional source** for real-time ground-truth sap flow data, though it currently lacks a public API. This could be a valuable data source to monitor for future API availability.

6. **A cumulative degree-day model** (base 32F) can track season progression: first runs around 30-50 degree days, peak at 50-150 degree days.

### Recommended Approach

For building an automated maple season tracker:

1. Use the **Open-Meteo API** for temperature data (no key needed, 16-day forecast)
2. Apply the **freeze-thaw scoring algorithm** outlined in this report
3. Add a **consecutive-day bonus** to account for the compounding effect of multi-day runs
4. Optionally track **cumulative degree days** to estimate season phase
5. Consider monitoring **Sapcast's undocumented API** (`/api/forecast`) as a supplementary data point for comparison

---

## References

1. [Sapcast - Maple Sap Tapping Forecast](https://sapcast.ca/)
2. [MapleForecast - Sap Flow Index for Maple Syrup Producers](https://mapleauthority.com/maple-forecast)
3. [SapTapApps - Sap Flowcaster](https://www.saptapapps.com/flowcast/)
4. [Maple Syrup Time App](https://www.maplesyruptime.com/)
5. [Open-Meteo - Free Open-Source Weather API](https://open-meteo.com/)
6. [Open-Meteo Documentation](https://open-meteo.com/en/docs)
7. [Open-Meteo GitHub Repository](https://github.com/open-meteo/open-meteo)
8. [National Weather Service API Documentation](https://www.weather.gov/documentation/services-web-api)
9. [NWS API General FAQs](https://weather-gov.github.io/api/general-faqs)
10. [OpenWeatherMap One Call API 3.0](https://openweathermap.org/api/one-call-3)
11. [WeatherAPI.com](https://www.weatherapi.com/)
12. [Visual Crossing Weather API](https://www.visualcrossing.com/weather-api/)
13. [Pirate Weather API](https://pirate-weather.apiable.io/)
14. [Pirate Weather GitHub](https://github.com/Pirate-Weather/pirateweather)
15. [NOAA Climate Data Online Web Services v2](https://www.ncdc.noaa.gov/cdo-web/webservices/v2)
16. [NOAA Global Historical Climatology Network Daily](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily)
17. [Cornell Maple Program](https://blogs.cornell.edu/cornellmaple/)
18. [Cornell Maple Calculators](https://blogs.cornell.edu/cornellmaple/cornell-maple-calculators/)
19. [Cornell Maple Climate Network - The Maple News](https://www.themaplenews.com/story/maple-climate-program-monitoring-sugar-bushes-/517/)
20. [UVM Proctor Maple Research Center](https://www.uvm.edu/cals/proctor-maple-research-center)
21. [Vermont Maple Bulletin](https://vermontmaplebulletin.wordpress.com/)
22. [Vermont Maple Sugar Makers' Association](https://vermontmaple.org/)
23. [Ohio State Maple - Season Updates](https://u.osu.edu/ohiomaple/category/season-updates/)
24. [Maple Research - Weather](https://mapleresearch.org/keys/weather/)
25. [Multiscale model of a freeze-thaw process for tree sap exudation - Journal of the Royal Society Interface](https://royalsocietypublishing.org/doi/10.1098/rsif.2015.0665)
26. [A two-dimensional heat transfer model for predicting freeze-thaw events in sugar maple trees - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0168192320302410)
27. [Dragonfly Sugarworks - Maple Sap Flow Temperature Chart](https://dragonflysugarworks.com/reading-the-trees-your-maple-sap-flow-temperature-chart-with-free-download/)
28. [Bonz Beach Farms - Best Temperature for Sap to Run](https://bonzbeachfarms.com/blogs/journal/best-temperature-for-sap-to-run)
29. [Cornell Cooperative Extension - Maple Syruping Season](https://monroe.cce.cornell.edu/agriculture/seasonal-produce-highlights/maple-syruping-season-why-the-sap-flows)
30. [University of Maine Extension - The Future of Sugar Maples](https://extension.umaine.edu/signs-of-the-seasons/news-events/the-future-of-sugar-maples-in-maine/)
31. [GLISA - Freeze-Thaw Cycles](https://glisa.umich.edu/resources-tools/climate-impacts/freeze-thaw-cycles/)
