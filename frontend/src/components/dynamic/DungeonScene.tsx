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
    const flickerL = 0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 19.1) * 0.04;
    const flickerR = 0.85 + Math.sin(t * 6.7 + 0.8) * 0.08 + Math.sin(t * 17.4 + 0.4) * 0.04;

    const wallGrad = ctx.createLinearGradient(0, 0, W, 0);
    wallGrad.addColorStop(0, wall);
    wallGrad.addColorStop(0.5, bg);
    wallGrad.addColorStop(1, wall);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, wall);
    ceilGrad.addColorStop(1, bg);
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W * 0.28, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, bg);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, vpY);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.28, vpY);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = Math.max(1, W * 0.002);
    for (let i = 0; i < 10; i++) {
      const x = (i / 9) * W;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i++) {
      const y = vpY + ((i + 1) / 7) * (H - vpY);
      const inset = ((y - vpY) / (H - vpY)) * W * 0.34;
      ctx.strokeStyle = accent + '18';
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, flicker: number, side: -1 | 1) => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, H * 0.16);
      glow.addColorStop(0, torch + '88');
      glow.addColorStop(0.35, torch + '33');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.03, y + H * 0.01);
      ctx.lineTo(x, y);
      ctx.lineTo(x - side * W * 0.018, y - H * 0.03);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y + H * 0.005, H * 0.012, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch + 'dd';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.045 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.01, x, y + H * 0.01);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.01, x, y - H * 0.045 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.025 * flicker);
      ctx.quadraticCurveTo(x + W * 0.006, y - H * 0.005, x, y + H * 0.004);
      ctx.quadraticCurveTo(x - W * 0.006, y - H * 0.005, x, y - H * 0.025 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.16, H * 0.3, flickerL, -1);
    drawTorch(W * 0.84, H * 0.3, flickerR, 1);

    const archStroke = accent + '20';
    ctx.strokeStyle = archStroke;
    ctx.lineWidth = Math.max(1, W * 0.003);
    for (let i = 0; i < 4; i++) {
      const p = i / 4;
      const topY = vpY - p * H * 0.18;
      const leftX = W * (0.28 - p * 0.12);
      const rightX = W * (0.72 + p * 0.12);
      ctx.beginPath();
      ctx.moveTo(leftX, H);
      ctx.lineTo(leftX, topY);
      ctx.quadraticCurveTo(vpX, topY - H * 0.08, rightX, topY);
      ctx.lineTo(rightX, H);
      ctx.stroke();
    }

    ctx.fillStyle = bg + '55';
    for (let i = 0; i < 18; i++) {
      const yy = vpY + (i / 18) * (H - vpY);
      const ww = W * (0.08 + i * 0.012);
      const xx = vpX - ww * 0.5 + Math.sin(t * 0.3 + i) * W * 0.01;
      ctx.fillRect(xx, yy, ww, H * 0.008);
    }

    for (let i = 0; i < 24; i++) {
      const px = (Math.sin(i * 91.7 + t * 0.35) * 0.5 + 0.5) * W;
      const py = (Math.cos(i * 57.3 + t * 0.22) * 0.5 + 0.5) * H * 0.8 + H * 0.08;
      const r = Math.max(0.6, H * 0.002 * (1 + ((i % 3) * 0.4)));
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const mist = ctx.createLinearGradient(0, vpY, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.45, bg + '22');
    mist.addColorStop(1, bg + '44');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vpY, W, H - vpY);

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX, vpY + H * 0.02);
    ctx.lineTo(vpX - W * 0.03, vpY + H * 0.11);
    ctx.lineTo(vpX - W * 0.012, vpY + H * 0.11);
    ctx.lineTo(vpX - W * 0.008, vpY + H * 0.17);
    ctx.lineTo(vpX + W * 0.008, vpY + H * 0.17);
    ctx.lineTo(vpX + W * 0.012, vpY + H * 0.11);
    ctx.lineTo(vpX + W * 0.03, vpY + H * 0.11);
    ctx.closePath();
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.2) * 2;
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.46, handY - H * 0.05, W * 0.485, handY - H * 0.02);
    ctx.lineTo(W * 0.515, handY - H * 0.02);
    ctx.quadraticCurveTo(W * 0.54, handY - H * 0.05, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '55';
    ctx.beginPath();
    ctx.moveTo(W * 0.492, handY - H * 0.06);
    ctx.lineTo(W * 0.508, handY - H * 0.06);
    ctx.lineTo(W * 0.504, handY - H * 0.16);
    ctx.lineTo(W * 0.496, handY - H * 0.16);
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