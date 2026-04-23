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
    const vpX = W * 0.5;
    const vpY = H * 0.45;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilingGrad.addColorStop(0, wall);
    ceilingGrad.addColorStop(1, bg);
    ctx.fillStyle = ceilingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.closePath();
    ctx.fill();

    const leftWallGrad = ctx.createLinearGradient(0, 0, vpX, 0);
    leftWallGrad.addColorStop(0, wall);
    leftWallGrad.addColorStop(1, bg);
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.12, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const rightWallGrad = ctx.createLinearGradient(W, 0, vpX, 0);
    rightWallGrad.addColorStop(0, wall);
    rightWallGrad.addColorStop(1, bg);
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX + W * 0.12, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, bg);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.08, vpY);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const p = i / 9;
      const y = vpY + (H - vpY) * p * p;
      const inset = (W * 0.5) * (1 - p * 0.9);
      ctx.strokeStyle = accent + '18';
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: 'left' | 'right') => {
      const flicker = 0.9 + Math.sin(t * 8 + x * 0.01) * 0.08 + Math.sin(t * 17 + y * 0.02) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, H * 0.16);
      glow.addColorStop(0, torch + '88');
      glow.addColorStop(0.35, torch + '33');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent + '88';
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x - W * 0.03, y);
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x + W * 0.03, y);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.012, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch + 'dd';
      ctx.beginPath();
      ctx.ellipse(x, y - H * 0.018, W * 0.01 * flicker, H * 0.03 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.ellipse(x, y - H * 0.028, W * 0.004 * flicker, H * 0.014 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.18, H * 0.3, 'left');
    drawTorch(W * 0.82, H * 0.3, 'right');

    ctx.strokeStyle = accent + '14';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const p = i / 7;
      const yTop = vpY * p;
      const leftX = vpX - (vpX * (1 - p * 0.85));
      const rightX = vpX + ((W - vpX) * (1 - p * 0.85));
      ctx.beginPath();
      ctx.moveTo(leftX, yTop);
      ctx.lineTo(leftX, H * 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightX, yTop);
      ctx.lineTo(rightX, H * 0.95);
      ctx.stroke();
    }

    const mistLayers = 4;
    for (let i = 0; i < mistLayers; i++) {
      const my = H * (0.58 + i * 0.08) + Math.sin(t * (0.4 + i * 0.15) + i) * 8;
      const mist = ctx.createLinearGradient(0, my - H * 0.05, 0, my + H * 0.05);
      mist.addColorStop(0, bg + '00');
      mist.addColorStop(0.5, accent + '10');
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      ctx.fillRect(0, my - H * 0.05, W, H * 0.1);
    }

    for (let i = 0; i < 36; i++) {
      const px = ((i * 97.13 + t * (8 + (i % 5))) % (W + 40)) - 20;
      const py = (H * 0.15 + ((i * 53.71 + t * (12 + (i % 7) * 2)) % (H * 0.7)));
      const r = 0.8 + (i % 3) * 0.6;
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowAlpha = 0.18 + Math.sin(t * 0.7) * 0.03;
    ctx.fillStyle = bg + '00';
    const distantGlow = ctx.createRadialGradient(vpX, H * 0.58, 0, vpX, H * 0.58, H * 0.18);
    distantGlow.addColorStop(0, accent + '10');
    distantGlow.addColorStop(1, accent + '00');
    ctx.fillStyle = distantGlow;
    ctx.beginPath();
    ctx.arc(vpX, H * 0.58, H * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = wall + Math.round(Math.max(0, Math.min(255, shadowAlpha * 255))).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.018, H * 0.62);
    ctx.quadraticCurveTo(vpX - W * 0.01, H * 0.54, vpX - W * 0.006, H * 0.5);
    ctx.quadraticCurveTo(vpX, H * 0.46, vpX + W * 0.006, H * 0.5);
    ctx.quadraticCurveTo(vpX + W * 0.01, H * 0.54, vpX + W * 0.018, H * 0.62);
    ctx.quadraticCurveTo(vpX, H * 0.64, vpX - W * 0.018, H * 0.62);
    ctx.fill();

    ctx.fillStyle = accent + '18';
    ctx.beginPath();
    ctx.ellipse(vpX, H * 0.63, W * 0.03, H * 0.01, 0, 0, Math.PI * 2);
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.6) * 2;
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.455, handY - H * 0.03, W * 0.475, handY - H * 0.015);
    ctx.lineTo(W * 0.49, handY);
    ctx.lineTo(W * 0.51, handY);
    ctx.quadraticCurveTo(W * 0.545, handY - H * 0.03, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '66';
    ctx.beginPath();
    ctx.moveTo(W * 0.495, handY - H * 0.06);
    ctx.lineTo(W * 0.505, handY - H * 0.06);
    ctx.lineTo(W * 0.515, handY - H * 0.005);
    ctx.lineTo(W * 0.485, handY - H * 0.005);
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
      ctx.fillStyle = accent + Math.round(impact * 40).toString(16).padStart(2, '0');
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