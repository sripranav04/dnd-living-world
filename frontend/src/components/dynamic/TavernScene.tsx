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
    const torchY = H * 0.3;
    const leftTorchX = W * 0.16;
    const rightTorchX = W * 0.84;
    const mistDrift = Math.sin(t * 0.25) * W * 0.015;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, wall);
    bgGrad.addColorStop(0.45, bg);
    bgGrad.addColorStop(1, floorC);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.34, 0);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(W * 0.22, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.66, 0);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(W * 0.78, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.34, 0);
    ctx.lineTo(W * 0.66, 0);
    ctx.lineTo(vpX, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + '66');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(vpX, vpY);
    ctx.lineTo(W * 0.22, H);
    ctx.lineTo(W * 0.78, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = Math.max(1, W * 0.002);
    for (let i = -5; i <= 5; i++) {
      const x = vpX + i * (W * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const p = i / 9;
      const y = vpY + (H - vpY) * p * p;
      const inset = (W * 0.28) * (1 - p);
      ctx.strokeStyle = accent + (i < 4 ? '18' : '10');
      ctx.beginPath();
      ctx.moveTo(W * 0.22 + inset, y);
      ctx.lineTo(W * 0.78 - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: -1 | 1) => {
      const flicker = 0.9 + Math.sin(t * 8 + x * 0.01) * 0.08 + Math.sin(t * 13 + x * 0.02) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, H * 0.16);
      glow.addColorStop(0, torch + 'aa');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.03, y + H * 0.015);
      ctx.lineTo(x, y);
      ctx.lineTo(x - side * W * 0.018, y - H * 0.03);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.fillRect(x - W * 0.008, y - H * 0.01, W * 0.016, H * 0.02);

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.035);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.01, x, y + H * 0.008);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.01, x, y - H * 0.035);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.arc(x, y - H * 0.008, W * 0.004, 0, Math.PI * 2);
      ctx.fill();
    };

    drawTorch(leftTorchX, torchY, -1);
    drawTorch(rightTorchX, torchY, 1);

    const torchBeamL = ctx.createRadialGradient(leftTorchX, torchY, 0, leftTorchX + W * 0.12, torchY + H * 0.08, W * 0.28);
    torchBeamL.addColorStop(0, torch + '33');
    torchBeamL.addColorStop(1, torch + '00');
    ctx.fillStyle = torchBeamL;
    ctx.fillRect(0, 0, W, H);

    const torchBeamR = ctx.createRadialGradient(rightTorchX, torchY, 0, rightTorchX - W * 0.12, torchY + H * 0.08, W * 0.28);
    torchBeamR.addColorStop(0, torch + '33');
    torchBeamR.addColorStop(1, torch + '00');
    ctx.fillStyle = torchBeamR;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 5; i++) {
      const layerY = vpY + H * (0.05 + i * 0.08);
      const layerH = H * (0.08 + i * 0.03);
      const mist = ctx.createLinearGradient(0, layerY, 0, layerY + layerH);
      mist.addColorStop(0, bg + '00');
      mist.addColorStop(0.5, accent + '10');
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      ctx.fillRect(-W * 0.1 + mistDrift * (i % 2 === 0 ? 1 : -1), layerY, W * 1.2, layerH);
    }

    ctx.fillStyle = accent + '22';
    for (let i = 0; i < 36; i++) {
      const px = ((i * 97.13 + t * (8 + (i % 5))) % (W + 40)) - 20;
      const py = ((i * 53.71 + t * (4 + (i % 3))) % (H * 0.8)) + H * 0.08;
      const r = 0.8 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowAlpha = 0.18 + Math.sin(t * 0.7) * 0.03;
    ctx.fillStyle = bg + '66';
    ctx.globalAlpha = shadowAlpha;
    ctx.beginPath();
    ctx.ellipse(vpX, H * 0.58, W * 0.035, H * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const distantGlow = ctx.createRadialGradient(vpX, H * 0.5, 0, vpX, H * 0.5, H * 0.12);
    distantGlow.addColorStop(0, accent + '12');
    distantGlow.addColorStop(1, accent + '00');
    ctx.fillStyle = distantGlow;
    ctx.beginPath();
    ctx.arc(vpX, H * 0.5, H * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bg + 'aa';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.47);
    ctx.quadraticCurveTo(vpX - W * 0.018, H * 0.53, vpX - W * 0.012, H * 0.58);
    ctx.quadraticCurveTo(vpX, H * 0.6, vpX + W * 0.012, H * 0.58);
    ctx.quadraticCurveTo(vpX + W * 0.018, H * 0.53, vpX, H * 0.47);
    ctx.fill();

    ctx.fillStyle = accent + '14';
    ctx.beginPath();
    ctx.arc(vpX, H * 0.49, W * 0.012, 0, Math.PI * 2);
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.6) * 2;
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.455, handY - H * 0.04, W * 0.48, handY - H * 0.03);
    ctx.lineTo(W * 0.52, handY - H * 0.03);
    ctx.quadraticCurveTo(W * 0.545, handY - H * 0.04, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '88';
    ctx.fillRect(W * 0.485, handY - H * 0.12, W * 0.03, H * 0.09);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, handY - H * 0.18);
    ctx.lineTo(W * 0.485, handY - H * 0.11);
    ctx.lineTo(W * 0.515, handY - H * 0.11);
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

    if (state === 'recoil' && impact > 0) {
      ctx.fillStyle = accent + '22';
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const px = vpX + Math.cos(ang) * impact * W * 0.04;
        const py = H * 0.58 + Math.sin(ang) * impact * H * 0.03;
        ctx.beginPath();
        ctx.arc(px, py, 2 + impact * 2, 0, Math.PI * 2);
        ctx.fill();
      }
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