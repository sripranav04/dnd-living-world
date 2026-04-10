import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

// Mounted by agent when it wants to highlight a dramatic story beat
// e.g. { type: 'mount_component', slot: 'narrative-extra', componentName: 'NarrativeCard' }
export default function NarrativeCard() {
  const narrativeHistory = useGameStore((s) => s.narrativeHistory);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Show the most recent DM entry as a highlighted card
  const lastDm = [...narrativeHistory]
    .reverse()
    .find((e) => e.speaker === 'dm');

  if (!lastDm) return null;

  return (
    <div
      style={{
        margin: '8px 16px',
        padding: '14px 18px',
        background: 'rgba(201,162,39,0.06)',
        border: '0.5px solid rgba(201,162,39,0.3)',
        borderLeft: '2px solid var(--color-accent-primary)',
        borderRadius: '4px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '9px',
        letterSpacing: '0.3em',
        color: 'var(--color-accent-primary)',
        opacity: 0.65,
        marginBottom: '6px',
        textTransform: 'uppercase',
      }}>
        ◆ Dramatic Moment
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '14px',
        fontStyle: 'italic',
        lineHeight: 1.7,
        color: 'var(--color-text-primary)',
        opacity: 0.92,
      }}>
        {lastDm.text}
      </div>
    </div>
  );
}