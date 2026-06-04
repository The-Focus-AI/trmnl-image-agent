import datetime as dt
import unittest

from trmnl_prompt_builder import build_dashboard_state, compute_style_of_week, build_scene_description, render_prompt, build_board


class StyleRotationTests(unittest.TestCase):
    def test_weekly_style_rotation_changes_across_weeks(self):
        early = compute_style_of_week(dt.date(2026, 4, 27), "spring_transition", "planting")
        later = compute_style_of_week(dt.date(2026, 5, 4), "spring_transition", "planting")
        self.assertNotEqual(early["style_id"], later["style_id"])

    def test_urgent_story_prefers_high_readability_notes(self):
        style = compute_style_of_week(dt.date(2026, 5, 4), "spring_transition", "frost")
        self.assertTrue(style["alert_readability_bias"])


class DashboardStateTests(unittest.TestCase):
    def test_sap_and_frost_overlap_choose_frost_headline(self):
        parsed = {
            "date": "SUN 22 MAR",
            "timestamp": "6:20 AM",
            "weather": {"temperature": 30, "conditions": "CLEAR", "wind": "Calm", "wind_chill": None, "high": 45, "low": 28},
            "alerts": {"weather_alert": None, "mountain_alert": None},
            "mohawk": {"status": "closed", "trails_open": 0, "trails_total": 27, "lifts_open": 0, "base_depth": 0, "surface": None, "fresh_snow": None},
            "maple": {"sap_flowing": True, "quality": "ideal", "high": 45, "low": 28},
            "sun_moon": {"sunrise": "6:55 AM", "sunset": "7:10 PM", "moon_phase": "waxing crescent"},
            "banner": {"type": "normal", "text": None},
            "season_indicators": {"frost_risk": "hard_freeze", "growing_conditions": "cool"},
        }
        planting = {
            "03-16": {
                "direct_sow": ["peas", "spinach"],
                "indoor_starts": ["tomatoes"],
                "transplant": [],
                "harvest": [],
                "tasks": ["prep beds"],
                "highlight": "Peas and spinach window opens"
            }
        }
        pollen = {
            "03-16": {
                "tree": "low",
                "grass": "none",
                "weed": "none",
                "dominant": ["maple"],
                "summary": "early tree pollen"
            }
        }
        school = {"events": []}
        town = {"events": [], "recurring": []}

        state = build_dashboard_state(parsed, planting, pollen, school, town, now=dt.date(2026, 3, 22))

        self.assertEqual(state["primary_story"]["id"], "frost")
        self.assertIn("sap", [item["id"] for item in state["active_stack"]])
        self.assertEqual(state["board"]["title"], "TODAY")
        self.assertIn("COVER", state["action_line"])

    def test_pollen_scene_uses_species_not_generic_blossoms(self):
        parsed = {
            "date": "THU 30 APR",
            "timestamp": "5:03 PM",
            "weather": {"temperature": 54, "conditions": "OVERCAST", "wind": "W 5 mph", "wind_chill": 53, "high": 55, "low": 36},
            "alerts": {"weather_alert": None, "mountain_alert": None},
            "mohawk": {"status": "closed_season", "trails_open": 0, "trails_total": 27, "lifts_open": 0, "base_depth": 0, "surface": "N/A", "fresh_snow": None},
            "maple": {"sap_flowing": False, "quality": "poor", "high": 55, "low": 36},
            "sun_moon": {"sunrise": "4:59 AM", "sunset": "6:46 PM", "moon_phase": "waxing crescent"},
            "banner": {"type": "normal", "text": None},
            "season_indicators": {"frost_risk": "light_frost", "growing_conditions": "good"},
        }
        planting = {
            "04-27": {
                "direct_sow": ["beans"],
                "indoor_starts": [],
                "transplant": [],
                "harvest": ["spinach", "radishes", "lettuce"],
                "tasks": ["watch lows"],
                "highlight": "Cool-season greens ready"
            }
        }
        pollen = {
            "04-27": {
                "tree": "very_high",
                "grass": "none",
                "weed": "none",
                "dominant": ["oak", "birch", "pine"],
                "summary": "PEAK TREE POLLEN - oak dominant"
            }
        }
        school = {"events": []}

        state = build_dashboard_state(parsed, planting, pollen, school, {"events": [], "recurring": []}, now=dt.date(2026, 4, 30))
        scene = build_scene_description(state["backdrop"], state["active_stack"], state["style"], state["pollen"], state["planting_week"], dt.date(2026, 4, 30))
        prompt = render_prompt(parsed, state)
        board = build_board(state["primary_story"], state["active_stack"], state["planting_week"], state["pollen"], state["school_event"], state["style"])

        self.assertIn("OAK, BIRCH, PINE", scene)
        self.assertIn("oak should read as a real local Connecticut oak", scene)
        self.assertIn("birch should read as a real birch", scene)
        self.assertIn("small triangular serrated leaves just beginning to emerge", scene)
        self.assertIn("pine should read as an eastern white pine branch", scene)
        self.assertIn("soft needles in clear fascicles", scene)
        self.assertIn("do not label species with text inside the artwork", scene)
        self.assertIn("prioritize identifiable bark, branching structure, leaf shape, and catkin form", scene)
        self.assertIn("field-guide-style botanical inset or reference strip", scene)
        self.assertIn("Use that inset as the truth source for the larger landscape trees", scene)
        self.assertIn("small spring harvest cues", scene)
        self.assertIn("BOTANICAL TRUTH MODE", prompt)
        self.assertIn("botanical pollen bulletin board for Cornwall rather than a scenic poster", prompt)
        self.assertIn("the dominant visual should be three large specimen studies", prompt)
        self.assertIn("Dedicate well over half of the visual attention to specimen studies", prompt)
        self.assertIn("Avoid generic deciduous tree symbols, decorative blossom motifs, and anonymous conifer silhouettes", prompt)
        self.assertIn("Pine study: an eastern white pine branch with soft needles in visible fascicles", prompt)
        self.assertIn("Birch study: white papery bark with dark lenticels/patches, fine twigs, small triangular serrated leaves just emerging", prompt)
        self.assertIn("The words OAK, BIRCH, and PINE must not appear anywhere in the artwork", prompt)
        self.assertIn("Do not put species names under the specimen studies", prompt)
        self.assertIn("oversized date and weather numerals", prompt)
        self.assertIn("No fifth box, no repeated wind box, no tiny sublabels", prompt)
        self.assertIn("treat this as a bold summary board with EXACTLY these 2 lines in this order", prompt)
        self.assertIn("No stack jargon", prompt)
        self.assertIn("do not repeat the exact same pollen message", prompt)
        self.assertIn("If the layout gets crowded, delete nonessential metadata before shrinking primary data", prompt)
        self.assertIn("Avoid small machinery, extra landscape details, dense background scenery", prompt)
        self.assertIn("EXACTLY four stacked weather sign panels", prompt)
        self.assertIn("5:3 landscape format at 800x480", prompt)
        self.assertIn("Render at exactly 800x480 pixels natively", prompt)
        self.assertNotIn("16:9 landscape format", prompt)
        self.assertNotIn("pollen up", prompt.lower())
        self.assertNotIn("WAXING CRESCENT MOON", prompt)
        self.assertEqual(board["title"], "TODAY")
        self.assertEqual(board["subtitle"], "")
        self.assertLessEqual(len(board["lines"]), 4)
        self.assertEqual(board["lines"][0], "TREE POLLEN VERY HIGH")
        # The compact mode shows secondary lines: growing/harvest info first
        self.assertIn("HARVEST: SPINACH, RADISHES", board["lines"][1])
        self.assertEqual(state["banner_text"], "LIMIT TREE POLLEN EXPOSURE")

    def test_pollen_secondary_still_forces_botanical_detail(self):
        """Pollen secondary still adds botanical detail to scene, but not the full-screen truth mode takeover."""
        parsed = {
            "date": "THU 30 APR",
            "timestamp": "6:01 PM",
            "weather": {"temperature": 52, "conditions": "LIGHT RAIN", "wind": "Variable 3 mph", "wind_chill": None, "high": 52, "low": 36},
            "alerts": {"weather_alert": None, "mountain_alert": None},
            "mohawk": {"status": "closed_season", "trails_open": 0, "trails_total": 27, "lifts_open": 0, "base_depth": 0, "surface": "N/A", "fresh_snow": None},
            "maple": {"sap_flowing": False, "quality": "poor", "high": 52, "low": 36},
            "sun_moon": {"sunrise": "4:59 AM", "sunset": "6:46 PM", "moon_phase": "waxing crescent"},
            "banner": {"type": "normal", "text": None},
            "season_indicators": {"frost_risk": "light_frost", "growing_conditions": "good"},
        }
        planting = {
            "04-27": {
                "direct_sow": ["beans"],
                "indoor_starts": [],
                "transplant": [],
                "harvest": ["spinach", "radishes", "lettuce"],
                "tasks": ["watch lows"],
                "highlight": "Cool-season greens ready"
            }
        }
        pollen = {
            "04-27": {
                "tree": "very_high",
                "grass": "none",
                "weed": "none",
                "dominant": ["oak", "birch", "pine"],
                "summary": "PEAK TREE POLLEN - oak dominant"
            }
        }
        school = {"events": []}

        state = build_dashboard_state(parsed, planting, pollen, school, {"events": [], "recurring": []}, now=dt.date(2026, 4, 30))
        self.assertEqual(state["primary_story"]["id"], "frost")
        self.assertIn("pollen", [item["id"] for item in state["active_stack"]])
        prompt = render_prompt(parsed, state)
        self.assertNotIn("BOTANICAL TRUTH MODE", prompt)
        self.assertNotIn("botanical pollen bulletin board for Cornwall rather than a scenic poster", prompt)
        # But botanical detail is still in the scene description
        self.assertIn("botanically accurate pollen-season cues", prompt)
        self.assertIn("oak should read as a real local Connecticut oak", prompt)

    def test_full_moon_phase_is_optional_but_allowed(self):
        parsed = {
            "date": "THU 30 APR",
            "timestamp": "6:01 PM",
            "weather": {"temperature": 52, "conditions": "CLEAR", "wind": "Variable 3 mph", "wind_chill": None, "high": 52, "low": 36},
            "alerts": {"weather_alert": None, "mountain_alert": None},
            "mohawk": {"status": "closed_season", "trails_open": 0, "trails_total": 27, "lifts_open": 0, "base_depth": 0, "surface": "N/A", "fresh_snow": None},
            "maple": {"sap_flowing": False, "quality": "poor", "high": 52, "low": 36},
            "sun_moon": {"sunrise": "4:59 AM", "sunset": "6:46 PM", "moon_phase": "full moon"},
            "banner": {"type": "normal", "text": None},
            "season_indicators": {"frost_risk": "none", "growing_conditions": "good"},
        }
        planting = {"04-27": {"direct_sow": [], "indoor_starts": [], "transplant": [], "harvest": [], "tasks": [], "highlight": ""}}
        pollen = {"04-27": {"tree": "moderate", "grass": "none", "weed": "none", "dominant": ["oak"], "summary": "tree pollen present"}}
        school = {"events": []}

        state = build_dashboard_state(parsed, planting, pollen, school, {"events": [], "recurring": []}, now=dt.date(2026, 4, 30))
        prompt = render_prompt(parsed, state)
        self.assertIn("FULL MOON", prompt)

    def test_harvest_story_surfaces_in_fall(self):
        parsed = {
            "date": "SAT 03 OCT",
            "timestamp": "4:00 PM",
            "weather": {"temperature": 63, "conditions": "PARTLY CLOUDY", "wind": "NW 5 mph", "wind_chill": None, "high": 67, "low": 39},
            "alerts": {"weather_alert": None, "mountain_alert": None},
            "mohawk": {"status": "closed_season", "trails_open": 0, "trails_total": 27, "lifts_open": 0, "base_depth": 0, "surface": None, "fresh_snow": None},
            "maple": {"sap_flowing": False, "quality": "poor", "high": 67, "low": 39},
            "sun_moon": {"sunrise": "6:50 AM", "sunset": "6:28 PM", "moon_phase": "waning gibbous"},
            "banner": {"type": "normal", "text": None},
            "season_indicators": {"frost_risk": "none", "growing_conditions": "good"},
        }
        planting = {
            "09-28": {
                "direct_sow": ["spinach"],
                "indoor_starts": [],
                "transplant": [],
                "harvest": ["tomatoes", "basil", "winter squash"],
                "tasks": ["cover tender crops"],
                "highlight": "Pick basil before the first frost"
            }
        }
        pollen = {
            "09-28": {
                "tree": "none",
                "grass": "low",
                "weed": "moderate",
                "dominant": ["ragweed"],
                "summary": "ragweed tapering but present"
            }
        }
        school = {"events": [{"date": "2026-10-05", "type": "early_dismissal", "description": "Regional PD"}]}

        state = build_dashboard_state(parsed, planting, pollen, school, {"events": [], "recurring": []}, now=dt.date(2026, 10, 3))

        self.assertEqual(state["primary_story"]["id"], "harvest")
        self.assertIn("school", [item["id"] for item in state["active_stack"]])
        self.assertEqual(state["style"]["season_family"], "autumn")


if __name__ == "__main__":
    unittest.main()
