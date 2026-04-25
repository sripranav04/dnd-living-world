import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function ForestCombatScene() {
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
    const enemyX = W * 0.5;
    const enemyY = H * 0.42;
    const enemyH = H * 0.6;
    const bobY = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const recoilX = state === 'recoil' ? 30 : 0;
    const enemyColor = getCSSVar('--wraith-color', '#2a1a4a');
    const eyeColor = getCSSVar('--wraith-eye-color', '#c9a227');

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, wall + 'ee');
    wallGrad.addColorStop(0.5, wall + 'cc');
    wallGrad.addColorStop(1, bg + 'ee');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, vpY);
    ceilGrad.addColorStop(0, bg + 'ff');
    ceilGrad.addColorStop(1, wall + '88');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.82, vpY);
    ctx.lineTo(W * 0.18, vpY);
    ctx.closePath();
    ctx.fill();

    const leftWallGrad = ctx.createLinearGradient(0, 0, W * 0.22, 0);
    leftWallGrad.addColorStop(0, wall + 'ff');
    leftWallGrad.addColorStop(1, wall + '55');
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.22, 0);
    ctx.lineTo(W * 0.18, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const rightWallGrad = ctx.createLinearGradient(W, 0, W * 0.78, 0);
    rightWallGrad.addColorStop(0, wall + 'ff');
    rightWallGrad.addColorStop(1, wall + '55');
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.78, 0);
    ctx.lineTo(W * 0.82, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC + 'ff');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.18, vpY);
    ctx.lineTo(W * 0.82, vpY);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '22';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 1; i <= 6; i++) {
      const y = vpY + i * ((H - vpY) / 7);
      const inset = (y - vpY) * 0.9;
      ctx.beginPath();
      ctx.moveTo(inset, y);
      ctx.lineTo(W - inset, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: 'left' | 'right') => {
      const flicker = 0.85 + Math.sin(t * 11 + x * 0.01) * 0.08 + Math.sin(t * 17) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16 * flicker);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, torch + '55');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 18);
      ctx.stroke();

      ctx.strokeStyle = accent + 'aa';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.beginPath();
      if (side === 'left') {
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + 18, y - 4);
      } else {
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x - 18, y - 4);
      }
      ctx.stroke();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.quadraticCurveTo(x + 10, y - 4, x, y + 6);
      ctx.quadraticCurveTo(x - 10, y - 4, x, y - 18);
      ctx.fill();

      ctx.fillStyle = accent + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.quadraticCurveTo(x + 4, y - 2, x, y + 2);
      ctx.quadraticCurveTo(x - 4, y - 2, x, y - 10);
      ctx.fill();
    };

    drawTorch(W * 0.12, H * 0.3, 'left');
    drawTorch(W * 0.88, H * 0.3, 'right');

    const shadowGrad = ctx.createRadialGradient(enemyX, enemyY + enemyH * 0.42, enemyH * 0.04, enemyX, enemyY + enemyH * 0.42, enemyH * 0.22);
    shadowGrad.addColorStop(0, bg + 'aa');
    shadowGrad.addColorStop(1, bg + '00');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(enemyX, enemyY + enemyH * 0.42, enemyH * 0.18, enemyH * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawEnemy = () => {
      const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
      enemyGlow.addColorStop(0, enemyColor + '44');
      enemyGlow.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = enemyGlow;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, H * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(enemyX, enemyY + bobY);
      ctx.scale(breathe, breathe);

      const skullR = enemyH * 0.13;
      const torsoTop = -enemyH * 0.08;
      const torsoBottom = enemyH * 0.22;

      const bodyGrad = ctx.createLinearGradient(0, -enemyH * 0.25, 0, enemyH * 0.35);
      bodyGrad.addColorStop(0, enemyColor + 'ee');
      bodyGrad.addColorStop(0.6, enemyColor + 'cc');
      bodyGrad.addColorStop(1, enemyColor + '11');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-enemyH * 0.08, torsoTop);
      ctx.quadraticCurveTo(-enemyH * 0.16, enemyH * 0.02, -enemyH * 0.12, torsoBottom);
      ctx.quadraticCurveTo(-enemyH * 0.08, enemyH * 0.34, 0, enemyH * 0.42);
      ctx.quadraticCurveTo(enemyH * 0.08, enemyH * 0.34, enemyH * 0.12, torsoBottom);
      ctx.quadraticCurveTo(enemyH * 0.16, enemyH * 0.02, enemyH * 0.08, torsoTop);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = enemyColor + 'f0';
      ctx.beginPath();
      ctx.arc(0, -enemyH * 0.2, skullR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg + 'cc';
      ctx.beginPath();
      ctx.arc(-skullR * 0.38, -enemyH * 0.2, skullR * 0.22, 0, Math.PI * 2);
      ctx.arc(skullR * 0.38, -enemyH * 0.2, skullR * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -enemyH * 0.17);
      ctx.lineTo(-skullR * 0.12, -enemyH * 0.12);
      ctx.lineTo(skullR * 0.12, -enemyH * 0.12);
      ctx.closePath();
      ctx.fill();

      const eyeGlowL = ctx.createRadialGradient(-skullR * 0.38, -enemyH * 0.21, 0, -skullR * 0.38, -enemyH * 0.21, skullR * 0.35);
      eyeGlowL.addColorStop(0, eyeColor + 'ff');
      eyeGlowL.addColorStop(1, eyeColor + '00');
      ctx.fillStyle = eyeGlowL;
      ctx.beginPath();
      ctx.arc(-skullR * 0.38, -enemyH * 0.21, skullR * 0.35, 0, Math.PI * 2);
      ctx.fill();

      const eyeGlowR = ctx.createRadialGradient(skullR * 0.38, -enemyH * 0.21, 0, skullR * 0.38, -enemyH * 0.21, skullR * 0.35);
      eyeGlowR.addColorStop(0, eyeColor + 'ff');
      eyeGlowR.addColorStop(1, eyeColor + '00');
      ctx.fillStyle = eyeGlowR;
      ctx.beginPath();
      ctx.arc(skullR * 0.38, -enemyH * 0.21, skullR * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemyColor + 'dd';
      ctx.lineWidth = Math.max(4, enemyH * 0.018);
      ctx.lineCap = 'round';

      const tendrilBaseY = -enemyH * 0.02;
      const sway = Math.sin(t * 1.8) * enemyH * 0.03;
      const tendrils = [
        { sx: -enemyH * 0.08, ex: -enemyH * 0.28, ey: enemyH * 0.02, c1x: -enemyH * 0.18, c1y: -enemyH * 0.08, c2x: -enemyH * 0.32, c2y: -enemyH * 0.02 },
        { sx: -enemyH * 0.05, ex: -enemyH * 0.34, ey: enemyH * 0.12, c1x: -enemyH * 0.16, c1y: enemyH * 0.02, c2x: -enemyH * 0.36, c2y: enemyH * 0.06 },
        { sx: 0, ex: 0, ey: enemyH * 0.16, c1x: -enemyH * 0.04, c1y: enemyH * 0.02, c2x: enemyH * 0.04, c2y: enemyH * 0.1 },
        { sx: enemyH * 0.05, ex: enemyH * 0.34, ey: enemyH * 0.12, c1x: enemyH * 0.16, c1y: enemyH * 0.02, c2x: enemyH * 0.36, c2y: enemyH * 0.06 },
        { sx: enemyH * 0.08, ex: enemyH * 0.28, ey: enemyH * 0.02, c1x: enemyH * 0.18, c1y: -enemyH * 0.08, c2x: enemyH * 0.32, c2y: -enemyH * 0.02 }
      ];

      tendrils.forEach((tr, i) => {
        const wave = Math.sin(t * 2.2 + i * 0.9) * enemyH * 0.035;
        ctx.beginPath();
        ctx.moveTo(tr.sx, tendrilBaseY);
        ctx.bezierCurveTo(
          tr.c1x,
          tr.c1y + sway,
          tr.c2x,
          tr.c2y + wave,
          tr.ex,
          tr.ey + wave
        );
        ctx.stroke();

        ctx.lineWidth = Math.max(2, enemyH * 0.01);
        ctx.beginPath();
        ctx.moveTo(tr.ex, tr.ey + wave);
        ctx.quadraticCurveTo(tr.ex + (i - 2) * 6, tr.ey + wave + enemyH * 0.04, tr.ex + (i - 2) * 10, tr.ey + wave + enemyH * 0.08);
        ctx.stroke();
        ctx.lineWidth = Math.max(4, enemyH * 0.018);
      });

      const tailGrad = ctx.createLinearGradient(0, enemyH * 0.12, 0, enemyH * 0.48);
      tailGrad.addColorStop(0, enemyColor + 'cc');
      tailGrad.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(-enemyH * 0.09, enemyH * 0.12);
      ctx.quadraticCurveTo(-enemyH * 0.04, enemyH * 0.28, -enemyH * 0.02, enemyH * 0.46);
      ctx.quadraticCurveTo(0, enemyH * 0.5, enemyH * 0.02, enemyH * 0.46);
      ctx.quadraticCurveTo(enemyH * 0.04, enemyH * 0.28, enemyH * 0.09, enemyH * 0.12);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    if (state === 'attack') {
      const atkScale = state === 'attack' ? 1.0 + Math.sin(t * 6) * 0.15 : 1.0;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(atkScale, atkScale);
      ctx.translate(-W * 0.5, -H * 0.42);
      drawEnemy();
      ctx.restore();
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    } else if (state === 'recoil') {
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      drawEnemy();
      ctx.restore();

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + t * 2;
        const r = impact * enemyH * (0.08 + i * 0.006);
        const px = enemyX + Math.cos(a) * r;
        const py = enemyY + Math.sin(a) * r * 0.7;
        ctx.fillStyle = accent + Math.max(40, Math.floor(180 - i * 6)).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.5, enemyH * 0.008 - i * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawEnemy();
    }

    const handY = H * 0.9;
    const handX = W * 0.5;
    const glove = getCSSVar('--color-fg-muted', '#444444');
    const blade = getCSSVar('--color-fg-primary', '#bbbbbb');

    ctx.fillStyle = glove;
    ctx.beginPath();
    ctx.moveTo(handX - W * 0.035, handY);
    ctx.quadraticCurveTo(handX - W * 0.03, handY - H * 0.04, handX - W * 0.01, handY - H * 0.055);
    ctx.quadraticCurveTo(handX + W * 0.015, handY - H * 0.05, handX + W * 0.02, handY - H * 0.02);
    ctx.lineTo(handX + W * 0.018, handY + H * 0.02);
    ctx.lineTo(handX - W * 0.03, handY + H * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.fillRect(handX - W * 0.006, handY - H * 0.08, W * 0.012, H * 0.05);

    const bladeGrad = ctx.createLinearGradient(handX, handY - H * 0.18, handX, handY - H * 0.08);
    bladeGrad.addColorStop(0, blade + 'ee');
    bladeGrad.addColorStop(1, blade + '55');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(handX - W * 0.01, handY - H * 0.08);
    ctx.lineTo(handX, handY - H * 0.18);
    ctx.lineTo(handX + W * 0.01, handY - H * 0.08);
    ctx.closePath();
    ctx.fill();

    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.35, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    vignette.addColorStop(0, bg + '00');
    vignette.addColorStop(1, bg + '77');
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