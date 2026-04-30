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
    style["alert_readability_bias"] = primary_story_id in {"storm", "frost", "heat", "school"}
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


def build_regimes(parsed: dict, planting_week: dict, pollen_week: dict, school_event: dict | None, now: dt.date):
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
        regimes.append({
            "id": "pollen",
            "label": "Pollen",
            "score": 0.44 + pollen_value * 0.08,
            "headline": "POLLEN UP" if pollen_value >= 3 else "POLLEN ACTIVE",
            "action": "PLAN ACCORDINGLY",
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

    if high >= 86:
        regimes.append({
            "id": "heat",
            "label": "Heat",
            "score": 0.84,
            "headline": f"HEAT {high}°F",
            "action": "WATER DEEPLY",
            "notes": [conditions.upper(), f"Low {low}° tonight"],
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
    }


def build_board(primary_story: dict, active_stack: list[dict], planting_week: dict, pollen_info: dict, school_event: dict | None, style: dict):
    stack_names = " • ".join(item["id"].upper() for item in active_stack[:4]) or "QUIET WEEK"
    compact = style.get("alert_readability_bias") or any(item["id"] == "pollen" for item in active_stack)
    lines = [
        f"HEADLINE: {primary_story['headline']}",
        f"ACTION: {primary_story['action']}",
        f"STACK: {stack_names}",
    ]

    direct_sow = planting_week.get("direct_sow", []) or []
    transplant = planting_week.get("transplant", []) or []
    harvest = planting_week.get("harvest", []) or []
    tasks = planting_week.get("tasks", []) or []

    if compact:
        if pollen_info.get("tree", "none") != "none":
            lines.append(f"TREE POLLEN: {pollen_info.get('tree', 'none').upper()}")
        elif harvest:
            lines.append(f"HARVEST: {', '.join(harvest[:2])}")
        elif transplant:
            lines.append(f"TRANSPLANT: {', '.join(transplant[:2])}")
        elif direct_sow:
            lines.append(f"SOW: {', '.join(direct_sow[:2])}")
        elif tasks:
            lines.append(f"TASK: {tasks[0]}")
    else:
        if harvest:
            lines.append(f"HARVEST: {', '.join(harvest[:3])}")
        elif transplant:
            lines.append(f"TRANSPLANT: {', '.join(transplant[:3])}")
        elif direct_sow:
            lines.append(f"SOW: {', '.join(direct_sow[:3])}")
        elif tasks:
            lines.append(f"TASK: {tasks[0]}")

        pollen_bits = []
        for name in ["tree", "grass", "weed"]:
            level = pollen_info.get(name, "none")
            if level != "none":
                pollen_bits.append(f"{name[:1].upper()}:{level.upper()}")
        if pollen_bits:
            lines.append(f"POLLEN: {' '.join(pollen_bits)}")

    if school_event and not compact:
        lines.append(school_event["text"].upper())

    return {
        "title": "SEASON STACK",
        "subtitle": "" if compact else f"{style['name']} • {style['week_label']}",
        "lines": lines[:4] if compact else lines[:6],
    }


def determine_banner(primary_story: dict, active_stack: list[dict], school_event: dict | None, planting_week: dict):
    text = primary_story["headline"]
    if primary_story["id"] == "frost":
        text = f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "harvest":
        highlight = normalize_text(planting_week.get("highlight"))
        text = highlight.upper() if highlight else f"{primary_story['headline']} • {primary_story['action']}"
    elif primary_story["id"] == "sap":
        text = f"{primary_story['headline']} • {primary_story['action']}"

    if school_event and primary_story["id"] != "school":
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
        "frost": "row covers, cold glitter on garden beds, warning pennants, and low-lying frost pockets",
        "ski": "chairlifts, groomed trails, skiers, pine ridges, and ski hill geometry",
        "sap": "sugar maples, sap buckets, tubing lines, sugar-house steam, and melting snow patches",
        "planting": "seed trays, cold frames, row markers, tools at the ready, and organized beds",
        "harvest": describe_harvest_motif(planting_week, now),
        "pollen": describe_pollen_motif({"dominant": pollen_context.get("dominant", [])}),
        "school": "a town bulletin board or calendar notice tucked into the civic landscape",
        "heat": "sun glyphs, deep shadows, wilt warning energy, and water vessels at hand",
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


def build_dashboard_state(parsed: dict, planting: dict, pollen: dict, school: dict, now: dt.date | None = None):
    now = now or current_et_date()
    week_key = monday_key(now)
    planting_week = planting.get(week_key, {})
    pollen_week = pollen.get(week_key, {})
    school_event = find_school_event(school, now)
    backdrop = compute_backdrop(parsed, now)
    active_stack, pollen_info = build_regimes(parsed, planting_week, pollen_week, school_event, now)
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
    board = build_board(primary_story, active_stack, planting_week, pollen_info, school_event, style)
    action_line = primary_story["action"]
    banner_text = determine_banner(primary_story, active_stack, school_event, planting_week)

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
    active_ids = ", ".join(item["id"].upper() for item in state["active_stack"][:5])
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
    pollen_active = any(item["id"] == "pollen" for item in state["active_stack"])
    if pollen_active:
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
    prompt = f"""Black and white 1-bit illustration for TRMNL e-ink display. Wide 16:9 landscape format at 800x480. Use ONLY pure black and pure white with no gray tones. All shading must be hatching, cross-hatching, stipple, or solid fills that survive thresholding.

SCENE: {scene_text}{pollen_truth_block}

PRIMARY STORY: The display is a Cornwall Seasonal State Engine. Multiple regimes overlap at once. Active stack right now: {active_ids}. The top story is '{state['primary_story']['headline']}' and the action line is '{state['action_line']}'.

LEFT SIDE - a single simple town signpost with EXACTLY four stacked weather sign panels and no extras, with oversized date and weather numerals that can be read instantly on a low-resolution e-ink screen. Do not duplicate any weather line or repeat wind text:
- '{parsed.get('date', '')}'
- '{temp}°F {conditions}'
- 'HIGH {high}°F / LOW {low}°F'
- '{wind.upper()}'{extra_left_text}

TOP RIGHT - if space is tight, simplify or omit these three framed icons before shrinking main text; when shown, keep them bold enough for 800x480:
- Sunrise '{normalize_text(sun_moon.get('sunrise'), '6:00 AM')}'
- Moon '{normalize_text(sun_moon.get('moon_phase'), 'moon phase')}'
- Sunset '{normalize_text(sun_moon.get('sunset'), '7:00 PM')}'

RIGHT SIDE - {style['board_material']} titled '{board['title']}' showing; make the SEASON STACK panel text larger, fewer, and bolder than a normal poster, with short labels and generous spacing. Drop the subtitle entirely if it hurts legibility:
{board_lines}

BOTTOM CENTER - dominant banner ribbon with '{state['banner_text']}'

BOTTOM LEFT CORNER - small framed update stamp 'Updated {parsed.get('timestamp', '')}'

STYLE OF THE WEEK: {style['name']}. {style['prompt']}

LAYOUT RULES:
- Keep text crisp, high-contrast, and actually readable after 1-bit conversion.
- Favor fewer words at larger sizes over more words at tiny sizes.
- Make the date, current temperature, headline, and action line the largest text blocks on the page.
- If the layout gets crowded, drop nonessential subtitle or metadata text before shrinking primary data.
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
    args = parser.parse_args()

    parsed = load_json(Path(args.input))
    planting = load_json(Path(args.planting))
    pollen = load_json(Path(args.pollen))
    school = load_json(Path(args.school))
    state = build_dashboard_state(parsed, planting, pollen, school)
    prompt = render_prompt(parsed, state)

    output_path = Path(args.output)
    output_path.write_text(prompt)
    print(output_path)


if __name__ == "__main__":
    main()
