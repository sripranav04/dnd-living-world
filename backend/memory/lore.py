import os
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING
from pymongo.collection import Collection


def _get_collection() -> Collection:
    client = MongoClient(os.environ["MONGO_URI"])
    db = client[os.environ.get("MONGO_DB", "dnd_lore")]
    return db["facts"]


def save_facts(session_id: str, facts: list[dict]) -> None:
    col = _get_collection()
    now = datetime.now(timezone.utc)
    for fact in facts:
        col.update_one(
            {"session_id": session_id, "type": fact["type"], "name": fact["name"]},
            {"$set": {**fact, "session_id": session_id, "updated_at": now}},
            upsert=True,
        )
    print(f"[lore] saved {len(facts)} facts for session {session_id}")


def load_facts(session_id: str, limit: int = 20) -> list[dict]:
    """Load the most recent facts for a session, sorted by last updated."""
    try:
        col = _get_collection()
        cursor = col.find(
            {"session_id": session_id},
            {"_id": 0, "type": 1, "name": 1, "summary": 1},
        ).sort("updated_at", ASCENDING).limit(limit)
        facts = list(cursor)
        print(f"[lore] loaded {len(facts)} facts for session {session_id}")
        return facts
    except Exception as e:
        print(f"[lore] load_facts failed ({e}), returning empty")
        return []


def format_facts_for_prompt(facts: list[dict]) -> str:
    """Formats lore facts into a readable block for the DM system prompt."""
    if not facts:
        return ""
    by_type = {}
    for f in facts:
        by_type.setdefault(f["type"], []).append(f)
    lines = []
    for ftype, items in by_type.items():
        lines.append(f"{ftype.upper()}S:")
        for item in items:
            lines.append(f"  - {item['name']}: {item['summary']}")
    return "\n".join(lines)