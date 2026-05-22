#!/usr/bin/env python3
"""Extract JSON from text that may contain extra content (markdown, noise).
Reads stdin, writes clean JSON to stdout.
If no valid JSON found, writes input back to stdout.
"""
import json
import re
import sys

text = sys.stdin.read()

# Try direct parse first
text_stripped = text.strip()
if text_stripped.startswith("```"):
    text_stripped = re.sub(r"^```(?:json)?\s*", "", text_stripped)
    text_stripped = re.sub(r"\s*```$", "", text_stripped)
    text_stripped = text_stripped.strip()

try:
    obj = json.loads(text_stripped)
    print(json.dumps(obj, indent=2))
    sys.exit(0)
except (json.JSONDecodeError, ValueError):
    pass

# Try to find JSON-like content between braces
match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL)
if match:
    try:
        obj = json.loads(match.group())
        print(json.dumps(obj, indent=2))
        sys.exit(0)
    except (json.JSONDecodeError, ValueError):
        pass

# Fall through - print original
print(text)
