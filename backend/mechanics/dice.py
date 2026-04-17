import random
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class RollResult:
    expression: str
    rolls: list[int]
    modifier: int
    total: int
    critical_hit: bool = False
    critical_miss: bool = False

def roll_dice(expression: str) -> RollResult:
    """Parse and roll expressions like '1d20+5', '2d6', '1d8-1'"""
    pattern = r'^(\d+)d(\d+)([+-]\d+)?$'
    match = re.match(pattern, expression.lower().replace(' ', ''))
    if not match:
        raise ValueError(f"Invalid dice expression: {expression}")
    
    num_dice = int(match.group(1))
    die_size = int(match.group(2))
    modifier = int(match.group(3)) if match.group(3) else 0
    
    rolls = [random.randint(1, die_size) for _ in range(num_dice)]
    total = sum(rolls) + modifier
    
    return RollResult(
        expression=expression,
        rolls=rolls,
        modifier=modifier,
        total=total,
        critical_hit=(num_dice == 1 and die_size == 20 and rolls[0] == 20),
        critical_miss=(num_dice == 1 and die_size == 20 and rolls[0] == 1),
    )

def resolve_attack(
    attack_bonus: int,
    target_ac: int,
    damage_expression: str,
    crit_damage_expression: Optional[str] = None,
) -> dict:
    if not damage_expression:
        damage_expression = "1d6+2"  # safe fallback
    if not crit_damage_expression:
        crit_damage_expression = damage_expression

    attack_roll = roll_dice(f"1d20+{attack_bonus}")
    hit = attack_roll.critical_hit or (
        not attack_roll.critical_miss and attack_roll.total >= target_ac
    )

    result = {
        "attack_roll": attack_roll.total,
        "attack_dice": attack_roll.rolls,
        "attack_modifier": attack_bonus,
        "target_ac": target_ac,
        "hit": hit,
        "critical_hit": attack_roll.critical_hit,
        "critical_miss": attack_roll.critical_miss,
        "damage": None,
        "damage_rolls": None,
        "damage_expression": None,
    }

    if hit:
        expr = crit_damage_expression if attack_roll.critical_hit else damage_expression
        dmg = roll_dice(expr)
        result["damage"] = dmg.total
        result["damage_rolls"] = dmg.rolls
        result["damage_expression"] = expr

    return result