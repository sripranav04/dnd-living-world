import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function ForestScene() {
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

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, bg);
    wallGrad.addColorStop(0.35, wall);
    wallGrad.addColorStop(1, floorC);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.78, vy);
    ctx.lineTo(W * 0.22, vy);
    ctx.closePath();
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vy);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + 'cc');
    ctx.fillStyle = ceilGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.72, vy);
    ctx.lineTo(W * 0.28, vy);
    ctx.closePath();
    const floorGrad = ctx.createLinearGradient(0, vy, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.22, vy);
    ctx.lineTo(W * 0.28, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    const leftWallGrad = ctx.createLinearGradient(0, 0, W * 0.28, 0);
    leftWallGrad.addColorStop(0, wall);
    leftWallGrad.addColorStop(1, wall + '66');
    ctx.fillStyle = leftWallGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.78, vy);
    ctx.lineTo(W * 0.72, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    const rightWallGrad = ctx.createLinearGradient(W * 0.72, 0, W, 0);
    rightWallGrad.addColorStop(0, wall + '66');
    rightWallGrad.addColorStop(1, wall);
    ctx.fillStyle = rightWallGrad;
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const sx = vx + i * (W * 0.09);
      ctx.beginPath();
      ctx.moveTo(sx, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }

    for (let i = 1; i <= 7; i++) {
      const y = vy + ((H - vy) * i) / 8;
      const inset = (W * 0.22 * (8 - i)) / 8;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.strokeStyle = accent + '18';
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: 'left' | 'right') => {
      const flicker = 0.9 + Math.sin(t * 8 + x * 0.01) * 0.08 + Math.sin(t * 17 + y * 0.02) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, H * 0.16 * flicker);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x - W * 0.03, y + H * 0.015);
        ctx.lineTo(x, y);
        ctx.lineTo(x + W * 0.012, y + H * 0.03);
      } else {
        ctx.moveTo(x + W * 0.03, y + H * 0.015);
        ctx.lineTo(x, y);
        ctx.lineTo(x - W * 0.012, y + H * 0.03);
      }
      ctx.stroke();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.03 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.005, x, y + H * 0.012);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.005, x, y - H * 0.03 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.arc(x, y + H * 0.018, W * 0.008, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.16, H * 0.3, 'left');
    drawTorch(W * 0.84, H * 0.3, 'right');

    for (let i = 0; i < 18; i++) {
      const px = ((i * 73.17 + t * 18) % (W + 80)) - 40;
      const py = vy + (((i * 41.3 + t * 9) % (H - vy + 60)) - 30);
      const r = 1 + (i % 3);
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const mist = ctx.createLinearGradient(0, vy - H * 0.02, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.45, bg + '22');
    mist.addColorStop(1, bg + '55');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vy - H * 0.02, W, H - vy + H * 0.02);

    for (let i = 0; i < 4; i++) {
      const mx = W * (0.2 + i * 0.18) + Math.sin(t * 0.4 + i) * W * 0.03;
      const my = H * (0.62 + (i % 2) * 0.06);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, W * 0.18);
      mg.addColorStop(0, bg + '33');
      mg.addColorStop(1, bg + '00');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(mx, my, W * 0.18, H * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowY = H * 0.56 + Math.sin(t * 0.7) * 3;
    const shadowGrad = ctx.createRadialGradient(vx, shadowY, 0, vx, shadowY, W * 0.12);
    shadowGrad.addColorStop(0, bg + '66');
    shadowGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(vx, shadowY, W * 0.12, H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + '88';
    ctx.beginPath();
    ctx.arc(vx, H * 0.5, W * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(vx, H * 0.5);
    ctx.lineTo(vx - W * 0.02, H * 0.58);
    ctx.lineTo(vx + W * 0.02, H * 0.58);
    ctx.closePath();
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.2) * 2;
    ctx.fillStyle = wall + 'dd';
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.455, handY - H * 0.03, W * 0.48, handY - H * 0.015);
    ctx.lineTo(W * 0.52, handY - H * 0.015);
    ctx.quadraticCurveTo(W * 0.545, handY - H * 0.03, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + 'cc';
    ctx.beginPath();
    ctx.moveTo(W * 0.495, H * 0.98);
    ctx.lineTo(W * 0.505, H * 0.98);
    ctx.lineTo(W * 0.515, H * 0.84);
    ctx.lineTo(W * 0.485, H * 0.84);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(vx, H * 0.5, W * 0.25, vx, H * 0.5, W * 0.75);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    if (state === 'attack') {
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    if (impact > 0) {
      ctx.fillStyle = accent + '11';
      ctx.fillRect(0, 0, W, H);
    }
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