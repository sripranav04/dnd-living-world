"""
db.py — MongoDB singleton connection pool.
Import get_db() anywhere; the client is created once and reused for the
lifetime of the process. pymongo's MongoClient already manages an internal
connection pool (default maxPoolSize=100), so this module simply ensures
we never open a second client.
"""

import os
import logging
from pymongo import MongoClient
from pymongo.database import Database

log = logging.getLogger("dnd.db")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s — %(message)s",
)

# ── Singleton state ───────────────────────────────────────────────────────────
_client: MongoClient | None = None
_db: Database | None = None


def get_db() -> Database:
    """
    Return the shared MongoDB database handle, creating the client pool on
    first call. Subsequent calls return the cached handle instantly.
    """
    global _client, _db

    if _db is not None:
        return _db

    uri     = os.environ["MONGO_URI"]
    db_name = os.environ.get("MONGO_DB", "dnd_lore")

    log.info("🔌 Opening MongoDB connection pool — uri=%s db=%s", _redact(uri), db_name)

    _client = MongoClient(
        uri,
        maxPoolSize=20,          # plenty for a single-server prototype
        minPoolSize=2,           # keep 2 sockets warm
        serverSelectionTimeoutMS=5_000,
    )

    # Force a real TCP handshake now so we fail fast on bad credentials
    _client.admin.command("ping")
    log.info("✅ MongoDB pool open — server: %s", _client.server_info().get("version", "?"))

    _db = _client[db_name]
    return _db


def get_collection(name: str):
    """Convenience helper: get_collection('facts') → db['facts']."""
    col = get_db()[name]
    log.debug("📂 Collection handle requested: %s", name)
    return col


# ── Logging helpers used by lore.py ──────────────────────────────────────────

def log_append(collection: str, document: dict) -> None:
    """Call after every insert/upsert so the data is visible in the log."""
    preview = {k: v for k, v in document.items() if k not in ("_id",)}
    # Truncate long strings so the log stays readable
    preview = {k: (str(v)[:80] + "…" if isinstance(v, str) and len(str(v)) > 80 else v)
               for k, v in preview.items()}
    log.info("💾 APPEND [%s] %s", collection, preview)


def log_fetch(collection: str, query: dict, result_count: int) -> None:
    """Call after every find() so fetched data is visible in the log."""
    log.info("📖 FETCH  [%s] query=%s → %d document(s) returned", collection, query, result_count)


# ── Internal ──────────────────────────────────────────────────────────────────

def _redact(uri: str) -> str:
    """Hide password in connection string for safe logging."""
    import re
    return re.sub(r"(?<=://)([^:]+):([^@]+)@", r"\1:***@", uri)