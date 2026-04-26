import React, { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useDiceStore } from '../../store/diceStore';
import styles from './NarrativePanel.module.css';

// ── Typewriter effect for DM narrative ───────────────────

function useTypewriter(text: string, speed: number = 30, enabled: boolean = true) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [done, setDone] = useState(!enabled);
  const indexRef = useRef(0);
  const rafRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    // Reset on new text
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    const tick = () => {
      if (indexRef.current < text.length) {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        rafRef.current = setTimeout(tick, speed);
      } else {
        setDone(true);
      }
    };

    rafRef.current = setTimeout(tick, speed);
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [text, speed, enabled]);

  return { displayed, done };
}

// ── Typing indicator ─────────────────────────────────────

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

// ── Single narrative entry ────────────────────────────────

function NarrativeEntry({ speaker, speakerLabel, text, isLatest }: {
  speaker: 'dm' | 'player';
  speakerLabel: string;
  text: string;
  isLatest: boolean;
}) {
  // Only animate the most recent DM entry
  const shouldAnimate = speaker === 'dm' && isLatest;
  const { displayed } = useTypewriter(text, 22, shouldAnimate);

  return (
    <div className={styles.entry}>
      <div className={[
        styles.speakerLabel,
        speaker === 'dm' ? styles.speakerDm : styles.speakerPlayer,
      ].join(' ')}>
        {speakerLabel.toUpperCase()}
      </div>
      <div className={[styles.text, speaker === 'player' ? styles.textPlayer : ''].join(' ')}>
        {shouldAnimate ? displayed : text}
        {/* Blinking cursor while typing */}
        {shouldAnimate && displayed.length < text.length && (
          <span style={{
            display: 'inline-block',
            width: 2,
            height: '1em',
            background: 'var(--color-text-gold)',
            marginLeft: 2,
            verticalAlign: 'text-bottom',
            animation: 'blink 0.8s step-end infinite',
          }} />
        )}
      </div>
    </div>
  );
}

// ── Quick actions ─────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '⚔ ATTACK',      text: 'I attack the nearest enemy with my weapon.' },
  { label: '🛡 DODGE',       text: 'I use the Dodge action and fall back defensively.' },
  { label: '✨ CAST SPELL',  text: 'I cast a spell at the enemy.' },
  { label: '💚 SECOND WIND', text: 'I use Second Wind to recover hit points.' },
  { label: '🔍 INVESTIGATE', text: 'I look around carefully for anything of interest.' },
  { label: '🏃 DASH',        text: 'I use the Dash action to move quickly.' },
];

// ── Main panel ────────────────────────────────────────────

export function NarrativePanel({ sendAction }: {
  sendAction: (action: string, sessionId?: string, activeCharacter?: string) => void;
}) {
  const narrativeHistory  = useGameStore((s) => s.narrativeHistory);
  const isDmTyping        = useGameStore((s) => s.isDmTyping);
  const activeCharacterId = useGameStore((s) => s.activeCharacterId);
  const { pendingRoll, consumeRoll } = useDiceStore();

  const [inputValue, setInputValue] = useState('');
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sessionId = new URLSearchParams(window.location.search).get('session') ?? 'player_one';

  // Find the index of the last DM entry so we know which one to animate
  const lastDmIndex = narrativeHistory.reduce(
    (last, entry, i) => entry.speaker === 'dm' ? i : last,
    -1,
  );

  // Auto-scroll on new entries or typing indicator change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [narrativeHistory.length, isDmTyping]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isDmTyping) return;

    let actionText = trimmed;
    if (pendingRoll && !pendingRoll.usedInAction) {
      const rollCtx = pendingRoll.isCrit
        ? `[CRITICAL HIT — rolled ${pendingRoll.total} on ${pendingRoll.expr}]`
        : pendingRoll.isFumble
        ? `[CRITICAL FUMBLE — rolled ${pendingRoll.total} on ${pendingRoll.expr}]`
        : `[rolled ${pendingRoll.total} on ${pendingRoll.expr}]`;
      actionText = `${trimmed} ${rollCtx}`;
      consumeRoll();
    }

    sendAction(actionText, sessionId, activeCharacterId);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

  const isPending = !!pendingRoll && !pendingRoll.usedInAction;

  return (
    <div className={styles.root}>
      <div className={styles.topMask} />

      <div className={styles.scroll} ref={scrollRef}>
        {narrativeHistory.map((entry, i) => (
          <NarrativeEntry
            key={entry.id}
            {...entry}
            isLatest={i === lastDmIndex}
          />
        ))}
        <TypingIndicator />
      </div>

      {isPending && (
        <div style={{
          padding: '6px 16px',
          background: pendingRoll!.isCrit ? 'rgba(245,200,66,0.12)'
            : pendingRoll!.isFumble ? 'rgba(180,40,40,0.12)'
            : 'rgba(201,162,39,0.08)',
          borderTop: '0.5px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.2em',
            color: pendingRoll!.isCrit ? '#f5c842'
              : pendingRoll!.isFumble ? 'var(--color-text-danger)'
              : 'var(--color-text-gold)',
          }}>
            {pendingRoll!.isCrit ? '⚡ CRITICAL' : pendingRoll!.isFumble ? '💀 FUMBLE' : '🎲 ROLLED'}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 18,
            color: 'var(--color-text-primary)', fontWeight: 500,
          }}>
            {pendingRoll!.total}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--color-text-muted)',
          }}>
            {pendingRoll!.expr} · will be included in your next action
          </span>
        </div>
      )}

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

      <div className={styles.actionArea}>
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={
              isPending
                ? `Describe your action… (roll of ${pendingRoll!.total} will be included)`
                : 'Describe your action… the realm awaits your command.'
            }
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