# Acceptance Criteria Rulebook

Acceptance Criteria (`AC-1..N`) are the observable checks that tell a reviewer or autonomous verifier that the change achieved its intent. Each criterion is verified independently and read by a human, so every item must earn its slot.

## 1. Start from the Intent

Write the Intent first. Acceptance Criteria turn that intent into falsifiable, observable outcomes:
1. Ask what an outside observer would check to prove the intent holds.
2. Cross-check against the code to confirm each claim actually holds and to catch core behaviors missing from the intent.
3. Carry over criteria the user explicitly stated in their own words when they pass the three gates below.

Scale with the scope of the work:
- Docs, skill, config, or single-path fix: **1–2** criteria.
- Typical feature: **2–4** criteria.
- Broad multi-subsystem build: **4–6** criteria.
- Never pad, and never apologize for a short list.

## 2. The Three-Gate Sieve (What Earns a Slot)

Keep a criterion **only** if all three hold:

1. **This change can break it.** If nothing in the code/diff could flip the check from pass to fail, drop it — however important the behavior is.
2. **A reviewer would call its absence a gap.** Routine fallbacks, error strings, retry counts, log lines, default values on optional flags, and "still works as before" checks on refactored code usually do not earn a slot unless handling that exact case *is* why the change exists.
3. **Nothing else on the list covers it.** Merge criteria that a single check settles, and drop corollaries that follow automatically from another criterion.

## 3. Cross-Filtering with Decisions

Session decisions shape and prune the criteria list:

- **Choices (`choice -> decided`)**: Gate the **observable outcome** the choice produces, *never* the internal library, data structure, or implementation option picked.
- **Deferred work (`follow_up`) and accepted risks (`accepted_risk`)**: Get **zero** criteria.
- **Deliberately preserved behavior (`intended`)**: Gets **at most one** criterion, and only if the change could plausibly break it.

## 4. How Each Criterion Reads

Write one plain sentence stating an **observable outcome** (e.g., `"The API returns 401 for a missing auth token"`), never an action item or a narration of implementation steps (not `"Added middleware"` or `"Migration is generated"`).

- **Surface vocabulary only**: Name the user/operator, the product surface (CLI, HTTP endpoint, UI, process signal, durable store guarantee), or the external outcome. Keep internal file paths, function names, class names, table names, and module layout out unless a symbol *is* the public contract (a CLI command/flag, an HTTP route/status code, an environment variable).
- **No incidental constants**: Omit pixel dimensions, colors, retry counts, or field-by-field schema dumps unless changing that exact value is the deliverable.
- **No taste words or CI gates**: Never write `"clean"`, `"intuitive"`, `"fast"`, `"modular"`, and never include `"TypeScript compiles"`, `"linter passes"`, or `"unit tests pass"`.
- **Observer-independent**: Two independent verifiers inspecting the deployed system must reach the same binary verdict.

## 5. Before Saving

Re-read the drafted list once, merge overlaps, strip internal jargon, and minimize. Emit only the surviving list.

## 6. What to Put in Open Callouts Instead

Never bend a criterion to hide a bug or spec mismatch. Flag in `Open Callouts`:
- Code that currently fails a criterion that the intent clearly requires.
- A specification or design doc in the repo that claims a stronger guarantee than the code implements, when no decision explains the difference (**trust the code**).
- Code that contradicts a settled decision, or an unresolved `open` decision.
