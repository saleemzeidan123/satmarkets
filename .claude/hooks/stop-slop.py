#!/usr/bin/env python3
"""stop-slop PreToolUse hook: inject prose-quality rules before file writes.
Part of the satmarkets team config. Full rules: .claude/skills/stop-slop/SKILL.md"""
import sys, json
try:
    data = json.load(sys.stdin)
except Exception:
    data = {}
tool = data.get("tool_name", "")
if tool in ("Write", "Edit", "MultiEdit"):
    msg = ("stop-slop is active in this repo. Before writing any user-facing copy, apply "
           ".claude/skills/stop-slop/SKILL.md. Hard rules: no em dashes, no Wh- sentence "
           "starters, no throat-clearing openers, no \"not X, but Y\" binary contrasts, "
           "no negative listing, active voice, varied rhythm. Score Directness, Rhythm, "
           "Trust, Authenticity and Density; revise anything that reads like AI.")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": msg}}))
else:
    print("{}")
