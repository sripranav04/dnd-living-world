import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useDiceStore } from '../../store/diceStore';
import type { LogEntryType } from '../../store/gameStore';
import styles from './RightPanel.module.css';

// ── Enemy HP bar ──────────────────────────────────────────

function EnemyHealthBar() {
  const inCombat   = useGameStore((s) => s.world.inCombat);
  const enemyName  = useGameStore((s) => s.world.enemyName);
  const enemyHp    = useGameStore((s) => s.world.enemyHp);
  const enemyMaxHp = useGameStore((s) => s.world.enemyMaxHp);

  if (!enemyName || enemyMaxHp === 0) return null;

  const pct      = Math.max(0, Math.min(100, (enemyHp / enemyMaxHp) * 100));
  const barColor = pct > 50 ? '#c03030' : pct > 25 ? '#c9a227' : '#ff4444';
  const isDead   = enemyHp <= 0;

  return (
    <div style={{
      padding: '10px 14px 12px',
      borderBottom: '0.5px solid var(--color-border)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          letterSpacing: '0.15em',
          color: isDead ? 'rgba(201,189,160,0.3)' : '#e07070',
          textTransform: 'uppercase',
        }}>
          ⚔ {enemyName}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: isDead ? 'var(--color-text-gold)' : 'rgba(201,189,160,0.4)',
          letterSpacing: '0.1em',
        }}>
          {isDead ? 'DEFEATED' : (inCombat ? 'ACTIVE' : '')}
        </div>
      </div>
      <div style={{
        height: 7, background: 'rgba(255,255,255,0.08)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: isDead ? '#333' : barColor,
          borderRadius: 3,
          transition: 'width 0.8s ease, background 0.4s ease',
          boxShadow: isDead ? 'none' : `0 0 10px ${barColor}88`,
        }} />
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'rgba(201,189,160,0.45)', marginTop: 4,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>HP</span>
        <span>{Math.max(0, enemyHp)} / {enemyMaxHp}</span>
      </div>
    </div>
  );
}

// ── Loot section ──────────────────────────────────────────

interface LootItem {
  name: string;
  type: 'weapon' | 'armor' | 'spell' | 'potion' | 'treasure' | 'gold';
  value?: string;
  description?: string;
}

const TYPE_ICON: Record<LootItem['type'], string> = {
  weapon: '⚔', armor: '🛡', spell: '✦',
  potion: '⚗', treasure: '◆', gold: '◉',
};
const TYPE_COLOR: Record<LootItem['type'], string> = {
  weapon:   '#d4926a',
  armor:    'var(--color-text-rune)',
  spell:    '#b09de8',
  potion:   '#7fbf5e',
  treasure: 'var(--color-text-gold)',
  gold:     'var(--color-text-gold)',
};

function LootSection() {
  const sessionStats = useGameStore((s) => s.sessionStats);
  const [customLoot, setCustomLoot] = useState<LootItem[]>([]);

  // Listen for loot events dispatched by the game
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<LootItem[]>;
      if (custom.detail) setCustomLoot((prev) => [...prev, ...custom.detail]);
    };
    window.addEventListener('dnd:loot', handler);
    return () => window.removeEventListener('dnd:loot', handler);
  }, []);

  const defaultLoot: LootItem[] = sessionStats.xp > 0 ? [
    { name: `${sessionStats.xp} XP Earned`,  type: 'treasure', value: `${sessionStats.xp} xp` },
    { name: 'Scattered Coin',                 type: 'gold',     value: '12gp',  description: 'Looted from the fallen enemy' },
    { name: 'Potion of Healing',              type: 'potion',   value: '50gp',  description: 'Restores 2d4+2 HP' },
  ] : [];

  const loot = [...defaultLoot, ...customLoot];

  if (loot.length === 0) return null;

  return (
    <div style={{
      borderTop: '0.5px solid var(--color-border)',
      flexShrink: 0,
    }}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>◆ Loot</span>
        <div className={styles.ornament} />
      </div>
      <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loot.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{
              fontSize: 13, color: TYPE_COLOR[item.type],
              flexShrink: 0, width: 16, textAlign: 'center', marginTop: 1,
            }}>
              {TYPE_ICON[item.type]}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 11,
                color: 'var(--color-text-primary)', letterSpacing: '0.04em',
                marginBottom: item.description ? 2 : 0,
              }}>
                {item.name}
                {item.value && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--color-text-gold)', opacity: 0.6, marginLeft: 8,
                  }}>
                    {item.value}
                  </span>
                )}
              </div>
              {item.description && (
                <div style={{
                  fontSize: 10, fontStyle: 'italic',
                  color: 'var(--color-text-secondary)', opacity: 0.55,
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

// ── Dice roller ───────────────────────────────────────────

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

function DiceSection() {
  const appendLog = useGameStore((s) => s.appendLog);
  const { lastRoll, pendingRoll, setRoll, manualRoll } = useDiceStore();
  const [manualMode, setManualMode] = useState(false);
  const [manualVal, setManualVal]   = useState('');
  const [manualSides, setManualSides] = useState(20);
  const [rolling, setRolling]       = useState(false);
  const [displayVal, setDisplayVal] = useState<number | null>(null);

  const rollWithAnim = (sides: number, count = 1) => {
    setRolling(true);
    const rolls = Array.from({ length: count }, () =>
      Math.floor(Math.random() * sides) + 1,
    );
    const total    = rolls.reduce((a, b) => a + b, 0);
    const isCrit   = sides === 20 && count === 1 && total === 20;
    const isFumble = sides === 20 && count === 1 && total === 1;
    const expr     = count > 1 ? `${count}d${sides} [${rolls.join('+')}]` : `d${sides}`;

    let flickers = 0;
    const interval = setInterval(() => {
      setDisplayVal(Math.floor(Math.random() * sides) + 1);
      flickers++;
      if (flickers >= 8) {
        clearInterval(interval);
        setDisplayVal(total);
        setRolling(false);
        setRoll({ expr, total, sides, isCrit, isFumble, usedInAction: false });
        const logType: LogEntryType = isCrit ? 'spell' : isFumble ? 'attack' : 'move';
        appendLog(
          `Roll ${expr} → ${total}${isCrit ? ' ⚡ CRITICAL!' : isFumble ? ' 💀 FUMBLE!' : ''}`,
          logType,
        );
      }
    }, 60);
  };

  const submitManual = () => {
    const val = parseInt(manualVal);
    if (isNaN(val) || val < 1 || val > manualSides) return;
    manualRoll(val, manualSides);
    setDisplayVal(val);
    appendLog(`Manual roll d${manualSides} → ${val}`, 'move');
    setManualVal('');
    setManualMode(false);
  };

  const isPending = !!pendingRoll && !pendingRoll.usedInAction;
  const isCrit    = lastRoll?.isCrit   && displayVal === lastRoll.total;
  const isFumble  = lastRoll?.isFumble && displayVal === lastRoll.total;

  return (
    <div className={styles.section}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Dice Forge</span>
        <div className={styles.ornament} />
        <button
          onClick={() => setManualMode(!manualMode)}
          style={{
            background: manualMode ? 'rgba(201,162,39,0.2)' : 'transparent',
            border: '0.5px solid var(--color-border)',
            color: 'var(--color-text-gold)',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            padding: '2px 7px', borderRadius: 3, cursor: 'pointer',
            letterSpacing: '0.1em', marginLeft: 4,
          }}
        >
          {manualMode ? 'ROLL' : 'MANUAL'}
        </button>
      </div>

      {manualMode ? (
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--color-text-muted)', letterSpacing: '0.15em', marginBottom: 8,
          }}>
            ENTER PHYSICAL ROLL
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {DICE.map((d) => (
              <button key={d} onClick={() => setManualSides(d)} style={{
                background: manualSides === d ? 'rgba(201,162,39,0.2)' : 'var(--color-bg-panel-light)',
                border: `0.5px solid ${manualSides === d ? 'var(--color-text-gold)' : 'var(--color-border)'}`,
                color: manualSides === d ? 'var(--color-text-gold)' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono)', fontSize: 10,
                padding: '4px 6px', borderRadius: 3, cursor: 'pointer',
              }}>
                d{d}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number" min={1} max={manualSides} value={manualVal}
              onChange={(e) => setManualVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              placeholder={`1 – ${manualSides}`}
              style={{
                flex: 1, background: 'var(--color-bg-input)',
                border: '0.5px solid var(--color-border-input)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 16,
                padding: '6px 10px', borderRadius: 3, outline: 'none', textAlign: 'center',
              }}
            />
            <button onClick={submitManual} style={{
              background: 'rgba(201,162,39,0.15)',
              border: '0.5px solid rgba(201,162,39,0.4)',
              color: 'var(--color-text-gold)',
              fontFamily: 'var(--font-display)', fontSize: 10,
              padding: '6px 12px', borderRadius: 3, cursor: 'pointer', letterSpacing: '0.15em',
            }}>
              SET
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.diceGrid}>
          {DICE.map((d) => (
            <button key={d} className={styles.dieBtn} onClick={() => rollWithAnim(d)} disabled={rolling}>
              d{d}
            </button>
          ))}
          <button className={styles.dieBtn} style={{ fontSize: '9px' }} onClick={() => rollWithAnim(6, 2)} disabled={rolling}>
            2d6
          </button>
        </div>
      )}

      <div className={styles.diceResult} style={{
        borderColor: isPending ? 'rgba(201,162,39,0.5)' : undefined,
        background:  isPending ? 'rgba(201,162,39,0.06)' : undefined,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className={styles.diceExpr}>{lastRoll?.expr ?? '— roll a die —'}</span>
          {isPending && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--color-text-gold)', opacity: 0.7, letterSpacing: '0.1em',
            }}>
              ↑ READY TO USE IN ACTION
            </span>
          )}
        </div>
        <span className={[
          styles.diceVal,
          isCrit   ? styles.diceCrit   : '',
          isFumble ? styles.diceFumble : '',
          rolling  ? styles.diceRolling : '',
        ].join(' ')}>
          {displayVal ?? '—'}
        </span>
      </div>
    </div>
  );
}

// ── Combat log ────────────────────────────────────────────

const LOG_CLASS: Record<LogEntryType, string> = {
  attack: 'logAttack', spell: 'logSpell', heal: 'logHeal',
  move: 'logMove', system: 'logSystem',
};

function CombatLog() {
  const combatLog = useGameStore((s) => s.combatLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [combatLog.length]);

  return (
    <div className={styles.combatLogSection}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Combat Log</span>
        <div className={styles.ornament} />
      </div>
      <div className={styles.logEntries} ref={scrollRef}>
        {combatLog.map((entry) => (
          <div key={entry.id} className={`${styles.logEntry} ${styles[LOG_CLASS[entry.type]] ?? ''}`}>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RightPanel ────────────────────────────────────────────

export function RightPanel() {
  const world        = useGameStore((s) => s.world);
  const sessionStats = useGameStore((s) => s.sessionStats);

  return (
    <aside className={styles.root}>
      {/* Environment */}
      <div className={styles.envBanner}>
        <div className={styles.panelHeader} style={{ padding: 0, border: 'none', marginBottom: '8px' }}>
          <span className={styles.panelTitle}>Environment</span>
          <div className={styles.ornament} />
        </div>
        <div className={styles.envBiome}>{world.biome}</div>
        <div className={styles.envName}>{world.locationName}</div>
        <div className={styles.envDesc}>{world.description}</div>
        {world.conditions.length > 0 && (
          <div className={styles.envConditions}>
            {world.conditions.map((c) => (
              <span key={c} className={styles.envCond}>{c.toUpperCase()}</span>
            ))}
          </div>
        )}
      </div>

      {/* Enemy HP — shows during combat, persists as DEFEATED after */}
      <EnemyHealthBar />

      {/* Dice */}
      <DiceSection />

      {/* Combat log — scrollable, fixed height */}
      <CombatLog />

      {/* Loot — appears permanently after victory */}
      <LootSection />

      {/* Session footer */}
      <div className={styles.sessionFooter}>
        <div className={styles.sessStat}>
          <span className={styles.sessVal}>{sessionStats.kills}</span>
          <span className={styles.sessLabel}>KILLS</span>
        </div>
        <div className={styles.sessStat}>
          <span className={styles.sessVal}>{sessionStats.gold}</span>
          <span className={styles.sessLabel}>GOLD</span>
        </div>
        <div className={styles.sessStat}>
          <span className={styles.sessVal}>{sessionStats.xp.toLocaleString()}</span>
          <span className={styles.sessLabel}>XP</span>
        </div>
      </div>
    </aside>
  );
}