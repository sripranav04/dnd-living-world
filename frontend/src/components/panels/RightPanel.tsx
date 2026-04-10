import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { LogEntryType } from '../../store/gameStore';
import styles from './RightPanel.module.css';

// ── Dice roller ───────────────────────────────────────────

type DiceResult = {
  expr: string;
  total: number;
  isCrit: boolean;
  isFumble: boolean;
};

function useDiceRoller() {
  const appendLog = useGameStore((s) => s.appendLog);
  const [result, setResult] = React.useState<DiceResult | null>(null);

  const roll = (sides: number, count = 1) => {
    const rolls: number[] = Array.from({ length: count }, () =>
      Math.floor(Math.random() * sides) + 1,
    );
    const total = rolls.reduce((a, b) => a + b, 0);
    const isCrit = sides === 20 && total === 20;
    const isFumble = sides === 20 && total === 1;
    const expr = count > 1 ? `${count}d${sides} [${rolls.join('+')}]` : `d${sides}`;
    setResult({ expr, total, isCrit, isFumble });
    const logText = `Roll ${expr} → ${total}${isCrit ? ' CRITICAL!' : isFumble ? ' FUMBLE!' : ''}`;
    const logType: LogEntryType = isCrit ? 'spell' : isFumble ? 'attack' : 'move';
    appendLog(logText, logType);
  };

  return { result, roll };
}

const DICE = [4, 6, 8, 10, 12, 20, 100] as const;

function DiceSection() {
  const { result, roll } = useDiceRoller();

  return (
    <div className={styles.section}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Dice Forge</span>
        <div className={styles.ornament} />
      </div>
      <div className={styles.diceGrid}>
        {DICE.map((d) => (
          <button key={d} className={styles.dieBtn} onClick={() => roll(d)}>
            d{d}
          </button>
        ))}
        <button className={styles.dieBtn} style={{ fontSize: '9px' }} onClick={() => roll(6, 2)}>
          2d6
        </button>
      </div>
      <div className={styles.diceResult}>
        <span className={styles.diceExpr}>{result?.expr ?? '— roll a die —'}</span>
        <span
          className={[
            styles.diceVal,
            result?.isCrit ? styles.diceCrit : '',
            result?.isFumble ? styles.diceFumble : '',
          ].join(' ')}
        >
          {result?.total ?? '—'}
        </span>
      </div>
    </div>
  );
}

// ── Combat log ────────────────────────────────────────────

const LOG_CLASS: Record<LogEntryType, string> = {
  attack: 'logAttack',
  spell:  'logSpell',
  heal:   'logHeal',
  move:   'logMove',
  system: 'logSystem',
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
          <div
            key={entry.id}
            className={`${styles.logEntry} ${styles[LOG_CLASS[entry.type]] ?? ''}`}
          >
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

      {/* Dice */}
      <DiceSection />

      {/* Combat log */}
      <CombatLog />

      {/* Session stats */}
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