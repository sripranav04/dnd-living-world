import React from 'react';
import { useGameStore } from '../../store/gameStore';
import type { CharacterStats, InitiativeEntry } from '../../store/gameStore';
import styles from './LeftPanel.module.css';

// ── HP bar ───────────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const gradient =
    pct > 50
      ? 'var(--color-hp-high)'
      : pct > 25
      ? 'var(--color-hp-mid)'
      : 'var(--color-hp-low)';

  return (
    <>
      <div className={styles.hpTrack}>
        <div
          className={styles.hpFill}
          style={{ width: `${pct}%`, background: gradient }}
        />
      </div>
      <div className={styles.hpText}>
        <span>HP</span>
        <span style={pct <= 25 ? { color: 'var(--color-text-danger)' } : undefined}>
          {hp} / {maxHp}
        </span>
      </div>
    </>
  );
}

// ── Status chip ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'poisoned':      'chip-poison',
  'burning':       'chip-burning',
  'shield':        'chip-shield',
  'frightened':    'chip-danger',
  'stunned':       'chip-danger',
  'paralyzed':     'chip-danger',
  'concentration': 'chip-conc',
};

function StatusChip({ label }: { label: string }) {
  const key = Object.keys(STATUS_COLORS).find((k) =>
    label.toLowerCase().includes(k),
  );
  const cls = key ? STATUS_COLORS[key] : 'chip-default';
  return <span className={`${styles.chip} ${styles[cls] ?? styles.chipDefault}`}>{label}</span>;
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