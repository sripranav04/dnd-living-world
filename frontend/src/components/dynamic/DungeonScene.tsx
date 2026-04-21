import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

function useAnimatedCanvas(draw: (ctx: CanvasRenderingContext2D, t: number) => void) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || canvas.parentElement?.clientWidth || 800;
      canvas.height = rect.height || canvas.parentElement?.clientHeight || 500;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(ctx, t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      ro.disconnect();
    };
  }, [draw]);

  return canvasRef;
}

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DungeonScene() {
  const locationName = useGameStore((s) => s.world.locationName);

  const draw = React.useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (W === 0 || H === 0) return;

    const bg      = getCSSVar('--color-bg-base',        '#08070a');
    const wall    = getCSSVar('--map-wall-color',       '#0e0b07');
    const floor   = getCSSVar('--map-floor-color',      '#111009');
    const torch   = getCSSVar('--torch-color',          '#f5a623');
    const accent  = getCSSVar('--color-accent-primary', '#c9a227');
    const grid    = getCSSVar('--map-grid-color',       'rgba(201,162,39,0.06)');

    // ── Sky / ceiling ──────────────────────────────────────
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── First-person corridor walls ────────────────────────
    // Left wall receding into distance
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.35, H * 0.25);
    ctx.lineTo(W * 0.35, H * 0.75);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Right wall receding into distance
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.65, H * 0.25);
    ctx.lineTo(W * 0.65, H * 0.75);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Ceiling
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.65, H * 0.25);
    ctx.lineTo(W * 0.35, H * 0.25);
    ctx.closePath();
    ctx.fill();

    // Floor
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.65, H * 0.75);
    ctx.lineTo(W * 0.35, H * 0.75);
    ctx.closePath();
    ctx.fill();

    // ── Stone block lines on walls ─────────────────────────
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.8;

    // Left wall blocks
    for (let row = 0; row < 5; row++) {
      const y0 = (row / 5) * H;
      const y1 = ((row + 1) / 5) * H;
      const xLeft0 = W * 0.35 * (1 - row / 5);
      const xLeft1 = W * 0.35 * (1 - (row + 1) / 5);
      ctx.beginPath();
      ctx.moveTo(xLeft0, y0);
      ctx.lineTo(xLeft1, y1);
      ctx.stroke();
    }

    // Right wall blocks
    for (let row = 0; row < 5; row++) {
      const y0 = (row / 5) * H;
      const y1 = ((row + 1) / 5) * H;
      const xRight0 = W - W * 0.35 * (1 - row / 5);
      const xRight1 = W - W * 0.35 * (1 - (row + 1) / 5);
      ctx.beginPath();
      ctx.moveTo(xRight0, y0);
      ctx.lineTo(xRight1, y1);
      ctx.stroke();
    }

    // Floor perspective lines
    ctx.strokeStyle = grid;
    ctx.lineWidth = 0.5;
    const floorVanishX = W * 0.5;
    const floorVanishY = H * 0.75;
    for (let i = 0; i <= 8; i++) {
      const startX = (i / 8) * W;
      ctx.beginPath();
      ctx.moveTo(startX, H);
      ctx.lineTo(floorVanishX, floorVanishY);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const progress = i / 4;
      const x0 = W * 0.35 + progress * (W * 0.15);
      const x1 = W * 0.65 - progress * (W * 0.15);
      const y = H * 0.75 + progress * (H * 0.25);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    // ── End of corridor — doorway glow ────────────────────
    const vanishX = W * 0.5;
    const vanishY = H * 0.5;
    const doorW = W * 0.3;
    const doorH = H * 0.5;

    // Door frame
    ctx.strokeStyle = accent + '44';
    ctx.lineWidth = 2;
    ctx.strokeRect(vanishX - doorW / 2, vanishY - doorH / 2, doorW, doorH);

    // Glow from beyond
    const doorGlow = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, doorW);
    doorGlow.addColorStop(0, torch + '22');
    doorGlow.addColorStop(0.5, torch + '08');
    doorGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = doorGlow;
    ctx.fillRect(vanishX - doorW, vanishY - doorH, doorW * 2, doorH * 2);

    // ── Wall torches ──────────────────────────────────────
    const torches = [
      { x: W * 0.33, y: H * 0.35 },
      { x: W * 0.67, y: H * 0.35 },
    ];

    torches.forEach((pos, i) => {
      const flicker = 1 + 0.2 * Math.sin(t * 11 + i * 2.7);
      const glowR = 90 * flicker;

      // Wall mount bracket
      ctx.fillStyle = accent + '66';
      ctx.fillRect(pos.x - 3, pos.y, 6, 12);

      // Glow
      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
      g.addColorStop(0, torch + '55');
      g.addColorStop(0.4, torch + '18');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Flame
      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 6, 5 * flicker, 9 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame
      ctx.fillStyle = '#ffffff55';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 6, 2, 4 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // ── Mist on floor ─────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      const px = W * 0.2 + Math.sin(t * 0.25 + i * 1.3) * W * 0.35;
      const py = H * 0.82 + Math.cos(t * 0.18 + i * 0.9) * H * 0.06;
      const gr = ctx.createRadialGradient(px, py, 0, px, py, 70);
      gr.addColorStop(0, accent + '0d');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(px - 70, py - 30, 140, 60);
    }

    // ── Dust motes floating ───────────────────────────────
    for (let i = 0; i < 18; i++) {
      const px = W * 0.2 + ((i * 149 + t * 8) % (W * 0.6));
      const py = H * 0.25 + ((i * 83 + t * 3) % (H * 0.5));
      const alpha = 0.15 + 0.25 * Math.sin(t * 0.8 + i);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = accent + alphaHex;
      ctx.beginPath();
      ctx.arc(px, py, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Vignette ──────────────────────────────────────────
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.85);
    vign.addColorStop(0, 'transparent');
    vign.addColorStop(1, bg + 'f2');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // ── Location label ────────────────────────────────────
    ctx.fillStyle = accent + 'cc';
    ctx.font = `11px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`◆  ${locationName.toUpperCase()}  ◆`, W / 2, 22);

  }, [locationName]);

  const canvasRef = useAnimatedCanvas(draw);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}