import random
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

from state import AgentState
from agents.dm_agent import dm_node
from agents.lore_agent import lore_node
from mechanics.mechanics_node import mechanics_node
from agents.vibe_architect import vibe_architect_node

_session_states: dict = {}

MONSTER_ROSTER = [
    {"name": "Shadow Wraith",   "hp": 45, "ac": 13, "attack_bonus": 4, "damage": "2d6+2"},
    {"name": "Skeleton Archer", "hp": 13, "ac": 13, "attack_bonus": 4, "damage": "1d6+2"},
    {"name": "Goblin",          "hp": 7,  "ac": 15, "attack_bonus": 4, "damage": "1d6+2"},
    {"name": "Zombie",          "hp": 22, "ac": 8,  "attack_bonus": 3, "damage": "1d6+1"},
]

PARTY_ROSTER = {
    "aldric": {"name": "Aldric", "hp": 54, "max_hp": 54, "ac": 18, "attack_bonus": 7, "damage_expression": "1d8+4"},
    "lyra":   {"name": "Lyra",   "hp": 35, "max_hp": 35, "ac": 13, "attack_bonus": 6, "damage_expression": "1d6+3"},
    "thane":  {"name": "Thane",  "hp": 45, "max_hp": 45, "ac": 16, "attack_bonus": 5, "damage_expression": "1d8+3"},
    "vex":    {"name": "Vex",    "hp": 36, "max_hp": 36, "ac": 15, "attack_bonus": 6, "damage_expression": "1d6+3"},
}


def _fresh_world(monster: dict, theme: str = "dark-gothic", location: str = "The Vault of Shadows") -> dict:
    return {
        "inCombat":    False,
        "locationName": location,
        "biome":       "dungeon",
        "theme":       theme,
        "current_encounter": {
            "enemy_name":       monster["name"],
            "enemy_hp":         monster["hp"],
            "enemy_max_hp":     monster["hp"],
            "target_ac":        monster["ac"],
            "initiative_order": ["vex", "aldric", "lyra", "thane"],
            "current_turn":     "vex",
            "round_number":     1,
        },
    }


async def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("mechanics",      mechanics_node)
    builder.add_node("dm",             dm_node)
    builder.add_node("lore",           lore_node)
    builder.add_node("vibe_architect", vibe_architect_node)

    builder.set_entry_point("mechanics")
    builder.add_conditional_edges(
        "mechanics",
        lambda s: s.get("next_agent", "dm"),
        {"dm": "dm", "end": END},
    )
    builder.add_edge("dm",             "lore")
    builder.add_edge("lore",           "vibe_architect")
    builder.add_edge("vibe_architect", END)

    return builder.compile()


def _fresh_state(session_id: str, monster: dict | None = None,
                 theme: str = "dark-gothic", location: str = "The Vault of Shadows") -> dict:
    import copy
    if monster is None:
        monster = random.choice(MONSTER_ROSTER)
    return {
        "messages":          [],
        "active_character":  "vex",
        "acting_character":  "vex",
        "party":             copy.deepcopy(PARTY_ROSTER),
        "world":             _fresh_world(monster, theme=theme, location=location),
        "ui_queue":          [],
        "narrative_history": [],
        "turn_count":        0,
        "session_summary":   "",
        "next_agent":        "dm",
        "session_id":        session_id,
    }


def _apply_monster_from_name(state: dict, enemy_name: str) -> None:
    monster = next(
        (m for m in MONSTER_ROSTER if m["name"].lower() == enemy_name.lower()),
        None
    )
    if monster:
        state["world"]["current_encounter"].update({
            "enemy_name":   monster["name"],
            "enemy_hp":     monster["hp"],
            "enemy_max_hp": monster["hp"],
            "target_ac":    monster["ac"],
        })
        print(f"[graph] monster set → {monster['name']} (HP {monster['hp']}, AC {monster['ac']})")
    else:
        state["world"]["current_encounter"]["enemy_name"] = enemy_name
        print(f"[graph] unknown monster '{enemy_name}' — name set, stats unchanged")


async def run_turn(
    graph,
    player_action: str,
    session_id: str,
    active_character: str = "",
) -> dict:
    # State should always be initialised by set_session_monster before first turn.
    # This is a safety fallback only.
    if session_id not in _session_states:
        print(f"[graph] WARNING: run_turn called before set_session_monster — creating fallback state")
        _session_states[session_id] = _fresh_state(session_id)

    state = _session_states[session_id]

    from langchain_core.messages import SystemMessage as SM
    clean_messages = [
        m for m in state.get("messages", [])
        if not (hasattr(m, "type") and m.type == "system")
    ]
    state["messages"]         = clean_messages + [HumanMessage(content=player_action)]
    state["active_character"] = active_character
    state["acting_character"] = active_character

    all_updates = {}
    async for chunk in graph.astream(state, stream_mode="updates"):
        for node_name, updates in chunk.items():
            if isinstance(updates, dict):
                if node_name == "dm":
                    for instruction in updates.get("ui_queue", []):
                        itype = instruction.get("type", "")
                        if itype == "update_theme":
                            state["world"]["theme"] = instruction["theme"]
                            print(f"[graph] theme pre-applied → {instruction['theme']}")
                        elif itype == "update_world":
                            patch = instruction.get("world", {})
                            enemy_name = patch.pop("enemy_name", None)
                            if enemy_name:
                                _apply_monster_from_name(state, enemy_name)
                            state["world"].update(patch)
                            if "inCombat" in patch:
                                print(f"[graph] inCombat pre-applied → {patch['inCombat']}")
                all_updates.update(updates)
                state.update(updates)

    for instruction in all_updates.get("ui_queue", []):
        itype = instruction.get("type", "")

        if itype == "update_theme":
            new_theme = instruction.get("theme", "")
            if new_theme:
                state["world"]["theme"] = new_theme
                print(f"[graph] theme updated → {new_theme}")

        elif itype == "update_world":
            world_patch = instruction.get("world", {})
            if world_patch:
                enemy_name = world_patch.pop("enemy_name", None)
                if enemy_name:
                    _apply_monster_from_name(state, enemy_name)
                state["world"].update(world_patch)
                if "locationName" in world_patch:
                    print(f"[graph] location updated → {world_patch['locationName']}")
                if "inCombat" in world_patch:
                    print(f"[graph] inCombat updated → {world_patch['inCombat']}")

        elif itype == "update_stats":
            for char_update in instruction.get("party", []):
                char_id = char_update.get("id", "")
                if char_id in state["party"]:
                    for key, val in char_update.items():
                        if key != "id":
                            state["party"][char_id][key] = val

    _session_states[session_id] = state

    history = state.get("narrative_history", [])
    narrative = ""
    for entry in reversed(history):
        if entry.startswith("DM: "):
            narrative = entry[4:]
            break

    return {
        "narrative":       narrative,
        "ui_instructions": all_updates.get("ui_queue", []),
        "current_turn":    state.get("world", {}).get(
                               "current_encounter", {}).get("current_turn", ""),
    }


def set_session_monster(
    session_id: str,
    enemy_name: str,
    theme: str = "dark-gothic",
    location: str = "The Vault of Shadows",
) -> None:
    """
    Called by opening_scene after generating the opening.
    Creates fresh in-memory state with correct monster, theme and location.
    Wipes MongoDB so no stale data bleeds in from previous sessions.
    """
    from memory.lore import clear_session

    # Always wipe and recreate — canonical session start point
    if session_id in _session_states:
        del _session_states[session_id]

    clear_session(session_id)

    monster = next(
        (m for m in MONSTER_ROSTER if m["name"].lower() == enemy_name.lower()),
        MONSTER_ROSTER[0],
    )

    _session_states[session_id] = _fresh_state(
        session_id,
        monster=monster,
        theme=theme,
        location=location,
    )
    print(f"[graph] session initialised — monster={monster['name']} theme={theme} location={location}")


def reset_session(session_id: str) -> None:
    """Full reset — clears in-memory state AND MongoDB for this session."""
    from memory.lore import clear_session
    if session_id in _session_states:
        del _session_states[session_id]
    clear_session(session_id)
    print(f"[graph] session {session_id} fully reset")