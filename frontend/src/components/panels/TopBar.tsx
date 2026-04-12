import React from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './TopBar.module.css';

interface TopBarProps {
  onNewCampaign: () => void;
}

export function TopBar({ onNewCampaign }: TopBarProps) {
  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);

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
      </div>

      <div className={styles.right}>
        <button
          className={`${styles.topBtn} ${styles.newCampaignBtn}`}
          onClick={onNewCampaign}
          title="Clear session and start a brand new campaign"
        >
          NEW CAMPAIGN
        </button>
        <button className={styles.topBtn}>JOURNAL</button>
        <button className={styles.topBtn}>INVENTORY</button>
        <button className={styles.topBtn}>SPELLS</button>
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