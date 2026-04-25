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

    const wallGrad = ctx.createLinearGradient(0, 0, W, H);
    wallGrad.addColorStop(0, wall);
    wallGrad.addColorStop(0.5, bg);
    wallGrad.addColorStop(1, wall);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilingGrad = ctx.createLinearGradient(0, 0, 0, vy);
    ceilingGrad.addColorStop(0, wall);
    ceilingGrad.addColorStop(1, bg + 'cc');
    ctx.fillStyle = ceilingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(vx + W * 0.18, vy);
    ctx.lineTo(vx - W * 0.18, vy);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vy, 0, H);
    floorGrad.addColorStop(0, floorC + 'cc');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(vx + W * 0.18, vy);
    ctx.lineTo(vx - W * 0.18, vy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vx - W * 0.18, vy);
    ctx.lineTo(vx - W * 0.18, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(vx + W * 0.18, vy);
    ctx.lineTo(vx + W * 0.18, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 2;
    for (let i = -5; i <= 5; i++) {
      const sx = vx + i * (W * 0.12);
      ctx.beginPath();
      ctx.moveTo(sx, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const y = vy + ((H - vy) / 8) * i;
      const inset = (i / 8) * W * 0.32;
      ctx.strokeStyle = accent + '18';
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const torchY = H * 0.3;
    const flickerL = 0.9 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 13.1) * 0.04;
    const flickerR = 0.9 + Math.sin(t * 6.7 + 1.2) * 0.08 + Math.sin(t * 11.4) * 0.05;

    const drawTorch = (x: number, y: number, flicker: number) => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16 * flicker);
      glow.addColorStop(0, torch + 'cc');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - W * 0.015, y + H * 0.015);
      ctx.lineTo(x + W * 0.015, y - H * 0.015);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillRect(x - W * 0.01, y + H * 0.005, W * 0.02, H * 0.008);

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.03 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.005, x, y + H * 0.008);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.005, x, y - H * 0.03 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'aa';
      ctx.beginPath();
      ctx.arc(x, y - H * 0.008, H * 0.008, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(W * 0.16, torchY, flickerL);
    drawTorch(W * 0.84, torchY, flickerR);

    const mist = ctx.createLinearGradient(0, vy, 0, H);
    mist.addColorStop(0, bg + '00');
    mist.addColorStop(0.5, accent + '10');
    mist.addColorStop(1, bg + '33');
    ctx.fillStyle = mist;
    ctx.fillRect(0, vy, W, H - vy);

    for (let i = 0; i < 18; i++) {
      const px = ((i * 97.3 + t * 12) % (W + 80)) - 40;
      const py = vy + (((i * 53.7 + t * 7) % (H - vy + 60)) - 30);
      const r = 1 + (i % 3);
      ctx.fillStyle = accent + '33';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = bg + '88';
    ctx.beginPath();
    ctx.moveTo(vx - W * 0.03, vy + H * 0.02);
    ctx.quadraticCurveTo(vx, vy - H * 0.03, vx + W * 0.03, vy + H * 0.02);
    ctx.quadraticCurveTo(vx + W * 0.02, vy + H * 0.08, vx, vy + H * 0.1);
    ctx.quadraticCurveTo(vx - W * 0.02, vy + H * 0.08, vx - W * 0.03, vy + H * 0.02);
    ctx.fill();

    const shadowGlow = ctx.createRadialGradient(vx, vy + H * 0.05, 0, vx, vy + H * 0.05, H * 0.12);
    shadowGlow.addColorStop(0, bg + '55');
    shadowGlow.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGlow;
    ctx.beginPath();
    ctx.arc(vx, vy + H * 0.05, H * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent + '22';
    ctx.beginPath();
    ctx.moveTo(W * 0.47, H);
    ctx.lineTo(W * 0.53, H);
    ctx.lineTo(W * 0.515, H * 0.9);
    ctx.lineTo(W * 0.485, H * 0.9);
    ctx.closePath();
    ctx.fill();

    const handGrad = ctx.createLinearGradient(0, H * 0.88, 0, H);
    handGrad.addColorStop(0, wall + 'dd');
    handGrad.addColorStop(1, wall);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.43, H);
    ctx.quadraticCurveTo(W * 0.445, H * 0.92, W * 0.48, H * 0.89);
    ctx.lineTo(W * 0.52, H * 0.89);
    ctx.quadraticCurveTo(W * 0.555, H * 0.92, W * 0.57, H);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(vx, H * 0.5, Math.min(W, H) * 0.35, vx, H * 0.5, Math.max(W, H) * 0.75);
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