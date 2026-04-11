import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { CharacterStats, InitiativeEntry } from '../../store/gameStore';
import styles from './LeftPanel.module.css';

// ── HP bar ───────────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const barColor = pct > 50 ? '#4caf6a' : pct > 25 ? '#c9a227' : '#c03030';
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3,
        overflow: 'hidden', width: '100%',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: barColor, borderRadius: 3,
          transition: 'width 0.6s ease, background 0.4s ease',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: pct <= 25 ? '#e07070' : 'rgba(201,189,160,0.6)',
        marginTop: 3,
      }}>
        <span>HP</span>
        <span>{hp} / {maxHp}</span>
      </div>
    </div>
  );
}

// ── Status chip ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'poisoned':      'chipPoison',
  'burning':       'chipBurning',
  'shield':        'chipShield',
  'frightened':    'chipDanger',
  'stunned':       'chipDanger',
  'paralyzed':     'chipDanger',
  'concentration': 'chipConc',
};

const CHIP_STYLES: Record<string, React.CSSProperties> = {
  chipPoison:  { background: 'rgba(45,100,30,0.25)', color: '#7fbf5e', border: '0.5px solid rgba(127,191,94,0.3)' },
  chipBurning: { background: 'rgba(212,82,26,0.2)',  color: '#f0874a', border: '0.5px solid rgba(212,82,26,0.35)' },
  chipShield:  { background: 'rgba(74,127,165,0.18)', color: '#6eb5d4', border: '0.5px solid rgba(110,181,212,0.3)' },
  chipDanger:  { background: 'rgba(180,40,40,0.2)',  color: '#e07070', border: '0.5px solid rgba(180,40,40,0.35)' },
  chipConc:    { background: 'rgba(201,162,39,0.12)', color: '#c9a227', border: '0.5px solid rgba(201,162,39,0.3)' },
  chipDefault: { background: 'rgba(255,255,255,0.06)', color: 'rgba(201,189,160,0.6)', border: '0.5px solid rgba(201,162,39,0.15)' },
};

function StatusChip({ label }: { label: string }) {
  const key = Object.keys(STATUS_COLORS).find((k) => label.toLowerCase().includes(k));
  const styleKey = key ? STATUS_COLORS[key] : 'chipDefault';
  const chipStyle = CHIP_STYLES[styleKey] ?? CHIP_STYLES.chipDefault;
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
      borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      display: 'inline-block', ...chipStyle,
    }}>
      {label}
    </span>
  );
}

// ── Character card ───────────────────────────────────────

function CharacterCard({ char }: { char: CharacterStats }) {
  const extraEntries = Object.entries(char.extraStats ?? {});

  return (
    <div
      className={[
        styles.charCard,
        char.isActive ? styles.activeTurn : '',
        char.isDowned ? styles.downed : '',
      ].join(' ')}
    >
      {/* Active indicator stripe is CSS ::before */}
      <div className={styles.charTop}>
        <div className={[styles.avatar, char.isActive ? styles.avatarActive : ''].join(' ')}>
          {char.avatar}
        </div>
        <div className={styles.charInfo}>
          <div className={styles.charName}>{char.name}</div>
          <div className={styles.charClass}>{char.class} · {char.race}</div>
        </div>
        <div className={styles.charLevel}>LV {char.level}</div>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statMini}>
          <div className={styles.statLabel}>AC</div>
          <div className={styles.statVal}>{char.ac}</div>
        </div>
        {extraEntries.slice(0, 1).map(([k, v]) => (
          <div key={k} className={styles.statMini}>
            <div className={styles.statLabel}>{k.toUpperCase()}</div>
            <div className={styles.statVal}>{v}</div>
          </div>
        ))}
      </div>

      <HpBar hp={char.hp} maxHp={char.maxHp} />

      {char.statusEffects.length > 0 && (
        <div className={styles.chips}>
          {char.statusEffects.map((s) => (
            <StatusChip key={s} label={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Initiative row ───────────────────────────────────────

function InitRow({ entry }: { entry: InitiativeEntry }) {
  return (
    <div
      className={[
        styles.initRow,
        entry.isCurrent ? styles.initCurrent : '',
        entry.isEnemy ? styles.initEnemy : '',
      ].join(' ')}
    >
      <div className={styles.initMarker} />
      <div className={styles.initOrder}>{entry.roll}</div>
      <div className={styles.initName}>{entry.name}</div>
    </div>
  );
}

// ── LeftPanel ─────────────────────────────────────────────

export function LeftPanel() {
  const party = useGameStore((s) => s.party);
  const initiative = useGameStore((s) => s.initiative);
  const world = useGameStore((s) => s.world);

  return (
    <aside className={styles.root}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Adventurers</span>
        <div className={styles.ornament} />
      </div>

      {/* Party list */}
      <div className={styles.partyList}>
        {party.map((char) => (
          <CharacterCard key={char.id} char={char} />
        ))}
      </div>

      {/* Initiative — only show during combat */}
      {world.inCombat && initiative.length > 0 && (
        <div className={styles.initiativeBlock}>
          <div className={styles.initTitle}>Initiative Order</div>
          <div className={styles.initList}>
            {initiative.map((entry) => (
              <InitRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}