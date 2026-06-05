#!/usr/bin/env python3
import argparse
import datetime as dt
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")

STYLE_LIBRARY = {
    "woodcut_almanac": {
        "style_id": "woodcut_almanac",
        "name": "Woodcut Almanac",
        "prompt": "Bold woodcut / linocut almanac print with carved black linework, rustic authority, thick hatching, broad poster shapes, and very legible hand-set text.",
        "board_material": "carved notice board",
    },
    "swiss_weather_board": {
        "style_id": "swiss_weather_board",
        "name": "Swiss Weather Board",
        "prompt": "Swiss modernist weather board with rigid grid, asymmetrical information hierarchy, geometric icons, strong whitespace, and crystal-clear labels.",
        "board_material": "precision information panel",
    },
    "field_guide_plate": {
        "style_id": "field_guide_plate",
        "name": "Field Guide Plate",
        "prompt": "Naturalist field-guide plate with labeled observations, specimen-like callouts, measured diagrams, and calm scientific clarity.",
        "board_material": "annotated field guide card",
    },
    "wpa_rural_poster": {
        "style_id": "wpa_rural_poster",
        "name": "WPA Rural Poster",
        "prompt": "WPA-era rural poster with heroic silhouettes, bold flat composition, strong directional shapes, and punchy civic typography.",
        "board_material": "public works placard",
    },
    "newspaper_engraving": {
        "style_id": "newspaper_engraving",
        "name": "Newspaper Engraving",
        "prompt": "Dramatic newspaper engraving with etched textures, illustrated-reportage energy, deep contrast, and headline urgency.",
        "board_material": "engraved news panel",
    },
    "general_store_broadside": {
        "style_id": "general_store_broadside",
        "name": "General Store Broadside",
        "prompt": "New England general-store broadside with practical poster lettering, local bulletin charm, ornamental dividers, and civic-town notice energy.",
        "board_material": "broadside announcement panel",
    },
    "bauhaus_instrument_panel": {
        "style_id": "bauhaus_instrument_panel",
        "name": "Bauhaus Instrument Panel",
        "prompt": "Bauhaus instrument panel with circles, bars, arrows, severe contrast, device-like precision, and unmistakable signal graphics.",
        "board_material": "instrument cluster panel",
    },
    "japanese_seasonal_card": {
        "style_id": "japanese_seasonal_card",
        "name": "Japanese Seasonal Card",
        "prompt": "Minimal Japanese seasonal card with restrained composition, elegant negative space, light pattern rhythm, and quiet poetic detail while preserving clear text.",
        "board_material": "seasonal notice card",
    },
}

STYLE_POOLS = {
    "winter": ["woodcut_almanac", "newspaper_engraving", "swiss_weather_board", "general_store_broadside"],
    "spring": ["field_guide_plate", "japanese_seasonal_card", "swiss_weather_board", "bauhaus_instrument_panel"],
    "summer": ["wpa_rural_poster", "field_guide_plate", "swiss_weather_board", "bauhaus_instrument_panel"],
    "autumn": ["woodcut_almanac", "general_store_broadside", "newspaper_engraving", "swiss_weather_board"],
}

POLLEN_LEVELS = {"none": 0, "low": 1, "moderate": 2, "high": 3, "very_high": 4}


def safe_int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_text(value, default=""):
    if value is None:
        return default
    text = str(value).strip()
    return text if text and text.lower() != "null" else default


def current_et_date():
    return dt.datetime.now(ET).date()


def monday_key(day: dt.date) -> str:
    monday = day - dt.timedelta(days=day.weekday())
    return monday.strftime("%m-%d")


def season_family_for(backdrop: str) -> str:
    if backdrop in {"deep_winter", "late_winter"}:
        return "winter"
    if backdrop in {"spring_transition", "green_up"}:
        return "spring"
    if backdrop in {"green_season", "high_summer"}:
        return "summer"
    return "autumn"


def compute_backdrop(parsed: dict, now: dt.date) -> str:
    month = now.month
    high = safe_int(parsed.get("weather", {}).get("high"), 32)
    low = safe_int(parsed.get("weather", {}).get("low"), 20)
    ski_open = normalize_text(parsed.get("mohawk", {}).get("status")).startswith("open")
    sap = bool(parsed.get("maple", {}).get("sap_flowing"))

    if month in {12, 1}:
        return "deep_winter"
    if month == 2 or (month == 3 and now.day < 20 and (ski_open or sap or high < 45)):
        return "late_winter"
    if month in {3, 4} or (month == 5 and low < 45):
        return "spring_transition"
    if month == 5 or month == 6:
        return "green_up"
    if month in {7, 8}:
        return "high_summer" if high >= 82 else "green_season"
    if month in {9, 10}:
        return "harvest"
    return "leaf_fall"


def compute_style_of_week(day: dt.date, backdrop: str, primary_story_id: str) -> dict:
    family = season_family_for(backdrop)
    pool = STYLE_POOLS[family]
    style_id = pool[day.isocalendar().week % len(pool)]
    style = dict(STYLE_LIBRARY[style_id])
    style["season_family"] = family
    style["alert_readability_bias"] = primary_story_id in {"storm", "frost", "heat", "school", "heavy_rain", "thunderstorm"}
    if style["alert_readability_bias"]:
        style["prompt"] += " Preserve maximum alert readability with oversized headline blocks, clean iconography, and short high-contrast labels."
    style["week_label"] = f"WEEK {day.isocalendar().week}"
    return style


def adjust_pollen_level(level: str, conditions: str, high: int) -> str:
    value = POLLEN_LEVELS.get(level, 0)
    cond = conditions.upper()
    if any(token in cond for token in ["RAIN", "SHOWER", "STORM", "DRIZZLE", "SNOW"]):
        value = max(0, value - 1)
    elif value > 0 and high >= 70:
        value = min(4, value + 1)
    for key, score in POLLEN_LEVELS.items():
        if score == value:
            return key
    return "none"


def pollen_level_label(level: str) -> str:
    return level.replace("_", " ").upper()


def describe_pollen_motif(pollen_week: dict) -> str:
    dominant = [normalize_text(item).lower() for item in (pollen_week.get("dominant", []) or []) if normalize_text(item)]
    if not dominant:
        return "subtle airborne pollen cues only, without inventing decorative blossoms"

    visible_species = ", ".join(item.upper() for item in dominant[:3])
    instructions: list[str] = [f"botanically accurate pollen-season cues for {visible_species}"]

    if "oak" in dominant:
        instructions.append(
            "oak should read as a real local Connecticut oak: thick dark furrowed trunk, heavy irregular branching, distinct lobed oak leaves, and dangling male catkins"
        )
    if "birch" in dominant:
        instructions.append(
            "birch should read as a real birch: pale papery bark with dark patches or horizontal lenticels, slim upright trunk, fine twiggy crown, small triangular serrated leaves just beginning to emerge, and slender hanging catkins"
        )
    if "pine" in dominant:
        instructions.append(
            "pine should read as an eastern white pine branch: soft needles in clear fascicles, clusters of small male pollen cones attached along the twig, and airy conifer structure rather than a generic triangular evergreen"
        )

    if any(name in dominant for name in ["alder", "hazel", "elm", "maple", "ash", "hickory"]):
        instructions.append("show species-specific catkins, buds, or branching habit instead of generic spring blossom")

    if any("ragweed" in name for name in dominant):
        instructions.append("ragweed should appear as roadside weed plumes rather than trees")

    if "grass" in dominant:
        instructions.append("grass pollen should appear as seed heads and meadow grasses rather than decorative tree bloom")

    instructions.append("do not label species with text inside the artwork")
    instructions.append("do not use orchard blossoms, cherry blossoms, or generic flowering branches unless the data explicitly calls for them")
    instructions.append("if only two broadleaf trees are prominent, make one unmistakably oak and the other unmistakably birch")
    instructions.append("prioritize identifiable bark, branching structure, leaf shape, and catkin form over atmospheric symbolism")

    return "; ".join(instructions)


def describe_harvest_motif(planting_week: dict, now: dt.date) -> str:
    harvest = planting_week.get("harvest", []) or []
    if not harvest:
        return "no large harvest tableau"

    if now.month <= 5:
        return "small spring harvest cues such as cut greens, radishes, and a modest trug near the beds; avoid overflowing autumn-style produce piles"

    if now.month <= 7:
        return "early-summer harvest cues such as greens, herbs, peas, and a working garden basket"

    return "abundant harvest cues such as baskets, crates, tomatoes, squash, and preserved produce"


def find_school_event(school: dict, now: dt.date):
    for offset in range(4):
        day = now + dt.timedelta(days=offset)
        key = day.isoformat()
        for event in school.get("events", []):
            if event.get("date") == key:
                if offset == 0:
                    prefix = "TODAY"
                elif offset == 1:
                    prefix = "TOMORROW"
                else:
                    prefix = day.strftime("%a").upper()
                description = normalize_text(event.get("description"), "School event")
                return {
                    "prefix": prefix,
                    "text": f"{prefix}: {description}",
                    "type": normalize_text(event.get("type"), "school_event"),
                    "date": key,
                }
    return None


def find_school_last_day(school: dict, now: dt.date):
    """Find the last day of school and days remaining."""
    last_day = None
    for event in school.get("events", []):
        if event.get("type") == "early_dismissal" and "Last Day" in (event.get("description", "") or ""):
            d = dt.date.fromisoformat(event["date"])
            if d >= now:
                last_day = d
                break
    if not last_day:
        return None
    days_left = (last_day - now).days
    return {
        "date": last_day,
        "days_left": days_left,
        "is_today": days_left == 0,
    }


def find_upcoming_events(town: dict, now: dt.date, max_days: int = 21):
    """Find the best upcoming town events within max_days, sorted by tier then proximity."""
    events = town.get("events", [])
    recurring = town.get("recurring", [])
    candidates = []

    for event in events:
        try:
            d = dt.date.fromisoformat(event["date"])
        except (ValueError, TypeError):
            continue
        days_off = (d - now).days
        if 0 <= days_off <= max_days:
            tier = event.get("tier", 1)
            candidates.append({
                "date": d,
                "days_off": days_off,
                "label": event.get("label", ""),
                "description": event.get("description", ""),
                "time": event.get("time", ""),
                "tier": tier,
            })

    # Also check recurring events (farmers market, storybook hour)
    today_weekday = now.weekday()
    for item in recurring:
        dow = item.get("day_of_week")
        if dow is not None:
            # Find next occurrence within max_days
            days_ahead = (dow - today_weekday) % 7
            if days_ahead == 0:
                days_ahead = 7  # Next week, not today
            if days_ahead <= max_days:
                d = now + dt.timedelta(days=days_ahead)
                candidates.append({
                    "date": d,
                    "days_off": days_ahead,
                    "label": item.get("label", ""),
                    "description": item.get("description", ""),
                    "time": item.get("time", ""),
                    "tier": 1,
                })

    if not candidates:
        return None

    # Sort: highest tier first, then closest
    candidates.sort(key=lambda x: (-x["tier"], x["days_off"]))
    return candidates[0]


def build_regimes(parsed: dict, planting_week: dict, pollen_week: dict, school_event: dict | None, now: dt.date, town_event: dict | None = None, school_last_day: dict | None = None):
    weather = parsed.get("weather", {})
    alerts = parsed.get("alerts", {})
    mohawk = parsed.get("mohawk", {})
    maple = parsed.get("maple", {})
    season = parsed.get("season_indicators", {})
    banner = parsed.get("banner", {})

    high = safe_int(weather.get("high"), 32)
    low = safe_int(weather.get("low"), 20)
    conditions = normalize_text(weather.get("conditions"), "FAIR")
    frost_risk = normalize_text(season.get("frost_risk"), "none")
    forecast = parsed.get("forecast", {})
    regimes = []

    weather_alert = normalize_text(alerts.get("weather_alert"))
    mountain_alert = normalize_text(alerts.get("mountain_alert"))
    if weather_alert or normalize_text(banner.get("type")) == "storm_warning":
        regimes.append({
            "id": "storm",
            "label": "Storm",
            "score": 0.99,
            "headline": weather_alert.upper() or "WEATHER ALERT",
            "action": "WATCH CONDITIONS",
            "notes": [weather_alert.upper() or "WEATHER ALERT ACTIVE", mountain_alert.upper()] if mountain_alert else [weather_alert.upper() or "WEATHER ALERT ACTIVE"],
        })

    frost_scores = {"hard_freeze": 0.97, "frost": 0.9, "light_frost": 0.74}
    if frost_risk in frost_scores:
        headline = {
            "hard_freeze": f"HARD FREEZE {low}°F",
            "frost": f"FROST TONIGHT {low}°F",
            "light_frost": "LIGHT FROST POSSIBLE",
        }[frost_risk]
        action = {
            "hard_freeze": "COVER TENDER PLANTS",
            "frost": "COVER TENDER PLANTS",
            "light_frost": "WATCH THE LOW SPOTS",
        }[frost_risk]
        regimes.append({
            "id": "frost",
            "label": "Frost",
            "score": frost_scores[frost_risk],
            "headline": headline,
            "action": action,
            "notes": [f"Low {low}°F tonight", f"High {high}°F tomorrow"],
        })

    mohawk_status = normalize_text(mohawk.get("status"), "closed")
    trails_open = safe_int(mohawk.get("trails_open"), 0)
    trails_total = max(1, safe_int(mohawk.get("trails_total"), 27))
    fresh_snow = safe_int(mohawk.get("fresh_snow"), 0)
    if mohawk_status.startswith("open") and trails_open > 0:
        ratio = trails_open / trails_total
        score = 0.55 + ratio * 0.25 + min(fresh_snow, 8) * 0.02
        if high >= 55:
            score -= 0.18
        surface = normalize_text(mohawk.get("surface"), "variable").upper()
        headline = "MOHAWK WORTH IT" if ratio >= 0.6 else "SPRING SKI WINDOW"
        action = "GO EARLY" if high >= 40 else "GO GET TURNS"
        regimes.append({
            "id": "ski",
            "label": "Ski",
            "score": round(score, 2),
            "headline": headline,
            "action": action,
            "notes": [f"{trails_open}/{trails_total} trails", surface],
        })

    if bool(maple.get("sap_flowing")):
        quality = normalize_text(maple.get("quality"), "good")
        score = 0.72 + {"ideal": 0.14, "good": 0.07, "poor": -0.08}.get(quality, 0)
        headline = "SAP RUNNING" if quality != "ideal" else "PEAK SAP WINDOW"
        regimes.append({
            "id": "sap",
            "label": "Sap",
            "score": round(score, 2),
            "headline": headline,
            "action": "TAP / BOIL",
            "notes": [f"Quality {quality.upper()}", f"High {high}° / Low {low}°"],
        })

    direct_sow = planting_week.get("direct_sow", []) or []
    indoor_starts = planting_week.get("indoor_starts", []) or []
    transplant = planting_week.get("transplant", []) or []
    harvest = planting_week.get("harvest", []) or []
    tasks = planting_week.get("tasks", []) or []
    highlight = normalize_text(planting_week.get("highlight"))

    if harvest:
        regimes.append({
            "id": "harvest",
            "label": "Harvest",
            "score": 0.76 if now.month in {8, 9, 10} else (0.48 if now.month <= 5 else 0.6),
            "headline": "HARVEST WINDOW",
            "action": "PICK BEFORE WEATHER",
            "notes": [f"Harvest: {', '.join(harvest[:3])}", highlight],
        })
    elif transplant:
        action = "HOLD TENDERS" if frost_risk in {"hard_freeze", "frost", "light_frost"} else "SET OUT SEEDLINGS"
        headline = "TRANSPLANT WINDOW" if frost_risk == "none" else "TRANSPLANT CAUTION"
        score = 0.78 if frost_risk in {"hard_freeze", "frost"} else 0.69
        regimes.append({
            "id": "planting",
            "label": "Planting",
            "score": score,
            "headline": headline,
            "action": action,
            "notes": [f"Transplant: {', '.join(transplant[:3])}", highlight or (tasks[0] if tasks else "")],
        })
    elif direct_sow or indoor_starts or tasks:
        regimes.append({
            "id": "planting",
            "label": "Planting",
            "score": 0.63,
            "headline": "PLANT THIS WEEK",
            "action": "WORK THE BEDS",
            "notes": [
                f"Sow: {', '.join(direct_sow[:3])}" if direct_sow else "",
                f"Start: {', '.join(indoor_starts[:3])}" if indoor_starts else (tasks[0] if tasks else highlight),
            ],
        })

    raw_tree = normalize_text(pollen_week.get("tree"), "none")
    raw_grass = normalize_text(pollen_week.get("grass"), "none")
    raw_weed = normalize_text(pollen_week.get("weed"), "none")
    tree = adjust_pollen_level(raw_tree, conditions, high)
    grass = adjust_pollen_level(raw_grass, conditions, high)
    weed = adjust_pollen_level(raw_weed, conditions, high)
    pollen_value = max(POLLEN_LEVELS.get(tree, 0), POLLEN_LEVELS.get(grass, 0), POLLEN_LEVELS.get(weed, 0))
    if pollen_value >= 2:
        dominant = pollen_week.get("dominant", []) or []
        summary = normalize_text(pollen_week.get("summary"))
        label = [k for k, v in [("Tree", tree), ("Grass", grass), ("Weed", weed)] if POLLEN_LEVELS.get(v, 0) == pollen_value]
        focus_type = label[0].upper() if label else "POLLEN"
        focus_level = pollen_level_label(tree if "Tree" in label else grass if "Grass" in label else weed if "Weed" in label else tree)
        regimes.append({
            "id": "pollen",
            "label": "Pollen",
            "score": 0.44 + pollen_value * 0.08,
            "headline": f"{focus_type} POLLEN {focus_level}",
            "action": "LIMIT TREE POLLEN EXPOSURE",
            "notes": [f"Peak: {'/'.join(label)}", ', '.join(dominant) or summary],
        })

    if school_event:
        score = {"no_school": 0.8, "early_dismissal": 0.68}.get(school_event["type"], 0.62)
        regimes.append({
            "id": "school",
            "label": "School",
            "score": score,
            "headline": school_event["text"].upper(),
            "action": "PLAN THE LOGISTICS",
            "notes": [school_event["type"].replace('_', ' ').upper(), school_event["date"]],
        })

    # Heavy rain / washout regime — from NWS forecast precip probability
    today_precip = safe_int(forecast.get("today_precip_chance"))
    tonight_precip = safe_int(forecast.get("tonight_precip_chance"))
    max_precip = max(today_precip, tonight_precip)
    if max_precip >= 60 and not (weather_alert or normalize_text(banner.get("type")) == "storm_warning"):
        if max_precip >= 90:
            score = 0.86
            headline = f"RAIN LIKELY {max_precip}%"
            action = "PLAN INDOOR DAY"
        elif max_precip >= 75:
            score = 0.78
            headline = f"RAIN LIKELY {max_precip}%"
            action = "PLAN AHEAD"
        else:
            score = 0.72
            headline = f"RAIN EXPECTED {max_precip}%"
            action = "CARRY RAIN GEAR"
        regimes.append({
            "id": "heavy_rain",
            "label": "Heavy Rain",
            "score": score,
            "headline": headline,
            "action": action,
            "notes": [
                f"Today {today_precip}% / Tonight {tonight_precip}%",
                normalize_text(forecast.get("today_forecast", "")).upper() or conditions.upper(),
            ],
        })

    # Thunderstorm regime — from NWS forecast text
    has_tstorms = forecast.get("has_thunderstorms", False)
    if has_tstorms and max_precip < 90:
        tstorm_precip = safe_int(forecast.get("today_precip_chance"))
        regimes.append({
            "id": "thunderstorm",
            "label": "Thunderstorms",
            "score": 0.88,
            "headline": "T-STORMS POSSIBLE",
            "action": "WATCH THE SKY",
            "notes": [
                f"Precip {tstorm_precip}%",
                normalize_text(forecast.get("today_forecast", "")).upper() or "THUNDERSTORMS POSSIBLE",
            ],
        })

    if high >= 86:
        regimes.append({
            "id": "heat",
            "label": "Heat",
            "score": 0.84,
            "headline": f"HEAT {high}°F",
            "action": "WATER DEEPLY",
            "notes": [conditions.upper(), f"Low {low}° tonight"],
        })

    # Town events regime — surfaces the best upcoming community event
    if town_event:
        tier = town_event.get("tier", 1)
        days_off = town_event.get("days_off", 0)
        label = town_event.get("label", "")
        description = town_event.get("description", "")
        time_str = town_event.get("time", "")

        # Score based on tier and proximity
        if tier >= 3:
            if days_off <= 2:
                score = 0.92  # Major event this weekend / tomorrow!
            elif days_off <= 7:
                score = 0.86  # Major event this week
            else:
                score = 0.78  # Major event upcoming
        elif tier == 2:
            if days_off <= 2:
                score = 0.82  # Fun event this weekend
            elif days_off <= 7:
                score = 0.72  # Fun event this week
            else:
                score = 0.65  # Fun event upcoming
        else:
            score = 0.50  # Recurring / mild

        if days_off == 0:
            # Event is today!
            headline = f"TODAY: {label}"
            action = "GO CHECK IT OUT"
        elif days_off == 1:
            headline = f"TOMORROW: {label}"
            action = "PLAN AHEAD"
        else:
            day_name = (now + dt.timedelta(days=days_off)).strftime("%a").upper()
            headline = f"{label} {day_name}"
            action = "MARK YOUR CALENDAR"

        notes_parts = []
        if description:
            notes_parts.append(description.upper())
        if time_str and time_str.lower() != "tbd" and time_str.lower() != "all day":
            notes_parts.append(time_str)
        elif days_off <= 7:
            notes_parts.append(f"{days_off} DAYS AWAY")

        regimes.append({
            "id": "town_events",
            "label": "Town Events",
            "score": score,
            "headline": headline,
            "action": action,
            "notes": notes_parts[:2],
            "town_event": town_event,
        })

    # School countdown regime — ramps up as summer approaches
    if school_last_day:
        days_left = school_last_day["days_left"]
        if days_left <= 0:
            # School's out!
            regimes.append({
                "id": "school_out",
                "label": "School Out",
                "score": 0.95,
                "headline": "SCHOOL'S OUT FOR SUMMER!",
                "action": "ENJOY THE FREEDOM",
                "notes": ["SUMMER VACATION!", "LAST DAY OF SCHOOL"],
            })
        elif days_left <= 14:
            score = 0.78 + (14 - days_left) * 0.01  # ramps from 0.78 to 0.92
            regimes.append({
                "id": "school_countdown",
                "label": "Summer Countdown",
                "score": round(score, 2),
                "headline": f"{days_left} DAYS 'TIL SUMMER",
                "action": "ALMOST THERE" if days_left > 3 else "SO CLOSE!",
                "notes": [f"Last day: {school_last_day['date'].strftime('%b %d').upper()}", "SCHOOL'S OUT JUN 19"],
            })

    deduped = []
    seen = set()
    for regime in sorted(regimes, key=lambda item: item["score"], reverse=True):
        if regime["id"] not in seen:
            deduped.append(regime)
            seen.add(regime["id"])
    return deduped, {
        "tree": tree,
        "grass": grass,
        "weed": weed,
        "dominant": pollen_week.get("dominant", []) or [],
        "summary": normalize_text(pollen_week.get("summary")),
    }, forecast


def build_board(primary_story: dict, active_stack: list[dict], planting_week: dict, pollen_info: dict, school_event: dict | None, style: dict, forecast: dict | None = None, now: dt.date | None = None):
    primary_id = primary_story.get("id", "")
    compact = style.get("alert_readability_bias") or any(item["id"] in {"pollen", "heavy_rain", "thunderstorm", "storm"} for item in active_stack)

    direct_sow = planting_week.get("direct_sow", []) or []
    transplant = planting_week.get("transplant", []) or []
    harvest = planting_week.get("harvest", []) or []
    tasks = planting_week.get("tasks", []) or []
    dominant = [normalize_text(item).upper() for item in (pollen_info.get("dominant", []) or []) if normalize_text(item)]

    # Build secondary lines based on active stack (not just primary)
    def _secondary_lines():
        lines = []

        # If primary is town_events, show event description + time
        if primary_id == "town_events":
            notes = primary_story.get("notes", [])
            for note in notes[:2]:
                if note:
                    lines.append(note.upper())

        # If primary is school_countdown / school_out
        elif primary_id in ("school_countdown", "school_out"):
            pass  # Just show the headline + action, no clutter

        # Weather stories get notes
        elif primary_id in {"heavy_rain", "thunderstorm", "storm", "frost", "heat"}:
            notes = primary_story.get("notes", [])
            for note in notes[:2]:
                if note:
                    lines.append(note.upper())

        # Always add a secondary line about the next-best thing
        # Check for other active stack items that aren't the primary
        secondary_items = [item for item in active_stack if item["id"] != primary_id and item["id"] not in {"background", "school_countdown", "school_out"}]

        # Look for garden/pollen info as a secondary
        if any(item["id"] == "pollen" for item in secondary_items):
            if dominant:
                lines.append(f"POLLEN: {' • '.join(dominant[:2])}")
            elif pollen_info.get("tree", "none") != "none" or pollen_info.get("grass", "none") != "none":
                bits = []
                for name in ["tree", "grass", "weed"]:
                    level = pollen_info.get(name, "none")
                    if level != "none":
                        bits.append(f"{pollen_level_label(level)} {name.title()}")
                if bits:
                    lines.append("POLLEN: " + " / ".join(bits[:2]))

        if any(item["id"] == "planting" for item in secondary_items):
            if transplant:
                lines.append(f"TRANSPLANT: {', '.join(transplant[:2]).upper()}")
            elif direct_sow:
                lines.append(f"SOW: {', '.join(direct_sow[:2]).upper()}")
            elif harvest:
                lines.append(f"HARVEST: {', '.join(harvest[:2]).upper()}")

        if any(item["id"] == "harvest" for item in secondary_items):
            if harvest and not any("HARVEST" in l for l in lines):
                lines.append(f"HARVEST: {', '.join(harvest[:2]).upper()}")

        # Check for school countdown in secondary
        school_cd = next((item for item in active_stack if item["id"] == "school_countdown"), None)
        if school_cd and primary_id != "school_countdown":
            lines.append(school_cd["headline"])

        school_out = next((item for item in active_stack if item["id"] == "school_out"), None)
        if school_out and primary_id != "school_out":
            lines.append(school_out["headline"])

        # Town events in secondary? Mention the best one
        town_ev = next((item for item in active_stack if item["id"] == "town_events"), None)
        if town_ev and primary_id != "town_events":
            lines.append(town_ev["headline"])

        # School event (early dismissal etc.) in secondary
        if school_event and primary_id != "school":
            lines.append(school_event["text"].upper())

        return lines

    if compact:
        title = "TODAY"
        lines = [primary_story["headline"]]
        sec = _secondary_lines()
        lines.extend(sec[:4])  # max 4 secondary lines in compact
        # Ensure we have at least the action line
        if len(lines) < 2:
            lines.append(primary_story["action"])
    else:
        title = "TODAY"
        lines = [primary_story["headline"], primary_story["action"]]
        sec = _secondary_lines()
        lines.extend(sec[:4])  # max 4 secondary in non-compact

    # Weekend outlook — show on Thursday and Friday (weekday 3 and 4)
    if now is not None and now.weekday() in {3, 4}:  # Thu or Fri only
        fc = forecast or {}
        wknd = normalize_text(fc.get("weekend_forecast"))
        wknd_precip = safe_int(fc.get("weekend_precip_chance"))
        if wknd and wknd_precip is not None:
            wknd_line = f"WEEKEND: {wknd} ({wknd_precip}%)"
            if compact:
                insert_pos = min(2, len(lines) - 1)
                lines.insert(insert_pos, wknd_line)
            elif len(lines) < 6:
                lines.append(wknd_line)

    return {
        "title": title,
        "subtitle": "" if compact else f"{style['name']} • {style['week_label']}",
        "lines": lines[:5] if compact else lines[:6],
    }


def determine_banner(primary_story: dict, active_stack: list[dict], school_event: dict | None, planting_week: dict, pollen_info: dict):
    text = primary_story["headline"]
    if primary_story["id"] == "frost":
        text = f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "harvest":
        highlight = normalize_text(planting_week.get("highlight"))
        text = highlight.upper() if highlight else f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "sap":
        text = f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "pollen":
        text = primary_story["action"]
    elif primary_story["id"] in {"heavy_rain", "thunderstorm"}:
        text = f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "town_events":
        text = f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "school_countdown":
        text = f"{primary_story['headline']} • JUN 19"
    elif primary_story["id"] == "school_out":
        text = "SUMMER VACATION! ☀️"

    if school_event and primary_story["id"] not in ("school", "school_countdown", "school_out"):
        text = f"{text} • {school_event['text'].upper()}"
    return text[:120]


def build_scene_description(backdrop: str, active_stack: list[dict], style: dict, pollen_context: dict | None = None, planting_week: dict | None = None, now: dt.date | None = None):
    pollen_context = pollen_context or {}
    planting_week = planting_week or {}
    now = now or current_et_date()
    backdrop_text = {
        "deep_winter": "deep winter Cornwall hills with snowbound woods and dark pines",
        "late_winter": "late winter Cornwall hills with patchy snow, bare branches, and thawing edges",
        "spring_transition": "raw New England spring transition with damp earth, stone walls, budding trees, and cold light",
        "green_up": "green-up countryside with fresh leaves, wet fields, garden rows, and lively hedgerows",
        "green_season": "lush green-season countryside with full gardens, dense tree canopy, and warm open skies",
        "high_summer": "high summer countryside with dense growth, ripe beds, and bright long-day atmosphere",
        "harvest": "harvest-season countryside with full baskets, orchards, field edges, and turning leaves",
        "leaf_fall": "late autumn countryside with bare limbs, mulch, root crops, and wind-stripped hills",
    }[backdrop]

    motifs = {
        "storm": "storm arrows, dramatic cloud masses, alert triangles, and weather-front energy",
        "heavy_rain": "heavy rain streaks, umbrellas, puddles, dark cloud layers, and wet vegetation",
        "thunderstorm": "lightning bolts, dark thunderheads, dramatic sky, rain curtains, and storm clouds",
        "frost": "row covers, cold glitter on garden beds, warning pennants, and low-lying frost pockets",
        "ski": "chairlifts, groomed trails, skiers, pine ridges, and ski hill geometry",
        "sap": "sugar maples, sap buckets, tubing lines, sugar-house steam, and melting snow patches",
        "planting": "seed trays, cold frames, row markers, tools at the ready, and organized beds",
        "harvest": describe_harvest_motif(planting_week, now),
        "pollen": describe_pollen_motif({"dominant": pollen_context.get("dominant", [])}),
        "school": "a town bulletin board or calendar notice tucked into the civic landscape",
        "heat": "sun glyphs, deep shadows, wilt warning energy, and water vessels at hand",
        "town_events": "a community events poster with pennants, a town green, festival tents, market stalls, and people gathering",
        "school_countdown": "a calendar counting down the days, summer sunshine peeking over the horizon, chalkboard with crossed-off dates",
        "school_out": "bursting summer celebration with sunshine, open fields, bikes, swim holes, and a carefree vacation atmosphere",
    }
    active_ids = [item["id"] for item in active_stack[:3]]
    active_motifs = [motifs[item_id] for item_id in active_ids if item_id in motifs]
    motif_text = "; ".join(active_motifs)
    extra_directive = ""
    if "pollen" in active_ids:
        extra_directive = (
            " Add a small field-guide-style botanical inset or reference strip for the pollen species: "
            "one oak twig with unmistakable lobed leaves and dangling male catkins, "
            "one birch twig or young trunk with white papery bark and slender hanging catkins, "
            "and one pine sprig with needle bundles and pollen cones. "
            "Use that inset as the truth source for the larger landscape trees so they inherit the same morphology."
        )
    return f"{backdrop_text}; include overlapping active realities: {motif_text}.{extra_directive} The composition should feel like a local Cornwall bulletin board imagined through the weekly guest art director style {style['name']}. Prefer botanical accuracy over decorative symbolism."


def build_dashboard_state(parsed: dict, planting: dict, pollen: dict, school: dict, town: dict, now: dt.date | None = None):
    now = now or current_et_date()
    week_key = monday_key(now)
    planting_week = planting.get(week_key, {})
    pollen_week = pollen.get(week_key, {})
    school_event = find_school_event(school, now)
    school_last_day = find_school_last_day(school, now)
    town_event = find_upcoming_events(town, now)
    backdrop = compute_backdrop(parsed, now)
    active_stack, pollen_info, _forecast = build_regimes(parsed, planting_week, pollen_week, school_event, now, town_event, school_last_day)
    if not active_stack:
        active_stack = [{
            "id": "background",
            "label": "Background",
            "score": 0.2,
            "headline": "SEASON IN MOTION",
            "action": "CHECK BACK LATER",
            "notes": ["Quiet weather", "No urgent stack items"],
        }]
    primary_story = active_stack[0]
    style = compute_style_of_week(now, backdrop, primary_story["id"])
    board = build_board(primary_story, active_stack, planting_week, pollen_info, school_event, style, forecast=parsed.get("forecast", {}), now=now)
    action_line = primary_story["action"]
    banner_text = determine_banner(primary_story, active_stack, school_event, planting_week, pollen_info)

    return {
        "date": now.isoformat(),
        "week_key": week_key,
        "backdrop": backdrop,
        "style": style,
        "active_stack": active_stack,
        "primary_story": primary_story,
        "board": board,
        "action_line": action_line,
        "banner_text": banner_text,
        "school_event": school_event,
        "planting_week": planting_week,
        "pollen": pollen_info,
    }


def render_prompt(parsed: dict, state: dict) -> str:
    weather = parsed.get("weather", {})
    sun_moon = parsed.get("sun_moon", {})
    conditions = normalize_text(weather.get("conditions"), "FAIR")
    temp = safe_int(weather.get("temperature"), safe_int(weather.get("high"), 32))
    high = safe_int(weather.get("high"), 32)
    low = safe_int(weather.get("low"), 20)
    wind = normalize_text(weather.get("wind"), "Calm")
    wind_chill = weather.get("wind_chill")
    style = state["style"]
    board = state["board"]
    extra_left = []
    compact_text_mode = board.get("subtitle", "") == ""
    if wind_chill not in (None, "", "null"):
        wc = safe_int(wind_chill, temp)
        if temp - wc >= 5:
            extra_left.append(f"WIND CHILL {wc}°F")
    alert = normalize_text(parsed.get("alerts", {}).get("weather_alert"))
    if alert:
        extra_left.append(alert.upper())
    if compact_text_mode and extra_left:
        wind = f"{wind.upper()} / {extra_left[0]}"
        extra_left = []
    extra_left_text = "\n".join(f"- '{line}'" for line in extra_left)
    if extra_left_text:
        extra_left_text = "\n" + extra_left_text

    board_lines = "\n".join(f"- '{line}'" for line in board["lines"])
    pollen_truth_block = ""
    scene_text = build_scene_description(
        state['backdrop'],
        state['active_stack'],
        style,
        state.get('pollen'),
        state.get('planting_week'),
        dt.date.fromisoformat(state['date']),
    )
    primary_id = state['primary_story']['id']
    pollen_is_primary = primary_id == "pollen"
    if pollen_is_primary:
        scene_text = (
            "botanical pollen bulletin board for Cornwall rather than a scenic poster; "
            "the dominant visual should be three large specimen studies occupying most of the composition: oak, birch, and pine; "
            "each specimen should be drawn like a natural-history plate with species-defining morphology that remains legible after 1-bit conversion; "
            "use only a narrow secondary landscape band or small vignette to situate the weather, garden beds, stone walls, frost cloth, and modest spring harvest cues"
        )
        pollen_truth_block = """
BOTANICAL TRUTH MODE:
- This is not a decorative spring landscape.
- Make the composition a botanical bulletin board first and a landscape second.
- Dedicate well over half of the visual attention to specimen studies; the landscape is subordinate.
- Show three large specimen studies: one oak study, one birch study, and one pine study.
- Oak study: a local Connecticut oak with distinct lobed leaves, dangling male catkins, and thick rough-barked branching.
- Birch study: white papery bark with dark lenticels/patches, fine twigs, small triangular serrated leaves just emerging, and slender hanging catkins.
- Pine study: an eastern white pine branch with soft needles in visible fascicles and clusters of small male pollen cones attached along the twig, not a generic Christmas-tree silhouette.
- The larger trees in any landscape vignette must visibly match those specimen studies.
- If there is any conflict between graphic style and species accuracy, choose species accuracy.
- Never solve species identification with text labels inside the illustration.
- The words OAK, BIRCH, and PINE must not appear anywhere in the artwork.
- Do not put species names under the specimen studies; the morphology must carry the identification.
- Avoid generic deciduous tree symbols, decorative blossom motifs, and anonymous conifer silhouettes.
"""

    moon_phase = normalize_text(sun_moon.get('moon_phase'), '')
    moon_phase_lower = moon_phase.lower()
    moon_strip = ""
    if moon_phase and any(token in moon_phase_lower for token in ["full", "new"]):
        moon_strip = f"\nTOP RIGHT - if there is obvious empty space after the main text is already large and readable, a single small bold moon strip may be shown: '{moon_phase.upper()}'. Do not show moon info for any other phase and do not use separate sunrise/sunset widgets.\n"

    prompt = f"""Black and white 1-bit illustration for TRMNL e-ink display. Wide 5:3 landscape format at 800x480. Compose for the final TRMNL frame itself rather than a wider cinematic canvas. Render at exactly 800x480 pixels natively if the model supports explicit output dimensions; do not simulate a wider poster that will need later reframing. Use ONLY pure black and pure white with no gray tones. All shading must be hatching, cross-hatching, stipple, or solid fills that survive thresholding.

CRITICAL — THIS IS FOR 1-BIT E-INK: Use HIGH CONTRAST. The image will be converted to pure black-and-white, so avoid thin lines, delicate shading, or light-gray areas that will disappear in conversion. Make text blocks SOLID BLACK on WHITE background. Use thick outlines, large shapes, and bold fills. If in doubt, make it darker — not lighter.

SCENE: {scene_text}{pollen_truth_block}

PRIMARY STORY: The image should explain today's most useful outdoor information at a glance. Use plain language. If pollen is high, say exactly which kind of pollen is high rather than vague slogans.

LEFT SIDE - a single simple town signpost with EXACTLY four stacked weather sign panels and no extras, with oversized date and weather numerals that can be read instantly on a low-resolution e-ink screen. Make these four boxes large, simple, and bolder than everything except the main headline. No fifth box, no repeated wind box, no tiny sublabels:
- '{parsed.get('date', '')}'
- '{temp}° {conditions}'
- 'H {high}° / L {low}°'
- '{wind.upper()}'{extra_left_text}{moon_strip}
RIGHT SIDE - {style['board_material']} titled '{board['title']}' showing; treat this as a bold summary board with EXACTLY these {len(board['lines'])} lines in this order, one line per row, and no extra rows or paraphrases. No stack jargon, no repeated pollen line, no tiny explanatory labels, generous padding, and heavy lettering. The right panel must stay fully inside frame with comfortable margins and no cropped side content:
{board_lines}

BOTTOM CENTER - use a simple solid headline bar with '{state['banner_text']}'. Prefer a plain bold bar over an ornate ribbon, and do not repeat the exact same pollen message in both the bar and the right panel.

BOTTOM LEFT CORNER - omit the update stamp entirely if it competes with readability. If there is abundant empty space, show only a tiny plain line 'Updated {parsed.get('timestamp', '')}'.

STYLE OF THE WEEK: {style['name']}. {style['prompt']}

LAYOUT RULES:
- Prioritize legibility over ornament, texture, scenery, and style flourishes.
- Use thick outlines, large shapes, minimal hatching, and broad white space.
- Favor fewer words at larger sizes over more words at tiny sizes.
- Make the date, current temperature, headline, and action line the largest text blocks on the page.
- If the layout gets crowded, delete nonessential metadata before shrinking primary data.
- Avoid small machinery, extra landscape details, dense background scenery, or fine decorative textures.
- Preserve a single strong headline hierarchy.
- Show overlapping seasonal realities in one coherent landscape rather than a single simplistic season.
- The aesthetic should feel like a local Cornwall bulletin board curated by a different print/design tradition each week.
"""
    return prompt


def load_json(path: Path) -> dict:
    with path.open() as fh:
        return json.load(fh)


def main():
    parser = argparse.ArgumentParser(description="Build TRMNL prompt from parsed data and seasonal state logic")
    parser.add_argument("--input", default="/tmp/trmnl-data/parsed.json")
    parser.add_argument("--output", default="/tmp/trmnl-prompt.txt")
    parser.add_argument("--planting", default=str(Path(__file__).resolve().parent / "prompts/planting-calendar-zone6a.json"))
    parser.add_argument("--pollen", default=str(Path(__file__).resolve().parent / "prompts/pollen-calendar-zone6a.json"))
    parser.add_argument("--school", default=str(Path(__file__).resolve().parent / "prompts/school-calendar.json"))
    parser.add_argument("--town", default=str(Path(__file__).resolve().parent / "prompts/cornwall-events-2026.json"))
    args = parser.parse_args()

    parsed = load_json(Path(args.input))
    planting = load_json(Path(args.planting))
    pollen = load_json(Path(args.pollen))
    school = load_json(Path(args.school))
    town = load_json(Path(args.town))
    state = build_dashboard_state(parsed, planting, pollen, school, town)
    prompt = render_prompt(parsed, state)

    output_path = Path(args.output)
    output_path.write_text(prompt)
    print(output_path)


if __name__ == "__main__":
    main()
