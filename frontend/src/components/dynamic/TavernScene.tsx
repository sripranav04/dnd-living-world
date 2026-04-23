import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function TavernScene() {
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

    const wallShade = ctx.createLinearGradient(0, 0, W, 0);
    wallShade.addColorStop(0, wall);
    wallShade.addColorStop(0.18, bg);
    wallShade.addColorStop(0.5, bg);
    wallShade.addColorStop(0.82, bg);
    wallShade.addColorStop(1, wall);
    ctx.fillStyle = wallShade;
    ctx.fillRect(0, 0, W, H);

    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilingGrad.addColorStop(0, wall);
    ceilingGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = ceilingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W * 0.28, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + '66');
    floorGrad.addColorStop(0.35, floorC + 'bb');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, vpY);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i++) {
      const x = vpX + i * (W * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 1; i <= 8; i++) {
      const y = vpY + i * ((H - vpY) / 9);
      const inset = (y - vpY) * 0.9;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    ctx.strokeStyle = wall + 'cc';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const p = i / 6;
      const lx = W * (0.12 + p * 0.18);
      const rx = W * (0.88 - p * 0.18);
      const y1 = H * (0.08 + p * 0.08);
      const y2 = H * (0.92 - p * 0.08);
      ctx.beginPath();
      ctx.moveTo(lx, y1);
      ctx.lineTo(lx + W * 0.03, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx, y1);
      ctx.lineTo(rx - W * 0.03, y2);
      ctx.stroke();
    }

    const torchY = H * 0.3;
    const flickerL = 0.85 + Math.sin(t * 8.7) * 0.08 + Math.sin(t * 17.3) * 0.04;
    const flickerR = 0.85 + Math.sin(t * 9.4 + 1.2) * 0.08 + Math.sin(t * 15.1) * 0.05;

    const drawTorch = (x: number, y: number, flicker: number, side: 'left' | 'right') => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16);
      glow.addColorStop(0, torch + 'aa');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x - W * 0.03, y + H * 0.015);
        ctx.lineTo(x + W * 0.005, y + H * 0.005);
      } else {
        ctx.moveTo(x + W * 0.03, y + H * 0.015);
        ctx.lineTo(x - W * 0.005, y + H * 0.005);
      }
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y + H * 0.008, H * 0.012, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch + 'dd';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.035 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.005, x, y + H * 0.01);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.005, x, y - H * 0.035 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'dd';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.02 * flicker);
      ctx.quadraticCurveTo(x + W * 0.006, y - H * 0.002, x, y + H * 0.006);
      ctx.quadraticCurveTo(x - W * 0.006, y - H * 0.002, x, y - H * 0.02 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.18, torchY, flickerL, 'left');
    drawTorch(W * 0.82, torchY, flickerR, 'right');

    const mist = ctx.createLinearGradient(0, vpY - H * 0.05, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.45, accent + '08');
    mist.addColorStop(1, bg + '22');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vpY - H * 0.05, W, H - vpY + H * 0.05);

    for (let i = 0; i < 28; i++) {
      const px = ((i * 97.13 + t * 12) % (W + 40)) - 20;
      const py = vpY + ((i * 43.71 + t * 7) % (H - vpY));
      const r = 0.8 + (i % 3) * 0.7;
      ctx.fillStyle = accent + (i % 2 === 0 ? '22' : '14');
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.025, vpY + H * 0.02);
    ctx.quadraticCurveTo(vpX - W * 0.018, vpY - H * 0.03, vpX, vpY - H * 0.035);
    ctx.quadraticCurveTo(vpX + W * 0.018, vpY - H * 0.03, vpX + W * 0.025, vpY + H * 0.02);
    ctx.quadraticCurveTo(vpX + W * 0.012, vpY + H * 0.06, vpX, vpY + H * 0.055);
    ctx.quadraticCurveTo(vpX - W * 0.012, vpY + H * 0.06, vpX - W * 0.025, vpY + H * 0.02);
    ctx.fill();
    ctx.restore();

    const handY = H * 0.92 + Math.sin(t * 1.6) * 2;
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.455, handY - H * 0.03, W * 0.48, handY - H * 0.02);
    ctx.lineTo(W * 0.52, handY - H * 0.02);
    ctx.quadraticCurveTo(W * 0.545, handY - H * 0.03, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '88';
    ctx.beginPath();
    ctx.moveTo(W * 0.495, handY - H * 0.08);
    ctx.lineTo(W * 0.505, handY - H * 0.08);
    ctx.lineTo(W * 0.515, handY - H * 0.02);
    ctx.lineTo(W * 0.485, handY - H * 0.02);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, H * 0.2, vpX, H * 0.5, H * 0.8);
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