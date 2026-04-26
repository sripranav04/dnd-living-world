import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './TopBar.module.css';

interface TopBarProps {
  onNewCampaign: () => void;
}

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '24px 32px',
        minWidth: 360, maxWidth: 560,
        color: 'var(--color-text-primary)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13, letterSpacing: '0.15em',
          color: 'var(--color-text-gold)',
          marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{title}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 18,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TopBar({ onNewCampaign }: TopBarProps) {
  const theme          = useGameStore((s) => s.theme);
  const setTheme       = useGameStore((s) => s.setTheme);
  const narrativeHistory = useGameStore((s) => s.narrativeHistory);
  const party          = useGameStore((s) => s.party);
  const inCombat       = useGameStore((s) => s.world.inCombat);
  const isStreaming    = useGameStore((s) => s.isStreaming);

  const [modal, setModal] = useState<'journal' | 'inventory' | 'spells' | null>(null);

  const cycleTheme = () => {
    const themes = ['dark-gothic', 'bright-forest', 'warm-tavern'] as const;
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  return (
    <>
      <header className={styles.root}>
        {/* ── Left — title + session tag ── */}
        <div className={styles.left}>
          <span className={styles.gameTitle}>⚔ Living World</span>
          <span className={styles.sessionTag}>SESSION_001 · PLAYER_ONE</span>
        </div>

        {/* ── Center — DM status + combat pill ── */}
        <div className={styles.center}>
          {/* DM online/offline indicator */}
          <span className={styles.liveTag}>
            <span
              className={styles.liveDot}
              style={{ background: isStreaming ? '#f5a623' : '#4caf50' }}
            />
            {isStreaming ? 'DM IS THINKING...' : 'THE MASTER OF THE DUNGEONS IS HERE'}
          </span>

          {/* Combat active pill — only shown during combat */}
          {inCombat && (
            <span style={{
              marginLeft: 14,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '2px 10px',
              background: 'rgba(200,48,48,0.15)',
              border: '0.5px solid rgba(200,48,48,0.5)',
              borderRadius: 3,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: '#e07070',
              textTransform: 'uppercase' as const,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#e05050',
                boxShadow: '0 0 6px #e05050',
                animation: 'pulse 1.4s ease-in-out infinite',
                flexShrink: 0,
              }} />
              COMBAT ACTIVE
            </span>
          )}
        </div>

        {/* ── Right — action buttons ── */}
        <div className={styles.right}>
          <button
            className={`${styles.topBtn} ${styles.newCampaignBtn}`}
            onClick={onNewCampaign}
            title="Clear session and start a brand new campaign"
          >
            NEW CAMPAIGN
          </button>
          <button
            className={styles.topBtn}
            onClick={() => setModal('journal')}
            title="View session journal"
          >
            JOURNAL
          </button>
          <button
            className={styles.topBtn}
            onClick={() => setModal('inventory')}
            title="View party inventory"
          >
            INVENTORY
          </button>
          <button
            className={styles.topBtn}
            onClick={() => setModal('spells')}
            title="View available spells"
          >
            SPELLS
          </button>
          <button
            className={`${styles.topBtn} ${styles.themeBtn}`}
            onClick={cycleTheme}
            title="Cycle theme"
          >
            THEME
          </button>
        </div>
      </header>

      {/* ── Journal modal ── */}
      {modal === 'journal' && (
        <Modal title="SESSION JOURNAL" onClose={() => setModal(null)}>
          <div style={{ maxHeight: 400, overflowY: 'auto', fontSize: 13, lineHeight: 1.7 }}>
            {narrativeHistory.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>No events recorded yet.</p>
            ) : (
              narrativeHistory.map((entry) => (
                <div key={entry.id} style={{ marginBottom: 12 }}>
                  <div style={{
                    fontSize: 10, letterSpacing: '0.12em',
                    color: entry.speaker === 'dm' ? 'var(--color-text-gold)' : 'var(--color-text-muted)',
                    marginBottom: 2,
                  }}>
                    {entry.speakerLabel.toUpperCase()}
                  </div>
                  <div style={{ color: 'var(--color-text-primary)' }}>{entry.text}</div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* ── Inventory modal ── */}
      {modal === 'inventory' && (
        <Modal title="PARTY INVENTORY" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            {party.map(c => (
              <div key={c.id} style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--color-text-gold)', fontWeight: 600 }}>{c.name}</span>
                <span style={{ marginLeft: 8 }}>HP {c.hp}/{c.maxHp} · AC {c.ac}</span>
                {c.statusEffects.length > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--color-text-danger)', fontSize: 11 }}>
                    {c.statusEffects.join(', ')}
                  </span>
                )}
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              Detailed inventory coming in a future update.
            </div>
          </div>
        </Modal>
      )}

      {/* ── Spells modal ── */}
      {modal === 'spells' && (
        <Modal title="SPELLS & ABILITIES" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: 'var(--color-text-gold)' }}>Lyra Moonwhisper</span>
              <div style={{ paddingLeft: 12, marginTop: 4 }}>
                Fireball · Magic Missile · Shield · Detect Magic · Mage Armor
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: 'var(--color-text-gold)' }}>Brother Thane</span>
              <div style={{ paddingLeft: 12, marginTop: 4 }}>
                Cure Wounds · Sacred Flame · Guidance · Channel Divinity · Bless
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: 'var(--color-text-gold)' }}>Aldric Stonehaven</span>
              <div style={{ paddingLeft: 12, marginTop: 4 }}>
                Action Surge · Second Wind · Fighting Style: Defense
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-gold)' }}>Vex Shadowstep</span>
              <div style={{ paddingLeft: 12, marginTop: 4 }}>
                Sneak Attack · Cunning Action · Uncanny Dodge · Evasion
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}