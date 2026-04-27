import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

// Module-level flag — resets on true page load, survives HMR
let _sessionStarted = false;

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
interface SessionTypeEvent { type: 'session_type'; is_new: boolean; }
interface TurnChangeEvent  { type: 'turn_change';  active_character: string; }
interface StreamControlEvent { type: 'stream_start' | 'stream_end'; }
interface ErrorEvent { type: 'error'; message: string; }

type GameSSEEvent =
  | NarrativeEvent | UIInstructionEvent | CombatLogEvent
  | SessionTypeEvent | TurnChangeEvent | StreamControlEvent | ErrorEvent;

export function useGameStream() {
  const esRef = useRef<EventSource | null>(null);

  const storeRef = useRef(useGameStore.getState());
  useEffect(() => {
    return useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  const handleEvent = useCallback((raw: string) => {
    let event: GameSSEEvent;
    try { event = JSON.parse(raw) as GameSSEEvent; }
    catch { return; }

    const store = storeRef.current;

    switch (event.type) {
      case 'stream_start':
        store.setDmTyping(true);
        break;

      case 'stream_end':
        store.setDmTyping(false);
        if (esRef.current) { esRef.current.close(); esRef.current = null; }
        break;

      case 'session_type':
        console.log(`[session] ${event.is_new ? '🆕 New' : '🔄 Returning'}`);
        break;

      case 'narrative_text':
        store.setDmTyping(false);
        store.appendNarrative({
          speaker: event.speaker,
          speakerLabel: event.speaker_label ?? (event.speaker === 'dm' ? 'Dungeon Master' : 'Player'),
          text: event.text,
        });
        break;

      case 'ui_instruction':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store.applyUIInstruction(event.instruction as any);
        break;

      case 'combat_log':
        store.appendLog(event.text, event.log_type);
        break;

      case 'turn_change':
        store.setActiveCharacter(event.active_character);
        console.log(`[turn] now acting: ${event.active_character}`);
        break;

      case 'error':
        console.error('[stream] error:', event.message);
        store.setDmTyping(false);
        break;
    }
  }, []);

  const close = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    storeRef.current.setDmTyping(false);
  }, []);

  // ── Session start ─────────────────────────────────────
  useEffect(() => {
    if (_sessionStarted) {
      console.log('[useGameStream] already started, skipping');
      return;
    }
    _sessionStarted = true;

    const sessionId = new URLSearchParams(window.location.search).get('session') ?? 'player_one';
    const url = new URL(`${API_BASE}/game/session/start`);
    url.searchParams.set('session_id', sessionId);

    console.log('[useGameStream] connecting:', sessionId);

    const es = new EventSource(url.toString());
    esRef.current = es;
    es.onmessage = (e) => handleEvent(e.data);
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        esRef.current = null;
        storeRef.current.setDmTyping(false);
      }
    };
  }, [handleEvent]);

  // ── Player action ─────────────────────────────────────
  const sendAction = useCallback((
    playerAction: string,
    sessionId = 'player_one',
    activeCharacter = '',
  ) => {
    close();
    storeRef.current.appendNarrative({
      speaker: 'player',
      speakerLabel: 'Player',
      text: playerAction,
    });
    storeRef.current.setDmTyping(true);

    const url = new URL(`${API_BASE}/game/action`);
    url.searchParams.set('action', playerAction);
    url.searchParams.set('session_id', sessionId);
    if (activeCharacter) url.searchParams.set('active_character', activeCharacter);

    const es = new EventSource(url.toString());
    esRef.current = es;
    es.onmessage = (e) => handleEvent(e.data);
    es.onerror = () => {
      storeRef.current.setDmTyping(false);
      es.close();
      esRef.current = null;
    };
  }, [close, handleEvent]);

  // ── New campaign ──────────────────────────────────────
  const startNewCampaign = useCallback(async (sessionId = 'player_one') => {
    close();
    _sessionStarted = false; // reset so next load triggers fresh session
    await fetch(`${API_BASE}/game/session/${sessionId}`, { method: 'DELETE' });
    window.location.reload();
  }, [close]);

  useEffect(() => () => close(), [close]);

  return { sendAction, startNewCampaign, close };
}