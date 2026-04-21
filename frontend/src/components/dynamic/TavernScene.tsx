import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function TavernScene() {
  const locationName = useGameStore((s) => s.world.locationName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!W || !H) return;

    const bg     = getCSSVar('--color-bg-base',        '#100a04');
    const accent = getCSSVar('--color-accent-primary', '#e8a020');
    const torch  = getCSSVar('--torch-color',          '#ff8820');
    const wall   = getCSSVar('--map-wall-color',       '#0c0802');
    const floor  = getCSSVar('--map-floor-color',      '#1a1008');

    // Background warm wall
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    // Warm firelight gradient on wall
    const fireGlow = ctx.createRadialGradient(W * 0.5, H * 0.8, 0, W * 0.5, H * 0.8, W * 0.7);
    fireGlow.addColorStop(0, torch + '33');
    fireGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGlow;
    ctx.fillRect(0, 0, W, H);

    // Floor — wooden planks
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);

    // Wooden plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = H * 0.7 + (i / 6) * H * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Plank perspective lines
    const vx = W * 0.5, vy = H * 0.7;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 8) * W, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }

    // Bar counter in background
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(W * 0.15, H * 0.45, W * 0.7, H * 0.25);
    ctx.fillStyle = '#3a2510';
    ctx.fillRect(W * 0.12, H * 0.42, W * 0.76, H * 0.06);

    // Ale mugs on counter
    [W * 0.3, W * 0.5, W * 0.65].forEach((x) => {
      ctx.fillStyle = '#6b4010';
      ctx.fillRect(x - 8, H * 0.34, 16, 20);
      ctx.fillStyle = '#d4a030' + '88';
      ctx.fillRect(x - 7, H * 0.34, 14, 6);
    });

    // Fireplace — center background
    const fpx = W * 0.5, fpy = H * 0.55;
    ctx.fillStyle = '#1a0a04';
    ctx.fillRect(fpx - 40, fpy - 50, 80, 55);

    // Fire in fireplace
    for (let i = 0; i < 8; i++) {
      const fx = fpx + Math.sin(t * 3 + i * 0.8) * 15;
      const fy = fpy - 10 - i * 5;
      const fr = (8 - i) * 4;
      const flicker = 1 + 0.3 * Math.sin(t * 7 + i);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * flicker);
      g.addColorStop(0, i < 3 ? '#ffffff88' : torch + 'cc');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, fr * flicker, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wall torches
    [[W * 0.15, H * 0.3], [W * 0.85, H * 0.3]].forEach(([x, y], i) => {
      const flicker = 1 + 0.2 * Math.sin(t * 9 + i * 2.5);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 70 * flicker);
      g.addColorStop(0, torch + '66');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 70 * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 4 * flicker, 7 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Smoke particles rising
    for (let i = 0; i < 8; i++) {
      const sx = fpx + Math.sin(t * 0.5 + i * 1.2) * 12;
      const sy = fpy - 50 - ((t * 20 + i * 15) % 80);
      const alpha = 0.08 + 0.04 * Math.sin(t + i);
      ctx.fillStyle = `rgba(180,120,60,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 8 + i * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vignette
    const vign = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.85);
    vign.addColorStop(0, 'transparent');
    vign.addColorStop(1, bg + 'f0');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

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