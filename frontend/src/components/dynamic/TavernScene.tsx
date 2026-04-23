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

    const wallGrad = ctx.createLinearGradient(0, 0, W, 0);
    wallGrad.addColorStop(0, wall);
    wallGrad.addColorStop(0.5, bg);
    wallGrad.addColorStop(1, wall);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
    ceilGrad.addColorStop(0, wall);
    ceilGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W * 0.28, vpY);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'cc');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W * 0.28, vpY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = wall + 'aa';
    ctx.lineWidth = Math.max(2, W * 0.004);
    for (let i = 0; i <= 8; i++) {
      const y = vpY + ((H - vpY) * i) / 8;
      const inset = ((y - vpY) / (H - vpY)) * W * 0.48;
      ctx.beginPath();
      ctx.moveTo(vpX - inset, y);
      ctx.lineTo(vpX + inset, y);
      ctx.stroke();
    }

    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    ctx.strokeStyle = wall + 'dd';
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.28, vpY);
    ctx.lineTo(0, H);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W, H);
    ctx.stroke();

    const torchY = H * 0.3;
    const torchOffset = Math.sin(t * 7) * 0.5 + Math.sin(t * 11) * 0.35;

    const drawTorch = (x: number, facing: 1 | -1) => {
      const glow = ctx.createRadialGradient(x, torchY, 4, x, torchY, W * 0.12);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, accent + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, torchY, W * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, W * 0.005);
      ctx.beginPath();
      ctx.moveTo(x - facing * W * 0.03, torchY);
      ctx.lineTo(x, torchY);
      ctx.lineTo(x + facing * W * 0.012, torchY + H * 0.03);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, torchY, W * 0.008, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, torchY - H * 0.03 - torchOffset * 2);
      ctx.quadraticCurveTo(x - W * 0.012, torchY - H * 0.005, x, torchY + H * 0.012);
      ctx.quadraticCurveTo(x + W * 0.014, torchY - H * 0.004, x, torchY - H * 0.03 - torchOffset * 2);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, torchY - H * 0.018 - torchOffset);
      ctx.quadraticCurveTo(x - W * 0.006, torchY - H * 0.002, x, torchY + H * 0.006);
      ctx.quadraticCurveTo(x + W * 0.007, torchY - H * 0.002, x, torchY - H * 0.018 - torchOffset);
      ctx.fill();
    };

    drawTorch(W * 0.16, 1);
    drawTorch(W * 0.84, -1);

    for (let i = 0; i < 18; i++) {
      const my = ((i * 37 + t * 18) % H);
      const mx = vpX + Math.sin(i * 12.7 + t * 0.7) * W * 0.22;
      const mr = W * (0.03 + (i % 4) * 0.01);
      const mist = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      mist.addColorStop(0, bg + '22');
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 40; i++) {
      const px = ((i * 83.17) + t * (8 + (i % 5))) % W;
      const py = ((i * 41.73) + t * (14 + (i % 3))) % H;
      const s = 1 + (i % 3);
      ctx.fillStyle = accent + '55';
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
    }

    const shadowPulse = 1 + Math.sin(t * 0.9) * 0.08;
    ctx.fillStyle = bg + '88';
    ctx.beginPath();
    ctx.ellipse(vpX, H * 0.58, W * 0.045 * shadowPulse, H * 0.08 * shadowPulse, 0, 0, Math.PI * 2);
    ctx.fill();

    const distantGlow = ctx.createRadialGradient(vpX, H * 0.5, 0, vpX, H * 0.5, H * 0.18);
    distantGlow.addColorStop(0, accent + '12');
    distantGlow.addColorStop(1, accent + '00');
    ctx.fillStyle = distantGlow;
    ctx.beginPath();
    ctx.arc(vpX, H * 0.5, H * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = wall + 'cc';
    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.47);
    ctx.quadraticCurveTo(vpX - W * 0.018, H * 0.52, vpX - W * 0.012, H * 0.58);
    ctx.quadraticCurveTo(vpX, H * 0.6, vpX + W * 0.012, H * 0.58);
    ctx.quadraticCurveTo(vpX + W * 0.018, H * 0.52, vpX, H * 0.47);
    ctx.fill();

    const handY = H * 0.92 + Math.sin(t * 1.6) * 3;
    const handGrad = ctx.createLinearGradient(vpX, handY - H * 0.08, vpX, H);
    handGrad.addColorStop(0, accent + 'aa');
    handGrad.addColorStop(1, wall);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.05, H);
    ctx.quadraticCurveTo(vpX - W * 0.04, handY - H * 0.03, vpX - W * 0.018, handY - H * 0.055);
    ctx.lineTo(vpX + W * 0.018, handY - H * 0.055);
    ctx.quadraticCurveTo(vpX + W * 0.04, handY - H * 0.03, vpX + W * 0.05, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + 'cc';
    ctx.beginPath();
    ctx.moveTo(vpX, handY - H * 0.11);
    ctx.lineTo(vpX - W * 0.012, handY - H * 0.055);
    ctx.lineTo(vpX + W * 0.012, handY - H * 0.055);
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