import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DungeonCombatScene() {
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
    const vx = W * 0.5;
    const vy = H * 0.45;
    const enemyX = W * 0.5;
    const enemyY = H * 0.42;
    const enemyH = H * 0.6;
    const enemyW = enemyH * 0.42;
    const bob = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const flicker = 0.82 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17) * 0.05;

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, wall + 'ee');
    wallGrad.addColorStop(0.45, wall);
    wallGrad.addColorStop(1, bg);

    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.18, 0);
    ctx.lineTo(W * 0.28, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.82, 0);
    ctx.lineTo(W * 0.72, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.32);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.72, H * 0.22);
    ctx.lineTo(W * 0.28, H * 0.22);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vy, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.7, vy);
    ctx.lineTo(W * 0.3, vy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const px = vx + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(px, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const y = vy + (i + 1) * ((H - vy) / 8);
      const inset = (y - vy) * 0.9;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number) => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.14);
      glow.addColorStop(0, torch + 'cc');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.fillRect(x - 10, y - 4, 20, 8);
      ctx.fillRect(x - 3, y + 4, 6, 18);

      ctx.fillStyle = torch + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - 20 * flicker);
      ctx.quadraticCurveTo(x + 10, y - 4, x, y + 6);
      ctx.quadraticCurveTo(x - 10, y - 4, x, y - 20 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + '88';
      ctx.beginPath();
      ctx.arc(x, y + 2, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.14, H * 0.3);
    drawTorch(W * 0.86, H * 0.3);

    ctx.fillStyle = bg + '66';
    ctx.beginPath();
    ctx.ellipse(enemyX, H * 0.73, enemyW * 0.95, enemyH * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    const enemyColor = getCSSVar('--dragging-corpse-color', '#3a4a2a');
    const boneColor = getCSSVar('--dragging-corpse-bone', '#c8b89a');
    const woundColor = getCSSVar('--dragging-corpse-wound', accent);

    const drawEnemy = () => {
      const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
      enemyGlow.addColorStop(0, enemyColor + '44');
      enemyGlow.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = enemyGlow;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, H * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(enemyX, enemyY + bob);
      ctx.scale(breathe, breathe);

      ctx.fillStyle = enemyColor;
      ctx.strokeStyle = wall;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.ellipse(0, -enemyH * 0.18, enemyW * 0.34, enemyH * 0.18, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.34, -enemyH * 0.05);
      ctx.quadraticCurveTo(-enemyW * 0.42, enemyH * 0.08, -enemyW * 0.28, enemyH * 0.22);
      ctx.quadraticCurveTo(-enemyW * 0.12, enemyH * 0.34, 0, enemyH * 0.3);
      ctx.quadraticCurveTo(enemyW * 0.18, enemyH * 0.28, enemyW * 0.28, enemyH * 0.14);
      ctx.quadraticCurveTo(enemyW * 0.34, 0, enemyW * 0.18, -enemyH * 0.08);
      ctx.quadraticCurveTo(enemyW * 0.04, -enemyH * 0.18, -enemyW * 0.34, -enemyH * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = wall + 'aa';
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.1, -enemyH * 0.2, enemyW * 0.07, enemyH * 0.03, 0, 0, Math.PI * 2);
      ctx.ellipse(enemyW * 0.08, -enemyH * 0.19, enemyW * 0.06, enemyH * 0.028, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-enemyW * 0.1, -enemyH * 0.2, enemyW * 0.018, 0, Math.PI * 2);
      ctx.arc(enemyW * 0.08, -enemyH * 0.19, enemyW * 0.016, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = woundColor + '88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.08, -enemyH * 0.12);
      ctx.quadraticCurveTo(0, -enemyH * 0.08, enemyW * 0.1, -enemyH * 0.11);
      ctx.stroke();

      ctx.fillStyle = boneColor;
      ctx.beginPath();
      ctx.moveTo(enemyW * 0.12, -enemyH * 0.03);
      ctx.lineTo(enemyW * 0.22, enemyH * 0.02);
      ctx.lineTo(enemyW * 0.18, enemyH * 0.12);
      ctx.lineTo(enemyW * 0.08, enemyH * 0.08);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = enemyColor;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.26, enemyH * 0.02);
      ctx.quadraticCurveTo(-enemyW * 0.5, enemyH * 0.12, -enemyW * 0.58, enemyH * 0.3);
      ctx.quadraticCurveTo(-enemyW * 0.62, enemyH * 0.42, -enemyW * 0.54, enemyH * 0.48);
      ctx.quadraticCurveTo(-enemyW * 0.46, enemyH * 0.5, -enemyW * 0.42, enemyH * 0.42);
      ctx.quadraticCurveTo(-enemyW * 0.46, enemyH * 0.34, -enemyW * 0.38, enemyH * 0.24);
      ctx.quadraticCurveTo(-enemyW * 0.28, enemyH * 0.12, -enemyW * 0.16, enemyH * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(enemyW * 0.18, enemyH * 0.02);
      ctx.quadraticCurveTo(enemyW * 0.42, enemyH * 0.08, enemyW * 0.5, enemyH * 0.22);
      ctx.quadraticCurveTo(enemyW * 0.56, enemyH * 0.34, enemyW * 0.48, enemyH * 0.42);
      ctx.quadraticCurveTo(enemyW * 0.4, enemyH * 0.46, enemyW * 0.34, enemyH * 0.38);
      ctx.quadraticCurveTo(enemyW * 0.36, enemyH * 0.28, enemyW * 0.28, enemyH * 0.18);
      ctx.quadraticCurveTo(enemyW * 0.22, enemyH * 0.1, enemyW * 0.14, enemyH * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = boneColor;
      ctx.fillRect(-enemyW * 0.58, enemyH * 0.45, enemyW * 0.08, enemyH * 0.03);
      ctx.fillRect(enemyW * 0.46, enemyH * 0.39, enemyW * 0.08, enemyH * 0.03);

      ctx.fillStyle = enemyColor;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.16, enemyH * 0.28);
      ctx.quadraticCurveTo(-enemyW * 0.26, enemyH * 0.48, -enemyW * 0.28, enemyH * 0.72);
      ctx.quadraticCurveTo(-enemyW * 0.3, enemyH * 0.9, -enemyW * 0.22, enemyH * 0.96);
      ctx.quadraticCurveTo(-enemyW * 0.14, enemyH * 0.98, -enemyW * 0.1, enemyH * 0.9);
      ctx.quadraticCurveTo(-enemyW * 0.12, enemyH * 0.72, -enemyW * 0.08, enemyH * 0.52);
      ctx.quadraticCurveTo(-enemyW * 0.04, enemyH * 0.36, 0, enemyH * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(enemyW * 0.04, enemyH * 0.28);
      ctx.quadraticCurveTo(enemyW * 0.02, enemyH * 0.48, enemyW * 0.08, enemyH * 0.74);
      ctx.quadraticCurveTo(enemyW * 0.12, enemyH * 0.92, enemyW * 0.24, enemyH * 0.98);
      ctx.quadraticCurveTo(enemyW * 0.34, enemyH * 0.98, enemyW * 0.34, enemyH * 0.88);
      ctx.quadraticCurveTo(enemyW * 0.24, enemyH * 0.72, enemyW * 0.18, enemyH * 0.54);
      ctx.quadraticCurveTo(enemyW * 0.12, enemyH * 0.38, enemyW * 0.12, enemyH * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = boneColor;
      ctx.fillRect(enemyW * 0.22, enemyH * 0.95, enemyW * 0.12, enemyH * 0.025);
      ctx.fillRect(-enemyW * 0.26, enemyH * 0.93, enemyW * 0.1, enemyH * 0.025);

      ctx.strokeStyle = accent + '33';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const sy = -enemyH * 0.02 + i * enemyH * 0.07;
        ctx.beginPath();
        ctx.moveTo(-enemyW * 0.18, sy);
        ctx.lineTo(enemyW * 0.12, sy + enemyH * 0.02);
        ctx.stroke();
      }

      ctx.restore();
    };

    if (state === 'attack') {
      const atkScale = state === 'attack' ? 1.0 + Math.sin(t * 6) * 0.15 : 1.0;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(atkScale, atkScale);
      ctx.translate(-W * 0.5, -H * 0.42);
      drawEnemy();
      ctx.restore();
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    } else if (state === 'recoil') {
      const recoilX = 30;
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      drawEnemy();
      ctx.restore();

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + t * 2;
        const r = 18 + i * 3 + impact * 30;
        const px = enemyX + Math.cos(a) * r;
        const py = enemyY + Math.sin(a) * r * 0.7;
        ctx.fillStyle = accent + 'cc';
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawEnemy();
    }

    const handGrad = ctx.createLinearGradient(0, H * 0.82, 0, H);
    handGrad.addColorStop(0, wall + 'aa');
    handGrad.addColorStop(1, wall);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.42, H);
    ctx.quadraticCurveTo(W * 0.44, H * 0.9, W * 0.48, H * 0.86);
    ctx.quadraticCurveTo(W * 0.52, H * 0.84, W * 0.56, H * 0.88);
    ctx.quadraticCurveTo(W * 0.6, H * 0.92, W * 0.62, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '88';
    ctx.beginPath();
    ctx.moveTo(W * 0.495, H * 0.9);
    ctx.lineTo(W * 0.505, H * 0.9);
    ctx.lineTo(W * 0.515, H * 0.78);
    ctx.lineTo(W * 0.485, H * 0.78);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
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