import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameStream } from '../../hooks/useGameStream';
import styles from './NarrativePanel.module.css';

// ── Typing indicator ──────────────────────────────────────

function TypingIndicator() {
  const isDmTyping = useGameStore((s) => s.isDmTyping);
  if (!isDmTyping) return null;
  return (
    <div className={styles.typingRow}>
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
      <div className={styles.typingDot} />
      <span className={styles.typingLabel}>DM IS NARRATING</span>
    </div>
  );
}

// ── Narrative entry ───────────────────────────────────────

function NarrativeEntry({
  speaker,
  speakerLabel,
  text,
}: {
  speaker: 'dm' | 'player';
  speakerLabel: string;
  text: string;
}) {
  return (
    <div className={styles.entry}>
      <div
        className={[
          styles.speakerLabel,
          speaker === 'dm' ? styles.speakerDm : styles.speakerPlayer,
        ].join(' ')}
      >
        {speakerLabel.toUpperCase()}
      </div>
      <div
        className={[
          styles.text,
          speaker === 'player' ? styles.textPlayer : '',
        ].join(' ')}
      >
        {text}
      </div>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '⚔ ATTACK',       text: 'I attack the nearest enemy with my weapon.' },
  { label: '🛡 DODGE',        text: 'I use the Dodge action and fall back defensively.' },
  { label: '✨ CAST SPELL',   text: 'I cast a spell at the enemy.' },
  { label: '💚 SECOND WIND', text: 'I use Second Wind to recover hit points.' },
  { label: '👁 INVESTIGATE', text: 'I look around carefully for anything of interest.' },
  { label: '🏃 DASH',         text: 'I use the Dash action to move quickly.' },
];

// ── NarrativePanel ────────────────────────────────────────

export function NarrativePanel() {
  const narrativeHistory = useGameStore((s) => s.narrativeHistory);
  const isDmTyping = useGameStore((s) => s.isDmTyping);
  const { sendAction } = useGameStream();

  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [narrativeHistory.length, isDmTyping]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isDmTyping) return;
    sendAction(trimmed);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  };

  return (
    <div className={styles.root}>
      {/* Top gradient mask */}
      <div className={styles.topMask} />

      {/* Scrollable narrative */}
      <div className={styles.scroll} ref={scrollRef}>
        {narrativeHistory.map((entry) => (
          <NarrativeEntry key={entry.id} {...entry} />
        ))}
        <TypingIndicator />
      </div>

      {/* Quick actions */}
      <div className={styles.quickbar}>
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            className={styles.quickBtn}
            onClick={() => handleQuickAction(qa.text)}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className={styles.actionArea}>
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Describe your action… the realm awaits your command."
            rows={1}
            disabled={isDmTyping}
          />
        </div>
        <button
          className={styles.sendBtn}
          onClick={handleSubmit}
          disabled={isDmTyping || !inputValue.trim()}
        >
          DECLARE ↵
        </button>
      </div>
    </div>
  );
}