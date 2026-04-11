from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage

from state import AgentState
from agents.dm_agent import dm_node
from memory.checkpointer import get_checkpointer

async def build_graph():
    checkpointer = await get_checkpointer()

    builder = StateGraph(AgentState)
    builder.add_node("dm", dm_node)
    builder.set_entry_point("dm")
    builder.add_edge("dm", END)

    return builder.compile(checkpointer=checkpointer)

async def run_turn(graph, player_action: str, session_id: str) -> dict:
    config = {"configurable": {"thread_id": session_id}}
    input_state = {
        "messages": [HumanMessage(content=player_action)],
        "party": {},
        "world": {},
        "ui_queue": [],
        "narrative_history": [],
        "turn_count": 0,
        "session_summary": "",
        "next_agent": "dm",
        "session_id": session_id,
    }

    all_updates = {}
    async for chunk in graph.astream(input_state, config=config, stream_mode="updates"):
        for node_name, updates in chunk.items():
            if isinstance(updates, dict):
                all_updates.update(updates)

    # narrative and ui_instructions are stored in ui_queue / narrative_history
    # Extract the last DM line from narrative_history as the narrative text
    history = all_updates.get("narrative_history", [])
    narrative = ""
    for entry in reversed(history):
        if entry.startswith("DM: "):
            narrative = entry[4:]
            break

    # ui_queue holds the ui_instructions the dm_node wanted to emit
    ui_instructions = all_updates.get("ui_queue", [])

    return {
        "narrative": narrative,
        "ui_instructions": ui_instructions,
    }