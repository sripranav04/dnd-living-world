import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './MapViewport.module.css';

// ── Torch ─────────────────────────────────────────────────

function Torch({ style }: { style: React.CSSProperties }) {
  return (
    <div className={styles.torch} style={style}>
      <div className={styles.torchGlow} />
      <div className={styles.torchFlame} />
    </div>
  );
}

// ── Token ─────────────────────────────────────────────────

function MapToken({
  avatar,
  x,
  y,
  type,
  isActive,
  name,
}: {
  avatar: string;
  x: number;
  y: number;
  type: 'player' | 'enemy' | 'npc';
  isActive: boolean;
  name: string;
}) {
  const cls = [
    styles.token,
    type === 'player' ? styles.tokenPlayer : type === 'enemy' ? styles.tokenEnemy : styles.tokenNpc,
    isActive ? styles.tokenActive : '',
  ].join(' ');

  return (
    <div
      className={cls}
      style={{ left: `${x}%`, top: `${y}%` }}
      title={name}
    >
      {avatar}
    </div>
  );
}

// ── Spell FX ring ─────────────────────────────────────────

function SpellRing({
  id,
  x,
  y,
  color,
}: {
  id: string;
  x: number;
  y: number;
  color: string;
}) {
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

// ── MapViewport ───────────────────────────────────────────

export function MapViewport() {
  const world = useGameStore((s) => s.world);
  const tokens = useGameStore((s) => s.tokens);
  const spellFxQueue = useGameStore((s) => s.spellFxQueue);
  const isShaking = useGameStore((s) => s.isShaking);

  const rootRef = useRef<HTMLDivElement>(null);

  // Screen shake
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (isShaking) {
      el.classList.add(styles.shake);
    } else {
      el.classList.remove(styles.shake);
    }
  }, [isShaking]);

  return (
    <div ref={rootRef} className={styles.root}>
      {/* Corner ornaments */}
      <CornerOrnament pos="tl" />
      <CornerOrnament pos="tr" />
      <CornerOrnament pos="bl" />
      <CornerOrnament pos="br" />

      {/* Location label */}
      <div className={styles.locationLabel}>{world.locationName}</div>

      {/* Dungeon scene */}
      <div className={styles.scene}>
        <div className={styles.wallTop} />
        <div className={styles.wallBottom} />
        <div className={styles.wallLeft} />
        <div className={styles.wallRight} />
        <div className={styles.floor} />

        {/* Torches */}
        <Torch style={{ top: '22%', left: '16%' }} />
        <Torch style={{ top: '22%', right: '16%' }} />
        <Torch style={{ bottom: '22%', left: '16%' }} />
        <Torch style={{ bottom: '22%', right: '16%' }} />

        {/* Grid overlay */}
        <div className={styles.grid} />

        {/* Mist */}
        <div className={styles.mist} />
      </div>

      {/* Tokens */}
      {tokens.map((token) => (
        <MapToken key={token.id} {...token} />
      ))}

      {/* Spell FX */}
      {spellFxQueue.map((fx) => (
        <SpellRing key={fx.id} {...fx} />
      ))}

      {/* Vignette */}
      <div className={styles.vignette} />

      {/* Round / mode pill */}
      <div className={styles.roundPill}>
        {world.inCombat
          ? `ROUND ${world.round ?? '—'} · COMBAT`
          : 'EXPLORATION'}
      </div>
    </div>
  );
}

// ── Corner ornament (inline SVG) ──────────────────────────

function CornerOrnament({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const transforms: Record<string, string> = {
    tl: 'none',
    tr: 'scaleX(-1)',
    bl: 'scaleY(-1)',
    br: 'scale(-1, -1)',
  };
  return (
    <div className={`${styles.corner} ${styles[`corner-${pos}`]}`} style={{ transform: transforms[pos] }}>
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 2 L2 18 M2 2 L18 2" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 2 L14 14" stroke="#c9a227" strokeWidth="0.5" opacity="0.4" />
        <circle cx="2" cy="2" r="2" fill="#c9a227" />
      </svg>
    </div>
  );
}