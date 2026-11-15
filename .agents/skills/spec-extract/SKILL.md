---
name: spec-extract
description: "Extract and maintain local Intent, Acceptance Criteria, Decisions, Callouts, and Engineering Learnings from code changes and conversation transcripts (without Aviator CLI or external services). Use for 'extract spec', 'write acceptance criteria', 'record decisions', 'distill this session', or refreshing local verification artifacts under docs/verify/ as code evolves."
---

# Extract Intent, Acceptance Criteria, and Decisions Locally

Distills **what** a change accomplishes and **why** it looks the way it does into versioned local files under `docs/verify/`, ready for human review or automated verification via `verify-deploy`.

It splits ground truth across two sources and never invents claims from imagination:

- **Code / Diff = Ground truth for *what* happens**
- **Conversation Transcript = Ground truth for *why* it happens**

Per unit of work, this skill writes and maintains:

- `docs/verify/spec.md` — **Intent**, **Acceptance Criteria (`AC-1..N`)**, **Scenario Guidance**, and **Open Callouts**, with an integer `version` counter.
- `docs/verify/decisions.md` & `docs/verify/decisions.json` — **Distilled Decisions (`D-1..N`)** with `type`, `outcome`, `author` credit, `summary`, `resolution`, and chronological 1st-person thread comments.
- `docs/verify/learnings.md` — **Operational & Technical Field Notes** (API quirks, runtime traps, environment recipes) kept separate so `decisions.md` stays readable in under a minute without losing hard-won engineering context.

If `.verify/guidance.md` exists at the repository root, read and apply its team-specific rules alongside the steps below (pointing out any conflict to the user).

---

## Step 1: Read Both Ground-Truth Inputs

Before drafting anything, inspect:

1. **The Code & Working Tree**:
   - If inside a Git repository with commits: identify the working branch(es) and read `git status` and the diff (`git diff` / `git diff <base>..HEAD`). For stacked branches (`git merge-base --is-ancestor A B`), diff each branch **against its immediate parent** so each unit only claims its own contribution.
   - If the repository has no commits yet or is uninitialized: inspect the project tree, configuration, tests, and implementation files directly, and note uncommitted/uninitialized Git state in `Open Callouts` if Git features (such as worktrees or branches) are referenced in code.
2. **The Conversation Transcript**:
   - Read the active conversation history.
   - When earlier turns were compacted or summarized, read the full transcript file on disk if available (e.g., `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`, reading specific lines in `transcript_full.jsonl` when `truncated_fields` is present) as well as any application-level durable transcripts relevant to the session.
3. **Existing Local Records**:
   - If `docs/verify/spec.md`, `docs/verify/decisions.json`, or `docs/verify/learnings.md` already exist, read them first so refreshes update `version` cleanly and evolve existing decisions instead of duplicating them.

---

## Step 2: Distill Decisions & Engineering Learnings

Read [references/decisions.md](references/decisions.md) and apply its distillation, attribution, and thread rules to the transcript:

- Extract **Decisions (`D-1..N`)**: only choices, intentional oddities, accepted risks, non-obvious fixed bugs, deferred follow-ups, withdrawn concerns, or answered/open questions where a reviewer could reasonably ask *"why?"* and the session answered.
- Separate **Engineering Learnings**: library gotchas, environment quirks, debugging root causes, and operational recipes that are valuable to future engineers/agents on the repo but are implementation mechanics rather than reviewer-level design calls. Record those in `docs/verify/learnings.md`.

---

## Step 3: Write Intent, Acceptance Criteria, Scenario Guidance, and Callouts

1. **Intent**:
   - 1–3 plain sentences, the way you would describe the change to a colleague filing a ticket.
   - Echo the user's own phrasing from prompts or conversation.
   - **No markdown formatting, no file paths, no internal class/function/table names.**
2. **Acceptance Criteria (`AC-1..N`)**:
   - Read [references/acceptance-criteria.md](references/acceptance-criteria.md) before writing or editing any criterion, and enforce every filter in it (including cross-filtering against Step 2's Decisions).
3. **Scenario Guidance**:
   - Concise operational hints a verifier needs to check the criteria at runtime without guessing (ports, CLI entrypoints, read-only database/log paths, isolated env vars for destructive drills, auth prerequisites).
4. **Callouts**:
   - Flag only what is genuinely open or contradictory:
     - Code that would currently fail a drafted criterion.
     - A plan or spec (such as `docs/SPEC.md`) that the code disagrees with when no settled decision explains the gap (**trust the code**).
     - Code that contradicts a settled decision, or an `open` question nobody answered.

---

## Step 4: Review with the User (Interactive Mode)

When running interactively for confirmation before writing (or when asked to preview first):

1. Show **Intent**, **Acceptance Criteria** (with the first-time primer: *"Acceptance Criteria are the code-anchored behaviors this change must satisfy — each one is verified independently."*), **Open Callouts**, and the **Decisions Preview** (one line each with title, type, outcome, credit, plus any user-credited comment in full).
2. Ask one direct question: *"Anything to add, remove, or tighten before I write these to `docs/verify/`?"*
3. When the user explicitly asks to write/persist immediately (or in non-interactive extraction runs), write the files directly and note whether confirmation was pre-authorized or skipped.

---

## Step 5: Persist Versioned Artifacts Under `docs/verify/`

Write clean, deterministic files:

1. `docs/verify/spec.md`:
   - YAML frontmatter with `version` (incremented integer starting at `1`), `updated_at` (ISO-8601), and `git_head` (`git rev-parse --short HEAD` or `"uncommitted"`).
   - Sections: `## Intent`, `## Acceptance Criteria` (`AC-1`, `AC-2`, ...), `## Scenario Guidance`, `## Open Callouts`.
2. `docs/verify/decisions.json` & `docs/verify/decisions.md`:
   - Machine-readable JSON array + human-scannable Markdown summary following [references/decisions.md](references/decisions.md).
3. `docs/verify/learnings.md`:
   - Grouped, recipe-oriented technical learnings discovered in the session, with clickable file references and exact commands.

---

## Step 6: Refreshing Criteria as Code Evolves

Acceptance Criteria are a living contract. After meaningful code or scope changes:

1. Compare each `AC-*` in `docs/verify/spec.md` against the current code/diff.
2. Replace the criteria list atomically and increment `version` in `docs/verify/spec.md`.
3. If `docs/verify/verdicts.json` exists and a waived criterion's text changed, clear that waiver and tell the user — a reworded criterion must be re-verified.
