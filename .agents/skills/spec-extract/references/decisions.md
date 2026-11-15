# Decisions Distillation & Format Reference

Code diffs show *what* landed; the session transcript holds *why* — alternatives weighed and dropped, user steering, risks accepted, subtle bugs caught in flight, and questions answered. `spec-extract` distills that reasoning into `docs/verify/decisions.json` and `docs/verify/decisions.md`.

Compact beats complete: a human reviewer or verifier agent should read `decisions.md` cold in **under one minute**.

## 1. Classification Matrix (`type` & `outcome`)

Scan the conversation from start to finish. A decision is something a reviewer could reasonably ask *"why is it done this way?"* about, where the conversation holds the answer.

| What happened in the session | `type` | `outcome` |
|---|---|---|
| Picked one approach over another | `choice` | `decided` |
| Kept behavior that looks odd/wrong on purpose | `possible_bug` or `choice` | `intended` |
| Saw a limitation or risk and shipped anyway | `risk` | `accepted_risk` |
| Caught a non-obvious bug during the session and fixed it | `possible_bug` | `fixed` |
| Explicitly deferred scope to later work | `choice` or `risk` | `follow_up` |
| Raised a concern that investigation disproved | `possible_bug` or `risk` | `withdrawn` |
| Asked a question the user explicitly answered | `question` | `decided` |
| Raised a question nobody answered yet | `question` | `open` |

### What to Leave Out
- Anything the code/diff already states plainly (never write a changelog).
- Dead ends that left zero trace in the codebase and that no reviewer would suggest.
- Mechanical fixes (typos, formatting, lint tweaks, import sorting).
- Routine `fixed` bugs, *unless* a reviewer reading the fix would wonder why that code exists (e.g., an explicit resource teardown or ordering workaround) or the trap is easy to re-introduce. (Put general library/tooling quirks in `docs/verify/learnings.md` instead.)
- Secrets, tokens, personal data, or raw credential material.

Most substantial sessions yield **3–7** decisions. Merge decisions that turned on the same underlying reason.

## 2. Attribution (`author`)

Every decision and every thread comment carries explicit authorship:

- `{"role": "person"}` — Anything the user raised, asked, rejected, or decided. Never invent user endorsement from silence.
- `{"role": "coding_agent", "harness": "antigravity"}` — Calls the coding agent made that the user saw and let stand, or technical root causes the agent diagnosed and fixed.
- `{"role": "review_agent", "harness": "antigravity"}` — Findings raised by a verification or review pass.

**Rule**: A choice the user made is credited to `person` even when `coding_agent` proposed the options (put the agent's proposal in the thread as `coding_agent`). A choice `coding_agent` made without pushback is credited to `coding_agent`.

## 3. Writing Each Decision & Thread

- `id`: Stable sequential identifier (`D-1`, `D-2`, ...).
- `title`: One crisp line stating the call itself, readable cold (`"Specify system via black-box properties instead of architecture docs"`, not `"Updated docs"`). For `open` items, state the unanswered question.
- `summary`: 1–2 sentences stating what was decided.
- `resolution`: 1 sentence stating *why* it was settled this way.
- `anchor` (optional): Relevant repo file path(s) where the decision is visible.
- `comments`: Chronological array of turns (`{ "author": ..., "body": "..." }`) showing only turns that actually moved the decision (proposal -> pushback -> pivot -> resolution).
  - Write in first-person voice of that author.
  - **Never paste raw chat quotes**; reword the substance of what the user or agent argued at the level a reviewer cares about.
  - Simple uncontested calls need `[]` or 1 comment naming the rejected alternative. Back-and-forth decisions typically take 2–4 comments.

## 4. JSON Schema (`docs/verify/decisions.json`)

```json
{
  "updatedAt": "2026-11-15T15:35:00Z",
  "sourceTranscript": "conversation-id-or-path",
  "decisions": [
    {
      "id": "D-1",
      "title": "Short cold-readable call",
      "type": "choice",
      "outcome": "decided",
      "author": { "role": "person" },
      "anchor": "docs/SPEC.md",
      "summary": "What was decided in 1-2 sentences.",
      "resolution": "Why it was settled this way.",
      "comments": [
        {
          "author": { "role": "coding_agent", "harness": "antigravity" },
          "body": "Initial proposal or technical finding."
        },
        {
          "author": { "role": "person" },
          "body": "Why that direction was changed or chosen."
        }
      ]
    }
  ]
}
```
