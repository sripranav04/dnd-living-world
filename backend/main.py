import asyncio
import json
import os
import traceback

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.graph import build_graph, run_turn
from agents.opening_scene import generate_opening
from memory.checkpointer import close_checkpointer

app = FastAPI(title="D&D Living World API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)

_graph = None

@app.on_event("startup")
async def startup():
    global _graph
    print("[startup] building LangGraph + AsyncPostgresSaver…")
    _graph = await build_graph()
    print("[startup] graph ready ✓")

@app.on_event("shutdown")
async def shutdown():
    await close_checkpointer()

@app.get("/health")
async def health():
    return {"status": "ok", "graph_ready": _graph is not None}

def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"

def stream_result(narrative: str, ui_instructions: list):
    """Shared SSE streaming logic — UI instructions first, then narrative."""
    async def _stream():
        for instruction in ui_instructions:
            if instruction.get("type") == "combat_log_entry":
                yield sse({
                    "type": "combat_log",
                    "text": instruction.get("text", ""),
                    "log_type": instruction.get("log_type", "system"),
                })
            else:
                yield sse({"type": "ui_instruction", "instruction": instruction})
            await asyncio.sleep(0.05)

        if ui_instructions:
            await asyncio.sleep(0.25)   # let UI settle before narrative appears

        if narrative:
            yield sse({
                "type": "narrative_text",
                "speaker": "dm",
                "speaker_label": "Dungeon Master",
                "text": narrative,
            })
    return _stream()


# ── Session start ─────────────────────────────────────────
# Called by frontend on mount.
# Detects new vs returning session automatically.

@app.get("/game/session/start")
async def session_start(session_id: str = Query(default="player_one")):
    async def stream():
        yield sse({"type": "stream_start"})
        try:
            loop = asyncio.get_event_loop()
            # Pass session_id so opening_scene can detect new vs returning
            result = await loop.run_in_executor(
                None,
                lambda: generate_opening(session_id),
            )

            narrative       = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])

            # Signal to frontend whether this is a new or returning session
            from memory.session import is_new_session
            is_new = await loop.run_in_executor(None, lambda: is_new_session(session_id))
            yield sse({"type": "session_type", "is_new": is_new})

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

        except Exception:
            tb = traceback.format_exc()
            print(f"[session_start] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ── Player action ─────────────────────────────────────────

@app.get("/game/action")
async def game_action(
    action: str = Query(...),
    session_id: str = Query(default="player_one"),
):
    async def stream():
        yield sse({"type": "stream_start"})
        try:
            result          = await run_turn(_graph, action, session_id)
            narrative       = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

        except Exception:
            tb = traceback.format_exc()
            print(f"[game_action] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ── Session reset (for starting a new campaign) ───────────

@app.delete("/game/session/{session_id}")
async def reset_session(session_id: str):
    """
    Clears Postgres checkpoint for this session_id.
    Next /game/session/start will treat it as a new session.
    """
    try:
        import psycopg
        db_url = os.environ["DATABASE_URL"]
        if "+" in db_url.split("://")[0]:
            db_url = "postgresql://" + db_url.split("://", 1)[1]

        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM checkpoints WHERE thread_id = %s", (session_id,))
                cur.execute("DELETE FROM checkpoint_writes WHERE thread_id = %s", (session_id,))
                deleted = cur.rowcount

        print(f"[reset_session] cleared session {session_id} ({deleted} records)")
        return {"status": "cleared", "session_id": session_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}