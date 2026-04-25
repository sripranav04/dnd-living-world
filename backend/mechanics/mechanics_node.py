import random
from mechanics.dice import resolve_attack
from mechanics.open5e import fetch_monster_sync
from state import AgentState
from langchain_core.messages import SystemMessage

ENEMY_ATTACK_STATS = {
    "shadow wraith":   {"attack_bonus": 6, "damage": "2d6+3", "attack_name": "Corrupting Touch"},
    "skeleton archer": {"attack_bonus": 4, "damage": "1d6+2", "attack_name": "Shortbow"},
    "goblin":          {"attack_bonus": 4, "damage": "1d6+2", "attack_name": "Scimitar"},
    "zombie":          {"attack_bonus": 3, "damage": "1d6+1", "attack_name": "Slam"},
}


def _get_enemy_stats(enemy_name: str) -> dict:
    return ENEMY_ATTACK_STATS.get(
        enemy_name.lower(),
        {"attack_bonus": 3, "damage": "1d6+1", "attack_name": "Strike"}
    )


def _check_combat_end(encounter: dict, party: dict) -> str | None:
    """Returns combat end status or None if combat continues."""
    if encounter.get("enemy_hp", 1) <= 0:
        return "enemy_defeated"
    if all(c.get("hp", 0) <= 0 for c in party.values()):
        return "party_wiped"
    return None


def _resolve_enemy_attack(encounter: dict, party: dict) -> str | None:
    """Resolve enemy counter-attack. Returns narrative line or None."""
    enemy_name = encounter.get("enemy_name", "Enemy")
    enemy_hp   = encounter.get("enemy_hp", 0)

    if enemy_hp <= 0:
        return None

    stats = _get_enemy_stats(enemy_name)

    living = [c for c in party.values() if c.get("hp", 0) > 0]
    if not living:
        return None

    target      = random.choice(living)
    target_name = target.get("name", "the party")
    target_ac   = target.get("ac", 13)

    resolution = resolve_attack(
        attack_bonus=stats["attack_bonus"],
        target_ac=target_ac,
        damage_expression=stats["damage"],
    )

    if resolution["hit"]:
        damage = resolution["damage"] or 0
        target["hp"] = max(0, target["hp"] - damage)
        hp_left = target["hp"]
        crit    = " — CRITICAL HIT" if resolution["critical_hit"] else ""
        downed  = f" {target_name} is DOWNED." if hp_left <= 0 else ""
        line = (
            f"{enemy_name} uses {stats['attack_name']} against {target_name}: "
            f"rolled {resolution['attack_roll']} vs AC {target_ac}{crit}. "
            f"HIT. Damage: {damage} ({stats['damage']}). "
            f"{target_name} HP remaining: {hp_left}.{downed}"
        )
    else:
        line = (
            f"{enemy_name} uses {stats['attack_name']} against {target_name}: "
            f"rolled {resolution['attack_roll']} vs AC {target_ac}. MISS."
        )

    print(f"[enemy] {line}")
    return line


def mechanics_node(state: AgentState) -> dict:
    last_message = state["messages"][-1].content if state["messages"] else ""
    world        = state.get("world", {})
    party        = state.get("party", {})
    encounter    = world.get("current_encounter", {})

    if not world.get("inCombat"):
        return {"next_agent": "dm"}

    action_lower = last_message.lower()
    is_attack    = any(w in action_lower for w in
                       ["attack", "strike", "hit", "swing", "shoot", "cast", "spell"])

    # ── Turn order validation ─────────────────────────────
    initiative_order = encounter.get("initiative_order", [])
    current_turn     = encounter.get("current_turn", "")
    active_char_id   = state.get("active_character", "")

    if initiative_order:
        if not current_turn:
            current_turn = initiative_order[0]
            encounter["current_turn"] = current_turn

        if active_char_id and active_char_id != current_turn:
            injection = SystemMessage(content=(
                f"[TURN ORDER] It is {current_turn}'s turn, not {active_char_id}'s. "
                f"Narrate that {active_char_id} must wait."
            ))
            return {
                "messages":         [injection],
                "next_agent":       "dm",
                "acting_character": active_char_id,
                "active_character": current_turn,
            }

    # ── Who is acting this turn ───────────────────────────
    char_id = active_char_id or current_turn or next(iter(party), "")

    # ── Advance turn ──────────────────────────────────────
    next_turn         = current_turn
    enemy_retaliation = None

    if initiative_order and current_turn:
        current_index = (initiative_order.index(current_turn)
                         if current_turn in initiative_order else 0)
        next_index    = (current_index + 1) % len(initiative_order)
        next_turn     = initiative_order[next_index]

        if next_index == 0:
            encounter["round_number"] = encounter.get("round_number", 1) + 1
            enemy_retaliation = _resolve_enemy_attack(encounter, party)

        encounter["current_turn"] = next_turn
        world["current_encounter"] = encounter
        print(f"[turn] {current_turn} acted → next: {next_turn} "
              f"(round {encounter.get('round_number', 1)})")

    # ── Check combat end after retaliation ────────────────
    combat_status = _check_combat_end(encounter, party)

    # ── Non-attack action ─────────────────────────────────
    if not is_attack:
        parts = ["[NON-COMBAT ACTION — no dice rolled]"]
        if enemy_retaliation:
            parts.append(f"\n[ENEMY RETALIATION]\n{enemy_retaliation}")
        if combat_status == "party_wiped":
            parts.append("\n[COMBAT END — DEFEAT] All party members are downed. Narrate a dramatic defeat.")
        injection = SystemMessage(content="\n".join(parts))
        return {
            "messages":         [injection],
            "world":            world,
            "next_agent":       "dm",
            "acting_character": char_id,
            "active_character": next_turn,
        }

    # ── Open5e lookup ─────────────────────────────────────
    if encounter.get("enemy_name") and not encounter.get("stats_loaded"):
        try:
            monster = fetch_monster_sync(encounter["enemy_name"])
            if monster:
                encounter["target_ac"] = monster["ac"]
                if encounter.get("enemy_hp", 0) == 0:
                    encounter["enemy_hp"]     = monster["hp"]
                    encounter["enemy_max_hp"] = monster["hp"]
                encounter["stats_loaded"] = True
                world["current_encounter"] = encounter
                print(f"[open5e] {monster['name']}: AC {monster['ac']}, HP {monster['hp']}")
        except Exception as e:
            print(f"[open5e] lookup failed: {e}")

    # ── Resolve player attack ─────────────────────────────
    active_char  = party.get(char_id, next(iter(party.values()), {}))
    attack_bonus = active_char.get("attack_bonus") or 4
    damage_expr  = active_char.get("damage_expression") or "1d6+2"
    target_ac    = encounter.get("target_ac") or 13

    resolution = resolve_attack(
        attack_bonus=attack_bonus,
        target_ac=target_ac,
        damage_expression=damage_expr,
    )

    enemy_hp_remaining = None
    if resolution["hit"] and "enemy_hp" in encounter:
        encounter["enemy_hp"] = max(0, encounter["enemy_hp"] - (resolution["damage"] or 0))
        world["current_encounter"] = encounter
        enemy_hp_remaining = encounter["enemy_hp"]

    mechanics_summary = _format_for_narrator(
        resolution, active_char.get("name", char_id), enemy_hp_remaining
    )
    print(f"[mechanics] {mechanics_summary}")

    # ── Check combat end after player attack ──────────────
    combat_status = _check_combat_end(encounter, party)

    # ── Build full injection ──────────────────────────────
    parts = [
        "[MECHANICS RESOLVED — do NOT re-roll or invent numbers]",
        mechanics_summary,
    ]

    if enemy_retaliation:
        parts.append(f"\n[ENEMY RETALIATION — narrate this too]\n{enemy_retaliation}")

        if combat_status == "enemy_defeated":
         parts.append(
            "\n[COMBAT END — VICTORY] The enemy has been defeated. "
            "Narrate a dramatic victory. "
            "You MUST emit: update_world with inCombat:false, "
            "update_session with xp:150 and kills:1, "
            "combat_log_entry describing the kill."
        )
        world["inCombat"] = False
        # Also directly add update_session to ui_queue so it can't be missed
        state.setdefault("ui_queue", []).append({
            "type": "update_session",
            "stats": {"xp": 150, "kills": 1}
        })
        print(f"[combat] VICTORY — {encounter.get('enemy_name')} defeated")
    elif combat_status == "party_wiped":
            parts.append(
                "\n[COMBAT END — DEFEAT] All party members are downed. "
                "Narrate a dramatic defeat. Emit update_world with inCombat:false."
            )
            world["inCombat"] = False
            print(f"[combat] DEFEAT — party wiped")

    # ── Check individual downed characters ────────────────
    newly_downed = [
        c.get("name", cid) for cid, c in party.items()
        if c.get("hp", 0) <= 0
    ]
    if newly_downed and combat_status != "party_wiped":
        downed_names = ", ".join(newly_downed)
        parts.append(
            f"\n[CHARACTER DOWNED] {downed_names} has been downed (HP 0). "
            f"Emit update_stats with isDowned:true for them. "
            f"They skip turns until a Cleric uses Revive."
        )

    injection = SystemMessage(content="\n".join(parts))

    return {
        "messages":         [injection],
        "world":            world,
        "next_agent":       "dm",
        "acting_character": char_id,
        "active_character": next_turn,
    }


def _format_for_narrator(r: dict, attacker: str, enemy_hp_remaining: int = None) -> str:
    crit_tag = (
        " — CRITICAL HIT"  if r["critical_hit"]  else
        " — CRITICAL MISS" if r["critical_miss"] else ""
    )
    if r["hit"]:
        hp_line = (f" Enemy HP remaining: {enemy_hp_remaining}."
                   if enemy_hp_remaining is not None else "")
        return (
            f"{attacker} rolled {r['attack_roll']} to hit "
            f"(dice: {r['attack_dice']}, modifier: +{r['attack_modifier']}) "
            f"vs AC {r['target_ac']}{crit_tag}. "
            f"HIT. Damage: {r['damage']} ({r['damage_expression']}, "
            f"rolls: {r['damage_rolls']}).{hp_line}"
        )
    return (
        f"{attacker} rolled {r['attack_roll']} to hit "
        f"(dice: {r['attack_dice']}, modifier: +{r['attack_modifier']}) "
        f"vs AC {r['target_ac']}{crit_tag}. MISS."
    )