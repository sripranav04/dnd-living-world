from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import asyncio, json, os

load_dotenv(dotenv_path="../.env")

app = FastAPI(title="D&D Living World API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/game/action")
async def game_action(session_id: str, player_input: str):
    async def stream():
        events = [
            {"type": "narrative", "text": f"You said: '{player_input}'. The tavern grows quiet..."},
            {"type": "narrative", "text": "A hooded figure in the corner looks up from their drink."},
            {"type": "ui_update", "action": "mount_effect", "slot": "game-canvas",
             "component": "EnvironmentBanner",
             "payload": {"name": "The Rusty Flagon", "description": "A dimly lit tavern on the edge of town."}},
            {"type": "done"},
        ]
        for event in events:
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(0.8)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
