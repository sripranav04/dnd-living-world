from typing import Annotated, TypedDict, List, Dict, Optional, Literal
from langgraph.graph.message import add_messages
from pydantic import BaseModel


class CharacterStats(BaseModel):
    name: str
    hp: int
    max_hp: int
    ac: int
    position: Dict[str, int] = {"x": 0, "y": 0}
    status_effects: List[str] = []
    inventory: List[str] = []


class WorldState(BaseModel):
    location: str = "The Starting Tavern"
    biome: str = "tavern"
    theme: str = "warm-tavern"
    grid_size: int = 10
    grid_visible: bool = False
    ambient_effects: List[str] = []
    npcs: List[Dict] = []
    in_combat: bool = False


class UIInstruction(BaseModel):
    action: Literal[
        "mount_effect",
        "update_theme",
        "update_grid",
        "update_stats",
        "show_dialog",
    ]
    slot: str
    component_name: Optional[str] = None
    payload: Optional[Dict] = None


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    party: Dict[str, dict]
    world: dict
    ui_queue: List[dict]
    narrative_history: List[str]
    turn_count: int
    session_summary: str
    next_agent: str
    session_id: str