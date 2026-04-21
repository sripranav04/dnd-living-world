import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DungeonCombatScene() {
  const locationName = useGameStore((s) => s.world.locationName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (!W || !H) return;
    const bg = getCSSVar('--color-bg-base', '#08070a');
    const accent = getCSSVar('--color-accent-primary', '#c9a227');
    const torch = getCSSVar('--torch-color', '#f5a623');
    const wall = getCSSVar('--color-surface-2', bg), floor = getCSSVar('--color-surface-1', bg), ink = getCSSVar('--color-text-primary', '#e8e0c8'), shadow = getCSSVar('--color-bg-elevated', '#111111');
    const bob = Math.sin(t * 3) * H * 0.01, recoil = Math.sin(t * 5) * W * 0.008, pulse = 0.75 + 0.25 * Math.sin(t * 4);
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H * 0.55); ctx.fillStyle = floor; ctx.fillRect(0, H * 0.55, W, H * 0.45);
    const glowL = ctx.createRadialGradient(W * 0.1, H * 0.22, 0, W * 0.1, H * 0.22, W * 0.18), glowR = ctx.createRadialGradient(W * 0.9, H * 0.22, 0, W * 0.9, H * 0.22, W * 0.18);
    glowL.addColorStop(0, torch); glowL.addColorStop(1, 'transparent'); glowR.addColorStop(0, torch); glowR.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.35 + 0.15 * pulse; ctx.fillStyle = glowL; ctx.fillRect(0, 0, W, H); ctx.fillStyle = glowR; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.fillStyle = shadow; ctx.fillRect(W * 0.18, H * 0.68, W * 0.16, H * 0.03); ctx.fillRect(W * 0.66, H * 0.7, W * 0.18, H * 0.03);
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(W * 0.24, H * 0.42 + bob, W * 0.035, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(W * 0.22, H * 0.46 + bob, W * 0.05, H * 0.14);
    ctx.beginPath(); ctx.moveTo(W * 0.22, H * 0.49 + bob); ctx.lineTo(W * 0.16, H * 0.59 + bob); ctx.lineTo(W * 0.18, H * 0.61 + bob); ctx.lineTo(W * 0.24, H * 0.53 + bob); ctx.lineTo(W * 0.31, H * 0.64 + bob); ctx.lineTo(W * 0.33, H * 0.62 + bob); ctx.lineTo(W * 0.27, H * 0.49 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.225, H * 0.6 + bob); ctx.lineTo(W * 0.2, H * 0.76 + bob); ctx.lineTo(W * 0.23, H * 0.76 + bob); ctx.lineTo(W * 0.245, H * 0.64 + bob); ctx.lineTo(W * 0.265, H * 0.76 + bob); ctx.lineTo(W * 0.295, H * 0.76 + bob); ctx.lineTo(W * 0.26, H * 0.6 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.28, H * 0.5 + bob); ctx.lineTo(W * 0.42, H * 0.44 + bob * 0.3); ctx.lineTo(W * 0.43, H * 0.46 + bob * 0.3); ctx.lineTo(W * 0.29, H * 0.53 + bob); ctx.closePath(); ctx.fillRect(W * 0.18, H * 0.5 + bob, W * 0.03, H * 0.11);
    ctx.strokeStyle = accent; ctx.lineWidth = Math.max(2, W * 0.006); ctx.beginPath(); ctx.moveTo(W * 0.42, H * 0.45 + bob * 0.3); ctx.quadraticCurveTo(W * 0.53, H * 0.38 + Math.sin(t * 6) * H * 0.02, W * 0.66 - recoil, H * 0.48); ctx.stroke();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(W * 0.74 + recoil, H * 0.42, W * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.7 + recoil, H * 0.47); ctx.quadraticCurveTo(W * 0.76 + recoil, H * 0.54, W * 0.79 + recoil, H * 0.68); ctx.lineTo(W * 0.69 + recoil, H * 0.68); ctx.quadraticCurveTo(W * 0.72 + recoil, H * 0.54, W * 0.67 + recoil, H * 0.47); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.69 + recoil, H * 0.5); ctx.lineTo(W * 0.61 + recoil, H * 0.58); ctx.lineTo(W * 0.63 + recoil, H * 0.6); ctx.lineTo(W * 0.71 + recoil, H * 0.54); ctx.lineTo(W * 0.8 + recoil, H * 0.61); ctx.lineTo(W * 0.82 + recoil, H * 0.59); ctx.lineTo(W * 0.75 + recoil, H * 0.5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.22; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(W * 0.74 + recoil, H * 0.42, W * 0.07, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, H * 0.75); vig.addColorStop(0, 'transparent'); vig.addColorStop(1, bg);
    ctx.fillStyle = vig; ctx.globalAlpha = 0.7; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    ctx.fillStyle = accent; ctx.font = `${Math.max(16, W * 0.03)}px serif`; ctx.textAlign = 'center'; ctx.fillText(locationName || 'Dungeon Combat', W / 2, H * 0.08);
  }, [locationName]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.parentElement?.clientWidth || 800; canvas.height = canvas.parentElement?.clientHeight || 500; };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const start = performance.now();
    const loop = (now: number) => { ctx.clearRect(0, 0, canvas.width, canvas.height); draw(ctx, (now - start) / 1000); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [draw]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}