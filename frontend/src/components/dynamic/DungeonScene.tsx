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
    const breath = 1 + Math.sin(t * 0.8) * 0.01;

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, bg);
    wallGrad.addColorStop(0.35, wall);
    wallGrad.addColorStop(1, floorC);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(0, H);
    ctx.closePath();
    const leftWallGrad = ctx.createLinearGradient(0, H * 0.5, vpX, vpY);
    leftWallGrad.addColorStop(0, wall);
    leftWallGrad.addColorStop(1, bg);
    ctx.fillStyle = leftWallGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(W, H);
    ctx.closePath();
    const rightWallGrad = ctx.createLinearGradient(W, H * 0.5, vpX, vpY);
    rightWallGrad.addColorStop(0, wall);
    rightWallGrad.addColorStop(1, bg);
    ctx.fillStyle = rightWallGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(W, H);
    ctx.closePath();
    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, bg);
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vpX, vpY);
    ctx.lineTo(W, 0);
    ctx.closePath();
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall);
    ctx.fillStyle = ceilGrad;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = `${accent}22`;
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const x = vpX + i * (W * 0.09);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }

    for (let i = 1; i <= 8; i++) {
      const y = vpY + ((H - vpY) * i) / 9;
      const inset = ((y - vpY) / (H - vpY)) * W * 0.5;
      ctx.strokeStyle = `${accent}${i < 4 ? '18' : '10'}`;
      ctx.beginPath();
      ctx.moveTo(vpX - inset, y);
      ctx.lineTo(vpX + inset, y);
      ctx.stroke();
    }

    const torchY = H * 0.3 + Math.sin(t * 2.1) * 2;
    const leftTorchX = W * 0.16;
    const rightTorchX = W * 0.84;
    const flickerL = 0.85 + Math.sin(t * 11.3) * 0.08 + Math.sin(t * 17.1) * 0.05;
    const flickerR = 0.85 + Math.sin(t * 10.7 + 1.2) * 0.08 + Math.sin(t * 15.4) * 0.05;

    const drawTorch = (x: number, y: number, flicker: number) => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16);
      glow.addColorStop(0, `${torch}bb`);
      glow.addColorStop(0.35, `${torch}44`);
      glow.addColorStop(1, `${torch}00`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.fillRect(x - 10, y - 3, 20, 6);
      ctx.fillRect(x - 3, y - 3, 6, 22);

      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.quadraticCurveTo(x - 8 * flicker, y - 28, x - 2, y - 38 * flicker);
      ctx.quadraticCurveTo(x + 4, y - 28, x, y - 18);
      ctx.fillStyle = `${torch}dd`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.quadraticCurveTo(x - 4, y - 24, x, y - 30 * flicker);
      ctx.quadraticCurveTo(x + 3, y - 22, x, y - 16);
      ctx.fillStyle = `${accent}cc`;
      ctx.fill();
    };

    drawTorch(leftTorchX, torchY, flickerL);
    drawTorch(rightTorchX, torchY, flickerR);

    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 5; i++) {
      const my = H * (0.58 + i * 0.06) + Math.sin(t * 0.5 + i) * 4;
      const mist = ctx.createLinearGradient(0, my - 20, 0, my + 20);
      mist.addColorStop(0, `${bg}00`);
      mist.addColorStop(0.5, `${accent}18`);
      mist.addColorStop(1, `${bg}00`);
      ctx.fillStyle = mist;
      ctx.fillRect(0, my - 20, W, 40);
    }
    ctx.restore();

    ctx.save();
    for (let i = 0; i < 36; i++) {
      const px = ((i * 97.13 + t * 18) % W);
      const py = (H * 0.15 + ((i * 53.77 + t * 9) % (H * 0.7)));
      const r = 0.8 + (i % 3) * 0.5;
      ctx.globalAlpha = 0.08 + (i % 4) * 0.03;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, bob);
    ctx.scale(breath, breath);
    ctx.translate((W - W * breath) * 0.5 / breath, (H - H * breath) * 0.5 / breath);

    const shadowGlow = ctx.createRadialGradient(vpX, H * 0.58, 0, vpX, H * 0.58, H * 0.18);
    shadowGlow.addColorStop(0, `${bg}66`);
    shadowGlow.addColorStop(1, `${bg}00`);
    ctx.fillStyle = shadowGlow;
    ctx.beginPath();
    ctx.ellipse(vpX, H * 0.58, W * 0.08, H * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(vpX, H * 0.5);
    ctx.lineTo(vpX - W * 0.025, H * 0.58);
    ctx.lineTo(vpX + W * 0.025, H * 0.58);
    ctx.closePath();
    ctx.fillStyle = `${bg}aa`;
    ctx.fill();
    ctx.restore();

    const handY = H * 0.9 + Math.sin(t * 1.6) * 2;
    ctx.save();
    ctx.fillStyle = `${wall}ee`;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.455, handY - 24, W * 0.48, handY - 10);
    ctx.lineTo(W * 0.52, handY - 10);
    ctx.quadraticCurveTo(W * 0.545, handY - 24, W * 0.56, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.fillRect(W * 0.492, handY - 42, W * 0.016, 34);
    ctx.beginPath();
    ctx.moveTo(W * 0.5, handY - 74);
    ctx.lineTo(W * 0.486, handY - 42);
    ctx.lineTo(W * 0.514, handY - 42);
    ctx.closePath();
    ctx.fillStyle = `${torch}cc`;
    ctx.fill();
    ctx.restore();

    if (state === 'attack') {
      const atkScale = state === 'attack' ? 1.0 + Math.sin(t * 6) * 0.15 : 1.0;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(atkScale, atkScale);
      ctx.translate(-W * 0.5, -H * 0.42);
      ctx.restore();
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    if (state === 'recoil') {
      const recoilX = 30;
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      ctx.restore();

      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12 + t * 4;
        const px = vpX + Math.cos(a) * (20 + i * 3);
        const py = H * 0.42 + Math.sin(a) * (10 + i * 2);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (impact > 0) {
      const edge = ctx.createRadialGradient(vpX, vpY, H * 0.2, vpX, vpY, H * 0.8);
      edge.addColorStop(0, `${bg}00`);
      edge.addColorStop(1, `${accent}${Math.min(55, Math.floor(impact * 60)).toString(16).padStart(2, '0')}`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, W, H);
    }

    const vignette = ctx.createRadialGradient(vpX, H * 0.5, H * 0.2, vpX, H * 0.5, H * 0.75);
    vignette.addColorStop(0, `${bg}00`);
    vignette.addColorStop(1, `${bg}77`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
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