# Cornwall CT Spring/Summer/Fall Dashboard

> **PURPOSE:** During the growing season (March-November), the dashboard shifts from ski conditions to planting calendar, weather, school events, and seasonal New England imagery.

---

## Seasonal Mode System

The display automatically selects a mode based on data availability and date:

| Priority | Condition | Mode |
|----------|-----------|------|
| 1 | Mohawk open + sap flowing | `blended` |
| 2 | Mohawk closed + sap flowing | `maple` |
| 3 | Mohawk open | `ski` |
| 4 | Mar 16 - May 15 | `spring` |
| 5 | May 16 - Sep 15 | `summer` |
| 6 | Sep 16 - Nov 30 | `fall` |
| 7 | Default | `ski` (winter) |

Data-driven modes (ski/maple/blended) always take priority over date-driven modes.

---

## Data Sources

| Data | Source | Script |
|------|--------|--------|
| Weather | NWS Cornwall CT | `bin/fetch-weather-raw` |
| Sun/Moon | Calculated | `bin/fetch-sun-moon` |
| Planting Calendar | Static JSON (Zone 6a) | `prompts/planting-calendar-zone6a.json` |
| School Calendar | Static JSON (Region 1) | `prompts/school-calendar.json` |
| Mohawk (winter only) | mohawkmtn.com | `bin/fetch-mohawk-raw` (skipped Apr-Nov) |

---

## Display Layout (Spring/Summer/Fall)

```
+--------------------------------------------------------------+
| SCENE: Seasonal landscape with sub-season imagery            |
|                                                              |
| +-------------+                        +------------------+  |
| | WED 25 MAR  |                        | Sunrise 6:48 AM  |  |
| | 52F CLOUDY   |                        | Moon waning cres.|  |
| | HI 55/LO 30 |                        | Sunset 7:12 PM   |  |
| | FROST        |                        +------------------+  |
| |   TONIGHT   |                                              |
| +-------------+                        +------------------+  |
|                                        | PLANT THIS WEEK  |  |
|                                        | SOW: peas, kale  |  |
|                                        | START: tomatoes   |  |
|                                        | TASK: test soil   |  |
|                                        +------------------+  |
|                                                              |
| +----------------------------------------------------------+ |
| | FROST TONIGHT 30F - EARLY DISMISSAL CONFERENCES          | |
| +----------------------------------------------------------+ |
| Updated 3:15 PM                                              |
+--------------------------------------------------------------+
```

### Key Differences from Ski Dashboard

- **Right info board**: "PLANT THIS WEEK" replaces "MOHAWK MTN" ski conditions
- **Frost warnings**: Replace cold advisories during growing season
- **School events**: Show upcoming school calendar items (within 3 days)
- **Scene imagery**: Seasonal New England gardens/farms replace ski scenes

---

## Planting Calendar

Static data in `prompts/planting-calendar-zone6a.json`, keyed by Monday date (MM-DD format). Covers March through October.

Each week entry includes:
- `direct_sow` - seeds to plant outdoors
- `indoor_starts` - seeds to start indoors
- `transplant` - seedlings to move outside
- `harvest` - what to pick
- `tasks` - garden tasks for the week
- `highlight` - one-line summary for banner

### Key Dates (Zone 6a, Cornwall CT)
- **Average last frost:** May 15
- **Average first frost:** October 1
- **Growing season:** ~140 days

---

## Scene Imagery by Sub-Season

### March (Early Spring)
Melting snow, crocuses, garden prep, cold frames, tool shed

### April (Mid Spring)
Planted rows, daffodils, cold frames with seedlings, budding trees

### May (Late Spring)
Transplanted seedlings with cages, flowering trees, lush hills

### June-July (Early Summer)
Tall tomato plants, bean poles, sunflowers, garden gate

### August (Late Summer)
Harvest baskets, corn stalks, farm stand, covered bridge

### September-October (Fall)
Foliage, pumpkins, apple orchard, harvest scenes

### November (Late Fall)
Mulched beds, bare trees, root vegetables, compost

---

## Banner Priority

1. **Frost warnings** (hard freeze > frost > light frost)
2. **School events** (no school, early dismissal, conferences)
3. **Weather alerts** (from NWS, carry over from winter system)
4. **Planting highlights** (from weekly calendar data)
5. **Seasonal decorative border** (wildflowers, vegetables, fall leaves)

---

## Style by Season

| Mode | Style Description |
|------|-------------------|
| `spring` | Vintage New England garden almanac style |
| `summer` | Vintage botanical illustration style |
| `fall` | Vintage harvest poster style |
| `ski` | Vintage ski poster style |
| `maple` | Vintage New England sugar house poster style |
