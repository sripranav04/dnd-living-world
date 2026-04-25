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
    const vpX = W * 0.5;
    const vpY = H * 0.45;

    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilingGrad.addColorStop(0, bg);
    ceilingGrad.addColorStop(1, wall);
    ctx.fillStyle = ceilingGrad;
    ctx.fillRect(0, 0, W, vpY);

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, wall);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, vpY, W, H - vpY);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.22, 0);
    ctx.lineTo(W * 0.36, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.78, 0);
    ctx.lineTo(W * 0.64, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * W * 0.08;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((i * i) / 64) * (H - vpY) * 1.15;
      const inset = (y - vpY) * 0.9;
      ctx.strokeStyle = accent + '18';
      ctx.lineWidth = Math.max(1, i * 0.35);
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const torchY = H * 0.3;
    const flickerL = 0.9 + Math.sin(t * 8.7) * 0.08 + Math.sin(t * 17.3) * 0.04;
    const flickerR = 0.9 + Math.sin(t * 7.9 + 1.2) * 0.08 + Math.sin(t * 15.1 + 0.7) * 0.04;

    const drawTorch = (x: number, y: number, flicker: number, side: 'left' | 'right') => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16 * flicker);
      glow.addColorStop(0, torch + '99');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x - 18, y - 8);
        ctx.lineTo(x + 10, y + 2);
      } else {
        ctx.moveTo(x + 18, y - 8);
        ctx.lineTo(x - 10, y + 2);
      }
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y + 2, 7, 0, Math.PI * 2);
      ctx.fill();

      const flame = ctx.createLinearGradient(x, y - 18, x, y + 10);
      flame.addColorStop(0, accent + 'ee');
      flame.addColorStop(0.45, torch + 'ee');
      flame.addColorStop(1, torch + '00');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(x, y - 20 * flicker);
      ctx.quadraticCurveTo(x + 10 * flicker, y - 4, x, y + 6);
      ctx.quadraticCurveTo(x - 10 * flicker, y - 4, x, y - 20 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.16, torchY, flickerL, 'left');
    drawTorch(W * 0.84, torchY, flickerR, 'right');

    for (let i = 0; i < 18; i++) {
      const mx = ((i * 53.7 + t * 18) % (W + 120)) - 60;
      const my = vpY + ((i * 37.1) % (H - vpY));
      const r = 40 + (i % 5) * 18;
      const mist = ctx.createRadialGradient(mx, my, 0, mx, my, r);
      mist.addColorStop(0, bg + '22');
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 36; i++) {
      const px = (i * 97.3 + t * (8 + (i % 3) * 4)) % W;
      const py = ((i * 61.7 + t * 12) % H);
      const s = 1 + (i % 3);
      ctx.fillStyle = accent + '33';
      ctx.fillRect(px, py, s, s);
    }

    const shadowGlow = ctx.createRadialGradient(vpX, H * 0.56, 0, vpX, H * 0.56, H * 0.18);
    shadowGlow.addColorStop(0, bg + '55');
    shadowGlow.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGlow;
    ctx.beginPath();
    ctx.ellipse(vpX, H * 0.56, W * 0.08, H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + '88';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.5);
    ctx.lineTo(vpX - W * 0.025, H * 0.58);
    ctx.lineTo(vpX - W * 0.012, H * 0.68);
    ctx.lineTo(vpX + W * 0.012, H * 0.68);
    ctx.lineTo(vpX + W * 0.025, H * 0.58);
    ctx.closePath();
    ctx.fill();

    const handY = H * 0.9 + Math.sin(t * 1.6) * 3;
    ctx.fillStyle = accent + 'aa';
    ctx.beginPath();
    ctx.moveTo(W * 0.46, H);
    ctx.quadraticCurveTo(W * 0.47, handY - 18, W * 0.49, handY - 10);
    ctx.lineTo(W * 0.51, handY - 10);
    ctx.quadraticCurveTo(W * 0.53, handY - 18, W * 0.54, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.485, H);
    ctx.lineTo(W * 0.495, H * 0.82);
    ctx.lineTo(W * 0.505, H * 0.82);
    ctx.lineTo(W * 0.515, H);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, H * 0.2, vpX, H * 0.5, H * 0.75);
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