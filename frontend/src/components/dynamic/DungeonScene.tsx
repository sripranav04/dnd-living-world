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
    const bob = Math.sin(t * 1.2) * 3;
    const mistDrift = t * 18;

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

    const leftWallGrad = ctx.createLinearGradient(0, 0, W * 0.28, 0);
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

    const rightWallGrad = ctx.createLinearGradient(W, 0, W * 0.72, 0);
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
    ctx.moveTo(vpX - W * 0.12, vpY);
    ctx.lineTo(vpX + W * 0.12, vpY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
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
    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((i * i) / 64) * (H - vpY);
      const inset = (y - vpY) * 0.9;
      ctx.strokeStyle = accent + (i < 4 ? '18' : '10');
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: 'left' | 'right') => {
      const flicker = 0.9 + Math.sin(t * 11 + x * 0.01) * 0.08 + Math.sin(t * 17 + y * 0.02) * 0.06;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, W * 0.12);
      glow.addColorStop(0, torch + '88');
      glow.addColorStop(0.35, torch + '33');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, W * 0.12 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x + W * 0.03, y);
        ctx.lineTo(x, y);
      } else {
        ctx.moveTo(x - W * 0.03, y);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = wall;
      ctx.beginPath();
      ctx.arc(x, y, W * 0.01, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.035 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.01, x, y + H * 0.008);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.01, x, y - H * 0.035 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.02 * flicker);
      ctx.quadraticCurveTo(x + W * 0.006, y - H * 0.006, x, y + H * 0.003);
      ctx.quadraticCurveTo(x - W * 0.006, y - H * 0.006, x, y - H * 0.02 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.16, H * 0.3 + bob, 'left');
    drawTorch(W * 0.84, H * 0.3 - bob, 'right');

    for (let i = 0; i < 18; i++) {
      const px = ((i * 73 + mistDrift * (0.3 + (i % 3) * 0.2)) % (W + 120)) - 60;
      const py = H * (0.18 + (i % 9) * 0.07) + Math.sin(t * 0.7 + i) * 8;
      const r = W * (0.03 + (i % 5) * 0.008);
      const mg = ctx.createRadialGradient(px, py, 0, px, py, r);
      mg.addColorStop(0, bg + '22');
      mg.addColorStop(1, bg + '00');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = accent + '33';
    for (let i = 0; i < 40; i++) {
      const px = (i * 97 + t * (8 + (i % 5))) % W;
      const py = (i * 53 + t * (4 + (i % 3)) * 7) % H;
      const s = 1 + (i % 3);
      ctx.globalAlpha = 0.15 + (i % 4) * 0.05;
      ctx.fillRect(px, py, s, s);
    }
    ctx.globalAlpha = 1;

    const shadowY = H * 0.57;
    ctx.fillStyle = bg + '55';
    ctx.beginPath();
    ctx.ellipse(vpX, shadowY, W * 0.08, H * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.34);
    ctx.lineTo(vpX - W * 0.025, H * 0.5);
    ctx.lineTo(vpX - W * 0.012, H * 0.62);
    ctx.lineTo(vpX + W * 0.012, H * 0.62);
    ctx.lineTo(vpX + W * 0.025, H * 0.5);
    ctx.closePath();
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.6) * 2;
    const handGrad = ctx.createLinearGradient(vpX, handY - H * 0.08, vpX, H);
    handGrad.addColorStop(0, wall);
    handGrad.addColorStop(1, bg);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.045, H);
    ctx.quadraticCurveTo(vpX - W * 0.05, handY - H * 0.03, vpX - W * 0.018, handY - H * 0.06);
    ctx.lineTo(vpX + W * 0.018, handY - H * 0.06);
    ctx.quadraticCurveTo(vpX + W * 0.05, handY - H * 0.03, vpX + W * 0.045, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '66';
    ctx.fillRect(vpX - W * 0.008, handY - H * 0.055, W * 0.016, H * 0.012);

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, W * 0.2, vpX, H * 0.5, W * 0.75);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(0.72, bg + '22');
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