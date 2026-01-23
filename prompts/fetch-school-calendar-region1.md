# Fetch School Calendar Data - Region 1

Fetch upcoming school schedule changes for Region 1 public schools (Cornwall, CT area).

## Schools Covered

- **Cornwall Consolidated School** (K-8) - https://www.cornwallconsolidatedschool.com/
- **Housatonic Valley Regional High School (HVRHS)** (9-12) - https://www.hvrhs.org/

Both schools follow the **Region One School District** calendar.

## Data Source

**Region 1 Calendar PDF:**
https://www.hvrhs.org/wp-content/uploads/2025/06/20252026-CALENDAR.pdf

**Google Calendar (for real-time updates):**
https://calendar.google.com/calendar/embed?src=c_b4d42a73f0b4deafe0e8340c940d36082faf9582555334fa2709d0ee89f48e62%40group.calendar.google.com&ctz=America%2FNew_York

---

## 2025-2026 School Year

- **First Day:** September 2, 2025 (Tuesday after Labor Day)
- **Last Day:** June 12, 2026 (early dismissal)

## Calendar Color Key

- **Blue** = Holiday / No School
- **Yellow** = Early Dismissal - Regional PD
- **Purple** = High School Conference Days (early dismissal)
- **Red** = Elementary Conference Days (early dismissal)
- **Green** = First/Last Day of School

---

## All Days Off & Schedule Changes (Chronological)

### September 2025
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Sep 1 | Mon | NO SCHOOL | Labor Day (blue) |
| Sep 17 | Wed | EARLY DISMISSAL | Regional PD (yellow) |

### October 2025
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Oct 2 | Thu | EARLY DISMISSAL | HS Conferences (purple) |
| Oct 13 | Mon | NO SCHOOL | October Break (blue) |
| Oct 15 | Wed | EARLY DISMISSAL | Regional PD (yellow) |
| Oct 22-23 | Wed-Thu | EARLY DISMISSAL | Elementary Conferences (red) |

### November 2025
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Nov 5 | Wed | EARLY DISMISSAL | Regional PD (yellow) |
| Nov 11 | Tue | NO SCHOOL | Veterans Day (blue) |
| Nov 26-28 | Wed-Fri | NO SCHOOL | Thanksgiving Recess (blue) |

### December 2025
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Dec 10 | Wed | EARLY DISMISSAL | Regional PD (yellow) |
| Dec 22-31 | Mon-Wed | NO SCHOOL | Holiday Recess (blue) |

### January 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Jan 1-2 | Thu-Fri | NO SCHOOL | Holiday Recess (blue) |
| Jan 19 | Mon | NO SCHOOL | MLK Day (blue) |
| Jan 21 | Wed | EARLY DISMISSAL | Regional PD (yellow) |

### February 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Feb 16-18 | Mon-Wed | NO SCHOOL | February Break (blue) |

### March 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Mar 11 | Wed | EARLY DISMISSAL | Regional PD (yellow) |
| Mar 24 | Tue | EARLY DISMISSAL | HS Conferences (purple) |
| Mar 25-26 | Wed-Thu | EARLY DISMISSAL | Elementary Conferences (red) |

### April 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Apr 3 | Fri | NO SCHOOL | Good Friday (blue) |
| Apr 13-17 | Mon-Fri | NO SCHOOL | Spring Recess (blue) |

### May 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| May 22 | Fri | NO SCHOOL | No School (blue) |
| May 25 | Mon | NO SCHOOL | Memorial Day (blue) |

### June 2026
| Date | Day | Type | Description |
|------|-----|------|-------------|
| Jun 11 | Thu | EARLY DISMISSAL | Regional PD (yellow) |
| Jun 12 | Fri | EARLY DISMISSAL | Last Day of School (green) |

---

## Long Weekends & Breaks Summary

| Dates | Duration | Reason |
|-------|----------|--------|
| Nov 26-30 | 5 days | Thanksgiving (Wed-Fri off + weekend) |
| Dec 22 - Jan 4 | 14 days | Winter Break |
| Jan 17-19 | 3 days | MLK Weekend |
| Feb 14-18 | 5 days | February Break (Sat-Sun + Mon-Wed no school) |
| Apr 3-5 | 3 days | Good Friday Weekend |
| Apr 11-19 | 9 days | Spring Break (Sat-Sun + Mon-Fri off + Sat-Sun) |
| May 22-25 | 4 days | Memorial Day (Fri no school + Sat-Sun + Mon) |

---

## Instructions

### Step 1: Get Current Date
```bash
date "+%Y-%m-%d"
```

### Step 2: Calculate Upcoming Events

Look at the reference data above and find all school events in the next 14 days.

For each event, determine:
- **Date** (YYYY-MM-DD format)
- **Day of week** (Mon, Tue, etc.)
- **Event type**: `no_school`, `early_dismissal`, `holiday`, `conference`, `break_start`, `break_end`
- **Affected schools**: `all`, `elementary`, `high_school`
- **Description**: Human-readable description

### Step 3: Check for Snow Day Cancellations

If there was recent severe weather, check the school websites for cancellation notices:

```bash
# Check HVRHS announcements
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.hvrhs.org/" --format=text 2>/dev/null | grep -i -E "(cancel|delay|close|snow|emergency)" | head -10

# Check Cornwall Consolidated
/Users/wschenk/.claude/plugins/cache/focus-marketplace/chrome-driver/0.1.0/bin/extract "https://www.cornwallconsolidatedschool.com/" --format=text 2>/dev/null | grep -i -E "(cancel|delay|close|snow|emergency)" | head -10
```

---

## Expected Output Format

```yaml
current_date: "2026-01-23"
school_year: "2025-2026"
district: "Region 1"

# What's happening RIGHT NOW (today)
today:
  is_school_day: true
  status: "normal"  # normal, early_dismissal, no_school, delay
  note: null

# Upcoming events in next 14 days
upcoming:
  - date: "2026-02-16"
    day: "Mon"
    type: "no_school"
    schools: "all"
    description: "February Break"

  - date: "2026-02-17"
    day: "Tue"
    type: "no_school"
    schools: "all"
    description: "February Break"

  - date: "2026-02-18"
    day: "Wed"
    type: "no_school"
    schools: "all"
    description: "February Break"

# Next school closure (for banner display)
next_closure:
  date: "2026-02-16"
  description: "FEBRUARY BREAK"
  days_away: 24

# Current break status (if applicable)
break_status:
  in_break: false
  break_name: null
  returns: null
```

---

## Banner Text Examples

| Scenario | Banner Text |
|----------|-------------|
| Holiday tomorrow | `NO SCHOOL TOMORROW - MLK DAY` |
| Holiday in 2-3 days | `NO SCHOOL MON - MLK DAY` |
| Early dismissal tomorrow | `EARLY DISMISSAL TOMORROW - CONFERENCES` |
| Break starting soon | `FEBRUARY BREAK STARTS MON` |
| Currently on break | `SCHOOL RESUMES THU FEB 19` |
| Snow day today | `SNOW DAY - NO SCHOOL TODAY` |
| 2-hour delay today | `2-HOUR DELAY TODAY` |

---

## Notes

- Early dismissal times vary by school - check individual school websites for exact times
- Snow days may affect the February Break (5+ snow days by Feb 1 = reduced break)
- June 19 (Juneteenth) only observed if school extends due to snow days
- Conference days = early dismissal for students
- HS Conferences (purple) are HVRHS only
- Elementary Conferences (red) are Cornwall Consolidated only
