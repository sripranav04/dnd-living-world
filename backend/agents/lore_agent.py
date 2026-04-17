from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from memory.lore import save_facts
import json
import re

LORE_SYSTEM = """You extract world facts from D&D session events.
Return ONLY a JSON array. Each item has exactly:
{"type": "location|npc|event|enemy|item", "name": "string", "summary": "string (1 sentence)"}

Extract only significant facts: named places visited, NPCs met, enemies defeated, 
items found, major events. Skip combat rolls and trivial actions.
If nothing significant happened, return an empty array: []

Return ONLY the JSON array, no preamble, no markdown."""


def lore_node(state: dict) -> dict:
    """Extracts world facts from the latest turn and saves to MongoDB."""
    session_id = state.get("session_id", "unknown")
    narrative_history = state.get("narrative_history", [])

    # Only process the last 2 entries (current turn's player + DM lines)
    if len(narrative_history) < 2:
        return {}

    recent = "\n".join(narrative_history[-2:])

    llm = get_llm()
    response = llm.invoke([
        SystemMessage(content=LORE_SYSTEM),
        HumanMessage(content=recent),
    ])

    raw = response.content.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"```\s*$", "", raw)

    try:
        facts = json.loads(raw)
        if isinstance(facts, list) and facts:
            save_facts(session_id, facts)
    except Exception as e:
        print(f"[lore] parse error: {e} — raw: {raw[:100]}")

    # Lore node doesn't modify state — it's a side-effect node
    return {}