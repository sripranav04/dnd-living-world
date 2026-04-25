import random
import re
from dataclasses import dataclass, field
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
    player_d20: Optional[int] = None,       # player-supplied physical die roll
) -> dict:
    """
    Resolve an attack roll + damage roll.

    If player_d20 is provided (1-20), that value is used as the d20 result
    instead of rolling randomly. The attack_bonus is still added on top.
    Critical hit/miss is determined by the raw d20 value (20 / 1).
    """
    if not damage_expression:
        damage_expression = "1d6+2"
    if not crit_damage_expression:
        crit_damage_expression = damage_expression

    # ── Attack roll ───────────────────────────────────────
    if player_d20 is not None:
        # Use the player's physical die result
        raw_d20   = max(1, min(20, player_d20))   # clamp to valid range
        is_crit   = raw_d20 == 20
        is_fumble = raw_d20 == 1
        total     = raw_d20 + attack_bonus
        attack_roll_result = {
            "total":         total,
            "rolls":         [raw_d20],
            "modifier":      attack_bonus,
            "critical_hit":  is_crit,
            "critical_miss": is_fumble,
        }
        hit = is_crit or (not is_fumble and total >= target_ac)
        player_supplied = True
    else:
        attack_roll = roll_dice(f"1d20+{attack_bonus}")
        attack_roll_result = {
            "total":         attack_roll.total,
            "rolls":         attack_roll.rolls,
            "modifier":      attack_bonus,
            "critical_hit":  attack_roll.critical_hit,
            "critical_miss": attack_roll.critical_miss,
        }
        hit = attack_roll.critical_hit or (
            not attack_roll.critical_miss and attack_roll.total >= target_ac
        )
        player_supplied = False

    result = {
        "attack_roll":          attack_roll_result["total"],
        "attack_dice":          attack_roll_result["rolls"],
        "attack_modifier":      attack_bonus,
        "target_ac":            target_ac,
        "hit":                  hit,
        "critical_hit":         attack_roll_result["critical_hit"],
        "critical_miss":        attack_roll_result["critical_miss"],
        "player_supplied_roll": player_supplied,
        "damage":               None,
        "damage_rolls":         None,
        "damage_expression":    None,
    }

    if hit:
        expr = crit_damage_expression if attack_roll_result["critical_hit"] else damage_expression
        dmg  = roll_dice(expr)
        result["damage"]            = dmg.total
        result["damage_rolls"]      = dmg.rolls
        result["damage_expression"] = expr

    return result