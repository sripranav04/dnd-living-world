from typing import Annotated, TypedDict, List, Dict, Optional, Literal
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


class CharacterStats(BaseModel):
    name: str
    hp: int
    max_hp: int
    ac: int
    attack_bonus: int = 4
    damage_expression: str = "1d6+2"
    position: Dict[str, int] = Field(default_factory=lambda: {"x": 0, "y": 0})
    status_effects: List[str] = Field(default_factory=list)
    inventory: List[str] = Field(default_factory=list)


class EncounterState(BaseModel):
    enemy_name: str = ""
    enemy_hp: int = 0
    enemy_max_hp: int = 0
    target_ac: int = 13
    initiative_order: List[str] = Field(default_factory=list)
    current_turn: str = ""
    round_number: int = 1


class WorldState(BaseModel):
    location: str = "The Starting Tavern"
    biome: str = "tavern"
    theme: str = "warm-tavern"
    grid_size: int = 10
    grid_visible: bool = False
    ambient_effects: List[str] = Field(default_factory=list)
    npcs: List[Dict] = Field(default_factory=list)
    in_combat: bool = False
    current_encounter: Optional[EncounterState] = None


class UIInstruction(BaseModel):
    action: Literal[
        "mount_effect", "update_theme", "update_grid",
        "update_stats", "show_dialog",
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
    active_character: str    # who acts NEXT
    acting_character: str    # who is acting NOW (for DM narration)