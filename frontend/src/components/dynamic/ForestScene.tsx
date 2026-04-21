import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function ForestScene() {
  const locationName = useGameStore((s) => s.world.locationName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!W || !H) return;

    const bg     = getCSSVar('--color-bg-base',        '#08100a');
    const accent = getCSSVar('--color-accent-primary', '#7fbf5e');
    const torch  = getCSSVar('--torch-color',          '#80e860');
    const floor  = getCSSVar('--map-floor-color',      '#0a1a0c');

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    sky.addColorStop(0, bg);
    sky.addColorStop(1, floor);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.68, W, H * 0.32);

    // Trees — first person, receding into darkness
    const treePositions = [
      { x: W * 0.05, h: H * 0.85, w: 18 },
      { x: W * 0.18, h: H * 0.75, w: 14 },
      { x: W * 0.78, h: H * 0.75, w: 14 },
      { x: W * 0.92, h: H * 0.85, w: 18 },
      { x: W * 0.32, h: H * 0.65, w: 10 },
      { x: W * 0.65, h: H * 0.65, w: 10 },
    ];

    treePositions.forEach(({ x, h, w }) => {
      // Trunk
      ctx.fillStyle = '#2a1a08';
      ctx.fillRect(x - w / 2, H - h, w, h);
      // Canopy layers
      ctx.fillStyle = accent + '44';
      ctx.beginPath();
      ctx.ellipse(x, H - h, w * 3, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent + '33';
      ctx.beginPath();
      ctx.ellipse(x, H - h * 0.7, w * 2.5, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Fireflies
    for (let i = 0; i < 12; i++) {
      const fx = W * 0.15 + Math.sin(t * 0.4 + i * 2.1) * W * 0.35;
      const fy = H * 0.3 + Math.cos(t * 0.3 + i * 1.7) * H * 0.25;
      const alpha = 0.4 + 0.6 * Math.sin(t * 3 + i * 1.3);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
      g.addColorStop(0, torch + Math.round(alpha * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground mist
    for (let i = 0; i < 5; i++) {
      const mx = W * 0.1 + Math.sin(t * 0.2 + i * 1.4) * W * 0.4;
      const my = H * 0.72 + Math.cos(t * 0.15 + i) * H * 0.04;
      const g2 = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
      g2.addColorStop(0, accent + '18');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(mx - 80, my - 30, 160, 60);
    }

    // Path perspective lines
    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    const vx = W * 0.5, vy = H * 0.55;
    for (let i = 0; i <= 6; i++) {
      const bx = W * 0.25 + (i / 6) * W * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }

    // Vignette
    const vign = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.9);
    vign.addColorStop(0, 'transparent');
    vign.addColorStop(1, bg + 'f0');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // Label
    ctx.fillStyle = accent + 'bb';
    ctx.font = `11px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`◆  ${locationName.toUpperCase()}  ◆`, W / 2, 22);
  }, [locationName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
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