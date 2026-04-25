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
    const flicker = 0.85 + Math.sin(t * 8.7) * 0.08 + Math.sin(t * 17.3) * 0.04;
    const mistDrift = Math.sin(t * 0.35) * W * 0.015;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, wall);
    bgGrad.addColorStop(0.45, bg);
    bgGrad.addColorStop(1, floorC);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.28, 0);
    ctx.lineTo(vpX - W * 0.06, vpY);
    ctx.lineTo(vpX - W * 0.12, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.72, 0);
    ctx.lineTo(vpX + W * 0.06, vpY);
    ctx.lineTo(vpX + W * 0.12, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + 'cc');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, 0);
    ctx.lineTo(W * 0.72, 0);
    ctx.lineTo(vpX + W * 0.06, vpY);
    ctx.lineTo(vpX - W * 0.06, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.06, vpY);
    ctx.lineTo(vpX + W * 0.06, vpY);
    ctx.lineTo(W * 0.88, H);
    ctx.lineTo(W * 0.12, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 1; i <= 7; i++) {
      const y = vpY + ((H - vpY) * i) / 8;
      const spread = ((y - vpY) / (H - vpY)) * W * 0.38;
      ctx.beginPath();
      ctx.moveTo(vpX - spread, y);
      ctx.lineTo(vpX + spread, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: -1 | 1) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, W * 0.12);
      glow.addColorStop(0, torch + 'aa');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, W * 0.12 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.03, y - H * 0.015);
      ctx.lineTo(x, y);
      ctx.lineTo(x - side * W * 0.03, y + H * 0.015);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillRect(x - W * 0.008, y - H * 0.01, W * 0.016, H * 0.02);

      const flame = ctx.createRadialGradient(x, y - H * 0.018, 0, x, y - H * 0.018, H * 0.05);
      flame.addColorStop(0, torch);
      flame.addColorStop(0.5, accent + 'cc');
      flame.addColorStop(1, torch + '00');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.05);
      ctx.quadraticCurveTo(x + Math.sin(t * 11 + x) * W * 0.01, y - H * 0.02, x, y - H * 0.005);
      ctx.quadraticCurveTo(x - Math.sin(t * 9 + y) * W * 0.01, y - H * 0.02, x, y - H * 0.05);
      ctx.fill();
    };

    drawTorch(W * 0.18, H * 0.3, -1);
    drawTorch(W * 0.82, H * 0.3, 1);

    const corridorMist = ctx.createLinearGradient(0, vpY * 0.8, 0, H);
    corridorMist.addColorStop(0, bg + '00');
    corridorMist.addColorStop(0.5, accent + '10');
    corridorMist.addColorStop(1, bg + '22');
    ctx.fillStyle = corridorMist;
    ctx.fillRect(0, vpY * 0.75, W, H - vpY * 0.75);

    for (let i = 0; i < 5; i++) {
      const mx = W * (0.18 + i * 0.16) + mistDrift * (0.3 + i * 0.1);
      const my = H * (0.58 + (i % 2) * 0.07) + Math.sin(t * 0.5 + i) * 6;
      const mr = W * (0.12 + i * 0.015);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mg.addColorStop(0, bg + '22');
      mg.addColorStop(0.6, accent + '10');
      mg.addColorStop(1, bg + '00');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(mx, my, mr, mr * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = accent + '55';
    for (let i = 0; i < 28; i++) {
      const px = ((i * 97.13 + t * 18) % (W + 40)) - 20;
      const py = ((i * 53.71 + t * 11) % (H * 0.7)) + H * 0.12;
      const r = 1 + (i % 3);
      ctx.globalAlpha = 0.15 + ((i % 5) * 0.05);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const shadowY = H * 0.5 + Math.sin(t * 0.7) * 2;
    ctx.fillStyle = bg + '66';
    ctx.beginPath();
    ctx.ellipse(vpX, shadowY, W * 0.05, H * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.41);
    ctx.lineTo(vpX - W * 0.018, H * 0.49);
    ctx.lineTo(vpX - W * 0.01, H * 0.56);
    ctx.lineTo(vpX + W * 0.01, H * 0.56);
    ctx.lineTo(vpX + W * 0.018, H * 0.49);
    ctx.closePath();
    ctx.fill();

    const distantGlow = ctx.createRadialGradient(vpX, H * 0.46, 0, vpX, H * 0.46, H * 0.12);
    distantGlow.addColorStop(0, accent + '12');
    distantGlow.addColorStop(1, accent + '00');
    ctx.fillStyle = distantGlow;
    ctx.beginPath();
    ctx.arc(vpX, H * 0.46, H * 0.12, 0, Math.PI * 2);
    ctx.fill();

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, Math.min(W, H) * 0.25, vpX, H * 0.5, Math.max(W, H) * 0.7);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    if (state === 'attack') {
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    if (impact > 0) {
      ctx.fillStyle = accent + '22';
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