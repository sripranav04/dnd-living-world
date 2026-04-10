import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

// Mounted by agent in the 'map-overlay' slot during combat encounters
// Shows initiative order + party HP as a compact tactical overlay
export default function CombatHUD() {
  const party = useGameStore((s) => s.party);
  const initiative = useGameStore((s) => s.initiative);
  const world = useGameStore((s) => s.world);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!world.inCombat) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '48px',
        left: '12px',
        background: 'rgba(8,6,10,0.85)',
        border: '0.5px solid var(--color-border)',
        borderRadius: '4px',
        padding: '10px 14px',
        minWidth: '180px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    >
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '9px',
        letterSpacing: '0.3em',
        color: 'var(--color-text-danger)',
        opacity: 0.8,
        marginBottom: '8px',
        textTransform: 'uppercase',
      }}>
        ⚔ Combat · Round {world.round ?? '—'}
      </div>

      {/* Party HP bars */}
      {party.map((char) => {
        const pct = Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100));
        const barColor = pct > 50
          ? 'var(--color-hp-high)'
          : pct > 25
          ? 'var(--color-hp-mid)'
          : 'var(--color-hp-low)';
        return (
          <div key={char.id} style={{ marginBottom: '6px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: char.isDowned ? 'var(--color-text-danger)' : 'var(--color-text-secondary)',
              marginBottom: '2px',
              letterSpacing: '0.05em',
            }}>
              <span style={{ opacity: char.isActive ? 1 : 0.6 }}>{char.name.split(' ')[0]}</span>
              <span style={{ opacity: 0.55 }}>{char.hp}/{char.maxHp}</span>
            </div>
            <div style={{
              height: '3px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: barColor,
                borderRadius: '2px',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        );
      })}

      {/* Current turn indicator */}
      {initiative.length > 0 && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '0.5px solid var(--color-border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-text-gold)',
          opacity: 0.8,
          letterSpacing: '0.1em',
        }}>
          ▶ {initiative.find((e) => e.isCurrent)?.name ?? '—'}
        </div>
      )}
    </div>
  );
}