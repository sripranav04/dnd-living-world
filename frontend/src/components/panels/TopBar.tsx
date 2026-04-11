import React from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './TopBar.module.css';

const TOP_BUTTONS = ['JOURNAL', 'INVENTORY', 'SPELLS', 'WORLD MAP'];

export function TopBar() {
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  const world = useGameStore((s) => s.world);

  const cycleTheme = () => {
    const themes = ['dark-gothic', 'bright-forest', 'warm-tavern'] as const;
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  return (
    <header className={styles.root}>
      <div className={styles.left}>
        <span className={styles.gameTitle}>⚔ Living World</span>
        <span className={styles.sessionTag}>SESSION_001 · PLAYER_ONE</span>
      </div>

      <div className={styles.center}>
        <span className={styles.liveTag}>
          <span className={styles.liveDot} />
          THE MASTER OF THE DUNGEONS IS HERE 
        </span>
        {world.inCombat && (
          <span className={styles.combatTag}>COMBAT ACTIVE</span>
        )}
      </div>

      <div className={styles.right}>
        {TOP_BUTTONS.map((label) => (
          <button key={label} className={styles.topBtn}>
            {label}
          </button>
        ))}
        <button
          className={`${styles.topBtn} ${styles.themeBtn}`}
          onClick={cycleTheme}
          title="Cycle theme"
        >
          THEME
        </button>
      </div>
    </header>
  );
}