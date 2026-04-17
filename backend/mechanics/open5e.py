import re
import httpx
from typing import Optional

OPEN5E_BASE = "https://api.open5e.com/v1"

# Fallback stats for common enemies when API returns wrong monster
FALLBACK_STATS = {
    "shadow wraith":   {"name": "Shadow Wraith",   "hp": 45, "ac": 13, "cr": "5",    "attacks": []},
    "skeleton archer": {"name": "Skeleton Archer",  "hp": 13, "ac": 13, "cr": "0.25", "attacks": []},
    "goblin":          {"name": "Goblin",            "hp": 7,  "ac": 15, "cr": "0.25", "attacks": []},
    "orc":             {"name": "Orc",               "hp": 15, "ac": 13, "cr": "0.5",  "attacks": []},
    "zombie":          {"name": "Zombie",            "hp": 22, "ac": 8,  "cr": "0.25", "attacks": []},
    "skeleton":        {"name": "Skeleton",          "hp": 13, "ac": 13, "cr": "0.25", "attacks": []},
    "wraith":          {"name": "Wraith",            "hp": 67, "ac": 13, "cr": "5",    "attacks": []},
}


def fetch_monster_sync(name: str) -> Optional[dict]:
    """
    Fetch monster stats from Open5e. Falls back to FALLBACK_STATS if:
    - API is unreachable
    - API returns a non-matching monster (fuzzy match gone wrong)
    """
    name_lower = name.lower().strip()
    fallback = FALLBACK_STATS.get(name_lower)

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{OPEN5E_BASE}/monsters/", params={"search": name, "limit": 1})
            resp.raise_for_status()
            data = resp.json()

        if not data["results"]:
            print(f"[open5e] no results for '{name}', using fallback")
            return fallback

        m = data["results"][0]
        returned_name = m["name"].lower()

        # Reject fuzzy matches — returned name must contain at least one word from the query
        query_words = set(name_lower.split())
        match_words = set(returned_name.split())
        if not query_words & match_words:
            print(f"[open5e] fuzzy mismatch: asked '{name}', got '{m['name']}' — using fallback")
            return fallback

        result = {
            "name": m["name"],
            "hp": m["hit_points"],
            "ac": m["armor_class"],
            "cr": m["challenge_rating"],
            "attacks": _parse_attacks(m),
        }
        print(f"[open5e] ✓ {result['name']}: AC {result['ac']}, HP {result['hp']}, CR {result['cr']}")
        return result

    except Exception as e:
        print(f"[open5e] API error ({type(e).__name__}: {e}), using fallback for '{name}'")
        return fallback


async def fetch_spell(name: str) -> Optional[dict]:
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{OPEN5E_BASE}/spells/", params={"search": name, "limit": 1})
        resp.raise_for_status()
        data = resp.json()

    if not data["results"]:
        return None

    s = data["results"][0]
    return {
        "name": s["name"],
        "level": s["level_int"],
        "damage": s.get("damage", {}).get("damage_dice", ""),
        "dc_type": s.get("dc", {}).get("dc_type", {}).get("name", ""),
        "description": s.get("desc", "")[:300],
    }


def _parse_attacks(monster: dict) -> list[dict]:
    attacks = []
    for action in monster.get("actions", []):
        desc = action.get("desc", "").lower()
        bonus_match = re.search(r"\+(\d+) to hit", desc)
        damage_match = re.search(r"\((.+?)\)", desc)
        if bonus_match and damage_match:
            attacks.append({
                "name": action.get("name", "Attack"),
                "attack_bonus": int(bonus_match.group(1)),
                "damage_expression": damage_match.group(1),
            })
    return attacks[:2]