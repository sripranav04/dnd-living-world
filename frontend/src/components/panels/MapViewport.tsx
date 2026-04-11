import React, { useEffect, useRef } from 'react';
import { DynamicSlot } from '../DynamicSlot';
import { useGameStore } from '../../store/gameStore';
import styles from './MapViewport.module.css';

function Torch({ style }: { style: React.CSSProperties }) {
  return (
    <div className={styles.torch} style={style}>
      <div className={styles.torchGlow} />
      <div className={styles.torchFlame} />
    </div>
  );
}

function MapToken({ avatar, x, y, type, isActive, name }: {
  avatar: string; x: number; y: number;
  type: 'player' | 'enemy' | 'npc'; isActive: boolean; name: string;
}) {
  const cls = [
    styles.token,
    type === 'player' ? styles.tokenPlayer : type === 'enemy' ? styles.tokenEnemy : styles.tokenNpc,
    isActive ? styles.tokenActive : '',
  ].join(' ');
  return (
    <div className={cls} style={{ left: `${x}%`, top: `${y}%` }} title={name}>
      {avatar}
    </div>
  );
}

function SpellRing({ id, x, y, color }: { id: string; x: number; y: number; color: string }) {
  const consume = useGameStore((s) => s.consumeSpellFx);
  useEffect(() => {
    const t = setTimeout(() => consume(id), 1400);
    return () => clearTimeout(t);
  }, [id, consume]);
  return (
    <div
      className={styles.spellRing}
      style={{ left: `${x}%`, top: `${y}%`, borderColor: color }}
    />
  );
}

// Corner ornament — fully inline so sizing is explicit
function CornerOrnament({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const transforms: Record<string, string> = {
    tl: 'none', tr: 'scaleX(-1)', bl: 'scaleY(-1)', br: 'scale(-1,-1)',
  };
  const positions: Record<string, React.CSSProperties> = {
    tl: { top: 10, left: 10 }, tr: { top: 10, right: 10 },
    bl: { bottom: 10, left: 10 }, br: { bottom: 10, right: 10 },
  };
  return (
    <div style={{
      position: 'absolute', width: 42, height: 42, opacity: 0.28,
      zIndex: 9, pointerEvents: 'none', transform: transforms[pos],
      ...positions[pos],
    }}>
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2 L2 18 M2 2 L18 2" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M2 2 L14 14" stroke="#c9a227" strokeWidth="0.5" opacity="0.4"/>
        <circle cx="2" cy="2" r="2" fill="#c9a227"/>
      </svg>
    </div>
  );
}

export function MapViewport() {
  const world = useGameStore((s) => s.world);
  const tokens = useGameStore((s) => s.tokens);
  const spellFxQueue = useGameStore((s) => s.spellFxQueue);
  const isShaking = useGameStore((s) => s.isShaking);
  const shakeRef = useRef<HTMLDivElement>(null);

  // Screen shake — add/remove class on the DOM element directly
  useEffect(() => {
    const el = shakeRef.current;
    if (!el || !isShaking) return;
    el.classList.add(styles.shake);
    const t = setTimeout(() => el.classList.remove(styles.shake), 600);
    return () => clearTimeout(t);
  }, [isShaking]);

  return (
    <div ref={shakeRef} className={styles.root}>
      <CornerOrnament pos="tl" />
      <CornerOrnament pos="tr" />
      <CornerOrnament pos="bl" />
      <CornerOrnament pos="br" />

      <div className={styles.locationLabel}>{world.locationName}</div>

      {tokens.map((token) => (
        <MapToken key={token.id} {...token} />
      ))}

      {spellFxQueue.map((fx) => (
        <SpellRing key={fx.id} {...fx} />
      ))}

      <div className={styles.vignette} />
      <div className={styles.roundPill}>
        {world.inCombat ? `ROUND ${world.round ?? '—'} · COMBAT` : 'EXPLORATION'}
      </div>
    </div>
  );
}