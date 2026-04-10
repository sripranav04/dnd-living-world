import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── SSE event shapes from backend ────────────────────────
// The FastAPI /game/action endpoint yields Server-Sent Events.
// Each event has a `type` field that determines how we handle it.
//
// Supported event types:
//   narrative_text   → { type, speaker, text }
//   ui_instruction   → { type, instruction: UIInstruction }
//   combat_log       → { type, text, log_type }
//   stream_start     → { type }
//   stream_end       → { type }
//   error            → { type, message }

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

interface StreamControlEvent {
  type: 'stream_start' | 'stream_end';
}

interface ErrorEvent {
  type: 'error';
  message: string;
}

type GameSSEEvent =
  | NarrativeEvent
  | UIInstructionEvent
  | CombatLogEvent
  | StreamControlEvent
  | ErrorEvent;

// ── Hook ──────────────────────────────────────────────────

export function useGameStream() {
  const esRef = useRef<EventSource | null>(null);
  const {
    appendNarrative,
    appendLog,
    applyUIInstruction,
    setDmTyping,
  } = useGameStore();

  const handleEvent = useCallback(
    (raw: string) => {
      let event: GameSSEEvent;
      try {
        event = JSON.parse(raw) as GameSSEEvent;
      } catch {
        console.warn('[useGameStream] unparseable event:', raw);
        return;
      }

      switch (event.type) {
        case 'stream_start':
          setDmTyping(true);
          break;

        case 'stream_end':
          setDmTyping(false);
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
          appendLog(`[ERROR] ${event.message}`, 'system');
          break;
      }
    },
    [appendNarrative, appendLog, applyUIInstruction, setDmTyping],
  );

  // Close any open stream
  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setDmTyping(false);
  }, [setDmTyping]);

  // Send an action — opens a fresh SSE connection for each turn
  const sendAction = useCallback(
    (playerAction: string, sessionId = 'player_one') => {
      // Close previous stream if still open
      close();

      // Immediately add player's own text to narrative
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
        console.error('[useGameStream] SSE connection error');
        setDmTyping(false);
        es.close();
        esRef.current = null;
      };
    },
    [close, appendNarrative, setDmTyping, handleEvent],
  );

  // Cleanup on unmount
  useEffect(() => () => close(), [close]);

  return { sendAction, close };
}