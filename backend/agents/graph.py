from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

from state import AgentState
from agents.dm_agent import dm_node
from agents.lore_agent import lore_node
from mechanics.mechanics_node import mechanics_node

# ── In-memory state store (replaces Postgres checkpointer for now) ───
_session_states: dict = {}

_DEBUG_WORLD = {
    "inCombat": True,
    "locationName": "The Vault of Shadows",
    "biome": "dungeon",
    "theme": "dark-gothic",
    "current_encounter": {
        "enemy_name": "Shadow Wraith",
        "enemy_hp": 45,
        "enemy_max_hp": 45,
        "target_ac": 13,
        "initiative_order": ["vex", "aldric", "lyra", "thane"],
        "current_turn": "vex",
        "round_number": 1,
    },
}

_DEBUG_PARTY = {
    "aldric": {"name": "Aldric", "hp": 42, "max_hp": 54, "ac": 18, "attack_bonus": 7, "damage_expression": "1d8+4"},
    "lyra":   {"name": "Lyra",   "hp": 19, "max_hp": 35, "ac": 13, "attack_bonus": 6, "damage_expression": "1d6+3"},
    "thane":  {"name": "Thane",  "hp": 40, "max_hp": 45, "ac": 16, "attack_bonus": 5, "damage_expression": "1d8+3"},
    "vex":    {"name": "Vex",    "hp": 8,  "max_hp": 36, "ac": 15, "attack_bonus": 6, "damage_expression": "1d6+3"},
}


async def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("mechanics", mechanics_node)
    builder.add_node("dm", dm_node)
    builder.add_node("lore", lore_node)

    builder.set_entry_point("mechanics")
    builder.add_conditional_edges(
        "mechanics",
        lambda s: s.get("next_agent", "dm"),
        {"dm": "dm", "end": END},
    )
    builder.add_edge("dm", "lore")
    builder.add_edge("lore", END)

    # No checkpointer — stateless graph, we manage state ourselves
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

    # ── Strip old SystemMessages so stale [MECHANICS RESOLVED] don't bleed ──
    from langchain_core.messages import SystemMessage as SM
    clean_messages = [
        m for m in state.get("messages", [])
        if not (hasattr(m, "type") and m.type == "system")
    ]
    state["messages"]         = clean_messages + [HumanMessage(content=player_action)]
    state["active_character"] = active_character   # who acts NEXT
    state["acting_character"] = active_character   # who IS acting NOW
    
    all_updates = {}
    async for chunk in graph.astream(state, stream_mode="updates"):
        for node_name, updates in chunk.items():
            if isinstance(updates, dict):
                all_updates.update(updates)
                state.update(updates)

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