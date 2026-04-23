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
    const vpX = W * 0.5;
    const vpY = H * 0.45;
    const enemyX = W * 0.5;
    const enemyYBase = H * 0.42;
    const bob = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const enemyY = enemyYBase + (state === 'idle' ? bob : 0);
    const enemyH = H * 0.58;
    const enemyW = enemyH * 0.34;
    const zombieBody = getCSSVar('--enemy-zombie-body', '#3a4a2a');
    const bone = getCSSVar('--enemy-bone-color', '#c8b89a');
    const cloth = getCSSVar('--enemy-cloth-color', '#4a4038');
    const flesh = getCSSVar('--enemy-flesh-color', '#6a4a46');
    const eye = getCSSVar('--enemy-eye-color', '#e8e6dc');

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, bg);
    wallGrad.addColorStop(0.35, wall);
    wallGrad.addColorStop(1, wall);

    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilingGrad.addColorStop(0, bg);
    ceilingGrad.addColorStop(1, wall + 'cc');
    ctx.fillStyle = ceilingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.82, vpY);
    ctx.lineTo(W * 0.18, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'cc');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.78, vpY);
    ctx.lineTo(W * 0.22, vpY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall + 'dd';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.18, vpY);
    ctx.lineTo(W * 0.22, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.82, vpY);
    ctx.lineTo(W * 0.78, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 1; i <= 7; i++) {
      const y = vpY + ((H - vpY) * i) / 8;
      const inset = (W * 0.28 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: -1 | 1) => {
      const flicker = 0.9 + Math.sin(t * 9 + x * 0.01) * 0.08 + Math.sin(t * 17 + y * 0.02) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.14 * flicker);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.14 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.02, y - H * 0.015);
      ctx.lineTo(x, y);
      ctx.lineTo(x - side * W * 0.02, y + H * 0.015);
      ctx.stroke();

      ctx.fillStyle = accent + 'cc';
      ctx.fillRect(x - 4, y - 10, 8, 20);

      ctx.fillStyle = torch + 'dd';
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.quadraticCurveTo(x + 10 * flicker, y - 4, x, y + 4);
      ctx.quadraticCurveTo(x - 9 * flicker, y - 4, x, y - 18);
      ctx.fill();

      ctx.fillStyle = accent + '88';
      ctx.beginPath();
      ctx.arc(x, y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.14, H * 0.3, -1);
    drawTorch(W * 0.86, H * 0.3, 1);

    const shadowGrad = ctx.createRadialGradient(enemyX, H * 0.72, 10, enemyX, H * 0.72, W * 0.18);
    shadowGrad.addColorStop(0, bg + 'aa');
    shadowGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(enemyX, H * 0.72, W * 0.16, H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawZombie = () => {
      const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
      enemyGlow.addColorStop(0, zombieBody + '44');
      enemyGlow.addColorStop(1, zombieBody + '00');
      ctx.fillStyle = enemyGlow;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, H * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(enemyX, enemyY);
      if (state === 'idle') ctx.scale(breathe, breathe);

      const torsoTop = -enemyH * 0.18;
      const torsoBottom = enemyH * 0.2;
      const shoulderY = -enemyH * 0.1;
      const hipY = enemyH * 0.12;
      const headR = enemyH * 0.12;

      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.42, torsoTop);
      ctx.quadraticCurveTo(-enemyW * 0.5, 0, -enemyW * 0.34, torsoBottom);
      ctx.lineTo(enemyW * 0.34, torsoBottom);
      ctx.quadraticCurveTo(enemyW * 0.5, 0, enemyW * 0.42, torsoTop);
      ctx.quadraticCurveTo(0, -enemyH * 0.28, -enemyW * 0.42, torsoTop);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = zombieBody;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.34, torsoTop);
      ctx.quadraticCurveTo(-enemyW * 0.46, -enemyH * 0.02, -enemyW * 0.28, torsoBottom);
      ctx.lineTo(enemyW * 0.28, torsoBottom);
      ctx.quadraticCurveTo(enemyW * 0.44, -enemyH * 0.02, enemyW * 0.34, torsoTop);
      ctx.quadraticCurveTo(0, -enemyH * 0.22, -enemyW * 0.34, torsoTop);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.1, enemyH * 0.02, enemyW * 0.08, enemyH * 0.06, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(enemyW * 0.14, -enemyH * 0.02, enemyW * 0.06, enemyH * 0.05, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.ellipse(enemyW * 0.16, -enemyH * 0.01, enemyW * 0.03, enemyH * 0.045, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.11, enemyH * 0.03, enemyW * 0.035, enemyH * 0.05, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = zombieBody;
      ctx.beginPath();
      ctx.ellipse(0, -enemyH * 0.28, enemyW * 0.22, headR, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(enemyW * 0.08, -enemyH * 0.25, enemyW * 0.06, enemyH * 0.04, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = bg + '88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.08, -enemyH * 0.31);
      ctx.quadraticCurveTo(0, -enemyH * 0.34, enemyW * 0.08, -enemyH * 0.31);
      ctx.stroke();

      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(-enemyW * 0.07, -enemyH * 0.285, enemyW * 0.028, 0, Math.PI * 2);
      ctx.arc(enemyW * 0.05, -enemyH * 0.278, enemyW * 0.028, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg + '88';
      ctx.beginPath();
      ctx.arc(-enemyW * 0.07, -enemyH * 0.285, enemyW * 0.012, 0, Math.PI * 2);
      ctx.arc(enemyW * 0.05, -enemyH * 0.278, enemyW * 0.012, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg + 'aa';
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.04, -enemyH * 0.22);
      ctx.quadraticCurveTo(0, -enemyH * 0.16, enemyW * 0.04, -enemyH * 0.22);
      ctx.lineTo(enemyW * 0.03, -enemyH * 0.12);
      ctx.quadraticCurveTo(0, -enemyH * 0.08, -enemyW * 0.03, -enemyH * 0.12);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = bone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.03, -enemyH * 0.12);
      ctx.lineTo(-enemyW * 0.02, -enemyH * 0.08);
      ctx.lineTo(0, -enemyH * 0.06);
      ctx.lineTo(enemyW * 0.02, -enemyH * 0.08);
      ctx.lineTo(enemyW * 0.03, -enemyH * 0.12);
      ctx.stroke();

      ctx.strokeStyle = zombieBody;
      ctx.lineWidth = enemyW * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.22, shoulderY);
      ctx.quadraticCurveTo(-enemyW * 0.5, -enemyH * 0.02, -enemyW * 0.72, enemyH * 0.12);
      ctx.quadraticCurveTo(-enemyW * 0.92, enemyH * 0.22, -enemyW * 0.98, enemyH * 0.3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(enemyW * 0.22, shoulderY);
      ctx.quadraticCurveTo(enemyW * 0.52, -enemyH * 0.01, enemyW * 0.76, enemyH * 0.13);
      ctx.quadraticCurveTo(enemyW * 0.96, enemyH * 0.24, enemyW * 1.02, enemyH * 0.32);
      ctx.stroke();

      ctx.strokeStyle = cloth;
      ctx.lineWidth = enemyW * 0.08;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.18, shoulderY + 4);
      ctx.quadraticCurveTo(-enemyW * 0.42, enemyH * 0.02, -enemyW * 0.64, enemyH * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(enemyW * 0.18, shoulderY + 4);
      ctx.quadraticCurveTo(enemyW * 0.42, enemyH * 0.02, enemyW * 0.68, enemyH * 0.16);
      ctx.stroke();

      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.78, enemyH * 0.24, enemyW * 0.06, enemyH * 0.04, -0.4, 0, Math.PI * 2);
      ctx.ellipse(enemyW * 0.82, enemyH * 0.26, enemyW * 0.065, enemyH * 0.045, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = zombieBody;
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.98, enemyH * 0.31, enemyW * 0.11, enemyH * 0.07, -0.2, 0, Math.PI * 2);
      ctx.ellipse(enemyW * 1.02, enemyH * 0.33, enemyW * 0.12, enemyH * 0.075, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = bone;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-enemyW * 1.02 + i * enemyW * 0.03, enemyH * 0.29);
        ctx.lineTo(-enemyW * 1.06 + i * enemyW * 0.03, enemyH * 0.36);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(enemyW * 0.98 + i * enemyW * 0.03, enemyH * 0.31);
        ctx.lineTo(enemyW * 1.02 + i * enemyW * 0.03, enemyH * 0.39);
        ctx.stroke();
      }

      ctx.strokeStyle = zombieBody;
      ctx.lineWidth = enemyW * 0.11;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.14, hipY);
      ctx.quadraticCurveTo(-enemyW * 0.18, enemyH * 0.28, -enemyW * 0.12, enemyH * 0.46);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(enemyW * 0.14, hipY);
      ctx.quadraticCurveTo(enemyW * 0.2, enemyH * 0.28, enemyW * 0.12, enemyH * 0.48);
      ctx.stroke();

      ctx.strokeStyle = cloth;
      ctx.lineWidth = enemyW * 0.07;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.08, hipY);
      ctx.lineTo(-enemyW * 0.06, enemyH * 0.46);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(enemyW * 0.08, hipY);
      ctx.lineTo(enemyW * 0.05, enemyH * 0.48);
      ctx.stroke();

      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.ellipse(-enemyW * 0.12, enemyH * 0.47, enemyW * 0.04, enemyH * 0.03, 0, 0, Math.PI * 2);
      ctx.ellipse(enemyW * 0.12, enemyH * 0.49, enemyW * 0.04, enemyH * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cloth;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.34, torsoBottom - 4);
      ctx.lineTo(-enemyW * 0.18, enemyH * 0.34);
      ctx.lineTo(-enemyW * 0.04, torsoBottom + 8);
      ctx.lineTo(enemyW * 0.06, enemyH * 0.36);
      ctx.lineTo(enemyW * 0.22, torsoBottom + 4);
      ctx.lineTo(enemyW * 0.34, enemyH * 0.32);
      ctx.lineTo(enemyW * 0.3, torsoBottom - 2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = flesh;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-enemyW * 0.18, -enemyH * 0.02);
      ctx.lineTo(-enemyW * 0.08, enemyH * 0.08);
      ctx.lineTo(0, enemyH * 0.02);
      ctx.stroke();

      ctx.restore();
    };

    if (state === 'attack') {
      const atkScale = state === 'attack' ? 1.0 + Math.sin(t * 6) * 0.15 : 1.0;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(atkScale, atkScale);
      ctx.translate(-W * 0.5, -H * 0.42);
      drawZombie();
      ctx.restore();
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    } else if (state === 'recoil') {
      const recoilX = 30;
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      drawZombie();
      ctx.restore();

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + t * 2;
        const r = impact * (30 + i * 3);
        const px = enemyX + Math.cos(a) * r;
        const py = enemyY + enemyH * 0.02 + Math.sin(a) * r * 0.6;
        ctx.fillStyle = accent + (i % 2 === 0 ? 'dd' : '99');
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawZombie();
    }

    const weaponGrad = ctx.createLinearGradient(0, H * 0.82, 0, H);
    weaponGrad.addColorStop(0, accent + '66');
    weaponGrad.addColorStop(1, accent + 'cc');

    ctx.fillStyle = getCSSVar('--player-glove-color', '#5a4632');
    ctx.beginPath();
    ctx.moveTo(W * 0.43, H * 0.96);
    ctx.quadraticCurveTo(W * 0.445, H * 0.88, W * 0.47, H * 0.84);
    ctx.quadraticCurveTo(W * 0.5, H * 0.82, W * 0.53, H * 0.84);
    ctx.quadraticCurveTo(W * 0.555, H * 0.88, W * 0.57, H * 0.96);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = weaponGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.49, H * 0.9);
    ctx.lineTo(W * 0.51, H * 0.9);
    ctx.lineTo(W * 0.535, H * 0.72);
    ctx.lineTo(W * 0.5, H * 0.62);
    ctx.lineTo(W * 0.465, H * 0.72);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.49, H * 0.9);
    ctx.lineTo(W * 0.5, H * 0.62);
    ctx.lineTo(W * 0.51, H * 0.9);
    ctx.stroke();

    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.25, W * 0.5, H * 0.5, H * 0.75);
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