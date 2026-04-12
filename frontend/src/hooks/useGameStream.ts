import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface NarrativeEvent {
  type: 'narrative_text';
  speaker: 'dm' | 'player';
  speaker_label?: string;
  text: string;
}
interface UIInstructionEvent {
  type: 'ui_instruction';
  instruction: Record<string, unknown>;
}
interface CombatLogEvent {
  type: 'combat_log';
  text: string;
  log_type: 'attack' | 'spell' | 'heal' | 'move' | 'system';
}
interface SessionTypeEvent {
  type: 'session_type';
  is_new: boolean;
}
interface StreamControlEvent { type: 'stream_start' | 'stream_end'; }
interface ErrorEvent { type: 'error'; message: string; }

type GameSSEEvent =
  | NarrativeEvent
  | UIInstructionEvent
  | CombatLogEvent
  | SessionTypeEvent
  | StreamControlEvent
  | ErrorEvent;

export function useGameStream() {
  const esRef = useRef<EventSource | null>(null);
  const sessionStarted = useRef(false);
  const {
    appendNarrative,
    appendLog,
    applyUIInstruction,
    setDmTyping,
  } = useGameStore();

  const handleEvent = useCallback((raw: string) => {
    let event: GameSSEEvent;
    try {
      event = JSON.parse(raw) as GameSSEEvent;
    } catch {
      return;
    }

    switch (event.type) {
      case 'stream_start':
        setDmTyping(true);
        break;

      case 'stream_end':
        setDmTyping(false);
        break;

      case 'session_type':
        // Log whether this is a new or returning session
        console.log(`[session] ${event.is_new ? '🆕 New campaign' : '🔄 Returning session'}`);
        break;

      case 'narrative_text':
        setDmTyping(false);
        appendNarrative({
          speaker: event.speaker,
          speakerLabel: event.speaker_label ?? (event.speaker === 'dm' ? 'Dungeon Master' : 'Player'),
          text: event.text,
        });
        break;

      case 'ui_instruction':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        applyUIInstruction(event.instruction as any);
        break;

      case 'combat_log':
        appendLog(event.text, event.log_type);
        break;

      case 'error':
        console.error('[useGameStream] server error:', event.message);
        setDmTyping(false);
        break;
    }
  }, [appendNarrative, appendLog, applyUIInstruction, setDmTyping]);

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setDmTyping(false);
  }, [setDmTyping]);

  // ── Auto-start: fetch opening scene on mount ──────────
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;

    const sessionId = new URLSearchParams(window.location.search).get('session') ?? 'player_one';
    const url = new URL(`${API_BASE}/game/session/start`);
    url.searchParams.set('session_id', sessionId);

    const es = new EventSource(url.toString());
    esRef.current = es;
    es.onmessage = (e) => handleEvent(e.data);
    es.onerror = () => { es.close(); esRef.current = null; setDmTyping(false); };
  }, [handleEvent, setDmTyping]);

  // ── Player action ─────────────────────────────────────
  const sendAction = useCallback((playerAction: string, sessionId = 'player_one') => {
    close();

    appendNarrative({
      speaker: 'player',
      speakerLabel: 'Player',
      text: playerAction,
    });

    setDmTyping(true);

    const url = new URL(`${API_BASE}/game/action`);
    url.searchParams.set('action', playerAction);
    url.searchParams.set('session_id', sessionId);

    const es = new EventSource(url.toString());
    esRef.current = es;
    es.onmessage = (e) => handleEvent(e.data);
    es.onerror = () => {
      setDmTyping(false);
      es.close();
      esRef.current = null;
    };
  }, [close, appendNarrative, setDmTyping, handleEvent]);

  // ── New campaign — clears session and reloads ─────────
  const startNewCampaign = useCallback(async (sessionId = 'player_one') => {
    close();
    await fetch(`${API_BASE}/game/session/${sessionId}`, { method: 'DELETE' });
    window.location.reload();
  }, [close]);

  useEffect(() => () => close(), [close]);

  return { sendAction, startNewCampaign, close };
}