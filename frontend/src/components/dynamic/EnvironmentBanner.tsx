import React from 'react';
import { useGameStore } from '../../store/gameStore';

export default function EnvironmentBanner() {
  const world = useGameStore((s) => s.world);

  return (
    <div
      style={{
        padding: '12px 18px',
        background: 'rgba(8, 6, 10, 0.88)',
        borderBottom: '0.5px solid var(--color-border-bright)',
        borderTop: '0.5px solid var(--color-border-bright)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        animation: 'envBannerIn 0.4s ease forwards',
      }}
    >
      <style>{`
        @keyframes envBannerIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.28em',
          color: 'var(--color-accent-primary)',
          opacity: 0.6,
          textTransform: 'uppercase',
          marginBottom: '3px',
        }}>
          {world.biome}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          color: 'var(--color-text-primary)',
          letterSpacing: '0.06em',
        }}>
          {world.locationName}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
        opacity: 0.6,
        fontStyle: 'italic',
        flex: 1,
      }}>
        {world.description}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {world.conditions.map((c) => (
          <span key={c} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            padding: '2px 7px',
            borderRadius: '2px',
            letterSpacing: '0.1em',
            background: 'rgba(74,127,165,0.1)',
            border: '0.5px solid rgba(74,127,165,0.24)',
            color: 'var(--color-text-rune)',
            textTransform: 'uppercase',
          }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}