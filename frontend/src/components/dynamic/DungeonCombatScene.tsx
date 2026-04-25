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
    const vpX = W * 0.5;
    const vpY = H * 0.45;
    const enemyX = W * 0.5;
    const enemyY = H * 0.42;
    const idleBob = Math.sin(t * 1.2) * 8;
    const breathe = 1 + Math.sin(t * 0.8) * 0.02;
    const enemyColor = getCSSVar('--wraith-color', '#2a1a4a');

    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, wall + 'ee');
    wallGrad.addColorStop(0.45, wall);
    wallGrad.addColorStop(1, bg);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, H * 0.28);
    ceilGrad.addColorStop(0, bg);
    ceilGrad.addColorStop(1, wall + '00');
    ctx.fillStyle = ceilGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W * 0.82, H * 0.22);
    ctx.lineTo(W * 0.18, H * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = wall + 'cc';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 0.18, H * 0.22);
    ctx.lineTo(W * 0.18, H * 0.88);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W * 0.82, H * 0.22);
    ctx.lineTo(W * 0.82, H * 0.88);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    const floorGrad = ctx.createLinearGradient(0, vpY, 0, H);
    floorGrad.addColorStop(0, floorC + 'aa');
    floorGrad.addColorStop(1, floorC);
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.82, H * 0.58);
    ctx.lineTo(W * 0.18, H * 0.58);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '18';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const x = vpX + i * (W * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(vpX, vpY);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const yy = H * (0.58 + i * 0.06);
      ctx.beginPath();
      ctx.moveTo(W * (0.18 - i * 0.03), yy);
      ctx.lineTo(W * (0.82 + i * 0.03), yy);
      ctx.stroke();
    }

    const drawTorch = (x: number, y: number, side: number) => {
      const flicker = 0.85 + Math.sin(t * 11 + side) * 0.08 + Math.sin(t * 17 + side * 2) * 0.05;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, H * 0.16);
      glow.addColorStop(0, torch + 'bb');
      glow.addColorStop(0.35, torch + '44');
      glow.addColorStop(1, torch + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, H * 0.16, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accent + '88';
      ctx.lineWidth = Math.max(2, W * 0.004);
      ctx.beginPath();
      ctx.moveTo(x - side * W * 0.03, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + H * 0.05);
      ctx.stroke();

      ctx.fillStyle = accent + 'aa';
      ctx.beginPath();
      ctx.arc(x, y, H * 0.012, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = torch + 'cc';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.035 * flicker);
      ctx.quadraticCurveTo(x + W * 0.012, y - H * 0.01, x, y + H * 0.01);
      ctx.quadraticCurveTo(x - W * 0.012, y - H * 0.01, x, y - H * 0.035 * flicker);
      ctx.fill();

      ctx.fillStyle = accent + '99';
      ctx.beginPath();
      ctx.moveTo(x, y - H * 0.02 * flicker);
      ctx.quadraticCurveTo(x + W * 0.006, y - H * 0.006, x, y + H * 0.006);
      ctx.quadraticCurveTo(x - W * 0.006, y - H * 0.006, x, y - H * 0.02 * flicker);
      ctx.fill();
    };

    drawTorch(W * 0.14, H * 0.3, -1);
    drawTorch(W * 0.86, H * 0.3, 1);

    ctx.fillStyle = bg + '55';
    ctx.beginPath();
    ctx.ellipse(enemyX, H * 0.73, W * 0.12, H * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();

    const drawEnemy = () => {
      const bodyY = enemyY + idleBob;
      const totalH = H * 0.58;
      const skullR = H * 0.085;
      const torsoTop = bodyY - totalH * 0.18;
      const torsoMid = bodyY + totalH * 0.02;
      const tailEnd = bodyY + totalH * 0.34;

      const enemyGlow = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.35);
      enemyGlow.addColorStop(0, enemyColor + '44');
      enemyGlow.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = enemyGlow;
      ctx.beginPath();
      ctx.arc(enemyX, enemyY, H * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(enemyX, enemyY);
      ctx.scale(breathe, breathe);
      ctx.translate(-enemyX, -enemyY);

      const mist = ctx.createRadialGradient(enemyX, bodyY + H * 0.04, 0, enemyX, bodyY + H * 0.04, H * 0.22);
      mist.addColorStop(0, enemyColor + 'aa');
      mist.addColorStop(0.6, enemyColor + '55');
      mist.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = mist;
      ctx.beginPath();
      ctx.ellipse(enemyX, bodyY + H * 0.08, W * 0.12, H * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemyColor + 'dd';
      ctx.lineWidth = Math.max(4, W * 0.008);
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const side = i < 2 ? -1 : i > 2 ? 1 : 0;
        const spread = (i - 2) * W * 0.045;
        const startX = enemyX + spread * 0.35;
        const startY = torsoTop + H * 0.08;
        const endX = enemyX + spread + side * W * 0.08;
        const endY = bodyY + H * (0.02 + Math.sin(t * 1.7 + i) * 0.015);
        const ctrl1X = enemyX + spread * 0.8 + side * W * 0.05;
        const ctrl1Y = bodyY - H * 0.08;
        const ctrl2X = enemyX + spread + side * W * 0.1;
        const ctrl2Y = bodyY - H * 0.01;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
        ctx.stroke();

        ctx.lineWidth = Math.max(2, W * 0.004);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.quadraticCurveTo(endX + side * W * 0.02, endY + H * 0.02, endX + side * W * 0.03, endY + H * 0.05);
        ctx.stroke();
        ctx.lineWidth = Math.max(4, W * 0.008);
      }

      const bodyGrad = ctx.createLinearGradient(enemyX, torsoTop, enemyX, tailEnd);
      bodyGrad.addColorStop(0, enemyColor + 'ee');
      bodyGrad.addColorStop(0.5, enemyColor + 'cc');
      bodyGrad.addColorStop(1, enemyColor + '00');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(enemyX - W * 0.08, torsoTop + H * 0.03);
      ctx.quadraticCurveTo(enemyX - W * 0.12, torsoMid, enemyX - W * 0.05, bodyY + H * 0.18);
      ctx.quadraticCurveTo(enemyX - W * 0.02, bodyY + H * 0.28, enemyX, tailEnd);
      ctx.quadraticCurveTo(enemyX + W * 0.02, bodyY + H * 0.28, enemyX + W * 0.05, bodyY + H * 0.18);
      ctx.quadraticCurveTo(enemyX + W * 0.12, torsoMid, enemyX + W * 0.08, torsoTop + H * 0.03);
      ctx.quadraticCurveTo(enemyX, torsoTop - H * 0.03, enemyX - W * 0.08, torsoTop + H * 0.03);
      ctx.fill();

      ctx.fillStyle = getCSSVar('--bone-color', '#d4c9a8');
      ctx.beginPath();
      ctx.arc(enemyX, bodyY - H * 0.12, skullR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg + 'bb';
      ctx.beginPath();
      ctx.arc(enemyX - skullR * 0.38, bodyY - H * 0.125, skullR * 0.18, 0, Math.PI * 2);
      ctx.arc(enemyX + skullR * 0.38, bodyY - H * 0.125, skullR * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(enemyX, bodyY - H * 0.105);
      ctx.lineTo(enemyX - skullR * 0.12, bodyY - H * 0.075);
      ctx.lineTo(enemyX + skullR * 0.12, bodyY - H * 0.075);
      ctx.closePath();
      ctx.fill();

      const eyeGlowL = ctx.createRadialGradient(enemyX - skullR * 0.38, bodyY - H * 0.125, 0, enemyX - skullR * 0.38, bodyY - H * 0.125, skullR * 0.45);
      eyeGlowL.addColorStop(0, getCSSVar('--enemy-eye-color', '#ff4444'));
      eyeGlowL.addColorStop(1, getCSSVar('--enemy-eye-color', '#ff4444') + '00');
      ctx.fillStyle = eyeGlowL;
      ctx.beginPath();
      ctx.arc(enemyX - skullR * 0.38, bodyY - H * 0.125, skullR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      const eyeGlowR = ctx.createRadialGradient(enemyX + skullR * 0.38, bodyY - H * 0.125, 0, enemyX + skullR * 0.38, bodyY - H * 0.125, skullR * 0.45);
      eyeGlowR.addColorStop(0, getCSSVar('--enemy-eye-color', '#ff4444'));
      eyeGlowR.addColorStop(1, getCSSVar('--enemy-eye-color', '#ff4444') + '00');
      ctx.fillStyle = eyeGlowR;
      ctx.beginPath();
      ctx.arc(enemyX + skullR * 0.38, bodyY - H * 0.125, skullR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = getCSSVar('--enemy-eye-color', '#ff4444');
      ctx.beginPath();
      ctx.arc(enemyX - skullR * 0.38, bodyY - H * 0.125, skullR * 0.1, 0, Math.PI * 2);
      ctx.arc(enemyX + skullR * 0.38, bodyY - H * 0.125, skullR * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = enemyColor + '88';
      ctx.lineWidth = Math.max(2, W * 0.004);
      for (let i = 0; i < 6; i++) {
        const sway = Math.sin(t * 1.8 + i) * W * 0.012;
        ctx.beginPath();
        ctx.moveTo(enemyX + (i - 2.5) * W * 0.018, bodyY + H * 0.16);
        ctx.quadraticCurveTo(enemyX + sway, bodyY + H * (0.24 + i * 0.01), enemyX + (i - 2.5) * W * 0.01, bodyY + H * (0.3 + i * 0.015));
        ctx.stroke();
      }

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
      const recoilX = 30;
      ctx.save();
      ctx.translate(recoilX, 0);
      ctx.scale(0.85, 0.85);
      drawEnemy();
      ctx.restore();

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18 + t * 4;
        const r = W * (0.02 + i * 0.002) * impact;
        const px = enemyX + Math.cos(a) * r;
        const py = enemyY + H * 0.02 + Math.sin(a) * r * 0.7;
        ctx.fillStyle = accent + Math.max(40, Math.floor(180 * impact)).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.5, W * 0.004 * impact), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawEnemy();
    }

    const handY = H * 0.9;
    const handGrad = ctx.createLinearGradient(0, handY - H * 0.08, 0, H);
    handGrad.addColorStop(0, wall + 'cc');
    handGrad.addColorStop(1, bg);
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(W * 0.44, H);
    ctx.quadraticCurveTo(W * 0.445, handY, W * 0.47, handY - H * 0.05);
    ctx.quadraticCurveTo(W * 0.49, handY - H * 0.085, W * 0.505, handY - H * 0.06);
    ctx.quadraticCurveTo(W * 0.515, handY - H * 0.03, W * 0.52, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent + '66';
    ctx.lineWidth = Math.max(2, W * 0.003);
    ctx.beginPath();
    ctx.moveTo(W * 0.485, handY - H * 0.07);
    ctx.lineTo(W * 0.5, handY - H * 0.11 - impact * H * 0.015);
    ctx.lineTo(W * 0.515, handY - H * 0.07);
    ctx.stroke();

    if (impact > 0.02) {
      for (let i = 0; i < 3; i++) {
        const dx = [-0.03, 0, 0.03][i] * W;
        const boltGrad = ctx.createLinearGradient(W * 0.5, handY - H * 0.1, enemyX + dx * 0.4, enemyY + H * 0.05);
        boltGrad.addColorStop(0, getCSSVar('--magic-missile-core', '#ffffff'));
        boltGrad.addColorStop(0.4, getCSSVar('--magic-missile-color', '#88ccff'));
        boltGrad.addColorStop(1, getCSSVar('--magic-missile-color', '#88ccff') + '00');
        ctx.strokeStyle = boltGrad;
        ctx.lineWidth = Math.max(2, W * 0.005 * impact);
        ctx.beginPath();
        ctx.moveTo(W * 0.5, handY - H * 0.1);
        ctx.quadraticCurveTo(W * (0.5 + dx / W * 0.5), H * 0.72, enemyX + dx * 0.4, enemyY + H * 0.05);
        ctx.stroke();
      }
    }

    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.35, W * 0.5, H * 0.5, H * 0.75);
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