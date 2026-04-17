import json
import re

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from memory.lore import load_facts, format_facts_for_prompt


def _build_system_prompt(state: dict) -> str:
    party      = state.get("party", {})
    world      = state.get("world", {})
    encounter  = world.get("current_encounter", {})
    session_id = state.get("session_id", "")

    # Use acting_character for the prompt — who is acting NOW
    acting_character = state.get("acting_character", "") or state.get("active_character", "")

    party_lines = []
    for char_id, c in party.items():
        hp      = c.get("hp", "?")
        max_hp  = c.get("max_hp", "?")
        ac      = c.get("ac", "?")
        name    = c.get("name", char_id)
        effects = ", ".join(c.get("status_effects", [])) or "none"
        party_lines.append(
            f"- {char_id}: {name} HP {hp}/{max_hp}, AC {ac}, status: {effects}"
        )
    party_block = "\n".join(party_lines) if party_lines else "- No party data loaded"

    location     = world.get("locationName", world.get("location", "Unknown location"))
    in_combat    = world.get("inCombat", False)
    enemy_name   = encounter.get("enemy_name", "")
    enemy_hp     = encounter.get("enemy_hp", "?")
    enemy_max_hp = encounter.get("enemy_max_hp", "?")
    enemy_ac     = encounter.get("target_ac", "?")

    combat_block = ""
    if in_combat and enemy_name:
        combat_block = (
            f"\nCURRENT COMBAT: {enemy_name} — HP {enemy_hp}/{enemy_max_hp}, AC {enemy_ac}"
        )

    turn_block = ""
    initiative_order = encounter.get("initiative_order", [])
    if initiative_order:
        round_num = encounter.get("round_number", 1)
        order_str = " → ".join(initiative_order)
        turn_block = (
            f"\nINITIATIVE (Round {round_num}): {order_str}"
            f"\nNOW ACTING: {acting_character.upper()}"
        )

    lore_block = ""
    if session_id:
        facts = load_facts(session_id, limit=15)
        formatted = format_facts_for_prompt(facts)
        if formatted:
            lore_block = f"\nWORLD MEMORY (established facts — treat as canon):\n{formatted}"

    return f"""You are the Dungeon Master for an immersive D&D 5e campaign.
You respond ONLY with a valid JSON object — no preamble, no markdown fences.

The JSON must have exactly this structure:
{{
  "narrative": "string — 2-4 sentences of vivid, atmospheric narration in second person",
  "ui_instructions": [
    {{"type": "update_theme", "theme": "dark-gothic"}},
    {{"type": "update_stats", "party": [{{"id": "aldric", "hp": 38}}]}},
    {{"type": "update_world", "world": {{"locationName": "string", "biome": "string", "description": "string", "conditions": ["string"], "inCombat": true, "round": 4}}}},
    {{"type": "move_token", "tokenId": "aldric", "x": 55, "y": 40}},
    {{"type": "combat_log_entry", "text": "string", "log_type": "attack"}},
    {{"type": "screen_shake"}},
    {{"type": "spell_effect", "x": 60, "y": 35, "color": "#6eb5d4"}}
  ],
  "next_agent": "dm"
}}

THEME VALUES (use exact strings only):
- "dark-gothic"   = dungeons, undead, horror, underground, crypts, ruins
- "bright-forest" = forests, nature, outdoors, fey, elven areas, grasslands
- "warm-tavern"   = inns, towns, cities, taverns, markets, civilized areas
ALWAYS emit update_theme when location type changes.

PARTY (current state):
{party_block}

LOCATION: {location}{combat_block}{turn_block}{lore_block}
TONE: gothic horror, tense, cinematic, present tense, second person

COMBAT NARRATION RULES — READ CAREFULLY:
When context contains [MECHANICS RESOLVED], you MUST:
1. Accept every number as absolute truth — never re-roll, never invent damage values
2. Narrate the outcome using ONLY the provided roll, damage, and HP numbers
3. On CRITICAL HIT: make the narration visceral and dramatic
4. On CRITICAL MISS: describe an appropriate fumble or mishap
5. Always emit combat_log_entry with the exact numbers from the resolved block
6. Always emit update_stats reflecting the exact remaining HP

STAT UPDATE RULES:
- update_stats must use the EXACT character id from the party list above
- Valid ids are ONLY: aldric, lyra, thane, vex — no other values are valid
- Only update HP for the character who actually took damage
- Enemy damage does NOT change party HP unless stated in [MECHANICS RESOLVED]

CHARACTER PERSPECTIVE RULES:
- The active character is NOW ACTING shown above
- ALL narration must be from that character's perspective
- NEVER narrate a different character acting than NOW ACTING
- The narrative "you" always refers to NOW ACTING character

When context does NOT contain [MECHANICS RESOLVED]:
- If player provides a dice roll in brackets like [rolled 18 on d20], use that exact number
- Apply D&D 5e rules for AC checks, damage, saving throws
- Enemies retaliate each turn logically

log_type options: attack, spell, heal, move, system

CRITICAL: Return ONLY the JSON object. No text before or after it."""


def dm_node(state: dict) -> dict:
    llm = get_llm()

    narrative_history = state.get("narrative_history", [])
    turn_count        = state.get("turn_count", 0)
    session_summary   = state.get("session_summary", "")

    # acting_character = who IS acting NOW (for narration)
    acting_character = state.get("acting_character", "") or state.get("active_character", "")

    context_entries = narrative_history[-6:] if len(narrative_history) > 6 else narrative_history
    context_block   = "\n".join(context_entries) if context_entries else "Session just started."

    if session_summary:
        context_block = f"[SUMMARY]: {session_summary}\n\n[RECENT]:\n{context_block}"

    messages      = state.get("messages", [])
    last_human    = next((m for m in reversed(messages) if getattr(m, "type", None) == "human"), None)
    player_action = last_human.content if last_human else "look around"

    mechanics_context = ""
    for m in reversed(messages):
        if getattr(m, "type", None) == "system" and (
            "[MECHANICS RESOLVED" in m.content or "[TURN ORDER]" in m.content
        ):
            mechanics_context = m.content
            break

    acting_line = f"NOW ACTING: {acting_character.upper()}\n\n" if acting_character else ""

    human_content = (
        f"{acting_line}"
        f"RECENT HISTORY:\n{context_block}\n\n"
        f"PLAYER ACTION: {player_action}"
    )
    if mechanics_context:
        human_content = f"{mechanics_context}\n\n{human_content}"

    # ── Debug ─────────────────────────────────────────────
    print(f"[dm] acting_character={acting_character} | turn_count={turn_count}")
    print(f"[dm] human_content preview: {human_content[:200]}")

    prompt_messages = [
        SystemMessage(content=_build_system_prompt(state)),
        HumanMessage(content=human_content),
    ]

    response = llm.invoke(prompt_messages)
    raw = response.content.strip()

    print(f"[dm] raw response: {raw[:300]}")

    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"```\s*$",     "", raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        try:
            parsed = json.loads(match.group()) if match else {}
        except Exception:
            parsed = {}
        if not parsed:
            parsed = {
                "narrative": raw[:500] or "The dungeon falls silent.",
                "ui_instructions": [],
                "next_agent": "dm",
            }

    narrative       = parsed.get("narrative", "")
    ui_instructions = parsed.get("ui_instructions", [])

    new_history = narrative_history + [
        f"PLAYER ({acting_character or 'unknown'}): {player_action}",
        f"DM: {narrative}",
    ]

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