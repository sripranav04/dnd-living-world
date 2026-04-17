from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.graph import build_graph, run_turn, reset_session as reset_graph_session, _fresh_state
from agents.opening_scene import generate_opening


import asyncio
import json
import os
import traceback

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")


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


@app.get("/health")
async def health():
    return {"status": "ok", "graph_ready": _graph is not None}

def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"

def stream_result(narrative: str, ui_instructions: list):
    async def _stream():
        for instruction in ui_instructions:
            # Handle both naming variants Haiku might emit
            if instruction.get("type") in ("combat_log_entry", "combat_log"):
                yield sse({
                    "type": "combat_log",
                    "text": instruction.get("text", ""),
                    "log_type": instruction.get("log_type", "system"),
                })
            else:
                yield sse({"type": "ui_instruction", "instruction": instruction})
            await asyncio.sleep(0.05)

        if ui_instructions:
            await asyncio.sleep(0.25)

        if narrative:
            yield sse({
                "type": "narrative_text",
                "speaker": "dm",
                "speaker_label": "Dungeon Master",
                "text": narrative,
            })
    return _stream()


@app.get("/game/session/start")
async def session_start(session_id: str = Query(default="player_one")):
    async def stream():
        yield sse({"type": "stream_start"})
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, lambda: generate_opening(session_id),
            )
            narrative       = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])

            yield sse({"type": "session_type", "is_new": True})

            # Sync turn order — vex goes first
            yield sse({"type": "turn_change", "active_character": "vex"})

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

        except Exception:
            tb = traceback.format_exc()
            print(f"[session_start] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.get("/game/action")
async def game_action(
    action:           str = Query(...),
    session_id:       str = Query(default="player_one"),
    active_character: str = Query(default=""),
):
    async def stream():
        yield sse({"type": "stream_start"})
        try:
            result          = await run_turn(_graph, action, session_id, active_character)
            narrative       = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])
            current_turn    = result.get("current_turn", "")

            # Highlight the ACTING character BEFORE narrative streams
            if active_character:
                yield sse({"type": "turn_change", "active_character": active_character})

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

            # After narrative finishes, advance to NEXT character
            if current_turn:
                yield sse({"type": "turn_change", "active_character": current_turn})

        except Exception:
            tb = traceback.format_exc()
            print(f"[game_action] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

@app.get("/debug/session/{session_id}")
async def debug_session(session_id: str):
    state = await _graph.aget_state({"configurable": {"thread_id": session_id}})
    if not state or not state.values:
        return {"status": "empty", "turn_count": 0, "current_turn": None, "inCombat": None}
    return {
        "status": "exists",
        "turn_count": state.values.get("turn_count", 0),
        "current_turn": state.values.get("world", {}).get("current_encounter", {}).get("current_turn"),
        "inCombat": state.values.get("world", {}).get("inCombat"),
        "initiative_order": state.values.get("world", {}).get("current_encounter", {}).get("initiative_order"),
    }


@app.delete("/game/session/{session_id}")
async def reset_session_endpoint(session_id: str):
    reset_graph_session(session_id)
    print(f"[reset_session] cleared in-memory session {session_id}")
    return {"status": "cleared", "session_id": session_id}