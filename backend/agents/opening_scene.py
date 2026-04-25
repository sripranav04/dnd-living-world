"""
opening_scene.py — Generates the opening narrative + visual scene for a session.
"""

import json
import re

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

NEW_SESSION_PROMPT = """You are a Dungeon Master starting a new D&D 5e campaign session.
Return ONLY a valid JSON object. No preamble, no markdown.

AVAILABLE MONSTERS — pick the one that best fits your scenario:
- "Shadow Wraith"   (HP 45, AC 13) — undead, dungeons, crypts, gothic horror
- "Skeleton Archer" (HP 13, AC 13) — undead, ruins, ancient tombs
- "Goblin"          (HP 7,  AC 15) — forests, ambushes, wilderness, caves
- "Zombie"          (HP 22, AC 8)  — graveyards, plague towns, dark swamps

JSON structure:
{
  "narrative": "4-6 sentences. Vivid, cinematic, present-tense, second-person. Set the scene, describe what the party senses, end with an implicit threat or hook.",
  "ui_instructions": [
    {"type": "update_theme", "theme": "<dark-gothic | bright-forest | warm-tavern>"},
    {"type": "update_world", "world": {
      "locationName": "<creative location name>",
      "biome": "<biome type>",
      "description": "<2 sentence atmospheric description>",
      "conditions": ["<condition1>", "<condition2>"],
      "inCombat": false,
      "round": null,
      "enemy_name": "<chosen monster name — must match exactly one of the 4 above>"
    }},
    {"type": "update_stats", "party": [
      {"id": "aldric", "hp": 54},
      {"id": "lyra",   "hp": 35},
      {"id": "thane",  "hp": 45},
      {"id": "vex",    "hp": 36}
    ]},
    {"type": "combat_log_entry", "text": "<one-line scene setup>", "log_type": "system"}
  ]
}

SCENARIO SEEDS — pick one randomly and build creatively:
1. Standing at the entrance to an ancient ruin — torches flicker, something watches from inside
2. Fog-choked forest crossroads — a body hangs from the old oak, still warm
3. In a torch-lit tavern — a hooded stranger slides a sealed letter across the table
4. Cliffside road at night — torches below reveal an enemy camp blocking the pass
5. Inside a crumbling crypt — floor covered in ash, ceiling breathes

RULES:
- Monster must match the scenario tone
- Always full HP on new session
- inCombat: false (let players decide when to engage)
- Theme must match location
- Make it feel like the first 10 seconds of a great fantasy film

CRITICAL: Return ONLY the JSON. No text before or after."""


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
            "enemy_name": "Shadow Wraith",
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


def _extract_opening_context(result: dict) -> tuple[str, str, str]:
    """Extract enemy_name, theme, and locationName from opening instructions."""
    enemy_name = "Shadow Wraith"
    theme      = "dark-gothic"
    location   = "The Vault of Shadows"

    for instr in result.get("ui_instructions", []):
        if instr.get("type") == "update_theme":
            theme = instr.get("theme", theme)
        elif instr.get("type") == "update_world":
            w          = instr.get("world", {})
            enemy_name = w.get("enemy_name", enemy_name)
            location   = w.get("locationName", location)

    return enemy_name, theme, location


def _generate_opening_scene(result: dict) -> str:
    """Generate opening visual via vibe architect. Returns scene name."""
    try:
        from agents.vibe_architect import generate_scene_component, validate_and_write_component

        _, theme, location = _extract_opening_context(result)
        in_combat = False
        for instr in result.get("ui_instructions", []):
            if instr.get("type") == "update_world":
                in_combat = instr.get("world", {}).get("inCombat", False)

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
            return scene_name

    except Exception as e:
        print(f"[opening_scene] visual generation error: {e}")
        return "DungeonScene"


def generate_new_session() -> dict:
    try:
        llm  = get_llm()
        resp = llm.invoke([
            SystemMessage(content=NEW_SESSION_PROMPT),
            HumanMessage(content="Generate a fresh campaign opening."),
        ])
        result = _parse_response(resp.content, FALLBACK_NEW)

        enemy_name, theme, location = _extract_opening_context(result)
        print(f"[opening_scene] new session: {location} | monster: {enemy_name}")

        # Initialise in-memory state + wipe MongoDB with all three values
        try:
            from agents.graph import set_session_monster
            set_session_monster("player_one", enemy_name, theme=theme, location=location)
        except Exception as e:
            print(f"[opening_scene] session init warning: {e}")

        # Generate opening visual
        scene_name = _generate_opening_scene(result)

        # Tell frontend to mount the scene
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


def generate_opening(session_id: str = "player_one") -> dict:
    """Always generates a fresh opening for the prototype."""
    print(f"[opening_scene] generating fresh opening for: {session_id}")
    return generate_new_session()