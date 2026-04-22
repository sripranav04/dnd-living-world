import os
import re
import subprocess
import tempfile
from pathlib import Path

from llm_provider import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

DYNAMIC_COMPONENTS_DIR = Path(
    os.environ.get(
        "DYNAMIC_COMPONENTS_PATH",
        "../frontend/src/components/dynamic"
    )
)

VIBE_SYSTEM = """You write React TypeScript canvas components for a D&D game. Output ONLY the complete .tsx file.

STRICT RULES — violations cause parse errors:
- Every opening { must have a matching closing }
- Every opening ( must have a matching closing )  
- The file must be 100% complete — never truncate
- Use getCSSVar() for ALL colors — never hardcode hex values
- Count your braces before finishing

DRAWING QUALITY REQUIREMENTS:
- Characters must look like silhouettes, NOT stick figures
- Use filled shapes: ellipses for head/body/limbs, NOT lines
- Characters must be DARK colored (use bg color + 'dd' opacity) so they look like silhouettes
- Enemy must look menacing and different from the character
- Background must have depth: gradient sky, floor, environment details
- Add atmospheric effects: torch glows, mist, particles
- Animate smoothly with Math.sin(t) — idle breathing, weapon swings, enemy hover

CHARACTER SILHOUETTE TECHNIQUE (filled shapes, NOT lines):
Fighter: large ellipse body, circle head, thick rectangle sword arm raised
Rogue: crouched ellipse body, circle head, two small dagger rectangles
Wizard: tall ellipse body with robe flare, circle head, staff rectangle raised  
Cleric: broad ellipse body, circle head, holy symbol circle in front
Enemy wraith: wispy tall ellipse body, large circle head, tendril curves emanating outward

EXACT TEMPLATE — replace COMPONENT_NAME, fill draw function body:

import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function COMPONENT_NAME() {
  const locationName = useGameStore((s) => s.world.locationName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!W || !H) return;
    const bg = getCSSVar('--color-bg-base', '#08070a');
    const accent = getCSSVar('--color-accent-primary', '#c9a227');
    const torch = getCSSVar('--torch-color', '#f5a623');
    const wall = getCSSVar('--map-wall-color', '#0e0b07');
    const floor = getCSSVar('--map-floor-color', '#111009');
    // DRAW BODY HERE — use filled shapes for silhouettes, gradient backgrounds
  }, [locationName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.parentElement?.clientWidth || 800; canvas.height = canvas.parentElement?.clientHeight || 500; };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const start = performance.now();
    const loop = (now: number) => { ctx.clearRect(0, 0, canvas.width, canvas.height); draw(ctx, (now - start) / 1000); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [draw]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

OUTPUT THE COMPLETE FILE. Count every { and } before responding."""
def generate_scene_component(
    scene_name: str,
    world: dict,
    acting_character: str,
    party: dict,
    action_type: str = "explore",
) -> str:
    """Generate a React scene component — uses get_llm() (Azure GPT-4o)."""
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = get_llm()

    encounter   = world.get("current_encounter", {})
    enemy_name  = encounter.get("enemy_name", "")
    theme       = world.get("theme", "dark-gothic")
    location    = world.get("locationName", "Unknown")
    in_combat   = world.get("inCombat", False)

    char       = party.get(acting_character, {})
    char_name  = char.get("name", acting_character)
    char_class = _infer_class(acting_character, char)

    if in_combat and enemy_name:
        scene_prompt = (
            f"Component name: {scene_name}\n"
            f"Draw a combat scene: {char_name} ({char_class}) silhouette LEFT attacking, "
            f"{enemy_name} silhouette RIGHT recoiling. "
            f"Background: dark wall top half, floor bottom half. "
            f"Two torch glows on sides using torch color. Vignette. Location label at top. "
            f"Use Math.sin(t) for animation. Keep draw body under 40 lines."
        )
    else:
        scene_prompt = (
            f"Component name: {scene_name}\n"
            f"Draw an exploration scene: {char_name} ({char_class}) silhouette center. "
            f"Background: {location} atmosphere with {theme} colors. "
            f"Ambient particles, mist. Vignette. Location label at top. "
            f"Use Math.sin(t) for animation. Keep draw body under 40 lines."
        )

    system_with_name = VIBE_SYSTEM.replace("COMPONENT_NAME", scene_name)

    response = llm.invoke([
        SystemMessage(content=system_with_name),
        HumanMessage(content=scene_prompt),
    ])

    code = response.content.strip()
    code = re.sub(r'^```(?:tsx?|typescript|javascript)?\s*', '', code, flags=re.MULTILINE)
    code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
    return code.strip()
# def generate_scene_component(
#     scene_name: str,
#     world: dict,
#     acting_character: str,
#     party: dict,
#     action_type: str = "explore",
# ) -> str:
#     """Generate a React scene component via Haiku."""
#     llm = get_llm()

#     encounter   = world.get("current_encounter", {})
#     enemy_name  = encounter.get("enemy_name", "")
#     theme       = world.get("theme", "dark-gothic")
#     location    = world.get("locationName", "Unknown")
#     in_combat   = world.get("inCombat", False)

#     char       = party.get(acting_character, {})
#     char_name  = char.get("name", acting_character)
#     char_class = _infer_class(acting_character, char)

#     scene_context = f"""
# Scene to generate: {scene_name}
# Component name: {scene_name} (the export default function MUST be named exactly {scene_name})
# Location: {location}
# Theme: {theme}
# In combat: {in_combat}
# Enemy: {enemy_name if enemy_name else 'none'}
# Acting character: {char_name} ({char_class})
# Action type: {action_type}
# """

#     if in_combat and enemy_name:
#         scene_prompt = (
#             f"Component name: {scene_name}\n"
#             f"Draw a combat scene: {char_name} ({char_class}) silhouette LEFT attacking, "
#             f"{enemy_name} silhouette RIGHT recoiling. "
#             f"Background: dark wall top half, floor bottom half. "
#             f"Two torch glows on sides. Vignette. Location label at top. "
#             f"Use Math.sin(t) for animation. Keep draw body under 40 lines."
#         )
#     else:
#         scene_prompt = (
#             f"Component name: {scene_name}\n"
#             f"Draw an exploration scene: {char_name} ({char_class}) silhouette center. "
#             f"Background: {location} atmosphere with {theme} colors. "
#             f"Ambient particles, mist. Vignette. Location label at top. "
#             f"Use Math.sin(t) for animation. Keep draw body under 40 lines."
#         )

#     system_with_name = VIBE_SYSTEM.replace("COMPONENT_NAME", scene_name)

#     response = llm.invoke([
#         SystemMessage(content=system_with_name),
#         HumanMessage(content=scene_prompt),
#     ])

#     code = response.content.strip()
#     # Strip any accidental markdown fences
#     code = re.sub(r'^```(?:tsx?|typescript|javascript)?\s*', '', code, flags=re.MULTILINE)
#     code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
#     return code.strip()

def validate_and_write_component(scene_name: str, code: str) -> bool:
    # Strip markdown fences
    code = re.sub(r'^```(?:tsx?|typescript|javascript)?\s*', '', code, flags=re.MULTILINE)
    code = re.sub(r'```\s*$', '', code, flags=re.MULTILINE)
    code = code.strip()

    # Auto-fix missing export default
    if "export default" not in code:
        match = re.search(rf'function\s+{scene_name}\s*\(', code)
        if match:
            code = code[:match.start()] + 'export default ' + code[match.start():]
            print(f"[vibe_validator] auto-fixed missing export default in {scene_name}")
        else:
            print(f"[vibe_validator] FAIL: no default export in {scene_name}")
            return False

    if "import React" not in code:
        print(f"[vibe_validator] FAIL: no React import in {scene_name}")
        return False

    if len(code) < 300:
        print(f"[vibe_validator] FAIL: code too short ({len(code)} chars)")
        return False

    # ── Brace balance check ───────────────────────────────
    opens  = code.count('{')
    closes = code.count('}')
    if opens != closes:
        print(f"[vibe_validator] FAIL: unbalanced braces — {opens} open, {closes} close in {scene_name}")
        return False

    # ── Paren balance check ───────────────────────────────
    parens_open  = code.count('(')
    parens_close = code.count(')')
    if parens_open != parens_close:
        print(f"[vibe_validator] FAIL: unbalanced parens — {parens_open} open, {parens_close} close")
        return False

    dangerous = ["process.env", "require(", "fs.", "child_process", "eval("]
    for d in dangerous:
        if d in code:
            print(f"[vibe_validator] FAIL: dangerous pattern '{d}' found")
            return False

    if f"function {scene_name}" not in code:
        print(f"[vibe_validator] FAIL: component name {scene_name} not found")
        return False

    output_path = DYNAMIC_COMPONENTS_DIR / f"{scene_name}.tsx"
    try:
        output_path.write_text(code, encoding="utf-8")
        print(f"[vibe_architect] ✓ wrote {scene_name}.tsx ({len(code)} chars) → HMR will pick up")
        return True
    except Exception as e:
        print(f"[vibe_architect] write error: {e}")
        return False
def _infer_class(char_id: str, char: dict) -> str:
    class_map = {
        "aldric": "Fighter",
        "lyra": "Wizard",
        "thane": "Cleric",
        "vex": "Rogue",
    }
    return class_map.get(char_id, "Adventurer")


def vibe_architect_node(state: dict) -> dict:
    """LangGraph node — generates and writes a scene component."""
    world            = state.get("world", {})
    party            = state.get("party", {})
    acting_character = state.get("acting_character", "")
    narrative_history = state.get("narrative_history", [])

    # Determine scene name from theme + combat state
    theme     = world.get("theme", "dark-gothic")
    in_combat = world.get("inCombat", False)

    theme_to_scene = {
        "dark-gothic":   "DungeonCombatScene" if in_combat else "DungeonScene",
        "bright-forest": "ForestCombatScene"  if in_combat else "ForestScene",
        "warm-tavern":   "TavernScene",
    }
    scene_name = theme_to_scene.get(theme, "DungeonScene")

    # Infer action type from last player action
    last_action = ""
    for entry in reversed(narrative_history):
        if entry.startswith(f"PLAYER ({acting_character})"):
            last_action = entry.split("): ", 1)[-1].lower()
            break

    action_type = "attack" if any(w in last_action for w in ["attack", "cast", "strike"]) else "explore"

    print(f"[vibe_architect] generating {scene_name} for {acting_character} ({action_type})")

    code = generate_scene_component(
        scene_name=scene_name,
        world=world,
        acting_character=acting_character,
        party=party,
        action_type=action_type,
    )

    success = validate_and_write_component(scene_name, code)

    if success:
        # Tell the frontend to mount the new scene
        existing_queue = state.get("ui_queue", [])
        return {
            "ui_queue": existing_queue + [
                {"type": "mount_component", "slot": "map-scene", "componentName": scene_name}
            ]
        }

    return {}