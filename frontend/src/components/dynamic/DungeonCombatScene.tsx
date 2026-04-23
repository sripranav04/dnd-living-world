import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';

function getCSSVar(name: string, fallback = '#888888'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function DungeonCombatScene() {
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
    const cx = W * 0.5;
    const cy = H * 0.42;
    const vpX = W * 0.5;
    const vpY = H * 0.45;
    const enemyH = H * 0.6;
    const enemyW = enemyH * 0.34;
    const bobY = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const enemyColor = getCSSVar('--enemy-skeleton-color', '#d4c9a8');
    const boneShade = getCSSVar('--enemy-skeleton-shade', '#c8b89a');
    const gapColor = getCSSVar('--enemy-gap-color', wall);
    const clothColor = getCSSVar('--enemy-cloth-color', bg);
    const eyeGlow = getCSSVar('--enemy-eye-color', accent);

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, wall + 'ee');
    wallGrad.addColorStop(0.45, wall + 'ff');
    wallGrad.addColorStop(1, bg + 'ff');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = wall + 'cc';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.18, 0);
    ctx.lineTo(W * 0.28, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.82, 0);
    ctx.lineTo(W * 0.72, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
    ceilGrad.addColorStop(0, bg + 'ff');
    ceilGrad.addColorStop(1, wall + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.72, H * 0.22);
    ctx.lineTo(W * 0.28, H * 0.22);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC + 'ff');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.72, vpY);
    ctx.lineTo(W * 0.28, vpY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '18';
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      const x = cx + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const y = vpY + i * (H * 0.07);
      const spread = (y - vpY) * 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - spread, y);
      ctx.lineTo(cx + spread, y);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: number) => {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.14);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = boneShade;
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.03, y - H * 0.02);
      ctx.lineTo(x, y);
      ctx.lineTo(x - side * W * 0.03, y + H * 0.02);
      ctx.stroke();

      ctx.fillStyle = wall;
      ctx.fillRect(x - 6, y - 12, 12, 24);

      const flicker = 1 + Math.sin(t * 14 + x * 0.01) * 0.12 + Math.sin(t * 23) * 0.06;
      const flame = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 18 * flicker);
      flame.addColorStop(0, getCSSVar('--torch-core-color', '#fff0b3'));
      flame.addColorStop(0.45, torch + 'ee');
      flame.addColorStop(1, torch + '00');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.arc(x, y - 8, 18 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch;
      ctx.beginPath();
      ctx.moveTo(x, y - 24 * flicker);
      ctx.quadraticCurveTo(x + 8, y - 10, x, y - 2);
      ctx.quadraticCurveTo(x - 8, y - 10, x, y - 24 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.16, H * 0.3, -1);
    drawTorch(W * 0.84, H * 0.3, 1);

    ctx.fillStyle = bg + '55';
    ctx.beginPath();
    ctx.ellipse(cx, H * 0.76, enemyW * 0.95, enemyH * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
    enemyGlow.addColorStop(0, enemyColor + '44');
    enemyGlow.addColorStop(1, enemyColor + '00');
    ctx.fillStyle = enemyGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, H * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (state === 'attack') {
      const atkScale = state === 'attack' ? 1.0 + Math.sin(t * 6) * 0.15 : 1.0;
      ctx.save();
      ctx.translate(W * 0.5, H * 0.42);
      ctx.scale(atkScale, atkScale);
      ctx.translate(-W * 0.5, -H * 0.42);
    } else if (state === 'recoil') {
      const recoilX = 30;
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
    }

    ctx.save();
    ctx.translate(0, bobY);
    ctx.translate(cx, cy);
    ctx.scale(breathe, breathe);
    ctx.translate(-cx, -cy);

    const skullR = enemyH * 0.09;
    const torsoTop = cy - enemyH * 0.12;
    const pelvisY = cy + enemyH * 0.16;
    const shoulderY = cy - enemyH * 0.02;
    const hipY = cy + enemyH * 0.18;

    ctx.strokeStyle = enemyColor;
    ctx.fillStyle = enemyColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = Math.max(4, enemyW * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx, torsoTop + skullR * 1.2);
    ctx.lineTo(cx, pelvisY);
    ctx.stroke();

    for (let i = -1; i <= 1; i += 2) {
      ctx.lineWidth = Math.max(3, enemyW * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY);
      ctx.lineTo(cx + i * enemyW * 0.42, shoulderY + enemyH * 0.03);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, hipY);
      ctx.lineTo(cx + i * enemyW * 0.22, hipY + enemyH * 0.05);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const ry = torsoTop + enemyH * 0.05 + i * enemyH * 0.045;
      const rw = enemyW * (0.5 - i * 0.05);
      ctx.lineWidth = Math.max(2, enemyW * 0.035);
      ctx.beginPath();
      ctx.moveTo(cx - rw, ry);
      ctx.lineTo(cx - enemyW * 0.08, ry + enemyH * 0.015);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + enemyW * 0.08, ry + enemyH * 0.015);
      ctx.lineTo(cx + rw, ry);
      ctx.stroke();
    }

    ctx.strokeStyle = gapColor;
    ctx.lineWidth = Math.max(2, enemyW * 0.03);
    for (let i = 0; i < 4; i++) {
      const gy = torsoTop + enemyH * 0.08 + i * enemyH * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx - enemyW * 0.06, gy);
      ctx.lineTo(cx + enemyW * 0.06, gy);
      ctx.stroke();
    }

    ctx.fillStyle = enemyColor;
    ctx.beginPath();
    ctx.arc(cx, cy - enemyH * 0.2, skullR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = boneShade;
    ctx.lineWidth = Math.max(2, enemyW * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy - enemyH * 0.2, skullR, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    ctx.fillStyle = gapColor;
    ctx.beginPath();
    ctx.arc(cx - skullR * 0.35, cy - enemyH * 0.21, skullR * 0.18, 0, Math.PI * 2);
    ctx.arc(cx + skullR * 0.35, cy - enemyH * 0.21, skullR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeGlow;
    ctx.beginPath();
    ctx.arc(cx + skullR * 0.35, cy - enemyH * 0.21, skullR * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy - enemyH * 0.19);
    ctx.lineTo(cx - skullR * 0.08, cy - enemyH * 0.14);
    ctx.lineTo(cx + skullR * 0.08, cy - enemyH * 0.14);
    ctx.closePath();
    ctx.fillStyle = gapColor;
    ctx.fill();

    ctx.strokeStyle = enemyColor;
    ctx.lineWidth = Math.max(4, enemyW * 0.05);

    const leftShoulderX = cx - enemyW * 0.42;
    const rightShoulderX = cx + enemyW * 0.42;
    const leftElbowX = cx - enemyW * 0.78;
    const leftElbowY = cy + enemyH * 0.02;
    const leftHandX = cx - enemyW * 0.98;
    const leftHandY = cy + enemyH * 0.12;

    const rightElbowX = cx + enemyW * 0.18;
    const rightElbowY = cy - enemyH * 0.02;
    const rightHandX = cx + enemyW * 0.52;
    const rightHandY = cy - enemyH * 0.08;

    ctx.beginPath();
    ctx.moveTo(leftShoulderX, shoulderY + enemyH * 0.03);
    ctx.lineTo(leftElbowX, leftElbowY);
    ctx.lineTo(leftHandX, leftHandY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightShoulderX, shoulderY + enemyH * 0.03);
    ctx.lineTo(rightElbowX, rightElbowY);
    ctx.lineTo(rightHandX, rightHandY);
    ctx.stroke();

    const bowTopX = cx + enemyW * 0.62;
    const bowTopY = cy - enemyH * 0.22;
    const bowBotX = cx + enemyW * 0.72;
    const bowBotY = cy + enemyH * 0.18;
    ctx.strokeStyle = boneShade;
    ctx.lineWidth = Math.max(3, enemyW * 0.035);
    ctx.beginPath();
    ctx.moveTo(bowTopX, bowTopY);
    ctx.quadraticCurveTo(cx + enemyW * 0.92, cy - enemyH * 0.02, bowBotX, bowBotY);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bowTopX, bowTopY);
    ctx.lineTo(bowBotX, bowBotY);
    ctx.stroke();

    ctx.strokeStyle = boneShade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightHandX, rightHandY);
    ctx.lineTo(cx + enemyW * 0.1, cy - enemyH * 0.03);
    ctx.stroke();

    ctx.fillStyle = boneShade;
    ctx.beginPath();
    ctx.moveTo(cx + enemyW * 0.1, cy - enemyH * 0.03);
    ctx.lineTo(cx + enemyW * 0.18, cy - enemyH * 0.05);
    ctx.lineTo(cx + enemyW * 0.18, cy - enemyH * 0.01);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = enemyColor;
    ctx.lineWidth = Math.max(4, enemyW * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx - enemyW * 0.18, hipY + enemyH * 0.05);
    ctx.lineTo(cx - enemyW * 0.24, cy + enemyH * 0.42);
    ctx.lineTo(cx - enemyW * 0.3, cy + enemyH * 0.62);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + enemyW * 0.18, hipY + enemyH * 0.05);
    ctx.lineTo(cx + enemyW * 0.24, cy + enemyH * 0.42);
    ctx.lineTo(cx + enemyW * 0.3, cy + enemyH * 0.62);
    ctx.stroke();

    ctx.strokeStyle = boneShade;
    ctx.lineWidth = Math.max(3, enemyW * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx - enemyW * 0.3, cy + enemyH * 0.62);
    ctx.lineTo(cx - enemyW * 0.38, cy + enemyH * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + enemyW * 0.3, cy + enemyH * 0.62);
    ctx.lineTo(cx + enemyW * 0.38, cy + enemyH * 0.72);
    ctx.stroke();

    ctx.fillStyle = clothColor + 'aa';
    const strips = [
      [leftElbowX, leftElbowY, -1],
      [rightElbowX, rightElbowY, 1],
      [cx - enemyW * 0.12, hipY + enemyH * 0.03, -1],
      [cx + enemyW * 0.12, hipY + enemyH * 0.03, 1],
    ] as const;
    strips.forEach(([sx, sy, dir], i) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dir * enemyW * (0.08 + i * 0.01), sy + enemyH * 0.08);
      ctx.lineTo(sx + dir * enemyW * (0.02 + i * 0.01), sy + enemyH * 0.16);
      ctx.closePath();
      ctx.fill();
    });

    if (impact > 0) {
      ctx.strokeStyle = accent + 'cc';
      ctx.lineWidth = Math.max(2, enemyW * 0.025);
      ctx.beginPath();
      ctx.moveTo(cx - enemyW * 0.18, cy + enemyH * 0.02);
      ctx.lineTo(cx + enemyW * 0.04, cy - enemyH * 0.02);
      ctx.stroke();

      ctx.fillStyle = accent + 'aa';
      for (let i = 0; i < 14; i++) {
        const a = -0.8 + i * 0.14 + Math.sin(t * 8 + i) * 0.08;
        const r = enemyW * (0.08 + i * 0.012) * impact;
        ctx.beginPath();
        ctx.arc(cx + r * Math.cos(a), cy + enemyH * 0.02 + r * Math.sin(a), 2 + impact * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    if (state === 'recoil') {
      ctx.fillStyle = accent + 'cc';
      for (let i = 0; i < 22; i++) {
        const a = -0.9 + (i / 21) * 1.8;
        const speed = 30 + i * 3;
        const px = cx + Math.cos(a) * speed * impact + Math.sin(t * 10 + i) * 4;
        const py = cy + Math.sin(a) * speed * impact * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (state === 'attack' || state === 'recoil') {
      ctx.restore();
    }

    const handY = H * 0.9;
    const handX = W * 0.5;
    ctx.fillStyle = getCSSVar('--player-glove-color', wall);
    ctx.beginPath();
    ctx.moveTo(handX - W * 0.05, H);
    ctx.lineTo(handX - W * 0.035, handY);
    ctx.lineTo(handX + W * 0.035, handY);
    ctx.lineTo(handX + W * 0.05, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(handX - W * 0.008, handY);
    ctx.lineTo(handX + W * 0.008, handY);
    ctx.lineTo(handX + W * 0.02, H * 0.76);
    ctx.lineTo(handX - W * 0.02, H * 0.76);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = boneShade;
    ctx.beginPath();
    ctx.moveTo(handX, H * 0.72);
    ctx.lineTo(handX + W * 0.012, H * 0.76);
    ctx.lineTo(handX - W * 0.012, H * 0.76);
    ctx.closePath();
    ctx.fill();

    if (state === 'attack') {
      ctx.fillStyle = '#ff000022';
      ctx.fillRect(0, 0, W, H);
    }

    const vignette = ctx.createRadialGradient(cx, H * 0.5, H * 0.25, cx, H * 0.5, H * 0.78);
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