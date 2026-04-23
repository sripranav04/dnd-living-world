# memory/session.py — in-memory session tracking, no Postgres needed

# memory/session.py — stub, not used in prototype
def is_new_session(session_id: str) -> bool:
    return True

def get_session_history(session_id: str, last_n: int = 8) -> list[str]:
    return []

def save_session_history(session_id: str, history: list[str]) -> None:
    pass

def clear_session(session_id: str) -> None:
    pass

def get_session_turn_count(session_id: str) -> int:
    return 0