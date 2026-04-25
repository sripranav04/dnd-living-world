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

ACTION TYPE NARRATION — CRITICAL, READ CAREFULLY:
You MUST match the narration style to what the player actually said they did.
Read the PLAYER ACTION carefully BEFORE writing the narrative.

- Player says "cast a spell" / "cast fireball" / "use magic" / "channel" / "arcane":
  → Narrate MAGIC: arcane light, spell projectile, magical force, energy crackling.
  → NEVER describe a sword swing or physical weapon strike.
  → log_type = "spell"

- Player says "attack" / "strike" / "hit" / "swing" / "stab" / "slash":
  → Narrate PHYSICAL: weapon blow, blade connecting, shield bash.
  → log_type = "attack"

- Player says "dodge" / "fall back" / "defensive":
  → Narrate EVASION: ducking, rolling, raising shield defensively.
  → log_type = "move"

- Player says "heal" / "second wind" / "cure wounds" / "revive":
  → Narrate HEALING: warmth spreading, wounds closing, energy restoring.
  → log_type = "heal"

- Player says "investigate" / "look" / "search" / "examine":
  → Narrate EXPLORATION: careful observation, noticing details.
  → log_type = "move"

The damage numbers from [MECHANICS RESOLVED] are always correct.
Only the DELIVERY METHOD changes based on what the player said.
Example: "Cast a spell" + damage 7 = magic bolt hits for 7, NOT sword swing for 7.

COMBAT NARRATION RULES:
When context contains [MECHANICS RESOLVED], you MUST:
1. Accept every number as absolute truth — never re-roll, never invent damage values
2. Narrate the outcome using the provided numbers BUT matching the player's action type above
3. On CRITICAL HIT: make the narration visceral and dramatic
4. On CRITICAL MISS: describe an appropriate fumble or mishap
5. Always emit combat_log_entry with exact numbers from the resolved block
6. Always emit update_stats reflecting exact remaining HP

When context contains [ENEMY RETALIATION]:
- Narrate BOTH the player's action AND the enemy's counter-attack in one narrative
- The enemy attack is real — describe it happening to the named target
- Emit update_stats for the target character who took damage

When context contains [COMBAT END — VICTORY]:
- Narrate a dramatic victory — the enemy falls, collapses, dissolves
- Emit update_world with inCombat:false
- Emit update_session with xp:150 and kills:1
- Emit combat_log_entry describing the kill

When context contains [COMBAT END — DEFEAT]:
- Narrate a dramatic defeat — the party is overwhelmed
- Emit update_world with inCombat:false

When context contains [CHARACTER DOWNED]:
- Mention the character falling in the narrative
- Emit update_stats with isDowned:true for them

STAT UPDATE RULES:
- update_stats must use the EXACT character id: aldric, lyra, thane, vex
- Only update HP for the character who actually took damage
- Enemy retaliation damage MUST be reflected in update_stats for the target

CHARACTER PERSPECTIVE RULES:
- ALL narration must be from NOW ACTING character's perspective
- The narrative "you" always refers to NOW ACTING character
- NEVER narrate a different character acting

ENEMY HP TRACKING — REQUIRED every combat turn:
Always emit update_world with enemy HP after each attack:
{{"type": "update_world", "world": {{
  "enemyName": "Shadow Wraith",
  "enemyHp": 32,
  "enemyMaxHp": 45
}}}}

When context contains [COMBAT END — VICTORY]:
- Narrate a dramatic victory — the enemy falls, collapses, dissolves
- ALWAYS emit ALL of these instructions:
  1. {{"type": "update_world", "world": {{"inCombat": false, "enemyHp": 0}}}}
  2. {{"type": "update_session", "stats": {{"xp": 150, "kills": 1}}}}
  3. {{"type": "combat_log_entry", "text": "Victory! 150 XP earned.", "log_type": "system"}}
- Do NOT forget update_session — kills and XP must always be recorded on victory

log_type options: attack, spell, heal, move, system

CRITICAL: Return ONLY the JSON object. No text before or after it."""


def dm_node(state: dict) -> dict:
    llm = get_llm()

    narrative_history = state.get("narrative_history", [])
    turn_count        = state.get("turn_count", 0)
    session_summary   = state.get("session_summary", "")

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
            "[MECHANICS RESOLVED" in m.content or
            "[TURN ORDER]" in m.content or
            "[NON-COMBAT" in m.content or
            "[ENEMY RETALIATION" in m.content or
            "[COMBAT END" in m.content or
            "[CHARACTER DOWNED" in m.content
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
                "narrative":        raw[:500] or "The dungeon falls silent.",
                "ui_instructions":  [],
                "next_agent":       "dm",
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

    # ----------------------------------------------------------------
    # FIX: apply ui_instructions into world so vibe_architect_node
    # receives the correct enemy name within the same graph turn.
    # Without this, vibe_architect reads the stale session-start enemy.
    # ----------------------------------------------------------------
    current_world = state.get("world", {})
    updated_world = {**current_world}
    updated_encounter = {**updated_world.get("current_encounter", {})}

    for inst in ui_instructions:
        itype = inst.get("type", "")

        if itype == "update_theme":
            new_theme = inst.get("theme", "")
            if new_theme:
                updated_world["theme"] = new_theme
                print(f"[dm] world patch — theme → {new_theme}")

        elif itype == "update_world":
            patch = inst.get("world", {})

            # enemy identity (DM uses camelCase enemyName)
            enemy_name = patch.get("enemyName") or patch.get("enemy_name")
            if enemy_name:
                updated_encounter["enemy_name"] = enemy_name
                print(f"[dm] world patch — enemy_name → {enemy_name}")

            if "enemyHp" in patch:
                updated_encounter["enemy_hp"] = patch["enemyHp"]
            if "enemyMaxHp" in patch:
                updated_encounter["enemy_max_hp"] = patch["enemyMaxHp"]
            if "inCombat" in patch:
                updated_world["inCombat"] = patch["inCombat"]
                print(f"[dm] world patch — inCombat → {patch['inCombat']}")
            if "locationName" in patch:
                updated_world["locationName"] = patch["locationName"]
                print(f"[dm] world patch — locationName → {patch['locationName']}")

    updated_world["current_encounter"] = updated_encounter

    return {
        "world":             updated_world,
        "ui_queue":          ui_instructions,
        "narrative_history": new_history,
        "turn_count":        turn_count + 1,
        "session_summary":   new_summary,
        "next_agent":        parsed.get("next_agent", "dm"),
    }