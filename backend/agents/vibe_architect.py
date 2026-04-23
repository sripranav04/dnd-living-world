import os
import re
from pathlib import Path

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

DYNAMIC_COMPONENTS_DIR = Path(
    os.environ.get(
        "DYNAMIC_COMPONENTS_PATH",
        "../frontend/src/components/dynamic"
    )
)


def _infer_class(char_id: str, char: dict) -> str:
    return {
        "aldric": "fighter",
        "lyra":   "wizard",
        "thane":  "cleric",
        "vex":    "rogue",
    }.get(char_id.lower(), "adventurer")


ENEMY_VISUAL_HINTS = {
    "shadow wraith":   "tall floating dark silhouette, wispy tail fading to nothing, large skull head, 5 long curved tendrils for arms, glowing red eyes, no legs",
    "skeleton archer": "thin bony figure, visible ribcage gaps, skull head with hollow eyes, holds a longbow drawn back, arrow nocked, tattered cloth strips hanging from joints",
    "goblin":          "small hunched creature, large ears, wide mouth with jagged teeth, bulging eyes, holds a crude jagged knife, crouched low ready to pounce, green-grey skin tone",
    "orc":             "massive brutish figure, broad shoulders wider than tall, tusks jutting from lower jaw, heavy axe raised overhead, scarred muscular torso, grey-green skin",
    "zombie":          "shambling figure, hunched forward, arms outstretched reaching toward camera, torn flesh, exposed bones at joints, milky white eyes, jaw hanging open, tattered clothes",
}

VIBE_SYSTEM = """You write a React TypeScript canvas component for a D&D game in FIRST-PERSON PERSPECTIVE.
Output ONLY the complete .tsx file. No markdown. Count every { and } before finishing.

FIRST-PERSON PERSPECTIVE RULES:
- The player CANNOT see themselves — no hero character drawn
- The enemy is drawn LARGE, filling center of screen, as if the player is looking AT it
- Enemy takes up 50-65% of screen height — it must feel CLOSE and THREATENING
- Environment wraps around the enemy (walls, floor, ceiling visible at edges)
- A weapon tip or gloved hand is visible at bottom center of screen

ENEMY SIZE AND POSITION:
- Enemy center X: W * 0.5
- Enemy center Y: H * 0.42
- Enemy total height: H * 0.55 minimum
- Use getCSSVar for ALL colors — never hardcode hex

ENVIRONMENT:
- Background: dark stone dungeon — ceiling top, walls left+right, floor bottom
- Floor: perspective lines converging to vanishing point at W*0.5, H*0.45
- Two torch sconces on left and right walls at H*0.3, flickering glow
- Vignette at edges — bg+'77' max opacity, NOT darker
- Enemy shadow on floor below it

ANIMATION — read animState.current:
- idle:   enemy bobs gently — translate Y by Math.sin(t*1.2)*8, subtle breathing scale 1+Math.sin(t*0.8)*0.02
- attack: enemy grows larger using ctx.save/ctx.scale — scale from 1.0 to 1.3 over 350ms
          use: const atkScale = state==='attack' ? 1.0 + Math.sin(t*6)*0.15 : 1.0
          apply: ctx.save(); ctx.translate(W*0.5, H*0.42); ctx.scale(atkScale, atkScale); ctx.translate(-W*0.5, -H*0.42);
          ALSO: red overlay at screen edges — ctx.fillStyle='#ff000022'; ctx.fillRect(0,0,W,H)
          DO NOT draw arrows or text — scale the enemy using ctx.scale only
- recoil: enemy shifts right by 30px, scale drops to 0.85, gold particles spray from center
          use: ctx.save(); ctx.translate(recoilX, 0); ctx.scale(0.85, 0.85) — then draw enemy — then ctx.restore()

COLOR PALETTE — always getCSSVar:
  bg     = getCSSVar('--color-bg-base',        '#08070a')
  accent = getCSSVar('--color-accent-primary', '#c9a227')
  torch  = getCSSVar('--torch-color',          '#f5a623')
  wall   = getCSSVar('--map-wall-color',       '#0e0b07')
  floorC = getCSSVar('--map-floor-color',      '#111009')

ENEMY COLOR RULE — enemies must be VISIBLE against dark background:
- Never use pure black or bg color for enemy body
- Zombie: rotting grey-green '#3a4a2a', exposed bone patches '#c8b89a'
- Skeleton: pale bone white '#d4c9a8' with dark gaps
- Goblin: murky green '#2d4a1e' 
- Orc: grey-green '#3a4a30'
- Wraith: deep purple-blue '#2a1a4a' with bright red eyes
- All enemies: add a subtle radial glow around them so they read against the dark
  const enemyGlow = ctx.createRadialGradient(W*0.5, H*0.42, 0, W*0.5, H*0.42, H*0.35)
  enemyGlow.addColorStop(0, enemyColor+'44')
  enemyGlow.addColorStop(1, enemyColor+'00')
  draw this glow BEFORE drawing the enemy body

EXACT STRUCTURE — copy this verbatim, fill the draw body only:

import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function COMPONENT_NAME() {
  const locationName = useGameStore((s) => s.world.locationName);
  const combatLog    = useGameStore((s) => s.combatLog);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const animState    = useRef<'idle'|'attack'|'recoil'>('idle');
  const prevLen      = useRef(0);
  const impactRef    = useRef(0);

  useEffect(() => {
    if (combatLog.length > prevLen.current) {
      prevLen.current = combatLog.length;
      animState.current = 'attack';
      impactRef.current = 1.0;
      setTimeout(() => { animState.current = 'recoil'; }, 350);
      setTimeout(() => { animState.current = 'idle'; impactRef.current = 0; }, 800);
    }
  }, [combatLog.length]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!W || !H) return;
    const bg     = getCSSVar('--color-bg-base',        '#08070a');
    const accent = getCSSVar('--color-accent-primary', '#c9a227');
    const torch  = getCSSVar('--torch-color',          '#f5a623');
    const wall   = getCSSVar('--map-wall-color',       '#0e0b07');
    const floorC = getCSSVar('--map-floor-color',      '#111009');
    const state  = animState.current;
    if (impactRef.current > 0) impactRef.current = Math.max(0, impactRef.current - 0.022);
    const impact = impactRef.current;
    // DRAW BODY HERE
  }, [locationName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const start = performance.now();
    const loop = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, (now - start) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [draw]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

OUTPUT THE COMPLETE FILE. Count { and } — they must be equal."""


def generate_scene_component(
    scene_name: str,
    world: dict,
    acting_character: str,
    party: dict,
    action_type: str = "explore",
    dm_narrative: str = "",
) -> str:
    llm = get_llm("code")

    encounter  = world.get("current_encounter", {})
    enemy_name = encounter.get("enemy_name", "").lower()
    theme      = world.get("theme", "dark-gothic")
    location   = world.get("locationName", "Unknown")
    in_combat  = world.get("inCombat", False)

    char       = party.get(acting_character, {})
    char_class = _infer_class(acting_character, char)

    enemy_hint = ENEMY_VISUAL_HINTS.get(
        enemy_name,
        "dark menacing creature, large and threatening, fills center of screen"
    )

    narrative_hint = f"\nDM just narrated: '{dm_narrative}'" if dm_narrative else ""

    if in_combat and enemy_name:
        scene_prompt = (
            f"ENEMY TO DRAW: {enemy_name.title()}\n"
            f"ENEMY APPEARANCE: {enemy_hint}\n"
            f"LOCATION: {location}\n"
            f"THEME: {theme}\n"
            f"ACTION: player just used {action_type}\n"
            f"{narrative_hint}\n\n"
            f"Draw this enemy LARGE in first-person view. "
            f"Enemy height must be H*0.55 minimum, centered at W*0.5, H*0.42. "
            f"Show dungeon environment around it — walls, floor perspective, torches. "
            f"idle=float+breathe, attack=scale up toward camera + red edges, "
            f"recoil=stagger back + gold impact particles."
        )
    else:
        scene_prompt = (
            f"LOCATION: {location}\n"
            f"THEME: {theme}\n"
            f"Exploration scene — no enemy. First-person dungeon corridor. "
            f"Walls converge to vanishing point center, torchlit, mist, dust. "
            f"A distant shadow barely visible ahead."
        )

    system_with_name = VIBE_SYSTEM.replace("COMPONENT_NAME", scene_name)

    print(f"[vibe_architect] generating {scene_name} | enemy={enemy_name or 'none'} | char={char_class}")
    for attempt in range(2):
        response = llm.invoke([
            SystemMessage(content=system_with_name),
            HumanMessage(content=scene_prompt),
        ])

        code = response.content.strip()
        code = re.sub(r'^```(?:tsx?|typescript|javascript)?\s*', '', code, flags=re.MULTILINE)
        code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
        code = code.strip()
        print(f"[vibe_architect] generated: {len(code)} chars")
        return code


def validate_and_write_component(scene_name: str, code: str) -> bool:
    code = re.sub(r'^```(?:tsx?|typescript|javascript)?\s*', '', code, flags=re.MULTILINE)
    code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
    code = code.strip()

    if "export default" not in code:
        match = re.search(rf'function\s+{scene_name}\s*\(', code)
        if match:
            code = code[:match.start()] + 'export default ' + code[match.start():]
            print(f"[vibe_validator] auto-fixed missing export default")
        else:
            print(f"[vibe_validator] FAIL: no default export in {scene_name}")
            return False

    if "import React" not in code:
        print(f"[vibe_validator] FAIL: no React import")
        return False

    if len(code) < 500:
        print(f"[vibe_validator] FAIL: too short ({len(code)} chars)")
        return False

    opens  = code.count('{')
    closes = code.count('}')
    if opens != closes:
        print(f"[vibe_validator] FAIL: unbalanced braces {opens} open vs {closes} close")
        return False

    parens_open  = code.count('(')
    parens_close = code.count(')')
    if parens_open != parens_close:
        print(f"[vibe_validator] FAIL: unbalanced parens {parens_open} vs {parens_close}")
        return False

    for d in ["process.env", "require(", "fs.", "child_process", "eval("]:
        if d in code:
            print(f"[vibe_validator] FAIL: dangerous pattern '{d}'")
            return False

    if f"function {scene_name}" not in code:
        print(f"[vibe_validator] FAIL: component name {scene_name} not found")
        return False

    output_path = DYNAMIC_COMPONENTS_DIR / f"{scene_name}.tsx"
    try:
        output_path.write_text(code, encoding="utf-8")
        print(f"[vibe_architect] wrote {scene_name}.tsx ({len(code)} chars) -> HMR picks up")
        return True
    except Exception as e:
        print(f"[vibe_architect] write error: {e}")
        return False


def vibe_architect_node(state: dict) -> dict:
    """LangGraph node — generate FPP enemy scene -> validate -> write."""
    world             = state.get("world", {})
    party             = state.get("party", {})
    acting_character  = state.get("acting_character", "")
    narrative_history = state.get("narrative_history", [])

    theme     = world.get("theme", "dark-gothic")
    in_combat = world.get("inCombat", False)

    theme_to_scene = {
        "dark-gothic":   "DungeonCombatScene" if in_combat else "DungeonScene",
        "bright-forest": "ForestCombatScene"  if in_combat else "ForestScene",
        "warm-tavern":   "TavernScene",
    }
    scene_name = theme_to_scene.get(theme, "DungeonScene")

    last_dm_narrative = ""
    for entry in reversed(narrative_history):
        if entry.startswith("DM: "):
            last_dm_narrative = entry[4:250]
            break

    last_action = ""
    for entry in reversed(narrative_history):
        if acting_character and entry.startswith(f"PLAYER ({acting_character})"):
            last_action = entry.split("): ", 1)[-1].lower()
            break

    action_type = "attack" if any(
        w in last_action for w in ["attack", "cast", "strike", "hit", "swing", "spell"]
    ) else "explore"

    print(f"[vibe_architect] scene={scene_name} | char={acting_character} | action={action_type}")
    if last_dm_narrative:
        print(f"[vibe_architect] narrative: '{last_dm_narrative[:80]}...'")

    code = generate_scene_component(
        scene_name=scene_name,
        world=world,
        acting_character=acting_character,
        party=party,
        action_type=action_type,
        dm_narrative=last_dm_narrative,
    )

    if not code:
        print(f"[vibe_architect] generation failed — keeping stub")
        return {}

    success = validate_and_write_component(scene_name, code)

    if success:
        existing_queue = state.get("ui_queue", [])
        return {
            "ui_queue": existing_queue + [
                {"type": "mount_component", "slot": "map-scene", "componentName": scene_name}
            ]
        }

    print(f"[vibe_architect] validation failed — keeping stub")
    return {}