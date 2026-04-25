from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.graph import build_graph, run_turn, reset_session as reset_graph_session
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
_active_sessions: set = set()  # guard against double session start


@app.on_event("startup")
async def startup():
    global _graph
    print("[startup] building LangGraph (in-memory)…")
    _graph = await build_graph()
    print("[startup] graph ready ✓")


@app.get("/health")
async def health():
    return {"status": "ok", "graph_ready": _graph is not None}


def sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def stream_result(narrative: str, ui_instructions: list):
    async def _stream():
        # Separate mount_component from other instructions
        mount_instructions = [i for i in ui_instructions if i.get("type") == "mount_component"]
        other_instructions = [i for i in ui_instructions if i.get("type") != "mount_component"]

        # Stream non-mount instructions first (theme, world, stats)
        for instruction in other_instructions:
            if instruction.get("type") in ("combat_log_entry", "combat_log"):
                yield sse({
                    "type":     "combat_log",
                    "text":     instruction.get("text", ""),
                    "log_type": instruction.get("log_type", "system"),
                })
            else:
                yield sse({"type": "ui_instruction", "instruction": instruction})
            await asyncio.sleep(0.05)

        await asyncio.sleep(0.2)

        # Stream narrative BEFORE mounting scene
        if narrative:
            yield sse({
                "type":          "narrative_text",
                "speaker":       "dm",
                "speaker_label": "Dungeon Master",
                "text":          narrative,
            })

        await asyncio.sleep(0.3)

        # Mount scene LAST so it doesn't disrupt narrative rendering
        for instruction in mount_instructions:
            yield sse({"type": "ui_instruction", "instruction": instruction})
            await asyncio.sleep(0.05)

    return _stream()


@app.get("/game/session/start")
async def session_start(session_id: str = Query(default="player_one")):
    print(f"[session_start] ENDPOINT HIT — session_id={session_id}")

    async def stream():
        # ── Guard against double-fire ─────────────────────
        if session_id in _active_sessions:
            print(f"[session_start] duplicate request ignored for {session_id}")
            yield sse({"type": "stream_end"})
            return

        _active_sessions.add(session_id)
        print(f"[session_start] called for session_id={session_id}")
        yield sse({"type": "stream_start"})

        try:
            loop   = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    None, lambda: generate_opening(session_id)
                ),
                timeout=120.0,
            )

            narrative       = result.get("narrative", "")
            ui_instructions = result.get("ui_instructions", [])

            print(f"[session_start] opening ready — {len(ui_instructions)} instructions, "
                  f"narrative={len(narrative)} chars")

            yield sse({"type": "session_type", "is_new": True})
            yield sse({"type": "turn_change",  "active_character": "vex"})

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

            print(f"[session_start] stream complete")

        except asyncio.TimeoutError:
            print(f"[session_start] timeout after 120s — using fallback narrative")
            yield sse({
                "type":          "narrative_text",
                "speaker":       "dm",
                "speaker_label": "Dungeon Master",
                "text": (
                    "Cold air presses down as your boots scrape over cracked flagstone. "
                    "The vault ahead exhales a breath of old death — somewhere in the dark, "
                    "something shifts. Your torches barely reach the walls. "
                    "The silence has weight. You grip your weapons and step forward."
                ),
            })
        except Exception:
            tb = traceback.format_exc()
            print(f"[session_start] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        finally:
            _active_sessions.discard(session_id)

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
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

            if active_character:
                yield sse({"type": "turn_change", "active_character": active_character})

            async for chunk in stream_result(narrative, ui_instructions):
                yield chunk

            if current_turn:
                yield sse({"type": "turn_change", "active_character": current_turn})

        except Exception:
            tb = traceback.format_exc()
            print(f"[game_action] error:\n{tb}")
            yield sse({"type": "error", "message": tb})

        yield sse({"type": "stream_end"})

    return StreamingResponse(
        stream(), media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )


@app.delete("/game/session/{session_id}")
async def reset_session_endpoint(session_id: str):
    reset_graph_session(session_id)
    _active_sessions.discard(session_id)  # clear lock on reset
    print(f"[reset_session] cleared session {session_id}")
    return {"status": "cleared", "session_id": session_id}