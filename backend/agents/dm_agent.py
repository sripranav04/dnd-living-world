import os
import json
import re

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

# ── System prompt ─────────────────────────────────────────
SYSTEM_PROMPT = """You are the Dungeon Master for an immersive D&D 5e campaign.
You respond ONLY with a valid JSON object — no preamble, no markdown fences.

The JSON must have exactly this structure:
{
  "narrative": "string — 2-4 sentences of vivid, atmospheric narration in second person",
  "ui_instructions": [
    {"type": "update_theme", "theme": "dark-gothic"},
    {"type": "update_stats", "party": [{"id": "aldric", "hp": 38}]},
    {"type": "update_world", "world": {"locationName": "string", "biome": "string", "description": "string", "conditions": ["string"], "inCombat": true, "round": 4}},
    {"type": "move_token", "tokenId": "aldric", "x": 55, "y": 40},
    {"type": "combat_log_entry", "text": "string", "log_type": "attack"},
    {"type": "screen_shake"},
    {"type": "spell_effect", "x": 60, "y": 35, "color": "#6eb5d4"}
  ],
  "next_agent": "dm"
}

THEME VALUES (use exact strings only):
- "dark-gothic"   = dungeons, undead, horror, underground, crypts, ruins
- "bright-forest" = forests, nature, outdoors, fey, elven areas, grasslands
- "warm-tavern"   = inns, towns, cities, taverns, markets, civilized areas
ALWAYS emit update_theme when location type changes.

PARTY:
- aldric: Fighter/Human LV5, HP 42/54, AC 18, Shield of Faith active
- lyra: Wizard/Elf LV5, HP 19/35, AC 13, Poisoned
- thane: Cleric/Dwarf LV5, HP 40/45, AC 16
- vex: Rogue/Tiefling LV5, HP 8/36, AC 15, Burning 1d4

LOCATION: The Vault of Shadows (unhallowed necromancer treasury)
ENEMIES: Shadow Wraith (initiative 19), Skeleton Archer (initiative 14)
TONE: gothic horror, tense, cinematic, present tense, second person

RULES:
- If player provides a dice roll in brackets like [rolled 18 on d20], use that exact number
- Apply D&D 5e rules for AC checks, damage, saving throws
- Enemies retaliate each turn logically
- log_type options: attack, spell, heal, move, system

CRITICAL: Return ONLY the JSON object. No text before or after it."""


def dm_node(state: dict) -> dict:
    """LangGraph node — provider-agnostic DM agent."""
    llm = get_llm()

    narrative_history = state.get("narrative_history", [])
    turn_count        = state.get("turn_count", 0)
    session_summary   = state.get("session_summary", "")

    context_entries = narrative_history[-6:] if len(narrative_history) > 6 else narrative_history
    context_block   = "\n".join(context_entries) if context_entries else "Session just started."

    if session_summary:
        context_block = f"[SUMMARY]: {session_summary}\n\n[RECENT]:\n{context_block}"

    messages    = state.get("messages", [])
    last_human  = next((m for m in reversed(messages) if getattr(m, "type", None) == "human"), None)
    player_action = last_human.content if last_human else "look around"

    prompt_messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"RECENT HISTORY:\n{context_block}\n\nPLAYER ACTION: {player_action}"),
    ]

    response = llm.invoke(prompt_messages)
    raw = response.content.strip()

    # Strip markdown fences
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"```\s*$",     "", raw)

    # Parse JSON with fallback
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        try:
            parsed = json.loads(match.group()) if match else {}
        except Exception:
            parsed = {}
        if not parsed:
            parsed = {"narrative": raw[:500] or "The dungeon falls silent.", "ui_instructions": [], "next_agent": "dm"}

    narrative       = parsed.get("narrative", "")
    ui_instructions = parsed.get("ui_instructions", [])

    new_history = narrative_history + [f"PLAYER: {player_action}", f"DM: {narrative}"]

    # Rolling summariser every 6 turns
    new_summary = session_summary
    if turn_count > 0 and turn_count % 6 == 0 and len(new_history) > 12:
        to_summarise = new_history[:6]
        new_history  = new_history[6:]
        summary_resp = llm.invoke([
            SystemMessage(content="Summarise these D&D session events in 2 sentences. Be concise."),
            HumanMessage(content="\n".join(to_summarise)),
        ])
        new_summary = (new_summary + " " + summary_resp.content.strip()).strip()

    return {
        "ui_queue":          ui_instructions,
        "narrative_history": new_history,
        "turn_count":        turn_count + 1,
        "session_summary":   new_summary,
        "next_agent":        parsed.get("next_agent", "dm"),
    }