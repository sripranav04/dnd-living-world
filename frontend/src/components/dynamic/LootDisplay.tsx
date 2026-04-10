import React, { useEffect, useState } from 'react';

// Mounted by agent in 'narrative-extra' slot after combat or discovery
// Agent passes loot via the world state or a future loot_items field
// For now reads from a global loot event dispatched via CustomEvent

interface LootItem {
  name: string;
  type: 'weapon' | 'armor' | 'spell' | 'potion' | 'treasure' | 'gold';
  value?: string;
  description?: string;
}

// Default demo loot — in production the agent populates this
// by dispatching: window.dispatchEvent(new CustomEvent('dnd:loot', { detail: items }))
const DEMO_LOOT: LootItem[] = [
  { name: '247 Gold Pieces', type: 'gold', value: '247gp' },
  { name: "Necromancer's Ring", type: 'spell', value: '400gp', description: '+1 to spell attack rolls' },
  { name: 'Potion of Healing', type: 'potion', value: '50gp', description: 'Restores 2d4+2 HP' },
];

const TYPE_ICON: Record<LootItem['type'], string> = {
  weapon: '⚔',
  armor: '🛡',
  spell: '✦',
  potion: '⚗',
  treasure: '◆',
  gold: '◉',
};

const TYPE_COLOR: Record<LootItem['type'], string> = {
  weapon: '#d4926a',
  armor: 'var(--color-text-rune)',
  spell: '#b09de8',
  potion: '#7fbf5e',
  treasure: 'var(--color-text-gold)',
  gold: 'var(--color-text-gold)',
};

export default function LootDisplay() {
  const [loot, setLoot] = useState<LootItem[]>(DEMO_LOOT);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);

    const handler = (e: Event) => {
      const custom = e as CustomEvent<LootItem[]>;
      if (custom.detail) setLoot(custom.detail);
    };
    window.addEventListener('dnd:loot', handler);
    return () => {
      clearTimeout(t);
      window.removeEventListener('dnd:loot', handler);
    };
  }, []);

  return (
    <div
      style={{
        margin: '10px 16px',
        padding: '14px 18px',
        background: 'rgba(201,162,39,0.05)',
        border: '0.5px solid rgba(201,162,39,0.28)',
        borderRadius: '4px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '10px',
        letterSpacing: '0.3em',
        color: 'var(--color-text-gold)',
        opacity: 0.7,
        marginBottom: '10px',
        textTransform: 'uppercase',
      }}>
        ◆ Loot Discovered
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loot.map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}>
            <span style={{
              fontSize: '14px',
              color: TYPE_COLOR[item.type],
              flexShrink: 0,
              width: '18px',
              textAlign: 'center',
            }}>
              {TYPE_ICON[item.type]}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                letterSpacing: '0.04em',
                marginBottom: item.description ? '2px' : 0,
              }}>
                {item.name}
                {item.value && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--color-text-gold)',
                    opacity: 0.6,
                    marginLeft: '8px',
                  }}>
                    {item.value}
                  </span>
                )}
              </div>
              {item.description && (
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  fontStyle: 'italic',
                  color: 'var(--color-text-secondary)',
                  opacity: 0.55,
                }}>
                  {item.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}