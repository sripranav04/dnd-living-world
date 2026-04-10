import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

// Mounted by agent in 'map-overlay' slot when a spell is cast
// Reads spell FX queue from store and renders animated rings
// Auto-unmounts by agent after the animation cycle

const SPELL_COLORS: Record<string, string> = {
  fireball:    '#f5622a',
  ice:         '#7dd4f8',
  lightning:   '#f5e642',
  acid:        '#7fbf5e',
  necrotic:    '#b09de8',
  radiant:     '#f5d442',
  default:     '#6eb5d4',
};

interface Ring {
  id: string;
  x: number;
  y: number;
  color: string;
  delay: number;
}

export default function SpellEffect() {
  const spellFxQueue = useGameStore((s) => s.spellFxQueue);
  const consumeSpellFx = useGameStore((s) => s.consumeSpellFx);
  const [rings, setRings] = useState<Ring[]>([]);

  useEffect(() => {
    if (spellFxQueue.length === 0) return;

    const newRings: Ring[] = [];
    spellFxQueue.forEach((fx) => {
      // Multiple expanding rings per spell
      for (let i = 0; i < 3; i++) {
        newRings.push({
          id: `${fx.id}-${i}`,
          x: fx.x,
          y: fx.y,
          color: fx.color,
          delay: i * 160,
        });
      }
      setTimeout(() => consumeSpellFx(fx.id), 1600);
    });

    setRings((prev) => [...prev, ...newRings]);
    setTimeout(() => setRings([]), 2000);
  }, [spellFxQueue, consumeSpellFx]);

  if (rings.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 15,
    }}>
      <style>{`
        @keyframes spellRingExpand {
          0%   { width: 0; height: 0; opacity: 0.9; }
          70%  { opacity: 0.7; }
          100% { width: 200px; height: 200px; opacity: 0; }
        }
        @keyframes spellFlash {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {rings.map((ring) => (
        <React.Fragment key={ring.id}>
          {/* Expanding ring */}
          <div style={{
            position: 'absolute',
            left: `${ring.x}%`,
            top: `${ring.y}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: `1.5px solid ${ring.color}`,
            animation: `spellRingExpand 1.1s ease-out ${ring.delay}ms forwards`,
            width: 0,
            height: 0,
          }} />
          {/* Glow spot */}
          <div style={{
            position: 'absolute',
            left: `${ring.x}%`,
            top: `${ring.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: ring.color,
            opacity: 0,
            animation: `spellFlash 0.6s ease-out ${ring.delay}ms forwards`,
            filter: `blur(4px)`,
          }} />
        </React.Fragment>
      ))}
    </div>
  );
}