import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { CharacterStats, InitiativeEntry } from '../../store/gameStore';
import styles from './LeftPanel.module.css';

// ── Character ability definitions ─────────────────────────
const CHARACTER_DETAILS: Record<string, {
  abilities: string[];
  weakness: string;
  weapon: string;
  background: string;
}> = {
  aldric: {
    weapon: 'Longsword + Shield · 1d8+4',
    abilities: [
      'Action Surge — take an extra action once per rest',
      'Second Wind — recover 1d10+5 HP as a bonus action',
      'Defense Fighting Style — +1 AC while armored',
      'Extra Attack — attacks twice per action',
    ],
    weakness: 'Low mobility · no ranged options',
    background: 'Human Fighter · Level 5 · AC 18',
  },
  lyra: {
    weapon: 'Arcane Focus · 1d6+3',
    abilities: [
      'Fireball — 8d6 fire damage in 20ft radius (Spell DC 15)',
      'Magic Missile — 3 auto-hit darts · 1d4+1 each',
      'Shield — +5 AC reaction until next turn',
      'Arcane Recovery — regain spell slots on short rest',
    ],
    weakness: 'Fragile · low HP · no armor',
    background: 'Elf Wizard · Level 5 · AC 13',
  },
  thane: {
    weapon: 'Mace + Holy Symbol · 1d8+3',
    abilities: [
      'Cure Wounds — heal 1d8+4 HP on touch',
      'Sacred Flame — 2d8 radiant damage (DEX save DC 14)',
      'Channel Divinity — Turn Undead or Preserve Life (2/rest)',
      'Bless — +1d4 to attack rolls and saves for 3 allies',
    ],
    weakness: 'Needs concentration · moderate damage',
    background: 'Dwarf Cleric · Level 5 · AC 16',
  },
  vex: {
    weapon: 'Twin Daggers · 1d6+3 + Sneak Attack 3d6',
    abilities: [
      'Sneak Attack — +3d6 damage when flanking or with advantage',
      'Cunning Action — Dash, Disengage or Hide as bonus action',
      'Uncanny Dodge — halve damage from one attack per turn',
      'Evasion — take no damage on successful DEX saves',
    ],
    weakness: 'Low AC · needs setup for Sneak Attack',
    background: 'Tiefling Rogue · Level 5 · AC 15',
  },
};

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
  'poisoned': 'chipPoison', 'burning': 'chipBurning',
  'shield': 'chipShield', 'frightened': 'chipDanger',
  'stunned': 'chipDanger', 'paralyzed': 'chipDanger',
  'concentration': 'chipConc',
};
const CHIP_STYLES: Record<string, React.CSSProperties> = {
  chipPoison:  { background: 'rgba(45,100,30,0.25)',  color: '#7fbf5e', border: '0.5px solid rgba(127,191,94,0.3)' },
  chipBurning: { background: 'rgba(212,82,26,0.2)',   color: '#f0874a', border: '0.5px solid rgba(212,82,26,0.35)' },
  chipShield:  { background: 'rgba(74,127,165,0.18)', color: '#6eb5d4', border: '0.5px solid rgba(110,181,212,0.3)' },
  chipDanger:  { background: 'rgba(180,40,40,0.2)',   color: '#e07070', border: '0.5px solid rgba(180,40,40,0.35)' },
  chipConc:    { background: 'rgba(201,162,39,0.12)', color: '#c9a227', border: '0.5px solid rgba(201,162,39,0.3)' },
  chipDefault: { background: 'rgba(255,255,255,0.06)', color: 'rgba(201,189,160,0.6)', border: '0.5px solid rgba(201,162,39,0.15)' },
};
function StatusChip({ label }: { label: string }) {
  const key = Object.keys(STATUS_COLORS).find((k) => label.toLowerCase().includes(k));
  const chipStyle = CHIP_STYLES[key ? STATUS_COLORS[key] : 'chipDefault'] ?? CHIP_STYLES.chipDefault;
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
      borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase',
      display: 'inline-block', ...chipStyle,
    }}>
      {label}
    </span>
  );
}

// ── Character tooltip ────────────────────────────────────
function CharacterTooltip({ char }: { char: CharacterStats }) {
  const details = CHARACTER_DETAILS[char.id];
  if (!details) return null;

  return (
    <div style={{
      position: 'absolute', left: '100%', top: 0, zIndex: 300,
      width: 280, marginLeft: 8,
      background: 'var(--color-bg-elevated, #1a1614)',
      border: '1px solid var(--color-border, rgba(201,162,39,0.2))',
      borderRadius: 6, padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
    }}>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 13,
        color: 'var(--color-text-gold, #c9a227)',
        letterSpacing: '0.1em', marginBottom: 4,
      }}>
        {char.name}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--color-text-muted, rgba(201,189,160,0.5))',
        marginBottom: 12, letterSpacing: '0.08em',
      }}>
        {details.background}
      </div>

      {/* Weapon */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.15em',
          color: 'var(--color-text-muted, rgba(201,189,160,0.4))',
          marginBottom: 4,
        }}>WEAPON</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-primary, #e8dcc0)' }}>
          {details.weapon}
        </div>
      </div>

      {/* Abilities */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.15em',
          color: 'var(--color-text-muted, rgba(201,189,160,0.4))',
          marginBottom: 6,
        }}>ABILITIES</div>
        {details.abilities.map((ab, i) => (
          <div key={i} style={{
            fontSize: 11, color: 'var(--color-text-primary, #e8dcc0)',
            marginBottom: 5, paddingLeft: 10, position: 'relative', lineHeight: 1.4,
          }}>
            <span style={{
              position: 'absolute', left: 0, top: 4,
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--color-accent-primary, #c9a227)',
              display: 'inline-block',
            }} />
            {ab}
          </div>
        ))}
      </div>

      {/* Weakness */}
      <div style={{
        borderTop: '0.5px solid rgba(201,162,39,0.15)',
        paddingTop: 8, fontSize: 10,
        color: '#e07070',
      }}>
        ⚠ {details.weakness}
      </div>
    </div>
  );
}

// ── Character card ───────────────────────────────────────
function CharacterCard({ char }: { char: CharacterStats }) {
  const [hovered, setHovered] = useState(false);
  const extraEntries = Object.entries(char.extraStats ?? {});

  return (
    <div
      className={[
        styles.charCard,
        char.isActive ? styles.activeTurn : '',
        char.isDowned ? styles.downed : '',
      ].join(' ')}
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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
          {char.statusEffects.map((s) => <StatusChip key={s} label={s} />)}
        </div>
      )}

      {/* Tooltip on hover */}
      {hovered && <CharacterTooltip char={char} />}
    </div>
  );
}

// ── Initiative row ───────────────────────────────────────
function InitRow({ entry }: { entry: InitiativeEntry }) {
  return (
    <div className={[
      styles.initRow,
      entry.isCurrent ? styles.initCurrent : '',
      entry.isEnemy ? styles.initEnemy : '',
    ].join(' ')}>
      <div className={styles.initMarker} />
      <div className={styles.initOrder}>{entry.roll}</div>
      <div className={styles.initName}>{entry.name}</div>
    </div>
  );
}

// ── LeftPanel ─────────────────────────────────────────────
export function LeftPanel() {
  const party      = useGameStore((s) => s.party);
  const initiative = useGameStore((s) => s.initiative);
  const world      = useGameStore((s) => s.world);

  return (
    <aside className={styles.root} style={{ overflow: 'visible' }}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Adventurers</span>
        <div className={styles.ornament} />
      </div>

      <div className={styles.partyList} style={{ overflow: 'visible' }}>
        {party.map((char) => (
          <CharacterCard key={char.id} char={char} />
        ))}
      </div>

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