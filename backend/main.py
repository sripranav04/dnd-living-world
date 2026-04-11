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

# ── Opening scene — called when frontend first loads ──────
# Streams: world state, party stats, opening narration
# Frontend calls this on mount before any player input

@app.get("/game/session/start")
async def session_start(session_id: str = Query(default="player_one")):
    async def stream():
        yield sse({"type": "stream_start"})
        try:
            # Run in thread pool so it doesn't block the event loop
            import asyncio
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, generate_opening)

            narrative = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])

            # Send UI instructions first — set the scene before text appears
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

            # Small pause — let UI render before narrative appears
            await asyncio.sleep(0.3)

            # Then stream the narrative
            if narrative:
                yield sse({
                    "type": "narrative_text",
                    "speaker": "dm",
                    "speaker_label": "Dungeon Master",
                    "text": narrative,
                })

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
            result = await run_turn(_graph, action, session_id)
            narrative: str = result.get("narrative", "")
            ui_instructions: list = result.get("ui_instructions", [])

            # UI instructions first — world reacts, then DM narrates
            for instruction in ui_instructions:
                if instruction.get("type") == "combat_log_entry":
                    yield sse({
                        "type": "combat_log",
                        "text": instruction.get("text", ""),
                        "log_type": instruction.get("log_type", "system"),
                    })
                else:
                    yield sse({"type": "ui_instruction", "instruction": instruction})
                await asyncio.sleep(0.02)

            await asyncio.sleep(0.1)

            if narrative:
                yield sse({
                    "type": "narrative_text",
                    "speaker": "dm",
                    "speaker_label": "Dungeon Master",
                    "text": narrative,
                })

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