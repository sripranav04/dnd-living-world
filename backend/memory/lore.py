import os
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection


def _get_db():
    client = MongoClient(os.environ["MONGO_URI"])
    return client[os.environ.get("MONGO_DB", "dnd_lore")]


def _facts_col() -> Collection:
    return _get_db()["facts"]


def _logs_col() -> Collection:
    return _get_db()["combat_logs"]


# ── Session wipe ──────────────────────────────────────────

def clear_session(session_id: str) -> None:
    """Delete ALL data for this session — facts + combat logs. Call on new session start."""
    try:
        db = _get_db()
        facts_deleted = db["facts"].delete_many({"session_id": session_id}).deleted_count
        logs_deleted  = db["combat_logs"].delete_many({"session_id": session_id}).deleted_count
        print(f"[lore] cleared session {session_id} — {facts_deleted} facts, {logs_deleted} logs deleted")
    except Exception as e:
        print(f"[lore] clear_session failed ({e})")


# ── Lore facts ────────────────────────────────────────────

def save_facts(session_id: str, facts: list[dict]) -> None:
    col = _facts_col()
    now = datetime.now(timezone.utc)
    for fact in facts:
        col.update_one(
            {"session_id": session_id, "type": fact["type"], "name": fact["name"]},
            {"$set": {**fact, "session_id": session_id, "updated_at": now}},
            upsert=True,
        )
    print(f"[lore] saved {len(facts)} facts for session {session_id}")


def load_facts(session_id: str, limit: int = 20) -> list[dict]:
    try:
        col = _facts_col()
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


# ── Combat logs ───────────────────────────────────────────

def save_combat_log(
    session_id: str,
    turn: int,
    round_num: int,
    acting_character: str,
    player_action: str,
    narrative: str,
    mechanics: dict | None = None,
    enemy_retaliation: str | None = None,
    combat_end: str | None = None,
) -> None:
    """Save one turn's worth of combat data to MongoDB."""
    try:
        col = _logs_col()
        doc = {
            "session_id":        session_id,
            "turn":              turn,
            "round":             round_num,
            "acting_character":  acting_character,
            "player_action":     player_action,
            "narrative":         narrative,
            "mechanics":         mechanics or {},
            "enemy_retaliation": enemy_retaliation,
            "combat_end":        combat_end,
            "timestamp":         datetime.now(timezone.utc),
        }
        col.insert_one(doc)
        print(f"[lore] combat log saved — turn {turn}, round {round_num}, char={acting_character}")
    except Exception as e:
        print(f"[lore] save_combat_log failed ({e})")


def load_combat_logs(session_id: str, limit: int = 50) -> list[dict]:
    """Load combat logs for a session, ordered oldest first."""
    try:
        col = _logs_col()
        cursor = col.find(
            {"session_id": session_id},
            {"_id": 0, "session_id": 0},
        ).sort("turn", ASCENDING).limit(limit)
        logs = list(cursor)
        print(f"[lore] loaded {len(logs)} combat logs for session {session_id}")
        return logs
    except Exception as e:
        print(f"[lore] load_combat_logs failed ({e}), returning empty")
        return []