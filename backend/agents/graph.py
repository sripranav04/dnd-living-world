from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

from state import AgentState
from agents.dm_agent import dm_node
from agents.lore_agent import lore_node
from mechanics.mechanics_node import mechanics_node
from agents.vibe_architect import vibe_architect_node

_session_states: dict = {}

_DEBUG_WORLD = {
    "inCombat": True,
    "locationName": "The Vault of Shadows",
    "biome": "dungeon",
    "theme": "dark-gothic",
    "current_encounter": {
        "enemy_name": "Zombie",
        "enemy_hp": 45,
        "enemy_max_hp": 45,
        "target_ac": 13,
        "initiative_order": ["vex", "aldric", "lyra", "thane"],
        "current_turn": "vex",
        "round_number": 1,
    },
}

_DEBUG_PARTY = {
    "aldric": {"name": "Aldric", "hp": 54, "max_hp": 54, "ac": 18, "attack_bonus": 7, "damage_expression": "1d8+4"},
    "lyra":   {"name": "Lyra",   "hp": 35, "max_hp": 35, "ac": 13, "attack_bonus": 6, "damage_expression": "1d6+3"},
    "thane":  {"name": "Thane",  "hp": 45, "max_hp": 45, "ac": 16, "attack_bonus": 5, "damage_expression": "1d8+3"},
    "vex":    {"name": "Vex",    "hp": 36, "max_hp": 36, "ac": 15, "attack_bonus": 6, "damage_expression": "1d6+3"},
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


def _fresh_state(session_id: str) -> dict:
    import copy
    return {
        "messages":          [],
        "active_character":  "vex",
        "acting_character":  "vex",
        "party":             copy.deepcopy(_DEBUG_PARTY),
        "world":             copy.deepcopy(_DEBUG_WORLD),
        "ui_queue":          [],
        "narrative_history": [],
        "turn_count":        0,
        "session_summary":   "",
        "next_agent":        "dm",
        "session_id":        session_id,
    }


async def run_turn(
    graph,
    player_action: str,
    session_id: str,
    active_character: str = "",
) -> dict:
    if session_id not in _session_states:
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
                # Pre-apply DM instructions so vibe_architect sees updated theme
                if node_name == "dm":
                    for instruction in updates.get("ui_queue", []):
                        itype = instruction.get("type", "")
                        if itype == "update_theme":
                            state["world"]["theme"] = instruction["theme"]
                            print(f"[graph] theme pre-applied → {instruction['theme']}")
                        elif itype == "update_world":
                            patch = instruction.get("world", {})
                            state["world"].update(patch)
                            if "inCombat" in patch:
                                print(f"[graph] inCombat pre-applied → {patch['inCombat']}")
                all_updates.update(updates)
                state.update(updates)

    # Apply all UI instructions back into persistent session state
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


def reset_session(session_id: str):
    if session_id in _session_states:
        del _session_states[session_id]
        print(f"[graph] session {session_id} cleared")