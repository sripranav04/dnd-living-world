import { useRef } from 'react'
import { useGameStore } from '../store/gameStore'

const API_BASE = 'http://localhost:8000'

export function useGameStream(sessionId: string) {
  const esRef = useRef<EventSource | null>(null)
  const { appendNarrative, applyUIInstruction, setConnected } = useGameStore()

  function sendAction(input: string) {
    esRef.current?.close()

    const url = `${API_BASE}/game/action?session_id=${sessionId}&player_input=${encodeURIComponent(input)}`
    const es = new EventSource(url)
    esRef.current = es

    setConnected(true)

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        if (event.type === 'narrative') appendNarrative(event.text)
        if (event.type === 'ui_update')  applyUIInstruction(event)
        if (event.type === 'done')       { es.close(); setConnected(false) }
      } catch { /* ignore malformed events */ }
    }

    es.onerror = () => { es.close(); setConnected(false) }
  }

  return { sendAction }
}
