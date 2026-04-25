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
    const vx = W * 0.5;
    const vy = H * 0.45;
    const enemyX = W * 0.5;
    const enemyY = H * 0.42;
    const enemyH = H * 0.6;
    const enemyW = enemyH * 0.42;
    const bob = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const recoilX = state === 'recoil' ? 30 : 0;
    const wraithColor = getCSSVar('--enemy-wraith-color', '#2a1a4a');
    const eyeColor = getCSSVar('--enemy-eye-color', '#c9a227');
    const boneColor = getCSSVar('--enemy-bone-color', '#d4c9a8');

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, bg);
    wallGrad.addColorStop(0.35, wall);
    wallGrad.addColorStop(1, wall);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + 'cc');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.86, H * 0.22);
    ctx.lineTo(W * 0.14, H * 0.22);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vy, 0, H);
    floorGrad.addColorStop(0, floorC);
    floorGrad.addColorStop(1, bg);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.82, vy);
    ctx.lineTo(W * 0.18, vy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall + 'aa';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.18, H * 0.22);
    ctx.lineTo(W * 0.18, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.82, H * 0.22);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const x = vx + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }
    for (let j = 0; j < 7; j++) {
      const yy = vy + ((H - vy) / 7) * j;
      const spread = (yy - vy) * 1.8;
      ctx.beginPath();
      ctx.moveTo(vx - spread, yy);
      ctx.lineTo(vx + spread, yy);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: 'left' | 'right') => {
      const flicker = 0.85 + Math.sin(t * 11 + x * 0.01) * 0.08 + Math.sin(t * 17 + y * 0.02) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.12);
      glow.addColorStop(0, torch + 'cc');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.12 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + (side === 'left' ? 10 : -10), y);
      ctx.lineTo(x + (side === 'left' ? 28 : -28), y + 8);
      ctx.stroke();

      ctx.fillStyle = boneColor + '88';
      ctx.fillRect(x - 6, y + 6, 12, 18);

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - 18 * flicker);
      ctx.quadraticCurveTo(x + 10, y - 4, x, y + 6);
      ctx.quadraticCurveTo(x - 10, y - 4, x, y - 18 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'aa';
      ctx.beginPath();
      ctx.moveTo(x, y - 10 * flicker);
      ctx.quadraticCurveTo(x + 5, y - 2, x, y + 3);
      ctx.quadraticCurveTo(x - 5, y - 2, x, y - 10 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.14, H * 0.3, 'left');
    drawTorch(W * 0.86, H * 0.3, 'right');

    const shadowGrad = ctx.createRadialGradient(enemyX, enemyY + enemyH * 0.42, enemyW * 0.15, enemyX, enemyY + enemyH * 0.42, enemyW * 0.95);
    shadowGrad.addColorStop(0, bg + 'aa');
    shadowGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(enemyX, enemyY + enemyH * 0.42, enemyW * 0.95, enemyH * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawEnemy = () => {
      const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
      enemyGlow.addColorStop(0, wraithColor + '44');
      enemyGlow.addColorStop(1, wraithColor + '00');
      ctx.fillStyle = enemyGlow;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, H * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(enemyX + recoilX, enemyY + bob);
      ctx.scale(breathe, breathe);

      const bodyGrad = ctx.createLinearGradient(enemyX, enemyY - enemyH * 0.35, enemyX, enemyY + enemyH * 0.45);
      bodyGrad.addColorStop(0, wraithColor + 'ee');
      bodyGrad.addColorStop(0.55, wraithColor + 'cc');
      bodyGrad.addColorStop(1, bg + '00');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(enemyX, enemyY - enemyH * 0.34);
      ctx.bezierCurveTo(enemyX + enemyW * 0.55, enemyY - enemyH * 0.3, enemyX + enemyW * 0.62, enemyY - enemyH * 0.02, enemyX + enemyW * 0.42, enemyY + enemyH * 0.18);
      ctx.bezierCurveTo(enemyX + enemyW * 0.3, enemyY + enemyH * 0.34, enemyX + enemyW * 0.18, enemyY + enemyH * 0.42, enemyX + enemyW * 0.08, enemyY + enemyH * 0.5);
      ctx.bezierCurveTo(enemyX + enemyW * 0.02, enemyY + enemyH * 0.58, enemyX + enemyW * 0.18, enemyY + enemyH * 0.66, enemyX + enemyW * 0.04, enemyY + enemyH * 0.78);
      ctx.bezierCurveTo(enemyX - enemyW * 0.02, enemyY + enemyH * 0.86, enemyX - enemyW * 0.08, enemyY + enemyH * 0.9, enemyX, enemyY + enemyH * 0.98);
      ctx.bezierCurveTo(enemyX + enemyW * 0.02, enemyY + enemyH * 0.9, enemyX - enemyW * 0.22, enemyY + enemyH * 0.82, enemyX - enemyW * 0.12, enemyY + enemyH * 0.7);
      ctx.bezierCurveTo(enemyX - enemyW * 0.28, enemyY + enemyH * 0.62, enemyX - enemyW * 0.08, enemyY + enemyH * 0.56, enemyX - enemyW * 0.18, enemyY + enemyH * 0.48);
      ctx.bezierCurveTo(enemyX - enemyW * 0.34, enemyY + enemyH * 0.38, enemyX - enemyW * 0.44, enemyY + enemyH * 0.2, enemyX - enemyW * 0.42, enemyY + enemyH * 0.02);
      ctx.bezierCurveTo(enemyX - enemyW * 0.4, enemyY - enemyH * 0.16, enemyX - enemyW * 0.5, enemyY - enemyH * 0.28, enemyX, enemyY - enemyH * 0.34);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = bg + '55';
      ctx.beginPath();
      ctx.ellipse(enemyX, enemyY - enemyH * 0.24, enemyW * 0.28, enemyH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = boneColor + 'dd';
      ctx.beginPath();
      ctx.ellipse(enemyX, enemyY - enemyH * 0.26, enemyW * 0.22, enemyH * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg + 'aa';
      ctx.beginPath();
      ctx.ellipse(enemyX - enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.05, enemyH * 0.035, 0, 0, Math.PI * 2);
      ctx.ellipse(enemyX + enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.05, enemyH * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();

      const eyeGlowL = ctx.createRadialGradient(enemyX - enemyW * 0.08, enemyY - enemyH * 0.28, 0, enemyX - enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.12);
      eyeGlowL.addColorStop(0, getCSSVar('--enemy-eye-red', '#ff4444'));
      eyeGlowL.addColorStop(1, getCSSVar('--enemy-eye-red', '#ff4444') + '00');
      ctx.fillStyle = eyeGlowL;
      ctx.beginPath();
      ctx.arc(enemyX - enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.12, 0, Math.PI * 2);
      ctx.fill();

      const eyeGlowR = ctx.createRadialGradient(enemyX + enemyW * 0.08, enemyY - enemyH * 0.28, 0, enemyX + enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.12);
      eyeGlowR.addColorStop(0, getCSSVar('--enemy-eye-red', '#ff4444'));
      eyeGlowR.addColorStop(1, getCSSVar('--enemy-eye-red', '#ff4444') + '00');
      ctx.fillStyle = eyeGlowR;
      ctx.beginPath();
      ctx.arc(enemyX + enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = getCSSVar('--enemy-eye-red', '#ff4444');
      ctx.beginPath();
      ctx.ellipse(enemyX - enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.03, enemyH * 0.02, 0, 0, Math.PI * 2);
      ctx.ellipse(enemyX + enemyW * 0.08, enemyY - enemyH * 0.28, enemyW * 0.03, enemyH * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = wraithColor + 'dd';
      ctx.lineWidth = Math.max(3, enemyW * 0.035);
      ctx.lineCap = 'round';
      const tendrilPhase = t * 1.8;

      const tendrils = [
        { sx: -0.18, sy: -0.06, c1x: -0.52, c1y: -0.18, c2x: -0.72, c2y: 0.02, ex: -0.82, ey: -0.12 },
        { sx: -0.26, sy: 0.02, c1x: -0.62, c1y: 0.02, c2x: -0.82, c2y: 0.18, ex: -0.9, ey: 0.08 },
        { sx: 0, sy: -0.02, c1x: 0.08, c1y: 0.12, c2x: 0.18, c2y: 0.28, ex: 0.1, ey: 0.42 },
        { sx: 0.18, sy: -0.04, c1x: 0.54, c1y: -0.18, c2x: 0.72, c2y: -0.02, ex: 0.84, ey: -0.16 },
        { sx: 0.24, sy: 0.04, c1x: 0.6, c1y: 0.08, c2x: 0.82, c2y: 0.24, ex: 0.92, ey: 0.14 }
      ];

      tendrils.forEach((td, i) => {
        const sway = Math.sin(tendrilPhase + i * 0.8) * enemyW * 0.08;
        ctx.beginPath();
        ctx.moveTo(enemyX + enemyW * td.sx, enemyY + enemyH * td.sy);
        ctx.bezierCurveTo(
          enemyX + enemyW * td.c1x + sway,
          enemyY + enemyH * td.c1y,
          enemyX + enemyW * td.c2x - sway * 0.5,
          enemyY + enemyH * td.c2y,
          enemyX + enemyW * td.ex,
          enemyY + enemyH * td.ey
        );
        ctx.stroke();

        ctx.strokeStyle = wraithColor + '88';
        ctx.lineWidth = Math.max(1, enemyW * 0.018);
        ctx.beginPath();
        ctx.moveTo(enemyX + enemyW * td.sx, enemyY + enemyH * td.sy);
        ctx.bezierCurveTo(
          enemyX + enemyW * td.c1x + sway * 0.6,
          enemyY + enemyH * td.c1y + enemyH * 0.02,
          enemyX + enemyW * td.c2x,
          enemyY + enemyH * td.c2y + enemyH * 0.02,
          enemyX + enemyW * td.ex,
          enemyY + enemyH * td.ey
        );
        ctx.stroke();
        ctx.strokeStyle = wraithColor + 'dd';
        ctx.lineWidth = Math.max(3, enemyW * 0.035);
      });

      ctx.fillStyle = wraithColor + '66';
      for (let i = 0; i < 7; i++) {
        const wx = enemyX + Math.sin(t * 1.5 + i) * enemyW * 0.18;
        const wy = enemyY + enemyH * (0.18 + i * 0.09);
        ctx.beginPath();
        ctx.ellipse(wx, wy, enemyW * (0.08 - i * 0.006), enemyH * 0.05, Math.sin(t + i) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (impact > 0) {
        ctx.strokeStyle = getCSSVar('--enemy-hit-slash', '#ffffff') + 'aa';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(enemyX - enemyW * 0.18, enemyY - enemyH * 0.02);
        ctx.lineTo(enemyX + enemyW * 0.16, enemyY - enemyH * 0.14);
        ctx.stroke();

        ctx.strokeStyle = getCSSVar('--enemy-hit-slash', '#ffffff') + '55';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(enemyX - enemyW * 0.22, enemyY + enemyH * 0.02);
        ctx.lineTo(enemyX + enemyW * 0.12, enemyY - enemyH * 0.1);
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
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      ctx.translate((W - W * 0.85) / 2, (H - H * 0.85) / 2);
      drawEnemy();
      ctx.restore();

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + t * 2;
        const sp = 20 + i * 2;
        const px = enemyX + Math.cos(a) * sp * impact;
        const py = enemyY + Math.sin(a) * sp * impact - enemyH * 0.05;
        ctx.fillStyle = accent + Math.floor((0.25 + impact * 0.5) * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawEnemy();
    }

    const weaponY = H * 0.92;
    ctx.save();
    ctx.translate(W * 0.5, weaponY);
    ctx.rotate(-0.18 + Math.sin(t * 2.2) * 0.015);

    ctx.fillStyle = getCSSVar('--player-glove-color', '#3b2f2a');
    ctx.beginPath();
    ctx.moveTo(-26, 18);
    ctx.quadraticCurveTo(-34, -2, -18, -16);
    ctx.lineTo(8, -10);
    ctx.quadraticCurveTo(18, 2, 12, 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.fillRect(-4, -54, 8, 48);
    ctx.fillStyle = boneColor + 'cc';
    ctx.beginPath();
    ctx.moveTo(-6, -54);
    ctx.lineTo(0, -104);
    ctx.lineTo(6, -54);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

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