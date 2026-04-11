import os
import json
import re
from langchain_aws import ChatBedrockConverse
from langchain_core.messages import SystemMessage, HumanMessage

OPENING_PROMPT = """You are a Dungeon Master opening a D&D 5e session.
Return ONLY a valid JSON object with this exact structure — no preamble, no markdown:

{
  "narrative": "3-5 sentences. Vivid, present-tense, second-person. Describe what the party SEES and FEELS right now. End with a clear implicit question — what do they do?",
  "ui_instructions": [
    {"type": "update_world", "world": {
      "locationName": "The Vault of Shadows",
      "biome": "Gothic Horror · Underground",
      "description": "A collapsed necromancer's treasury. Bones and scattered coin. The ceiling breathes.",
      "conditions": ["Darkness", "Difficult Terrain", "Unhallowed"],
      "inCombat": true,
      "round": 3
    }},
    {"type": "update_stats", "party": [
      {"id": "aldric", "hp": 42},
      {"id": "lyra", "hp": 19},
      {"id": "thane", "hp": 40},
      {"id": "vex", "hp": 8}
    ]},
    {"type": "combat_log_entry", "text": "— round 3 begins — Aldric's turn —", "log_type": "system"}
  ]
}

The party: Aldric (Fighter, 42/54 HP, active turn), Lyra (Wizard, 19/35 HP, Poisoned),
Thane (Cleric, 40/45 HP), Vex (Rogue, 8/36 HP, Burning).
Enemies: Shadow Wraith (wounded, hovering near east wall), Skeleton Archer (behind rubble).
Tone: gothic horror, tense, cinematic. The party is in danger. Make them feel it."""


def generate_opening() -> dict:
    llm = ChatBedrockConverse(
        model=os.environ["LLM_MODEL_ID"],
        region_name=os.environ["AWS_REGION"],
        temperature=0.9,
        max_tokens=800,
    )

    response = llm.invoke([
        SystemMessage(content=OPENING_PROMPT),
        HumanMessage(content="Open the scene."),
    ])

    raw = response.content.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"```\s*$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {
            "narrative": "The vault is silent save for the distant drip of water. Something moves in the darkness ahead.",
            "ui_instructions": [],
        }