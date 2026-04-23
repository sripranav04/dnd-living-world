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
    const flickerL = 0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 17.1) * 0.04;
    const flickerR = 0.85 + Math.sin(t * 6.7 + 0.8) * 0.08 + Math.sin(t * 15.4 + 0.3) * 0.05;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, wall);
    bgGrad.addColorStop(0.45, bg);
    bgGrad.addColorStop(1, floorC);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.32, 0);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.16, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.68, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX + W * 0.16, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, wall);
    ceilGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, 0);
    ctx.lineTo(W * 0.82, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
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
    ctx.lineWidth = Math.max(1, W * 0.002);
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((H - vpY) * i) / 9;
      const spread = ((y - vpY) / (H - vpY)) * W * 0.52;
      ctx.beginPath();
      ctx.moveTo(vpX - spread, y);
      ctx.lineTo(vpX + spread, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, flicker: number, side: 'left' | 'right') => {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, W * 0.12);
      glow.addColorStop(0, torch + '99');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, W * 0.12 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent + '88';
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x + (side === 'left' ? W * 0.03 : -W * 0.03), y);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, W * 0.01, 0, Math.PI * 2);
      ctx.fill();

      const flame = ctx.createLinearGradient(x, y - H * 0.04, x, y + H * 0.02);
      flame.addColorStop(0, accent + 'dd');
      flame.addColorStop(0.45, torch);
      flame.addColorStop(1, torch + '00');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.035 * flicker);
      ctx.quadraticCurveTo(x + W * 0.015, y - H * 0.005, x, y + H * 0.015);
      ctx.quadraticCurveTo(x - W * 0.015, y - H * 0.005, x, y - H * 0.035 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.18, H * 0.3, flickerL, 'left');
    drawTorch(W * 0.82, H * 0.3, flickerR, 'right');

    for (let i = 0; i < 18; i++) {
      const px = ((i * 97.13) % 1) * W;
      const py = vpY + ((((i * 53.71) % 1) * 0.5) + 0.15) * H;
      const r = 1 + ((i * 19.37) % 1) * 2;
      const drift = Math.sin(t * 0.3 + i) * W * 0.01;
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.arc(px + drift, py - Math.sin(t * 0.5 + i * 0.7) * 6, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const mist = ctx.createLinearGradient(0, vpY, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.4, bg + '33');
    mist.addColorStop(1, bg + '55');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vpY, W, H - vpY);

    for (let i = 0; i < 4; i++) {
      const my = H * (0.58 + i * 0.08) + Math.sin(t * 0.4 + i) * 8;
      const mx = vpX + Math.sin(t * 0.25 + i * 1.7) * W * 0.06;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, W * 0.22);
      mg.addColorStop(0, bg + '22');
      mg.addColorStop(1, bg + '00');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(mx, my, W * 0.22, H * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowY = H * 0.5 + Math.sin(t * 0.9) * 2;
    ctx.fillStyle = bg + '66';
    ctx.beginPath();
    ctx.ellipse(vpX, shadowY, W * 0.035, H * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.34);
    ctx.lineTo(vpX - W * 0.018, H * 0.42);
    ctx.lineTo(vpX - W * 0.01, H * 0.5);
    ctx.lineTo(vpX + W * 0.01, H * 0.5);
    ctx.lineTo(vpX + W * 0.018, H * 0.42);
    ctx.closePath();
    ctx.fill();

    const handBob = Math.sin(t * 1.2) * 4;
    const handX = vpX;
    const handY = H * 0.92 + handBob;
    const handGrad = ctx.createLinearGradient(handX, handY - H * 0.08, handX, handY + H * 0.02);
    handGrad.addColorStop(0, wall + 'ee');
    handGrad.addColorStop(1, bg);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(handX - W * 0.045, H);
    ctx.quadraticCurveTo(handX - W * 0.05, handY - H * 0.03, handX - W * 0.02, handY - H * 0.06);
    ctx.lineTo(handX + W * 0.02, handY - H * 0.06);
    ctx.quadraticCurveTo(handX + W * 0.05, handY - H * 0.03, handX + W * 0.045, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '55';
    ctx.beginPath();
    ctx.moveTo(handX, handY - H * 0.09);
    ctx.lineTo(handX - W * 0.008, handY - H * 0.055);
    ctx.lineTo(handX + W * 0.008, handY - H * 0.055);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, W * 0.2, vpX, H * 0.5, W * 0.75);
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