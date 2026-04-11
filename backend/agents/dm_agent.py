import os
import json
import re
from typing import Any
from langchain_aws import ChatBedrockConverse
from langchain_core.messages import SystemMessage, HumanMessage

# ── Bedrock client (lazy singleton) ──────────────────────
_llm: ChatBedrockConverse | None = None

def get_llm() -> ChatBedrockConverse:
    global _llm
    if _llm is None:
        _llm = ChatBedrockConverse(
            model=os.environ["LLM_MODEL_ID"],
            region_name=os.environ["AWS_REGION"],
            temperature=float(os.environ.get("LLM_TEMPERATURE", "0.8")),
            max_tokens=1024,
        )
    return _llm

# ── System prompt ─────────────────────────────────────────
SYSTEM_PROMPT = """You are the Dungeon Master for an immersive D&D 5e campaign.
You respond ONLY with a valid JSON object — no preamble, no markdown fences.

The JSON must have exactly this structure:
{
  "narrative": "string — 2-4 sentences of vivid, atmospheric narration in second person",
  "ui_instructions": [
    // OPTIONAL array — include only when the game state genuinely changes
    // Supported instruction types:

    // Change the visual theme — ONLY use these exact 3 values:
    {"type": "update_theme", "theme": "dark-gothic"}
    // "dark-gothic"  = dungeons, undead, horror, underground, crypts, ruins
    // "bright-forest" = forests, nature, outdoors, fey, elven areas, grasslands  
    // "warm-tavern"  = inns, towns, cities, taverns, markets, civilized areas
    // ALWAYS emit update_theme when location type changes between these categories

    // Update a character's HP or status:
    {"type": "update_stats", "party": [{"id": "aldric", "hp": 38}]}
    // party member ids: "aldric", "lyra", "thane", "vex"

    // Change the location info shown in the right panel:
    {"type": "update_world", "world": {
      "locationName": "string",
      "biome": "string",
      "description": "string",
      "conditions": ["string"],
      "inCombat": true,
      "round": 4
    }}

    // Move a token on the map (x and y are percentages 0-100):
    {"type": "move_token", "tokenId": "aldric", "x": 55, "y": 40}

    // Add a combat log entry:
    {"type": "combat_log_entry", "text": "string", "log_type": "attack"}
    // log_type options: "attack", "spell", "heal", "move", "system"

    // Trigger screen shake (for big hits, explosions):
    {"type": "screen_shake"}

    // Trigger spell visual effect on map:
    {"type": "spell_effect", "x": 60, "y": 35, "color": "#6eb5d4"}
  ],
  "next_agent": "dm"
}

WORLD CONTEXT:
- Party: Aldric Stonehaven (Fighter/Human, LV5), Lyra Moonwhisper (Wizard/Elf, LV5), Brother Thane (Cleric/Dwarf, LV5), Vex Shadowstep (Rogue/Tiefling, LV5)
- Current location: The Vault of Shadows (collapsed necromancer's treasury, unhallowed ground)
- In combat: yes — fighting a Shadow Wraith (19 initiative) and a Skeleton Archer (14 initiative)
- Aldric has active Shield of Faith. Lyra is Poisoned. Vex is Burning (1d4).
- Tone: gothic horror, tense, cinematic. Short sentences. Present tense. Second person.
- Apply D&D 5e rules accurately for attacks, saving throws, spell effects.
- When the player attacks: roll d20 (describe the roll), apply damage if hit.
- When enemies act: they retaliate logically based on position and HP.

CRITICAL: Return ONLY the JSON object. No text before or after it."""

# ── DM node ───────────────────────────────────────────────

def dm_node(state: dict) -> dict:
    """
    LangGraph node. Receives AgentState, calls Haiku, returns state updates.
    """
    llm = get_llm()

    # Build conversation context
    narrative_history = state.get("narrative_history", [])
    turn_count = state.get("turn_count", 0)
    session_summary = state.get("session_summary", "")

    # Use rolling summary + last 6 turns to stay within context window
    context_entries = narrative_history[-6:] if len(narrative_history) > 6 else narrative_history
    context_block = "\n".join(context_entries) if context_entries else "Session just started."

    if session_summary:
        context_block = f"[SUMMARY OF EARLIER EVENTS]: {session_summary}\n\n[RECENT]:\n{context_block}"

    # Most recent player action
    messages = state.get("messages", [])
    last_human = next(
        (m for m in reversed(messages) if getattr(m, "type", None) == "human"),
        None,
    )
    player_action = last_human.content if last_human else "look around"

    # Call Haiku
    prompt_messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"RECENT HISTORY:\n{context_block}\n\nPLAYER ACTION: {player_action}"),
    ]

    response = llm.invoke(prompt_messages)
    raw = response.content.strip()

    # Parse JSON — strip any accidental markdown fences
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"```\s*$", "", raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback — extract anything that looks like a JSON object
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            parsed = {
                "narrative": raw[:500] if raw else "The dungeon falls silent.",
                "ui_instructions": [],
                "next_agent": "dm",
            }

    narrative = parsed.get("narrative", "")
    ui_instructions = parsed.get("ui_instructions", [])

    # Append narrative to history
    new_history = narrative_history + [
        f"PLAYER: {player_action}",
        f"DM: {narrative}",
    ]

    # Rolling summariser — every 6 turns, summarise oldest entries
    new_summary = state.get("session_summary", "")
    if turn_count > 0 and turn_count % 6 == 0 and len(new_history) > 12:
        # Summarise the oldest 6 entries cheaply
        to_summarise = new_history[:6]
        new_history = new_history[6:]
        summary_prompt = [
            SystemMessage(content="Summarise these D&D session events in 2 sentences. Be concise."),
            HumanMessage(content="\n".join(to_summarise)),
        ]
        summary_resp = llm.invoke(summary_prompt)
        new_summary = (new_summary + " " + summary_resp.content.strip()).strip()

    return {
        "ui_queue": ui_instructions,
        "narrative_history": new_history,
        "turn_count": turn_count + 1,
        "session_summary": new_summary,
        "next_agent": parsed.get("next_agent", "dm"),
    }