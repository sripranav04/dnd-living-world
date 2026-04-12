"""
opening_scene.py — Generates the opening narrative for a session.

New session:    Haiku invents a completely fresh campaign scenario.
Returning:      Haiku reads prior history and generates a "previously on..." recap.
"""

import json
import re

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

# ── New session prompt ────────────────────────────────────
# Haiku invents everything — location, enemies, stakes, tone.
# No hardcoded "Vault of Shadows".

NEW_SESSION_PROMPT = """You are a Dungeon Master starting a brand new D&D 5e campaign session.
Invent a completely original scenario. Return ONLY a valid JSON object — no preamble, no markdown.

JSON structure:
{
  "narrative": "4-6 sentences. Vivid, present-tense, second-person. Set the scene dramatically. Describe where the party is, what they see, what danger looms. End with an implicit call to action.",
  "ui_instructions": [
    {"type": "update_theme", "theme": "<one of: dark-gothic | bright-forest | warm-tavern>"},
    {"type": "update_world", "world": {
      "locationName": "<creative location name>",
      "biome": "<biome description>",
      "description": "<2 sentence atmospheric description>",
      "conditions": ["<condition1>", "<condition2>"],
      "inCombat": <true or false>,
      "round": <1 if in combat, else null>
    }},
    {"type": "update_stats", "party": [
      {"id": "aldric", "hp": <number 1-54>},
      {"id": "lyra",   "hp": <number 1-35>},
      {"id": "thane",  "hp": <number 1-45>},
      {"id": "vex",    "hp": <number 1-36>}
    ]},
    {"type": "combat_log_entry", "text": "<opening situation log>", "log_type": "system"}
  ]
}

PARTY (fixed, always these 4):
- Aldric Stonehaven: Fighter LV5, max HP 54, AC 18
- Lyra Moonwhisper: Wizard LV5, max HP 35, AC 13
- Brother Thane: Cleric LV5, max HP 45, AC 16
- Vex Shadowstep: Rogue LV5, max HP 36, AC 15

SCENARIO RULES:
- Pick ONE of these scenario seeds at random and build on it creatively:
  1. Mid-combat in a dungeon — party is fighting, tension is high
  2. Arriving at a mysterious location — exploration, something feels wrong
  3. In a tavern — rumour of danger, a stranger approaches
  4. Ambushed on a road — surprise attack, enemies surround them
  5. Standing at the entrance to an ancient ruin — about to go in
- Set HP realistically for the scenario (full HP for fresh start, damaged for mid-combat)
- inCombat: true only for scenarios 1 and 4
- Theme must match location (dungeon=dark-gothic, forest/outdoor=bright-forest, tavern/town=warm-tavern)
- Make the scenario feel unique — different villain, different stakes, different world each time

CRITICAL: Return ONLY the JSON. No text before or after."""


# ── Returning session prompt ──────────────────────────────
# Haiku gets the last N turns and generates a recap + continuation.

RETURNING_SESSION_PROMPT = """You are a Dungeon Master resuming a D&D 5e campaign session.
The party has returned. Generate a "previously on..." recap and set the current scene.
Return ONLY a valid JSON object — no preamble, no markdown.

JSON structure:
{
  "narrative": "Start with 'Welcome back, adventurers.' Then 1-2 sentences recapping what happened before. Then 2-3 sentences describing where the party is NOW and what they face. Present tense, second person, cinematic.",
  "ui_instructions": [
    {"type": "update_world", "world": {
      "locationName": "<location from history or continuation>",
      "biome": "<biome>",
      "description": "<atmospheric description>",
      "conditions": ["<condition>"],
      "inCombat": false,
      "round": null
    }},
    {"type": "combat_log_entry", "text": "— session resumed —", "log_type": "system"}
  ]
}

PREVIOUS SESSION HISTORY:
{history}

RULES:
- Reference specific events from the history (named enemies, locations, choices made)
- The party picks up where they left off — same location unless history shows movement
- Don't change HP from what the history shows unless it's been a long rest
- Keep tone consistent with the history's setting
- If history shows combat was ongoing, resume in combat (inCombat: true)

CRITICAL: Return ONLY the JSON. No text before or after."""


# ── Fallback ──────────────────────────────────────────────

FALLBACK_NEW = {
    "narrative": "The torchlight flickers as your party descends into the ancient vault. Stone dust falls from the ceiling with each distant rumble. Somewhere in the darkness ahead, something stirs — the sound of scraping bone and a cold, unnatural wind. Your weapons are drawn. What do you do?",
    "ui_instructions": [
        {"type": "update_theme", "theme": "dark-gothic"},
        {"type": "update_world", "world": {
            "locationName": "The Forgotten Vault",
            "biome": "Gothic Horror · Underground",
            "description": "An ancient vault carved from black stone. The air smells of old death.",
            "conditions": ["Darkness", "Difficult Terrain"],
            "inCombat": False,
            "round": None,
        }},
        {"type": "update_stats", "party": [
            {"id": "aldric", "hp": 54},
            {"id": "lyra",   "hp": 35},
            {"id": "thane",  "hp": 45},
            {"id": "vex",    "hp": 36},
        ]},
        {"type": "combat_log_entry", "text": "— new session begins —", "log_type": "system"},
    ],
}

FALLBACK_RETURNING = {
    "narrative": "Welcome back, adventurers. The road has been long and the dangers many. You stand now where you left off, blades ready and resolve unbroken. The world has not grown safer in your absence. What is your next move?",
    "ui_instructions": [
        {"type": "combat_log_entry", "text": "— session resumed —", "log_type": "system"},
    ],
}


# ── Core function ─────────────────────────────────────────

def _parse_response(raw: str, fallback: dict) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"```\s*$",     "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return fallback


def generate_new_session() -> dict:
    """Generate a completely fresh campaign scenario."""
    try:
        llm = get_llm()
        response = llm.invoke([
            SystemMessage(content=NEW_SESSION_PROMPT),
            HumanMessage(content="Generate a fresh campaign opening."),
        ])
        result = _parse_response(response.content, FALLBACK_NEW)
        print(f"[opening_scene] new session generated: {result.get('ui_instructions', [{}])[1].get('world', {}).get('locationName', '?') if len(result.get('ui_instructions', [])) > 1 else '?'}")
        return result
    except Exception as e:
        print(f"[opening_scene] new session error: {e}")
        return FALLBACK_NEW


def generate_returning_session(history: list[str]) -> dict:
    """Generate a 'previously on...' recap using prior session history."""
    try:
        history_text = "\n".join(history) if history else "No prior history found."
        prompt = RETURNING_SESSION_PROMPT.replace("{history}", history_text)

        llm = get_llm()
        response = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Resume the session with a recap."),
        ])
        result = _parse_response(response.content, FALLBACK_RETURNING)
        print("[opening_scene] returning session recap generated")
        return result
    except Exception as e:
        print(f"[opening_scene] returning session error: {e}")
        return FALLBACK_RETURNING


def generate_opening(session_id: str = "player_one") -> dict:
    """
    Main entry point. Detects new vs returning session and
    calls the appropriate generator.
    """
    from memory.session import is_new_session, get_session_history

    if is_new_session(session_id):
        print(f"[opening_scene] NEW session detected: {session_id}")
        return generate_new_session()
    else:
        print(f"[opening_scene] RETURNING session detected: {session_id}")
        history = get_session_history(session_id, last_n=8)
        return generate_returning_session(history)