# ⚔ D&D Living World

> *An agentic D&D game engine where the AI doesn't just narrate — it writes the UI.*

[![Azure](https://img.shields.io/badge/Azure-Container%20Apps-0078D4?logo=microsoftazure)](https://azure.microsoft.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.5-FF6B35)](https://langchain-ai.github.io/langgraph/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What Is This?

D&D Living World is a full-stack agentic game engine that runs a real Dungeons & Dragons 5e session powered by GPT-5.4. The AI acts as your Dungeon Master — but it goes far beyond generating text.

Every time a player acts, the system:

1. **Resolves real D&D 5e dice mechanics** — attack rolls, damage, crits, fumbles, turn order, enemy retaliation
2. **Narrates in second person** using exact numbers from the dice engine — no hallucinated rolls
3. **Writes a React TypeScript canvas component** describing the first-person combat scene
4. **Saves that file to disk** — Vite picks it up via Hot Module Replacement
5. **The browser updates instantly** — a new enemy rendered large in the viewport, environment drawn around it

The UI literally evolves as the story does. This is the **vibe coding** paradigm applied to game engines.

---

## Demo

**Live**: https://dnd-living-world.braveriver-d5a37ba2.eastus2.azurecontainerapps.io

> Login required — contact the author for credentials.

### Screenshots

| Opening Scene | Combat | Victory |
|---|---|---|
| First-person dungeon corridor, torches flickering | Skeleton Archer looming large, HP bar depleting | Loot discovered, XP earned, story continues |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  LeftPanel   │    │  MapViewport │    │  RightPanel   │  │
│  │  (party HP)  │    │  (canvas)    │    │  (combat log) │  │
│  └──────────────┘    └──────────────┘    └───────────────┘  │
│          │                  │  ▲                │            │
│          └──────────────────┼──┼────────────────┘            │
│                             │  │                             │
│                    Zustand Store                             │
│                    applyUIInstruction()                      │
│                             │  ▲                             │
│              useGameStream.ts (SSE client)                   │
└─────────────────────────────┼──┼─────────────────────────────┘
                              │  │ Server-Sent Events
┌─────────────────────────────▼──┴─────────────────────────────┐
│                      FastAPI (port 8000)                      │
│                                                              │
│              LangGraph StateGraph                            │
│         ┌──────────────────────────┐                        │
│         │                          │                        │
│    ┌────▼────┐  ┌────────┐  ┌─────▼──────┐  ┌──────────┐  │
│    │mechanics│→ │  dm    │→ │   lore     │→ │  vibe    │  │
│    │  _node  │  │ _agent │  │  _agent    │  │architect │  │
│    └─────────┘  └────────┘  └────────────┘  └──────────┘  │
│         │            │            │               │         │
│    dice/turns   narrative     MongoDB          writes       │
│    Open5e API   UI instrs     facts+logs       .tsx file    │
└──────────────────────────────────────────────────┼──────────┘
                                                   │
                                          /app/frontend/src/
                                          components/dynamic/
                                                   │
                                            Vite HMR ◄────┘
                                            browser updates
```

---

## Core Innovation: Vibe Coding

The standout feature of this project is that **the AI writes its own frontend**.

When a player attacks, the Vibe Architect agent:

```python
# vibe_architect.py
code = generate_scene_component(
    scene_name="DungeonCombatScene",
    world=world,           # theme, location, inCombat
    acting_character="vex",
    party=party,
    action_type="attack",
    dm_narrative=narrative # what the DM just said
)
validate_and_write_component("DungeonCombatScene", code)
# → writes /app/frontend/src/components/dynamic/DungeonCombatScene.tsx
```

Vite's file watcher picks up the change and pushes it to the browser via HMR websocket. The canvas scene re-renders in under a second — no page refresh, no build step.

The generated components are full React TypeScript canvas animations:
- First-person perspective — enemy fills 50-65% of screen height
- Idle breathing, attack scaling, recoil stagger animations
- CSS variable theming (dark-gothic / bright-forest / warm-tavern)
- Character-class-specific weapon hands at bottom of frame

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + TypeScript | UI components |
| State | Zustand | Client-side game state |
| Build | Vite 8 (dev server) | HMR for dynamic components |
| Backend | FastAPI + uvicorn | SSE endpoint, session routing |
| Agent Framework | LangGraph StateGraph | Multi-agent orchestration |
| LLM | Azure OpenAI GPT-5.4 | Narration + code generation |
| Database | MongoDB Atlas (Cosmos) | Lore facts + combat logs |
| Container | Docker (single container) | Nginx + Vite + uvicorn |
| Hosting | Azure Container Apps | Serverless, scales to zero |
| Registry | Azure Container Registry | Image storage |

---

## Agents

### 🎲 Dungeon Master (`dm_agent.py`)

The narrative brain of the system. GPT-5.4 receives full game context — party HP, current location, enemy stats, initiative order, and the last 15 world facts from MongoDB — and returns structured JSON:

```json
{
  "narrative": "You surge through the stale dark, your sword biting into bone...",
  "ui_instructions": [
    { "type": "update_theme", "theme": "dark-gothic" },
    { "type": "update_world", "world": { "inCombat": true, "enemyName": "Skeleton Archer", "enemyHp": 6 }},
    { "type": "update_stats", "party": [{ "id": "vex", "hp": 29 }] },
    { "type": "combat_log_entry", "text": "Vex attacks: roll 21 vs AC 13, hit for 7 damage.", "log_type": "attack" },
    { "type": "screen_shake" }
  ]
}
```

Key behaviours:
- Narrates using **exact dice numbers** from the mechanics engine — never invents rolls
- Matches action type to narration style (spell → arcane, attack → physical)
- Applies world patches to in-memory state immediately so downstream agents see correct data
- Saves every turn to MongoDB `combat_logs` collection

### 🏗 Vibe Architect (`vibe_architect.py`)

Code-generation agent that writes React canvas components. Uses GPT-5.4 in code mode (8192 token limit, lower temperature).

Scene routing:
```
dark-gothic + inCombat  → DungeonCombatScene.tsx
dark-gothic + explore   → DungeonScene.tsx
bright-forest + combat  → ForestCombatScene.tsx
bright-forest + explore → ForestScene.tsx
warm-tavern             → TavernScene.tsx
```

Enemy visual hints ensure consistency:
```python
ENEMY_VISUAL_HINTS = {
    "shadow wraith":   "tall floating dark silhouette, wispy tail, glowing red eyes, 5 curved tendrils",
    "skeleton archer": "thin bony figure, visible ribcage, skull head, longbow drawn, arrow nocked",
    "goblin":          "small hunched creature, large ears, jagged knife, crouched ready to pounce",
    "zombie":          "shambling figure, arms outstretched, torn flesh, milky white eyes",
}
```

Validation before writing:
- Brace/paren balance check
- `export default` present
- `import React` present
- Minimum 500 characters
- No dangerous patterns (`eval`, `process.env`, etc.)

### 📚 Lore Agent (`lore_agent.py`)

Memory extraction agent. Reads the last player action + DM response and extracts significant world facts:

```json
[
  { "type": "location", "name": "Blackthorn Reliquary", "summary": "Ancient crypt beneath a collapsed barrow, ash-covered stones." },
  { "type": "enemy",    "name": "Skeleton Archer",       "summary": "Defeated in the main chamber, bow still clutched." },
  { "type": "event",    "name": "First Blood",           "summary": "Vex landed the opening strike for 7 damage." }
]
```

Saved to MongoDB, loaded back into the DM's system prompt as `WORLD MEMORY` — ensuring the story stays consistent across an entire session.

### ⚔ Mechanics Engine (`mechanics_node.py`)

Pure Python D&D 5e combat resolver. No LLM involved — deterministic dice math.

Features:
- **Attack resolution**: `1d20 + attack_bonus vs target_ac` with crit (natural 20) and fumble (natural 1) detection
- **Player dice injection**: Type `[rolled 15 on d20]` to use your physical die — backend uses your roll + modifier
- **Turn order**: Fixed initiative `vex → aldric → lyra → thane → enemy retaliates → repeat`
- **Enemy retaliation**: Fires automatically at end of each full round against a random living party member
- **Open5e integration**: Looks up real monster stats from the Open5e API with fallback stat blocks

```python
# Player can supply their own physical die roll
player_roll = _extract_player_roll(last_message)  # parses [rolled X on d20]
resolution = resolve_attack(
    attack_bonus=attack_bonus,
    target_ac=target_ac,
    damage_expression=damage_expr,
    player_d20=player_roll,   # None = backend rolls randomly
)
```

### 🗺 Opening Scene (`opening_scene.py`)

Session initialiser. On every new session:
1. GPT-5.4 generates a unique location name, picks a monster that fits the setting, writes a cinematic opening narrative
2. Sets in-memory state with correct monster stats, theme, and location
3. Wipes MongoDB clean so no facts from previous sessions bleed in
4. Generates the opening canvas scene via vibe_architect

---

## D&D Mechanics

### Party Roster

| Character | Class | Race | HP | AC | Attack | Damage |
|---|---|---|---|---|---|---|
| **Vex Shadowstep** | Rogue | Tiefling | 36 | 15 | +6 | 1d6+3 |
| **Aldric Stonehaven** | Fighter | Human | 54 | 18 | +7 | 1d8+4 |
| **Lyra Moonwhisper** | Wizard | Elf | 35 | 13 | +6 | 1d6+3 |
| **Brother Thane** | Cleric | Dwarf | 45 | 16 | +5 | 1d8+3 |

### Monster Roster

| Monster | HP | AC | Attack | Damage | Setting |
|---|---|---|---|---|---|
| **Shadow Wraith** | 45 | 13 | +6 | 2d6+3 | Dungeons, crypts |
| **Skeleton Archer** | 13 | 13 | +4 | 1d6+2 | Ruins, tombs |
| **Goblin** | 7 | 15 | +4 | 1d6+2 | Forests, wilderness |
| **Zombie** | 22 | 8 | +3 | 1d6+1 | Swamps, graveyards |

### Combat Flow

```
Player types action
       ↓
mechanics_node resolves dice
       ↓
dm_node narrates + emits UI instructions
       ↓
lore_node saves facts to MongoDB
       ↓
vibe_architect writes scene .tsx
       ↓
Vite HMR → browser updates
       ↓
[after Thane acts] → enemy retaliates → round advances
```

---

## Database Schema

### MongoDB Atlas — `dnd_lore`

**Collection: `facts`**
```
session_id  : string          — "player_one"
type        : string          — location | npc | event | enemy | item
name        : string          — "Blackthorn Reliquary"
summary     : string          — "Ancient crypt, ash-covered flagstones..."
updated_at  : datetime
```
Upserted by `(session_id, type, name)`. Cleared on new session.

**Collection: `combat_logs`**
```
session_id       : string
turn             : int
round            : int
acting_character : string     — "vex"
player_action    : string     — "I attack the skeleton archer"
narrative        : string     — DM response text
mechanics        : object     — { raw: "[MECHANICS RESOLVED...]" }
enemy_retaliation: string     — "Skeleton Archer uses Shortbow..."
combat_end       : string     — null | "victory" | "defeat"
timestamp        : datetime
```
Inserted every turn. Cleared on new session.

---

## Frontend Architecture

### SSE Stream (`useGameStream.ts`)

The frontend connects to `/game/session/start` via Server-Sent Events. Each event is a JSON UI instruction dispatched to the Zustand store:

```typescript
// Every SSE event goes through this dispatcher
store.applyUIInstruction(instruction)

// Which routes to the right state update:
case 'update_world':   store.setWorld(patch)
case 'update_stats':   store.updateCharacter(id, updates)
case 'update_theme':   store.setTheme(theme)
case 'mount_component': store.mountComponent(slot, componentName)
case 'combat_log_entry': store.appendLog(text, type)
case 'update_session': store.updateSessionStats(stats)
case 'screen_shake':   store.triggerShake()
case 'spell_effect':   store.triggerSpellFx(x, y, color)
```

### Dynamic Slot System (`DynamicSlot.tsx`)

The map viewport uses a slot system. The backend emits `mount_component` instructions:

```json
{ "type": "mount_component", "slot": "map-scene", "componentName": "DungeonCombatScene" }
```

`DynamicSlot.tsx` dynamically imports the component:
```typescript
const module = await import(`/src/components/dynamic/${componentName}.tsx`)
```

Because Vite is running in dev mode, this import resolves to the live file on disk. When the file changes, HMR pushes the update automatically.

### Theme System

Three biomes applied as `data-theme` CSS attributes on the root element:

| Theme | Trigger | CSS Palette |
|---|---|---|
| `dark-gothic` | Dungeons, crypts, undead | Deep blacks, gold accents, red danger |
| `bright-forest` | Forests, nature, outdoors | Dark greens, firefly glows |
| `warm-tavern` | Towns, inns, civilised areas | Warm ambers, wood tones |

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 20+
- MongoDB Atlas account (free tier works)
- Azure OpenAI deployment with GPT-5.4

### Setup

```bash
# Clone
git clone https://github.com/yourusername/dnd-living-world
cd dnd-living-world

# Copy environment template
cp .env.example .env
# Fill in your Azure OpenAI + MongoDB credentials
```

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Deploying to Azure

### Prerequisites

- Azure CLI installed and logged in
- Docker Desktop running
- Azure Container Registry created (`dndworldacr`)
- Azure Container Apps environment created

### Build and Push

```bash
# Login to registry
docker login dndworldacr.azurecr.io

# Build for linux/amd64 and push directly
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --output type=registry \
  -t dndworldacr.azurecr.io/dnd-living-world:latest .
```

### Deploy

```bash
# Force Container App to pull latest image
az containerapp update \
  --name dnd-living-world \
  --resource-group ODL-Cognizant-Hackathon-2173792-01 \
  --image dndworldacr.azurecr.io/dnd-living-world:latest
```

### Environment Variables (Azure Container App)

| Variable | Value |
|---|---|
| `LLM_PROVIDER` | `azure` |
| `APP_ENV` | `prod` |
| `AZURE_OPENAI_API_KEY` | Your key |
| `AZURE_OPENAI_ENDPOINT` | Your end point |
| `AZURE_OPENAI_API_VERSION` | `2025-04-01-preview` |
| `AZURE_DEPLOYMENT_DEV` | `gpt-5.4` |
| `AZURE_DEPLOYMENT_PROD` | `gpt-5.4` |
| `LLM_TEMPERATURE` | `0.8` |
| `LLM_MAX_TOKENS` | `2048` |
| `LLM_MAX_TOKENS_CODE` | `8192` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `MONGO_DB` | `dnd_lore` |
| `SESSION_ID` | `player_one` |
| `CORS_ORIGIN` | `*` |
| `VITE_API_URL` | *(empty — same origin via nginx)* |
| `DYNAMIC_COMPONENTS_PATH` | `/app/frontend/src/components/dynamic` |

### Container Architecture

Single container running three processes via supervisord:

```
Port 80  →  nginx
              ├── /game/*  →  uvicorn (port 8000)  FastAPI backend
              └── /*       →  Vite dev server (port 5173)  React frontend
                                    ↑
                             HMR websocket (wss:// clientPort 443)
```

---

## How HMR Works in Production

Running Vite's dev server in production is intentional — it's what makes the dynamic component system work.

When the vibe architect writes a new `.tsx` file:
1. Vite's file watcher (inotify on Linux) detects the change
2. Vite compiles the component in memory
3. HMR websocket message sent to all connected browsers
4. Browser hot-swaps the component without a page refresh
5. The new canvas scene renders instantly

The nginx configuration proxies the HMR websocket correctly:
```nginx
location / {
    proxy_pass http://127.0.0.1:5173/;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
}
```

And Vite is configured to reconnect HMR through the HTTPS reverse proxy:
```typescript
hmr: {
  clientPort: 443,
  protocol: 'wss',
}
```

---

## Project Decisions

| Decision | Reason |
|---|---|
| Vite dev server in production | Required for HMR-based dynamic component loading |
| In-memory session state | Simplicity for prototype — sessions reset on server restart |
| Single `session_id = "player_one"` | Single-user prototype, not multi-tenant |
| Fixed 4-character party | Avoids character selection complexity, focuses on combat loop |
| MongoDB only (no Postgres) | Removed Postgres checkpointer — pure in-memory LangGraph state |
| Single container | Cost management — one Container App, scales to zero when idle |

---

## Known Limitations

- **Single user** — one active session at a time (`player_one`)
- **Session resets on server restart** — in-memory state only
- **DM occasionally introduces wrong enemy names** — lore bleed mitigated by clearing MongoDB on new session
- **Open5e fuzzy matching** — sometimes returns wrong monster; fallback stat blocks handle this
- **No typewriter effect** — narrative appears all at once (planned)
- **No A2A mechanics container** — mechanics run in-process (planned)

---

## Roadmap

- [ ] Extract mechanics to A2A microservice (port 9001)
- [ ] VibeValidator second-pass quality check
- [ ] Multiple concurrent sessions (multi-user)
- [ ] Character selection screen
- [ ] Session persistence across server restarts
- [ ] More monsters and biomes
- [ ] Spell system with actual spell effects

---

## Inspiration

This project explores the **agentic UI** paradigm — where AI doesn't just generate content but generates *interface*. The vibe coding concept (AI writes its own React components) is the architectural centrepiece, enabled by Vite's HMR system used in an unconventional production context.

Built for the Cognizant AI Hackathon 2026.

---

## License

MIT — see [LICENSE](LICENSE)

---

*"The dungeon breathes. The UI evolves. The AI remembers."*