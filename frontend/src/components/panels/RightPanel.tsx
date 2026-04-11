import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useDiceStore } from '../../store/diceStore';
import type { LogEntryType } from '../../store/gameStore';
import styles from './RightPanel.module.css';

// ── Dice roller ───────────────────────────────────────────

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

function DiceSection() {
  const appendLog = useGameStore((s) => s.appendLog);
  const { lastRoll, pendingRoll, setRoll, manualRoll } = useDiceStore();
  const [manualMode, setManualMode] = useState(false);
  const [manualVal, setManualVal] = useState('');
  const [manualSides, setManualSides] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [displayVal, setDisplayVal] = useState<number | null>(null);

  // Animated roll — flicker through numbers before settling
  const rollWithAnim = (sides: number, count = 1) => {
    setRolling(true);
    const rolls = Array.from({ length: count }, () =>
      Math.floor(Math.random() * sides) + 1,
    );
    const total = rolls.reduce((a, b) => a + b, 0);
    const isCrit = sides === 20 && count === 1 && total === 20;
    const isFumble = sides === 20 && count === 1 && total === 1;
    const expr = count > 1 ? `${count}d${sides} [${rolls.join('+')}]` : `d${sides}`;

    // Flicker animation
    let flickers = 0;
    const maxFlickers = 8;
    const interval = setInterval(() => {
      setDisplayVal(Math.floor(Math.random() * sides) + 1);
      flickers++;
      if (flickers >= maxFlickers) {
        clearInterval(interval);
        setDisplayVal(total);
        setRolling(false);
        const roll = { expr, total, sides, isCrit, isFumble, usedInAction: false };
        setRoll(roll);
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
  const isCrit = lastRoll?.isCrit && displayVal === lastRoll.total;
  const isFumble = lastRoll?.isFumble && displayVal === lastRoll.total;

  return (
    <div className={styles.section}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Dice Forge</span>
        <div className={styles.ornament} />
        {/* Toggle manual entry */}
        <button
          onClick={() => setManualMode(!manualMode)}
          style={{
            background: manualMode ? 'rgba(201,162,39,0.2)' : 'transparent',
            border: '0.5px solid var(--color-border)',
            color: 'var(--color-text-gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            padding: '2px 7px',
            borderRadius: 3,
            cursor: 'pointer',
            letterSpacing: '0.1em',
            marginLeft: 4,
          }}
        >
          {manualMode ? 'ROLL' : 'MANUAL'}
        </button>
      </div>

      {manualMode ? (
        /* Manual physical die entry */
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--color-text-muted)', letterSpacing: '0.15em', marginBottom: 8,
          }}>
            ENTER PHYSICAL ROLL
          </div>
          {/* Die type selector */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {DICE.map((d) => (
              <button
                key={d}
                onClick={() => setManualSides(d)}
                style={{
                  background: manualSides === d ? 'rgba(201,162,39,0.2)' : 'var(--color-bg-panel-light)',
                  border: `0.5px solid ${manualSides === d ? 'var(--color-text-gold)' : 'var(--color-border)'}`,
                  color: manualSides === d ? 'var(--color-text-gold)' : 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  padding: '4px 6px', borderRadius: 3, cursor: 'pointer',
                }}
              >
                d{d}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              min={1}
              max={manualSides}
              value={manualVal}
              onChange={(e) => setManualVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              placeholder={`1 – ${manualSides}`}
              style={{
                flex: 1, background: 'var(--color-bg-input)',
                border: '0.5px solid var(--color-border-input)',
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-mono)', fontSize: 16,
                padding: '6px 10px', borderRadius: 3, outline: 'none',
                textAlign: 'center',
              }}
            />
            <button
              onClick={submitManual}
              style={{
                background: 'rgba(201,162,39,0.15)',
                border: '0.5px solid rgba(201,162,39,0.4)',
                color: 'var(--color-text-gold)',
                fontFamily: 'var(--font-display)', fontSize: 10,
                padding: '6px 12px', borderRadius: 3, cursor: 'pointer',
                letterSpacing: '0.15em',
              }}
            >
              SET
            </button>
          </div>
        </div>
      ) : (
        /* Digital dice grid */
        <div className={styles.diceGrid}>
          {DICE.map((d) => (
            <button
              key={d}
              className={styles.dieBtn}
              onClick={() => rollWithAnim(d)}
              disabled={rolling}
            >
              d{d}
            </button>
          ))}
          <button
            className={styles.dieBtn}
            style={{ fontSize: '9px' }}
            onClick={() => rollWithAnim(6, 2)}
            disabled={rolling}
          >
            2d6
          </button>
        </div>
      )}

      {/* Result display */}
      <div className={styles.diceResult} style={{
        borderColor: isPending ? 'rgba(201,162,39,0.5)' : undefined,
        background: isPending ? 'rgba(201,162,39,0.06)' : undefined,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className={styles.diceExpr}>
            {lastRoll?.expr ?? '— roll a die —'}
          </span>
          {isPending && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--color-text-gold)', opacity: 0.7,
              letterSpacing: '0.1em',
            }}>
              ↑ READY TO USE IN ACTION
            </span>
          )}
        </div>
        <span
          className={[
            styles.diceVal,
            isCrit ? styles.diceCrit : '',
            isFumble ? styles.diceFumble : '',
            rolling ? styles.diceRolling : '',
          ].join(' ')}
        >
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
  const world = useGameStore((s) => s.world);
  const sessionStats = useGameStore((s) => s.sessionStats);

  return (
    <aside className={styles.root}>
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

      <DiceSection />
      <CombatLog />

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