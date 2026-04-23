import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DungeonScene() {
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

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vy);
    ceilGrad.addColorStop(0, wall);
    ceilGrad.addColorStop(1, bg);
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(vx + W * 0.12, vy);
    ctx.lineTo(vx - W * 0.12, vy);
    ctx.closePath();
    ctx.fill();

    const leftWallGrad = ctx.createLinearGradient(0, 0, vx, 0);
    leftWallGrad.addColorStop(0, wall);
    leftWallGrad.addColorStop(1, bg);
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vx - W * 0.12, vy);
    ctx.lineTo(vx - W * 0.18, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const rightWallGrad = ctx.createLinearGradient(W, 0, vx, 0);
    rightWallGrad.addColorStop(0, wall);
    rightWallGrad.addColorStop(1, bg);
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(vx + W * 0.12, vy);
    ctx.lineTo(vx + W * 0.18, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vy, 0, H);
    floorGrad.addColorStop(0, bg);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(vx - W * 0.12, vy);
    ctx.lineTo(vx + W * 0.12, vy);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const x = vx + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const y = vy + ((H - vy) * i) / 8;
      const inset = ((y - vy) / (H - vy)) * W * 0.5;
      ctx.strokeStyle = accent + '18';
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const torchFlickerL = 0.85 + Math.sin(t * 7.1) * 0.08 + Math.sin(t * 13.7) * 0.05;
    const torchFlickerR = 0.85 + Math.sin(t * 6.4 + 1.2) * 0.08 + Math.sin(t * 11.9 + 0.7) * 0.05;

    const drawTorch = (x: number, y: number, flicker: number, side: 'left' | 'right') => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, H * 0.18);
      glow.addColorStop(0, torch + '88');
      glow.addColorStop(0.35, torch + '33');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x + W * 0.03, y - H * 0.02);
        ctx.lineTo(x, y);
        ctx.lineTo(x + W * 0.03, y + H * 0.02);
      } else {
        ctx.moveTo(x - W * 0.03, y - H * 0.02);
        ctx.lineTo(x, y);
        ctx.lineTo(x - W * 0.03, y + H * 0.02);
      }
      ctx.stroke();

      ctx.fillStyle = wall;
      ctx.fillRect(x - W * 0.008, y - H * 0.018, W * 0.016, H * 0.036);

      ctx.fillStyle = torch + 'dd';
      ctx.beginPath();
      ctx.ellipse(x, y - H * 0.018, W * 0.008 * flicker, H * 0.022 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.ellipse(x, y - H * 0.012, W * 0.004, H * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.16, H * 0.3, torchFlickerL, 'left');
    drawTorch(W * 0.84, H * 0.3, torchFlickerR, 'right');

    const mist = ctx.createLinearGradient(0, vy, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.5, accent + '08');
    mist.addColorStop(1, bg + '22');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vy, W, H - vy);

    for (let i = 0; i < 18; i++) {
      const px = ((i * 73.17 + t * 12) % (W + 40)) - 20;
      const py = vy + (((i * 41.23 + t * 7) % (H - vy + 60)) - 30);
      const r = 1 + (i % 3);
      ctx.fillStyle = accent + '33';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowY = H * 0.5;
    const shadowGlow = ctx.createRadialGradient(vx, shadowY, 0, vx, shadowY, H * 0.12);
    shadowGlow.addColorStop(0, bg + '66');
    shadowGlow.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGlow;
    ctx.beginPath();
    ctx.ellipse(vx, shadowY, W * 0.08, H * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vx, H * 0.38);
    ctx.lineTo(vx - W * 0.018, H * 0.47);
    ctx.lineTo(vx - W * 0.01, H * 0.56);
    ctx.lineTo(vx + W * 0.01, H * 0.56);
    ctx.lineTo(vx + W * 0.018, H * 0.47);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall + '88';
    ctx.beginPath();
    ctx.arc(vx, H * 0.41, W * 0.018, Math.PI, 0);
    ctx.fill();

    const handBob = Math.sin(t * 1.2) * 4;
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.lineTo(W * 0.47, H * 0.88 + handBob);
    ctx.lineTo(W * 0.53, H * 0.88 + handBob);
    ctx.lineTo(W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '88';
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.88 + handBob);
    ctx.lineTo(W * 0.5, H * 0.76 + handBob);
    ctx.stroke();

    ctx.fillStyle = accent + '66';
    ctx.beginPath();
    ctx.moveTo(W * 0.495, H * 0.76 + handBob);
    ctx.lineTo(W * 0.505, H * 0.76 + handBob);
    ctx.lineTo(W * 0.5, H * 0.72 + handBob);
    ctx.closePath();
    ctx.fill();

    if (state === 'attack') {
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    const vignette = ctx.createRadialGradient(vx, H * 0.5, H * 0.25, vx, H * 0.5, H * 0.75);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

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