import { create } from 'zustand'

export interface CharacterStats {
  name: string
  hp: number
  max_hp: number
  ac: number
  status_effects: string[]
  inventory: string[]
}

export interface UIEvent {
  type: string
  action: string
  slot: string
  component: string | null
  payload: Record<string, unknown> | null
}

interface GameStore {
  narrativeHistory: string[]
  party: Record<string, CharacterStats>
  currentTheme: string
  dynamicSlots: Record<string, { componentName: string; payload: unknown }>
  isConnected: boolean
  appendNarrative: (text: string) => void
  applyUIInstruction: (event: UIEvent) => void
  setConnected: (v: boolean) => void
}

export const useGameStore = create<GameStore>((set) => ({
  narrativeHistory: [],
  party: {},
  currentTheme: 'warm-tavern',
  dynamicSlots: {},
  isConnected: false,

  appendNarrative: (text) =>
    set((s) => ({ narrativeHistory: [...s.narrativeHistory, text] })),

  setConnected: (v) => set({ isConnected: v }),

  applyUIInstruction: (event) => set((s) => {
    if (event.action === 'update_theme' && event.payload?.theme) {
      const theme = event.payload.theme as string
      document.documentElement.setAttribute('data-theme', theme)
      return { currentTheme: theme }
    }
    if (event.action === 'mount_effect' && event.component) {
      return {
        dynamicSlots: {
          ...s.dynamicSlots,
          [event.slot]: { componentName: event.component, payload: event.payload }
        }
      }
    }
    if (event.action === 'update_stats' && event.payload) {
      return { party: { ...s.party, ...event.payload } as Record<string, CharacterStats> }
    }
    return s
  }),
}))
