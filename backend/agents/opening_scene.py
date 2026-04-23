"""
opening_scene.py — Generates the opening narrative + visual scene for a session.
"""

import json
import re

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

NEW_SESSION_PROMPT = """You are a Dungeon Master starting a brand new D&D 5e campaign session.
Invent a completely original scenario. Return ONLY a valid JSON object — no preamble, no markdown.

JSON structure:
{
  "narrative": "4-6 sentences. Vivid, present-tense, second-person. Atmospheric and cinematic. Describe where the party is, what they sense (smell, sound, sight), what danger looms. End with a line that makes the player lean forward.",
  "ui_instructions": [
    {"type": "update_theme", "theme": "<dark-gothic | bright-forest | warm-tavern>"},
    {"type": "update_world", "world": {
      "locationName": "<creative location name>",
      "biome": "<biome type>",
      "description": "<2 sentence atmospheric description>",
      "conditions": ["<condition1>", "<condition2>"],
      "inCombat": false,
      "round": null
    }},
    {"type": "update_stats", "party": [
      {"id": "aldric", "hp": 54},
      {"id": "lyra",   "hp": 35},
      {"id": "thane",  "hp": 45},
      {"id": "vex",    "hp": 36}
    ]},
    {"type": "combat_log_entry", "text": "<one line setting the scene>", "log_type": "system"}
  ]
}

PARTY:
- Aldric Stonehaven: Fighter LV5, max HP 54, AC 18
- Lyra Moonwhisper: Wizard LV5, max HP 35, AC 13
- Brother Thane: Cleric LV5, max HP 45, AC 16
- Vex Shadowstep: Rogue LV5, max HP 36, AC 15

SCENARIO SEEDS — pick one randomly and build creatively:
1. Standing at the entrance to an ancient ruin — torches flicker, something watches from inside
2. Arriving at a fog-choked forest crossroads — a body hangs from the old oak, still warm
3. In a torch-lit tavern — a hooded stranger slides a sealed letter across the table
4. On a cliffside road at night — torches below reveal an enemy war camp blocking the pass
5. Inside a crumbling crypt — the floor is covered in ash, the ceiling breathes

RULES:
- Always start party at FULL HP
- inCombat: false for opening scene
- Theme must match location
- Make it feel like the first 10 seconds of a great fantasy film

CRITICAL: Return ONLY the JSON. No text before or after."""


RETURNING_SESSION_PROMPT = """You are a Dungeon Master resuming a D&D 5e campaign.
Return ONLY a valid JSON object — no preamble, no markdown.

{
  "narrative": "Start with 'Welcome back, adventurers.' Then 1-2 sentences recapping the last session. Then 2-3 sentences describing where the party is NOW. Present tense, second person, cinematic.",
  "ui_instructions": [
    {"type": "update_theme", "theme": "<dark-gothic | bright-forest | warm-tavern>"},
    {"type": "update_world", "world": {
      "locationName": "<from history>",
      "biome": "<biome>",
      "description": "<atmospheric>",
      "conditions": [],
      "inCombat": false,
      "round": null
    }},
    {"type": "combat_log_entry", "text": "— session resumed —", "log_type": "system"}
  ]
}

PREVIOUS SESSION:
{history}

CRITICAL: Return ONLY the JSON."""


FALLBACK_NEW = {
    "narrative": "Cold air presses down as your boots scrape over cracked flagstone. The vault ahead exhales a breath of old death — somewhere in the dark, something shifts. Your torches barely reach the walls. The silence has weight. You grip your weapons and step forward.",
    "ui_instructions": [
        {"type": "update_theme", "theme": "dark-gothic"},
        {"type": "update_world", "world": {
            "locationName": "The Forgotten Vault",
            "biome": "Underground Crypt",
            "description": "A collapsed necromancer's vault. The ceiling breathes.",
            "conditions": ["Darkness", "Difficult Terrain", "Unhallowed"],
            "inCombat": False,
            "round": None,
        }},
        {"type": "update_stats", "party": [
            {"id": "aldric", "hp": 54},
            {"id": "lyra",   "hp": 35},
            {"id": "thane",  "hp": 45},
            {"id": "vex",    "hp": 36},
        ]},
        {"type": "combat_log_entry", "text": "— the vault awaits —", "log_type": "system"},
    ],
}

FALLBACK_RETURNING = {
    "narrative": "Welcome back, adventurers. The road has not grown safer. You stand where you left off, the memory of your last battle still sharp. The world holds its breath. What is your move?",
    "ui_instructions": [
        {"type": "update_theme", "theme": "dark-gothic"},
        {"type": "combat_log_entry", "text": "— session resumed —", "log_type": "system"},
    ],
}


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


def _generate_opening_scene(result: dict) -> str:
    """
    Generate the opening visual scene via vibe architect.
    Returns the scene name so caller can append mount_component.
    """
    try:
        from agents.vibe_architect import generate_scene_component, validate_and_write_component

        instructions = result.get("ui_instructions", [])
        theme     = "dark-gothic"
        location  = "Unknown"
        in_combat = False

        for instr in instructions:
            if instr.get("type") == "update_theme":
                theme = instr.get("theme", theme)
            elif instr.get("type") == "update_world":
                w = instr.get("world", {})
                location  = w.get("locationName", location)
                in_combat = w.get("inCombat", False)

        theme_to_scene = {
            "dark-gothic":   "DungeonScene",
            "bright-forest": "ForestScene",
            "warm-tavern":   "TavernScene",
        }
        scene_name = theme_to_scene.get(theme, "DungeonScene")
        narrative  = result.get("narrative", "")

        world_state = {
            "theme":             theme,
            "locationName":      location,
            "inCombat":          in_combat,
            "current_encounter": {},
        }

        print(f"[opening_scene] generating visual: {scene_name} | theme={theme} | location={location}")

        code = generate_scene_component(
            scene_name=scene_name,
            world=world_state,
            acting_character="vex",
            party={
                "vex":    {"name": "Vex",    "hp": 36, "max_hp": 36},
                "aldric": {"name": "Aldric", "hp": 54, "max_hp": 54},
            },
            action_type="explore",
            dm_narrative=narrative[:200],
        )

        if code and validate_and_write_component(scene_name, code):
            print(f"[opening_scene] ✓ opening visual written: {scene_name}.tsx")
            return scene_name
        else:
            print(f"[opening_scene] visual generation failed — stub remains")
            return scene_name  # still return name so stub gets mounted

    except Exception as e:
        print(f"[opening_scene] visual generation error: {e}")
        return "DungeonScene"


def generate_new_session() -> dict:
    try:
        llm    = get_llm()
        resp   = llm.invoke([
            SystemMessage(content=NEW_SESSION_PROMPT),
            HumanMessage(content="Generate a fresh campaign opening."),
        ])
        result = _parse_response(resp.content, FALLBACK_NEW)

        instructions = result.get("ui_instructions", [])
        loc = next(
            (i.get("world", {}).get("locationName", "?")
             for i in instructions if i.get("type") == "update_world"),
            "?"
        )
        print(f"[opening_scene] new session: {loc}")

        scene_name = _generate_opening_scene(result)

        # Tell the frontend which scene to mount
        result["ui_instructions"].append({
            "type":          "mount_component",
            "slot":          "map-scene",
            "componentName": scene_name,
        })

        return result

    except Exception as e:
        print(f"[opening_scene] new session error: {e}")
        scene_name = _generate_opening_scene(FALLBACK_NEW)
        FALLBACK_NEW["ui_instructions"].append({
            "type":          "mount_component",
            "slot":          "map-scene",
            "componentName": scene_name,
        })
        return FALLBACK_NEW


def generate_returning_session(history: list[str]) -> dict:
    try:
        history_text = "\n".join(history) if history else "No prior history."
        prompt       = RETURNING_SESSION_PROMPT.replace("{history}", history_text)

        llm    = get_llm()
        resp   = llm.invoke([
            SystemMessage(content=prompt),
            HumanMessage(content="Resume the session."),
        ])
        result = _parse_response(resp.content, FALLBACK_RETURNING)
        print("[opening_scene] returning session recap generated")

        scene_name = _generate_opening_scene(result)
        result["ui_instructions"].append({
            "type":          "mount_component",
            "slot":          "map-scene",
            "componentName": scene_name,
        })

        return result

    except Exception as e:
        print(f"[opening_scene] returning session error: {e}")
        return FALLBACK_RETURNING

def generate_opening(session_id: str = "player_one") -> dict:
    """Always generates a fresh opening for the prototype."""
    print(f"[opening_scene] generating fresh opening for: {session_id}")
    return generate_new_session()

