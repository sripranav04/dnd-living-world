import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

// Procedural dungeon scene — rendered in the map viewport
// Torchlit stone chamber with animated particles and mist

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
    // Use ResizeObserver for reliable size detection
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

export default function DungeonScene() {
  const world = useGameStore((s) => s.world);
  const theme = useGameStore((s) => s.theme);

  // Theme-based colours
  const palette = theme === 'bright-forest'
    ? { sky: '#0a1a0c', floor: '#111d14', wall: '#0d1a0f', torch: '#80e060', mist: 'rgba(80,160,80,0.04)', particle: '#a8d4a0' }
    : theme === 'warm-tavern'
    ? { sky: '#100a04', floor: '#1a1008', wall: '#0c0802', torch: '#ff8820', mist: 'rgba(180,100,20,0.04)', particle: '#d4926a' }
    : { sky: '#08070a', floor: '#111009', wall: '#0e0b07', torch: '#f5a623', mist: 'rgba(100,80,50,0.04)', particle: '#c9a227' };

  const draw = React.useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    if (W === 0 || H === 0) return;

    // Background
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, W, H);

    // Stone walls (top, bottom, sides)
    ctx.fillStyle = palette.wall;
    ctx.fillRect(0, 0, W, H * 0.18);               // top wall
    ctx.fillRect(0, H * 0.82, W, H * 0.18);        // bottom wall
    ctx.fillRect(0, H * 0.18, W * 0.14, H * 0.64); // left wall
    ctx.fillRect(W * 0.86, H * 0.18, W * 0.14, H * 0.64); // right wall

    // Floor with stone tile pattern
    ctx.fillStyle = palette.floor;
    ctx.fillRect(W * 0.14, H * 0.18, W * 0.72, H * 0.64);

    // Stone tile lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    const tileW = W * 0.72 / 8;
    const tileH = H * 0.64 / 6;
    for (let col = 0; col <= 8; col++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.14 + col * tileW, H * 0.18);
      ctx.lineTo(W * 0.14 + col * tileW, H * 0.82);
      ctx.stroke();
    }
    for (let row = 0; row <= 6; row++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.14, H * 0.18 + row * tileH);
      ctx.lineTo(W * 0.86, H * 0.18 + row * tileH);
      ctx.stroke();
    }

    // Torches with flickering glow
    const torchPositions = [
      { x: W * 0.16, y: H * 0.24 },
      { x: W * 0.84, y: H * 0.24 },
      { x: W * 0.16, y: H * 0.76 },
      { x: W * 0.84, y: H * 0.76 },
    ];

    torchPositions.forEach((pos, i) => {
      const flicker = 1 + 0.15 * Math.sin(t * 12 + i * 2.3);
      const glowR = 80 * flicker;

      // Glow
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
      grad.addColorStop(0, palette.torch.replace(')', ', 0.3)').replace('rgb', 'rgba'));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Flame
      ctx.fillStyle = palette.torch;
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y - 2, 4 * flicker, 7 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Grid overlay
    ctx.strokeStyle = `rgba(201,162,39,0.06)`;
    ctx.lineWidth = 0.5;
    const gridSize = Math.min(W, H) * 0.08;
    for (let x = W * 0.14; x <= W * 0.86; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, H * 0.18);
      ctx.lineTo(x, H * 0.82);
      ctx.stroke();
    }
    for (let y = H * 0.18; y <= H * 0.82; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(W * 0.14, y);
      ctx.lineTo(W * 0.86, y);
      ctx.stroke();
    }

    // Mist particles
    for (let i = 0; i < 6; i++) {
      const px = W * 0.2 + Math.sin(t * 0.3 + i * 1.1) * W * 0.3;
      const py = H * 0.5 + Math.cos(t * 0.2 + i * 0.7) * H * 0.2;
      const grad2 = ctx.createRadialGradient(px, py, 0, px, py, 60);
      grad2.addColorStop(0, palette.mist);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(px - 60, py - 60, 120, 120);
    }

    // Floating dust particles
    for (let i = 0; i < 20; i++) {
      const px = W * 0.15 + ((i * 137.5 + t * 10) % (W * 0.7));
      const py = H * 0.82 - ((i * 73 + t * 5) % (H * 0.6));
      const alpha = 0.2 + 0.3 * Math.sin(t + i);
      ctx.fillStyle = palette.particle.replace(')', `, ${alpha})`).includes('rgba')
        ? palette.particle
        : `rgba(201,162,39,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vignette
    const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
    vign.addColorStop(0, 'transparent');
    vign.addColorStop(1, 'rgba(8,6,10,0.88)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, W, H);

    // Location label
    ctx.fillStyle = 'rgba(201,162,39,0.7)';
    ctx.font = `11px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0.3em';
    ctx.fillText(`◆  ${world.locationName.toUpperCase()}  ◆`, W / 2, 28);

  }, [palette, world.locationName]);

  const canvasRef = useAnimatedCanvas(draw);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}