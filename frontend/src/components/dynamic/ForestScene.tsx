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
    ctx.lineTo(W * 0.28, 0);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.16, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.72, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX + W * 0.16, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((H - vpY) * i) / 9;
      const inset = (W * 0.42 * i) / 9;
      ctx.strokeStyle = accent + '18';
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const torchFlickerL = 0.85 + Math.sin(t * 8.7) * 0.08 + Math.sin(t * 17.3) * 0.04;
    const torchFlickerR = 0.85 + Math.sin(t * 9.1 + 1.2) * 0.08 + Math.sin(t * 15.8 + 0.7) * 0.05;
    const sconceY = H * 0.3;
    const leftTorchX = W * 0.18;
    const rightTorchX = W * 0.82;

    const glowL = ctx.createRadialGradient(leftTorchX, sconceY, 0, leftTorchX, sconceY, W * 0.16);
    glowL.addColorStop(0, torch + '88');
    glowL.addColorStop(0.35, torch + '33');
    glowL.addColorStop(1, torch + '00');
    ctx.globalAlpha = torchFlickerL;
    ctx.fillStyle = glowL;
    ctx.beginPath();
    ctx.arc(leftTorchX, sconceY, W * 0.16, 0, Math.PI * 2);
    ctx.fill();

    const glowR = ctx.createRadialGradient(rightTorchX, sconceY, 0, rightTorchX, sconceY, W * 0.16);
    glowR.addColorStop(0, torch + '88');
    glowR.addColorStop(0.35, torch + '33');
    glowR.addColorStop(1, torch + '00');
    ctx.globalAlpha = torchFlickerR;
    ctx.fillStyle = glowR;
    ctx.beginPath();
    ctx.arc(rightTorchX, sconceY, W * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const drawTorch = (x: number, y: number, flicker: number) => {
      ctx.fillStyle = accent;
      ctx.fillRect(x - 10, y + 10, 20, 6);
      ctx.fillStyle = wall;
      ctx.fillRect(x - 4, y - 2, 8, 18);

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.quadraticCurveTo(x + 10 * flicker, y - 2, x, y + 6);
      ctx.quadraticCurveTo(x - 10 * flicker, y - 2, x, y - 18);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.quadraticCurveTo(x + 4, y - 2, x, y + 2);
      ctx.quadraticCurveTo(x - 4, y - 2, x, y - 10);
      ctx.fill();
    };

    drawTorch(leftTorchX, sconceY, torchFlickerL);
    drawTorch(rightTorchX, sconceY, torchFlickerR);

    ctx.fillStyle = bg + '22';
    for (let i = 0; i < 24; i++) {
      const px = ((i * 97.13 + t * 12) % (W + 80)) - 40;
      const py = vpY + (((i * 53.71 + t * 18) % (H - vpY + 60)) - 30);
      const r = 1 + (i % 3);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 5; i++) {
      const my = vpY + H * 0.08 + i * H * 0.08;
      const mist = ctx.createLinearGradient(0, my, 0, my + H * 0.08);
      mist.addColorStop(0, bg + '00');
      mist.addColorStop(0.5, accent + '10');
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      const drift = Math.sin(t * 0.35 + i * 1.7) * W * 0.04;
      ctx.fillRect(-W * 0.1 + drift, my, W * 1.2, H * 0.08);
    }

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = bg + '66';
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.03, vpY + H * 0.02);
    ctx.lineTo(vpX + W * 0.03, vpY + H * 0.02);
    ctx.lineTo(vpX + W * 0.018, vpY + H * 0.12);
    ctx.lineTo(vpX - W * 0.018, vpY + H * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    const handY = H * 0.92 + Math.sin(t * 1.6) * 2;
    ctx.fillStyle = accent + 'aa';
    ctx.beginPath();
    ctx.moveTo(W * 0.46, H);
    ctx.quadraticCurveTo(W * 0.47, handY - 18, W * 0.49, handY - 8);
    ctx.lineTo(W * 0.51, handY - 8);
    ctx.quadraticCurveTo(W * 0.53, handY - 18, W * 0.54, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.495, handY - 28);
    ctx.lineTo(W * 0.505, handY - 28);
    ctx.lineTo(W * 0.515, H);
    ctx.lineTo(W * 0.485, H);
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

    if (state === 'recoil' && impact > 0) {
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