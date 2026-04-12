"""
session.py — Session detection and history retrieval.

Checks Postgres checkpointer to determine:
  - is_new_session: no prior turns exist for this session_id
  - get_session_history: returns last N narrative entries from checkpoint
"""

import os
from typing import Optional
import psycopg


def _get_conn_string() -> str:
    db_url = os.environ["DATABASE_URL"]
    if "+" in db_url.split("://")[0]:
        db_url = "postgresql://" + db_url.split("://", 1)[1]
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return db_url


def is_new_session(session_id: str) -> bool:
    """
    Returns True if no checkpoint exists for this session_id.
    Uses a direct psycopg connection — fast, no LangGraph overhead.
    """
    try:
        conn_str = _get_conn_string()
        with psycopg.connect(conn_str, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COUNT(*) FROM checkpoints
                    WHERE thread_id = %s
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
                count = row[0] if row else 0
                return count == 0
    except Exception as e:
        # If table doesn't exist yet or any error — treat as new session
        print(f"[session] is_new_session check failed ({e}), treating as new")
        return True


def get_session_history(session_id: str, last_n: int = 6) -> list[str]:
    """
    Retrieves the last N narrative_history entries from the most recent
    checkpoint for this session_id. Returns empty list if none found.
    """
    try:
        conn_str = _get_conn_string()
        with psycopg.connect(conn_str, autocommit=True) as conn:
            with conn.cursor() as cur:
                # Get the most recent checkpoint metadata for this thread
                cur.execute(
                    """
                    SELECT metadata FROM checkpoints
                    WHERE thread_id = %s
                    ORDER BY checkpoint_id DESC
                    LIMIT 1
                    """,
                    (session_id,),
                )
                row = cur.fetchone()
                if not row:
                    return []

                # metadata is stored as JSON bytes in langgraph checkpoints
                import json
                metadata = row[0]
                if isinstance(metadata, (bytes, memoryview)):
                    metadata = json.loads(bytes(metadata))
                elif isinstance(metadata, str):
                    metadata = json.loads(metadata)

                # narrative_history is stored in the checkpoint writes
                # Try to get it from the channel_values
                history = metadata.get("channel_values", {}).get("narrative_history", [])
                if history:
                    return history[-last_n:]
                return []

    except Exception as e:
        print(f"[session] get_session_history failed ({e}), returning empty")
        return []


def get_session_turn_count(session_id: str) -> int:
    """Returns the total number of turns played in this session."""
    try:
        conn_str = _get_conn_string()
        with psycopg.connect(conn_str, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM checkpoints WHERE thread_id = %s",
                    (session_id,),
                )
                row = cur.fetchone()
                return row[0] if row else 0
    except Exception:
        return 0