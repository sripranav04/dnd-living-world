import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function ForestCombatScene() {
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

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.65, W, H * 0.35);

    // Background trees
    [W * 0.08, W * 0.2, W * 0.75, W * 0.9].forEach((x, i) => {
      const h = H * (0.6 + (i % 2) * 0.1);
      ctx.fillStyle = '#1a2e1a';
      ctx.fillRect(x - 8, H - h, 16, h);
      ctx.fillStyle = accent + '22';
      ctx.beginPath();
      ctx.ellipse(x, H - h, 35, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Character silhouette — left, forest green tint
    const cx = W * 0.28, cy = H * 0.52;
    const sw = Math.sin(t * 3.5) * 0.18;
    ctx.fillStyle = accent + 'dd';
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sw);
    // Body
    ctx.beginPath();
    ctx.ellipse(0, -28, 13, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(0, -55, 11, 0, Math.PI * 2);
    ctx.fill();
    // Weapon arm
    ctx.save();
    ctx.rotate(-0.7 + Math.sin(t * 2.5) * 0.25);
    ctx.fillRect(10, -72, 4, 42);
    ctx.restore();
    // Legs
    ctx.fillRect(-8, 0, 6, 28);
    ctx.fillRect(4, 0, 6, 28);
    ctx.restore();

    // Enemy — dark fey creature, right side
    const ex = W * 0.68, ey = H * 0.46;
    const ev = Math.sin(t * 2) * 6;
    ctx.fillStyle = '#2d4a2d' + 'cc';
    ctx.save();
    ctx.translate(ex, ey + ev);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -45, 14, 0, Math.PI * 2);
    ctx.fill();
    // Antler-like horns
    ctx.strokeStyle = '#2d4a2d' + 'aa';
    ctx.lineWidth = 3;
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(dir * 8, -52);
      ctx.quadraticCurveTo(dir * 25, -70 + Math.sin(t) * 4, dir * 20, -85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dir * 18, -65);
      ctx.quadraticCurveTo(dir * 32, -72, dir * 28, -80);
      ctx.stroke();
    });
    ctx.restore();

    // Combat spark particles
    const sparkX = (cx + ex) / 2;
    const sparkY = (cy + ey) / 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 4;
      const r = 20 + Math.sin(t * 5 + i) * 10;
      const px = sparkX + Math.cos(angle) * r;
      const py = sparkY + Math.sin(angle) * r;
      const alpha = 0.5 + 0.5 * Math.sin(t * 6 + i);
      ctx.fillStyle = torch + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
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