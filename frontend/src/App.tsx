import { DynamicSlot } from './components/DynamicSlot'
import { useGameStream } from './hooks/useGameStream'
import { useGameStore } from './store/gameStore'
import { useState } from 'react'

export default function App() {
  const [input, setInput] = useState('')
  const { sendAction } = useGameStream('player_one')
  const { narrativeHistory, isConnected } = useGameStore()

  function handleSend() {
    if (input.trim()) {
      sendAction(input.trim())
      setInput('')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, minHeight: '100vh' }}>

      <h1 style={{ color: 'var(--accent)', marginBottom: 24, fontSize: 28 }}>
        D&D Living World
      </h1>

      {/* Dynamic slots */}
      <DynamicSlot slot="game-canvas" />
      <DynamicSlot slot="hud" />

      {/* Narrative panel — always visible */}
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        minHeight: 200,
        border: '1px solid var(--border)'
      }}>
        {narrativeHistory.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Your adventure awaits. What do you do?
          </p>
        )}
        {narrativeHistory.map((text, i) => (
          <p key={i} style={{
            marginBottom: 14,
            lineHeight: 1.8,
            color: 'var(--text-primary)',
            fontSize: 15
          }}>
            {text}
          </p>
        ))}
        {isConnected && (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
            The dungeon master ponders...
          </p>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          placeholder="What do you do?"
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '12px 24px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 15,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Act
        </button>
      </div>
    </div>
  )
}
