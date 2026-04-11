import os
import warnings
from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

_pool = None
_checkpointer = None

async def get_checkpointer() -> AsyncPostgresSaver:
    global _pool, _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    db_url = os.environ["DATABASE_URL"]
    if "+" in db_url.split("://")[0]:
        db_url = "postgresql://" + db_url.split("://", 1)[1]
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Suppress the deprecation warning — we call open() explicitly below
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        _pool = AsyncConnectionPool(
            conninfo=db_url,
            max_size=10,
            open=False,                          # don't open in constructor
            kwargs={"autocommit": True, "prepare_threshold": 0},
        )

    await _pool.open()                           # open explicitly — no warning
    print(f"[checkpointer] connection pool open (max_size=10)")

    _checkpointer = AsyncPostgresSaver(_pool)
    await _checkpointer.setup()
    return _checkpointer


async def close_checkpointer():
    """Call on app shutdown to cleanly close the pool."""
    global _pool, _checkpointer
    if _pool is not None:
        await _pool.close()
        print("[checkpointer] connection pool closed")
    _pool = None
    _checkpointer = None