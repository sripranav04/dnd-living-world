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

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall);
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, W, vpY);

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, wall);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, vpY, W, H - vpY);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.24, 0);
    ctx.lineTo(vpX - W * 0.08, vpY);
    ctx.lineTo(vpX - W * 0.16, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.76, 0);
    ctx.lineTo(vpX + W * 0.08, vpY);
    ctx.lineTo(vpX + W * 0.16, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = bg + '55';
    for (let i = 0; i < 12; i++) {
      const x1 = (i / 11) * W;
      ctx.beginPath();
      ctx.moveTo(x1, H);
      ctx.lineTo(vpX, vpY);
      ctx.lineWidth = i % 2 === 0 ? 1 : 2;
      ctx.strokeStyle = accent + '18';
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((H - vpY) * i) / 9;
      const inset = ((y - vpY) / (H - vpY)) * W * 0.34;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.strokeStyle = accent + '12';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const flickerL = 0.85 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 17.1) * 0.04;
    const flickerR = 0.85 + Math.sin(t * 6.7 + 1.2) * 0.08 + Math.sin(t * 15.4 + 0.5) * 0.04;

    const torchY = H * 0.3;
    const leftTorchX = W * 0.16;
    const rightTorchX = W * 0.84;

    const glowL = ctx.createRadialGradient(leftTorchX, torchY, 0, leftTorchX, torchY, W * 0.16);
    glowL.addColorStop(0, torch + '88');
    glowL.addColorStop(0.35, torch + '33');
    glowL.addColorStop(1, torch + '00');
    ctx.fillStyle = glowL;
    ctx.beginPath();
    ctx.arc(leftTorchX, torchY, W * 0.16 * flickerL, 0, Math.PI * 2);
    ctx.fill();

    const glowR = ctx.createRadialGradient(rightTorchX, torchY, 0, rightTorchX, torchY, W * 0.16);
    glowR.addColorStop(0, torch + '88');
    glowR.addColorStop(0.35, torch + '33');
    glowR.addColorStop(1, torch + '00');
    ctx.fillStyle = glowR;
    ctx.beginPath();
    ctx.arc(rightTorchX, torchY, W * 0.16 * flickerR, 0, Math.PI * 2);
    ctx.fill();

    const drawSconce = (x: number, y: number, flip: number, flicker: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flip, 1);

      ctx.fillStyle = accent + '66';
      ctx.fillRect(-W * 0.008, -H * 0.01, W * 0.016, H * 0.06);

      ctx.strokeStyle = accent + '99';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.01);
      ctx.lineTo(W * 0.03, H * 0.03);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(W * 0.034, H * 0.032, W * 0.008, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(W * 0.034, -H * 0.03 * flicker);
      ctx.quadraticCurveTo(W * 0.05, -H * 0.005, W * 0.034, H * 0.01);
      ctx.quadraticCurveTo(W * 0.018, -H * 0.005, W * 0.034, -H * 0.03 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + 'aa';
      ctx.beginPath();
      ctx.moveTo(W * 0.034, -H * 0.015 * flicker);
      ctx.quadraticCurveTo(W * 0.042, -H * 0.002, W * 0.034, H * 0.004);
      ctx.quadraticCurveTo(W * 0.026, -H * 0.002, W * 0.034, -H * 0.015 * flicker);
      ctx.fill();

      ctx.restore();
    };

    drawSconce(leftTorchX, torchY, 1, flickerL);
    drawSconce(rightTorchX, torchY, -1, flickerR);

    for (let i = 0; i < 18; i++) {
      const phase = t * (0.12 + i * 0.01) + i * 1.7;
      const y = vpY + ((i + 1) / 19) * (H - vpY) * 0.9;
      const drift = Math.sin(phase) * W * 0.03;
      const width = W * (0.18 + (i % 5) * 0.03);
      const alpha = 10 + (i % 4) * 6;
      const mist = ctx.createLinearGradient(vpX - width + drift, y, vpX + width + drift, y);
      mist.addColorStop(0, bg + '00');
      mist.addColorStop(0.5, bg + alpha.toString(16).padStart(2, '0'));
      mist.addColorStop(1, bg + '00');
      ctx.fillStyle = mist;
      ctx.fillRect(vpX - width + drift, y - H * 0.015, width * 2, H * 0.03);
    }

    for (let i = 0; i < 40; i++) {
      const px = ((i * 97.13) % 1) * W + Math.sin(t * 0.2 + i) * 8;
      const py = (((i * 53.71) % 1) * H * 0.8) + H * 0.08 + Math.sin(t * 0.35 + i * 2.1) * 6;
      const r = 0.6 + (i % 3) * 0.5;
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.arc(px % W, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = bg + '88';
    ctx.beginPath();
    ctx.moveTo(vpX - W * 0.03, vpY + H * 0.02);
    ctx.lineTo(vpX - W * 0.012, vpY - H * 0.03);
    ctx.lineTo(vpX + W * 0.008, vpY + H * 0.01);
    ctx.lineTo(vpX + W * 0.028, vpY - H * 0.04);
    ctx.lineTo(vpX + W * 0.04, vpY + H * 0.03);
    ctx.lineTo(vpX + W * 0.018, vpY + H * 0.06);
    ctx.lineTo(vpX - W * 0.02, vpY + H * 0.05);
    ctx.closePath();
    ctx.fill();

    const handBob = Math.sin(t * 1.6) * 4;
    ctx.save();
    ctx.translate(0, handBob);

    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(W * 0.43, H);
    ctx.lineTo(W * 0.46, H * 0.88);
    ctx.lineTo(W * 0.54, H * 0.88);
    ctx.lineTo(W * 0.57, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent + '55';
    ctx.fillRect(W * 0.485, H * 0.86, W * 0.03, H * 0.08);

    ctx.fillStyle = accent + '99';
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.8);
    ctx.lineTo(W * 0.485, H * 0.86);
    ctx.lineTo(W * 0.515, H * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, W * 0.25, vpX, H * 0.5, W * 0.75);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    if (state === 'attack') {
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    if (impact > 0) {
      ctx.fillStyle = accent + Math.floor(impact * 40).toString(16).padStart(2, '0');
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